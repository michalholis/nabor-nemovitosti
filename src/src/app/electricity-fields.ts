export interface ElectricityControl {
  label: string;
  field: string;
  kind: 'select' | 'multi' | 'date' | 'number' | 'year' | 'currency';
  options?: string[];
  custom?: boolean;
  unit?: string;
  hint?: string;
  when?: { field: string; value: string };
  detail?: { field: string; label: string; when: string };
}

export const ELECTRICITY_STATUS_OPTIONS = ['Aktivní', 'Odpojeno', 'Přípojka zřízena, bez odběru', 'Možnost připojení', 'Bez přípojky'];
export const ELECTRICITY_SOURCE_OPTIONS = ['Distribuční síť', 'Fotovoltaika', 'Elektrocentrála'];
export const ELECTRICITY_CONNECTION_HINT = 'Nejspolehlivější je ověřit údaj na hlavním jističi před elektroměrem: například 1×25 A znamená jednofázové a 3×25 A třífázové připojení.';
const YES_NO = ['Ano', 'Ne'];

export const ELECTRICITY_CONTROLS: ElectricityControl[] = [
  { label: 'Stav připojení', field: 'Stav připojení', kind: 'select', options: ELECTRICITY_STATUS_OPTIONS },
  { label: 'Zdroj elektřiny', field: 'Zdroj elektřiny', kind: 'multi', options: ELECTRICITY_SOURCE_OPTIONS },
  { label: 'Typ připojení', field: 'Typ připojení', kind: 'select', options: ['Jednofázové (230 V)', 'Třífázové (400 V)', 'Nezjištěno'], hint: ELECTRICITY_CONNECTION_HINT },
  { label: 'Elektroměr', field: 'Elektroměr', kind: 'multi', options: ['Vlastní', 'Společný', 'Podružný', 'Bez elektroměru'], custom: true },
  { label: 'Umístění elektroměru', field: 'Umístění elektroměru', kind: 'multi', options: ['Elektroměrový rozvaděč na hranici pozemku', 'Fasáda', 'Chodba', 'Technická místnost'], custom: true },
  { label: 'Materiál rozvodů', field: 'Materiál rozvodů', kind: 'select', options: ['Měď', 'Hliník', 'Kombinované', 'Nezjištěno'] },
  { label: 'Stav elektroinstalace', field: 'Stav elektroinstalace', kind: 'select', options: ['Nová', 'Po rekonstrukci', 'Původní', 'Částečně rekonstruovaná', 'Nezjištěno'] },
  { label: 'Rozsah rekonstrukce', field: 'Rozsah rekonstrukce', kind: 'select', options: ['Kompletní', 'Částečná', 'Pouze rozvaděč', 'Pouze vybrané místnosti'], detail: { field: 'Rekonstruované místnosti', label: 'Které místnosti', when: 'Pouze vybrané místnosti' } },
  { label: 'Elektrický rozvaděč', field: 'Elektrický rozvaděč', kind: 'select', options: ['Nový', 'Původní', 'Modernizovaný', 'Nezjištěno'] },
  { label: 'Využití elektřiny', field: 'Využití elektřiny', kind: 'multi', options: ['Vytápění', 'Ohřev vody', 'Vaření', 'Nabíjení elektromobilu'], custom: true },
  { label: 'Výchozí revize elektroinstalace', field: 'Výchozí revize elektroinstalace', kind: 'select', options: ['Doložena', 'Nedoložena', 'Nezjištěno'] },
  { label: 'Poslední revize', field: 'Poslední revize', kind: 'date', options: ['Nezjištěno'] },
  { label: 'Revizní zpráva', field: 'Revizní zpráva', kind: 'select', options: ['K dispozici', 'Není k dispozici'] },
  { label: 'Revize hromosvodu', field: 'Revize hromosvodu', kind: 'date', options: ['Nedoloženo', 'Není instalován'] },
  { label: 'Projektová dokumentace elektroinstalace', field: 'Projektová dokumentace elektroinstalace', kind: 'select', options: YES_NO },
  { label: 'Známé závady elektroinstalace', field: 'Známé závady elektroinstalace', kind: 'select', options: ['Ano', 'Ne', 'Nezjištěno'] },
  { label: 'Měsíční zálohy', field: 'Měsíční zálohy', kind: 'currency' },
  { label: 'Dodavatel elektřiny', field: 'Dodavatel elektřiny', kind: 'select', options: ['ČEZ', 'E.ON', 'PRE', 'Jiný'], detail: { field: 'Dodavatel elektřiny vlastní', label: 'Jiný dodavatel', when: 'Jiný' } },
  { label: 'Distributor', field: 'Distributor', kind: 'select', options: ['ČEZ Distribuce', 'EG.D', 'PREdistribuce', 'Jiný'], detail: { field: 'Distributor vlastní', label: 'Jiný distributor', when: 'Jiný' } }
];

export const PHOTOVOLTAIC_CONTROLS: ElectricityControl[] = [
  { label: 'Instalovaný výkon', field: 'Fotovoltaika – Instalovaný výkon', kind: 'number', unit: 'kWp' },
  { label: 'Bateriové úložiště', field: 'Fotovoltaika – Bateriové úložiště', kind: 'select', options: YES_NO },
  { label: 'Kapacita baterie', field: 'Fotovoltaika – Kapacita baterie', kind: 'number', unit: 'kWh', when: { field: 'Fotovoltaika – Bateriové úložiště', value: 'Ano' } },
  { label: 'Přetoky do sítě', field: 'Fotovoltaika – Přetoky do sítě', kind: 'select', options: ['Povoleny', 'Nepovoleny', 'Nezjištěno'] },
  { label: 'Rok instalace', field: 'Fotovoltaika – Rok instalace', kind: 'year' },
  { label: 'Dokumentace a revize', field: 'Fotovoltaika – Dokumentace a revize', kind: 'select', options: ['Doloženo', 'Nedoloženo'] }
];

export function electricityIntakeControls(): Array<{ kind: 'multi' | 'select' | 'text'; label: string; field: string; options?: string[] }> {
  return [...ELECTRICITY_CONTROLS, ...PHOTOVOLTAIC_CONTROLS].flatMap(control => [
    { kind: control.kind === 'multi' || control.kind === 'select' ? control.kind : 'text', label: control.field.startsWith('Fotovoltaika –') ? control.field : control.label, field: control.field, options: control.options },
    ...(control.custom ? [{ kind: 'text' as const, label: `${control.label} vlastní`, field: `${control.field} vlastní` }] : []),
    ...(control.detail ? [{ kind: 'text' as const, label: control.detail.field, field: control.detail.field }] : [])
  ]);
}

export function normalizeElectricityValues(values: Record<string, string>): Record<string, string> {
  const next = { ...values };
  const technologies = (next['Technologie'] || '').split('|').filter(Boolean);
  if (!('Zdroj elektřiny' in next)) {
    const sources: string[] = [];
    if (next['Elektřina'] === 'Zavedena') sources.push('Distribuční síť');
    if (technologies.some(value => value === 'Fotovoltaika' || value === 'Solární panely')) sources.push('Fotovoltaika');
    if (sources.length) next['Zdroj elektřiny'] = sources.join('|');
  }
  const rename = (old: string, field: string, names: Record<string, string>) => {
    if (!(old in next)) return;
    if (!(field in next)) next[field] = names[next[old]] || next[old];
    delete next[old];
  };
  rename('Elektřina', 'Stav připojení', { 'Zavedena': 'Aktivní', 'Nezavedena': 'Bez přípojky' });
  rename('Stav elektrického vedení', 'Stav elektroinstalace', { 'Rekonstruováno': 'Po rekonstrukci', 'Částečně rekonstruováno': 'Částečně rekonstruovaná' });
  rename('Jističe', 'Typ připojení', { '1 fázový': 'Jednofázové (230 V)', '3 fázový': 'Třífázové (400 V)' });
  rename('Vedení v', 'Materiál rozvodů', { 'Hliník i měď': 'Kombinované' });
  if ('Dodavatel elektrické energie' in next) {
    const old = next['Dodavatel elektrické energie'];
    const supplier = old === 'EON' ? 'E.ON' : old;
    if (!('Dodavatel elektřiny' in next)) {
      next['Dodavatel elektřiny'] = ['ČEZ', 'E.ON', 'PRE', ''].includes(supplier) ? supplier : 'Jiný';
      if (next['Dodavatel elektřiny'] === 'Jiný' && !('Dodavatel elektřiny vlastní' in next)) next['Dodavatel elektřiny vlastní'] = old;
    }
    delete next['Dodavatel elektrické energie'];
  }
  if (technologies.some(value => value === 'Fotovoltaika' || value === 'Solární panely')) {
    const remaining = technologies.filter(value => value !== 'Fotovoltaika' && value !== 'Solární panely');
    if (remaining.length) next['Technologie'] = remaining.join('|');
    else delete next['Technologie'];
  }
  if (next['Umístění elektroměru']) {
    const options = ELECTRICITY_CONTROLS.find(control => control.field === 'Umístění elektroměru')!.options!;
    const locations = next['Umístění elektroměru'].split('|').map(value => value.trim()).filter(Boolean);
    const extra = locations.filter(value => !options.includes(value));
    if (extra.length) {
      next['Umístění elektroměru'] = locations.filter(value => options.includes(value)).join('|');
      next['Umístění elektroměru vlastní'] = [next['Umístění elektroměru vlastní'], ...extra].filter(Boolean).join(', ');
    }
  }
  return next;
}

export function shouldPrintElectricityField(field: string, values: Record<string, string>): boolean {
  if (field.startsWith('Fotovoltaika –') && !(values['Zdroj elektřiny'] || '').split('|').includes('Fotovoltaika')) return false;
  const control = [...ELECTRICITY_CONTROLS, ...PHOTOVOLTAIC_CONTROLS].find(control => control.field === field);
  if (control?.when && values[control.when.field] !== control.when.value) return false;
  const parent = ELECTRICITY_CONTROLS.find(control => control.detail?.field === field);
  return !parent?.detail || values[parent.field] === parent.detail.when;
}
