"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TitleCell } from "@/app/ui/title-cell";
import type { Role } from "@/lib/role";
import { ResetButton } from "./reset-button";
import { RoleSwitcher } from "./role-switcher";

const SHEETS = [
  { href: "/start", label: "New plan", paths: ["/start", "/plan"] },
  { href: "/projects", label: "Saved projects", paths: ["/projects"] },
];

const ROLE_SHEETS: Partial<Record<Role, { href: string; label: string; paths: string[] }>> = {
  admin: { href: "/admin", label: "Admin", paths: ["/admin"] },
  verifier: { href: "/verify", label: "Verify", paths: ["/verify"] },
};

/**
 * The drawing's title block, used as the page header: what this is, which sheet you are on, the sheet's own
 * cells (a saved project's name, owner and revision date), and who is looking.
 */
export function TitleBlock({ role, cells }: { role: Role; cells?: React.ReactNode }) {
  const pathname = usePathname();
  const roleSheet = ROLE_SHEETS[role];
  const sheets = roleSheet ? [...SHEETS, roleSheet] : SHEETS;
  const isCurrent = (paths: string[]) => paths.some(p => pathname === p || pathname.startsWith(`${p}/`));

  return (
    <header className="flex divide-x divide-paper/25 border-b border-ink bg-blueprint text-paper">
      <TitleCell label="Drawing" className="shrink-0">
        <Link href="/start" className="font-display text-heading leading-none font-bold tracking-[0.04em] uppercase">
          Blueprint
        </Link>
        <span className="mt-1 block text-small text-paper/80">For CPFB app builders</span>
      </TitleCell>

      <TitleCell label="Sheets" className="flex-1">
        <nav aria-label="Sheets">
          <ul className="flex flex-wrap gap-x-6 gap-y-1">
            {sheets.map(sheet => {
              const current = isCurrent(sheet.paths);
              return (
                <li key={sheet.href}>
                  <Link
                    href={sheet.href}
                    aria-current={current ? "page" : undefined}
                    className={`font-display text-lead font-semibold underline-offset-[6px] ${
                      current ? "underline decoration-2" : "text-paper/80 hover:text-paper hover:underline"
                    }`}
                  >
                    {sheet.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </TitleCell>

      {cells}

      <TitleCell label="Viewing as" className="shrink-0">
        <RoleSwitcher role={role} />
      </TitleCell>

      <TitleCell label="Demo data" className="shrink-0">
        <ResetButton />
      </TitleCell>
    </header>
  );
}
