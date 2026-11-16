"use client";

import { useState } from "react";
import { Dialog } from "@/app/ui/dialog";
import { Field as FormField, inputClass } from "@/app/ui/field";
import type { ProfileEntry } from "@/lib/domain/types";
import type { PlanItem } from "@/lib/plan/engine";
import { areaOf } from "@/lib/plan/hotel";
import { resolveParameters } from "@/lib/plan/format";
import { VALUE_LABEL } from "@/lib/plan/labels";
import { rewordedSince } from "@/lib/catalog/news";
import { dayOf } from "@/lib/dates";
import { Badge } from "./badge";
import { useProject } from "./project-context";

/** The side panel with the official wording and what each picked tool says. The dialog handles Escape and focus. */
export function ItemDetail({
  item,
  entry,
  open,
  onClose,
  note,
}: {
  item: PlanItem;
  entry?: ProfileEntry;
  open: boolean;
  onClose: () => void;
  /** A control that is the builder's has a note. It goes into the security plan as the evidence. */
  note?: { value: string; onSave: (value: string) => void };
}) {
  const title = item.plain?.title ?? item.title;
  const { data } = useProject();
  /** When the official wording changed after this tool saved its answer, or undefined. */
  const changedAfter = (toolId: string) => {
    const pair = data.versions.find(v => v.current.toolId === toolId && v.current.profileId === item.profileId);
    return pair ? rewordedSince(item.key, item.profileId, pair.current.createdAt, data.releases ?? []) : undefined;
  };
  return (
    <Dialog
      side
      open={open}
      onClose={onClose}
      title={title}
      description={`${item.id} in ${areaOf(item.family)}`}
    >
      <div className="flex flex-col gap-8">
        <p className="max-w-measure text-ink-soft">{item.reason}</p>

        {item.plain && (
          <section className="flex flex-col gap-3">
            <h3 className="text-lead font-semibold">In plain words</h3>
            <dl className="flex flex-col border-t border-rule">
              <Field label="What it asks for" text={item.plain.task} />
              <Field label="Why it matters" text={item.plain.why} />
            </dl>
          </section>
        )}

        {note && <NoteField key={item.key} value={note.value} onSave={note.onSave} />}

        <section className="flex flex-col gap-3">
          <h3 className="text-lead font-semibold">Official wording</h3>
          {entry ? (
            <dl className="flex flex-col border-t border-rule">
              <Field label="Control" text={entry.statement} />
              <Field label="Recommendations" text={entry.recommendations} />
              <Field label="Why it matters (official)" text={entry.rationale} />
              <Field label="References" text={entry.references} />
            </dl>
          ) : (
            <p className="text-ink-soft">The official wording is not available.</p>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h3 className="text-lead font-semibold">What your tools say</h3>
          {item.claims.length === 0 ? (
            <p className="text-ink-soft">None of the tools you picked mention this control.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {item.claims.map(c => (
                <li key={c.toolId} className="rounded-sm border border-rule">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rule px-4 py-2.5">
                    <span className="text-lead font-semibold">{c.toolName}</span>
                    <Badge verification={c.verification} />
                  </div>
                  <div className="flex flex-col gap-2 px-4 py-3 text-body">
                    <p>{VALUE_LABEL(c.value, c.toolName)}</p>
                    {c.explanation && <p className="text-ink-soft">{c.explanation}</p>}
                    {c.builderPart && (
                      <p>
                        <span className="font-semibold">App Builder&apos;s part: </span>
                        {c.builderPart}
                      </p>
                    )}
                    <p className="text-small text-ink-soft">Source: {c.source}</p>
                    {changedAfter(c.toolId) && (
                      <p className="text-small text-ink-soft">
                        The official wording changed on {dayOf(changedAfter(c.toolId)!)}. {c.toolName} has not checked this answer again yet.
                      </p>
                    )}
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
      <dt className="text-small font-semibold">{label}</dt>
      <dd className="max-w-measure whitespace-pre-line text-body text-ink">{resolveParameters(text)}</dd>
    </div>
  );
}

/** The note saves when the field loses focus, and only when it changed. */
function NoteField({ value, onSave }: { value: string; onSave: (value: string) => void }) {
  const [text, setText] = useState(value);
  return (
    <FormField label="Your note" hint="Who did it, or where it is recorded. It goes into your security plan as the evidence.">
      {props => (
        <input
          {...props}
          name="note"
          value={text}
          onChange={e => setText(e.target.value)}
          onBlur={() => text !== value && onSave(text)}
          className={inputClass}
        />
      )}
    </FormField>
  );
}
