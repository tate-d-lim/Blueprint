"use client";

import { useActionState, useState } from "react";
import { Button } from "@/app/ui/button";
import { Dialog } from "@/app/ui/dialog";
import { Checkbox, Field, inputClass, selectClass } from "@/app/ui/field";
import { Note } from "@/app/ui/note";
import { createToolAction } from "./actions";

/** The one main action of the list: a button that opens the new-tool form in a dialog. */
export function AddTool() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Add a tool</Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Add a tool" description="You record what it covers on the next page.">
        {open && <NewToolForm onCancel={() => setOpen(false)} />}
      </Dialog>
    </>
  );
}

function NewToolForm({ onCancel }: { onCancel: () => void }) {
  const [state, action, pending] = useActionState(createToolAction, null);
  return (
    <form action={action} className="flex flex-col gap-5">
      <Field label="Name">{props => <input {...props} name="name" required placeholder="DBaaS" className={inputClass} />}</Field>
      <Field label="What it is, in one line">
        {props => <input {...props} name="description" placeholder="Managed database service" className={inputClass} />}
      </Field>
      <div className="grid grid-cols-2 gap-5">
        <Field label="Section">
          {props => (
            <select {...props} name="section" defaultValue="cpf" className={selectClass}>
              <option value="cpf">CPF tools</option>
              <option value="wog">Whole-of-government tools</option>
              <option value="code">Code components</option>
            </select>
          )}
        </Field>
        <Field label="Kind">
          {props => (
            <select {...props} name="oscalType" defaultValue="service" className={selectClass}>
              <option value="service">Service or platform</option>
              <option value="software">Software or library</option>
            </select>
          )}
        </Field>
      </div>
      <Checkbox name="isSample" label="Mark as a sample (not confirmed by the tool's team)" />
      {state?.error && <Note tone="error">{state.error}</Note>}
      <div className="flex gap-3 border-t border-rule pt-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add tool"}
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
