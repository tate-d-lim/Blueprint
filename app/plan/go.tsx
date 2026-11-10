"use client";

import Link from "next/link";
import { useState } from "react";
import { Hotel } from "@/app/hotel/hotel";
import { PartCard } from "@/app/hotel/part-card";
import { DownloadButton } from "@/app/ui/button";
import { Disclosure } from "@/app/ui/disclosure";
import type { Project } from "@/lib/domain/types";
import { planTotals, type PartId, type PartState } from "@/lib/plan/hotel";
import type { Plan } from "@/lib/plan/engine";
import { startQuery } from "@/lib/plan/url-state";
import { AgentSnippet } from "./agent-snippet";
import { ExportDialog } from "./export-dialog";

/**
 * The top of the plan page: the go in one sentence, the three counts and the main action in a band, and under it the
 * hotel in its final look at the full width of the page. Pointing at a part or its label shows that part and a card.
 */
export function Go({ plan, parts, project, profileTitle, toolNames }: { plan: Plan; parts: PartState[]; project: Project; profileTitle: string; toolNames: string[] }) {
  const totals = planTotals(plan);
  const [selected, setSelected] = useState<PartId | null>(null);
  return (
    <section aria-label="Your plan" className="flex flex-col gap-6 border-b border-rule pb-8">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-10 gap-y-4">
        <div className="flex min-w-0 flex-col gap-3">
          <h1 className="wide text-heading font-semibold">
            Your plan is ready. {totals.you} are yours, and your tools do {totals.platform}.
          </h1>
          <ul className="tnum flex flex-wrap gap-x-6 gap-y-1 text-lead">
            <li>{totals.you} yours</li>
            <li>
              {totals.platform} your tools do{totals.unverified > 0 ? ` (${totals.unverified} not yet verified)` : ""}
            </li>
            <li>{totals.questions} questions to answer first</li>
          </ul>
          <p className="text-body text-ink-soft">
            {profileTitle} · {toolNames.length ? toolNames.join(", ") : "No tools"} ·{" "}
            <Link href={`/start/needs?${startQuery(project.riskAnswers, project.facts ?? {}, project._id)}`} className="font-medium text-ink underline">
              Change answers
            </Link>{" "}
            ·{" "}
            <Link href={`/projects/${project._id}/tools`} className="font-medium text-ink underline">
              Change tools
            </Link>
          </p>
        </div>
        <div className="flex max-w-[420px] flex-col items-end gap-3">
          <div className="flex flex-wrap items-center justify-end gap-3">
            <DownloadButton href={`/api/export/build-plan?project=${encodeURIComponent(project._id)}`}>Give your agent the build plan</DownloadButton>
            <ExportDialog query={`project=${encodeURIComponent(project._id)}`} />
          </div>
          <Disclosure summary={<span className="text-body font-semibold">Help your agent find the plan</span>}>
            <AgentSnippet />
          </Disclosure>
        </div>
      </div>

      <div className="flex h-[clamp(480px,70vh,720px)] min-w-0 flex-col">
        <Hotel parts={parts} selected={selected} onSelect={setSelected} interactive card={<PartCard id={selected} parts={parts} />} />
        {/* The labels on the picture are for the eye; this list is for screen readers. */}
        <ul aria-label="Parts of your app" className="sr-only">
          {parts.map(p => (
            <li key={p.id}>
              {p.line1}. {p.line2}.
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
