import { provideHttpClient } from '@angular/common/http';
import { WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './app';

interface AmlHarness {
  newClientDraft: WritableSignal<{ fullName: string; titleText: string; hasTitle: boolean }>;
  buildXmlString(): string;
  applyXmlPayload(xml: string): void;
  renderAmlFormHtml(draft: unknown, brokerName: string): string;
}

describe('Client AML titles', () => {
  beforeEach(async () => {
    const initialization = App.prototype as unknown as { loadState(): Promise<void>; loadTodayNameday(): void; loadHighRiskCountries(): Promise<void> };
    vi.spyOn(initialization, 'loadState').mockResolvedValue(undefined);
    vi.spyOn(initialization, 'loadTodayNameday').mockImplementation(() => {});
    vi.spyOn(initialization, 'loadHighRiskCountries').mockResolvedValue(undefined);
    await TestBed.configureTestingModule({ imports: [App], providers: [provideHttpClient()] })
      .overrideComponent(App, { set: { template: '' } }).compileComponents();
  });
  afterEach(() => { vi.restoreAllMocks(); TestBed.resetTestingModule(); });

  it.each([
    { title: 'Mgr.', before: 'Mgr.', after: '', hasTitle: false },
    { title: 'doc. Ing.', before: 'doc. Ing.', after: '', hasTitle: false },
    { title: 'Ph.D.', before: '', after: 'Ph.D.', hasTitle: false },
    { title: 'DiS.', before: '', after: 'DiS.', hasTitle: false },
    { title: 'MBA', before: '', after: 'MBA', hasTitle: false },
    { title: 'Ing., Ph.D., MBA', before: 'Ing.', after: 'Ph.D., MBA', hasTitle: false },
    { title: 'MUDr. Ph. D.', before: 'MUDr.', after: 'Ph. D.', hasTitle: false },
    { title: 'Bc.', before: 'Bc.', after: '', hasTitle: true },
    { title: '', before: '', after: '', hasTitle: true }
  ])('prints saved title "$title" in the appropriate AML fields even when the old title flag is $hasTitle', ({ title, before, after, hasTitle }) => {
    const app = TestBed.createComponent(App).componentInstance as unknown as AmlHarness;
    app.newClientDraft.update(draft => ({ ...draft, fullName: 'Jan Novák', titleText: title, hasTitle }));
    app.applyXmlPayload(app.buildXmlString());
    const doc = new DOMParser().parseFromString(app.renderAmlFormHtml(app.newClientDraft(), 'Makléř'), 'text/html');
    const answer = (label: string) => [...doc.querySelectorAll('.row')].find(row => row.querySelector('.label')?.textContent === label)?.querySelector('.value')?.textContent;
    expect(answer('Titul před jménem')).toBe(before);
    expect(answer('Titul za jménem')).toBe(after);
    expect(answer('Jméno (jména)')).toBe('Jan');
    expect(answer('Příjmení')).toBe('Novák');
    expect(app.newClientDraft().titleText).toBe(title);
  });
});
