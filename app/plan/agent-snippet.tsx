"use client";

import { SgdsAccordionItem, SgdsButton } from "@govtechsg/sgds-web-component/react";
import { useState } from "react";
import { AGENT_SNIPPET } from "@/lib/export/build-plan-md";

/** One accordion row; it goes inside an SgdsAccordion. */
export function AgentSnippetItem() {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(AGENT_SNIPPET);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked: the text is selectable below */
    }
  };
  return (
    <SgdsAccordionItem>
      <span slot="header" className="sgds:text-body-md sgds:font-regular">
          Using a coding agent? Add this to AGENTS.md or CLAUDE.md
        </span>
      <div slot="content" className="sgds:flex sgds:flex-col sgds:gap-sm">
        <pre className="sgds:whitespace-pre-wrap sgds:rounded-surface sgds:bg-surface-raised sgds:p-sm sgds:font-code sgds:text-caption-md">
          {AGENT_SNIPPET}
        </pre>
        <div>
          <SgdsButton size="sm" variant="outline" onClick={copy}>
            {copied ? "Copied" : "Copy"}
          </SgdsButton>
        </div>
      </div>
    </SgdsAccordionItem>
  );
}
