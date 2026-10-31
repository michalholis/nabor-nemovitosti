export interface WaterSupplyControl {
  label: string;
  field: string;
  kind: 'multi' | 'select' | 'depth' | 'currency' | 'date';
  options?: string[];
  custom?: boolean;
}

export const WATER_SOURCE_OPTIONS = [
  'Veřejný vodovod', 'Vlastní studna – kopaná', 'Vlastní studna – vrtaná', 'Společná studna',
  'Soukromý vodovod', 'Pramen / prameniště', 'Dovoz vody', 'Bez zdroje vody'
];
export const WATER_CONNECTION_OPTIONS = ['Aktivní', 'Odpojeno', 'Přípojka zřízena, bez odběru', 'Možnost připojení', 'Bez přípojky'];
export const WATER_METER_OPTIONS = ['Vlastní', 'Společný', 'Podružný'];
export const WATER_QUALITY_OPTIONS = ['Pitná', 'Užitková', 'Pitná po převaření', 'Neověřená kvalita'];

const YES_NO = ['Ano', 'Ne'];
const DOCUMENTED = ['Doloženo', 'Nedoloženo'];
export const WATER_SUPPLY_CONTROLS: WaterSupplyControl[] = [
  { label: 'Zdroj vody', field: 'Zdroj vody', kind: 'multi', options: WATER_SOURCE_OPTIONS, custom: true },
  { label: 'Stav napojení', field: 'Stav napojení', kind: 'select', options: WATER_CONNECTION_OPTIONS },
  { label: 'Umístění přípojky', field: 'Umístění přípojky', kind: 'multi', options: ['V domě', 'Na pozemku', 'Na hranici pozemku', 'Pouze v ulici'] },
  { label: 'Vodoměr', field: 'Vodoměr', kind: 'multi', options: WATER_METER_OPTIONS },
  { label: 'Umístění vodoměru', field: 'Umístění vodoměru', kind: 'multi', options: ['Vodoměrná šachta', 'Technická místnost', 'Sklep'], custom: true },
  { label: 'Způsob zásobování', field: 'Způsob zásobování', kind: 'multi', options: ['Přímé napojení', 'Domácí vodárna', 'Čerpadlo', 'Samospád'] },
  { label: 'Kvalita dalšího zdroje vody', field: 'Kvalita vody', kind: 'multi', options: WATER_QUALITY_OPTIONS },
  { label: 'Využití studny', field: 'Využití studny', kind: 'multi', options: ['Domácnost', 'Zahrada', 'Bazén', 'Technické účely'], custom: true },
  { label: 'Rozbor vody', field: 'Rozbor vody', kind: 'select', options: YES_NO },
  { label: 'Úprava vody', field: 'Úprava vody', kind: 'multi', options: ['Filtrace', 'Změkčovač', 'UV dezinfekce', 'Odželezňovač', 'Bez úpravy'] },
  { label: 'Hloubka studny', field: 'Hloubka studny', kind: 'depth' },
  { label: 'Celoroční dostupnost vody', field: 'Celoroční dostupnost vody', kind: 'select', options: YES_NO },
  { label: 'Čerpadlo', field: 'Čerpadlo', kind: 'multi', options: ['Ponorné', 'Povrchové', 'Ruční'], custom: true },
  { label: 'Povolení a dokumentace', field: 'Povolení a dokumentace', kind: 'select', options: DOCUMENTED },
  { label: 'Oprávnění k odběru vody', field: 'Oprávnění k odběru vody', kind: 'select', options: DOCUMENTED },
  { label: 'Právo využívat společnou studnu', field: 'Právo využívat společnou studnu', kind: 'select', options: ['Vlastnické právo', 'Služebnost', 'Smlouva', 'Nezjištěno'] },
  { label: 'Měsíční zálohy', field: 'Měsíční zálohy', kind: 'currency' },
  { label: 'Dokumentace k přípojce', field: 'Dokumentace k přípojce', kind: 'select', options: YES_NO },
  { label: 'Smlouva s dodavatelem vody', field: 'Smlouva s dodavatelem vody', kind: 'select', options: YES_NO },
  { label: 'Poslední rozbor studniční vody', field: 'Poslední rozbor studniční vody', kind: 'date' }
];

export function waterSupplyIntakeControls(): Array<{ kind: 'multi' | 'select' | 'text'; label: string; field: string; options?: string[] }> {
  return WATER_SUPPLY_CONTROLS.flatMap(control => [
    { kind: control.kind === 'multi' || control.kind === 'select' ? control.kind : 'text', label: control.label, field: control.field, options: control.options },
    ...(control.custom ? [{ kind: 'text' as const, label: `${control.label} vlastní`, field: `${control.field} vlastní` }] : [])
  ]);
}

export function normalizeWaterSupplyValues(values: Record<string, string>): Record<string, string> {
  const next = { ...values };
  const extraSources = (next['Další zdroj vody'] || '').split('|');
  if (!('Zdroj vody' in next)) {
    const sources: string[] = [];
    if (next['Vodovod'] === 'Napojen') sources.push('Veřejný vodovod');
    if (extraSources.includes('Studna vlastní')) {
      if (next['Druh studny'] === 'Studna kopaná') sources.push('Vlastní studna – kopaná');
      if (next['Druh studny'] === 'Studna vrtaná') sources.push('Vlastní studna – vrtaná');
    }
    if (extraSources.includes('Studna společná')) sources.push('Společná studna');
    if (sources.length) next['Zdroj vody'] = sources.join('|');
  }
  if (!('Stav napojení' in next)) {
    if (next['Vodovod'] === 'Napojen') next['Stav napojení'] = 'Aktivní';
    if (next['Vodovod'] === 'Nezaveden') next['Stav napojení'] = 'Bez přípojky';
  }
  if (next['Vodovod'] === 'Napojen' || next['Vodovod'] === 'Nezaveden') delete next['Vodovod'];
  return next;
}
