import { Note } from "@/app/ui/note";
import { getRole, type Role } from "@/lib/role";

const LABELS: Record<Role, string> = { builder: "Builder", admin: "Admin", verifier: "Verifier" };

/** Shows its children only to the given role; otherwise asks the viewer to switch. */
export async function RoleGate({ need, children }: { need: Role; children: React.ReactNode }) {
  if ((await getRole()) === need) return <>{children}</>;
  return (
    <div className="max-w-message">
      <Note tone="info" title={`Switch to ${LABELS[need]} to use this sheet.`}>
        Change &ldquo;Viewing as&rdquo; in the title block at the top.
      </Note>
    </div>
  );
}
