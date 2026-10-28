"use client";

import { SgdsButton } from "@govtechsg/sgds-web-component/react";

export function ResetButton() {
  return (
    <form
      action="/api/reset"
      method="post"
      onSubmit={e => {
        if (!confirm("Reset all demo data? Saved projects and coverage edits will be lost.")) e.preventDefault();
      }}
    >
      <SgdsButton type="submit" size="sm" variant="ghost">
        Reset demo data
      </SgdsButton>
    </form>
  );
}
