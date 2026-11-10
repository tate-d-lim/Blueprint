import { COMPASS_NS, OSCAL_NS, buildComponentDefinition, buildSsp } from '@/lib/export/oscal';
import { buildPlan, type PlanData } from '@/lib/plan/engine';
import { pairVersions, selectPlanInput } from '@/lib/plan/select';
import type { RiskAnswers } from '@/lib/risk/assess';
import { approved, makeEntry, makeProfile, makeTool, makeVersion, pair } from '../helpers/factories';
import { oscalValidator } from '../helpers/oscal-validate';
import { loadSeed } from '../helpers/seed';

const GENERATED = '2026-10-27T09:00:00.000Z';
const answers: RiskAnswers = { classification: 'restricted', sensitivity: 'sensitive-normal', impact: 'slight', downstream: 'minimal', cii: false, sii: false };

async function build(toolIds = ['appcentral', 'dbaas', 'iga'], profileIds = ['low-risk-cloud']) {
  const seed = await loadSeed();
  const data: PlanData = { profiles: seed.profiles, tools: seed.tools, versions: pairVersions(seed.toolVersions) };
  const input = selectPlanInput(data, { profileId: 'low-risk-cloud', toolIds, facts: profileIds.includes('generative-ai') ? { 'uses-genai': 'yes' } : undefined });
  const profiles = profileIds.map(id => seed.profiles.find(p => p._id === id)!);
  const tools = input.pickedTools.map(tool => ({
    tool,
    pairs: profileIds.flatMap(id => data.versions.filter(v => v.current.toolId === tool._id && v.current.profileId === id)),
  }));
  const plan = buildPlan(input);
  return {
    component: buildComponentDefinition({ tools, profiles, generatedAt: GENERATED }),
    ssp: buildSsp({ plan, profiles, tools, answers, generatedAt: GENERATED }),
    tools,
    plan,
    profiles,
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
  expect(by.map(b => b['component-uuid'])).toEqual([componentUuid(doc, 'appCentral'), componentUuid(doc, 'This app')]);
});

test('a requirement that is the builder’s own has only this-system, planned', async () => {
  const { ssp: doc } = await build();
  const by = requirement(doc, 'pm-1')['by-components'] as Json[];
  expect(by).toHaveLength(1);
  expect(by[0]['component-uuid']).toBe(componentUuid(doc, 'This app'));
  expect(by[0]['implementation-status'].state).toBe('planned');
  expect(by[0].inherited).toBeUndefined();
  expect(by[0].satisfied).toBeUndefined();
  expect(by[0].props).toEqual([{ name: 'evidence-kind', ns: OSCAL_NS, value: 'self-declared' }]);
});

test('a requirement that needs a person has no components and says why', async () => {
  const { ssp: doc } = await build();
  const r = requirement(doc, 'is-11');
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
  expect(props.every(p => p.ns === OSCAL_NS || p.ns === COMPASS_NS || (p.ns === undefined && p.name === 'leveraged-authorization-uuid'))).toBe(true);
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

const cdComponents = (doc: Json) => (doc['component-definition'].components as Json[]);
const cdRows = (doc: Json, title: string) => cdComponents(doc).find(c => c.title === title)!['control-implementations'].flatMap((ci: Json) => ci['implemented-requirements'] as Json[]) as Json[];
const cdRow = (doc: Json, title: string, id: string) => cdRows(doc, title).find(r => r['control-id'] === id)!;
const rolesOf = (row: Json) => (row['responsible-roles'] as Json[] | undefined)?.map(r => r['role-id']);

test('component definition: rows carry provider/customer roles by value', async () => {
  const { component } = await build(['appcentral', 'zod']);
  expect(rolesOf(cdRow(component, 'appCentral', 'as-4'))).toEqual(['provider']);
  expect(rolesOf(cdRow(component, 'Zod', 'as-1'))).toEqual(['provider', 'customer']);
  expect(rolesOf(cdRow(component, 'appCentral', 'dp-1'))).toBeUndefined();
});

test('component definition: metadata declares the provider and customer roles', async () => {
  const { component } = await build();
  expect((component as Json)['component-definition'].metadata.roles.map((r: Json) => r.id)).toEqual(['provider', 'customer']);
});

test('component definition: Zod’s check becomes an oscal-compass rule set', async () => {
  const { component } = await build(['appcentral', 'zod']);
  const zod = cdComponents(component).find(c => c.title === 'Zod')!;
  const set = (zod.props as Json[]).filter(p => p.remarks === 'rule_set_0' && p.ns === COMPASS_NS);
  expect(Object.fromEntries(set.map(p => [p.name, p.value]))).toMatchObject({
    Rule_Id: 'zod-schema-on-every-route',
    Check_Id: 'zod-schema-on-every-route',
  });
  const row = cdRow(component, 'Zod', 'as-1');
  expect((row.props as Json[]).find(p => p.name === 'Rule_Id')).toMatchObject({ ns: COMPASS_NS, value: 'zod-schema-on-every-route' });
  expect(oscalValidator('component')(component).errors).toEqual([]);
});

test('component definition: a tool with no coverage is left out', async () => {
  const { component } = await build(['appcentral', 'gencentral'], ['low-risk-cloud', 'generative-ai']);
  expect(cdComponents(component).map(c => c.title)).toEqual(['appCentral']);
});

test('component definition: one control implementation for each profile a tool covers', async () => {
  const { component } = await build(['appcentral'], ['low-risk-cloud', 'generative-ai']);
  expect(cdComponents(component)[0]['control-implementations']).toHaveLength(1);
  expect((component as Json)['component-definition']['back-matter'].resources).toHaveLength(1);
});

const sspRequirements = (doc: Json) => ssp(doc)['control-implementation']['implemented-requirements'] as Json[];

test('ssp: GenAI requirements are in when the generative-ai profile is passed', async () => {
  const both = await build(['appcentral', 'gencentral'], ['low-risk-cloud', 'generative-ai']);
  expect(sspRequirements(both.ssp).some(r => String(r['control-id']).startsWith('ga-'))).toBe(true);
  expect(oscalValidator('ssp')(both.ssp).errors).toEqual([]);
  const one = await build(['appcentral', 'gencentral'], ['low-risk-cloud']);
  expect(sspRequirements(one.ssp).some(r => String(r['control-id']).startsWith('ga-'))).toBe(false);
  expect(oscalValidator('ssp')(one.ssp).errors).toEqual([]);
});

test('ssp: one combined profile resource names both profiles', async () => {
  const { ssp: doc } = await build(['appcentral', 'gencentral'], ['low-risk-cloud', 'generative-ai']);
  const resources = ssp(doc)['back-matter'].resources as Json[];
  expect(resources).toHaveLength(1);
  expect(resources[0].title).toBe('Low-Risk Cloud + Generative AI (locally derived)');
  expect(resources[0].description).toMatch(/^Locally derived from GovTech files/);
  expect(ssp(doc)['import-profile'].href).toBe(`#${resources[0].uuid}`);
});

test('ssp: parties are one per tool plus the app builder, and roles are declared', async () => {
  const { ssp: doc } = await build();
  expect((ssp(doc).metadata.parties as Json[]).map(p => p.name)).toEqual(['appCentral', 'DBaaS', 'IGA', 'App builder']);
  expect((ssp(doc).metadata.roles as Json[]).map(r => r.id)).toEqual(['provider', 'customer']);
});

test('ssp: a picked tool with no coverage is still a component', async () => {
  const { ssp: doc } = await build(['appcentral', 'gencentral'], ['low-risk-cloud']);
  const gen = (ssp(doc)['system-implementation'].components as Json[]).find(c => c.title === 'genCentral')!;
  expect(gen).toBeDefined();
  expect(gen.props).toBeUndefined();
  expect((ssp(doc).metadata.parties as Json[]).map(p => p.name)).toContain('genCentral');
});

test('ssp: an approved tool version is a leveraged authorization', async () => {
  const { ssp: doc } = await build(['appcentral', 'zod']);
  const entries = ssp(doc)['system-implementation']['leveraged-authorizations'] as Json[];
  expect(entries).toHaveLength(1);
  const party = (ssp(doc).metadata.parties as Json[]).find(p => p.name === 'appCentral')!;
  expect(entries[0]['party-uuid']).toBe(party.uuid);
  expect(entries[0]['date-authorized']).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  const component = (ssp(doc)['system-implementation'].components as Json[]).find(c => c.title === 'appCentral')!;
  expect((component.props as Json[]).find(p => p.name === 'leveraged-authorization-uuid')).toEqual({ name: 'leveraged-authorization-uuid', value: entries[0].uuid });
  const zod = (ssp(doc)['system-implementation'].components as Json[]).find(c => c.title === 'Zod')!;
  expect((zod.props as Json[]).some(p => p.name === 'leveraged-authorization-uuid')).toBe(false);
  expect(oscalValidator('ssp')(doc).errors).toEqual([]);
});

test('ssp: an unapproved current version is not leveraged, even if an older one was', async () => {
  const { plan, profiles, tools } = await build(['appcentral']);
  const v1 = makeVersion('appcentral', 'low-risk-cloud', 1, [makeEntry('as-4')], approved());
  const v2 = makeVersion('appcentral', 'low-risk-cloud', 2, [makeEntry('as-4')]);
  const doc = buildSsp({ plan, profiles, tools: [{ tool: tools[0].tool, pairs: [pair(v2, v1)] }], answers, generatedAt: GENERATED });
  expect(ssp(doc)['system-implementation']['leveraged-authorizations']).toBeUndefined();
  expect(oscalValidator('ssp')(doc).errors).toEqual([]);
});

const byOf = (doc: Json, id: string) => (requirement(doc, id)['by-components'] as Json[]) ?? [];
const toolBy = (doc: Json, id: string, title: string) => byOf(doc, id).find(b => b['component-uuid'] === componentUuid(doc, title))!;
const thisBy = (doc: Json, id: string) => byOf(doc, id).find(b => b['component-uuid'] === componentUuid(doc, 'This app'))!;
const propValues = (item: Json, name: string) => ((item.props ?? []) as Json[]).filter(p => p.name === name).map(p => p.value);

test('ssp: a provided item is inherited from the tool’s provided export', async () => {
  const { ssp: doc } = await build();
  const tool = toolBy(doc, 'as-4', 'appCentral');
  expect(tool.export.provided).toHaveLength(1);
  expect(tool.export.provided[0]['responsible-roles'][0]['role-id']).toBe('provider');
  const mine = thisBy(doc, 'as-4');
  expect(mine['implementation-status'].state).toBe('implemented');
  expect(mine.inherited).toHaveLength(1);
  expect(mine.inherited[0]['provided-uuid']).toBe(tool.export.provided[0].uuid);
  expect(mine.satisfied).toBeUndefined();
});

test('ssp: a shared item has provided + responsibility on the tool and inherited + satisfied on this-system', async () => {
  const { ssp: doc } = await build(['appcentral', 'zod']);
  const tool = toolBy(doc, 'as-1', 'Zod');
  const [p] = tool.export.provided;
  const [r] = tool.export.responsibilities;
  expect(r['provided-uuid']).toBe(p.uuid);
  expect(r['responsible-roles'][0]['role-id']).toBe('customer');
  expect(propValues(r, 'Rule_Id')).toEqual(['zod-schema-on-every-route']);
  const mine = thisBy(doc, 'as-1');
  expect(mine.inherited[0]['provided-uuid']).toBe(p.uuid);
  expect(mine.satisfied[0]['responsibility-uuid']).toBe(r.uuid);
  expect(propValues(mine.satisfied[0], 'Rule_Id')).toEqual(['zod-schema-on-every-route']);
  expect(propValues(mine.satisfied[0], 'evidence-kind')).toEqual(['self-declared']);
  expect(mine.satisfied[0].description).toMatch(/^To do \(self-declared\)\./);
  expect(mine['implementation-status'].state).toBe('planned');
  expect(r.description).toMatch(/Define a Zod schema/);
});

test('ssp: an item the tool leaves to the builder has a responsibility and no provided', async () => {
  const { ssp: doc } = await build();
  const tool = toolBy(doc, 'as-1', 'appCentral');
  expect(tool.export.provided).toBeUndefined();
  expect(tool.export.responsibilities).toHaveLength(1);
  expect(tool.export.responsibilities[0]['provided-uuid']).toBeUndefined();
  const mine = thisBy(doc, 'as-1');
  expect(mine.inherited).toBeUndefined();
  expect(mine.satisfied[0]['responsibility-uuid']).toBe(tool.export.responsibilities[0].uuid);
});

test('ssp: SHIP-HATS decides sc-7 and sc-8 alone; appCentral’s provided claim outranks it on sd-4', async () => {
  const { ssp: doc } = await build(['appcentral', 'ship-hats']);
  expect(toolBy(doc, 'sc-7', 'SHIP-HATS (compliance level 4)').export.provided).toHaveLength(1);
  expect(propValues(thisBy(doc, 'sc-7').satisfied[0], 'Rule_Id')).toEqual(['cf-level-4']);
  expect(byOf(doc, 'sd-4').map(b => b['component-uuid'])).toEqual([componentUuid(doc, 'appCentral'), componentUuid(doc, 'This app')]);
});

function twoSharedTools() {
  const profile = makeProfile('low-risk-cloud', [{ id: 'as-1' }]);
  const tools = ['a', 'b'].map(id => makeTool(id, { name: id.toUpperCase() }));
  const versions = tools.map(tool => makeVersion(tool._id, profile._id, 1, [makeEntry('as-1', { value: 'shared', builderPart: tool._id === 'a' ? undefined : 'B part' })], approved()));
  const pairs = versions.map(v => pair(v, v));
  const plan = buildPlan({ profiles: [profile], pickedTools: tools, allTools: tools, versions: pairs });
  const doc = buildSsp({ plan, profiles: [profile], tools: tools.map((tool, i) => ({ tool, pairs: [pairs[i]] })), answers, generatedAt: GENERATED });
  return { doc, plan, profile };
}

test('ssp: two tools on one shared item give two links each', () => {
  const { doc } = twoSharedTools();
  const [mine] = (requirement(doc, 'as-1')['by-components'] as Json[]).filter(b => b['component-uuid'] === (ssp(doc)['system-implementation'].components as Json[]).find(c => c.type === 'this-system')!.uuid);
  expect(mine.inherited).toHaveLength(2);
  expect(mine.satisfied).toHaveLength(2);
  expect(new Set(mine.inherited.map((i: Json) => i['provided-uuid'])).size).toBe(2);
  expect(new Set(mine.satisfied.map((i: Json) => i['responsibility-uuid'])).size).toBe(2);
  expect(oscalValidator('ssp')(doc).errors).toEqual([]);
});

test('ssp: a responsibility never has an empty description', () => {
  const { doc } = twoSharedTools();
  const responsibilities = (requirement(doc, 'as-1')['by-components'] as Json[]).flatMap(b => (b.export?.responsibilities ?? []) as Json[]);
  expect(responsibilities.map(r => r.description)).toEqual(['Title as-1', 'B part']);
});

function everyBy(doc: Json): Json[] {
  return sspRequirements(doc).flatMap(r => (r['by-components'] ?? []) as Json[]);
}

const SETS: [string[], string[]][] = [
  [['appcentral', 'dbaas', 'iga'], ['low-risk-cloud']],
  [['appcentral', 'zod', 'prisma', 'ship-hats'], ['low-risk-cloud']],
  [['appcentral', 'gencentral'], ['low-risk-cloud', 'generative-ai']],
];

test('ssp: every link resolves inside the file, and every role and party reference too', async () => {
  for (const [toolIds, profileIds] of SETS) {
    const { ssp: doc } = await build(toolIds, profileIds);
    expect(oscalValidator('ssp')(doc).errors).toEqual([]);
    const bys = everyBy(doc);
    const provided = new Set(bys.flatMap(b => (b.export?.provided ?? []).map((x: Json) => x.uuid)));
    const responsibilities = new Set(bys.flatMap(b => (b.export?.responsibilities ?? []).map((x: Json) => x.uuid)));
    const links = { p: 0, r: 0 };
    for (const b of bys) {
      for (const x of [...(b.inherited ?? []), ...(b.export?.responsibilities ?? [])]) {
        if (x['provided-uuid']) { links.p++; expect(provided.has(x['provided-uuid'])).toBe(true); }
      }
      for (const x of b.satisfied ?? []) { links.r++; expect(responsibilities.has(x['responsibility-uuid'])).toBe(true); }
    }
    expect(links.p).toBeGreaterThan(0);
    const roles = new Set((ssp(doc).metadata.roles as Json[]).map(r => r.id));
    const parties = new Set((ssp(doc).metadata.parties as Json[]).map(p => p.uuid));
    for (const b of bys) {
      for (const x of [...(b.inherited ?? []), ...(b.satisfied ?? []), ...(b.export?.provided ?? []), ...(b.export?.responsibilities ?? [])]) {
        for (const role of (x['responsible-roles'] ?? []) as Json[]) {
          expect(roles.has(role['role-id'])).toBe(true);
          for (const party of role['party-uuids'] ?? []) expect(parties.has(party)).toBe(true);
        }
      }
    }
  }
});

test('ssp: every Rule_Id in the SSP is a rule in that tool’s component definition', async () => {
  const { ssp: doc, component } = await build(['appcentral', 'zod', 'prisma', 'ship-hats']);
  const components = ssp(doc)['system-implementation'].components as Json[];
  let seen = 0;
  for (const b of everyBy(doc)) {
    const title = components.find(c => c.uuid === b['component-uuid'])!.title;
    if (title === 'This app') continue;
    const defined = new Set(propValues(cdComponents(component).find(c => c.title === title)!, 'Rule_Id'));
    for (const x of [...(b.export?.provided ?? []), ...(b.export?.responsibilities ?? [])]) {
      for (const id of propValues(x, 'Rule_Id')) { seen++; expect(defined.has(id)).toBe(true); }
    }
  }
  expect(seen).toBeGreaterThan(0);
});
