"use client";

import { SgdsButton, SgdsInput, SgdsSelect } from "@govtechsg/sgds-web-component/react";
import { valueOf } from "@/app/components/sgds-events";
import { useState } from "react";
import type { TaskStatus } from "@/lib/domain/types";
import type { PlanItem } from "@/lib/plan/engine";
import { STATUS_LABEL } from "@/lib/plan/labels";

// Options go in as data: options written as children can reach the select before their values do.
const STATUS_OPTIONS = (Object.keys(STATUS_LABEL) as TaskStatus[]).map(s => ({ label: STATUS_LABEL[s], value: s }));

export interface ItemControls {
  onStatus: (key: PlanItem["key"], value: { status: TaskStatus; note?: string }) => void;
  onAnswer: (key: PlanItem["key"], answer: { applies: boolean; reason: string } | null) => void;
}

/** To do / In progress / Done and an optional note, for items that are the builder's job. */
export function TaskControls({ item, controls }: { item: PlanItem; controls: ItemControls }) {
  const current = item.status && "status" in item.status ? item.status : { status: "todo" as TaskStatus };
  const [note, setNote] = useState(current.note ?? "");
  return (
    <div className="sgds:grid sgds:items-end sgds:gap-sm sgds:md:grid-cols-[12rem_1fr_auto]">
      <SgdsSelect
        label="Status"
        name={`status-${item.id}`}
        value={current.status}
        menuList={STATUS_OPTIONS}
        // The select also announces its starting value; only a real change is a save.
        onSgdsChange={e => valueOf(e) !== current.status && controls.onStatus(item.key, { status: valueOf(e) as TaskStatus, note })}
      />
      <SgdsInput
        label="Note (optional)"
        name={`note-${item.id}`}
        value={note}
        placeholder="Add a note"
        onSgdsInput={e => setNote(valueOf(e))}
        onSgdsBlur={() => note !== (current.note ?? "") && controls.onStatus(item.key, { status: current.status, note })}
      />
      {item.placement === "answered-applies" && (
        <SgdsButton variant="ghost" size="sm" onClick={() => controls.onAnswer(item.key, null)}>
          Mark as unanswered
        </SgdsButton>
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
      <div className="sgds:flex sgds:flex-wrap sgds:items-center sgds:gap-sm sgds:text-body-sm">
        <span>Doesn&apos;t apply: {answered.reason || "no reason given"}</span>
        <SgdsButton variant="ghost" size="sm" onClick={() => controls.onAnswer(item.key, null)}>
          Change answer
        </SgdsButton>
      </div>
    );
  }
  return (
    <div className="sgds:flex sgds:flex-col sgds:gap-sm">
      <div className="sgds:flex sgds:gap-sm">
        <SgdsButton size="sm" onClick={() => controls.onAnswer(item.key, { applies: true, reason: "" })}>
          Applies
        </SgdsButton>
        <SgdsButton size="sm" variant="outline" onClick={() => setDeclining(true)}>
          Doesn&apos;t apply
        </SgdsButton>
      </div>
      {declining && (
        <div className="sgds:grid sgds:items-end sgds:gap-sm sgds:md:grid-cols-[1fr_auto]">
          <SgdsInput
            label="Why doesn't it apply?"
            name={`reason-${item.id}`}
            value={reason}
            placeholder="Say why in a sentence"
            onSgdsInput={e => setReason(valueOf(e))}
          />
          <SgdsButton size="sm" disabled={!reason.trim()} onClick={() => controls.onAnswer(item.key, { applies: false, reason })}>
            Save answer
          </SgdsButton>
        </div>
      )}
    </div>
  );
}
