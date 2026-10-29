"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/app/ui/button";
import { Checkbox, RadioGroup } from "@/app/ui/field";
import { Panel } from "@/app/ui/panel";
import type { FactAnswers } from "@/lib/domain/types";
import { factsToAsk, type FactProfile } from "@/lib/plan/facts";
import { planQuery } from "@/lib/plan/url-state";
import type { RiskAnswers } from "@/lib/risk/assess";

export function AppForm({ risk, initial, profile }: { risk: RiskAnswers; initial: FactAnswers; profile: FactProfile }) {
  const router = useRouter();
  const [answers, setAnswers] = useState<FactAnswers>(initial);
  const shown = factsToAsk(profile, answers);
  const choices = shown.filter(f => f.kind === "choice");
  const ticks = shown.filter(f => f.kind === "tick");
  const unanswered = choices.filter(f => !answers[f.id]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (unanswered.length) return;
    // Only the questions that were on screen count. An unticked box is a "no".
    const final: FactAnswers = {};
    for (const fact of shown) final[fact.id] = answers[fact.id] ?? "no";
    router.push(`/start/review?${planQuery(risk, [], final)}`);
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <Panel>
        <div className="flex flex-col gap-8 py-2">
          {choices.map(fact =>
            fact.kind === "choice" ? (
              <RadioGroup
                key={fact.id}
                legend={fact.question}
                hint={fact.hint}
                name={fact.id}
                value={answers[fact.id]}
                options={Object.fromEntries(fact.options.map(o => [o.value, o.label]))}
                onChange={value => setAnswers(a => ({ ...a, [fact.id]: value }))}
              />
            ) : null,
          )}

          {ticks.length > 0 && (
            <fieldset className={`flex flex-col gap-4 ${choices.length ? "border-t border-rule pt-6" : ""}`}>
              <legend className="mb-1 font-display text-lead font-semibold text-ink">Tick everything that is true for your app</legend>
              {ticks.map(fact =>
                fact.kind === "tick" ? (
                  <Checkbox
                    key={fact.id}
                    name={fact.id}
                    label={fact.label}
                    hint={fact.hint}
                    checked={answers[fact.id] === "yes"}
                    onChange={e => setAnswers(a => ({ ...a, [fact.id]: e.target.checked ? "yes" : "no" }))}
                  />
                ) : null,
              )}
            </fieldset>
          )}

          <div className="flex flex-wrap items-center gap-4">
            <Button type="submit" disabled={unanswered.length > 0}>
              Next: how we read your app
            </Button>
            <Button type="button" variant="secondary" onClick={() => router.back()}>
              Back
            </Button>
            {unanswered.length > 0 && <span className="text-small text-ink-soft">Answer the first question to continue.</span>}
          </div>
        </div>
      </Panel>
    </form>
  );
}
