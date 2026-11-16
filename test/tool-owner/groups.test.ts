import { PARTS } from '@/lib/plan/hotel';
import { answerLine, changedLine, groupByPart, rowChanged, saveBlocker } from '@/lib/tool-owner/groups';
import type { DraftRow } from '@/lib/tool-owner/new-version';
import { key } from '../helpers/factories';

test('controls go into the parts of the hotel, in the order of the parts list', () => {
  const groups = groupByPart([{ family: 'ac' }, { family: 'lm' }, { family: 'pm' }, { family: 'lm' }]);
  expect(groups.map(g => g.part.id)).toEqual(['rules', 'cctv', 'keycards']);
  expect(groups[1].items).toHaveLength(2);
  expect(groups.map(g => g.part.id)).toEqual(PARTS.map(p => p.id).filter(id => ['rules', 'cctv', 'keycards'].includes(id)));
});

test('a part with no control is left out', () => expect(groupByPart([{ family: 'lm' }]).map(g => g.part.id)).toEqual(['cctv']));

test('the answer line has the right noun', () => {
  expect(answerLine(3, 8)).toBe('3 of 8 controls have an answer');
  expect(answerLine(1, 1)).toBe('1 of 1 control has an answer');
});

test('the changed line counts rows', () => {
  expect(changedLine(0)).toBe('No rows changed');
  expect(changedLine(1)).toBe('1 row changed');
  expect(changedLine(4)).toBe('4 rows changed');
});

describe('a changed row', () => {
  const was: DraftRow = { key: key('as-1'), value: 'provided', explanation: 'It does.' };
  test('is a different value or text', () => {
    expect(rowChanged({ ...was, value: 'shared' }, was)).toBe(true);
    expect(rowChanged({ ...was, explanation: 'It does more.' }, was)).toBe(true);
  });
  test('is not a blank string for nothing', () => expect(rowChanged({ ...was, builderPart: '' }, was)).toBe(false));
  test('is a row that was not there before, once it has a value', () => {
    expect(rowChanged({ key: key('as-2'), value: 'shared' }, undefined)).toBe(true);
    expect(rowChanged({ key: key('as-2'), value: '' }, undefined)).toBe(false);
  });
});

describe('why the save button is off', () => {
  test('nothing changed', () => expect(saveBlocker({ changed: 0, blankRows: 0 })).toBe('Change at least one row first.'));
  test('a coding agent filled the rows, so no change is needed', () => expect(saveBlocker({ changed: 0, blankRows: 0, fromAgent: true })).toBeNull());
  test('blank rows after an agent file come first', () => expect(saveBlocker({ changed: 2, blankRows: 1, fromAgent: true })).toBe('Answer the 1 blank row first.'));
  test('rows to check after a catalog change may be confirmed with no change', () => expect(saveBlocker({ changed: 0, blankRows: 0, toCheck: 2 })).toBeNull());
  test('a changed row allows the save', () => expect(saveBlocker({ changed: 1, blankRows: 0 })).toBeNull());
});
