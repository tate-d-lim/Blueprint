"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { createProjectAction, saveProjectAnswersAction } from "@/app/projects/actions";
import Link from "next/link";
import { Button } from "@/app/ui/button";
import { Field, inputClass } from "@/app/ui/field";
import type { FactAnswers } from "@/lib/domain/types";
import { SAVE_FAILED } from "@/lib/plan/save";
import type { RiskAnswers } from "@/lib/risk/assess";

/** The foot of the side panel: the one main action of step 4. It saves a new project, or the changes to a saved one. */
export function SaveBar({
  answers,
  facts,
  defaultName,
  edit,
  highlight = false,
}: {
  answers: RiskAnswers;
  facts: FactAnswers;
  defaultName: string;
  edit: { projectId: string; projectName: string } | null;
  /** The last step of the tour points at the save. */
  highlight?: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(defaultName);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // A second click lands before React re-renders the disabled button, so the guard is a ref.
  const busy = useRef(false);

  const save = async () => {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      if (edit) {
        const result = await saveProjectAnswersAction(edit.projectId, { riskAnswers: answers, facts });
        if (!result.ok) throw new Error(result.error);
        router.replace(`/projects/${edit.projectId}`);
      } else {
        const result = await createProjectAction({ name, riskAnswers: answers, facts });
        if (!result.ok) throw new Error(result.error);
        // Replace, so Back from the saved project goes to step 3 and never saves a second copy.
        router.replace(`/projects/${result.id}`);
      }
    } catch (err) {
      busy.current = false;
      setPending(false);
      setError(err instanceof Error && err.message ? err.message : SAVE_FAILED);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {!edit && (
        <Field label="Plan name">{props => <input {...props} className={inputClass} value={name} onChange={e => setName(e.target.value)} />}</Field>
      )}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Button type="button" onClick={save} disabled={pending || (!edit && !name.trim())} className={highlight ? "ring-in" : ""}>
          {edit ? `Save changes to ${edit.projectName}` : "Save this plan"}
        </Button>
        {edit && !pending && (
          <Link href={`/projects/${edit.projectId}`} className="text-body font-medium text-ink underline decoration-1 underline-offset-4 hover:decoration-2">
            Cancel
          </Link>
        )}
        {pending && <span className="text-small text-ink-soft">Saving…</span>}
      </div>
      {error && (
        <p role="alert" className="text-small font-medium text-redline">
          {error}
        </p>
      )}
    </div>
  );
}
