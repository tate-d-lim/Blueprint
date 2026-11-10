"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setRole } from "@/app/actions/role";
import { ROLES, type Role } from "@/lib/role";

const LABELS: Record<Role, string> = { builder: "Builder", admin: "Admin", verifier: "Verifier" };

/** Stands in for sign-in during the demo: pick whose view of the app to see. */
export function RoleSwitcher({ role }: { role: Role }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <select
      aria-label="Viewing as"
      value={role}
      disabled={pending}
      onChange={e => {
        const next = e.target.value as Role;
        start(async () => {
          await setRole(next);
          router.refresh();
        });
      }}
      className="h-9 rounded-sm border border-rule-strong bg-paper pr-8 pl-3 text-small font-semibold text-ink hover:border-ink"
    >
      {ROLES.map(r => (
        <option key={r} value={r}>
          {LABELS[r]}
        </option>
      ))}
    </select>
  );
}
