import { readFileSync } from 'node:fs';
import { diffProfile } from '@/lib/catalog/diff';
import { SiteLayoutError, mainLines, parseProfilePage, updatedOn } from '@/lib/catalog/govtech/parse-page';
import { loadSeed } from '../helpers/seed';

const page = readFileSync('test/catalog/fixtures/lrc-main.html', 'utf8');

test('the Low-Risk Cloud page gives 118 controls with the ids and levels of the seeded profile', async () => {
  const seeded = (await loadSeed()).profiles.find(p => p._id === 'low-risk-cloud')!;
  const parsed = parseProfilePage(page);
  expect(parsed.entries).toHaveLength(118);
  expect(parsed.entries.map(e => [e.id, e.level])).toEqual(seeded.entries.map(e => [e.id, e.level]));
  expect(parsed.updated).toBe('2026-11-10');
});

test('every control has a statement and recommendations; the parameter table stays out of the risk statement', () => {
  const entries = parseProfilePage(page).entries;
  expect(entries.every(e => e.statement && e.recommendations)).toBe(true);
  // The page has no risk statement for is-15.
  expect(entries.filter(e => !e.rationale).map(e => e.id)).toEqual(['is-15']);
  const as5 = entries.find(e => e.id === 'as-5')!;
  expect(as5.rationale).not.toMatch(/Parameters|prm_1/);
  expect(as5.statement).toBe('Where SSO or passwordless is not supported, verify that [as-5_prm_3] passwords are at least [as-5_prm_1] characters in length and [as-5_prm_2].');
  // The last control stops at the footer of the page.
  expect(entries.at(-1)!.id).toBe('ck-2');
  expect(entries.at(-1)!.rationale).not.toMatch(/Back to|Other pages/);
});

test('a bullet list of a statement is kept as lines', () => {
  const as6 = parseProfilePage(page).entries.find(e => e.id === 'as-6')!;
  expect(as6.statement.split('\n')).toHaveLength(4);
});

test('against the seeded profile, only reworded controls remain after normal form', async () => {
  const seeded = (await loadSeed()).profiles.find(p => p._id === 'low-risk-cloud')!;
  const d = diffProfile(seeded, { profileId: seeded._id, entries: parseProfilePage(page).entries });
  expect(d.changes.added).toEqual([]);
  expect(d.changes.removed).toEqual([]);
  expect(d.changes.levelChanged).toEqual([]);
  expect(d.changes.reworded.map(r => r.id).sort()).toEqual(['lm-4']);
});

test('a page with no controls, a control with no statement, or one with no level fails with the layout message', () => {
  const html = (body: string) => `<html><body><main>${body}</main></body></html>`;
  expect(() => parseProfilePage('<html><body>nothing</body></html>')).toThrow(SiteLayoutError);
  expect(() => parseProfilePage(html('<h1>Low-Risk Cloud</h1><p>No controls here.</p>'))).toThrow(/new layout\. Upload a file as a replacement/);
  const control = (statement: string, level: string) =>
    `<h3>AS-1: Input Validation</h3><p>Group: Application Security</p>${level}<h4>Control Statement</h4>${statement}<h4>Control Recommendations</h4><p>r</p><h4>Risk Statement</h4><p>y</p>`;
  expect(() => parseProfilePage(html(control('', '<p>Profile Level: 1</p>')))).toThrow(SiteLayoutError);
  expect(() => parseProfilePage(html(control('<p>Do it.</p>', '')))).toThrow(SiteLayoutError);
  expect(parseProfilePage(html(control('<p>Do it.</p>', '<p>Profile Level: 1</p>'))).entries).toHaveLength(1);
});

test('a family count that the parser does not match fails', () => {
  const broken = page.replace('AS: Application Security (15)', 'AS: Application Security (16)');
  expect(() => parseProfilePage(broken)).toThrow(SiteLayoutError);
});

test('scripts and styles are dropped, and entities are decoded', () => {
  const lines = mainLines('<main><script>alert(1)</script><p>A &amp; B&nbsp;C</p><style>p{}</style></main>');
  expect(lines).toEqual(['A & B C']);
  expect(updatedOn(['Last updated on 3 March 2027'])).toBe('2027-03-03');
});
