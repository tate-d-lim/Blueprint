import ExcelJS from 'exceljs';
import { cellText } from '../data/xlsx';
import type { Plan } from '../plan/engine';
import { sspValues } from './ssp-values';

const PROFILE_ID = 'low-risk-cloud';
const IMPLEMENTED_COL = 8; // H
const EXPLANATION_COL = 9; // I

export class MissingTemplateRowError extends Error {
  constructor(id: string) {
    super(`The spreadsheet template has no row for requirement ${id}`);
    this.name = 'MissingTemplateRowError';
  }
}

/**
 * Opens the real Low-Risk Cloud template and fills only Implemented (H) and Explanation (I),
 * leaving every other cell, style and width as it was.
 */
export async function fillSspWorkbook(plan: Plan, opts: { templatePath: string }): Promise<Buffer> {
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
    if (item.profileId !== PROFILE_ID) continue;
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
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
