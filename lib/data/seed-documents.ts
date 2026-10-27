import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { RiskAnswers } from '../risk/assess';
import type {
  Approval,
  Catalog,
  CoverageEntry,
  CoverageValue,
  PlainText,
  Profile,
  Project,
  Requirement,
  RequirementKey,
  TaskStatus,
  Tool,
  ToolVersion,
} from '../domain/types';
import { buildImportEntries, previewImport } from '../import/plan-import';
import { parseGuide } from '../import/parse-guide';
import { UnknownRequirementError, loadGenAi, loadIm8Catalog, loadLowRiskCloudProfile } from './load-sources';

export interface SeedDocuments {
  catalogs: Catalog[];
  requirements: Requirement[];
  profiles: Profile[];
  tools: Tool[];
  toolVersions: ToolVersion[];
  projects: Project[];
}

/** Hand-entered coverage, grouped by value so the JSON stays short. */
export interface SeedVersionFile {
  toolId: string;
  profileId: string;
  version: number;
  source: string;
  writtenAgainst: string;
  approval?: { by: string; kind: Approval['kind'] };
  groups: {
    ids: string[];
    value: CoverageValue;
    otherToolId?: string;
    explanation?: string;
    builderPart?: string;
  }[];
}

export function expandSeedVersion(
  file: string,
  seed: SeedVersionFile,
  profile: Profile,
  toolIds: Set<string>,
  now: string,
): ToolVersion {
  if (!toolIds.has(seed.toolId)) throw new Error(`Unknown tool ${seed.toolId} in ${file}`);
  const keyOf = new Map(profile.entries.map(e => [e.id, e.key]));
  const seen = new Set<string>();
  const entries: CoverageEntry[] = [];
  for (const group of seed.groups) {
    if (group.otherToolId !== undefined && !toolIds.has(group.otherToolId)) {
      throw new Error(`Unknown tool ${group.otherToolId} in ${file}`);
    }
    for (const id of group.ids) {
      const key = keyOf.get(id);
      if (!key) throw new UnknownRequirementError(id, file);
      if (seen.has(id)) throw new Error(`Requirement ${id} is listed twice in ${file}`);
      seen.add(id);
      const entry: CoverageEntry = { key, value: group.value };
      if (group.otherToolId !== undefined) entry.otherToolId = group.otherToolId;
      if (group.explanation !== undefined) entry.explanation = group.explanation;
      if (group.builderPart !== undefined) entry.builderPart = group.builderPart;
      entries.push(entry);
    }
  }
  const version: ToolVersion = {
    _id: `${seed.toolId}:${seed.profileId}:v${seed.version}`,
    toolId: seed.toolId,
    profileId: seed.profileId,
    version: seed.version,
    writtenAgainst: seed.writtenAgainst,
    source: seed.source,
    createdAt: now,
    createdByRole: 'seed',
    entries,
  };
  if (seed.approval) version.approval = { at: now, by: seed.approval.by, kind: seed.approval.kind };
  return version;
}

/** A published GovTech Component Guide that becomes a tool, using the suggested mapping. */
export interface SeedGuideFile {
  toolId: string;
  name: string;
  description: string;
  file: string;
  profileId: string;
  source: string;
}

const GOVTECH_APPROVAL_BY = 'GovTech (published Component Guide)';

async function importSeedGuide(
  seed: SeedGuideFile,
  dataDir: string,
  profiles: Profile[],
  now: string,
): Promise<{ tool: Tool; version: ToolVersion }> {
  const profile = profiles.find(p => p._id === seed.profileId);
  if (!profile) throw new Error(`Unknown profile ${seed.profileId} in guides.json`);
  const guide = await parseGuide(await readFile(path.join(dataDir, 'guides', seed.file)), seed.file);
  const preview = previewImport(guide, profile);
  if (preview.unknownIds.length) throw new UnknownRequirementError(preview.unknownIds[0], seed.file);
  const mapping: Record<string, CoverageValue> = {};
  for (const pair of preview.pairs) {
    if (!pair.suggested) throw new Error(`No suggested value for owner "${pair.owner}" in ${seed.file}`);
    mapping[pair.pairKey] = pair.suggested;
  }
  return {
    tool: { _id: seed.toolId, name: seed.name, description: seed.description, section: 'wog', oscalType: 'service', isSample: false },
    version: {
      _id: `${seed.toolId}:${seed.profileId}:v1`,
      toolId: seed.toolId,
      profileId: seed.profileId,
      version: 1,
      writtenAgainst: preview.writtenAgainst,
      source: seed.source,
      createdAt: now,
      createdByRole: 'seed',
      approval: { at: now, by: GOVTECH_APPROVAL_BY, kind: 'govtech-published' },
      importedFrom: { fileName: seed.file, missingKeys: preview.missingKeys },
      entries: buildImportEntries(guide, profile, mapping),
    },
  };
}

/** A saved project as hand-written in seed JSON: requirement IDs instead of keys. */
export interface SeedProjectFile {
  _id: string;
  name: string;
  ownerName: string;
  profileId: string;
  riskAnswers: RiskAnswers;
  toolIds: string[];
  tasks: Record<string, { status: TaskStatus; note?: string }>;
  answers: Record<string, { applies: boolean; reason?: string }>;
}

export function expandSeedProject(
  file: string,
  seed: SeedProjectFile,
  profiles: Profile[],
  toolIds: Set<string>,
  now: string,
): Project {
  const profile = profiles.find(p => p._id === seed.profileId);
  if (!profile) throw new Error(`Unknown profile ${seed.profileId} in ${file}`);
  for (const id of seed.toolIds) if (!toolIds.has(id)) throw new Error(`Unknown tool ${id} in ${file}`);
  const keyOf = (id: string): RequirementKey => {
    const entry = profile.entries.find(e => e.id === id);
    if (!entry) throw new UnknownRequirementError(id, file);
    return entry.key;
  };
  const taskStatus: Project['taskStatus'] = {};
  for (const [id, status] of Object.entries(seed.tasks)) taskStatus[keyOf(id)] = status;
  const questionAnswers: Project['questionAnswers'] = {};
  for (const [id, a] of Object.entries(seed.answers)) questionAnswers[keyOf(id)] = { applies: a.applies, reason: a.reason ?? '' };
  return {
    _id: seed._id,
    name: seed.name,
    ownerName: seed.ownerName,
    riskAnswers: seed.riskAnswers,
    toolIds: seed.toolIds,
    taskStatus,
    questionAnswers,
    createdAt: now,
    updatedAt: now,
  };
}

async function readJson<T>(file: string): Promise<T> {
  return JSON.parse(await readFile(file, 'utf8')) as T;
}

async function readVersionFiles(file: string): Promise<SeedVersionFile[]> {
  const parsed = await readJson<SeedVersionFile | SeedVersionFile[]>(file);
  return Array.isArray(parsed) ? parsed : [parsed];
}

export async function buildSeedDocuments(
  dataDir = 'data',
  now = new Date().toISOString(),
): Promise<SeedDocuments> {
  const im8 = await loadIm8Catalog(dataDir);
  const profile = await loadLowRiskCloudProfile(dataDir, new Map(im8.requirements.map(r => [r._id, r])));
  const genai = await loadGenAi(dataDir);
  const profiles = [profile, genai.profile];

  const defaults = await readJson<Record<string, string[]>>(path.join(dataDir, 'seed', 'defaults.json'));
  for (const p of profiles) {
    for (const id of defaults[p._id] ?? []) {
      const entry = p.entries.find(e => e.id === id);
      if (!entry) throw new UnknownRequirementError(id, 'defaults.json');
      entry.ifUncovered = 'app-builder';
    }
    const plainFile = path.join(dataDir, 'plain-language', `${p._id}.json`);
    if (existsSync(plainFile)) {
      const plain = await readJson<Record<string, PlainText>>(plainFile);
      for (const entry of p.entries) if (plain[entry.id]) entry.plain = plain[entry.id];
    }
  }

  const handWritten = await readJson<Tool[]>(path.join(dataDir, 'seed', 'tools.json'));
  const guides = await Promise.all(
    (await readJson<SeedGuideFile[]>(path.join(dataDir, 'seed', 'guides.json'))).map(g => importSeedGuide(g, dataDir, profiles, now)),
  );
  const tools = [...handWritten, ...guides.map(g => g.tool)];
  const toolIds = new Set(tools.map(t => t._id));
  const versionFiles = [
    ['appcentral-slide12.json', await readVersionFiles(path.join(dataDir, 'seed', 'appcentral-slide12.json'))],
    ['dbaas-iga-slide12.json', await readVersionFiles(path.join(dataDir, 'seed', 'dbaas-iga-slide12.json'))],
    ['libraries.json', await readVersionFiles(path.join(dataDir, 'seed', 'libraries.json'))],
  ] as const;
  const toolVersions = versionFiles.flatMap(([name, seeds]) =>
    seeds.map(seed => {
      const target = profiles.find(p => p._id === seed.profileId);
      if (!target) throw new Error(`Unknown profile ${seed.profileId} in ${name}`);
      return expandSeedVersion(name, seed, target, toolIds, now);
    }),
  );

  toolVersions.push(...guides.map(g => g.version));

  return {
    catalogs: [im8.catalog, genai.catalog],
    requirements: [...im8.requirements, ...genai.requirements],
    profiles,
    tools,
    toolVersions,
    projects: (await readJson<SeedProjectFile[]>(path.join(dataDir, 'seed', 'projects.json'))).map(p =>
      expandSeedProject('projects.json', p, profiles, toolIds, now),
    ),
  };
}
