"use server";

import { revalidatePath } from "next/cache";
import { attempt } from "@/lib/data/attempt";
import { withDb } from "@/lib/data/db";
import { createProject, getProject, markToolsReviewed, setProjectTools, setQuestionAnswer, setTaskStatus, updateProjectAnswers } from "@/lib/data/repos/projects";
import type { FactAnswers, TaskStatus } from "@/lib/domain/types";
import type { SaveOutcome } from "@/lib/plan/save";
import { profileFor, type RiskAnswers } from "@/lib/risk/assess";
import { loadPlanData } from "@/lib/data/repos/plan-data";

/** Step 4's save: a new project with the answers, no tools yet, and the default owner. (`ownerName` and `toolIds` are only for the old save dialog, until Task 14 removes it.) */
export async function createProjectAction(input: {
  name: string;
  riskAnswers: RiskAnswers;
  facts?: FactAnswers;
  ownerName?: string;
  toolIds?: string[];
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    const project = await withDb(db => createProject(db, { ...input, toolIds: input.toolIds ?? [] }));
    revalidatePath("/projects");
    return { ok: true, id: project._id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not save the project." };
  }
}

/** After a change, drop the browser's cached copy of the project page so Back never shows old state. */
async function saved(projectId: string, work: () => Promise<unknown>): Promise<SaveOutcome> {
  const outcome = await attempt(work);
  if (outcome.ok) {
    revalidatePath(`/projects/${projectId}`);
    revalidatePath("/projects");
  }
  return outcome;
}

export async function setTaskStatusAction(projectId: string, key: string, value: { status: TaskStatus; note?: string }) {
  return saved(projectId, () => withDb(db => setTaskStatus(db, projectId, key, value)));
}

export async function setQuestionAnswerAction(projectId: string, key: string, answer: { applies: boolean; reason: string } | null) {
  return saved(projectId, () => withDb(db => setQuestionAnswer(db, projectId, key, answer)));
}

export async function setProjectToolsAction(projectId: string, toolIds: string[]) {
  return saved(projectId, () => withDb(db => setProjectTools(db, projectId, toolIds)));
}

/**
 * Writes edited answers to the same project. When the answers give another app type, the builder goes back to the
 * tools step, because tool coverage is per profile.
 */
export async function saveProjectAnswersAction(
  projectId: string,
  input: { riskAnswers: RiskAnswers; facts: FactAnswers },
): Promise<{ ok: true; profileChanged: boolean } | { ok: false; error: string }> {
  try {
    const profileChanged = await withDb(async db => {
      const [project, data] = await Promise.all([getProject(db, projectId), loadPlanData(db)]);
      if (!project) throw new Error("This project no longer exists.");
      const changed = profileFor(project.riskAnswers, data.profiles) !== profileFor(input.riskAnswers, data.profiles);
      await updateProjectAnswers(db, projectId, { ...input, clearToolsReviewed: changed });
      return changed;
    });
    revalidatePath(`/projects/${projectId}`);
    revalidatePath("/projects");
    return { ok: true, profileChanged };
  } catch (err) {
    return { ok: false, error: err instanceof Error && err.message === "This project no longer exists." ? err.message : "Your changes weren't saved. Check the server is running, then try again." };
  }
}

/** The builder leaves the tools step: from now on the project opens on the plan page. */
export async function continueToPlanAction(projectId: string) {
  return saved(projectId, () => withDb(db => markToolsReviewed(db, projectId)));
}
