"use client";

import { SgdsAlert, SgdsButton, SgdsCard, SgdsCheckbox, SgdsLink, SgdsRadio, SgdsRadioGroup } from "@govtechsg/sgds-web-component/react";
import { checkedOf, valueOf } from "@/app/components/sgds-events";
import { useState } from "react";
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
    <form onSubmit={submit} className="sgds:flex sgds:flex-col sgds:gap-layout-md">
      <SgdsCard>
        <div className="sgds:flex sgds:flex-col sgds:gap-layout-md">
          <div className="sgds:grid sgds:gap-layout-md sgds:md:grid-cols-2">
            {QUESTION_COLUMNS.map((column, i) => (
              <div key={i} className="sgds:flex sgds:flex-col sgds:gap-layout-md">
                {column.map(q => (
                  <SgdsRadioGroup
                    key={q.field}
                    label={q.legend}
                    name={q.field}
                    value={draft[q.field] ?? ""}
                    onSgdsChange={e => change({ [q.field]: valueOf(e) } as Partial<Draft>)}
                  >
                    {Object.entries(q.labels).map(([value, label]) => (
                      <SgdsRadio key={value} value={value}>
                        {label}
                      </SgdsRadio>
                    ))}
                  </SgdsRadioGroup>
                ))}
              </div>
            ))}
          </div>

          <div role="group" aria-labelledby="flags-label" className="sgds:flex sgds:flex-col sgds:gap-sm">
            <span id="flags-label" className="sgds:text-label-md sgds:font-semibold">
              Does either of these apply?
            </span>
            {SYSTEM_FLAGS.map(flag => (
              <div key={flag.field} className="sgds:flex sgds:flex-col sgds:gap-text-xs">
                <SgdsCheckbox
                  name={flag.field}
                  value={flag.field}
                  checked={draft[flag.field]}
                  onSgdsChange={e => change({ [flag.field]: checkedOf(e) })}
                >
                  {flag.label}
                </SgdsCheckbox>
                {flag.hint && <p className="sgds:max-w-container-md sgds:pl-layout-md sgds:text-body-sm sgds:text-subtle">{flag.hint}</p>}
              </div>
            ))}
          </div>

          <div className="sgds:flex sgds:flex-wrap sgds:items-center sgds:gap-sm">
            <SgdsButton type="submit" disabled={!complete}>
              Work out my app type
            </SgdsButton>
            {!complete && <span className="sgds:text-body-sm sgds:text-subtle">Answer all four questions to continue.</span>}
          </div>
        </div>
      </SgdsCard>

      {shown && <Outcome answers={shown.answers} result={shown.result} />}
    </form>
  );
}

function Outcome({ answers, result }: { answers: RiskAnswers; result: RiskResult }) {
  const supported = result.profileId !== null;
  return (
    <SgdsAlert show outlined variant={supported ? "success" : "warning"}>
      <div className="sgds:flex sgds:flex-col sgds:gap-text-sm">
        <h2 className="sgds:text-heading-sm sgds:font-semibold">{result.appType}</h2>
        <ul className="sgds:list-disc sgds:pl-layout-sm">
          {result.reasons.map(r => (
            <li key={r}>{r}</li>
          ))}
        </ul>
        <p>
          Based on{" "}
          <SgdsLink size="sm">
            <a href={RISK_SOURCE_URL} target="_blank" rel="noreferrer" suppressHydrationWarning>
              GovTech&apos;s risk materiality levels
            </a>
          </SgdsLink>
          .
        </p>
        {supported ? (
          <div>
            <SgdsButton href={`/plan?${planQuery(answers, [])}`}>See your build plan</SgdsButton>
          </div>
        ) : (
          <p className="sgds:font-semibold">We don&apos;t support this type of app yet.</p>
        )}
      </div>
    </SgdsAlert>
  );
}
