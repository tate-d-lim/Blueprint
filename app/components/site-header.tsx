"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@/lib/role";
import { RoleSwitcher } from "./role-switcher";

// Projects is the main page; a new plan starts from there.
const SHEETS: Sheet[] = [{ href: "/projects", label: "Projects", paths: ["/projects", "/start"] }];

type Sheet = { href: string; label: string; paths: string[]; not?: string[] };

// The sheets each role gets beside Projects. The Catalog sheet lives under /admin, so Approvals leaves it out.
const ROLE_SHEETS: Partial<Record<Role, Sheet[]>> = {
  "tool-owner": [{ href: "/tool-owner", label: "Tools", paths: ["/tool-owner"] }],
  admin: [
    { href: "/admin", label: "Approvals", paths: ["/admin"], not: ["/admin/catalog"] },
    { href: "/admin/catalog", label: "Catalog", paths: ["/admin/catalog"] },
  ],
};

/** The simple header: product name, the sheets of the role, and who is looking. The step pages show their own step. */
export function SiteHeader({ role }: { role: Role }) {
  const pathname = usePathname();
  const sheets = [...SHEETS, ...(ROLE_SHEETS[role] ?? [])];
  const under = (paths: string[] = []) => paths.some(p => pathname === p || pathname.startsWith(`${p}/`));
  const isCurrent = (sheet: Sheet) => under(sheet.paths) && !under(sheet.not);

  return (
    <header style={{ height: "var(--header-h)" }} className="flex items-center gap-8 border-b border-rule bg-paper px-8">
      <Link href="/projects" className="wide text-lead font-semibold">
        Blueprint
      </Link>

      <nav aria-label="Sheets">
        <ul className="flex gap-6">
          {sheets.map(sheet => {
            const current = isCurrent(sheet);
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

      <RoleSwitcher role={role} />
    </header>
  );
}
