"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/app/ui/button";
import { Dialog } from "@/app/ui/dialog";
import { Field, textareaClass } from "@/app/ui/field";
import { Note } from "@/app/ui/note";
import { SEND_BACK_NOTE_MAX } from "@/lib/admin/decisions";
import { approveAction, sendBackAction } from "../actions";

/** The decision at the foot of a review: one main action, and a second that asks for a note. */
export function Decision({ versionId, toolName, version }: { versionId: string; toolName: string; version: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  const [asking, setAsking] = useState(false);
  const [note, setNote] = useState("");

  const done = (kind: "approved" | "sent-back") =>
    router.push(`/admin?done=${kind}&tool=${encodeURIComponent(toolName)}&version=${version}`);

  const approve = () =>
    start(async () => {
      const result = await approveAction(versionId);
      if (result.error) setError(result.error);
      else done("approved");
    });

  const sendBack = () =>
    start(async () => {
      const result = await sendBackAction(versionId, note);
      if (result.error) setError(result.error);
      else done("sent-back");
    });

  return (
    <div className="flex flex-col gap-3 border-t border-rule pt-5">
      {error && !asking && <Note tone="error">{error}</Note>}
      <div className="flex flex-wrap gap-3">
        <Button disabled={pending} onClick={approve}>
          {pending && !asking ? "Approving…" : "Approve this version"}
        </Button>
        <Button
          variant="secondary"
          disabled={pending}
          onClick={() => {
            setError(undefined);
            setAsking(true);
          }}
        >
          Send back
        </Button>
      </div>
      <Dialog
        open={asking}
        onClose={() => setAsking(false)}
        title="Send this version back"
        description={`${toolName}, version ${version}. The tool owner sees your note on the tool page.`}
      >
        <form
          className="flex flex-col gap-5"
          onSubmit={e => {
            e.preventDefault();
            sendBack();
          }}
        >
          <Field label="What should the tool owner correct?" hint={`Up to ${SEND_BACK_NOTE_MAX} characters.`}>
            {props => (
              <textarea {...props} rows={5} maxLength={SEND_BACK_NOTE_MAX} value={note} onChange={e => setNote(e.target.value)} className={textareaClass} />
            )}
          </Field>
          {error && <Note tone="error">{error}</Note>}
          <div className="flex gap-3 border-t border-rule pt-4">
            <Button type="submit" disabled={pending || !note.trim()}>
              {pending ? "Sending back…" : "Send this version back"}
            </Button>
            <Button variant="secondary" onClick={() => setAsking(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
