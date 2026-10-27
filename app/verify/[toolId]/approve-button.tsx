"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { approveAction } from "../actions";

export function ApproveButton({ versionId }: { versionId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const result = await approveAction(versionId);
            if (result.error) setError(result.error);
            else router.push("/verify");
          })
        }
        className="rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Approving…" : "Approve this version"}
      </button>
      {error && <p className="mt-2 text-sm font-medium text-red-700">{error}</p>}
    </div>
  );
}
