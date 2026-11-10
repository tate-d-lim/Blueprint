import ExcelJS from 'exceljs';
import { cellText } from '@/lib/data/xlsx';
import { fillSspWorkbook } from '@/lib/export/ssp-xlsx';
import { DEMO_FACTS, demoPlan } from '../helpers/demo';
import { loadSeed } from '../helpers/seed';

const TEMPLATE = 'data/source/low-risk-cloud-ssp.xlsx';

/** The demo plan with GenAI on or off (the fact), and the GenAI profile. */
async function setup(genai: boolean) {
  const seed = await loadSeed();
  const plan = await demoPlan(['appcentral'], genai ? { ...DEMO_FACTS, 'uses-genai': 'yes' } : DEMO_FACTS);
  return { plan, genai: seed.profiles.find(p => p._id === 'generative-ai')! };
}

test('uses-genai yes adds the 8 GenAI requirements as open questions, with no tool ticked', async () => {
  const plan = await demoPlan([], { ...DEMO_FACTS, 'uses-genai': 'yes' });
  const genai = plan.items.filter(i => i.profileId === 'generative-ai');
  expect(genai.map(i => i.id)).toEqual(['ga-1', 'ga-2', 'ga-3', 'ga-4', 'ga-5', 'ga-6', 'ga-7', 'ga-8']);
  expect(genai.every(i => i.heading === 'questions' && i.placement === 'open')).toBe(true);
});

test('uses-genai no, or not answered, adds nothing', async () => {
  expect((await demoPlan([], { ...DEMO_FACTS, 'uses-genai': 'no' })).items.some(i => i.profileId === 'generative-ai')).toBe(false);
  expect((await demoPlan([], DEMO_FACTS)).items.some(i => i.profileId === 'generative-ai')).toBe(false);
});

test('picking genCentral no longer adds requirements', async () => {
  expect((await demoPlan(['gencentral'], DEMO_FACTS)).counts).toEqual((await demoPlan([], DEMO_FACTS)).counts);
});

test('the GenAI requirements have plain-language questions', async () => {
  const { plan } = await setup(true);
  const ga1 = plan.items.find(i => i.id === 'ga-1')!;
  expect(ga1.plain?.question).toMatch(/overseas/i);
});

test('the spreadsheet gets a "genai" sheet with a header and 8 rows', async () => {
  const { plan, genai } = await setup(true);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load((await fillSspWorkbook(plan, { templatePath: TEMPLATE, profileId: 'low-risk-cloud', genai: { profile: genai } })) as unknown as ArrayBuffer);
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
  const { plan } = await setup(false);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load((await fillSspWorkbook(plan, { templatePath: TEMPLATE, profileId: 'low-risk-cloud' })) as unknown as ArrayBuffer);
  expect(wb.getWorksheet('genai')).toBeUndefined();
});
