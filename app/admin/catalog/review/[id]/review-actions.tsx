"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/app/ui/button";
import { Note } from "@/app/ui/note";
import { applyReleaseAction, discardReleaseAction } from "../../actions";

/** The decision bar of a review. It stays at the foot of the window: one main action, and a second that throws the release away. */
export function ReviewActions({ pendingId, canApply, fetched, summary }: { pendingId: string; canApply: boolean; fetched: boolean; summary: string }) {
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

  const afterDiscard = !canApply
    ? "There is nothing to apply. Discard it to leave the review."
    : fetched
      ? "If you discard it, Blueprint shows these changes again only when GovTech changes its pages, or when you select \u201cCheck GovTech now\u201d."
      : "If you discard it, the catalog stays as it is. You can upload the file again.";

  return (
    <div className="sticky bottom-0 z-10 -mx-8 flex flex-col gap-3 border-t border-rule-strong bg-paper px-8 py-4">
      {error && <Note tone="error">{error}</Note>}
      <div className="flex max-w-page flex-wrap items-center justify-between gap-x-8 gap-y-3">
        <div className="flex flex-col gap-1">
          <p className="tnum text-body font-semibold text-ink">{canApply ? summary : "This release changes nothing."}</p>
          <p className="max-w-measure text-small text-ink-soft">{afterDiscard}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" disabled={pending} onClick={discard}>
            Discard
          </Button>
          {canApply && (
            <Button disabled={pending} onClick={apply}>
              {pending ? "Applying\u2026" : "Apply this release"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
