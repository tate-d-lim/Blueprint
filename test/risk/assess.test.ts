import { OPTION_LABELS, RISK_SOURCE_URL, assessRisk, type RiskAnswers } from '@/lib/risk/assess';

const lowAnswers: RiskAnswers = {
  classification: 'restricted',
  sensitivity: 'sensitive-normal',
  impact: 'slight',
  downstream: 'minimal',
  cii: false,
  sii: false,
};
const assess = (over: Partial<RiskAnswers>) => assessRisk({ ...lowAnswers, ...over });

test('a restricted, sensitive-normal, slight-impact app is low risk on the Low-Risk Cloud profile', () => {
  expect(assess({})).toEqual({
    level: 'low',
    appType: 'Low-risk app on the cloud',
    reasons: ['Data up to Restricted and Sensitive Normal, at most Slight impact, and minimal impact on other systems.'],
    profileId: 'low-risk-cloud',
  });
});

test.each([
  [{ impact: 'critical' }, 'The worst impact is Critical.'],
  [{ cii: true }, 'The system is Critical Information Infrastructure (CII).'],
  [{ classification: 's-class' }, 'The data is S-class.'],
] as const)('high-risk trigger %j', (over, reason) => {
  const r = assess(over as Partial<RiskAnswers>);
  expect(r).toMatchObject({ level: 'high', appType: 'High-risk app on the cloud', profileId: null });
  expect(r.reasons).toEqual([reason]);
});

test.each([
  [{ impact: 'moderate' }, 'The worst impact is Moderate.'],
  [{ impact: 'significant' }, 'The worst impact is Significant.'],
  [{ sii: true }, 'The system is SII.'],
  [{ classification: 'confidential' }, 'The data is Confidential.'],
  [{ classification: 'confidential-cloud-eligible' }, 'The data is Confidential (Cloud Eligible).'],
  [{ sensitivity: 'sensitive-high' }, 'The data is Sensitive High.'],
  [{ downstream: 'significant' }, 'Systems that depend on it would be significantly affected.'],
] as const)('medium-risk trigger %j', (over, reason) => {
  const r = assess(over as Partial<RiskAnswers>);
  expect(r).toMatchObject({ level: 'medium', appType: 'Medium-risk app on the cloud', profileId: null });
  expect(r.reasons).toEqual([reason]);
});

test('high beats medium, and only the high triggers are listed', () => {
  const r = assess({ impact: 'critical', sii: true, sensitivity: 'sensitive-high', cii: true });
  expect(r.level).toBe('high');
  expect(r.reasons).toEqual(['The worst impact is Critical.', 'The system is Critical Information Infrastructure (CII).']);
});

test('several medium triggers are all listed, in a fixed order', () => {
  const r = assess({ impact: 'moderate', sii: true, classification: 'confidential', sensitivity: 'sensitive-high', downstream: 'significant' });
  expect(r.reasons).toEqual([
    'The worst impact is Moderate.',
    'The system is SII.',
    'The data is Confidential.',
    'The data is Sensitive High.',
    'Systems that depend on it would be significantly affected.',
  ]);
});

test('boundaries: Slight and No impact are low; Official (Open) with Non-Sensitive is low', () => {
  expect(assess({ impact: 'none' }).level).toBe('low');
  expect(assess({ impact: 'slight' }).level).toBe('low');
  expect(assess({ impact: 'moderate' }).level).toBe('medium');
  expect(assess({ classification: 'official-open', sensitivity: 'non-sensitive', impact: 'none' }).level).toBe('low');
  expect(assess({ classification: 'official-closed' }).level).toBe('low');
});

test('the source page and option labels are exposed for the screen', () => {
  expect(RISK_SOURCE_URL).toBe('https://docs.standards.tech.gov.sg/risk-materiality-level/');
  expect(OPTION_LABELS.classification['confidential-cloud-eligible']).toBe('Confidential (Cloud Eligible)');
  expect(OPTION_LABELS.impact.none).toBe('No impact');
  expect(OPTION_LABELS.downstream.minimal).toBe('None or minimal');
});
