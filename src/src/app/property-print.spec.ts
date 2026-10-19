import { provideHttpClient } from '@angular/common/http';
import { WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './app';

interface PrintHarness {
  newPropertyDraft: WritableSignal<{
    propertyType: string;
    tabValues: Record<string, Record<string, string>>;
  }>;
  generateCurrentPropertyBuyerInfo(): void;
  generateCurrentPropertyBrokerInfo(): void;
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

  it.each(['Dům', 'Rodinný dům', 'Garáž'])('prints the selected outdoor socket for %s in both reports', type => {
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
    expect(buyerHtml.includes('Stoupačky')).toBe(type === 'Garáž');

    app.generateCurrentPropertyBrokerInfo();
    const brokerHtml = write.mock.calls[1][0] as string;
    expect(brokerHtml).toContain('Venkovní zásuvka</div><div class="info-value"><span class="opt on">☑ ANO');
    expect(brokerHtml).toContain('Venkovní ventil na vodu</div><div class="info-value"><span class="opt on">☑ ANO');
    expect(brokerHtml.includes('Stoupačky')).toBe(type === 'Garáž');
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
    expect(write.mock.calls[1][0]).toContain('<span class="opt on">☑ Černá stavba</span>');
    expect(write.mock.calls[1][0]).toContain('Přístavba bez povolení');
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
    for (const [html] of write.mock.calls) {
      expect(html).not.toContain('Informace k černé stavbě');
      expect(html).not.toContain('Dřívější poznámka');
    }
    expect(app.newPropertyDraft().tabValues['pravni-vady']['Informace k černé stavbě']).toBe('Dřívější poznámka');
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
    expect(write.mock.calls[0][0]).toContain('Bankovní zástavy, Černá stavba');
    expect(write.mock.calls[1][0]).toContain('<span class="opt on">☑ Černá stavba</span>');
  });
});
