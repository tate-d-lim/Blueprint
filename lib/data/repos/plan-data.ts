import type { Db } from 'mongodb';
import type { CatalogRelease, Profile, Tool, ToolVersion } from '../../domain/types';
import type { PlanData } from '../../plan/engine';
import { pairVersions } from '../../plan/select';

export async function loadPlanData(db: Db): Promise<PlanData> {
  const [profiles, tools, toolVersions, releases] = await Promise.all([
    db.collection('profiles').find().toArray(),
    db.collection('tools').find().toArray(),
    db.collection('toolVersions').find().toArray(),
    db.collection('catalogReleases').find().sort({ appliedAt: -1 }).toArray(),
  ]);
  return {
    profiles: profiles as unknown as Profile[],
    tools: tools as unknown as Tool[],
    versions: pairVersions(toolVersions as unknown as ToolVersion[]),
    releases: releases as unknown as CatalogRelease[],
  };
}
