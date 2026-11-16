import type { Level, ProfileChanges, ReleaseSource } from '../domain/types';

/** One control as a release file or the GovTech site gives it. */
export interface IncomingEntry {
  /** Lower case, such as `as-5`. */
  id: string;
  title: string;
  /** Absent when the source has no levels (an OSCAL catalog). */
  level?: Level;
  statement: string;
  recommendations: string;
  rationale: string;
  /** Empty when the source carries no references: the profile then keeps the ones it has. */
  references: string;
}

export interface IncomingProfile {
  profileId: string;
  entries: IncomingEntry[];
  /**
   * The file has no levels and cannot say which controls belong to the profile (an OSCAL catalog). Levels never change,
   * a control of the profile that is missing from the file counts as removed, and controls of the file that are not in
   * the profile are ignored.
   */
  wordingOnly?: true;
}

export interface IncomingRelease {
  source: ReleaseSource;
  profiles: IncomingProfile[];
  /** Plain sentences for the review screen, such as how many controls of the file were ignored. */
  notes: string[];
}

export type { Level, ProfileChanges, ReleaseSource };

/** The words of one reworded control, for the review screen. */
export interface RewordedDetail {
  id: string;
  title: string;
  before: string;
  after: string;
}

/** What the review screen needs about one profile: the counts and the words. */
export interface ProfileDiff {
  changes: ProfileChanges;
  reworded: RewordedDetail[];
  /** The full incoming entry of each added control. */
  added: IncomingEntry[];
  /** Controls whose title changed and nothing else. Applied with no remark. */
  retitled: { id: string; from: string; to: string }[];
  /** Ids in a wording-only file that are not in the profile. They are ignored. */
  ignored: string[];
  /** True when the release changes this profile in any way that the page shows. */
  changed: boolean;
}

/** An error whose message is written for the person who reads it. */
export class CatalogError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CatalogError';
  }
}

export const LAYOUT_HELP = 'Blueprint reads an .xlsx file with a sheet named "ssp" or "catalog", or an OSCAL catalog in a .json file.';

/** A release that waits for the admin: read from a file or from the GovTech site, not yet applied. Collection `catalogPending`. */
export interface PendingRelease {
  _id: string;
  createdAt: string;
  by: string;
  incoming: IncomingRelease;
  /** For a fetched release: the id of the source and the page stamps to store as the baseline once it is applied. */
  sourceId?: string;
  stamp?: { pages: Record<string, string> };
}

export type CheckOutcome = 'no-change' | 'changed' | 'unreachable' | 'error';

/** The result of one check of a source. Collection `catalogChecks`. */
export interface CatalogCheck {
  _id: string;
  at: string;
  sourceId: string;
  outcome: CheckOutcome;
  /** The date the source gives for itself ("last updated"). */
  sourceDate?: string;
  /** For `changed`: the pending release to review. */
  pendingId?: string;
  /** For `unreachable` and `error`: a plain sentence. */
  error?: string;
}

/** What the source looked like at the last check that ended in no change, or in an applied release. Collection `catalogBaselines`. */
export interface CatalogBaseline {
  _id: string;
  at: string;
  pages: Record<string, string>;
  sourceDate?: string;
}
