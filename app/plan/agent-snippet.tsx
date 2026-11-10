"use client";

import { useState } from "react";
import { Button } from "@/app/ui/button";
import { AGENT_SNIPPET } from "@/lib/export/build-plan-md";

/** The text to paste into AGENTS.md or CLAUDE.md, with a copy button. */
export function AgentSnippet() {
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
    <div className="flex flex-col gap-3">
      <pre className="rounded-sm border border-rule bg-ground p-4 font-code text-small leading-relaxed whitespace-pre-wrap">
        {AGENT_SNIPPET}
      </pre>
      <div>
        <Button size="sm" variant="secondary" onClick={copy}>
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
    </div>
  );
}
