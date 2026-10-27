import { existsSync } from 'node:fs';

const source = ['im8-reform.json', 'im8-lite-catalog.xlsx', 'low-risk-cloud-ssp.xlsx', 'gen-ai-catalog.xlsx'];
const guides = [
  'FormSG-Component-Guide-DSS.xlsx',
  'WebSG-Component-Guide-DSS.xlsx',
  'WebSG-LowRiskCloud_2026-06-22.xlsx',
  'Isomer-low-risk-cloud-ssp_06Oct2025_Final.xlsx',
  'CWP-low-risk-cloud-ssp_v1.2.xlsx',
];

test.each(source)('data/source/%s exists', f => expect(existsSync(`data/source/${f}`)).toBe(true));
test.each(guides)('data/guides/%s exists', f => expect(existsSync(`data/guides/${f}`)).toBe(true));
