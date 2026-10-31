export const SEWAGE_OPTIONS = [
  'Není řešena', 'Veřejná kanalizace', 'Žumpa (bezodtoká jímka)', 'Septik',
  'ČOV domovní', 'ČOV společná', 'Jímka společná', 'Jímka obecní'
];

export const RAINWATER_DRAINAGE_OPTIONS = [
  'Dešťová kanalizace', 'Jednotná kanalizace', 'Vsakování na pozemku',
  'Retenční nádrž', 'Akumulační nádrž na dešťovou vodu', 'Odvod do vodního toku'
];

export function sewageOptionHint(option: string): string {
  if (option === 'Septik') return 'Nádrž, ve které dochází k částečnému předčištění odpadních vod. Vyžaduje další dočištění nebo zákonný způsob nakládání s odpadní vodou.';
  return /jímka/i.test(option) ? 'Bezodtoková nádrž, kterou je nutné pravidelně vyvážet.' : '';
}

export function normalizeSewageValues(values: Record<string, string>): Record<string, string> {
  const next = { ...values };
  if (!next['Kanalizace']) return next;
  const renamed: Record<string, string> = {
    'Splašková městská': 'Veřejná kanalizace',
    'Čov': 'ČOV domovní', 'ČOV': 'ČOV domovní',
    'Septik tříkomorový': 'Septik', 'Žumpa obecní': 'Jímka obecní'
  };
  const removedOptions = new Set(['Dešťová městská', 'Trativod', 'Žumpa s přepadem']);
  const selected = next['Kanalizace'].split('|').map(value => value.trim()).filter(Boolean);
  const removed = selected.filter(value => removedOptions.has(value));
  next['Kanalizace'] = [...new Set(selected.filter(value => !removedOptions.has(value)).map(value => renamed[value] || value))].join('|');
  if (removed.length) next['Kanalizace vlastní'] = [...new Set([(next['Kanalizace vlastní'] || '').trim(), ...removed].filter(Boolean))].join(', ');
  return next;
}
