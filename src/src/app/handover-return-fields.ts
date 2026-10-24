import { Component, input, output } from '@angular/core';
import { HANDOVER_RETURN_CONCLUSIONS, HANDOVER_RETURN_GROUPS, HandoverConclusion, HandoverReturnValues, handoverConclusionChecked, handoverReturnCellarEnabled, handoverReturnCheckChanges } from './handover-return';

@Component({
  selector: 'app-handover-return-fields',
  host: { '[class.handover-final-fields]': 'finalSectionsOnly()' },
  template: `
    @if (!finalSectionsOnly()) {
      <label class="section-toggle handover-section-switch"><input type="checkbox" [checked]="values()['leaseReturnSectionVisible'] === 'ANO'" (change)="check('leaseReturnSectionVisible', $any($event.target).checked)" /> STAV NEMOVITOSTI PŘI VRÁCENÍ NÁJMU</label>
      @if (values()['leaseReturnSectionVisible'] === 'ANO') {
        @for (group of mainGroups(); track group.key) {
          @if (group.key === 'finance') {
            <label class="section-toggle handover-section-switch finance-section-toggle"><input type="checkbox" [checked]="financeVisible()" (change)="set('returnFinanceVisible', $any($event.target).checked ? 'ANO' : 'NE')" /> {{ group.title }}</label>
          }
          @if (group.key !== 'finance' || financeVisible()) {
          <fieldset [class.condition-group-content]="group.key === 'condition'">
            @if (group.key !== 'condition' && group.key !== 'finance') { <legend>{{ group.title }}</legend> }
            @if (group.key === 'condition') {
              <fieldset class="property-return-condition"><legend>{{ group.intro }}</legend>
                @for (option of group.checks || []; track option.key) {
                  <label class="check-line"><input type="checkbox" [checked]="values()[option.key] === 'ANO'" (change)="check(option.key, $any($event.target).checked)" /> {{ option.label }}</label>
                }
                <div class="handover-writing-control">
                  <label class="field cellar-return-field"><span>V nemovitosti zůstává</span><textarea rows="2" [value]="values()['remainsInProperty'] || ''" (input)="set('remainsInProperty', $any($event.target).value)"></textarea></label>
                  <label class="writing-rows">Počet řádků k dopsání:<input type="number" min="1" max="10" [value]="values()['remainsInPropertyWritingRows'] || 1" (input)="set('remainsInPropertyWritingRows', $any($event.target).value)" /></label>
                </div>
              </fieldset>
            } @else {
              @if (group.intro) { <p>{{ group.intro }}</p> }
              @for (option of group.checks || []; track option.key) {
                <label class="check-line"><input type="checkbox" [checked]="values()[option.key] === 'ANO'" (change)="check(option.key, $any($event.target).checked)" /> {{ option.label }}</label>
              }
            }
            @if (group.key === 'condition') {
              <fieldset class="cellar-return-condition"><legend><label class="cellar-switch"><input type="checkbox" [checked]="cellarEnabled()" (change)="set('cellarReturnSectionVisible', $any($event.target).checked ? 'ANO' : 'NE')" /><span></span></label><span>Sklep je předáván</span></legend>
                @if (cellarEnabled()) {
                  <label class="field cellar-return-field"><span>Označení sklepu</span><input type="text" [value]="values()['cellar'] || ''" (input)="set('cellar', $any($event.target).value)" /></label>
                  @for (condition of cellarConditions; track condition.key) {
                    <label class="check-line"><input type="checkbox" [checked]="values()['cellar-section-' + condition.key] === 'ANO'" (change)="set('cellar-section-' + condition.key, $any($event.target).checked ? 'ANO' : 'NE')" /> {{ condition.label }}</label>
                  }
                  <div class="handover-writing-control">
                    <label class="field cellar-return-field"><span>Ve sklepě zůstává</span><textarea rows="2" [value]="values()['cellarRemains'] || ''" (input)="set('cellarRemains', $any($event.target).value)"></textarea></label>
                    <label class="writing-rows">Počet řádků k dopsání:<input type="number" min="1" max="10" [value]="values()['cellarRemainsWritingRows'] || 1" (input)="set('cellarRemainsWritingRows', $any($event.target).value)" /></label>
                  </div>
                }
              </fieldset>
            }
            @for (field of group.fields || []; track field.key) {
              <div class="field" [class.money-field]="field.money">
                @if (field.key === 'returnDepositAgreement') {
                  <label class="check-line"><input type="checkbox" [checked]="values()['returnDepositAgreementVisible'] !== 'NE'" (change)="check('returnDepositAgreementVisible', $any($event.target).checked)" /> {{ field.label }}</label>
                } @else {
                  <label [for]="'handover-' + field.key">{{ field.label }}{{ field.money ? ' (Kč)' : '' }}</label>
                }
                @if (field.key !== 'returnDepositAgreement' || values()['returnDepositAgreementVisible'] !== 'NE') {
                @if (field.money || field.lines === 1) {
                  <input type="text" [id]="'handover-' + field.key" [attr.inputmode]="field.money ? 'decimal' : 'text'" [value]="values()[field.key] || ''" (input)="set(field.key, $any($event.target).value)" />
                } @else {
                  <textarea [id]="'handover-' + field.key" [rows]="field.lines" [value]="values()[field.key] || ''" (input)="set(field.key, $any($event.target).value)"></textarea>
                }
                @if (!field.money && !field.inline) {
                  <label class="writing-rows" [for]="'handover-' + field.key + '-rows'">Počet řádků k dopsání:<input type="number" min="1" max="10" [id]="'handover-' + field.key + '-rows'" [value]="values()[field.key + 'WritingRows'] || field.boxes || 4" (input)="set(field.key + 'WritingRows', $any($event.target).value)" /></label>
                }
                }
              </div>
            }
            @if (group.note) { <p>{{ group.note }}</p> }
          </fieldset>
          }
        }
      }
    } @else {
      @for (group of finalGroups; track group.key) {
        <fieldset>
          <legend>{{ group.title }}</legend>
          @if (group.intro) { <p>{{ group.intro }}</p> }
          @for (option of group.checks || []; track option.key) {
            <label class="check-line"><input type="checkbox" [checked]="values()[option.key] === 'ANO'" (change)="check(option.key, $any($event.target).checked)" /> {{ option.label }}</label>
          }
          @for (field of group.fields || []; track field.key) {
            <div class="field" [class.money-field]="field.money">
              <label [for]="'handover-' + field.key">{{ field.label }}{{ field.money ? ' (Kč)' : '' }}</label>
              @if (field.money || field.lines === 1) {
                <input type="text" [id]="'handover-' + field.key" [attr.inputmode]="field.money ? 'decimal' : 'text'" [value]="values()[field.key] || ''" (input)="set(field.key, $any($event.target).value)" />
              } @else {
                <textarea [id]="'handover-' + field.key" [rows]="field.lines" [value]="values()[field.key] || ''" (input)="set(field.key, $any($event.target).value)"></textarea>
              }
            </div>
          }
          @if (group.note) { <p>{{ group.note }}</p> }
        </fieldset>
      }
      <fieldset><legend>Závěrečná prohlášení</legend>@for (conclusion of conclusions; track conclusion.key) { <label class="check-line"><input type="checkbox" [checked]="conclusionChecked(conclusion)" (change)="check(conclusion.key, $any($event.target).checked)" /> {{ conclusion.text }}</label> }</fieldset>
    }
  `,
  styles: [`
    :host { display:block; min-width:0; color:#26384a; }
    :host(.handover-final-fields) { display:contents; }
    :host(.handover-final-fields) > fieldset { margin:0; }
    .section-toggle, .check-line { display:flex; align-items:flex-start; gap:.5rem; margin:.6rem 0; line-height:1.45; }
    .section-toggle { align-items:center; }
    .section-toggle { font-size:.8rem; font-weight:800; }
    .section-toggle input { box-sizing:border-box; flex:none; height:1rem; margin:0; min-height:1rem; padding:0; width:1rem; }
    .section-toggle.handover-section-switch input[type=checkbox] { appearance:none; background:#c5ced7; border:0; border-radius:999px; cursor:pointer; height:1rem; position:relative; transition:background .15s; width:1.8rem; }
    .section-toggle.handover-section-switch input[type=checkbox]::before { background:#fff; border-radius:50%; content:''; height:.72rem; left:.14rem; position:absolute; top:.14rem; transition:transform .15s; width:.72rem; }
    .section-toggle.handover-section-switch input[type=checkbox]:checked { background:var(--client-accent,#25804d); }
    .section-toggle.handover-section-switch input[type=checkbox]:checked::before { transform:translateX(.8rem); }
    .check-line input { accent-color:color-mix(in srgb, var(--client-accent,#25804d) 52%, #fff); flex:none; margin-top:.2rem; }
    .section-body, fieldset { padding:.8rem; border:1px solid #d6e2ef; border-radius:8px; margin:.5rem 0 1rem; min-width:0; }
    legend, .field label, .section-body > label { font-size:.78rem; font-weight:700; }
    p, .check-line { font-size:.76rem; }
    p { line-height:1.45; } .hint { color:#61738a; }
    .field { display:grid; gap:.65rem; margin:.75rem 0; }
    .cellar-return-condition { border:1px solid #d6e2ef; border-radius:8px; margin:.75rem 0; padding:.6rem .8rem; }
    .condition-group-content { border:0; margin:0; padding:0; }
    .property-return-condition { border:1px solid #d6e2ef; border-radius:8px; margin:.75rem 0; padding:.6rem .8rem; }
    .property-return-condition legend { font-size:.78rem; font-weight:700; }
    .cellar-return-condition legend { align-items:center; display:flex; font-size:.78rem; font-weight:700; gap:.45rem; width:100%; }
    .cellar-return-field { color:#26384a; font-size:.76rem; margin:0; }
    .cellar-switch { cursor:pointer; display:inline-flex; margin:0; }
    .cellar-switch input { height:0; opacity:0; position:absolute; width:0; }
    .cellar-switch span { background:#c5ced7; border-radius:999px; height:1.1rem; position:relative; transition:background .15s; width:2rem; }
    .cellar-switch span::after { background:#fff; border-radius:50%; content:''; height:.8rem; left:.15rem; position:absolute; top:.15rem; transition:transform .15s; width:.8rem; }
    .cellar-switch input:checked + span { background:var(--client-accent,#25804d); }
    .cellar-switch input:checked + span::after { transform:translateX(.9rem); }
    .writing-rows input { appearance:textfield; background:transparent; border:0; box-sizing:border-box; color:#6b7b8c; font:inherit; height:1rem; line-height:1; min-height:0; padding:0; width:100%; }
    .finance-section-toggle { margin:.4rem 0 .6rem; }
    .money-field { align-items:center; grid-template-columns:max-content minmax(0, 1fr); }
    .money-field label { white-space:nowrap; }
    .section-body > textarea { margin-top:.4rem; }
    textarea, input[type=text] { box-sizing:border-box; width:100%; padding:.6rem; border:1px solid #cbd5e1; border-radius:8px; font:inherit; font-size:.78rem; background:#fff; color:#26384a; }
    textarea { resize:vertical; }
    @media(max-width:760px) { .money-field { grid-template-columns:1fr; } }
  `]
})
export class HandoverReturnFields {
  readonly values = input.required<HandoverReturnValues>();
  readonly finalSectionsOnly = input(false);
  readonly excludeEquipment = input(false);
  readonly fieldChanged = output<{ field: string; value: string }>();
  protected mainGroups() { return HANDOVER_RETURN_GROUPS.filter(group => group.key !== 'photos' && (!this.excludeEquipment() || group.key !== 'equipment')); }
  protected readonly finalGroups = HANDOVER_RETURN_GROUPS.filter(group => group.key === 'photos');
  protected readonly conclusions = HANDOVER_RETURN_CONCLUSIONS;
  protected readonly cellarConditions = [
    { key: 'cleared', label: 'Vyklizený, bez osobních věcí nájemce' },
    { key: 'clean', label: 'Uklizený a v čistém stavu' },
    { key: 'no-defects', label: 'Bez zjevných závad nad rámec běžného opotřebení' },
    { key: 'defects', label: 'Se závadami nebo poškozením uvedenými níže' },
    { key: 'items', label: 'S ponechaným vybavením nebo věcmi uvedenými níže' }
  ];

  protected set(field: string, value: string): void { this.fieldChanged.emit({ field, value }); }
  protected conclusionChecked(conclusion: HandoverConclusion): boolean {
    return handoverConclusionChecked(conclusion, this.values());
  }
  protected cellarEnabled(): boolean { return handoverReturnCellarEnabled(this.values()); }
  protected financeVisible(): boolean { return this.values()['returnFinanceVisible'] !== 'NE'; }
  protected check(field: string, checked: boolean): void {
    for (const [key, value] of Object.entries(handoverReturnCheckChanges(field, checked))) this.set(key, value);
  }
}
