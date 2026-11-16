import { readFileSync } from 'node:fs';
import { runCheck, checkIsDue, AUTO_CHECK_AFTER_MS, type CheckStore } from '@/lib/catalog/check';
import { SITE_HOST, SITE_PAGES, govtechSite, readSitemap } from '@/lib/catalog/govtech/site';
import { SourceUnreachableError } from '@/lib/catalog/govtech/source';
import type { CatalogBaseline, CatalogCheck, PendingRelease } from '@/lib/catalog/types';
import type { Profile } from '@/lib/domain/types';
import { loadSeed } from '../helpers/seed';

const lrc = readFileSync('test/catalog/fixtures/lrc-main.html', 'utf8');

const sitemap = (lastmod: Record<string, string>) =>
  `<?xml version="1.0"?><urlset>${Object.entries(lastmod).map(([p, m]) => `<url><loc>https://${SITE_HOST}${p}</loc><lastmod>${m}</lastmod></url>`).join('')}</urlset>`;
const stamps = (at: string) => Object.fromEntries(SITE_PAGES.map(p => [p.path, at]));

/** A fake network: the sitemap, and one page for each profile. Records every request. */
function fakeFetch(opts: { lastmod: string; page?: (path: string) => string; fail?: boolean }) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fn = async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    if (opts.fail) throw new TypeError('fetch failed');
    const path = new URL(url).pathname;
    const body = path === '/sitemap.xml' ? sitemap(stamps(opts.lastmod)) : (opts.page ?? (() => lrc))(path);
    return new Response(body, { status: 200 });
  };
  return { fn, calls };
}

/** The four seeded profiles, with the three other pages made to match the Low-Risk Cloud page by giving them its entries. */
async function store(): Promise<CheckStore & { baselines: Map<string, CatalogBaseline>; pending: PendingRelease[]; checks: CatalogCheck[] }> {
  const seed = await loadSeed();
  const low = seed.profiles.find(p => p._id === 'low-risk-cloud')!;
  const profiles: Profile[] = SITE_PAGES.map(p => ({ ...structuredClone(low), _id: p.profileId }));
  const baselines = new Map<string, CatalogBaseline>();
  const pending: PendingRelease[] = [];
  const checks: CatalogCheck[] = [];
  return {
    baselines,
    pending,
    checks,
    profiles: async () => profiles,
    baseline: async id => baselines.get(id),
    setBaseline: async (id, pages, at, sourceDate) => void baselines.set(id, { _id: id, at, pages, ...(sourceDate ? { sourceDate } : {}) }),
    replacePending: async doc => void pending.splice(0, pending.length, doc),
    addCheck: async doc => void checks.push(doc),
    lastCheck: async id => checks.filter(c => c.sourceId === id).at(-1),
  };
}

test('the sitemap gives a date for each page', () => {
  expect(readSitemap(sitemap({ '/ssp/gen-ai/': '2026-11-11T02:14:37.510Z' }))).toEqual({ '/ssp/gen-ai/': '2026-11-11T02:14:37.510Z' });
});

test('with no baseline, the check fetches, finds no change in wording that only differs in form, and stores the baseline', async () => {
  const s = await store();
  // lm-4 and ac-2 read differently on the site, so use a profile set that already holds the site wording.
  const page = lrc;
  const { parseProfilePage } = await import('@/lib/catalog/govtech/parse-page');
  const site = parseProfilePage(page).entries;
  for (const p of await s.profiles()) for (const e of p.entries) Object.assign(e, { statement: site.find(x => x.id === e.id)!.statement });
  const net = fakeFetch({ lastmod: '2026-11-10T08:00:00.000Z' });
  const result = await runCheck(s, govtechSite(net.fn), 'Admin', '2026-11-16T09:00:00.000Z');
  expect(result).toMatchObject({ outcome: 'no-change', sourceDate: '2026-11-10' });
  expect(s.baselines.get('govtech-site')?.pages).toEqual(stamps('2026-11-10T08:00:00.000Z'));
  expect(s.pending).toHaveLength(0);
});

test('with a baseline and no newer page, the check reads only the sitemap', async () => {
  const s = await store();
  s.baselines.set('govtech-site', { _id: 'govtech-site', at: 'x', pages: stamps('2026-11-10T08:00:00.000Z'), sourceDate: '2026-11-10' });
  const net = fakeFetch({ lastmod: '2026-11-10T08:00:00.000Z' });
  const result = await runCheck(s, govtechSite(net.fn));
  expect(result).toMatchObject({ outcome: 'no-change', sourceDate: '2026-11-10' });
  expect(net.calls.map(c => new URL(c.url).pathname)).toEqual(['/sitemap.xml']);
});

test('a newer page with a real change stores a pending release and leaves the baseline alone', async () => {
  const s = await store();
  s.baselines.set('govtech-site', { _id: 'govtech-site', at: 'x', pages: stamps('2026-10-01T00:00:00.000Z') });
  const net = fakeFetch({ lastmod: '2026-11-10T08:00:00.000Z' });
  const result = await runCheck(s, govtechSite(net.fn));
  expect(result.outcome).toBe('changed');
  expect(s.pending).toHaveLength(1);
  expect(result.pendingId).toBe(s.pending[0]._id);
  expect(s.pending[0].incoming.profiles.map(p => p.profileId)).toEqual(SITE_PAGES.map(p => p.profileId));
  expect(s.baselines.get('govtech-site')?.pages).toEqual(stamps('2026-10-01T00:00:00.000Z'));
});

test('every request is a GET to the fixed host with the generic User-Agent and a time limit', async () => {
  const s = await store();
  const net = fakeFetch({ lastmod: '2026-11-10T08:00:00.000Z' });
  await runCheck(s, govtechSite(net.fn));
  expect(net.calls.length).toBe(1 + SITE_PAGES.length);
  for (const c of net.calls) {
    expect(new URL(c.url).host).toBe(SITE_HOST);
    expect(c.init.method).toBe('GET');
    expect((c.init.headers as Record<string, string>)['User-Agent']).toBe('Blueprint catalog check');
    expect(c.init.signal).toBeDefined();
    expect(c.init.body).toBeUndefined();
  }
});

test('a network failure is recorded as "Could not reach GovTech" and applies nothing', async () => {
  const s = await store();
  const result = await runCheck(s, govtechSite(fakeFetch({ lastmod: 'x', fail: true }).fn));
  expect(result).toMatchObject({ outcome: 'unreachable', error: 'Could not reach GovTech.' });
  expect(s.pending).toHaveLength(0);
  expect(s.baselines.size).toBe(0);
  await expect(govtechSite(fakeFetch({ lastmod: 'x', fail: true }).fn).check()).rejects.toBeInstanceOf(SourceUnreachableError);
});

test('a page with a new layout stops the check with the layout message', async () => {
  const s = await store();
  const net = fakeFetch({ lastmod: '2026-11-10T08:00:00.000Z', page: () => '<main><p>Something else.</p></main>' });
  const result = await runCheck(s, govtechSite(net.fn));
  expect(result).toMatchObject({ outcome: 'error', error: 'The GovTech page has a new layout. Upload a file as a replacement.' });
  expect(s.pending).toHaveLength(0);
});

test('a redirect to another host is refused', async () => {
  const fn = async () => new Response(null, { status: 302, headers: { location: 'https://example.com/x' } });
  await expect(govtechSite(fn).check()).rejects.toBeInstanceOf(SourceUnreachableError);
});

test('the automatic check is due after 24 hours, not before', async () => {
  const s = await store();
  expect(await checkIsDue(s, 'govtech-site')).toBe(true);
  s.checks.push({ _id: '1', at: '2026-11-16T00:00:00.000Z', sourceId: 'govtech-site', outcome: 'no-change' });
  const at = new Date('2026-11-16T00:00:00.000Z').getTime();
  expect(await checkIsDue(s, 'govtech-site', new Date(at + AUTO_CHECK_AFTER_MS - 1000))).toBe(false);
  expect(await checkIsDue(s, 'govtech-site', new Date(at + AUTO_CHECK_AFTER_MS + 1000))).toBe(true);
});
