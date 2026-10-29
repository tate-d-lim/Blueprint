import type { Db } from 'mongodb';
import type { FactAnswers, Project, RequirementKey, TaskStatus } from '../../domain/types';
import type { RiskAnswers } from '../../risk/assess';

const KEY_PATTERN = /^[a-z0-9-]+:[a-z]{2,3}-\d+$/;

/** Keys become field names in a Mongo update, so only well-formed requirement keys are allowed. */
function assertKey(key: string): asserts key is RequirementKey {
  if (!KEY_PATTERN.test(key)) throw new Error(`Not a valid requirement key: ${key}`);
}

const projects = (db: Db) => db.collection<Project>('projects');

export async function createProject(
  db: Db,
  input: { name: string; ownerName: string; riskAnswers: RiskAnswers; toolIds: string[]; facts?: FactAnswers },
): Promise<Project> {
  const name = input.name.trim();
  const ownerName = input.ownerName.trim();
  if (!name) throw new Error('Give the project a name.');
  if (!ownerName) throw new Error('Add the owner’s name.');
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
    answer ? { $set: { [path]: { applies: answer.applies, reason: answer.reason.trim() }, ...touch() } } : { $unset: { [path]: '' }, $set: touch() },
  );
}

export async function setProjectTools(db: Db, id: string, toolIds: string[]): Promise<void> {
  await projects(db).updateOne({ _id: id }, { $set: { toolIds: [...new Set(toolIds)], ...touch() } });
}
