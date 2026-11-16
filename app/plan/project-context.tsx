"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { hideNextAction, markCatalogSeenAction, markHandedOffAction, setNoToolsAction, setProjectToolsAction, setQuestionAnswerAction, setTaskStatusAction } from "@/app/projects/actions";
import type { ProfileEntry, Project, ProjectNext, RequirementKey, TaskStatus } from "@/lib/domain/types";
import { projectNews, type ProjectNews } from "@/lib/catalog/news";
import { buildPlan, type Plan, type PlanData, type ProjectOverlay } from "@/lib/plan/engine";
import { partState, planTotals, visibleParts, type PartState } from "@/lib/plan/hotel";
import { runSave, type SaveOutcome } from "@/lib/plan/save";
import { selectPlanInput, unansweredFacts } from "@/lib/plan/select";

export interface ProjectValue {
  data: PlanData;
  project: Project;
  profileId: string;
  profileTitle: string;
  toolIds: string[];
  toolNames: string[];
  overlay: ProjectOverlay;
  plan: Plan;
  /** The official wording of every requirement in this plan, by key. */
  entries: Map<string, ProfileEntry>;
  /** The hotel's parts with progress: what the tools do and what the builder has done. */
  parts: PartState[];
  totals: ReturnType<typeof planTotals>;
  /** How many questions of step 3 this project has no answer for yet. */
  unansweredFacts: number;
  /** "Saved" for a moment after every save, so a tick is never silent. */
  saved: boolean;
  error: string | null;
  dismissError: () => void;
  setDone: (key: RequirementKey, done: boolean) => void;
  setNote: (key: RequirementKey, note: string) => void;
  answer: (key: RequirementKey, answer: { applies: boolean; reason: string } | null) => void;
  toggleTool: (toolId: string) => void;
  /** How far the builder is with the "Next" strip. */
  /** What changed in the IM8 catalog since the builder last read the notice, or null. */
  news: ProjectNews | null;
  /** The builder read the notice. It does not come back for the same releases. */
  dismissNews: () => void;
  next: ProjectNext;
  /** The tools drawer and the hand-off dialog open from the strip, the header and the checklist, so their state is here. */
  toolsOpen: boolean;
  setToolsOpen: (open: boolean) => void;
  handoffOpen: boolean;
  setHandoffOpen: (open: boolean) => void;
  /** Says the app uses no tools (or takes that back). */
  setNoTools: (value: boolean) => void;
  /** Records the first time the plan went to the agent. */
  markHandedOff: () => void;
  hideNext: () => void;
}

const Context = createContext<ProjectValue | null>(null);

export function useProject(): ProjectValue {
  const value = useContext(Context);
  if (!value) throw new Error("useProject needs a ProjectProvider");
  return value;
}

/**
 * The state of one saved project, shared by its tabs. A tick or a tool change shows on screen at once and is saved in
 * the background; if the save fails, the change is undone and the error says so.
 */
export function ProjectProvider({
  data,
  project,
  profileId,
  profileTitle,
  children,
}: {
  data: PlanData;
  project: Project;
  profileId: string;
  profileTitle: string;
  children: React.ReactNode;
}) {
  const [toolIds, setToolIds] = useState(project.toolIds);
  const [overlay, setOverlay] = useState<ProjectOverlay>({ taskStatus: project.taskStatus, questionAnswers: project.questionAnswers });
  const [next, setNext] = useState<ProjectNext>(project.next ?? {});
  const [catalogSeenAt, setCatalogSeenAt] = useState(project.catalogSeenAt);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [handoffOpen, setHandoffOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const facts = useMemo(() => project.facts ?? {}, [project]);
  const plan = useMemo(
    () => buildPlan(selectPlanInput(data, { profileId, toolIds, facts }, overlay)),
    [data, profileId, toolIds, facts, overlay],
  );
  // Cloud profiles share requirement keys, so only the profiles this plan is built from may speak.
  const entries = useMemo(() => {
    const active = new Set(plan.items.map(i => i.profileId));
    return new Map(data.profiles.filter(p => active.has(p._id)).flatMap(p => p.entries.map(e => [e.key, e] as const)));
  }, [data, plan]);
  const news = useMemo(
    () => projectNews({ createdAt: project.createdAt, catalogSeenAt }, [...new Set(plan.items.map(i => i.profileId))], data.releases ?? []),
    [project.createdAt, catalogSeenAt, plan, data.releases],
  );
  const unanswered = useMemo(() => unansweredFacts(data.profiles, profileId, facts).length, [data, profileId, facts]);
  const parts = useMemo(() => visibleParts(plan).map(p => partState(p, plan, "progress")), [plan]);
  const totals = useMemo(() => planTotals(plan), [plan]);
  const toolNames = useMemo(() => data.tools.filter(t => toolIds.includes(t._id)).map(t => t.name), [data, toolIds]);

  const save = useCallback(async (action: () => Promise<SaveOutcome>, rollback: () => void) => {
    const failed = await runSave(action);
    if (failed) {
      rollback();
      setError(failed);
      return;
    }
    setError(null);
    setSaved(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setSaved(false), 2000);
  }, []);

  const mark = useCallback(
    (key: RequirementKey, value: { status: TaskStatus; note?: string }) => {
      const previous = overlay;
      setOverlay(o => ({ ...o, taskStatus: { ...o.taskStatus, [key]: value } }));
      void save(() => setTaskStatusAction(project._id, key, value), () => setOverlay(previous));
    },
    [overlay, project._id, save],
  );
  const noteOf = (key: RequirementKey) => overlay.taskStatus[key]?.note;

  const value: ProjectValue = {
    data,
    project,
    profileId,
    profileTitle,
    toolIds,
    toolNames,
    overlay,
    plan,
    entries,
    parts,
    totals,
    unansweredFacts: unanswered,
    saved,
    error,
    dismissError: () => setError(null),
    setDone: (key, done) => mark(key, { status: done ? "done" : "todo", note: noteOf(key) }),
    setNote: (key, note) => mark(key, { status: overlay.taskStatus[key]?.status === "done" ? "done" : "todo", note }),
    answer: (key, answer) => {
      const previous = overlay;
      setOverlay(o => {
        const questionAnswers = { ...o.questionAnswers };
        if (answer) questionAnswers[key] = answer;
        else delete questionAnswers[key];
        return { ...o, questionAnswers };
      });
      void save(() => setQuestionAnswerAction(project._id, key, answer), () => setOverlay(previous));
    },
    news,
    dismissNews: () => {
      if (!news) return;
      const previous = catalogSeenAt;
      setCatalogSeenAt(news.latestAt);
      void save(() => markCatalogSeenAction(project._id, news.latestAt), () => setCatalogSeenAt(previous));
    },
    next,
    toolsOpen,
    setToolsOpen,
    handoffOpen,
    setHandoffOpen,
    setNoTools: noTools => {
      const previous = next;
      setNext(n => {
        const { noTools: _drop, ...rest } = n;
        void _drop;
        return noTools ? { ...rest, noTools: true } : rest;
      });
      void save(() => setNoToolsAction(project._id, noTools), () => setNext(previous));
    },
    markHandedOff: () => {
      if (next.handedOffAt) return;
      const previous = next;
      setNext(n => ({ ...n, handedOffAt: new Date().toISOString() }));
      void save(() => markHandedOffAction(project._id), () => setNext(previous));
    },
    hideNext: () => {
      const previous = next;
      setNext(n => ({ ...n, hidden: true }));
      void save(() => hideNextAction(project._id), () => setNext(previous));
    },
    toggleTool: toolId => {
      const previous = toolIds;
      const next = previous.includes(toolId) ? previous.filter(id => id !== toolId) : [...previous, toolId];
      setToolIds(next);
      void save(() => setProjectToolsAction(project._id, next), () => setToolIds(previous));
    },
  };

  return <Context.Provider value={value}>{children}</Context.Provider>;
}
