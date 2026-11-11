/**
 * The prompt a builder gives a coding agent, with the security plan (SSP) attached. The SSP is the plan: each control
 * has a state ("planned" or "implemented") and, for the builder's own controls, what to do and why.
 */
export const AGENT_PROMPT = [
  'Read the attached security plan (SSP) before you write any code.',
  'It lists every security control for this app, and the state of each one.',
  '',
  '- Do the controls in state "planned". Each one says what to do and why it matters.',
  '- Leave the controls in state "implemented". A tool or I did them already.',
  '- Ask me before you start a control that says "Needs assessment".',
  '- Use the tools the plan names. Do not build again what a tool already does.',
  '',
  'When you finish a control, tell me which one, so I can mark it done.',
].join('\n');
