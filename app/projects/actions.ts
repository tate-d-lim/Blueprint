"use server";

import { revalidatePath } from "next/cache";
import { attempt } from "@/lib/data/attempt";
import { withDb } from "@/lib/data/db";
import { createProject, setProjectTools, setQuestionAnswer, setTaskStatus } from "@/lib/data/repos/projects";
import type { TaskStatus } from "@/lib/domain/types";
import type { SaveOutcome } from "@/lib/plan/save";
import type { RiskAnswers } from "@/lib/risk/assess";

export async function createProjectAction(input: {
  name: string;
  ownerName: string;
  riskAnswers: RiskAnswers;
  toolIds: string[];
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    const project = await withDb(db => createProject(db, input));
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
