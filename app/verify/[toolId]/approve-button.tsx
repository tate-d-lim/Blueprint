"use client";

import { SgdsAlert, SgdsButton } from "@govtechsg/sgds-web-component/react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { approveAction } from "../actions";

export function ApproveButton({ versionId }: { versionId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  return (
    <div className="sgds:flex sgds:flex-col sgds:gap-sm">
      {error && (
        <SgdsAlert show outlined variant="danger">
          {error}
        </SgdsAlert>
      )}
      <div>
        <SgdsButton
          disabled={pending}
          onClick={() =>
            start(async () => {
              const result = await approveAction(versionId);
              if (result.error) setError(result.error);
              else router.push("/verify");
            })
          }
        >
          {pending ? "Approving…" : "Approve this version"}
        </SgdsButton>
      </div>
    </div>
  );
}
