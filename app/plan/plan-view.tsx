"use client";

import { SgdsAccordion, SgdsAccordionItem, SgdsAlert, SgdsBadge, SgdsButton, SgdsLink } from "@govtechsg/sgds-web-component/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import type { Project } from "@/lib/domain/types";
import { setProjectToolsAction, setQuestionAnswerAction, setTaskStatusAction } from "@/app/projects/actions";
import { buildPlan, type Heading, type PlanData, type PlanItem, type ProjectOverlay } from "@/lib/plan/engine";
import { HEADING_TITLES } from "@/lib/plan/labels";
import { runSave, type SaveOutcome } from "@/lib/plan/save";
import { selectPlanInput } from "@/lib/plan/select";
import { parsePlanQuery, planQuery } from "@/lib/plan/url-state";
import { versionVerification, type Verification } from "@/lib/plan/verification";
import { assessRisk, type RiskAnswers } from "@/lib/risk/assess";
import { AgentSnippetItem } from "./agent-snippet";
import type { ItemControls } from "./item-controls";
import { ItemDetail } from "./item-detail";
import { PlanItemView } from "./plan-item";
import { SaveDialog } from "./save-dialog";
import { ToolHints, ToolPicker } from "./tool-picker";

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
  // The page's own props can be a stale copy when the browser restores it with Back, so an unsaved plan
  // takes its picks from the live address bar, which the toggles below keep up to date.
  const params = useSearchParams();
  const [toolIds, setToolIds] = useState(() =>
    project ? initialToolIds : (parsePlanQuery(Object.fromEntries(params), data.tools.map(t => t._id))?.toolIds ?? initialToolIds),
  );
  const [saveError, setSaveError] = useState<string | null>(null);
  const [detailKey, setDetailKey] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
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

  /** Saves in the background; if it fails, undoes the change on screen and says so. */
  const save = async (action: () => Promise<SaveOutcome>, rollback: () => void) => {
    const error = await runSave(action);
    if (error) {
      rollback();
      setSaveError(error);
    } else {
      setSaveError(null);
    }
  };

  const toggle = (id: string) => {
    const previous = toolIds;
    const next = toolIds.includes(id) ? toolIds.filter(t => t !== id) : [...toolIds, id];
    setToolIds(next);
    if (project) void save(() => setProjectToolsAction(project._id, next), () => setToolIds(previous));
    else window.history.replaceState(null, "", `/plan?${planQuery(answers, next)}`);
  };

  const controls: ItemControls | undefined = project && {
    onStatus: (key, value) => {
      const previous = overlay;
      setOverlay(o => o && { ...o, taskStatus: { ...o.taskStatus, [key]: value } });
      void save(() => setTaskStatusAction(project._id, key, value), () => setOverlay(previous));
    },
    onAnswer: (key, answer) => {
      const previous = overlay;
      setOverlay(o => {
        if (!o) return o;
        const questionAnswers = { ...o.questionAnswers };
        if (answer) questionAnswers[key] = answer;
        else delete questionAnswers[key];
        return { ...o, questionAnswers };
      });
      void save(() => setQuestionAnswerAction(project._id, key, answer), () => setOverlay(previous));
    },
  };

  const detailItem = detailKey ? plan.items.find(i => i.key === detailKey) : undefined;
  const query = project ? `project=${encodeURIComponent(project._id)}` : planQuery(answers, toolIds);
  const byHeading = (h: Heading) => plan.items.filter(i => i.heading === h);
  const platformGroups = groupPlatform(byHeading("platform"));
  const view = (item: PlanItem, compact = false) => (
    <PlanItemView key={`${item.profileId}:${item.key}`} item={item} entry={entries.get(item.key)} compact={compact} controls={controls} onOpen={() => {
        setDetailKey(item.key);
        setDetailOpen(true);
      }} />
  );

  return (
    <div className="sgds:grid sgds:gap-layout-md sgds:lg:grid-cols-[20rem_1fr] sgds:lg:grid-rows-[auto_1fr]">
      {/* The page title and downloads come first on every screen size; on wide screens the picker sits beside them. */}
      <div className="sgds:flex sgds:min-w-0 sgds:flex-col sgds:gap-sm sgds:lg:col-start-2 sgds:lg:row-start-1">
        {saveError && (
          <SgdsAlert show outlined dismissible variant="danger" onSgdsHide={() => setSaveError(null)}>
            {saveError}
          </SgdsAlert>
        )}
        <div className="sgds:flex sgds:flex-col sgds:gap-text-xs">
          <h1 className="sgds:text-heading-lg sgds:font-semibold">Your build plan</h1>
          <p className="sgds:text-body-lg sgds:text-subtle">
            {assessRisk(answers).appType}.{" "}
            <SgdsLink>
              <Link href="/start" suppressHydrationWarning>
                Change your answers
              </Link>
            </SgdsLink>
          </p>
        </div>
        <div className="sgds:flex sgds:flex-wrap sgds:gap-sm">
          <SgdsButton href={`/api/export/build-plan?${query}`}>Build plan for your agent</SgdsButton>
          <SgdsButton variant="outline" href={`/api/export/ssp?${query}`}>
            Security review spreadsheet
          </SgdsButton>
          {!project && <SaveDialog answers={answers} toolIds={toolIds} />}
        </div>
        <SgdsAccordion density="compact">
          <AgentSnippetItem />
          <SgdsAccordionItem>
            <span slot="header" className="sgds:text-body-md sgds:font-regular">
              For security reviewers: machine-readable files
            </span>
            <div slot="content" className="sgds:flex sgds:flex-wrap sgds:gap-sm">
              <SgdsLink>
                <a href={`/api/export/oscal?kind=ssp&${query}`} suppressHydrationWarning>
                  Security plan (JSON)
                </a>
              </SgdsLink>
              <SgdsLink>
                <a href={`/api/export/oscal?kind=component-definition&${query}`} suppressHydrationWarning>
                  Tool coverage (JSON)
                </a>
              </SgdsLink>
            </div>
          </SgdsAccordionItem>
        </SgdsAccordion>
      </div>

      <aside className="sgds:lg:col-start-1 sgds:lg:row-span-2 sgds:lg:row-start-1 sgds:lg:sticky sgds:lg:top-layout-sm sgds:lg:max-h-[calc(100vh-6rem)] sgds:lg:self-start sgds:lg:overflow-y-auto">
        <div className="sgds:flex sgds:flex-col sgds:gap-sm">
          <ToolHints tools={data.tools} hints={plan.hints} onToggle={toggle} />
          <div className="sgds:hidden sgds:lg:block">
            <ToolPicker tools={data.tools} picked={toolIds} verification={verification} onToggle={toggle} />
          </div>
          <div className="sgds:lg:hidden">
            <ToolPicker collapsed tools={data.tools} picked={toolIds} verification={verification} onToggle={toggle} />
          </div>
        </div>
      </aside>

      <div className="sgds:flex sgds:min-w-0 sgds:flex-col sgds:gap-layout-lg sgds:lg:col-start-2 sgds:lg:row-start-2">
        <Section heading="you" count={plan.counts.you}>
          <ul className="sgds:flex sgds:flex-col sgds:gap-sm">{byHeading("you").map(i => view(i))}</ul>
        </Section>

        <Section heading="platform" count={plan.counts.platform}>
          <SgdsAccordion allowMultiple>
            {platformGroups.map(g => (
              <SgdsAccordionItem key={g.title}>
                <span slot="header">{g.title}</span>
                <SgdsBadge slot="badge" show variant="neutral">
                  {g.items.length}
                </SgdsBadge>
                <ul slot="content" className="sgds:flex sgds:flex-col">
                  {g.items.map(i => view(i, true))}
                </ul>
              </SgdsAccordionItem>
            ))}
          </SgdsAccordion>
        </Section>

        <Section heading="questions" count={plan.counts.questions}>
          <ul className="sgds:flex sgds:flex-col sgds:gap-sm">{byHeading("questions").map(i => view(i))}</ul>
        </Section>

        <Section heading="good-to-have" count={plan.counts["good-to-have"]}>
          <SgdsAccordion>
            <SgdsAccordionItem>
              <span slot="header">Show all {plan.counts["good-to-have"]}</span>
              <ul slot="content" className="sgds:flex sgds:flex-col">
                {byHeading("good-to-have").map(i => view(i, true))}
              </ul>
            </SgdsAccordionItem>
          </SgdsAccordion>
        </Section>
      </div>
      {detailItem && (
        <ItemDetail item={detailItem} entry={entries.get(detailItem.key)} open={detailOpen} onClose={() => setDetailOpen(false)} />
      )}
    </div>
  );
}

function Section({ heading, count, children }: { heading: Heading; count: number; children: React.ReactNode }) {
  return (
    <section className="sgds:flex sgds:flex-col sgds:gap-sm">
      <div className="sgds:flex sgds:flex-col sgds:gap-text-xs">
        <div className="sgds:flex sgds:items-center sgds:gap-sm">
          <h2 className="sgds:text-heading-sm sgds:font-semibold">{HEADING_TITLES[heading]}</h2>
          <SgdsBadge show variant="primary">
            <span>{count}</span>
          </SgdsBadge>
        </div>
        <p className="sgds:text-body-md sgds:text-subtle">{BLURB[heading]}</p>
      </div>
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
