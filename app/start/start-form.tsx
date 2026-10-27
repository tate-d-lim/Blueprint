"use client";

import Link from "next/link";
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
    <form onSubmit={submit} className="mt-8 space-y-8">
      {QUESTIONS.map(q => (
        <fieldset key={q.field}>
          <legend className="mb-3 font-medium">{q.legend}</legend>
          <div className="flex flex-wrap gap-2">
            {Object.entries(q.labels).map(([value, label]) => (
              <label key={value}>
                <input
                  type="radio"
                  name={q.field}
                  value={value}
                  checked={draft[q.field] === value}
                  onChange={() => change({ [q.field]: value } as Partial<Draft>)}
                  className="peer sr-only"
                />
                <span className="block cursor-pointer rounded-lg border border-line bg-surface px-3.5 py-2 text-sm transition peer-checked:border-accent peer-checked:bg-accent-soft peer-checked:font-medium peer-checked:text-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent hover:border-accent/50">
                  {label}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}

      <fieldset>
        <legend className="mb-3 font-medium">Does either of these apply?</legend>
        <div className="space-y-2">
          {(["cii", "sii"] as const).map(field => (
            <label key={field} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft[field]}
                onChange={e => change({ [field]: e.target.checked })}
                className="size-4 accent-[var(--accent)]"
              />
              The system is {field.toUpperCase()}
            </label>
          ))}
        </div>
      </fieldset>

      <button
        type="submit"
        disabled={!complete}
        className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Work out my app type
      </button>

      {shown && <Outcome answers={shown.answers} result={shown.result} />}
    </form>
  );
}

function Outcome({ answers, result }: { answers: RiskAnswers; result: RiskResult }) {
  const supported = result.profileId !== null;
  return (
    <section
      aria-live="polite"
      className={`rounded-xl border p-5 ${supported ? "border-emerald-300 bg-emerald-50" : "border-amber-300 bg-amber-50"}`}
    >
      <h2 className="text-lg font-semibold">{result.appType}</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
        {result.reasons.map(r => (
          <li key={r}>{r}</li>
        ))}
      </ul>
      <p className="mt-3 text-sm text-muted">
        Based on{" "}
        <a href={RISK_SOURCE_URL} target="_blank" rel="noreferrer" className="underline">
          GovTech&apos;s risk materiality levels
        </a>
        .
      </p>
      {supported ? (
        <Link
          href={`/plan?${planQuery(answers, [])}`}
          className="mt-4 inline-block rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white hover:opacity-90"
        >
          See your build plan
        </Link>
      ) : (
        <p className="mt-4 text-sm font-medium">We don&apos;t support this type of app yet.</p>
      )}
    </section>
  );
}
