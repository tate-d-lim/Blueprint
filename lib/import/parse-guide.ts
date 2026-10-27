import ExcelJS from 'exceljs';
import { cellText } from '../data/xlsx';

export interface GuideRow {
  id: string;
  owner: string;
  agencyInputs?: string;
  explanation?: string;
}

export interface ParsedGuide {
  fileName: string;
  sheetName: string;
  /** 1-based row number of the header. */
  headerRow: number;
  /** Text of the cells above the header, in reading order (a published date serial becomes YYYY-MM-DD). */
  preamble: string[];
  rows: GuideRow[];
}

export class GuideParseError extends Error {
  constructor(
    public code: 'not-a-workbook' | 'no-header',
    message: string,
  ) {
    super(message);
    this.name = 'GuideParseError';
  }
}

const REQUIREMENT_ID = /^[a-z]{2,3}-\d+$/;
const HEADER_SEARCH_ROWS = 10;
const key = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Excel's day count (1900 system) as an ISO date. */
function serialToDate(serial: number): string {
  return new Date(Date.UTC(1899, 11, 30) + serial * 86_400_000).toISOString().slice(0, 10);
}

export async function parseGuide(data: Buffer | ArrayBuffer, fileName: string): Promise<ParsedGuide> {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(Buffer.isBuffer(data) ? (data as unknown as ArrayBuffer) : data);
  } catch {
    throw new GuideParseError('not-a-workbook', `${fileName} is not an Excel workbook (.xlsx).`);
  }

  let sawIdHeader = false;
  for (const sheet of workbook.worksheets) {
    const headerRow = findHeaderRow(sheet);
    if (!headerRow) continue;
    sawIdHeader = true;
    const columns = new Map<string, number>();
    sheet.getRow(headerRow).eachCell((cell, col) => columns.set(key(cellText(cell)), col));
    const idCol = columns.get('id')!;
    const ownerCol = columns.get('whoisresponsible');
    if (!ownerCol) continue;
    const inputsCol = columns.get('foragencyinputs');
    const explanationCol = columns.get('explanation');

    const rows: GuideRow[] = [];
    const seen = new Set<string>();
    sheet.eachRow((row, n) => {
      if (n <= headerRow) return;
      const id = cellText(row.getCell(idCol)).toLowerCase();
      if (!REQUIREMENT_ID.test(id) || seen.has(id)) return;
      seen.add(id);
      const parsed: GuideRow = { id, owner: cellText(row.getCell(ownerCol)) };
      const inputs = inputsCol ? cellText(row.getCell(inputsCol)) : '';
      const explanation = explanationCol ? cellText(row.getCell(explanationCol)) : '';
      if (inputs) parsed.agencyInputs = inputs;
      if (explanation) parsed.explanation = explanation;
      rows.push(parsed);
    });
    return { fileName, sheetName: sheet.name, headerRow, preamble: preambleOf(sheet, headerRow), rows };
  }

  throw new GuideParseError(
    'no-header',
    sawIdHeader
      ? `${fileName} has an "ID" column but no "Who is responsible?" column.`
      : `${fileName} has no sheet with an "ID" header in its first ${HEADER_SEARCH_ROWS} rows.`,
  );
}

function findHeaderRow(sheet: ExcelJS.Worksheet): number | null {
  for (let n = 1; n <= HEADER_SEARCH_ROWS; n++) {
    let found = false;
    sheet.getRow(n).eachCell(cell => {
      if (cellText(cell).toLowerCase() === 'id') found = true;
    });
    if (found) return n;
  }
  return null;
}

function preambleOf(sheet: ExcelJS.Worksheet, headerRow: number): string[] {
  const out: string[] = [];
  for (let n = 1; n < headerRow; n++) {
    sheet.getRow(n).eachCell(cell => {
      let text = cellText(cell);
      if (!text) return;
      if (/^\d{5}$/.test(text) && /published date/i.test(out.at(-1) ?? '')) text = serialToDate(Number(text));
      out.push(text);
    });
  }
  return out;
}
