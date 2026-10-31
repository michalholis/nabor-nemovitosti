export const SERVICE_BREAKDOWN_GROUPS = ['Do nájmu lze započítat', 'Do nájmu nelze započítat'] as const;

export interface ServiceBreakdownEntry {
  field: string;
  label: string;
  amount: string;
}

export function serviceBreakdownEntries(values: Record<string, string>, group: string): ServiceBreakdownEntry[] {
  const entries: ServiceBreakdownEntry[] = [];
  const customIndexes = new Set<number>();
  for (const [field, raw] of Object.entries(values)) {
    const value = String(raw).trim();
    if (field.startsWith(`${group} - `) && value) entries.push({ field, label: field.slice(group.length + 3), amount: value });
    if (field.startsWith(`${group} vlastní `)) {
      const custom = field.slice(`${group} vlastní `.length).match(/^(?:(?:název|částka) )?(\d+)$/);
      if (custom) customIndexes.add(Number(custom[1]));
    }
  }
  for (const index of [...customIndexes].sort((a, b) => a - b)) {
    const canonicalName = `${group} vlastní název ${index}`;
    const legacyName = `${group} vlastní ${index}`;
    const nameKey = canonicalName in values ? canonicalName : legacyName;
    const amountKey = `${group} vlastní částka ${index}`;
    const name = (values[nameKey] || '').trim();
    const amount = (values[amountKey] || '').trim();
    if (name || amount) entries.push({ field: amount ? amountKey : nameKey, label: name || `Vlastní položka ${index}`, amount });
  }
  return entries;
}

function amountInCents(value: string): number {
  let normalized = value.replace(/Kč/gi, '').replace(/\s/g, '');
  if (normalized.includes(',')) normalized = normalized.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(?:\.\d{3})+$/.test(normalized)) normalized = normalized.replace(/\./g, '');
  const amount = Number(normalized);
  return Number.isFinite(amount) && amount >= 0 ? Math.round(amount * 100) : 0;
}

export function serviceBreakdownTotal(entries: ServiceBreakdownEntry[]): string {
  const total = entries.reduce((sum, entry) => sum + amountInCents(entry.amount), 0) / 100;
  return `${total.toLocaleString('cs-CZ', { minimumFractionDigits: Number.isInteger(total) ? 0 : 2, maximumFractionDigits: 2 }).replace(/\u00a0/g, ' ')} Kč`;
}

export function isServiceBreakdownValueField(field: string): boolean {
  return SERVICE_BREAKDOWN_GROUPS.some(group => field.startsWith(`${group} - `) ||
    (field.startsWith(`${group} vlastní `) && /^(?:(?:název|částka) )?\d+$/.test(field.slice(`${group} vlastní `.length))));
}
