import { v5 as uuidv5 } from 'uuid';
import type { CoverageEntry, Profile, TaskStatus, Tool } from '../domain/types';
import type { Plan, PlanItem } from '../plan/engine';
import { LOCALLY_DERIVED } from '../plan/labels';
import { rowVerification, type VersionPair } from '../plan/verification';
import { OPTION_LABELS, type RiskAnswers } from '../risk/assess';
import { sspValues } from './ssp-values';

export const OSCAL_NS = 'urn:cpfb-build-plan';
export const OSCAL_UUID_NAMESPACE = '6b0c1f1e-3c5a-4d1e-9a51-2f4f9c8e7d10';
const OSCAL_VERSION = '1.1.2';

type Json = Record<string, unknown>;
type ToolWithVersions = { tool: Tool; pair: VersionPair };

export const uuid = (name: string) => uuidv5(name, OSCAL_UUID_NAMESPACE);
export const prop = (name: string, value: string): Json => ({ name, ns: OSCAL_NS, value });
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
    case 'other-tool':
      return entry.explanation ?? `Handled by another tool (${entry.otherToolId})`;
  }
}

export function buildComponentDefinition(input: { tools: ToolWithVersions[]; profile: Profile; generatedAt: string }): Json {
  const { tools, profile, generatedAt } = input;
  const resource = profileResource(profile);
  const title = tools.length ? `Component definition: ${tools.map(t => t.tool.name).join(', ')}` : 'Component definition';

  const components = tools.map(({ tool, pair }) => {
    const version = pair.current;
    return {
      uuid: uuid(`component|${tool._id}`),
      type: tool.oscalType,
      title: tool.name,
      description: tool.description || tool.name,
      props: [prop('profile-version', version.writtenAgainst), prop('coverage-version', String(version.version)), prop('coverage-source', version.source)],
      'control-implementations': [
        {
          uuid: uuid(`implementation|${tool._id}|${profile._id}|v${version.version}`),
          source: `#${resource.uuid}`,
          description: `What ${tool.name} covers in ${profile.title}, version ${version.version} of its coverage.`,
          'implemented-requirements': version.entries.map(entry => {
            const props = [
              prop('responsibility', entry.value),
              prop('verification', rowVerification(entry.key, pair)),
              prop('source', entry.source ?? version.source),
            ];
            if (entry.otherToolId) props.push(prop('handled-by', entry.otherToolId));
            const requirement: Json = {
              uuid: uuid(`requirement|${tool._id}|v${version.version}|${entry.key}`),
              'control-id': entry.key.split(':')[1],
              description: requirementDescription(entry, tool.name),
              props,
            };
            if (entry.builderPart) requirement.remarks = entry.builderPart;
            return requirement;
          }),
        },
      ],
    };
  });

  return {
    'component-definition': {
      uuid: uuid(`component-definition|${profile._id}|${tools.map(t => `${t.tool._id}@${t.pair.current.version}`).join(',')}`),
      metadata: metadata(title, generatedAt),
      components,
      'back-matter': { resources: [resource] },
    },
  };
}

const STATE_BY_STATUS: Record<TaskStatus, string> = { todo: 'planned', 'in-progress': 'partial', done: 'implemented' };

function taskStatus(item: PlanItem): { status: TaskStatus; note?: string } {
  return item.status && 'status' in item.status ? item.status : { status: 'todo' };
}

export function buildSsp(input: {
  plan: Plan;
  profile: Profile;
  tools: ToolWithVersions[];
  answers: RiskAnswers;
  project?: { id: string; name: string };
  generatedAt: string;
}): Json {
  const { plan, profile, tools, answers, project, generatedAt } = input;
  const scope = `${project?.id ?? 'unsaved'}|${tools.map(t => t.tool._id).join(',')}`;
  const resource = profileResource(profile);
  const name = project?.name ?? 'This app';
  const thisSystem = uuid(`ssp-this-system|${scope}`);
  const toolComponent = new Map(tools.map(t => [t.tool._id, uuid(`ssp-component|${scope}|${t.tool._id}`)]));

  const byComponent = (key: string, componentUuid: string, state: string, description: string): Json => ({
    'component-uuid': componentUuid,
    uuid: uuid(`by|${scope}|${key}|${componentUuid}`),
    description,
    'implementation-status': { state },
  });
  const claimText = (c: PlanItem['claims'][number], lead: string) =>
    `${lead}${c.explanation ? `: ${c.explanation}` : ''} (source: ${c.source}; ${c.verification.replace(/-/g, ' ')})`;

  const requirements = plan.items
    .filter(item => item.profileId === profile._id)
    .map(item => {
      const requirement: Json = { uuid: uuid(`ssp-requirement|${scope}|${item.key}`), 'control-id': item.id };
      const by: Json[] = [];
      const forTools = (state: string, lead: (toolName: string) => string) => {
        for (const c of item.decisive) {
          const component = toolComponent.get(c.toolId);
          if (component) by.push(byComponent(item.key, component, state, claimText(c, lead(c.toolName))));
        }
      };
      const own = (state: string) => by.push(byComponent(item.key, thisSystem, state, sspValues(item).explanation));

      switch (item.placement) {
        case 'provided':
          forTools('implemented', t => `Provided by ${t}`);
          break;
        case 'not-applicable':
          forTools('not-applicable', t => `Not applicable when using ${t}`);
          break;
        case 'shared':
          forTools('implemented', t => `${t} handles its part`);
          own(STATE_BY_STATUS[taskStatus(item).status]);
          break;
        case 'app-builder':
        case 'default-builder':
        case 'answered-applies':
          own(STATE_BY_STATUS[taskStatus(item).status]);
          break;
        case 'answered-not-applicable':
        case 'not-for-app':
          own('not-applicable');
          break;
        case 'open':
        case 'redirect':
        case 'conflict':
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
      metadata: metadata(`Security plan for ${name}`, generatedAt),
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
        components: [
          { uuid: thisSystem, type: 'this-system', title: name, description: 'The app being built.', status: { state: 'under-development' } },
          ...tools.map(t => ({
            uuid: toolComponent.get(t.tool._id),
            type: t.tool.oscalType,
            title: t.tool.name,
            description: t.tool.description || t.tool.name,
            status: { state: 'operational' },
            props: [prop('coverage-version', String(t.pair.current.version))],
          })),
        ],
      },
      'control-implementation': {
        description: `How ${name} meets the ${profile.title} requirements, from the tools it uses and the builder's own work. Builder statuses are self-declared.`,
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

