export const ROLES = ['builder', 'admin', 'verifier'] as const;
export type Role = (typeof ROLES)[number];
export const ROLE_COOKIE = 'role';

/** Anything that isn't a known role is the builder: the safe default. */
export function parseRole(value?: string): Role {
  return (ROLES as readonly string[]).includes(value ?? '') ? (value as Role) : 'builder';
}

/** The role chosen with the header switcher. A demo stand-in for login, not security. */
export async function getRole(): Promise<Role> {
  const { cookies } = await import('next/headers');
  return parseRole((await cookies()).get(ROLE_COOKIE)?.value);
}
