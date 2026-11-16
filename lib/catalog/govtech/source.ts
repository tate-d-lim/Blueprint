import type { IncomingRelease } from '../types';

/** What a source says about itself, cheaply: a stamp for each page. A newer stamp means the page changed. */
export interface SourceStamp {
  pages: Record<string, string>;
}

/**
 * A place that publishes the IM8 catalog. The GovTech site is the first. Another source (such as the second GovTech
 * site behind a sign-in) implements this and joins the list in `check.ts`.
 */
export interface CatalogSource {
  id: string;
  /** What the admin reads, such as "GovTech site". */
  label: string;
  /** Reads the source's own list of changes. Fetches no control. */
  check(): Promise<SourceStamp>;
  /** Fetches and reads every page. Throws `SourceUnreachableError` or `SiteLayoutError`. */
  fetchRelease(stamp: SourceStamp): Promise<IncomingRelease>;
}

/** The network failed or the site answered with an error. */
export class SourceUnreachableError extends Error {
  constructor(readonly detail?: string) {
    super('Could not reach GovTech.');
    this.name = 'SourceUnreachableError';
  }
}
