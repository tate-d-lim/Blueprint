"use client";

import { SgdsAlert, SgdsButton, SgdsCheckbox, SgdsInput, SgdsSelect } from "@govtechsg/sgds-web-component/react";
import { useActionState } from "react";
import { createToolAction } from "./actions";

const SECTION_OPTIONS = [
  { label: "CPF tools", value: "cpf" },
  { label: "Whole-of-government tools", value: "wog" },
  { label: "Code components", value: "code" },
];
const KIND_OPTIONS = [
  { label: "Service or platform", value: "service" },
  { label: "Software or library", value: "software" },
];

export function NewToolForm() {
  const [state, action, pending] = useActionState(createToolAction, null);
  return (
    <form
      action={action}
      className="sgds:flex sgds:flex-col sgds:gap-sm sgds:rounded-surface sgds:border sgds:border-muted sgds:bg-surface-default sgds:p-layout-md"
    >
      <h2 className="sgds:text-heading-sm sgds:font-semibold">New tool</h2>
      <div className="sgds:grid sgds:gap-sm sgds:md:grid-cols-2">
        <SgdsInput placeholder="" label="Name" name="name" required />
        <SgdsSelect label="Section" name="section" value="cpf" menuList={SECTION_OPTIONS} />
      </div>
      <SgdsInput placeholder="" label="What it is, in one line" name="description" />
      <div className="sgds:grid sgds:items-end sgds:gap-sm sgds:md:grid-cols-2">
        <SgdsSelect label="Kind" name="oscalType" value="service" menuList={KIND_OPTIONS} />
        <SgdsCheckbox name="isSample" value="on">
          Mark as a sample (not confirmed by the tool&apos;s team)
        </SgdsCheckbox>
      </div>
      {state?.error && (
        <SgdsAlert show outlined variant="danger">
          {state.error}
        </SgdsAlert>
      )}
      <div>
        <SgdsButton type="submit" disabled={pending}>
          Create tool
        </SgdsButton>
      </div>
    </form>
  );
}
