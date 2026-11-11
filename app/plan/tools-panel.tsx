"use client";

import { useMemo, useState } from "react";
import { Button } from "@/app/ui/button";
import { Dialog } from "@/app/ui/dialog";
import { Tag } from "@/app/ui/stamp";
import type { Section, Tool } from "@/lib/domain/types";
import { effectText, orderTools, toolEffects } from "@/lib/plan/effect";
import { versionVerification, type Verification } from "@/lib/plan/verification";
import { useProject } from "./project-context";
import { ToolRow } from "./tool-row";

const SECTIONS: { id: Section; title: string }[] = [
  { id: "cpf", title: "CPF tools" },
  { id: "wog", title: "Whole-of-government tools" },
  { id: "code", title: "Code components" },
];

/**
 * The tools of a saved project, as one row at the top of the checklist: the tools picked and a button to change them.
 * A tool is a way to get controls done, so picking one marks them done.
 */
export function ToolsPanel() {
  const { toolNames, toolIds } = useProject();
  const [open, setOpen] = useState(false);
  return (
    <section aria-label="Your tools" className="flex flex-col gap-2 border-b border-rule pb-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-body font-semibold">Your tools</h2>
        <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
          {toolIds.length ? "Change tools" : "Add tools"}
        </Button>
      </div>
      {toolNames.length ? (
        <ul className="flex flex-wrap gap-2">
          {toolNames.map(name => (
            <li key={name}>
              <Tag>{name}</Tag>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-small text-ink-soft">No tools yet. A tool does some controls for you, and they show as done.</p>
      )}
      <Dialog side open={open} onClose={() => setOpen(false)} title="Your tools" description="Tick the tools that are part of your app. Each tick is saved at once.">
        {open && <ToolList />}
      </Dialog>
    </section>
  );
}

/** The list inside the drawer. It is built only while the drawer is open, because it builds a plan for every tool. */
function ToolList() {
  const { data, toolIds, toggleTool, profileId, profileTitle, project, overlay } = useProject();
  const facts = useMemo(() => project.facts ?? {}, [project]);
  const effects = useMemo(() => toolEffects(data, { profileId, facts }, toolIds, overlay), [data, profileId, facts, toolIds, overlay]);
  // The order is set when the drawer opens and does not change on a tick, so a row never moves under the pointer.
  const [order] = useState(() => orderTools(data.tools, effects, data.versions, profileId));
  const covered = data.versions.some(v => v.current.profileId === profileId);
  const verification = useMemo(() => {
    const out: Record<string, Verification | null> = {};
    for (const tool of data.tools) {
      const pair = data.versions.find(v => v.current.toolId === tool._id && v.current.profileId === profileId);
      out[tool._id] = pair ? versionVerification(pair) : null;
    }
    return out;
  }, [data, profileId]);

  const group = (title: string, tools: Tool[]) =>
    tools.length === 0 ? null : (
      <section aria-label={title} className="flex flex-col gap-4">
        <h3 className="text-title font-semibold">{title}</h3>
        {SECTIONS.map(section => {
          const inSection = tools.filter(t => t.section === section.id);
          if (inSection.length === 0) return null;
          return (
            <div key={section.id} className="flex flex-col gap-2">
              <h4 className="text-small font-semibold text-ink-soft">{section.title}</h4>
              <ul>
                {inSection.map(tool => (
                  <ToolRow
                    key={tool._id}
                    tool={tool}
                    checked={toolIds.includes(tool._id)}
                    verification={verification[tool._id]}
                    effect={effectText(effects[tool._id], profileTitle)}
                    onToggle={() => toggleTool(tool._id)}
                  />
                ))}
              </ul>
            </div>
          );
        })}
      </section>
    );

  return (
    <div className="flex flex-col gap-8">
      {!covered && <p className="max-w-measure text-body font-medium">No tool covers {profileTitle} yet, so every control is yours.</p>}
      {group("Could do more for you", order.more)}
      {group("Other tools", order.other)}
    </div>
  );
}
