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

export interface RiskResult {
  level: 'low' | 'medium' | 'high';
  appType: string;
  reasons: string[];
}

export const RISK_SOURCE_URL = 'https://docs.standards.tech.gov.sg/risk-materiality-level/';

export const OPTION_LABELS = {
  classification: {
    'official-open': 'Official (Open)',
    'official-closed': 'Official (Closed)',
    restricted: 'Restricted',
    'confidential-cloud-eligible': 'Confidential (Cloud Eligible)',
    confidential: 'Confidential',
    's-class': 'S-class',
  },
  sensitivity: {
    'non-sensitive': 'Non-Sensitive',
    'sensitive-normal': 'Sensitive Normal',
    'sensitive-high': 'Sensitive High',
  },
  impact: {
    none: 'No impact',
    slight: 'Slight',
    moderate: 'Moderate',
    significant: 'Significant',
    critical: 'Critical',
  },
  downstream: {
    minimal: 'None or minimal',
    significant: 'Significant',
  },
} as const satisfies {
  classification: Record<Classification, string>;
  sensitivity: Record<Sensitivity, string>;
  impact: Record<Impact, string>;
  downstream: Record<Downstream, string>;
};

const LOW_REASON =
  'Data up to Restricted and Sensitive Normal, at most Slight impact, and minimal impact on other systems.';

/** Applies the risk materiality table: any High trigger wins, then any Medium trigger, otherwise Low. */
export function assessRisk(a: RiskAnswers): RiskResult {
  const high: string[] = [];
  if (a.impact === 'critical') high.push('The worst impact is Critical.');
  if (a.cii) high.push('The system is Critical Information Infrastructure (CII).');
  if (a.classification === 's-class') high.push('The data is S-class.');
  if (high.length) {
    return { level: 'high', appType: 'High-risk app on the cloud', reasons: high };
  }

  const medium: string[] = [];
  if (a.impact === 'moderate' || a.impact === 'significant') {
    medium.push(`The worst impact is ${OPTION_LABELS.impact[a.impact]}.`);
  }
  if (a.sii) medium.push('The system is SII.');
  if (a.classification === 'confidential' || a.classification === 'confidential-cloud-eligible') {
    medium.push(`The data is ${OPTION_LABELS.classification[a.classification]}.`);
  }
  if (a.sensitivity === 'sensitive-high') medium.push('The data is Sensitive High.');
  if (a.downstream === 'significant') medium.push('Systems that depend on it would be significantly affected.');
  if (medium.length) {
    return { level: 'medium', appType: 'Medium-risk app on the cloud', reasons: medium };
  }

  return { level: 'low', appType: 'Low-risk app on the cloud', reasons: [LOW_REASON] };
}

/** Confidential (not cloud-eligible) and S-class data cannot be hosted on the cloud, whatever the risk level. */
export function cloudEligible(a: RiskAnswers): boolean {
  return a.classification !== 'confidential' && a.classification !== 's-class';
}

interface ProfileRule {
  _id: string;
  riskLevel?: 'low' | 'medium' | 'high';
  requiresCii?: boolean;
  hosting?: 'cloud';
}

/**
 * The cloud profile that fits the answers, or null. It takes the answers, not the result, because CII and cloud
 * eligibility come from the answers: at High risk only the CII profile exists.
 */
export function profileFor(a: RiskAnswers, profiles: ProfileRule[]): string | null {
  if (!cloudEligible(a)) return null;
  const level = assessRisk(a).level;
  const found = profiles.find(
    p => p.hosting === 'cloud' && p.riskLevel === level && (level !== 'high' || !!p.requiresCii === a.cii),
  );
  return found?._id ?? null;
}
