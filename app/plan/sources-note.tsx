"use client";

import { useMemo } from "react";
import { Disclosure } from "@/app/ui/disclosure";
import { sourceLines } from "./sources";
import { useProject } from "./project-context";

/** Where the plan comes from: the IM8 profile and version, and the coverage version of each picked tool. */
export function SourcesNote() {
  const { data, plan, profileId, toolIds } = useProject();
  const lines = useMemo(() => {
    const active = new Set([profileId, ...plan.items.map(i => i.profileId)]);
    return sourceLines({
      profiles: data.profiles.filter(p => active.has(p._id)),
      tools: data.tools.filter(t => toolIds.includes(t._id)),
      versions: data.versions,
      profileId,
    });
  }, [data, plan, profileId, toolIds]);
  return (
    <div className="border-t border-rule">
      <Disclosure summary={<span className="text-body font-semibold">Sources</span>}>
        <ul className="flex flex-col gap-1 text-small text-ink-soft">
          {[...lines.profiles, ...lines.tools].map(line => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </Disclosure>
    </div>
  );
}
