import { coverageTemplate } from '@/lib/export/coverage-brief-md';
import { parseAgentOscal } from '@/lib/import/parse-agent-oscal';
import { key, makeProfile, makeTool } from '../helpers/factories';

const profile = makeProfile('low', [{ id: 'as-3' }, { id: 'ac-7' }, { id: 'is-14' }]);
const tool = makeTool('probe', { name: 'Probe' });
const others = ['dbaas'];

type Answer = { r?: string; d?: string; bp?: string; ho?: string; ev?: string };
type Row = { 'control-id': string; description: string; props: { name: string; ns?: string; value: string }[] };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rowsOf = (doc: any): Row[] => doc['component-definition'].components[0]['control-implementations'][0]['implemented-requirements'];

function template() {
  return coverageTemplate({ tool, profile, generatedAt: '2026-10-29T00:00:00.000Z' }) as Record<string, unknown>;
}

function fill(answers: Record<string, Answer>, edit?: (doc: ReturnType<typeof template>) => void): string {
  const doc = template();
  for (const row of rowsOf(doc)) {
    const a = answers[row['control-id']];
    if (!a) continue;
    const set = (name: string, value?: string) => {
      if (value === undefined) return;
      const p = row.props.find(x => x.name === name);
      if (p) p.value = value;
      else row.props.push({ name, ns: 'urn:cpfb-build-plan', value });
    };
    set('responsibility', a.r);
    set('evidence', a.ev);
    set('builder-part', a.bp);
    set('handled-by', a.ho);
    if (a.d) row.description = a.d;
  }
  edit?.(doc);
  return JSON.stringify(doc);
}

const parse = (text: string) => parseAgentOscal(text, profile, 'probe', others);
const error = (text: string) => {
  const result = parse(text);
  if (result.ok) throw new Error('expected a refusal');
  return result.error;
};

test('the empty template gives every row blank, in profile order', () => {
  const result = parse(fill({}));
  expect(result).toMatchObject({ ok: true, filled: 0, blank: [key('as-3'), key('ac-7'), key('is-14')] });
  if (result.ok) expect(result.rows.map(r => [r.key, r.value])).toEqual([[key('as-3'), ''], [key('ac-7'), ''], [key('is-14'), '']]);
});

test('maps each field to the editor row', () => {
  const result = parse(fill({ 'as-3': { r: 'shared', d: 'Does A', bp: 'You do B', ev: 'src/auth.ts' }, 'ac-7': { r: 'other-tool', ho: 'dbaas' } }));
  if (!result.ok) throw new Error(result.error);
  expect(result.rows[0]).toEqual({ key: key('as-3'), value: 'shared', explanation: 'Does A', builderPart: 'You do B', source: 'src/auth.ts' });
  expect(result.rows[1]).toEqual({ key: key('ac-7'), value: 'other-tool', otherToolId: 'dbaas' });
  expect(result.filled).toBe(2);
  expect(result.blank).toEqual([key('is-14')]);
});

test('an app-builder description becomes the builder part', () => {
  const result = parse(fill({ 'as-3': { r: 'app-builder', d: 'Add a lockout' } }));
  if (!result.ok) throw new Error(result.error);
  expect(result.rows[0]).toEqual({ key: key('as-3'), value: 'app-builder', builderPart: 'Add a lockout' });
});

test('a missing requirement comes back blank and listed', () => {
  const text = fill({ 'as-3': { r: 'provided' }, 'ac-7': { r: 'provided' } }, doc => {
    const rows = rowsOf(doc);
    rows.splice(rows.findIndex(r => r['control-id'] === 'is-14'), 1);
  });
  const result = parse(text);
  if (!result.ok) throw new Error(result.error);
  expect(result.rows[2]).toEqual({ key: key('is-14'), value: '' });
  expect(result.blank).toEqual([key('is-14')]);
});

describe('refusals', () => {
  test('not JSON', () => {
    expect(error('not json')).toBe("This file isn't JSON. Upload the file your agent wrote.");
  });

  test('no component definition', () => {
    expect(error('{}')).toBe('This file has no component definition. Check that the agent followed the brief.');
  });

  test('two components', () => {
    const text = fill({}, doc => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const c = (doc as any)['component-definition'].components;
      c.push(structuredClone(c[0]));
    });
    expect(error(text)).toBe('This file describes 2 tools. Upload one tool at a time.');
  });

  test('an unknown requirement id', () => {
    const text = fill({}, doc => {
      rowsOf(doc).push({ 'control-id': 'zz-1', description: '', props: [] });
    });
    expect(error(text)).toBe("1 requirement IDs aren't in low: zz-1");
  });

  test('a requirement twice', () => {
    const text = fill({}, doc => {
      rowsOf(doc).push(structuredClone(rowsOf(doc)[0]));
    });
    expect(error(text)).toBe('as-3 appears twice.');
  });

  test('an answer that is not one of the five', () => {
    expect(error(fill({ 'as-3': { r: 'mostly' } }))).toBe('as-3 has the answer "mostly", which isn\'t one of the five answers in the brief.');
  });

  test('another tool that does not exist, or is this tool', () => {
    expect(error(fill({ 'as-3': { r: 'other-tool', ho: 'nope' } }))).toBe('as-3 says another tool handles it, but "nope" isn\'t a tool here.');
    expect(error(fill({ 'as-3': { r: 'other-tool', ho: 'probe' } }))).toBe('as-3 says another tool handles it, but "probe" isn\'t a tool here.');
  });
});

describe('what agents often get slightly wrong', () => {
  test('an answer with other case or spaces', () => {
    const result = parse(fill({ 'as-3': { r: ' Provided ' }, 'ac-7': { r: 'APP-BUILDER' } }));
    if (!result.ok) throw new Error(result.error);
    expect(result.rows.map(r => r.value)).toEqual(['provided', 'app-builder', '']);
  });

  test('a BOM and a code fence around the JSON', () => {
    const result = parse('﻿```json\n' + fill({ 'as-3': { r: 'provided' } }) + '\n```\n');
    expect(result).toMatchObject({ ok: true, filled: 1 });
  });

  test('props with no namespace', () => {
    const text = fill({ 'as-3': { r: 'provided' } }, doc => {
      for (const row of rowsOf(doc)) for (const p of row.props) delete p.ns;
    });
    expect(parse(text)).toMatchObject({ ok: true, filled: 1 });
  });

  test('upper-case requirement ids', () => {
    const text = fill({ 'as-3': { r: 'provided' } }, doc => {
      rowsOf(doc)[0]['control-id'] = 'AS-3';
    });
    const result = parse(text);
    if (!result.ok) throw new Error(result.error);
    expect(result.rows[0]).toEqual({ key: key('as-3'), value: 'provided' });
  });
});

describe('review fixes', () => {
  test('a code fence with Windows line endings', () => {
    const result = parse('```json\r\n' + fill({ 'as-3': { r: 'provided' } }) + '\r\n```\r\n');
    expect(result).toMatchObject({ ok: true, filled: 1 });
  });

  test('null entries are a plain refusal, not a crash', () => {
    expect(error(JSON.stringify({ 'component-definition': { components: [null] } }))).toBe(
      'This file has no component definition. Check that the agent followed the brief.',
    );
    const text = fill({ 'as-3': { r: 'provided' } }, doc => {
      rowsOf(doc).push(null as unknown as Row);
      rowsOf(doc)[0].props.push(null as unknown as Row['props'][number]);
    });
    expect(parse(text)).toMatchObject({ ok: true, filled: 1 });
  });
});
