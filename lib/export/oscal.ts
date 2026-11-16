import { v5 as uuidv5 } from 'uuid';
import type { CoverageCheck, CoverageEntry, CoverageValue, Profile, TaskState, Tool } from '../domain/types';
import type { Plan, PlanItem } from '../plan/engine';
import { LOCALLY_DERIVED, STATUS_LABEL } from '../plan/labels';
import { rowVerification, type VersionPair } from '../plan/verification';
import { OPTION_LABELS, type RiskAnswers } from '../risk/assess';
import { sspValues } from './ssp-values';

export const OSCAL_NS = 'urn:cpfb-build-plan';
export const OSCAL_UUID_NAMESPACE = '6b0c1f1e-3c5a-4d1e-9a51-2f4f9c8e7d10';
const OSCAL_VERSION = '1.1.2';

/**
 * The namespace of the oscal-compass props (`Rule_Id`, `Rule_Description`, `Check_Id`, `Check_Description`). The sample
 * component definition in oscal-compass/compliance-to-policy (plugins_public/tests/data/kyverno/component-definition.json)
 * uses `${COMPASS_NS}/ibmcloud`. We use the generic form, because C2P matches these props by name, not by namespace.
 */
export const COMPASS_NS = 'http://oscal-compass.github.io/compliance-trestle/schemas/oscal/cd';

type Json = Record<string, unknown>;
/** A tool and its coverage pairs: one for each profile the tool covers. A tool with no pair says nothing about any profile. */
export type ToolWithVersions = { tool: Tool; pairs: VersionPair[] };

/** "provider" runs a tool and says what it covers. "customer" builds the app on the tools. */
export const ROLES: Json[] = [
  { id: 'provider', title: 'Tool provider' },
  { id: 'customer', title: 'App builder' },
];

export const uuid = (name: string) => uuidv5(name, OSCAL_UUID_NAMESPACE);
export const prop = (name: string, value: string, remarks?: string): Json => ({ name, ns: OSCAL_NS, value, ...(remarks && { remarks }) });
export const compassProp = (name: string, value: string, remarks?: string): Json => ({ name, ns: COMPASS_NS, value, ...(remarks && { remarks }) });
export const metadata = (title: string, generatedAt: string): Json => ({
  title,
  'last-modified': generatedAt,
  version: generatedAt.slice(0, 10),
  'oscal-version': OSCAL_VERSION,
});

/** The profile, described as a back-matter resource so documents never claim to link to GovTech's own file. */
export function profileResource(profile: Profile): Json {
  return {
    uuid: uuid(`profile|${profile._id}|${profile.version}`),
    title: `${profile.title} (locally derived)`,
    description:
      `Locally derived ${profile.title} profile, version ${profile.version}. ${LOCALLY_DERIVED}`,
  };
}

/** One resource for all the profiles in use. With one profile it is exactly that profile's resource. */
export function profilesResource(profiles: Profile[]): Json {
  if (profiles.length === 1) return profileResource(profiles[0]);
  const titles = profiles.map(p => p.title).join(' + ');
  return {
    uuid: uuid(`profiles|${profiles.map(p => `${p._id}@${p.version}`).join(',')}`),
    title: `${titles} (locally derived)`,
    description: `${LOCALLY_DERIVED} Combined profile: ${profiles.map(p => `${p.title}, version ${p.version}`).join('; ')}.`,
  };
}

/** The oscal-compass rule sets for some checks: four props that share a `rule_set_n` remark, plus our check kind. */
export function ruleSetProps(checks: CoverageCheck[], start: number): Json[] {
  return checks.flatMap((check, i) => {
    const set = `rule_set_${start + i}`;
    return [
      compassProp('Rule_Id', check.id, set),
      compassProp('Rule_Description', check.description, set),
      compassProp('Check_Id', check.id, set),
      compassProp('Check_Description', check.description, set),
      prop('check-kind', check.kind, set),
    ];
  });
}

const ruleIdProps = (checks: CoverageCheck[] | undefined): Json[] => (checks ?? []).map(c => compassProp('Rule_Id', c.id));

function rolesFor(value: CoverageValue): Json[] {
  const provider = { 'role-id': 'provider' };
  const customer = { 'role-id': 'customer' };
  switch (value) {
    case 'provided':
      return [provider];
    case 'app-builder':
      return [customer];
    case 'shared':
      return [provider, customer];
    default:
      return [];
  }
}

function requirementDescription(entry: CoverageEntry, toolName: string): string {
  switch (entry.value) {
    case 'provided':
      return entry.explanation ?? `Provided by ${toolName}`;
    case 'shared':
      return entry.explanation ?? `Shared between ${toolName} and the App Builder`;
    case 'app-builder':
      return entry.builderPart ?? entry.explanation ?? 'The App Builder handles this.';
    case 'not-applicable':
      return entry.explanation ?? 'Not applicable';
  }
}

export function buildComponentDefinition(input: { tools: ToolWithVersions[]; profiles: Profile[]; generatedAt: string }): Json {
  const { profiles, generatedAt } = input;
  const order = new Map(profiles.map((p, i) => [p._id, i]));
  const byId = new Map(profiles.map(p => [p._id, p]));
  const covered = input.tools
    .map(({ tool, pairs }) => ({
      tool,
      pairs: pairs.filter(p => order.has(p.current.profileId)).sort((a, b) => order.get(a.current.profileId)! - order.get(b.current.profileId)!),
    }))
    .filter(t => t.pairs.length > 0);
  const title = covered.length ? `Component definition: ${covered.map(t => t.tool.name).join(', ')}` : 'Component definition';

  const used = new Set<string>();
  const components = covered.map(({ tool, pairs }) => {
    const first = pairs[0].current;
    const ruleSets = new Map<string, CoverageCheck>();
    for (const pair of pairs) for (const entry of pair.current.entries) for (const c of entry.checks ?? []) if (!ruleSets.has(c.id)) ruleSets.set(c.id, c);
    const props = [
      prop('profile-version', first.writtenAgainst),
      prop('coverage-version', String(first.version)),
      prop('coverage-source', first.source),
      ...ruleSetProps([...ruleSets.values()], 0),
    ];
    return {
      uuid: uuid(`component|${tool._id}`),
      type: tool.oscalType,
      title: tool.name,
      description: tool.description || tool.name,
      props,
      'control-implementations': pairs.map(pair => {
        const version = pair.current;
        const profile = byId.get(version.profileId)!;
        used.add(profile._id);
        return {
          uuid: uuid(`implementation|${tool._id}|${profile._id}|v${version.version}`),
          source: `#${profileResource(profile).uuid}`,
          description: `What ${tool.name} covers in ${profile.title}, version ${version.version} of its coverage.`,
          'implemented-requirements': version.entries.map(entry => {
            const reqProps = [
              prop('responsibility', entry.value),
              prop('verification', rowVerification(entry.key, pair)),
              prop('source', entry.source ?? version.source),
              ...ruleIdProps(entry.checks),
            ];
            const requirement: Json = {
              uuid: uuid(`requirement|${tool._id}|v${version.version}|${entry.key}`),
              'control-id': entry.key.split(':')[1],
              description: requirementDescription(entry, tool.name),
              props: reqProps,
            };
            const roles = rolesFor(entry.value);
            if (roles.length) requirement['responsible-roles'] = roles;
            if (entry.builderPart) requirement.remarks = entry.builderPart;
            return requirement;
          }),
        };
      }),
    };
  });

  const resourceProfiles = profiles.filter(p => used.has(p._id));
  const versions = covered.flatMap(t => t.pairs.map(pair => `${t.tool._id}@${pair.current.profileId}:${pair.current.version}`));
  return {
    'component-definition': {
      uuid: uuid(`component-definition|${profiles.map(p => p._id).join(',')}|${versions.join(',')}`),
      metadata: { ...metadata(title, generatedAt), roles: ROLES },
      components,
      'back-matter': { resources: (resourceProfiles.length ? resourceProfiles : profiles).map(profileResource) },
    },
  };
}

const STATE_BY_STATUS: Record<TaskState['status'], string> = { todo: 'planned', done: 'implemented' };

function taskStatus(item: PlanItem): TaskState {
  return item.status && 'status' in item.status ? item.status : { status: 'todo' };
}

export function buildSsp(input: {
  plan: Plan;
  profiles: Profile[];
  tools: ToolWithVersions[];
  answers: RiskAnswers;
  project?: { id: string; name: string };
  generatedAt: string;
}): Json {
  const { plan, profiles, tools, answers, project, generatedAt } = input;
  const scope = `${project?.id ?? 'unsaved'}|${tools.map(t => t.tool._id).join(',')}`;
  const resource = profilesResource(profiles);
  const profileIds = new Set(profiles.map(p => p._id));
  const profileTitles = profiles.map(p => p.title).join(' + ');
  const name = project?.name ?? 'This app';
  const thisSystem = uuid(`ssp-this-system|${scope}`);
  const toolParty = new Map(tools.map(t => [t.tool._id, uuid(`party|${scope}|${t.tool._id}`)]));
  const builderParty = uuid(`party|${scope}|builder`);
  // A tool version that was approved is an authorization the app leverages. Only the current version counts: an older approved one does not.
  const profileById = new Map(profiles.map(p => [p._id, p]));
  const leveraged = tools.flatMap(({ tool, pairs }) =>
    pairs.flatMap(pair => {
      const { approval, profileId, version } = pair.current;
      const profile = profileById.get(profileId);
      if (!approval || !profile) return [];
      return [
        {
          toolId: tool._id,
          entry: {
            uuid: uuid(`leveraged|${scope}|${tool._id}|${profileId}|v${version}`),
            title: `${tool.name} coverage for ${profile.title}, version ${version}`,
            'party-uuid': toolParty.get(tool._id),
            'date-authorized': approval.at.slice(0, 10),
          },
        },
      ];
    }),
  );
  const toolComponent = new Map(tools.map(t => [t.tool._id, uuid(`ssp-component|${scope}|${t.tool._id}`)]));

  const byComponent = (key: string, componentUuid: string, state: string, description: string, extra: Json = {}): Json => ({
    'component-uuid': componentUuid,
    uuid: uuid(`by|${scope}|${key}|${componentUuid}`),
    description,
    'implementation-status': { state },
    ...extra,
  });
  const claimText = (c: PlanItem['claims'][number], lead: string) =>
    `${lead}${c.explanation ? `: ${c.explanation}` : ''} (source: ${c.source}; ${c.verification.replace(/-/g, ' ')})`;
  const providerRole = (toolId: string): Json[] => [{ 'role-id': 'provider', 'party-uuids': [toolParty.get(toolId)] }];
  const customerRole: Json[] = [{ 'role-id': 'customer', 'party-uuids': [builderParty] }];

  const requirements = plan.items
    .filter(item => profileIds.has(item.profileId))
    .map(item => {
      const requirement: Json = { uuid: uuid(`ssp-requirement|${scope}|${item.key}`), 'control-id': item.id };
      const by: Json[] = [];
      const claims = item.decisive.filter(c => toolComponent.has(c.toolId));
      const state = taskStatus(item);
      const evidence = state.evidence ?? 'self-declared';

      const forTools = (stateName: string, lead: (toolName: string) => string) => {
        for (const c of claims) by.push(byComponent(item.key, toolComponent.get(c.toolId)!, stateName, claimText(c, lead(c.toolName))));
      };
      const ref = (kind: string, c: PlanItem['claims'][number]) => uuid(`${kind}|${scope}|${c.toolId}|${item.key}`);
      const sourceProps = (c: PlanItem['claims'][number]) => [prop('verification', c.verification), prop('source', c.source)];
      const provided = (c: PlanItem['claims'][number], lead: string, rules: boolean): Json => ({
        uuid: ref('provided', c),
        description: claimText(c, lead),
        props: [...sourceProps(c), ...(rules ? ruleIdProps(c.checks) : [])],
        'responsible-roles': providerRole(c.toolId),
      });
      const responsibility = (c: PlanItem['claims'][number], linked: boolean): Json => ({
        uuid: ref('responsibility', c),
        ...(linked && { 'provided-uuid': ref('provided', c) }),
        description: c.builderPart?.trim() || item.plain?.task || item.title,
        props: [...sourceProps(c), ...ruleIdProps(c.checks)],
        'responsible-roles': customerRole,
      });
      const inherited = (c: PlanItem['claims'][number]): Json => ({
        uuid: ref('inherited', c),
        'provided-uuid': ref('provided', c),
        description: `Inherited from ${c.toolName}`,
        'responsible-roles': providerRole(c.toolId),
      });
      const satisfied = (c: PlanItem['claims'][number]): Json => ({
        uuid: ref('satisfied', c),
        'responsibility-uuid': ref('responsibility', c),
        description: `${STATUS_LABEL[state.status]} (${evidence}).${state.note?.trim() ? ` ${state.note.trim().replace(/([^.!?])$/, '$1.')}` : ''}`,
        props: [...ruleIdProps(c.checks), prop('evidence-kind', evidence)],
        'responsible-roles': customerRole,
      });
      const own = (stateName: string, extra: Json = {}) =>
        by.push(byComponent(item.key, thisSystem, stateName, sspValues(item).explanation, extra));

      // The SSP is the plan an agent works from, so a control that is the builder's carries what to do and why.
      if (['shared', 'app-builder', 'default-builder', 'answered-applies'].includes(item.placement)) {
        const flat = (text: string) => text.replace(/\s+/g, ' ').trim();
        const task = item.decisive.map(c => c.builderPart).find(Boolean) ?? item.plain?.task ?? item.recommendations;
        const why = item.plain?.why ?? item.rationale;
        requirement.remarks = [`${flat(item.plain?.title ?? item.title)}.`, task && `What to do: ${flat(task)}`, why && `Why it matters: ${flat(why)}`].filter(Boolean).join(' ');
      }

      switch (item.placement) {
        case 'provided':
          for (const c of claims) {
            const text = `Provided by ${c.toolName}`;
            by.push(byComponent(item.key, toolComponent.get(c.toolId)!, 'implemented', claimText(c, text), { export: { provided: [provided(c, text, true)] } }));
          }
          own('implemented', claims.length ? { inherited: claims.map(inherited) } : {});
          break;
        case 'not-applicable':
          forTools('not-applicable', t => `Not applicable when using ${t}`);
          break;
        case 'shared':
          for (const c of claims) {
            const text = `${c.toolName} handles its part`;
            by.push(
              byComponent(item.key, toolComponent.get(c.toolId)!, 'implemented', claimText(c, text), {
                export: { provided: [provided(c, text, false)], responsibilities: [responsibility(c, true)] },
              }),
            );
          }
          own(STATE_BY_STATUS[state.status], claims.length ? { inherited: claims.map(inherited), satisfied: claims.map(satisfied) } : {});
          break;
        case 'app-builder':
          for (const c of claims) {
            by.push(
              byComponent(item.key, toolComponent.get(c.toolId)!, 'implemented', claimText(c, `${c.toolName} leaves this to the app builder`), {
                export: { responsibilities: [responsibility(c, false)] },
              }),
            );
          }
          own(STATE_BY_STATUS[state.status], claims.length ? { satisfied: claims.map(satisfied) } : {});
          break;
        case 'default-builder':
        case 'answered-applies':
          own(STATE_BY_STATUS[state.status], { props: [prop('evidence-kind', evidence)] });
          break;
        case 'answered-not-applicable':
        case 'not-for-app':
          own('not-applicable');
          break;
        case 'open':
          requirement.remarks = `Needs assessment: ${item.reason}`;
          break;
      }
      if (by.length) requirement['by-components'] = by;
      return requirement;
    });

  const toolNames = tools.map(t => t.tool.name);
  return {
    'system-security-plan': {
      uuid: uuid(`ssp|${scope}`),
      metadata: {
        ...metadata(`Security plan for ${name}`, generatedAt),
        roles: ROLES,
        parties: [
          ...tools.map(t => ({ uuid: toolParty.get(t.tool._id), type: 'organization', name: t.tool.name })),
          { uuid: builderParty, type: 'organization', name: 'App builder' },
        ],
      },
      'import-profile': { href: `#${resource.uuid}` },
      'system-characteristics': {
        'system-ids': [{ id: project?.id ?? 'unsaved-plan' }],
        'system-name': name,
        description: `${answersDescription(answers)} Built on: ${toolNames.length ? toolNames.join(', ') : 'no CPF tools'}.`,
        'system-information': {
          'information-types': [
            { uuid: uuid(`ssp-information|${scope}`), title: 'Data handled by the app', description: answersDescription(answers) },
          ],
        },
        status: { state: 'under-development' },
        'authorization-boundary': {
          description: `The app, built on ${toolNames.length ? toolNames.join(', ') : 'no CPF tools'}. The components listed in this document are the boundary.`,
        },
      },
      'system-implementation': {
        users: [{ uuid: uuid(`ssp-user|${scope}`), title: 'App builder', description: 'The team that builds and runs the app.' }],
        ...(leveraged.length && { 'leveraged-authorizations': leveraged.map(l => l.entry) }),
        components: [
          { uuid: thisSystem, type: 'this-system', title: name, description: 'The app being built.', status: { state: 'under-development' } },
          ...tools.map(t => ({
            uuid: toolComponent.get(t.tool._id),
            type: t.tool.oscalType,
            title: t.tool.name,
            description: t.tool.description || t.tool.name,
            status: { state: 'operational' },
            ...(t.pairs.length && {
              props: [
                prop('coverage-version', String(t.pairs[0].current.version)),
                ...leveraged.filter(l => l.toolId === t.tool._id).map(l => ({ name: 'leveraged-authorization-uuid', value: l.entry.uuid })),
              ],
            }),
          })),
        ],
      },
      'control-implementation': {
        description: `How ${name} meets the ${profileTitles} controls, from the tools it uses and the builder's own work. Builder statuses are self-declared.`,
        'implemented-requirements': requirements,
      },
      'back-matter': { resources: [resource] },
    },
  };
}

function answersDescription(a: RiskAnswers): string {
  return (
    `Highest data classification: ${OPTION_LABELS.classification[a.classification]}. Sensitivity: ${OPTION_LABELS.sensitivity[a.sensitivity]}. ` +
    `Worst impact: ${OPTION_LABELS.impact[a.impact]}. Impact on dependent systems: ${OPTION_LABELS.downstream[a.downstream]}.`
  );
}

