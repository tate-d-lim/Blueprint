"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@/lib/role";
import { ResetButton } from "./reset-button";
import { RoleSwitcher } from "./role-switcher";

// Projects is the main page; a new plan starts from there.
const SHEETS = [{ href: "/projects", label: "Projects", paths: ["/projects"] }];

const ROLE_SHEETS: Partial<Record<Role, { href: string; label: string; paths: string[] }>> = {
  "tool-owner": { href: "/tool-owner", label: "Tool Owner", paths: ["/tool-owner"] },
  admin: { href: "/admin", label: "Admin", paths: ["/admin"] },
};

/** The simple header: product name, the sheets, who is looking, and the demo reset. The step pages show their own step. */
export function SiteHeader({ role }: { role: Role }) {
  const pathname = usePathname();
  const roleSheet = ROLE_SHEETS[role];
  const sheets = roleSheet ? [...SHEETS, roleSheet] : SHEETS;
  const isCurrent = (paths: string[]) => paths.some(p => pathname === p || pathname.startsWith(`${p}/`));

  return (
    <header style={{ height: "var(--header-h)" }} className="flex items-center gap-8 border-b border-rule bg-paper px-8">
      <Link href="/projects" className="wide text-lead font-semibold">
        Blueprint
      </Link>

      <nav aria-label="Sheets">
        <ul className="flex gap-6">
          {sheets.map(sheet => {
            const current = isCurrent(sheet.paths);
            return (
              <li key={sheet.href}>
                <Link
                  href={sheet.href}
                  aria-current={current ? "page" : undefined}
                  className={`text-body underline-offset-[6px] ${current ? "font-semibold underline decoration-2" : "text-ink-soft hover:text-ink hover:underline"}`}
                >
                  {sheet.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <span className="flex-1" />

      <div className="flex items-center gap-3">
        <RoleSwitcher role={role} />
        <ResetButton />
      </div>
    </header>
  );
}
