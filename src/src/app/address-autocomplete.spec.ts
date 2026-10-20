import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { Subject, of, throwError } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AddressAutocompleteDirective } from './address-autocomplete.directive';
import { AddressSearchService, AddressSuggestion, addressSuggestions } from './address-search.service';

@Component({
  imports: [FormsModule, AddressAutocompleteDirective],
  template: '<input appAddressAutocomplete [(ngModel)]="value" /><textarea appAddressAutocomplete [(ngModel)]="other"></textarea>'
})
class AddressTestHost {
  value = '';
  other = '';
}

const address: AddressSuggestion = {
  label: 'Řadová 1337, Vratimov 739 32 (Moravskoslezský kraj)',
  street: 'Řadová 1337', city: 'Vratimov', postcode: '739 32', region: 'Moravskoslezský kraj'
};

async function setup(search = vi.fn(() => of([address]))) {
  await TestBed.configureTestingModule({
    imports: [AddressTestHost], providers: [{ provide: AddressSearchService, useValue: { search } }]
  }).compileComponents();
  const fixture = TestBed.createComponent(AddressTestHost);
  fixture.detectChanges();
  await fixture.whenStable();
  vi.useFakeTimers();
  return { fixture, search, input: fixture.nativeElement.querySelector('input') as HTMLInputElement };
}

function type(input: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  input.dispatchEvent(new Event('focus'));
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

afterEach(() => { vi.useRealTimers(); TestBed.resetTestingModule(); });

describe('Address autocomplete', () => {
  it('formats complete addresses, excludes street-only matches and removes duplicates', () => {
    const properties = { street: 'Řadová', housenumber: '1337', city: 'Vratimov', postcode: '73932', state: 'Moravskoslezský kraj', countrycode: 'CZ' };
    expect(addressSuggestions({ features: [
      { properties }, { properties }, { properties: { street: 'Řadová' } }
    ] })).toEqual([address]);
  });

  it('selects a result into the existing form model and clears the selection status on editing', async () => {
    const { fixture, input, search } = await setup();
    type(input, 'Řadová 1337');
    await vi.advanceTimersByTimeAsync(500);
    fixture.detectChanges();
    expect(search).toHaveBeenCalledWith('Řadová 1337');
    (fixture.nativeElement.querySelector('[role="option"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.componentInstance.value).toBe(address.label);
    expect(input.value).toBe(address.label);
    expect(fixture.nativeElement.textContent).toContain('Adresa vybrána');
    type(input, 'Jiná 12');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Adresa vybrána');
  });

  it('supports selecting addresses in textareas using the keyboard', async () => {
    const { fixture } = await setup();
    const textarea = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    type(textarea, 'Řadová 1337');
    await vi.advanceTimersByTimeAsync(500);
    fixture.detectChanges();
    textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(fixture.componentInstance.other).toBe(address.label);
    expect(textarea.getAttribute('aria-expanded')).toBe('false');
  });

  it('cancels an earlier response when the query changes', async () => {
    const first = new Subject<AddressSuggestion[]>();
    const search = vi.fn().mockReturnValueOnce(first).mockReturnValueOnce(of([]));
    const { fixture, input } = await setup(search);
    type(input, 'Řadová');
    await vi.advanceTimersByTimeAsync(500);
    type(input, 'Jiná 999');
    first.next([address]);
    await vi.advanceTimersByTimeAsync(500);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="option"]')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Adresa nenalezena');
  });

  it('keeps the typed address when the service fails', async () => {
    const { fixture, input } = await setup(vi.fn(() => throwError(() => new Error('offline'))));
    type(input, 'Řadová 1337');
    await vi.advanceTimersByTimeAsync(500);
    fixture.detectChanges();
    expect(fixture.componentInstance.value).toBe('Řadová 1337');
    expect(fixture.nativeElement.textContent).toContain('není dostupná');
  });

  it('accepts the unique Říkovice 116 result with Enter without first using the arrows', async () => {
    const rikovice: AddressSuggestion = {
      label: 'Říkovice 116, Říkovice 751 18 (Olomoucký kraj)',
      street: 'Říkovice 116', city: 'Říkovice', postcode: '751 18', region: 'Olomoucký kraj'
    };
    const { fixture, input } = await setup(vi.fn(() => of([rikovice])));
    type(input, 'Říkovice 116');
    await vi.advanceTimersByTimeAsync(500);
    fixture.detectChanges();
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    fixture.detectChanges();
    expect(input.value).toBe(rikovice.label);
    expect(fixture.componentInstance.value).toBe(rikovice.label);
    expect(fixture.nativeElement.textContent).toContain('Adresa vybrána');
  });

  it('requires an explicit selection when more than one address matches', async () => {
    const { fixture, input } = await setup(vi.fn(() => of([address, { ...address, label: 'Jiná adresa 1337' }])));
    type(input, 'Řadová 1337');
    await vi.advanceTimersByTimeAsync(500);
    fixture.detectChanges();
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    fixture.detectChanges();
    expect(fixture.componentInstance.value).toBe('Řadová 1337');
    expect(input.getAttribute('aria-expanded')).toBe('true');
    expect(fixture.nativeElement.textContent).not.toContain('Adresa vybrána');
  });

  it('retries a failed lookup using the button without retyping the address', async () => {
    const search = vi.fn().mockReturnValueOnce(throwError(() => new Error('offline'))).mockReturnValueOnce(of([address]));
    const { fixture, input } = await setup(search);
    type(input, 'Řadová 1337');
    await vi.advanceTimersByTimeAsync(500);
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.retry') as HTMLButtonElement).click();
    await vi.advanceTimersByTimeAsync(500);
    fixture.detectChanges();
    expect(search).toHaveBeenCalledTimes(2);
    expect(fixture.nativeElement.querySelector('[role="option"]')?.textContent).toContain('Řadová 1337');
  });
});
