import { verdictFor } from '@/lib/plan/verdict';
import type { RiskAnswers } from '@/lib/risk/assess';
import { profileFor } from '@/lib/risk/assess';
import { makeProfile, makeVersion } from '../helpers/factories';

const LOW: RiskAnswers = {
  classification: 'restricted',
  sensitivity: 'sensitive-normal',
  impact: 'slight',
  downstream: 'minimal',
  cii: false,
  sii: false,
};

const PROFILES = [
  { ...makeProfile('low-risk-cloud', [{ id: 'as-1' }]), title: 'Low-Risk Cloud', riskLevel: 'low' as const, hosting: 'cloud' as const },
  { ...makeProfile('medium-risk-cloud', [{ id: 'as-1' }]), title: 'Medium-Risk Cloud', riskLevel: 'medium' as const, hosting: 'cloud' as const },
  { ...makeProfile('high-risk-cloud-cii', [{ id: 'as-1' }]), title: 'High-Risk Cloud CII', riskLevel: 'high' as const, requiresCii: true, hosting: 'cloud' as const },
];
const VERSIONS = [{ current: makeVersion('appcentral', 'low-risk-cloud', 1, []) }];

test.each([
  ['Low', LOW, 'plan', 'low-risk-cloud', 'Low-Risk Cloud', 'You can plan this app with Blueprint.'],
  ['Medium (Cloud Eligible)', { ...LOW, classification: 'confidential-cloud-eligible' }, 'plan', 'medium-risk-cloud', 'Medium-Risk Cloud', 'You can plan it. Involve your security team early.'],
  ['High and CII', { ...LOW, cii: true }, 'plan', 'high-risk-cloud-cii', 'High-Risk Cloud CII', 'You can plan it. Involve your security team from the start.'],
  ['High, not CII', { ...LOW, impact: 'critical' }, 'not-yet', null, 'High-risk app on the cloud', "Blueprint can't plan this app yet."],
  ['Confidential', { ...LOW, classification: 'confidential' }, 'not-cloud', null, 'Not for the cloud', "This data can't be hosted on the cloud, so Blueprint can't plan it with CPF's cloud tools."],
  ['S-class', { ...LOW, classification: 's-class' }, 'not-cloud', null, 'Not for the cloud', "This data can't be hosted on the cloud, so Blueprint can't plan it with CPF's cloud tools."],
] as const)('%s', (_, answers, kind, profileId, heading, sentence) => {
  const v = verdictFor(answers as RiskAnswers, PROFILES, VERSIONS);
  expect(v).toMatchObject({ kind, profileId, heading, sentence });
});

test('Medium with no tool coverage says so', () => {
  expect(verdictFor({ ...LOW, sensitivity: 'sensitive-high' }, PROFILES, VERSIONS).coverageLine)
    .toBe('No tool covers Medium-Risk Cloud yet, so more of the work is yours.');
});

test('Low with coverage has no coverage line', () => expect(verdictFor(LOW, PROFILES, VERSIONS).coverageLine).toBeUndefined());

test('a Confidential app lists the data reason first and once', () => {
  const v = verdictFor({ ...LOW, classification: 'confidential' }, PROFILES, VERSIONS);
  expect(v.reasons.filter(r => r === 'The data is Confidential.')).toHaveLength(1);
});

test('profileFor needs CII to match the High profile, and returns null with no profile loaded', () => {
  expect(profileFor({ ...LOW, impact: 'critical', cii: true }, PROFILES)).toBe('high-risk-cloud-cii');
  expect(profileFor({ ...LOW, impact: 'critical' }, PROFILES)).toBeNull();
  expect(profileFor(LOW, [])).toBeNull();
});
