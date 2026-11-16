import type { CoverageValue, Profile, Tool } from '../domain/types';
import { familyName } from '../plan/hotel';
import { metadata, profileResource, prop, uuid } from './oscal';

/** The four answers a tool can give for a requirement, in the order the brief explains them. */
export const ANSWERS: { value: CoverageValue; meaning: string }[] = [
  { value: 'provided', meaning: 'The tool does all of it. The app team does nothing for this control.' },
  { value: 'shared', meaning: "The tool does part of it. Put the app team's part in the `builder-part` prop." },
  { value: 'app-builder', meaning: 'The tool does none of it. The app team does all of it.' },
  { value: 'not-applicable', meaning: 'It cannot apply to an app built on this tool. Say why in the description.' },
];

/** The empty component definition the agent fills in: one row per requirement, in profile order. */
export function coverageTemplate(input: { tool: Tool; profile: Profile; generatedAt: string }): Record<string, unknown> {
  const { tool, profile, generatedAt } = input;
  const resource = profileResource(profile);
  return {
    'component-definition': {
      uuid: uuid(`coverage-template|${tool._id}|${profile._id}`),
      metadata: metadata(`What ${tool.name} covers in ${profile.title}`, generatedAt),
      components: [
        {
          uuid: uuid(`component|${tool._id}`),
          type: tool.oscalType,
          title: tool.name,
          description: tool.description || tool.name,
          'control-implementations': [
            {
              uuid: uuid(`implementation|${tool._id}|${profile._id}|agent`),
              source: `#${resource.uuid}`,
              description: `What ${tool.name} covers in ${profile.title}.`,
              'implemented-requirements': profile.entries.map(entry => ({
                uuid: uuid(`requirement|${tool._id}|agent|${entry.key}`),
                'control-id': entry.id,
                description: '',
                props: [prop('responsibility', ''), prop('evidence', '')],
              })),
            },
          ],
        },
      ],
      'back-matter': { resources: [resource] },
    },
  };
}

const cell = (text: string) => text.replace(/\s+/g, ' ').replace(/\|/g, '\\|').trim();

export function renderCoverageBrief(input: { tool: Tool; profile: Profile; generatedAt: string }): string {
  const { tool, profile, generatedAt } = input;
  const file = `${tool._id}-coverage.oscal.json`;
  const lines = [
    `# What ${tool.name} covers in ${profile.title}`,
    '',
    `Profile version ${profile.version}. Brief made on ${generatedAt.slice(0, 10)}.`,
    '',
    `This brief is for a coding agent that can read ${tool.name}'s code and docs. The agent fills in, for every control below, who handles it: ${tool.name}, the team that builds an app on it, or both. A tool owner then uploads the result to the build plan app, checks it, and submits it for approval.`,
    '',
    '## What to do',
    '',
    '1. Read this repository and its docs.',
    '2. For every control in the table, choose one answer from "The four answers". Write one or two plain sentences in `description` that say what the tool does, or why the answer fits.',
    '3. Give the evidence in the `evidence` prop: a file path in this repository, or a doc URL.',
    '4. Fill every row. If you cannot tell, choose the closest answer and say why in the description. Do not leave a row out.',
    `5. Write the filled-in template to \`${file}\` and give that file to the tool owner.`,
    '',
    '## The four answers',
    '',
    'Put one of these values in the `responsibility` prop. They are written from the tool\'s point of view.',
    '',
    ...ANSWERS.map(a => `- \`${a.value}\`: ${a.meaning}`),
    '',
    'Add `builder-part` as an extra prop on a row when that row needs it, in the same form as `responsibility`:',
    '',
    '```',
    '{ "name": "builder-part", "ns": "urn:cpfb-build-plan", "value": "Turn on the lockout setting for your app." }',
    '```',
    '',
    '## Controls',
    '',
    '| ID | Room | Control | What to do | Why it matters |',
    '|---|---|---|---|---|',
    ...profile.entries.map(
      e => `| ${e.id} | ${cell(familyName(e.family))} | ${cell(e.title)} | ${cell(e.plain?.task || e.statement)} | ${cell(e.plain?.why || e.rationale)} |`,
    ),
    '',
    '## Template',
    '',
    `Fill this in and save it as \`${file}\`. Keep every row and every uuid as they are.`,
    '',
    '```json',
    JSON.stringify(coverageTemplate({ tool, profile, generatedAt }), null, 2),
    '```',
    '',
    '## Check before you hand it over',
    '',
    '- Every row has a `responsibility` value from the four answers.',
    '- Every `shared` row has a `builder-part` prop.',
    '- Every row has `evidence`.',
    '- The file is valid JSON.',
    '',
  ];
  return lines.join('\n');
}
