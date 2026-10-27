"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Project } from "@/lib/domain/types";
import { setProjectToolsAction, setQuestionAnswerAction, setTaskStatusAction } from "@/app/projects/actions";
import { buildPlan, type Heading, type PlanData, type PlanItem, type ProjectOverlay } from "@/lib/plan/engine";
import { HEADING_TITLES } from "@/lib/plan/labels";
import { selectPlanInput } from "@/lib/plan/select";
import { planQuery } from "@/lib/plan/url-state";
import { versionVerification, type Verification } from "@/lib/plan/verification";
import { assessRisk, type RiskAnswers } from "@/lib/risk/assess";
import { AgentSnippet } from "./agent-snippet";
import type { ItemControls } from "./item-controls";
import { PlanItemView } from "./plan-item";
import { SaveDialog } from "./save-dialog";
import { ToolPicker } from "./tool-picker";

const PROFILE_ID = "low-risk-cloud";

const BLURB: Record<Heading, string> = {
  you: "These are yours to build or arrange. Each one says why it matters.",
  platform: "Your tools already handle these. Don't build them again.",
  questions: "We can't tell from your tools. Check these with the right person before you build.",
  "good-to-have": "Optional extras, worth doing once the basics are done.",
};

export function PlanView({
  data,
  answers,
  initialToolIds,
  project,
}: {
  data: PlanData;
  answers: RiskAnswers;
  initialToolIds: string[];
  project?: Project;
}) {
  const [toolIds, setToolIds] = useState(initialToolIds);
  const [overlay, setOverlay] = useState<ProjectOverlay | undefined>(
    project && { taskStatus: project.taskStatus, questionAnswers: project.questionAnswers },
  );

  const plan = useMemo(
    () => buildPlan(selectPlanInput(data, { profileId: PROFILE_ID, toolIds }, overlay)),
    [data, toolIds, overlay],
  );
  const entries = useMemo(
    () => new Map(data.profiles.flatMap(p => p.entries.map(e => [e.key, e] as const))),
    [data],
  );
  const verification = useMemo(() => {
    const out: Record<string, Verification | null> = {};
    for (const tool of data.tools) {
      const pair = data.versions.find(v => v.current.toolId === tool._id && v.current.profileId === PROFILE_ID);
      out[tool._id] = pair ? versionVerification(pair) : null;
    }
    return out;
  }, [data]);

  const toggle = (id: string) => {
    const next = toolIds.includes(id) ? toolIds.filter(t => t !== id) : [...toolIds, id];
    setToolIds(next);
    if (project) void setProjectToolsAction(project._id, next);
    else window.history.replaceState(null, "", `/plan?${planQuery(answers, next)}`);
  };

  const controls: ItemControls | undefined = project && {
    onStatus: (key, value) => {
      setOverlay(o => o && { ...o, taskStatus: { ...o.taskStatus, [key]: value } });
      void setTaskStatusAction(project._id, key, value);
    },
    onAnswer: (key, answer) => {
      setOverlay(o => {
        if (!o) return o;
        const questionAnswers = { ...o.questionAnswers };
        if (answer) questionAnswers[key] = answer;
        else delete questionAnswers[key];
        return { ...o, questionAnswers };
      });
      void setQuestionAnswerAction(project._id, key, answer);
    },
  };

  const query = project ? `project=${encodeURIComponent(project._id)}` : planQuery(answers, toolIds);
  const byHeading = (h: Heading) => plan.items.filter(i => i.heading === h);
  const platformGroups = groupPlatform(byHeading("platform"));
  const view = (item: PlanItem, compact = false) => (
    <PlanItemView key={`${item.profileId}:${item.key}`} item={item} entry={entries.get(item.key)} compact={compact} controls={controls} />
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[19rem_1fr]">
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <ToolPicker tools={data.tools} picked={toolIds} verification={verification} hints={plan.hints} onToggle={toggle} />
      </aside>

      <div className="min-w-0 space-y-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Your build plan</h1>
            <p className="mt-1 text-muted">
              {assessRisk(answers).appType}.{" "}
              <Link href="/start" className="underline">
                Change your answers
              </Link>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={`/api/export/build-plan?${query}`}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Build plan for your agent
            </a>
            <a
              href={`/api/export/ssp?${query}`}
              className="rounded-lg border border-accent px-4 py-2 text-sm font-medium text-accent hover:bg-accent-soft"
            >
              Security review spreadsheet
            </a>
          </div>
          {!project && <SaveDialog answers={answers} toolIds={toolIds} />}
          <AgentSnippet />
        </div>

        <Section heading="you" count={plan.counts.you}>
          <ul className="space-y-3">{byHeading("you").map(i => view(i))}</ul>
        </Section>

        <Section heading="platform" count={plan.counts.platform}>
          <div className="space-y-3">
            {platformGroups.map(g => (
              <details key={g.title} className="rounded-lg border border-line bg-surface">
                <summary className="cursor-pointer px-4 py-3 font-medium">
                  {g.title} <span className="font-normal text-muted">· {g.items.length}</span>
                </summary>
                <ul className="space-y-2 border-t border-line p-3">{g.items.map(i => view(i, true))}</ul>
              </details>
            ))}
          </div>
        </Section>

        <Section heading="questions" count={plan.counts.questions}>
          <ul className="space-y-3">{byHeading("questions").map(i => view(i))}</ul>
        </Section>

        <Section heading="good-to-have" count={plan.counts["good-to-have"]}>
          <details className="rounded-lg border border-line bg-surface">
            <summary className="cursor-pointer px-4 py-3 font-medium">Show all {plan.counts["good-to-have"]}</summary>
            <ul className="space-y-2 border-t border-line p-3">{byHeading("good-to-have").map(i => view(i))}</ul>
          </details>
        </Section>
      </div>
    </div>
  );
}

function Section({ heading, count, children }: { heading: Heading; count: number; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-baseline gap-3">
        <h2 className="text-xl font-semibold tracking-tight">{HEADING_TITLES[heading]}</h2>
        <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-sm font-medium text-accent">{count}</span>
      </div>
      <p className="mb-3 text-sm text-muted">{BLURB[heading]}</p>
      {children}
    </section>
  );
}

/** Platform items grouped by the tool that handles them, then the ones that don't apply. */
function groupPlatform(items: PlanItem[]): { title: string; items: PlanItem[] }[] {
  const groups = new Map<string, PlanItem[]>();
  const notApplicable: PlanItem[] = [];
  for (const item of items) {
    if (item.placement === "not-applicable") {
      notApplicable.push(item);
      continue;
    }
    const title = item.decisive[0]?.toolName ?? "Other";
    groups.set(title, [...(groups.get(title) ?? []), item]);
  }
  const out = [...groups].map(([title, list]) => ({ title, items: list }));
  if (notApplicable.length) out.push({ title: "Doesn't apply because of your tools", items: notApplicable });
  return out;
}
