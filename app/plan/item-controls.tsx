"use client";

import { useState } from "react";
import { Button } from "@/app/ui/button";
import { Field, inputClass } from "@/app/ui/field";
import { Segmented } from "@/app/ui/segmented";
import type { PlanItem } from "@/lib/plan/engine";

export interface ItemControls {
  onAnswer: (key: PlanItem["key"], answer: { applies: boolean; reason: string } | null) => void;
}

/** Applies / Doesn't apply for questions the tools can't settle. */
export function QuestionControls({ item, controls }: { item: PlanItem; controls: ItemControls }) {
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");
  const answered = item.status && "applies" in item.status ? item.status : null;

  if (answered) {
    return (
      <div className="flex flex-wrap items-center gap-3 border-t border-rule pt-4 text-body">
        <span>Does not apply: {answered.reason || "no reason given"}</span>
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
          { value: "no", label: "Does not apply" },
        ]}
        onChange={answer => (answer === "yes" ? controls.onAnswer(item.key, { applies: true, reason: "" }) : setDeclining(true))}
      />
      {declining && (
        <div className="grid grid-cols-[1fr_auto] items-end gap-3">
          <Field label="Why does it not apply?">
            {props => (
              <input
                {...props}
                name={`reason-${item.id}`}
                value={reason}
                placeholder="Your app sends no SMS"
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
