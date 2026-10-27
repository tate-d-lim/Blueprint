import { buildPlan, type Plan, type PlanData, type Placement } from '@/lib/plan/engine';
import { pairVersions, selectPlanInput } from '@/lib/plan/select';
import { loadSeed } from '../helpers/seed';

async function planFor(toolIds: string[]): Promise<Plan> {
  const seed = await loadSeed();
  const data: PlanData = { profiles: seed.profiles, tools: seed.tools, versions: pairVersions(seed.toolVersions) };
  return buildPlan(selectPlanInput(data, { profileId: 'low-risk-cloud', toolIds }));
}

const split = (plan: Plan) => {
  const l01 = plan.items.filter(i => i.level < 2);
  const by = (p: Placement[]) => l01.filter(i => p.includes(i.placement));
  return {
    providedVerified: by(['provided']).filter(i => i.decisive.every(c => c.verification === 'verified')).length,
    providedUnverified: by(['provided']).filter(i => i.decisive.some(c => c.verification === 'not-yet-verified')).length,
    na: by(['not-applicable']).length,
    you: by(['shared', 'app-builder', 'default-builder']).length,
    open: by(['open']).length,
    redirect: by(['redirect']).length,
    total: l01.length,
  };
};

test('appCentral + DBaaS + IGA: 42 verified, 15 not yet verified, 9 N/A, 11 yours, 9 open', async () => {
  expect(split(await planFor(['appcentral', 'dbaas', 'iga']))).toEqual({
    providedVerified: 42, providedUnverified: 15, na: 9, you: 11, open: 9, redirect: 0, total: 86,
  });
});

test('appCentral only: DBaaS and IGA rows become 15 redirect questions', async () => {
  expect(split(await planFor(['appcentral']))).toEqual({
    providedVerified: 42, providedUnverified: 0, na: 9, you: 11, open: 9, redirect: 15, total: 86,
  });
});

test('nothing picked: 11 default builder tasks and 75 questions', async () => {
  expect(split(await planFor([]))).toEqual({
    providedVerified: 0, providedUnverified: 0, na: 0, you: 11, open: 75, redirect: 0, total: 86,
  });
});

test('the 9 open questions are pm-1..6, is-11, is-14, is-15', async () => {
  const plan = await planFor(['appcentral', 'dbaas', 'iga']);
  const open = plan.items.filter(i => i.level < 2 && i.placement === 'open').map(i => i.id).sort();
  expect(open).toEqual(['is-11', 'is-14', 'is-15', 'pm-1', 'pm-2', 'pm-3', 'pm-4', 'pm-5', 'pm-6']);
});

test('appCentral only hints DBaaS ×4 and IGA ×11', async () => {
  const plan = await planFor(['appcentral']);
  expect(plan.hints).toEqual(
    expect.arrayContaining([
      { fromToolId: 'appcentral', suggestToolId: 'dbaas', count: 4 },
      { fromToolId: 'appcentral', suggestToolId: 'iga', count: 11 },
    ]),
  );
  expect(plan.hints).toHaveLength(2);
});

test('counts for appCentral + DBaaS + IGA: you 11, platform 66, questions 9, good-to-have 32', async () => {
  expect((await planFor(['appcentral', 'dbaas', 'iga'])).counts).toEqual({
    you: 11, platform: 66, questions: 9, 'good-to-have': 32,
  });
});
