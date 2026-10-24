import { Component, input, output } from '@angular/core';
import { HandoverReturnFields } from './handover-return-fields';
import { CustomOptionAppearance } from './custom-option-appearance';

@Component({
  selector: 'app-blank-handover-editor',
  imports: [HandoverReturnFields, CustomOptionAppearance],
  template: `
    <div class="head"><h3>Prázdný předávací protokol – nastavení</h3><button type="button" (click)="closeRequested.emit()">Zavřít</button></div>
    <p>Samostatná šablona pro vyplnění na místě. Údaje z nemovitostí se sem nepřenášejí. Předávající, přebírající a jejich podpisová jména zůstanou v tisku vždy prázdní.</p>
    <fieldset><legend>Údaje, které chcete předem vyplnit</legend>
      @for (field of basicFields; track field.key) {
        <div class="field"><label [for]="'blank-handover-' + field.key">{{ field.label }}</label>
          @if (field.multiline) {
            <textarea rows="3" [id]="'blank-handover-' + field.key" [value]="values()[field.key] || ''" (input)="set(field.key, $any($event.target).value)"></textarea>
          } @else {
            <input type="text" [id]="'blank-handover-' + field.key" [value]="values()[field.key] || ''" (input)="set(field.key, $any($event.target).value)" />
          }
        </div>
      }
    </fieldset>
    <fieldset><legend><label><input type="checkbox" [checked]="visible('metersSectionVisible')" (change)="check('metersSectionVisible', $any($event.target).checked)" /> Stavy měřičů</label></legend>
      @if (visible('metersSectionVisible')) {
        @for (meter of meters; track meter.visible) {
          <label class="check"><input type="checkbox" [checked]="visible(meter.visible)" (change)="check(meter.visible, $any($event.target).checked)" /> {{ meter.label }}</label>
          @if (visible(meter.visible)) {
            <div class="pair">
              <input type="text" [attr.aria-label]="meter.label + ' – číslo měřiče'" placeholder="Číslo měřiče (nepovinné)" [value]="values()[meter.number] || ''" (input)="set(meter.number, $any($event.target).value)" />
              <input type="text" [attr.aria-label]="meter.label + ' – stav'" placeholder="Stav (nepovinné)" [value]="values()[meter.state] || ''" (input)="set(meter.state, $any($event.target).value)" />
            </div>
          }
        }
        <div class="field"><label for="blank-custom-meter-label">Název jiného měřiče</label><input id="blank-custom-meter-label" type="text" [value]="values()['customMeterLabel'] || ''" (input)="set('customMeterLabel', $any($event.target).value)" /></div>
      }
    </fieldset>
    <fieldset><legend><label><input type="checkbox" [checked]="visible('keysSectionVisible')" (change)="check('keysSectionVisible', $any($event.target).checked)" /> Klíče</label></legend>
      @if (visible('keysSectionVisible')) {
        @for (key of keys; track key.visible) {
          <label class="check"><input type="checkbox" [checked]="visible(key.visible)" (change)="check(key.visible, $any($event.target).checked)" /> {{ key.label }}</label>
          @if (visible(key.visible)) { <input type="text" [attr.aria-label]="key.label + ' – počet'" [value]="values()[key.field] || ''" (input)="set(key.field, $any($event.target).value)" placeholder="Počet ponechte prázdný pro ruční vyplnění" /> }
        }
        <div class="field"><label for="blank-keys-description">Popis klíčů</label><textarea id="blank-keys-description" rows="2" [value]="values()['keysDescription'] || ''" (input)="set('keysDescription', $any($event.target).value)"></textarea></div>
      }
    </fieldset>
    <fieldset><legend>Potvrzovací texty</legend>
      <label class="check"><input type="checkbox" [checked]="visible('buyerObligationVisible')" (change)="check('buyerObligationVisible', $any($event.target).checked)" /> Text k přepisu energií</label>
      <textarea aria-label="Text k přepisu energií v prázdném protokolu" rows="3" [value]="values()['buyerObligationText'] || ''" (input)="set('buyerObligationText', $any($event.target).value)"></textarea>
    </fieldset>
    <fieldset><legend><label><input type="checkbox" [checked]="values()['cellarVisible'] === 'ANO'" (change)="check('cellarVisible', $any($event.target).checked)" /> SKLEP</label></legend>
      @if (values()['cellarVisible'] === 'ANO') {
        <div class="field"><label for="blank-cellar">Označení sklepu</label><input id="blank-cellar" type="text" [value]="values()['cellar'] || ''" (input)="set('cellar', $any($event.target).value)" /></div>
        <div class="field"><label for="blank-cellar-remains">Ve sklepě zůstává</label><input id="blank-cellar-remains" type="text" [value]="values()['cellarRemains'] || ''" (input)="set('cellarRemains', $any($event.target).value)" /></div>
      }
    </fieldset>
    <app-handover-return-fields [values]="values()" (fieldChanged)="fieldChanged.emit($event)" />
    <fieldset><legend><label><input type="checkbox" [checked]="visible('remainsSectionVisible')" (change)="check('remainsSectionVisible', $any($event.target).checked)" /> V NEMOVITOSTI ZŮSTÁVÁ</label></legend>
      @if (visible('remainsSectionVisible')) {
        <textarea aria-label="Co zůstává v nemovitosti – prázdný protokol" rows="3" [value]="values()['remainsInProperty'] || ''" (input)="set('remainsInProperty', $any($event.target).value)"></textarea>
      }
    </fieldset>
    @for (group of optionalGroups; track group.visible) {
      <fieldset><legend><label><input type="checkbox" [checked]="values()[group.visible] === 'ANO'" (change)="check(group.visible, $any($event.target).checked)" /> {{ group.label }}</label></legend>
        @if (values()[group.visible] === 'ANO') {
          @for (field of group.fields; track field.key) {
            <div class="field"><label [for]="'blank-' + field.key">{{ field.label }}</label><input type="text" [id]="'blank-' + field.key" [value]="values()[field.key] || ''" (input)="set(field.key, $any($event.target).value)" /></div>
          }
        }
      </fieldset>
    }
    <div class="actions"><button type="button" (click)="resetRequested.emit()">Vymazat nastavení</button><button type="button" (click)="saveRequested.emit()">Uložit nastavení</button><button type="button" class="primary" (click)="printRequested.emit()">Vytisknout prázdný předávací protokol</button></div>
    @if (saved()) { <p role="status">Nastavení prázdného protokolu je uloženo.</p> }
  `,
  styles: [`
    :host { display:block; margin-top:1rem; padding:1rem; border:1px solid #d6e2ef; border-radius:12px; color:#26384a; }
    .head, .actions, .check, legend label { display:flex; gap:.6rem; align-items:center; }
    .head { justify-content:space-between; } .head h3 { margin:0; }
    p { font-size:.8rem; line-height:1.45; }
    fieldset { min-width:0; border:1px solid #d6e2ef; border-radius:8px; padding:.8rem; margin:.8rem 0; }
    legend, .field label { font-size:.8rem; font-weight:700; }
    .field { display:grid; gap:.4rem; margin:.7rem 0; }
    .check { margin:.6rem 0; font-size:.8rem; }
    .pair { display:grid; grid-template-columns:1fr 1fr; gap:.6rem; }
    input[type=text], textarea, select { width:100%; box-sizing:border-box; padding:.6rem; border:1px solid #cbd5e1; border-radius:8px; background:#fff; color:#26384a; font:inherit; font-size:.8rem; }
    textarea { resize:vertical; margin-top:.4rem; } .actions { flex-wrap:wrap; margin-top:1rem; }
    button { padding:.65rem .9rem; border:1px solid #cbd5e1; border-radius:8px; background:#fff; color:#183751; cursor:pointer; }
    .primary { background:#135ca3; color:#fff; }
    @media(max-width:600px) { .pair { grid-template-columns:1fr; } }
  `]
})
export class BlankHandoverEditor {
  readonly values = input.required<Record<string, string>>();
  readonly saved = input(false);
  readonly fieldChanged = output<{ field: string; value: string }>();
  readonly printRequested = output<void>();
  readonly saveRequested = output<void>();
  readonly resetRequested = output<void>();
  readonly closeRequested = output<void>();
  protected readonly basicFields = [
    { key: 'propertyDescription', label: 'Popis / typ nemovitosti (nepovinné)', multiline: true },
    { key: 'address', label: 'Adresa nemovitosti (nepovinné)', multiline: false },
    { key: 'city', label: 'Místo podpisu (nepovinné)', multiline: false },
    { key: 'date', label: 'Datum předání (nepovinné)', multiline: false }
  ];
  protected readonly meters = [
    { visible: 'electricMeterVisible', label: 'Elektřina', number: 'electricMeterNumber', state: 'electricMeterState' },
    { visible: 'electricT1MeterVisible', label: 'Elektřina T1', number: 'electricT1MeterNumber', state: 'electricT1MeterState' },
    { visible: 'electricT2MeterVisible', label: 'Elektřina T2', number: 'electricT2MeterNumber', state: 'electricT2MeterState' },
    { visible: 'hotWaterMeterVisible', label: 'Teplá voda', number: 'hotWaterMeterNumber', state: 'hotWaterMeterState' },
    { visible: 'coldWaterMeterVisible', label: 'Studená voda', number: 'coldWaterMeterNumber', state: 'coldWaterMeterState' },
    { visible: 'gasMeterVisible', label: 'Plyn', number: 'gasMeterNumber', state: 'gasMeterState' },
    { visible: 'customMeterVisible', label: 'Jiný měřič', number: 'customMeterNumber', state: 'customMeterState' }
  ];
  protected readonly keys = [
    { visible: 'keysCountVisible', field: 'keysCount', label: 'Klíče celkem' },
    { visible: 'chipsCountVisible', field: 'chipsCount', label: 'Přístupové čipy' },
    { visible: 'keyCardsCountVisible', field: 'keyCardsCount', label: 'Výrobní karty klíčů' }
  ];
  protected readonly optionalGroups = [
    { visible: 'doorbellVisible', label: 'SCHRÁNKA A ZVONEK', fields: [{ key: 'mailbox', label: 'Schránka' }, { key: 'doorbell', label: 'Zvonek' }, { key: 'doorbellLabel', label: 'Označení zvonku' }] },
    { visible: 'managerVisible', label: 'SPRÁVCE', fields: [{ key: 'managerName', label: 'Jméno správce' }, { key: 'managerEmail', label: 'E-mail správce' }, { key: 'managerPhone', label: 'Telefon správce' }] }
  ];
  protected visible(field: string): boolean { return this.values()[field] !== 'NE'; }
  protected set(field: string, value: string): void { this.fieldChanged.emit({ field, value }); }
  protected check(field: string, checked: boolean): void { this.set(field, checked ? 'ANO' : 'NE'); }
}
