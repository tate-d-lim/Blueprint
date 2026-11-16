import type { IncomingRelease } from '../types';
import { SiteLayoutError, parseProfilePage } from './parse-page';
import { SourceUnreachableError, type CatalogSource, type SourceStamp } from './source';

export const SITE_HOST = 'info.standards.tech.gov.sg';
export const SITE_ORIGIN = `https://${SITE_HOST}`;
const TIMEOUT_MS = 10_000;
const MAX_BYTES = 12 * 1024 * 1024;

/** The profile pages of the site and the profile of the database that each one fills. */
export const SITE_PAGES: { path: string; profileId: string }[] = [
  { path: '/ssp/low-risk-cloud/', profileId: 'low-risk-cloud' },
  { path: '/ssp/medium-risk-cloud/', profileId: 'medium-risk-cloud' },
  { path: '/ssp/high-risk-cloud/', profileId: 'high-risk-cloud-cii' },
  { path: '/ssp/gen-ai/', profileId: 'generative-ai' },
];

type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

/** One GET to the fixed host. No cookie, no user data, a generic User-Agent, a time limit, and no redirect to another host. */
async function get(fetchImpl: FetchLike, path: string): Promise<string> {
  let url = `${SITE_ORIGIN}${path}`;
  for (let hop = 0; hop < 4; hop++) {
    let res: Response;
    try {
      res = await fetchImpl(url, {
        method: 'GET',
        redirect: 'manual',
        headers: { 'User-Agent': 'Blueprint catalog check' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
        cache: 'no-store',
      });
    } catch (err) {
      throw new SourceUnreachableError(err instanceof Error ? err.message : undefined);
    }
    if (res.status >= 300 && res.status < 400) {
      const next = res.headers.get('location');
      const target = next ? new URL(next, url) : undefined;
      if (!target || target.host !== SITE_HOST || target.protocol !== 'https:') throw new SourceUnreachableError('redirect to another host');
      url = target.href;
      continue;
    }
    if (!res.ok) throw new SourceUnreachableError(`status ${res.status}`);
    const length = Number(res.headers.get('content-length') ?? 0);
    if (length > MAX_BYTES) throw new SiteLayoutError('page too large');
    let text: string;
    try {
      text = await res.text();
    } catch (err) {
      throw new SourceUnreachableError(err instanceof Error ? err.message : undefined);
    }
    if (text.length > MAX_BYTES) throw new SiteLayoutError('page too large');
    return text;
  }
  throw new SourceUnreachableError('too many redirects');
}

/** `<loc>` and `<lastmod>` pairs of a sitemap, by path. */
export function readSitemap(xml: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of xml.matchAll(/<url>\s*<loc>([^<]+)<\/loc>\s*(?:<lastmod>([^<]+)<\/lastmod>)?/g)) {
    try {
      const url = new URL(m[1].trim());
      if (url.host === SITE_HOST && m[2]) out[url.pathname] = m[2].trim();
    } catch {
      /* a line that is not an address is skipped */
    }
  }
  return out;
}

/** The GovTech standards site: the four profile pages that Blueprint holds. */
export function govtechSite(fetchImpl: FetchLike = (url, init) => fetch(url, init)): CatalogSource {
  return {
    id: 'govtech-site',
    label: 'GovTech site',
    async check(): Promise<SourceStamp> {
      const sitemap = readSitemap(await get(fetchImpl, '/sitemap.xml'));
      const pages: Record<string, string> = {};
      for (const page of SITE_PAGES) {
        const stamp = sitemap[page.path];
        if (!stamp) throw new SiteLayoutError(`the sitemap has no ${page.path}`);
        pages[page.path] = stamp;
      }
      return { pages };
    },
    async fetchRelease(): Promise<IncomingRelease> {
      const profiles: IncomingRelease['profiles'] = [];
      const dates: string[] = [];
      for (const page of SITE_PAGES) {
        const parsed = parseProfilePage(await get(fetchImpl, page.path));
        profiles.push({ profileId: page.profileId, entries: parsed.entries });
        if (parsed.updated) dates.push(parsed.updated);
      }
      const sourceDate = dates.sort().at(-1);
      return {
        source: { kind: 'fetch', label: SITE_ORIGIN, ...(sourceDate ? { sourceDate } : {}) },
        profiles,
        notes: ['The GovTech pages do not list references, so each control keeps the references it has.'],
      };
    },
  };
}
