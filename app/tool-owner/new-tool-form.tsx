"use client";

import { useActionState } from "react";
import { Button } from "@/app/ui/button";
import { Checkbox, Field, inputClass, selectClass } from "@/app/ui/field";
import { Note } from "@/app/ui/note";
import { Panel } from "@/app/ui/panel";
import { createToolAction } from "./actions";

export function NewToolForm() {
  const [state, action, pending] = useActionState(createToolAction, null);
  return (
    <Panel title="New tool">
      <form action={action} className="flex max-w-form flex-col gap-5">
        <div className="grid grid-cols-2 gap-5">
          <Field label="Name">{props => <input {...props} name="name" required placeholder="DBaaS" className={inputClass} />}</Field>
          <Field label="Section">
            {props => (
              <select {...props} name="section" defaultValue="cpf" className={selectClass}>
                <option value="cpf">CPF tools</option>
                <option value="wog">Whole-of-government tools</option>
                <option value="code">Code components</option>
              </select>
            )}
          </Field>
        </div>
        <Field label="What it is, in one line">
          {props => <input {...props} name="description" placeholder="Managed database service" className={inputClass} />}
        </Field>
        <div className="grid grid-cols-2 items-end gap-5">
          <Field label="Kind">
            {props => (
              <select {...props} name="oscalType" defaultValue="service" className={selectClass}>
                <option value="service">Service or platform</option>
                <option value="software">Software or library</option>
              </select>
            )}
          </Field>
          <div className="pb-2">
            <Checkbox name="isSample" label="Mark as a sample (not confirmed by the tool's team)" />
          </div>
        </div>
        {state?.error && <Note tone="error">{state.error}</Note>}
        <div>
          <Button type="submit" disabled={pending}>
            {pending ? "Creating…" : "Create tool"}
          </Button>
        </div>
      </form>
    </Panel>
  );
}
