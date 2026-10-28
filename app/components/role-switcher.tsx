"use client";

import { SgdsButton } from "@govtechsg/sgds-web-component/react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setRole } from "@/app/actions/role";
import { ROLES, type Role } from "@/lib/role";

const LABELS: Record<Role, string> = { builder: "Builder", admin: "Admin", verifier: "Verifier" };

export function RoleSwitcher({ role }: { role: Role }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div role="group" aria-label="Role" className="sgds:flex sgds:gap-2-xs">
      {ROLES.map(r => (
        <SgdsButton
          key={r}
          size="sm"
          variant="outline"
          active={r === role}
          disabled={pending}
          ariaLabel={r === role ? `${LABELS[r]} (current role)` : LABELS[r]}
          onClick={() =>
            start(async () => {
              await setRole(r);
              router.refresh();
            })
          }
        >
          {LABELS[r]}
        </SgdsButton>
      ))}
    </div>
  );
}
