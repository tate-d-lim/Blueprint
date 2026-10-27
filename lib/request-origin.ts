/**
 * Is this request from one of our own pages, or from a tool that isn't a browser (curl, a test runner)?
 * A page on another website posting to us is refused: browsers label it cross-site.
 */
export function isTrustedRequest(headers: Headers): boolean {
  const site = headers.get('sec-fetch-site');
  if (site) return site === 'same-origin' || site === 'none';
  const origin = headers.get('origin');
  if (!origin) return true;
  try {
    return new URL(origin).host === headers.get('host');
  } catch {
    return false;
  }
}
