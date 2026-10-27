import { getRole, type Role } from "@/lib/role";

/** Shows its children only to the given role; otherwise asks the viewer to switch. */
export async function RoleGate({ need, children }: { need: Role; children: React.ReactNode }) {
  if ((await getRole()) === need) return <>{children}</>;
  return (
    <div className="mx-auto max-w-xl rounded-xl border border-amber-300 bg-amber-50 p-5">
      <h1 className="font-semibold">Switch to {need} to use this page.</h1>
      <p className="mt-2 text-sm text-muted">Use the role switcher at the top right.</p>
    </div>
  );
}
