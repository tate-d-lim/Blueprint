"use client";

import Link from "next/link";
import { Hotel } from "@/app/hotel/hotel";
import { DownloadButton } from "@/app/ui/button";
import { Disclosure } from "@/app/ui/disclosure";
import type { Project } from "@/lib/domain/types";
import { planTotals, type PartState } from "@/lib/plan/hotel";
import type { Plan } from "@/lib/plan/engine";
import { startQuery } from "@/lib/plan/url-state";
import { AgentSnippet } from "./agent-snippet";
import { ExportDialog } from "./export-dialog";

/** The top of the plan page: the hotel in its final look, the go in one sentence, the three counts and the main action. */
export function Go({ plan, parts, project, profileTitle, toolNames }: { plan: Plan; parts: PartState[]; project: Project; profileTitle: string; toolNames: string[] }) {
  const totals = planTotals(plan);
  return (
    <section aria-label="Your plan" className="grid grid-cols-[3fr_2fr] gap-8 border-b border-rule pb-8">
      <div className="flex h-[460px] min-w-0 flex-col">
        <Hotel parts={parts} selected={null} onSelect={() => {}} interactive={false} />
        {/* The labels on the picture are for the eye; this list is for screen readers. */}
        <ul aria-label="Parts of your app" className="sr-only">
          {parts.map(p => (
            <li key={p.id}>
              {p.line1}. {p.line2}.
            </li>
          ))}
        </ul>
      </div>

      <div className="flex min-w-0 flex-col gap-6">
        <h1 className="wide text-heading font-semibold">
          Your plan is ready. {totals.you} are yours, and your tools do {totals.platform}.
        </h1>
        <ul className="tnum flex flex-col gap-1 text-lead">
          <li>{totals.you} yours</li>
          <li>
            {totals.platform} your tools do{totals.unverified > 0 ? ` (${totals.unverified} not yet verified)` : ""}
          </li>
          <li>{totals.questions} questions to answer first</li>
        </ul>
        <p className="text-body text-ink-soft">
          {profileTitle} · {toolNames.length ? toolNames.join(", ") : "No tools"}
          <br />
          <Link href={`/start/needs?${startQuery(project.riskAnswers, project.facts ?? {}, project._id)}`} className="font-medium text-ink underline">
            Change answers
          </Link>{" "}
          ·{" "}
          <Link href={`/projects/${project._id}/tools`} className="font-medium text-ink underline">
            Change tools
          </Link>
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <DownloadButton href={`/api/export/build-plan?project=${encodeURIComponent(project._id)}`}>Give your agent the build plan</DownloadButton>
          <ExportDialog query={`project=${encodeURIComponent(project._id)}`} />
        </div>
        <Disclosure summary={<span className="text-body font-semibold">Help your agent find the plan</span>}>
          <AgentSnippet />
        </Disclosure>
      </div>
    </section>
  );
}
