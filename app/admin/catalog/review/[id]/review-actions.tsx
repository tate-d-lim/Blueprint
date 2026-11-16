"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/app/ui/button";
import { Note } from "@/app/ui/note";
import { applyReleaseAction, discardReleaseAction } from "../../actions";

/** The decision at the foot of a review: one main action, and a second that throws the release away. */
export function ReviewActions({ pendingId, canApply }: { pendingId: string; canApply: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();

  const apply = () =>
    start(async () => {
      setError(undefined);
      const r = await applyReleaseAction(pendingId);
      if (r.ok) router.push(`/admin/catalog?applied=${encodeURIComponent(r.id ?? "")}`);
      else setError(r.error);
    });

  const discard = () =>
    start(async () => {
      setError(undefined);
      const r = await discardReleaseAction(pendingId);
      if (r.ok) router.push("/admin/catalog");
      else setError(r.error);
    });

  return (
    <div className="flex flex-col gap-3 border-t border-rule pt-5">
      {!canApply && <Note title="This release changes nothing.">There is nothing to apply. Discard it to leave the review.</Note>}
      {error && <Note tone="error">{error}</Note>}
      <div className="flex flex-wrap gap-3">
        {canApply && (
          <Button disabled={pending} onClick={apply}>
            {pending ? "Applying…" : "Apply this release"}
          </Button>
        )}
        <Button variant="secondary" disabled={pending} onClick={discard}>
          Discard
        </Button>
      </div>
    </div>
  );
}
