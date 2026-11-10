"use client";

import { useState } from "react";
import { Button, DownloadButton } from "@/app/ui/button";
import { Dialog } from "@/app/ui/dialog";
import { AgentSnippet } from "./agent-snippet";

const LINK = "font-medium text-ink underline decoration-1 hover:decoration-2";

/** Every file the plan can become, behind one button. `query` says which plan. */
export function ExportDialog({ query }: { query: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Export
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Export your plan" description="Take your plan out of the app.">
        <div className="flex flex-col gap-8">
          <section className="flex flex-col gap-3">
            <h3 className="text-lead font-semibold">For your coding agent</h3>
            <p className="text-ink-soft">A plan your agent can read, written as tasks. Add the text below to AGENTS.md or CLAUDE.md so it finds the plan.</p>
            <div>
              <DownloadButton href={`/api/export/build-plan?${query}`}>Build plan for your agent</DownloadButton>
            </div>
            <AgentSnippet />
          </section>

          <section className="flex flex-col gap-3 border-t border-rule pt-6">
            <h3 className="text-lead font-semibold">For security review</h3>
            <p className="text-ink-soft">The same plan, filled in for the people who review your app.</p>
            <div>
              <DownloadButton variant="secondary" href={`/api/export/ssp?${query}`}>
                Security review spreadsheet
              </DownloadButton>
            </div>
            <p className="flex flex-wrap gap-6">
              <a href={`/api/export/oscal?kind=ssp&${query}`} className={LINK}>
                Security plan (JSON)
              </a>
              <a href={`/api/export/oscal?kind=component-definition&${query}`} className={LINK}>
                Tool coverage (JSON)
              </a>
            </p>
          </section>
        </div>
      </Dialog>
    </>
  );
}
