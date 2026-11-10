import { stepFor } from '@/lib/plan/steps';

test.each([
  ['/start', 1], ['/start/verdict', 2], ['/start/app', 3], ['/start/needs', 4],
  ['/projects/abc/tools', 5], ['/projects/abc', null], ['/projects', null], ['/admin', null],
])('stepFor(%s) is %s', (path, n) => expect(stepFor(path)).toBe(n));
