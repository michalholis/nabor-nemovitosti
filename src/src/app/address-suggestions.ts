import { Component, EventEmitter, Output, signal } from '@angular/core';
import { AddressSuggestion } from './address-search.service';

@Component({
  selector: 'app-address-suggestions',
  template: `
    @if (open()) {
      <div class="suggestions" [id]="listId" role="listbox" aria-label="Nalezené adresy">
        @if (loading()) { <div class="message" role="status">Hledám skutečné adresy…</div> }
        @if (message()) { <div class="message" role="status">{{ message() }}</div> }
        @for (address of results(); track address.label; let i = $index) {
          <button type="button" role="option" [id]="listId + '-' + i"
            [attr.aria-selected]="active() === i" [class.highlight]="active() === i"
            (pointerdown)="$event.preventDefault()" (click)="choose.emit(address)">
            <strong>{{ address.street }}</strong>
            <span>{{ address.city || 'Obec neuvedena' }} · {{ address.postcode || 'PSČ neuvedeno' }}</span>
            <span>({{ address.region || 'Kraj neuveden' }})</span>
          </button>
        }
        <div class="source">Adresy: <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap</a> / Photon</div>
      </div>
    }
    @if (selected()) { <div class="selected" role="status">✓ Adresa vybrána z mapových dat</div> }
  `,
  styles: [`
    :host { display: block; position: relative; min-width: 0; }
    .suggestions { position: absolute; top: 2px; left: 0; right: 0; z-index: 1000;
      max-height: 320px; overflow-y: auto; background: white; border: 1px solid #cbd5e1;
      border-radius: 10px; box-shadow: 0 8px 24px #18375126; color: #183751; }
    button { display: flex; flex-direction: column; gap: 2px; width: 100%; text-align: left;
      padding: 9px 12px; border: 0; border-bottom: 1px solid #e8edf2; background: white;
      color: #183751; font: inherit; font-size: .76rem; cursor: pointer; }
    button:hover, button:focus-visible, button.highlight { background: #eaf3fc; outline: 2px solid #1976d2; outline-offset: -2px; }
    button span { font-size: .7rem; color: #526578; }
    .message, .source { padding: 8px 12px; font-size: .68rem; }
    .source { color: #526578; } a { color: #135ca3; }
    .selected { margin-top: 4px; font-size: .65rem; color: #0f6b53; }
  `]
})
export class AddressSuggestions {
  listId = '';
  readonly open = signal(false);
  readonly loading = signal(false);
  readonly message = signal('');
  readonly selected = signal(false);
  readonly results = signal<AddressSuggestion[]>([]);
  readonly active = signal(-1);
  @Output() readonly choose = new EventEmitter<AddressSuggestion>();
}
