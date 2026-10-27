"use client";

import { useState } from "react";
import type { TaskStatus } from "@/lib/domain/types";
import type { PlanItem } from "@/lib/plan/engine";
import { STATUS_LABEL } from "@/lib/plan/labels";

export interface ItemControls {
  onStatus: (key: PlanItem["key"], value: { status: TaskStatus; note?: string }) => void;
  onAnswer: (key: PlanItem["key"], answer: { applies: boolean; reason: string } | null) => void;
}

const FIELD = "rounded-md border border-line bg-surface px-2 py-1.5 text-sm";

/** To do / In progress / Done and an optional note, for items that are the builder's job. */
export function TaskControls({ item, controls }: { item: PlanItem; controls: ItemControls }) {
  const current = item.status && "status" in item.status ? item.status : { status: "todo" as TaskStatus };
  const [note, setNote] = useState(current.note ?? "");
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
      <select
        aria-label={`Status for ${item.id}`}
        value={current.status}
        onChange={e => controls.onStatus(item.key, { status: e.target.value as TaskStatus, note })}
        className={FIELD}
      >
        {(Object.keys(STATUS_LABEL) as TaskStatus[]).map(s => (
          <option key={s} value={s}>
            {STATUS_LABEL[s]}
          </option>
        ))}
      </select>
      <input
        aria-label={`Note for ${item.id}`}
        value={note}
        onChange={e => setNote(e.target.value)}
        onBlur={() => note !== (current.note ?? "") && controls.onStatus(item.key, { status: current.status, note })}
        placeholder="Add a note (optional)"
        className={`${FIELD} min-w-48 flex-1`}
      />
      {item.placement === "answered-applies" && (
        <button type="button" onClick={() => controls.onAnswer(item.key, null)} className="text-sm text-muted underline">
          Mark as unanswered
        </button>
      )}
    </div>
  );
}

/** Applies / Doesn't apply for questions the tools can't settle. */
export function QuestionControls({ item, controls }: { item: PlanItem; controls: ItemControls }) {
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");
  const answered = item.status && "applies" in item.status ? item.status : null;

  if (answered) {
    return (
      <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-line pt-3 text-sm">
        <span>Doesn&apos;t apply: {answered.reason || "no reason given"}</span>
        <button type="button" onClick={() => controls.onAnswer(item.key, null)} className="text-muted underline">
          Change answer
        </button>
      </div>
    );
  }
  return (
    <div className="mt-3 space-y-2 border-t border-line pt-3">
      <div className="flex gap-2">
        <button type="button" onClick={() => controls.onAnswer(item.key, { applies: true, reason: "" })} className="rounded-md border border-accent px-3 py-1.5 text-sm font-medium text-accent hover:bg-accent-soft">
          Applies
        </button>
        <button type="button" onClick={() => setDeclining(true)} className="rounded-md border border-line px-3 py-1.5 text-sm hover:bg-background">
          Doesn&apos;t apply
        </button>
      </div>
      {declining && (
        <div className="flex flex-wrap gap-2">
          <input aria-label={`Why ${item.id} doesn't apply`} value={reason} onChange={e => setReason(e.target.value)} placeholder="Why doesn't it apply?" className={`${FIELD} min-w-48 flex-1`} />
          <button
            type="button"
            disabled={!reason.trim()}
            onClick={() => controls.onAnswer(item.key, { applies: false, reason })}
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
          >
            Save answer
          </button>
        </div>
      )}
    </div>
  );
}
