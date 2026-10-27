import ExcelJS from 'exceljs';
import { cellText } from '@/lib/data/xlsx';
import { fillSspWorkbook } from '@/lib/export/ssp-xlsx';
import { buildPlan, type PlanData } from '@/lib/plan/engine';
import { pairVersions, selectPlanInput } from '@/lib/plan/select';
import { loadSeed } from '../helpers/seed';

const TEMPLATE = 'data/source/low-risk-cloud-ssp.xlsx';

async function setup(toolIds: string[]) {
  const seed = await loadSeed();
  const data: PlanData = { profiles: seed.profiles, tools: seed.tools, versions: pairVersions(seed.toolVersions) };
  const plan = buildPlan(selectPlanInput(data, { profileId: 'low-risk-cloud', toolIds }));
  return { plan, genai: seed.profiles.find(p => p._id === 'generative-ai')! };
}

test('picking genCentral adds the 8 GenAI requirements as open questions', async () => {
  const without = (await setup(['appcentral'])).plan;
  const withGenAi = (await setup(['appcentral', 'gencentral'])).plan;
  const genai = withGenAi.items.filter(i => i.key.startsWith('genai:'));
  expect(genai.map(i => i.id)).toEqual(['ga-1', 'ga-2', 'ga-3', 'ga-4', 'ga-5', 'ga-6', 'ga-7', 'ga-8']);
  expect(genai.every(i => i.heading === 'questions' && i.placement === 'open')).toBe(true);
  expect(withGenAi.counts.questions).toBe(without.counts.questions + 8);
  expect(without.items.some(i => i.key.startsWith('genai:'))).toBe(false);
});

test('the GenAI requirements have plain-language questions', async () => {
  const { plan } = await setup(['gencentral']);
  const ga1 = plan.items.find(i => i.id === 'ga-1')!;
  expect(ga1.plain?.question).toMatch(/overseas/i);
});

test('the spreadsheet gets a "genai" sheet with a header and 8 rows', async () => {
  const { plan, genai } = await setup(['appcentral', 'gencentral']);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load((await fillSspWorkbook(plan, { templatePath: TEMPLATE, genai: { profile: genai } })) as unknown as ArrayBuffer);
  const sheet = wb.getWorksheet('genai')!;
  expect(sheet.rowCount).toBe(9);
  expect([1, 2, 3, 4, 5, 6, 7, 8, 9].map(c => cellText(sheet.getRow(1).getCell(c)))).toEqual([
    'ID', 'Title', 'Statement', 'Recommendations', 'Risk/Rationale', 'Profile Level', 'References', 'Implemented', 'Explanation',
  ]);
  expect(cellText(sheet.getRow(2).getCell(1))).toBe('ga-1');
  expect(cellText(sheet.getRow(2).getCell(6))).toBe('0');
  expect(cellText(sheet.getRow(9).getCell(1))).toBe('ga-8');
  expect(cellText(sheet.getRow(9).getCell(6))).toBe('1');
  expect(cellText(sheet.getRow(2).getCell(8))).toBe('');
  expect(wb.getWorksheet('ssp')).toBeDefined();
});

test('without the option there is no "genai" sheet', async () => {
  const { plan } = await setup(['appcentral']);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load((await fillSspWorkbook(plan, { templatePath: TEMPLATE })) as unknown as ArrayBuffer);
  expect(wb.getWorksheet('genai')).toBeUndefined();
});
