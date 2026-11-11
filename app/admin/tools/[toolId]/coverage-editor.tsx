"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Button } from "@/app/ui/button";
import { Disclosure } from "@/app/ui/disclosure";
import { Checkbox, Field, inputClass, selectClass, textareaClass } from "@/app/ui/field";
import { Note } from "@/app/ui/note";
import { Stamp, Tag } from "@/app/ui/stamp";
import type { DraftRow } from "@/lib/admin/new-version";
import type { CoverageValue, Level, RequirementKey } from "@/lib/domain/types";
import { familyName } from "@/lib/plan/hotel";
import { VALUE_LABEL } from "@/lib/plan/labels";
import { saveVersionAction } from "../../actions";
import { AgentFill, type AgentFilled } from "./agent-fill";

interface Requirement {
  key: RequirementKey;
  id: string;
  family: string;
  title: string;
  level: Level;
}

const VALUES: CoverageValue[] = ["provided", "shared", "app-builder", "not-applicable"];

export function CoverageEditor({
  toolId,
  toolName,
  profileId,
  requirements,
  initialRows,
  defaultSource,
}: {
  toolId: string;
  toolName: string;
  profileId: string;
  requirements: Requirement[];
  initialRows: DraftRow[];
  defaultSource: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const initial = useMemo(() => new Map(initialRows.map(r => [r.key, r])), [initialRows]);
  const [rows, setRows] = useState(() => new Map(requirements.map(r => [r.key, initial.get(r.key) ?? { key: r.key, value: "" as const }])));
  const [family, setFamily] = useState("");
  const [level, setLevel] = useState("");
  const [coveredOnly, setCoveredOnly] = useState(false);
  const [saving, setSaving] = useState(false);
  // Starts empty on purpose: a changed row is credited to the source typed here, never to the previous one.
  const [source, setSource] = useState("");
  const [changeNote, setChangeNote] = useState("");
  const [errors, setErrors] = useState<{ key?: string; message: string }[]>([]);
  const [savedVersion, setSavedVersion] = useState<number | null>(null);
  // Set once a coding agent's file has filled the editor. From then on every row needs an answer before save.
  const [agent, setAgent] = useState<{ fileName: string; filled: number } | null>(null);
  // The rows that were blank when the filter went on. Fixed, so a row stays open while the admin answers it.
  const [blankShown, setBlankShown] = useState<Set<RequirementKey> | null>(null);

  const families = [...new Set(requirements.map(r => r.family))];
  const update = (key: RequirementKey, patch: Partial<DraftRow>) =>
    setRows(prev => new Map(prev).set(key, { ...prev.get(key)!, ...patch }));
  const visible = requirements.filter(
    r =>
      (!family || r.family === family) &&
      (!level || String(r.level) === level) &&
      (!coveredOnly || rows.get(r.key)!.value) &&
      (!blankShown || blankShown.has(r.key)),
  );
  const blankKeys = agent ? requirements.filter(r => !rows.get(r.key)!.value).map(r => r.key) : [];
  const fillFromAgent = (result: AgentFilled) => {
    setRows(new Map(result.rows.map(r => [r.key, r])));
    setAgent({ fileName: result.fileName, filled: result.filled });
    setSource(`Coding agent: ${result.fileName}`);
    setErrors([]);
    setSavedVersion(null);
    setBlankShown(null);
  };
  const covered = [...rows.values()].filter(r => r.value).length;
  const errorFor = (key: RequirementKey) => errors.find(e => e.key === key)?.message;
  const changed = (key: RequirementKey) => JSON.stringify(strip(rows.get(key)!)) !== JSON.stringify(strip(initial.get(key) ?? { key, value: "" }));

  const save = () =>
    startTransition(async () => {
      const result = await saveVersionAction(toolId, profileId, [...rows.values()], source, changeNote, agent?.fileName);
      if (result.ok) {
        setErrors([]);
        setSavedVersion(result.version);
        setAgent(null);
        setBlankShown(null);
        setSaving(false);
        router.refresh();
      } else {
        setErrors(result.errors);
      }
    });

  return (
    <div className="flex flex-col gap-5">
      <AgentFill toolId={toolId} profileId={profileId} onFilled={fillFromAgent} />

      {agent && (
        <Note tone={blankKeys.length ? "attention" : "success"} role="status">
          <span className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span>
              Filled in from {agent.fileName}: {agent.filled} of {requirements.length} rows.
              {blankKeys.length > 0 && ` Fill the ${blankKeys.length} blank row${blankKeys.length === 1 ? "" : "s"} before you submit.`}
            </span>
            {blankKeys.length > 0 && !blankShown && (
              <Button variant="secondary" size="sm" onClick={() => setBlankShown(new Set(blankKeys))}>
                Show blank rows
              </Button>
            )}
          </span>
        </Note>
      )}

      <div className="grid grid-cols-[220px_180px_auto_1fr] items-end gap-5">
        <Field label="Room">
          {props => (
            <select {...props} value={family} onChange={e => setFamily(e.target.value)} className={selectClass}>
              <option value="">All rooms</option>
              {families.map(f => (
                <option key={f} value={f}>
                  {familyName(f)}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Level">
          {props => (
            <select {...props} value={level} onChange={e => setLevel(e.target.value)} className={selectClass}>
              <option value="">All levels</option>
              <option value="0">Level 0</option>
              <option value="1">Level 1</option>
              <option value="2">Level 2</option>
            </select>
          )}
        </Field>
        <div className="flex flex-col gap-2 pb-2">
          <Checkbox label="Rows with coverage only" checked={coveredOnly} onChange={e => setCoveredOnly(e.target.checked)} />
          {agent && <Checkbox label="Blank rows only" checked={!!blankShown} onChange={e => setBlankShown(e.target.checked ? new Set(blankKeys) : null)} />}
        </div>
        <p className="tnum pb-2 text-small text-ink-soft">
          {visible.length} shown, {covered} with coverage
        </p>
      </div>

      {savedVersion !== null && (
        <Note tone="success" role="status">
          Saved version {savedVersion}. It is not yet verified: a verifier needs to approve it before builders see it as verified.
        </Note>
      )}

      <div className="rounded-sm border border-rule bg-paper px-4">
        {visible.map(req => {
          const row = rows.get(req.key)!;
          const error = errorFor(req.key);
          const needsAnswer = agent !== null && !row.value;
          return (
            <Disclosure
              key={req.key}
              summary={
                <span className="flex flex-col">
                  <span className="text-lead font-semibold">{req.title}</span>
                  <span className="tnum text-small text-ink-soft">
                    {req.id}, level {req.level}
                  </span>
                </span>
              }
              aside={
                <span className="flex flex-wrap items-center justify-end gap-2">
                  {changed(req.key) && <Stamp tone="pending">Changed</Stamp>}
                  {needsAnswer && <Stamp tone="pending">Needs an answer</Stamp>}
                  {error && !needsAnswer && <Stamp tone="pending">Fix this row</Stamp>}
                  <Tag>{row.value ? VALUE_LABEL(row.value, toolName) : "No statement"}</Tag>
                </span>
              }
            >
              <div className="flex max-w-form flex-col gap-4">
                {needsAnswer ? <Note tone="error">The agent left this blank. Choose an answer.</Note> : error && <Note tone="error">{error}</Note>}
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Who handles it">
                    {props => (
                      <select
                        {...props}
                        name={`value-${req.id}`}
                        value={row.value}
                        onChange={e => update(req.key, { value: e.target.value as DraftRow["value"] })}
                        className={selectClass}
                      >
                        <option value="">No statement</option>
                        {VALUES.map(v => (
                          <option key={v} value={v}>
                            {VALUE_LABEL(v, toolName)}
                          </option>
                        ))}
                      </select>
                    )}
                  </Field>
                </div>
                <Field label="Explanation">
                  {props => (
                    <textarea
                      {...props}
                      rows={2}
                      value={row.explanation ?? ""}
                      placeholder="What the tool does for this control"
                      onChange={e => update(req.key, { explanation: e.target.value })}
                      className={textareaClass}
                    />
                  )}
                </Field>
                {(row.value === "shared" || row.value === "app-builder") && (
                  <Field label="App Builder's part">
                    {props => (
                      <textarea
                        {...props}
                        rows={2}
                        value={row.builderPart ?? ""}
                        placeholder="What the App Builder still has to do"
                        onChange={e => update(req.key, { builderPart: e.target.value })}
                        className={textareaClass}
                      />
                    )}
                  </Field>
                )}
                <Field label="Source">
                  {props => (
                    <input {...props} value={row.source ?? ""} placeholder="Same as before" onChange={e => update(req.key, { source: e.target.value })} className={inputClass} />
                  )}
                </Field>
              </div>
            </Disclosure>
          );
        })}
      </div>

      <div className="sticky bottom-0 z-10 -mx-10 border-t border-ink bg-paper px-10 py-4">
        {!saving ? (
          <Button
            onClick={() => {
              setSaving(true);
              setSavedVersion(null);
            }}
          >
            Save new version
          </Button>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-4">
              <Field label="Source for this version">
                {props => (
                  <input
                    {...props}
                    value={source}
                    onChange={e => setSource(e.target.value)}
                    placeholder={defaultSource ? `Where the changes come from (before: ${defaultSource})` : "Where this coverage comes from"}
                    className={inputClass}
                  />
                )}
              </Field>
              <Field label="What changed">
                {props => <input {...props} value={changeNote} onChange={e => setChangeNote(e.target.value)} placeholder="Optional" className={inputClass} />}
              </Field>
              <div className="flex gap-3">
                <Button disabled={pending || blankKeys.length > 0} onClick={save}>
                  {pending ? "Saving…" : "Save"}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSaving(false);
                    setErrors([]);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
            {errors
              .filter(e => !e.key)
              .map(e => (
                <Note key={e.message} tone="error">
                  {e.message}
                </Note>
              ))}
            {errors.some(e => e.key) && <Note tone="error">Fix the rows marked &ldquo;Fix this row&rdquo; and save again.</Note>}
          </div>
        )}
      </div>
    </div>
  );
}

/** Compares rows ignoring blank strings. */
function strip(row: DraftRow) {
  return {
    key: row.key,
    value: row.value,
    explanation: row.explanation || undefined,
    builderPart: row.builderPart || undefined,
    source: row.source || undefined,
  };
}
