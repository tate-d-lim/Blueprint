"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/app/ui/button";
import { Checkbox, RadioGroup } from "@/app/ui/field";
import type { FactAnswers } from "@/lib/domain/types";
import { factsToAsk, type FactProfile } from "@/lib/plan/facts";
import { startQuery } from "@/lib/plan/url-state";
import { useUnsavedGuard } from "@/lib/plan/unsaved";
import type { RiskAnswers } from "@/lib/risk/assess";

export function AppForm({
  risk,
  initial,
  profile,
  projectId,
  dirty,
}: {
  risk: RiskAnswers;
  initial: FactAnswers;
  profile: FactProfile;
  projectId: string | null;
  /** Editing a saved project, and the answers differ from the saved ones. */
  dirty: boolean;
}) {
  const router = useRouter();
  useUnsavedGuard(dirty);
  const [answers, setAnswers] = useState<FactAnswers>(initial);
  // Keep the answers in the address as they change (replacing the history entry, not adding one), so Back from the
  // next step finds them again. Next restores a page from the data of its history entry, so the address alone is not
  // enough: the entry must be refetched with the new address.
  const update = (patch: FactAnswers) => {
    const next = { ...answers, ...patch };
    setAnswers(next);
    router.replace(`/start/app?${startQuery(risk, next, projectId ?? undefined)}`, { scroll: false });
  };
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
    router.push(`/start/needs?${startQuery(risk, final, projectId ?? undefined)}`);
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-8">
      <div className="flex flex-col divide-y divide-rule">
        {choices.map((fact, i) =>
          fact.kind === "choice" ? (
            <div key={fact.id} className={i === 0 ? "pb-8" : "py-8"}>
              <RadioGroup
                legend={fact.question}
                hint={fact.hint}
                name={fact.id}
                value={answers[fact.id]}
                options={Object.fromEntries(fact.options.map(o => [o.value, o.label]))}
                onChange={value => update({ [fact.id]: value })}
              />
            </div>
          ) : null,
        )}

        {ticks.length > 0 && (
          <fieldset className={`flex flex-col gap-4 ${choices.length ? "pt-8" : ""}`}>
            <legend className="mb-1 text-lead font-semibold text-ink">Tick everything that is true for your app</legend>
            {ticks.map(fact =>
              fact.kind === "tick" ? (
                <Checkbox
                  key={fact.id}
                  name={fact.id}
                  label={fact.label}
                  hint={fact.hint}
                  checked={answers[fact.id] === "yes"}
                  onChange={e => update({ [fact.id]: e.target.checked ? "yes" : "no" })}
                />
              ) : null,
            )}
          </fieldset>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={unanswered.length > 0}>
          Next: what your app needs
        </Button>
        {unanswered.length > 0 && <span className="text-small text-ink-soft">Answer the questions above to continue.</span>}
      </div>
    </form>
  );
}
