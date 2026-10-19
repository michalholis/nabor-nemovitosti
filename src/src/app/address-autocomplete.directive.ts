import { DestroyRef, Directive, ElementRef, HostListener, OnInit, Renderer2, ViewContainerRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgModel } from '@angular/forms';
import { Subject, catchError, map, of, switchMap, timer } from 'rxjs';
import { AddressSearchService, AddressSuggestion } from './address-search.service';
import { AddressSuggestions } from './address-suggestions';

let nextAddressId = 0;

@Directive({ selector: 'input[appAddressAutocomplete],textarea[appAddressAutocomplete]' })
export class AddressAutocompleteDirective implements OnInit {
  private readonly model = inject(NgModel, { self: true });
  private readonly element = inject<ElementRef<HTMLInputElement | HTMLTextAreaElement>>(ElementRef).nativeElement;
  private readonly renderer = inject(Renderer2);
  private readonly destroyRef = inject(DestroyRef);
  private readonly search = inject(AddressSearchService);
  private readonly panelRef = inject(ViewContainerRef).createComponent(AddressSuggestions);
  private readonly panel = this.panelRef.instance;
  private readonly queries = new Subject<string>();
  private focused = false;
  private selecting = false;

  ngOnInit(): void {
    this.panel.listId = `address-suggestions-${++nextAddressId}`;
    this.renderer.setAttribute(this.element, 'autocomplete', 'off');
    this.renderer.setAttribute(this.element, 'role', 'combobox');
    this.renderer.setAttribute(this.element, 'aria-autocomplete', 'list');
    this.renderer.setAttribute(this.element, 'aria-controls', this.panel.listId);
    this.setOpen(false);
    this.panel.choose.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(address => this.select(address));
    this.model.valueChanges?.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(value => {
      if (this.selecting) return;
      this.panel.selected.set(false);
      this.queue(this.focused ? String(value || '') : '');
    });
    this.queries.pipe(
      switchMap(query => query.length < 3 ? of({ results: [] as AddressSuggestion[], error: false }) : timer(450).pipe(
        switchMap(() => this.search.search(query)),
        map(results => ({ results, error: false })),
        catchError(() => of({ results: [] as AddressSuggestion[], error: true }))
      )),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(({ results, error }) => {
      this.panel.loading.set(false);
      this.panel.results.set(results);
      this.panel.message.set(error ? 'Adresní služba není dostupná. Zkuste to znovu; adresu můžete zadat i ručně.'
        : results.length ? '' : 'Adresa nenalezena. Doplňte ulici, číslo domu nebo obec.');
      this.setOpen(this.focused && this.element.value.trim().length >= 3 && !this.panel.selected());
    });
  }

  @HostListener('focus') onFocus(): void {
    this.focused = true;
    if (!this.panel.selected()) this.queue(this.element.value);
  }

  @HostListener('blur') onBlur(): void {
    this.focused = false;
    this.queries.next('');
    this.setOpen(false);
  }

  @HostListener('keydown', ['$event']) onKeydown(rawEvent: Event): void {
    const event = rawEvent as KeyboardEvent;
    if (event.key === 'Escape') {
      this.queries.next('');
      this.setOpen(false);
      return;
    }
    if (!this.panel.open()) return;
    const results = this.panel.results();
    if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && results.length) {
      event.preventDefault();
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      const index = this.panel.active() < 0 ? (direction === 1 ? 0 : results.length - 1)
        : (this.panel.active() + direction + results.length) % results.length;
      this.panel.active.set(index);
      this.renderer.setAttribute(this.element, 'aria-activedescendant', `${this.panel.listId}-${index}`);
      this.element.ownerDocument.getElementById(`${this.panel.listId}-${index}`)?.scrollIntoView?.({ block: 'nearest' });
    } else if (event.key === 'Enter' && this.panel.active() >= 0) {
      event.preventDefault();
      this.select(results[this.panel.active()]);
    }
  }

  private queue(value: string): void {
    const query = value.trim();
    this.panel.results.set([]);
    this.panel.active.set(-1);
    this.renderer.removeAttribute(this.element, 'aria-activedescendant');
    this.panel.message.set('');
    this.panel.loading.set(query.length >= 3);
    this.setOpen(this.focused && query.length >= 3);
    this.queries.next(query);
  }

  private select(address: AddressSuggestion): void {
    this.queries.next('');
    this.selecting = true;
    this.model.control.setValue(address.label);
    this.model.control.markAsDirty();
    this.selecting = false;
    this.panel.selected.set(true);
    this.setOpen(false);
    if (this.element.tagName === 'TEXTAREA') {
      this.renderer.setStyle(this.element, 'height', 'auto');
      this.renderer.setStyle(this.element, 'height', `${this.element.scrollHeight}px`);
    }
  }

  private setOpen(open: boolean): void {
    this.panel.open.set(open);
    this.renderer.setAttribute(this.element, 'aria-expanded', String(open));
    if (!open) this.renderer.removeAttribute(this.element, 'aria-activedescendant');
  }
}
