"use client";

import { useState } from "react";
import { Button } from "@/app/ui/button";
import { Field, inputClass, selectClass } from "@/app/ui/field";
import { Segmented } from "@/app/ui/segmented";
import type { TaskStatus } from "@/lib/domain/types";
import type { PlanItem } from "@/lib/plan/engine";
import { STATUS_LABEL } from "@/lib/plan/labels";

export interface ItemControls {
  onStatus: (key: PlanItem["key"], value: { status: TaskStatus; note?: string }) => void;
  onAnswer: (key: PlanItem["key"], answer: { applies: boolean; reason: string } | null) => void;
}

/** To do / In progress / Done and an optional note, for items that are the builder's job. */
export function TaskControls({ item, controls }: { item: PlanItem; controls: ItemControls }) {
  const current = item.status && "status" in item.status ? item.status : { status: "todo" as TaskStatus };
  const [note, setNote] = useState(current.note ?? "");
  return (
    <div className="grid grid-cols-[200px_1fr_auto] items-end gap-3 border-t border-rule pt-4">
      <Field label="Status">
        {props => (
          <select
            {...props}
            name={`status-${item.id}`}
            value={current.status}
            onChange={e => controls.onStatus(item.key, { status: e.target.value as TaskStatus, note })}
            className={selectClass}
          >
            {(Object.keys(STATUS_LABEL) as TaskStatus[]).map(s => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        )}
      </Field>
      <Field label="Note (optional)">
        {props => (
          <input
            {...props}
            name={`note-${item.id}`}
            value={note}
            placeholder="Who is doing it, or where it is recorded"
            onChange={e => setNote(e.target.value)}
            onBlur={() => note !== (current.note ?? "") && controls.onStatus(item.key, { status: current.status, note })}
            className={inputClass}
          />
        )}
      </Field>
      {item.placement === "answered-applies" ? (
        <Button variant="quiet" size="sm" onClick={() => controls.onAnswer(item.key, null)}>
          Mark as unanswered
        </Button>
      ) : (
        <span />
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
      <div className="flex flex-wrap items-center gap-3 border-t border-rule pt-4 text-body">
        <span>Doesn&apos;t apply: {answered.reason || "no reason given"}</span>
        <Button variant="quiet" size="sm" onClick={() => controls.onAnswer(item.key, null)}>
          Change answer
        </Button>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3 border-t border-rule pt-4">
      <Segmented
        label="Does this apply to your app?"
        value={declining ? "no" : null}
        options={[
          { value: "yes", label: "Applies" },
          { value: "no", label: "Doesn't apply" },
        ]}
        onChange={answer => (answer === "yes" ? controls.onAnswer(item.key, { applies: true, reason: "" }) : setDeclining(true))}
      />
      {declining && (
        <div className="grid grid-cols-[1fr_auto] items-end gap-3">
          <Field label="Why doesn't it apply?">
            {props => (
              <input
                {...props}
                name={`reason-${item.id}`}
                value={reason}
                placeholder="The app sends no SMS"
                onChange={e => setReason(e.target.value)}
                className={inputClass}
              />
            )}
          </Field>
          <Button disabled={!reason.trim()} onClick={() => controls.onAnswer(item.key, { applies: false, reason })}>
            Save answer
          </Button>
        </div>
      )}
    </div>
  );
}
