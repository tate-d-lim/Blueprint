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
  const status = value.status === 'done' ? 'done' : 'todo';
  const stored = value.note?.trim() ? { status, note: value.note.trim() } : { status };
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
 * The builder says the app uses no tools, so the first step of "Next" is done with none picked. These three writes do
 * not count as a revision of the plan, so they leave `updatedAt` alone.
 */
export async function setNoTools(db: Db, id: string, value: boolean): Promise<void> {
  await projects(db).updateOne({ _id: id }, value ? { $set: { 'next.noTools': true } } : { $unset: { 'next.noTools': '' } });
}

/** Records when the builder first took the plan to the agent. Later calls change nothing. */
export async function markHandedOff(db: Db, id: string, at: string = new Date().toISOString()): Promise<void> {
  await projects(db).updateOne({ _id: id, 'next.handedOffAt': { $exists: false } }, { $set: { 'next.handedOffAt': at } });
}

/** The builder closes the "Next" strip. */
export async function hideNext(db: Db, id: string): Promise<void> {
  await projects(db).updateOne({ _id: id }, { $set: { 'next.hidden': true } });
}

/** Removes the project for good: its tools, done marks, notes and answers go with it. Returns false when there was none. */
export async function deleteProject(db: Db, id: string): Promise<boolean> {
  const result = await projects(db).deleteOne({ _id: id });
  return result.deletedCount === 1;
}

/**
 * Writes new risk answers and facts to the same project. Tools and task statuses stay. Returns false when the project
 * does not exist.
 */
export async function updateProjectAnswers(
  db: Db,
  id: string,
  input: { riskAnswers: RiskAnswers; facts: FactAnswers },
): Promise<boolean> {
  const hasFacts = Object.keys(input.facts).length > 0;
  const unset: Record<string, ''> = {};
  if (!hasFacts) unset.facts = '';
  const update = {
    $set: { riskAnswers: input.riskAnswers, ...(hasFacts ? { facts: input.facts } : {}), ...touch() },
    ...(Object.keys(unset).length ? { $unset: unset } : {}),
  };
  const result = await projects(db).updateOne({ _id: id }, update);
  return result.matchedCount === 1;
}

