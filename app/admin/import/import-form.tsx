"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { CoverageValue } from "@/lib/domain/types";
import { VALUE_LABEL } from "@/lib/plan/labels";
import { createImportAction, previewImportAction, type CreateResult, type PreviewResult } from "./actions";

const FIELD = "mt-1 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm";
const CHOICES: CoverageValue[] = ["provided", "shared", "app-builder", "not-applicable"];

export function ImportForm({ tools, profiles }: { tools: { id: string; name: string }[]; profiles: { id: string; title: string }[] }) {
  const [file, setFile] = useState<File | null>(null);
  const [profileId, setProfileId] = useState(profiles[0]?.id ?? "");
  const [tool, setTool] = useState(tools[0]?.id ?? "new");
  const [newToolName, setNewToolName] = useState("");
  const [newToolSection, setNewToolSection] = useState("cpf");
  const [pending, start] = useTransition();
  const [checked, setChecked] = useState<PreviewResult | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [source, setSource] = useState("");
  const [changeNote, setChangeNote] = useState("");
  const [created, setCreated] = useState<CreateResult | null>(null);

  const toolName = tool === "new" ? newToolName || "the tool" : tools.find(t => t.id === tool)?.name ?? "the tool";
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
    <div className="space-y-6">
      <div className="grid gap-4 rounded-xl border border-line bg-surface p-5 sm:grid-cols-2">
        <label className="text-sm font-medium sm:col-span-2">
          Component Guide file (.xlsx)
          <input
            type="file"
            accept=".xlsx"
            onChange={e => {
              setFile(e.target.files?.[0] ?? null);
              setChecked(null);
              setCreated(null);
            }}
            className={FIELD}
          />
        </label>
        <label className="text-sm font-medium">
          Profile it is written for
          <select value={profileId} onChange={e => { setProfileId(e.target.value); setChecked(null); }} className={FIELD}>
            {profiles.map(p => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium">
          Which tool is this for?
          <select value={tool} onChange={e => setTool(e.target.value)} className={FIELD}>
            {tools.map(t => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
            <option value="new">A new tool…</option>
          </select>
        </label>
        {tool === "new" && (
          <>
            <label className="text-sm font-medium">
              New tool name
              <input value={newToolName} onChange={e => setNewToolName(e.target.value)} className={FIELD} />
            </label>
            <label className="text-sm font-medium">
              Section
              <select value={newToolSection} onChange={e => setNewToolSection(e.target.value)} className={FIELD}>
                <option value="cpf">CPF tools</option>
                <option value="wog">Whole-of-government tools</option>
                <option value="code">Code components</option>
              </select>
            </label>
          </>
        )}
        <div className="sm:col-span-2">
          <button type="button" disabled={!file || pending} onClick={check} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40">
            {pending && !checked ? "Checking…" : "Check the file"}
          </button>
        </div>
      </div>

      {checked && !checked.ok && <p className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm font-medium text-red-800">{checked.error}</p>}

      {checked?.ok && checked.preview.unknownIds.length > 0 && (
        <p className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm font-medium text-red-800">
          This guide doesn&apos;t match {checked.profileTitle}: {checked.preview.unknownIds.length} requirement IDs aren&apos;t in it (first five:{" "}
          {checked.preview.unknownIds.slice(0, 5).join(", ")}). It was probably written for a different standard.
        </p>
      )}

      {ready && checked.ok && (
        <div className="space-y-5 rounded-xl border border-line bg-surface p-5">
          <p className="text-sm">
            Read {checked.rowCount} requirements from sheet &ldquo;{checked.sheetName}&rdquo; of {checked.fileName}. Written against:{" "}
            {checked.preview.writtenAgainst}
          </p>
          {checked.preview.missingKeys.length > 0 && (
            <p className="rounded-lg bg-amber-50 p-3 text-sm">
              This guide predates {checked.preview.missingKeys.length} requirements, so it says nothing about them:{" "}
              {checked.preview.missingKeys.map(k => k.split(":")[1]).join(", ")}.
            </p>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line text-muted">
                <tr>
                  <th className="py-2 pr-4 font-medium">&ldquo;Who is responsible?&rdquo; says</th>
                  <th className="py-2 pr-4 font-medium">Rows</th>
                  <th className="py-2 font-medium">Treat as</th>
                </tr>
              </thead>
              <tbody>
                {checked.preview.pairs.map(p => (
                  <tr key={p.pairKey} className="border-b border-line align-top last:border-0">
                    <td className="max-w-md py-2 pr-4 whitespace-pre-line">
                      {p.owner || "(blank)"}
                      {p.agencyInputs && <span className="block text-xs text-muted">For agency inputs: {p.agencyInputs}</span>}
                    </td>
                    <td className="py-2 pr-4">{p.count}</td>
                    <td className="py-2">
                      <select aria-label={`Treat "${p.owner}" as`} value={mapping[p.pairKey] ?? ""} onChange={e => setMapping(m => ({ ...m, [p.pairKey]: e.target.value }))} className={`${FIELD} mt-0`}>
                        <option value="">Choose…</option>
                        {CHOICES.map(v => (
                          <option key={v} value={v}>
                            {VALUE_LABEL(v, toolName)}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium">
              Source for this version
              <input value={source} onChange={e => setSource(e.target.value)} className={FIELD} />
            </label>
            <label className="text-sm font-medium">
              What changed
              <input value={changeNote} onChange={e => setChangeNote(e.target.value)} placeholder="Optional" className={FIELD} />
            </label>
          </div>
          <button type="button" disabled={pending || !allMapped || !source.trim() || (tool === "new" && !newToolName.trim())} onClick={create} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40">
            {pending ? "Creating…" : "Create version"}
          </button>
        </div>
      )}

      {created?.ok === false && <p className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm font-medium text-red-800">{created.error}</p>}
      {created?.ok && (
        <p className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm">
          Created version {created.version}. It is not yet verified.{" "}
          <Link href={`/admin/tools/${created.toolId}`} className="underline">
            Open it in the editor
          </Link>{" "}
          or{" "}
          <Link href="/verify" className="underline">
            go to the verifier
          </Link>
          .
        </p>
      )}
    </div>
  );
}
