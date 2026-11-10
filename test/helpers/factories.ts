import type { Approval, CoverageEntry, Profile, ProfileEntry, RequirementKey, Tool, ToolVersion } from '@/lib/domain/types';
import type { VersionPair } from '@/lib/plan/verification';

export const key = (id: string, catalog = 'im8-reform'): RequirementKey => `${catalog}:${id}`;

export function makeEntry(id: string, opts: Partial<CoverageEntry> = {}): CoverageEntry {
  return { key: key(id), value: 'provided', ...opts };
}

export function makeProfile(
  id: string,
  entries: (Partial<ProfileEntry> & { id: string })[],
  catalog = 'im8-reform',
): Profile {
  return {
    _id: id,
    title: id,
    plainTitle: id,
    version: 'test',
    release: 'test',
    sourceFile: 'test',
    entries: entries.map(e => ({
      key: key(e.id, catalog),
      family: e.id.split('-')[0],
      title: `Title ${e.id}`,
      level: 1,
      statement: `Statement ${e.id}`,
      recommendations: '',
      rationale: `Rationale ${e.id}`,
      references: '',
      ifUncovered: 'ask',
      wording: `wording ${e.id}`,
      ...e,
    })),
  };
}

export function makeTool(id: string, opts: Partial<Tool> = {}): Tool {
  return { _id: id, name: id, description: '', section: 'cpf', oscalType: 'service', isSample: false, partOfAppWhen: 'x.', ...opts };
}

export function makeVersion(
  toolId: string,
  profileId: string,
  version: number,
  entries: CoverageEntry[],
  approval?: Approval,
): ToolVersion {
  const v: ToolVersion = {
    _id: `${toolId}:${profileId}:v${version}`,
    toolId,
    profileId,
    version,
    writtenAgainst: 'test',
    source: `source of ${toolId} v${version}`,
    createdAt: '2026-10-27T00:00:00.000Z',
    createdByRole: 'admin',
    entries,
  };
  if (approval) v.approval = approval;
  return v;
}

export const approved = (kind: Approval['kind'] = 'verifier'): Approval => ({ at: '2026-10-27T00:00:00.000Z', by: 'test', kind });

export function pair(current: ToolVersion, lastApproved?: ToolVersion): VersionPair {
  return lastApproved ? { current, lastApproved } : { current };
}

import type { Claim, PlanItem } from '@/lib/plan/engine';

export function makeClaim(over: Partial<Claim> = {}): Claim {
  return {
    toolId: 'appcentral',
    toolName: 'appCentral',
    value: 'provided',
    source: 'AEO TPC slide 12 (28 Oct 2026)',
    verification: 'verified',
    ...over,
  };
}

/** A plan item built by hand, for testing exports without running the engine. */
export function makeItem(over: Partial<PlanItem> = {}): PlanItem {
  return {
    key: key('as-1'),
    profileId: 'low-risk-cloud',
    id: 'as-1',
    family: 'as',
    title: 'Input Validation',
    rationale: 'Because.',
    recommendations: 'Do this.',
    level: 1,
    heading: 'platform',
    placement: 'provided',
    claims: [],
    decisive: [],
    reason: '',
    ...over,
  };
}
