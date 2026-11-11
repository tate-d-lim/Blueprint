"use client";

import { useState, useTransition } from "react";
import { Button } from "@/app/ui/button";
import { Dialog } from "@/app/ui/dialog";
import { Note } from "@/app/ui/note";
import { deleteProjectAction } from "./actions";

const LINK = "font-medium text-redline underline decoration-1 underline-offset-4 hover:decoration-2";

/**
 * Deletes a saved project after one confirm step. "row" is a button in the Projects list; "link" is a text link in a
 * project's own header. On success the action sends the builder to the Projects list, so this component is gone.
 */
export function DeleteProjectButton({ projectId, projectName, look }: { projectId: string; projectName: string; look: "row" | "link" }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const close = () => {
    if (pending) return;
    setOpen(false);
    setError(null);
  };
  const confirm = () =>
    startTransition(async () => {
      setError(null);
      try {
        const outcome = await deleteProjectAction(projectId);
        if (!outcome.ok) setError(outcome.error);
      } catch {
        setError("The project was not deleted. Check the server is running, then try again.");
      }
    });

  return (
    <>
      {look === "row" ? (
        <Button variant="secondary" size="sm" aria-label={`Delete ${projectName}`} onClick={() => setOpen(true)}>
          Delete
        </Button>
      ) : (
        <button type="button" className={LINK} onClick={() => setOpen(true)}>
          Delete project
        </button>
      )}
      <Dialog
        open={open}
        onClose={close}
        title="Delete this project?"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={close} disabled={pending}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirm} disabled={pending}>
              {pending ? "Deleting…" : "Delete project"}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="max-w-measure text-body">
            <strong className="font-semibold">{projectName}</strong> will be deleted, with its done marks, notes and answers. You cannot undo this.
          </p>
          {error && <Note tone="error">{error}</Note>}
        </div>
      </Dialog>
    </>
  );
}
