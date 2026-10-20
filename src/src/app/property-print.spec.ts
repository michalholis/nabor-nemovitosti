import { provideHttpClient } from '@angular/common/http';
import { WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './app';

interface PrintHarness {
  newPropertyDraft: WritableSignal<{
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
  shouldShowProstoryGeneralFields(): boolean;
  visiblePropertySectionTabs(): Array<{ key: string }>;
  dispoziceUnits(): string[];
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

  afterEach(() => { vi.restoreAllMocks(); TestBed.resetTestingModule(); });

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
    expect(contacts.map(contact => contact.querySelector('h3')?.textContent)).toEqual(['Jan <Novák>', 'Eva Svobodová']);
    expect(contacts.map(contact => [...contact.querySelectorAll('.info-label')].map(label => label.textContent))).toEqual([
      ['Telefon', 'E-mail'], ['Telefon', 'E-mail']
    ]);
    expect(contacts.map(contact => [...contact.querySelectorAll('.info-value')].map(value => value.textContent))).toEqual([
      ['+420 777 111 222', 'jan@example.cz'], ['+420 777 333 444', 'eva@example.cz']
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
});
