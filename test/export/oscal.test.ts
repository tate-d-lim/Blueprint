import { OSCAL_NS, buildComponentDefinition, buildSsp } from '@/lib/export/oscal';
import { buildPlan, type PlanData } from '@/lib/plan/engine';
import { pairVersions, selectPlanInput } from '@/lib/plan/select';
import type { RiskAnswers } from '@/lib/risk/assess';
import { oscalValidator } from '../helpers/oscal-validate';
import { loadSeed } from '../helpers/seed';

const GENERATED = '2026-10-27T09:00:00.000Z';
const answers: RiskAnswers = { classification: 'restricted', sensitivity: 'sensitive-normal', impact: 'slight', downstream: 'minimal', cii: false, sii: false };

async function build(toolIds = ['appcentral', 'dbaas', 'iga']) {
  const seed = await loadSeed();
  const data: PlanData = { profiles: seed.profiles, tools: seed.tools, versions: pairVersions(seed.toolVersions) };
  const input = selectPlanInput(data, { profileId: 'low-risk-cloud', toolIds });
  const profile = seed.profiles.find(p => p._id === 'low-risk-cloud')!;
  const tools = input.pickedTools.map(tool => ({ tool, pair: data.versions.find(v => v.current.toolId === tool._id && v.current.profileId === profile._id)! }));
  const plan = buildPlan(input);
  return {
    component: buildComponentDefinition({ tools, profile, generatedAt: GENERATED }),
    ssp: buildSsp({ plan, profile, tools, answers, generatedAt: GENERATED }),
    tools,
  };
}

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const ssp = (doc: Json) => doc['system-security-plan'] as Json;
const requirement = (doc: Json, id: string) => (ssp(doc)['control-implementation']['implemented-requirements'] as Json[]).find(r => r['control-id'] === id)!;
const componentUuid = (doc: Json, title: string) => (ssp(doc)['system-implementation'].components as Json[]).find(c => c.title === title)!.uuid as string;

test('both documents for the demo plan pass the NIST 1.1.2 schemas', async () => {
  const { component, ssp: sspDoc } = await build();
  const a = oscalValidator('component')(component);
  const b = oscalValidator('ssp')(sspDoc);
  expect(a.errors).toEqual([]);
  expect(b.errors).toEqual([]);
  expect([a.ok, b.ok]).toEqual([true, true]);
});

test('building twice with the same inputs gives identical JSON', async () => {
  const one = await build();
  const two = await build();
  expect(JSON.stringify(one.component)).toBe(JSON.stringify(two.component));
  expect(JSON.stringify(one.ssp)).toBe(JSON.stringify(two.ssp));
});

test('a requirement a platform provides is implemented by that tool', async () => {
  const { ssp: doc } = await build();
  const by = requirement(doc, 'as-4')['by-components'] as Json[];
  const appcentral = by.find(b => b['component-uuid'] === componentUuid(doc, 'appCentral'))!;
  expect(appcentral['implementation-status'].state).toBe('implemented');
  expect(by).toHaveLength(1);
});

test('a requirement that is the builder’s has only this-system, planned', async () => {
  const { ssp: doc } = await build();
  const by = requirement(doc, 'as-1')['by-components'] as Json[];
  expect(by).toHaveLength(1);
  expect(by[0]['component-uuid']).toBe(componentUuid(doc, 'This app'));
  expect(by[0]['implementation-status'].state).toBe('planned');
});

test('a requirement that needs a person has no components and says why', async () => {
  const { ssp: doc } = await build();
  const r = requirement(doc, 'pm-1');
  expect(r['by-components']).toBeUndefined();
  expect(r.remarks).toMatch(/^Needs assessment:/);
});

test('not-applicable rows are marked so on the tool', async () => {
  const { ssp: doc } = await build();
  const by = requirement(doc, 'is-1')['by-components'] as Json[];
  expect(by[0]['implementation-status'].state).toBe('not-applicable');
});

test('every custom prop is in the app’s namespace', async () => {
  const { component, ssp: sspDoc } = await build();
  const props: Json[] = [];
  const walk = (node: unknown) => {
    if (Array.isArray(node)) node.forEach(walk);
    else if (node && typeof node === 'object') {
      for (const [k, v] of Object.entries(node)) {
        if (k === 'props') props.push(...(v as Json[]));
        else walk(v);
      }
    }
  };
  walk(component);
  walk(sspDoc);
  expect(props.length).toBeGreaterThan(100);
  expect(props.every(p => p.ns === OSCAL_NS)).toBe(true);
  expect(OSCAL_NS).toBe('urn:cpfb-build-plan');
});

test('the profile reference says it is locally derived', async () => {
  const { component, ssp: sspDoc } = await build();
  for (const doc of [component['component-definition'] as Json, ssp(sspDoc)]) {
    const resources = doc['back-matter'].resources as Json[];
    expect(resources.some(r => /locally derived/i.test(r.description))).toBe(true);
  }
});

test('each tool becomes one component, with a prop for how verified its claims are', async () => {
  const { component } = await build();
  const components = (component['component-definition'] as Json).components as Json[];
  expect(components.map(c => c.title)).toEqual(['appCentral', 'DBaaS', 'IGA']);
  const dbaas = components[1]['control-implementations'][0]['implemented-requirements'].find((r: Json) => r['control-id'] === 'dp-1');
  expect(dbaas.props.find((p: Json) => p.name === 'verification').value).toBe('not-yet-verified');
  const appcentral = components[0]['control-implementations'][0]['implemented-requirements'].find((r: Json) => r['control-id'] === 'dp-1');
  expect(appcentral.props.find((p: Json) => p.name === 'handled-by').value).toBe('dbaas');
});
