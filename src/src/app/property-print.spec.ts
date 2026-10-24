import { provideHttpClient } from '@angular/common/http';
import { WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './app';
import { PROPERTY_INTAKE_FORM } from './property-intake-form';
import { Subject, throwError } from 'rxjs';
import { DrivingRoute, DrivingRouteService } from './driving-route.service';

interface PrintHarness {
  activeWorkspace: WritableSignal<string>;
  propertyWorkspaceMode: WritableSignal<string>;
  propertyDrivingInfo(): { status: string; summary: string };
  agentProfile: WritableSignal<{ departureAddress: string }>;
  buildXmlString(): string;
  applyXmlPayload(xml: string): void;
  newPropertyDraft: WritableSignal<{
    title: string;
    address: string;
    propertyType: string;
    tabValues: Record<string, Record<string, string>>;
    linkedClientId?: string;
    linkedClientIds?: string[];
  }>;
  savedClientRecords: WritableSignal<Array<{
    id: string;
    draft: { fullName: string; companyName: string; phonePrefix: string; phone: string; email: string; linkedPropertyId?: string };
  }>>;
  activeSavedPropertyId: WritableSignal<string>;
  propertyTypeFormOptions(): string[];
  propertyTypeSelectValue(): string;
  isPropertyTypeCustom(value: string): boolean;
  cloneSavedPropertyRecord(record: { propertyType: string; tabValues?: Record<string, Record<string, string>> }): { propertyType: string; tabValues: Record<string, Record<string, string>> };
  stavbaParcelValue(index: number, field: 'parcel' | 'type' | 'area' | 'buildingNumber' | 'buildingNumberType'): string;
  setStavbaParcelValue(index: number, field: 'parcel' | 'type' | 'area' | 'buildingNumber' | 'buildingNumberType', value: string): void;
  addStavbaParcelRow(): void;
  removeStavbaParcelRow(index: number): void;
  stavbaBuildUpArea(): string;
  stavbaBuildingNumberOptions(): string[];
  defaultHandoverPropertyDescription(): string;
  prostoryRoomListOptions(): string[];
  prostoryUnitAccessoryOptions(): string[];
  prostoryUnitAccessoryChips(unit?: string): string[];
  prostorySharedAccessoryOptions(): string[];
  toggleProstoryMultiValue(field: string, value: string, unit?: string): void;
  hasProstoryMultiValue(field: string, value: string, unit?: string): boolean;
  toggleProstoryAccessoryCustom(unit?: string): void;
  hasProstoryAccessoryCustomValue(unit?: string): boolean;
  prostoryAccessoryCustomValue(unit?: string): string;
  setProstoryAccessoryCustomValue(unit: string, value: string): void;
  openAddressInMapService(service: 'google' | 'seznam', address: string): void;
  mortgageSettlementOptions(): string[];
  podlahyOptions(): string[];
  propertyTabFieldValue(tab: string, field: string): string;
  hasPropertyTabMultiValue(tab: string, field: string, value: string): boolean;
  togglePropertyTabMultiValue(tab: string, field: string, value: string): void;
  vodaDruhStudnyOptions(): string[];
  toggleVodaMultiValue(field: string, value: string): void;
  formatMortgageBalance(): void;
  setMortgageSettlementCustomValue(value: string): void;
  togglePravniVadyMultiValue(field: string, value: string): void;
  selectedProstoryRoomEntries(unit?: string): Array<{ room: string }>;
  shouldShowProstoryGeneralFields(): boolean;
  visiblePropertySectionTabs(): Array<{ key: string }>;
  propertySectionTabs(): Array<{ key: string; label: string }>;
  hlavniPrednostiOptions(): string[];
  dispoziceUnits(): string[];
  dispoziceUnitName(unit: string): string;
  setDispoziceUnitName(unit: string, name: string): void;
  prostoryUnitLabel(label: string, unit: string): string;
  socialniZazemiUnitTitle(unit: string): string;
  isDispoziceUnitOpen(unit: string): boolean;
  toggleDispoziceUnit(unit: string): void;
  socialniZazemiUnits(): string[];
  socialniZazemiFieldValue(field: string, unit?: string): string;
  setSocialniZazemiFieldValue(field: string, value: string, unit?: string): void;
  hasSocialniZazemiMultiValue(field: string, value: string, unit?: string): boolean;
  toggleSocialniZazemiMultiValue(field: string, value: string, unit?: string): void;
  generateCurrentPropertyBuyerInfo(): void;
  generateCurrentPropertyBrokerInfo(): void;
  generateCurrentPropertyBlankForm(): void;
}

describe('Property print fields', () => {
  beforeEach(async () => {
    const initialization = App.prototype as unknown as {
      loadState(): Promise<void>;
      loadTodayNameday(): void;
      loadHighRiskCountries(): Promise<void>;
    };
    vi.spyOn(initialization, 'loadState').mockResolvedValue(undefined);
    vi.spyOn(initialization, 'loadTodayNameday').mockImplementation(() => {});
    vi.spyOn(initialization, 'loadHighRiskCountries').mockResolvedValue(undefined);
    await TestBed.configureTestingModule({ imports: [App], providers: [provideHttpClient()] })
      .overrideComponent(App, { set: { template: '' } }).compileComponents();
  });

  afterEach(() => { vi.restoreAllMocks(); TestBed.resetTestingModule(); vi.useRealTimers(); });

  it.each(['Dům', 'Rodinný dům', 'Bytový dům', 'Garáž'])('prints the selected outdoor socket for %s in all reports', type => {
    const app = TestBed.createComponent(App).componentInstance as unknown as PrintHarness;
    app.newPropertyDraft.update(draft => ({ ...draft, propertyType: type, tabValues: {
      ...draft.tabValues,
      elektina: { 'Elektřina': 'Zavedena', 'Zásuvka venku': 'ANO' },
      voda: { 'Stoupačky': 'Původní', 'Venkovní ventil na vodu': 'ANO' }
    } }));
    const write = vi.fn();
    vi.spyOn(window, 'open').mockReturnValue({ document: { open: vi.fn(), write, close: vi.fn() } } as unknown as Window);

    app.generateCurrentPropertyBuyerInfo();
    const buyerHtml = write.mock.calls[0][0] as string;
    expect(buyerHtml).toContain('Venkovní zásuvka</div><div class="info-value">ANO');
    expect(buyerHtml).toContain('Venkovní ventil na vodu</div><div class="info-value">ANO');
    expect(buyerHtml.includes('Stoupačky')).toBe(type === 'Garáž' || type === 'Bytový dům');

    app.generateCurrentPropertyBrokerInfo();
    const brokerHtml = write.mock.calls[1][0] as string;
    expect(brokerHtml).toContain('Venkovní zásuvka</div><div class="info-value">ANO');
    expect(brokerHtml).toContain('Venkovní ventil na vodu</div><div class="info-value">ANO');
    expect(brokerHtml.includes('Stoupačky')).toBe(type === 'Garáž' || type === 'Bytový dům');
    app.generateCurrentPropertyBlankForm();
    expect(write.mock.calls[2][0]).toContain('Venkovní zásuvka</div><div class="info-value"><span class="opt on">☑ ANO');
    expect(write.mock.calls[2][0]).toContain('Venkovní ventil na vodu</div><div class="info-value"><span class="opt on">☑ ANO');
  });

  it.each(['Byt', 'Pole'])('omits outdoor utilities for %s even if values were previously saved', type => {
    const app = TestBed.createComponent(App).componentInstance as unknown as PrintHarness;
    app.newPropertyDraft.update(draft => ({ ...draft, propertyType: type, tabValues: {
      ...draft.tabValues,
      elektina: { 'Zásuvka venku': 'ANO' },
      voda: { 'Venkovní ventil na vodu': 'ANO' }
    } }));
    const write = vi.fn();
    vi.spyOn(window, 'open').mockReturnValue({ document: { open: vi.fn(), write, close: vi.fn() } } as unknown as Window);
    app.generateCurrentPropertyBuyerInfo();
    app.generateCurrentPropertyBrokerInfo();
    app.generateCurrentPropertyBlankForm();
    for (const [html] of write.mock.calls) {
      expect(html).not.toContain('Venkovní zásuvka');
      expect(html).not.toContain('Zásuvka venku');
      expect(html).not.toContain('Venkovní ventil na vodu');
    }
  });

  it('prints the selected type of an own well and clears it when the well is removed', () => {
    const app = TestBed.createComponent(App).componentInstance as unknown as PrintHarness;
    app.newPropertyDraft.update(draft => ({ ...draft, tabValues: {
      ...draft.tabValues,
      voda: { 'Další zdroj vody': 'Studna vlastní', 'Druh studny': 'Studna vrtaná' }
    } }));
    const write = vi.fn();
    vi.spyOn(window, 'open').mockReturnValue({ document: { open: vi.fn(), write, close: vi.fn() } } as unknown as Window);

    expect(app.vodaDruhStudnyOptions()).toEqual(['Studna vrtaná', 'Studna kopaná']);
    app.generateCurrentPropertyBuyerInfo();
    expect(write.mock.calls[0][0]).toContain('Druh studny</div><div class="info-value">Studna vrtaná');

    app.toggleVodaMultiValue('Další zdroj vody', 'Studna vlastní');
    expect(app.propertyTabFieldValue('voda', 'Druh studny')).toBe('');
  });

  it.each(['ANO', 'NE'])('respects the buyer print switch for an unpermitted building (%s)', visible => {
    const app = TestBed.createComponent(App).componentInstance as unknown as PrintHarness;
    app.newPropertyDraft.update(draft => ({ ...draft, propertyType: 'Dům', tabValues: {
      ...draft.tabValues,
      'pravni-vady': {
        'Právní vady a jiná omezení': 'Bankovní zástavy|Černá stavba',
        'Informace k černé stavbě': 'Přístavba bez povolení',
        'Černá stavba__buyer-info-visible': visible
      }
    } }));
    const write = vi.fn();
    vi.spyOn(window, 'open').mockReturnValue({ document: { open: vi.fn(), write, close: vi.fn() } } as unknown as Window);
    app.generateCurrentPropertyBuyerInfo();
    const buyerHtml = write.mock.calls[0][0] as string;
    expect(buyerHtml.includes('Černá stavba')).toBe(visible === 'ANO');
    expect(buyerHtml.includes('Přístavba bez povolení')).toBe(visible === 'ANO');
    expect(buyerHtml).toContain('Bankovní zástavy');
    app.generateCurrentPropertyBrokerInfo();
    expect(write.mock.calls[1][0]).toContain('Bankovní zástavy, Černá stavba');
    expect(write.mock.calls[1][0]).toContain('Přístavba bez povolení');
    app.generateCurrentPropertyBlankForm();
    expect(write.mock.calls[2][0]).toContain('<span class="opt on">☑ Černá stavba</span>');
    expect(write.mock.calls[2][0]).toContain('Přístavba bez povolení');
  });

  it('groups saved advantages and restrictions together and prints heating with a fireplace', () => {
    const app = TestBed.createComponent(App).componentInstance as unknown as PrintHarness;
    app.newPropertyDraft.update(draft => ({ ...draft, propertyType: 'Dům', tabValues: {
      ...draft.tabValues,
      'hlavni-prednosti': { 'Hlavní přednosti': 'Klidné místo' },
      'pravni-vady': { 'Právní vady a jiná omezení': 'Věcné břemeno|Černá stavba', 'Informace k černé stavbě': 'Garáž bez povolení' },
      topeni: { 'Topné těleso': 'Krb' }
    } }));
    const write = vi.fn();
    vi.spyOn(window, 'open').mockReturnValue({ document: { open: vi.fn(), write, close: vi.fn() } } as unknown as Window);
    app.generateCurrentPropertyBuyerInfo();
    app.generateCurrentPropertyBrokerInfo();
    app.generateCurrentPropertyBlankForm();
    for (const [html] of write.mock.calls) {
      const document = new DOMParser().parseFromString(html as string, 'text/html');
      const cards = [...document.querySelectorAll('section')];
      const combined = cards.filter(card => card.querySelector('h2')?.textContent === 'PŘEDNOSTI A OMEZENÍ');
      expect(combined).toHaveLength(1);
      expect(combined[0].textContent).toContain('Klidné místo');
      expect(combined[0].textContent).toContain('Věcné břemeno');
      expect(combined[0].textContent).toContain('Černá stavba');
      expect(cards.some(card => card.querySelector('h2')?.textContent === 'PRÁVNÍ VADY A OMEZENÍ')).toBe(false);
      const heating = cards.find(card => card.querySelector('h2')?.textContent === 'VYTÁPĚNÍ');
      expect(heating?.textContent).toContain('Krb');
    }
  });

  it('omits saved building details from both reports after the option is deselected', () => {
    const app = TestBed.createComponent(App).componentInstance as unknown as PrintHarness;
    app.newPropertyDraft.update(draft => ({ ...draft, propertyType: 'Dům', tabValues: {
      ...draft.tabValues,
      'pravni-vady': { 'Právní vady a jiná omezení': 'Bankovní zástavy', 'Informace k černé stavbě': 'Dřívější poznámka' }
    } }));
    const write = vi.fn();
    vi.spyOn(window, 'open').mockReturnValue({ document: { open: vi.fn(), write, close: vi.fn() } } as unknown as Window);
    app.generateCurrentPropertyBuyerInfo();
    app.generateCurrentPropertyBrokerInfo();
    app.generateCurrentPropertyBlankForm();
    for (const [html] of write.mock.calls) {
      expect(html).not.toContain('Informace k černé stavbě');
      expect(html).not.toContain('Dřívější poznámka');
    }
    expect(app.newPropertyDraft().tabValues['pravni-vady']['Informace k černé stavbě']).toBe('Dřívější poznámka');
  });

  it.each(['Vyplacení před prodejem', 'Převedení na jinou nemovitost', 'Vyplacení z částky kupní ceny'])('prints the mortgage balance and settlement %s in all reports', settlement => {
    const app = TestBed.createComponent(App).componentInstance as unknown as PrintHarness;
    expect(app.mortgageSettlementOptions()).toContain(settlement);
    app.newPropertyDraft.update(draft => ({ ...draft, propertyType: 'Rodinný dům', tabValues: {
      ...draft.tabValues, 'pravni-vady': {
        'Právní vady a jiná omezení': 'Zatíženo hypotékou', 'Zbývající částka úvěru': '1580000,50', 'Způsob vypořádání hypotéky': settlement
      }
    } }));
    app.formatMortgageBalance();
    expect(app.newPropertyDraft().tabValues['pravni-vady']['Zbývající částka úvěru'].replace(/\s/g, ' ')).toBe('1 580 000,5 Kč');
    const write = vi.fn();
    vi.spyOn(window, 'open').mockReturnValue({ document: { open: vi.fn(), write, close: vi.fn() } } as unknown as Window);
    app.generateCurrentPropertyBuyerInfo();
    app.generateCurrentPropertyBrokerInfo();
    app.generateCurrentPropertyBlankForm();
    for (const [html] of write.mock.calls) {
      const report = new DOMParser().parseFromString(html as string, 'text/html');
      const rows = [...report.querySelectorAll('.info-row')];
      const balance = rows.find(row => row.querySelector('.info-label')?.textContent === 'Zbývající částka úvěru')!;
      const method = rows.find(row => row.querySelector('.info-label')?.textContent === 'Způsob vypořádání hypotéky')!;
      expect(balance.textContent?.replace(/\s/g, ' ')).toContain('1 580 000,5 Kč');
      expect(method.querySelector('.info-value')?.textContent).toContain(settlement);
    }
  });

  it('preserves mortgage details when deselected but omits them from every report', () => {
    const app = TestBed.createComponent(App).componentInstance as unknown as PrintHarness;
    app.newPropertyDraft.update(draft => ({ ...draft, propertyType: 'Byt', tabValues: {
      ...draft.tabValues, 'pravni-vady': {
        'Právní vady a jiná omezení': 'Zatíženo hypotékou', 'Zbývající částka úvěru': '222 000 Kč', 'Způsob vypořádání hypotéky': 'Vlastní dohodnuté řešení'
      }
    } }));
    app.togglePravniVadyMultiValue('Právní vady a jiná omezení', 'Zatíženo hypotékou');
    const write = vi.fn();
    vi.spyOn(window, 'open').mockReturnValue({ document: { open: vi.fn(), write, close: vi.fn() } } as unknown as Window);
    app.generateCurrentPropertyBuyerInfo();
    app.generateCurrentPropertyBrokerInfo();
    app.generateCurrentPropertyBlankForm();
    for (const [html] of write.mock.calls) {
      expect(html).not.toContain('Zbývající částka úvěru');
      expect(html).not.toContain('Způsob vypořádání hypotéky');
      expect(html).not.toContain('Vlastní dohodnuté řešení');
    }
    const saved = app.cloneSavedPropertyRecord({ propertyType: 'Byt', tabValues: app.newPropertyDraft().tabValues });
    expect(saved.tabValues['pravni-vady']['Zbývající částka úvěru']).toBe('222 000 Kč');
    expect(saved.tabValues['pravni-vady']['Způsob vypořádání hypotéky']).toBe('Vlastní dohodnuté řešení');
  });

  it('keeps an empty custom settlement editable without printing its internal marker', () => {
    const app = TestBed.createComponent(App).componentInstance as unknown as PrintHarness;
    app.newPropertyDraft.update(draft => ({ ...draft, propertyType: 'Byt', tabValues: {
      ...draft.tabValues, 'pravni-vady': { 'Právní vady a jiná omezení': 'Zatíženo hypotékou' }
    } }));
    app.setMortgageSettlementCustomValue('');
    expect(app.newPropertyDraft().tabValues['pravni-vady']['Způsob vypořádání hypotéky']).toBe('__vlastni__');
    const write = vi.fn();
    vi.spyOn(window, 'open').mockReturnValue({ document: { open: vi.fn(), write, close: vi.fn() } } as unknown as Window);
    app.generateCurrentPropertyBuyerInfo();
    app.generateCurrentPropertyBrokerInfo();
    app.generateCurrentPropertyBlankForm();
    for (const [html] of write.mock.calls) expect(html).not.toContain('__vlastni__');
    write.mockClear();
    app.setMortgageSettlementCustomValue('Splacení dle dohody s bankou.');
    app.generateCurrentPropertyBuyerInfo();
    app.generateCurrentPropertyBrokerInfo();
    app.generateCurrentPropertyBlankForm();
    for (const [html] of write.mock.calls) expect(html).toContain('Splacení dle dohody s bankou.');
  });

  it('prints checked choices first for single, multiple and custom choices', () => {
    const app = TestBed.createComponent(App).componentInstance as unknown as PrintHarness;
    app.newPropertyDraft.update(draft => ({ ...draft, propertyType: 'Dům', tabValues: {
      ...draft.tabValues,
      pozemek: { 'Pozemek ano/ne': 'Ano', 'Vlastnictví pozemku': 'Vlastní varianta', 'Pěstování': 'Jabloně|Vlastní plodina' }
    } }));
    const write = vi.fn();
    vi.spyOn(window, 'open').mockReturnValue({ document: { open: vi.fn(), write, close: vi.fn() } } as unknown as Window);
    app.generateCurrentPropertyBlankForm();
    const document = new DOMParser().parseFromString(write.mock.calls[0][0] as string, 'text/html');
    const rows = [...document.querySelectorAll('.info-row')];
    const choices = (label: string): Element[] => [...rows.find(row => row.querySelector('.info-label')?.textContent === label)!.querySelectorAll('.opt')];
    expect(choices('Pozemek').map(choice => choice.textContent)).toEqual(['☑ Ano', '☐ Ne']);
    expect(choices('Vlastnictví pozemku')[0].textContent).toBe('☑ Vlastní varianta');
    const cultivation = choices('Pěstování');
    expect(cultivation.slice(0, 2).every(choice => choice.classList.contains('on'))).toBe(true);
    expect(cultivation.slice(2).every(choice => !choice.classList.contains('on'))).toBe(true);
  });

  it('moves legacy floor selections into PODLAHY in all reports without mutating the property during printing', () => {
    const app = TestBed.createComponent(App).componentInstance as unknown as PrintHarness;
    app.newPropertyDraft.update(draft => ({ ...draft, propertyType: 'Rodinný dům', tabValues: {
      okna: { 'Druh oken': 'Plastová', Podlahy: 'Linoleum|Betonový základ|Litá' },
      podlahy: { 'Poznámka k podlahám': 'Podlahy po rekonstrukci.' }
    } }));
    const before = JSON.stringify(app.newPropertyDraft());
    expect(app.hasPropertyTabMultiValue('podlahy', 'Podlahy', 'Litá podlaha')).toBe(true);
    const write = vi.fn();
    vi.spyOn(window, 'open').mockReturnValue({ document: { open: vi.fn(), write, close: vi.fn() } } as unknown as Window);
    app.generateCurrentPropertyBuyerInfo();
    app.generateCurrentPropertyBrokerInfo();
    app.generateCurrentPropertyBlankForm();
    for (const [html] of write.mock.calls) {
      const report = new DOMParser().parseFromString(html as string, 'text/html');
      const cards = [...report.querySelectorAll('.info-card')];
      const windows = cards.find(card => card.querySelector('h2')?.textContent === 'OKNA A DVEŘE')!;
      const floors = cards.find(card => card.querySelector('h2')?.textContent === 'PODLAHY')!;
      expect(windows.textContent).toContain('Plastová');
      expect(windows.textContent).not.toContain('Betonový základ');
      expect(windows.textContent).not.toContain('Linoleum');
      expect([...windows.querySelectorAll('.info-label')].some(label => label.textContent === 'Podlahy')).toBe(false);
      expect(floors.textContent).toContain('Betonový základ');
      expect(floors.textContent).toContain('Linoleum');
      expect(floors.textContent).toContain('Litá podlaha');
      expect(floors.textContent).toContain('Podlahy po rekonstrukci.');
    }
    expect(JSON.stringify(app.newPropertyDraft())).toBe(before);
    app.togglePropertyTabMultiValue('podlahy', 'Podlahy', 'Vinyl');
    expect(app.newPropertyDraft().tabValues['okna']['Podlahy']).toBeUndefined();
    expect(app.hasPropertyTabMultiValue('podlahy', 'Podlahy', 'Linoleum')).toBe(true);
    expect(app.hasPropertyTabMultiValue('podlahy', 'Podlahy', 'Vinyl')).toBe(true);
  });

  it('migrates floor notes, custom entries and print switches while preserving explicit canonical values', () => {
    const app = TestBed.createComponent(App).componentInstance as unknown as PrintHarness;
    const migrated = app.cloneSavedPropertyRecord({ propertyType: 'Byt', tabValues: {
      okna: { Podlahy: 'Betonový základ|Litá', 'Podlahy vlastní': 'Vlastní krytina',
        'Poznámka k podlahám': 'Původní poznámka', 'Podlahy__buyer-info-visible': 'NE', 'Druh oken': 'Dřevěná' }
    } });
    expect(migrated.tabValues['podlahy']).toMatchObject({ Podlahy: 'Betonový základ|Litá podlaha',
      'Podlahy vlastní': 'Vlastní krytina', 'Poznámka k podlahám': 'Původní poznámka', 'Podlahy__buyer-info-visible': 'NE' });
    expect(migrated.tabValues['okna']).toEqual({ 'Druh oken': 'Dřevěná' });
    const canonical = app.cloneSavedPropertyRecord({ propertyType: 'Byt', tabValues: {
      okna: { Podlahy: 'Linoleum', 'Poznámka k podlahám': 'Stará poznámka' },
      podlahy: { Podlahy: '', 'Poznámka k podlahám': 'Nová poznámka' }
    } });
    expect(canonical.tabValues['podlahy']['Podlahy']).toBe('');
    expect(canonical.tabValues['podlahy']['Poznámka k podlahám']).toBe('Nová poznámka');
    expect(canonical.tabValues['okna']['Podlahy']).toBeUndefined();
    expect(app.podlahyOptions()).toEqual([...app.podlahyOptions()].sort((a, b) => a.localeCompare(b, 'cs')));
  });

  it('retains a previously saved standalone unpermitted-building selection in the legal-defects list', () => {
    const app = TestBed.createComponent(App).componentInstance as unknown as PrintHarness;
    app.newPropertyDraft.update(draft => ({ ...draft, propertyType: 'Dům', tabValues: {
      ...draft.tabValues,
      'pravni-vady': { 'Právní vady a jiná omezení': 'Bankovní zástavy', 'Černá stavba': 'ANO' }
    } }));
    const write = vi.fn();
    vi.spyOn(window, 'open').mockReturnValue({ document: { open: vi.fn(), write, close: vi.fn() } } as unknown as Window);
    app.generateCurrentPropertyBuyerInfo();
    app.generateCurrentPropertyBrokerInfo();
    app.generateCurrentPropertyBlankForm();
    expect(write.mock.calls[0][0]).toContain('Bankovní zástavy, Černá stavba');
    expect(write.mock.calls[1][0]).toContain('Bankovní zástavy, Černá stavba');
    expect(write.mock.calls[2][0]).toContain('<span class="opt on">☑ Černá stavba</span>');
  });

  it('uses the same filled rows for buyer and broker summaries and changes the broker headings to red', () => {
    const app = TestBed.createComponent(App).componentInstance as unknown as PrintHarness;
    app.newPropertyDraft.update(draft => ({ ...draft, propertyType: 'Dům', tabValues: {
      ...draft.tabValues,
      elektina: { 'Zásuvka venku': 'ANO' },
      topeni: { 'Topné těleso': 'Plynový krb' }
    } }));
    const write = vi.fn();
    vi.spyOn(window, 'open').mockReturnValue({ document: { open: vi.fn(), write, close: vi.fn() } } as unknown as Window);
    app.generateCurrentPropertyBuyerInfo();
    app.generateCurrentPropertyBrokerInfo();
    const buyer = new DOMParser().parseFromString(write.mock.calls[0][0] as string, 'text/html');
    const broker = new DOMParser().parseFromString(write.mock.calls[1][0] as string, 'text/html');
    expect(broker.querySelector('main')!.innerHTML).toBe(buyer.querySelector('main')!.innerHTML);
    expect(buyer.querySelector('h1')!.textContent).toBe('INFORMACE PRO ZÁJEMCE');
    expect(broker.querySelector('h1')!.textContent).toBe('INFORMACE PRO MAKLÉŘE');
    expect(broker.querySelector('style')!.textContent).toContain('.top{background:#b91c1c}.info-card h2{background:#dc2626}');
    expect(buyer.querySelector('style')!.textContent).not.toContain('#dc2626');
    expect(broker.querySelectorAll('.opt')).toHaveLength(0);
    expect(broker.querySelector('main')!.textContent).not.toContain('Elektroměr');
  });

  it.each(['Rodinný dům', 'Dům'])('hides unit and service-breakdown sections for %s even with saved data and divided units', propertyType => {
    const app = TestBed.createComponent(App).componentInstance as unknown as PrintHarness;
    app.newPropertyDraft.update(draft => ({ ...draft, propertyType, tabValues: {
      stavba: { 'Rozděleno na jednotky': 'Ano', 'Počet jednotek v domě': '2' },
      jednotka: { 'Vlastnictví jednotky': 'Osobní', 'Poznámka': 'Skrytá jednotka' },
      'rozpis-sluzeb': { 'Poznámka': 'Skrytý rozpis služeb' }
    } }));
    const tabs = app.visiblePropertySectionTabs().map(tab => tab.key);
    expect(tabs).not.toContain('jednotka');
    expect(tabs).not.toContain('rozpis-sluzeb');
    expect(tabs).toContain('prostory');
    const write = vi.fn();
    vi.spyOn(window, 'open').mockReturnValue({ document: { open: vi.fn(), write, close: vi.fn() } } as unknown as Window);
    app.generateCurrentPropertyBuyerInfo();
    app.generateCurrentPropertyBrokerInfo();
    app.generateCurrentPropertyBlankForm();
    for (const [html] of write.mock.calls) {
      const report = new DOMParser().parseFromString(html as string, 'text/html');
      const headings = [...report.querySelectorAll('h2')].map(heading => heading.textContent);
      expect(headings).not.toContain('JEDNOTKA');
      expect(headings).not.toContain('ROZPIS SLUŽEB');
      expect(report.body.textContent).not.toContain('Skrytý rozpis služeb');
    }
    expect(app.newPropertyDraft().tabValues['rozpis-sluzeb']['Poznámka']).toBe('Skrytý rozpis služeb');
    app.newPropertyDraft.update(draft => ({ ...draft, propertyType: 'Bytový dům' }));
    expect(app.visiblePropertySectionTabs().map(tab => tab.key)).toContain('jednotka');
    expect(app.visiblePropertySectionTabs().map(tab => tab.key)).toContain('rozpis-sluzeb');
  });

  it('places the access-road section after land in form and all reports, and prints privacy as a main benefit', () => {
    const app = TestBed.createComponent(App).componentInstance as unknown as PrintHarness;
    expect(app.hlavniPrednostiOptions()).toContain('Soukromí');
    app.newPropertyDraft.update(draft => ({ ...draft, propertyType: 'Rodinný dům', tabValues: {
      pozemek: { 'Pozemek ano/ne': 'Ano', 'Poznámka k pozemku': 'Rovinatý pozemek.' }, stavba: { 'Rok výstavby': '2000' },
      'prijezdova-komunikace': { 'Poznámka k příjezdové komunikaci': 'Zpevněná cesta k domu.' },
      'hlavni-prednosti': { 'Hlavní přednosti': 'Soukromí' }
    } }));
    const tabs = app.visiblePropertySectionTabs().map(tab => tab.key);
    expect(tabs[tabs.indexOf('pozemek') + 1]).toBe('prijezdova-komunikace');
    const write = vi.fn();
    vi.spyOn(window, 'open').mockReturnValue({ document: { open: vi.fn(), write, close: vi.fn() } } as unknown as Window);
    app.generateCurrentPropertyBuyerInfo();
    app.generateCurrentPropertyBrokerInfo();
    app.generateCurrentPropertyBlankForm();
    for (const [html] of write.mock.calls) {
      const report = new DOMParser().parseFromString(html as string, 'text/html');
      const headings = [...report.querySelectorAll('h2')].map(heading => heading.textContent);
      expect(headings[headings.indexOf('POZEMEK') + 1]).toBe('PŘÍJEZDOVÁ KOMUNIKACE');
      expect(headings[headings.indexOf('PŘÍJEZDOVÁ KOMUNIKACE') + 1]).toBe('STAVBA');
      expect(report.body.textContent).toContain('Soukromí');
    }
  });

  it('includes excluded notes and combined rows in the broker summary, while keeping all choices in the third report', () => {
    const app = TestBed.createComponent(App).componentInstance as unknown as PrintHarness;
    app.newPropertyDraft.update(draft => ({ ...draft, propertyType: 'Dům', address: 'Skrytá adresa 123', tabValues: {
      ...draft.tabValues,
      zakladni: { 'Smlouva': 'Interní smlouva', 'Adresa nemovitosti__buyer-info-visible': 'NE' },
      stavba: {
        'Poznámka ke stavbě': 'Interní poznámka ke stavbě', 'Poznámka ke stavbě__buyer-info-visible': 'NE',
        'Stavba__buyer-info-visible': 'NE', 'stavba-parcel-0-parcel': '999/77'
      },
      'prijezdova-komunikace': {
        'Poznámka k příjezdové komunikaci': 'Soukromá informace o příjezdu',
        'Poznámka k příjezdové komunikaci__buyer-info-visible': 'NE'
      },
      'pravni-vady': {
        'Právní vady a jiná omezení': 'Černá stavba', 'Informace k černé stavbě': 'Detail černé stavby',
        'Černá stavba__buyer-info-visible': 'NE'
      }
    } }));
    const before = JSON.stringify(app.newPropertyDraft());
    const write = vi.fn();
    vi.spyOn(window, 'open').mockReturnValue({ document: { open: vi.fn(), write, close: vi.fn() } } as unknown as Window);
    app.generateCurrentPropertyBuyerInfo();
    app.generateCurrentPropertyBrokerInfo();
    app.generateCurrentPropertyBlankForm();
    const documents = write.mock.calls.map(([html]) => new DOMParser().parseFromString(html as string, 'text/html'));
    for (const value of ['Skrytá adresa 123', 'Interní smlouva', 'Interní poznámka ke stavbě', '999/77', 'Soukromá informace o příjezdu', 'Detail černé stavby']) {
      expect(documents[0].querySelector('main')!.textContent).not.toContain(value);
      expect(documents[1].querySelector('main')!.textContent).toContain(value);
    }
    expect(documents[2].querySelector('h1')!.textContent).toBe('PRÁZDNÝ FORMULÁŘ');
    expect(documents[2].querySelectorAll('.opt').length).toBeGreaterThan(0);
    expect(documents[2].querySelector('main')!.textContent).toContain('Elektroměr');
    expect(documents[2].querySelector('main')!.textContent).toContain('Detail černé stavby');
    expect(documents[1].querySelector('main')!.textContent).not.toContain('__buyer-info-visible');
    expect(JSON.stringify(app.newPropertyDraft())).toBe(before);
  });

  it('prints linked client contacts only in the broker report, including reverse links without duplicates', () => {
    const app = TestBed.createComponent(App).componentInstance as unknown as PrintHarness;
    app.activeSavedPropertyId.set('property-1');
    app.newPropertyDraft.update(draft => ({
      ...draft, linkedClientIds: ['client-1', 'client-1', 'missing-client'],
      tabValues: { ...draft.tabValues, zakladni: { 'Služba': 'Prodej' } }
    }));
    app.savedClientRecords.set([
      { id: 'client-1', draft: { fullName: 'Jan <Novák>', companyName: '', phonePrefix: '+420', phone: '777 111 222', email: 'jan@example.cz', linkedPropertyId: 'property-1' } },
      { id: 'client-2', draft: { fullName: 'Eva Svobodová', companyName: '', phonePrefix: '+420', phone: '777 333 444', email: 'eva@example.cz', linkedPropertyId: 'property-1' } },
      { id: 'client-3', draft: { fullName: 'Nesouvisející klient', companyName: '', phonePrefix: '+420', phone: '777 555 666', email: 'other@example.cz', linkedPropertyId: 'property-2' } }
    ]);
    const write = vi.fn();
    vi.spyOn(window, 'open').mockReturnValue({ document: { open: vi.fn(), write, close: vi.fn() } } as unknown as Window);
    app.generateCurrentPropertyBuyerInfo();
    app.generateCurrentPropertyBrokerInfo();
    app.generateCurrentPropertyBlankForm();
    const documents = write.mock.calls.map(([html]) => new DOMParser().parseFromString(html as string, 'text/html'));
    const sections = [...documents[1].querySelectorAll('main > section')];
    expect(sections.slice(0, 2).map(section => section.querySelector('h2')?.textContent)).toEqual(['KLIENT', 'ZÁKLADNÍ INFORMACE']);
    const contacts = [...sections[0].querySelectorAll('.client-details')];
    expect(contacts.map(contact => [...contact.querySelectorAll('.info-label')].map(label => label.textContent))).toEqual([
      ['Jméno a příjmení', 'Telefon', 'E-mail'], ['Jméno a příjmení', 'Telefon', 'E-mail']
    ]);
    expect(contacts.map(contact => [...contact.querySelectorAll('.info-value')].map(value => value.textContent))).toEqual([
      ['Jan <Novák>', '+420 777 111 222', 'jan@example.cz'], ['Eva Svobodová', '+420 777 333 444', 'eva@example.cz']
    ]);
    expect(sections[1].textContent).not.toContain('jan@example.cz');
    expect(write.mock.calls[1][0]).toContain('Jan &lt;Novák&gt;');
    for (const document of [documents[0], documents[2]]) {
      expect(document.querySelector('main')!.textContent).not.toContain('jan@example.cz');
      expect(document.querySelector('main')!.textContent).not.toContain('eva@example.cz');
    }
    expect(documents[1].querySelector('main')!.textContent).not.toContain('other@example.cz');
  });

  it('offers Bytový dům as a standard type with disposition and multiple units', () => {
    const app = TestBed.createComponent(App).componentInstance as unknown as PrintHarness;
    app.newPropertyDraft.update(draft => ({ ...draft, propertyType: 'Bytový dům', tabValues: {
      ...draft.tabValues, stavba: { 'Rozděleno na jednotky': 'Ano', 'Počet jednotek v domě': '3' }
    } }));
    expect(app.propertyTypeFormOptions()).toContain('Bytový dům');
    expect(app.shouldShowProstoryGeneralFields()).toBe(true);
    expect(app.visiblePropertySectionTabs().map(tab => tab.key)).toContain('prostory');
    expect(app.dispoziceUnits()).toEqual(['A', 'B', 'C']);
  });

  it.each(['Dům', 'Rodinný dům', 'Bytový dům', 'Byt'])('prints the Nemovitost field under basic information for %s', type => {
    const app = TestBed.createComponent(App).componentInstance as unknown as PrintHarness;
    app.newPropertyDraft.update(draft => ({ ...draft, propertyType: type, tabValues: {
      ...draft.tabValues, zakladni: { 'Nemovitost': type }
    } }));
    const write = vi.fn();
    vi.spyOn(window, 'open').mockReturnValue({ document: { open: vi.fn(), write, close: vi.fn() } } as unknown as Window);
    app.generateCurrentPropertyBuyerInfo();
    app.generateCurrentPropertyBrokerInfo();
    app.generateCurrentPropertyBlankForm();
    const expectedType = type === 'Dům' ? 'Rodinný dům' : type;
    for (const [html] of write.mock.calls) {
      const document = new DOMParser().parseFromString(html as string, 'text/html');
      const section = [...document.querySelectorAll('main > section')].find(section => section.querySelector('h2')?.textContent === 'ZÁKLADNÍ INFORMACE')!;
      const rows = [...section.querySelectorAll('.info-row')].filter(row => row.querySelector('.info-label')?.textContent === 'Nemovitost');
      expect(rows).toHaveLength(1);
      expect(rows[0].querySelector('.info-value')!.textContent).toContain(expectedType);
    }
  });

  it('migrates saved Dům records and recognizes the old name as the standard Rodinný dům type', () => {
    const app = TestBed.createComponent(App).componentInstance as unknown as PrintHarness;
    expect(app.cloneSavedPropertyRecord({ propertyType: 'Dům' }).propertyType).toBe('Rodinný dům');
    app.newPropertyDraft.update(draft => ({ ...draft, propertyType: 'Dům' }));
    expect(app.propertyTypeSelectValue()).toBe('Rodinný dům');
    expect(app.isPropertyTypeCustom('Dům')).toBe(false);
    expect(app.shouldShowProstoryGeneralFields()).toBe(true);
    expect(app.propertyTypeFormOptions()).toContain('Rodinný dům');
    expect(app.propertyTypeFormOptions()).not.toContain('Dům');
  });

  it('prints basic information in form-column order, regardless of the order of data entry', () => {
    const app = TestBed.createComponent(App).componentInstance as unknown as PrintHarness;
    app.newPropertyDraft.update(draft => ({ ...draft, title: '2026-123', propertyType: 'Rodinný dům', address: 'Říkovice 116', tabValues: {
      zakladni: { 'Nejblížší adresa': 'Říkovice 115', 'Smlouva': 'Výhradní', 'Smlouva__buyer-info-visible': 'ANO', 'Služba': 'Prodej', 'Vlastnictví': 'Osobní' }
    } }));
    const write = vi.fn();
    vi.spyOn(window, 'open').mockReturnValue({ document: { open: vi.fn(), write, close: vi.fn() } } as unknown as Window);
    app.generateCurrentPropertyBuyerInfo();
    app.generateCurrentPropertyBrokerInfo();
    app.generateCurrentPropertyBlankForm();
    for (const [html] of write.mock.calls) {
      const document = new DOMParser().parseFromString(html as string, 'text/html');
      const basic = [...document.querySelectorAll('main > section')].find(section => section.querySelector('h2')?.textContent === 'ZÁKLADNÍ INFORMACE')!;
      const labels = [...basic.querySelectorAll('.info-label')].map(label => label.textContent!.startsWith('Nejblížší adresa') ? 'Nejblížší adresa' : label.textContent);
      expect(labels).toEqual(['Číslo případu', 'Nemovitost', 'Vlastnictví', 'Služba', 'Smlouva', 'Adresa nemovitosti', 'Nejblížší adresa']);
    }
  });

  it('keeps fields in form order across all populated sections when values are inserted in reverse order', () => {
    const app = TestBed.createComponent(App).componentInstance as unknown as PrintHarness;
    const tabValues = Object.fromEntries(PROPERTY_INTAKE_FORM.map(section => [section.key, Object.fromEntries(
      [...section.fields].reverse().filter(field => field.field && !field.field.startsWith('@'))
        .map(field => [field.field!, `Hodnota ${field.field}`])
    )]));
    app.newPropertyDraft.update(draft => ({ ...draft, propertyType: 'Garáž', tabValues }));
    const write = vi.fn();
    vi.spyOn(window, 'open').mockReturnValue({ document: { open: vi.fn(), write, close: vi.fn() } } as unknown as Window);
    app.generateCurrentPropertyBrokerInfo();
    app.generateCurrentPropertyBuyerInfo();
    for (const [html] of write.mock.calls) {
      const document = new DOMParser().parseFromString(html as string, 'text/html');
      let checked = 0;
      for (const tab of app.propertySectionTabs()) {
        const schemas = PROPERTY_INTAKE_FORM.filter(section => section.key === tab.key || (tab.key === 'hlavni-prednosti' && section.key === 'pravni-vady'));
        const fields = schemas.flatMap(section => section.fields);
        const card = [...document.querySelectorAll('main > section')].find(section => section.querySelector('h2')?.textContent === tab.label);
        if (!card) continue;
        const ranks = [...card.querySelectorAll('.info-label')].map(label => fields.findIndex(field =>
          [field.field, field.label].some(name => name?.toLocaleLowerCase('cs-CZ') === label.textContent?.toLocaleLowerCase('cs-CZ'))
        )).filter(index => index >= 0);
        expect(ranks, tab.label).toEqual([...ranks].sort((a, b) => a - b));
        checked++;
      }
      expect(checked).toBeGreaterThan(25);
    }
  });

  it.each<{ name: string; values: Record<string, string>; note: boolean }>([
    { name: 'only a layout', values: { 'Dispozice jednotky': '2+kk' }, note: false },
    { name: 'rooms without dimensions', values: { 'Seznam místností': 'Pokoj', 'Dispozice jednotky': '2+kk' }, note: false },
    { name: 'cleared dimensions', values: { 'Seznam místností': 'Pokoj', 'Pokoj__0__width': '', 'Pokoj__0__length': ' ' }, note: false },
    { name: 'dimensions for a deselected room', values: { 'Dispozice jednotky': '2+kk', 'Pokoj__0__width': '3 m', 'Pokoj__0__length': '4 m' }, note: false },
    { name: 'one entered room dimension', values: { 'Seznam místností': 'Pokoj', 'Pokoj__0__width': '3 m' }, note: true },
    { name: 'entered room dimensions', values: { 'Seznam místností': 'Pokoj', 'Pokoj__0__width': '3 m', 'Pokoj__0__length': '4 m' }, note: true }
  ])('prints the measurement note correctly for $name', ({ values, note }) => {
    const app = TestBed.createComponent(App).componentInstance as unknown as PrintHarness;
    app.newPropertyDraft.update(draft => ({ ...draft, propertyType: 'Byt', tabValues: { prostory: values } }));
    const write = vi.fn();
    vi.spyOn(window, 'open').mockReturnValue({ document: { open: vi.fn(), write, close: vi.fn() } } as unknown as Window);
    app.generateCurrentPropertyBuyerInfo();
    app.generateCurrentPropertyBrokerInfo();
    for (const [html] of write.mock.calls) {
      expect((html as string).includes('*Rozměry jsou orientační')).toBe(note);
      if (note) {
        expect(html).toContain('Pokoj (3 m');
        const document = new DOMParser().parseFromString(html as string, 'text/html');
        const roomNote = [...document.querySelectorAll('.info-row')].find(row => row.querySelector('.info-value')?.textContent?.includes('*Rozměry jsou orientační'))!;
        expect(roomNote.classList.contains('info-row-full')).toBe(false);
      }
    }
  });

  it.each([
    { tab: 'elektina', field: 'Poznámka k elektřině' },
    { tab: 'ohrev-vody', field: 'Poznámka k ohřevu vody' },
    { tab: 'topeni', field: 'Poznámka k topení' },
    { tab: 'kanalizace', field: 'Poznámka ke kanalizaci' }
  ])('prints $field across the full width regardless of the note length', ({ tab, field }) => {
    const app = TestBed.createComponent(App).componentInstance as unknown as PrintHarness;
    const longNote = 'tato poznámka je záměrně delší než pětapadesát znaků a přesune se na vlastní řádek';
    expect(longNote.length).toBeGreaterThan(55);
    app.newPropertyDraft.update(draft => ({ ...draft, tabValues: { ...draft.tabValues, [tab]: { [field]: 'krátká poznámka' } } }));
    const write = vi.fn();
    vi.spyOn(window, 'open').mockReturnValue({ document: { open: vi.fn(), write, close: vi.fn() } } as unknown as Window);
    app.generateCurrentPropertyBuyerInfo();
    const shortDocument = new DOMParser().parseFromString(write.mock.calls[0][0] as string, 'text/html');
    const shortRow = [...shortDocument.querySelectorAll('.info-row')].find(row => row.querySelector('.info-label')?.textContent === field)!;
    expect(shortRow.querySelector('.info-value')!.textContent).toBe('krátká poznámka');
    expect(shortRow.classList.contains('info-row-full')).toBe(true);
    app.newPropertyDraft.update(draft => ({ ...draft, tabValues: { ...draft.tabValues, [tab]: { [field]: longNote } } }));
    app.generateCurrentPropertyBrokerInfo();
    const longDocument = new DOMParser().parseFromString(write.mock.calls[1][0] as string, 'text/html');
    const longRow = [...longDocument.querySelectorAll('.info-row')].find(row => row.querySelector('.info-label')?.textContent === field)!;
    expect(longRow.querySelector('.info-value')!.textContent).toBe(longNote);
    expect(longRow.classList.contains('info-row-full')).toBe(true);
  });

  it('prints all units in sequence with their dimensions even when another unit is collapsed in the form', () => {
    const app = TestBed.createComponent(App).componentInstance as unknown as PrintHarness;
    app.newPropertyDraft.update(draft => ({ ...draft, propertyType: 'Bytový dům', tabValues: {
      stavba: { 'Rozděleno na jednotky': 'Ano', 'Počet jednotek v domě': '2' },
      prostory: {
        'Poznámka k dispozici': 'Společná poznámka', 'Seznam místností B': 'Pokoj', 'Pokoj__B__0__width': '3 m', 'Dispozice jednotky B': '2+kk',
        'Seznam místností A': 'Pokoj', 'Dispozice jednotky A': '1+kk'
      }
    } }));
    expect(app.isDispoziceUnitOpen('A')).toBe(true);
    app.toggleDispoziceUnit('B');
    expect(app.isDispoziceUnitOpen('A')).toBe(false);
    expect(app.isDispoziceUnitOpen('B')).toBe(true);
    const write = vi.fn();
    vi.spyOn(window, 'open').mockReturnValue({ document: { open: vi.fn(), write, close: vi.fn() } } as unknown as Window);
    app.generateCurrentPropertyBuyerInfo();
    app.generateCurrentPropertyBrokerInfo();
    for (const [html] of write.mock.calls) {
      const document = new DOMParser().parseFromString(html as string, 'text/html');
      const cards = [...document.querySelectorAll('main > section')];
      const card = (label: string) => cards.find(section => section.querySelector('h2')?.textContent === label)!;
      expect([...card('DISPOZICE A').querySelectorAll('.info-label')].map(label => label.textContent)).toEqual(['Dispozice', 'Seznam místností v jednotce']);
      expect([...card('DISPOZICE B').querySelectorAll('.info-label')].map(label => label.textContent)).toEqual(['Dispozice', 'Seznam místností v jednotce', 'Poznámka']);
      expect(cards.some(section => section.querySelector('h2')?.textContent === 'DISPOZICE')).toBe(false);
      expect(card('DISPOZICE B').textContent).toContain('Pokoj (3 m)');
      expect(card('POZNÁMKA K DISPOZICI').textContent).toContain('Společná poznámka');
    }
  });

  it('prints each building designation after its own area in all reports', () => {
    const app = TestBed.createComponent(App).componentInstance as unknown as PrintHarness;
    app.newPropertyDraft.update(draft => ({ ...draft, propertyType: 'Rodinný dům', tabValues: { stavba: {
      '__stavba-parcel-count': '3',
      'stavba-parcel-0-parcel': '224', 'stavba-parcel-0-type': 'rodinný dům', 'stavba-parcel-0-area': '690 m²',
      'stavba-parcel-0-buildingNumber': '9', 'stavba-parcel-0-buildingNumberType': 'Číslo popisné',
      'stavba-parcel-1-parcel': '225/2', 'stavba-parcel-1-type': 'zemědělská usedlost', 'stavba-parcel-1-area': '231 m²',
      'stavba-parcel-1-buildingNumber': '17', 'stavba-parcel-1-buildingNumberType': 'Číslo evidenční',
      'stavba-parcel-2-parcel': '228', 'stavba-parcel-2-type': 'garáž', 'stavba-parcel-2-area': '36 m²',
      'stavba-parcel-2-buildingNumberType': 'bez č. evidenčního / bez č. popisného'
    } } }));
    const write = vi.fn();
    vi.spyOn(window, 'open').mockReturnValue({ document: { open: vi.fn(), write, close: vi.fn() } } as unknown as Window);
    app.generateCurrentPropertyBuyerInfo();
    app.generateCurrentPropertyBrokerInfo();
    app.generateCurrentPropertyBlankForm();
    for (const [html] of write.mock.calls) {
      expect(html).not.toContain('parcela 224');
      expect(html).not.toContain('Označení budovy</div>');
      const document = new DOMParser().parseFromString(html as string, 'text/html');
      const stavbaRows = [...document.querySelectorAll('.info-row')].filter(row => /^Stavba \d+$/.test(row.querySelector('.info-label')?.textContent || ''));
      expect(stavbaRows.length).toBe(3);
      expect(stavbaRows[0].classList.contains('info-row-full')).toBe(false);
      expect(stavbaRows[0].classList.contains('info-row-stavba')).toBe(true);
      expect(stavbaRows[0].querySelector('.info-value')!.textContent).toContain('224 - rodinný dům č. p. 9 - 690 m²');
      expect(stavbaRows[1].querySelector('.info-value')!.textContent).toContain('225/2 - zemědělská usedlost č. e. 17 - 231 m²');
      expect(stavbaRows[2].querySelector('.info-value')!.textContent).toContain('228 - garáž bez č. p. / č. ev. - 36 m²');
      expect(stavbaRows[1].querySelector('.info-value')!.textContent).not.toContain(', 225/2');
      expect(stavbaRows[0].querySelector('.info-value')!.innerHTML).toContain('224 - <wbr>rodinný dům č. p. 9 - <wbr>690 m²');
      expect(stavbaRows[1].querySelector('.info-value')!.innerHTML).toContain('<wbr>zemědělská usedlost');
      expect(stavbaRows[1].querySelector('.info-value')!.innerHTML).toContain('<wbr>231 m²');
    }
    expect(write.mock.calls[0][0]).toContain('.info-row-stavba{grid-template-columns:max-content minmax(0,1fr)}');
    expect(write.mock.calls[0][0]).toContain('.info-row-stavba .info-value{text-align:right}');
    expect(write.mock.calls[0][0]).not.toContain('.info-row-stavba .info-value{padding-right');
    expect(write.mock.calls[2][0]).toContain('.info-row-stavba .info-value{text-align:right}');
    expect(app.stavbaBuildUpArea()).toBe('957 m²');
    expect(app.defaultHandoverPropertyDescription()).toContain('č. p. 9');
    expect(app.defaultHandoverPropertyDescription()).toContain('č. e. 17');
  });

  it('keeps a very long building summary on its own Stavba row aligned right instead of the long value rule', () => {
    const app = TestBed.createComponent(App).componentInstance as unknown as PrintHarness;
    const longType = 'rodinný dům určený k demolici a následné výstavbě se dvěma bytovými jednotkami a podkrovím';
    app.newPropertyDraft.update(draft => ({ ...draft, tabValues: { stavba: {
      '__stavba-parcel-count': '1',
      'stavba-parcel-0-parcel': '224', 'stavba-parcel-0-type': longType, 'stavba-parcel-0-area': '690 m²'
    } } }));
    const write = vi.fn();
    vi.spyOn(window, 'open').mockReturnValue({ document: { open: vi.fn(), write, close: vi.fn() } } as unknown as Window);
    app.generateCurrentPropertyBuyerInfo();
    const document = new DOMParser().parseFromString(write.mock.calls[0][0] as string, 'text/html');
    const row = [...document.querySelectorAll('.info-row')].find(element => element.querySelector('.info-label')?.textContent === 'Stavba 1')!;
    const value = row.querySelector('.info-value')!.textContent!;
    expect(value).toContain(longType);
    expect(value.length).toBeGreaterThan(55);
    expect(row.classList.contains('info-row-stavba')).toBe(true);
    expect(row.classList.contains('info-row-full')).toBe(false);
  });

  it('moves Jaké dotace a kdy longer than 55 characters to its own full width line aligned left', () => {
    const app = TestBed.createComponent(App).componentInstance as unknown as PrintHarness;
    const shortValue = 'státní dotace na fotovoltaiku';
    const longValue = `${shortValue} vyplacená v roce 2024 a výrazně delší text přesahující pětapadesát znaků celkem`;
    expect(shortValue.length).toBeLessThanOrEqual(55);
    expect(longValue.length).toBeGreaterThan(55);
    const write = vi.fn();
    vi.spyOn(window, 'open').mockReturnValue({ document: { open: vi.fn(), write, close: vi.fn() } } as unknown as Window);
    const generateAll = (): void => {
      app.generateCurrentPropertyBuyerInfo();
      app.generateCurrentPropertyBrokerInfo();
      app.generateCurrentPropertyBlankForm();
    };
    const rowsFor = (callIndex: number): Element[] => {
      const document = new DOMParser().parseFromString(write.mock.calls[callIndex][0] as string, 'text/html');
      return [...document.querySelectorAll('.info-row')].filter(row => row.querySelector('.info-label')?.textContent === 'Jaké dotace a kdy');
    };
    app.newPropertyDraft.update(draft => ({ ...draft, tabValues: { dotace: { 'Čerpané dotace': 'ANO', 'Jaké dotace a kdy': shortValue } } }));
    generateAll();
    for (const callIndex of [0, 1, 2]) {
      const [row] = rowsFor(callIndex);
      expect(row).toBeDefined();
      expect(row.classList.contains('info-row-full')).toBe(false);
    }
    app.newPropertyDraft.update(draft => ({ ...draft, tabValues: { dotace: { 'Čerpané dotace': 'ANO', 'Jaké dotace a kdy': longValue } } }));
    generateAll();
    for (const callIndex of [3, 4, 5]) {
      const [row] = rowsFor(callIndex);
      expect(row).toBeDefined();
      expect(row.classList.contains('info-row-full')).toBe(true);
      expect(row.querySelector('.info-value')!.textContent).toBe(longValue);
    }
  });

  it('keeps long non note values inline and prints area labels in lowercase', () => {
    const app = TestBed.createComponent(App).componentInstance as unknown as PrintHarness;
    const longText = 'velmi dlouhý text přesahující pětapadesát znaků, který se nemá přesouvat na vlastní řádek';
    expect(longText.length).toBeGreaterThan(55);
    app.newPropertyDraft.update(draft => ({ ...draft, propertyType: 'Rodinný dům', tabValues: {
      okna: { 'Rekonstrukce oken': longText, 'Poznámka k oknům a dveřím': longText },
      prostory: { 'Seznam místností': 'Obývací pokoj', 'Obývací pokoj__0__width': '5 m', 'Obývací pokoj__0__length': '7 m' }
    } }));
    const write = vi.fn();
    vi.spyOn(window, 'open').mockReturnValue({ document: { open: vi.fn(), write, close: vi.fn() } } as unknown as Window);
    app.generateCurrentPropertyBuyerInfo();
    app.generateCurrentPropertyBrokerInfo();
    app.generateCurrentPropertyBlankForm();
    for (const [html] of write.mock.calls) {
      const document = new DOMParser().parseFromString(html as string, 'text/html');
      const rows = [...document.querySelectorAll('.info-row')];
      const labels = rows.map(row => row.querySelector('.info-label')?.textContent || '');
      const rowFor = (label: string) => rows.find(row => row.querySelector('.info-label')?.textContent === label)!;
      expect(rowFor('Poznámka k oknům a dveřím').classList.contains('info-row-full')).toBe(true);
      const reconstruction = rowFor('Rekonstrukce oken');
      expect(reconstruction).toBeDefined();
      expect(reconstruction.classList.contains('info-row-full')).toBe(false);
      expect(reconstruction.querySelector('.info-value')!.textContent).toBe(longText);
      expect(labels).toContain('Podlahová plocha');
      expect(labels).toContain('Celková užitná plocha');
      expect(labels.some(label => label.startsWith('PODLAHOVÁ') || label.startsWith('OBYTNÁ') || label.startsWith('UŽITNÁ'))).toBe(false);
      expect(rowFor('Podlahová plocha').querySelector('.info-value')!.textContent).toBe('35,00 m²');
      expect(rowFor('Celková užitná plocha').querySelector('.info-value')!.textContent).toBe('35,00 m²');
    }
  });

  it('moves the old shared designation only to the first building and preserves explicit per-building values', () => {
    const app = TestBed.createComponent(App).componentInstance as unknown as PrintHarness;
    const migrated = app.cloneSavedPropertyRecord({ propertyType: 'Rodinný dům', tabValues: { stavba: {
      '__stavba-parcel-count': '2', 'Označení budovy': '9', 'Označení budovy typ': 'Číslo popisné',
      'stavba-parcel-1-parcel': '225/2'
    } } }).tabValues['stavba'];
    expect(migrated['stavba-parcel-0-buildingNumber']).toBe('9');
    expect(migrated['stavba-parcel-0-buildingNumberType']).toBe('Číslo popisné');
    expect(migrated['stavba-parcel-1-buildingNumber']).toBeUndefined();
    expect(migrated['Označení budovy']).toBeUndefined();
    const cleared = app.cloneSavedPropertyRecord({ propertyType: 'Rodinný dům', tabValues: { stavba: {
      'Označení budovy': '9', 'stavba-parcel-0-buildingNumber': ''
    } } }).tabValues['stavba'];
    expect(cleared['stavba-parcel-0-buildingNumber']).toBe('');
  });

  it('keeps building numbers with their rows when adding, removing and clearing buildings', () => {
    const app = TestBed.createComponent(App).componentInstance as unknown as PrintHarness;
    app.newPropertyDraft.update(draft => ({ ...draft, tabValues: { stavba: {
      'Označení budovy': '9', 'Označení budovy typ': 'Číslo popisné', 'stavba-parcel-0-parcel': '224'
    } } }));
    expect(app.stavbaParcelValue(0, 'buildingNumber')).toBe('9');
    app.addStavbaParcelRow();
    expect(app.stavbaParcelValue(1, 'buildingNumber')).toBe('');
    app.setStavbaParcelValue(1, 'parcel', '225/2');
    app.setStavbaParcelValue(1, 'buildingNumber', '17');
    app.setStavbaParcelValue(1, 'buildingNumberType', 'Číslo evidenční');
    app.removeStavbaParcelRow(0);
    expect(app.stavbaParcelValue(0, 'parcel')).toBe('225/2');
    expect(app.stavbaParcelValue(0, 'buildingNumber')).toBe('17');
    expect(app.stavbaParcelValue(0, 'buildingNumberType')).toBe('Číslo evidenční');
    app.setStavbaParcelValue(0, 'buildingNumber', '');
    expect(app.stavbaParcelValue(0, 'buildingNumber')).toBe('');
    expect(app.newPropertyDraft().tabValues['stavba']['Označení budovy']).toBeUndefined();
    expect(app.newPropertyDraft().tabValues['stavba']['stavba-parcel-1-buildingNumber']).toBeUndefined();
  });

  it('fills a dash for a building without a number and clears that placeholder when a number type is selected again', () => {
    const app = TestBed.createComponent(App).componentInstance as unknown as PrintHarness;
    expect(app.stavbaBuildingNumberOptions()).toEqual(['Číslo popisné', 'Číslo evidenční', 'bez č. p. / č. ev.']);
    app.setStavbaParcelValue(0, 'buildingNumber', '9');
    app.addStavbaParcelRow();
    app.setStavbaParcelValue(1, 'buildingNumber', '17');
    app.setStavbaParcelValue(1, 'buildingNumberType', 'bez č. p. / č. ev.');
    expect(app.stavbaParcelValue(1, 'buildingNumber')).toBe('-');
    expect(app.stavbaParcelValue(0, 'buildingNumber')).toBe('9');
    app.setStavbaParcelValue(1, 'buildingNumberType', 'Číslo evidenční');
    expect(app.stavbaParcelValue(1, 'buildingNumber')).toBe('');
    app.setStavbaParcelValue(1, 'buildingNumber', '22');
    app.setStavbaParcelValue(1, 'buildingNumberType', 'Číslo popisné');
    expect(app.stavbaParcelValue(1, 'buildingNumber')).toBe('22');
  });

  it('offers Nepodsklepený before Sklep, prints it, and never treats it as a measured room', () => {
    const app = TestBed.createComponent(App).componentInstance as unknown as PrintHarness;
    const options = app.prostoryUnitAccessoryOptions();
    expect(options[options.indexOf('Sklep') - 1]).toBe('Nepodsklepený');
    app.newPropertyDraft.update(draft => ({ ...draft, propertyType: 'Rodinný dům', tabValues: { prostory: {
      'Seznam místností': 'Sklep|Garáž', 'Sklep__0__width': '3 m', 'Sklep__0__length': '4 m'
    } } }));
    app.toggleProstoryMultiValue('Seznam místností', 'Nepodsklepený');
    expect(app.hasProstoryMultiValue('Seznam místností', 'Nepodsklepený')).toBe(true);
    expect(app.hasProstoryMultiValue('Seznam místností', 'Sklep')).toBe(false);
    expect(app.selectedProstoryRoomEntries().some(entry => entry.room === 'Nepodsklepený')).toBe(false);
    const write = vi.fn();
    vi.spyOn(window, 'open').mockReturnValue({ document: { open: vi.fn(), write, close: vi.fn() } } as unknown as Window);
    app.generateCurrentPropertyBuyerInfo();
    app.generateCurrentPropertyBrokerInfo();
    app.generateCurrentPropertyBlankForm();
    for (const [html] of write.mock.calls) {
      expect(html).toContain('Nepodsklepený, Garáž');
      expect(html).not.toContain('Sklep (3 m');
      expect(html).not.toContain('*Rozměry jsou orientační');
    }
    app.toggleProstoryMultiValue('Seznam místností', 'Sklep');
    expect(app.hasProstoryMultiValue('Seznam místností', 'Nepodsklepený')).toBe(false);
    expect(app.hasProstoryMultiValue('Seznam místností', 'Sklep')).toBe(true);
  });

  it('keeps unit accessories independent from other units and from shared accessories', () => {
    const app = TestBed.createComponent(App).componentInstance as unknown as PrintHarness;
    app.newPropertyDraft.update(draft => ({ ...draft, propertyType: 'Bytový dům', tabValues: {
      stavba: { 'Rozděleno na jednotky': 'Ano', 'Počet jednotek v domě': '2' }
    } }));
    expect(app.prostoryRoomListOptions()).not.toContain('Sklep');
    expect(app.prostoryUnitAccessoryOptions()).toEqual(['Nepodsklepený', 'Sklep', 'Garáž', 'Sauna']);
    expect(app.prostoryUnitAccessoryChips('A')).toEqual(['Nepodsklepený', 'Sklep', 'Garáž', 'Sauna']);
    expect(app.prostorySharedAccessoryOptions()).toEqual(['Krytý bazén', 'Pergola', 'Stodola', 'Garáž', 'Bazén', 'Vyhřívaný bazén', 'Sauna', 'Sklípek']);
    app.toggleProstoryMultiValue('Příslušenství v jednotce', 'Sklep', 'A');
    app.toggleProstoryMultiValue('Příslušenství v jednotce', 'Nepodsklepený', 'B');
    app.toggleProstoryMultiValue('Příslušenství nemovitosti', 'Pergola');
    expect(app.hasProstoryMultiValue('Příslušenství v jednotce', 'Sklep', 'A')).toBe(true);
    expect(app.hasProstoryMultiValue('Příslušenství v jednotce', 'Sklep', 'B')).toBe(false);
    expect(app.hasProstoryMultiValue('Příslušenství nemovitosti', 'Pergola')).toBe(true);
    expect(app.hasProstoryMultiValue('Příslušenství v jednotce', 'Pergola', 'A')).toBe(false);
  });

  it('moves legacy unit accessories out of room lists without losing their dimensions', () => {
    const app = TestBed.createComponent(App).componentInstance as unknown as PrintHarness;
    const values = app.cloneSavedPropertyRecord({ propertyType: 'Bytový dům', tabValues: { prostory: {
      'Seznam místností A': 'Obývací pokoj|Sklep|Garáž|Krytý bazén', 'Sklep__A__0__width': '3 m',
      'Seznam místností B': 'Ložnice|Bazén', 'Příslušenství nemovitosti': 'Stodola', 'Poznámka k příslušenství': 'Stará poznámka'
    } } }).tabValues['prostory'];
    expect(values['Seznam místností A']).toBe('Obývací pokoj');
    expect(values['Příslušenství v jednotce A']).toBe('Sklep|Garáž');
    expect(values['Seznam místností B']).toBe('Ložnice');
    expect(values['Příslušenství v jednotce B']).toBe('Bazén');
    expect(values['Sklep__A__0__width']).toBe('3 m');
    expect(values['Příslušenství nemovitosti']).toBe('Stodola|Krytý bazén');
    expect(values['Poznámka k příslušenství mimo jednotku']).toBe('Stará poznámka');
    expect(values['Poznámka k příslušenství']).toBeUndefined();
    const renamed = app.cloneSavedPropertyRecord({ propertyType: 'Bytový dům', tabValues: { prostory: {
      'Příslušenství jednotky A': 'Sklep', 'Příslušenství jednotky': 'Bazén', 'Příslušenství mimo jednotku B': 'Garáž|Krytý bazén'
    } } }).tabValues['prostory'];
    expect(renamed['Příslušenství v jednotce A']).toBe('Sklep');
    expect(renamed['Příslušenství v jednotce']).toBe('Bazén');
    expect(renamed['Příslušenství v jednotce B']).toBe('Garáž');
    expect(renamed['Příslušenství nemovitosti']).toBe('Krytý bazén');
    expect(renamed['Příslušenství jednotky A']).toBeUndefined();
    expect(renamed['Příslušenství jednotky']).toBeUndefined();
    expect(renamed['Příslušenství mimo jednotku B']).toBeUndefined();
  });

  it('supports typed custom unit accessories and keeps legacy Bazén as a removable accessory', () => {
    const app = TestBed.createComponent(App).componentInstance as unknown as PrintHarness;
    app.newPropertyDraft.update(draft => ({ ...draft, propertyType: 'Rodinný dům', tabValues: { prostory: {
      'Příslušenství v jednotce': 'Sklep'
    } } }));
    expect(app.prostoryUnitAccessoryChips()).toEqual(['Nepodsklepený', 'Sklep', 'Garáž', 'Sauna']);
    expect(app.hasProstoryAccessoryCustomValue()).toBe(false);
    app.toggleProstoryAccessoryCustom();
    app.setProstoryAccessoryCustomValue('', 'Vlastní prvek');
    expect(app.hasProstoryAccessoryCustomValue()).toBe(true);
    expect(app.prostoryAccessoryCustomValue()).toBe('Vlastní prvek');
    expect(app.prostoryUnitAccessoryChips()).toEqual(['Nepodsklepený', 'Sklep', 'Garáž', 'Sauna']);
    const write = vi.fn();
    vi.spyOn(window, 'open').mockReturnValue({ document: { open: vi.fn(), write, close: vi.fn() } } as unknown as Window);
    app.generateCurrentPropertyBuyerInfo();
    const [html] = write.mock.calls[0];
    expect(html).toContain('Sklep, Vlastní prvek');
    expect(html).not.toContain('dopsat vlastní');
    app.toggleProstoryAccessoryCustom();
    expect(app.hasProstoryAccessoryCustomValue()).toBe(false);
    expect(app.prostoryAccessoryCustomValue()).toBe('');
    app.newPropertyDraft.update(draft => ({ ...draft, tabValues: { ...draft.tabValues, prostory: { ...draft.tabValues['prostory'], 'Příslušenství v jednotce': 'Bazén' } } }));
    expect(app.hasProstoryMultiValue('Příslušenství v jednotce', 'Bazén')).toBe(true);
    expect(app.prostoryUnitAccessoryChips()).toEqual(['Nepodsklepený', 'Sklep', 'Garáž', 'Sauna', 'Bazén']);
  });

  it('ignores stale unit-less prostory keys in unit sections when the property is split into units', () => {
    const app = TestBed.createComponent(App).componentInstance as unknown as PrintHarness;
    app.newPropertyDraft.update(draft => ({ ...draft, propertyType: 'Bytový dům', tabValues: {
      stavba: { 'Rozděleno na jednotky': 'Ano', 'Počet jednotek v domě': '2' },
      prostory: {
        'Dispozice jednotky': '3+kk', 'Dispozice jednotky A': '3+kk', 'Dispozice A': '3+kk',
        'Seznam místností': 'Obývací pokoj', 'Seznam místností A': 'Obývací pokoj',
        'Příslušenství v jednotce': 'Bazén|Nepodsklepený', 'Příslušenství v jednotce A': ''
      }
    } }));
    const write = vi.fn();
    vi.spyOn(window, 'open').mockReturnValue({ document: { open: vi.fn(), write, close: vi.fn() } } as unknown as Window);
    app.generateCurrentPropertyBuyerInfo();
    app.generateCurrentPropertyBrokerInfo();
    app.generateCurrentPropertyBlankForm();
    for (const [html] of write.mock.calls) {
      expect(html).not.toContain('Bazén, Nepodsklepený');
    }
    for (const callIndex of [0, 1]) {
      const document = new DOMParser().parseFromString(write.mock.calls[callIndex][0] as string, 'text/html');
      const cardA = [...document.querySelectorAll('main > section')].find(section => section.querySelector('h2')?.textContent === 'DISPOZICE A')!;
      const labels = [...cardA.querySelectorAll('.info-label')].map(element => element.textContent);
      expect(labels.filter(label => label === 'Dispozice')).toHaveLength(1);
    }
  });

  it('prints each unit in its own dispozice section before the shared accessory list', () => {
    const app = TestBed.createComponent(App).componentInstance as unknown as PrintHarness;
    app.newPropertyDraft.update(draft => ({ ...draft, propertyType: 'Bytový dům', tabValues: {
      stavba: { 'Rozděleno na jednotky': 'Ano', 'Počet jednotek v domě': '2' },
      prostory: {
        'Poznámka k příslušenství mimo jednotku': 'Stodola za domem', 'Příslušenství nemovitosti': 'Pergola',
        'Poznámka k jednotce B': 'Poznámka pro B', 'Příslušenství v jednotce B': 'Nepodsklepený', 'Dispozice jednotky B': '2+kk',
        'Poznámka k jednotce A': 'Poznámka pro A', 'Příslušenství v jednotce A': 'Sklep', 'Dispozice jednotky A': '1+kk'
      }
    } }));
    const write = vi.fn();
    vi.spyOn(window, 'open').mockReturnValue({ document: { open: vi.fn(), write, close: vi.fn() } } as unknown as Window);
    app.generateCurrentPropertyBuyerInfo();
    app.generateCurrentPropertyBrokerInfo();
    for (const [html] of write.mock.calls) {
      const document = new DOMParser().parseFromString(html as string, 'text/html');
      const cards = [...document.querySelectorAll('main > section')];
      const card = (label: string) => cards.find(section => section.querySelector('h2')?.textContent === label)!;
      const labels = (label: string) => [...card(label).querySelectorAll('.info-label')].map(element => element.textContent);
      expect(cards.some(section => section.querySelector('h2')?.textContent === 'DISPOZICE')).toBe(false);
      expect(labels('DISPOZICE A')).toEqual(['Dispozice', 'Sklep a další vybavení v jednotce', 'Poznámka k jednotce']);
      expect(labels('DISPOZICE B')).toEqual(['Dispozice', 'Sklep a další vybavení v jednotce', 'Poznámka k jednotce']);
      expect(labels('SAMOSTATNĚ STOJÍCÍ VYBAVENÍ')).toEqual(['Samostatně stojící vybavení', 'Poznámka k samostatně stojícímu vybavení']);
      expect(card('SAMOSTATNĚ STOJÍCÍ VYBAVENÍ').textContent).toContain('Stodola za domem');
      expect(card('SAMOSTATNĚ STOJÍCÍ VYBAVENÍ').textContent).toContain('Pergola');
      expect(cards.some(section => section.querySelector('h2')?.textContent === 'SOCIÁLNÍ ZÁZEMÍ')).toBe(false);
    }
    app.generateCurrentPropertyBlankForm();
    const blank = write.mock.calls[2][0] as string;
    const blankDocument = new DOMParser().parseFromString(blank, 'text/html');
    const blankHeadings = [...blankDocument.querySelectorAll('main > section')].map(section => section.querySelector('h2')?.textContent);
    expect(blankHeadings).toContain('DISPOZICE A');
    expect(blankHeadings).toContain('DISPOZICE B');
    expect(blankHeadings).toContain('SAMOSTATNĚ STOJÍCÍ VYBAVENÍ');
    const blankCard = (label: string) => [...blankDocument.querySelectorAll('main > section')].find(section => section.querySelector('h2')?.textContent === label)!;
    const blankLabels = (label: string) => [...blankCard(label).querySelectorAll('.info-label')].map(element => element.textContent);
    expect(blankLabels('DISPOZICE A')).toContain('Sklep a další vybavení v jednotce');
    expect(blankLabels('DISPOZICE A')).not.toContain('Sklep a další vybavení v jednotce A');
    expect(blankLabels('DISPOZICE A')).not.toContain('Samostatně stojící vybavení');
    expect(blank).toContain('Poznámka pro B');
    expect(blank).toContain('Stodola za domem');
    expect(blank).not.toContain('Příslušenství nemovitosti A');
  });

  it('fills social facilities per unit when the property is split into units', () => {
    const app = TestBed.createComponent(App).componentInstance as unknown as PrintHarness;
    app.newPropertyDraft.update(draft => ({ ...draft, propertyType: 'Bytový dům', tabValues: {
      stavba: { 'Rozděleno na jednotky': 'Ano', 'Počet jednotek v domě': '2' }
    } }));
    expect(app.socialniZazemiUnits()).toEqual(['A', 'B']);
    app.setSocialniZazemiFieldValue('Počet koupelen', '1', 'A');
    app.setSocialniZazemiFieldValue('Počet koupelen', '2', 'B');
    app.setSocialniZazemiFieldValue('Poznámka k sociálnímu zázemí', 'Poznámka pro B', 'B');
    expect(app.socialniZazemiFieldValue('Počet koupelen', 'A')).toBe('1');
    expect(app.socialniZazemiFieldValue('Počet koupelen', 'B')).toBe('2');
    expect(app.socialniZazemiFieldValue('Počet WC', 'B')).toBe('');
    app.toggleSocialniZazemiMultiValue('Vybavení koupelny', 'Vana', 'A');
    expect(app.hasSocialniZazemiMultiValue('Vybavení koupelny', 'Vana', 'A')).toBe(true);
    expect(app.hasSocialniZazemiMultiValue('Vybavení koupelny', 'Vana', 'B')).toBe(false);
    const write = vi.fn();
    vi.spyOn(window, 'open').mockReturnValue({ document: { open: vi.fn(), write, close: vi.fn() } } as unknown as Window);
    app.generateCurrentPropertyBuyerInfo();
    app.generateCurrentPropertyBrokerInfo();
    for (const [html] of write.mock.calls) {
      const document = new DOMParser().parseFromString(html as string, 'text/html');
      const cards = [...document.querySelectorAll('main > section')];
      const card = (label: string) => cards.find(section => section.querySelector('h2')?.textContent === label)!;
      const labels = (label: string) => [...card(label).querySelectorAll('.info-label')].map(element => element.textContent);
      expect(cards.some(section => section.querySelector('h2')?.textContent === 'SOCIÁLNÍ ZÁZEMÍ')).toBe(false);
      expect(labels('SOCIÁLNÍ ZÁZEMÍ A')).toEqual(['Počet koupelen', 'Vybavení koupelny']);
      expect(labels('SOCIÁLNÍ ZÁZEMÍ B')).toEqual(['Počet koupelen', 'Poznámka k sociálnímu zázemí B']);
      expect(card('SOCIÁLNÍ ZÁZEMÍ B').textContent).toContain('Poznámka pro B');
    }
    app.generateCurrentPropertyBlankForm();
    const blank = write.mock.calls[2][0] as string;
    const blankDocument = new DOMParser().parseFromString(blank, 'text/html');
    const card = (label: string) => [...blankDocument.querySelectorAll('main > section')].find(section => section.querySelector('h2')?.textContent === label)!;
    expect([...card('SOCIÁLNÍ ZÁZEMÍ A').querySelectorAll('.info-label')].map(element => element.textContent)).toEqual([
      'Bytové jádro', 'Počet koupelen', 'Počet WC', 'V koupelně', 'Toaleta – Druh toalety A', 'Toaleta – Umístění toalety A', 'Pračka A', 'Poznámka k sociálnímu zázemí A'
    ]);
    expect([...card('SOCIÁLNÍ ZÁZEMÍ B').querySelectorAll('.info-label')].map(element => element.textContent)).toEqual([
      'Bytové jádro', 'Počet koupelen', 'Počet WC', 'V koupelně', 'Toaleta – Druh toalety B', 'Toaleta – Umístění toalety B', 'Pračka B', 'Poznámka k sociálnímu zázemí B'
    ]);
    expect(card('SOCIÁLNÍ ZÁZEMÍ B').textContent).toContain('2');
    expect(card('SOCIÁLNÍ ZÁZEMÍ B').textContent).toContain('Poznámka pro B');
  });

  it('keeps legacy social facility values in the first unit section', () => {
    const app = TestBed.createComponent(App).componentInstance as unknown as PrintHarness;
    app.newPropertyDraft.update(draft => ({ ...draft, propertyType: 'Bytový dům', tabValues: {
      stavba: { 'Rozděleno na jednotky': 'Ano', 'Počet jednotek v domě': '2' },
      'socialni-zazemi': { 'Počet WC': '1' }
    } }));
    expect(app.socialniZazemiFieldValue('Počet WC', 'A')).toBe('1');
    expect(app.socialniZazemiFieldValue('Počet WC', 'B')).toBe('');
    const write = vi.fn();
    vi.spyOn(window, 'open').mockReturnValue({ document: { open: vi.fn(), write, close: vi.fn() } } as unknown as Window);
    app.generateCurrentPropertyBrokerInfo();
    const document = new DOMParser().parseFromString(write.mock.calls[0][0] as string, 'text/html');
    const cards = [...document.querySelectorAll('main > section')];
    const first = cards.find(section => section.querySelector('h2')?.textContent === 'SOCIÁLNÍ ZÁZEMÍ A')!;
    expect([...first.querySelectorAll('.info-label')].map(element => element.textContent)).toEqual(['Počet WC']);
    expect(cards.some(section => section.querySelector('h2')?.textContent === 'SOCIÁLNÍ ZÁZEMÍ B')).toBe(false);
  });

  it('uses custom unit names in layouts and social facilities in every report without changing unit keys', () => {
    const app = TestBed.createComponent(App).componentInstance as unknown as PrintHarness;
    app.newPropertyDraft.update(draft => ({ ...draft, propertyType: 'Bytový dům', tabValues: {
      stavba: { 'Rozděleno na jednotky': 'Ano', 'Počet jednotek v domě': '3' },
      prostory: { 'Dispozice jednotky A': '2+kk', 'Dispozice jednotky B': '1+kk', 'Dispozice jednotky C': '3+1',
        'Poznámka k jednotce A': 'Poznámka přízemí', 'Poznámka k jednotce B': 'Poznámka podkroví' },
      'socialni-zazemi': { 'Počet koupelen A': '1', 'Počet koupelen B': '2', 'Počet koupelen C': '3', 'Počet WC A': '1', 'Vybavení koupelny A': 'Vana' }
    } }));
    app.setDispoziceUnitName('A', 'Byt v přízemí');
    app.setDispoziceUnitName('B', 'Podkroví');
    expect(app.dispoziceUnits()).toEqual(['A', 'B', 'C']);
    expect(app.dispoziceUnitName('A')).toBe('Byt v přízemí');
    expect(app.prostoryUnitLabel('Poznámka k jednotce', 'A')).toBe('Poznámka k jednotce Byt v přízemí');
    expect(app.socialniZazemiUnitTitle('A')).toBe('SOCIÁLNÍ ZÁZEMÍ Byt v přízemí');
    expect(app.newPropertyDraft().tabValues['prostory']['Dispozice jednotky A']).toBe('2+kk');
    const write = vi.fn();
    vi.spyOn(window, 'open').mockReturnValue({ document: { open: vi.fn(), write, close: vi.fn() } } as unknown as Window);
    app.generateCurrentPropertyBuyerInfo();
    app.generateCurrentPropertyBrokerInfo();
    app.generateCurrentPropertyBlankForm();
    for (const [html] of write.mock.calls) {
      const report = new DOMParser().parseFromString(html as string, 'text/html');
      const cards = [...report.querySelectorAll('.info-card')];
      const card = (title: string) => cards.find(section => section.querySelector('h2')?.textContent === title)!;
      expect(card('Byt v přízemí').textContent).toContain('Poznámka přízemí');
      expect(card('Podkroví').textContent).toContain('Poznámka podkroví');
      expect(card('DISPOZICE C')).toBeDefined();
      const socialLabels = [...card('SOCIÁLNÍ ZÁZEMÍ Byt v přízemí').querySelectorAll('.info-label')].map(label => label.textContent);
      expect(socialLabels).toContain('Počet koupelen');
      expect(socialLabels).toContain('Počet WC');
      expect(socialLabels.some(label => label === 'Vybavení koupelny' || label === 'V koupelně')).toBe(true);
      expect(socialLabels).not.toContain('Počet koupelen Byt v přízemí');
      expect(socialLabels).not.toContain('Počet WC Byt v přízemí');
      expect(socialLabels).not.toContain('Vybavení koupelny Byt v přízemí');
      expect(card('SOCIÁLNÍ ZÁZEMÍ Podkroví').textContent).not.toContain('Počet koupelen Podkroví');
      expect(card('SOCIÁLNÍ ZÁZEMÍ C')).toBeDefined();
      expect(cards.some(section => ['DISPOZICE A', 'DISPOZICE B', 'SOCIÁLNÍ ZÁZEMÍ A', 'SOCIÁLNÍ ZÁZEMÍ B'].includes(section.querySelector('h2')?.textContent || ''))).toBe(false);
      expect(html).not.toContain('unitName__');
    }
    const saved = app.cloneSavedPropertyRecord({ propertyType: 'Bytový dům', tabValues: app.newPropertyDraft().tabValues });
    expect(saved.tabValues['prostory']['unitName__A']).toBe('Byt v přízemí');
    expect(saved.tabValues['prostory']['unitName__B']).toBe('Podkroví');
    expect(saved.tabValues['prostory']['Dispozice jednotky A']).toBe('2+kk');
  });

  it('updates names immediately and restores the letter when a custom name is cleared', () => {
    const app = TestBed.createComponent(App).componentInstance as unknown as PrintHarness;
    app.newPropertyDraft.update(draft => ({ ...draft, tabValues: {
      stavba: { 'Rozděleno na jednotky': 'Ano', 'Počet jednotek v domě': '2' },
      prostory: { 'Dispozice jednotky A': '2+kk', 'Dispozice jednotky B': '1+kk' }
    } }));
    app.setDispoziceUnitName('A', 'Přízemí');
    app.setDispoziceUnitName('B', 'Podkroví');
    app.setDispoziceUnitName('A', 'Byt dole');
    expect(app.dispoziceUnitName('A')).toBe('Byt dole');
    expect(app.socialniZazemiUnitTitle('A')).toBe('SOCIÁLNÍ ZÁZEMÍ Byt dole');
    app.setDispoziceUnitName('A', '   ');
    expect(app.dispoziceUnitName('A')).toBe('Dispozice A');
    expect(app.socialniZazemiUnitTitle('A')).toBe('SOCIÁLNÍ ZÁZEMÍ A');
    expect(app.dispoziceUnitName('B')).toBe('Podkroví');
    expect(app.newPropertyDraft().tabValues['prostory']['Dispozice jednotky A']).toBe('2+kk');
    app.setDispoziceUnitName('Z', 'Neexistující jednotka');
    expect(app.newPropertyDraft().tabValues['prostory']['unitName__Z']).toBeUndefined();
  });

  it('opens Google and Seznam maps for an address in a new window', () => {
    const app = TestBed.createComponent(App).componentInstance as unknown as PrintHarness;
    const open = vi.spyOn(window, 'open').mockReturnValue(null as unknown as Window);
    app.openAddressInMapService('google', 'Říkovice 116');
    app.openAddressInMapService('seznam', 'Říkovice 116');
    app.openAddressInMapService('google', '   ');
    expect(open).toHaveBeenCalledTimes(2);
    expect(open.mock.calls[0]).toEqual(['https://www.google.com/maps/search/?api=1&query=%C5%98%C3%ADkovice%20116', '_blank']);
    expect(open.mock.calls[1]).toEqual(['https://mapy.com/fnc/v1/search?query=%C5%98%C3%ADkovice%20116', '_blank']);
  });

  it.each([false, true])('prints compact driving directions once in the client section (linked client: %s)', linkedClient => {
    const app = TestBed.createComponent(App).componentInstance as unknown as PrintHarness;
    app.agentProfile.update(profile => ({ ...profile, departureAddress: 'Výjezd 1' }));
    app.newPropertyDraft.update(draft => ({ ...draft, address: 'Cíl 2', linkedClientIds: linkedClient ? ['client-1'] : [] }));
    if (linkedClient) app.savedClientRecords.set([{ id: 'client-1', draft: {
      fullName: 'Jan Novák', companyName: '', phonePrefix: '+420', phone: '777123456', email: 'jan@example.cz'
    } }]);
    const route = new Subject<DrivingRoute>();
    const calculate = vi.spyOn(TestBed.inject(DrivingRouteService), 'calculate').mockReturnValue(route);
    const write = vi.fn();
    const open = vi.spyOn(window, 'open').mockReturnValue({ closed: false, document: { open: vi.fn(), write, close: vi.fn() } } as unknown as Window);
    app.generateCurrentPropertyBrokerInfo();
    expect(open).toHaveBeenCalledTimes(1);
    expect(calculate).toHaveBeenCalledWith('Výjezd 1', 'Cíl 2');
    expect(write.mock.calls[0][0]).toContain('Počítám silniční trasu');
    expect(write.mock.calls[0][0]).not.toContain('window.print');
    route.next({ distanceMeters: 205000, durationSeconds: 10500, originCity: 'Havířov', destinationCity: 'Skorošice' });
    route.complete();
    expect(open).toHaveBeenCalledTimes(1);
    const report = new DOMParser().parseFromString(write.mock.calls[1][0], 'text/html');
    const client = [...report.querySelectorAll('.info-card')].find(card => card.querySelector('h2')?.textContent === 'KLIENT')!;
    const drivingRows = [...client.querySelectorAll('.info-row')].filter(row => row.querySelector('.info-label')?.textContent === 'Dojezd');
    expect(drivingRows).toHaveLength(1);
    expect(drivingRows[0].querySelector('.info-value')?.textContent).toBe('205 km, 2:55 hod');
    expect(drivingRows[0].classList.contains('info-row-full')).toBe(false);
    expect(client.textContent).not.toContain('Havířov');
    expect(client.textContent).not.toContain('Skorošice');
    expect(report.body.textContent).not.toContain('DOJEZD MAKLÉŘE');
    if (linkedClient) expect(client.textContent).toContain('Jan Novák');
    app.generateCurrentPropertyBuyerInfo();
    expect(write.mock.calls[2][0]).not.toContain('DOJEZD MAKLÉŘE');
    expect(write.mock.calls[2][0]).not.toContain('Výjezd 1');
    expect(write.mock.calls[2][0]).not.toContain('Havířov → Skorošice');
    expect(write.mock.calls[2][0]).not.toContain('205 km, 2:55 hod');
    expect(calculate).toHaveBeenCalledTimes(1);
  });

  it('uses the nearest address as fallback and prints a useful message when routing fails', () => {
    const app = TestBed.createComponent(App).componentInstance as unknown as PrintHarness;
    app.agentProfile.update(profile => ({ ...profile, departureAddress: 'Výjezd 1' }));
    app.newPropertyDraft.update(draft => ({ ...draft, address: '', tabValues: { zakladni: { 'Nejblížší adresa': 'Orientační bod 3' } } }));
    const calculate = vi.spyOn(TestBed.inject(DrivingRouteService), 'calculate').mockReturnValue(throwError(() => new Error('Trasa není dostupná.')));
    const write = vi.fn();
    vi.spyOn(window, 'open').mockReturnValue({ closed: false, document: { open: vi.fn(), write, close: vi.fn() } } as unknown as Window);
    app.generateCurrentPropertyBrokerInfo();
    expect(calculate).toHaveBeenCalledWith('Výjezd 1', 'Orientační bod 3');
    expect(write.mock.calls[1][0]).toContain('Trasa není dostupná.');
    expect(write.mock.calls[1][0]).not.toContain('0 km');
  });

  it('preserves the departure address in XML and loads older profiles without one', () => {
    const app = TestBed.createComponent(App).componentInstance as unknown as PrintHarness;
    app.agentProfile.update(profile => ({ ...profile, departureAddress: 'Říkovice 116' }));
    const xml = app.buildXmlString();
    app.agentProfile.update(profile => ({ ...profile, departureAddress: '' }));
    app.applyXmlPayload(xml);
    expect(app.agentProfile().departureAddress).toBe('Říkovice 116');
    const fresh = TestBed.createComponent(App).componentInstance as unknown as PrintHarness;
    fresh.applyXmlPayload('<remax-form><payload>{"agentProfile":{"fullName":"Makléř"}}</payload></remax-form>');
    expect(fresh.agentProfile().departureAddress).toBe('');
  });

  it('debounces inline driving updates and clears stale results when either address changes', () => {
    vi.useFakeTimers();
    const app = TestBed.createComponent(App).componentInstance as unknown as PrintHarness;
    app.activeWorkspace.set('properties');
    app.propertyWorkspaceMode.set('new');
    app.agentProfile.update(profile => ({ ...profile, departureAddress: 'Výjezd 1' }));
    app.newPropertyDraft.update(draft => ({ ...draft, address: 'Cíl 2' }));
    const first = new Subject<DrivingRoute>();
    const next = new Subject<DrivingRoute>();
    const calculate = vi.spyOn(TestBed.inject(DrivingRouteService), 'calculate')
      .mockReturnValueOnce(first).mockReturnValue(next);
    TestBed.tick();
    expect(app.propertyDrivingInfo().status).toBe('loading');
    expect(calculate).not.toHaveBeenCalled();
    vi.advanceTimersByTime(700);
    first.next({ distanceMeters: 205000, durationSeconds: 10500, originCity: 'Havířov', destinationCity: 'Skorošice' });
    expect(app.propertyDrivingInfo().summary).toBe('205 km, 2:55 hod');
    app.newPropertyDraft.update(draft => ({ ...draft, address: 'Cíl 3' }));
    expect(app.propertyDrivingInfo().summary).toBe('');
    TestBed.tick();
    first.next({ distanceMeters: 1000, durationSeconds: 60 });
    expect(app.propertyDrivingInfo().summary).toBe('');
    vi.advanceTimersByTime(700);
    expect(calculate).toHaveBeenLastCalledWith('Výjezd 1', 'Cíl 3');
    next.next({ distanceMeters: 10000, durationSeconds: 900, originCity: 'Havířov', destinationCity: 'Karviná' });
    expect(app.propertyDrivingInfo().summary).toBe('10 km, 0:15 hod');
    app.agentProfile.update(profile => ({ ...profile, departureAddress: 'Výjezd 4' }));
    expect(app.propertyDrivingInfo().summary).toBe('');
    TestBed.tick();
    vi.advanceTimersByTime(700);
    expect(calculate).toHaveBeenLastCalledWith('Výjezd 4', 'Cíl 3');
    next.error(new Error('Nedostupné mapy'));
    expect(app.propertyDrivingInfo().status).toBe('error');
    expect(app.propertyDrivingInfo().summary).toBe('');
    app.agentProfile.update(profile => ({ ...profile, departureAddress: '' }));
    expect(app.propertyDrivingInfo().status).toBe('idle');
  });
});
