export function splitClientTitles(value: string): { before: string; after: string } {
  const after: string[] = [];
  const suffix = /(?:^|[\s,;]+)(Ph\.?\s*D\.?|Th\.?\s*D\.?|CSc\.?|DrSc\.?|DSc\.?|DiS\.?|MBA|DBA|BBA|LL\.?\s*M\.?|LL\.?\s*B\.?|M\.?\s*Sc\.?|B\.?\s*Sc\.?|MPA|MPH)(?=$|[\s,;]+)/gi;
  const before = value.trim().replace(suffix, (_match, title: string) => {
    after.push(title.trim());
    return ' ';
  }).replace(/^[\s,;]+|[\s,;]+$/g, '').replace(/\s*[,;]\s*/g, ', ').replace(/\s{2,}/g, ' ').trim();
  return { before, after: after.join(', ') };
}
