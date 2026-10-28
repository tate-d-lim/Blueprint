import { SgdsAlert } from "@govtechsg/sgds-web-component/react";
import { getDbStatus } from "@/lib/data/status";

/** A banner shown above every page when the data isn't there, so the presenter sees the fix, not a generic error. */
export async function DbStatus() {
  const status = await getDbStatus();
  if (status === "ok") return null;
  return (
    <div className="sgds:mx-auto sgds:w-full sgds:max-w-container-xl sgds:px-layout-md sgds:pt-layout-md">
      <SgdsAlert show outlined variant="warning" title={status === "unavailable" ? "The database isn't running." : "The database is running but empty."}>
        {status === "unavailable" ? (
          <>
            Start Docker, then run <code>docker-compose up -d</code> (or <code>docker compose up -d</code>) and reload.
          </>
        ) : (
          <>
            Run <code>npm run seed</code>, or press &ldquo;Reset demo data&rdquo; above, then reload.
          </>
        )}
      </SgdsAlert>
    </div>
  );
}
