"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { attempt } from "@/lib/data/attempt";
import { DatabaseUnavailableError, withDb } from "@/lib/data/db";
import { createProject, deleteProject, hideNext, markHandedOff, setNoTools, setProjectTools, setQuestionAnswer, setTaskStatus, updateProjectAnswers } from "@/lib/data/repos/projects";
import type { FactAnswers, TaskStatus } from "@/lib/domain/types";
import type { SaveOutcome } from "@/lib/plan/save";
import { parseSaveInput, parseToolIds } from "@/lib/plan/validate";
import type { RiskAnswers } from "@/lib/risk/assess";

/** Step 4's save: a new project with the answers, no tools yet, and the default owner. The tools come later, on the saved project. */
export async function createProjectAction(input: {
  name: string;
  riskAnswers: RiskAnswers;
  facts?: FactAnswers;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    const checked = parseSaveInput(input);
    const project = await withDb(db => createProject(db, { name: checked.name ?? "", riskAnswers: checked.riskAnswers, facts: checked.facts, toolIds: [] }));
    revalidatePath("/projects");
    return { ok: true, id: project._id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Your plan was not saved. Check the server is running, then try again." };
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
  return saved(projectId, () => withDb(db => setProjectTools(db, projectId, parseToolIds(toolIds))));
}

/** "My app uses no tools": step 1 of the Next strip is done with no tool picked. `false` takes it back. */
export async function setNoToolsAction(projectId: string, value: boolean) {
  return saved(projectId, () => withDb(db => setNoTools(db, String(projectId), value === true)));
}

/** The builder took the plan to the agent. Only the first time is kept. */
export async function markHandedOffAction(projectId: string) {
  return saved(projectId, () => withDb(db => markHandedOff(db, String(projectId))));
}

/** The builder closes the Next strip. */
export async function hideNextAction(projectId: string) {
  return saved(projectId, () => withDb(db => hideNext(db, String(projectId))));
}

/**
 * Deletes a project for good, then goes to the Projects list. A project that is already gone counts as deleted.
 * Only a failure comes back to the caller; on success the redirect ends the call.
 */
export async function deleteProjectAction(projectId: string): Promise<{ ok: false; error: string }> {
  try {
    await withDb(db => deleteProject(db, String(projectId)));
  } catch (err) {
    return { ok: false, error: err instanceof DatabaseUnavailableError ? err.message : "The project was not deleted. Check the server is running, then try again." };
  }
  revalidatePath("/projects");
  redirect("/projects");
}

/** Writes edited answers to the same project. Tools and task statuses stay. */
export async function saveProjectAnswersAction(
  projectId: string,
  input: { riskAnswers: RiskAnswers; facts: FactAnswers },
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const checked = parseSaveInput(input);
    await withDb(async db => {
      if (!(await updateProjectAnswers(db, projectId, { riskAnswers: checked.riskAnswers, facts: checked.facts }))) {
        throw new Error("This project no longer exists.");
      }
    });
    revalidatePath(`/projects/${projectId}`);
    revalidatePath("/projects");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error && err.message === "This project no longer exists." ? err.message : "Your changes were not saved. Check the server is running, then try again." };
  }
}

