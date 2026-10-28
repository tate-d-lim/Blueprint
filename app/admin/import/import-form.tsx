"use client";

import {
  SgdsAlert,
  SgdsButton,
  SgdsFileUpload,
  SgdsInput,
  SgdsSelect,
  SgdsTable,
  SgdsTableCell,
  SgdsTableHead,
  SgdsTableRow,
} from "@govtechsg/sgds-web-component/react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { filesOf, valueOf } from "@/app/components/sgds-events";
import type { CoverageValue } from "@/lib/domain/types";
import { VALUE_LABEL } from "@/lib/plan/labels";
import { createImportAction, previewImportAction, type CreateResult, type PreviewResult } from "./actions";

const CHOICES: CoverageValue[] = ["provided", "shared", "app-builder", "not-applicable"];
const NEW_TOOL = "new";
const SECTION_OPTIONS = [
  { label: "CPF tools", value: "cpf" },
  { label: "Whole-of-government tools", value: "wog" },
  { label: "Code components", value: "code" },
];

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
  const profileOptions = profiles.map(p => ({ label: p.title, value: p.id }));
  const toolOptions = [...tools.map(t => ({ label: t.name, value: t.id })), { label: "A new tool…", value: NEW_TOOL }];
  const choiceOptions = CHOICES.map(v => ({ label: VALUE_LABEL(v, toolName), value: v }));
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
    <div className="sgds:flex sgds:flex-col sgds:gap-layout-sm">
      <div className="sgds:flex sgds:flex-col sgds:gap-sm sgds:rounded-surface sgds:border sgds:border-muted sgds:bg-surface-default sgds:p-layout-md">
        <SgdsFileUpload
          label="Component Guide file (.xlsx)"
          name="file"
          accept=".xlsx"
          onSgdsChange={e => {
            setFile(filesOf(e)[0] ?? null);
            setChecked(null);
            setCreated(null);
          }}
        />
        <div className="sgds:grid sgds:gap-sm sgds:md:grid-cols-2">
          <SgdsSelect
            label="Profile it is written for"
            name="profile"
            value={profileId}
            menuList={profileOptions}
            onSgdsChange={e => {
              if (valueOf(e) === profileId) return;
              setProfileId(valueOf(e));
              setChecked(null);
            }}
          />
          <SgdsSelect label="Which tool is this for?" name="tool" value={tool} menuList={toolOptions} onSgdsChange={e => setTool(valueOf(e))} />
          {tool === NEW_TOOL && (
            <>
              <SgdsInput label="New tool name" name="newToolName" placeholder="" value={newToolName} onSgdsInput={e => setNewToolName(valueOf(e))} />
              <SgdsSelect label="Section" name="newToolSection" value={newToolSection} menuList={SECTION_OPTIONS} onSgdsChange={e => setNewToolSection(valueOf(e))} />
            </>
          )}
        </div>
        <div>
          <SgdsButton disabled={!file || pending} onClick={check}>
            {pending && !checked ? "Checking…" : "Check the file"}
          </SgdsButton>
        </div>
      </div>

      {checked && !checked.ok && (
        <SgdsAlert show outlined variant="danger">
          {checked.error}
        </SgdsAlert>
      )}

      {checked?.ok && checked.preview.unknownIds.length > 0 && (
        <SgdsAlert show outlined variant="danger">
          This guide doesn&apos;t match {checked.profileTitle}: {checked.preview.unknownIds.length} requirement IDs aren&apos;t in it (first five:{" "}
          {checked.preview.unknownIds.slice(0, 5).join(", ")}). It was probably written for a different standard.
        </SgdsAlert>
      )}

      {ready && checked.ok && (
        <div className="sgds:flex sgds:flex-col sgds:gap-sm sgds:rounded-surface sgds:border sgds:border-muted sgds:bg-surface-default sgds:p-layout-md">
          <p>
            Read {checked.rowCount} requirements from sheet &ldquo;{checked.sheetName}&rdquo; of {checked.fileName}. Written against:{" "}
            {checked.preview.writtenAgainst}
          </p>
          {checked.preview.missingKeys.length > 0 && (
            <SgdsAlert show outlined variant="warning">
              This guide predates {checked.preview.missingKeys.length} requirements, so it says nothing about them:{" "}
              {checked.preview.missingKeys.map(k => k.split(":")[1]).join(", ")}.
            </SgdsAlert>
          )}
          <SgdsTable>
            <SgdsTableRow>
              <SgdsTableHead>&ldquo;Who is responsible?&rdquo; says</SgdsTableHead>
              <SgdsTableHead>Rows</SgdsTableHead>
              <SgdsTableHead>Treat as</SgdsTableHead>
            </SgdsTableRow>
            {checked.preview.pairs.map(p => (
              <SgdsTableRow key={p.pairKey}>
                <SgdsTableCell>
                  <span className="sgds:whitespace-pre-line">{p.owner || "(blank)"}</span>
                  {p.agencyInputs && <span className="sgds:block sgds:text-caption-md sgds:text-subtle">For agency inputs: {p.agencyInputs}</span>}
                </SgdsTableCell>
                <SgdsTableCell>{p.count}</SgdsTableCell>
                <SgdsTableCell>
                  <SgdsSelect
                    label={`Treat "${p.owner}" as`}
                    name={`mapping-${p.pairKey}`}
                    placeholder="Choose…"
                    value={mapping[p.pairKey] ?? ""}
                    menuList={choiceOptions}
                    onSgdsChange={e => setMapping(m => ({ ...m, [p.pairKey]: valueOf(e) }))}
                  />
                </SgdsTableCell>
              </SgdsTableRow>
            ))}
          </SgdsTable>
          <div className="sgds:grid sgds:gap-sm sgds:md:grid-cols-2">
            <SgdsInput label="Source for this version" name="source" value={source} onSgdsInput={e => setSource(valueOf(e))} />
            <SgdsInput label="What changed" name="changeNote" placeholder="Optional" value={changeNote} onSgdsInput={e => setChangeNote(valueOf(e))} />
          </div>
          <div>
            <SgdsButton disabled={pending || !allMapped || !source.trim() || (tool === NEW_TOOL && !newToolName.trim())} onClick={create}>
              {pending ? "Creating…" : "Create version"}
            </SgdsButton>
          </div>
        </div>
      )}

      {created?.ok === false && (
        <SgdsAlert show outlined variant="danger">
          {created.error}
        </SgdsAlert>
      )}
      {created?.ok && (
        <SgdsAlert show outlined variant="success">
          Created version {created.version}. It is not yet verified.{" "}
          <Link href={`/admin/tools/${created.toolId}`} suppressHydrationWarning>
            Open it in the editor
          </Link>{" "}
          or{" "}
          <Link href="/verify" suppressHydrationWarning>
            go to the verifier
          </Link>
          .
        </SgdsAlert>
      )}
    </div>
  );
}
