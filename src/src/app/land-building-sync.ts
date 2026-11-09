export const LAND_BUILDING_LINK_FIELD = '__building-link';
export const BUILDING_LAND_META_FIELDS = ['__land-link', '__auto-parcel', '__auto-area'] as const;
const BUILDING_FIELDS = ['parcel', 'type', 'area', 'buildingNumber', 'buildingNumberType'];

export function syncBuildingFromLand(landValues: Record<string, string>, buildingValues: Record<string, string>, index: number): { land: Record<string, string>; buildings: Record<string, string> } | undefined {
  const landKey = (field: string) => `parcel-${index}-${field}`;
  if ((landValues[landKey('type')] || '').trim().toLocaleLowerCase('cs-CZ') !== 'zastavěná plocha a nádvoří') return undefined;
  const parcel = (landValues[landKey('parcel')] || '').trim();
  const area = (landValues[landKey('area')] || '').trim();
  if (!parcel && !area) return undefined;

  const land = { ...landValues }, buildings = { ...buildingValues };
  let count = Math.max(1, Number.parseInt(buildings['__stavba-parcel-count'] || '1', 10) || 1);
  for (const key of Object.keys(buildings)) {
    const match = key.match(/^stavba-parcel-(\d+)-/);
    if (match) count = Math.max(count, Number(match[1]) + 1);
  }
  const buildingKey = (row: number, field: string) => `stavba-parcel-${row}-${field}`;
  const rows = Array.from({ length: count }, (_, row) => row);
  const equivalent = (a: string, b: string, field: 'parcel' | 'area') => {
    const normalize = (value: string) => (field === 'area' ? value.replace(/m\s*[²2]/gi, '') : value).replace(/\s/g, '').toLocaleLowerCase('cs-CZ');
    return normalize(a) === normalize(b);
  };

  // Row identities survive parcel edits and removal/reindexing of other rows.
  let link = land[landKey(LAND_BUILDING_LINK_FIELD)] || '';
  let target = link ? rows.find(row => buildings[buildingKey(row, '__land-link')] === link) : undefined;
  let automatic = target !== undefined;
  if (target === undefined && parcel) target = rows.find(row => equivalent(buildings[buildingKey(row, 'parcel')] || '', parcel, 'parcel'));

  if (target === undefined) {
    target = rows.find(row => !buildings[buildingKey(row, '__land-link')] && BUILDING_FIELDS.every(field => !(buildings[buildingKey(row, field)] || '').trim()));
    if (target === undefined) target = count++;
    link ||= globalThis.crypto?.randomUUID?.() || `land-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    land[landKey(LAND_BUILDING_LINK_FIELD)] = link;
    buildings[buildingKey(target, '__land-link')] = link;
    automatic = true;
  }

  if (automatic) {
    for (const [field, value] of [['parcel', parcel], ['area', area]] as const) {
      const key = buildingKey(target, field), previousKey = buildingKey(target, `__auto-${field}`);
      const current = buildings[key] || '';
      // A later manual override of a copied value takes precedence.
      if (!current.trim() || (previousKey in buildings && equivalent(current, buildings[previousKey], field))) {
        buildings[key] = value;
        buildings[previousKey] = value;
      }
    }
  }
  buildings['__stavba-parcel-count'] = String(count);
  buildings['Stavba na pozemku'] = 'Ano';
  return { land, buildings };
}
