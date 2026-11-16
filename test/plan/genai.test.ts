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

test('uses-genai yes with nothing else answered keeps 6 GenAI requirements as questions, and makes 2 tasks', async () => {
  const plan = await demoPlan([], { ...DEMO_FACTS, 'uses-genai': 'yes' });
  const genai = plan.items.filter(i => i.profileId === 'generative-ai');
  expect(genai.map(i => i.id)).toEqual(['ga-1', 'ga-2', 'ga-3', 'ga-4', 'ga-5', 'ga-6', 'ga-7', 'ga-8']);
  // Testing and the warning apply to every AI feature. The other six wait for the answers of step 3.
  expect(genai.filter(i => i.heading === 'questions').map(i => `${i.id}:${i.placement}`)).toEqual(['ga-1:open', 'ga-2:open', 'ga-3:open', 'ga-4:open', 'ga-5:open', 'ga-6:open']);
  expect(genai.filter(i => i.heading === 'you').map(i => i.id)).toEqual(['ga-7', 'ga-8']);
});

const GENAI_NONE = { 'uses-genai': 'yes', 'genai-api': 'no', 'genai-selfhost': 'no', 'genai-uploads': 'no' };

test('the GenAI answers settle the 8 requirements, so none is left as a question', async () => {
  const none = await demoPlan([], { ...DEMO_FACTS, ...GENAI_NONE });
  const ga = (plan: typeof none) => Object.fromEntries(plan.items.filter(i => i.profileId === 'generative-ai').map(i => [i.id, i.heading]));
  // With no AI service, no own model and no uploads, only testing and the warning about wrong answers stay.
  expect(ga(none)).toEqual({ 'ga-1': 'skipped', 'ga-2': 'skipped', 'ga-3': 'skipped', 'ga-4': 'skipped', 'ga-5': 'skipped', 'ga-6': 'skipped', 'ga-7': 'you', 'ga-8': 'you' });
  expect(none.counts.questions).toBe(0);

  const all = await demoPlan([], { ...DEMO_FACTS, ...GENAI_NONE, 'genai-api': 'yes', 'genai-overseas': 'yes', 'genai-sg': 'yes', 'genai-selfhost': 'yes', 'genai-openweights': 'yes', 'genai-uploads': 'yes' });
  expect(ga(all)).toEqual(Object.fromEntries(['ga-1', 'ga-2', 'ga-3', 'ga-4', 'ga-5', 'ga-6', 'ga-7', 'ga-8'].map(id => [id, 'you'])));
  expect(all.counts.questions).toBe(0);
});

test('an AI service that runs overseas or in Singapore brings its own requirement, and the agreement', async () => {
  const heading = async (extra: Record<string, string>) =>
    Object.fromEntries((await demoPlan([], { ...DEMO_FACTS, ...GENAI_NONE, 'genai-api': 'yes', ...extra })).items.filter(i => ['ga-1', 'ga-2', 'ga-3'].includes(i.id)).map(i => [i.id, i.heading]));
  expect(await heading({ 'genai-overseas': 'yes', 'genai-sg': 'no' })).toEqual({ 'ga-1': 'you', 'ga-2': 'skipped', 'ga-3': 'you' });
  expect(await heading({ 'genai-overseas': 'no', 'genai-sg': 'yes' })).toEqual({ 'ga-1': 'skipped', 'ga-2': 'you', 'ga-3': 'you' });
});

test('open-weights models only matter for a model you host yourself', async () => {
  // Step 3 asks about open-weights only after "you host a model yourself", so the answer is absent here.
  const plan = await demoPlan([], { ...DEMO_FACTS, ...GENAI_NONE, 'genai-selfhost': 'no' });
  expect(plan.items.find(i => i.id === 'ga-5')!.heading).toBe('skipped');
  expect(plan.items.find(i => i.id === 'ga-5')!.reason).toBe('You said you do not use an open-weights model.');
});

test('a skipped GenAI requirement says why, in the answer the builder gave', async () => {
  const plan = await demoPlan([], { ...DEMO_FACTS, ...GENAI_NONE });
  expect(plan.items.find(i => i.id === 'ga-6')!.reason).toBe('You said users cannot upload files to your AI feature.');
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
