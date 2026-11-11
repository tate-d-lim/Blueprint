import { readFileSync } from 'node:fs';
import type ExcelJS from 'exceljs';
import { cellText } from '@/lib/data/xlsx';
import { buildAboutInfo } from '@/lib/export/about';
import { toolsForMeta, type PlanMeta } from '@/lib/export/plan-meta';
import { oscalFileName, sspFileName } from '@/lib/export/filename';
import { buildSsp } from '@/lib/export/oscal';
import { buildSspWorkbook } from '@/lib/export/ssp-xlsx';
import { buildPlan } from '@/lib/plan/engine';
import { selectPlanInput } from '@/lib/plan/select';
import { defaultVerifyProfile } from '@/lib/plan/verification';
import { DEMO_ANSWERS, demoData } from '../helpers/demo';
import { oscalValidator } from '../helpers/oscal-validate';

const GENERATED = '2026-11-10T09:00:00.000Z';
const MEDIUM_ANSWERS = { ...DEMO_ANSWERS, sensitivity: 'sensitive-high' as const };

async function mediumSetup() {
  const data = await demoData();
  const input = selectPlanInput(data, { profileId: 'medium-risk-cloud', toolIds: [], facts: { 'uses-genai': 'no' } });
  const profile = data.profiles.find(p => p._id === 'medium-risk-cloud')!;
  const meta: PlanMeta = {
    title: 'Payments',
    appType: 'Medium-risk app on the cloud',
    profileTitle: profile.title,
    tools: toolsForMeta(input, profile._id),
    generatedAt: GENERATED,
  };
  return { data, input, plan: buildPlan(input), profile, meta };
}

const sheetText = (sheet: ExcelJS.Worksheet) => {
  const out: string[] = [];
  sheet.eachRow(row => row.eachCell(cell => void out.push(cellText(cell))));
  return out.join('\n');
};

test('a Medium plan exports schema-valid OSCAL and a spreadsheet', async () => {
  const { plan, profile, meta } = await mediumSetup();
  const ssp = buildSsp({ plan, profiles: [profile], tools: [], answers: MEDIUM_ANSWERS, generatedAt: GENERATED });
  expect(oscalValidator('ssp')(ssp).errors).toEqual([]);
  const wb = await buildSspWorkbook(plan, profile, { about: buildAboutInfo(meta, profile, 'Payments') });
  expect(wb.getWorksheet('ssp')!.rowCount).toBe(1 + 118);
  expect(sheetText(wb.getWorksheet('About this file')!)).toContain('No official template for this profile; columns follow the Low-Risk Cloud template.');
});

test('the Medium spreadsheet has the template header and the profile levels', async () => {
  const { plan, profile } = await mediumSetup();
  const sheet = (await buildSspWorkbook(plan, profile, {})).getWorksheet('ssp')!;
  expect([1, 2, 3, 4, 5, 6, 7, 8, 9].map(c => cellText(sheet.getRow(1).getCell(c)))).toEqual([
    'ID', 'Title', 'Statement', 'Recommendations', 'Risk/Rationale', 'Profile Level', 'References', 'Implemented', 'Explanation',
  ]);
  const first = profile.entries[0];
  expect(cellText(sheet.getRow(2).getCell(1))).toBe(first.id);
  expect(cellText(sheet.getRow(2).getCell(6))).toBe(String(first.level));
});

test('the Medium spreadsheet adds the GenAI sheet when the plan has GenAI items', async () => {
  const data = await demoData();
  const input = selectPlanInput(data, { profileId: 'medium-risk-cloud', toolIds: [], facts: { 'uses-genai': 'yes' } });
  const medium = data.profiles.find(p => p._id === 'medium-risk-cloud')!;
  const genai = data.profiles.find(p => p._id === 'generative-ai')!;
  const wb = await buildSspWorkbook(buildPlan(input), medium, { genai: { profile: genai } });
  expect(wb.getWorksheet('genai')!.rowCount).toBe(9);
});

test('file names follow the profile', () => {
  expect(sspFileName('medium-risk-cloud', 'payments')).toBe('medium-risk-cloud-ssp-payments.xlsx');
  expect(sspFileName('low-risk-cloud')).toBe('low-risk-cloud-ssp.xlsx');
  expect(sspFileName('low-risk-cloud', "Member's app")).toBe('low-risk-cloud-ssp-member-s-app.xlsx');
  expect(sspFileName('low-risk-cloud', '!!!')).toBe('low-risk-cloud-ssp.xlsx');
  expect(oscalFileName('ssp', 'Sample project (two weeks in)')).toBe('sample-project-two-weeks-in-ssp.json');
  expect(oscalFileName('component-definition', 'Payments')).toBe('payments-component-definition.json');
  expect(oscalFileName('ssp')).toBe('ssp.json');
  expect(oscalFileName('ssp', '!!!')).toBe('ssp.json');
});

test('the verify page opens on the first profile a tool has a version for, else the Low profile', async () => {
  const data = await demoData();
  expect(defaultVerifyProfile(data.profiles, data.versions, 'appcentral')).toBe('low-risk-cloud');
  expect(defaultVerifyProfile(data.profiles, data.versions, 'nobody')).toBe('low-risk-cloud');
  expect(defaultVerifyProfile(data.profiles, [], 'appcentral')).toBe('low-risk-cloud');
});

test('no fixed profile id is left in the builder code', () => {
  for (const f of ['app/plan/project-context.tsx', 'app/api/export/oscal/route.ts', 'lib/export/ssp-xlsx.ts', 'lib/risk/assess.ts', 'app/verify/[toolId]/page.tsx'])
    expect(readFileSync(f, 'utf8'), f).not.toContain('low-risk-cloud');
});
