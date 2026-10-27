"use client";

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

export function ToolPicker({
  tools,
  picked,
  verification,
  hints,
  onToggle,
}: {
  tools: Tool[];
  picked: string[];
  verification: Record<string, Verification | null>;
  hints: ToolHint[];
  onToggle: (toolId: string) => void;
}) {
  const nameOf = (id: string) => tools.find(t => t._id === id)?.name ?? id;
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Pick your tools</h2>
        <p className="mt-1 text-sm text-muted">Tick what your app will use. Your plan updates as you go.</p>
      </div>

      {SECTIONS.map(section => {
        const inSection = tools.filter(t => t.section === section.id);
        if (inSection.length === 0) return null;
        return (
          <section key={section.id}>
            <h3 className="mb-2 text-sm font-medium">{section.title}</h3>
            <ul className="space-y-2">
              {inSection.map(tool => (
                <li key={tool._id}>
                  <label
                    className={`flex cursor-pointer gap-3 rounded-lg border p-3 transition ${
                      picked.includes(tool._id) ? "border-accent bg-accent-soft" : "border-line bg-surface hover:border-accent/50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={picked.includes(tool._id)}
                      onChange={() => onToggle(tool._id)}
                      className="mt-1 size-4 accent-[var(--accent)]"
                    />
                    <span className="min-w-0">
                      <span className="block font-medium">{tool.name}</span>
                      {tool.description && <span className="block text-sm text-muted">{tool.description}</span>}
                      <span className="mt-1.5 flex flex-wrap gap-1.5">
                        {tool.isSample && <SampleTag />}
                        {verification[tool._id] && <Badge verification={verification[tool._id]!} />}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      {hints.map(h => (
        <div key={`${h.fromToolId}>${h.suggestToolId}`} className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm">
          <p>{HINT_TEXT(nameOf(h.fromToolId), nameOf(h.suggestToolId), h.count)}</p>
          <button
            type="button"
            onClick={() => onToggle(h.suggestToolId)}
            className="mt-2 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
          >
            Add {nameOf(h.suggestToolId)}
          </button>
        </div>
      ))}
    </div>
  );
}
