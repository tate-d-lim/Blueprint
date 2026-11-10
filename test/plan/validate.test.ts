import { parseSaveInput, parseToolIds } from '@/lib/plan/validate';
import { DEMO_ANSWERS, DEMO_FACTS } from '../helpers/demo';

test('the shapes the app writes are accepted', () => {
  expect(parseSaveInput({ riskAnswers: DEMO_ANSWERS, facts: DEMO_FACTS, name: 'A' })).toEqual({ riskAnswers: DEMO_ANSWERS, facts: DEMO_FACTS, name: 'A' });
});
test('garbage answers, facts, names and tool ids are refused', () => {
  expect(() => parseSaveInput({ riskAnswers: { ...DEMO_ANSWERS, classification: 'x' } })).toThrow();
  expect(() => parseSaveInput({ riskAnswers: { ...DEMO_ANSWERS, cii: 'yes' } })).toThrow();
  expect(() => parseSaveInput({ riskAnswers: DEMO_ANSWERS, facts: { 'a b': 'c' } })).toThrow();
  expect(() => parseSaveInput({ riskAnswers: DEMO_ANSWERS, name: 'x'.repeat(121) })).toThrow();
  expect(() => parseToolIds(['ok', '../x'])).toThrow();
});
