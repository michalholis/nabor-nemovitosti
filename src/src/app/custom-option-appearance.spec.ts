import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, expect, it } from 'vitest';
import { CustomOptionAppearance } from './custom-option-appearance';

@Component({
  imports: [CustomOptionAppearance],
  template: `<button id="normal">Soukromí</button><button id="custom">dopsat vlastní možnost</button>
    <button id="short" class="active">Dopsat vlastní</button><select><option>Základní text</option><option id="own">Doplnit vlastní</option></select>`
})
class TestChoices {}

afterEach(() => TestBed.resetTestingModule());

it('marks custom choices for subtle styling without disabling them or changing ordinary choices', async () => {
  await TestBed.configureTestingModule({ imports: [TestChoices] }).compileComponents();
  const fixture = TestBed.createComponent(TestChoices);
  fixture.detectChanges();
  const host = fixture.nativeElement as HTMLElement;
  expect(host.querySelector('#normal')?.classList.contains('custom-option-choice')).toBe(false);
  for (const id of ['custom', 'short', 'own']) expect(host.querySelector('#' + id)?.classList.contains('custom-option-choice')).toBe(true);
  expect(host.querySelector('#short')?.classList.contains('active')).toBe(true);
  expect(host.querySelectorAll('[disabled]')).toHaveLength(0);
});
