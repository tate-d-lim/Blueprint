import Link from "next/link";
import { getRole } from "@/lib/role";
import { ResetButton } from "./reset-button";
import { RoleSwitcher } from "./role-switcher";

export async function Header() {
  const role = await getRole();
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-6 py-3">
        <Link href="/start" className="text-base font-semibold tracking-tight">
          Build plan
        </Link>
        <nav className="flex gap-4 text-sm text-muted">
          <Link href="/start" className="hover:text-foreground">
            New plan
          </Link>
          <Link href="/projects" className="hover:text-foreground">
            Saved projects
          </Link>
          {role === "admin" && (
            <Link href="/admin" className="hover:text-foreground">
              Admin
            </Link>
          )}
          {role === "verifier" && (
            <Link href="/verify" className="hover:text-foreground">
              Verify
            </Link>
          )}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <RoleSwitcher role={role} />
          <ResetButton />
        </div>
      </div>
    </header>
  );
}
