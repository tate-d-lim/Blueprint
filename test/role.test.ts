import { ROLES, ROLE_COOKIE, parseRole } from '@/lib/role';

test('a known role is accepted', () => {
  for (const role of ROLES) expect(parseRole(role)).toBe(role);
});

test('anything else falls back to builder', () => {
  expect(parseRole('x')).toBe('builder');
  expect(parseRole('ADMIN')).toBe('builder');
  expect(parseRole('')).toBe('builder');
  expect(parseRole(undefined)).toBe('builder');
});

test('the cookie is called "role"', () => {
  expect(ROLE_COOKIE).toBe('role');
});
