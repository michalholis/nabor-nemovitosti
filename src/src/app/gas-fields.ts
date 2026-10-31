export const GAS_STATUS_OPTIONS = ['Zaveden', 'Individuální', 'Bez přípojky', 'Přípojka zřízena', 'Bez odběru', 'Možnost připojení'];
export const GAS_SOURCE_OPTIONS = ['Veřejná plynovodní síť', 'Vlastní zásobník LPG', 'Plynové lahve'];
export const GAS_METER_LOCATION_OPTIONS = ['Na hranici pozemku', 'Na fasádě', 'V domě', 'Ve společných prostorách'];
export const GAS_USAGE_OPTIONS = ['Vytápění', 'Ohřev vody', 'Vaření'];
export const GAS_CONNECTION_OPTIONS = ['Vlastní', 'Společná'];
export const GAS_INSPECTION_OPTIONS = ['Platná dokumentace', 'Dokumentace staršího data', 'Nedoloženo', 'Nezjištěno'];
export const GAS_DOCUMENTATION_OPTIONS = ['Ano', 'Ne', 'Nezjištěno'];
export const GAS_CHECK_FIELDS = ['Poslední servis kotle', 'Poslední revize plynového zařízení', 'Poslední kontrola spalinové cesty'];
export const GAS_DETAIL_GROUPS = [
  { label: 'Zdroj plynu', options: GAS_SOURCE_OPTIONS },
  { label: 'Umístění plynoměru', options: GAS_METER_LOCATION_OPTIONS },
  { label: 'Využití plynu', options: GAS_USAGE_OPTIONS }
];

export function normalizeGasValues(values: Record<string, string>): Record<string, string> {
  const next = { ...values };
  if (next['Plyn'] === 'Nezaveden') next['Plyn'] = 'Bez přípojky';
  return next;
}
