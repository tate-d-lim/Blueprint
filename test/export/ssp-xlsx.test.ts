import ExcelJS from 'exceljs';
import { buildAboutInfo, type AboutInfo } from '@/lib/export/about';
import { MissingTemplateRowError, fillSspWorkbook } from '@/lib/export/ssp-xlsx';
import { slugify, sspFileName } from '@/lib/export/filename';
import { cellText } from '@/lib/data/xlsx';
import { buildPlan, type PlanData } from '@/lib/plan/engine';
import { pairVersions, selectPlanInput } from '@/lib/plan/select';
import { makeItem } from '../helpers/factories';
import { loadSeed } from '../helpers/seed';

const TEMPLATE = 'data/source/low-risk-cloud-ssp.xlsx';

async function demoPlan(toolIds = ['appcentral', 'dbaas', 'iga']) {
  const seed = await loadSeed();
  const data: PlanData = { profiles: seed.profiles, tools: seed.tools, versions: pairVersions(seed.toolVersions) };
  return buildPlan(selectPlanInput(data, { profileId: 'low-risk-cloud', toolIds }));
}

async function readBack(buffer: Buffer): Promise<ExcelJS.Worksheet> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as ArrayBuffer);
  return wb.getWorksheet('ssp')!;
}

const rowOf = (sheet: ExcelJS.Worksheet, id: string) => {
  let found: ExcelJS.Row | undefined;
  sheet.eachRow(row => {
    if (cellText(row.getCell(1)) === id) found = row;
  });
  return found!;
};

test('fills Implemented (H) and Explanation (I) for the demo plan', async () => {
  const sheet = await readBack(await fillSspWorkbook(await demoPlan(), { templatePath: TEMPLATE, profileId: 'low-risk-cloud' }));
  const h = (id: string) => cellText(rowOf(sheet, id).getCell(8));
  const i = (id: string) => cellText(rowOf(sheet, id).getCell(9));
  expect(h('as-4')).toBe('Y');
  expect(i('as-4')).toMatch(/^Provided by appCentral/);
  expect(h('dp-1')).toBe('Y');
  expect(i('dp-1')).toMatch(/^\[Not yet verified\] Provided by DBaaS/);
  expect(h('as-1')).toBe('N');
  expect(i('as-1')).toBe("App builder's responsibility. Status: To do (self-declared).");
  expect(h('is-1')).toBe('N/A');
  expect(h('is-11')).toBe('');
  expect(i('is-11')).toBe('');
});

test('columns A to G are exactly the template’s, for all 118 rows', async () => {
  const template = new ExcelJS.Workbook();
  await template.xlsx.readFile(TEMPLATE);
  const before = template.getWorksheet('ssp')!;
  const after = await readBack(await fillSspWorkbook(await demoPlan(), { templatePath: TEMPLATE, profileId: 'low-risk-cloud' }));
  let checked = 0;
  before.eachRow((row, n) => {
    for (let c = 1; c <= 7; c++) expect(cellText(after.getRow(n).getCell(c)), `row ${n} col ${c}`).toBe(cellText(row.getCell(c)));
    checked++;
  });
  expect(checked).toBe(119);
});

test('the two filled columns are wide enough to read, and no other column is resized', async () => {
  const sheet = await readBack(await fillSspWorkbook(await demoPlan(), { templatePath: TEMPLATE, profileId: 'low-risk-cloud' }));
  expect(sheet.getColumn(8).width).toBeGreaterThanOrEqual(12);
  expect(sheet.getColumn(9).width).toBeGreaterThanOrEqual(60);
  for (const c of [1, 2, 3, 4, 5, 6, 7]) expect(sheet.getColumn(c).width, `column ${c}`).toBeUndefined();
});

test('a plan item with no row in the template fails and names the ID', async () => {
  const plan = await demoPlan();
  const broken = { ...plan, items: [...plan.items, makeItem({ id: 'zz-9', key: 'im8-reform:zz-9', profileId: 'low-risk-cloud' })] };
  const attempt = fillSspWorkbook(broken, { templatePath: TEMPLATE, profileId: 'low-risk-cloud' });
  await expect(attempt).rejects.toBeInstanceOf(MissingTemplateRowError);
  await expect(attempt).rejects.toThrow(/zz-9/);
});

test('with nothing picked, builder defaults are N and only the questions are blank', async () => {
  const sheet = await readBack(await fillSspWorkbook(await demoPlan([]), { templatePath: TEMPLATE, profileId: 'low-risk-cloud' }));
  expect(cellText(rowOf(sheet, 'as-1').getCell(8))).toBe('N');
  expect(cellText(rowOf(sheet, 'as-4').getCell(8))).toBe('N');
  expect(cellText(rowOf(sheet, 'is-11').getCell(8))).toBe('');
});

const ABOUT: AboutInfo = {
  generatedAt: '2026-10-27T09:00:00.000Z',
  projectName: 'Member portal',
  appType: 'Low-risk app on the cloud',
  profile: { title: 'Low-Risk Cloud', version: '2026-10-22 (local copy)' },
  tools: [
    { name: 'appCentral', version: 1, verification: 'verified' },
    { name: 'DBaaS', version: 1, verification: 'not-yet-verified' },
    { name: 'genCentral', version: 0, verification: 'not-yet-verified' },
  ],
};

test('an "About this file" sheet lists the date, profile, each tool version and the standing notes', async () => {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load((await fillSspWorkbook(await demoPlan(), { templatePath: TEMPLATE, profileId: 'low-risk-cloud', about: ABOUT })) as unknown as ArrayBuffer);
  const sheet = wb.getWorksheet('About this file')!;
  const rows: string[][] = [];
  sheet.eachRow(row => rows.push((row.values as unknown[]).slice(1).map(v => String(v ?? ''))));
  expect(rows).toContainEqual(['appCentral', 'v1', 'Verified']);
  expect(rows).toContainEqual(['DBaaS', 'v1', 'Not yet verified']);
  expect(rows).toContainEqual(['genCentral', 'No coverage recorded', 'Not yet verified']);
  expect(rows).toContainEqual(['Generated', '2026-10-27']);
  expect(rows).toContainEqual(['Project', 'Member portal']);
  expect(rows).toContainEqual(['Profile', 'Low-Risk Cloud, version 2026-10-22 (local copy)']);
  const everything = rows.flat().join('\n');
  expect(everything).toContain('Locally derived from GovTech files received 2026-10-22; not an official GovTech release.');
  expect(everything).toContain('Statuses are self-declared by the app builder.');
  expect(wb.worksheets[0].name).toBe('ssp');
});

test('without the option there is no "About this file" sheet', async () => {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load((await fillSspWorkbook(await demoPlan(), { templatePath: TEMPLATE, profileId: 'low-risk-cloud' })) as unknown as ArrayBuffer);
  expect(wb.getWorksheet('About this file')).toBeUndefined();
});

test('buildAboutInfo copies the header facts', () => {
  const about = buildAboutInfo(
    { title: 'Member portal', appType: 'Low-risk app on the cloud', profileTitle: 'Low-Risk Cloud', tools: ABOUT.tools, generatedAt: ABOUT.generatedAt },
    { _id: 'low-risk-cloud', title: 'Low-Risk Cloud', plainTitle: 'x', version: '2026-10-22 (local copy)', release: '2026-10-22 (local copy)', sourceFile: 'f', entries: [] },
    'Member portal',
  );
  expect(about).toEqual(ABOUT);
});

test('file names: plain, and with a project slug', () => {
  expect(slugify("Member's app / v2")).toBe('member-s-app-v2');
  expect(sspFileName('low-risk-cloud')).toBe('low-risk-cloud-ssp.xlsx');
  expect(sspFileName('low-risk-cloud', "Member's app")).toBe('low-risk-cloud-ssp-member-s-app.xlsx');
  expect(sspFileName('low-risk-cloud', '!!!')).toBe('low-risk-cloud-ssp.xlsx');
});
