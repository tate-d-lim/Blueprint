"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { setProjectToolsAction, setQuestionAnswerAction, setTaskStatusAction } from "@/app/projects/actions";
import { Button, TextLink } from "@/app/ui/button";
import { Disclosure } from "@/app/ui/disclosure";
import { Note } from "@/app/ui/note";
import { PageHeader, SectionHeading } from "@/app/ui/panel";
import { Segmented } from "@/app/ui/segmented";
import { Tag } from "@/app/ui/stamp";
import type { FactAnswers, Project, TaskStatus } from "@/lib/domain/types";
import { buildPlan, type Heading, type PlanData, type PlanItem, type ProjectOverlay } from "@/lib/plan/engine";
import { floorPlanRooms, roomName } from "@/lib/plan/floor-plan";
import { HEADING_TITLES, STATUS_LABEL } from "@/lib/plan/labels";
import { planProgress, taskStatusOf } from "@/lib/plan/progress";
import { runSave, type SaveOutcome } from "@/lib/plan/save";
import { selectPlanInput } from "@/lib/plan/select";
import { parsePlanQuery, planQuery } from "@/lib/plan/url-state";
import { versionVerification, type Verification } from "@/lib/plan/verification";
import { assessRisk, type RiskAnswers } from "@/lib/risk/assess";
import { ExportDialog } from "./export-dialog";
import { FloorPlan } from "./floor-plan";
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
  skipped: "Your answers about the app rule these out. If an answer is wrong, change it and they come back.",
  "good-to-have": "Optional extras, worth doing once the basics are done.",
};

export function PlanView({
  data,
  answers,
  initialToolIds,
  facts,
  project,
}: {
  data: PlanData;
  answers: RiskAnswers;
  initialToolIds: string[];
  facts: FactAnswers;
  project?: Project;
}) {
  // The page's own props can be a stale copy when the browser restores it with Back, so an unsaved plan
  // takes its picks from the live address bar, which the toggles below keep up to date.
  const params = useSearchParams();
  const [toolIds, setToolIds] = useState(() =>
    project ? initialToolIds : (parsePlanQuery(Object.fromEntries(params), data.tools.map(t => t._id))?.toolIds ?? initialToolIds),
  );
  // The chosen room lives in the address bar, so Back returns to the previous room and the view can be shared.
  const room = params.get("room");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [detailKey, setDetailKey] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [taskFilter, setTaskFilter] = useState<TaskStatus | "all">("all");
  const [overlay, setOverlay] = useState<ProjectOverlay | undefined>(
    project && { taskStatus: project.taskStatus, questionAnswers: project.questionAnswers },
  );

  const plan = useMemo(
    () => buildPlan(selectPlanInput(data, { profileId: PROFILE_ID, toolIds, facts }, overlay)),
    [data, toolIds, facts, overlay],
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

  const withRoom = (path: string, family: string | null) => {
    const url = new URL(path, window.location.origin);
    if (family) url.searchParams.set("room", family);
    else url.searchParams.delete("room");
    return `${url.pathname}${url.search}`;
  };
  const selectRoom = (family: string | null) => window.history.pushState(null, "", withRoom(window.location.href, family));

  const toggle = (id: string) => {
    const previous = toolIds;
    const next = toolIds.includes(id) ? toolIds.filter(t => t !== id) : [...toolIds, id];
    setToolIds(next);
    if (project) void save(() => setProjectToolsAction(project._id, next), () => setToolIds(previous));
    else window.history.replaceState(null, "", withRoom(`/plan?${planQuery(answers, next, facts)}`, room));
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
  const query = project ? `project=${encodeURIComponent(project._id)}` : planQuery(answers, toolIds, facts);
  const inRoom = (i: PlanItem) => !room || i.family === room;
  const byHeading = (h: Heading) => plan.items.filter(i => i.heading === h && inRoom(i));
  const progress = planProgress(plan.items);
  const rooms = floorPlanRooms(plan.items);
  const tasks = byHeading("you");
  const shownTasks = tasks.filter(i => taskFilter === "all" || taskStatusOf(i) === taskFilter);
  const platformGroups = groupPlatform(byHeading("platform"));
  const platformCount = platformGroups.reduce((n, g) => n + g.items.length, 0);
  const questions = byHeading("questions");
  const skipped = byHeading("skipped");
  const extras = byHeading("good-to-have");
  const emptyInRoom = room ? `Nothing here for ${roomName(room)}.` : "Nothing here.";
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

      <PageHeader
        title="Your build plan"
        actions={
          <>
            <ExportDialog query={query} />
            {!project && <SaveDialog answers={answers} toolIds={toolIds} facts={facts} />}
          </>
        }
      >
        {assessRisk(answers).appType}. <TextLink href="/start">Change your answers</TextLink>
      </PageHeader>

      <div className="grid grid-cols-[minmax(0,5fr)_minmax(0,4fr)] items-start gap-8">
        <div className="flex min-w-0 flex-col gap-6">
          <ToolHints tools={data.tools} hints={plan.hints} onToggle={toggle} />
          <FloorPlan rooms={rooms} selected={room} onSelect={selectRoom} progress={project ? progress : undefined} />
          <ToolPicker tools={data.tools} picked={toolIds} verification={verification} onToggle={toggle} />
        </div>

        {/* The inspector: the lists for the room chosen on the plan, or for every room. */}
        <aside
          aria-label="Requirements"
          className="sticky top-6 flex max-h-[calc(100vh-48px)] min-h-0 min-w-0 flex-col rounded-sm border border-ink bg-paper"
        >
          <div className="flex flex-col gap-1 border-b border-ink px-5 py-3">
            <h2 className="text-title font-semibold">{room ? roomName(room) : "All rooms"}</h2>
            <p className="tnum text-small text-ink-soft">
              {tasks.length} to build, {platformCount} built by your tools, {questions.length} to answer
            </p>
          </div>
          <div className="flex min-h-0 flex-col gap-10 overflow-y-auto px-5 py-5">
            <Section heading="you" count={tasks.length}>
              {project && <TaskFilter tasks={tasks} value={taskFilter} onChange={setTaskFilter} />}
              {shownTasks.length === 0 ? (
                <p className="text-ink-soft">
                  {taskFilter === "all" ? emptyInRoom : `No tasks are ${STATUS_LABEL[taskFilter].toLowerCase()} here right now.`}
                </p>
              ) : (
                <ul className={SCHEDULE}>{shownTasks.map(i => view(i))}</ul>
              )}
            </Section>

            <Section heading="platform" count={platformCount}>
              {platformGroups.length === 0 ? (
                <p className="text-ink-soft">{emptyInRoom}</p>
              ) : (
                <div className="rounded-sm border border-rule bg-paper px-4">
                  {platformGroups.map(g => (
                    <Disclosure
                      key={g.title}
                      summary={<span className=" text-lead font-semibold">{g.title}</span>}
                      aside={<Tag>{g.items.length}</Tag>}
                    >
                      <ul className="flex flex-col">{g.items.map(i => view(i, true))}</ul>
                    </Disclosure>
                  ))}
                </div>
              )}
            </Section>

            <Section heading="questions" count={questions.length}>
              {questions.length === 0 ? <p className="text-ink-soft">{emptyInRoom}</p> : <ul className={SCHEDULE}>{questions.map(i => view(i))}</ul>}
            </Section>

            {(skipped.length > 0 || !room) && (
              <Section heading="skipped" count={skipped.length}>
                {skipped.length === 0 ? (
                  <p className="text-ink-soft">{emptyInRoom}</p>
                ) : (
                  <div className="rounded-sm border border-rule bg-paper px-4">
                    <Disclosure summary={<span className=" text-lead font-semibold">Show all {skipped.length}</span>}>
                      <ul className="flex flex-col">{skipped.map(i => view(i, true))}</ul>
                    </Disclosure>
                  </div>
                )}
              </Section>
            )}

            <Section heading="good-to-have" count={extras.length}>
              {extras.length === 0 ? (
                <p className="text-ink-soft">{emptyInRoom}</p>
              ) : (
                <div className="rounded-sm border border-rule bg-paper px-4">
                  <Disclosure summary={<span className=" text-lead font-semibold">Show all {extras.length}</span>}>
                    <ul className="flex flex-col">{extras.map(i => view(i, true))}</ul>
                  </Disclosure>
                </div>
              )}
            </Section>
          </div>
        </aside>
      </div>

      {detailItem && (
        <ItemDetail item={detailItem} entry={entries.get(detailItem.key)} open={detailOpen} onClose={() => setDetailOpen(false)} />
      )}
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
