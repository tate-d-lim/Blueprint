"use client";

import { useState, useTransition } from "react";
import { Button, TextLink } from "@/app/ui/button";
import { Field } from "@/app/ui/field";
import { Note } from "@/app/ui/note";
import { Panel } from "@/app/ui/panel";
import type { DraftRow } from "@/lib/tool-owner/new-version";
import type { RequirementKey } from "@/lib/domain/types";
import { readAgentFileAction } from "../../actions";

export interface AgentFilled {
  rows: DraftRow[];
  fileName: string;
  filled: number;
  blank: RequirementKey[];
}

/** Brief out, agent's file in. The file only fills the editor below; nothing is saved until the tool owner saves. */
export function AgentFill({ toolId, profileId, onFilled }: { toolId: string; profileId: string; onFilled: (result: AgentFilled) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const fill = () =>
    start(async () => {
      const form = new FormData();
      if (file) form.set("file", file);
      const result = await readAgentFileAction(toolId, profileId, form);
      if (!result.ok) return setError(result.error);
      setError("");
      onFilled({ rows: result.rows, fileName: result.fileName ?? file?.name ?? "the agent's file", filled: result.filled, blank: result.blank });
    });

  return (
    <Panel title="Fill in with your coding agent">
      <div className="flex flex-col gap-5">
        <p className="max-w-measure">
          Give the brief to a coding agent that can read this tool&apos;s code and docs. Upload the file it writes to fill in every row below.{" "}
          <TextLink href={`/api/tool-owner/tools/${toolId}/agent-brief?profile=${encodeURIComponent(profileId)}`}>Download the brief</TextLink>
        </p>
        <div className="flex items-end gap-5">
          <Field label="The agent's file (.json)">
            {props => (
              <input
                {...props}
                type="file"
                accept=".json,application/json"
                onChange={e => {
                  setFile(e.target.files?.[0] ?? null);
                  setError("");
                }}
                className="text-body file:mr-4 file:h-10 file:cursor-pointer file:rounded-sm file:border file:border-rule-strong file:bg-paper file:px-4 file:font-semibold file:text-ink hover:file:bg-ground"
              />
            )}
          </Field>
          <Button variant="secondary" disabled={!file || pending} onClick={fill}>
            {pending ? "Reading…" : "Fill in the editor"}
          </Button>
        </div>
        {error && <Note tone="error">{error}</Note>}
      </div>
    </Panel>
  );
}
