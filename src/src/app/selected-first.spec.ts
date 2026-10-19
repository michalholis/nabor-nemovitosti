import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it } from 'vitest';
import { SelectedFirstPipe } from './selected-first.pipe';

@Component({
  imports: [CommonModule, SelectedFirstPipe],
  template: `
    <section class="property">
      <button *ngFor="let option of options | selectedFirst: selected; trackBy: trackValue"
        [class.active]="selected.split('|').includes(option)" (click)="toggle(option)">{{ option }}</button>
    </section>
    <section class="client">
      <button *ngFor="let option of options | selectedFirst: clientSelected; trackBy: trackValue"
        (click)="toggleClient(option)">{{ option }}</button>
    </section>
  `
})
class SelectionHost {
  readonly options = ['Broskve', 'Jabloně', 'Hrušně', 'Švestky'];
  selected = '';
  clientSelected: string[] = ['Hrušně'];
  trackValue(_index: number, value: string): string { return value; }
  toggleClient(option: string): void {
    this.clientSelected = this.clientSelected.includes(option)
      ? this.clientSelected.filter(value => value !== option) : [...this.clientSelected, option];
  }
  toggle(option: string): void {
    const values = this.selected.split('|').filter(Boolean);
    this.selected = (values.includes(option) ? values.filter(value => value !== option) : [...values, option]).join('|');
  }
}

afterEach(() => TestBed.resetTestingModule());

async function setup(selected = '') {
  await TestBed.configureTestingModule({ imports: [SelectionHost] }).compileComponents();
  const fixture = TestBed.createComponent(SelectionHost);
  fixture.componentInstance.selected = selected;
  fixture.detectChanges();
  const labels = (section: string): string[] => [...fixture.nativeElement.querySelectorAll(`${section} button`)]
    .map((button: unknown) => (button as HTMLButtonElement).textContent!.trim());
  const click = (section: string, label: string): void => {
    const buttons = [...fixture.nativeElement.querySelectorAll(`${section} button`)] as HTMLButtonElement[];
    buttons.find(button => button.textContent!.trim() === label)!.click();
    fixture.detectChanges();
  };
  return { fixture, labels, click };
}

describe('Selected options first', () => {
  it('moves selected buttons before the others and restores their default position when deselected', async () => {
    const { fixture, labels, click } = await setup();
    const originalButtons = [...fixture.nativeElement.querySelectorAll('.property button')];
    click('.property', 'Švestky');
    click('.property', 'Jabloně');
    expect(labels('.property')).toEqual(['Jabloně', 'Švestky', 'Broskve', 'Hrušně']);
    click('.property', 'Švestky');
    expect(labels('.property')).toEqual(['Jabloně', 'Broskve', 'Hrušně', 'Švestky']);
    click('.property', 'Jabloně');
    expect(labels('.property')).toEqual(fixture.componentInstance.options);
    expect([...fixture.nativeElement.querySelectorAll('.property button')]).toEqual(originalButtons);
  });

  it('sorts saved selections immediately and keeps separate lists independent', async () => {
    const { fixture, labels, click } = await setup('Jabloně|Švestky');
    expect(labels('.property')).toEqual(['Jabloně', 'Švestky', 'Broskve', 'Hrušně']);
    expect(labels('.client')).toEqual(['Hrušně', 'Broskve', 'Jabloně', 'Švestky']);
    click('.client', 'Švestky');
    expect(labels('.client')).toEqual(['Hrušně', 'Švestky', 'Broskve', 'Jabloně']);
    expect(labels('.property')).toEqual(['Jabloně', 'Švestky', 'Broskve', 'Hrušně']);
    expect(fixture.componentInstance.options).toEqual(['Broskve', 'Jabloně', 'Hrušně', 'Švestky']);
  });
});
