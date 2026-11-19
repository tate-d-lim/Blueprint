"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/app/ui/button";
import { RadioGroup } from "@/app/ui/field";
import type { FactAnswers } from "@/lib/domain/types";
import { startQuery } from "@/lib/plan/url-state";
import { ClassificationHelper } from "./classification-helper";
import { useUnsavedGuard } from "@/lib/plan/unsaved";
import { OPTION_LABELS, type RiskAnswers } from "@/lib/risk/assess";

type Draft = Partial<Pick<RiskAnswers, "classification" | "sensitivity" | "impact" | "downstream">> & Pick<RiskAnswers, "cii" | "sii">;

// The help for the first two questions follows appCentral's guide "Assess Risk Materiality Level (RML)" in CPF's
// Notion: each level says what happens if the data leaks, and who to ask.
const QUESTIONS = [
  {
    field: "classification",
    legend: "What is the highest classification of data in your app?",
    hint: "Think about the data in your app that would do the most harm if it leaked. Not sure? Ask your BRM.",
    labels: OPTION_LABELS.classification,
    hints: {
      "official-open": "A leak would not harm CPFB or the nation, and the data is suitable to make public.",
      "official-closed": "A leak would not harm CPFB or the nation, but the data is not suitable to make public.",
      restricted: "A leak would cause some damage to CPFB, for example it would disrupt a process. It would not damage the nation.",
      "confidential-cloud-eligible":
        "A leak would cause serious damage to CPFB, for example it would stop a critical process. It would not damage the nation.",
      confidential:
        "A leak would cause some damage to the nation, for example to public safety, public health, foreign relations or the economy.",
      "s-class": "Classified at Secret level or above.",
    },
  },
  {
    field: "sensitivity",
    legend: "How sensitive is the data?",
    hint: "Think about the direct harm to a person or an organisation if the data leaked.",
    labels: OPTION_LABELS.sensitivity,
    hints: {
      "non-sensitive": "Little or no harm to a person or an organisation. This includes information that is already public.",
      "sensitive-normal": "Minor, short-term distress to a person, or an organisation becomes less competitive.",
      "sensitive-high": "Serious physical, financial or long-term emotional harm, or stigma, to a person. Or a long-term financial loss to an organisation.",
    },
  },
  {
    field: "impact",
    legend: "If your app failed or leaked data, what is the worst impact in any area?",
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
    legend: "What is the impact on systems that depend on your app?",
    labels: OPTION_LABELS.downstream,
    hints: {
      minimal: "Other systems continue to work as normal.",
      significant: "Other systems would be disrupted or would have to stop.",
    },
  },
] as const;

/** The short name of each question, for the list of answers so far. */
const SHORT: Record<(typeof QUESTIONS)[number]["field"], string> = {
  classification: "Highest data classification",
  sensitivity: "Sensitivity",
  impact: "Worst impact",
  downstream: "Impact on systems that depend on your app",
};

/**
 * Step 1. A new plan asks one question at a time, with the answers so far above the question. A builder who comes back
 * with answers, or who edits a saved project, sees all the questions at once. The answers go into the link, so Back and
 * every "change answers" link keep them.
 */
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
  // A link with any answers in it (Back, "change answers", a broken link) shows them all, so nothing is hidden.
  const [guided, setGuided] = useState(!projectId && QUESTIONS.every(q => initial[q.field] === undefined));
  const [step, setStep] = useState(0);
  const questionRef = useRef<HTMLDivElement>(null);
  const moved = useRef(false);
  useUnsavedGuard(!!stored && JSON.stringify(draft) !== JSON.stringify(stored));

  // After Next, Previous or Change, the new question gets the focus, so a screen reader reads it out. Not on first load.
  useEffect(() => {
    if (moved.current) questionRef.current?.focus();
  }, [step]);
  const go = (n: number) => {
    moved.current = true;
    setStep(n);
  };

  const current = QUESTIONS[step];
  const answered = draft[current.field] !== undefined;
  const last = step === QUESTIONS.length - 1;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (guided && !last) {
      if (answered) go(step + 1);
      return;
    }
    if (!complete) return;
    router.push(`/start/verdict?${startQuery(draft as RiskAnswers, facts, projectId ?? undefined)}`);
  };

  const question = (q: (typeof QUESTIONS)[number]) => (
    <>
      <RadioGroup
        legend={q.legend}
        hint={"hint" in q ? q.hint : undefined}
        name={q.field}
        value={draft[q.field]}
        options={q.labels}
        optionHints={q.hints}
        onChange={value => setDraft(d => ({ ...d, [q.field]: value }))}
      />
      {q.field === "classification" && (
        <ClassificationHelper labels={q.labels} onPick={value => setDraft(d => ({ ...d, classification: value }))} />
      )}
    </>
  );

  if (guided) {
    return (
      <form onSubmit={submit} className="flex flex-col gap-8">
        {step > 0 && (
          <dl aria-label="Your answers so far" className="flex flex-col divide-y divide-rule border-y border-rule">
            {QUESTIONS.slice(0, step).map((q, i) => (
              <div key={q.field} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-baseline gap-4 py-2.5 text-small">
                <dt className="text-ink-soft">{SHORT[q.field]}</dt>
                <dd className="font-medium text-ink">{q.labels[draft[q.field] as keyof typeof q.labels]}</dd>
                <dd>
                  <button
                    type="button"
                    onClick={() => go(i)}
                    aria-label={`Change ${SHORT[q.field].toLowerCase()}`}
                    className="cursor-pointer font-medium text-ink underline decoration-1 underline-offset-4 hover:decoration-2"
                  >
                    Change
                  </button>
                </dd>
              </div>
            ))}
          </dl>
        )}

        <div ref={questionRef} tabIndex={-1} className="focus:outline-none">
          {question(current)}
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit" disabled={!answered}>
            {last ? "Find your app type" : "Next question"}
          </Button>
          {step > 0 && (
            <Button variant="secondary" onClick={() => go(step - 1)}>
              Previous question
            </Button>
          )}
          <span className="tnum text-small text-ink-soft">
            Question {step + 1} of {QUESTIONS.length}
          </span>
          <Button variant="quiet" size="sm" className="ml-auto" onClick={() => setGuided(false)}>
            Show all questions
          </Button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-8">
      <div className="flex flex-col divide-y divide-rule">
        {QUESTIONS.map((q, i) => (
          <div key={q.field} className={i === 0 ? "pb-8" : "py-8"}>
            {question(q)}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={!complete}>
          Find your app type
        </Button>
        {!complete && <span className="text-small text-ink-soft">Answer all 4 questions to continue.</span>}
      </div>
    </form>
  );
}
