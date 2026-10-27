import { withDb } from '@/lib/data/db';
import { seedDatabase } from '@/lib/data/seed';

export async function POST(request: Request) {
  await withDb(db => seedDatabase(db));
  return Response.redirect(new URL('/start', request.url), 303);
}
