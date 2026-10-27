"use client";

import { useActionState } from "react";
import { createToolAction } from "./actions";

const FIELD = "mt-1 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm";

export function NewToolForm() {
  const [state, action, pending] = useActionState(createToolAction, null);
  return (
    <form action={action} className="grid gap-4 rounded-xl border border-line bg-surface p-5 sm:grid-cols-2">
      <h2 className="text-lg font-semibold sm:col-span-2">New tool</h2>
      <label className="text-sm font-medium">
        Name
        <input name="name" required className={FIELD} />
      </label>
      <label className="text-sm font-medium">
        Section
        <select name="section" className={FIELD} defaultValue="cpf">
          <option value="cpf">CPF tools</option>
          <option value="wog">Whole-of-government tools</option>
          <option value="code">Code components</option>
        </select>
      </label>
      <label className="text-sm font-medium sm:col-span-2">
        What it is, in one line
        <input name="description" className={FIELD} />
      </label>
      <label className="text-sm font-medium">
        Kind
        <select name="oscalType" className={FIELD} defaultValue="service">
          <option value="service">Service or platform</option>
          <option value="software">Software or library</option>
        </select>
      </label>
      <label className="flex items-center gap-2 self-end text-sm">
        <input type="checkbox" name="isSample" className="size-4 accent-[var(--accent)]" />
        Mark as a sample (not confirmed by the tool&apos;s team)
      </label>
      {state?.error && <p className="text-sm font-medium text-red-700 sm:col-span-2">{state.error}</p>}
      <div className="sm:col-span-2">
        <button disabled={pending} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
          Create tool
        </button>
      </div>
    </form>
  );
}
