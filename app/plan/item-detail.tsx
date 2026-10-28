"use client";

import { Dialog } from "@/app/ui/dialog";
import type { ProfileEntry } from "@/lib/domain/types";
import type { PlanItem } from "@/lib/plan/engine";
import { roomName } from "@/lib/plan/floor-plan";
import { resolveParameters } from "@/lib/plan/format";
import { VALUE_LABEL } from "@/lib/plan/labels";
import { Badge } from "./badge";

/** The side panel with the official wording and what each picked tool says. The dialog handles Escape and focus. */
export function ItemDetail({
  item,
  entry,
  open,
  onClose,
}: {
  item: PlanItem;
  entry?: ProfileEntry;
  open: boolean;
  onClose: () => void;
}) {
  const title = item.plain?.title ?? item.title;
  return (
    <Dialog
      side
      open={open}
      onClose={onClose}
      title={title}
      description={`${item.id} in ${roomName(item.family)}`}
    >
      <div className="flex flex-col gap-8">
        <p className="max-w-measure text-ink-soft">{item.reason}</p>

        <section className="flex flex-col gap-3">
          <h3 className="text-lead font-semibold">Official wording</h3>
          {entry ? (
            <dl className="flex flex-col border-t border-rule">
              <Field label="Requirement" text={entry.statement} />
              <Field label="Recommendations" text={entry.recommendations} />
              <Field label="Why it matters (official)" text={entry.rationale} />
              <Field label="References" text={entry.references} />
            </dl>
          ) : (
            <p className="text-ink-soft">The official wording isn&apos;t available.</p>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h3 className="text-lead font-semibold">What your tools say</h3>
          {item.claims.length === 0 ? (
            <p className="text-ink-soft">None of the tools you picked say anything about this one.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {item.claims.map(c => (
                <li key={c.toolId} className="rounded-xs border border-rule">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rule px-4 py-2.5">
                    <span className="font-display text-lead font-semibold">{c.toolName}</span>
                    <Badge verification={c.verification} />
                  </div>
                  <div className="flex flex-col gap-2 px-4 py-3 text-body">
                    <p>{VALUE_LABEL(c.value, c.toolName, c.otherToolName)}</p>
                    {c.explanation && <p className="text-ink-soft">{c.explanation}</p>}
                    {c.builderPart && (
                      <p>
                        <span className="font-semibold">App Builder&apos;s part: </span>
                        {c.builderPart}
                      </p>
                    )}
                    <p className="text-small text-ink-soft">Source: {c.source}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Dialog>
  );
}

function Field({ label, text }: { label: string; text: string }) {
  if (!text.trim()) return null;
  return (
    <div className="grid grid-cols-[180px_1fr] gap-4 border-b border-rule py-3">
      <dt className="font-display text-small font-semibold">{label}</dt>
      <dd className="max-w-measure whitespace-pre-line text-body text-ink">{resolveParameters(text)}</dd>
    </div>
  );
}
