import { needsDetails, skippedItems } from '@/lib/plan/needs';
import { DEMO_FACTS, demoPlan } from '../helpers/demo';
import { loadSeed } from '../helpers/seed';

test('the CCTV rows are exactly its 10 counting items, each with official wording', async () => {
  const { profiles } = await loadSeed();
  const rows = needsDetails(await demoPlan([], DEMO_FACTS), profiles).cctv;
  expect(rows).toHaveLength(10);
  expect(rows.every(r => r.official.length > 0 && r.id.startsWith('lm-'))).toBe(true);
});

test('rows are in requirement order, with numbers in natural order', async () => {
  const { profiles } = await loadSeed();
  const ids = needsDetails(await demoPlan([], DEMO_FACTS), profiles).cctv.map(r => r.id);
  expect(ids).toEqual([...ids].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })));
  expect(ids.indexOf('lm-2')).toBeLessThan(ids.indexOf('lm-10') === -1 ? 99 : ids.indexOf('lm-10'));
});

test('every part has a list, and the lists hold the 84 counting items', async () => {
  const { profiles } = await loadSeed();
  const details = needsDetails(await demoPlan([], DEMO_FACTS), profiles);
  expect(Object.values(details).reduce((n, rows) => n + rows.length, 0)).toBe(84);
  expect(details.assistant).toEqual([]);
});

test('a requirement with no plain text shows its official wording as the row text', async () => {
  const { profiles } = await loadSeed();
  const plan = await demoPlan([], DEMO_FACTS);
  const bare = { ...plan, items: plan.items.map(i => (i.id === 'lm-1' ? { ...i, plain: undefined } : i)) };
  const row = needsDetails(bare, profiles).cctv.find(r => r.id === 'lm-1')!;
  expect(row).toMatchObject({ plainChecked: false });
  expect(row.text).toBe(row.official);
});

test('skipped items carry their reason', async () => {
  const skipped = skippedItems(await demoPlan([], DEMO_FACTS));
  expect(skipped.map(s => s.id)).toEqual(['is-11', 'is-15']);
  expect(skipped.every(s => s.reason.length > 0 && s.title.length > 0)).toBe(true);
});
