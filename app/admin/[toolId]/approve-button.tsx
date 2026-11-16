"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/app/ui/button";
import { Note } from "@/app/ui/note";
import { approveAction } from "../actions";

export function ApproveButton({ versionId }: { versionId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  return (
    <div className="flex flex-col gap-3">
      {error && <Note tone="error">{error}</Note>}
      <div>
        <Button
          disabled={pending}
          onClick={() =>
            start(async () => {
              const result = await approveAction(versionId);
              if (result.error) setError(result.error);
              else router.push("/admin");
            })
          }
        >
          {pending ? "Approving…" : "Approve this version"}
        </Button>
      </div>
    </div>
  );
}
