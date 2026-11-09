import { provideHttpClient } from '@angular/common/http';
import { WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './app';

interface ParcelHarness {
  newPropertyDraft: WritableSignal<{ title: string; propertyType: string; tabValues: Record<string, Record<string, string>> }>;
  setLandParcelValue(index: number, field: 'parcel' | 'type' | 'area', value: string): void;
  landParcelValue(index: number, field: 'parcel' | 'type' | 'area'): string;
  formatLandParcelArea(index: number): void;
  addLandParcelRow(): void;
  removeLandParcelRow(index: number): void;
  stavbaParcelIndexes(): number[];
  stavbaParcelValue(index: number, field: 'parcel' | 'type' | 'area' | 'buildingNumber' | 'buildingNumberType'): string;
  setStavbaParcelValue(index: number, field: 'parcel' | 'type' | 'area' | 'buildingNumber' | 'buildingNumberType', value: string): void;
  formatStavbaParcelArea(index: number): void;
  removeStavbaParcelRow(index: number): void;
  setPropertyTabFieldValue(tab: string, field: string, value: string): void;
  saveCurrentProperty(): void;
  buildXmlString(): string;
  applyXmlPayload(xml: string): void;
  openPropertyFormForRecord(index: number): void;
}
const builtUp = 'Zastavěná plocha a nádvoří';
const fill = (app: ParcelHarness, index: number, parcel: string, area: string) => {
  app.setLandParcelValue(index, 'parcel', parcel);
  app.setLandParcelValue(index, 'type', builtUp);
  app.setLandParcelValue(index, 'area', area);
};

describe('Automatic buildings from built-up land parcels', () => {
  let app: ParcelHarness;
  beforeEach(async () => {
    const initialization = App.prototype as unknown as { loadState(): Promise<void>; loadTodayNameday(): void; loadHighRiskCountries(): Promise<void>; saveState(xml: string): Promise<void>; downloadXml(xml: string): void };
    vi.spyOn(initialization, 'loadState').mockResolvedValue(undefined);
    vi.spyOn(initialization, 'loadTodayNameday').mockImplementation(() => {});
    vi.spyOn(initialization, 'loadHighRiskCountries').mockResolvedValue(undefined);
    vi.spyOn(initialization, 'saveState').mockResolvedValue(undefined);
    vi.spyOn(initialization, 'downloadXml').mockImplementation(() => {});
    await TestBed.configureTestingModule({ imports: [App], providers: [provideHttpClient()] })
      .overrideComponent(App, { set: { template: '' } }).compileComponents();
    app = TestBed.createComponent(App).componentInstance as unknown as ParcelHarness;
    app.newPropertyDraft.update(draft => ({ ...draft, title: 'Automatic building test', propertyType: 'Byt', tabValues: {} }));
  });
  afterEach(() => { vi.restoreAllMocks(); TestBed.resetTestingModule(); });

  it.each([
    ['parcel', 'type', 'area'], ['parcel', 'area', 'type'], ['type', 'parcel', 'area'],
    ['type', 'area', 'parcel'], ['area', 'parcel', 'type'], ['area', 'type', 'parcel']
  ] as const)('copies the parcel/area once for input order %s → %s → %s', (...order) => {
    const values = { parcel: '123/4', type: builtUp, area: '250' };
    for (const field of order) app.setLandParcelValue(0, field, values[field]);
    expect(app.stavbaParcelIndexes()).toHaveLength(1);
    expect(app.stavbaParcelValue(0, 'parcel')).toBe('123/4');
    expect(app.stavbaParcelValue(0, 'area')).toBe('250');
    for (const field of ['type', 'buildingNumber', 'buildingNumberType'] as const) expect(app.stavbaParcelValue(0, field)).toBe('');
    expect(app.newPropertyDraft().tabValues['stavba']['Stavba na pozemku']).toBe('Ano');
    app.formatLandParcelArea(0);
    expect(app.stavbaParcelValue(0, 'area')).toBe(app.landParcelValue(0, 'area'));
    expect(app.stavbaParcelValue(0, 'area')).toBe('250 m²');
    app.setLandParcelValue(0, 'parcel', '123/40'); app.setLandParcelValue(0, 'area', '251');
    expect(app.stavbaParcelIndexes()).toHaveLength(1);
    expect(app.stavbaParcelValue(0, 'parcel')).toBe('123/40');
    expect(app.stavbaParcelValue(0, 'area')).toBe('251');
  });

  it('does not create or modify buildings for another land type or a completely empty built-up row', () => {
    app.setLandParcelValue(0, 'type', builtUp);
    expect(app.newPropertyDraft().tabValues['stavba']).toBeUndefined();
    app.newPropertyDraft.update(draft => ({ ...draft, tabValues: { stavba: { 'stavba-parcel-0-parcel': '77', 'stavba-parcel-0-type': 'rodinný dům', 'stavba-parcel-0-area': '80 m²' } } }));
    const before = app.newPropertyDraft().tabValues['stavba'];
    app.setLandParcelValue(0, 'type', 'Zahrada'); app.setLandParcelValue(0, 'parcel', '123/4'); app.setLandParcelValue(0, 'area', '250');
    expect(app.newPropertyDraft().tabValues['stavba']).toBe(before);
  });

  it('refreshes copied values without erasing manual details or later manual overrides', () => {
    fill(app, 0, '123/4', '250');
    app.setStavbaParcelValue(0, 'type', 'rodinný dům');
    app.setStavbaParcelValue(0, 'buildingNumberType', 'Číslo popisné'); app.setStavbaParcelValue(0, 'buildingNumber', '8');
    app.setPropertyTabFieldValue('stavba', 'Rok výstavby', '1999'); app.formatStavbaParcelArea(0);
    app.setLandParcelValue(0, 'area', '300');
    expect(app.stavbaParcelValue(0, 'area')).toBe('300');
    expect(app.stavbaParcelValue(0, 'type')).toBe('rodinný dům');
    expect(app.stavbaParcelValue(0, 'buildingNumber')).toBe('8');
    expect(app.stavbaParcelValue(0, 'buildingNumberType')).toBe('Číslo popisné');
    expect(app.newPropertyDraft().tabValues['stavba']['Rok výstavby']).toBe('1999');
    app.setStavbaParcelValue(0, 'area', '999'); app.setStavbaParcelValue(0, 'parcel', '999/1');
    app.setLandParcelValue(0, 'area', '301'); app.setLandParcelValue(0, 'parcel', '124/1');
    expect(app.stavbaParcelValue(0, 'area')).toBe('999');
    expect(app.stavbaParcelValue(0, 'parcel')).toBe('999/1');
    expect(app.stavbaParcelIndexes()).toHaveLength(1);
  });

  it.each(['80 m²', ''])('recognizes an existing manual building on the same parcel without duplicating or overwriting it (area: %s)', area => {
    app.newPropertyDraft.update(draft => ({ ...draft, tabValues: { stavba: { 'stavba-parcel-0-parcel': '123/4', 'stavba-parcel-0-type': 'rodinný dům', 'stavba-parcel-0-area': area, 'stavba-parcel-0-buildingNumber': '8' } } }));
    fill(app, 0, '123/4', '250');
    expect(app.stavbaParcelIndexes()).toHaveLength(1);
    expect(app.stavbaParcelValue(0, 'area')).toBe(area);
    expect(app.stavbaParcelValue(0, 'buildingNumber')).toBe('8');
  });

  it('keeps stable associations when unrelated land and building rows are removed and reindexed', () => {
    app.newPropertyDraft.update(draft => ({ ...draft, tabValues: { stavba: { 'stavba-parcel-0-parcel': '77', 'stavba-parcel-0-type': 'ručně vyplněná stavba', 'stavba-parcel-0-area': '80 m²' } } }));
    fill(app, 0, '123/4', '250'); app.addLandParcelRow(); fill(app, 1, '124/1', '300');
    expect(app.stavbaParcelIndexes()).toHaveLength(3);
    app.removeLandParcelRow(0); app.setLandParcelValue(0, 'area', '350');
    expect(app.stavbaParcelIndexes()).toHaveLength(3);
    expect(app.stavbaParcelValue(2, 'parcel')).toBe('124/1');
    expect(app.stavbaParcelValue(2, 'area')).toBe('350');
    app.removeStavbaParcelRow(1); app.setLandParcelValue(0, 'area', '360');
    expect(app.stavbaParcelIndexes()).toHaveLength(2);
    expect(app.stavbaParcelValue(1, 'parcel')).toBe('124/1');
    expect(app.stavbaParcelValue(1, 'area')).toBe('360');
    expect(app.stavbaParcelValue(0, 'type')).toBe('ručně vyplněná stavba');
    expect(app.stavbaParcelValue(0, 'area')).toBe('80 m²');
  });

  it('preserves the auto-created row and association after saving, XML reload and further land edits', () => {
    fill(app, 0, '123/4', '250'); app.setStavbaParcelValue(0, 'type', 'bytový dům');
    app.saveCurrentProperty(); app.applyXmlPayload(app.buildXmlString()); app.openPropertyFormForRecord(0);
    app.setLandParcelValue(0, 'area', '280');
    expect(app.stavbaParcelIndexes()).toHaveLength(1);
    expect(app.stavbaParcelValue(0, 'parcel')).toBe('123/4');
    expect(app.stavbaParcelValue(0, 'area')).toBe('280');
    expect(app.stavbaParcelValue(0, 'type')).toBe('bytový dům');
  });
});
