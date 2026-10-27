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
      ...e,
    })),
  };
}

export function makeTool(id: string, opts: Partial<Tool> = {}): Tool {
  return { _id: id, name: id, description: '', section: 'cpf', oscalType: 'service', isSample: false, ...opts };
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
