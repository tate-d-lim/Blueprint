import { MongoClient, MongoNetworkError, MongoServerSelectionError, type Db } from 'mongodb';

export class DatabaseUnavailableError extends Error {
  constructor() {
    super("The database is not running. Start it with `docker compose up -d`.");
    this.name = 'DatabaseUnavailableError';
  }
}

// Cached on globalThis so Next's dev hot reload doesn't open a new connection per edit.
const globalForMongo = globalThis as typeof globalThis & { __mongoClients?: Map<string, Promise<MongoClient>> };
const clients = (globalForMongo.__mongoClients ??= new Map());

const settings = () => ({
  uri: process.env.MONGODB_URI ?? 'mongodb://localhost:27017',
  dbName: process.env.MONGODB_DB ?? 'buildplan',
});

export async function getDb(): Promise<Db> {
  const { uri, dbName } = settings();
  let client = clients.get(uri);
  if (!client) {
    client = new MongoClient(uri, { serverSelectionTimeoutMS: 2000 }).connect();
    clients.set(uri, client);
    client.catch(() => clients.delete(uri));
  }
  return (await client).db(dbName);
}

export async function closeDb(): Promise<void> {
  const open = [...clients.values()];
  clients.clear();
  await Promise.all(open.map(async c => (await c.catch(() => undefined))?.close()));
}

/** Runs `fn` with the database; connection failures become a DatabaseUnavailableError. */
export async function withDb<T>(fn: (db: Db) => Promise<T>): Promise<T> {
  try {
    return await fn(await getDb());
  } catch (err) {
    if (err instanceof MongoServerSelectionError || err instanceof MongoNetworkError) {
      throw new DatabaseUnavailableError();
    }
    throw err;
  }
}
