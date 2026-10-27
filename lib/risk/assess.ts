// Types only for now; assessRisk() and the option labels arrive with the risk task.
export type Classification =
  | 'official-open'
  | 'official-closed'
  | 'restricted'
  | 'confidential-cloud-eligible'
  | 'confidential'
  | 's-class';
export type Sensitivity = 'non-sensitive' | 'sensitive-normal' | 'sensitive-high';
export type Impact = 'none' | 'slight' | 'moderate' | 'significant' | 'critical';
export type Downstream = 'minimal' | 'significant';
export interface RiskAnswers {
  classification: Classification;
  sensitivity: Sensitivity;
  impact: Impact;
  downstream: Downstream;
  cii: boolean;
  sii: boolean;
}
