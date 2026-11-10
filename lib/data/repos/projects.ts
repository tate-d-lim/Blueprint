import type { Db } from 'mongodb';
import type { FactAnswers, Project, RequirementKey, TaskStatus } from '../../domain/types';
import type { RiskAnswers } from '../../risk/assess';

const KEY_PATTERN = /^[a-z0-9-]+:[a-z]{2,3}-\d+$/;

/** Keys become field names in a Mongo update, so only well-formed requirement keys are allowed. */
function assertKey(key: string): asserts key is RequirementKey {
  if (!KEY_PATTERN.test(key)) throw new Error(`Not a valid requirement key: ${key}`);
}

/** Saving takes one click, so a project is not asked for an owner. */
export const DEFAULT_OWNER = 'App builder';

/** The longest reason a builder can give for a question. */
export const MAX_REASON = 280;

const projects = (db: Db) => db.collection<Project>('projects');

export async function createProject(
  db: Db,
  input: { name: string; ownerName?: string; riskAnswers: RiskAnswers; toolIds: string[]; facts?: FactAnswers },
): Promise<Project> {
  const name = input.name.trim();
  const ownerName = input.ownerName?.trim() || DEFAULT_OWNER;
  if (!name) throw new Error('Give the project a name.');
  const now = new Date().toISOString();
  const project: Project = {
    _id: crypto.randomUUID(),
    name,
    ownerName,
    riskAnswers: input.riskAnswers,
    toolIds: input.toolIds,
    taskStatus: {},
    questionAnswers: {},
    ...(input.facts && Object.keys(input.facts).length ? { facts: input.facts } : {}),
    createdAt: now,
    updatedAt: now,
  };
  await projects(db).insertOne(project);
  return project;
}

export const getProject = (db: Db, id: string): Promise<Project | null> => projects(db).findOne({ _id: id });

export const listProjects = (db: Db): Promise<Project[]> => projects(db).find().sort({ updatedAt: -1 }).toArray();

const touch = () => ({ updatedAt: new Date().toISOString() });

export async function setTaskStatus(
  db: Db,
  id: string,
  key: string,
  value: { status: TaskStatus; note?: string },
): Promise<void> {
  assertKey(key);
  const stored = value.note?.trim() ? { status: value.status, note: value.note.trim() } : { status: value.status };
  await projects(db).updateOne({ _id: id }, { $set: { [`taskStatus.${key}`]: stored, ...touch() } });
}

/** Answers a question "Applies" or "Doesn't apply"; null clears the answer. */
export async function setQuestionAnswer(
  db: Db,
  id: string,
  key: string,
  answer: { applies: boolean; reason: string } | null,
): Promise<void> {
  assertKey(key);
  const path = `questionAnswers.${key}`;
  await projects(db).updateOne(
    { _id: id },
    answer ? { $set: { [path]: { applies: answer.applies, reason: answer.reason.trim().slice(0, MAX_REASON) }, ...touch() } } : { $unset: { [path]: '' }, $set: touch() },
  );
}

export async function setProjectTools(db: Db, id: string, toolIds: string[]): Promise<void> {
  await projects(db).updateOne({ _id: id }, { $set: { toolIds: [...new Set(toolIds)], ...touch() } });
}

/**
 * Writes new risk answers and facts to the same project. Tools and task statuses stay. `clearToolsReviewed` sends the
 * builder back to the tools step (when the app type changed). Returns false when the project does not exist.
 */
export async function updateProjectAnswers(
  db: Db,
  id: string,
  input: { riskAnswers: RiskAnswers; facts: FactAnswers; clearToolsReviewed: boolean },
): Promise<boolean> {
  const hasFacts = Object.keys(input.facts).length > 0;
  const unset: Record<string, ''> = {};
  if (!hasFacts) unset.facts = '';
  if (input.clearToolsReviewed) unset.toolsReviewedAt = '';
  const update = {
    $set: { riskAnswers: input.riskAnswers, ...(hasFacts ? { facts: input.facts } : {}), ...touch() },
    ...(Object.keys(unset).length ? { $unset: unset } : {}),
  };
  const result = await projects(db).updateOne({ _id: id }, update);
  return result.matchedCount === 1;
}

/** The builder has left the tools step, so the project now opens on the plan page. */
export async function markToolsReviewed(db: Db, id: string): Promise<void> {
  await projects(db).updateOne({ _id: id }, { $set: { toolsReviewedAt: new Date().toISOString(), ...touch() } });
}
