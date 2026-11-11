import ExcelJS from 'exceljs';
import { readFileSync } from 'node:fs';
import { GuideParseError, parseGuide } from '@/lib/import/parse-guide';
import { buildImportEntries, previewImport } from '@/lib/import/plan-import';
import type { CoverageValue } from '@/lib/domain/types';
import { loadSeed } from '../helpers/seed';

const file = (name: string) => readFileSync(`data/guides/${name}`);
const WEBSG = 'WebSG-LowRiskCloud_2026-06-22.xlsx';
const ISOMER = 'Isomer-low-risk-cloud-ssp_06Oct2025_Final.xlsx';
const CWP = 'CWP-low-risk-cloud-ssp_v1.2.xlsx';

async function lowRiskCloud() {
  return (await loadSeed()).profiles.find(p => p._id === 'low-risk-cloud')!;
}

async function importWithSuggestions(name: string) {
  const profile = await lowRiskCloud();
  const guide = await parseGuide(file(name), name);
  const preview = previewImport(guide, profile);
  const mapping = Object.fromEntries(preview.pairs.map(p => [p.pairKey, p.suggested!])) as Record<string, CoverageValue>;
  const entries = buildImportEntries(guide, profile, mapping);
  const count = (v: string) => entries.filter(e => e.value === v).length;
  return { guide, preview, entries, counts: [count('provided'), count('app-builder'), count('shared'), count('not-applicable')] };
}

test('WebSG Low-Risk Cloud: 117 rows, 99 provided / 14 App Builder / 4 shared, and it predates is-15', async () => {
  const { guide, preview, entries, counts } = await importWithSuggestions(WEBSG);
  expect(guide.sheetName).toBe('low-cloud-WebSG');
  expect(guide.rows).toHaveLength(117);
  expect(preview.unknownIds).toEqual([]);
  expect(counts).toEqual([99, 14, 4, 0]);
  expect(entries).toHaveLength(117);
  expect(preview.missingKeys).toEqual(['im8-reform:is-15']);
  expect(preview.writtenAgainst).toContain('2026-07-28');
});

test('Isomer Low-Risk Cloud: 99 provided / 15 App Builder / 3 shared, written against 2025-09-17', async () => {
  const { preview, counts } = await importWithSuggestions(ISOMER);
  expect(counts).toEqual([99, 15, 3, 0]);
  expect(preview.missingKeys).toEqual(['im8-reform:is-15']);
  expect(preview.writtenAgainst).toContain('2025-09-17');
});

test('CWP v1.2 (older baseline): 81 / 3 / 19 / 5, and 10 requirements it predates', async () => {
  const { preview, counts } = await importWithSuggestions(CWP);
  expect(counts).toEqual([81, 3, 19, 5]);
  expect(preview.missingKeys.map(k => k.split(':')[1]).sort()).toEqual(
    ['ac-13', 'ac-14', 'as-13', 'as-14', 'as-15', 'ck-1', 'ck-2', 'is-15', 'is-7', 'lm-19'],
  );
});

test.each(['FormSG-Component-Guide-DSS.xlsx', 'WebSG-Component-Guide-DSS.xlsx'])('%s is rejected for Low-Risk Cloud: all 92 IDs are unknown', async name => {
  const guide = await parseGuide(file(name), name);
  expect(previewImport(guide, await lowRiskCloud()).unknownIds).toHaveLength(92);
});

test('the original owner text is kept, and the explanation goes to the right field', async () => {
  const { entries } = await importWithSuggestions(WEBSG);
  const as5 = entries.find(e => e.key === 'im8-reform:as-5')!;
  expect(as5.value).toBe('provided');
  expect(as5.originalText).toBe('WOGAD or Techpass Team');
  expect(as5.explanation).toMatch(/SSO/);
  expect(as5.builderPart).toBeUndefined();
  const builderRow = entries.find(e => e.value === 'app-builder')!;
  expect(builderRow.builderPart).toBeTruthy();
  expect(builderRow.explanation).toBeUndefined();
});

test('distinct owner texts are listed once each, with how many rows use them', async () => {
  const { preview } = await importWithSuggestions(WEBSG);
  expect(preview.pairs).toHaveLength(7);
  expect(preview.pairs.reduce((n, p) => n + p.count, 0)).toBe(117);
});

test('random bytes are rejected as not a workbook', async () => {
  await expect(parseGuide(Buffer.from('this is not a spreadsheet'), 'x.xlsx')).rejects.toMatchObject({ code: 'not-a-workbook' });
  await expect(parseGuide(Buffer.from('nope'), 'x.xlsx')).rejects.toBeInstanceOf(GuideParseError);
});

async function workbookWith(rows: string[][]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet('guide');
  rows.forEach(r => sheet.addRow(r));
  return Buffer.from(await wb.xlsx.writeBuffer());
}

test('a workbook with no "ID" header is rejected', async () => {
  await expect(parseGuide(await workbookWith([['Name', 'Value'], ['a', 'b']]), 'x.xlsx')).rejects.toMatchObject({ code: 'no-header' });
});

test('a workbook with an ID header but no "Who is responsible?" column is rejected', async () => {
  await expect(parseGuide(await workbookWith([['ID', 'Title'], ['as-1', 'Input Validation']]), 'x.xlsx')).rejects.toMatchObject({
    code: 'no-header',
    message: expect.stringMatching(/Who is responsible/),
  });
});

test('headers are matched by name, wherever the columns are and however they are capitalised', async () => {
  const buffer = await workbookWith([['preamble'], ['Explanation', 'who IS responsible', 'id'], ['Because', 'Agency', 'as-1'], ['', 'Xtremax', 'as-2'], ['', '', 'not an id']]);
  const guide = await parseGuide(buffer, 'x.xlsx');
  expect(guide.headerRow).toBe(2);
  expect(guide.preamble).toEqual(['preamble']);
  expect(guide.rows).toEqual([
    { id: 'as-1', owner: 'Agency', explanation: 'Because' },
    { id: 'as-2', owner: 'Xtremax' },
  ]);
});

test('building entries with a pair left out of the mapping fails', async () => {
  const profile = await lowRiskCloud();
  const guide = await parseGuide(file(WEBSG), WEBSG);
  const preview = previewImport(guide, profile);
  const mapping = Object.fromEntries(preview.pairs.slice(1).map(p => [p.pairKey, p.suggested!])) as Record<string, CoverageValue>;
  expect(() => buildImportEntries(guide, profile, mapping)).toThrow(/choose/i);
});

test('building entries for a guide with unknown IDs fails', async () => {
  const profile = await lowRiskCloud();
  const guide = await parseGuide(file('FormSG-Component-Guide-DSS.xlsx'), 'f');
  expect(() => buildImportEntries(guide, profile, {})).toThrow(/are not in/);
});
