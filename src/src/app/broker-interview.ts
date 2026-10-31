export const BROKER_INTERVIEW_QUESTIONS = [
  'Jak dlouho už je nemovitost v nabídce?',
  'Za jakou cenu jste původně začínali a jaká je aktuální nabídková cena?',
  'Kolikrát jste cenu snižovali a jak výrazně?',
  'Kolik zájemců se přišlo na nemovitost osobně podívat?',
  'jaký zamítavý důvod měli zájemci?',
  'Dostali jste někdy konkrétní nabídku ke koupi?',
  'Jak dlouho spolupracujete se současnou realitní kanceláří?',
  'Co Vám na dosavadním způsobu prodeje nejvíce nevyhovuje?',
  'Jakým způsobem aktuální makléř nemovitost propaguje?',
  'Dostáváte pravidelně informace o počtu zájemců a výsledcích inzerce?',
  'Kdy přesně končí současná zprostředkovatelská smlouva?',
  'Jedná se o výhradní zastoupení?',
  'Je ve smlouvě automatické prodloužení nebo nějaké další podmínky ukončení?',
  'Jaká je Vaše představa o spolupráci s novým makléřem?',
  'Co byste chtěla, aby nový makléř dělal jinak?'
];

export const BROKER_STARTING_PRICE_FIELD = 'Za jakou cenu jste původně začínali?';
export const BROKER_CURRENT_PRICE_FIELD = 'Jaká je aktuální nabídková cena?';
export const BROKER_LISTING_URL_FIELD = 'Odkaz na aktuální inzerát';
export const BROKER_LISTING_DATE_FIELD = 'Datum vložení inzerátu';
export const BROKER_LISTING_PRICE_FIELD = 'Cena nemovitosti v inzerátu k dnešnímu datu';
export const BROKER_LISTING_PRICE_DATE_FIELD = `${BROKER_LISTING_PRICE_FIELD}__date`;

export function parseBrokerListingDate(value: string): string {
  const raw = value.trim();
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const local = raw.match(/^(\d{1,2})\s*[./-]\s*(\d{1,2})\s*[./-]\s*(\d{4})$/);
  if (!iso && !local) return '';
  const year = Number(iso ? iso[1] : local![3]);
  const month = Number(iso ? iso[2] : local![2]);
  const day = Number(iso ? iso[3] : local![1]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (year < 1000 || date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return '';
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function brokerListingPricePrintValue(values: Record<string, string>): string {
  const price = (values[BROKER_LISTING_PRICE_FIELD] || '').trim();
  const date = (values[BROKER_LISTING_PRICE_DATE_FIELD] || '').trim();
  return price && date ? `${price} / ${date}` : price;
}

export function brokerListingHref(value: string): string {
  const raw = value.trim();
  if (!raw || (/^[a-z][a-z\d+.-]*:/i.test(raw) && !/^https?:\/\//i.test(raw))) return '';
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : '';
  } catch { return ''; }
}

export function brokerInterviewPriceValue(values: Record<string, string>): string {
  const starting = (values[BROKER_STARTING_PRICE_FIELD] || '').trim();
  const current = (values[BROKER_CURRENT_PRICE_FIELD] || '').trim();
  return starting || current ? [starting || '—', current || '—'].join('\n') : '';
}

export function normalizeBrokerInterviewValues(values: Record<string, string>): Record<string, string> {
  const result = { ...values };
  const legacyPrice = BROKER_INTERVIEW_QUESTIONS[1];
  if (!(BROKER_STARTING_PRICE_FIELD in result) && legacyPrice in result) result[BROKER_STARTING_PRICE_FIELD] = result[legacyPrice];
  delete result[legacyPrice];
  const renamedQuestions = [
    ['Říkali všichni zájemci, že je dům příliš velký, nebo zazněly i jiné důvody?', BROKER_INTERVIEW_QUESTIONS[4]],
    ['Jakým způsobem makléř nemovitost propaguje?', BROKER_INTERVIEW_QUESTIONS[8]]
  ];
  for (const [oldKey, newKey] of renamedQuestions) {
    if (!(newKey in result) && oldKey in result) result[newKey] = result[oldKey];
    delete result[oldKey];
  }
  return result;
}
