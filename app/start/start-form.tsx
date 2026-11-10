"use client";

import { useState } from "react";
import { Button, ButtonLink, TextLink } from "@/app/ui/button";
import { Checkbox, RadioGroup } from "@/app/ui/field";
import { Note } from "@/app/ui/note";
import { Panel } from "@/app/ui/panel";
import { planQuery } from "@/lib/plan/url-state";
import { OPTION_LABELS, RISK_SOURCE_URL, assessRisk, type RiskAnswers, type RiskResult } from "@/lib/risk/assess";

type Draft = Partial<Pick<RiskAnswers, "classification" | "sensitivity" | "impact" | "downstream">> &
  Pick<RiskAnswers, "cii" | "sii">;

const QUESTIONS = [
  { field: "classification", legend: "What's the highest classification of data the app handles?", labels: OPTION_LABELS.classification },
  { field: "sensitivity", legend: "How sensitive is it?", labels: OPTION_LABELS.sensitivity },
  { field: "impact", legend: "If the app failed or leaked, what's the worst impact in any area?", labels: OPTION_LABELS.impact },
  { field: "downstream", legend: "What's the impact on systems that depend on it?", labels: OPTION_LABELS.downstream },
] as const;

/** Two columns of about the same height: the long data questions on the left, the impact questions on the right. */
const QUESTION_COLUMNS = [QUESTIONS.slice(0, 2), QUESTIONS.slice(2)];

const SYSTEM_FLAGS = [
  {
    field: "cii",
    label: "The system is Critical Information Infrastructure (CII)",
    hint: "A computer system the Commissioner of Cybersecurity has formally designated as necessary for delivering an essential service, such as banking, energy or healthcare. If it has been designated, you will have been told.",
  },
  { field: "sii", label: "The system is SII", hint: undefined },
] as const;

export function StartForm() {
  const [draft, setDraft] = useState<Draft>({ cii: false, sii: false });
  const [shown, setShown] = useState<{ answers: RiskAnswers; result: RiskResult } | null>(null);

  const change = (patch: Partial<Draft>) => {
    setDraft(d => ({ ...d, ...patch }));
    setShown(null);
  };
  const complete = QUESTIONS.every(q => draft[q.field] !== undefined);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!complete) return;
    const answers = draft as RiskAnswers;
    setShown({ answers, result: assessRisk(answers) });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <Panel>
        <div className="flex flex-col gap-8 py-2">
          <div className="grid grid-cols-2 gap-x-12 gap-y-8">
            {QUESTION_COLUMNS.map((column, i) => (
              <div key={i} className="flex flex-col gap-8">
                {column.map(q => (
                  <RadioGroup
                    key={q.field}
                    legend={q.legend}
                    name={q.field}
                    value={draft[q.field]}
                    options={q.labels}
                    onChange={value => change({ [q.field]: value } as Partial<Draft>)}
                  />
                ))}
              </div>
            ))}
          </div>

          <fieldset className="flex flex-col gap-3 border-t border-rule pt-6">
            <legend className="mb-3 text-lead font-semibold text-ink">Does either of these apply?</legend>
            {SYSTEM_FLAGS.map(flag => (
              <Checkbox
                key={flag.field}
                name={flag.field}
                label={flag.label}
                hint={flag.hint && <span className="block max-w-measure">{flag.hint}</span>}
                checked={draft[flag.field]}
                onChange={e => change({ [flag.field]: e.target.checked })}
              />
            ))}
          </fieldset>

          <div className="flex flex-wrap items-center gap-4">
            {/* One primary action at a time: once the answer is shown, "Next: about your app" takes over. */}
            <Button type="submit" variant={shown ? "secondary" : "primary"} disabled={!complete}>
              Work out my app type
            </Button>
            {!complete && <span className="text-small text-ink-soft">Answer all four questions to continue.</span>}
          </div>
        </div>
      </Panel>

      {shown && <Outcome answers={shown.answers} result={shown.result} />}
    </form>
  );
}

function Outcome({ answers, result }: { answers: RiskAnswers; result: RiskResult }) {
  const supported = result.profileId !== null;
  return (
    <div aria-live="polite">
      <Panel title={result.appType}>
        <div className="flex flex-col gap-4">
          <ul className="flex list-disc flex-col gap-1 pl-5">
            {result.reasons.map(r => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          <p className="text-ink-soft">
            Based on{" "}
            <TextLink href={RISK_SOURCE_URL} external>
              GovTech&apos;s risk materiality levels
            </TextLink>
            .
          </p>
          {supported ? (
            <div>
              <ButtonLink href={`/start/app?${planQuery(answers, [])}`}>Next: about your app</ButtonLink>
            </div>
          ) : (
            <Note tone="attention">We don&apos;t support this type of app yet.</Note>
          )}
        </div>
      </Panel>
    </div>
  );
}
