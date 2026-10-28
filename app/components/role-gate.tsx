import { SgdsAlert } from "@govtechsg/sgds-web-component/react";
import { getRole, type Role } from "@/lib/role";

/** Shows its children only to the given role; otherwise asks the viewer to switch. */
export async function RoleGate({ need, children }: { need: Role; children: React.ReactNode }) {
  if ((await getRole()) === need) return <>{children}</>;
  return (
    <div className="sgds:mx-auto sgds:max-w-container-md">
      <SgdsAlert show outlined variant="info" title={`Switch to ${need} to use this page.`}>
        Use the role buttons at the top right.
      </SgdsAlert>
    </div>
  );
}
