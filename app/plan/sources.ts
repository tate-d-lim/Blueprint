import type { Profile, Tool } from "@/lib/domain/types";
import { versionVerification, type VersionPair } from "@/lib/plan/verification";
import { dayOf } from "@/lib/dates";

/** "IM8 profile" lines (one for each profile in the plan) and one line for each picked tool, to show where the content comes from. */
export interface SourceLines {
  profiles: string[];
  tools: string[];
}

/**
 * Where the plan's content comes from: the IM8 profile and its version, and for each picked tool its coverage version and
 * who stands behind it. A line speaks of one tool only. A new plan has no tools, so it has only profile lines.
 */
export function sourceLines(input: { profiles: Profile[]; tools: Tool[]; versions: VersionPair[]; profileId: string }): SourceLines {
  const { profiles, tools, versions, profileId } = input;
  return {
    profiles: profiles.map(p => `IM8 profile ${p.title}, version ${p.version}`),
    tools: tools.map(tool => {
      const pair = versions.find(v => v.current.toolId === tool._id && v.current.profileId === profileId);
      if (!pair) return `${tool.name}: no coverage yet`;
      const state = versionVerification(pair);
      const approvedAt = pair.current.approval?.at;
      const what =
        state === "verified" ? `verified by an admin${approvedAt ? ` on ${dayOf(approvedAt)}` : ""}` : state === "govtech-published" ? "published by GovTech" : "not yet verified";
      return `${tool.name}: coverage version ${pair.current.version}, ${what}`;
    }),
  };
}
