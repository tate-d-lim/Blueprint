"use client";

import { useState } from "react";
import { Button } from "@/app/ui/button";
import { Disclosure } from "@/app/ui/disclosure";

type Classification = "confidential" | "confidential-cloud-eligible" | "restricted" | "official-closed" | "official-open";

/**
 * The decision tree from appCentral's guide "Assess Risk Materiality Level (RML)": 4 yes-or-no questions, from the
 * worst harm to the least. The first Yes gives the classification; 4 No answers give Official (Open).
 */
const TREE: { question: string; yes: Classification }[] = [
  { question: "Would a leak cause some damage to the nation?", yes: "confidential" },
  { question: "Would a leak cause serious damage to CPFB?", yes: "confidential-cloud-eligible" },
  { question: "Would a leak cause some damage to CPFB?", yes: "restricted" },
  { question: "Is the data unsuitable, or not useful, to make public?", yes: "official-closed" },
];

/** "Help me choose": asks the tree's questions one at a time, then chooses the answer in the question above it. */
export function ClassificationHelper({ labels, onPick }: { labels: Readonly<Record<string, string>>; onPick: (value: Classification) => void }) {
  const [at, setAt] = useState(0);
  const [result, setResult] = useState<Classification | null>(null);

  const pick = (value: Classification) => {
    setResult(value);
    onPick(value);
  };
  const restart = () => {
    setAt(0);
    setResult(null);
  };

  return (
    <div className="mt-4 rounded-sm border border-rule bg-paper px-3">
      <Disclosure summary={<span className="text-body font-medium">Help me choose</span>}>
        <div aria-live="polite" className="flex flex-col gap-3">
          {result ? (
            <>
              <p className="text-body">
                Your answer is <span className="font-semibold">{labels[result]}</span>. It is now chosen above.
              </p>
              <div>
                <Button variant="secondary" size="sm" onClick={restart}>
                  Start again
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="tnum text-small text-ink-soft">
                Question {at + 1} of {TREE.length}
              </p>
              <p className="text-body font-medium">{TREE[at].question}</p>
              <div className="flex gap-3">
                <Button variant="secondary" size="sm" onClick={() => pick(TREE[at].yes)}>
                  Yes
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => (at + 1 < TREE.length ? setAt(at + 1) : pick("official-open"))}
                >
                  No
                </Button>
                {at > 0 && (
                  <Button variant="quiet" size="sm" onClick={restart}>
                    Start again
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </Disclosure>
    </div>
  );
}
