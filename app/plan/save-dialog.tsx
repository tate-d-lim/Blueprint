"use client";

import { SgdsAlert, SgdsButton, SgdsInput, SgdsModal } from "@govtechsg/sgds-web-component/react";
import { useRouter } from "next/navigation";
import { valueOf } from "@/app/components/sgds-events";
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

  return (
    <>
      <SgdsButton variant="outline" onClick={() => setOpen(true)}>
        Save this plan
      </SgdsButton>
      <SgdsModal open={open} onSgdsClose={() => setOpen(false)} hasFooterSlot>
        <h2 slot="title" className="sgds:text-heading-sm sgds:font-semibold">
          Save this plan
        </h2>
        <form
          id="save-plan-form"
          className="sgds:flex sgds:flex-col sgds:gap-sm"
          onSubmit={e => {
            e.preventDefault();
            start(async () => {
              const result = await createProjectAction({ name, ownerName, riskAnswers: answers, toolIds });
              if (result.ok) router.push(`/projects/${result.id}`);
              else setError(result.error);
            });
          }}
        >
          <SgdsInput label="Project name" name="name" placeholder="" required value={name} onSgdsInput={e => setName(valueOf(e))} />
          <SgdsInput label="Your name" name="ownerName" placeholder="" required value={ownerName} onSgdsInput={e => setOwnerName(valueOf(e))} />
          {error && (
            <SgdsAlert show outlined variant="danger">
              {error}
            </SgdsAlert>
          )}
        </form>
        <div slot="footer" className="sgds:flex sgds:justify-end sgds:gap-sm">
          <SgdsButton variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </SgdsButton>
          <SgdsButton type="submit" form="save-plan-form" disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </SgdsButton>
        </div>
      </SgdsModal>
    </>
  );
}
