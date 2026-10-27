import { DatabaseUnavailableError, withDb } from '@/lib/data/db';
import { seedDatabase } from '@/lib/data/seed';
import { isTrustedRequest } from '@/lib/request-origin';

export async function POST(request: Request) {
  if (!isTrustedRequest(request.headers)) return new Response('Reset has to be started from this app.', { status: 403 });
  try {
    await withDb(db => seedDatabase(db));
  } catch (err) {
    if (err instanceof DatabaseUnavailableError) return new Response(err.message, { status: 503 });
    throw err;
  }
  return Response.redirect(new URL('/start', request.url), 303);
}
