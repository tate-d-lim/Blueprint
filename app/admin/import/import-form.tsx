"use client";

import { useState, useTransition } from "react";
import { Button, TextLink } from "@/app/ui/button";
import { Field, inputClass, selectClass } from "@/app/ui/field";
import { Note } from "@/app/ui/note";
import { Panel } from "@/app/ui/panel";
import { Cell, Table } from "@/app/ui/table";
import type { CoverageValue } from "@/lib/domain/types";
import { VALUE_LABEL } from "@/lib/plan/labels";
import { createImportAction, previewImportAction, type CreateResult, type PreviewResult } from "./actions";

const CHOICES: CoverageValue[] = ["provided", "shared", "app-builder", "not-applicable"];
const NEW_TOOL = "new";

export function ImportForm({ tools, profiles }: { tools: { id: string; name: string }[]; profiles: { id: string; title: string }[] }) {
  const [file, setFile] = useState<File | null>(null);
  const [profileId, setProfileId] = useState(profiles[0]?.id ?? "");
  const [tool, setTool] = useState(tools[0]?.id ?? NEW_TOOL);
  const [newToolName, setNewToolName] = useState("");
  const [newToolSection, setNewToolSection] = useState("cpf");
  const [pending, start] = useTransition();
  const [checked, setChecked] = useState<PreviewResult | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [source, setSource] = useState("");
  const [changeNote, setChangeNote] = useState("");
  const [created, setCreated] = useState<CreateResult | null>(null);

  const toolName = tool === NEW_TOOL ? newToolName || "the tool" : tools.find(t => t.id === tool)?.name ?? "the tool";
  const base = () => {
    const form = new FormData();
    if (file) form.set("file", file);
    form.set("profileId", profileId);
    return form;
  };

  const check = () =>
    start(async () => {
      setCreated(null);
      const result = await previewImportAction(base());
      setChecked(result);
      if (result.ok) {
        setMapping(Object.fromEntries(result.preview.pairs.map(p => [p.pairKey, p.suggested ?? ""])));
        setSource(`Component Guide: ${result.fileName}`);
      }
    });

  const create = () =>
    start(async () => {
      const form = base();
      form.set("tool", tool);
      form.set("newToolName", newToolName);
      form.set("newToolSection", newToolSection);
      form.set("mapping", JSON.stringify(mapping));
      form.set("source", source);
      form.set("changeNote", changeNote);
      setCreated(await createImportAction(form));
    });

  const ready = checked?.ok && checked.preview.unknownIds.length === 0;
  const allMapped = checked?.ok && checked.preview.pairs.every(p => mapping[p.pairKey]);

  return (
    <div className="flex flex-col gap-6">
      <Panel title="The spreadsheet">
        <div className="flex flex-col gap-5">
          <Field label="Component Guide file (.xlsx)">
            {props => (
              <input
                {...props}
                type="file"
                accept=".xlsx"
                onChange={e => {
                  setFile(e.target.files?.[0] ?? null);
                  setChecked(null);
                  setCreated(null);
                }}
                className="text-body file:mr-4 file:h-10 file:cursor-pointer file:rounded-xs file:border file:border-rule-strong file:bg-paper file:px-4 file:font-display file:font-semibold file:text-ink hover:file:bg-blueprint-wash"
              />
            )}
          </Field>
          <div className="grid grid-cols-2 gap-5">
            <Field label="Profile it is written for">
              {props => (
                <select
                  {...props}
                  value={profileId}
                  onChange={e => {
                    setProfileId(e.target.value);
                    setChecked(null);
                  }}
                  className={selectClass}
                >
                  {profiles.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <Field label="Which tool is this for?">
              {props => (
                <select {...props} value={tool} onChange={e => setTool(e.target.value)} className={selectClass}>
                  {tools.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                  <option value={NEW_TOOL}>A new tool…</option>
                </select>
              )}
            </Field>
            {tool === NEW_TOOL && (
              <>
                <Field label="New tool name">
                  {props => <input {...props} value={newToolName} onChange={e => setNewToolName(e.target.value)} className={inputClass} />}
                </Field>
                <Field label="Section">
                  {props => (
                    <select {...props} value={newToolSection} onChange={e => setNewToolSection(e.target.value)} className={selectClass}>
                      <option value="cpf">CPF tools</option>
                      <option value="wog">Whole-of-government tools</option>
                      <option value="code">Code components</option>
                    </select>
                  )}
                </Field>
              </>
            )}
          </div>
          <div>
            <Button disabled={!file || pending} onClick={check}>
              {pending && !checked ? "Checking…" : "Check the file"}
            </Button>
          </div>
        </div>
      </Panel>

      {checked && !checked.ok && <Note tone="error">{checked.error}</Note>}

      {checked?.ok && checked.preview.unknownIds.length > 0 && (
        <Note tone="error" title={`This guide doesn't match ${checked.profileTitle}.`}>
          {checked.preview.unknownIds.length} requirement IDs aren&apos;t in it (first five: {checked.preview.unknownIds.slice(0, 5).join(", ")}). It
          was probably written for a different standard.
        </Note>
      )}

      {ready && checked.ok && (
        <Panel title="How to read it">
          <div className="flex flex-col gap-5">
            <p>
              Read {checked.rowCount} requirements from sheet &ldquo;{checked.sheetName}&rdquo; of {checked.fileName}. Written against:{" "}
              {checked.preview.writtenAgainst}
            </p>
            {checked.preview.missingKeys.length > 0 && (
              <Note tone="attention">
                This guide predates {checked.preview.missingKeys.length} requirements, so it says nothing about them:{" "}
                {checked.preview.missingKeys.map(k => k.split(":")[1]).join(", ")}.
              </Note>
            )}
            <Table head={["“Who is responsible?” says", "Rows", "Treat as"]}>
              {checked.preview.pairs.map(p => (
                <tr key={p.pairKey}>
                  <Cell>
                    <span className="whitespace-pre-line">{p.owner || "(blank)"}</span>
                    {p.agencyInputs && <span className="mt-1 block text-small text-ink-soft">For agency inputs: {p.agencyInputs}</span>}
                  </Cell>
                  <Cell className="tnum">{p.count}</Cell>
                  <Cell className="w-[280px]">
                    <select
                      aria-label={`Treat "${p.owner}" as`}
                      value={mapping[p.pairKey] ?? ""}
                      onChange={e => setMapping(m => ({ ...m, [p.pairKey]: e.target.value }))}
                      className={selectClass}
                    >
                      <option value="">Choose…</option>
                      {CHOICES.map(v => (
                        <option key={v} value={v}>
                          {VALUE_LABEL(v, toolName)}
                        </option>
                      ))}
                    </select>
                  </Cell>
                </tr>
              ))}
            </Table>
            <div className="grid grid-cols-2 gap-5">
              <Field label="Source for this version">{props => <input {...props} value={source} onChange={e => setSource(e.target.value)} className={inputClass} />}</Field>
              <Field label="What changed">
                {props => <input {...props} value={changeNote} placeholder="Optional" onChange={e => setChangeNote(e.target.value)} className={inputClass} />}
              </Field>
            </div>
            <div>
              <Button disabled={pending || !allMapped || !source.trim() || (tool === NEW_TOOL && !newToolName.trim())} onClick={create}>
                {pending ? "Creating…" : "Create version"}
              </Button>
            </div>
          </div>
        </Panel>
      )}

      {created?.ok === false && <Note tone="error">{created.error}</Note>}
      {created?.ok && (
        <Note tone="success" title={`Created version ${created.version}. It is not yet verified.`}>
          <TextLink href={`/admin/tools/${created.toolId}`}>Open it in the editor</TextLink> or <TextLink href="/verify">go to the verifier</TextLink>.
        </Note>
      )}
    </div>
  );
}
