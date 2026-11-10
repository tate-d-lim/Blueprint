import type { Profile } from '../domain/types';
import { OPTION_LABELS, assessRisk, cloudEligible, profileFor, type RiskAnswers } from '../risk/assess';
import type { VersionPair } from './verification';

export interface Verdict {
  kind: 'plan' | 'not-cloud' | 'not-yet';
  profileId: string | null;
  heading: string;
  sentence: string;
  coverageLine?: string;
  reasons: string[];
}

const NOT_CLOUD = "This data can't be hosted on the cloud, so Blueprint can't plan it with CPF's cloud tools.";
const NOT_YET = "Blueprint can't plan this app yet.";
const PLAN_SENTENCE = {
  low: 'You can plan this app with Blueprint.',
  medium: 'You can plan it. Involve your security team early.',
  high: 'You can plan it. Involve your security team from the start.',
} as const;

/** What step 2 says: the words come from the answers, the loaded profiles and the tool coverage, never from fixed profile IDs. */
export function verdictFor(a: RiskAnswers, profiles: Profile[], versions: VersionPair[]): Verdict {
  const risk = assessRisk(a);

  if (!cloudEligible(a)) {
    const dataReason = `The data is ${OPTION_LABELS.classification[a.classification]}.`;
    const reasons = risk.reasons.includes(dataReason) ? risk.reasons : [dataReason, ...risk.reasons];
    return { kind: 'not-cloud', profileId: null, heading: 'Not for the cloud', sentence: NOT_CLOUD, reasons };
  }

  const profileId = profileFor(a, profiles);
  const profile = profiles.find(p => p._id === profileId);
  if (!profile) {
    return { kind: 'not-yet', profileId: null, heading: risk.appType, sentence: NOT_YET, reasons: risk.reasons };
  }

  const covered = versions.some(v => v.current.profileId === profile._id);
  return {
    kind: 'plan',
    profileId: profile._id,
    heading: profile.title,
    sentence: PLAN_SENTENCE[risk.level],
    ...(covered ? {} : { coverageLine: `No tool covers ${profile.title} yet, so more of the work is yours.` }),
    reasons: risk.reasons,
  };
}
