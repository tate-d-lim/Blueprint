"use client";

import { Button } from "@/app/ui/button";
import { Checkbox } from "@/app/ui/field";
import { Note } from "@/app/ui/note";
import { Panel } from "@/app/ui/panel";
import type { Section, Tool } from "@/lib/domain/types";
import type { ToolHint } from "@/lib/plan/engine";
import { HINT_TEXT } from "@/lib/plan/labels";
import type { Verification } from "@/lib/plan/verification";
import { Badge, SampleTag } from "./badge";

const SECTIONS: { id: Section; title: string }[] = [
  { id: "cpf", title: "CPF tools" },
  { id: "wog", title: "Whole-of-government tools" },
  { id: "code", title: "Code components" },
];

/** "appCentral expects DBaaS": shown once, above the picker. */
export function ToolHints({ tools, hints, onToggle }: { tools: Tool[]; hints: ToolHint[]; onToggle: (toolId: string) => void }) {
  const nameOf = (id: string) => tools.find(t => t._id === id)?.name ?? id;
  return hints.map(h => (
    <Note
      key={`${h.fromToolId}>${h.suggestToolId}`}
      tone="attention"
      action={
        <Button size="sm" onClick={() => onToggle(h.suggestToolId)}>
          Add {nameOf(h.suggestToolId)}
        </Button>
      }
    >
      {HINT_TEXT(nameOf(h.fromToolId), nameOf(h.suggestToolId), h.count)}
    </Note>
  ));
}

export function ToolPicker({
  tools,
  picked,
  verification,
  onToggle,
}: {
  tools: Tool[];
  picked: string[];
  verification: Record<string, Verification | null>;
  onToggle: (toolId: string) => void;
}) {
  return (
    <Panel scroll className="min-h-0" title="Pick your tools" description="Tick what your app will use. The floor plan updates as you go.">
      <div className="flex flex-col gap-6">
        {SECTIONS.map(section => {
          const inSection = tools.filter(t => t.section === section.id);
          if (inSection.length === 0) return null;
          return (
            <section key={section.id} className="flex flex-col gap-3">
              <h3 className="text-body font-semibold text-ink-soft">{section.title}</h3>
              <ul className="flex flex-col gap-3">
                {inSection.map(tool => (
                  <li key={tool._id}>
                    <Checkbox
                      name={tool._id}
                      label={<span className="font-semibold">{tool.name}</span>}
                      checked={picked.includes(tool._id)}
                      onChange={() => onToggle(tool._id)}
                      hint={
                        <div className="flex flex-col gap-1.5">
                          {tool.description && <span>{tool.description}</span>}
                          <span className="flex flex-wrap gap-2">
                            {tool.isSample && <SampleTag />}
                            {verification[tool._id] && <Badge verification={verification[tool._id]!} />}
                          </span>
                        </div>
                      }
                    />
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </Panel>
  );
}
