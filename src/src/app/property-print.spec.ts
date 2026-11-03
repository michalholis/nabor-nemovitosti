import { provideHttpClient } from '@angular/common/http';
import { WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './app';
import { PROPERTY_INTAKE_FORM } from './property-intake-form';
import { Subject, throwError } from 'rxjs';
import { DrivingRoute, DrivingRouteService } from './driving-route.service';
import { BROKER_INTERVIEW_QUESTIONS, BROKER_STARTING_PRICE_FIELD, BROKER_CURRENT_PRICE_FIELD, BROKER_LISTING_URL_FIELD, BROKER_LISTING_DATE_FIELD, BROKER_LISTING_PRICE_FIELD, BROKER_LISTING_PRICE_DATE_FIELD } from './broker-interview';

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
  activeDispoziceUnit: WritableSignal<string>;
  savedPropertyRecords: WritableSignal<Array<{
    id: string; createdAt: string; title: string; propertyType: string; address: string; price: string; seller: string;
    status: 'active' | 'inactive' | 'archived'; phase: string; tabValues: Record<string, Record<string, string>>;
  }>>;
  generatePropertyDirectoryBrokerInfo(entry: { index: number }): void;
  propertyTypeFormOptions(): string[];
  propertyTypeSelectValue(): string;
  isPropertyTypeCustom(value: string): boolean;
  cloneSavedPropertyRecord(record: { propertyType: string; tabValues?: Record<string, Record<string, string>> }): { propertyType: string; tabValues: Record<string, Record<string, string>> };
  stavbaParcelValue(index: number, field: 'parcel' | 'type' | 'area' | 'buildingNumber' | 'buildingNumberType'): string;
  setStavbaParcelValue(index: number, field: 'parcel' | 'type' | 'area' | 'buildingNumber' | 'buildingNumberType', value: string): void;
  setLandParcelValue(index: number, field: 'parcel' | 'type' | 'area', value: string): void;
  addLandParcelRow(): void;
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
  setPropertyTabFieldValue(tab: string, field: string, value: string): void;
  supplementaryInfoIndexes(): number[];
  addSupplementaryInfo(): void;
  removeSupplementaryInfo(index: number): void;
  hasPropertyTabMultiValue(tab: string, field: string, value: string): boolean;
  togglePropertyTabMultiValue(tab: string, field: string, value: string): void;
  vodaDruhStudnyOptions(): string[];
  vodaZdrojOptions(): string[];
  vodaMerakOptions(): string[];
  vodaKvalitaOptions(): string[];
  vodaControls(): Array<{ field: string }>;
  isVodaHasStudna(): boolean;
  vodaCheckDateValue(field: string): string;
  setVodaCheckDateValue(field: string, value: string): void;
  setVodaCheckMode(field: string, mode: 'Datum' | 'Nedoloženo'): void;
  formatVodaMonthlyAdvance(): void;
  formatVodaWellDepth(): void;
  toggleVodaMultiValue(field: string, value: string): void;
  toggleTopeniMultiValue(field: string, value: string): void;
  topeniIsInfrapanel(): boolean;
  isTopeniCentralniDalkove(): boolean;
  topeniDeviceOptions(): string[];
  ohrevVodyZpusobOptions(): string[];
  toggleOhrevVodyMultiValue(field: string, value: string): void;
  kanalizaceOptions(): string[];
  kanalizaceDestoveVodyOptions(): string[];
  kanalizaceOptionHint(option: string): string;
  toggleKanalizaceMultiValue(field: string, value: string): void;
  isKanalizaceObjemHidden(): boolean;
  plynOptions(): string[];
  plynCheckDateValue(field: string): string;
  setPlynCheckDateValue(field: string, value: string): void;
  setPlynCheckMode(field: string, mode: 'Datum' | 'Nedoloženo'): void;
  formatPlynMonthlyAdvance(): void;
  togglePlynMultiValue(field: string, value: string): void;
  toggleElektroMultiValue(field: string, value: string): void;
  elektroHasPhotovoltaics(): boolean;
  elektroCheckDateValue(field: string): string;
  setElektroCheckDateValue(field: string, value: string): void;
  setElektroCheckMode(field: string, mode: string): void;
  formatElektroMonthlyAdvance(): void;
  formatElektroNumber(field: string, unit: string): void;
  rozpisSluzebTotal(group: string): string;
  isPropertyBuyerInfoFieldVisible(tab: string, field: string): boolean;
  formatBrokerPriceField(field: string): void;
  brokerListingDateValue(): string;
  setBrokerListingDateValue(value: string): void;
  pasteBrokerListingDate(event: ClipboardEvent): void;
  setBrokerListingPriceValue(value: string): void;
  brokerListingPriceStamp(): string;
  formatMortgageBalance(): void;
  setMortgageSettlementCustomValue(value: string): void;
  togglePravniVadyMultiValue(field: string, value: string): void;
  selectedProstoryRoomEntries(unit?: string): Array<{ room: string; index: number; key: string; floor: string; floorStart: boolean }>;
  setProstoryRoomFloorValue(room: string, index: number, value: string, unit?: string): void;
  prostoryRoomFloorValue(room: string, index: number, unit?: string): string;
  addProstoryRoomInstance(room: string, unit?: string): void;
  removeProstoryRoomInstance(room: string, index: number, unit?: string): void;
  setProstoryRoomDimensionValue(room: string, index: number, dimension: 'width' | 'length', value: string, unit?: string): void;
  prostoryRoomDimensionValue(room: string, index: number, dimension: 'width' | 'length', unit?: string): string;
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

  it('adds broker interview, notes, woodshed, and repeatable supplementary fields with XML persistence and print coverage', () => {
    const app = TestBed.createComponent(App).componentInstance as unknown as PrintHarness;
    const tabs = app.propertySectionTabs().map(tab => tab.key);
    expect(tabs.indexOf('makler')).toBe(tabs.indexOf('prodej') + 1);
    expect(app.propertySectionTabs().find(tab => tab.key === 'makler')?.label).toBe('NABÍZENO');
    expect(tabs.at(-1)).toBe('predavaci-protokol');
    expect(tabs.at(-2)).toBe('cena-nemovitosti');
    expect(BROKER_INTERVIEW_QUESTIONS).toHaveLength(15);
    expect(PROPERTY_INTAKE_FORM.find(section => section.key === 'makler')?.fields.map(field => field.label)).toEqual([...BROKER_INTERVIEW_QUESTIONS, 'Poznámka k nabídce', BROKER_LISTING_URL_FIELD, BROKER_LISTING_DATE_FIELD, BROKER_LISTING_PRICE_FIELD]);
    expect(app.prostorySharedAccessoryOptions()).toContain('Dřevník');
    app.newPropertyDraft.update(draft => ({ ...draft, propertyType: 'Dům' }));
    app.setPropertyTabFieldValue('prostory', 'Příslušenství nemovitosti', 'Dřevník');
    app.setPropertyTabFieldValue('zakladni', 'Poznámka k základním informacím', 'Základní poznámka.');
    app.setPropertyTabFieldValue('cena-nemovitosti', 'Poznámka k ceně', 'Dohoda o ceně.');
    app.setPropertyTabFieldValue('makler', BROKER_INTERVIEW_QUESTIONS[0], 'Šest měsíců.');
    app.setPropertyTabFieldValue('makler', BROKER_INTERVIEW_QUESTIONS[14], 'Pravidelná komunikace.');
    app.setPropertyTabFieldValue('makler', 'Poznámka k nabídce', 'Doplnění nabídky.');
    app.setPropertyTabFieldValue('dostupnost-v-okoli', 'Poznámka', 'Klidné okolí.');
    app.setPropertyTabFieldValue('doplnkove-informace', 'Doplnění', 'První informace.');
    app.addSupplementaryInfo();
    app.setPropertyTabFieldValue('doplnkove-informace', 'Doplnění 2', 'Odstranit.');
    app.addSupplementaryInfo();
    app.setPropertyTabFieldValue('doplnkove-informace', 'Doplnění 3', 'Poslední informace.');
    app.removeSupplementaryInfo(1);
    expect(app.supplementaryInfoIndexes()).toHaveLength(2);
    expect(app.propertyTabFieldValue('doplnkove-informace', 'Doplnění 2')).toBe('Poslední informace.');
    expect(app.propertyTabFieldValue('doplnkove-informace', 'Doplnění 3')).toBe('');
    app.applyXmlPayload(app.buildXmlString());
    expect(app.propertyTabFieldValue('cena-nemovitosti', 'Poznámka k ceně')).toBe('Dohoda o ceně.');
    expect(app.propertyTabFieldValue('makler', BROKER_INTERVIEW_QUESTIONS[0])).toBe('Šest měsíců.');
    expect(app.propertyTabFieldValue('makler', 'Poznámka k nabídce')).toBe('Doplnění nabídky.');
    expect(app.supplementaryInfoIndexes()).toHaveLength(2);
    const write = vi.fn();
    vi.spyOn(window, 'open').mockReturnValue({ document: { open: vi.fn(), write, close: vi.fn() } } as unknown as Window);
    app.generateCurrentPropertyBrokerInfo();
    const broker = write.mock.calls[0][0] as string;
    for (const value of ['Dřevník', 'Základní poznámka.', 'Šest měsíců.', 'Pravidelná komunikace.', 'První informace.', 'Poslední informace.']) expect(broker).toContain(value);
    expect(broker).not.toContain('Doplnění počet');
    expect(broker).toContain('Poznámka k okolí');
    expect(broker).toContain('Klidné okolí.');
    expect(broker).toContain('Doplnění nabídky.');
    app.generateCurrentPropertyBuyerInfo();
    expect(write.mock.calls[1][0]).not.toContain('Šest měsíců.');
    expect(write.mock.calls[1][0]).not.toContain('Doplnění nabídky.');
    app.setPropertyTabFieldValue('makler', '@section__buyer-info-visible', 'ANO');
    app.generateCurrentPropertyBuyerInfo();
    expect(write.mock.calls[2][0]).toContain('NABÍZENO');
    expect(write.mock.calls[2][0]).toContain('Šest měsíců.');
    expect(write.mock.calls[2][0]).toContain('Pravidelná komunikace.');
    expect(write.mock.calls[2][0]).toContain('Doplnění nabídky.');
    app.applyXmlPayload(app.buildXmlString());
    app.generateCurrentPropertyBuyerInfo();
    expect(write.mock.calls[3][0]).toContain('Doplnění nabídky.');
    app.setPropertyTabFieldValue('makler', '@section__buyer-info-visible', 'NE');
    app.generateCurrentPropertyBuyerInfo();
    expect(write.mock.calls[4][0]).not.toContain('Doplnění nabídky.');
    expect(write.mock.calls[4][0]).not.toContain('Šest měsíců.');
  });

  it.each(['Rodinný dům', 'Dům', 'Byt'])('prints unmeasured rooms inline, matches the accessory caption, and combines custom legal restrictions for %s', type => {
    const app = TestBed.createComponent(App).componentInstance as unknown as PrintHarness;
    app.newPropertyDraft.update(draft => ({ ...draft, propertyType: type, tabValues: {
      prostory: { 'Seznam místností': 'Obývací pokoj|Koupelna', 'Příslušenství v jednotce': 'Sklep' },
      'pravni-vady': { 'Právní vady a jiná omezení': 'Chráněná krajinná oblast|Zatíženo hypotékou', 'Právní vady a jiná omezení vlastní': 'společné jmění manželů' }
    } }));
    const before = JSON.stringify(app.newPropertyDraft().tabValues);
    const write = vi.fn();
    vi.spyOn(window, 'open').mockReturnValue({ document: { open: vi.fn(), write, close: vi.fn() } } as unknown as Window);
    const generate = () => { app.generateCurrentPropertyBuyerInfo(); app.generateCurrentPropertyBrokerInfo(); app.generateCurrentPropertyBlankForm(); };
    generate();
    expect(JSON.stringify(app.newPropertyDraft().tabValues)).toBe(before);
    for (const [html] of write.mock.calls) {
      const doc = new DOMParser().parseFromString(html as string, 'text/html');
      const rows = [...doc.querySelectorAll('.info-row')];
      const rooms = rows.find(row => row.querySelector('.info-label')?.textContent === 'Seznam místností')!;
      expect(rooms.classList.contains('info-row-full')).toBe(false);
      expect(rooms.classList.contains('info-row-rooms-inline')).toBe(true);
      expect(rooms.querySelector('.info-value')?.textContent).toBe('Obývací pokoj, Koupelna');
      const accessoryLabel = type === 'Byt' ? 'Sklep a další vybavení v jednotce' : 'Sklep a další vybavení v domě';
      expect(rows.some(row => row.querySelector('.info-label')?.textContent === accessoryLabel)).toBe(true);
      const legal = rows.filter(row => row.querySelector('.info-label')?.textContent?.startsWith('Právní vady a jiná omezení'));
      expect(legal).toHaveLength(1);
      expect(legal[0].querySelector('.info-value')?.textContent).toBe('Chráněná krajinná oblast, Zatíženo hypotékou, společné jmění manželů');
    }
    app.setPropertyTabFieldValue('pravni-vady', 'Právní vady a jiná omezení', '');
    write.mockClear();
    generate();
    for (const [html] of write.mock.calls) {
      const doc = new DOMParser().parseFromString(html as string, 'text/html');
      const legal = [...doc.querySelectorAll('.info-row')].filter(row => row.querySelector('.info-label')?.textContent?.startsWith('Právní vady a jiná omezení'));
      expect(legal).toHaveLength(1);
      expect(legal[0].querySelector('.info-value')?.textContent).toBe('společné jmění manželů');
    }
  });

  it.each([false, true])('switches room-list layout only for entered dimensions of selected rooms (measured: %s)', measured => {
    const app = TestBed.createComponent(App).componentInstance as unknown as PrintHarness;
    app.newPropertyDraft.update(draft => ({ ...draft, propertyType: 'Byt', tabValues: { prostory: {
      'Seznam místností': 'Obývací pokoj|Koupelna', 'Obývací pokoj__0__width': measured ? '3 m' : '',
      'Ložnice__0__width': '5 m', 'Příslušenství v jednotce': 'Sklep', 'Sklep__0__width': '4 m'
    } } }));
    const before = JSON.stringify(app.newPropertyDraft());
    const write = vi.fn();
    vi.spyOn(window, 'open').mockReturnValue({ document: { open: vi.fn(), write, close: vi.fn() } } as unknown as Window);
    app.generateCurrentPropertyBuyerInfo(); app.generateCurrentPropertyBrokerInfo(); app.generateCurrentPropertyBlankForm();
    for (const [html] of write.mock.calls) {
      const doc = new DOMParser().parseFromString(html as string, 'text/html');
      const row = [...doc.querySelectorAll('.info-row')].find(row => row.querySelector('.info-label')?.textContent === 'Seznam místností')!;
      expect(row.classList.contains('info-row-full')).toBe(measured);
      expect(row.classList.contains('info-row-rooms-inline')).toBe(!measured);
      expect(row.querySelector('.info-value')?.textContent).toBe(measured ? 'Obývací pokoj (3 m)\nKoupelna' : 'Obývací pokoj, Koupelna');
    }
    expect(JSON.stringify(app.newPropertyDraft())).toBe(before);
  });

  it('prints unmeasured room instances separated by commas and honors buyer switches without losing answers', () => {
    const app = TestBed.createComponent(App).componentInstance as unknown as PrintHarness;
    app.newPropertyDraft.update(draft => ({ ...draft, propertyType: 'Byt', tabValues: {
      prostory: { 'Seznam místností': 'Obývací pokoj|Koupelna' },
      oblast: { 'Záplavová oblast': 'ANO', 'Kategorie ochrany území': 'Chráněná krajinná oblast' },
      'pravni-vady': { 'Právní vady a jiná omezení': 'Zatíženo hypotékou', 'Právní vady a jiná omezení vlastní': 'Vlastní právní omezení', 'Zbývající částka úvěru': '123 000 Kč' }
    } }));
    app.addProstoryRoomInstance('Obývací pokoj');
    const write = vi.fn();
    vi.spyOn(window, 'open').mockReturnValue({ document: { open: vi.fn(), write, close: vi.fn() } } as unknown as Window);
    const generate = () => { app.generateCurrentPropertyBuyerInfo(); app.generateCurrentPropertyBrokerInfo(); app.generateCurrentPropertyBlankForm(); };
    const documentAt = (index: number) => new DOMParser().parseFromString(write.mock.calls[index][0] as string, 'text/html');
    const valueOf = (doc: Document, label: string) => [...doc.querySelectorAll('.info-row')].find(row => row.querySelector('.info-label')?.textContent === label)?.querySelector('.info-value')?.textContent;
    generate();
    for (let index = 0; index < 3; index++) expect(valueOf(documentAt(index), 'Seznam místností')).toBe('Obývací pokoj, Obývací pokoj, Koupelna');
    const switches = [['oblast', 'Záplavová oblast'], ['oblast', 'Kategorie ochrany území'], ['pravni-vady', 'Právní vady a jiná omezení']];
    for (const [tab, field] of switches) app.setPropertyTabFieldValue(tab, field + '__buyer-info-visible', 'NE');
    app.applyXmlPayload(app.buildXmlString());
    write.mockClear(); generate();
    const buyer = documentAt(0);
    for (const [, field] of switches) expect(valueOf(buyer, field)).toBeUndefined();
    expect(buyer.body.textContent).not.toContain('Vlastní právní omezení');
    expect(buyer.body.textContent).not.toContain('123 000 Kč');
    for (const index of [1, 2]) {
      const doc = documentAt(index);
      for (const [, field] of switches) expect(valueOf(doc, field)).toBeTruthy();
      expect(doc.body.textContent).toContain('Vlastní právní omezení');
    }
    for (const [tab, field] of switches) app.setPropertyTabFieldValue(tab, field + '__buyer-info-visible', 'ANO');
    write.mockClear(); app.generateCurrentPropertyBuyerInfo();
    expect(valueOf(documentAt(0), 'Právní vady a jiná omezení')).toBe('Zatíženo hypotékou, Vlastní právní omezení');
    expect(valueOf(documentAt(0), 'Záplavová oblast')).toBe('ANO');
    expect(valueOf(documentAt(0), 'Kategorie ochrany území')).toBe('Chráněná krajinná oblast');
  });

  it('includes property prices, commission calculations and price notes in the broker report', () => {
    const app = TestBed.createComponent(App).componentInstance as unknown as PrintHarness;
    app.newPropertyDraft.update(draft => ({ ...draft, propertyType: 'Byt', tabValues: { 'cena-nemovitosti': {
      'Doporučená nabídková cena vč. DPH': '5 000 000 Kč', 'Odhadovaná prodejní cena nemovitosti': '4 900 000 Kč',
      'Požadovaná částka vč. DPH': '4 000 000 Kč', 'Smluvené % z prodeje bez DPH': '5%', 'Počet prodávajících': '2',
      'Kdy byla nemovitost zakoupena': '15. 6. 2020', 'Původní kupní cena': '2 500 000 Kč',
      'Poznámka k ceně': 'Cenu řešit individuálně.'
    } } }));
    app.applyXmlPayload(app.buildXmlString());
    expect(app.propertyTabFieldValue('cena-nemovitosti', 'Kdy byla nemovitost zakoupena')).toBe('15. 6. 2020');
    expect(app.propertyTabFieldValue('cena-nemovitosti', 'Původní kupní cena')).toBe('2 500 000 Kč');
    const before = JSON.stringify(app.newPropertyDraft().tabValues);
    const write = vi.fn();
    vi.spyOn(window, 'open').mockReturnValue({ document: { open: vi.fn(), write, close: vi.fn() } } as unknown as Window);
    app.generateCurrentPropertyBrokerInfo();
    app.generateCurrentPropertyBuyerInfo();
    const broker = new DOMParser().parseFromString(write.mock.calls[0][0] as string, 'text/html');
    const card = [...broker.querySelectorAll('.info-card')].find(card => card.querySelector('h2')?.textContent === 'CENA NEMOVITOSTI')!;
    expect(card).toBeTruthy();
    const rows = [...card.querySelectorAll('.info-row')];
    const value = (label: string) => rows.find(row => row.querySelector('.info-label')?.textContent === label)?.querySelector('.info-value')?.textContent;
    expect(value('Doporučená nabídková cena vč. DPH')).toBe('5 000 000 Kč');
    expect(value('Odhadovaná prodejní cena nemovitosti')).toBe('4 900 000 Kč');
    expect(value('Požadovaná částka vč. DPH')).toBe('4 000 000 Kč');
    expect(value('Provize vč. DPH v Kč')?.replace(/\s/g, '')).toBe('302500Kč');
    expect(value('Klienti získají z prodeje')?.replace(/\s/g, '')).toBe('4697500Kč');
    expect(value('V případě dělení klienti získají')?.replace(/\s/g, '')).toBe('2348750Kč');
    expect(value('Výsledná prodejní cena s DPH')).toBeTruthy();
    expect(value('Výsledná prodejní cena bez DPH')).toBeTruthy();
    expect(value('Poznámka k ceně')).toBe('Cenu řešit individuálně.');
    expect(value('Kdy byla nemovitost zakoupena')).toBe('15. 6. 2020');
    expect(value('Původní kupní cena')).toBe('2 500 000 Kč');
    expect(write.mock.calls[1][0]).not.toContain('CENA NEMOVITOSTI');
    expect(write.mock.calls[1][0]).not.toContain('Cenu řešit individuálně.');
    expect(JSON.stringify(app.newPropertyDraft().tabValues)).toBe(before);
    for (const percent of ['', ' ', '0%']) {
      app.setPropertyTabFieldValue('cena-nemovitosti', 'Smluvené % z prodeje bez DPH', percent);
      write.mockClear();
      app.generateCurrentPropertyBrokerInfo();
      const doc = new DOMParser().parseFromString(write.mock.calls[0][0] as string, 'text/html');
      const labels = [...doc.querySelectorAll('.info-label')].map(el => el.textContent);
      expect(labels).not.toContain('Výsledná prodejní cena bez DPH');
      expect(labels).not.toContain('Výsledná prodejní cena s DPH');
      expect(labels).toContain('Požadovaná částka vč. DPH');
    }
  });

  it('saves the subtenant end date and prints it inline only while its legal restriction is selected', () => {
    const app = TestBed.createComponent(App).componentInstance as unknown as PrintHarness;
    app.newPropertyDraft.update(draft => ({ ...draft, propertyType: 'Byt' }));
    app.setPropertyTabFieldValue('pravni-vady', 'Právní vady a jiná omezení', 'Bankovní zástavy|Podnájemník do:');
    app.setPropertyTabFieldValue('pravni-vady', 'Podnájemník do', '31. 12. 2027');
    app.applyXmlPayload(app.buildXmlString());
    expect(app.propertyTabFieldValue('pravni-vady', 'Podnájemník do')).toBe('31. 12. 2027');
    const write = vi.fn();
    vi.spyOn(window, 'open').mockReturnValue({ document: { open: vi.fn(), write, close: vi.fn() } } as unknown as Window);
    app.generateCurrentPropertyBuyerInfo(); app.generateCurrentPropertyBrokerInfo(); app.generateCurrentPropertyBlankForm();
    for (const [html] of write.mock.calls) {
      const doc = new DOMParser().parseFromString(html as string, 'text/html');
      const legal = [...doc.querySelectorAll('.info-row')].find(row => row.querySelector('.info-label')?.textContent === 'Právní vady a jiná omezení')!;
      expect(legal.querySelector('.info-value')?.textContent).toBe('Bankovní zástavy, Podnájemník do: 31. 12. 2027');
      expect([...doc.querySelectorAll('.info-label')].some(el => el.textContent === 'Podnájemník do')).toBe(false);
    }
    app.togglePravniVadyMultiValue('Právní vady a jiná omezení', 'Podnájemník do:');
    write.mockClear(); app.generateCurrentPropertyBrokerInfo();
    expect(write.mock.calls[0][0]).not.toContain('31. 12. 2027');
    expect(app.propertyTabFieldValue('pravni-vady', 'Podnájemník do')).toBe('31. 12. 2027');
  });

  it('prints service names on the left and their corresponding amounts on the right, combining custom names and amounts once', () => {
    const app = TestBed.createComponent(App).componentInstance as unknown as PrintHarness;
    app.newPropertyDraft.update(draft => ({ ...draft, propertyType: 'Byt', tabValues: { 'rozpis-sluzeb': {
      'Do nájmu lze započítat - Záloha na teplo': '2000', 'Do nájmu lze započítat vlastní počet': '4',
      'Do nájmu lze započítat vlastní název 1': 'Příspěvek na správu', 'Do nájmu lze započítat vlastní částka 1': '1350',
      'Do nájmu lze započítat vlastní název 2': 'Ústřední vytápění', 'Do nájmu lze započítat vlastní částka 2': '1500',
      'Do nájmu lze započítat vlastní název 3': 'Pouze název', 'Do nájmu lze započítat vlastní částka 4': '50',
      'Do nájmu nelze započítat vlastní 1': 'Fond oprav - vlastní', 'Datum vyúčtování': '2026'
    } } }));
    app.applyXmlPayload(app.buildXmlString());
    const before = JSON.stringify(app.newPropertyDraft().tabValues);
    const write = vi.fn();
    vi.spyOn(window, 'open').mockReturnValue({ document: { open: vi.fn(), write, close: vi.fn() } } as unknown as Window);
    app.generateCurrentPropertyBuyerInfo(); app.generateCurrentPropertyBrokerInfo(); app.generateCurrentPropertyBlankForm();
    for (const [html] of write.mock.calls) {
      const doc = new DOMParser().parseFromString(html as string, 'text/html');
      const card = [...doc.querySelectorAll('.info-card')].find(card => card.querySelector('h2')?.textContent === 'ROZPIS SLUŽEB')!;
      const rows = [...card.querySelectorAll('.info-row')];
      expect(rows).toHaveLength(11);
      const totalRows = rows.filter(row => row.querySelector('.info-label')?.textContent === 'CELKEM');
      expect(totalRows.map(row => row.querySelector('.info-value')?.textContent)).toEqual(['4 900 Kč', '0 Kč']);
      expect(totalRows.every(row => row.classList.contains('info-row-total'))).toBe(true);
      for (const [label, value] of [['Příspěvek na správu', '1350 Kč'], ['Ústřední vytápění', '1500 Kč'], ['Záloha na teplo', '2000 Kč'], ['Pouze název', '—'], ['Vlastní položka 4', '50 Kč'], ['Fond oprav - vlastní', '—'], ['Datum vyúčtování', '2026']]) {
        const matching = rows.filter(row => row.querySelector('.info-label')?.textContent === label);
        expect(matching).toHaveLength(1);
        expect(matching[0].querySelector('.info-value')?.textContent).toBe(value);
        expect(matching[0].classList.contains('info-row-full')).toBe(false);
      }
      expect(card.textContent).not.toContain('Do nájmu lze započítat vlastní');
    }
    expect(JSON.stringify(app.newPropertyDraft().tabValues)).toBe(before);
  });

  it.each([
    { included: true, excluded: true }, { included: false, excluded: true },
    { included: true, excluded: false }, { included: false, excluded: false }
  ])('calculates independent service totals and honors buyer switches (included: $included, excluded: $excluded)', ({ included, excluded }) => {
    const app = TestBed.createComponent(App).componentInstance as unknown as PrintHarness;
    const first = 'Do nájmu lze započítat', second = 'Do nájmu nelze započítat';
    expect(app.rozpisSluzebTotal(first)).toBe('0 Kč');
    expect(app.rozpisSluzebTotal(second)).toBe('0 Kč');
    app.newPropertyDraft.update(draft => ({ ...draft, propertyType: 'Byt', tabValues: { 'rozpis-sluzeb': {
      [`${first} - Záloha na teplo`]: '1 200,50', [`${first} - Záloha na vodu`]: '0.10',
      [`${first} vlastní počet`]: '9', [`${first} vlastní název 1`]: 'Služba 9999', [`${first} vlastní částka 1`]: '0,20',
      [`${first} vlastní název 3`]: 'Pouze popis',
      [`${second} - Fond oprav`]: '2.500,25', [`${second} vlastní počet`]: '1',
      [`${second} vlastní 1`]: 'Původní vlastní pojištění', [`${second} vlastní částka 1`]: '49.75',
      [`${first}__buyer-info-visible`]: included ? 'ANO' : 'NE', [`${second}__buyer-info-visible`]: excluded ? 'ANO' : 'NE'
    } } }));
    app.applyXmlPayload(app.buildXmlString());
    const before = JSON.stringify(app.newPropertyDraft());
    expect(app.rozpisSluzebTotal(first)).toBe('1 200,80 Kč');
    expect(app.rozpisSluzebTotal(second)).toBe('2 550 Kč');
    expect(app.isPropertyBuyerInfoFieldVisible('rozpis-sluzeb', first)).toBe(included);
    expect(app.isPropertyBuyerInfoFieldVisible('rozpis-sluzeb', second)).toBe(excluded);
    expect(app.propertyTabFieldValue('rozpis-sluzeb', `${second} vlastní 1`)).toBe('Původní vlastní pojištění');
    const write = vi.fn();
    vi.spyOn(window, 'open').mockReturnValue({ document: { open: vi.fn(), write, close: vi.fn() } } as unknown as Window);
    app.generateCurrentPropertyBuyerInfo(); app.generateCurrentPropertyBrokerInfo(); app.generateCurrentPropertyBlankForm();
    for (const [index, [html]] of write.mock.calls.entries()) {
      const doc = new DOMParser().parseFromString(html as string, 'text/html');
      const section = [...doc.querySelectorAll('.info-card')].find(section => section.querySelector('h2')?.textContent === 'ROZPIS SLUŽEB');
      if (index === 0 && !included && !excluded) { expect(section).toBeUndefined(); continue; }
      const labels = [...section!.querySelectorAll('.info-label')].map(label => label.textContent);
      const serviceRows = [...section!.querySelectorAll('.info-row')];
      const totalRows = serviceRows.filter(row => row.querySelector('.info-label')?.textContent === 'CELKEM');
      const totals = totalRows.map(row => row.querySelector('.info-value')?.textContent);
      const showFirst = index !== 0 || included, showSecond = index !== 0 || excluded;
      expect(labels.includes(first.toLocaleUpperCase('cs-CZ'))).toBe(showFirst);
      expect(labels.includes(second.toLocaleUpperCase('cs-CZ'))).toBe(showSecond);
      expect(labels.some(label => /^DO NÁJMU .*\(/.test(label || ''))).toBe(false);
      expect(totalRows.every(row => row.classList.contains('info-row-total'))).toBe(true);
      for (const group of [first, second]) {
        const start = labels.indexOf(group.toLocaleUpperCase('cs-CZ'));
        if (start < 0) continue;
        const next = labels.findIndex((label, position) => position > start && /^DO NÁJMU /.test(label || ''));
        expect(labels[(next < 0 ? labels.length : next) - 1]).toBe('CELKEM');
      }
      expect(labels.includes('Služba 9999')).toBe(showFirst); expect(labels.includes('Původní vlastní pojištění')).toBe(showSecond);
      expect(totals).toEqual([...(showFirst ? ['1 200,80 Kč'] : []), ...(showSecond ? ['2 550 Kč'] : [])]);
      if (showSecond) {
        const custom = [...section!.querySelectorAll('.info-row')].find(row => row.querySelector('.info-label')?.textContent === 'Původní vlastní pojištění')!;
        expect(custom.querySelector('.info-value')?.textContent).toBe('49.75 Kč');
      }
      expect(section!.textContent).not.toContain('vlastní částka');
      expect(section!.textContent).not.toContain('vlastní počet');
    }
    expect(JSON.stringify(app.newPropertyDraft())).toBe(before);
  });

  it('migrates heating energy, methods and devices into separate saved and printed groups without losing terminal selections or custom values', () => {
    const app = TestBed.createComponent(App).componentInstance as unknown as PrintHarness;
    app.newPropertyDraft.update(draft => ({ ...draft, propertyType: 'Byt', tabValues: { topeni: {
      'Způsob vytápění objektu': 'Plyn|Elektřina|Ústřední vytápění',
      'Způsob vytápění objektu vlastní': 'Další zdroj',
      'Topné těleso': 'Radiátory|Krb|Infrapanel|Podlahové vytápění|S regulací topení',
      'Topné těleso vlastní': 'Další zařízení', 'Výkon Infrapanelu': '1000 W'
    } } }));
    expect(app.propertyTabFieldValue('topeni', 'Zdroje energie')).toBe('Plyn|Elektřina');
    expect(app.propertyTabFieldValue('topeni', 'Způsob vytápění')).toBe('Vlastní zdroj tepla');
    expect(app.propertyTabFieldValue('topeni', 'Topné zařízení')).toBe('Krb na dřevo|Infrapanel');
    expect(app.propertyTabFieldValue('topeni', 'Otopná soustava')).toBe('Radiátory|Podlahové vytápění');
    expect(app.propertyTabFieldValue('topeni', 'Topné těleso')).toBe('');
    expect(app.propertyTabFieldValue('topeni', 'S regulací topení')).toBe('Ano');
    expect(app.propertyTabFieldValue('topeni', 'Zdroje energie vlastní')).toBe('Další zdroj');
    expect(app.propertyTabFieldValue('topeni', 'Topné zařízení vlastní')).toBe('Další zařízení');
    expect(app.topeniIsInfrapanel()).toBe(true);
    app.toggleTopeniMultiValue('Způsob vytápění', 'Dálkové vytápění');
    expect(app.isTopeniCentralniDalkove()).toBe(true);
    app.toggleTopeniMultiValue('Způsob vytápění', 'Dálkové vytápění');
    app.toggleTopeniMultiValue('Zdroje energie', 'Plyn');
    expect(app.propertyTabFieldValue('topeni', 'Zdroje energie')).toBe('Elektřina');
    app.applyXmlPayload(app.buildXmlString());
    expect(app.propertyTabFieldValue('topeni', 'Zdroje energie')).toBe('Elektřina');
    expect(app.propertyTabFieldValue('topeni', 'Topné zařízení')).toBe('Krb na dřevo|Infrapanel');
    expect(app.propertyTabFieldValue('topeni', 'Otopná soustava')).toBe('Radiátory|Podlahové vytápění');
    expect(app.propertyTabFieldValue('topeni', 'S regulací topení')).toBe('Ano');
    const renamedMethods = app.cloneSavedPropertyRecord({ propertyType: 'Byt', tabValues: { topeni: {
      'Způsob vytápění': 'Ústřední vytápění|Centrální dálkové|Dálkové vytápění'
    } } }).tabValues['topeni'];
    expect(renamedMethods['Způsob vytápění']).toBe('Vlastní zdroj tepla|Dálkové vytápění');
    const before = JSON.stringify(app.newPropertyDraft().tabValues);
    const write = vi.fn();
    vi.spyOn(window, 'open').mockReturnValue({ document: { open: vi.fn(), write, close: vi.fn() } } as unknown as Window);
    app.generateCurrentPropertyBuyerInfo(); app.generateCurrentPropertyBrokerInfo(); app.generateCurrentPropertyBlankForm();
    for (const [html] of write.mock.calls) {
      const doc = new DOMParser().parseFromString(html as string, 'text/html');
      const card = [...doc.querySelectorAll('.info-card')].find(card => card.querySelector('h2')?.textContent === 'VYTÁPĚNÍ')!;
      const labels = [...card.querySelectorAll('.info-label')].map(el => el.textContent);
      for (const label of ['Zdroje energie', 'Způsob vytápění', 'Topné zařízení', 'Otopná soustava', 'Výkon Infrapanelu', 'S regulací topení']) expect(labels).toContain(label);
      expect(labels).not.toContain('Topné těleso');
      expect(labels).not.toContain('Způsob vytápění objektu');
      expect(card.textContent).toContain('Krb na dřevo');
      expect(card.textContent).toContain('Radiátory');
    }
    expect(JSON.stringify(app.newPropertyDraft().tabValues)).toBe(before);
    app.setPropertyTabFieldValue('topeni', 'S regulací topení', 'Ne');
    app.applyXmlPayload(app.buildXmlString());
    expect(app.propertyTabFieldValue('topeni', 'S regulací topení')).toBe('Ne');
  });

  it('filters heating devices for electricity and combines compatible devices when multiple energy sources are selected', () => {
    const app = TestBed.createComponent(App).componentInstance as unknown as PrintHarness;
    expect(app.topeniDeviceOptions()).toHaveLength(17);
    app.setPropertyTabFieldValue('topeni', 'Zdroje energie', 'Elektřina');
    expect(app.topeniDeviceOptions()).toEqual(['Akumulační kamna', 'Elektrický přímotop', 'Elektrokotel', 'Infrapanel', 'Klimatizace', 'Kotel se zásobníkem teplé vody']);
    app.setPropertyTabFieldValue('topeni', 'Topné zařízení', 'Kondenzační plynový kotel');
    expect(app.topeniDeviceOptions()).not.toContain('Kondenzační plynový kotel');
    expect(app.propertyTabFieldValue('topeni', 'Topné zařízení')).toBe('Kondenzační plynový kotel');
    app.toggleTopeniMultiValue('Zdroje energie', 'Plyn');
    expect(app.topeniDeviceOptions()).toContain('Kondenzační plynový kotel');
    expect(app.topeniDeviceOptions()).toContain('Elektrokotel');
    expect(app.topeniDeviceOptions()).not.toContain('Kotel na tuhá paliva');
    app.toggleTopeniMultiValue('Zdroje energie', 'Tuhá paliva');
    expect(app.topeniDeviceOptions()).toHaveLength(17);
    app.setPropertyTabFieldValue('topeni', 'Zdroje energie', '');
    expect(app.topeniDeviceOptions()).toHaveLength(17);
  });

  it.each(['Ne', 'NE', ''])('omits off switches and their dependent values from all reports (%s), while retaining negative dropdown answers', off => {
    const app = TestBed.createComponent(App).componentInstance as unknown as PrintHarness;
    app.newPropertyDraft.update(draft => ({ ...draft, propertyType: 'Bytový dům', tabValues: {
      stavba: { 'Výtah v budově': off, 'Rozděleno na jednotky': off, 'Číslo ve výtahu': '8', 'Počet jednotek v domě': '12', 'Počet vchodů': '3' },
      topeni: { 'S regulací topení': 'Ne' }, oblast: { 'Záplavová oblast': 'NE' },
      'ohrev-vody': { 'Způsob ohřevu vody': 'Bojler - elektro' }
    } }));
    const write = vi.fn();
    vi.spyOn(window, 'open').mockReturnValue({ document: { open: vi.fn(), write, close: vi.fn() } } as unknown as Window);
    const generate = () => { app.generateCurrentPropertyBuyerInfo(); app.generateCurrentPropertyBrokerInfo(); app.generateCurrentPropertyBlankForm(); };
    const labelsOf = (html: string) => [...new DOMParser().parseFromString(html, 'text/html').querySelectorAll('.info-label')].map(el => el.textContent);
    generate();
    for (const [html] of write.mock.calls) {
      const labels = labelsOf(html);
      for (const field of ['Výtah v budově', 'Rozděleno na jednotky', 'Číslo ve výtahu', 'Počet jednotek v domě', 'Počet vchodů']) expect(labels).not.toContain(field);
      expect(labels).not.toContain('S regulací topení');
      expect(labels).toContain('Záplavová oblast');
      expect(labels).toContain('Zařízení pro ohřev vody');
      expect(labels).not.toContain('Způsob ohřevu vody');
      expect(html).toContain('Elektrický bojler (zásobníkový ohřívač)');
    }
    app.setPropertyTabFieldValue('stavba', 'Výtah v budově', 'Ano');
    app.setPropertyTabFieldValue('stavba', 'Rozděleno na jednotky', 'Ano');
    app.setPropertyTabFieldValue('topeni', 'S regulací topení', 'Ano');
    write.mockClear(); generate();
    for (const [html] of write.mock.calls) {
      const labels = labelsOf(html);
      for (const field of ['Výtah v budově', 'Rozděleno na jednotky', 'Číslo ve výtahu', 'Počet jednotek v domě', 'Počet vchodů']) expect(labels).toContain(field);
      expect(labels).toContain('S regulací topení');
    }
    app.newPropertyDraft.update(draft => ({ ...draft, propertyType: 'Byt' }));
    app.setPropertyTabFieldValue('stavba', 'Rozděleno na jednotky', 'Ne');
    write.mockClear(); app.generateCurrentPropertyBrokerInfo();
    expect(labelsOf(write.mock.calls[0][0])).toContain('Počet jednotek v domě');
  });

  it.each([
    { source: 'Elektřina', included: ['Elektrický bojler (zásobníkový ohřívač)', 'Elektrický průtokový ohřívač', 'Elektrická topná patrona v zásobníku', 'Malý elektrický ohřívač pod umyvadlem'], excluded: ['Plynový bojler (zásobníkový ohřívač)', 'Kombinovaný plynový kotel', 'Automatický kotel na pelety'] },
    { source: 'Plyn', included: ['Plynový bojler (zásobníkový ohřívač)', 'Plynový průtokový ohřívač (karma)', 'Plynový kondenzační kotel', 'Plynový nekondenzační kotel', 'Kombinovaný plynový kotel'], excluded: ['Elektrický bojler (zásobníkový ohřívač)', 'Automatický kotel na pelety', 'Solární termické kolektory se zásobníkem'] },
    { source: 'Tuhá paliva', included: ['Kotel na tuhá paliva', 'Automatický kotel na pelety', 'Krbová kamna s teplovodním výměníkem', 'Kamna nebo sporák s teplovodním výměníkem'], excluded: ['Elektrokotel', 'Plynový kondenzační kotel', 'Solární termické kolektory se zásobníkem'] },
    { source: 'Solární', included: ['Solární termické kolektory se zásobníkem', 'Nepřímotopný zásobník vody'], excluded: ['Elektrický průtokový ohřívač', 'Plynový kondenzační kotel', 'Automatický kotel na pelety'] },
    { source: 'Tepelné čerpadlo', included: ['Tepelné čerpadlo', 'Bojler s integrovaným tepelným čerpadlem', 'Akumulační nádrž s přípravou TUV'], excluded: ['Elektrický bojler (zásobníkový ohřívač)', 'Plynový průtokový ohřívač (karma)'] },
    { source: 'Centrální dálkový ohřev', included: ['Centrální dálkový ohřev', 'Předávací stanice tepla s ohřevem TUV', 'Nepřímotopný zásobník vody'], excluded: ['Elektrokotel', 'Kombinovaný plynový kotel', 'Kotel na tuhá paliva'] }
  ])('offers only compatible hot-water devices for $source', ({ source, included, excluded }) => {
    const app = TestBed.createComponent(App).componentInstance as unknown as PrintHarness;
    expect(app.ohrevVodyZpusobOptions()).toHaveLength(22);
    app.setPropertyTabFieldValue('ohrev-vody', 'Zdroj teplé vody', source);
    for (const option of included) expect(app.ohrevVodyZpusobOptions()).toContain(option);
    for (const option of excluded) expect(app.ohrevVodyZpusobOptions()).not.toContain(option);
  });

  it('migrates saved hot-water devices, combines energy compatibility, and retains renamed choices in XML and all reports', () => {
    const app = TestBed.createComponent(App).componentInstance as unknown as PrintHarness;
    app.newPropertyDraft.update(draft => ({ ...draft, propertyType: 'Byt', tabValues: { 'ohrev-vody': {
      'Zdroj teplé vody': 'Elektřina|Plyn',
      'Způsob ohřevu vody': 'Bojler - elektro|Bojler - plyn|Průtokový ohřívač|Plynový průtokový (karma)|Plynový kotel',
      'Způsob ohřevu vody vlastní': 'Vlastní ohřívač', 'Objem nádoby': '120'
    } } }));
    const devices = ['Elektrický bojler (zásobníkový ohřívač)', 'Plynový bojler (zásobníkový ohřívač)', 'Elektrický průtokový ohřívač', 'Plynový průtokový ohřívač (karma)', 'Plynový nekondenzační kotel'];
    expect(app.propertyTabFieldValue('ohrev-vody', 'Způsob ohřevu vody')).toBe(devices.join('|'));
    for (const device of devices) expect(app.ohrevVodyZpusobOptions()).toContain(device);
    app.toggleOhrevVodyMultiValue('Zdroj teplé vody', 'Plyn');
    expect(app.ohrevVodyZpusobOptions()).not.toContain('Plynový bojler (zásobníkový ohřívač)');
    expect(app.propertyTabFieldValue('ohrev-vody', 'Způsob ohřevu vody')).toContain('Plynový bojler (zásobníkový ohřívač)');
    app.toggleOhrevVodyMultiValue('Zdroj teplé vody', 'Plyn');
    app.applyXmlPayload(app.buildXmlString());
    expect(app.propertyTabFieldValue('ohrev-vody', 'Způsob ohřevu vody')).toBe(devices.join('|'));
    expect(app.propertyTabFieldValue('ohrev-vody', 'Způsob ohřevu vody vlastní')).toBe('Vlastní ohřívač');
    const write = vi.fn();
    vi.spyOn(window, 'open').mockReturnValue({ document: { open: vi.fn(), write, close: vi.fn() } } as unknown as Window);
    app.generateCurrentPropertyBuyerInfo(); app.generateCurrentPropertyBrokerInfo(); app.generateCurrentPropertyBlankForm();
    for (const [html] of write.mock.calls) {
      const doc = new DOMParser().parseFromString(html as string, 'text/html');
      const row = [...doc.querySelectorAll('.info-row')].find(row => row.querySelector('.info-label')?.textContent === 'Zařízení pro ohřev vody')!;
      for (const device of devices) expect(row.querySelector('.info-value')?.textContent).toContain(device);
    }
  });

  it('migrates renamed sewage options, preserves removed details, and handles public sewage and septic help in saved data and print', () => {
    const app = TestBed.createComponent(App).componentInstance as unknown as PrintHarness;
    app.newPropertyDraft.update(draft => ({ ...draft, propertyType: 'Byt', tabValues: { kanalizace: {
      'Kanalizace': 'Splašková městská|Čov|Septik tříkomorový|Žumpa obecní|Dešťová městská|Trativod|Žumpa s přepadem',
      'Kanalizace vlastní': 'Původní doplnění', 'Objem odpadní nádoby': '8 m³'
    } } }));
    expect(app.kanalizaceOptions()).toEqual(['Není řešena', 'Veřejná kanalizace', 'Žumpa (bezodtoká jímka)', 'Septik', 'ČOV domovní', 'ČOV společná', 'Jímka společná', 'Jímka obecní']);
    expect(app.kanalizaceOptionHint('Septik')).toBe('Nádrž, ve které dochází k částečnému předčištění odpadních vod. Vyžaduje další dočištění nebo zákonný způsob nakládání s odpadní vodou.');
    expect(app.propertyTabFieldValue('kanalizace', 'Kanalizace')).toBe('Veřejná kanalizace|ČOV domovní|Septik|Jímka obecní');
    expect(app.propertyTabFieldValue('kanalizace', 'Kanalizace vlastní')).toBe('Původní doplnění, Dešťová městská, Trativod, Žumpa s přepadem');
    expect(app.isKanalizaceObjemHidden()).toBe(true);
    app.toggleKanalizaceMultiValue('Kanalizace', 'Veřejná kanalizace');
    expect(app.isKanalizaceObjemHidden()).toBe(false);
    app.toggleKanalizaceMultiValue('Kanalizace', 'Veřejná kanalizace');
    app.applyXmlPayload(app.buildXmlString());
    expect(app.propertyTabFieldValue('kanalizace', 'Kanalizace')).toContain('Veřejná kanalizace');
    expect(app.propertyTabFieldValue('kanalizace', 'Kanalizace vlastní')).toBe('Původní doplnění, Dešťová městská, Trativod, Žumpa s přepadem');
    const write = vi.fn();
    vi.spyOn(window, 'open').mockReturnValue({ document: { open: vi.fn(), write, close: vi.fn() } } as unknown as Window);
    app.generateCurrentPropertyBuyerInfo(); app.generateCurrentPropertyBrokerInfo(); app.generateCurrentPropertyBlankForm();
    for (const [html] of write.mock.calls) {
      const doc = new DOMParser().parseFromString(html as string, 'text/html');
      const row = [...doc.querySelectorAll('.info-row')].find(row => row.querySelector('.info-label')?.textContent === 'Kanalizace')!;
      for (const value of ['Veřejná kanalizace', 'ČOV domovní', 'Septik', 'Jímka obecní']) expect(row.querySelector('.info-value')?.textContent).toContain(value);
      expect(doc.body.textContent).toContain('Původní doplnění');
      expect([...doc.querySelectorAll('.info-label')].map(el => el.textContent)).not.toContain('Objem odpadní nádoby');
    }
    app.toggleKanalizaceMultiValue('Kanalizace', 'Veřejná kanalizace');
    write.mockClear(); app.generateCurrentPropertyBrokerInfo();
    expect(write.mock.calls[0][0]).toContain('8 m³');
  });

  it('saves and prints multiple rainwater drainage choices and a custom description independently of sewage', () => {
    const app = TestBed.createComponent(App).componentInstance as unknown as PrintHarness;
    app.newPropertyDraft.update(draft => ({ ...draft, propertyType: 'Byt' }));
    expect(app.kanalizaceDestoveVodyOptions()).toEqual(['Dešťová kanalizace', 'Jednotná kanalizace', 'Vsakování na pozemku', 'Retenční nádrž', 'Akumulační nádrž na dešťovou vodu', 'Odvod do vodního toku']);
    app.toggleKanalizaceMultiValue('Kanalizace', 'Veřejná kanalizace');
    app.toggleKanalizaceMultiValue('Odvádění dešťových vod', 'Retenční nádrž');
    app.toggleKanalizaceMultiValue('Odvádění dešťových vod', 'Vsakování na pozemku');
    app.setPropertyTabFieldValue('kanalizace', 'Odvádění dešťových vod vlastní', 'Zálivka zahrady');
    app.applyXmlPayload(app.buildXmlString());
    expect(app.propertyTabFieldValue('kanalizace', 'Odvádění dešťových vod')).toBe('Retenční nádrž|Vsakování na pozemku');
    expect(app.propertyTabFieldValue('kanalizace', 'Odvádění dešťových vod vlastní')).toBe('Zálivka zahrady');
    expect(app.propertyTabFieldValue('kanalizace', 'Kanalizace')).toBe('Veřejná kanalizace');
    const write = vi.fn();
    vi.spyOn(window, 'open').mockReturnValue({ document: { open: vi.fn(), write, close: vi.fn() } } as unknown as Window);
    app.generateCurrentPropertyBuyerInfo(); app.generateCurrentPropertyBrokerInfo(); app.generateCurrentPropertyBlankForm();
    for (const [html] of write.mock.calls) {
      const doc = new DOMParser().parseFromString(html as string, 'text/html');
      const row = [...doc.querySelectorAll('.info-row')].find(row => row.querySelector('.info-label')?.textContent === 'Odvádění dešťových vod')!;
      expect(row.querySelector('.info-value')?.textContent).toContain('Retenční nádrž');
      expect(row.querySelector('.info-value')?.textContent).toContain('Vsakování na pozemku');
      expect(doc.body.textContent).toContain('Zálivka zahrady');
    }
  });

  it.each([
    { field: 'parcel', value: '123/4' }, { field: 'type', value: 'Zahrada' }, { field: 'area', value: '250' }
  ] as const)('automatically selects land presence when a parcel $field is filled', ({ field, value }) => {
    const app = TestBed.createComponent(App).componentInstance as unknown as PrintHarness;
    app.setPropertyTabFieldValue('pozemek', 'Pozemek ano/ne', 'Ne');
    app.setPropertyTabFieldValue('pozemek', 'Vlastnictví pozemku', 'Osobní');
    app.addLandParcelRow();
    app.setLandParcelValue(1, field, '   ');
    expect(app.propertyTabFieldValue('pozemek', 'Pozemek ano/ne')).toBe('Ne');
    app.setLandParcelValue(1, field, value);
    expect(app.propertyTabFieldValue('pozemek', 'Pozemek ano/ne')).toBe('Ano');
    app.applyXmlPayload(app.buildXmlString());
    expect(app.propertyTabFieldValue('pozemek', 'Pozemek ano/ne')).toBe('Ano');
    expect(app.propertyTabFieldValue('pozemek', `parcel-1-${field}`)).toBe(value);
    expect(app.propertyTabFieldValue('pozemek', 'Vlastnictví pozemku')).toBe('Osobní');
    app.setLandParcelValue(1, field, '');
    expect(app.propertyTabFieldValue('pozemek', 'Pozemek ano/ne')).toBe('Ano');
    app.setPropertyTabFieldValue('pozemek', 'Pozemek ano/ne', 'Ne');
    expect(app.propertyTabFieldValue('pozemek', 'Pozemek ano/ne')).toBe('Ne');
  });

  it('migrates gas connection status and saves/prints gas sources, usage, inspections, documentation, and monthly advances', () => {
    const app = TestBed.createComponent(App).componentInstance as unknown as PrintHarness;
    app.newPropertyDraft.update(draft => ({ ...draft, propertyType: 'Byt', tabValues: { plyn: {
      'Plyn': 'Nezaveden', 'Typ': 'Propan-butan', 'Umístění': 'Na hranici pozemku', 'Poskytovatel': 'Původní dodavatel'
    } } }));
    expect(app.propertyTabFieldValue('plyn', 'Plyn')).toBe('Bez přípojky');
    expect(app.plynOptions()).toEqual(['Bez přípojky', 'Zaveden', 'Přípojka zřízena, bez odběru', 'Možnost připojení']);
    app.togglePlynMultiValue('Zdroj plynu', 'Vlastní zásobník LPG');
    app.togglePlynMultiValue('Zdroj plynu', 'Plynové lahve');
    app.togglePlynMultiValue('Využití plynu', 'Vytápění');
    app.togglePlynMultiValue('Využití plynu', 'Vaření');
    const values = {
      'Zdroj plynu vlastní': 'Záložní zdroj', 'Umístění plynoměru': 'Na fasádě',
      'Umístění plynoměru vlastní': 'U technické místnosti', 'Využití plynu vlastní': 'Venkovní kuchyně',
      'Plynová přípojka': 'Společná', 'Revize a kontroly': 'Dokumentace staršího data',
      'Dokumentace k plynové přípojce': 'Ne', 'Měsíční zálohy': '2500'
    };
    for (const [field, value] of Object.entries(values)) app.setPropertyTabFieldValue('plyn', field, value);
    app.formatPlynMonthlyAdvance();
    app.setPlynCheckDateValue('Poslední servis kotle', '2026-10-15');
    app.setPlynCheckDateValue('Poslední revize plynového zařízení', '2024-05-09');
    app.setPlynCheckMode('Poslední revize plynového zařízení', 'Nedoloženo');
    app.setPlynCheckDateValue('Poslední kontrola spalinové cesty', '2026-09-10');
    app.applyXmlPayload(app.buildXmlString());
    expect(app.propertyTabFieldValue('plyn', 'Plyn')).toBe('Bez přípojky');
    expect(app.propertyTabFieldValue('plyn', 'Typ')).toBe('Propan-butan');
    expect(app.propertyTabFieldValue('plyn', 'Poskytovatel')).toBe('Původní dodavatel');
    expect(app.propertyTabFieldValue('plyn', 'Zdroj plynu')).toBe('Vlastní zásobník LPG|Plynové lahve');
    expect(app.plynCheckDateValue('Poslední servis kotle')).toBe('2026-10-15');
    expect(app.propertyTabFieldValue('plyn', 'Poslední revize plynového zařízení')).toBe('Nedoloženo');
    expect(app.propertyTabFieldValue('plyn', 'Měsíční zálohy')).toBe('2 500 Kč/měsíc');
    const write = vi.fn();
    vi.spyOn(window, 'open').mockReturnValue({ document: { open: vi.fn(), write, close: vi.fn() } } as unknown as Window);
    app.generateCurrentPropertyBuyerInfo(); app.generateCurrentPropertyBrokerInfo(); app.generateCurrentPropertyBlankForm();
    for (const [html] of write.mock.calls) {
      const doc = new DOMParser().parseFromString(html as string, 'text/html');
      const section = [...doc.querySelectorAll('.info-card')].find(section => section.querySelector('h2')?.textContent === 'PLYN')!;
      const value = (field: string) => [...section.querySelectorAll('.info-row')].find(row => row.querySelector('.info-label')?.textContent === field)?.querySelector('.info-value')?.textContent;
      expect(value('Plyn')).toContain('Bez přípojky');
      expect(value('Plyn')).not.toContain('Nezaveden');
      for (const source of ['Vlastní zásobník LPG', 'Plynové lahve']) expect(value('Zdroj plynu')).toContain(source);
      for (const [field, answer] of Object.entries(values).filter(([field]) => field !== 'Měsíční zálohy')) expect(value(field)).toContain(answer);
      expect(value('Poslední servis kotle')).toContain('15. 10. 2026');
      expect(value('Poslední revize plynového zařízení')).toBe('Nedoloženo');
      expect(value('Poslední kontrola spalinové cesty')).toContain('10. 9. 2026');
      expect(value('Měsíční zálohy')).toContain('2 500 Kč/měsíc');
      expect(section.textContent).not.toContain('9. 5. 2024');
      expect(section.textContent).not.toContain('__date');
    }
  });

  it.each(['Poslední servis kotle', 'Poslední revize plynového zařízení', 'Poslední kontrola spalinové cesty'])('retains the entered gas date when %s is temporarily marked undocumented', field => {
    const app = TestBed.createComponent(App).componentInstance as unknown as PrintHarness;
    app.setPlynCheckDateValue(field, '2026-10-20');
    app.setPlynCheckMode(field, 'Nedoloženo');
    expect(app.plynCheckDateValue(field)).toBe('');
    expect(app.propertyTabFieldValue('plyn', field)).toBe('Nedoloženo');
    app.applyXmlPayload(app.buildXmlString());
    app.setPlynCheckMode(field, 'Datum');
    expect(app.plynCheckDateValue(field)).toBe('2026-10-20');
    expect(app.propertyTabFieldValue('plyn', field)).toBe('20. 10. 2026');
    app.setPlynCheckDateValue(field, '');
    expect(app.propertyTabFieldValue('plyn', field)).toBe('');
    app.setPlynCheckMode(field, 'Nedoloženo');
    app.setPlynCheckMode(field, 'Datum');
    expect(app.plynCheckDateValue(field)).toBe('');
  });

  it.each([
    { legacy: 'Napojen', connection: 'Aktivní', sources: 'Veřejný vodovod|Vlastní studna – vrtaná|Společná studna' },
    { legacy: 'Nezaveden', connection: 'Bez přípojky', sources: 'Vlastní studna – vrtaná|Společná studna' }
  ])('migrates legacy water connection $legacy while retaining well details and explicit source changes', ({ legacy, connection, sources }) => {
    const app = TestBed.createComponent(App).componentInstance as unknown as PrintHarness;
    app.newPropertyDraft.update(draft => ({ ...draft, tabValues: { voda: {
      'Vodovod': legacy, 'Další zdroj vody': 'Studna vlastní|Studna společná', 'Druh studny': 'Studna vrtaná',
      'Další zdroj vody vlastní': 'Záložní zdroj', 'Vodoměr': 'Podružný', 'Poznámka k vodě': 'Původní poznámka'
    } } }));
    expect(app.propertyTabFieldValue('voda', 'Zdroj vody')).toBe(sources);
    expect(app.propertyTabFieldValue('voda', 'Stav napojení')).toBe(connection);
    expect(app.isVodaHasStudna()).toBe(true);
    app.setPropertyTabFieldValue('voda', 'Druh studny', 'Studna kopaná');
    expect(app.propertyTabFieldValue('voda', 'Zdroj vody')).toContain('Vlastní studna – kopaná');
    expect(app.propertyTabFieldValue('voda', 'Zdroj vody')).not.toContain('Vlastní studna – vrtaná');
    app.setPropertyTabFieldValue('voda', 'Zdroj vody', '');
    app.applyXmlPayload(app.buildXmlString());
    expect(app.propertyTabFieldValue('voda', 'Zdroj vody')).toBe('');
    expect(app.propertyTabFieldValue('voda', 'Stav napojení')).toBe(connection);
    expect(app.propertyTabFieldValue('voda', 'Druh studny')).toBe('Studna kopaná');
    expect(app.propertyTabFieldValue('voda', 'Další zdroj vody vlastní')).toBe('Záložní zdroj');
    expect(app.propertyTabFieldValue('voda', 'Poznámka k vodě')).toBe('Původní poznámka');
    expect(app.propertyTabFieldValue('voda', 'Vodoměr')).toBe('Podružný');
  });

  it('saves and prints the extended water sources, connection, equipment, well rights, documentation, dates and units in all reports', () => {
    const app = TestBed.createComponent(App).componentInstance as unknown as PrintHarness;
    app.newPropertyDraft.update(draft => ({ ...draft, propertyType: 'Rodinný dům', tabValues: { voda: { 'Vodovod': 'Napojen' } } }));
    expect(app.vodaZdrojOptions()).toEqual(['Veřejný vodovod', 'Vlastní studna – kopaná', 'Vlastní studna – vrtaná', 'Společná studna', 'Soukromý vodovod', 'Pramen / prameniště', 'Dovoz vody', 'Bez zdroje vody']);
    expect(app.vodaMerakOptions()).toEqual(['Vlastní', 'Společný', 'Podružný']);
    expect(app.vodaKvalitaOptions()).toContain('Neověřená kvalita');
    app.toggleVodaMultiValue('Zdroj vody', 'Vlastní studna – vrtaná');
    app.toggleVodaMultiValue('Zdroj vody', 'Společná studna');
    const values = {
      'Zdroj vody vlastní': 'Záložní cisterna', 'Stav napojení': 'Přípojka zřízena, bez odběru', 'Další zdroj vody': 'Celoroční',
      'Umístění přípojky': 'Na hranici pozemku', 'Vodoměr': 'Společný',
      'Umístění vodoměru': 'Vodoměrná šachta', 'Umístění vodoměru vlastní': 'U vjezdu',
      'Způsob zásobování': 'Domácí vodárna|Čerpadlo', 'Kvalita vody': 'Neověřená kvalita',
      'Využití studny': 'Domácnost|Zahrada', 'Využití studny vlastní': 'Zálivka skleníku',
      'Rozbor vody': 'Ano', 'Úprava vody': 'Filtrace|UV dezinfekce', 'Hloubka studny': '14,5',
      'Celoroční dostupnost vody': 'Ne', 'Čerpadlo': 'Ponorné', 'Čerpadlo vlastní': 'Záložní čerpadlo',
      'Povolení a dokumentace': 'Doloženo', 'Oprávnění k odběru vody': 'Nedoloženo',
      'Právo využívat společnou studnu': 'Služebnost', 'Měsíční zálohy': '1450',
      'Dokumentace k přípojce': 'Ne', 'Smlouva s dodavatelem vody': 'Ano'
    };
    for (const [field, value] of Object.entries(values)) app.setPropertyTabFieldValue('voda', field, value);
    app.formatVodaWellDepth(); app.formatVodaMonthlyAdvance();
    app.setVodaCheckDateValue('Poslední rozbor studniční vody', '2026-09-20');
    app.applyXmlPayload(app.buildXmlString());
    expect(app.propertyTabFieldValue('voda', 'Zdroj vody')).toBe('Veřejný vodovod|Vlastní studna – vrtaná|Společná studna');
    expect(app.propertyTabFieldValue('voda', 'Hloubka studny')).toBe('14,5 m');
    expect(app.propertyTabFieldValue('voda', 'Měsíční zálohy')).toBe('1 450 Kč/měsíc');
    expect(app.vodaCheckDateValue('Poslední rozbor studniční vody')).toBe('2026-09-20');
    const write = vi.fn();
    vi.spyOn(window, 'open').mockReturnValue({ document: { open: vi.fn(), write, close: vi.fn() } } as unknown as Window);
    app.generateCurrentPropertyBuyerInfo(); app.generateCurrentPropertyBrokerInfo(); app.generateCurrentPropertyBlankForm();
    for (const [html] of write.mock.calls) {
      const doc = new DOMParser().parseFromString(html as string, 'text/html');
      const section = [...doc.querySelectorAll('.info-card')].find(section => section.querySelector('h2')?.textContent === 'VODA')!;
      const rows = [...section.querySelectorAll('.info-row')];
      const answer = (field: string) => rows.find(row => row.querySelector('.info-label')?.textContent === field)?.querySelector('.info-value')?.textContent;
      expect(rows.filter(row => row.querySelector('.info-label')?.textContent === 'Stav napojení')).toHaveLength(1);
      expect(section.textContent).not.toContain('Obecní vodovod');
      for (const source of ['Veřejný vodovod', 'Vlastní studna – vrtaná', 'Společná studna']) expect(answer('Zdroj vody')).toContain(source);
      for (const [field, value] of Object.entries(values)) {
        const label = field === 'Kvalita vody' ? 'Kvalita dalšího zdroje vody' : field;
        const expected = field === 'Hloubka studny' ? '14,5 m' : field === 'Měsíční zálohy' ? '1 450 Kč/měsíc' : value;
        for (const part of expected.split('|')) expect(answer(label)).toContain(part);
      }
      expect(answer('Poslední rozbor studniční vody')).toBe('20. 9. 2026');
    }
  });

  it.each([
    ...['Sezonní (na zimu se vypouští)', 'Celoroční', 'Studna vlastní', 'Studna společná', 'Retenční nádrž na dešťovou vodu'].map(choice => ({ choice, custom: '' })),
    { choice: '', custom: ' ' }, { choice: '', custom: 'Soukromý doplňkový zdroj' }
  ])('gates the seven dependent water fields on the additional source ($choice / $custom) without erasing their saved values', ({ choice, custom }) => {
    const app = TestBed.createComponent(App).componentInstance as unknown as PrintHarness;
    const dependent = { 'Využití studny': 'Zahrada', 'Hloubka studny': '14 m', 'Kvalita vody': 'Užitková', 'Rozbor vody': 'Ano', 'Úprava vody': 'Filtrace', 'Celoroční dostupnost vody': 'Ano', 'Čerpadlo': 'Ponorné', 'Využití studny vlastní': 'Skleník', 'Čerpadlo vlastní': 'Záložní čerpadlo' };
    app.newPropertyDraft.update(draft => ({ ...draft, propertyType: 'Byt', tabValues: { voda: { 'Zdroj vody': 'Vlastní studna – vrtaná', ...dependent } } }));
    const fields = () => app.vodaControls().map(control => control.field);
    const gated = ['Využití studny', 'Hloubka studny', 'Kvalita vody', 'Rozbor vody', 'Úprava vody', 'Celoroční dostupnost vody', 'Čerpadlo'];
    expect(fields().slice(fields().indexOf('Způsob zásobování') + 1, fields().indexOf('Způsob zásobování') + 5)).toEqual(['Měsíční zálohy', 'Dokumentace k přípojce', 'Smlouva s dodavatelem vody', 'Provozovatel vodovodu']);
    for (const field of gated) expect(fields()).not.toContain(field);
    app.setPropertyTabFieldValue('voda', 'Další zdroj vody', choice);
    app.setPropertyTabFieldValue('voda', 'Další zdroj vody vlastní', custom);
    for (const field of gated) expect(fields()).toContain(field);
    const write = vi.fn();
    vi.spyOn(window, 'open').mockReturnValue({ document: { open: vi.fn(), write, close: vi.fn() } } as unknown as Window);
    const reports = () => { write.mockClear(); app.generateCurrentPropertyBuyerInfo(); app.generateCurrentPropertyBrokerInfo(); app.generateCurrentPropertyBlankForm(); return write.mock.calls.map(([html]) => new DOMParser().parseFromString(html as string, 'text/html')); };
    for (const doc of reports()) {
      const labels = [...doc.querySelectorAll('.info-label')].map(label => label.textContent);
      for (const field of Object.keys(dependent)) expect(labels).toContain(field === 'Kvalita vody' ? 'Kvalita dalšího zdroje vody' : field);
    }
    app.setPropertyTabFieldValue('voda', 'Další zdroj vody', '');
    app.setPropertyTabFieldValue('voda', 'Další zdroj vody vlastní', '');
    app.applyXmlPayload(app.buildXmlString());
    for (const field of gated) expect(fields()).not.toContain(field);
    for (const doc of reports()) {
      const labels = [...doc.querySelectorAll('.info-label')].map(label => label.textContent);
      for (const field of Object.keys(dependent)) expect(labels).not.toContain(field === 'Kvalita vody' ? 'Kvalita dalšího zdroje vody' : field);
    }
    for (const [field, value] of Object.entries(dependent)) expect(app.propertyTabFieldValue('voda', field)).toBe(value);
  });

  it.each(['', 'Plynové lahve'])('keeps legacy individual gas-supply data when the old dropdown option is removed (source: %s)', source => {
    const app = TestBed.createComponent(App).componentInstance as unknown as PrintHarness;
    app.newPropertyDraft.update(draft => ({ ...draft, tabValues: { plyn: { 'Plyn': 'Individuální', 'Zdroj plynu': source, 'Typ': 'Propan-butan' } } }));
    app.applyXmlPayload(app.buildXmlString());
    expect(app.propertyTabFieldValue('plyn', 'Plyn')).toBe('Bez přípojky');
    expect(app.propertyTabFieldValue('plyn', 'Zdroj plynu')).toBe(source);
    expect(app.propertyTabFieldValue('plyn', 'Zdroj plynu vlastní')).toBe(source ? '' : 'Individuální zdroj plynu');
    expect(app.propertyTabFieldValue('plyn', 'Typ')).toBe('Propan-butan');
  });

  it('retains the last well-water analysis date across undocumented status and never prints its hidden cache', () => {
    const app = TestBed.createComponent(App).componentInstance as unknown as PrintHarness;
    const field = 'Poslední rozbor studniční vody';
    app.setVodaCheckDateValue(field, '2026-10-20'); app.setVodaCheckMode(field, 'Nedoloženo');
    app.applyXmlPayload(app.buildXmlString());
    expect(app.propertyTabFieldValue('voda', field)).toBe('Nedoloženo');
    const write = vi.fn();
    vi.spyOn(window, 'open').mockReturnValue({ document: { open: vi.fn(), write, close: vi.fn() } } as unknown as Window);
    app.generateCurrentPropertyBrokerInfo();
    expect(write.mock.calls[0][0]).toContain('Nedoloženo');
    expect(write.mock.calls[0][0]).not.toContain('20. 10. 2026');
    expect(write.mock.calls[0][0]).not.toContain('__date');
    app.setVodaCheckMode(field, 'Datum');
    expect(app.vodaCheckDateValue(field)).toBe('2026-10-20');
    app.setVodaCheckDateValue(field, ''); app.setVodaCheckMode(field, 'Nedoloženo'); app.setVodaCheckMode(field, 'Datum');
    expect(app.vodaCheckDateValue(field)).toBe('');
  });

  it('keeps empty water amounts empty and allows zero monthly advances and decimal well depth', () => {
    const app = TestBed.createComponent(App).componentInstance as unknown as PrintHarness;
    app.formatVodaMonthlyAdvance(); app.formatVodaWellDepth();
    expect(app.propertyTabFieldValue('voda', 'Měsíční zálohy')).toBe('');
    expect(app.propertyTabFieldValue('voda', 'Hloubka studny')).toBe('');
    app.setPropertyTabFieldValue('voda', 'Měsíční zálohy', '0'); app.formatVodaMonthlyAdvance();
    app.setPropertyTabFieldValue('voda', 'Hloubka studny', '12.75'); app.formatVodaWellDepth();
    expect(app.propertyTabFieldValue('voda', 'Měsíční zálohy')).toBe('0 Kč/měsíc');
    expect(app.propertyTabFieldValue('voda', 'Hloubka studny')).toBe('12,75 m');
  });

  it.each([{ old: 'Zavedena', current: 'Aktivní' }, { old: 'Nezavedena', current: 'Bez přípojky' }])('migrates legacy electricity status $old and preserves wiring, supplier, meter locations and photovoltaic data', ({ old, current }) => {
    const app = TestBed.createComponent(App).componentInstance as unknown as PrintHarness;
    app.newPropertyDraft.update(draft => ({ ...draft, tabValues: { elektina: {
      'Elektřina': old, 'Stav elektrického vedení': 'Částečně rekonstruováno', 'Jističe': '3 fázový', 'Vedení v': 'Hliník i měď',
      'Technologie': '400 V|Fotovoltaika', 'Dodavatel elektrické energie': 'Původní dodavatel',
      'Umístění elektroměru': 'V garáži|Venku', 'Umístění elektroměru vlastní': 'Vedle vstupu', 'Poznámka k elektřině': 'Původní poznámka'
    } } }));
    expect(app.propertyTabFieldValue('elektina', 'Stav připojení')).toBe(current);
    expect(app.propertyTabFieldValue('elektina', 'Stav elektroinstalace')).toBe('Částečně rekonstruovaná');
    expect(app.propertyTabFieldValue('elektina', 'Typ připojení')).toBe('Třífázové (400 V)');
    expect(app.propertyTabFieldValue('elektina', 'Materiál rozvodů')).toBe('Kombinované');
    expect(app.propertyTabFieldValue('elektina', 'Dodavatel elektřiny')).toBe('Jiný');
    expect(app.propertyTabFieldValue('elektina', 'Dodavatel elektřiny vlastní')).toBe('Původní dodavatel');
    expect(app.propertyTabFieldValue('elektina', 'Umístění elektroměru vlastní')).toBe('Vedle vstupu, V garáži, Venku');
    expect(app.propertyTabFieldValue('elektina', 'Technologie')).toBe('400 V');
    expect(app.elektroHasPhotovoltaics()).toBe(true);
    app.setPropertyTabFieldValue('elektina', 'Stav připojení', 'Odpojeno');
    app.toggleElektroMultiValue('Zdroj elektřiny', 'Fotovoltaika');
    app.applyXmlPayload(app.buildXmlString());
    expect(app.propertyTabFieldValue('elektina', 'Stav připojení')).toBe('Odpojeno');
    expect(app.elektroHasPhotovoltaics()).toBe(false);
    expect(app.propertyTabFieldValue('elektina', 'Umístění elektroměru vlastní')).toBe('Vedle vstupu, V garáži, Venku');
    expect(app.propertyTabFieldValue('elektina', 'Poznámka k elektřině')).toBe('Původní poznámka');
  });

  it('saves and prints extended electricity and photovoltaic controls with dates, custom details, and dependent field visibility', () => {
    const app = TestBed.createComponent(App).componentInstance as unknown as PrintHarness;
    app.newPropertyDraft.update(draft => ({ ...draft, propertyType: 'Byt' }));
    const values = {
      'Stav připojení': 'Aktivní', 'Zdroj elektřiny': 'Distribuční síť|Fotovoltaika', 'Typ připojení': 'Třífázové (400 V)',
      'Elektroměr': 'Společný', 'Umístění elektroměru': 'Fasáda', 'Umístění elektroměru vlastní': 'U vjezdu',
      'Materiál rozvodů': 'Měď', 'Stav elektroinstalace': 'Po rekonstrukci', 'Rozsah rekonstrukce': 'Pouze vybrané místnosti',
      'Rekonstruované místnosti': 'Kuchyň a koupelna', 'Elektrický rozvaděč': 'Modernizovaný',
      'Využití elektřiny': 'Vytápění|Ohřev vody|Nabíjení elektromobilu', 'Využití elektřiny vlastní': 'Dílna',
      'Výchozí revize elektroinstalace': 'Doložena', 'Revizní zpráva': 'K dispozici', 'Projektová dokumentace elektroinstalace': 'Ne',
      'Známé závady elektroinstalace': 'Nezjištěno', 'Měsíční zálohy': '2750', 'Dodavatel elektřiny': 'Jiný',
      'Dodavatel elektřiny vlastní': 'Místní dodavatel', 'Distributor': 'Jiný', 'Distributor vlastní': 'Lokální distributor',
      'Fotovoltaika – Instalovaný výkon': '10.5', 'Fotovoltaika – Bateriové úložiště': 'Ano', 'Fotovoltaika – Kapacita baterie': '12,75',
      'Fotovoltaika – Přetoky do sítě': 'Povoleny', 'Fotovoltaika – Rok instalace': '2024', 'Fotovoltaika – Dokumentace a revize': 'Doloženo'
    };
    for (const [field, value] of Object.entries(values)) app.setPropertyTabFieldValue('elektina', field, value);
    app.formatElektroMonthlyAdvance();
    app.formatElektroNumber('Fotovoltaika – Instalovaný výkon', 'kWp'); app.formatElektroNumber('Fotovoltaika – Kapacita baterie', 'kWh');
    app.setElektroCheckDateValue('Poslední revize', '2026-10-15'); app.setElektroCheckMode('Revize hromosvodu', 'Není instalován');
    app.applyXmlPayload(app.buildXmlString());
    expect(app.propertyTabFieldValue('elektina', 'Fotovoltaika – Instalovaný výkon')).toBe('10,5 kWp');
    expect(app.propertyTabFieldValue('elektina', 'Fotovoltaika – Kapacita baterie')).toBe('12,75 kWh');
    expect(app.propertyTabFieldValue('elektina', 'Měsíční zálohy')).toBe('2 750 Kč/měsíc');
    expect(app.elektroCheckDateValue('Poslední revize')).toBe('2026-10-15');
    const write = vi.fn();
    vi.spyOn(window, 'open').mockReturnValue({ document: { open: vi.fn(), write, close: vi.fn() } } as unknown as Window);
    const reports = () => { write.mockClear(); app.generateCurrentPropertyBuyerInfo(); app.generateCurrentPropertyBrokerInfo(); app.generateCurrentPropertyBlankForm(); return write.mock.calls.map(([html]) => new DOMParser().parseFromString(html as string, 'text/html')); };
    for (const doc of reports()) {
      const section = [...doc.querySelectorAll('.info-card')].find(section => section.querySelector('h2')?.textContent === 'ELEKTŘINA')!;
      const answer = (field: string) => [...section.querySelectorAll('.info-row')].find(row => row.querySelector('.info-label')?.textContent === field)?.querySelector('.info-value')?.textContent;
      for (const [field, value] of Object.entries(values)) {
        const formatted = field === 'Měsíční zálohy' ? '2 750 Kč/měsíc' : field === 'Fotovoltaika – Instalovaný výkon' ? '10,5 kWp' : field === 'Fotovoltaika – Kapacita baterie' ? '12,75 kWh' : value;
        for (const part of formatted.split('|')) expect(answer(field)).toContain(part);
      }
      expect(answer('Poslední revize')).toBe('15. 10. 2026');
      expect(answer('Revize hromosvodu')).toBe('Není instalován');
    }
    app.setPropertyTabFieldValue('elektina', 'Fotovoltaika – Bateriové úložiště', 'Ne');
    app.setPropertyTabFieldValue('elektina', 'Rozsah rekonstrukce', 'Kompletní');
    app.setPropertyTabFieldValue('elektina', 'Dodavatel elektřiny', 'PRE');
    app.setPropertyTabFieldValue('elektina', 'Distributor', 'EG.D');
    for (const doc of reports()) {
      const labels = [...doc.querySelectorAll('.info-label')].map(label => label.textContent);
      for (const field of ['Fotovoltaika – Kapacita baterie', 'Rekonstruované místnosti', 'Dodavatel elektřiny vlastní', 'Distributor vlastní']) expect(labels).not.toContain(field);
      expect(doc.body.textContent).not.toContain('12,75 kWh');
    }
    app.toggleElektroMultiValue('Zdroj elektřiny', 'Fotovoltaika');
    for (const doc of reports()) expect([...doc.querySelectorAll('.info-label')].some(label => label.textContent?.startsWith('Fotovoltaika –'))).toBe(false);
    expect(app.propertyTabFieldValue('elektina', 'Fotovoltaika – Kapacita baterie')).toBe('12,75 kWh');
    expect(app.propertyTabFieldValue('elektina', 'Rekonstruované místnosti')).toBe('Kuchyň a koupelna');
  });

  it.each([
    { field: 'Poslední revize', statuses: ['Nezjištěno'] },
    { field: 'Revize hromosvodu', statuses: ['Nedoloženo', 'Není instalován'] }
  ])('retains the electricity date for $field across its non-date statuses and XML', ({ field, statuses }) => {
    const app = TestBed.createComponent(App).componentInstance as unknown as PrintHarness;
    app.setElektroCheckDateValue(field, '2026-10-20');
    for (const status of statuses) { app.setElektroCheckMode(field, status); expect(app.propertyTabFieldValue('elektina', field)).toBe(status); }
    app.applyXmlPayload(app.buildXmlString());
    app.setElektroCheckMode(field, 'Datum');
    expect(app.elektroCheckDateValue(field)).toBe('2026-10-20');
    app.setElektroCheckDateValue(field, '');
    for (const status of statuses) app.setElektroCheckMode(field, status);
    app.setElektroCheckMode(field, 'Datum');
    expect(app.elektroCheckDateValue(field)).toBe('');
  });

  it('preserves saved answers when the Nabízeno questions are renamed', () => {
    const app = TestBed.createComponent(App).componentInstance as unknown as PrintHarness;
    app.newPropertyDraft.update(draft => ({ ...draft, tabValues: { ...draft.tabValues, makler: {
      'Říkali všichni zájemci, že je dům příliš velký, nebo zazněly i jiné důvody?': 'Nevyhovovalo umístění.',
      'Jakým způsobem makléř nemovitost propaguje?': 'Inzerce na portálech.'
    } } }));
    expect(app.propertyTabFieldValue('makler', 'jaký zamítavý důvod měli zájemci?')).toBe('Nevyhovovalo umístění.');
    expect(app.propertyTabFieldValue('makler', 'Jakým způsobem aktuální makléř nemovitost propaguje?')).toBe('Inzerce na portálech.');
    const write = vi.fn();
    vi.spyOn(window, 'open').mockReturnValue({ document: { open: vi.fn(), write, close: vi.fn() } } as unknown as Window);
    app.generateCurrentPropertyBrokerInfo();
    expect(write.mock.calls[0][0]).toContain('jaký zamítavý důvod měli zájemci?');
    expect(write.mock.calls[0][0]).toContain('Nevyhovovalo umístění.');
    expect(write.mock.calls[0][0]).not.toContain('Říkali všichni zájemci');
  });

  it('combines both price answers under one question in print and puts supplementary text on a full-width new line', () => {
    const app = TestBed.createComponent(App).componentInstance as unknown as PrintHarness;
    app.newPropertyDraft.update(draft => ({ ...draft, propertyType: 'Dům', tabValues: { ...draft.tabValues, makler: {
      [BROKER_INTERVIEW_QUESTIONS[1]]: 'Původně 5 milionů.', '@section__buyer-info-visible': 'ANO'
    } } }));
    expect(app.propertyTabFieldValue('makler', BROKER_STARTING_PRICE_FIELD)).toBe('Původně 5 milionů.');
    app.setPropertyTabFieldValue('makler', BROKER_STARTING_PRICE_FIELD, '5 000 000 Kč');
    app.setPropertyTabFieldValue('makler', BROKER_CURRENT_PRICE_FIELD, '4 500 000 Kč');
    app.setPropertyTabFieldValue('makler', BROKER_LISTING_URL_FIELD, 'https://example.cz/inzerat');
    app.setPropertyTabFieldValue('makler', BROKER_LISTING_DATE_FIELD, '20. 10. 2026');
    app.setPropertyTabFieldValue('makler', BROKER_LISTING_PRICE_FIELD, '4500000');
    app.formatBrokerPriceField(BROKER_LISTING_PRICE_FIELD);
    app.setPropertyTabFieldValue('doplnkove-informace', 'Doplnění', 'Krátké doplnění.');
    app.setPropertyTabFieldValue('doplnkove-informace', 'Doplnění 2', 'Druhé doplnění.');
    app.setPropertyTabFieldValue('doplnkove-informace', 'Doplnění 10', 'Desáté doplnění.');
    app.setPropertyTabFieldValue('doplnkove-informace', 'Doplnění 3', 'Třetí doplnění.');
    app.applyXmlPayload(app.buildXmlString());
    expect(app.propertyTabFieldValue('makler', BROKER_CURRENT_PRICE_FIELD)).toBe('4 500 000 Kč');
    const write = vi.fn();
    vi.spyOn(window, 'open').mockReturnValue({ document: { open: vi.fn(), write, close: vi.fn() } } as unknown as Window);
    app.generateCurrentPropertyBuyerInfo();
    app.generateCurrentPropertyBrokerInfo();
    app.generateCurrentPropertyBlankForm();
    for (const [html] of write.mock.calls) {
      const doc = new DOMParser().parseFromString(html as string, 'text/html');
      const rows = [...doc.querySelectorAll('.info-row')];
      const prices = rows.filter(row => row.querySelector('.info-label')?.textContent === BROKER_INTERVIEW_QUESTIONS[1]);
      expect(prices).toHaveLength(1);
      expect(prices[0].classList.contains('info-row-broker-prices')).toBe(true);
      expect(prices[0].querySelector('.info-value')?.textContent).toBe('5 000 000 Kč\n4 500 000 Kč');
      expect(doc.body.textContent).toContain('https://example.cz/inzerat');
      const listingDate = rows.find(row => row.querySelector('.info-label')?.textContent === BROKER_LISTING_DATE_FIELD)!;
      expect(listingDate.querySelector('.info-value')?.textContent).toBe('20. 10. 2026');
      const listingPrice = rows.find(row => row.querySelector('.info-label')?.textContent === BROKER_LISTING_PRICE_FIELD)!;
      expect(listingPrice.querySelector('.info-value')?.textContent).toBe('4 500 000 Kč');
      const supplementary = rows.find(row => row.querySelector('.info-label')?.textContent === 'Doplnění')!;
      expect(supplementary.classList.contains('info-row-full')).toBe(true);
      expect(supplementary.querySelector('.info-value')?.textContent).toBe('• Krátké doplnění.\n• Druhé doplnění.\n• Třetí doplnění.\n• Desáté doplnění.');
      expect(rows.filter(row => /^Doplnění(?: \d+)?$/.test(row.querySelector('.info-label')?.textContent || ''))).toHaveLength(1);
    }
  });

  it.each(['30. 10. 2026', '30.10.2026', '2026-10-30', '30/10/2026'])('accepts a pasted listing date (%s)', value => {
    const app = TestBed.createComponent(App).componentInstance as unknown as PrintHarness;
    const preventDefault = vi.fn();
    app.pasteBrokerListingDate({ clipboardData: { getData: () => value }, preventDefault } as unknown as ClipboardEvent);
    expect(app.brokerListingDateValue()).toBe('2026-10-30');
    expect(app.propertyTabFieldValue('makler', BROKER_LISTING_DATE_FIELD)).toBe('30. 10. 2026');
    expect(preventDefault).toHaveBeenCalledOnce();
  });

  it('does not replace an existing listing date when an invalid date is pasted', () => {
    const app = TestBed.createComponent(App).componentInstance as unknown as PrintHarness;
    app.setBrokerListingDateValue('2026-10-30');
    app.pasteBrokerListingDate({ clipboardData: { getData: () => '31. 2. 2026' }, preventDefault: vi.fn() } as unknown as ClipboardEvent);
    expect(app.brokerListingDateValue()).toBe('2026-10-30');
  });

  it('dates listing-price edits, preserves the original date when only formatting changes, and prints the saved price/date together', () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 9, 30, 12));
    const app = TestBed.createComponent(App).componentInstance as unknown as PrintHarness;
    app.newPropertyDraft.update(draft => ({ ...draft, propertyType: 'Byt' }));
    app.setPropertyTabFieldValue('makler', '@section__buyer-info-visible', 'ANO');
    app.setPropertyTabFieldValue('makler', BROKER_LISTING_PRICE_FIELD, '5 000 Kč');
    app.formatBrokerPriceField(BROKER_LISTING_PRICE_FIELD);
    expect(app.brokerListingPriceStamp()).toBe('');
    app.setBrokerListingPriceValue('6250000'); app.formatBrokerPriceField(BROKER_LISTING_PRICE_FIELD);
    expect(app.brokerListingPriceStamp()).toBe('30. 10. 2026');
    vi.setSystemTime(new Date(2026, 9, 31, 12));
    app.formatBrokerPriceField(BROKER_LISTING_PRICE_FIELD);
    app.setBrokerListingPriceValue('6 250 000 Kč');
    expect(app.brokerListingPriceStamp()).toBe('30. 10. 2026');
    app.setBrokerListingPriceValue('6200000'); app.formatBrokerPriceField(BROKER_LISTING_PRICE_FIELD);
    app.applyXmlPayload(app.buildXmlString());
    expect(app.propertyTabFieldValue('makler', BROKER_LISTING_PRICE_FIELD)).toBe('6 200 000 Kč');
    expect(app.brokerListingPriceStamp()).toBe('31. 10. 2026');
    const write = vi.fn();
    vi.spyOn(window, 'open').mockReturnValue({ document: { open: vi.fn(), write, close: vi.fn() } } as unknown as Window);
    app.generateCurrentPropertyBuyerInfo(); app.generateCurrentPropertyBrokerInfo(); app.generateCurrentPropertyBlankForm();
    for (const [html] of write.mock.calls) {
      const doc = new DOMParser().parseFromString(html as string, 'text/html');
      const rows = [...doc.querySelectorAll('.info-row')].filter(row => row.querySelector('.info-label')?.textContent === BROKER_LISTING_PRICE_FIELD);
      expect(rows).toHaveLength(1);
      expect(rows[0].querySelector('.info-value')?.textContent).toBe('6 200 000 Kč / 31. 10. 2026');
      expect(doc.body.textContent).not.toContain(BROKER_LISTING_PRICE_DATE_FIELD);
    }
    app.setBrokerListingPriceValue('');
    expect(app.brokerListingPriceStamp()).toBe('');
  });

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

  it.each([
    { value: 'https://example.cz/inzerat?typ=byt&cena=100', href: 'https://example.cz/inzerat?typ=byt&cena=100' },
    { value: 'http://example.cz/inzerat', href: 'http://example.cz/inzerat' },
    { value: 'example.cz/inzerat', href: 'https://example.cz/inzerat' }
  ])('prints a clickable listing URL in every report ($value)', ({ value, href }) => {
    const app = TestBed.createComponent(App).componentInstance as unknown as PrintHarness;
    app.newPropertyDraft.update(draft => ({ ...draft, propertyType: 'Byt', tabValues: { makler: { [BROKER_LISTING_URL_FIELD]: value, '@section__buyer-info-visible': 'ANO' } } }));
    const write = vi.fn();
    vi.spyOn(window, 'open').mockReturnValue({ document: { open: vi.fn(), write, close: vi.fn() } } as unknown as Window);
    app.generateCurrentPropertyBuyerInfo(); app.generateCurrentPropertyBrokerInfo(); app.generateCurrentPropertyBlankForm();
    for (const [html] of write.mock.calls) {
      const doc = new DOMParser().parseFromString(html as string, 'text/html');
      const row = [...doc.querySelectorAll('.info-row')].find(row => row.querySelector('.info-label')?.textContent === BROKER_LISTING_URL_FIELD)!;
      expect(row.querySelector('a')?.getAttribute('href')).toBe(href);
      expect(row.querySelector('a')?.textContent).toBe(value);
      expect(row.querySelector('a')?.getAttribute('rel')).toContain('noopener');
    }
  });

  it.each(['javascript:alert(1)', 'data:text/html,<script>alert(1)</script>'])('keeps unsupported listing URLs as escaped text (%s)', value => {
    const app = TestBed.createComponent(App).componentInstance as unknown as PrintHarness;
    app.newPropertyDraft.update(draft => ({ ...draft, propertyType: 'Byt', tabValues: { makler: { [BROKER_LISTING_URL_FIELD]: value, '@section__buyer-info-visible': 'ANO' } } }));
    const write = vi.fn();
    vi.spyOn(window, 'open').mockReturnValue({ document: { open: vi.fn(), write, close: vi.fn() } } as unknown as Window);
    app.generateCurrentPropertyBuyerInfo(); app.generateCurrentPropertyBrokerInfo(); app.generateCurrentPropertyBlankForm();
    for (const [html] of write.mock.calls) {
      const doc = new DOMParser().parseFromString(html as string, 'text/html');
      const row = [...doc.querySelectorAll('.info-row')].find(row => row.querySelector('.info-label')?.textContent === BROKER_LISTING_URL_FIELD)!;
      expect(row.querySelector('.info-value')?.textContent).toBe(value);
      expect(row.querySelector('a, script')).toBeNull();
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
      const expected = ['Číslo případu', 'Nemovitost', 'Vlastnictví', 'Služba', 'Smlouva', 'Adresa nemovitosti', 'Nejblížší adresa'];
      if (html === write.mock.calls[2][0]) expected.push('Poznámka k základním informacím');
      expect(labels).toEqual(expected);
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
      expect([...card('DISPOZICE A').querySelectorAll('.info-row')].find(row => row.querySelector('.info-label')?.textContent === 'Seznam místností v jednotce')?.classList.contains('info-row-full')).toBe(false);
      expect([...card('DISPOZICE B').querySelectorAll('.info-row')].find(row => row.querySelector('.info-label')?.textContent === 'Seznam místností v jednotce')?.classList.contains('info-row-full')).toBe(true);
      expect(card('POZNÁMKA K DISPOZICI').textContent).toContain('Společná poznámka');
    }
  });

  it('prints each building designation after its own area in all reports', () => {
    const app = TestBed.createComponent(App).componentInstance as unknown as PrintHarness;
    app.newPropertyDraft.update(draft => ({ ...draft, propertyType: 'Rodinný dům', tabValues: { stavba: {
      '__stavba-parcel-count': '3',
      'Zapsaná v katastru': 'Ano', 'Zastavěná plocha RÚIAN': '957 m²',
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
      const section = [...document.querySelectorAll('.info-card')].find(section => section.querySelector('h2')?.textContent === 'STAVBA')!;
      const stavbaRows = [...section.querySelectorAll('.info-row')].filter(row => !row.querySelector('.info-label'));
      expect(stavbaRows.length).toBe(3);
      const allRows = [...section.querySelectorAll('.info-row')];
      const cadastralRow = allRows.find(row => row.querySelector('.info-label')?.textContent === 'Zapsaná v katastru')!;
      expect(allRows[allRows.indexOf(cadastralRow) + 1]).toBe(stavbaRows[0]);
      expect(allRows[allRows.indexOf(stavbaRows[2]) + 1].querySelector('.info-label')?.textContent).toBe('Zastavěná plocha dle RÚIAN');
      for (const row of stavbaRows) {
        expect(row.classList.contains('info-row-property-item')).toBe(true);
        expect(row.classList.contains('info-row-full')).toBe(true);
        expect(row.classList.contains('info-row-stavba')).toBe(false);
      }
      expect(stavbaRows[0].querySelector('.info-value')!.textContent).toBe('• 224 - rodinný dům č. p. 9 - 690 m²');
      expect(stavbaRows[1].querySelector('.info-value')!.textContent).toBe('• 225/2 - zemědělská usedlost č. e. 17 - 231 m²');
      expect(stavbaRows[2].querySelector('.info-value')!.textContent).toBe('• 228 - garáž bez č. p. / č. ev. - 36 m²');
      expect(stavbaRows[1].querySelector('.info-value')!.textContent).not.toContain(', 225/2');
    }
    expect(write.mock.calls[0][0]).toContain('.info-row-stavba{grid-template-columns:max-content minmax(0,1fr)}');
    expect(write.mock.calls[0][0]).toContain('.info-row-stavba .info-value{text-align:right}');
    expect(write.mock.calls[0][0]).not.toContain('.info-row-stavba .info-value{padding-right');
    expect(write.mock.calls[2][0]).toContain('.info-row-stavba .info-value{text-align:right}');
    expect(app.stavbaBuildUpArea()).toBe('957 m²');
    expect(app.defaultHandoverPropertyDescription()).toContain('č. p. 9');
    expect(app.defaultHandoverPropertyDescription()).toContain('č. e. 17');
  });

  it.each([1, 2])('prints %i filled parcel(s) with bullets and full-width rows only for multiple parcels', count => {
    const app = TestBed.createComponent(App).componentInstance as unknown as PrintHarness;
    const values: Record<string, string> = {
      '__parcel-count': '3', 'Pozemek ano/ne': 'Ano',
      'parcel-0-parcel': '123/4', 'parcel-0-type': 'Zahrada & sad', 'parcel-0-area': '250 m²'
    };
    if (count === 2) Object.assign(values, { 'parcel-1-parcel': '456/7', 'parcel-1-type': 'Orná půda', 'parcel-1-area': '125 m²' });
    app.newPropertyDraft.update(draft => ({ ...draft, propertyType: 'Byt', tabValues: { pozemek: values } }));
    const original = app.newPropertyDraft();
    const write = vi.fn();
    vi.spyOn(window, 'open').mockReturnValue({ document: { open: vi.fn(), write, close: vi.fn() } } as unknown as Window);
    app.generateCurrentPropertyBuyerInfo(); app.generateCurrentPropertyBrokerInfo(); app.generateCurrentPropertyBlankForm();
    for (const [html] of write.mock.calls) {
      const doc = new DOMParser().parseFromString(html as string, 'text/html');
      const section = [...doc.querySelectorAll('.info-card')].find(section => section.querySelector('h2')?.textContent === 'POZEMEK')!;
      const rows = [...section.querySelectorAll('.info-row')].filter(row => /^(?:• )?(?:123\/4|456\/7) - /.test(row.querySelector('.info-value')?.textContent || ''));
      expect(section.textContent).not.toContain('Pozemek ano/ne');
      expect(rows).toHaveLength(count);
      expect(rows[0].querySelector('.info-value')?.textContent).toBe(`${count === 1 ? '' : '• '}123/4 - Zahrada & sad - 250 m²`);
      for (const row of rows) {
        expect(row.classList.contains('info-row-property-item')).toBe(count > 1);
        expect(row.classList.contains('info-row-full')).toBe(count > 1);
        expect(row.querySelector('.info-label')?.textContent).toBe(count === 1 ? 'Pozemek' : undefined);
      }
      if (count === 2) expect(rows[1].querySelector('.info-value')?.textContent).toBe('• 456/7 - Orná půda - 125 m²');
      expect([...section.querySelectorAll('.info-label')].some(label => /^Pozemek \d+$/.test(label.textContent || ''))).toBe(false);
    }
    expect(app.newPropertyDraft()).toBe(original);
    expect(values['parcel-0-parcel']).toBe('123/4');
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
    const row = [...document.querySelectorAll('.info-row')].find(element => element.querySelector('.info-label')?.textContent === 'Stavba')!;
    const value = row.querySelector('.info-value')!.textContent!;
    expect(value.startsWith('• ')).toBe(false);
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

  it.each([
    ['parcel', '224/2'], ['type', 'rodinný dům'], ['buildingNumberType', 'Číslo popisné'], ['buildingNumber', '17'], ['area', '125']
  ] as const)('automatically marks a building as present when the %s field is filled', (field, value) => {
    const app = TestBed.createComponent(App).componentInstance as unknown as PrintHarness;
    app.setPropertyTabFieldValue('stavba', 'Stavba na pozemku', 'Ne');
    app.setStavbaParcelValue(0, field, '');
    expect(app.propertyTabFieldValue('stavba', 'Stavba na pozemku')).toBe('Ne');
    app.setStavbaParcelValue(0, field, value);
    expect(app.propertyTabFieldValue('stavba', 'Stavba na pozemku')).toBe('Ano');
    app.applyXmlPayload(app.buildXmlString());
    expect(app.propertyTabFieldValue('stavba', 'Stavba na pozemku')).toBe('Ano');
    expect(app.stavbaParcelValue(0, field)).toBe(value);
    app.setStavbaParcelValue(0, field, '');
    expect(app.propertyTabFieldValue('stavba', 'Stavba na pozemku')).toBe('Ano');
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
    expect(app.prostorySharedAccessoryOptions()).toEqual(['Bazén', 'Bazén krytý', 'Dřevník', 'Garáž', 'Letní kuchyně', 'Pergola', 'Sauna', 'Skleník', 'Sklípek', 'Stodola', 'Udírna', 'Vyhřívaný bazén']);
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
    expect(values['Příslušenství nemovitosti']).toBe('Stodola|Bazén krytý');
    expect(values['Poznámka k příslušenství mimo jednotku']).toBe('Stará poznámka');
    expect(values['Poznámka k příslušenství']).toBeUndefined();
    const renamed = app.cloneSavedPropertyRecord({ propertyType: 'Bytový dům', tabValues: { prostory: {
      'Příslušenství jednotky A': 'Sklep', 'Příslušenství jednotky': 'Bazén', 'Příslušenství mimo jednotku B': 'Garáž|Krytý bazén'
    } } }).tabValues['prostory'];
    expect(renamed['Příslušenství v jednotce A']).toBe('Sklep');
    expect(renamed['Příslušenství v jednotce']).toBe('Bazén');
    expect(renamed['Příslušenství v jednotce B']).toBe('Garáž');
    expect(renamed['Příslušenství nemovitosti']).toBe('Bazén krytý');
    expect(renamed['Příslušenství jednotky A']).toBeUndefined();
    expect(renamed['Příslušenství jednotky']).toBeUndefined();
    expect(renamed['Příslušenství mimo jednotku B']).toBeUndefined();
    const shared = app.cloneSavedPropertyRecord({ propertyType: 'Byt', tabValues: { prostory: {
      'Příslušenství nemovitosti': 'Krytý bazén|Bazén krytý|Skleník'
    } } }).tabValues['prostory'];
    expect(shared['Příslušenství nemovitosti']).toBe('Bazén krytý|Skleník');
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

  it.each(['', 'A'])('sorts room instances by floor, preserves dimensions and floor assignments when removing an instance, and saves/prints floors for unit %s', unit => {
    const app = TestBed.createComponent(App).componentInstance as unknown as PrintHarness;
    app.newPropertyDraft.update(draft => ({ ...draft, propertyType: unit ? 'Bytový dům' : 'Dům', tabValues: {
      stavba: { 'Rozděleno na jednotky': unit ? 'Ano' : '', 'Počet jednotek v domě': unit ? '2' : '' },
      prostory: { [`Seznam místností${unit ? ' ' + unit : ''}`]: 'Obývací pokoj|Koupelna|Samostatná toaleta' }
    } }));
    expect(app.selectedProstoryRoomEntries(unit).every(entry => !entry.floorStart && !entry.floor)).toBe(true);
    app.addProstoryRoomInstance('Obývací pokoj', unit);
    app.addProstoryRoomInstance('Obývací pokoj', unit);
    app.setProstoryRoomFloorValue('Obývací pokoj', 0, '10. patro', unit);
    app.setProstoryRoomFloorValue('Obývací pokoj', 1, 'Přízemí', unit);
    app.setProstoryRoomFloorValue('Obývací pokoj', 2, '2. patro', unit);
    app.setProstoryRoomFloorValue('Koupelna', 0, 'Suterén', unit);
    app.setProstoryRoomDimensionValue('Obývací pokoj', 2, 'width', '4', unit);
    app.setProstoryRoomDimensionValue('Obývací pokoj', 2, 'length', '5', unit);
    expect(app.selectedProstoryRoomEntries(unit).map(entry => entry.floor)).toEqual(['Suterén', 'Přízemí', '2. patro', '10. patro', '']);
    app.removeProstoryRoomInstance('Obývací pokoj', 1, unit);
    expect(app.prostoryRoomFloorValue('Obývací pokoj', 1, unit)).toBe('2. patro');
    expect(app.prostoryRoomFloorValue('Obývací pokoj', 2, unit)).toBe('');
    expect(app.prostoryRoomDimensionValue('Obývací pokoj', 1, 'width', unit)).toBe('4');
    expect(app.prostoryRoomDimensionValue('Obývací pokoj', 1, 'length', unit)).toBe('5');
    app.applyXmlPayload(app.buildXmlString());
    expect(app.selectedProstoryRoomEntries(unit).map(entry => [entry.floor, entry.floorStart])).toEqual([
      ['Suterén', false], ['2. patro', true], ['10. patro', true], ['', true]
    ]);
    if (unit) expect(app.prostoryRoomFloorValue('Obývací pokoj', 1, 'B')).toBe('');
    const write = vi.fn();
    vi.spyOn(window, 'open').mockReturnValue({ document: { open: vi.fn(), write, close: vi.fn() } } as unknown as Window);
    app.generateCurrentPropertyBuyerInfo();
    app.generateCurrentPropertyBrokerInfo();
    app.generateCurrentPropertyBlankForm();
    for (const [html] of write.mock.calls) {
      expect(html).toContain('Koupelna (Suterén)');
      expect(html).toContain('Obývací pokoj (2. patro; 4 x 5)');
      expect(html).not.toContain('__floor');
    }
    app.setProstoryRoomFloorValue('Obývací pokoj', 0, 'Suterén', unit);
    expect(app.selectedProstoryRoomEntries(unit).filter(entry => entry.floor === 'Suterén').map(entry => entry.floorStart)).toEqual([false, false]);
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

  it.each([false, true])('opens the selected directory property broker report without replacing editor state (route lookup: %s)', withRoute => {
    const app = TestBed.createComponent(App).componentInstance as unknown as PrintHarness;
    app.agentProfile.update(profile => ({ ...profile, departureAddress: withRoute ? 'Výjezd 1' : '' }));
    app.activeSavedPropertyId.set('editing-property');
    app.activeDispoziceUnit.set('B');
    app.propertyWorkspaceMode.set('directory');
    app.newPropertyDraft.update(draft => ({ ...draft, title: 'Rozpracovaná zakázka', address: 'Neuložená adresa', tabValues: { plyn: { 'Poznámka k plynu': 'Neuložená poznámka' } } }));
    const saved: ReturnType<PrintHarness['savedPropertyRecords']> = [
      { id: 'other-property', createdAt: '', title: 'Jiná zakázka', propertyType: 'Byt', address: 'Jiná adresa', price: '', seller: '', status: 'active' as const, phase: '', tabValues: {} },
      { id: 'selected-property', createdAt: '', title: 'Vybraná zakázka', propertyType: 'Byt', address: 'Vybraná adresa', price: '', seller: '', status: 'active' as const, phase: '', tabValues: { plyn: { 'Poznámka k plynu': 'Uložené údaje vybrané nemovitosti' } } }
    ];
    app.savedPropertyRecords.set(saved);
    app.savedClientRecords.set([
      { id: 'selected-client', draft: { fullName: 'Klient vybrané nemovitosti', companyName: '', phonePrefix: '+420', phone: '777111222', email: 'selected@example.cz', linkedPropertyId: 'selected-property' } },
      { id: 'editing-client', draft: { fullName: 'Klient rozpracované nemovitosti', companyName: '', phonePrefix: '+420', phone: '777333444', email: 'editing@example.cz', linkedPropertyId: 'editing-property' } }
    ]);
    const route = new Subject<DrivingRoute>();
    const calculate = vi.spyOn(TestBed.inject(DrivingRouteService), 'calculate').mockReturnValue(route);
    const write = vi.fn();
    const open = vi.spyOn(window, 'open').mockReturnValue({ closed: false, document: { open: vi.fn(), write, close: vi.fn() } } as unknown as Window);
    const originalDraft = app.newPropertyDraft();
    app.generatePropertyDirectoryBrokerInfo({ index: 1 });
    expect(app.newPropertyDraft()).toBe(originalDraft);
    if (withRoute) {
      expect(calculate).toHaveBeenCalledWith('Výjezd 1', 'Vybraná adresa');
      app.newPropertyDraft.update(draft => ({ ...draft, address: 'Další rozpracovaná adresa' }));
      route.next({ distanceMeters: 205000, durationSeconds: 10500, originCity: '', destinationCity: '' });
      route.complete();
    } else expect(calculate).not.toHaveBeenCalled();
    const html = write.mock.calls[withRoute ? 1 : 0][0];
    const doc = new DOMParser().parseFromString(html as string, 'text/html');
    expect(doc.title).toBe('Informace pro makléře');
    expect(doc.body.textContent).toContain('Vybraná adresa');
    expect(doc.body.textContent).toContain('Uložené údaje vybrané nemovitosti');
    expect(doc.body.textContent).toContain('Klient vybrané nemovitosti');
    expect(doc.body.textContent).not.toContain('Neuložená poznámka');
    expect(doc.body.textContent).not.toContain('Klient rozpracované nemovitosti');
    if (withRoute) expect(doc.body.textContent).toContain('205 km, 2:55 hod');
    expect(app.newPropertyDraft().address).toBe(withRoute ? 'Další rozpracovaná adresa' : 'Neuložená adresa');
    expect(app.activeSavedPropertyId()).toBe('editing-property');
    expect(app.activeDispoziceUnit()).toBe('B');
    expect(app.propertyWorkspaceMode()).toBe('directory');
    expect(app.savedPropertyRecords()).toBe(saved);
    expect(open).toHaveBeenCalledTimes(1);
    app.generatePropertyDirectoryBrokerInfo({ index: 99 });
    expect(open).toHaveBeenCalledTimes(1);
  });

  it.each([false, true])('prints compact driving directions once at the end of basic information (linked client: %s)', linkedClient => {
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
    const client = [...report.querySelectorAll('.info-card')].find(card => card.querySelector('h2')?.textContent === 'KLIENT');
    const basic = [...report.querySelectorAll('.info-card')].find(card => card.querySelector('h2')?.textContent === 'ZÁKLADNÍ INFORMACE')!;
    const drivingRows = [...report.querySelectorAll('.info-row')].filter(row => row.querySelector('.info-label')?.textContent === 'Dojezd');
    expect(drivingRows).toHaveLength(1);
    expect(drivingRows[0].querySelector('.info-value')?.textContent).toBe('205 km, 2:55 hod');
    expect(drivingRows[0].classList.contains('info-row-full')).toBe(false);
    expect(basic.querySelector('.info-card-body')?.lastElementChild).toBe(drivingRows[0]);
    expect(basic.textContent).not.toContain('Havířov');
    expect(basic.textContent).not.toContain('Skorošice');
    expect(report.body.textContent).not.toContain('DOJEZD MAKLÉŘE');
    if (linkedClient) { expect(client?.textContent).toContain('Jan Novák'); expect(client?.textContent).not.toContain('Dojezd'); }
    else expect(client).toBeUndefined();
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
