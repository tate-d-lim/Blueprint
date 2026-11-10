"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/app/ui/button";
import { Checkbox, RadioGroup } from "@/app/ui/field";
import type { FactAnswers } from "@/lib/domain/types";
import { startQuery } from "@/lib/plan/url-state";
import { useUnsavedGuard } from "@/lib/plan/unsaved";
import { OPTION_LABELS, type RiskAnswers } from "@/lib/risk/assess";

type Draft = Partial<Pick<RiskAnswers, "classification" | "sensitivity" | "impact" | "downstream">> & Pick<RiskAnswers, "cii" | "sii">;

const ASK_OFFICER = "Not sure? Ask your IT security officer (ACISO or MCISO).";

const QUESTIONS = [
  {
    field: "classification",
    legend: "What's the highest classification of data the app handles?",
    labels: OPTION_LABELS.classification,
    hints: {
      "official-open": "Information that is meant to be public.",
      "official-closed": "Internal information that is not for the public.",
      restricted: "Information that could cause harm if it leaked.",
      "confidential-cloud-eligible": "Confidential data that is approved for the cloud.",
      confidential: "Confidential data that is not approved for the cloud.",
      "s-class": "Classified at Secret level or above.",
    },
  },
  {
    field: "sensitivity",
    legend: "How sensitive is it?",
    labels: OPTION_LABELS.sensitivity,
    hints: {
      "non-sensitive": "Nothing that identifies a person or is private.",
      "sensitive-normal": "Some private details, such as names and contact details.",
      "sensitive-high": "Highly private details, such as medical or financial records.",
    },
  },
  {
    field: "impact",
    legend: "If the app failed or leaked, what's the worst impact in any area?",
    labels: OPTION_LABELS.impact,
    hints: {
      none: "Nothing important would be affected.",
      slight: "A few people inconvenienced for a short time.",
      moderate: "Some people or services disrupted, or some money lost.",
      significant: "Many people affected, or a service down for a long time.",
      critical: "Serious harm, such as loss of life or a wide public service stopping.",
    },
  },
  {
    field: "downstream",
    legend: "What's the impact on systems that depend on it?",
    labels: OPTION_LABELS.downstream,
    hints: {
      minimal: "Other systems carry on as normal.",
      significant: "Other systems would be disrupted or would have to stop.",
    },
  },
] as const;

const SYSTEM_FLAGS = [
  {
    field: "cii",
    label: "The system is Critical Information Infrastructure (CII)",
    hint: `A computer system the Commissioner of Cybersecurity has formally designated as necessary for delivering an essential service, such as banking, energy or healthcare. If it has been designated, you will have been told. ${ASK_OFFICER}`,
  },
  { field: "sii", label: "The system is SII", hint: ASK_OFFICER },
] as const;

/** Step 1. The answers go into the link, so Back and every "change answers" link keep them. */
export function StartForm({
  initial,
  facts,
  projectId,
  stored,
}: {
  initial: Partial<RiskAnswers>;
  facts: FactAnswers;
  projectId: string | null;
  /** The saved project's answers, when a project is being edited. */
  stored?: RiskAnswers;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>({ ...initial, cii: initial.cii ?? false, sii: initial.sii ?? false });
  const complete = QUESTIONS.every(q => draft[q.field] !== undefined);
  useUnsavedGuard(!!stored && JSON.stringify(draft) !== JSON.stringify(stored));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!complete) return;
    router.push(`/start/verdict?${startQuery(draft as RiskAnswers, facts, projectId ?? undefined)}`);
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-8">
      <div className="flex flex-col divide-y divide-rule">
        {QUESTIONS.map((q, i) => (
          <div key={q.field} className={i === 0 ? "pb-8" : "py-8"}>
            <RadioGroup
              legend={q.legend}
              name={q.field}
              value={draft[q.field]}
              options={q.labels}
              optionHints={q.hints}
              onChange={value => setDraft(d => ({ ...d, [q.field]: value }))}
            />
          </div>
        ))}
        <fieldset className="flex flex-col gap-3 pt-8">
          <legend className="mb-3 text-lead font-semibold text-ink">Does either of these apply?</legend>
          {SYSTEM_FLAGS.map(flag => (
            <Checkbox
              key={flag.field}
              name={flag.field}
              label={flag.label}
              hint={<span className="block max-w-measure">{flag.hint}</span>}
              checked={draft[flag.field]}
              onChange={e => setDraft(d => ({ ...d, [flag.field]: e.target.checked }))}
            />
          ))}
        </fieldset>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={!complete}>
          Work out my app type
        </Button>
        {!complete && <span className="text-small text-ink-soft">Answer all four questions to continue.</span>}
      </div>
    </form>
  );
}
