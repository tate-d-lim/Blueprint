"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createProjectAction } from "@/app/projects/actions";
import type { RiskAnswers } from "@/lib/risk/assess";

export function SaveDialog({ answers, toolIds }: { answers: RiskAnswers; toolIds: string[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="rounded-lg border border-line bg-surface px-4 py-2 text-sm font-medium hover:bg-background">
        Save this plan
      </button>
    );
  }
  return (
    <form
      className="flex w-full flex-wrap items-end gap-3 rounded-xl border border-line bg-surface p-4"
      onSubmit={e => {
        e.preventDefault();
        start(async () => {
          const result = await createProjectAction({ name, ownerName, riskAnswers: answers, toolIds });
          if (result.ok) router.push(`/projects/${result.id}`);
          else setError(result.error);
        });
      }}
    >
      <label className="text-sm font-medium">
        Project name
        <input value={name} onChange={e => setName(e.target.value)} required className="mt-1 block rounded-md border border-line px-2 py-1.5 text-sm font-normal" />
      </label>
      <label className="text-sm font-medium">
        Your name
        <input value={ownerName} onChange={e => setOwnerName(e.target.value)} required className="mt-1 block rounded-md border border-line px-2 py-1.5 text-sm font-normal" />
      </label>
      <button disabled={pending} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
        {pending ? "Saving…" : "Save"}
      </button>
      <button type="button" onClick={() => setOpen(false)} className="px-2 py-2 text-sm text-muted underline">
        Cancel
      </button>
      {error && <p className="w-full text-sm font-medium text-red-700">{error}</p>}
    </form>
  );
}
