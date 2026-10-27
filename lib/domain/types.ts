import type { RiskAnswers } from '../risk/assess';

export type RequirementKey = `${string}:${string}`;
export type Level = 0 | 1 | 2;
export type CoverageValue = 'provided' | 'shared' | 'app-builder' | 'not-applicable' | 'other-tool';
export type Section = 'cpf' | 'wog' | 'code';
export type TaskStatus = 'todo' | 'in-progress' | 'done';

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

export interface PlainText {
  title: string;
  task: string;
  why: string;
  question?: string;
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
  sourceFile: string;
  entries: ProfileEntry[];
}

export interface Tool {
  _id: string;
  name: string;
  description: string;
  section: Section;
  oscalType: 'service' | 'software';
  isSample: boolean;
  activatesProfiles?: string[];
}

export interface CoverageEntry {
  key: RequirementKey;
  value: CoverageValue;
  otherToolId?: string;
  explanation?: string;
  builderPart?: string;
  source?: string;
  originalText?: string;
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
  importedFrom?: { fileName: string; missingKeys: RequirementKey[] };
  entries: CoverageEntry[];
}

export interface Project {
  _id: string;
  name: string;
  ownerName: string;
  riskAnswers: RiskAnswers;
  toolIds: string[];
  taskStatus: Record<RequirementKey, { status: TaskStatus; note?: string }>;
  questionAnswers: Record<RequirementKey, { applies: boolean; reason: string }>;
  createdAt: string;
  updatedAt: string;
}
