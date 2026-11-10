/** The step number shown in the header, from the page path. Null where the page is not one of the five steps. */
export function stepFor(pathname: string): 1 | 2 | 3 | 4 | 5 | null {
  if (pathname === '/start') return 1;
  if (pathname === '/start/verdict') return 2;
  if (pathname === '/start/app') return 3;
  if (pathname === '/start/needs') return 4;
  if (/^\/projects\/[^/]+\/tools$/.test(pathname)) return 5;
  return null;
}
