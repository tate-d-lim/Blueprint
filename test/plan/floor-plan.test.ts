import { arrangeRooms, floorPlanRooms, roomName } from '@/lib/plan/floor-plan';
import { makeItem } from '../helpers/factories';

const item = (family: string, over: Parameters<typeof makeItem>[0] = {}) => makeItem({ id: `${family}-${Math.random()}`, family, ...over });
const built = (family: string) => item(family, { heading: 'platform', placement: 'provided' });
const task = (family: string, status?: 'todo' | 'in-progress' | 'done') =>
  item(family, { heading: 'you', placement: 'app-builder', ...(status && { status: { status } }) });

test('each family becomes one room that counts what is built, what is yours by status, and the questions', () => {
  const rooms = floorPlanRooms([
    built('as'),
    built('as'),
    task('as', 'done'),
    task('as', 'in-progress'),
    task('as'),
    item('as', { heading: 'questions', placement: 'open' }),
    item('as', { heading: 'questions', placement: 'answered-not-applicable', status: { applies: false, reason: 'No SMS.' } }),
  ]);
  expect(rooms).toEqual([
    { family: 'as', total: 7, built: 2, done: 1, inProgress: 1, todo: 1, openQuestions: 1, settled: 1 },
  ]);
});

test('good-to-have extras are not part of the building', () => {
  expect(floorPlanRooms([built('lm'), item('lm', { heading: 'good-to-have', level: 2 })])).toEqual([
    { family: 'lm', total: 1, built: 1, done: 0, inProgress: 0, todo: 0, openQuestions: 0, settled: 0 },
  ]);
});

test('rooms keep the catalogue order of their families', () => {
  const rooms = floorPlanRooms([built('lm'), built('as'), built('sc')]);
  expect(rooms.map(r => r.family)).toEqual(['as', 'sc', 'lm']);
});

test('rooms are arranged into rows of about the same size, without changing their order inside a row', () => {
  const rooms = [12, 11, 11, 10, 8, 7, 6, 5, 5, 5, 4, 2].map((total, i) => ({
    family: `f${i}`, total, built: total, done: 0, inProgress: 0, todo: 0, openQuestions: 0, settled: 0,
  }));
  const rows = arrangeRooms(rooms, 3);
  expect(rows).toHaveLength(3);
  expect(rows.flat()).toHaveLength(12);
  const sums = rows.map(row => row.reduce((n, r) => n + r.total, 0));
  expect(Math.max(...sums) - Math.min(...sums)).toBeLessThanOrEqual(4);
  for (const row of rows) {
    const order = row.map(r => rooms.indexOf(r));
    expect(order).toEqual([...order].sort((a, b) => a - b));
  }
});

test('fewer rooms than rows gives one room per row and no empty rows', () => {
  const rooms = floorPlanRooms([built('as'), built('lm')]);
  expect(arrangeRooms(rooms, 3).map(row => row.length)).toEqual([1, 1]);
});

test('room names use builder language, never compliance words', () => {
  const codes = ['as', 'sc', 'st', 'ns', 'br', 'dp', 'lm', 'ac', 'cs', 'pm', 'is', 'sd', 'dc', 'tp', 'ck', 'ga'];
  const names = codes.map(roomName);
  expect(names.filter(name => /\b(IM8|SSP|OSCAL|controls?|agency|agencies)\b/i.test(name))).toEqual([]);
});

test('every family has one room name, used everywhere, and an unknown family falls back to its code', () => {
  expect(roomName('as')).toBe('App security');
  expect(roomName('sd')).toBe('Secure development');
  expect(roomName('zz')).toBe('ZZ');
});
