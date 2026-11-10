"use client";

import { useMemo, useState } from "react";
import { setQuestionAnswerAction, setTaskStatusAction } from "@/app/projects/actions";
import { Button } from "@/app/ui/button";
import { Disclosure } from "@/app/ui/disclosure";
import { Note } from "@/app/ui/note";
import { SectionHeading } from "@/app/ui/panel";
import { Segmented } from "@/app/ui/segmented";
import { Tag } from "@/app/ui/stamp";
import type { Project, TaskStatus } from "@/lib/domain/types";
import { buildPlan, type Heading, type PlanData, type PlanItem, type ProjectOverlay } from "@/lib/plan/engine";
import { partState, visibleParts } from "@/lib/plan/hotel";
import { HEADING_TITLES, STATUS_LABEL } from "@/lib/plan/labels";
import { planProgress, taskStatusOf } from "@/lib/plan/progress";
import { runSave, type SaveOutcome } from "@/lib/plan/save";
import { selectPlanInput } from "@/lib/plan/select";
import { Go } from "./go";
import type { ItemControls } from "./item-controls";
import { ItemDetail } from "./item-detail";
import { PlanItemView } from "./plan-item";

const BLURB: Record<Heading, string> = {
  you: "These are yours. Each one says why it matters.",
  platform: "Your tools do these. You don't need to do them again.",
  questions: "We can't tell from your tools. Check these with the right person.",
  skipped: "Your answers about the app rule these out. If an answer is wrong, change it and they come back.",
  "good-to-have": "Optional extras, worth doing once the basics are done.",
};

export function PlanView({ data, project, profileId }: { data: PlanData; project: Project; profileId: string }) {
  const [saveError, setSaveError] = useState<string | null>(null);
  const [detailKey, setDetailKey] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [taskFilter, setTaskFilter] = useState<TaskStatus | "all">("all");
  const [overlay, setOverlay] = useState<ProjectOverlay>({ taskStatus: project.taskStatus, questionAnswers: project.questionAnswers });
  const facts = useMemo(() => project.facts ?? {}, [project]);

  const plan = useMemo(
    () => buildPlan(selectPlanInput(data, { profileId, toolIds: project.toolIds, facts }, overlay)),
    [data, profileId, project.toolIds, facts, overlay],
  );
  // Cloud profiles share requirement keys, so only the profiles this plan is built from may speak.
  const entries = useMemo(() => {
    const active = new Set(plan.items.map(i => i.profileId));
    return new Map(data.profiles.filter(p => active.has(p._id)).flatMap(p => p.entries.map(e => [e.key, e] as const)));
  }, [data, plan]);
  const parts = useMemo(() => visibleParts(plan).map(p => partState(p, plan, "tools")), [plan]);
  const profileTitle = data.profiles.find(p => p._id === profileId)?.title ?? "";
  const toolNames = data.tools.filter(t => project.toolIds.includes(t._id)).map(t => t.name);

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

  const controls: ItemControls = {
    onStatus: (key, value) => {
      const previous = overlay;
      setOverlay(o => ({ ...o, taskStatus: { ...o.taskStatus, [key]: value } }));
      void save(() => setTaskStatusAction(project._id, key, value), () => setOverlay(previous));
    },
    onAnswer: (key, answer) => {
      const previous = overlay;
      setOverlay(o => {
        const questionAnswers = { ...o.questionAnswers };
        if (answer) questionAnswers[key] = answer;
        else delete questionAnswers[key];
        return { ...o, questionAnswers };
      });
      void save(() => setQuestionAnswerAction(project._id, key, answer), () => setOverlay(previous));
    },
  };

  const detailItem = detailKey ? plan.items.find(i => i.key === detailKey) : undefined;
  const byHeading = (h: Heading) => plan.items.filter(i => i.heading === h);
  const progress = planProgress(plan.items);
  const tasks = byHeading("you");
  const shownTasks = tasks.filter(i => taskFilter === "all" || taskStatusOf(i) === taskFilter);
  const platformGroups = groupPlatform(byHeading("platform"));
  const platformCount = platformGroups.reduce((n, g) => n + g.items.length, 0);
  const questions = byHeading("questions");
  const skipped = byHeading("skipped");
  const extras = byHeading("good-to-have");
  const view = (item: PlanItem, compact = false) => (
    <PlanItemView
      key={`${item.profileId}:${item.key}`}
      item={item}
      entry={entries.get(item.key)}
      compact={compact}
      controls={controls}
      onOpen={() => {
        setDetailKey(item.key);
        setDetailOpen(true);
      }}
    />
  );

  return (
    <div className="flex flex-col gap-8">
      {saveError && (
        <Note
          tone="error"
          action={
            <Button size="sm" variant="secondary" onClick={() => setSaveError(null)}>
              Dismiss
            </Button>
          }
        >
          {saveError}
        </Note>
      )}

      <Go plan={plan} parts={parts} project={project} profileTitle={profileTitle} toolNames={toolNames} />

      <div className="flex max-w-page flex-col gap-10">
        <div className="flex flex-col gap-1">
          <h2 className="tnum text-heading font-semibold">
            {progress.tasks.done} of {progress.tasks.total} tasks done
          </h2>
          <p className="text-body text-ink-soft">
            {progress.tasks.inProgress} in progress, {progress.tasks.todo} to do.{" "}
            {progress.questions.answered === progress.questions.total
              ? `All ${progress.questions.total} questions answered.`
              : `${progress.questions.answered} of ${progress.questions.total} questions answered.`}
          </p>
        </div>

        <Section heading="you" count={tasks.length}>
          <TaskFilter tasks={tasks} value={taskFilter} onChange={setTaskFilter} />
          {shownTasks.length === 0 ? (
            <p className="text-ink-soft">{taskFilter === "all" ? "Nothing here." : `No tasks are ${STATUS_LABEL[taskFilter].toLowerCase()} right now.`}</p>
          ) : (
            <ul className={SCHEDULE}>{shownTasks.map(i => view(i))}</ul>
          )}
        </Section>

        <Section heading="platform" count={platformCount}>
          {platformGroups.length === 0 ? (
            <p className="text-ink-soft">Nothing here.</p>
          ) : (
            <div className="rounded-sm border border-rule bg-paper px-4">
              {platformGroups.map(g => (
                <Disclosure key={g.title} summary={<span className="text-lead font-semibold">{g.title}</span>} aside={<Tag>{g.items.length}</Tag>}>
                  <ul className="flex flex-col">{g.items.map(i => view(i, true))}</ul>
                </Disclosure>
              ))}
            </div>
          )}
        </Section>

        <Section heading="questions" count={questions.length}>
          {questions.length === 0 ? <p className="text-ink-soft">Nothing here.</p> : <ul className={SCHEDULE}>{questions.map(i => view(i))}</ul>}
        </Section>

        <Section heading="skipped" count={skipped.length}>
          {skipped.length === 0 ? (
            <p className="text-ink-soft">Nothing here.</p>
          ) : (
            <div className="rounded-sm border border-rule bg-paper px-4">
              <Disclosure summary={<span className="text-lead font-semibold">Show all {skipped.length}</span>}>
                <ul className="flex flex-col">{skipped.map(i => view(i, true))}</ul>
              </Disclosure>
            </div>
          )}
        </Section>

        <Section heading="good-to-have" count={extras.length}>
          {extras.length === 0 ? (
            <p className="text-ink-soft">Nothing here.</p>
          ) : (
            <div className="rounded-sm border border-rule bg-paper px-4">
              <Disclosure summary={<span className="text-lead font-semibold">Show all {extras.length}</span>}>
                <ul className="flex flex-col">{extras.map(i => view(i, true))}</ul>
              </Disclosure>
            </div>
          )}
        </Section>
      </div>

      {detailItem && <ItemDetail item={detailItem} entry={entries.get(detailItem.key)} open={detailOpen} onClose={() => setDetailOpen(false)} />}
    </div>
  );
}

/** Every section is one ruled list, with a 1px rule between its items. */
const SCHEDULE = "flex flex-col divide-y divide-rule rounded-sm border border-rule bg-paper";

const FILTERS: (TaskStatus | "all")[] = ["all", "todo", "in-progress", "done"];

/** All / To do / In progress / Done, each with its count, for a saved project's task list. */
function TaskFilter({ tasks, value, onChange }: { tasks: PlanItem[]; value: TaskStatus | "all"; onChange: (value: TaskStatus | "all") => void }) {
  const count = (f: TaskStatus | "all") => (f === "all" ? tasks.length : tasks.filter(t => taskStatusOf(t) === f).length);
  return (
    <Segmented
      label="Show tasks"
      value={value}
      options={FILTERS.map(f => ({ value: f, label: `${f === "all" ? "All" : STATUS_LABEL[f]} (${count(f)})` }))}
      onChange={onChange}
    />
  );
}

function Section({ heading, count, children }: { heading: Heading; count: number; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <SectionHeading title={HEADING_TITLES[heading]} count={count}>
        {BLURB[heading]}
      </SectionHeading>
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
