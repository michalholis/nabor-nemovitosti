export const HEATING_ENERGY_OPTIONS = ['Tuhá paliva', 'Plyn', 'Elektřina', 'Solární', 'Tepelné čerpadlo'];
export const HEATING_METHOD_OPTIONS = ['Vlastní zdroj tepla', 'Dálkové vytápění'];
export const HEATING_METHOD_HELP: Record<string, string> = {
  'Vlastní zdroj tepla': 'Jeden zdroj vytápí více místností prostřednictvím rozvodů',
  'Dálkové vytápění': 'Teplo je dodáváno z externího zdroje mimo dům'
};
export const HEATING_DEVICE_OPTIONS = [
  'Kotel na tuhá paliva', 'Elektrokotel', 'Kombinovaný plynový kotel', 'Kondenzační plynový kotel',
  'Nekondenzační plynový kotel', 'Kotel se zásobníkem teplé vody', 'Akumulační kamna',
  'Elektrický přímotop', 'Infrapanel', 'Kamna (PETRY)', 'Krb na dřevo', 'Krb s výměníkem',
  'Krbová kamna s teplovodním výměníkem (podlahové vytápění)',
  'Krbová kamna s teplovodním výměníkem (radiátory)', 'Plynový krb', 'Vafky', 'Klimatizace'
];
export const HEATING_TERMINAL_OPTIONS = ['Radiátory', 'Podlahové vytápění'];

const DEVICES_BY_ENERGY: Record<string, string[]> = {
  'Elektřina': ['Elektrokotel', 'Kotel se zásobníkem teplé vody', 'Akumulační kamna', 'Elektrický přímotop', 'Infrapanel', 'Klimatizace'],
  'Plyn': ['Kombinovaný plynový kotel', 'Kondenzační plynový kotel', 'Nekondenzační plynový kotel', 'Kotel se zásobníkem teplé vody', 'Plynový krb', 'Vafky'],
  'Tuhá paliva': ['Kotel na tuhá paliva', 'Kotel se zásobníkem teplé vody', 'Kamna (PETRY)', 'Krb na dřevo', 'Krb s výměníkem', 'Krbová kamna s teplovodním výměníkem (podlahové vytápění)', 'Krbová kamna s teplovodním výměníkem (radiátory)'],
  'Solární': ['Kotel se zásobníkem teplé vody'],
  'Tepelné čerpadlo': ['Kotel se zásobníkem teplé vody', 'Klimatizace']
};

export function compatibleHeatingDevices(energySources: string[]): string[] {
  const knownSources = energySources.filter(source => source in DEVICES_BY_ENERGY);
  if (!knownSources.length) return [...HEATING_DEVICE_OPTIONS];
  const allowed = new Set(knownSources.flatMap(source => DEVICES_BY_ENERGY[source]));
  return HEATING_DEVICE_OPTIONS.filter(device => allowed.has(device));
}

export function normalizeHeatingValues(values: Record<string, string>): Record<string, string> {
  const next = { ...values };
  const parts = (value = '') => value.split('|').map(part => part.trim()).filter(Boolean);
  const merge = (field: string, additions: string[]) => {
    if (additions.length) next[field] = [...new Set([...parts(next[field]), ...additions])].join('|');
  };
  const legacyMethod = 'Způsob vytápění objektu';
  const renameMethod = (value: string): string => value === 'Ústřední vytápění' ? 'Vlastní zdroj tepla' : value === 'Centrální dálkové' ? 'Dálkové vytápění' : value;
  if ('Způsob vytápění' in next) next['Způsob vytápění'] = [...new Set(parts(next['Způsob vytápění']).map(renameMethod))].join('|');
  if (legacyMethod in next) {
    const selected = parts(next[legacyMethod]).map(renameMethod);
    merge('Zdroje energie', selected.filter(value => !HEATING_METHOD_OPTIONS.includes(value)));
    merge('Způsob vytápění', selected.filter(value => HEATING_METHOD_OPTIONS.includes(value)));
    delete next[legacyMethod];
  }
  for (const [oldKey, newKey] of [
    [`${legacyMethod} vlastní`, 'Zdroje energie vlastní'],
    ['Topné těleso vlastní', 'Topné zařízení vlastní']
  ]) {
    if (!(newKey in next) && oldKey in next) next[newKey] = next[oldKey];
    delete next[oldKey];
  }
  if ('Topné těleso' in next) {
    const selected = parts(next['Topné těleso']).map(value => value === 'Krb' ? 'Krb na dřevo' : value);
    merge('Topné zařízení', selected.filter(value => HEATING_DEVICE_OPTIONS.includes(value)));
    merge('Otopná soustava', selected.filter(value => !HEATING_DEVICE_OPTIONS.includes(value) && value !== 'S regulací topení'));
    if (selected.includes('S regulací topení') && !('S regulací topení' in next)) next['S regulací topení'] = 'Ano';
    delete next['Topné těleso'];
  }
  return next;
}
