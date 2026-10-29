import { coverageTemplate, renderCoverageBrief } from '@/lib/export/coverage-brief-md';
import { makeProfile, makeTool } from '../helpers/factories';

const profile = makeProfile('low', [{ id: 'as-3', plain: { title: 'Lock it', task: 'Do X', why: 'Because' } }, { id: 'ac-7' }]);
const tool = makeTool('probe', { name: 'Probe' });
const otherTools = [makeTool('dbaas', { name: 'DBaaS' })];
const generatedAt = '2026-10-29T00:00:00.000Z';
const md = renderCoverageBrief({ tool, profile, otherTools, generatedAt });

type Row = { 'control-id': string; description: string; props: { name: string; value: string }[] };
const rowsOf = (doc: Record<string, unknown>): Row[] =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (doc as any)['component-definition'].components[0]['control-implementations'][0]['implemented-requirements'];

test('the brief lists every requirement once in the table', () => {
  expect(md.match(/^\| as-3 \|/gm)).toHaveLength(1);
  expect(md.match(/^\| ac-7 \|/gm)).toHaveLength(1);
  expect(md).toMatch(/^\| ac-7 \|.*Title ac-7/m);
});

test('the template is one fenced JSON block that parses', () => {
  const blocks = [...md.matchAll(/```json\n([\s\S]*?)\n```/g)];
  expect(blocks).toHaveLength(1);
  expect(rowsOf(JSON.parse(blocks[0][1])).map(r => r['control-id'])).toEqual(['as-3', 'ac-7']);
});

test('the template has an empty answer and evidence on every row', () => {
  for (const row of rowsOf(coverageTemplate({ tool, profile, generatedAt }))) {
    expect(Object.fromEntries(row.props.map(p => [p.name, p.value]))).toEqual({ responsibility: '', evidence: '' });
  }
});

test('the brief names all five answers and the other tool ids', () => {
  for (const word of ['provided', 'shared', 'app-builder', 'not-applicable', 'other-tool', 'dbaas']) expect(md).toContain(`\`${word}\``);
});

test('the brief names the output file', () => {
  expect(md).toContain('probe-coverage.oscal.json');
});

test('the template is the same on every call for the same inputs', () => {
  expect(coverageTemplate({ tool, profile, generatedAt })).toEqual(coverageTemplate({ tool, profile, generatedAt }));
});
