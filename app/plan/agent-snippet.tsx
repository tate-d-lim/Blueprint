"use client";

import { useState } from "react";
import { AGENT_SNIPPET } from "@/lib/export/build-plan-md";

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
    <details className="w-full text-sm">
      <summary className="cursor-pointer text-muted">Using a coding agent? Add this to AGENTS.md or CLAUDE.md</summary>
      <div className="mt-2 rounded-lg border border-line bg-surface p-3">
        <pre className="whitespace-pre-wrap font-mono text-xs">{AGENT_SNIPPET}</pre>
        <button type="button" onClick={copy} className="mt-2 rounded-md border border-line px-2.5 py-1 text-xs hover:bg-background">
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </details>
  );
}
