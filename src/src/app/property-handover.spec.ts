import { provideHttpClient } from '@angular/common/http';
import { WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './app';
import { HANDOVER_RETURN_CONCLUSIONS } from './handover-return';

interface ClientDraft {
  fullName: string; companyName: string; birthDate: string;
  permanentResidence: string; permanentResidenceState: string;
  phonePrefix: string; phone: string; email: string;
  clientInterest: string; linkedPropertyId?: string;
}
interface ClientRecord { id: string; createdAt: string; draft: ClientDraft }
interface PropertyDraft {
  title: string; propertyType: string; address: string; price: string; seller: string; phase: string;
  linkedClientId?: string; linkedClientIds?: string[]; tabValues: Record<string, Record<string, string>>;
}
interface Party { name: string; birthDate: string; address: string; phone: string; email: string }
interface HandoverHarness {
  activeSavedPropertyId: WritableSignal<string>;
  savedClientRecords: WritableSignal<ClientRecord[]>;
  savedPropertyRecords: WritableSignal<Array<PropertyDraft & { id: string; createdAt: string; status: string }>>;
  newPropertyDraft: WritableSignal<PropertyDraft>;
  createDefaultNewClientDraft(): ClientDraft;
  createDefaultNewPropertyDraft(): PropertyDraft;
  openPropertyFormForRecord(index: number): void;
  handoverLinkedClients(): ClientRecord[];
  handoverLinkedClientRole(client: ClientRecord): string;
  setHandoverLinkedClientRole(clientId: string, role: string): void;
  handoverResolvedParties(role: 'predavajici' | 'prebirajici'): Party[];
  toggleHandoverContact(role: 'predavajici' | 'prebirajici', id: string): void;
  handoverContactOptions(role: 'predavajici' | 'prebirajici'): Array<{ id: string; pinned: boolean; selected: boolean }>;
  handoverKeysConfirmationText(): string;
  handoverKeysConfirmationPreset(): string;
  setHandoverKeysConfirmationPreset(preset: string): void;
  setHandoverKeysConfirmationCustomText(text: string): void;
  handoverBuyerObligationPreset(): string;
  handoverBuyerObligationText(): string;
  setHandoverBuyerObligationPreset(preset: string): void;
  setPropertyTabFieldValue(tab: string, field: string, value: string): void;
  propertyTabFieldValue(tab: string, field: string): string;
  setHandoverCustomMeterValue(index: number, field: 'label' | 'number' | 'state' | 'unit', value: string): void;
  addHandoverCustomMeter(): void;
  removeHandoverCustomMeter(index: number): void;
  addHandoverExtraParty(role: 'predavajici' | 'prebirajici'): void;
  setHandoverExtraPartyField(role: 'predavajici' | 'prebirajici', index: number, field: 'name', value: string): void;
  generateHandoverProtocol(): void;
  printBlankHandoverProtocol(): void;
  setBlankHandoverField(field: string, value: string): void;
  resetBlankHandoverSettings(): void;
  blankHandoverValues(): Record<string, string>;
  saveCurrentProperty(): void;
  buildXmlString(): string;
  applyXmlPayload(xml: string): void;
}

describe('Property handover participants', () => {
  let app: HandoverHarness;
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
    app = TestBed.createComponent(App).componentInstance as unknown as HandoverHarness;
    app.savedClientRecords.set([
      { id: 'owner', createdAt: '', draft: { ...app.createDefaultNewClientDraft(),
        fullName: 'Anna Nováková', birthDate: '1.1.1970', permanentResidence: 'Havířov 10', permanentResidenceState: 'ČR',
        phonePrefix: '+420', phone: '777 123 456', email: 'anna@example.cz', clientInterest: 'pronajimatel', linkedPropertyId: 'property-1' } },
      { id: 'tenant', createdAt: '', draft: { ...app.createDefaultNewClientDraft(), fullName: 'Jan Nájemník', clientInterest: 'najemce' } }
    ]);
    app.savedPropertyRecords.set(['property-1', 'property-2'].map(id => ({
      ...app.createDefaultNewPropertyDraft(), id, createdAt: '', status: 'active', title: id,
      propertyType: 'Byt', linkedClientIds: ['owner', 'tenant']
    })));
    app.openPropertyFormForRecord(0);
  });
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
    if (vi.isFakeTimers()) vi.clearAllTimers();
    vi.useRealTimers();
  });

  function printedProtocol(blank = false): Document {
    vi.useFakeTimers();
    const write = vi.fn();
    vi.spyOn(window, 'open').mockReturnValue({ document: { open: vi.fn(), write, close: vi.fn() }, print: vi.fn() } as unknown as Window);
    if (blank) app.printBlankHandoverProtocol();
    else app.generateHandoverProtocol();
    return new DOMParser().parseFromString(write.mock.calls[0][0], 'text/html');
  }

  it.each(['prodavajici', 'pronajimatel', 'zajemce', 'jiny'])('automatically fills the linked owner even when her contact role is %s', clientInterest => {
    app.savedClientRecords.update(clients => clients.map(client => client.id === 'owner'
      ? { ...client, draft: { ...client.draft, clientInterest } } : client));
    expect(app.handoverResolvedParties('predavajici')).toEqual([{
      clientId: 'owner', name: 'Anna Nováková', birthDate: '1.1.1970', address: 'Havířov 10, ČR', phone: '+420 777 123 456', email: 'anna@example.cz'
    }]);
    expect(app.handoverResolvedParties('prebirajici').map(party => party.name)).toEqual(['Jan Nájemník']);
    const report = printedProtocol();
    expect(report.querySelector('.parties-grid > div:first-child')?.textContent).toContain('Anna Nováková');
    expect(report.querySelector('.parties-grid > div:first-child')?.textContent).toContain('anna@example.cz');
    expect(report.querySelector('.signature-grid > div:first-child')?.textContent).toContain('Anna Nováková');
  });

  it('moves the owner to receiving and the tenant to delivering in both the report and signatures without changing the contacts', () => {
    app.setHandoverLinkedClientRole('owner', 'prebirajici');
    app.setHandoverLinkedClientRole('tenant', 'predavajici');
    expect(app.handoverResolvedParties('predavajici').map(party => party.name)).toEqual(['Jan Nájemník']);
    expect(app.handoverResolvedParties('prebirajici').map(party => party.name)).toEqual(['Anna Nováková']);
    const report = printedProtocol();
    expect(report.querySelector('.parties-grid > div:first-child')?.textContent).not.toContain('Anna Nováková');
    expect(report.querySelector('.parties-grid > div:last-child')?.textContent).toContain('Anna Nováková');
    expect(report.querySelector('.signature-grid > div:last-child')?.textContent).toContain('Anna Nováková');
    expect(report.querySelector('.signature-grid > div:first-child')?.textContent).toContain('Jan Nájemník');
    expect(app.savedClientRecords()[0].draft.clientInterest).toBe('pronajimatel');
    expect(app.savedClientRecords()[1].draft.clientInterest).toBe('najemce');
  });

  it('saves roles per property and preserves them through XML and reopening', () => {
    app.setHandoverLinkedClientRole('owner', 'prebirajici');
    app.saveCurrentProperty();
    const xml = app.buildXmlString();
    app.openPropertyFormForRecord(1);
    expect(app.handoverLinkedClientRole(app.savedClientRecords()[0])).toBe('predavajici');
    app.applyXmlPayload(xml);
    app.openPropertyFormForRecord(0);
    expect(app.handoverLinkedClientRole(app.savedClientRecords()[0])).toBe('prebirajici');
    expect(app.handoverResolvedParties('prebirajici').some(party => party.name === 'Anna Nováková')).toBe(true);
  });

  it('keeps manually entered parties when a linked owner changes roles', () => {
    app.addHandoverExtraParty('predavajici');
    app.setHandoverExtraPartyField('predavajici', 0, 'name', 'Další předávající');
    app.addHandoverExtraParty('prebirajici');
    app.setHandoverExtraPartyField('prebirajici', 0, 'name', 'Makléřka');
    app.setHandoverLinkedClientRole('owner', 'prebirajici');
    const report = printedProtocol();
    expect(report.querySelector('.parties-grid > div:first-child')?.textContent).toContain('Další předávající');
    expect(report.querySelector('.parties-grid > div:last-child')?.textContent).toContain('Makléřka');
    expect(report.querySelector('.parties-grid > div:last-child')?.textContent).toContain('Anna Nováková');
  });

  it('resolves reverse links without duplicates and can omit a contact from just this protocol', () => {
    app.newPropertyDraft.update(draft => ({ ...draft, linkedClientIds: [] }));
    expect(app.handoverLinkedClients().map(client => client.id)).toEqual(['owner']);
    app.newPropertyDraft.update(draft => ({ ...draft, linkedClientId: 'owner', linkedClientIds: ['owner', 'owner'] }));
    expect(app.handoverResolvedParties('predavajici')).toHaveLength(1);
    app.setHandoverLinkedClientRole('owner', 'nezahrnovat');
    expect(app.handoverResolvedParties('predavajici')).toHaveLength(0);
    expect(app.handoverResolvedParties('prebirajici')).toHaveLength(0);
    expect(app.handoverLinkedClients()).toHaveLength(1);
  });

  it('can select an unlinked database contact, move them between sides, and save without linking them to the property', () => {
    app.savedClientRecords.update(clients => [...clients, { id: 'extra', createdAt: '', draft: {
      ...app.createDefaultNewClientDraft(), fullName: 'Bára Dvořáková'
    } }]);
    expect(app.handoverContactOptions('predavajici').find(contact => contact.id === 'owner')?.pinned).toBe(true);
    expect(app.handoverContactOptions('predavajici').find(contact => contact.id === 'extra')).toMatchObject({ pinned: false, selected: false });
    app.toggleHandoverContact('prebirajici', 'extra');
    expect(app.handoverResolvedParties('prebirajici').some(party => party.name === 'Bára Dvořáková')).toBe(true);
    app.toggleHandoverContact('predavajici', 'extra');
    expect(app.handoverResolvedParties('prebirajici').some(party => party.name === 'Bára Dvořáková')).toBe(false);
    expect(app.handoverResolvedParties('predavajici').some(party => party.name === 'Bára Dvořáková')).toBe(true);
    app.saveCurrentProperty();
    app.applyXmlPayload(app.buildXmlString());
    app.openPropertyFormForRecord(0);
    expect(app.handoverResolvedParties('predavajici').some(party => party.name === 'Bára Dvořáková')).toBe(true);
    expect(app.handoverLinkedClients().some(client => client.id === 'extra')).toBe(false);
    expect(printedProtocol().querySelector('.parties-grid > div:first-child')?.textContent).toContain('Bára Dvořáková');
    app.toggleHandoverContact('predavajici', 'extra');
    expect(app.handoverResolvedParties('predavajici').some(party => party.name === 'Bára Dvořáková')).toBe(false);
  });

  it('prints the keys confirmation while retaining custom text across preset changes', () => {
    const confirmation = (section: string): string | null => {
      const report = printedProtocol();
      return [...report.querySelectorAll('.section')].find(element => element.querySelector('.section-title')?.textContent === section)?.querySelector('.meter-confirmation')?.textContent || null;
    };
    expect(app.handoverKeysConfirmationText()).toBe('Předávající i přebírající svými podpisy stvrzují, že byly předány tyto klíče od nemovitosti.');
    app.saveCurrentProperty();
    app.applyXmlPayload(app.buildXmlString());
    app.openPropertyFormForRecord(0);
    app.setHandoverKeysConfirmationPreset('custom');
    app.setHandoverKeysConfirmationCustomText('Vlastní potvrzení předání klíčů.');
    expect(confirmation('KLÍČE')).toBe('Vlastní potvrzení předání klíčů.');
  });

  it('uses the handover meter confirmation text when returning a rental to its owner', () => {
    app.setHandoverBuyerObligationPreset('leaseReturn');
    expect(app.handoverBuyerObligationPreset()).toBe('leaseReturn');
    expect(app.handoverBuyerObligationText()).toBe('Předávající a přebírající svými podpisy stvrzují, že specifikovaná, výše uvedená nemovitost byla předána s výše uvedenými konečnými stavy měřidel.');
    const meterSection = [...printedProtocol().querySelectorAll('.section')]
      .find(element => element.querySelector('.section-title')?.textContent === 'STAVY MĚŘIČŮ');
    expect(meterSection?.textContent).toContain('specifikovaná, výše uvedená nemovitost byla předána');
  });

  it('prints checked energy-transfer text even if the legacy global visibility flag is off', () => {
    app.newPropertyDraft.update(draft => ({ ...draft, tabValues: { ...draft.tabValues, 'predavaci-protokol': {
      buyerObligationVisible: 'NE', buyerObligationsaleVisible: 'ANO'
    } } }));
    const meterSection = [...printedProtocol().querySelectorAll('.section')]
      .find(element => element.querySelector('.section-title')?.textContent === 'STAVY MĚŘIČŮ');
    expect(meterSection?.textContent).toContain('Kupující se podpisem kupní smlouvy zavázal');
  });

  it('copies cellar and manager details from the property description into the handover protocol', () => {
    app.setPropertyTabFieldValue('prostory', 'Příslušenství v jednotce', 'Sklep');
    app.setPropertyTabFieldValue('prostory', 'Sklep číslo', '45A');
    expect(app.propertyTabFieldValue('predavaci-protokol', 'cellarVisible')).toBe('ANO');
    expect(app.propertyTabFieldValue('predavaci-protokol', 'cellarReturnSectionVisible')).toBe('ANO');
    expect(app.propertyTabFieldValue('predavaci-protokol', 'cellar')).toBe('45A');
    app.setPropertyTabFieldValue('predavaci-protokol', 'cellarVisible', 'NE');
    expect(app.propertyTabFieldValue('predavaci-protokol', 'cellarReturnSectionVisible')).toBe('NE');

    app.setPropertyTabFieldValue('sluzby', 'Služby', 'Předseda / správce');
    app.setPropertyTabFieldValue('sluzby', 'Jméno správce', 'Petr Správce');
    app.setPropertyTabFieldValue('sluzby', 'Telefon na správce', '777 111 222');
    app.setPropertyTabFieldValue('sluzby', 'E-mail na správce', 'spravce@example.cz');
    expect(app.propertyTabFieldValue('predavaci-protokol', 'managerVisible')).toBe('ANO');
    expect(app.propertyTabFieldValue('predavaci-protokol', 'managerName')).toBe('Petr Správce');
    expect(app.propertyTabFieldValue('predavaci-protokol', 'managerPhone')).toBe('777 111 222');
    expect(app.propertyTabFieldValue('predavaci-protokol', 'managerEmail')).toBe('spravce@example.cz');
  });

  it('names protocol files with the service relationship and the surname on the selected side', () => {
    app.setHandoverLinkedClientRole('owner', 'nezahrnovat');
    app.setHandoverLinkedClientRole('tenant', 'nezahrnovat');
    app.setPropertyTabFieldValue('zakladni', 'Služba', 'Prodej');
    expect(printedProtocol().title).toBe('PP prodávající x kupující');
    app.setPropertyTabFieldValue('zakladni', 'Služba', 'Pronájem');
    expect(printedProtocol().title).toBe('PP pronajímatel x nájemník');
    app.setPropertyTabFieldValue('zakladni', 'Služba', 'Podnájem');
    expect(printedProtocol().title).toBe('PP pronajímatel x podnájemník');

    app.setHandoverLinkedClientRole('owner', 'prebirajici');
    expect(printedProtocol().title).toBe('PP Nováková x podnájemník');
    app.setPropertyTabFieldValue('zakladni', 'Služba', 'Pronájem');
    app.savedClientRecords.update(clients => clients.map(client => client.id === 'owner'
      ? { ...client, draft: { ...client.draft, fullName: 'Martin Pomajbík', clientInterest: 'pronajimatel' } } : client));
    expect(printedProtocol().title).toBe('PP Pomajbík x nájemník');
  });

  it('adds, removes and prints multiple custom meters with their own units', () => {
    app.setPropertyTabFieldValue('predavaci-protokol', 'customMeterCount', '0');
    app.addHandoverCustomMeter();
    app.setHandoverCustomMeterValue(0, 'label', 'Teplo');
    app.setHandoverCustomMeterValue(0, 'number', 'M-1');
    app.setHandoverCustomMeterValue(0, 'state', '123');
    app.setHandoverCustomMeterValue(0, 'unit', 'kWh');
    app.addHandoverCustomMeter();
    app.setHandoverCustomMeterValue(1, 'label', 'Voda');
    app.setHandoverCustomMeterValue(1, 'number', 'V-2');
    app.setHandoverCustomMeterValue(1, 'state', '45');
    app.setHandoverCustomMeterValue(1, 'unit', 'm³');
    let report = printedProtocol();
    expect(report.querySelector('.meter-table')?.textContent).toContain('Teplo');
    expect(report.querySelector('.meter-table')?.textContent).toContain('kWh');
    expect(report.querySelector('.meter-table')?.textContent).toContain('Voda');
    expect(report.querySelector('.meter-table')?.textContent).toContain('m³');
    app.removeHandoverCustomMeter(0);
    report = printedProtocol();
    expect(report.querySelector('.meter-table')?.textContent).not.toContain('Teplo');
    expect(report.querySelector('.meter-table')?.textContent).toContain('Voda');
  });

  it('does not print the removed property confirmation text', () => {
    app.newPropertyDraft.update(draft => ({ ...draft, tabValues: { ...draft.tabValues,
      'predavaci-protokol': { meterConfirmationText: 'Dříve uložené vlastní znění.' }
    } }));
    expect([...printedProtocol().querySelectorAll('.section')].find(element => element.querySelector('.section-title')?.textContent === 'STAVY MĚŘIČŮ')?.querySelector('.meter-confirmation')).toBeNull();
  });

  it('formats the protocol address into street and municipality/postcode lines without a region', () => {
    app.newPropertyDraft.update(draft => ({ ...draft, address: 'Loděnice 9, Loděnice 671 75 (Jihomoravský kraj)' }));
    const report = printedProtocol();
    expect([...report.querySelectorAll('.property-address-value > span')].map(line => line.textContent))
      .toEqual(['Loděnice 9', 'Loděnice 671 75']);
    expect(report.querySelector('.property-address')?.textContent).not.toContain('Jihomoravský');
    expect(report.querySelectorAll('[data-return-section]')).toHaveLength(0);
  });

  it('prints opted-in sections between keys and remains with handwriting lines and complete lease-return clauses', () => {
    app.newPropertyDraft.update(draft => ({ ...draft, tabValues: { ...draft.tabValues, 'predavaci-protokol': {
      cellarVisible: 'ANO', cellar: 'Sklep u vchodu', doorbellVisible: 'ANO', mailbox: 'Schránka u vchodu',
      leaseReturnSectionVisible: 'ANO', returnCleared: 'ANO'
    } } }));
    const report = printedProtocol();
    expect(report.querySelector('[data-return-section=takeover]')).toBeNull();
    expect(report.querySelectorAll('[data-return-field=returnDefects] .handover-write-box')).toHaveLength(4);
    expect(report.querySelectorAll('[data-return-field=returnRepairs] .handover-write-box')).toHaveLength(4);
    expect(report.querySelector('[data-return-section=condition] .handover-return-check')?.textContent).toContain('☑');
    expect([...report.querySelectorAll('[data-return-section=condition] .handover-return-check')]
      .find(check => check.textContent?.includes('Se závadami nebo poškozením'))?.textContent).toContain('☐');
    const headings = [...report.querySelectorAll('.section-title')].map(heading => heading.textContent);
    expect(headings).toContain('FINANČNÍ VYPOŘÁDÁNÍ A JISTOTA (KAUCE)');
    expect(headings).toContain('DALŠÍ VYBAVENÍ A DOKUMENTACE');
    expect(headings).toContain('Fotodokumentace');
    expect(headings.indexOf('KLÍČE')).toBeLessThan(headings.indexOf('DALŠÍ VYBAVENÍ A DOKUMENTACE'));
    expect(headings.indexOf('DALŠÍ VYBAVENÍ A DOKUMENTACE')).toBeLessThan(headings.indexOf('STAV NEMOVITOSTI PŘI PŘEDÁNÍ'));
    expect(report.body.textContent).toContain('SCHRÁNKA A ZVONEK');
    for (const conclusion of HANDOVER_RETURN_CONCLUSIONS.filter(conclusion => conclusion.defaultOn)) expect(report.body.textContent).toContain(conclusion.text);
    expect(report.body.textContent).not.toContain(HANDOVER_RETURN_CONCLUSIONS.find(conclusion => conclusion.key === 'conclusionEarlyTermination')!.text);
    expect(report.querySelector('[data-return-section=conclusion] .handover-return-check')).toBeNull();
    expect(report.querySelectorAll('[data-return-section=conclusion] .handover-return-conclusion')).toHaveLength(3);
    expect(report.querySelectorAll('.keys-summary > .handover-detail')).toHaveLength(3);
    expect(report.querySelector('.page')?.classList.contains('extended-handover')).toBe(true);
  });

  it('persists the optional sections and safely prints entered defects, amounts and bank details', () => {
    const values = {
      cellarVisible: 'ANO', cellar: 'Sklep za domem', leaseReturnSectionVisible: 'ANO',
      returnDefects: '<img src=x onerror=alert(1)>\nPoškozená podlaha.', returnRepairs: 'Nájemce opraví do 30.11.',
      returnKeysExceptions: 'Chybí čip.', returnEquipment: 'Návod ke kotli.',
      returnDepositAmount: '25 000', returnUnpaidDebts: 'Nájemné 1000 Kč.', returnDamageCosts: 'Oprava 2000 Kč.',
      returnDepositAgreement: 'Započtení škody.', returnRefundAmount: '22 000', returnBankAccount: '123456/0100',
      returnPhotosTaken: 'ANO', returnPhotosAttached: 'ANO'
    };
    app.newPropertyDraft.update(draft => ({ ...draft, tabValues: { ...draft.tabValues, 'predavaci-protokol': values } }));
    app.saveCurrentProperty();
    app.applyXmlPayload(app.buildXmlString());
    app.openPropertyFormForRecord(0);
    const report = printedProtocol();
    expect(report.querySelector('[data-return-field=returnDefects]')?.textContent).toContain(values.returnDefects);
    expect(report.querySelector('[data-return-field=returnDefects] img')).toBeNull();
    expect(report.querySelector('[data-return-field=returnBankAccount]')?.textContent).toContain('123456/0100');
    expect(report.querySelector('[data-return-field=returnDepositAmount]')?.textContent).toContain('25 000');
    expect(report.querySelector('[data-return-field=returnRefundAmount]')?.textContent).toContain('22 000');
    app.newPropertyDraft.update(draft => ({ ...draft, tabValues: { ...draft.tabValues, 'predavaci-protokol': {
      ...draft.tabValues['predavaci-protokol'], cellarVisible: 'NE', leaseReturnSectionVisible: 'NE'
    } } }));
    expect(printedProtocol().querySelectorAll('[data-return-section]')).toHaveLength(0);
    expect([...printedProtocol().querySelectorAll('.section-title')].map(heading => heading.textContent)).not.toContain('SKLEP');
    expect(app.newPropertyDraft().tabValues['predavaci-protokol']['returnBankAccount']).toBe('123456/0100');
  });

  it('never reuses people, property details or values from the last filled protocol in a blank protocol', () => {
    app.newPropertyDraft.update(draft => ({ ...draft, address: 'Soukromá adresa 15', tabValues: {
      ...draft.tabValues, 'predavaci-protokol': {
        propertyDescription: 'Soukromý byt majitelky', electricMeterNumber: 'STARÝ-MĚŘIČ', keysDescription: 'Starý popis klíčů',
        managerVisible: 'ANO', managerName: 'Původní správce', cellarVisible: 'ANO', cellar: 'Starý sklep',
        'prebirajici-count': '1', 'prebirajici-0-name': 'Ručně vyplněná osoba'
      }
    } }));
    expect(printedProtocol().body.textContent).toContain('Anna Nováková');
    const draft = app.newPropertyDraft();
    const blank = printedProtocol(true);
    expect(blank.title).toBe('Prázdný předávací protokol');
    for (const text of ['Anna Nováková', 'Jan Nájemník', 'Ručně vyplněná osoba', 'Soukromá adresa 15',
      'Soukromý byt majitelky', 'STARÝ-MĚŘIČ', 'Starý popis klíčů', 'Původní správce', 'Starý sklep']) {
      expect(blank.documentElement.textContent).not.toContain(text);
    }
    expect(blank.querySelector('.property-text')?.textContent).not.toContain('Byt');
    expect(blank.querySelectorAll('.parties-grid .party-name')).toHaveLength(0);
    expect(app.newPropertyDraft()).toBe(draft);
    expect(printedProtocol().body.textContent).toContain('Soukromý byt majitelky');
  });

  it('prints only explicit blank-template choices and still ignores any participant fields in that template', () => {
    const choices = {
      propertyDescription: 'Předvyplněný popis šablony', address: 'Dlouhá 10, Praha 110 00 (Praha)',
      electricT1MeterVisible: 'NE', gasMeterVisible: 'NE', remainsSectionVisible: 'NE', cellarVisible: 'ANO',
      'clientRole__owner': 'predavajici', 'predavajici-count': '1', 'predavajici-0-name': 'Zakázaná osoba'
    };
    for (const [key, value] of Object.entries(choices)) app.setBlankHandoverField(key, value);
    const blank = printedProtocol(true);
    expect(blank.querySelector('.property-text')?.textContent).toBe('Předvyplněný popis šablony');
    expect(blank.querySelector('.property-address-value')?.textContent).toContain('Praha 110 00');
    expect(blank.querySelector('.meter-table')?.textContent).not.toContain('Elektřina T1');
    expect(blank.querySelector('.meter-table')?.textContent).not.toContain('Plyn');
    expect([...blank.querySelectorAll('.section')].find(element => element.querySelector('.section-title')?.textContent === 'STAVY MĚŘIČŮ')?.querySelector('.meter-confirmation')).toBeNull();
    expect([...blank.querySelectorAll('.section-title')].map(heading => heading.textContent)).not.toContain('SKLEP');
    expect(blank.body.textContent).not.toContain('V NEMOVITOSTI ZŮSTÁVÁ');
    expect(blank.body.textContent).not.toContain('Zakázaná osoba');
    expect(blank.body.textContent).not.toContain('Anna Nováková');
  });

  it('persists blank-template settings independently in XML and resets them when importing older data', () => {
    app.setBlankHandoverField('propertyDescription', 'Samostatná šablona.');
    app.setBlankHandoverField('leaseReturnSectionVisible', 'ANO');
    const xml = app.buildXmlString();
    app.resetBlankHandoverSettings();
    expect(app.blankHandoverValues()).toEqual({});
    app.applyXmlPayload(xml);
    expect(app.blankHandoverValues()['propertyDescription']).toBe('Samostatná šablona.');
    expect(printedProtocol(true).querySelector('[data-return-section=finance]')).not.toBeNull();
    app.openPropertyFormForRecord(0);
    expect(printedProtocol().querySelector('.property-text')?.textContent).not.toContain('Samostatná šablona.');
    app.applyXmlPayload('<remax-form><payload>{}</payload></remax-form>');
    expect(app.blankHandoverValues()).toEqual({});
    expect(printedProtocol(true).querySelectorAll('[data-return-section]')).toHaveLength(0);
  });
});
