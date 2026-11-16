import type { RiskAnswers } from '../risk/assess';

export type RequirementKey = `${string}:${string}`;
export type Level = 0 | 1 | 2;
export type CoverageValue = 'provided' | 'shared' | 'app-builder' | 'not-applicable';
export type Section = 'cpf' | 'wog' | 'code';
/** A control is done or it is not. A project saved before this change may hold 'in-progress'; it reads as not done. */
export type TaskStatus = 'todo' | 'done';
/** Who vouches for a builder's status: the builder (`self-declared`) or a pipeline check (`machine-checked`). */
export type EvidenceKind = 'self-declared' | 'machine-checked';
export interface TaskState { status: TaskStatus; note?: string; evidence?: EvidenceKind }

export interface Catalog {
  _id: string;
  title: string;
  version: string;
  sourceFile: string;
  derived: true;
  familyTitles: Record<string, string>;
}

export interface Requirement {
  _id: RequirementKey;
  catalogId: string;
  id: string;
  family: string;
  title: string;
  statement: string;
  recommendations: string;
  rationale: string;
  references: string;
  lastModified?: string;
}

/** A rule: "this requirement applies when ...", over the answers to the app facts. */
export type Rule =
  | { fact: string; is: string | string[] }
  | { all: Rule[] }
  | { any: Rule[] };

/** One answer a person can give to a fact. `reason` is the sentence shown when the answer rules a requirement out. */
export interface FactOption {
  value: string;
  label: string;
  reason?: string;
}

/**
 * Something about the app that a person can answer before it is built. A "tick" is yes or no; a "choice" is one of
 * its options. `showIf` hides the fact unless an earlier answer makes it relevant.
 */
export type Fact = {
  id: string;
  hint?: string;
  showIf?: Rule;
  /** Asked even when no rule reads it, for a fact that adds requirements by itself (such as using generative AI). */
  always?: true;
} & (
  | { kind: 'tick'; label: string; noReason: string }
  | { kind: 'choice'; question: string; options: FactOption[] }
);

/** Fact id to the value chosen. A tick is "yes" or "no". */
export type FactAnswers = Record<string, string>;

export interface PlainText {
  title: string;
  task: string;
  why: string;
  question?: string;
  /** The requirement only applies to apps whose answers satisfy this. No rule means it applies to every app. */
  appliesWhen?: Rule;
  /** The profiles this text and rule were checked for. Elsewhere the rule never applies, and the text only when the wording matches. */
  checkedFor: string[];
  /** When an admin last wrote this text on the Catalog sheet. Text from the source files has none. */
  editedAt?: string;
}

export interface ProfileEntry {
  key: RequirementKey;
  id: string;
  family: string;
  title: string;
  level: Level;
  statement: string;
  recommendations: string;
  rationale: string;
  references: string;
  ifUncovered: 'app-builder' | 'ask';
  /** The first 16 hex characters of the SHA-256 of the statement with whitespace collapsed: the wording fingerprint. */
  wording: string;
  plain?: PlainText;
}

export interface Profile {
  _id: string;
  title: string;
  plainTitle: string;
  version: string;
  /** The release the profile was taken from (today the file version). */
  release: string;
  /** Which risk level the profile is for. Profiles with no level (such as Generative AI) are added by a fact, not by the answers. */
  riskLevel?: 'low' | 'medium' | 'high';
  /** High-risk profile for Critical Information Infrastructure only. */
  requiresCii?: boolean;
  hosting?: 'cloud';
  sourceFile: string;
  entries: ProfileEntry[];
  /** What a person can tell us about the app; the entries' rules are written over these. */
  facts?: Fact[];
}

export interface Tool {
  _id: string;
  name: string;
  description: string;
  section: Section;
  oscalType: 'service' | 'software';
  isSample: boolean;
  /** One line that finishes "It is part of your app if …", so a builder can tell whether to tick the tool. */
  partOfAppWhen: string;
}

export type CheckKind = 'code-rule' | 'sbom' | 'pipeline';

/** A link to a test that runs somewhere else. Blueprint never runs it, and it never changes a placement or a status. */
export interface CoverageCheck {
  /** Stable, lower-kebab, unique within the tool. */
  id: string;
  /** One sentence: what passes. */
  description: string;
  kind: CheckKind;
}

export interface CoverageEntry {
  key: RequirementKey;
  value: CoverageValue;
  explanation?: string;
  builderPart?: string;
  source?: string;
  originalText?: string;
  checks?: CoverageCheck[];
}

export interface Approval {
  at: string;
  by: string;
  kind: 'verifier' | 'govtech-published';
}

export interface SentBack {
  at: string;
  by: string;
  /** What the tool owner should correct, in the admin's words. */
  note: string;
}

export interface ToolVersion {
  _id: string;
  toolId: string;
  profileId: string;
  version: number;
  writtenAgainst: string;
  source: string;
  changeNote?: string;
  createdAt: string;
  createdByRole: 'admin' | 'seed';
  approval?: Approval;
  /** The admin sent this version back with a note. It is not approved, and builders never see it. */
  sentBack?: SentBack;
  importedFrom?: { fileName: string; missingKeys: RequirementKey[]; by?: 'coding-agent' };
  entries: CoverageEntry[];
}

export interface Project {
  _id: string;
  name: string;
  ownerName: string;
  riskAnswers: RiskAnswers;
  toolIds: string[];
  taskStatus: Record<RequirementKey, TaskState>;
  questionAnswers: Record<RequirementKey, { applies: boolean; reason: string }>;
  /** Answers about the app. Projects saved before these existed have none, and every requirement applies. */
  facts?: FactAnswers;
  /** The builder read the notice about catalog releases applied up to this time. With none, the time the project was made counts. */
  catalogSeenAt?: string;
  /** How far the builder is with the "Next" strip of a new project. */
  next?: ProjectNext;
  createdAt: string;
  updatedAt: string;
}

/** The three first steps of a saved project: pick tools, give the plan to the agent, tick controls. */
export interface ProjectNext {
  /** The builder said the app has no tools, so step 1 is done with no tool picked. */
  noTools?: true;
  /** When the builder first downloaded the security plan or copied the prompt for the agent. */
  handedOffAt?: string;
  /** The builder closed the strip. */
  hidden?: true;
}

/** Where a catalog release came from. */
export interface ReleaseSource {
  kind: 'seed' | 'upload' | 'fetch';
  /** The file name, or the address of the GovTech page. */
  label: string;
  /** The date the source gives for itself (a "last updated" date), when it has one. */
  sourceDate?: string;
}

/** What one release changed in one profile. Titles are kept, because a removed control is no longer in the profile. */
export interface ProfileChanges {
  profileId: string;
  added: { id: string; title: string }[];
  removed: { id: string; title: string }[];
  reworded: { id: string; title: string }[];
  levelChanged: { id: string; title: string; from: Level; to: Level }[];
}

/**
 * One applied change of the IM8 catalog. The first one is the seed (no changes). Notices for builders and tool owners
 * are worked out from these records and the time each was applied.
 */
export interface CatalogRelease {
  _id: string;
  appliedAt: string;
  by: string;
  source: ReleaseSource;
  changes: ProfileChanges[];
}
