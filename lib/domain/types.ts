import type { RiskAnswers } from '../risk/assess';

export type RequirementKey = `${string}:${string}`;
export type Level = 0 | 1 | 2;
export type CoverageValue = 'provided' | 'shared' | 'app-builder' | 'not-applicable' | 'other-tool';
export type Section = 'cpf' | 'wog' | 'code';
export type TaskStatus = 'todo' | 'in-progress' | 'done';
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
  otherToolId?: string;
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
  /** Set when the builder leaves the tools step. A project without it opens on the tools step. ISO date-time. */
  toolsReviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}
