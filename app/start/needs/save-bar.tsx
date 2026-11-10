"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { createProjectAction, saveProjectAnswersAction } from "@/app/projects/actions";
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
}: {
  answers: RiskAnswers;
  facts: FactAnswers;
  defaultName: string;
  edit: { projectId: string; projectName: string } | null;
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
        router.replace(result.profileChanged ? `/projects/${edit.projectId}/tools` : `/projects/${edit.projectId}`);
      } else {
        const result = await createProjectAction({ name, riskAnswers: answers, facts });
        if (!result.ok) throw new Error(result.error);
        // Replace, so Back from the tools step goes to step 3 and never saves a second copy.
        router.replace(`/projects/${result.id}/tools`);
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
      <div className="flex items-center gap-4">
        <Button type="button" onClick={save} disabled={pending || (!edit && !name.trim())}>
          {edit ? `Save changes to ${edit.projectName}` : "Save this plan"}
        </Button>
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
