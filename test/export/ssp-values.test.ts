import { STATUS_LABEL, sspValues } from '@/lib/export/ssp-values';
import { makeClaim, makeItem } from '../helpers/factories';

const SLIDE = 'AEO TPC slide 12 (28 Oct 2026)';
const provided = (explanation?: string, over = {}) => {
  const claim = makeClaim({ explanation, ...over });
  return makeItem({ placement: 'provided', heading: 'platform', claims: [claim], decisive: [claim] });
};
const builderItem = (status: 'todo' | 'done', note?: string, claims = [] as ReturnType<typeof makeClaim>[], placement: 'app-builder' | 'default-builder' | 'answered-applies' = 'default-builder') =>
  makeItem({ placement, heading: 'you', claims, decisive: claims, status: { status, note } });
const sharedItem = (status: 'todo' | 'done', note?: string) => {
  const claim = makeClaim({ toolId: 'zod', toolName: 'Zod', value: 'shared', explanation: 'Zod checks data against a schema.', builderPart: 'Define a schema for every input.', source: 'Sample' });
  return makeItem({ placement: 'shared', heading: 'you', claims: [claim], decisive: [claim], status: { status, note } });
};

test('provided: Y, with the tool, how it does it and the source', () => {
  expect(sspValues(provided('Uses TLS 1.2+.'))).toEqual({
    implemented: 'Y',
    explanation: `Provided by appCentral: Uses TLS 1.2+. Source: ${SLIDE}.`,
  });
});

test('provided without an explanation leaves out the colon part', () => {
  expect(sspValues(provided()).explanation).toBe(`Provided by appCentral. Source: ${SLIDE}.`);
});

test('not applicable: N/A, naming the tool and why', () => {
  const claim = makeClaim({ value: 'not-applicable', explanation: 'appCentral does not have hosts (EC2).' });
  const item = makeItem({ placement: 'not-applicable', claims: [claim], decisive: [claim] });
  expect(sspValues(item)).toEqual({
    implemented: 'N/A',
    explanation: `Not applicable when using appCentral: appCentral does not have hosts (EC2). Source: ${SLIDE}.`,
  });
});

test.each([
  ['todo', 'Partial', 'Not done'],
  ['done', 'Y', 'Done'],
] as const)('shared item at %s exports %s', (status, implemented, label) => {
  expect(sspValues(sharedItem(status))).toEqual({
    implemented,
    explanation: `Shared. Zod: Zod checks data against a schema. App builder: Define a schema for every input. Status: ${label} (self-declared). Source: Sample.`,
  });
});

test('a shared item’s note goes before the source', () => {
  expect(sspValues(sharedItem('todo', 'Half done')).explanation).toBe(
    'Shared. Zod: Zod checks data against a schema. App builder: Define a schema for every input. Status: Not done (self-declared). Half done. Source: Sample.',
  );
});

test.each([
  ['todo', 'N'],
  ['done', 'Y'],
] as const)('builder item at %s exports %s', (status, implemented) => {
  expect(sspValues(builderItem(status))).toEqual({
    implemented,
    explanation: `App builder's responsibility. Status: ${STATUS_LABEL[status]} (self-declared).`,
  });
});

test('a builder item carries the tool’s tip and the builder’s note', () => {
  const claim = makeClaim({ value: 'app-builder', builderPart: 'Use the built-in validators' });
  expect(sspValues(builderItem('done', 'Zod on every route', [claim], 'app-builder'))).toEqual({
    implemented: 'Y',
    explanation: "App builder's responsibility. Use the built-in validators. Status: Done (self-declared). Zod on every route.",
  });
});

test('an answered "applies" question exports like any builder task', () => {
  expect(sspValues(builderItem('todo', undefined, [], 'answered-applies')).implemented).toBe('N');
});

test('a "doesn’t apply" answer exports N/A with the builder’s reason', () => {
  const item = makeItem({ placement: 'answered-not-applicable', heading: 'questions', status: { applies: false, reason: 'No SMS in this app' } });
  expect(sspValues(item)).toEqual({ implemented: 'N/A', explanation: 'Does not apply (self-declared): No SMS in this app.' });
  const dotted = makeItem({ placement: 'answered-not-applicable', status: { applies: false, reason: 'Not used.' } });
  expect(sspValues(dotted).explanation).toBe('Does not apply (self-declared): Not used.');
});

test('open items are left blank for the reviewer', () => {
  expect(sspValues(makeItem({ placement: 'open', heading: 'questions' }))).toEqual({ implemented: '', explanation: '' });
});

test('claims that are not yet verified are marked at the start of their text', () => {
  const item = provided(undefined, { toolName: 'DBaaS', verification: 'not-yet-verified' });
  expect(sspValues(item).explanation).toBe(`[Not yet verified] Provided by DBaaS. Source: ${SLIDE}.`);
});

test('several provided claims are joined with "; ", each marked on its own', () => {
  const a = makeClaim({ toolName: 'DBaaS', verification: 'not-yet-verified' });
  const b = makeClaim({ toolName: 'appCentral' });
  const item = makeItem({ placement: 'provided', claims: [a, b], decisive: [a, b] });
  expect(sspValues(item).explanation).toBe(
    `[Not yet verified] Provided by DBaaS. Source: ${SLIDE}; Provided by appCentral. Source: ${SLIDE}.`,
  );
});

test('a not-yet-verified builder tip marks the whole explanation', () => {
  const claim = makeClaim({ value: 'app-builder', verification: 'not-yet-verified' });
  expect(sspValues(builderItem('todo', undefined, [claim], 'app-builder')).explanation.startsWith('[Not yet verified] ')).toBe(true);
});

test('text that already ends in a full stop never gets a second one', () => {
  const claim = makeClaim({ explanation: 'Handled centrally.', source: 'Slide 12.' });
  const text = sspValues(makeItem({ placement: 'provided', claims: [claim], decisive: [claim] })).explanation;
  expect(text).toBe('Provided by appCentral: Handled centrally. Source: Slide 12.');
  expect(text).not.toContain('..');
});

test('multi-line explanations are kept as written', () => {
  const claim = makeClaim({ explanation: 'for static: CWP\nfor dynamic: agency' });
  const text = sspValues(makeItem({ placement: 'provided', claims: [claim], decisive: [claim] })).explanation;
  expect(text).toContain('for static: CWP\nfor dynamic: agency');
});

test('a Level 2 open item is blank, and a Level 2 provided item still exports Y', () => {
  expect(sspValues(makeItem({ level: 2, heading: 'good-to-have', placement: 'open' })).implemented).toBe('');
  expect(sspValues({ ...provided('x'), level: 2, heading: 'good-to-have' }).implemented).toBe('Y');
});
