import { provideHttpClient } from '@angular/common/http';
import { WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './app';

interface DirectoryProperty {
  id: string;
  createdAt: string;
  title: string;
  propertyType: string;
  address: string;
  price: string;
  seller: string;
  status: 'active' | 'inactive' | 'archived';
  phase: string;
  linkedClientId?: string;
  linkedClientIds?: string[];
}
interface DirectoryClient {
  id: string;
  draft: {
    fullName: string;
    companyName: string;
    clientType?: 'fyzicka' | 'pravnicka';
    clientInterest?: string;
    linkedPropertyId?: string;
    phonePrefix?: string;
    phone?: string;
    email?: string;
    birthDate?: string;
    permanentResidence?: string;
    permanentResidenceState?: string;
  };
}
interface DirectoryHarness {
  savedPropertyRecords: WritableSignal<DirectoryProperty[]>;
  savedClientRecords: WritableSignal<DirectoryClient[]>;
  propertySearchQuery: WritableSignal<string>;
  activeSavedPropertyId: WritableSignal<string>;
  newPropertyDraft: WritableSignal<{ linkedClientId?: string; linkedClientIds?: string[] }>;
  propertyClientsForLink(): DirectoryClient[];
  togglePropertyClientLink(id: string): void;
  sortPropertyClientsForLinkBy(key: 'name' | 'role'): void;
  updatePropertyClientSearchQuery(query: string): void;
  openPropertyFormForRecord(index: number): void;
  activatePropertyWorkspaceMode(mode: 'new' | 'directory'): void;
  isClientLinkedToProperty(id: string): boolean;
  linkedPropertyClients(): DirectoryClient[];
  handoverLinkedClients(): DirectoryClient[];
  saveCurrentProperty(): void;
  saveToXml(): void;
  buildXmlString(): string;
  applyXmlPayload(xml: string): void;
  allPropertyDirectoryEntries(): Array<{ index: number; title: string; seller: string }>;
  activePropertyDirectoryEntries(): Array<{ index: number; title: string; seller: string }>;
  sortPropertyDirectoryBy(key: 'seller'): void;
  propertyDirectorySortDirection(key: 'seller'): string;
}

const property = (id: string, extra: Partial<DirectoryProperty> = {}): DirectoryProperty => ({
  id, title: id, createdAt: '', propertyType: 'Byt', address: '', price: '', seller: '', status: 'active', phase: '', ...extra
});
const client = (id: string, fullName: string, extra: Partial<DirectoryClient['draft']> = {}): DirectoryClient => ({
  id, draft: { fullName, companyName: '', clientType: 'fyzicka', clientInterest: 'prodavajici', phonePrefix: '+420', phone: '', email: '', birthDate: '', permanentResidence: '', permanentResidenceState: '', ...extra }
});

describe('Property directory sellers', () => {
  beforeEach(async () => {
    const initialization = App.prototype as unknown as { loadState(): Promise<void>; loadTodayNameday(): void; loadHighRiskCountries(): Promise<void>; saveState(xml: string): Promise<void>; downloadXml(xml: string): void };
    vi.spyOn(initialization, 'loadState').mockResolvedValue(undefined);
    vi.spyOn(initialization, 'loadTodayNameday').mockImplementation(() => {});
    vi.spyOn(initialization, 'loadHighRiskCountries').mockResolvedValue(undefined);
    vi.spyOn(initialization, 'saveState').mockResolvedValue(undefined);
    vi.spyOn(initialization, 'downloadXml').mockImplementation(() => {});
    await TestBed.configureTestingModule({ imports: [App], providers: [provideHttpClient()] })
      .overrideComponent(App, { set: { template: '' } }).compileComponents();
  });
  afterEach(() => { vi.restoreAllMocks(); TestBed.resetTestingModule(); });

  it('resolves direct, legacy and reverse links, displays companies, deduplicates owners and excludes buyers and tenants', () => {
    const app = TestBed.createComponent(App).componentInstance as unknown as DirectoryHarness;
    const records = [
      property('direct', { linkedClientIds: ['owner', 'company', 'owner', 'buyer', 'tenant', 'missing'], seller: 'Staré jméno' }),
      property('legacy', { linkedClientId: 'legacy-client' }), property('reverse'), property('manual', { seller: 'Ručně zadané jméno' }), property('empty')
    ];
    app.savedPropertyRecords.set(records);
    app.savedClientRecords.set([
      client('owner', 'Žaneta Černá'),
      client('company', 'Jednatel společnosti', { clientType: 'pravnicka', clientInterest: 'pronajimatel', companyName: 'Alfa byty s.r.o.', linkedPropertyId: 'direct' }),
      client('buyer', 'Kupující klient', { clientInterest: 'kupujici' }), client('tenant', 'Nájemce klient', { clientInterest: 'najemce' }),
      client('legacy-client', 'Starší klient', { clientInterest: '' }),
      client('reverse-landlord', 'Marie Nová', { clientInterest: 'pronajimatel', linkedPropertyId: 'reverse' }), client('unrelated', 'Nesouvisející vlastník')
    ]);
    expect(app.allPropertyDirectoryEntries().map(entry => entry.seller)).toEqual([
      'Žaneta Černá, Alfa byty s.r.o.', 'Starší klient', 'Marie Nová', 'Ručně zadané jméno', ''
    ]);
    app.savedClientRecords.update(clients => clients.map(record => record.id === 'owner' ? { ...record, draft: { ...record.draft, fullName: 'Anna Černá' } } : record));
    expect(app.allPropertyDirectoryEntries()[0].seller).toBe('Anna Černá, Alfa byty s.r.o.');
    expect(app.savedPropertyRecords()).toBe(records);
    expect(records[0].seller).toBe('Staré jméno');
    app.propertySearchQuery.set('cerna');
    expect(app.activePropertyDirectoryEntries().map(entry => entry.title)).toEqual(['direct']);
  });

  it('sorts linked sellers ascending and descending, keeps missing names last and preserves the archive group and original record indexes', () => {
    const app = TestBed.createComponent(App).componentInstance as unknown as DirectoryHarness;
    app.savedPropertyRecords.set([
      property('z', { linkedClientIds: ['z-client'] }), property('a', { linkedClientIds: ['a-client'] }),
      property('b', { seller: 'Bohumil Dvořák' }), property('empty'), property('archived', { status: 'archived', seller: 'Aaron Archivní' })
    ]);
    app.savedClientRecords.set([client('z-client', 'Žaneta Žáková'), client('a-client', 'Anna Černá')]);
    app.sortPropertyDirectoryBy('seller');
    expect(app.propertyDirectorySortDirection('seller')).toBe('asc');
    expect(app.activePropertyDirectoryEntries().map(entry => entry.title)).toEqual(['a', 'b', 'z', 'empty', 'archived']);
    expect(app.activePropertyDirectoryEntries().map(entry => entry.index)).toEqual([1, 2, 0, 3, 4]);
    app.sortPropertyDirectoryBy('seller');
    expect(app.propertyDirectorySortDirection('seller')).toBe('desc');
    expect(app.activePropertyDirectoryEntries().map(entry => entry.title)).toEqual(['z', 'b', 'a', 'empty', 'archived']);
    app.savedClientRecords.update(clients => clients.map(record => record.id === 'a-client' ? { ...record, draft: { ...record.draft, fullName: 'Zuzana Nová' } } : record));
    expect(app.activePropertyDirectoryEntries()[0].title).toBe('a');
  });

  it('keeps linked clients above unlinked clients while preserving name sorting, searching, and immediate pin/unpin updates', () => {
    const app = TestBed.createComponent(App).componentInstance as unknown as DirectoryHarness;
    app.activeSavedPropertyId.set('p');
    const clients = [client('a', 'Adam Nový'), client('b', 'Bohumil Starší', { linkedPropertyId: 'p', clientInterest: 'pronajimatel' }), client('z', 'Žaneta Nová')];
    app.savedClientRecords.set(clients);
    const ids = () => app.propertyClientsForLink().map(client => client.id);
    expect(ids()).toEqual(['b', 'a', 'z']);
    app.togglePropertyClientLink('z');
    expect(ids()).toEqual(['b', 'z', 'a']);
    app.sortPropertyClientsForLinkBy('name');
    expect(ids()).toEqual(['b', 'z', 'a']);
    app.sortPropertyClientsForLinkBy('name');
    expect(ids()).toEqual(['z', 'b', 'a']);
    app.sortPropertyClientsForLinkBy('name');
    app.togglePropertyClientLink('z');
    expect(ids()).toEqual(['b', 'a', 'z']);
    app.updatePropertyClientSearchQuery('zaneta');
    expect(ids()).toEqual(['z']);
    expect(app.savedClientRecords()).toBe(clients);
  });

  it.each(['direct', 'reverse', 'both', 'legacy'].flatMap(source => ['saveCurrentProperty', 'saveToXml'].map(save => ({ source, save: save as 'saveCurrentProperty' | 'saveToXml' }))))('unlinks $source references immediately and preserves the result after $save and XML reload', ({ source, save }) => {
    const app = TestBed.createComponent(App).componentInstance as unknown as DirectoryHarness;
    const linked = source === 'reverse' ? {} : source === 'legacy' ? { linkedClientId: 'target' } : { linkedClientId: 'target', linkedClientIds: ['target', 'target', 'keep'] };
    app.savedPropertyRecords.set([property('p', linked), property('other', { linkedClientIds: ['unrelated'] })]);
    const clients = [client('target', 'Propojená klientka', { linkedPropertyId: source === 'direct' ? '' : 'p' }), client('keep', 'Zachovaný klient', { linkedPropertyId: 'p' }), client('unrelated', 'Jiný klient', { linkedPropertyId: 'other' })];
    app.savedClientRecords.set(clients);
    app.openPropertyFormForRecord(0);
    expect(app.isClientLinkedToProperty('target')).toBe(true);
    app.togglePropertyClientLink('target');
    expect(app.isClientLinkedToProperty('target')).toBe(false);
    expect(app.isClientLinkedToProperty('keep')).toBe(true);
    expect(app.linkedPropertyClients().map(client => client.id)).not.toContain('target');
    expect(app.handoverLinkedClients().map(client => client.id)).not.toContain('target');
    expect(app.savedClientRecords()).toBe(clients);
    app.togglePropertyClientLink('target');
    expect(app.isClientLinkedToProperty('target')).toBe(true);
    app.togglePropertyClientLink('target');
    expect(app.isClientLinkedToProperty('target')).toBe(false);
    app[save]();
    expect(app.savedPropertyRecords()[0].linkedClientIds).not.toContain('target');
    expect(app.savedPropertyRecords()[0].linkedClientId).not.toBe('target');
    expect(app.savedClientRecords().find(client => client.id === 'target')?.draft.linkedPropertyId).not.toBe('p');
    expect(app.savedClientRecords().find(client => client.id === 'keep')?.draft.linkedPropertyId).toBe('p');
    expect(app.savedPropertyRecords()[1].linkedClientIds).toEqual(['unrelated']);
    expect(app.savedClientRecords().find(client => client.id === 'unrelated')?.draft.linkedPropertyId).toBe('other');
    const xml = app.buildXmlString();
    expect(xml).not.toContain('linkedClientsEdited');
    app.applyXmlPayload(xml); app.openPropertyFormForRecord(0);
    expect(app.isClientLinkedToProperty('target')).toBe(false);
    expect(app.isClientLinkedToProperty('keep')).toBe(true);
  });

  it('restores the original links when an unconfirmed unlink is cancelled', () => {
    const app = TestBed.createComponent(App).componentInstance as unknown as DirectoryHarness;
    const records = [property('p', { linkedClientId: 'target', linkedClientIds: ['target'] })];
    const clients = [client('target', 'Propojená klientka', { linkedPropertyId: 'p' })];
    app.savedPropertyRecords.set(records); app.savedClientRecords.set(clients); app.openPropertyFormForRecord(0);
    app.togglePropertyClientLink('target');
    expect(app.isClientLinkedToProperty('target')).toBe(false);
    app.activatePropertyWorkspaceMode('directory'); app.openPropertyFormForRecord(0);
    expect(app.isClientLinkedToProperty('target')).toBe(true);
    expect(app.savedPropertyRecords()).toBe(records);
    expect(app.savedClientRecords()).toBe(clients);
  });

  it('preserves reverse-only legacy links when saving without editing the linked clients', () => {
    const app = TestBed.createComponent(App).componentInstance as unknown as DirectoryHarness;
    app.savedPropertyRecords.set([property('p')]);
    app.savedClientRecords.set([client('target', 'Propojená klientka', { linkedPropertyId: 'p' })]);
    app.openPropertyFormForRecord(0); app.saveCurrentProperty();
    expect(app.savedPropertyRecords()[0].linkedClientIds).toEqual(['target']);
    expect(app.savedClientRecords()[0].draft.linkedPropertyId).toBe('p');
  });

  it('falls back to manually entered seller text when only an unrelated role or a nameless owner is linked', () => {
    const app = TestBed.createComponent(App).componentInstance as unknown as DirectoryHarness;
    app.savedPropertyRecords.set([property('p', { seller: 'Ruční prodávající', linkedClientIds: ['buyer', 'blank-owner'] })]);
    app.savedClientRecords.set([client('buyer', 'Kupující', { clientInterest: 'kupujici' }), client('blank-owner', '   ')]);
    expect(app.allPropertyDirectoryEntries()[0].seller).toBe('Ruční prodávající');
    app.savedClientRecords.update(clients => clients.map(record => record.id === 'blank-owner' ? { ...record, draft: { ...record.draft, fullName: 'Propojený vlastník' } } : record));
    expect(app.allPropertyDirectoryEntries()[0].seller).toBe('Propojený vlastník');
  });
});
