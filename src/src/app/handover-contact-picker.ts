import { Component, ElementRef, HostListener, computed, inject, input, output, signal, viewChild } from '@angular/core';

export interface HandoverContactOption {
  id: string;
  name: string;
  pinned: boolean;
  selected: boolean;
}

@Component({
  selector: 'app-handover-contact-picker',
  template: `
    <button #trigger type="button" class="trigger" [attr.aria-label]="'Výběr klientů – ' + label()"
      aria-haspopup="listbox" [attr.aria-expanded]="opened()" [attr.aria-controls]="listId()" (click)="toggle()">
      <span [title]="selectedNames()">{{ selectedNames() || 'Vyberte klienta…' }}</span><span aria-hidden="true">▾</span>
    </button>
    @if (opened()) {
      <div class="dropdown" (keydown.escape)="close(); $event.stopPropagation()">
        <input #search type="search" [attr.aria-label]="'Hledat podle jména – ' + label()" placeholder="Hledat podle jména"
          [value]="query()" (input)="query.set($any($event.target).value)" />
        <div class="options" [id]="listId()" role="listbox" aria-multiselectable="true" [attr.aria-label]="label()">
          @for (contact of filtered(); track contact.id) {
            <button type="button" role="option" [attr.aria-selected]="contact.selected" [class.selected]="contact.selected"
              (click)="contactToggled.emit(contact.id)">
              <span class="check" aria-hidden="true">{{ contact.selected ? '✓' : '' }}</span>
              @if (contact.pinned) { <span class="pin" title="Propojený s nemovitostí" aria-label="Propojený s nemovitostí">📌</span> }
              <span>{{ contact.name }}</span>
            </button>
          } @empty { <div class="empty" role="status">Žádný klient neodpovídá hledání.</div> }
        </div>
      </div>
    }
  `,
  styles: [`
    :host { display:block; min-width:0; }
    button, input { font:inherit; font-size:.78rem; color:#183751; }
    .trigger { display:flex; justify-content:space-between; gap:8px; width:100%; padding:9px 12px;
      border:1px solid #cbd5e1; border-radius:9px; background:#fff; cursor:pointer; text-align:left; }
    .trigger span:first-child { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .dropdown { margin-top:3px; border:1px solid #cbd5e1; border-radius:9px; background:#fff; padding:6px; }
    input { width:100%; box-sizing:border-box; padding:8px; border:1px solid #cbd5e1; border-radius:6px; }
    .options { max-height:250px; overflow-y:auto; margin-top:4px; }
    .options button { display:flex; align-items:center; gap:6px; width:100%; padding:8px;
      border:0; background:#fff; text-align:left; cursor:pointer; overflow-wrap:anywhere; }
    .options button:hover, .options button:focus-visible, .options button.selected { background:#edf5fc; }
    .check { flex:0 0 16px; color:#147a6d; font-weight:700; }
    .pin { flex:none; }
    .empty { padding:10px; color:#6b7785; font-size:.75rem; }
  `]
})
export class HandoverContactPicker {
  readonly contacts = input.required<HandoverContactOption[]>();
  readonly label = input.required<string>();
  readonly side = input.required<string>();
  readonly contactToggled = output<string>();
  protected readonly opened = signal(false);
  protected readonly query = signal('');
  protected readonly listId = computed(() => `handover-contacts-${this.side()}`);
  protected readonly selectedNames = computed(() => this.contacts().filter(contact => contact.selected).map(contact => contact.name).join(', '));
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly search = viewChild<ElementRef<HTMLInputElement>>('search');
  private readonly trigger = viewChild<ElementRef<HTMLButtonElement>>('trigger');
  protected readonly filtered = computed(() => {
    const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('cs').trim();
    const query = normalize(this.query());
    return this.contacts().filter(contact => normalize(contact.name).includes(query))
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || a.name.localeCompare(b.name, 'cs'));
  });

  protected toggle(): void {
    this.query.set('');
    this.opened.update(open => !open);
    if (this.opened()) setTimeout(() => this.search()?.nativeElement.focus());
  }

  protected close(): void {
    this.opened.set(false);
    this.trigger()?.nativeElement.focus();
  }

  @HostListener('document:click', ['$event'])
  protected closeOutside(event: MouseEvent): void {
    if (!this.host.nativeElement.contains(event.target as Node)) this.opened.set(false);
  }
}
