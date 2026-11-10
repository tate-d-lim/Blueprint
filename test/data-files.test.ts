import { existsSync, readFileSync } from 'node:fs';

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

describe('partOfAppWhen', () => {
  const read = (file: string) => JSON.parse(readFileSync(`data/seed/${file}`, 'utf8')) as { toolId?: string; _id?: string; partOfAppWhen?: string }[];
  const all = [...read('tools.json'), ...read('guides.json')].map(t => [t._id ?? t.toolId, t.partOfAppWhen] as const);

  test.each(all)('%s has one lower-case line that ends with a full stop', (_id, line) => {
    expect(line, 'missing').toBeTruthy();
    expect(line).toMatch(/^[a-z0-9].*\.$/);
  });
});
