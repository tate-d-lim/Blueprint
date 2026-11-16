import ExcelJS from 'exceljs';

/** Plain text of a cell, whatever exceljs decided its value type was. */
export function cellText(cell: ExcelJS.Cell): string {
  return valueText(cell.value).trim();
}

function valueText(v: ExcelJS.CellValue): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if ('richText' in v) return v.richText.map(part => part.text).join('');
  if ('hyperlink' in v) return v.text === undefined ? v.hyperlink : valueText(v.text as ExcelJS.CellValue);
  if ('formula' in v || 'sharedFormula' in v) return valueText((v as { result?: ExcelJS.CellValue }).result ?? null);
  if ('error' in v) return '';
  return '';
}

/** Raised when a workbook has no sheet of the wanted name. */
export class MissingSheetError extends Error {
  constructor(readonly sheetName: string, where: string) {
    super(`No sheet "${sheetName}" in ${where}`);
    this.name = 'MissingSheetError';
  }
}

/** Opens a workbook from a path or from the bytes of an uploaded file. */
export async function openWorkbook(source: string | Buffer): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  if (typeof source === 'string') await workbook.xlsx.readFile(source);
  else await workbook.xlsx.load(source as unknown as Parameters<typeof workbook.xlsx.load>[0]);
  return workbook;
}

/** One sheet of a workbook, read from a path or from bytes. `where` names the file in the error. */
export async function readSheet(source: string | Buffer, sheetName: string, where = typeof source === 'string' ? source : 'the file'): Promise<ExcelJS.Worksheet> {
  const sheet = (await openWorkbook(source)).getWorksheet(sheetName);
  if (!sheet) throw new MissingSheetError(sheetName, where);
  return sheet;
}
