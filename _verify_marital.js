// Standalone verification of maritalStatusOptionsFromTable logic against the live Google sheet.
const https = require('https');

function fetchCsv(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function normalize(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
}

function parseOptions(value) {
  if (!value || !value.trim()) return [];
  if (value.includes('\n')) {
    return value.split('\n').map((p) => p.trim()).filter(Boolean);
  }
  if (value.includes(',')) {
    return value.split(',').map((p) => p.trim()).filter(Boolean);
  }
  return [value.trim()];
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (ch === '"') {
      if (inQuotes && next === '"') { value += '"'; i++; } else { inQuotes = !inQuotes; }
      continue;
    }
    if (ch === ',' && !inQuotes) { row.push(value); value = ''; continue; }
    if (ch === '\r' || ch === '\n') {
      if (inQuotes) { value += ch; continue; }
      rows.push(row); row = []; value = '';
      if (ch === '\r' && next === '\n') i++;
      continue;
    }
    value += ch;
  }
  if (value.length || row.length) rows.push(row);
  return rows;
}

function csvToObjects(csvText) {
  const rows = parseCsv(csvText);
  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => normalize(h));
  return rows.slice(1).map((cells) => {
    const row = {};
    headers.forEach((h, i) => { row[h] = (cells[i] || '').trim(); });
    return row;
  });
}

function maritalStatusHiddenGender(specialRule) {
  const match = (specialRule || '').match(/POHLAVÍ\s*=\s*([^\s=,]+)/i);
  return match ? normalize(match[1]) : '';
}

function optionsFromTable(sections, gender) {
  const section = sections.find((s) => normalize(s.name) === 'KLIENT - DOKLADY');
  if (!section) return ['(no KLIENT - DOKLADY section)'];
  const items = section.items.filter((it) => normalize(it.label) === 'RODINNY STAV');
  if (!items.length) return ['(no RODINNY STAV items)'];
  if (gender === '') {
    const all = []; const seen = new Set();
    for (const item of items) for (const opt of item.options) { const t = opt.trim(); if (t && !seen.has(t)) { seen.add(t); all.push(t); } }
    return all;
  }
  const normalizedGender = normalize(gender);
  for (const item of items) {
    const hiddenGender = maritalStatusHiddenGender(item.specialRule);
    if (hiddenGender && hiddenGender === normalizedGender) continue;
    if (item.options.length > 0) return item.options.map((o) => o.trim()).filter(Boolean);
  }
  return ['(none matched)'];
}

const url = 'https://docs.google.com/spreadsheets/d/1GD0AzdClLhxzbbIpispEJ0ecW1-BuWyL36lJZfZGkFA/gviz/tq?tqx=out:csv&sheet=INFORMACE';

fetchCsv(url).then((csv) => {
  const rows = csvToObjects(csv);
  const sectionMap = new Map();
  for (const row of rows) {
    const sectionName = row['SEKCE'] || '';
    if (!sectionName) continue;
    const order = Number.parseInt(row['PORADI SEKCE'] || '999', 10);
    const key = order + '-' + sectionName;
    if (!sectionMap.has(key)) sectionMap.set(key, { name: sectionName, order, items: [] });
    const subtitle = (row['PODNADPIS'] || row['VLASTNOST'] || '').trim();
    const itemLabel = subtitle || (row['VLASTNOST'] || '').trim();
    sectionMap.get(key).items.push({
      label: itemLabel,
      options: parseOptions(row['VYBER ZE SEZNAMU']),
      specialRule: row['SPECIALNI'] || row['SPECIALNI'] || '',
    });
  }
  const sections = Array.from(sectionMap.values()).sort((a, b) => a.order - b.order);
  console.log('Muž ->', optionsFromTable(sections, 'Muž'));
  console.log('Žena ->', optionsFromTable(sections, 'Žena'));
  console.log('--- raw rows with RODINNY STAV label ---');
  for (const s of sections) {
    for (const it of s.items) {
      if (normalize(it.label) === 'RODINNY STAT' || normalize(it.label) === 'RODINNY STAV') {
        console.log(JSON.stringify({ section: s.name, label: it.label, options: it.options, specialRule: it.specialRule }));
      }
    }
  }
}).catch((e) => { console.error('FETCH ERROR', e.message); });
