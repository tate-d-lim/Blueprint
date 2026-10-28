"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createProjectAction } from "@/app/projects/actions";
import { Button } from "@/app/ui/button";
import { Dialog } from "@/app/ui/dialog";
import { Field, inputClass } from "@/app/ui/field";
import { Note } from "@/app/ui/note";
import type { RiskAnswers } from "@/lib/risk/assess";

export function SaveDialog({ answers, toolIds }: { answers: RiskAnswers; toolIds: string[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Save this plan
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Save this plan"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="save-plan-form" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </div>
        }
      >
        <form
          id="save-plan-form"
          className="flex flex-col gap-4"
          onSubmit={e => {
            e.preventDefault();
            start(async () => {
              const result = await createProjectAction({ name, ownerName, riskAnswers: answers, toolIds });
              if (result.ok) router.push(`/projects/${result.id}`);
              else setError(result.error);
            });
          }}
        >
          <p className="text-ink-soft">A saved plan lets you track each task and answer the questions as you go.</p>
          <Field label="Project name">
            {props => <input {...props} required value={name} onChange={e => setName(e.target.value)} placeholder="Payments portal" className={inputClass} />}
          </Field>
          <Field label="Your name">
            {props => <input {...props} required value={ownerName} onChange={e => setOwnerName(e.target.value)} className={inputClass} />}
          </Field>
          {error && <Note tone="error">{error}</Note>}
        </form>
      </Dialog>
    </>
  );
}
