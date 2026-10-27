import { closeDb, getDb } from '../lib/data/db';
import { seedDatabase } from '../lib/data/seed';

async function main() {
  const counts = await seedDatabase(await getDb());
  for (const [name, n] of Object.entries(counts)) console.log(`${name}: ${n}`);
}

main()
  .catch(err => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(closeDb);
