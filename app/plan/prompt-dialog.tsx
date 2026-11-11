"use client";

import { useState } from "react";
import { Button, DownloadButton } from "@/app/ui/button";
import { Dialog } from "@/app/ui/dialog";
import { AGENT_PROMPT } from "@/lib/export/agent-prompt";

/**
 * "Prompt your agent": the main action of a saved project. The security plan (SSP) is the plan, so the builder gives a
 * coding agent the SSP file and this short prompt.
 */
export function PromptButton({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(AGENT_PROMPT);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked: the text is selectable in the dialog */
    }
  };
  return (
    <>
      <Button onClick={() => setOpen(true)}>Prompt your agent</Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Prompt your agent" description="Your security plan is the plan. Give it to your coding agent.">
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-3">
            <h3 className="text-lead font-semibold">1. Download the security plan</h3>
            <p className="max-w-measure text-body text-ink-soft">
              It lists every control, and the state of each one. A control that is planned says what to do and why. The file is JSON, which an agent can read.
            </p>
            <div>
              <DownloadButton href={`/api/export/oscal?kind=ssp&project=${encodeURIComponent(projectId)}`}>Download the security plan</DownloadButton>
            </div>
          </section>
          <section className="flex flex-col gap-3">
            <h3 className="text-lead font-semibold">2. Give your agent this prompt, with the file</h3>
            <pre className="rounded-sm border border-rule bg-ground p-4 font-code text-small leading-relaxed whitespace-pre-wrap">{AGENT_PROMPT}</pre>
            <div>
              <Button variant="secondary" onClick={copy}>
                {copied ? "Copied" : "Copy the prompt"}
              </Button>
            </div>
          </section>
        </div>
      </Dialog>
    </>
  );
}
