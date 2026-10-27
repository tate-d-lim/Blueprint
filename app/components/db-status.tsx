import { getDbStatus } from "@/lib/data/status";

/** A banner shown above every page when the data isn't there, so the presenter sees the fix, not a generic error. */
export async function DbStatus() {
  const status = await getDbStatus();
  if (status === "ok") return null;
  return (
    <div role="alert" className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm">
      {status === "unavailable" ? (
        <>
          <p className="font-semibold">The database isn&apos;t running.</p>
          <p className="mt-1 text-muted">
            Start Docker, then run <code className="font-mono">docker-compose up -d</code> (or <code className="font-mono">docker compose up -d</code>) and reload.
          </p>
        </>
      ) : (
        <>
          <p className="font-semibold">The database is running but empty.</p>
          <p className="mt-1 text-muted">
            Run <code className="font-mono">npm run seed</code>, or press &ldquo;Reset demo data&rdquo; above, then reload.
          </p>
        </>
      )}
    </div>
  );
}
