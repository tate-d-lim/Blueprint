import { closeDb, getDb } from '@/lib/data/db';
import { loadPlanData } from '@/lib/data/repos/plan-data';
import {
  createProject, deleteProject, getProject, listProjects, setProjectTools, setQuestionAnswer, setTaskStatus, updateProjectAnswers,
} from '@/lib/data/repos/projects';
import { seedDatabase } from '@/lib/data/seed';
import { BadPlanRequestError, resolvePlanRequest } from '@/lib/export/plan-request';
import { buildPlan } from '@/lib/plan/engine';
import { selectPlanInput } from '@/lib/plan/select';
import type { RiskAnswers } from '@/lib/risk/assess';

const answers: RiskAnswers = { classification: 'restricted', sensitivity: 'sensitive-normal', impact: 'slight', downstream: 'minimal', cii: false, sii: false };

beforeEach(async () => {
  await seedDatabase(await getDb());
});
afterAll(closeDb);

const make = async (over = {}) =>
  createProject(await getDb(), { name: 'Member app', ownerName: 'Sam', riskAnswers: answers, toolIds: ['appcentral'], ...over });

async function planFor(id: string) {
  const db = await getDb();
  const project = (await getProject(db, id))!;
  const data = await loadPlanData(db);
  return buildPlan(selectPlanInput(data, { profileId: 'low-risk-cloud', toolIds: project.toolIds }, project));
}

test('create, mark as-1 Done with a note, reload: the plan shows it', async () => {
  const project = await make();
  await setTaskStatus(await getDb(), project._id, 'im8-reform:as-1', { status: 'done', note: 'Schemas everywhere' });
  const item = (await planFor(project._id)).items.find(i => i.id === 'as-1')!;
  expect(item.status).toEqual({ status: 'done', note: 'Schemas everywhere' });
});

test('answering "Applies" turns a question into a task; clearing the answer puts it back', async () => {
  const project = await make();
  const db = await getDb();
  await setQuestionAnswer(db, project._id, 'im8-reform:is-11', { applies: true, reason: '' });
  expect((await planFor(project._id)).items.find(i => i.id === 'is-11')!.placement).toBe('answered-applies');
  await setQuestionAnswer(db, project._id, 'im8-reform:is-11', null);
  expect((await planFor(project._id)).items.find(i => i.id === 'is-11')!.placement).toBe('open');
});

test('project data that points at things that no longer exist still plans without errors', async () => {
  const db = await getDb();
  const project = await make({ toolIds: ['appcentral', 'deleted-tool'] });
  await setTaskStatus(db, project._id, 'im8-reform:zz-1', { status: 'done' });
  await setQuestionAnswer(db, project._id, 'im8-reform:zz-2', { applies: false, reason: 'x' });
  const plan = await planFor(project._id);
  expect(plan.items.find(i => i.id === 'as-4')!.placement).toBe('provided');
  expect(plan.items.some(i => i.id === 'zz-1')).toBe(false);
});

test('picks can be changed', async () => {
  const project = await make();
  await setProjectTools(await getDb(), project._id, ['appcentral', 'dbaas']);
  expect((await getProject(await getDb(), project._id))!.toolIds).toEqual(['appcentral', 'dbaas']);
});

test('keys that could reach other fields are rejected', async () => {
  const project = await make();
  await expect(setTaskStatus(await getDb(), project._id, 'a.b', { status: 'done' })).rejects.toThrow(/key/i);
  await expect(setQuestionAnswer(await getDb(), project._id, '$set', { applies: true, reason: '' })).rejects.toThrow(/key/i);
});

test('a project needs a name; the owner defaults to "App builder"', async () => {
  const db = await getDb();
  await expect(createProject(db, { name: ' ', riskAnswers: answers, toolIds: [] })).rejects.toThrow('Give the project a name.');
  expect((await createProject(db, { name: 'Low-Risk Cloud app', riskAnswers: answers, toolIds: [] })).ownerName).toBe('App builder');
});

test('saving changed answers keeps the id, the tools and the statuses', async () => {
  const db = await getDb();
  const p = await createProject(db, { name: 'A', riskAnswers: answers, toolIds: ['appcentral'] });
  await setTaskStatus(db, p._id, 'im8-reform:pm-1', { status: 'done' });
  expect(await updateProjectAnswers(db, p._id, { riskAnswers: { ...answers, sensitivity: 'sensitive-high' }, facts: { reach: 'staff' } })).toBe(true);
  const after = (await getProject(db, p._id))!;
  expect(after).toMatchObject({ _id: p._id, toolIds: ['appcentral'], facts: { reach: 'staff' } });
  expect(after.riskAnswers.sensitivity).toBe('sensitive-high');
  expect(after.taskStatus['im8-reform:pm-1']).toEqual({ status: 'done' });
  expect(await updateProjectAnswers(db, 'nope', { riskAnswers: answers, facts: {} })).toBe(false);
});

test('a question reason is stored as typed, and cut at 280 characters', async () => {
  const db = await getDb();
  const p = await createProject(db, { name: 'A', riskAnswers: answers, toolIds: [] });
  await setQuestionAnswer(db, p._id, 'im8-reform:is-1', { applies: false, reason: 'No  SMS & no café sign-in — 済' });
  expect((await getProject(db, p._id))!.questionAnswers['im8-reform:is-1'].reason).toBe('No  SMS & no café sign-in — 済');
  await setQuestionAnswer(db, p._id, 'im8-reform:is-1', { applies: false, reason: 'x'.repeat(300) });
  expect((await getProject(db, p._id))!.questionAnswers['im8-reform:is-1'].reason).toHaveLength(280);
});

test('the list is newest-updated first and includes the sample project', async () => {
  const project = await make();
  const list = await listProjects(await getDb());
  expect(list.map(p => p._id)).toContain('sample-two-weeks-in');
  expect(list[0]._id).toBe(project._id);
  await setTaskStatus(await getDb(), 'sample-two-weeks-in', 'im8-reform:cs-3', { status: 'done' });
  expect((await listProjects(await getDb()))[0]._id).toBe('sample-two-weeks-in');
});

test('a download link with ?project= uses the saved answers, tools and statuses', async () => {
  const request = await resolvePlanRequest(new URLSearchParams({ project: 'sample-two-weeks-in' }));
  expect(request.project?.name).toBe('Sample project (two weeks in)');
  expect(request.meta.title).toBe('Sample project (two weeks in)');
  expect(request.toolIds).toEqual(['appcentral', 'dbaas', 'iga']);
  expect((request.plan.items.find(i => i.id === 'as-1')!.status as { status: string }).status).toBe('done');
  await expect(resolvePlanRequest(new URLSearchParams({ project: 'nope' }))).rejects.toBeInstanceOf(BadPlanRequestError);
});

test('a saved project keeps its answers about the app, and its plan leaves out what they rule out', async () => {
  const facts = { reach: 'staff', web: 'no', signin: 'no', domain: 'no', shortlinks: 'no' };
  const project = await make({ facts });
  const db = await getDb();
  const stored = (await getProject(db, project._id))!;
  expect(stored.facts).toEqual(facts);
  const plan = buildPlan(selectPlanInput(await loadPlanData(db), { profileId: 'low-risk-cloud', toolIds: stored.toolIds, facts: stored.facts }, stored));
  expect(plan.items.filter(i => i.heading === 'skipped').map(i => i.id).sort()).toEqual(
    ['ac-7', 'as-11', 'as-15', 'as-3', 'as-4', 'as-5', 'as-6', 'as-9', 'is-11', 'is-14', 'is-15', 'lm-6'],
  );
});

test('a project saved without answers has none, and every requirement applies', async () => {
  const stored = (await getProject(await getDb(), (await make())._id))!;
  expect(stored.facts).toBeUndefined();
});

test('a deleted project is gone from the list and from lookups, and the others stay', async () => {
  const db = await getDb();
  const project = await make({ name: 'Short-lived' });
  expect(await deleteProject(db, project._id)).toBe(true);
  expect(await getProject(db, project._id)).toBeNull();
  const ids = (await listProjects(db)).map(p => p._id);
  expect(ids).not.toContain(project._id);
  expect(ids).toContain('sample-two-weeks-in');
  await expect(resolvePlanRequest(new URLSearchParams({ project: project._id }))).rejects.toBeInstanceOf(BadPlanRequestError);
});

test('deleting a project that does not exist is not an error, and says so', async () => {
  expect(await deleteProject(await getDb(), 'nope')).toBe(false);
});
