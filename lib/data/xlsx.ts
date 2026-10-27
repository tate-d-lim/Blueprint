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

export async function readSheet(file: string, sheetName: string): Promise<ExcelJS.Worksheet> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(file);
  const sheet = workbook.getWorksheet(sheetName);
  if (!sheet) throw new Error(`No sheet "${sheetName}" in ${file}`);
  return sheet;
}
