"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setRole } from "@/app/actions/role";
import { ROLES, type Role } from "@/lib/role";

export function RoleSwitcher({ role }: { role: Role }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div role="group" aria-label="Role" className="inline-flex rounded-lg border border-line bg-background p-0.5 text-sm">
      {ROLES.map(r => (
        <button
          key={r}
          type="button"
          aria-pressed={r === role}
          disabled={pending}
          onClick={() =>
            start(async () => {
              await setRole(r);
              router.refresh();
            })
          }
          className={`rounded-md px-3 py-1 capitalize transition ${
            r === role ? "bg-accent text-white" : "text-muted hover:text-foreground"
          }`}
        >
          {r}
        </button>
      ))}
    </div>
  );
}
