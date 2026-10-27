"use client";

import { useEffect, useRef } from "react";
import type { ProfileEntry } from "@/lib/domain/types";
import type { PlanItem } from "@/lib/plan/engine";
import { resolveParameters } from "@/lib/plan/format";
import { VALUE_LABEL } from "@/lib/plan/labels";
import { Badge } from "./badge";

export function ItemDetail({ item, entry, onClose }: { item: PlanItem; entry?: ProfileEntry; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-20 flex justify-end bg-black/30" onClick={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={item.plain?.title ?? item.title}
        onClick={e => e.stopPropagation()}
        className="h-full w-full max-w-xl overflow-y-auto bg-surface p-6 shadow-xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold leading-snug">{item.plain?.title ?? item.title}</h2>
            <p className="mt-1 font-mono text-xs text-muted">{item.id}</p>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} className="rounded-md border border-line px-3 py-1 text-sm">
            Close
          </button>
        </div>

        <p className="mt-4 text-sm text-muted">{item.reason}</p>

        <h3 className="mt-6 text-sm font-semibold uppercase tracking-wide text-muted">Official wording</h3>
        {entry ? (
          <dl className="mt-2 space-y-3 text-sm">
            <Field label="Requirement" text={entry.statement} />
            <Field label="Recommendations" text={entry.recommendations} />
            <Field label="Why it matters (official)" text={entry.rationale} />
            <Field label="References" text={entry.references} />
          </dl>
        ) : (
          <p className="mt-2 text-sm text-muted">The official wording isn&apos;t available.</p>
        )}

        <h3 className="mt-6 text-sm font-semibold uppercase tracking-wide text-muted">What your tools say</h3>
        {item.claims.length === 0 ? (
          <p className="mt-2 text-sm text-muted">None of the tools you picked say anything about this one.</p>
        ) : (
          <ul className="mt-2 space-y-3">
            {item.claims.map(c => (
              <li key={c.toolId} className="rounded-lg border border-line p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{c.toolName}</span>
                  <Badge verification={c.verification} />
                </div>
                <p className="mt-1">{VALUE_LABEL(c.value, c.toolName, c.otherToolName)}</p>
                {c.explanation && <p className="mt-1 text-muted">{c.explanation}</p>}
                {c.builderPart && (
                  <p className="mt-1">
                    <span className="font-medium">App Builder&apos;s part: </span>
                    {c.builderPart}
                  </p>
                )}
                <p className="mt-1 text-xs text-muted">Source: {c.source}</p>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}

function Field({ label, text }: { label: string; text: string }) {
  if (!text.trim()) return null;
  return (
    <div>
      <dt className="font-medium">{label}</dt>
      <dd className="mt-0.5 whitespace-pre-line text-muted">{resolveParameters(text)}</dd>
    </div>
  );
}
