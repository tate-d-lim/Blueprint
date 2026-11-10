import ExcelJS from 'exceljs';
import { cellText } from '../data/xlsx';
import type { Profile } from '../domain/types';
import type { Plan } from '../plan/engine';
import { BADGE_TEXT, LOCALLY_DERIVED, SELF_DECLARED_NOTE } from '../plan/labels';
import type { AboutInfo } from './about';
import { sspValues } from './ssp-values';

const IMPLEMENTED_COL = 8; // H
const EXPLANATION_COL = 9; // I

export class MissingTemplateRowError extends Error {
  constructor(id: string) {
    super(`The spreadsheet template has no row for requirement ${id}`);
    this.name = 'MissingTemplateRowError';
  }
}

/** What the About sheet says when a profile has no official spreadsheet to fill. */
export const NO_TEMPLATE_NOTE = 'No official template for this profile; columns follow the Low-Risk Cloud template.';

/**
 * Opens the official template of a profile and fills only Implemented (H) and Explanation (I),
 * leaving every other cell, style and width as it was.
 */
export async function fillSspWorkbook(
  plan: Plan,
  opts: { templatePath: string; profileId: string; genai?: { profile: Profile }; about?: AboutInfo },
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(opts.templatePath);
  const sheet = workbook.getWorksheet('ssp');
  if (!sheet) throw new Error(`No "ssp" sheet in ${opts.templatePath}`);

  const rows = new Map<string, ExcelJS.Row>();
  sheet.eachRow((row, n) => {
    if (n > 1) rows.set(cellText(row.getCell(1)), row);
  });

  // The template defines no widths; give the two filled columns room so wrapped text stays readable.
  sheet.getColumn(IMPLEMENTED_COL).width = 14;
  sheet.getColumn(EXPLANATION_COL).width = 80;

  for (const item of plan.items) {
    if (item.profileId !== opts.profileId) continue;
    const row = rows.get(item.id);
    if (!row) throw new MissingTemplateRowError(item.id);
    const { implemented, explanation } = sspValues(item);
    if (implemented) row.getCell(IMPLEMENTED_COL).value = implemented;
    if (explanation) {
      const cell = row.getCell(EXPLANATION_COL);
      cell.value = explanation;
      cell.alignment = { ...cell.alignment, wrapText: true, vertical: 'top' };
    }
  }
  if (opts.genai) addGenAiSheet(workbook, plan, opts.genai.profile);
  if (opts.about) addAboutSheet(workbook, opts.about);
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

const SSP_HEADER = ['ID', 'Title', 'Statement', 'Recommendations', 'Risk/Rationale', 'Profile Level', 'References', 'Implemented', 'Explanation'];

/**
 * A spreadsheet for a profile that has no official template: one `ssp` sheet with the columns of the Low-Risk Cloud
 * template, a row per requirement in profile order, and the same About sheet (with a line saying so).
 */
export async function buildSspWorkbook(
  plan: Plan,
  profile: Profile,
  opts: { genai?: { profile: Profile }; about?: AboutInfo },
): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  addRequirementSheet(workbook, 'ssp', plan, profile);
  if (opts.genai) addGenAiSheet(workbook, plan, opts.genai.profile);
  if (opts.about) addAboutSheet(workbook, opts.about, NO_TEMPLATE_NOTE);
  return workbook;
}

/** A second sheet with the same columns as the template, for the Generative AI requirements. */
function addGenAiSheet(workbook: ExcelJS.Workbook, plan: Plan, profile: Profile): void {
  addRequirementSheet(workbook, 'genai', plan, profile);
}

function addRequirementSheet(workbook: ExcelJS.Workbook, name: string, plan: Plan, profile: Profile): void {
  const sheet = workbook.addWorksheet(name);
  sheet.addRow(SSP_HEADER).font = { bold: true };
  for (const entry of profile.entries) {
    const item = plan.items.find(i => i.profileId === profile._id && i.key === entry.key);
    const { implemented, explanation } = item ? sspValues(item) : { implemented: '', explanation: '' };
    const row = sheet.addRow([
      entry.id, entry.title, entry.statement, entry.recommendations, entry.rationale,
      String(entry.level), entry.references, implemented, explanation,
    ]);
    row.alignment = { vertical: 'top', wrapText: true };
  }
  [10, 30, 60, 60, 60, 14, 30, 14, 80].forEach((width, i) => (sheet.getColumn(i + 1).width = width));
}

/** What this export was built from, so a reviewer can tell which versions of what they are reading. */
function addAboutSheet(workbook: ExcelJS.Workbook, about: AboutInfo, note?: string): void {
  const sheet = workbook.addWorksheet('About this file');
  const rows: string[][] = [['Generated', about.generatedAt.slice(0, 10)]];
  if (about.projectName) rows.push(['Project', about.projectName]);
  rows.push(
    ['App type', about.appType],
    ['Profile', `${about.profile.title}, version ${about.profile.version}`],
    [],
    ['Tool', 'Coverage version', 'Verification'],
  );
  for (const t of about.tools) {
    rows.push([t.name, t.version === 0 ? 'No coverage recorded' : `v${t.version}`, BADGE_TEXT[t.verification]]);
  }
  rows.push([], [LOCALLY_DERIVED], [SELF_DECLARED_NOTE]);
  if (note) rows.push([note]);
  for (const row of rows) sheet.addRow(row);
  sheet.getRow(rows.findIndex(r => r[0] === 'Tool') + 1).font = { bold: true };
  [28, 28, 22].forEach((width, i) => (sheet.getColumn(i + 1).width = width));
}
