import { Note } from "@/app/ui/note";
import { getDbStatus } from "@/lib/data/status";

/** A banner shown above every page when the data isn't there, so the presenter sees the fix, not a generic error. */
export async function DbStatus() {
  const status = await getDbStatus();
  if (status === "ok") return null;
  return (
    <div className="border-b border-rule px-10 py-4">
      <Note tone="error" title={status === "unavailable" ? "The database is not running." : "The database is running but empty."}>
        {status === "unavailable" ? (
          <>
            Start Docker, then run <code className="font-code text-small">docker-compose up -d</code> (or{" "}
            <code className="font-code text-small">docker compose up -d</code>) and reload.
          </>
        ) : (
          <>
            Run <code className="font-code text-small">npm run seed</code>, or press &ldquo;Reset demo data&rdquo; above, then reload.
          </>
        )}
      </Note>
    </div>
  );
}
