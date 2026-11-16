"use client";

import { useMemo, useState } from "react";
import { Button, DownloadButton } from "@/app/ui/button";
import { Dialog } from "@/app/ui/dialog";
import { agentPromptInput, buildAgentPrompt } from "@/lib/export/agent-prompt";
import { useProject } from "./project-context";

/** "Give to your agent": the main action of a saved project. It opens the hand-off dialog, which the project shell holds. */
export function HandoffButton() {
  const { setHandoffOpen } = useProject();
  return <Button onClick={() => setHandoffOpen(true)}>Give to your agent</Button>;
}

/**
 * The hand-off to a coding agent. The security plan (SSP) is the plan, so the builder gives the agent the SSP file and a
 * prompt made for this project. The first download or copy is recorded, so the Next strip can mark the step done.
 */
export function HandoffDialog() {
  const { handoffOpen, setHandoffOpen } = useProject();
  return (
    <Dialog open={handoffOpen} onClose={() => setHandoffOpen(false)} title="Give to your agent" description="Your security plan is the plan. Give it to your coding agent.">
      {handoffOpen && <HandoffBody />}
    </Dialog>
  );
}

function HandoffBody() {
  const { project, data, plan, profileId, toolIds, markHandedOff } = useProject();
  const [copied, setCopied] = useState(false);
  const prompt = useMemo(() => {
    const active = new Set([profileId, ...plan.items.map(i => i.profileId)]);
    return buildAgentPrompt(
      agentPromptInput({
        appName: project.name,
        profiles: data.profiles.filter(p => active.has(p._id)).map(p => p.title),
        plan,
        tools: data.tools.filter(t => toolIds.includes(t._id)).map(t => ({ id: t._id, name: t.name })),
      }),
    );
  }, [project.name, data, plan, profileId, toolIds]);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      markHandedOff();
    } catch {
      /* clipboard blocked: the text is selectable in the dialog */
    }
  };
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h3 className="text-lead font-semibold">1. Download the security plan</h3>
        <p className="max-w-measure text-body text-ink-soft">
          It lists every control, and the state of each one. A control that is planned says what to do and why. The file is JSON, which an agent can read.
        </p>
        <div onClick={markHandedOff} className="w-fit">
          <DownloadButton href={`/api/export/oscal?kind=ssp&project=${encodeURIComponent(project._id)}`}>Download the security plan</DownloadButton>
        </div>
      </section>
      <section className="flex flex-col gap-3">
        <h3 className="text-lead font-semibold">2. Give your agent this prompt, with the file</h3>
        <pre className="rounded-sm border border-rule bg-ground p-4 font-code text-small leading-relaxed whitespace-pre-wrap">{prompt}</pre>
        <div>
          <Button variant="secondary" onClick={copy}>
            {copied ? "Copied" : "Copy the prompt"}
          </Button>
        </div>
      </section>
    </div>
  );
}
