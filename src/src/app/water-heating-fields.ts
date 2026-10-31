const INDIRECT_SOURCES = ['Elektřina', 'Plyn', 'Tuhá paliva', 'Solární', 'Tepelné čerpadlo', 'Centrální dálkový ohřev'];

const WATER_HEATING_DEVICES: Array<{ label: string; sources: string[] }> = [
  { label: 'Elektrický bojler (zásobníkový ohřívač)', sources: ['Elektřina'] },
  { label: 'Plynový bojler (zásobníkový ohřívač)', sources: ['Plyn'] },
  { label: 'Elektrický průtokový ohřívač', sources: ['Elektřina'] },
  { label: 'Plynový průtokový ohřívač (karma)', sources: ['Plyn'] },
  { label: 'Plynový kondenzační kotel', sources: ['Plyn'] },
  { label: 'Plynový nekondenzační kotel', sources: ['Plyn'] },
  { label: 'Kombinovaný plynový kotel', sources: ['Plyn'] },
  { label: 'Elektrokotel', sources: ['Elektřina'] },
  { label: 'Kotel na tuhá paliva', sources: ['Tuhá paliva'] },
  { label: 'Automatický kotel na pelety', sources: ['Tuhá paliva'] },
  { label: 'Tepelné čerpadlo', sources: ['Tepelné čerpadlo'] },
  { label: 'Bojler s integrovaným tepelným čerpadlem', sources: ['Tepelné čerpadlo'] },
  { label: 'Solární termické kolektory se zásobníkem', sources: ['Solární'] },
  { label: 'Kombinovaný bojler (elektrický + výměník)', sources: INDIRECT_SOURCES },
  { label: 'Nepřímotopný zásobník vody', sources: INDIRECT_SOURCES },
  { label: 'Akumulační nádrž s přípravou TUV', sources: INDIRECT_SOURCES },
  { label: 'Krbová kamna s teplovodním výměníkem', sources: ['Tuhá paliva'] },
  { label: 'Kamna nebo sporák s teplovodním výměníkem', sources: ['Tuhá paliva'] },
  { label: 'Centrální dálkový ohřev', sources: ['Centrální dálkový ohřev'] },
  { label: 'Předávací stanice tepla s ohřevem TUV', sources: ['Centrální dálkový ohřev'] },
  { label: 'Elektrická topná patrona v zásobníku', sources: ['Elektřina'] },
  { label: 'Malý elektrický ohřívač pod umyvadlem', sources: ['Elektřina'] }
];

export const WATER_HEATING_DEVICE_OPTIONS = WATER_HEATING_DEVICES.map(device => device.label);

export function compatibleWaterHeatingDevices(energySources: string[]): string[] {
  if (!energySources.length) return [...WATER_HEATING_DEVICE_OPTIONS];
  return WATER_HEATING_DEVICES.filter(device => device.sources.some(source => energySources.includes(source))).map(device => device.label);
}

export function normalizeWaterHeatingValues(values: Record<string, string>): Record<string, string> {
  const next = { ...values };
  const key = 'Způsob ohřevu vody';
  const renamed: Record<string, string> = {
    'Bojler - elektro': 'Elektrický bojler (zásobníkový ohřívač)',
    'Bojler - plyn': 'Plynový bojler (zásobníkový ohřívač)',
    'Průtokový ohřívač': 'Elektrický průtokový ohřívač',
    'Plynový průtokový (karma)': 'Plynový průtokový ohřívač (karma)',
    'Plynový kotel': 'Plynový nekondenzační kotel'
  };
  if (key in next) next[key] = [...new Set(next[key].split('|').map(value => value.trim()).filter(Boolean).map(value => renamed[value] || value))].join('|');
  return next;
}
