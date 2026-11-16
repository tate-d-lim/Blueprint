import { agentPromptInput, buildAgentPrompt, type AgentPromptInput } from '@/lib/export/agent-prompt';
import { buildSsp } from '@/lib/export/oscal';
import { buildPlan, type PlanData } from '@/lib/plan/engine';
import { planTotals } from '@/lib/plan/hotel';
import { pairVersions, selectPlanInput } from '@/lib/plan/select';
import type { RiskAnswers } from '@/lib/risk/assess';
import { loadSeed } from '../helpers/seed';

const base: AgentPromptInput = { appName: 'Leave app', profiles: ['Low-Risk Cloud'], tools: [], planned: 12, needsAssessment: 0 };
const answers: RiskAnswers = { classification: 'restricted', sensitivity: 'sensitive-normal', impact: 'slight', downstream: 'minimal', cii: false, sii: false };

describe('buildAgentPrompt', () => {
  it('says plainly that an app with no tools has all the controls', () => {
    const text = buildAgentPrompt(base);
    expect(text).toContain('Leave app');
    expect(text).toContain('It is the security plan for "Leave app".');
    expect(text).toContain('IM8 profile: Low-Risk Cloud.');
    expect(text).toContain('This app uses no tools. All the controls are mine.');
    expect(text).toContain('12 controls are in state "planned" for me.');
    expect(text).not.toContain('Use each tool');
  });

  it('gives one line for one tool, with its number of controls', () => {
    const text = buildAgentPrompt({ ...base, tools: [{ name: 'appCentral', controls: 66 }] });
    expect(text).toContain('- appCentral does 66 controls.');
    expect(text).not.toContain('uses no tools');
    expect(text).toContain('Use each tool for what it does. Do not build that again.');
  });

  it('gives one line for each tool, and a line names one tool only', () => {
    const text = buildAgentPrompt({ ...base, tools: [{ name: 'appCentral', controls: 66 }, { name: 'DBaaS', controls: 1 }] });
    const lines = text.split('\n').filter(l => l.includes(' does '));
    expect(lines).toEqual(['- appCentral does 66 controls.', '- DBaaS does 1 control.']);
    for (const line of lines) expect(line.includes('appCentral') && line.includes('DBaaS')).toBe(false);
  });

  it('names both profiles when GenAI is added', () => {
    const text = buildAgentPrompt({ ...base, profiles: ['Low-Risk Cloud', 'Generative AI'] });
    expect(text).toContain('IM8 profiles: Low-Risk Cloud and Generative AI.');
  });

  it('asks about "Needs assessment" only when such controls exist', () => {
    expect(buildAgentPrompt(base)).not.toContain('Needs assessment');
    expect(buildAgentPrompt({ ...base, needsAssessment: 3 })).toContain('Ask me before you start a control that says "Needs assessment".');
  });

  it('keeps the SSP words and the report rule', () => {
    const text = buildAgentPrompt({ ...base, planned: 1 });
    expect(text).toContain('1 control is in state "planned" for me.');
    expect(text).toContain('Leave the controls in state "implemented".');
    expect(text).toContain('tell me which one');
  });
});

describe('agentPromptInput', () => {
  async function plan(toolIds: string[]) {
    const seed = await loadSeed();
    const data: PlanData = { profiles: seed.profiles, tools: seed.tools, versions: pairVersions(seed.toolVersions) };
    const input = selectPlanInput(data, { profileId: 'low-risk-cloud', toolIds });
    const built = buildPlan(input);
    const tools = input.pickedTools.map(tool => ({ tool, pairs: data.versions.filter(v => v.current.toolId === tool._id) }));
    const doc = buildSsp({ plan: built, profiles: input.profiles, tools, answers, generatedAt: '2026-11-16T09:00:00.000Z' });
    return { built, input, doc };
  }

  it('counts planned controls the way the SSP states them', async () => {
    const { built, input, doc } = await plan(['appcentral']);
    const counted = agentPromptInput({ appName: 'A', profiles: ['x'], plan: built, tools: input.pickedTools.map(t => ({ id: t._id, name: t.name })) });
    const requirements = (doc as any)['system-security-plan']['control-implementation']['implemented-requirements'] as any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
    const planned = requirements.filter(r => r['by-components']?.some((b: any) => b['implementation-status'].state === 'planned')); // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(counted.planned).toBe(planned.length);
    expect(counted.planned).toBeGreaterThan(0);
    expect(counted.tools).toHaveLength(1);
    expect(counted.tools[0].controls).toBeGreaterThan(0);
  });

  it('gives a tool the number that the project page shows as "by your tools"', async () => {
    const { built, input } = await plan(['appcentral']);
    const counted = agentPromptInput({ appName: 'A', profiles: ['x'], plan: built, tools: input.pickedTools.map(t => ({ id: t._id, name: t.name })) });
    expect(counted.tools[0].controls).toBe(planTotals(built).platform);
  });

  it('has no tool lines for an app with no tools', async () => {
    const { built } = await plan([]);
    expect(agentPromptInput({ appName: 'A', profiles: ['x'], plan: built, tools: [] }).tools).toEqual([]);
  });
});
