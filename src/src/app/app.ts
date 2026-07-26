import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

type YesNo = 'ANO' | 'NE' | null;

interface UploadedAsset {
  name: string;
  type: string;
  dataBase64: string;
}

interface ChecklistItem {
  id: string;
  label: string;
  section: string;
  info: string;
  action: string;
  actionRaw: string;
  options: string[];
  propertyTypes: string[];
  services: string[];
  ownerships: string[];
  specialRule: string;
  showToBuyer: boolean;
}

interface Section {
  name: string;
  order: number;
  items: ChecklistItem[];
}

interface SectionGroup {
  key: string;
  label: string;
  sections: Section[];
}

interface PrintRow {
  label: string;
  value: string;
}

interface PrintBlock {
  title: string;
  rows: PrintRow[];
}

interface CompactPrintBlock {
  title: string;
  entries: string[];
  weight: number;
}

interface CompactPrintCell {
  block: CompactPrintBlock | null;
}

interface LeafletPrintEntry {
  label: string;
  images: UploadedAsset[];
  link: string;
  documentName: string;
}

interface ItemState {
  selectedOptions: Set<string>;
  customOptionText: string;
  customOptionDraft: string;
  customOptionEditing: boolean;
  textValue: string;
  dimensionFirst: string;
  dimensionSecond: string;
  dimensionThird: string;
  optionAmounts: Record<string, string>;
  optionTexts: Record<string, string>;
  optionModes: Record<string, 'walk' | 'car' | ''>;
  optionUnits: Record<string, 'min' | 'hod' | ''>;
  customInfrastructureRows: Array<{ value: string; unit: 'min' | 'hod'; mode: 'walk' | 'car' | ''; active?: boolean }>;
  customServiceRows: Array<{ name: string; amount: string }>;
  customMoneyRows: Array<{ name: string; amount: string }>;
  customTextRows: string[];
  travelMode: 'walk' | 'car' | '';
  customReconstructionRows: Array<{ name: string; year: string }>;
  nearestStopRows: Array<{ value: string; unit: 'min' | 'hod' | ''; mode: 'walk' | 'car' | '' }>;
  roomDimensions: Record<string, { width: string; length: string }>;
  roomAreas: Record<string, string>;
  checked: boolean;
  yesNo: YesNo;
  dateValue: string;
  uploadedFile: UploadedAsset | null;
  floorPlanPhotos: UploadedAsset[];
  customParcelRows: Array<{ parcelNumber: string; parcelType: string; area: string }>;
}

interface GateOption {
  value: string;
  imagePath: string;
  alt: string;
  label: string;
}

interface RoomAreaRule {
  podlahova: boolean;
  obytna: boolean;
  uzitna: boolean;
  celkovaUzitna: boolean;
}

interface RoomAreaTotal {
  key: keyof RoomAreaRule;
  label: string;
  value: string;
}

@Component({
  selector: 'app-root',
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private readonly http = inject(HttpClient);
  private readonly customOptionLabel = 'Dopsat vlastní možnost';
  private readonly gateFallbackOptions: GateOption[] = [
    {
      value: 'Vrata doleva',
      imagePath: this.resolveGateImagePath('vrata-DOLEVA'),
      alt: 'Vrata doleva',
      label: 'Vrata doleva'
    },
    {
      value: 'Vrata doprava',
      imagePath: this.resolveGateImagePath('vrata-DOPRAVA'),
      alt: 'Vrata doprava',
      label: 'Vrata doprava'
    },
    {
      value: 'Vrata klasické',
      imagePath: this.resolveGateImagePath('vrata-KLASICKE'),
      alt: 'Vrata klasické',
      label: 'Vrata klasické'
    },
    {
      value: 'Vrata vyjížděcí',
      imagePath: this.resolveGateImagePath('vrata-VYJIZDECI'),
      alt: 'Vrata vyjížděcí',
      label: 'Vrata vyjížděcí'
    }
  ];

  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly sections = signal<Section[]>([]);
  protected readonly title = 'Náběr nemovitosti';

  protected readonly selectedPropertyType = signal('');
  protected readonly selectedService = signal('');
  protected readonly selectedOwnership = signal('');

  protected readonly propertyTypeOptions = signal<string[]>([]);
  protected readonly serviceOptions = signal<string[]>([]);
  protected readonly ownershipOptions = signal<string[]>([]);
  private readonly stateVersion = signal(0);

  protected readonly states = new Map<string, ItemState>();
  private readonly handoverExpanded = signal<Record<string, boolean>>({});
  private readonly activeSectionKey = signal('');
  private readonly activeGroupKey = signal('');
  private readonly clientCount = signal(1);
  private readonly activeClientIndex = signal(0);
  private readonly activeLeafletLinkItemId = signal('');
  private readonly printMode = signal<'property' | 'buyer' | 'buyerAlt' | 'buyerCompact' | 'unfilled'>('property');
  private readonly printInProgress = signal(false);
  private readonly activeInfoItemId = signal('');
  private readonly activeM2InfoKey = signal('');
  private readonly roomAreaRules = new Map<string, RoomAreaRule>();
  private readonly roomAreaInfo = new Map<keyof RoomAreaRule, string>();

  protected readonly filteredSections = computed(() => {
    this.stateVersion();

    const property = this.selectedPropertyType();
    const service = this.selectedService();
    const ownership = this.selectedOwnership();
    const showLeaseSection = this.shouldShowPozemekVNajmu();
    const showSklepniProstory = this.shouldShowSklepniProstory();

    return this.sections()
      .filter((section) => {
        if (this.normalize(section.name) === 'POZEMEK V NAJMU') {
          return showLeaseSection;
        }
        if (this.normalize(section.name) === 'SKLEPNI PROSTORY') {
          return showSklepniProstory;
        }
        return true;
      })
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => {
          if (this.isSklepZdenySidesItem(section, item) && !this.shouldShowSklepZdenySides(section)) {
            return false;
          }

          if (this.normalize(section.name) === 'POZEMEK V NAJMU') {
            return true;
          }

          if (this.isGateOpeningType(item) && this.normalize(this.selectedPropertyType()) === 'DUM') {
            return false;
          }

          const propertyOk = !property || this.includesNormalized(item.propertyTypes, property);
          const serviceOk = !service || this.includesNormalized(item.services, service);
          const ownershipOk = !ownership || this.includesNormalized(item.ownerships, ownership);
          if (!(propertyOk && serviceOk && ownershipOk)) {
            return false;
          }

          const buildingNumberVisibility = this.shouldHideBuildingNumberField(item);
          if (buildingNumberVisibility) {
            return false;
          }

          if (this.isClientSection(section)) {
            return true;
          }

          if (this.shouldHideBySpecialRule(item, property, service, ownership)) {
            return false;
          }

          return true;
        })
      }))
      .filter((section) => section.items.length > 0);
  });

  protected readonly displayedSections = computed(() => {
    const groups = this.sectionGroups();
    if (groups.length === 0) {
      return [];
    }

    const activeKey = this.activeGroupKey();
    if (!activeKey) {
      return groups[0].sections;
    }

    const activeGroup = groups.find((group) => group.key === activeKey);
    return activeGroup ? activeGroup.sections : groups[0].sections;
  });

  protected readonly sectionGroups = computed<SectionGroup[]>(() => {
    const sections = this.filteredSections();
    if (sections.length === 0) {
      return [];
    }

    return sections.map((section) => ({
      key: this.sectionKey(section),
      label: this.sectionTabLabel(section.name),
      sections: [section]
    }));
  });

  private sectionTabLabel(name: string): string {
    const normalized = this.normalize(name);
    const labels: Record<string, string> = {
      ZAKLADNI: 'ZÁKLADNÍ INFORMACE',
      DOSTUPNOSTVOKOLIGARAZE: 'DOSTUPNOST V OKOLÍ GARÁŽE',
      PRONAJEMNEMOVITOSTIVOKOLI: 'PRONÁJEM NEMOVITOSTÍ V OKOLÍ',
      PRODEJNEMOVITOSTIVOKOLI: 'PRODEJ NEMOVITOSTÍ V OKOLÍ'
    };

    return labels[normalized] || name;
  }

  protected isClientSection(section: Section): boolean {
    return this.normalize(section.name) === 'KLIENT';
  }

  private shouldHideBySpecialRule(item: ChecklistItem, property: string, service: string, ownership: string): boolean {
    const raw = item.specialRule?.trim();
    if (!raw) {
      return false;
    }

    const lines = raw
      .split(/\n|;/)
      .map((part) => part.trim())
      .filter(Boolean);

    for (const line of lines) {
      const normalizedLine = this.normalize(line);
      if (!/SKRYT\s+KDYZ/.test(normalizedLine)) {
        continue;
      }

      const body = line.replace(/^\s*SKRYT\s+KDYZ\s*/iu, '').trim();
      const conditionMatch = body.match(/^([^!=]+)(!=|=)(.+)$/);
      if (!conditionMatch) {
        continue;
      }

      const scopedKey = conditionMatch[1].trim();
      const operator = conditionMatch[2];
      const valueRaw = conditionMatch[3].trim();
      const keyParts = scopedKey.split('.');
      if (keyParts.length < 2) {
        continue;
      }

      const sectionName = keyParts[0].trim();
      const labelName = keyParts.slice(1).join('.').trim();
      if (!sectionName || !labelName) {
        continue;
      }

      const itemForCondition = this.findItemBySectionAndLabel(sectionName, labelName);
      if (!itemForCondition) {
        continue;
      }

      const selectedValues = this.selectedOptionsList(itemForCondition.id);
      if (selectedValues.length === 0) {
        const state = this.getState(itemForCondition.id);
        if (state.yesNo) {
          selectedValues.push(state.yesNo);
        } else if (state.textValue.trim()) {
          selectedValues.push(state.textValue.trim());
        }
      }

      if (selectedValues.length === 0) {
        continue;
      }

      const expectedValues = valueRaw
        .split(/\||\//)
        .map((value) => value.replace(/["“”']/g, ' ').trim())
        .filter(Boolean);
      if (expectedValues.length === 0) {
        continue;
      }

      const hasMatch = selectedValues.some((selected) =>
        expectedValues.some((expected) => this.normalize(selected) === this.normalize(expected))
      );

      if (operator === '=' && hasMatch) {
        return true;
      }

      if (operator === '!=' && !hasMatch) {
        return true;
      }
    }

    return false;
  }

  private shouldHideByNarrativeSpecialRule(raw: string): boolean | null {
    const normalized = this.normalize(raw);
    const hasShowOnlyRule =
      normalized.includes('ZOBRAZI SE POUZE') ||
      normalized.includes('ZOBRAZIT POUZE') ||
      normalized.includes('ZOBRAZOVAT POUZE') ||
      normalized.includes('TOTO POLE SE ZORAZI POUZE') ||
      normalized.includes('TOTO POLE SE ZOBRAZI POUZE');
    const hasHideRule =
      normalized.includes('NEZOBRAZI') ||
      normalized.includes('NEZOBRAZOVAT') ||
      normalized.includes('NEBUDE SE ZOBRAZOVAT') ||
      normalized.includes('NAOPAK SE TOTO POLE NEZOBRAZI');

    if (!hasShowOnlyRule && !hasHideRule) {
      return null;
    }

    const isNegatedSelect = /NE\s*vyberu/iu.test(raw);

    const sourceMatch = raw.match(/[→\u001A>]\s*([^→\u001A>]+?)\s*[→\u001A>]/u);
    const podnadpisMatch = raw.match(/podnadpis\s+([^\n\r→\u001A>]+)/iu);
    const sourceLabel =
      podnadpisMatch?.[1]?.trim() ||
      sourceMatch?.[1]?.trim() ||
      this.findReferencedItemLabelInNarrative(raw);
    if (!sourceLabel) {
      return null;
    }

    const sourceItem = this.findItemBySpecialKey(sourceLabel);
    if (!sourceItem) {
      return null;
    }

    const selectedValues = this.selectedValuesForSpecialKey(sourceLabel, this.selectedPropertyType(), this.selectedService(), this.selectedOwnership());
    if (selectedValues.length === 0) {
      return hasShowOnlyRule;
    }

    const quotedAfterVyberu = raw.match(/vyberu\s*["“”']([^"“”']+)["“”']/iu);
    if (quotedAfterVyberu) {
      const expected = this.normalize(quotedAfterVyberu[1]);
      const isMatch = selectedValues.some((value) => this.normalize(value) === expected);
      if (hasHideRule && !hasShowOnlyRule) {
        return isNegatedSelect ? !isMatch : isMatch;
      }
      return isNegatedSelect ? isMatch : !isMatch;
    }

    const plainAfterVyberu = raw.match(/vyberu\s+(ANO|NE)/iu);
    if (plainAfterVyberu) {
      const expected = this.normalize(plainAfterVyberu[1]);
      const isMatch = selectedValues.some((value) => this.normalize(value) === expected);
      if (hasHideRule && !hasShowOnlyRule) {
        return isNegatedSelect ? !isMatch : isMatch;
      }
      return isNegatedSelect ? isMatch : !isMatch;
    }

    const anyAfterVyberu = raw.match(/vyberu\s+([\s\S]+)/iu);
    if (anyAfterVyberu) {
      const expectedValues = anyAfterVyberu[1]
        .replace(/["“”']/g, ' ')
        .split(/\bNEBO\b|\||\/|\n|\r/iu)
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => part.replace(/^MOZNOST\s+/iu, '').trim())
        .map((part) => part.replace(/^HODNOTU\s+/iu, '').trim())
        .filter((part) => !/^A(KTUALNI|KTUÁLNÍ)?\s*HODNOTU$/iu.test(part))
        .filter((part) => part.length > 1)
        .map((part) => {
          const lastPathPart = part.split(/[→\u001A>]/).map((x) => x.trim()).filter(Boolean).pop();
          return lastPathPart || part;
        });

      const isMatch = selectedValues.some((selectedValue) => {
        const selectedNormalized = this.normalize(selectedValue);
        return expectedValues.some((value) => this.normalize(value) === selectedNormalized);
      });

      if (hasHideRule && !hasShowOnlyRule) {
        return isNegatedSelect ? !isMatch : isMatch;
      }
      return isNegatedSelect ? isMatch : !isMatch;
    }

    const valueAfterJeHodnota = raw.match(/je\s+hodnota\s+([^,.;\n\r]+)/iu);
    if (valueAfterJeHodnota) {
      const expected = this.normalize(valueAfterJeHodnota[1].trim());
      const isMatch = selectedValues.some((value) => this.normalize(value) === expected);
      if (hasHideRule && !hasShowOnlyRule) {
        return isMatch;
      }
      return !isMatch;
    }

    return null;
  }

  private findReferencedItemLabelInNarrative(raw: string): string {
    const normalizedRaw = this.normalize(raw);

    for (const section of this.sections()) {
      for (const item of section.items) {
        const label = item.label.trim();
        if (!label) {
          continue;
        }

        if (normalizedRaw.includes(this.normalize(label))) {
          return label;
        }
      }
    }

    return '';
  }

  private selectedValuesForSpecialKey(key: string, property: string, service: string, ownership: string): string[] {
    const keyRaw = key.trim();
    const sectionLabelMatch = keyRaw.match(/^([^.=]+)[.=](.+)$/);
    if (sectionLabelMatch) {
      const sectionName = sectionLabelMatch[1].trim();
      const labelName = sectionLabelMatch[2].trim();
      let scopedItem = this.findItemBySectionAndLabel(sectionName, labelName);
      if (!scopedItem) {
        scopedItem = this.findItemBySpecialKey(this.normalize(labelName));
      }
      if (!scopedItem) {
        return [];
      }

      const scopedState = this.getState(scopedItem.id);
      const scopedSelectedOptions = this.selectedOptionsList(scopedItem.id);
      if (scopedSelectedOptions.length > 0) {
        return scopedSelectedOptions;
      }

      if (scopedState.yesNo) {
        return [scopedState.yesNo];
      }

      if (scopedState.textValue.trim()) {
        return [scopedState.textValue.trim()];
      }

      return [];
    }

    const normalizedKey = this.normalize(keyRaw.replace(/[_:]/g, ' '));
    if (normalizedKey.includes('DRUH NEMOVITOSTI') || normalizedKey === 'NEMOVITOST') {
      return property ? [property] : [];
    }
    if (normalizedKey.includes('DRUH SLUZBY') || normalizedKey === 'SLUZBA') {
      return service ? [service] : [];
    }
    if (normalizedKey.includes('VLASTNICTVI')) {
      return ownership ? [ownership] : [];
    }

    const item = this.findItemBySpecialKey(normalizedKey);
    if (!item) {
      return [];
    }

    const state = this.getState(item.id);
    const selectedOptions = this.selectedOptionsList(item.id);
    if (selectedOptions.length > 0) {
      return selectedOptions;
    }

    if (state.yesNo) {
      return [state.yesNo];
    }

    if (state.textValue.trim()) {
      return [state.textValue.trim()];
    }

    return [];
  }

  private findItemBySectionAndLabel(sectionName: string, labelName: string): ChecklistItem | null {
    const normalizedSection = this.normalize(sectionName);
    const normalizedLabel = this.normalize(labelName);
    const normalizedLabelSoft = this.normalizeForLooseMatch(labelName);

    for (const section of this.sections()) {
      if (!this.areSectionNamesEquivalent(this.normalize(section.name), normalizedSection)) {
        continue;
      }

      for (const item of section.items) {
        const itemLabel = this.normalize(item.label);
        if (itemLabel === normalizedLabel) {
          return item;
        }

        const itemLabelSoft = this.normalizeForLooseMatch(item.label);
        if (itemLabelSoft && normalizedLabelSoft && (itemLabelSoft === normalizedLabelSoft || itemLabelSoft.includes(normalizedLabelSoft) || normalizedLabelSoft.includes(itemLabelSoft))) {
          return item;
        }
      }
    }

    return null;
  }

  private normalizeForLooseMatch(value: string): string {
    return this.normalize(value)
      .replace(/[^A-Z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private areSectionNamesEquivalent(a: string, b: string): boolean {
    if (a === b) {
      return true;
    }

    const aliases: Array<Set<string>> = [
      new Set(['ZAKLADNI', 'ZAKLADNI INFORMACE']),
      new Set(['PUVOD MAJETKU', 'PUVOD PENEZNICH PROSTREDKU', 'AML'])
    ];

    return aliases.some((group) => group.has(a) && group.has(b));
  }

  private findItemBySpecialKey(key: string): ChecklistItem | null {
    const normalizedKey = this.normalize(key);

    for (const section of this.sections()) {
      for (const item of section.items) {
        if (this.normalize(item.label) === normalizedKey) {
          return item;
        }
      }
    }

    return null;
  }

  private isSklepZdenySidesItem(section: Section, item: ChecklistItem): boolean {
    return this.normalize(section.name) === 'SKLEPNI PROSTORY' && this.normalize(item.label).includes('SKLEP ZDENY ZE');
  }

  private shouldShowSklepZdenySides(section: Section): boolean {
    const typeItem = section.items.find((item) => this.normalize(item.label) === 'TYP SKLEPU');
    if (!typeItem) {
      return false;
    }

    const selected = this.selectedOptionsList(typeItem.id);
    return selected.some((value) => this.normalize(value) === 'ZDENY SKLEP');
  }

  private shouldShowPozemekVNajmu(): boolean {
    let targetItemId = '';

    for (const section of this.sections()) {
      if (this.normalize(section.name) !== 'POZEMEK') {
        continue;
      }

      for (const item of section.items) {
        const isTargetLabel = this.normalize(item.label) === 'VLASTNICTVI';
        const hasNajemOption = item.options.some((option) => this.normalize(option) === 'V NAJMU');

        if (!isTargetLabel || !hasNajemOption) {
          continue;
        }

        targetItemId = item.id;
        break;
      }

      if (targetItemId) {
        break;
      }
    }

    if (!targetItemId) {
      return false;
    }

    const selected = this.stateFor(targetItemId).selectedOptions;
    for (const value of selected) {
      if (this.normalize(value) === 'V NAJMU') {
        return true;
      }
    }

    return false;
  }

  private shouldShowSklepniProstory(): boolean {
    let hasAnySelectionInDalsiProstory = false;

    for (const section of this.sections()) {
      if (this.normalize(section.name) !== 'DALSI PROSTORY') {
        continue;
      }

      for (const item of section.items) {
        const selected = this.selectedOptionsList(item.id);
        if (selected.length > 0) {
          hasAnySelectionInDalsiProstory = true;
        }

        if (selected.some((value) => this.normalize(value) === 'SKLEP')) {
          return true;
        }
      }
    }

    return !hasAnySelectionInDalsiProstory;
  }

  private shouldHideBuildingNumberField(item: ChecklistItem): boolean {
    if (this.normalize(item.section) !== 'STAVBA') {
      return false;
    }

    const label = this.normalize(item.label);
    if (label !== 'CISLO POPISNE' && label !== 'CISLO EVIDENCNI') {
      return false;
    }

    const stavbaSection = this.sections().find((section) => this.normalize(section.name) === 'STAVBA');
    if (!stavbaSection) {
      return false;
    }

    const designationItem = stavbaSection.items.find((row) => this.normalize(row.label) === 'OZNACENI BUDOVY');
    if (!designationItem) {
      return false;
    }

    const selected = this.selectedOptionsList(designationItem.id)[0] || '';
    const normalizedSelected = this.normalize(selected);

    if (!normalizedSelected) {
      return false;
    }

    if (normalizedSelected.includes('BEZ CISLA POPISNEHO NEBO EVIDENCNIHO')) {
      return true;
    }

    if (label === 'CISLO POPISNE' && normalizedSelected.includes('CISLO EVIDENCNI')) {
      return true;
    }

    if (label === 'CISLO EVIDENCNI' && normalizedSelected.includes('CISLO POPISNE')) {
      return true;
    }

    return false;
  }

  constructor() {
    void this.loadData();
  }

  protected loadData(): Promise<void> {
    const infoUrl =
      'https://docs.google.com/spreadsheets/d/1GD0AzdClLhxzbbIpispEJ0ecW1-BuWyL36lJZfZGkFA/gviz/tq?tqx=out:csv&sheet=INFORMACE';
    const m2Url =
      'https://docs.google.com/spreadsheets/d/1GD0AzdClLhxzbbIpispEJ0ecW1-BuWyL36lJZfZGkFA/gviz/tq?tqx=out:csv&sheet=m2';

    return new Promise((resolve) => {
      this.http.get(infoUrl, { responseType: 'text' }).subscribe({
        next: (csvText) => {
          const rows = this.csvToObjects(csvText);
          this.prepareData(rows);

          this.http.get(m2Url, { responseType: 'text' }).subscribe({
            next: (m2CsvText) => {
              const m2Rows = this.csvToObjects(m2CsvText);
              this.prepareRoomAreaRules(m2Rows);
              this.loading.set(false);
              resolve();
            },
            error: () => {
              this.loading.set(false);
              resolve();
            }
          });
        },
        error: () => {
          this.error.set('Nepodařilo se načíst data z Google tabulky.');
          this.loading.set(false);
          resolve();
        }
      });
    });
  }

  protected isSelection(item: ChecklistItem): boolean {
    if (this.isInfrastructureField(item) && item.options.length > 0) {
      return true;
    }

    if (this.hasTextInputAction(item)) {
      return false;
    }

    const isDropdownAction = item.action.includes('ROZEVIRACI') && item.action.includes('SEZNAM');
    return item.action.includes('VYBER ZE SEZNAMU') || isDropdownAction || item.options.length > 0;
  }

  protected optionsForItem(item: ChecklistItem): string[] {
    if (item.options.length > 0) {
      return item.options;
    }

    if (this.isTitlePresenceField(item)) {
      return ['ANO', 'NE'];
    }

    if (item.action.includes('VYBER ZE SEZNAMU ROKU')) {
      const currentYear = new Date().getFullYear();
      const years: string[] = [];
      for (let year = currentYear; year >= 1900; year -= 1) {
        years.push(String(year));
      }
      return years;
    }

    return [];
  }

  protected isYearSelection(item: ChecklistItem): boolean {
    return item.action.includes('VYBER ZE SEZNAMU ROKU');
  }

  protected isDropdownListField(item: ChecklistItem): boolean {
    return item.action.includes('ROZEVIRACI') && item.action.includes('SEZNAM');
  }

  protected isInfrastructureField(item: ChecklistItem): boolean {
    const sectionName = this.normalize(item.section);
    return sectionName === 'INFRASTRUKTURA OBCE' || sectionName === 'INFRASTURKURA OBCE';
  }

  protected isInfrastructureSection(section: Section): boolean {
    const sectionName = this.normalize(section.name);
    return sectionName === 'INFRASTRUKTURA OBCE' || sectionName === 'INFRASTURKURA OBCE';
  }

  protected infrastructureRows(item: ChecklistItem): string[] {
    return this.optionsForItem(item).filter((row) => !this.isCustomOption(row));
  }

  protected infrastructureValue(itemId: string, row: string): string {
    return this.stateFor(itemId).optionTexts[row] || '';
  }

  protected setInfrastructureValue(itemId: string, row: string, value: string): void {
    this.stateFor(itemId).optionTexts[row] = value;
  }

  protected infrastructureUnit(itemId: string, row: string): 'min' | 'hod' {
    return this.stateFor(itemId).optionUnits[row] || 'min';
  }

  protected setInfrastructureUnit(itemId: string, row: string, unit: 'min' | 'hod'): void {
    this.stateFor(itemId).optionUnits[row] = unit;
    this.bumpStateVersion();
  }

  protected onInfrastructureBlur(itemId: string, row: string): void {
    const state = this.stateFor(itemId);
    const unit = state.optionUnits[row] || 'min';
    state.optionTexts[row] = this.formatNearestStopValue(state.optionTexts[row] || '', unit);
    this.bumpStateVersion();
  }

  protected infrastructureMode(itemId: string, row: string): 'walk' | 'car' | '' {
    return this.stateFor(itemId).optionModes[row] || '';
  }

  protected customInfrastructureRows(itemId: string): Array<{ value: string; unit: 'min' | 'hod'; mode: 'walk' | 'car' | ''; active?: boolean }> {
    return this.stateFor(itemId).customInfrastructureRows.filter(
      (row) => row.active || row.value.trim().length > 0 || row.mode !== ''
    );
  }

  protected addCustomInfrastructureRow(itemId: string): void {
    const state = this.stateFor(itemId);
    if (state.customInfrastructureRows.length >= 10) {
      return;
    }
    state.customInfrastructureRows.push({ value: '', unit: 'min', mode: '', active: true });
    this.bumpStateVersion();
  }

  protected updateCustomInfrastructureRow(itemId: string, index: number, value: string): void {
    const state = this.stateFor(itemId);
    const row = state.customInfrastructureRows[index];
    if (!row) {
      return;
    }

    row.active = true;
    row.value = value;
  }

  protected onCustomInfrastructureBlur(itemId: string, index: number): void {
    const row = this.stateFor(itemId).customInfrastructureRows[index];
    if (!row) {
      return;
    }
    row.value = this.formatNearestStopValue(row.value, row.unit);
    if (!row.value.trim() && row.mode === '') {
      row.active = false;
    }
    this.bumpStateVersion();
  }

  protected setCustomInfrastructureUnit(itemId: string, index: number, unit: 'min' | 'hod'): void {
    const row = this.stateFor(itemId).customInfrastructureRows[index];
    if (!row) {
      return;
    }
    row.unit = unit;
    row.active = true;
    this.bumpStateVersion();
  }

  protected setCustomInfrastructureMode(itemId: string, index: number, mode: 'walk' | 'car' | ''): void {
    const row = this.stateFor(itemId).customInfrastructureRows[index];
    if (!row) {
      return;
    }
    row.mode = mode;
    row.active = true;
    this.bumpStateVersion();
  }

  protected setInfrastructureMode(itemId: string, row: string, mode: 'walk' | 'car' | ''): void {
    const state = this.stateFor(itemId);
    state.optionModes[row] = mode;
    this.bumpStateVersion();
  }

  protected allowsCustomOption(item: ChecklistItem): boolean {
    return item.action.includes('DOPSAT VLASTNI MOZNOST');
  }

  protected isCustomOption(option: string): boolean {
    return this.normalize(option) === this.normalize(this.customOptionLabel);
  }

  protected isSingleSelect(item: ChecklistItem): boolean {
    return item.action.includes('LZE VYBRAT JEN JEDNU POLOZKU ZE SEZNAMU') || this.isGateOpeningType(item) || this.isYearSelection(item);
  }

  protected isGateOpeningType(item: ChecklistItem): boolean {
    const label = this.normalize(item.label);
    const section = this.normalize(item.section);

    const explicitMatch =
      label === 'TYP OTEVIRANI VRAT' ||
      label === 'OTEVIRANI VRAT' ||
      section === 'TYP OTEVIRANI VRAT' ||
      section === 'OTEVIRANI VRAT';

    if (explicitMatch) {
      return true;
    }

    const isVrataContext = label.includes('VRAT') || section.includes('VRAT');
    const isOpeningLabel = label.includes('OTEVIRAN');

    return isVrataContext && isOpeningLabel;
  }

  protected gateTypeOptions(item: ChecklistItem): GateOption[] {
    const parsed = this.optionsForItem(item)
      .map((option) => this.parseGateOption(option))
      .filter((option): option is GateOption => option !== null);

    return parsed.length > 0 ? parsed : this.gateFallbackOptions;
  }

  protected isCheckbox(item: ChecklistItem): boolean {
    return item.action.includes('ZASKRTAVACI TLACITKO');
  }

  protected isYesNo(item: ChecklistItem): boolean {
    return /ANO\s*\/\s*NE/i.test(item.action) || this.normalize(item.action).includes('ANO NE') || this.hasYesNoOptions(item);
  }

  private hasYesNoOptions(item: ChecklistItem): boolean {
    const normalizedOptions = this.optionsForItem(item)
      .map((option) => this.normalize(option))
      .filter(Boolean);

    if (normalizedOptions.length !== 2) {
      return false;
    }

    return normalizedOptions.includes('ANO') && normalizedOptions.includes('NE');
  }

  private isTitlePresenceField(item: ChecklistItem): boolean {
    return this.normalize(item.label) === 'TITUL PRED NEBO ZA JMENEM';
  }

  protected isText(item: ChecklistItem): boolean {
    return item.action.includes('DOPSAT TEXT') || (!this.isSelection(item) && !this.isCheckbox(item) && !this.isYesNo(item) && !this.isDate(item));
  }

  protected isTextWithSelectionField(item: ChecklistItem): boolean {
    const action = this.normalize(item.actionRaw || item.action || '');
    return this.hasTextInputAction(item) && action.includes('VYBER ZE SEZNAMU') && item.options.length > 0;
  }

  protected hasTextInputAction(item: ChecklistItem): boolean {
    return this.normalize(item.actionRaw || item.action || '').includes('DOPSAT TEXT');
  }

  protected isDate(item: ChecklistItem): boolean {
    return item.action.includes('VYBRAT DATUM');
  }

  protected isServiceAmountList(item: ChecklistItem): boolean {
    const label = this.normalize(item.label);
    return (
      label === 'DO SLUZEB PATRI' ||
      label === 'DO SLUZEB NEPATRI' ||
      label === 'DO NAJMU LZE ZAPOCITAT' ||
      label === 'DO NAJMU NELZE ZAPOCITAT'
    );
  }

  protected isServiceExcludedList(item: ChecklistItem): boolean {
    return this.normalize(item.label) === 'DO SLUZEB NEPATRI';
  }

  protected allowCustomServiceRows(item: ChecklistItem): boolean {
    return this.normalize(item.label) === 'DO SLUZEB PATRI';
  }

  protected isRentChargeList(item: ChecklistItem): boolean {
    const label = this.normalize(item.label);
    return label === 'DO NAJMU LZE ZAPOCITAT' || label === 'DO NAJMU NELZE ZAPOCITAT';
  }

  protected isRentIncludedList(item: ChecklistItem): boolean {
    return this.normalize(item.label) === 'DO NAJMU LZE ZAPOCITAT';
  }

  protected isRentExcludedList(item: ChecklistItem): boolean {
    return this.normalize(item.label) === 'DO NAJMU NELZE ZAPOCITAT';
  }

  protected isMinimumRentField(item: ChecklistItem): boolean {
    const label = this.normalize(item.label);
    return label.includes('MINIMALNI') && label.includes('CENA') && label.includes('NAJMU');
  }

  protected isRecommendedDepositField(item: ChecklistItem): boolean {
    const label = this.normalize(item.label);
    return label.includes('DOPORUCENA') && label.includes('KAUCE');
  }

  protected isTotalCostsByServicesField(item: ChecklistItem): boolean {
    const label = this.normalize(item.label);
    return label.includes('CELKOVA VYSE NAKLADU') && label.includes('ROZPISU SLUZEB');
  }

  protected isProfitField(item: ChecklistItem): boolean {
    const label = this.normalize(item.label);
    return label.includes('ZISK');
  }

  protected isEnergyCertificateUploadField(item: ChecklistItem): boolean {
    const section = this.normalize(item.section);
    const label = this.normalize(item.label);
    return section.includes('STAVBA') && label.includes('ENERGETICK') && (label.includes('STIT') || label.includes('STITEK') || label.includes('PRUKAZ') || label.includes('PRUKAZU'));
  }

  protected isUploadOrLinkField(item: ChecklistItem): boolean {
    if (this.isEnergyCertificateUploadField(item)) {
      return true;
    }

    const action = this.normalize(item.actionRaw || item.action || '');
    const hasFilePart = action.includes('SOUBOR') && action.includes('PC');
    const hasLinkPart = action.includes('ODKAZ') && action.includes('OBRAZEK');
    const hasOpenWindowHint = action.includes('OTEVRIT') && action.includes('OKNO');
    return hasFilePart && hasLinkPart && hasOpenWindowHint;
  }

  protected uploadOrLinkHint(item: ChecklistItem): string {
    return this.isEnergyCertificateUploadField(item)
      ? 'Vyberte soubor nebo jej přetáhněte sem'
      : 'Vyberte soubor nebo vložte odkaz na obrázek';
  }

  protected openEnergyCertificatePicker(input: HTMLInputElement, event?: Event): void {
    event?.stopPropagation();
    input.click();
  }

  protected openUploadPicker(input: HTMLInputElement, event?: Event): void {
    this.openEnergyCertificatePicker(input, event);
  }

  protected onEnergyCertificateSelected(itemId: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const base64 = result.includes(',') ? result.slice(result.indexOf(',') + 1) : '';
      const state = this.stateFor(itemId);
      state.textValue = file.name;
      state.uploadedFile = {
        name: file.name,
        type: file.type || 'application/octet-stream',
        dataBase64: base64
      };
      this.bumpStateVersion();
      input.value = '';
    };
    reader.readAsDataURL(file);
  }

  protected onUploadSelected(itemId: string, event: Event): void {
    this.onEnergyCertificateSelected(itemId, event);
  }

  protected onEnergyCertificateDropped(itemId: string, event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const file = event.dataTransfer?.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const base64 = result.includes(',') ? result.slice(result.indexOf(',') + 1) : '';
      const state = this.stateFor(itemId);
      state.textValue = file.name;
      state.uploadedFile = {
        name: file.name,
        type: file.type || 'application/octet-stream',
        dataBase64: base64
      };
      this.bumpStateVersion();
    };
    reader.readAsDataURL(file);
  }

  protected onUploadDropped(itemId: string, event: DragEvent): void {
    this.onEnergyCertificateDropped(itemId, event);
  }

  protected hasUploadedEnergyCertificate(itemId: string): boolean {
    const uploaded = this.stateFor(itemId).uploadedFile;
    return Boolean(uploaded?.name && uploaded?.dataBase64);
  }

  protected hasUploadedFile(itemId: string): boolean {
    return this.hasUploadedEnergyCertificate(itemId);
  }

  protected uploadedEnergyCertificateTypeIcon(itemId: string): string {
    const uploaded = this.stateFor(itemId).uploadedFile;
    const name = (uploaded?.name || '').toLowerCase();
    const type = (uploaded?.type || '').toLowerCase();

    if (name.endsWith('.pdf') || type.includes('pdf')) {
      return '📄';
    }
    if (name.endsWith('.jpg') || name.endsWith('.jpeg') || type.includes('jpeg')) {
      return '🖼️';
    }
    if (name.endsWith('.png') || type.includes('png')) {
      return '🖼️';
    }
    if (name.endsWith('.webp') || type.includes('webp')) {
      return '🖼️';
    }
    if (name.endsWith('.doc') || name.endsWith('.docx') || type.includes('word')) {
      return '📝';
    }

    return '📎';
  }

  protected uploadedFileTypeIcon(itemId: string): string {
    return this.uploadedEnergyCertificateTypeIcon(itemId);
  }

  protected openUploadedEnergyCertificate(itemId: string): void {
    const uploaded = this.stateFor(itemId).uploadedFile;
    if (!uploaded?.dataBase64) {
      return;
    }

    const mime = uploaded.type || 'application/octet-stream';
    const buffer = this.base64ToArrayBuffer(uploaded.dataBase64);
    const blob = new Blob([buffer], { type: mime });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener');
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }

  protected openUploadedFile(itemId: string): void {
    this.openUploadedEnergyCertificate(itemId);
  }

  protected removeUploadedFile(itemId: string, event?: Event): void {
    event?.stopPropagation();
    const state = this.stateFor(itemId);
    state.uploadedFile = null;
    state.textValue = '';
    this.bumpStateVersion();
  }

  protected openLinkInNewWindow(itemId: string): void {
    const raw = this.linkValue(itemId).trim();
    if (!raw) {
      return;
    }

    const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    try {
      const parsed = new URL(withProtocol);
      window.open(parsed.toString(), '_blank', 'noopener');
    } catch {
      return;
    }
  }

  protected canOpenLinkInNewWindow(itemId: string): boolean {
    const raw = this.linkValue(itemId).trim();
    if (!raw || this.hasUploadedFile(itemId)) {
      return false;
    }
    return raw.includes('.') || /^https?:\/\//i.test(raw);
  }

  protected isLeafletUploadOrLinkField(item: ChecklistItem): boolean {
    return this.normalize(item.section) === 'INFORMACE DO LETAKU' && this.isUploadOrLinkField(item);
  }

  protected isLeafletMediaField(item: ChecklistItem): boolean {
    return this.normalize(item.section) === 'INFORMACE DO LETAKU' && (this.isUploadOrLinkField(item) || this.isMultiPhotoGalleryField(item));
  }

  protected isMainPhotoField(item: ChecklistItem): boolean {
    if (this.normalize(item.section) !== 'INFORMACE DO LETAKU') {
      return false;
    }

    const label = this.normalize(item.label);
    return label === 'HLAVNI FOTO' || label === 'FOTO' || label === 'HLAVNI FOTOGRAFIE';
  }

  protected shouldShowLeafletMediaHeadControls(item: ChecklistItem): boolean {
    return this.isLeafletMediaField(item);
  }

  protected isFloorPlanGalleryField(item: ChecklistItem): boolean {
    const section = this.normalize(item.section);
    const label = this.normalize(item.label);
    const isLeafletSection = section === 'INFORMACE DO LETAKU';
    const isFloorPlanLabel = label.includes('PUDORYS');
    return isLeafletSection && isFloorPlanLabel;
  }

  protected isLandUsePlanGalleryField(item: ChecklistItem): boolean {
    const section = this.normalize(item.section);
    const label = this.normalize(item.label);
    const isLeafletSection = section === 'INFORMACE DO LETAKU';
    const isLandUsePlanLabel = label.includes('UZEMNI') && label.includes('PLAN');
    return isLeafletSection && isLandUsePlanLabel;
  }

  protected isMultiPhotoGalleryField(item: ChecklistItem): boolean {
    return this.isFloorPlanGalleryField(item) || this.isLandUsePlanGalleryField(item);
  }

  protected galleryPhotos(itemId: string): UploadedAsset[] {
    return this.stateFor(itemId).floorPlanPhotos;
  }

  protected galleryPhotoSrc(photo: UploadedAsset): string {
    const mimeType = photo.type || 'image/jpeg';
    return `data:${mimeType};base64,${photo.dataBase64}`;
  }

  protected openLeafletLinkEditor(itemId: string, event?: Event): void {
    event?.stopPropagation();
    this.activeLeafletLinkItemId.set(itemId);
  }

  protected closeLeafletLinkEditor(itemId: string): void {
    if (this.linkValue(itemId).trim()) {
      return;
    }
    if (this.activeLeafletLinkItemId() === itemId) {
      this.activeLeafletLinkItemId.set('');
    }
  }

  protected clearLeafletLink(itemId: string, event?: Event): void {
    event?.stopPropagation();
    this.stateFor(itemId).textValue = '';
    if (this.activeLeafletLinkItemId() === itemId) {
      this.activeLeafletLinkItemId.set('');
    }
    this.bumpStateVersion();
  }

  protected shouldShowLeafletLinkInput(itemId: string): boolean {
    return this.activeLeafletLinkItemId() === itemId || this.linkValue(itemId).trim().length > 0;
  }

  protected linkValue(itemId: string): string {
    const state = this.stateFor(itemId);
    const value = state.textValue.trim();
    if (!this.isLeafletUploadOrLinkItemId(itemId)) {
      return value;
    }

    if (!value) {
      return '';
    }

    const looksLikePhotoName = state.floorPlanPhotos.some((photo) => photo.name.trim() === value);
    const looksLikePhotoCounter = /^\d+\s+fotograf/i.test(value);
    if (looksLikePhotoName || looksLikePhotoCounter) {
      return '';
    }

    return value;
  }

  protected floorPlanPhotos(itemId: string): UploadedAsset[] {
    return this.galleryPhotos(itemId);
  }

  protected openFloorPlanPicker(input: HTMLInputElement, event?: Event): void {
    event?.stopPropagation();
    input.click();
  }

  protected onFloorPlanSelected(itemId: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    const item = this.findItemById(itemId);
    const files = Array.from(input.files || []);
    if (files.length === 0) {
      return;
    }

    const selectedFiles = item && this.isMainPhotoField(item) ? files.slice(0, 1) : files;
    const state = this.stateFor(itemId);
    let pending = selectedFiles.length;

    if (item && this.isMainPhotoField(item)) {
      state.floorPlanPhotos = [];
    }

    for (const file of selectedFiles) {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || '');
        const base64 = result.includes(',') ? result.slice(result.indexOf(',') + 1) : '';
        if (base64) {
          state.floorPlanPhotos.push({
            name: file.name,
            type: file.type || 'image/jpeg',
            dataBase64: base64
          });
        }

        pending -= 1;
        if (pending === 0) {
          if (!this.isLeafletUploadOrLinkItemId(itemId)) {
            state.textValue = `${state.floorPlanPhotos.length} fotografií`;
          }
          this.bumpStateVersion();
          input.value = '';
        }
      };
      reader.readAsDataURL(file);
    }
  }

  protected removeFloorPlanPhoto(itemId: string, index: number): void {
    const state = this.stateFor(itemId);
    state.floorPlanPhotos.splice(index, 1);
    if (!this.isLeafletUploadOrLinkItemId(itemId)) {
      state.textValue = state.floorPlanPhotos.length > 0 ? `${state.floorPlanPhotos.length} fotografií` : '';
    }
    this.bumpStateVersion();
  }

  protected onGalleryImagesSelected(itemId: string, event: Event): void {
    this.onFloorPlanSelected(itemId, event);
  }

  protected removeGalleryImage(itemId: string, index: number): void {
    this.removeFloorPlanPhoto(itemId, index);
  }

  private isLeafletUploadOrLinkItemId(itemId: string): boolean {
    const item = this.findItemById(itemId);
    return item ? this.isLeafletUploadOrLinkField(item) : false;
  }

  protected pairedRentItem(section: Section, item: ChecklistItem): ChecklistItem | null {
    if (!this.isRentChargeList(item)) {
      return null;
    }

    const targetLabel = this.isRentIncludedList(item) ? 'DO NAJMU NELZE ZAPOCITAT' : 'DO NAJMU LZE ZAPOCITAT';
    return section.items.find((entry) => this.normalize(entry.label) === targetLabel) || null;
  }

  protected shouldRenderItemCard(section: Section, item: ChecklistItem): boolean {
    if (this.isRentExcludedList(item) && this.pairedRentItem(section, item)) {
      return false;
    }

    if (this.isDuplicateRoomSizeValuesHostField(section, item)) {
      return false;
    }

    return true;
  }

  private isDuplicateRoomSizeValuesHostField(section: Section, item: ChecklistItem): boolean {
    if (!this.isRoomSizeValuesHostField(item)) {
      return false;
    }

    const firstHost = section.items.find((entry) => this.isRoomSizeValuesHostField(entry));
    return Boolean(firstHost && firstHost.id !== item.id);
  }

  protected isReconstructedYearList(item: ChecklistItem): boolean {
    const section = this.normalize(item.section);
    const label = this.normalize(item.label);
    const isReconstructionKeyword = section.includes('REKONSTRUK') || label.includes('REKONSTRUK');
    const isMajorRepairsKeyword = section.includes('VETSICH OPRAV') || label.includes('VETSICH OPRAV');
    return (
      section === 'REKONSTRUOVANO, ROK' ||
      label === 'REKONSTRUOVANO, ROK' ||
      section === 'SEZNAM REKONSTRUKCI A VETSICH OPRAV' ||
      label === 'SEZNAM REKONSTRUKCI A VETSICH OPRAV' ||
      section === 'REKONSTRUKCE' ||
      label === 'REKONSTRUKCE' ||
      (isReconstructionKeyword && isMajorRepairsKeyword)
    );
  }

  protected customReconstructionRows(itemId: string): Array<{ name: string; year: string }> {
    return this.stateFor(itemId).customReconstructionRows;
  }

  protected addCustomReconstructionRow(itemId: string): void {
    const state = this.stateFor(itemId);
    if (state.customReconstructionRows.length >= 10) {
      return;
    }
    state.customReconstructionRows.push({ name: '', year: '' });
    this.bumpStateVersion();
  }

  protected updateCustomReconstructionRow(itemId: string, index: number, field: 'name' | 'year', value: string): void {
    const state = this.stateFor(itemId);
    const row = state.customReconstructionRows[index];
    if (!row) {
      return;
    }

    if (field === 'name') {
      row.name = value;
    } else {
      row.year = this.limitYearText(value);
    }

    this.bumpStateVersion();
  }

  protected reconstructedRows(item: ChecklistItem): string[] {
    return this.optionsForItem(item);
  }

  protected reconstructedYear(itemId: string, row: string): string {
    return this.stateFor(itemId).optionTexts[row] || '';
  }

  protected setReconstructedYear(itemId: string, row: string, value: string): void {
    this.stateFor(itemId).optionTexts[row] = this.limitYearText(value);
    this.bumpStateVersion();
  }

  protected serviceRows(item: ChecklistItem): string[] {
    return this.optionsForItem(item).filter((row) => !this.isCustomOption(row));
  }

  protected customServiceRows(itemId: string): Array<{ name: string; amount: string }> {
    return this.stateFor(itemId).customServiceRows;
  }

  protected addCustomServiceRow(itemId: string): void {
    const state = this.stateFor(itemId);
    if (state.customServiceRows.length >= 10) {
      return;
    }
    state.customServiceRows.push({ name: '', amount: '' });
    this.bumpStateVersion();
  }

  protected updateCustomServiceRow(itemId: string, index: number, field: 'name' | 'amount', value: string): void {
    const state = this.stateFor(itemId);
    const row = state.customServiceRows[index];
    if (!row) {
      return;
    }

    if (field === 'name') {
      row.name = value;
    } else {
      const formatted = this.formatNumericValue(value, true, false);
      row.amount = formatted ? `${formatted} Kč` : '';
    }

    this.bumpStateVersion();
  }

  protected serviceAmount(itemId: string, row: string): string {
    return this.stateFor(itemId).optionAmounts[row] || '';
  }

  protected setServiceAmount(itemId: string, row: string, value: string): void {
    const state = this.stateFor(itemId);
    const formatted = this.formatNumericValue(value, true, false);
    state.optionAmounts[row] = formatted ? `${formatted} Kč` : '';
    this.bumpStateVersion();
  }

  protected formatServiceAmountOnBlur(itemId: string, row: string): void {
    const state = this.stateFor(itemId);
    const formatted = this.formatNumericValue(state.optionAmounts[row] || '', true, true);
    state.optionAmounts[row] = formatted ? `${formatted} Kč` : '';
    this.bumpStateVersion();
  }

  protected serviceTotal(itemId: string, rows: string[]): string {
    const total = this.serviceTotalAmount(itemId, rows);
    return total > 0 ? `${this.formatCzechAmount(total)} Kč` : '';
  }

  protected combinedServiceTotal(firstItemId: string, firstRows: string[], secondItemId: string, secondRows: string[]): string {
    const total = this.serviceTotalAmount(firstItemId, firstRows) + this.serviceTotalAmount(secondItemId, secondRows);
    return total > 0 ? `${this.formatCzechAmount(total)} Kč` : '';
  }

  protected minimumRentText(item: ChecklistItem): string {
    if (!this.isMinimumRentField(item)) {
      return this.stateFor(item.id).textValue;
    }

    const section = this.sections().find((entry) => this.normalize(entry.name) === this.normalize(item.section));
    if (!section) {
      return '';
    }

    const totalCostsItem = section.items.find((entry) => {
      const label = this.normalize(entry.label);
      return label.includes('CELKOVA VYSE NAKLADU') && label.includes('ROZPISU SLUZEB');
    });
    const feeItem = this.findPodnajemFeeItem(section);

    const totalCosts = totalCostsItem ? this.parseAmount(this.stateFor(totalCostsItem.id).textValue) : 0;
    const feeTotal = feeItem ? this.parseAmount(this.stateFor(feeItem.id).textValue) : 0;
    const minimumTotal = totalCosts + feeTotal;

    if (minimumTotal <= 0) {
      return '';
    }

    return `${this.formatCzechAmount(minimumTotal)} Kč`;
  }

  protected recommendedDepositText(item: ChecklistItem): string {
    if (!this.isRecommendedDepositField(item)) {
      return this.stateFor(item.id).textValue;
    }

    const section = this.sections().find((entry) => this.normalize(entry.name) === this.normalize(item.section));
    if (!section) {
      return '';
    }

    const depositCompositionItem = section.items.find((entry) => {
      const label = this.normalize(entry.label);
      return label.includes('SLOZENI') && label.includes('KAUCE');
    });
    const includedItem = section.items.find((entry) => this.isRentIncludedList(entry));
    const requestedRentItem = section.items.find((entry) => {
      const label = this.normalize(entry.label);
      return label.includes('POZADOVANA') && label.includes('CENA') && label.includes('NAJMU');
    });

    if (!depositCompositionItem) {
      return '';
    }

    const selectedComposition = this.selectedOptionsList(depositCompositionItem.id)[0] || '';
    if (!selectedComposition) {
      return '';
    }

    const normalizedComposition = this.normalize(selectedComposition);
    const multiplier = this.kauceMultiplierFromSelection(selectedComposition);
    const includeServices = normalizedComposition.includes('SLUZBY') && !normalizedComposition.includes('BEZ SLUZEB');

    const requestedRent = requestedRentItem ? this.parseAmount(this.stateFor(requestedRentItem.id).textValue) : 0;
    const includedTotal = includedItem ? this.serviceTotalAmount(includedItem.id, this.serviceRows(includedItem)) : 0;
    const rentPart = requestedRent * multiplier;
    const servicesPart = includeServices ? includedTotal * multiplier : 0;
    const total = rentPart + servicesPart;

    return total > 0 ? `${this.formatCzechAmount(total)} Kč` : '';
  }

  protected totalCostsByServicesText(item: ChecklistItem): string {
    if (!this.isTotalCostsByServicesField(item)) {
      return this.stateFor(item.id).textValue;
    }

    const baseText = this.stateFor(item.id).textValue.trim();
    if (!baseText) {
      return '';
    }

    const section = this.sections().find((entry) => this.normalize(entry.name) === this.normalize(item.section));
    if (!section) {
      return baseText;
    }

    const includedItem = section.items.find((entry) => this.isRentIncludedList(entry));
    const excludedItem = section.items.find((entry) => this.isRentExcludedList(entry));
    const combinedTotal =
      (includedItem ? this.serviceTotalAmount(includedItem.id, this.serviceRows(includedItem)) : 0) +
      (excludedItem ? this.serviceTotalAmount(excludedItem.id, this.serviceRows(excludedItem)) : 0);
    const currentAmount = this.parseAmount(baseText);

    if (combinedTotal > 0 && Math.abs(currentAmount - combinedTotal) < 0.005) {
      return `${baseText} ✔️`;
    }

    return baseText;
  }

  protected profitText(item: ChecklistItem): string {
    if (!this.isProfitField(item)) {
      return this.stateFor(item.id).textValue;
    }

    const section = this.sections().find((entry) => this.normalize(entry.name) === this.normalize(item.section));
    if (!section) {
      return '';
    }

    const requestedRentItem = section.items.find((entry) => {
      const label = this.normalize(entry.label);
      return label.includes('POZADOVANA') && label.includes('CENA') && label.includes('NAJMU');
    });
    const minimumRentItem = section.items.find((entry) => this.isMinimumRentField(entry));

    const requestedRent = requestedRentItem ? this.parseAmount(this.stateFor(requestedRentItem.id).textValue) : 0;
    const minimumRent = minimumRentItem ? this.parseAmount(this.minimumRentText(minimumRentItem)) : 0;
    const profit = requestedRent - minimumRent;

    return profit > 0 ? `${this.formatCzechAmount(profit)} Kč` : '';
  }

  private kauceMultiplierFromSelection(value: string): number {
    const match = value.match(/(\d+)\s*x/i);
    if (!match) {
      return 1;
    }
    const parsed = Number.parseInt(match[1], 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  }

  private serviceTotalAmount(itemId: string, rows: string[]): number {
    const state = this.stateFor(itemId);
    const baseTotal = rows
      .map((row) => this.parseAmount(state.optionAmounts[row] || ''))
      .reduce((sum, value) => sum + value, 0);

    const customTotal = state.customServiceRows
      .map((row) => this.parseAmount(row.amount || ''))
      .reduce((sum, value) => sum + value, 0);

    const total = baseTotal + customTotal;
    return total;
  }

  protected isDimensionField(item: ChecklistItem): boolean {
    const label = this.normalize(item.label);
    if (this.shouldHideStandaloneRoomSizeField(item)) {
      return false;
    }
    return (
      this.isParcelAreaField(item) ||
      label.includes('VRATA') ||
      label.includes('MISTNOST') ||
      label.includes('PODLAHA') ||
      label.includes('ROZMERY SKLEPU') ||
      (label.includes('SKLEP') && label.includes('ROZMER')) ||
      label.includes('VYSKA STROPU') ||
      label.includes('(S X V)') ||
      label.includes('(S X H)') ||
      label.includes('(VPREDU X VZADU)') ||
      (label.includes('STROP') && label.includes('VPREDU') && label.includes('VZADU'))
    );
  }

  protected dimensionLabels(item: ChecklistItem): [string, string] {
    if (this.isParcelAreaField(item)) {
      return ['číslo parcely', 'm²'];
    }

    const label = this.normalize(item.label);
    if (label.includes('ROZMERY SKLEPU') || (label.includes('SKLEP') && label.includes('ROZMER'))) {
      return ['šířka', 'hloubka'];
    }
    if (label.includes('(S X H)')) {
      return ['šířka (C)', 'hloubka (D)'];
    }
    if (label.includes('(VPREDU X VZADU)') || label.includes('VYSKA STROPU') || label.includes('STROP')) {
      return ['vpředu (E)', 'vzadu (F)'];
    }
    return ['šířka (A)', 'výška (B)'];
  }

  protected isCellarDimensionField(item: ChecklistItem): boolean {
    const label = this.normalize(item.label);
    return label.includes('ROZMERY SKLEPU') || (label.includes('SKLEP') && label.includes('ROZMER'));
  }

  protected dimensionLabelsThree(item: ChecklistItem): [string, string, string] {
    if (this.isCellarDimensionField(item)) {
      return ['šířka', 'hloubka', 'm²'];
    }

    return ['rozměr 1', 'rozměr 2', 'rozměr 3'];
  }

  protected dimensionInputMode(item: ChecklistItem, which: 'first' | 'second'): 'text' | 'decimal' {
    if (this.isParcelAreaField(item) && which === 'first') {
      return 'text';
    }
    return 'decimal';
  }

  protected isGarageSection(section: Section): boolean {
    return this.normalize(section.name).includes('GARAZ');
  }

  protected textPlaceholder(item: ChecklistItem): string {
    if (this.isRealEstatePurposeField(item)) {
      const dynamic = this.printReportMeta().trim();
      return dynamic || 'pronajem bytu adresa';
    }

    if (!item.actionRaw) {
      return '';
    }

    const raw = item.actionRaw.trim();
    const upper = this.normalize(raw);
    const normalizedLabel = this.normalize(item.label);
    const normalizedSection = this.normalize(item.section);

    if (this.isOwnParkingField(item)) {
      return 'počet';
    }

    if (this.isMinimumRentField(item)) {
      return 'náklady na byt';
    }

    if (normalizedLabel.includes('POPLATEK') && normalizedLabel.includes('PODNAJEM')) {
      return 'Kč';
    }

    const placeholderMatch = raw.match(/placeholder\s*"([^"]+)"/i);
    if (placeholderMatch) {
      const basePlaceholder = this.normalizeDisplayText(placeholderMatch[1].trim());
      const suffixMatch = raw.match(/;\s*"([^"]+)"/);
      if (suffixMatch) {
        const suffixText = this.normalizeDisplayText(suffixMatch[1].trim());
        if (suffixText) {
          return `${basePlaceholder} ${suffixText}`.trim();
        }
      }
      return basePlaceholder;
    }

    if (!upper.includes('DOPSAT TEXT')) {
      return '';
    }

    if (this.isNumericText(item)) {
      return this.normalizeDisplayText(this.numericSuffix(item));
    }

    const idx = upper.indexOf('DOPSAT TEXT');
    const suffix = raw.slice(idx + 'DOPSAT TEXT'.length).trim();
    if (!suffix) {
      return '';
    }

    return this.normalizeDisplayText(suffix.replace(/^[\s,.:;\-]+/, ''));
  }

  protected purposePlaceholderRemainder(item: ChecklistItem): string {
    if (!this.isRealEstatePurposeField(item)) {
      return '';
    }

    const placeholder = this.textPlaceholder(item);
    const value = this.stateFor(item.id).textValue || '';
    if (!placeholder || !value) {
      return '';
    }

    const placeholderLower = placeholder.toLocaleLowerCase('cs');
    const valueLower = value.toLocaleLowerCase('cs');
    if (!placeholderLower.startsWith(valueLower)) {
      return '';
    }

    if (placeholderLower === valueLower) {
      return '';
    }

    return placeholder;
  }

  protected canCompletePurposeFromPlaceholder(item: ChecklistItem): boolean {
    if (!this.isRealEstatePurposeField(item)) {
      return false;
    }

    const placeholder = this.textPlaceholder(item).trim();
    const value = this.stateFor(item.id).textValue;
    const typed = value.replace(/^\s+|\s+$/g, '');

    if (!placeholder) {
      return false;
    }

    const placeholderLower = placeholder.toLocaleLowerCase('cs');
    const typedLower = typed.toLocaleLowerCase('cs');

    if (!placeholderLower.startsWith(typedLower)) {
      return false;
    }

    if (placeholderLower === typedLower) {
      return false;
    }

    return true;
  }

  protected completePurposeFromPlaceholder(item: ChecklistItem, event?: Event): void {
    event?.stopPropagation();
    if (!this.isRealEstatePurposeField(item)) {
      return;
    }

    const placeholder = this.textPlaceholder(item).trim();
    if (!placeholder) {
      return;
    }

    this.stateFor(item.id).textValue = placeholder;
    this.bumpStateVersion();
  }

  protected shouldHideDotaceJakyField(item: ChecklistItem): boolean {
    const section = this.normalize(item.section);
    const label = this.normalize(item.label);
    return section === 'DOTACE' && label === 'CERPANE DOTACE';
  }

  protected isNumericText(item: ChecklistItem): boolean {
    return this.normalize(item.actionRaw).includes('POUZE CISLA');
  }

  protected isDateTextField(item: ChecklistItem): boolean {
    const action = this.normalize(item.actionRaw);
    return action.includes('DOPSAT TEXT') && action.includes('DATUM');
  }

  protected numericInputMode(item: ChecklistItem): 'text' | 'numeric' | 'decimal' {
    if (this.isPhoneField(item)) {
      return 'text';
    }

    if (this.isDateTextField(item)) {
      return 'numeric';
    }

    if (!this.isNumericText(item)) {
      return 'text';
    }

    return this.allowDecimalComma(item) ? 'decimal' : 'numeric';
  }

  protected onTextValueChange(item: ChecklistItem, value: string): void {
    if (this.isMinimumRentField(item) || this.isRecommendedDepositField(item) || this.isProfitField(item)) {
      return;
    }

    if (this.isDimensionField(item)) {
      this.stateFor(item.id).textValue = value;
      return;
    }

    if (this.isDateTextField(item)) {
      this.stateFor(item.id).textValue = this.formatDateInput(value);
      return;
    }

    if (this.isPhoneField(item)) {
      this.stateFor(item.id).textValue = value;
      return;
    }

    if (!this.isNumericText(item)) {
      this.stateFor(item.id).textValue = value;
      return;
    }

    const rawValue = this.isTotalCostsByServicesField(item) ? value.replace(/\s*(CHECK|✔️)\s*$/i, '') : value;
    const formattedNumber = this.formatNumericValue(rawValue, this.allowDecimalComma(item), false);
    const suffix = this.numericSuffixForValue(item, formattedNumber);
    this.stateFor(item.id).textValue = formattedNumber ? `${formattedNumber}${suffix}` : '';
  }

  protected onTextBlur(item: ChecklistItem): void {
    if (this.isMinimumRentField(item) || this.isRecommendedDepositField(item) || this.isProfitField(item)) {
      return;
    }

    if (this.isDimensionField(item)) {
      return;
    }

    if (this.isDateTextField(item)) {
      const current = this.stateFor(item.id).textValue;
      this.stateFor(item.id).textValue = this.formatDateInput(current);
      return;
    }

    if (this.isPhoneField(item)) {
      return;
    }

    if (!this.isNumericText(item)) {
      return;
    }

    const current = this.isTotalCostsByServicesField(item)
      ? this.stateFor(item.id).textValue.replace(/\s*(CHECK|✔️)\s*$/i, '')
      : this.stateFor(item.id).textValue;
    const formattedNumber = this.formatNumericValue(current, this.allowDecimalComma(item), true);
    const suffix = this.numericSuffixForValue(item, formattedNumber);
    this.stateFor(item.id).textValue = formattedNumber ? `${formattedNumber}${suffix}` : '';
  }

  protected isAddressField(item: ChecklistItem): boolean {
    const section = this.normalize(item.section);
    const label = this.normalize(item.label);
    return (
      section === 'ADRESA' ||
      label === 'ADRESA NEMOVITOSTI' ||
      label === 'ADRESA' ||
      (section === 'ZAKLADNI INFORMACE' && label === 'ADRESA')
    );
  }

  protected shouldShowItemHeading(section: Section, item: ChecklistItem): boolean {
    if (this.isAddressField(item)) {
      return false;
    }

    const isEnergyClass = this.normalize(section.name).includes('ENERGETICKA TRIDA') || this.normalize(item.label).includes('ENERGETICKA TRIDA');
    if (isEnergyClass) {
      return true;
    }

    return section.items.length > 1 || this.isSecurityCameraItem(item);
  }

  protected itemHeadingText(item: ChecklistItem): string {
    if (this.isSecurityCameraItem(item)) {
      return 'Vlastní kamerový systém';
    }
    return item.label;
  }

  private isSecurityCameraItem(item: ChecklistItem): boolean {
    const section = this.normalize(item.section);
    const label = this.normalize(item.label);
    return section === 'ZABEZPECENI NEMOVITOSTI' && label.includes('KAMER');
  }

  protected isMultiLineText(item: ChecklistItem): boolean {
    const label = this.normalize(item.label);
    const section = this.normalize(item.section);

    const byLabel = (label.includes('PRODEJ NEMOVITOST') || label.includes('PRONAJEM NEMOVITOST')) && label.includes('OKOL');
    const bySection = (section.includes('PRODEJ NEMOVITOST') || section.includes('PRONAJEM NEMOVITOST')) && section.includes('OKOL');
    const averageRent = label.includes('PRUMERNA VYSE NAJMU V LOKALITE');

    return byLabel || bySection || averageRent;
  }

  protected isLocalMarketListField(item: ChecklistItem): boolean {
    const label = this.normalize(item.label);
    const section = this.normalize(item.section);

    const isSalesNearby = (label.includes('PRODEJ NEMOVITOST') || section.includes('PRODEJ NEMOVITOST')) && label.includes('OKOL');
    const isRentNearby = (label.includes('PRONAJEM NEMOVITOST') || section.includes('PRONAJEM NEMOVITOST')) && label.includes('OKOL');
    const isAverageRent = label.includes('PRUMERNA VYSE NAJMU V LOKALITE');

    return isSalesNearby || isRentNearby || isAverageRent;
  }

  protected isRemainingEquipment(item: ChecklistItem): boolean {
    return this.normalize(item.section) === 'VYBAVENI KTERE ZUSTAVA' || this.normalize(item.label) === 'VYBAVENI KTERE ZUSTAVA';
  }

  protected isEquipmentListField(item: ChecklistItem): boolean {
    const normalizedSection = this.normalize(item.section);
    const normalizedLabel = this.normalize(item.label);

    return (
      normalizedSection === 'VYBAVENI KTERE ZUSTAVA' ||
      normalizedLabel === 'VYBAVENI KTERE ZUSTAVA' ||
      normalizedSection === 'VYBAVENI KTERE NEZUSTAVA' ||
      normalizedLabel === 'VYBAVENI KTERE NEZUSTAVA'
    );
  }

  protected isSimpleMultiTextField(item: ChecklistItem): boolean {
    const label = this.normalize(item.label);
    const section = this.normalize(item.section);
    const isNearbyNotes = label.includes('ZAJIMAVOSTI') && label.includes('OKOLI');
    const isAdditionalInfo = section.includes('DOPLNKOVE') && section.includes('INFORMACE');
    return isNearbyNotes || isAdditionalInfo;
  }

  protected isNearestStopField(item: ChecklistItem): boolean {
    return this.normalize(item.label) === 'NEJBLIZSI ZASTAVKA';
  }

  protected isTimedTravelField(item: ChecklistItem): boolean {
    const action = this.normalize(item.actionRaw || item.action || '');
    const hasText = action.includes('DOPSAT TEXT');
    const hasUnit = action.includes('MIN') && action.includes('HOD');
    const hasMode =
      action.includes('CHUZE') ||
      action.includes('PANACK') ||
      action.includes('AUTO') ||
      action.includes('AUTOBUSOVA ZASTAVKA') ||
      (action.includes('🚶') || action.includes('🚗'));

    return hasText && hasUnit && hasMode;
  }

  protected isRoomSizeListField(item: ChecklistItem): boolean {
    const label = this.normalize(item.label);
    const section = this.normalize(item.section);
    const action = this.normalize(item.actionRaw || item.action || '');

    const hasRoomKeyword =
      label.includes('VELIKOST MISTNOST') ||
      label.includes('SEZNAM MISTNOST') ||
      section.includes('VELIKOST MISTNOST') ||
      section.includes('MISTNOSTI');
    const isMultiSelect = action.includes('LZE VYBRAT VICE POLOZEK ZE SEZNAMU');
    return hasRoomKeyword && isMultiSelect;
  }

  protected shouldHideStandaloneRoomSizeField(item: ChecklistItem): boolean {
    void item;
    return false;
  }

  protected isRoomSizeSection(section: Section): boolean {
    return this.normalize(section.name).includes('VELIKOST MISTNOST');
  }

  protected isRoomSizeValuesHostField(item: ChecklistItem): boolean {
    const label = this.normalize(item.label);
    return label.includes('VELIKOST MISTNOST') && !this.isRoomSizeListField(item);
  }

  protected roomSizeSourceItemId(item: ChecklistItem): string {
    const sourceItem = this.findRoomSizeSourceItem(item.section);
    return sourceItem?.id || '';
  }

  protected selectedRoomSizeOptionsForItem(item: ChecklistItem): string[] {
    const sourceItem = this.findRoomSizeSourceItem(item.section);
    if (!sourceItem) {
      return [];
    }
    return this.selectedRoomSizeOptions(sourceItem);
  }

  protected isRoomAreaTotalField(item: ChecklistItem): boolean {
    if (this.hasTextInputAction(item)) {
      return false;
    }

    return this.roomAreaCategoryFromLabel(item.label) !== null;
  }

  protected roomAreaTotalValueForItem(item: ChecklistItem): string {
    const category = this.roomAreaCategoryFromLabel(item.label);
    if (!category) {
      return '';
    }

    const sourceItem = this.findRoomSizeSourceItem(item.section);
    if (!sourceItem) {
      return '';
    }

    const selectedRooms = this.selectedRoomSizeOptions(sourceItem);
    const total = selectedRooms
      .filter((room) => this.roomAreaRuleForRoom(room)?.[category])
      .map((room) => this.roomAreaNumber(sourceItem.id, room))
      .filter((area) => area > 0)
      .reduce((sum, area) => sum + area, 0);

    return total > 0 ? `${this.formatCzechAmount(total)} m²` : '';
  }

  protected roomSizeOptions(item: ChecklistItem): string[] {
    return this.optionsForItem(item).filter((option) => !this.isCustomOption(option));
  }

  protected selectedRoomSizeOptions(item: ChecklistItem): string[] {
    const selected = this.stateFor(item.id).selectedOptions;
    return this.roomSizeOptions(item).filter((option) => selected.has(option));
  }

  protected roomDimensionValue(itemId: string, room: string, key: 'width' | 'length'): string {
    return this.stateFor(itemId).roomDimensions[room]?.[key] || '';
  }

  protected setRoomDimensionValue(itemId: string, room: string, key: 'width' | 'length', value: string): void {
    const state = this.stateFor(itemId);
    const current = state.roomDimensions[room] || { width: '', length: '' };
    const sanitized = this.sanitizeRoomDimension(value, false);
    delete state.roomAreas[room];
    state.roomDimensions[room] = { ...current, [key]: sanitized };
    this.bumpStateVersion();
  }

  protected onRoomDimensionBlur(itemId: string, room: string, key: 'width' | 'length'): void {
    const state = this.stateFor(itemId);
    const current = state.roomDimensions[room] || { width: '', length: '' };
    const formatted = this.sanitizeRoomDimension(current[key], true);
    state.roomDimensions[room] = { ...current, [key]: formatted };
    this.bumpStateVersion();
  }

  protected isRoomAreaManual(itemId: string, room: string): boolean {
    const raw = this.stateFor(itemId).roomAreas[room] || '';
    return this.parseDecimalNumber(raw.replace(/\s*m²?\s*$/i, '')) > 0;
  }

  protected roomAreaValue(itemId: string, room: string): string {
    const manual = (this.stateFor(itemId).roomAreas[room] || '').trim();
    if (manual) {
      return manual;
    }

    const area = this.roomAreaNumber(itemId, room);
    if (area <= 0) {
      return '';
    }
    return `${this.formatCzechAmount(area)} m²`;
  }

  protected setRoomAreaValue(itemId: string, room: string, value: string): void {
    const state = this.stateFor(itemId);
    const sanitized = this.sanitizeRoomArea(value, false);
    if (sanitized.trim().length > 0) {
      state.roomAreas[room] = sanitized;
    } else {
      delete state.roomAreas[room];
    }
    if (sanitized.trim().length > 0) {
      state.roomDimensions[room] = { width: '', length: '' };
    }
    this.bumpStateVersion();
  }

  protected onRoomAreaBlur(itemId: string, room: string): void {
    const state = this.stateFor(itemId);
    const formatted = this.sanitizeRoomArea(state.roomAreas[room] || '', true);
    if (formatted.trim().length > 0) {
      state.roomAreas[room] = formatted;
    } else {
      delete state.roomAreas[room];
    }
    this.bumpStateVersion();
  }

  protected roomAreaCategoryTotals(item: ChecklistItem): RoomAreaTotal[] {
    const categories: Array<{ key: keyof RoomAreaRule; label: string }> = [
      { key: 'podlahova', label: 'Podlahová plocha' },
      { key: 'obytna', label: 'Obytná plocha' },
      { key: 'uzitna', label: 'Užitná plocha' },
      { key: 'celkovaUzitna', label: 'Celková užitná plocha' }
    ];

    const selectedRooms = this.selectedRoomSizeOptions(item);
    const totals = categories.map((category) => {
      const total = selectedRooms
        .filter((room) => this.roomAreaRuleForRoom(room)?.[category.key])
        .map((room) => this.roomAreaNumber(item.id, room))
        .filter((area) => area > 0)
        .reduce((sum, area) => sum + area, 0);

      return {
        key: category.key,
        label: category.label,
        value: total > 0 ? `${this.formatCzechAmount(total)} m²` : ''
      };
    });

    return totals;
  }

  protected hasRoomAreaInfo(key: keyof RoomAreaRule): boolean {
    return (this.roomAreaInfo.get(key) || '').trim().length > 0;
  }

  protected roomAreaInfoText(key: keyof RoomAreaRule): string {
    return (this.roomAreaInfo.get(key) || '').trim();
  }

  protected isRoomAreaInfoOpen(key: keyof RoomAreaRule): boolean {
    return this.activeM2InfoKey() === key;
  }

  protected toggleRoomAreaInfo(key: keyof RoomAreaRule, event?: Event): void {
    event?.stopPropagation();
    this.activeM2InfoKey.set(this.activeM2InfoKey() === key ? '' : key);
  }

  protected nearestStopRows(itemId: string): Array<{ value: string; unit: 'min' | 'hod' | ''; mode: 'walk' | 'car' | '' }> {
    const state = this.stateFor(itemId);
    if (state.nearestStopRows.length === 0) {
      state.nearestStopRows.push({ value: '', unit: '', mode: '' });
    }
    return state.nearestStopRows;
  }

  protected addNearestStopRow(itemId: string): void {
    const rows = this.nearestStopRows(itemId);
    if (rows.length >= 10) {
      return;
    }
    rows.push({ value: '', unit: '', mode: '' });
    this.bumpStateVersion();
  }

  protected updateNearestStopValue(itemId: string, index: number, value: string): void {
    const rows = this.nearestStopRows(itemId);
    const row = rows[index];
    if (!row) {
      return;
    }

    row.value = value;
  }

  protected onNearestStopBlur(itemId: string, index: number): void {
    const rows = this.nearestStopRows(itemId);
    const row = rows[index];
    if (!row) {
      return;
    }

    row.value = this.formatNearestStopValue(row.value, row.unit);
    this.bumpStateVersion();
  }

  protected setNearestStopRowUnit(itemId: string, index: number, unit: 'min' | 'hod' | ''): void {
    const rows = this.nearestStopRows(itemId);
    const row = rows[index];
    if (!row) {
      return;
    }

    row.unit = unit;
    this.bumpStateVersion();
  }

  protected setNearestStopRowMode(itemId: string, index: number, mode: 'walk' | 'car' | ''): void {
    const rows = this.nearestStopRows(itemId);
    const row = rows[index];
    if (!row) {
      return;
    }

    row.mode = mode;
    this.bumpStateVersion();
  }

  protected travelMode(itemId: string): 'walk' | 'car' | '' {
    return this.stateFor(itemId).travelMode;
  }

  protected timedTravelValue(itemId: string): string {
    return this.stateFor(itemId).textValue;
  }

  protected setTimedTravelValue(itemId: string, value: string): void {
    this.stateFor(itemId).textValue = value;
  }

  protected onTimedTravelBlur(itemId: string): void {
    const state = this.stateFor(itemId);
    state.textValue = this.formatNearestStopValue(state.textValue || '', this.timedTravelUnit(itemId));
    this.bumpStateVersion();
  }

  protected timedTravelUnit(itemId: string): 'min' | 'hod' | '' {
    return this.stateFor(itemId).optionUnits['__timedTravel'] || '';
  }

  protected setTimedTravelUnit(itemId: string, unit: 'min' | 'hod' | ''): void {
    this.stateFor(itemId).optionUnits['__timedTravel'] = unit;
    this.bumpStateVersion();
  }

  protected timedTravelMode(itemId: string): 'walk' | 'car' | '' {
    return this.stateFor(itemId).travelMode;
  }

  protected setTimedTravelMode(itemId: string, mode: 'walk' | 'car' | ''): void {
    this.stateFor(itemId).travelMode = mode;
    this.bumpStateVersion();
  }

  protected setTravelMode(itemId: string, mode: 'walk' | 'car'): void {
    const state = this.stateFor(itemId);
    state.travelMode = state.travelMode === mode ? '' : mode;
    this.bumpStateVersion();
  }

  protected equipmentRows(itemId: string): string[] {
    const state = this.stateFor(itemId);
    if (state.customTextRows.length === 0) {
      state.customTextRows.push('');
    }
    return state.customTextRows;
  }

  protected updateEquipmentRow(itemId: string, index: number, value: string): void {
    const rows = this.equipmentRows(itemId);
    if (!rows[index] && rows[index] !== '') {
      return;
    }
    rows[index] = value;
  }

  protected onEquipmentRowBlur(): void {
    this.bumpStateVersion();
  }

  protected addEquipmentRow(itemId: string): void {
    const rows = this.equipmentRows(itemId);
    if (rows.length >= 10) {
      return;
    }
    rows.push('');
    this.bumpStateVersion();
  }

  protected moneyRows(itemId: string): Array<{ name: string; amount: string }> {
    const state = this.stateFor(itemId);
    if (state.customMoneyRows.length === 0) {
      state.customMoneyRows.push({ name: '', amount: '' });
    }
    return state.customMoneyRows;
  }

  protected updateMoneyRow(itemId: string, index: number, field: 'name' | 'amount', value: string): void {
    const rows = this.moneyRows(itemId);
    if (!rows[index]) {
      return;
    }

    if (field === 'amount') {
      const formatted = this.formatNumericValue(value, true, false);
      rows[index].amount = formatted ? `${formatted} Kč` : '';
    } else {
      rows[index].name = value;
    }

    this.bumpStateVersion();
  }

  protected addMoneyRow(itemId: string): void {
    const rows = this.moneyRows(itemId);
    if (rows.length >= 10) {
      return;
    }
    rows.push({ name: '', amount: '' });
    this.bumpStateVersion();
  }

  protected moneyRowsAverage(itemId: string): string {
    const rows = this.stateFor(itemId).customMoneyRows;
    const amounts = rows
      .map((row) => row.amount.trim())
      .filter((value) => value.length > 0)
      .map((value) => this.parseAmount(value));

    if (amounts.length === 0) {
      return '';
    }

    const sum = amounts.reduce((total, value) => total + value, 0);
    const average = sum / amounts.length;
    return `${this.formatCzechAmount(average)} Kč`;
  }

  protected showRentNote(item: ChecklistItem): boolean {
    const label = this.normalize(item.label);
    const isAverageRent = label.includes('PRUMERNA VYSE NAJMU V LOKALITE');
    const isRentNearby = label.includes('PRONAJEM NEMOVITOST') && label.includes('OKOL');
    return isAverageRent || isRentNearby;
  }

  protected onDimensionChange(item: ChecklistItem, which: 'first' | 'second' | 'third', value: string): void {
    const state = this.stateFor(item.id);
    if (this.isParcelAreaField(item)) {
      if (which === 'first') {
        state.dimensionFirst = value.trim();
      } else if (which === 'second') {
        const formatted = this.formatNumericValue(value, true, false);
        state.dimensionSecond = formatted ? `${formatted} m²` : '';
      }
      state.textValue = [state.dimensionFirst.trim(), state.dimensionSecond.trim()].filter(Boolean).join(', ');
      return;
    }

    if (which === 'third' && this.isCellarDimensionField(item)) {
      return;
    }
    const formatted = this.formatNumericValue(value, true, false);
    const withUnit = formatted ? `${formatted} m` : '';

    if (which === 'first') {
      state.dimensionFirst = withUnit;
    } else if (which === 'second') {
      state.dimensionSecond = withUnit;
    } else {
      state.dimensionThird = withUnit;
    }

    const a = state.dimensionFirst.trim();
    const b = state.dimensionSecond.trim();
    const c = this.isCellarDimensionField(item) ? this.cellarAreaValue(item.id) : state.dimensionThird.trim();
    state.textValue = [a, b, c].filter(Boolean).join(' x ');
  }

  protected onDimensionBlur(item: ChecklistItem, which: 'first' | 'second' | 'third'): void {
    const state = this.stateFor(item.id);
    if (this.isParcelAreaField(item)) {
      if (which === 'first') {
        state.dimensionFirst = state.dimensionFirst.trim();
      } else if (which === 'second') {
        const formatted = this.formatNumericValue(state.dimensionSecond, true, true);
        state.dimensionSecond = formatted ? `${formatted} m²` : '';
      }
      state.textValue = [state.dimensionFirst.trim(), state.dimensionSecond.trim()].filter(Boolean).join(', ');
      return;
    }

    if (which === 'third' && this.isCellarDimensionField(item)) {
      return;
    }
    const current = which === 'first' ? state.dimensionFirst : which === 'second' ? state.dimensionSecond : state.dimensionThird;
    const formatted = this.formatNumericValue(current, true, true);
    const withUnit = formatted ? `${formatted} m` : '';

    if (which === 'first') {
      state.dimensionFirst = withUnit;
    } else if (which === 'second') {
      state.dimensionSecond = withUnit;
    } else {
      state.dimensionThird = withUnit;
    }

    const a = state.dimensionFirst.trim();
    const b = state.dimensionSecond.trim();
    const c = this.isCellarDimensionField(item) ? this.cellarAreaValue(item.id) : state.dimensionThird.trim();
    state.textValue = [a, b, c].filter(Boolean).join(' x ');
  }

  protected cellarAreaValue(itemId: string): string {
    const state = this.stateFor(itemId);
    const width = this.parseDecimalNumber(this.stripMeterSuffix(state.dimensionFirst));
    const depth = this.parseDecimalNumber(this.stripMeterSuffix(state.dimensionSecond));
    if (width <= 0 || depth <= 0) {
      return '';
    }
    return `${this.formatCzechAmount(width * depth)} m²`;
  }

  protected parcelRows(itemId: string): Array<{ parcelNumber: string; parcelType: string; area: string }> {
    const rows = this.stateFor(itemId).customParcelRows;
    if (rows.length === 0) {
      rows.push({ parcelNumber: '', parcelType: '', area: '' });
    }
    return rows;
  }

  protected addParcelRow(itemId: string): void {
    this.parcelRows(itemId).push({ parcelNumber: '', parcelType: '', area: '' });
    this.syncParcelTotal(itemId);
  }

  protected setParcelNumber(itemId: string, index: number, value: string): void {
    const rows = this.parcelRows(itemId);
    rows[index].parcelNumber = value.trim();
    this.syncParcelTotal(itemId);
  }

  protected setParcelType(itemId: string, index: number, value: string): void {
    const rows = this.parcelRows(itemId);
    rows[index].parcelType = value.trim();
    this.syncParcelTotal(itemId);
  }

  protected setParcelArea(itemId: string, index: number, value: string): void {
    const rows = this.parcelRows(itemId);
    const formatted = this.formatNumericValue(value, true, false);
    rows[index].area = formatted ? `${formatted} m²` : '';
    this.syncParcelTotal(itemId);
  }

  protected blurParcelArea(itemId: string, index: number): void {
    const rows = this.parcelRows(itemId);
    const formatted = this.formatNumericValue(rows[index].area, true, true);
    rows[index].area = formatted ? `${formatted} m²` : '';
    this.syncParcelTotal(itemId);
  }

  protected parcelTotalAreaText(itemId: string): string {
    const total = this.parcelRows(itemId)
      .map((row) => this.parseDecimalNumber((row.area || '').replace(/\s*m²?\s*$/i, '')))
      .reduce((sum, value) => sum + value, 0);
    return total > 0 ? `${this.formatCzechAmount(total)} m²` : '';
  }

  private syncParcelTotal(itemId: string): void {
    const state = this.stateFor(itemId);
    state.textValue = this.parcelTotalAreaText(itemId);
  }

  protected toggleOption(item: ChecklistItem, option: string): void {
    this.setActiveSectionByItem(item);

    const itemId = item.id;
    const state = this.getState(itemId);
    if (state.selectedOptions.has(option)) {
      state.selectedOptions.delete(option);
      this.syncFiltersFromItem(item);
      this.bumpStateVersion();
      return;
    }

    if (this.isSingleSelect(item)) {
      state.selectedOptions.clear();
    }

    state.selectedOptions.add(option);
    this.syncFiltersFromItem(item);
    this.bumpStateVersion();
  }

  protected selectedSingleOption(itemId: string): string {
    const state = this.stateFor(itemId);
    return Array.from(state.selectedOptions)[0] || '';
  }

  protected setSingleSelectOption(item: ChecklistItem, value: string): void {
    this.setActiveSectionByItem(item);

    const state = this.stateFor(item.id);
    state.selectedOptions.clear();
    if (value) {
      state.selectedOptions.add(value);
    }

    this.bumpStateVersion();
  }

  protected combinedTextSelectionValue(item: ChecklistItem): string {
    const state = this.stateFor(item.id);
    const text = this.displayTextValue(item, state).trim();
    const selected = this.selectedSingleOption(item.id).trim();
    return [text, selected].filter(Boolean).join(' ');
  }

  private shouldPrintStandaloneTextValue(item: ChecklistItem): boolean {
    if (this.isInfrastructureField(item) || this.isNearestStopField(item) || this.isTimedTravelField(item) || this.isTextWithSelectionField(item)) {
      return true;
    }

    return !this.isSelection(item);
  }

  protected setYearOption(item: ChecklistItem, value: string): void {
    this.setSingleSelectOption(item, this.limitYearText(value));
  }

  private limitYearText(value: string): string {
    return value.slice(0, 12);
  }

  protected setYesNoOption(item: ChecklistItem, value: 'ANO' | 'NE'): void {
    this.setActiveSectionByItem(item);

    const state = this.stateFor(item.id);
    state.selectedOptions.clear();
    state.yesNo = state.yesNo === value ? null : value;
    this.bumpStateVersion();
  }

  protected selectedYesNoValue(item: ChecklistItem): YesNo {
    const state = this.stateFor(item.id);
    if (state.yesNo === 'ANO' || state.yesNo === 'NE') {
      return state.yesNo;
    }

    const selected = this.selectedOptionsList(item.id);
    const hasAno = selected.some((value) => this.normalize(value) === 'ANO');
    const hasNe = selected.some((value) => this.normalize(value) === 'NE');
    if (hasAno && !hasNe) {
      return 'ANO';
    }

    if (hasNe && !hasAno) {
      return 'NE';
    }

    const normalizedTextValue = this.normalize(state.textValue || '');
    if (normalizedTextValue === 'ANO' || normalizedTextValue === 'NE') {
      return normalizedTextValue as YesNo;
    }

    return null;
  }

  protected stateFor(itemId: string): ItemState {
    return this.getState(itemId);
  }

  protected clientTabIndices(): number[] {
    return Array.from({ length: this.clientCount() }, (_, index) => index);
  }

  protected currentClientIndex(): number {
    return this.activeClientIndex();
  }

  protected activateClientTab(index: number): void {
    if (index < 0 || index >= this.clientCount()) {
      return;
    }

    this.activeClientIndex.set(index);
  }

  protected canAddClient(): boolean {
    return this.clientCount() < 10;
  }

  protected addClient(): void {
    if (!this.canAddClient()) {
      return;
    }

    const nextIndex = this.clientCount();
    this.clientCount.set(nextIndex + 1);
    this.activeClientIndex.set(nextIndex);
  }

  protected clientTabLabel(index: number): string {
    const name = this.clientDisplayName(index);
    return name ? `Klient ${name}` : `Klient ${index + 1}`;
  }

  private clientDisplayName(index: number): string {
    return this.clientFieldValueAny(index, 'KLIENT', [
      'Jméno (jména) a Příjmení',
      'Jméno a příjmení',
      'Jméno (jména)',
      'Jméno'
    ]).trim();
  }

  private clientFieldValue(clientIndex: number, sectionName: string, labelName: string): string {
    const item = this.findItemBySectionAndLabel(sectionName, labelName);
    if (!item) {
      return '';
    }

    const targetId = this.normalize(sectionName) === 'KLIENT' ? this.clientScopedItemId(item.id, clientIndex) : item.id;
    const selected = this.selectedOptionsList(targetId);
    if (selected.length > 0) {
      return selected.join(', ');
    }

    const state = this.stateFor(targetId);
    if (state.yesNo) {
      return state.yesNo;
    }

    return this.displayTextValue(item, state).trim();
  }

  private clientFieldValueAny(clientIndex: number, sectionName: string, labelNames: string[]): string {
    for (const label of labelNames) {
      const value = this.clientFieldValue(clientIndex, sectionName, label);
      if (value.trim().length > 0) {
        return value;
      }
    }
    return '';
  }

  private clientHasSelectedOption(clientIndex: number, sectionName: string, labelName: string, option: string): boolean {
    const item = this.findItemBySectionAndLabel(sectionName, labelName);
    if (!item) {
      return false;
    }

    const targetId = this.normalize(sectionName) === 'KLIENT' ? this.clientScopedItemId(item.id, clientIndex) : item.id;
    const normalizedOption = this.normalize(option);
    return this.selectedOptionsList(targetId).some((selected) => this.normalize(selected) === normalizedOption);
  }

  private clientHasSelectedOptionAny(clientIndex: number, sectionName: string, labelNames: string[], option: string): boolean {
    return labelNames.some((label) => this.clientHasSelectedOption(clientIndex, sectionName, label, option));
  }

  private clientFieldYesNo(clientIndex: number, sectionName: string, labelName: string): YesNo {
    const item = this.findItemBySectionAndLabel(sectionName, labelName);
    if (!item) {
      return null;
    }

    const targetId = this.normalize(sectionName) === 'KLIENT' ? this.clientScopedItemId(item.id, clientIndex) : item.id;
    const yesNoState = this.stateFor(targetId).yesNo;
    if (yesNoState === 'ANO' || yesNoState === 'NE') {
      return yesNoState;
    }

    const selected = this.selectedOptionsList(targetId);
    const hasAno = selected.some((value) => this.normalize(value) === 'ANO');
    const hasNe = selected.some((value) => this.normalize(value) === 'NE');
    if (hasAno && !hasNe) {
      return 'ANO';
    }
    if (hasNe && !hasAno) {
      return 'NE';
    }

    const normalizedTextValue = this.normalize(this.stateFor(targetId).textValue || '');
    if (normalizedTextValue === 'ANO' || normalizedTextValue === 'NE') {
      return normalizedTextValue as YesNo;
    }

    return null;
  }

  protected sectionItemsForRender(section: Section): ChecklistItem[] {
    if (!this.isClientSection(section)) {
      return section.items;
    }

    const clientIndex = this.activeClientIndex();
    return section.items.map((item) => this.clientScopedItem(item, clientIndex));
  }

  protected shouldRenderItemCardForSection(section: Section, item: ChecklistItem): boolean {
    if (!this.isClientSection(section)) {
      return this.shouldRenderItemCard(section, item);
    }

    const clientIndex = this.clientIndexFromItemId(item.id);
    const baseItem = this.baseItemFromClientScopedItem(item);
    return this.shouldRenderItemCard(section, baseItem) && !this.shouldHideClientItemBySpecialRule(baseItem, clientIndex);
  }

  private shouldHideClientItemBySpecialRule(item: ChecklistItem, clientIndex: number): boolean {
    const raw = item.specialRule?.trim();
    if (!raw) {
      return false;
    }

    const lines = raw
      .split(/\n|;/)
      .map((part) => part.trim())
      .filter(Boolean);

    for (const line of lines) {
      const normalizedLine = this.normalize(line);
      if (!/SKRYT\s+KDYZ/.test(normalizedLine)) {
        continue;
      }

      const body = line.replace(/^\s*SKRYT\s+KDYZ\s*/iu, '').trim();
      const conditionMatch = body.match(/^([^!=]+)(!=|=)(.+)$/);
      if (!conditionMatch) {
        continue;
      }

      const scopedKey = conditionMatch[1].trim();
      const operator = conditionMatch[2];
      const valueRaw = conditionMatch[3].trim();
      const keyParts = scopedKey.split('.');
      if (keyParts.length < 2) {
        continue;
      }

      const sectionName = keyParts[0].trim();
      const labelName = keyParts.slice(1).join('.').trim();
      if (!sectionName || !labelName) {
        continue;
      }

      let targetItemId = '';
      if (this.normalize(sectionName) === 'KLIENT') {
        const clientItem = this.findItemBySectionAndLabel('KLIENT', labelName);
        if (!clientItem) {
          continue;
        }
        targetItemId = this.clientScopedItemId(clientItem.id, clientIndex);
      } else {
        const referencedItem = this.findItemBySectionAndLabel(sectionName, labelName);
        if (!referencedItem) {
          continue;
        }
        targetItemId = referencedItem.id;
      }

      const selectedValues = this.selectedOptionsList(targetItemId);
      if (selectedValues.length === 0) {
        const state = this.getState(targetItemId);
        if (state.yesNo) {
          selectedValues.push(state.yesNo);
        } else if (state.textValue.trim()) {
          selectedValues.push(state.textValue.trim());
        }
      }

      if (selectedValues.length === 0) {
        continue;
      }

      const expectedValues = valueRaw
        .split(/\||\//)
        .map((value) => value.replace(/["“”']/g, ' ').trim())
        .filter(Boolean);
      if (expectedValues.length === 0) {
        continue;
      }

      const hasMatch = selectedValues.some((selected) =>
        expectedValues.some((expected) => this.normalize(selected) === this.normalize(expected))
      );

      if (operator === '=' && hasMatch) {
        return true;
      }

      if (operator === '!=' && !hasMatch) {
        return true;
      }
    }

    return false;
  }

  protected hasItemInfo(item: ChecklistItem): boolean {
    return item.info.trim().length > 0;
  }

  protected itemInfoText(item: ChecklistItem): string {
    const cleaned = item.info
      .replace(/^\uFEFF/, '')
      .replace(/^[\s\u00A0]+/g, '')
      .replace(/^(\r?\n)+/g, '')
      .trimEnd();

    return cleaned
      .split(/\r?\n/)
      .map((line) => line.replace(/^[\s\u00A0_]+/, ''))
      .join('\n');
  }

  protected itemInfoHtml(item: ChecklistItem): string {
    const text = this.itemInfoText(item);
    const lines = text.split(/\r?\n/);

    return lines
      .map((line) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return '';
        }

        const match = trimmed.match(/^([^:–—-]+)\s*([:–—-])\s*(.*)$/);
        if (!match) {
          return this.renderInlineBold(trimmed);
        }

        const prefix = this.renderInlineBold(match[1].trim());
        const separator = this.escapeHtml(match[2]);
        const suffix = this.renderInlineBold(match[3].trim());
        return `<strong>${prefix}</strong> ${separator} ${suffix}`;
      })
      .join('<br>');
  }

  private renderInlineBold(value: string): string {
    const escaped = this.escapeHtml(value);
    return escaped.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  }

  protected isItemInfoOpen(itemId: string): boolean {
    return this.activeInfoItemId() === itemId;
  }

  protected toggleItemInfo(itemId: string, event?: Event): void {
    event?.stopPropagation();
    this.activeInfoItemId.set(this.activeInfoItemId() === itemId ? '' : itemId);
  }

  protected startCustomOptionEdit(itemId: string): void {
    const item = this.findItemById(itemId);
    if (item) {
      this.setActiveSectionByItem(item);
    }

    const state = this.getState(itemId);
    state.customOptionDraft = state.customOptionText;
    state.customOptionEditing = true;
  }

  protected activateSectionByItemId(itemId: string): void {
    const item = this.findItemById(itemId);
    if (item) {
      this.setActiveSectionByItem(item);
    }
  }

  protected saveCustomOption(itemId: string): void {
    const state = this.getState(itemId);
    state.customOptionText = state.customOptionDraft.trim();
    state.customOptionEditing = false;

    const item = this.findItemById(itemId);
    if (item) {
      this.syncFiltersFromItem(item);
    }

    this.bumpStateVersion();
  }

  protected hasCustomOptionValue(itemId: string): boolean {
    return this.getState(itemId).customOptionText.trim().length > 0;
  }

  protected customOptionDisplayText(item: ChecklistItem): string {
    const value = this.getState(item.id).customOptionText.trim();
    return value || this.customOptionPlaceholder(item);
  }

  protected customOptionPlaceholder(item: ChecklistItem): string {
    const section = this.normalize(item.section);
    const label = this.normalize(item.label);
    if (section === 'ZABEZPECENI NEMOVITOSTI' && label.includes('KAMER')) {
      return 'Vlastní kamerový systém';
    }
    return this.customOptionLabel;
  }

  protected autoResizeCustomOption(event: Event): void {
    const element = event.target as HTMLTextAreaElement | null;
    if (!element) {
      return;
    }

    element.style.height = 'auto';
    element.style.height = `${element.scrollHeight}px`;
  }

  protected isOptionSelected(itemId: string, option: string): boolean {
    return this.getState(itemId).selectedOptions.has(option);
  }

  protected selectedOptionsList(itemId: string): string[] {
    const state = this.getState(itemId);
    const options = Array.from(state.selectedOptions);
    if (state.customOptionText.trim()) {
      options.push(state.customOptionText.trim());
    }
    return options;
  }

  protected hasValue(item: ChecklistItem): boolean {
    if (this.isMinimumRentField(item)) {
      return this.minimumRentText(item).trim().length > 0;
    }

    if (this.isRecommendedDepositField(item)) {
      return this.recommendedDepositText(item).trim().length > 0;
    }

    if (this.isProfitField(item)) {
      return this.profitText(item).trim().length > 0;
    }

    if (this.isRoomSizeValuesHostField(item)) {
      return this.selectedRoomSizeOptionsForItem(item).length > 0;
    }

    if (this.isRoomAreaTotalField(item)) {
      return this.roomAreaTotalValueForItem(item).trim().length > 0;
    }

    const state = this.getState(item.id);
    return (
      state.selectedOptions.size > 0 ||
      state.customOptionText.trim().length > 0 ||
      state.dimensionFirst.trim().length > 0 ||
      state.dimensionSecond.trim().length > 0 ||
      state.dimensionThird.trim().length > 0 ||
      Object.values(state.optionAmounts).some((value) => value.trim().length > 0) ||
      state.customServiceRows.some((row) => row.name.trim().length > 0 || row.amount.trim().length > 0) ||
      state.customTextRows.some((row) => row.trim().length > 0) ||
      state.nearestStopRows.some((row) => row.value.trim().length > 0 || row.mode !== '') ||
      state.travelMode !== '' ||
      state.customReconstructionRows.some((row) => row.name.trim().length > 0 || row.year.trim().length > 0) ||
      Object.values(state.optionTexts).some((value) => value.trim().length > 0) ||
      Object.values(state.optionModes).some((value) => value !== '') ||
      state.customInfrastructureRows.some((row) => row.value.trim().length > 0 || row.mode !== '') ||
      Object.values(state.roomDimensions).some((row) => row.width.trim().length > 0 || row.length.trim().length > 0) ||
      Object.values(state.roomAreas).some((value) => value.trim().length > 0) ||
      state.floorPlanPhotos.length > 0 ||
      state.customParcelRows.some((row) => row.parcelNumber.trim().length > 0 || row.parcelType.trim().length > 0 || row.area.trim().length > 0) ||
      state.customMoneyRows.some((row) => row.name.trim().length > 0 || row.amount.trim().length > 0) ||
      state.textValue.trim().length > 0 ||
      state.checked ||
      state.yesNo !== null ||
      state.dateValue.trim().length > 0
    );
  }

  protected sectionSelectedValues(section: Section, itemFilter?: (item: ChecklistItem) => boolean): string[] {
    const values: string[] = [];
    const seen = new Set<string>();

    const addUnique = (value: string): void => {
      const trimmed = value.trim();
      if (!trimmed) {
        return;
      }

      const key = this.normalize(trimmed);
      if (seen.has(key)) {
        return;
      }

      seen.add(key);
      values.push(trimmed);
    };

    if (this.normalize(section.name) === 'POZEMEK V NAJMU') {
      const leaseSummary = this.pozemekVNajmuSummary(section);
      if (leaseSummary) {
        values.push(leaseSummary);
      }
    }

    if (this.normalize(section.name) === 'PRODEJ') {
      const podnajemSummary = this.prodejPodnajemSummary(section);
      if (podnajemSummary) {
        values.push(podnajemSummary);
      }
    }

    if (this.normalize(section.name) === 'PRONAJEM') {
      const podnajemSummary = this.pronajemPodnajemSummary(section);
      if (podnajemSummary) {
        values.push(podnajemSummary);
      }
    }

    for (const item of section.items) {
      if (itemFilter && !itemFilter(item)) {
        continue;
      }

      if (this.normalize(section.name) === 'POZEMEK V NAJMU' && this.normalize(item.label) === 'CENA NAJMU') {
        continue;
      }

      const state = this.getState(item.id);
      const selected = Array.from(state.selectedOptions);
      const hasCustom = state.customOptionText.trim();

      const normalizedLabel = this.normalize(item.label);
      const isPodnajemFee = normalizedLabel.includes('POPLATEK') && normalizedLabel.includes('PODNAJEM');
      if ((this.normalize(section.name) === 'PRODEJ' || this.normalize(section.name) === 'PRONAJEM') && isPodnajemFee) {
        continue;
      }

      if (selected.length > 0 && !this.isTextWithSelectionField(item)) {
        const electricityValues = selected
          .map((value) => this.formatElectricitySummaryValue(item, value))
          .filter((value) => value.length > 0);
        if (electricityValues.length > 0) {
          electricityValues.forEach((value) => addUnique(value));
        } else if (this.isRoomSizeListField(item)) {
          // handled below with per-room dimensions
        } else if (this.isYearSelection(item)) {
          addUnique(`${item.label}: ${selected.map((value) => this.formatSelectedValueForPrint(item, value)).join(', ')}`);
        } else if (this.normalize(item.label).includes('SKLEP JE ZDENY ZE X STRAN')) {
          selected.forEach((value) => {
            const normalizedValue = this.normalize(value);
            if (normalizedValue.startsWith('1 ')) {
              addUnique('Sklep je zděný z 1 strany');
            } else {
              addUnique(`Sklep je zděný ze ${value}`);
            }
          });
        } else {
          const label = item.label.trim();
          const selectedFormatted = selected.map((value) => this.formatSelectedValueForPrint(item, value));
          if (label) {
            addUnique(`${label}: ${selectedFormatted.join(', ')}`);
          } else {
            addUnique(selectedFormatted.join(', '));
          }
        }
      }

      if (hasCustom) {
        const label = item.label.trim();
        addUnique(label ? `${label}: ${hasCustom}` : hasCustom);
      }

      if (this.isInfrastructureField(item)) {
        this.infrastructureRows(item).forEach((row) => {
          const value = (state.optionTexts[row] || '').trim();
          const mode = state.optionModes[row] || '';
          const unit = state.optionUnits[row] || 'min';
          if (!value && !mode) {
            return;
          }

          const icon = mode === 'walk' ? '🚶' : mode === 'car' ? '🚘' : '';
          const valueWithUnit = value ? `${value} ${unit}` : unit;
          addUnique(icon ? `${row}: ${valueWithUnit} ${icon}`.trim() : `${row}: ${valueWithUnit}`.trim());
        });

        state.customInfrastructureRows.forEach((row) => {
          const value = row.value.trim();
          const mode = row.mode;
          const unit = row.unit || 'min';
          if (!value && !mode) {
            return;
          }

          const icon = mode === 'walk' ? '🚶' : mode === 'car' ? '🚘' : '';
          const valueWithUnit = value ? `${value} ${unit}` : unit;
          addUnique(icon ? `Vlastní položka: ${valueWithUnit} ${icon}`.trim() : `Vlastní položka: ${valueWithUnit}`.trim());
        });
      } else if (this.isTimedTravelField(item)) {
        const value = state.textValue.trim();
        const mode = state.travelMode;
        const unit = state.optionUnits['__timedTravel'] || 'min';
        if (value || mode) {
          const icon = mode === 'walk' ? '🚶' : mode === 'car' ? '🚘' : '';
          const valueWithUnit = value ? `${value} ${unit}` : unit;
          addUnique(icon ? `${item.label}: ${valueWithUnit} ${icon}`.trim() : `${item.label}: ${valueWithUnit}`.trim());
        }
      } else {
        Object.entries(state.optionTexts)
          .filter(([, year]) => year.trim().length > 0)
          .forEach(([row, year]) => addUnique(`${row}: ${year}`));
      }

      if (this.isRoomSizeListField(item)) {
        this.selectedRoomSizeOptions(item).forEach((room) => {
          const area = this.roomAreaValue(item.id, room);
          const dims = this.stateFor(item.id).roomDimensions[room] || { width: '', length: '' };
          const width = this.compactRoomDimension(dims.width);
          const length = this.compactRoomDimension(dims.length);
          if (area) {
            addUnique(`${room}: ${width}x${length}m (${this.compactAreaText(area)})`);
            return;
          }

          if (width || length) {
            addUnique(`${room}: ${width}x${length}m`.trim());
          } else {
            addUnique(room);
          }
        });
      }

      state.customReconstructionRows
        .filter((row) => row.name.trim().length > 0 || row.year.trim().length > 0)
        .forEach((row) => {
          if (row.name.trim() && row.year.trim()) {
            addUnique(`${row.name.trim()}: ${row.year.trim()}`);
          } else if (row.name.trim()) {
            addUnique(row.name.trim());
          } else if (row.year.trim()) {
            addUnique(row.year.trim());
          }
        });

      state.customMoneyRows
        .filter((row) => row.name.trim().length > 0 || row.amount.trim().length > 0)
        .forEach((row) => {
          if (row.name.trim() && row.amount.trim()) {
            addUnique(`${row.name.trim()}: ${row.amount.trim()}`);
          } else if (row.name.trim()) {
            addUnique(row.name.trim());
          } else if (row.amount.trim()) {
            addUnique(row.amount.trim());
          }
        });

      state.customServiceRows
        .filter((row) => row.name.trim().length > 0 || row.amount.trim().length > 0)
        .forEach((row) => {
          if (row.name.trim() && row.amount.trim()) {
            addUnique(`${row.name.trim()}: ${row.amount.trim()}`);
          } else if (row.name.trim()) {
            addUnique(row.name.trim());
          } else if (row.amount.trim()) {
            addUnique(row.amount.trim());
          }
        });

      if (this.isParcelAreaField(item)) {
        const parcelValues = this.parcelRows(item.id)
          .filter((row) => row.parcelNumber.trim().length > 0 || row.parcelType.trim().length > 0 || row.area.trim().length > 0)
          .map((row) => [row.parcelNumber.trim(), row.parcelType.trim(), row.area.trim()].filter(Boolean).join(' | '))
          .filter((value) => value.length > 0);

        if (parcelValues.length > 0) {
          addUnique(`${item.label}: ${parcelValues.join(' || ')}`);
        }
      }

      const customTextValues = state.customTextRows
        .map((row) => row.trim())
        .filter((row) => row.length > 0);

      if (customTextValues.length > 0) {
        const label = item.label.trim();
        const joined = customTextValues.join(', ');
        addUnique(label ? `${label}: ${joined}` : joined);
      }

      if (this.isNearestStopField(item)) {
        state.nearestStopRows
          .filter((row) => row.value.trim().length > 0)
          .forEach((row) => {
            const icon = row.mode === 'walk' ? '🚶' : row.mode === 'car' ? '🚘' : '';
            const unit = row.unit || 'min';
            const valueWithUnit = `${row.value.trim()} ${unit}`;
            addUnique(icon ? `${item.label}: ${valueWithUnit} ${icon}` : `${item.label}: ${valueWithUnit}`);
          });
      }

      if (state.yesNo) {
        addUnique(`${item.label}: ${state.yesNo}`);
      }

      if ((state.textValue.trim() || (this.isTextWithSelectionField(item) && selected.length > 0)) && !this.isParcelAreaField(item) && this.shouldPrintStandaloneTextValue(item)) {
        if (this.isNearestStopField(item)) {
          const icon = state.travelMode === 'walk' ? '🚶' : state.travelMode === 'car' ? '🚘' : '';
          addUnique(icon ? `${item.label}: ${icon} ${state.textValue.trim()}` : `${item.label}: ${state.textValue.trim()}`);
          continue;
        }

        if (this.isTimedTravelField(item)) {
          continue;
        }

        if (this.normalize(item.label).includes('SKLEP ZDENY')) {
          addUnique(`Sklep je zděný ze ${this.displayTextValue(item, state)}`);
        } else if (this.isAddressField(item)) {
          addUnique(`Adresa nemovitosti: ${this.displayTextValue(item, state)}`);
        } else {
          addUnique(`${item.label}: ${this.combinedTextSelectionValue(item) || this.displayTextValue(item, state)}`);
        }
      }

      if (state.checked) {
        addUnique(item.label);
      }
    }

    return values;
  }

  private formatElectricitySummaryValue(item: ChecklistItem, value: string): string {
    if (this.normalize(item.section) !== 'ELEKTRINA') {
      return '';
    }

    const label = this.normalize(item.label);
    const normalizedValue = this.normalize(value);

    if (label === 'STAV') {
      const isWiringType =
        normalizedValue === 'ELEKTRINA HLINIK' ||
        normalizedValue === 'ELEKTRINA MED' ||
        normalizedValue === 'ELEKTRINA HLINIK I MED';

      if (isWiringType) {
        return `Vedení v: ${value}`;
      }
    }

    if (label === 'ELEKTRINA ZAVEDENA' || label === 'VEDENI') {
      return `Elektřina zavedena: ${value}`;
    }

    return '';
  }

  private formatSelectedValueForPrint(item: ChecklistItem, value: string): string {
    const raw = value.trim();
    if (!raw) {
      return raw;
    }

    const label = this.normalize(item.label);
    if (!label.includes('ORIENTACE')) {
      return raw;
    }

    const byKey: Record<string, string> = {
      S: 'Sever',
      J: 'Jih',
      V: 'Východ',
      Z: 'Západ',
      SV: 'Severovýchod',
      SZ: 'Severozápad',
      JV: 'Jihovýchod',
      JZ: 'Jihozápad'
    };

    const normalized = this.normalize(raw);
    return byKey[normalized] || raw;
  }

  protected sectionHasAnyValue(section: Section): boolean {
    return section.items.some((item) => this.hasValue(item));
  }

  private pozemekVNajmuSummary(section: Section): string {
    const rentItem = section.items.find((item) => this.normalize(item.label) === 'CENA NAJMU');
    if (!rentItem) {
      return '';
    }

    const rentState = this.getState(rentItem.id);
    const amount = rentState.textValue.trim();
    if (!amount) {
      return '';
    }

    const period = Array.from(rentState.selectedOptions)[0]?.trim() || '';
    return period ? `Cena nájmu: ${amount} / ${period}` : `Cena nájmu: ${amount}`;
  }

  private prodejPodnajemSummary(section: Section): string {
    const feeItem = this.findPodnajemFeeItem(section);
    if (!feeItem) {
      return '';
    }

    const state = this.getState(feeItem.id);
    const amount = state.textValue.trim();
    if (!amount) {
      return '';
    }

    const period = Array.from(state.selectedOptions)[0]?.trim() || '';
    return period ? `Poplatek za podnájem: ${amount} / ${period}` : `Poplatek za podnájem: ${amount}`;
  }

  private pronajemPodnajemSummary(section: Section): string {
    const feeItem = this.findPodnajemFeeItem(section);
    if (!feeItem) {
      return '';
    }

    const state = this.getState(feeItem.id);
    const amount = state.textValue.trim();
    if (!amount) {
      return '';
    }

    const period = Array.from(state.selectedOptions)[0]?.trim() || '';
    return period ? `Poplatek za podnájem: ${amount} / ${period}` : `Poplatek za podnájem: ${amount}`;
  }

  private findPodnajemFeeItem(section: Section): ChecklistItem | undefined {
    return section.items.find((item) => {
      const label = this.normalize(item.label);
      return label.includes('POPLATEK') && label.includes('PODNAJEM');
    });
  }

  protected isSectionCollapsed(section: Section): boolean {
    return false;
  }

  protected toggleSection(section: Section): void {
    this.activeSectionKey.set(this.sectionKey(section));
  }

  protected isActiveSection(section: Section): boolean {
    const activeKey = this.activeSectionKey();
    if (!activeKey) {
      const first = this.filteredSections()[0];
      return !!first && this.sectionKey(first) === this.sectionKey(section);
    }
    return this.sectionKey(section) === activeKey;
  }

  protected visibleSectionIndex(): number {
    const groups = this.sectionGroups();
    if (groups.length === 0) {
      return -1;
    }

    const activeKey = this.activeGroupKey();
    if (!activeKey) {
      return 0;
    }

    const index = groups.findIndex((group) => group.key === activeKey);
    return index >= 0 ? index : 0;
  }

  protected activatePreviousSection(): void {
    const groups = this.sectionGroups();
    const index = this.visibleSectionIndex();
    if (groups.length === 0 || index <= 0) {
      return;
    }

    this.activeGroupKey.set(groups[index - 1].key);
  }

  protected activateNextSection(): void {
    const groups = this.sectionGroups();
    const index = this.visibleSectionIndex();
    if (groups.length === 0 || index < 0 || index >= groups.length - 1) {
      return;
    }

    this.activeGroupKey.set(groups[index + 1].key);
  }

  protected canGoPreviousSection(): boolean {
    return this.visibleSectionIndex() > 0;
  }

  protected canGoNextSection(): boolean {
    const groups = this.sectionGroups();
    const index = this.visibleSectionIndex();
    return groups.length > 0 && index >= 0 && index < groups.length - 1;
  }

  protected sectionProgressLabel(): string {
    const groups = this.sectionGroups();
    const index = this.visibleSectionIndex();
    if (groups.length === 0 || index < 0) {
      return '';
    }
    return `${index + 1} / ${groups.length}`;
  }

  protected activateGroup(groupKey: string): void {
    this.activeGroupKey.set(groupKey);
  }

  protected isActiveGroup(groupKey: string): boolean {
    const active = this.activeGroupKey();
    if (!active) {
      return this.sectionGroups()[0]?.key === groupKey;
    }
    return active === groupKey;
  }

  protected isBasicGroupActive(): boolean {
    return false;
  }

  protected isAdditionalSpacesGroupActive(): boolean {
    return false;
  }

  protected isGroupCompleted(group: SectionGroup): boolean {
    if (!group.sections.length) {
      return false;
    }

    return group.sections.every((section) => section.items.every((item) => this.hasValue(item)));
  }

  protected sectionHasUnfilledItems(section: Section): boolean {
    return section.items.some((item) => !this.hasValue(item));
  }

  protected sectionsForRender(): Section[] {
    if (!this.printInProgress()) {
      return this.displayedSections();
    }

    const sections = this.filteredSections();
    if (this.isBuyerCompactPrintMode()) {
      return this.compactOrderedSections(sections);
    }

    return sections;
  }

  protected isHandoverProtocolSection(section: Section): boolean {
    return this.normalize(section.name) === 'PREDAVACI PROTOKOL';
  }

  protected handoverFieldGroups(section: Section): Array<{ title: string; items: ChecklistItem[] }> {
    const groups: Array<{ title: string; items: ChecklistItem[] }> = [];
    const byTitle = new Map<string, { title: string; items: ChecklistItem[] }>();

    for (const item of section.items) {
      const title = item.label.trim();
      if (!title) {
        continue;
      }

      const key = this.normalize(title);

      if (key === 'V ZASTOUPENI') {
        groups.push({ title, items: [item] });
        continue;
      }

      const existing = byTitle.get(key);
      if (existing) {
        existing.items.push(item);
        continue;
      }

      const group = { title, items: [item] };
      byTitle.set(key, group);
      groups.push(group);
    }

    return groups;
  }

  protected isHandoverPersonGroup(title: string): boolean {
    const normalized = this.normalize(title);
    return normalized.startsWith('PREDAVAJICI') || normalized.startsWith('PREBIRAJICI') || normalized === 'V ZASTOUPENI';
  }

  protected isHandoverRepresentedGroup(title: string): boolean {
    return this.normalize(title) === 'V ZASTOUPENI';
  }

  protected handoverGroupUsesToggle(group: { title: string; items: ChecklistItem[] }): boolean {
    return group.items.some((item) => this.isToggleAction(item));
  }

  private isToggleAction(item: ChecklistItem): boolean {
    return this.normalize(item.actionRaw || item.action || '').includes('TOGGLE');
  }

  protected handoverGroupToggleEnabled(group: { title: string; items: ChecklistItem[] }): boolean {
    if (!this.handoverGroupUsesToggle(group)) {
      return true;
    }
    const anchor = group.items[0];
    return !!anchor && this.stateFor(anchor.id).checked;
  }

  protected setHandoverGroupToggleEnabled(group: { title: string; items: ChecklistItem[] }, enabled: boolean): void {
    if (!this.handoverGroupUsesToggle(group)) {
      return;
    }
    const anchor = group.items[0];
    if (!anchor) {
      return;
    }
    this.stateFor(anchor.id).checked = enabled;
  }

  protected shouldShowHandoverGroupFields(group: { title: string; items: ChecklistItem[] }): boolean {
    return this.isHandoverPersonExpanded(group.title) && this.handoverGroupToggleEnabled(group);
  }

  protected handoverInputItems(group: { title: string; items: ChecklistItem[] }): ChecklistItem[] {
    return group.items.filter((item) => this.shouldRenderHandoverInputItem(item));
  }

  private shouldRenderHandoverInputItem(item: ChecklistItem): boolean {
    if (this.isToggleAction(item)) {
      return false;
    }

    return this.isText(item) || this.isDate(item);
  }

  protected shouldUseSingleHandoverInput(group: { title: string; items: ChecklistItem[] }): boolean {
    return this.handoverInputItems(group).length <= 1;
  }

  protected isCollapsibleHandoverPerson(title: string): boolean {
    return false;
  }

  protected isHandoverPersonExpanded(title: string): boolean {
    return true;
  }

  protected toggleHandoverPersonExpanded(title: string): void {
    return;
  }

  protected setHandoverPersonExpanded(title: string, expanded: boolean): void {
    return;
  }

  protected handoverPersonPlaceholders(title: string): string[] {
    const base = ['Jméno', 'Bytem', 'E-mail', 'Telefon', 'Bankovní spojení', 'Rodinný stav'];
    if (this.isHandoverRepresentedGroup(title)) {
      return ['Jméno', 'Datum narození', 'Bytem', 'E-mail', 'Telefon', 'Bankovní spojení', 'Rodinný stav'];
    }
    return base;
  }

  protected handoverPersonValue(group: { title: string; items: ChecklistItem[] }, index: number): string {
    const anchor = group.items[0];
    if (!anchor) {
      return '';
    }
    const rows = this.stateFor(anchor.id).customTextRows;
    return rows[index] || '';
  }

  protected handoverPersonPlaceholder(group: { title: string; items: ChecklistItem[] }, index: number, fallback: string): string {
    const prefill = this.handoverPrefillValue(group, index).trim();
    return prefill || fallback;
  }

  protected canApplyHandoverPrefill(group: { title: string; items: ChecklistItem[] }, index: number): boolean {
    const prefill = this.handoverPrefillValue(group, index).trim();
    if (!prefill) {
      return false;
    }
    return this.handoverPersonValue(group, index).trim() !== prefill;
  }

  protected applyHandoverPrefill(group: { title: string; items: ChecklistItem[] }, index: number, event?: Event): void {
    event?.stopPropagation();
    const prefill = this.handoverPrefillValue(group, index).trim();
    if (!prefill) {
      return;
    }
    this.setHandoverPersonValue(group, index, prefill);
  }

  private handoverPrefillValue(group: { title: string; items: ChecklistItem[] }, index: number): string {
    if (this.normalize(group.title) !== 'PREDAVAJICI 1') {
      if (this.normalize(group.title) === 'CISLO PRIPADU') {
        return this.fieldValueAny('ZÁKLADNÍ INFORMACE', ['Číslo případu']).trim();
      }
      return '';
    }

    if (index === 0) {
      return this.fieldValueAny('KLIENT', ['Jméno (jména) a Příjmení', 'Jméno a příjmení']).trim();
    }

    if (index === 1) {
      return this.fieldValueAny('KLIENT', ['Trvalý nebo jiný pobyt', 'Trvalý pobyt']).trim();
    }

    if (index === 2) {
      return this.fieldValueAny('KLIENT', ['E-mail', 'Email']).trim();
    }

    if (index === 3) {
      return this.fieldValueAny('KLIENT', ['Kontaktní telefon', 'Telefon']).trim();
    }

    if (index === 4) {
      return this.fieldValueAny('KLIENT', ['Bankovní spojení', 'Číslo účtu', 'Bankovní účet']).trim();
    }

    if (index === 5) {
      return this.fieldValueAny('KLIENT', ['Rodinný stav']).trim();
    }

    return '';
  }

  protected handoverRepresentedEnabled(group: { title: string; items: ChecklistItem[] }): boolean {
    const anchor = group.items[0];
    if (!anchor) {
      return false;
    }
    return this.stateFor(anchor.id).checked;
  }

  protected setHandoverRepresentedEnabled(group: { title: string; items: ChecklistItem[] }, enabled: boolean): void {
    const anchor = group.items[0];
    if (!anchor) {
      return;
    }
    this.stateFor(anchor.id).checked = enabled;
  }

  protected setHandoverPersonValue(group: { title: string; items: ChecklistItem[] }, index: number, value: string): void {
    const anchor = group.items[0];
    if (!anchor) {
      return;
    }
    const rows = this.stateFor(anchor.id).customTextRows;
    const desired = this.handoverPersonPlaceholders(group.title).length;
    while (rows.length < desired) {
      rows.push('');
    }
    rows[index] = value;
  }

  protected handoverFieldValue(item: ChecklistItem): string {
    const current = this.stateFor(item.id).textValue || '';
    if (current.trim().length > 0) {
      return current;
    }

    if (this.normalize(item.label) === 'CISLO PRIPADU') {
      return this.fieldValueAny('ZÁKLADNÍ INFORMACE', ['Číslo případu']).trim();
    }

    if (this.normalize(item.label) === 'NA ADRESE') {
      return this.fieldValueAny('ZÁKLADNÍ INFORMACE', ['Adresa nemovitosti', 'Adresa']).trim();
    }

    if (this.normalize(item.label) === 'NEMOVITOST') {
      return this.fieldValueAny('ZÁKLADNÍ INFORMACE', ['Adresa nemovitosti', 'Adresa']).trim();
    }

    return current;
  }

  protected trackBySection = (_: number, section: Section): string => this.sectionKey(section);

  protected trackByItem = (_: number, item: ChecklistItem): string => item.id;

  protected trackByValue = (_: number, value: string): string => value;

  protected trackByGate = (_: number, gate: GateOption): string => gate.value;

  protected trackByGroup = (_: number, group: SectionGroup): string => group.key;

  protected trackByIndex = (index: number): number => index;

  protected printRowLabel(entry: string): string {
    const idx = entry.indexOf(':');
    if (idx <= 0) {
      return entry;
    }
    return entry.slice(0, idx).trim();
  }

  protected printRowValue(entry: string): string {
    const idx = entry.indexOf(':');
    if (idx <= 0) {
      return '';
    }
    return entry.slice(idx + 1).trim();
  }

  protected isNotePrintRow(section: Section, entry: string): boolean {
    void section;
    return this.normalize(this.printRowLabel(entry)).includes('POZNAMKA');
  }

  protected isMissingPrintEntry(entry: string): boolean {
    return this.printRowValue(entry) === '---';
  }

  protected isInterestingAroundPrintRow(section: Section, entry: string): boolean {
    const sectionName = this.normalize(section.name);
    const label = this.normalize(this.printRowLabel(entry));
    return sectionName.includes('DOSTUPNOST V OKOLI') && label.includes('ZAJIMAVOSTI V OKOLI');
  }

  protected isParcelMultiLinePrintRow(section: Section, entry: string): boolean {
    const sectionName = this.normalize(section.name);
    if (sectionName !== 'POZEMEK' && sectionName !== 'STAVBA') {
      return false;
    }

    return this.printRowValue(entry).includes('||');
  }

  protected parcelPrintValues(entry: string): string[] {
    return this.printRowValue(entry)
      .split('||')
      .map((part) => part.trim())
      .filter((part) => part.length > 0);
  }

  protected interestingAroundPrintValues(entry: string): string[] {
    const value = this.printRowValue(entry);
    if (!value) {
      return [];
    }

    const byBullet = value
      .split(/\s*•\s*/)
      .map((part) => part.trim())
      .filter((part) => part.length > 0);
    if (byBullet.length > 1) {
      return byBullet;
    }

    const normalized = value.replace(/\r\n/g, '\n');
    const lines = normalized
      .split(/\n|;\s*/)
      .map((part) => part.trim())
      .filter((part) => part.length > 0);

    const parts: string[] = [];
    for (const line of lines) {
      let start = 0;
      for (let i = 0; i < line.length; i += 1) {
        if (line[i] !== ',') {
          continue;
        }

        const prev = i > 0 ? line[i - 1] : '';
        const next = i + 1 < line.length ? line[i + 1] : '';
        const decimalComma = /\d/.test(prev) && /\d/.test(next);
        if (decimalComma) {
          continue;
        }

        const candidate = line.slice(start, i).trim();
        if (candidate) {
          parts.push(candidate);
        }
        start = i + 1;
      }

      const tail = line.slice(start).trim();
      if (tail) {
        parts.push(tail);
      }
    }

    return parts;
  }

  private parseGateOption(option: string): GateOption | null {
    const trimmed = option.trim();
    if (!trimmed) {
      return null;
    }

    const match = trimmed.match(/^(.*)\(([^)]+)\)\s*$/);
    if (!match) {
      return {
        value: trimmed,
        imagePath: this.resolveGateImagePath(trimmed),
        alt: trimmed,
        label: trimmed
      };
    }

    const label = match[1].trim();
    const assetToken = match[2].trim();

    return {
      value: label,
      imagePath: this.resolveGateImagePath(assetToken),
      alt: label,
      label
    };
  }

  private resolveGateImagePath(token: string): string {
    const cleaned = token.trim();
    const noExt = cleaned.replace(/\.png$/i, '');
    const normalized = this.normalize(noExt);

    const imageByKey: Record<string, string> = {
      'VRATA-DOLEVA': 'assets/vrata-DOLEVA.png',
      'VRATA-DOPRAVA': 'assets/vrata-DOPRAVA.png',
      'VRATA-KLASICKE': 'assets/vrata-KLASICKE.png',
      'VRATA-VYJIZDECI': 'assets/vrata-VYJIZDECI.png',
      DOLEVA: 'assets/vrata-DOLEVA.png',
      DOPRAVA: 'assets/vrata-DOPRAVA.png',
      KLASICKE: 'assets/vrata-KLASICKE.png',
      VYJIZDECI: 'assets/vrata-VYJIZDECI.png'
    };

    return imageByKey[normalized] || `assets/${cleaned.endsWith('.png') ? cleaned : `${cleaned}.png`}`;
  }

  private sectionKey(section: Section): string {
    return `${section.order}-${section.name}`;
  }

  private setActiveSectionByItem(item: ChecklistItem): void {
    const targetItemId = this.baseItemId(item.id);
    const section = this.sections().find((entry) => entry.name === item.section && entry.items.some((row) => row.id === targetItemId));
    if (section) {
      this.activeSectionKey.set(this.sectionKey(section));
    }
  }

  private bumpStateVersion(): void {
    this.stateVersion.update((value) => value + 1);
  }

  protected printSheet(): void {
    window.print();
  }

  protected printPropertyInfo(): void {
    this.printWithMode('property');
  }

  protected printBuyerInfo(): void {
    this.printWithMode('buyer');
  }

  protected printBuyerInfoAlternative(): void {
    this.printWithMode('buyerAlt');
  }

  protected printBuyerInfoCompact(): void {
    this.printWithMode('buyerCompact');
  }

  protected printUnfilled(): void {
    this.printWithMode('unfilled');
  }

  protected saveToXml(): void {
    const payload = {
      selectedPropertyType: this.selectedPropertyType(),
      selectedService: this.selectedService(),
      selectedOwnership: this.selectedOwnership(),
      clientCount: this.clientCount(),
      states: Array.from(this.states.entries()).map(([itemId, state]) => ({
        itemId,
        itemKey: this.itemPersistenceKeyById(itemId),
        state: {
          selectedOptions: Array.from(state.selectedOptions),
          customOptionText: state.customOptionText,
          customOptionDraft: state.customOptionDraft,
          customOptionEditing: state.customOptionEditing,
          textValue: state.textValue,
          dimensionFirst: state.dimensionFirst,
          dimensionSecond: state.dimensionSecond,
          dimensionThird: state.dimensionThird,
          optionAmounts: state.optionAmounts,
          optionTexts: state.optionTexts,
          optionModes: state.optionModes,
          optionUnits: state.optionUnits,
          roomDimensions: state.roomDimensions,
          roomAreas: state.roomAreas,
          customInfrastructureRows: state.customInfrastructureRows,
          customServiceRows: state.customServiceRows,
          customMoneyRows: state.customMoneyRows,
          customTextRows: state.customTextRows,
          travelMode: state.travelMode,
          customReconstructionRows: state.customReconstructionRows,
          nearestStopRows: state.nearestStopRows,
          checked: state.checked,
          yesNo: state.yesNo,
          dateValue: state.dateValue,
          uploadedFile: state.uploadedFile,
          floorPlanPhotos: state.floorPlanPhotos,
          customParcelRows: state.customParcelRows
        }
      }))
    };

    const payloadJson = JSON.stringify(payload);
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<remax-form version="1">\n  <payload>${this.escapeXml(payloadJson)}</payload>\n</remax-form>\n`;
    const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
    const metaTitle = this.printReportMeta().trim();
    const baseName = metaTitle || this.printReportTitle();
    const filename = `${this.sanitizeFileName(baseName)}.xml`;

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  protected openXmlFilePicker(input: HTMLInputElement): void {
    input.click();
  }

  protected generateAmlForm(): void {
    const win = window.open('', '_blank', 'width=980,height=1200');
    if (!win) {
      window.alert('Nepodařilo se otevřít okno pro AML formulář. Zkontrolujte blokování vyskakovacích oken.');
      return;
    }

    win.document.open();
    win.document.write('<!doctype html><html lang="cs"><head><meta charset="utf-8"><title>AML</title></head><body>Generuji AML formulář...</body></html>');
    win.document.close();

    try {
    const purpose = this.fieldValueAny('PŮVOD PENĚŽNÍCH PROSTŘEDKŮ', ['Účel realitní transakce']);
    const acquisitionLabel = 'Prodávající: Nabytí nemovitosti';
    const acquisitionOptions = this.fieldOptionsAny('PŮVOD MAJETKU', [acquisitionLabel, 'Prodávající - Nabytí nemovitosti']);
    const avgIncomeLabel = 'Průměrný měsíční příjem (v době nabytí majetku)';
    const avgIncomeOptions = this.fieldOptionsAny('PŮVOD PENĚŽNÍCH PROSTŘEDKŮ', [avgIncomeLabel, 'Průměrný měsíční příjem / v době nabytí majetku']);
    const fundsLabel = 'Původ finančních prostředků / majetku';
    const fundsOptions = this.fieldOptionsAny('PŮVOD PENĚŽNÍCH PROSTŘEDKŮ', [fundsLabel, 'Původ peněžních prostředků / majetku']);
    const amlDocumentTitle = this.amlDocumentTitle();
    const proofOfSource = this.fieldValueAny('PŮVOD MAJETKU', ['Doklady k prokázání zdroje finančních prostředků / majetku'])
      || this.fieldValueAny('PŮVOD PENĚŽNÍCH PROSTŘEDKŮ', ['Doklady k prokázání zdroje finančních prostředků / majetku'])
      || this.collectValuesFromSectionByLabelKeywords('PŮVOD MAJETKU', [
        'Doklady k prokázání zdroje finančních prostředků / majetku',
        'Doklady k prokázání zdroje',
        'Smlouva o daru',
        'Identifikace dárce',
        'Doložení původu peněz dárce',
        'Bankovní výpis o převodu daru'
      ]);

    const yesNoPep = this.fieldYesNo('KLIENT', 'Jste / byl/a jste v posledních 12 měsících politicky exponovanou osobou nebo jste blízkou osobou politicky exponované osoby?');
    const yesNoSanctions = this.fieldYesNo('KLIENT', 'Jste osoba, vůči níž ČR uplatňuje mezinárodní sankce podle zákona č. 69/2006 Sb. o provádění mezinárodních sankcí');

    const mark = (active: boolean): string => (active ? '☒' : '☐');
    const line = (value: string): string => this.escapeHtml(value || '');
    const yn = (value: YesNo, expected: 'ANO' | 'NE'): string => mark((value || '') === expected);

    const html = `<!doctype html>
<html lang="cs"><head><meta charset="utf-8" /><meta name="color-scheme" content="light" /><title>${this.escapeHtml(amlDocumentTitle)}</title>
<style>
@page { size: A4; margin: 10mm 15mm; }
html, body { background:#fff !important; color:#111 !important; }
body { font-family: Arial, sans-serif; margin: 0; font-size: 11.6px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.aml { max-width: 100%; min-height: calc(297mm - 30mm); display:flex; flex-direction:column; }
.banner { background:#0c59a5 !important; color:#fff !important; border-radius:6px; height:40px; width:100%; box-sizing:border-box; overflow:hidden; display:flex; align-items:center; padding:0 14px; font-weight:700; font-size:18px; letter-spacing:.2px; }
.note-mini { margin:1px 0 4px 10px; font-size:7px; color:#b3b3b3; }
.note { margin:2px 0 5px 10px; font-size:8px; line-height:1.2; }
.sec { margin-top:10px; border:1px solid #bdbdbd; background:#dddddd; border-radius:6px; overflow:hidden; }
.sec.dimmed { background:#dddddd; }
.sec.dimmed h3,
.sec.dimmed .label,
.sec.dimmed .value,
.sec.dimmed .check-item { color:#909090; }
.sec h3 { margin:4px 0 4px; padding:6px 6px 5px; font-size:11.2px; line-height:1.08; text-transform:uppercase; text-decoration:underline; font-weight:700; }
.sec h3.dual-title { line-height:1.2; }
.grid2 { display:grid; grid-template-columns:1fr 1fr; gap:0; }
.row { display:grid; grid-template-columns:162px 1fr; background:#dddddd; margin-top:2px; }
.sec .row { margin-right:6px; }
.sec .row:last-child { margin-bottom:6px; }
.row > div { padding:2px 5px; min-height:16px; }
.label { color:#111; font-size:10.4px; line-height:1.16; }
.value { background:#fff; border:1px solid #bcbcbc; margin:1px 3px 1px 0; font-size:10.4px; line-height:1.16; min-height:16px; display:flex; align-items:center; }
.row.top-align-value .value { align-items:flex-start; }
.row.top-align-value .value { padding-left:8px; padding-right:8px; }
.row.represented-person-row { grid-template-columns:1fr 220px; }
.row.represented-person-row .label { white-space:nowrap; }
.checks { display:flex; gap:7px; flex-wrap:wrap; }
.checks-grid-6 { display:grid; grid-template-columns:repeat(6, minmax(0, 1fr)); column-gap:8px; row-gap:2px; }
.checks-grid-3 { display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); column-gap:10px; row-gap:2px; }
.checks-grid-3 .check-item,
.checks-grid-6 .check-item { white-space:nowrap; }
.footer { margin-top:0; margin-bottom:8px; padding-left:10px; font-size:10.4px; font-weight:600; line-height:1.25; }
.place-date { margin-top:13px; font-size:10.4px; }
.signs { margin-top:6px; display:grid; grid-template-columns:1fr 1fr; gap:12px; }
.sign { border:1px solid #bdbdbd; background:#f3f3f3; min-height:40px; padding:4px; display:flex; align-items:flex-end; font-size:10px; }
.push-signatures-bottom { margin-top: auto; padding-top: 3px; }
.aml-page { break-after: page; page-break-after: always; }
.aml-page:last-child { break-after: auto; page-break-after: auto; }
</style></head><body>
${Array.from({ length: this.clientCount() }, (_, clientIndex) => {
    const isLegalPerson = this.clientHasSelectedOption(clientIndex, 'KLIENT', 'Typ klienta', 'Právnická osoba');
    const representedPerson = this.clientFieldValueAny(clientIndex, 'KLIENT', ['Pokud výše uvedená osoba jedná jako zástupce klienta - uveďte jméno a příjmení zastoupeného', 'Jméno a příjmení zastoupeného', 'Zastoupený']);
    const representedByBody = this.clientHasSelectedOptionAny(clientIndex, 'KLIENT', ['Zastoupení', 'Zastoupení ...'], 'členem statutárního orgánu');
    const representedByEmployee = this.clientHasSelectedOptionAny(clientIndex, 'KLIENT', ['Zastoupení', 'Zastoupení ...'], 'zaměstnancem');
    const representedByPowerOfAttorney = this.clientHasSelectedOptionAny(clientIndex, 'KLIENT', ['Zastoupení', 'Zastoupení ...'], 'na základě plné moci');
    const powerOfAttorneyDate = this.clientFieldValueAny(clientIndex, 'KLIENT', ['na základě plné moci ze dne', 'Plná moc ze dne']);
    const yesNoPep = this.clientFieldYesNo(clientIndex, 'KLIENT', 'Jste / byl/a jste v posledních 12 měsících politicky exponovanou osobou nebo jste blízkou osobou politicky exponované osoby?');
    const yesNoSanctions = this.clientFieldYesNo(clientIndex, 'KLIENT', 'Jste osoba, vůči níž ČR uplatňuje mezinárodní sankce podle zákona č. 69/2006 Sb. o provádění mezinárodních sankcí');
    const fullName = this.clientFieldValue('KLIENT'.length && clientIndex >= 0 ? clientIndex : 0, 'KLIENT', 'Jméno (jména) a Příjmení');
    const firstNames = fullName.split(' ').slice(0, -1).join(' ');
    const surname = fullName.split(' ').slice(-1).join(' ');
    return `
<div class="aml aml-page">
<div class="banner">AML DOTAZNÍK</div>
<div style="height:1px;"></div>
<div class="note-mini">AML dotazník je nutný v případě, pokud měsíční nájemné nebo pachtovné převýší hodnotu 10 000 EUR (243 278 Kč)</div>
<div class="note">Požadovat od klienta informace uvedené v tomto dotazníku ukládá zákon č. 253/3008 Sb., o některých opatřeních proti legalizaci výnosů z trestné činnosti a financování terorismu, ve znění pozdějších předpisů (dále jen "AML zákon").</div>

<div class="sec">
  <h3 class="dual-title">ÚDAJE O KLIENTOVI - FYZICKÉ OSOBĚ<br>ÚDAJE O FYZICKÉ OSOBĚ OPRÁVNĚNÉ JEDNAT ZA KLIENTA - PRÁVNICKOU OSOBU</h3>
  <div class="grid2">
    <div>
      <div class="row"><div class="label">Jméno (jména)</div><div class="value">${line(firstNames)}</div></div>
      <div class="row"><div class="label">Příjmení</div><div class="value">${line(surname)}</div></div>
      <div class="row"><div class="label">Titul před jménem</div><div class="value">${line(this.clientFieldValue(clientIndex, 'KLIENT', 'Titul před jménem'))}</div></div>
      <div class="row"><div class="label">Titul za jménem</div><div class="value">${line(this.clientFieldValue(clientIndex, 'KLIENT', 'Titul za jménem'))}</div></div>
      <div class="row"><div class="label">Datum narození</div><div class="value">${line(this.clientFieldValueAny(clientIndex, 'KLIENT', ['Datum narození']))}</div></div>
      <div class="row"><div class="label">Obec a stát místa narození</div><div class="value">${line(this.clientFieldValueAny(clientIndex, 'KLIENT', ['Obec a stát místa narození', 'Místo narození']))}</div></div>
      <div class="row"><div class="label">Státní občanství</div><div class="value">${line(this.clientFieldValue(clientIndex, 'KLIENT', 'Státní občanství'))}</div></div>
      <div class="row"><div class="label">Pohlaví</div><div class="value">${mark(this.clientHasSelectedOption(clientIndex, 'KLIENT', 'Pohlaví', 'Muž'))} Muž&nbsp;&nbsp; ${mark(this.clientHasSelectedOption(clientIndex, 'KLIENT', 'Pohlaví', 'Žena'))} Žena</div></div>
      <div class="row"><div class="label">Telefon</div><div class="value">${line(this.clientFieldValueAny(clientIndex, 'KLIENT', ['Kontaktní telefon', 'Telefon']))}</div></div>
      <div class="row"><div class="label">E-mail</div><div class="value">${line(this.clientFieldValueAny(clientIndex, 'KLIENT', ['E-mail', 'Email']))}</div></div>
      <div class="row"><div class="label">Rodinný stav</div><div class="value">${line(this.clientFieldValue(clientIndex, 'KLIENT', 'Rodinný stav'))}</div></div>
      <div class="row top-align-value"><div class="label">Jste / byl/a jste v posledních 12<br>měsících politicky exponovanou<br>osobou nebo jste blízkou osobou<br>politicky exponované osoby?</div><div class="value">${yn(yesNoPep, 'NE')} Ne<br>${yn(yesNoPep, 'ANO')} Ano (uveďte podrobnosti)</div></div>
    </div>
    <div>
      <div class="row"><div class="label">Druh průkazu totožnosti</div><div class="value">${mark(this.clientHasSelectedOption(clientIndex, 'KLIENT', 'Druh průkazu totožnosti', 'Občanský průkaz'))} Občanský průkaz&nbsp;&nbsp; ${mark(this.clientHasSelectedOption(clientIndex, 'KLIENT', 'Druh průkazu totožnosti', 'Cestovní pas'))} Cestovní pas&nbsp;&nbsp; ${mark(this.clientHasSelectedOption(clientIndex, 'KLIENT', 'Druh průkazu totožnosti', 'Jiný'))} Jiný</div></div>
      <div class="row"><div class="label">Číslo průkazu totožnosti</div><div class="value">${line(this.clientFieldValue(clientIndex, 'KLIENT', 'Číslo průkazu totožnosti'))}</div></div>
      <div class="row"><div class="label">Datum vydání dokladu</div><div class="value">${line(this.clientFieldValueAny(clientIndex, 'KLIENT', ['Datum vydání dokladu', 'Datum vydání']))}</div></div>
      <div class="row"><div class="label">Doba platnosti dokladu</div><div class="value">${line(this.clientFieldValueAny(clientIndex, 'KLIENT', ['Doba platnosti dokladu', 'Doba platnosti']))}</div></div>
      <div class="row"><div class="label">Rodné číslo (není-li dat. nar.)</div><div class="value">${line(this.clientFieldValueAny(clientIndex, 'KLIENT', ['Rodné číslo (není-li datum narození)', 'Rodné číslo (není-li dat. nar.)', 'Rodné číslo']))}</div></div>
      <div class="row"><div class="label">Trvalý nebo jiný pobyt</div><div class="value">${line(this.clientFieldValueAny(clientIndex, 'KLIENT', ['Trvalý nebo jiný pobyt', 'Trvalý nebo jíný pobyt', 'Trvalý pobyt']))}</div></div>
      <div class="row"><div class="label">Skutečné místo pobytu (korespondenční adresa)</div><div class="value">${line(this.clientFieldValueAny(clientIndex, 'KLIENT', ['Korespondenční adresa (pokud je jiná než trvalý pobyt)', 'Skutečné místo pobytu (korespondenční adresa)', 'Skutečné místo pobytu']))}</div></div>
      <div class="row"><div class="label">Orgán, který průkaz vydal</div><div class="value">${line(this.clientFieldValue(clientIndex, 'KLIENT', 'Orgán, který průkaz vydal'))}</div></div>
      <div class="row"><div class="label">Stát, který průkaz vydal</div><div class="value">${line(this.clientFieldValue(clientIndex, 'KLIENT', 'Stát, který průkaz vydal'))}</div></div>
      <div class="row"><div class="label">Zaměstnání / obor podnikání</div><div class="value">${line(this.clientFieldValueAny(clientIndex, 'KLIENT', ['Zaměstnání / obor podnikání', 'Zaměstnání']))}</div></div>
      <div class="row top-align-value"><div class="label">Jste osoba, vůči níž ČR uplatňuje<br>mezinárodní sankce podle<br>zákona č. 69/2006 Sb. o<br>provádění mezinárodních sankcí</div><div class="value">${yn(yesNoSanctions, 'NE')} Ne<br>${yn(yesNoSanctions, 'ANO')} Ano (uveďte podrobnosti)</div></div>
    </div>
  </div>
  <div class="row represented-person-row"><div class="label">Pokud výše uvedená osoba jedná jako zástupce klienta - uveďte jméno a příjmení zastoupeného</div><div class="value">${line(representedPerson)}</div></div>
</div>

<div class="sec ${isLegalPerson ? '' : 'dimmed'}">
  <h3>ÚDAJE O KLIENTOVI - PRÁVNICKÉ OSOBĚ / SVĚŘENECKÉM FONDU</h3>
  <div class="grid2">
    <div>
      <div class="row"><div class="label">Obchodní firma nebo název, včetně odlišujícího dodatku nebo dalšího označení</div><div class="value">${line(this.clientFieldValue(clientIndex, 'KLIENT', 'Název právnické osoby'))}</div></div>
      <div class="row"><div class="label">Adresa / sídlo</div><div class="value">${line(this.clientFieldValue(clientIndex, 'KLIENT', 'Sídlo'))}</div></div>
      <div class="row"><div class="label">Skutečný majitel dle § 4 odst. 4 AML zákona</div><div class="value">${line(this.clientFieldValueAny(clientIndex, 'KLIENT', ['Skutečný majitel dle § 4 odst. 4 AML zákona', 'Skutečný majitel']))}</div></div>
    </div>
    <div>
      <div class="row"><div class="label">Identifikační číslo</div><div class="value">${line(this.clientFieldValue(clientIndex, 'KLIENT', 'IČO'))}</div></div>
      <div class="row"><div class="label">Vlastnická a řídící struktura</div><div class="value">${line(this.clientFieldValue(clientIndex, 'KLIENT', 'Vlastnická a řídící struktura'))}</div></div>
      <div class="row"><div class="label">Jméno a příjmení zastoupeného</div><div class="value">${line(this.clientFieldValue(clientIndex, 'KLIENT', 'Zastoupený'))}</div></div>
    </div>
  </div>
  <div class="row"><div class="label">Zastoupení ...</div><div class="value">${mark(representedByBody)} členem statutárního orgánu&nbsp;&nbsp; ${mark(representedByEmployee)} zaměstnancem&nbsp;&nbsp; ${mark(representedByPowerOfAttorney)} na základě plné moci ze dne ${line(powerOfAttorneyDate)}</div></div>
</div>

<div class="sec">
  <h3>SPOLEČNÉ ÚDAJE O REALITNÍ TRANSAKCI A PŮVODU FINANČNÍCH PROSTŘEDKŮ</h3>
  <div class="row"><div class="label">Účel realitní transakce</div><div class="value">${line(purpose)}</div></div>
  <div class="row"><div class="label">Prodávající: Nabytí nemovitosti</div><div class="value checks-grid-3">${acquisitionOptions.map((o) => `<span class="check-item">${mark(this.hasSelectedOptionAny('PŮVOD MAJETKU', [acquisitionLabel, 'Prodávající - Nabytí nemovitosti'], o) || this.hasSelectedOptionAny('PŮVOD PENĚŽNÍCH PROSTŘEDKŮ', [acquisitionLabel, 'Prodávající - Nabytí nemovitosti'], o))} ${this.escapeHtml(o)}</span>`).join('')}</div></div>
  <div class="row"><div class="label">Průměrný měsíční příjem / v době nabytí majetku</div><div class="value checks-grid-6">${avgIncomeOptions.map((o) => `<span class="check-item">${mark(this.hasSelectedOptionAny('PŮVOD PENĚŽNÍCH PROSTŘEDKŮ', [avgIncomeLabel, 'Průměrný měsíční příjem / v době nabytí majetku'], o))} ${this.escapeHtml(o)}</span>`).join('')}</div></div>
  <div class="row"><div class="label">Původ finančních prostředků / majetku</div><div class="value checks-grid-3">${fundsOptions.map((o) => `<span class="check-item">${mark(this.hasSelectedOptionAny('PŮVOD PENĚŽNÍCH PROSTŘEDKŮ', [fundsLabel, 'Původ peněžních prostředků / majetku'], o))} ${this.escapeHtml(o)}</span>`).join('')}</div></div>
  <div class="row"><div class="label">Doklady k prokázání zdroje finančních prostředků / majetku</div><div class="value">${line(proofOfSource)}</div></div>
</div>

<div class="push-signatures-bottom">
  <div class="footer">Identifikovaná osoba prohlašuje, že výše uvedené údaje jsou pravdivé, správné a úplné a zavazuje se, že bez zbytečného odkladu oznámit jakoukoli jejich změnu.</div>
  <div class="place-date">V&nbsp;.............................................&nbsp;&nbsp;&nbsp;dne&nbsp;.............................................</div>
  <div class="signs">
    <div class="sign">Podpis klienta</div>
    <div class="sign">Identifikaci provedla ${this.escapeHtml(this.clientFieldValue(clientIndex, 'KLIENT', 'Identifikaci provedla') || 'Petrášová Eliška')}</div>
  </div>
</div>
</div>`;
}).join('')}
</body></html>`;

    win.document.open();
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 250);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Neznámá chyba při generování AML.';
      win.document.open();
      win.document.write(`<!doctype html><html lang="cs"><head><meta charset="utf-8"><title>AML chyba</title></head><body style="font-family: Arial, sans-serif; padding: 16px;"><h2>Nepodařilo se vygenerovat AML formulář.</h2><p>${this.escapeHtml(message)}</p></body></html>`);
      win.document.close();
      window.alert(`Nepodařilo se vygenerovat AML formulář: ${message}`);
    }
  }

  protected generateHandoverProtocol(): void {
    const win = window.open('', '_blank', 'width=980,height=1200');
    if (!win) {
      window.alert('Nepodařilo se otevřít okno pro Předávací protokol. Zkontrolujte blokování vyskakovacích oken.');
      return;
    }

    const seller = this.handoverEmptyPartyData();

    const html = `<!doctype html>
<html lang="cs"><head><meta charset="utf-8" /><title>Předávací protokol</title>
<style>
@page { size: A4; margin: 12mm; }
body { font-family: Arial, sans-serif; margin: 0; color: #111; font-size: 12px; }
.banner { background:#0c59a5; color:#fff; border-radius:6px; padding:10px 14px; font-weight:700; font-size:28px; }
.persons-grid { display:grid; grid-template-columns:1fr; gap:10px; margin-top:12px; }
.card { border:1px solid #cfdbe8; border-radius:6px; padding:12px; }
.title { font-weight:700; font-size:22px; margin:0 0 10px; }
.row { margin:6px 0; }
.row-value { width:100%; border:0; border-bottom:1px dotted #8ea2b5; min-height:24px; font-size:12px; padding:2px 0; outline:none; }
</style></head><body>
  <div class="banner">PŘEDÁVACÍ PROTOKOL</div>
  <div class="persons-grid">
    <div class="card">
      <div class="title">SMLUVNÍ STRANY - PŘEDÁVAJÍCÍ 1</div>
      ${this.renderHandoverPartyRows(seller)}
    </div>
  </div>
</body></html>`;

    win.document.open();
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 250);
  }

  private handoverEmptyPartyData(): { name: string; address: string; email: string; phone: string; account: string; marital: string } {
    return { name: '', address: '', email: '', phone: '', account: '', marital: '' };
  }

  private renderHandoverPartyRows(data: { name: string; address: string; email: string; phone: string; account: string; marital: string }): string {
    const line = (placeholder: string, value: string): string => `
      <div class="row">
        <input class="row-value" type="text" value="${this.escapeHtml(value)}" placeholder="${this.escapeHtml(placeholder)}" />
      </div>`;

    return [
      line('Jméno', data.name),
      line('Bytem', data.address),
      line('E-mail', data.email),
      line('Telefon', data.phone),
      line('Bankovní spojení', data.account),
      line('Rodinný stav', data.marital)
    ].join('');
  }

  protected loadFromXmlFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const xmlText = String(reader.result || '');
        const parser = new DOMParser();
        const doc = parser.parseFromString(xmlText, 'application/xml');
        if (doc.querySelector('parsererror')) {
          throw new Error('Neplatný XML soubor.');
        }

        const payloadNode = doc.querySelector('remax-form > payload');
        if (!payloadNode?.textContent) {
          throw new Error('V XML chybí payload.');
        }

        const payload = JSON.parse(payloadNode.textContent) as {
          selectedPropertyType?: string;
          selectedService?: string;
          selectedOwnership?: string;
          clientCount?: number;
          states?: Array<{ itemId?: string; itemKey?: string; state: Partial<ItemState> & { selectedOptions?: string[] } }>;
        };

        this.states.clear();
        this.selectedPropertyType.set(payload.selectedPropertyType || '');
        this.selectedService.set(payload.selectedService || '');
        this.selectedOwnership.set(payload.selectedOwnership || '');
        let highestClientIndex = 0;

        for (const entry of payload.states || []) {
          const targetItemId = this.resolveLoadTargetItemId(entry?.itemId || '', entry?.itemKey || '');
          if (!targetItemId) {
            continue;
          }

          highestClientIndex = Math.max(highestClientIndex, this.clientIndexFromItemId(targetItemId));

          const state = this.getState(targetItemId);
          const loaded = entry.state || {};
          state.selectedOptions = new Set(loaded.selectedOptions || []);
          state.customOptionText = loaded.customOptionText || '';
          state.customOptionDraft = loaded.customOptionDraft || '';
          state.customOptionEditing = Boolean(loaded.customOptionEditing);
          state.textValue = loaded.textValue || '';
          state.dimensionFirst = loaded.dimensionFirst || '';
          state.dimensionSecond = loaded.dimensionSecond || '';
          state.dimensionThird = loaded.dimensionThird || '';
          state.optionAmounts = loaded.optionAmounts || {};
          state.optionTexts = loaded.optionTexts || {};
          state.optionModes = loaded.optionModes || {};
          state.optionUnits = loaded.optionUnits || {};
          state.roomDimensions = loaded.roomDimensions || {};
          state.roomAreas = loaded.roomAreas || {};
          state.customInfrastructureRows = loaded.customInfrastructureRows || [];
          state.customServiceRows = loaded.customServiceRows || [];
          state.customMoneyRows = loaded.customMoneyRows || [];
          state.customTextRows = loaded.customTextRows || [];
          state.travelMode = loaded.travelMode || '';
          state.customReconstructionRows = loaded.customReconstructionRows || [];
          state.nearestStopRows = loaded.nearestStopRows || [];
          state.checked = Boolean(loaded.checked);
          state.yesNo = loaded.yesNo || null;
          state.dateValue = loaded.dateValue || '';
          state.uploadedFile = loaded.uploadedFile || null;
          state.floorPlanPhotos = loaded.floorPlanPhotos || [];
          state.customParcelRows = loaded.customParcelRows || [];
        }

        const loadedClientCount = typeof payload.clientCount === 'number' && Number.isFinite(payload.clientCount)
          ? Math.floor(payload.clientCount || 1)
          : 1;
        this.clientCount.set(Math.min(10, Math.max(1, loadedClientCount, highestClientIndex + 1)));
        this.activeClientIndex.set(0);

        this.bumpStateVersion();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Nepodařilo se načíst XML.';
        window.alert(message);
      } finally {
        input.value = '';
      }
    };

    reader.readAsText(file, 'utf-8');
  }

  protected sectionPrintValues(section: Section): string[] {
    const mode = this.printMode();
    if (mode === 'property') {
      return this.sectionPropertyValues(section);
    }

    if (mode === 'buyer' || mode === 'buyerAlt' || mode === 'buyerCompact') {
      return this.sectionSelectedValues(section, (item) => item.showToBuyer);
    }

    return this.sectionUnfilledValues(section);
  }

  protected sectionPropertyValues(section: Section): string[] {
    const values: string[] = [];
    const seen = new Set<string>();
    const filledEntries = this.sectionSelectedValues(section);
    const filledByLabel = new Map<string, string[]>();

    for (const entry of filledEntries) {
      const idx = entry.indexOf(':');
      if (idx <= 0) {
        continue;
      }
      const label = entry.slice(0, idx).trim();
      const value = entry.slice(idx + 1).trim();
      const key = this.normalize(label);
      const bucket = filledByLabel.get(key) || [];
      bucket.push(value);
      filledByLabel.set(key, bucket);
    }

    for (const item of section.items) {
      const label = item.label.trim();
      if (!label) {
        continue;
      }

      const key = this.normalize(label);
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);

      const filledValues = filledByLabel.get(key) || [];
      const fallbackValue = this.propertyPrintFallbackValue(item);
      const finalValue = filledValues.length > 0 ? filledValues.join(', ') : (fallbackValue || '---');
      values.push(`${label}: ${finalValue}`);
    }

    return values;
  }

  private propertyPrintFallbackValue(item: ChecklistItem): string {
    if (!this.isRoomSizeListField(item)) {
      return '';
    }

    const rooms = this.selectedRoomSizeOptions(item);
    if (rooms.length === 0) {
      return '';
    }

    const roomValues = rooms.map((room) => {
      const area = this.roomAreaValue(item.id, room);
      const dims = this.stateFor(item.id).roomDimensions[room] || { width: '', length: '' };
      const width = this.compactRoomDimension(dims.width);
      const length = this.compactRoomDimension(dims.length);

      if (area) {
        return `${room} (${this.compactAreaText(area)})`;
      }

      if (width || length) {
        return `${room} (${width}x${length}m)`;
      }

      return room;
    });

    return roomValues.join(', ');
  }

  protected printReportTitle(): string {
    const mode = this.printMode();
    if (mode === 'buyer') {
      return 'INFORMACE PRO ZÁJEMCE';
    }

    if (mode === 'buyerAlt') {
      return 'INFORMACE PRO ZÁJEMCE - ALTERNATIVNÍ';
    }

    if (mode === 'buyerCompact') {
      return 'INFORMACE PRO ZÁJEMCE - KOMPAKTNÍ';
    }

    if (mode === 'unfilled') {
      return 'NEVYPLNĚNO';
    }

    return 'INFORMACE O NEMOVITOSTI';
  }

  protected isUnfilledPrintMode(): boolean {
    return this.printMode() === 'unfilled';
  }

  protected isPropertyPrintMode(): boolean {
    return this.printMode() === 'property';
  }

  protected isBuyerPrintMode(): boolean {
    return this.printMode() === 'buyer';
  }

  protected isBuyerAlternativePrintMode(): boolean {
    return this.printMode() === 'buyerAlt';
  }

  protected isBuyerCompactPrintMode(): boolean {
    return this.printMode() === 'buyerCompact';
  }

  protected isBuyerDocumentPrintMode(): boolean {
    return this.isBuyerPrintMode() || this.isBuyerAlternativePrintMode() || this.isBuyerCompactPrintMode();
  }

  protected leafletPrintEntries(): LeafletPrintEntry[] {
    const leafletSection = this.sections().find((section) => this.normalize(section.name) === 'INFORMACE DO LETAKU');
    if (!leafletSection) {
      return [];
    }

    return leafletSection.items
      .map((item) => {
        if (this.isMainPhotoField(item)) {
          return null;
        }

        const state = this.stateFor(item.id);
        const images = [...state.floorPlanPhotos];
        const uploadedFile = state.uploadedFile;
        if (uploadedFile?.dataBase64 && this.isImageAsset(uploadedFile)) {
          images.unshift(uploadedFile);
        }

        const link = this.linkValue(item.id).trim();
        const documentName = uploadedFile && !this.isImageAsset(uploadedFile) ? uploadedFile.name : '';

        if (images.length === 0 && !link && !documentName) {
          return null;
        }

        return {
          label: item.label.trim(),
          images,
          link,
          documentName
        } satisfies LeafletPrintEntry;
      })
      .filter((entry): entry is LeafletPrintEntry => entry !== null);
  }

  private isImageAsset(asset: UploadedAsset | null): boolean {
    if (!asset) {
      return false;
    }

    const type = asset.type.toLowerCase();
    const name = asset.name.toLowerCase();
    return type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|bmp|svg)$/i.test(name);
  }

  protected shouldShowSectionHead(section: Section): boolean {
    if (!this.printInProgress()) {
      return true;
    }

    const buyerPrint = this.isBuyerPrintMode() || this.isBuyerAlternativePrintMode() || this.isBuyerCompactPrintMode();
    if (!buyerPrint) {
      return true;
    }

    return this.sectionPrintValues(section).length > 0;
  }

  protected shouldRenderSectionCard(section: Section): boolean {
    if (!this.printInProgress()) {
      return true;
    }

    const buyerPrint = this.isBuyerPrintMode() || this.isBuyerAlternativePrintMode() || this.isBuyerCompactPrintMode();
    if (!buyerPrint) {
      return true;
    }

    return this.sectionPrintValues(section).some((entry) => {
      const value = this.printRowValue(entry).trim();
      if (value.length > 0) {
        return true;
      }
      return !entry.includes(':') && entry.trim().length > 0;
    });
  }

  protected isParcelOrBuildingSection(section: Section): boolean {
    const normalized = this.normalize(section.name);
    return normalized === 'POZEMEK' || normalized === 'STAVBA';
  }

  protected printReportMeta(): string {
    const service = this.selectedService().trim();
    const property = this.declinedPropertyType(this.selectedPropertyType().trim());
    const address = this.selectedAddressValue();
    return [service, property, address].filter((value) => value.length > 0).join(' ');
  }

  protected buyerFooterName(): string {
    return this.fieldValueAny('MAKLÉŘ', ['Jméno (jména) a Příjmení', 'Jméno a příjmení']).trim();
  }

  protected buyerFooterPhone(): string {
    return this.fieldValueAny('MAKLÉŘ', ['Telefon', 'Kontaktní telefon']).trim();
  }

  protected buyerFooterEmail(): string {
    return this.fieldValueAny('MAKLÉŘ', ['E-mail', 'Email']).trim();
  }

  protected buyerMainPhotoSrc(): string {
    const sectionName = 'INFORMACE DO LETÁKU';
    const labelCandidates = ['HLAVNÍ FOTO', 'HLAVNI FOTO', 'FOTO', 'Hlavní fotografie'];

    for (const labelName of labelCandidates) {
        const item = this.findItemBySectionAndLabel(sectionName, labelName);
        if (!item || !this.isMainPhotoField(item)) {
          continue;
        }

      const state = this.stateFor(item.id);
      if (state.floorPlanPhotos.length > 0) {
        return this.galleryPhotoSrc(state.floorPlanPhotos[0]);
      }

      if (state.uploadedFile?.dataBase64) {
        const mimeType = state.uploadedFile.type || 'image/jpeg';
        return `data:${mimeType};base64,${state.uploadedFile.dataBase64}`;
      }

      const raw = state.textValue.trim();
      if (!raw) {
        continue;
      }

      const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
      try {
        return new URL(withProtocol).toString();
      } catch {
        continue;
      }
    }

    return '';
  }

  private printDocumentTitle(): string {
    const title = this.printReportTitle();
    const prefix = this.printReportMeta();
    return prefix ? `${prefix} ${title}` : title;
  }

  private amlDocumentTitle(): string {
    const service = this.selectedService().trim();
    const property = this.declinedPropertyType(this.selectedPropertyType().trim());
    const clientName = this.fieldValueAny('KLIENT', ['Jméno (jména) a Příjmení', 'Jméno a příjmení', 'Jméno (jména)'])
      .trim()
      .toLocaleUpperCase('cs');

    const details = [service, property, clientName].filter((value) => value.length > 0);
    const title = details.length > 0 ? ['AML', ...details].join(' ') : 'AML dotazník';
    return this.sanitizeFileName(title);
  }

  private declinedPropertyType(value: string): string {
    const normalized = this.normalize(value);
    const byType: Record<string, string> = {
      DUM: 'domu',
      BYT: 'bytu',
      GARAZ: 'garaze',
      CHATA: 'chaty',
      ZAHRADA: 'zahrady',
      POZEMEK: 'pozemku',
      POLE: 'pole',
      'NEBYTOVY PROSTOR': 'nebytoveho prostoru',
      JINA: 'jine nemovitosti'
    };

    const declined = byType[normalized] || value;
    if (!declined) {
      return '';
    }

    return declined.charAt(0).toLowerCase() + declined.slice(1);
  }

  private selectedAddressValue(): string {
    for (const section of this.sections()) {
      const normalizedSection = this.normalize(section.name);
      if (normalizedSection !== 'ADRESA' && normalizedSection !== 'ZAKLADNI INFORMACE') {
        continue;
      }

      for (const item of section.items) {
        if (!this.isAddressField(item)) {
          continue;
        }
        const value = this.getState(item.id).textValue.trim();
        if (value) {
          return value;
        }
      }
    }

    return '';
  }

  protected isRealEstatePurposeField(item: ChecklistItem): boolean {
    const section = this.normalize(item.section);
    const label = this.normalize(item.label);
    const isPurposeSection = section.includes('PUVOD PENEZNICH PROSTREDKU') || section.includes('PUVOD MAJETKU') || section === 'AML';
    return isPurposeSection && label.includes('UCEL REALITNI TRANSAKCE');
  }

  protected sectionUnfilledValues(section: Section): string[] {
    const values: string[] = [];
    const seen = new Set<string>();

    for (const item of section.items) {
      const label = item.label.trim();
      if (!label) {
        continue;
      }

      const key = this.normalize(label);
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);

      const missingRoomEntries = this.unfilledRoomEntriesWithoutArea(item);
      if (missingRoomEntries.length > 0) {
        for (const roomEntry of missingRoomEntries) {
          values.push(`${label}: ${roomEntry}`);
        }
        continue;
      }

      if (this.hasValue(item)) {
        continue;
      }

      if (this.isYesNo(item)) {
        values.push(`${label}: ANO / NE`);
        continue;
      }

      const selectableOptions = this.unfilledSelectableOptions(item);
      if (selectableOptions.length > 0) {
        for (const option of selectableOptions) {
          values.push(`${label}: ${option}`);
        }
        continue;
      }

      values.push(label);
    }

    return values;
  }

  private unfilledRoomEntriesWithoutArea(item: ChecklistItem): string[] {
    if (!this.isRoomSizeListField(item)) {
      return [];
    }

    return this.selectedRoomSizeOptions(item).filter((room) => this.roomAreaValue(item.id, room).trim().length === 0);
  }

  private isAlwaysVisibleInUnfilled(section: Section): boolean {
    const name = this.normalize(section.name);
    return name === 'DRUH NEMOVITOSTI' || name === 'DRUH SLUZBY';
  }

  protected unfilledPrintBlocks(section: Section): PrintBlock[] {
    const entries = this.sectionUnfilledValues(section);
    const maxRowsPerBlock = 24;

    const blocks: PrintBlock[] = [];
    let currentRows: PrintRow[] = [];
    let blockIndex = 0;

    const flush = (): void => {
      const normalizedRows = currentRows.filter((row) => row.label.trim().length > 0 || row.value.trim().length > 0);
      if (normalizedRows.length === 0) {
        currentRows = [];
        return;
      }
      blocks.push({ title: blockIndex === 0 ? '' : `${section.name} - pokračování`, rows: normalizedRows });
      currentRows = [];
      blockIndex += 1;
    };

    const groups: Array<{ subtitle: string; values: string[] }> = [];
    for (const entry of entries) {
      const idx = entry.indexOf(':');
      if (idx <= 0) {
        groups.push({ subtitle: '', values: [entry] });
        continue;
      }

      const subtitle = entry.slice(0, idx).trim();
      const value = entry.slice(idx + 1).trim();
      const last = groups[groups.length - 1];
      if (last && this.normalize(last.subtitle) === this.normalize(subtitle)) {
        last.values.push(value);
      } else {
        groups.push({ subtitle, values: [value] });
      }
    }

    for (const group of groups) {
      const rowsNeeded = group.subtitle ? group.values.length + 1 : group.values.length;
      if (currentRows.length > 0 && currentRows.length + rowsNeeded > maxRowsPerBlock) {
        flush();
      }

      if (group.subtitle) {
        currentRows.push({ label: group.subtitle, value: '' });
      }

      for (const value of group.values) {
        if (group.subtitle) {
          const isYesNoPair = this.normalize(value) === 'ANO / NE';
          currentRows.push({ label: value, value: isYesNoPair ? '' : '☐' });
        } else {
          currentRows.push({ label: value, value: '______' });
        }
      }
    }

    flush();
    return blocks;
  }

  protected hasPrintBlockRows(block: PrintBlock): boolean {
    return block.rows.some((row) => row.label.trim().length > 0 || row.value.trim().length > 0);
  }

  protected compactPrintBlocks(section: Section): string[][] {
    const entries = this.sectionPrintValues(section);
    if (entries.length <= 12) {
      return entries.length > 0 ? [entries] : [[]];
    }

    const splitIndex = Math.ceil(entries.length / 2);
    const first = entries.slice(0, splitIndex);
    const second = entries.slice(splitIndex);
    return second.length > 0 ? [first, second] : [first];
  }

  protected compactPrintRows(): CompactPrintCell[][] {
    if (!this.isBuyerCompactPrintMode()) {
      return [];
    }

    const sections = this.compactOrderedSections(this.sectionsForRender());
    const linearBlocks: CompactPrintBlock[] = [];

    for (const section of sections) {
      const chunks = this.compactPrintBlocks(section)
        .map((entries) => entries.filter((entry) => entry.trim().length > 0))
        .filter((entries) => entries.length > 0);

      const sectionBlocks = chunks.map((entries) => ({
        title: section.name,
        entries,
        weight: entries.length + 1
      } as CompactPrintBlock));

      if (sectionBlocks.length === 0) {
        continue;
      }

      linearBlocks.push(...sectionBlocks);
    }

    const rows: CompactPrintCell[][] = [];
    for (let i = 0; i < linearBlocks.length; i += 3) {
      const row: CompactPrintCell[] = [
        { block: linearBlocks[i] || null },
        { block: linearBlocks[i + 1] || null },
        { block: linearBlocks[i + 2] || null }
      ];
      rows.push(row);
    }

    return rows;
  }

  private compactOrderedSections(sections: Section[]): Section[] {
    const order = [
      'ZAKLADNI INFORMACE',
      'KLIENT',
      'AML',
      'POZEMEK',
      'STAVBA',
      'BEZBARIEROVOST',
      'KOUPELNA',
      'MISTNOSTI',
      'GARAZ',
      'STRECHA',
      'OKNA',
      'DVERE',
      'PODLAHY',
      'ENERGETICKA TRIDA',
      'DOTACE',
      'PRIJEZDOVA KOMUNIKACE',
      'SAMOSTATNA GARAZ',
      'SLUZBY',
      'ZABEZPECENI NEMOVITOSTI',
      'ELEKTRINA',
      'VODA',
      'PLYN',
      'KANALIZACE',
      'TOPENI',
      'OHREV VODY',
      'DATOVE SITE',
      'PARKOVANI',
      'REKONSTRUKCE',
      'VYBAVENI',
      'NAKLADY',
      'OBLAST',
      'DOSTUPNOST V OKOLI',
      'INFRASTRUKTURA OBCE',
      'HLAVNI PREDNOSTI',
      'PRAVNI VADY A OMEZENI',
      'PRODEJ',
      'PRONAJEM',
      'CENA NAJMU',
      'ROZPIS SLUZEB',
      'DOPLNKOVE INFORMACE',
      'INFORMACE DO LETAKU'
    ];

    const rank = new Map<string, number>();
    order.forEach((name, index) => rank.set(name, index));

    return [...sections].sort((a, b) => {
      const aRank = rank.get(this.normalize(a.name));
      const bRank = rank.get(this.normalize(b.name));
      const ai = aRank === undefined ? Number.MAX_SAFE_INTEGER : aRank;
      const bi = bRank === undefined ? Number.MAX_SAFE_INTEGER : bRank;
      if (ai !== bi) {
        return ai - bi;
      }
      return a.order - b.order;
    });
  }

  protected isUnfilledChecklistRow(label: string): boolean {
    return false;
  }

  protected unfilledSectionChunks(section: Section): string[][] {
    const values = this.sectionUnfilledValues(section);
    const chunkSize = 22;
    const chunks: string[][] = [];

    for (let i = 0; i < values.length; i += chunkSize) {
      chunks.push(values.slice(i, i + chunkSize));
    }

    return chunks;
  }

  private unfilledSelectableOptions(item: ChecklistItem): string[] {
    if (!this.isSelection(item) || this.isInfrastructureField(item) || this.isYearSelection(item)) {
      return [];
    }

    return this.optionsForItem(item)
      .map((option) => option.trim())
      .filter((option) => option.length > 0 && !this.isCustomOption(option));
  }

  private printWithMode(mode: 'property' | 'buyer' | 'buyerAlt' | 'buyerCompact' | 'unfilled'): void {
    this.printMode.set(mode);
    this.printInProgress.set(true);

    const originalTitle = document.title;
    document.title = this.printDocumentTitle();

    const restoreTitle = (): void => {
      document.title = originalTitle;
      this.printInProgress.set(false);
      window.removeEventListener('afterprint', restoreTitle);
    };

    window.addEventListener('afterprint', restoreTitle);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.print();
      });
    });
  }

  private prepareData(rows: Record<string, string>[]): void {
    const propertyTypes = new Set<string>();
    const services = new Set<string>();
    const ownerships = new Set<string>();
    const sectionMap = new Map<string, Section>();

    for (const row of rows) {
      const sectionName = row['SEKCE'] || '';
      if (!sectionName) {
        continue;
      }

      const order = Number.parseInt(row['PORADI SEKCE'] || '999', 10);
      const property = this.splitList(row['DRUH NEMOVITOSTI']);
      const service = this.splitList(row['DRUH SLUZBY'] || row['SLUZBA']);
      const ownership = this.splitList(row['VLASTNICTVI'] || row['VLASTNICTVÍ']);

      property.forEach((value) => propertyTypes.add(value));
      service.forEach((value) => services.add(value));
      ownership.forEach((value) => ownerships.add(value));

      const key = `${order}-${sectionName}`;
      if (!sectionMap.has(key)) {
        sectionMap.set(key, { name: sectionName, order, items: [] });
      }

      const subtitle = (row['PODNADPIS'] || row['VLASTNOST'] || '').trim();
      const itemLabel = subtitle || (row['VLASTNOST'] || '').trim();

      const item: ChecklistItem = {
        id: this.buildItemId(row['PORADI CELKEM'], sectionName, subtitle, sectionMap.get(key)!.items.length),
        label: this.normalizeDisplayText(itemLabel),
        section: sectionName,
        info: (row['INFORMACE'] || '').trim(),
        action: this.normalize(row['AKCE']),
        actionRaw: row['AKCE']?.trim() || '',
        options: this.parseOptions(row['VYBER ZE SEZNAMU']),
        propertyTypes: property,
        services: service,
        ownerships: ownership,
        specialRule: row['SPECIALNI'] || row['SPECIÁLNÍ'] || '',
        showToBuyer: this.parseBooleanFlag(row['ZOBRAZOVAT KUPUJICIMU'] || row['ZOBRAZOVAT KUPUJÍCÍMU'])
      };

      const normalizedLabel = this.normalize(item.label);
      if (normalizedLabel.includes('SJIZDNA NA') && normalizedLabel.includes('K POZEMKU')) {
        continue;
      }

      if (this.allowsCustomOption(item)) {
        item.options = item.options.filter((option) => !this.isCustomOption(option));
        item.options.push(this.customOptionLabel);
      }

      sectionMap.get(key)!.items.push(item);
    }

    this.sections.set(Array.from(sectionMap.values()).sort((a, b) => a.order - b.order));
    const propertyOptions = this.sortOptionsWithCustomLast(Array.from(propertyTypes));
    const serviceOptions = this.sortOptionsWithCustomLast(Array.from(services), ['Prodej', 'Pronájem', 'Podnájem']);
    const ownershipOptions = this.sortOptionsWithCustomLast(Array.from(ownerships), ['Osobní', 'Družstevní', 'Podílové', 'Kombinované']);

    this.propertyTypeOptions.set(propertyOptions);
    this.serviceOptions.set(serviceOptions);
    this.ownershipOptions.set(ownershipOptions);
  }

  private getState(itemId: string): ItemState {
    if (!this.states.has(itemId)) {
      this.states.set(itemId, {
        selectedOptions: new Set<string>(),
        customOptionText: '',
        customOptionDraft: '',
        customOptionEditing: false,
        textValue: '',
        dimensionFirst: '',
        dimensionSecond: '',
        dimensionThird: '',
        optionAmounts: {},
        optionTexts: {},
        optionModes: {},
        optionUnits: {},
        roomDimensions: {},
        roomAreas: {},
        customInfrastructureRows: [],
        customServiceRows: [],
        customMoneyRows: [],
        customTextRows: [],
        travelMode: '',
        customReconstructionRows: [],
        nearestStopRows: [],
        checked: false,
        yesNo: null,
        dateValue: '',
        uploadedFile: null,
        floorPlanPhotos: [],
        customParcelRows: []
      });
    }
    return this.states.get(itemId)!;
  }

  private parseOptions(value: string): string[] {
    if (!value?.trim()) {
      return [];
    }

    if (value.includes('\n')) {
      return value
        .split('\n')
        .map((part) => part.trim())
        .filter(Boolean);
    }

    if (value.includes(',')) {
      return value
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean);
    }

    return [value.trim()];
  }

  private buildItemId(order: string, sectionName: string, label: string, indexInSection: number): string {
    const base = (order || 'item').trim();
    const section = this.normalize(sectionName || 'SEKCE');
    const property = this.normalize(label || 'POLOZKA');
    return `${base}-${section}-${property}-${indexInSection}`;
  }

  private normalizeDisplayText(text: string): string {
    const normalizedEnergy = text.replace(/\*?\s*bez\s*energi[ií]\s*a\s*služeb/iu, '*bez energií a služeb');
    return normalizedEnergy.replace(/\s{2,}/g, ' ').trim();
  }

  private splitList(value: string): string[] {
    if (!value?.trim()) {
      return [];
    }

    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  private parseBooleanFlag(value: string): boolean {
    const normalized = this.normalize((value || '').trim());
    if (!normalized) {
      return false;
    }

    return normalized === '1';
  }

  private itemPersistenceKey(item: ChecklistItem): string {
    return [this.normalize(item.section), this.normalize(item.label), this.normalize(item.actionRaw || item.action || '')].join('|');
  }

  private itemPersistenceKeyById(itemId: string): string {
    const item = this.findItemById(itemId);
    return item ? this.itemPersistenceKey(item) : '';
  }

  private resolveLoadTargetItemId(savedItemId: string, savedItemKey: string): string {
    if (savedItemId && this.findItemById(savedItemId)) {
      return savedItemId;
    }

    if (!savedItemKey) {
      return '';
    }

    for (const section of this.sections()) {
      for (const item of section.items) {
        if (this.itemPersistenceKey(item) === savedItemKey) {
          return item.id;
        }
      }
    }

    return '';
  }

  private prepareRoomAreaRules(rows: Record<string, string>[]): void {
    this.roomAreaRules.clear();
    this.roomAreaInfo.clear();

    const infoRow = rows[0] || {};
    this.roomAreaInfo.set('podlahova', this.getRowValueByAliases(infoRow, ['PODLAHOVA PLOCHA', 'PODLAHOVA']));
    this.roomAreaInfo.set('obytna', this.getRowValueByAliases(infoRow, ['OBYTNA PLOCHA', 'OBYTNA']));
    this.roomAreaInfo.set('uzitna', this.getRowValueByAliases(infoRow, ['UZITNA PLOCHA', 'UZITNA', 'UŽITNÁ']));
    this.roomAreaInfo.set(
      'celkovaUzitna',
      this.getRowValueByAliases(infoRow, ['CELKOVA UZITNA PLOCHA', 'CELKOVA UZITNA', 'CELKOVÁ UŽITNÁ PLOCHA'])
    );

    for (const row of rows) {
      const room = this.getRowValueByAliases(row, [
        'MISTNOST',
        'MÍSTNOST',
        'NAZEV MISTNOSTI',
        'NÁZEV MÍSTNOSTI',
        'NAZVY MISTNOSTI',
        'NÁZVY MÍSTNOSTÍ'
      ]);
      if (!room) {
        continue;
      }

      const normalizedRoom = this.normalize(room);
      const rule = {
        podlahova: this.isAreaRuleActive(this.getRowValueByAliases(row, ['PODLAHOVA', 'PODLAHOVA PLOCHA'])),
        obytna: this.isAreaRuleActive(this.getRowValueByAliases(row, ['OBYTNA', 'OBYTNA PLOCHA'])),
        uzitna: this.isAreaRuleActive(this.getRowValueByAliases(row, ['UZITNA', 'UŽITNÁ', 'UZITNA PLOCHA', 'UŽITNÁ PLOCHA'])),
        celkovaUzitna: this.isAreaRuleActive(
          this.getRowValueByAliases(row, ['CELKOVA UZITNA', 'CELKOVA UZITNA PLOCHA', 'CELKOVÁ UŽITNÁ', 'CELKOVÁ UŽITNÁ PLOCHA'])
        )
      };

      this.roomAreaRules.set(normalizedRoom, rule);

      const normalizedWithoutIndex = this.stripRoomIndex(normalizedRoom);
      if (normalizedWithoutIndex && !this.roomAreaRules.has(normalizedWithoutIndex)) {
        this.roomAreaRules.set(normalizedWithoutIndex, rule);
      }
    }
  }

  private roomAreaRuleForRoom(room: string): RoomAreaRule | undefined {
    const normalized = this.normalize(room);
    return this.roomAreaRules.get(normalized) || this.roomAreaRules.get(this.stripRoomIndex(normalized));
  }

  private stripRoomIndex(value: string): string {
    return value.replace(/\s+\d+$/, '').trim();
  }

  private getRowValueByAliases(row: Record<string, string>, aliases: string[]): string {
    for (const alias of aliases) {
      const key = this.normalize(alias);
      if (row[key] !== undefined) {
        return (row[key] || '').trim();
      }
    }
    return '';
  }

  private isAreaRuleActive(value: string): boolean {
    return this.normalize(value) === 'A';
  }

  private includesNormalized(values: string[], selected: string): boolean {
    const normalizedSelected = this.normalize(selected);
    return values.some((value) => this.normalize(value) === normalizedSelected);
  }

  private numericSuffix(item: ChecklistItem): string {
    if (this.isPhoneField(item)) {
      return '';
    }

    const match = item.actionRaw.match(/form[aá]t\s*"([^"]+)"/i);
    if (match) {
      const formatPattern = match[1];
      const suffix = formatPattern.replace(/^[xX0-9.,\s]+/, '').trim();
      if (suffix) {
        return ` ${suffix}`;
      }
    }

    const normalized = this.normalize(item.actionRaw);
    if (normalized.includes('KC')) {
      return ' Kč';
    }
    if (normalized.includes('M2') || normalized.includes('M²')) {
      return ' m²';
    }
    if (normalized.includes(' M') || normalized.endsWith('M')) {
      return ' m';
    }

    return '';
  }

  private numericSuffixForValue(item: ChecklistItem, formattedNumber: string): string {
    if (this.isOwnParkingField(item)) {
      const count = this.parseIntegerFromFormatted(formattedNumber);
      return ` ${this.parkingPlaceWord(count)}`;
    }

    return this.numericSuffix(item);
  }

  private isOwnParkingField(item: ChecklistItem): boolean {
    const label = this.normalize(item.label);
    return label.includes('VLASTNI PARKOVANI');
  }

  private parseIntegerFromFormatted(value: string): number {
    const digits = value.replace(/\D/g, '');
    if (!digits) {
      return 0;
    }
    return Number.parseInt(digits, 10) || 0;
  }

  private parkingPlaceWord(count: number): string {
    if (count === 1) {
      return 'parkovací místo';
    }

    const mod100 = count % 100;
    const mod10 = count % 10;
    if (mod100 >= 12 && mod100 <= 14) {
      return 'parkovacích míst';
    }

    if (mod10 >= 2 && mod10 <= 4) {
      return 'parkovací místa';
    }

    return 'parkovacích míst';
  }

  private allowDecimalComma(item: ChecklistItem): boolean {
    if (this.isPhoneField(item)) {
      return false;
    }

    const suffix = this.numericSuffix(item).toLowerCase();
    const action = this.normalize(item.actionRaw);

    return (
      suffix.includes('m') ||
      suffix.includes('kč') ||
      action.includes(' KC') ||
      action.includes('KC,') ||
      action.includes('KC ') ||
      action.includes('KORUN')
    );
  }

  private formatNumericValue(value: string, allowDecimal: boolean, normalizeForBlur: boolean): string {
    const clean = value.replace(/\s/g, '');

    if (!allowDecimal) {
      const digits = clean.replace(/\D/g, '');
      return this.formatThousands(digits);
    }

    const sanitized = clean.replace(/[^0-9,]/g, '');
    const parts = sanitized.split(',');
    const integerPart = (parts.shift() || '').replace(/\D/g, '');
    const decimalPartRaw = parts.join('').replace(/\D/g, '');
    const integerFormatted = this.formatThousands(integerPart);

    if (!integerFormatted && !decimalPartRaw) {
      return '';
    }

    if (!decimalPartRaw) {
      return normalizeForBlur ? integerFormatted : (sanitized.includes(',') ? `${integerFormatted},` : integerFormatted);
    }

    return `${integerFormatted},${decimalPartRaw}`;
  }

  private formatThousands(digits: string): string {
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const length = binary.length;
    const bytes = new Uint8Array(length);
    for (let i = 0; i < length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  private isPhoneField(item: ChecklistItem): boolean {
    const label = this.normalize(item.label);
    return label.includes('TELEFON');
  }

  private parseAmount(value: string): number {
    const cleaned = value
      .replace(/\s/g, '')
      .replace(/Kč/gi, '')
      .replace(/\./g, '')
      .replace(',', '.');

    const parsed = Number.parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private formatCzechAmount(value: number): string {
    const fixed = Number.isInteger(value) ? value.toString() : value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
    const parts = fixed.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return parts.join(',');
  }

  private formatCzechCurrencyFixed(value: number): string {
    const fixed = Math.max(0, value).toFixed(2);
    const parts = fixed.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${parts[0]},${parts[1]}`;
  }

  private formatNearestStopValue(value: string, unit: 'min' | 'hod' | '' = 'min'): string {
    void unit;
    const trimmed = value.trim();
    if (!trimmed) {
      return '';
    }

    const numeric = trimmed.replace(/[^0-9,]/g, '');
    const parts = numeric.split(',');
    const whole = (parts.shift() || '').replace(/\D/g, '');
    const decimal = parts.join('').replace(/\D/g, '').slice(0, 2);

    if (!whole && !decimal) {
      return '';
    }

    return decimal ? `${whole || '0'},${decimal}` : whole;
  }

  private parseDecimalNumber(value: string): number {
    const normalized = value.replace(/\s/g, '').replace(',', '.');
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private sanitizeRoomDimension(value: string, withUnit: boolean): string {
    const cleaned = value
      .replace(/\s*m$/i, '')
      .replace(/[^0-9,\.]/g, '')
      .replace(/\./g, ',');

    const parts = cleaned.split(',');
    const whole = (parts.shift() || '').replace(/\D/g, '').slice(0, 3);
    const decimal = parts.join('').replace(/\D/g, '').slice(0, 2);

    if (!whole && !decimal) {
      return '';
    }

    const base = decimal ? `${whole || '0'},${decimal}` : whole;
    return withUnit ? `${base} m` : base;
  }

  private sanitizeRoomArea(value: string, withUnit: boolean): string {
    const cleaned = value
      .replace(/\s*m\s*2$/i, '')
      .replace(/\s*m²\s*$/i, '')
      .replace(/[^0-9,\.]/g, '')
      .replace(/\./g, ',');

    const parts = cleaned.split(',');
    const whole = (parts.shift() || '').replace(/\D/g, '').slice(0, 4);
    const decimal = parts.join('').replace(/\D/g, '').slice(0, 2);

    if (!whole && !decimal) {
      return '';
    }

    const base = decimal ? `${whole || '0'},${decimal}` : whole;
    return withUnit ? `${base} m²` : base;
  }

  private roomAreaNumber(itemId: string, room: string): number {
    const state = this.stateFor(itemId);
    const manual = state.roomAreas[room] || '';
    const manualParsed = this.parseDecimalNumber(manual.replace(/\s*m²?\s*$/i, ''));
    if (manualParsed > 0) {
      return manualParsed;
    }

    const dims = state.roomDimensions[room] || { width: '', length: '' };
    const width = this.parseDecimalNumber(dims.width);
    const length = this.parseDecimalNumber(dims.length);
    if (width <= 0 || length <= 0) {
      return 0;
    }

    return width * length;
  }

  private compactRoomDimension(value: string): string {
    return value.replace(/\s*m\s*$/i, '').replace(/\s+/g, '').trim();
  }

  private compactAreaText(value: string): string {
    return value.replace(/\s+/g, '').trim();
  }

  private roomAreaCategoryFromLabel(label: string): keyof RoomAreaRule | null {
    const normalized = this.normalize(label);
    if (normalized.includes('PODLAHOVA') && normalized.includes('PLOCHA')) {
      return 'podlahova';
    }
    if (normalized.includes('OBYTNA') && normalized.includes('PLOCHA')) {
      return 'obytna';
    }
    if (normalized.includes('UZITNA') && normalized.includes('PLOCHA') && !normalized.includes('CELKOVA')) {
      return 'uzitna';
    }
    if (normalized.includes('CELKOVA') && normalized.includes('UZITNA') && normalized.includes('PLOCHA')) {
      return 'celkovaUzitna';
    }
    return null;
  }

  private findRoomSizeSourceItem(sectionName: string): ChecklistItem | null {
    const normalizedSection = this.normalize(sectionName);
    for (const section of this.sections()) {
      if (this.normalize(section.name) !== normalizedSection) {
        continue;
      }
      const source = section.items.find((item) => this.isRoomSizeListField(item));
      if (source) {
        return source;
      }
    }

    return null;
  }

  private isStandaloneRoomSizeField(item: ChecklistItem): boolean {
    const section = this.normalize(item.section);
    const label = this.normalize(item.label);
    return section.includes('MISTNOSTI') && label.includes('VELIKOST MISTNOST') && !this.isRoomSizeListField(item);
  }

  private formatDateInput(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 8);
    const day = digits.slice(0, 2);
    const month = digits.slice(2, 4);
    const year = digits.slice(4, 8);

    if (digits.length <= 2) {
      return day;
    }

    if (digits.length <= 4) {
      return `${day}.${month}`;
    }

    return `${day}.${month}.${year}`;
  }

  private displayTextValue(item: ChecklistItem, state: ItemState): string {
    if (this.isMinimumRentField(item)) {
      return this.minimumRentText(item).trim();
    }

    if (this.isRecommendedDepositField(item)) {
      return this.recommendedDepositText(item).trim();
    }

    if (this.isProfitField(item)) {
      return this.profitText(item).trim();
    }

    if (!this.isDimensionField(item)) {
      return state.textValue.trim();
    }

    if (this.isParcelAreaField(item)) {
      const first = state.dimensionFirst.trim();
      const second = state.dimensionSecond.trim();
      return [first, second].filter(Boolean).join(', ');
    }

    if (this.isCellarDimensionField(item)) {
      return this.formatCellarDimensions(state);
    }

    const first = state.dimensionFirst.trim();
    const second = state.dimensionSecond.trim();
    const third = state.dimensionThird.trim();
    if (!first && !second) {
      return third || state.textValue.trim();
    }

    if (first && second && third) {
      return `${first} x ${second} x ${third}`;
    }

    if (first && second) {
      return `${first} x ${second}`;
    }

    if (first || second || third) {
      return `${first || second || third}`;
    }

    return '';
  }

  private formatCellarDimensions(state: ItemState): string {
    const first = this.stripMeterSuffix(state.dimensionFirst);
    const second = this.stripMeterSuffix(state.dimensionSecond);
    const width = this.parseDecimalNumber(first);
    const depth = this.parseDecimalNumber(second);
    const area = width > 0 && depth > 0 ? `${this.formatCzechAmount(width * depth)} m²` : '';
    const parts = [first, second].filter(Boolean);

    if (parts.length === 0) {
      return '';
    }

    if (area) {
      return `${parts.join(' x ')} m = ${area}`;
    }

    return `${parts.join(' x ')} m`;
  }

  private stripMeterSuffix(value: string): string {
    return value.replace(/\s*m\s*$/i, '').trim();
  }

  protected isParcelAreaField(item: ChecklistItem): boolean {
    const section = this.normalize(item.section);
    const label = this.normalize(item.label);
    const action = this.normalize(item.actionRaw || item.action || '');
    const hasParcel = action.includes('PARCEL');
    const hasParcelType = action.includes('DRUH PARCEL');
    const hasArea = action.includes('M2') || action.includes('M 2') || action.includes('METR') || action.includes('M²');
    const allowedSection = section.includes('POZEMEK') || section.includes('STAVBA');
    return allowedSection && hasParcel && hasParcelType && hasArea && !label.includes('VYMERA');
  }

  private sortOptionsWithCustomLast(options: string[], preferredOrder: string[] = []): string[] {
    const cleaned = options.filter(Boolean);
    const withoutCustom = cleaned.filter((option) => !this.isCustomOption(option));
    const orderMap = new Map(preferredOrder.map((value, index) => [this.normalize(value), index]));

    const sorted = withoutCustom.sort((a, b) => {
      const aOrder = orderMap.get(this.normalize(a));
      const bOrder = orderMap.get(this.normalize(b));

      if (aOrder !== undefined && bOrder !== undefined) {
        return aOrder - bOrder;
      }

      if (aOrder !== undefined) {
        return -1;
      }

      if (bOrder !== undefined) {
        return 1;
      }

      return a.localeCompare(b, 'cs');
    });

    if (cleaned.some((option) => this.isCustomOption(option))) {
      sorted.push(this.customOptionLabel);
    }

    return sorted;
  }

  private syncFiltersFromItem(item: ChecklistItem): void {
    const section = this.normalize(item.section);
    const label = this.normalize(item.label);
    const selected = this.selectedOptionsList(item.id);
    const value = selected[0] || '';

    const isPropertySelector =
      section === 'DRUH NEMOVITOSTI' ||
      label === 'NEMOVITOST';

    if (isPropertySelector) {
      this.selectedPropertyType.set(value);
    }

    const isServiceSelector =
      section === 'DRUH SLUZBY' ||
      label === 'SLUZBA';

    if (isServiceSelector) {
      this.selectedService.set(value);
    }

    const isOwnershipSelector =
      section === 'VLASTNICTVI' ||
      section === 'DRUH VLASTNICTVI' ||
      label === 'VLASTNICTVI' ||
      label === 'DRUH VLASTNICTVI';

    if (isOwnershipSelector) {
      this.selectedOwnership.set(value);
    }
  }

  private findItemById(itemId: string): ChecklistItem | null {
    const baseId = this.baseItemId(itemId);
    for (const section of this.sections()) {
      const found = section.items.find((item) => item.id === baseId);
      if (found) {
        return found;
      }
    }

    return null;
  }

  private clientScopedItem(item: ChecklistItem, clientIndex: number): ChecklistItem {
    if (clientIndex === 0) {
      return item;
    }

    return { ...item, id: this.clientScopedItemId(item.id, clientIndex) };
  }

  private clientScopedItemId(itemId: string, clientIndex: number): string {
    return clientIndex === 0 ? itemId : `${itemId}__client_${clientIndex + 1}`;
  }

  private clientIndexFromItemId(itemId: string): number {
    const match = itemId.match(/__client_(\d+)$/);
    if (!match) {
      return 0;
    }

    const parsed = Number.parseInt(match[1], 10);
    return Number.isFinite(parsed) && parsed > 1 ? parsed - 1 : 0;
  }

  private baseItemId(itemId: string): string {
    return itemId.replace(/__client_\d+$/, '');
  }

  private baseItemFromClientScopedItem(item: ChecklistItem): ChecklistItem {
    const baseId = this.baseItemId(item.id);
    const found = this.findItemById(baseId);
    return found || item;
  }

  private fieldValue(sectionName: string, labelName: string): string {
    const item = this.findItemBySectionAndLabel(sectionName, labelName);
    if (!item) {
      return '';
    }

    const selected = this.selectedOptionsList(item.id);
    if (selected.length > 0) {
      return selected.join(', ');
    }

    const state = this.stateFor(item.id);
    if (state.yesNo) {
      return state.yesNo;
    }

    return this.displayTextValue(item, state).trim();
  }

  private fieldValueAny(sectionName: string, labelNames: string[]): string {
    for (const label of labelNames) {
      const value = this.fieldValue(sectionName, label);
      if (value.trim().length > 0) {
        return value;
      }
    }
    return '';
  }

  private fieldOptionsAny(sectionName: string, labelNames: string[]): string[] {
    for (const label of labelNames) {
      const options = this.fieldOptions(sectionName, label);
      if (options.length > 0) {
        return options;
      }
    }
    return [];
  }

  private hasSelectedOptionAny(sectionName: string, labelNames: string[], option: string): boolean {
    return labelNames.some((label) => this.hasSelectedOption(sectionName, label, option));
  }

  private fieldOptions(sectionName: string, labelName: string): string[] {
    const item = this.findItemBySectionAndLabel(sectionName, labelName);
    if (!item) {
      return [];
    }
    return this.optionsForItem(item).filter((option) => !this.isCustomOption(option));
  }

  private hasSelectedOption(sectionName: string, labelName: string, option: string): boolean {
    const item = this.findItemBySectionAndLabel(sectionName, labelName);
    if (!item) {
      return false;
    }
    const normalizedOption = this.normalize(option);
    return this.selectedOptionsList(item.id).some((selected) => this.normalize(selected) === normalizedOption);
  }

  private fieldYesNo(sectionName: string, labelName: string): YesNo {
    const item = this.findItemBySectionAndLabel(sectionName, labelName);
    if (!item) {
      return null;
    }

    const yesNoState = this.stateFor(item.id).yesNo;
    if (yesNoState === 'ANO' || yesNoState === 'NE') {
      return yesNoState;
    }

    const selected = this.selectedOptionsList(item.id);
    const hasAno = selected.some((value) => this.normalize(value) === 'ANO');
    const hasNe = selected.some((value) => this.normalize(value) === 'NE');
    if (hasAno && !hasNe) {
      return 'ANO';
    }
    if (hasNe && !hasAno) {
      return 'NE';
    }

    const normalizedTextValue = this.normalize(this.stateFor(item.id).textValue || '');
    if (normalizedTextValue === 'ANO' || normalizedTextValue === 'NE') {
      return normalizedTextValue as YesNo;
    }

    return null;
  }

  private collectValuesFromSectionByLabelKeywords(sectionName: string, labelKeywords: string[]): string {
    const normalizedSection = this.normalize(sectionName);
    const normalizedKeywords = labelKeywords
      .map((keyword) => this.normalizeForLooseMatch(keyword))
      .filter((keyword) => keyword.length > 0);
    const values: string[] = [];

    for (const section of this.sections()) {
      if (!this.areSectionNamesEquivalent(this.normalize(section.name), normalizedSection)) {
        continue;
      }

      for (const item of section.items) {
        const normalizedItemLabel = this.normalizeForLooseMatch(item.label);
        const matchesKeyword = normalizedKeywords.some((keyword) =>
          normalizedItemLabel.includes(keyword) || keyword.includes(normalizedItemLabel)
        );

        if (!matchesKeyword) {
          continue;
        }

        const selected = this.selectedOptionsList(item.id)
          .map((option) => option.trim())
          .filter((option) => option.length > 0);

        if (selected.length > 0) {
          values.push(...selected);
        }

        const textValue = this.displayTextValue(item, this.stateFor(item.id)).trim();
        if (textValue.length > 0) {
          values.push(textValue);
        }
      }
    }

    return Array.from(new Set(values)).join('; ');
  }

  private normalize(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .trim();
  }

  private escapeXml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private sanitizeFileName(value: string): string {
    const cleaned = value
      .replace(/[\\/:*?"<>|]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return cleaned || 'nabor-nemovitosti';
  }

  private csvToObjects(csvText: string): Record<string, string>[] {
    const rows = this.parseCsv(csvText);
    if (rows.length < 2) {
      return [];
    }

    const headers = rows[0].map((header) => this.normalize(header));

    return rows.slice(1).map((cells) => {
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = cells[index]?.trim() || '';
      });
      return row;
    });
  }

  private parseCsv(text: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let value = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      const next = text[i + 1];

      if (char === '"') {
        if (inQuotes && next === '"') {
          value += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }

      if (char === ',' && !inQuotes) {
        row.push(value);
        value = '';
        continue;
      }

      if ((char === '\n' || char === '\r') && !inQuotes) {
        if (char === '\r' && next === '\n') {
          i += 1;
        }
        row.push(value);
        rows.push(row);
        row = [];
        value = '';
        continue;
      }

      value += char;
    }

    if (value.length > 0 || row.length > 0) {
      row.push(value);
      rows.push(row);
    }

    return rows;
  }
}
