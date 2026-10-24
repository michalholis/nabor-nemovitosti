export type HandoverReturnValues = Record<string, string>;

interface ReturnField { key: string; label: string; lines: number; money?: boolean; inline?: boolean; boxes?: number }
interface ReturnCheck { key: string; label: string }
interface ReturnGroup { key: string; title: string; intro?: string; checks?: ReturnCheck[]; fields?: ReturnField[]; note?: string }

export const HANDOVER_RETURN_GROUPS: ReturnGroup[] = [
  {
    key: 'equipment', title: 'DALŠÍ VYBAVENÍ A DOKUMENTACE',     fields: [
      { key: 'returnEquipment', label: 'Nájemce předal pronajímateli následující vybavení, dokumenty či další předměty:', lines: 3, boxes: 3 }
    ]
  },
  {
    key: 'condition', title: 'STAV NEMOVITOSTI PŘI VRÁCENÍ NÁJMU', intro: 'Nemovitost je předávána',
    checks: [
      { key: 'returnCleared', label: 'Vyklizená, bez osobních věcí nájemce' },
      { key: 'returnClean', label: 'Uklizená a v čistém stavu' },
      { key: 'returnNoDefects', label: 'Bez zjevných závad nad rámec běžného opotřebení' },
      { key: 'returnHasDefects', label: 'Se závadami nebo poškozením uvedeným níže' },
      { key: 'returnWithItems', label: 'S ponechaným vybavením nebo věcmi uvedenými níže' }
    ],
    fields: [
      { key: 'returnDefects', label: 'Zjištěné závady, poškození a nedostatky:', lines: 4 },
      { key: 'returnRepairs', label: 'Dohodnutý způsob odstranění závad, odpovědná osoba a termín:', lines: 3 },
      { key: 'returnKeysExceptions', label: 'Nájemce prohlašuje, že předal veškeré klíče a přístupové prostředky, které má k dispozici, případně uvádí následující výjimky:', lines: 2 }
    ]
  },
  {
    key: 'finance', title: 'FINANČNÍ VYPOŘÁDÁNÍ A JISTOTA (KAUCE)', fields: [
      { key: 'returnDepositAmount', label: 'Výše složené peněžité jistoty:', lines: 1, money: true },
      { key: 'returnUnpaidDebts', label: 'Dosud známé neuhrazené závazky nájemce:', lines: 2 },
      { key: 'returnDamageCosts', label: 'Zjištěné škody a předpokládané náklady na jejich odstranění:', lines: 2 },
      { key: 'returnDepositAgreement', label: 'Dohoda o vypořádání jistoty:', lines: 3 },
      { key: 'returnRefundAmount', label: 'Částka k vrácení nájemci, je-li již určena:', lines: 1, money: true },
      { key: 'returnBankAccount', label: 'Číslo bankovního účtu nájemce pro vrácení jistoty:', lines: 1, inline: true }
    ],
    note: 'Případné dosud nevyúčtované služby a energie budou vypořádány samostatně v souladu s nájemní smlouvou a právními předpisy.'
  },
  {
    key: 'photos', title: 'Fotodokumentace', checks: [
      { key: 'returnPhotosTaken', label: 'Při předání byla pořízena fotodokumentace.' },
      { key: 'returnPhotosAttached', label: 'Fotodokumentace tvoří přílohu tohoto protokolu.' },
      { key: 'returnPhotosNotTaken', label: 'Fotodokumentace nebyla pořízena.' }
    ]
  }
];

export interface HandoverConclusion { key: string; text: string; defaultOn?: boolean }

export const HANDOVER_RETURN_CONCLUSIONS: HandoverConclusion[] = [
  { key: 'conclusionIntroduced', defaultOn: true, text: 'Smluvní strany potvrzují, že se seznámily s obsahem tohoto předávacího protokolu a že uvedené údaje odpovídají skutečnostem zjištěným při předání nemovitosti, případně s výhradami výslovně uvedenými v tomto protokolu.' },
  { key: 'conclusionSignature', defaultOn: true, text: 'Podpis tohoto protokolu potvrzuje faktické předání a převzetí nemovitosti. Sám o sobě nepředstavuje vzdání se nároků na úhradu dluhů, náhradu škody, vrácení jistoty ani na vyúčtování služeb, pokud není výslovně písemně dohodnuto jinak.' },
  { key: 'conclusionEarlyTermination', text: 'Převzetí domu není dohodou o předčasném ukončení nájmu. Případné předčasné ukončení nájmu podléhá podmínkám nájemní smlouvy a příslušným právním předpisům.' },
  { key: 'conclusionCopies', defaultOn: true, text: 'Protokol je vyhotoven ve dvou stejnopisech, z nichž každá smluvní strana obdrží jeden.' }
];

export function handoverConclusionChecked(conclusion: HandoverConclusion, values: HandoverReturnValues): boolean {
  return conclusion.defaultOn ? values[conclusion.key] !== 'NE' : values[conclusion.key] === 'ANO';
}

export function handoverReturnCellarEnabled(values: HandoverReturnValues): boolean {
  if (values['cellarReturnSectionVisible'] === 'ANO') return true;
  if (values['cellarReturnSectionVisible'] === 'NE') return false;
  return values['cellarVisible'] === 'ANO' || Boolean((values['cellar'] || '').trim() || (values['cellarNumber'] || '').trim() || (values['cellarRemains'] || '').trim());
}

export function handoverReturnCheckChanges(key: string, checked: boolean): HandoverReturnValues {
  const changes: HandoverReturnValues = { [key]: checked ? 'ANO' : 'NE' };
  if (!checked) return changes;
  if (key === 'returnNoDefects') changes['returnHasDefects'] = 'NE';
  if (key === 'returnHasDefects') changes['returnNoDefects'] = 'NE';
  if (key === 'returnPhotosNotTaken') {
    changes['returnPhotosTaken'] = 'NE';
    changes['returnPhotosAttached'] = 'NE';
  }
  if (key === 'returnPhotosTaken' || key === 'returnPhotosAttached') changes['returnPhotosNotTaken'] = 'NE';
  return changes;
}

export function formatHandoverPropertyAddress(address: string): string[] {
  const clean = address.replace(/\([^)]*(?:kraj|Praha)[^)]*\)/gi, '').trim();
  const parts = clean.split(/[,\n]+/).map(part => part.trim()).filter(Boolean);
  let street = parts.shift() || '';
  let locality = parts.filter(part => !/\bkraj\b|^(?:ČR|Česko|Česká republika|Czech Republic)$/i.test(part)).join(', ');
  if (!locality) {
    const inlinePostcode = street.match(/\b(\d{3})\s?(\d{2})\b/);
    const withoutPostcode = inlinePostcode ? street.replace(inlinePostcode[0], '').replace(/\s+/g, ' ').trim() : street;
    const split = withoutPostcode.match(/^(.+?\s+(?:č\.\s*(?:p|ev)\.\s*)?\d+(?:\/\d+)?[a-z]?)\s+([^\d].*)$/i);
    if (split) { street = split[1]; locality = [split[2], inlinePostcode?.[0]].filter(Boolean).join(' '); }
  }
  const postcode = locality.match(/\b(\d{3})\s?(\d{2})\b/);
  if (postcode) {
    const city = locality.replace(postcode[0], '').replace(/^[\s,]+|[\s,]+$/g, '').replace(/\s+/g, ' ');
    locality = [city, `${postcode[1]} ${postcode[2]}`].filter(Boolean).join(' ');
  }
  return [street, locality].filter(Boolean);
}

export function renderHandoverReturnSections(values: HandoverReturnValues, escape: (value: string) => string): { afterKeys: string; beforeRemains: string; afterDetails: string; extended: boolean } {
  const section = (title: string, body: string, key: string) => `<div class="section handover-return-section" data-return-section="${key}"><div class="section-title">${escape(title)}</div>${body}</div>`;
  const field = (definition: ReturnField): string => {
    if (definition.key === 'returnDepositAgreement' && values['returnDepositAgreementVisible'] === 'NE') return '';
    const value = (values[definition.key] || '').trim();
    if (definition.money || definition.inline) return `<div class="handover-write-field" data-return-field="${definition.key}"><div class="handover-detail handover-money-detail"><div class="handover-detail-label">${escape(definition.label)}</div><div class="handover-detail-value">${value ? escape(value) : ''}${definition.money ? '<span class="handover-currency">Kč</span>' : ''}</div></div></div>`;
    const configuredBoxes = Number.parseInt(values[`${definition.key}WritingRows`] || '', 10);
    const boxCount = Number.isFinite(configuredBoxes) ? Math.min(10, Math.max(1, configuredBoxes)) : definition.boxes || 4;
    const boxes = Array.from({ length: boxCount }, (_, index) => `<div class="handover-write-box">${index === 0 && value ? escape(value) : '&nbsp;'}</div>`).join('');
    return `<div class="handover-write-field" data-return-field="${definition.key}"><div class="handover-write-label">${escape(definition.label)}</div><div class="handover-write-boxes">${boxes}</div></div>`;
  };
  const group = (definition: ReturnGroup): string => {
    const body = (definition.key === 'condition' ? `<div class="section-title">STAV NEMOVITOSTI PŘI VRÁCENÍ NÁJMU</div>` : '')
    + (definition.intro ? definition.key === 'condition' ? `<div class="handover-write-label">${escape(definition.intro)}</div>` : `<p>${escape(definition.intro)}</p>` : '')
    + (definition.checks || []).map(check => `<div class="handover-return-check"><span>${values[check.key] === 'ANO' ? '☑' : '☐'}</span> ${escape(check.label)}</div>`).join('')
    + (definition.key === 'condition' ? `<div class="handover-write-label">V nemovitosti zůstává</div><div class="handover-write-boxes">${Array.from({ length: Math.min(10, Math.max(1, Number.parseInt(values['remainsInPropertyWritingRows'] || '', 10) || 1)) }, (_, index) => `<div class="handover-write-box">${index === 0 && values['remainsInProperty'] ? escape(values['remainsInProperty']) : '&nbsp;'}</div>`).join('')}</div>` : '')
    + (definition.key === 'condition' && handoverReturnCellarEnabled(values) ? `<div class="handover-write-label">Sklep je předáván</div>
      <div class="handover-detail cellar-main-label"><div class="handover-detail-label">Označení sklepu:</div><div class="handover-detail-value">${escape(values['cellar'] || '')}</div></div>${[
      ['cleared', 'Vyklizený, bez osobních věcí nájemce'],
      ['clean', 'Uklizený a v čistém stavu'],
      ['no-defects', 'Bez zjevných závad nad rámec běžného opotřebení'],
      ['defects', 'Se závadami nebo poškozením uvedenými níže'],
      ['items', 'S ponechaným vybavením nebo věcmi uvedenými níže']
    ].map(([key, label]) => `<div class="handover-return-check"><span>${values[`cellar-section-${key}`] === 'ANO' ? '☑' : '☐'}</span> ${escape(label)}</div>`).join('')}
      <div class="handover-write-label cellar-remains-print-label">Ve sklepě zůstává:</div>
      <div class="handover-write-boxes cellar-remains-print-boxes">${Array.from({ length: Math.min(10, Math.max(1, Number.parseInt(values['cellarRemainsWritingRows'] || '', 10) || 1)) }, (_, index) => `<div class="handover-write-box">${index === 0 && values['cellarRemains'] ? escape(values['cellarRemains']) : '&nbsp;'}</div>`).join('')}</div>` : '')
    + (definition.fields || []).map(field).join('')
    + (definition.note ? `<p class="handover-finance-note">${escape(definition.note)}</p>` : '');
    return definition.key === 'condition'
      ? `<div class="section handover-return-section" data-return-section="${definition.key}">${body}</div>`
      : section(definition.title, body, definition.key);
  };
  const leaseReturn = values['leaseReturnSectionVisible'] === 'ANO';
  const groupByKey = (key: string): string => {
    const definition = HANDOVER_RETURN_GROUPS.find(candidate => candidate.key === key);
    return definition ? group(definition) : '';
  };
  const conclusions = (): string => {
    const selected = HANDOVER_RETURN_CONCLUSIONS.filter(conclusion => handoverConclusionChecked(conclusion, values));
    return selected.length ? section('Závěrečná prohlášení', selected.map(conclusion => `<p class="handover-return-conclusion">${escape(conclusion.text)}</p>`).join(''), 'conclusion') : '';
  };
  return {
    afterKeys: '',
    beforeRemains: leaseReturn ? groupByKey('condition') + (values['returnFinanceVisible'] === 'NE' ? '' : groupByKey('finance')) : '',
    afterDetails: leaseReturn ? groupByKey('photos') + conclusions() : '',
    extended: leaseReturn
  };
}
