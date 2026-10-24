import { TestBed } from '@angular/core/testing';
import { afterEach, expect, it, vi } from 'vitest';
import { HandoverContactPicker } from './handover-contact-picker';

afterEach(() => TestBed.resetTestingModule());

it('puts pinned contacts first, searches names without accents and emits the chosen contact', async () => {
  await TestBed.configureTestingModule({ imports: [HandoverContactPicker] }).compileComponents();
  const fixture = TestBed.createComponent(HandoverContactPicker);
  fixture.componentRef.setInput('label', 'Předávající');
  fixture.componentRef.setInput('side', 'predavajici');
  fixture.componentRef.setInput('contacts', [
    { id: 'a', name: 'Anna', pinned: false, selected: false },
    { id: 'z', name: 'Zdeňka', pinned: true, selected: true },
    { id: 'b', name: 'Boris', pinned: true, selected: false }
  ]);
  const chosen = vi.fn();
  fixture.componentInstance.contactToggled.subscribe(chosen);
  fixture.detectChanges();
  const host = fixture.nativeElement as HTMLElement;
  host.querySelector<HTMLButtonElement>('.trigger')!.click();
  fixture.detectChanges();
  const options = [...host.querySelectorAll<HTMLElement>('[role=option]')];
  expect(options.map(option => option.querySelector('span:last-child')?.textContent)).toEqual(['Boris', 'Zdeňka', 'Anna']);
  expect(options[1].getAttribute('aria-selected')).toBe('true');
  expect(options.map(option => !!option.querySelector('.pin'))).toEqual([true, true, false]);
  const search = host.querySelector<HTMLInputElement>('input')!;
  search.value = 'zdenka';
  search.dispatchEvent(new Event('input'));
  fixture.detectChanges();
  expect(host.querySelectorAll('[role=option]')).toHaveLength(1);
  host.querySelector<HTMLButtonElement>('[role=option]')!.click();
  expect(chosen).toHaveBeenCalledWith('z');
  search.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  fixture.detectChanges();
  expect(host.querySelector('[role=listbox]')).toBeNull();
});
