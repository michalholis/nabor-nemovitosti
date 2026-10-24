import { provideHttpClient } from '@angular/common/http';
import { WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './app';

interface PropertyRecord {
  id: string;
  createdAt: string;
  title: string;
  propertyType: string;
  address: string;
  price: string;
  seller: string;
  phase: string;
  status: 'active' | 'inactive' | 'archived';
  archiveReason?: string;
  archiveDescription?: string;
  tabValues: Record<string, Record<string, string>>;
}

interface Entry { index: number; title: string; phase: string; status: string }
interface ArchiveHarness {
  savedPropertyRecords: WritableSignal<PropertyRecord[]>;
  newPropertyDraft: WritableSignal<Omit<PropertyRecord, 'id' | 'createdAt' | 'status'>>;
  activeSavedPropertyId: WritableSignal<string>;
  pinnedPropertyId: WritableSignal<string>;
  propertyArchiveDialog(): { reason: string; description: string; error: string } | null;
  propertyArchiveReasons: string[];
  activePropertyDirectoryEntries(): Entry[];
  allPropertyDirectoryEntries(): Entry[];
  activePropertyCount(): number;
  openPropertyFormForRecord(index: number): void;
  openPropertyDirectoryEntry(entry: Entry): void;
  setPropertyPhase(phase: string): void;
  setPropertyArchiveField(field: 'reason' | 'description', value: string): void;
  confirmPropertyArchive(): void;
  cancelPropertyArchive(): void;
  saveCurrentProperty(): void;
  saveToXml(): void;
  buildXmlString(): string;
  applyXmlPayload(xml: string): void;
  sortPropertyDirectoryBy(key: 'title'): void;
  setPropertyDirectoryView(view: 'active' | 'all'): void;
  isCurrentPropertyPhaseActive(phase: string): boolean;
  isPhaseActive(entry: Entry, phase: string): boolean;
}

const property = (id: string, title: string): PropertyRecord => ({
  id, title, createdAt: '23.10.2026', propertyType: 'Rodinný dům', address: 'Říkovice 116',
  price: '2500000', seller: 'Jan Novák', status: 'active', phase: 'Prohlídky',
  tabValues: { zakladni: { Služba: 'Prodej' } }
});

describe('Property archiving', () => {
  let app: ArchiveHarness;
  beforeEach(async () => {
    const prototype = App.prototype as unknown as {
      loadState(): Promise<void>; loadTodayNameday(): void; loadHighRiskCountries(): Promise<void>;
      saveState(xml: string): Promise<void>; downloadXml(xml: string): void;
    };
    vi.spyOn(prototype, 'loadState').mockResolvedValue(undefined);
    vi.spyOn(prototype, 'loadTodayNameday').mockImplementation(() => {});
    vi.spyOn(prototype, 'loadHighRiskCountries').mockResolvedValue(undefined);
    vi.spyOn(prototype, 'saveState').mockResolvedValue(undefined);
    vi.spyOn(prototype, 'downloadXml').mockImplementation(() => {});
    await TestBed.configureTestingModule({ imports: [App], providers: [provideHttpClient()] })
      .overrideComponent(App, { set: { template: '' } }).compileComponents();
    app = TestBed.createComponent(App).componentInstance as unknown as ArchiveHarness;
    app.savedPropertyRecords.set([property('one', 'Dům A'), property('two', 'Dům B')]);
    app.openPropertyFormForRecord(0);
  });
  afterEach(() => { vi.restoreAllMocks(); TestBed.resetTestingModule(); });

  it('requires a valid reason and leaves the property unchanged until confirmation', () => {
    app.setPropertyPhase('Archivováno');
    expect(app.propertyArchiveDialog()).not.toBeNull();
    expect(app.newPropertyDraft().phase).toBe('Prohlídky');
    expect(app.savedPropertyRecords()[0].status).toBe('active');
    app.confirmPropertyArchive();
    expect(app.propertyArchiveDialog()?.error).toBe('Vyberte důvod archivace.');
    app.setPropertyArchiveField('reason', 'Neznámý důvod');
    app.confirmPropertyArchive();
    expect(app.savedPropertyRecords()[0].status).toBe('active');
    app.setPropertyArchiveField('reason', app.propertyArchiveReasons[0]);
    app.cancelPropertyArchive();
    expect(app.newPropertyDraft().phase).toBe('Prohlídky');
    expect(app.savedPropertyRecords()[0].archiveReason).toBeUndefined();
  });

  it.each([0, 1, 2])('saves archive reason %s, the description, and current form edits together', reasonIndex => {
    app.newPropertyDraft.update(draft => ({ ...draft, title: 'Upravený název' }));
    app.pinnedPropertyId.set('one');
    app.setPropertyPhase('Archivováno');
    app.setPropertyArchiveField('reason', app.propertyArchiveReasons[reasonIndex]);
    app.setPropertyArchiveField('description', '  Domluveno telefonicky.  ');
    app.confirmPropertyArchive();
    expect(app.propertyArchiveDialog()).toBeNull();
    expect(app.savedPropertyRecords()[0]).toMatchObject({
      title: 'Upravený název', status: 'archived', phase: 'Archivováno',
      archiveReason: app.propertyArchiveReasons[reasonIndex], archiveDescription: 'Domluveno telefonicky.'
    });
    expect(app.savedPropertyRecords()[1].status).toBe('active');
    expect(app.activePropertyCount()).toBe(1);
    expect(app.pinnedPropertyId()).toBe('');
    expect(app.activePropertyDirectoryEntries().map(entry => entry.index)).toEqual([1, 0]);
  });

  it('preserves archive information through XML, reopening, editing and saving again', () => {
    app.setPropertyPhase('Archivováno');
    app.setPropertyArchiveField('reason', app.propertyArchiveReasons[2]);
    app.setPropertyArchiveField('description', 'Prodej zrušen.');
    app.confirmPropertyArchive();
    const xml = app.buildXmlString();
    app.savedPropertyRecords.set([]);
    app.applyXmlPayload(xml);
    const archived = app.allPropertyDirectoryEntries().find(entry => entry.status === 'Archivováno')!;
    app.openPropertyDirectoryEntry(archived);
    expect(app.newPropertyDraft().archiveDescription).toBe('Prodej zrušen.');
    app.saveToXml();
    app.saveCurrentProperty();
    expect(app.savedPropertyRecords().find(record => record.id === 'one')).toMatchObject({
      status: 'archived', phase: 'Archivováno', archiveReason: app.propertyArchiveReasons[2], archiveDescription: 'Prodej zrušen.'
    });
  });

  it('keeps archived properties last for both sort directions and excludes them from active view', () => {
    app.savedPropertyRecords.set([
      { ...property('archive', 'A'), status: 'archived', phase: 'Archivováno' },
      property('active', 'Z'), { ...property('inactive', 'B'), status: 'inactive' }
    ]);
    app.sortPropertyDirectoryBy('title');
    expect(app.activePropertyDirectoryEntries().map(entry => entry.title)).toEqual(['B', 'Z', 'A']);
    app.sortPropertyDirectoryBy('title');
    expect(app.activePropertyDirectoryEntries().map(entry => entry.title)).toEqual(['Z', 'B', 'A']);
    app.setPropertyDirectoryView('active');
    expect(app.activePropertyDirectoryEntries().map(entry => entry.title)).toEqual(['Z']);
  });

  it('does not mark all sales steps completed for an archived property and allows saving a normal phase again', () => {
    app.setPropertyPhase('Archivováno');
    app.setPropertyArchiveField('reason', app.propertyArchiveReasons[1]);
    app.confirmPropertyArchive();
    expect(app.isCurrentPropertyPhaseActive('Archivováno')).toBe(true);
    expect(app.isCurrentPropertyPhaseActive('Kupní smlouva')).toBe(false);
    expect(app.isPhaseActive(app.allPropertyDirectoryEntries()[0], 'Předání')).toBe(false);
    app.openPropertyFormForRecord(0);
    app.setPropertyPhase('Náběr');
    app.saveCurrentProperty();
    expect(app.savedPropertyRecords()[0]).toMatchObject({ phase: 'Náběr', status: 'active' });
    expect(app.savedPropertyRecords()[0].archiveReason).toBeUndefined();
  });

  it('cannot apply a pending archive to a different property', () => {
    app.setPropertyPhase('Archivováno');
    app.setPropertyArchiveField('reason', app.propertyArchiveReasons[0]);
    app.activeSavedPropertyId.set('two');
    app.confirmPropertyArchive();
    expect(app.savedPropertyRecords().every(record => record.status === 'active')).toBe(true);
    expect(app.propertyArchiveDialog()).toBeNull();
  });
});
