"use client";

import { useState } from "react";
import { Button, DownloadButton } from "@/app/ui/button";
import { Dialog } from "@/app/ui/dialog";

const LINK = "font-medium text-ink underline decoration-1 hover:decoration-2";

/** The files for the people who review the app. The build plan for the agent is the main action on the plan page. */
export function ExportDialog({ query }: { query: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Export
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Export your plan" description="Take your plan out of the app.">
        <div className="flex flex-col gap-4">
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
        </div>
      </Dialog>
    </>
  );
}
