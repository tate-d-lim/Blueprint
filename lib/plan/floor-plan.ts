import type { PlanItem } from './engine';
import { taskStatusOf } from './progress';

/** One room of the floor plan: every must-or-should requirement of one family, sorted by who handles it. */
export interface Room {
  family: string;
  total: number;
  /** Already built: the picked tools provide it, or it doesn't apply because of them. */
  built: number;
  done: number;
  inProgress: number;
  todo: number;
  /** Questions nobody has answered yet. */
  openQuestions: number;
  /** Questions answered "doesn't apply", and requirements the app's answers rule out. */
  settled: number;
}

/** Families in catalogue order, each with the one name its room has on every screen. */
const FAMILIES: [code: string, name: string][] = [
  ['as', 'App security'],
  ['sc', 'Supply chain'],
  ['st', 'Testing'],
  ['ns', 'Network'],
  ['br', 'Backup'],
  ['dp', 'Data'],
  ['lm', 'Logging'],
  // Builder screens never say "control", so Access Control gets a plain name.
  ['ac', 'Access'],
  ['cs', 'Containers'],
  ['pm', 'Security programme'],
  ['is', 'Infrastructure'],
  ['sd', 'Secure development'],
  ['dc', 'Datacentre'],
  ['tp', 'Third parties'],
  ['ck', 'Cryptography'],
  ['ga', 'Generative AI'],
];
const ORDER = new Map(FAMILIES.map(([code], i) => [code, i]));

export function roomName(family: string): string {
  return FAMILIES.find(([code]) => code === family)?.[1] ?? family.toUpperCase();
}

/** The rooms of a plan, in catalogue order. Good-to-have extras are not part of the building. */
export function floorPlanRooms(items: PlanItem[]): Room[] {
  const rooms = new Map<string, Room>();
  for (const item of items) {
    if (item.heading === 'good-to-have') continue;
    const room = rooms.get(item.family) ?? {
      family: item.family, total: 0, built: 0, done: 0, inProgress: 0, todo: 0, openQuestions: 0, settled: 0,
    };
    room.total++;
    if (item.heading === 'platform') room.built++;
    else if (item.heading === 'you') {
      const status = taskStatusOf(item);
      if (status === 'done') room.done++;
      else if (status === 'in-progress') room.inProgress++;
      else room.todo++;
    } else if (item.placement === 'answered-not-applicable' || item.heading === 'skipped') room.settled++;
    else room.openQuestions++;
    rooms.set(item.family, room);
  }
  const rank = (family: string) => ORDER.get(family) ?? FAMILIES.length;
  return [...rooms.values()].sort((a, b) => rank(a.family) - rank(b.family) || a.family.localeCompare(b.family));
}

/**
 * Splits rooms into rows of about the same size (biggest room first into the emptiest row), then puts each row
 * back in catalogue order, so the plan reads the same way every time.
 */
export function arrangeRooms<T extends { total: number }>(rooms: T[], rowCount: number): T[][] {
  const rows: T[][] = Array.from({ length: Math.min(rowCount, rooms.length) }, () => []);
  const sums = rows.map(() => 0);
  const bySize = rooms.map((room, index) => ({ room, index })).sort((a, b) => b.room.total - a.room.total || a.index - b.index);
  for (const { room } of bySize) {
    const row = sums.indexOf(Math.min(...sums));
    rows[row].push(room);
    sums[row] += room.total;
  }
  return rows.map(row => row.sort((a, b) => rooms.indexOf(a) - rooms.indexOf(b)));
}
