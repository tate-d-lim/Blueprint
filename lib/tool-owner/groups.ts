import { PARTS, partOf, type HotelPart } from '../plan/hotel';
import type { DraftRow } from './new-version';

/** The controls of one hotel part, in the order of the parts list (top floor to basement). Empty parts are left out. */
export function groupByPart<T extends { family: string }>(items: T[]): { part: HotelPart; items: T[] }[] {
  const byPart = new Map<string, T[]>();
  for (const item of items) {
    const id = partOf(item.family);
    byPart.set(id, [...(byPart.get(id) ?? []), item]);
  }
  return PARTS.flatMap(part => {
    const inPart = byPart.get(part.id);
    return inPart?.length ? [{ part: part as HotelPart, items: inPart }] : [];
  });
}

/** "3 of 8 controls have an answer" */
export function answerLine(answered: number, total: number): string {
  return `${answered} of ${total} ${total === 1 ? 'control has' : 'controls have'} an answer`;
}

/** The parts of a row that count as a change. A blank string is the same as nothing. */
function essence(row: DraftRow) {
  return {
    key: row.key,
    value: row.value,
    explanation: row.explanation || undefined,
    builderPart: row.builderPart || undefined,
    source: row.source || undefined,
  };
}

/** Whether the tool owner changed a row since the page opened. A row that was never there equals a blank row. */
export function rowChanged(now: DraftRow, before: DraftRow | undefined): boolean {
  return JSON.stringify(essence(now)) !== JSON.stringify(essence(before ?? { key: now.key, value: '' }));
}

/** "No change yet" or "3 rows changed". */
export function changedLine(count: number): string {
  return count === 0 ? 'No rows changed' : `${count} ${count === 1 ? 'row' : 'rows'} changed`;
}

/** Why the save button is off, or null when it may save. */
export function saveBlocker(opts: { changed: number; blankRows: number; fromAgent?: boolean; toCheck?: number }): string | null {
  if (opts.blankRows > 0) return `Answer the ${opts.blankRows} blank ${opts.blankRows === 1 ? 'row' : 'rows'} first.`;
  // After a catalog change the tool owner may find every answer still correct. A new version records that they looked.
  if (opts.changed === 0 && !opts.fromAgent && !opts.toCheck) return 'Change at least one row first.';
  return null;
}
