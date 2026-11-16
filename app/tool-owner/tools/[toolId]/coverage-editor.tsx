"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Button, ButtonLink } from "@/app/ui/button";
import { Checkbox, Field, inputClass, selectClass, textareaClass } from "@/app/ui/field";
import { Note } from "@/app/ui/note";
import { Panel } from "@/app/ui/panel";
import { Segmented } from "@/app/ui/segmented";
import { Stamp, Tag } from "@/app/ui/stamp";
import type { CoverageValue, Level, RequirementKey } from "@/lib/domain/types";
import { familyName } from "@/lib/plan/hotel";
import { VALUE_LABEL } from "@/lib/plan/labels";
import { answerLine, changedLine, groupByPart, rowChanged, saveBlocker } from "@/lib/tool-owner/groups";
import type { DraftRow } from "@/lib/tool-owner/new-version";
import { saveVersionAction } from "../../actions";
import { AgentFill, type AgentFilled } from "./agent-fill";
import { Collapse } from "./collapse";

interface Requirement {
  key: RequirementKey;
  id: string;
  family: string;
  title: string;
  level: Level;
}

interface EditorProps {
  toolId: string;
  toolName: string;
  profileId: string;
  requirements: Requirement[];
  initialRows: DraftRow[];
  defaultSource: string;
  /** The newest version. The rows start again from it when it changes, so a saved version leaves no row marked as changed. */
  versionId: string;
  importHref: string;
}

type Way = "hand" | "guide" | "agent";

const VALUES: CoverageValue[] = ["provided", "shared", "app-builder", "not-applicable"];

/** Holds the line about the last save, so it stays on the page when the rows start again from the new version. */
export function CoverageEditor(props: EditorProps) {
  const [savedVersion, setSavedVersion] = useState<number | null>(null);
  return (
    <div className="flex flex-col gap-5">
      {savedVersion !== null && (
        <Note tone="success" role="status" title={`Saved version ${savedVersion}.`}>
          It waits for an admin. Builders see it as Verified after the admin approves it.
        </Note>
      )}
      <Editor key={props.versionId} {...props} onSaved={setSavedVersion} onEdit={() => setSavedVersion(null)} />
    </div>
  );
}

function Editor({
  toolId,
  toolName,
  profileId,
  requirements,
  initialRows,
  defaultSource,
  importHref,
  onSaved,
  onEdit,
}: EditorProps & { onSaved: (version: number) => void; onEdit: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const initial = useMemo(() => new Map(initialRows.map(r => [r.key, r])), [initialRows]);
  const [rows, setRows] = useState(() => new Map(requirements.map(r => [r.key, initial.get(r.key) ?? { key: r.key, value: "" as const }])));
  const [way, setWay] = useState<Way>("hand");
  const [family, setFamily] = useState("");
  const [level, setLevel] = useState("");
  const [coveredOnly, setCoveredOnly] = useState(false);
  // Starts empty on purpose: a changed row is credited to the source typed here, never to the previous one.
  const [source, setSource] = useState("");
  const [changeNote, setChangeNote] = useState("");
  const [errors, setErrors] = useState<{ key?: string; message: string }[]>([]);
  // Set once a coding agent's file has filled the rows. From then on every row needs an answer before save.
  const [agent, setAgent] = useState<{ fileName: string; filled: number } | null>(null);
  // The rows that were blank when the filter went on. Fixed, so a row stays open while the tool owner answers it.
  const [blankShown, setBlankShown] = useState<Set<RequirementKey> | null>(null);
  // Every group starts closed, so the page opens as a short list of the hotel parts with their counts.
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const [openRows, setOpenRows] = useState<Set<RequirementKey>>(new Set());
  const [jumpTo, setJumpTo] = useState<RequirementKey | null>(null);

  useEffect(() => {
    if (!jumpTo) return;
    document.getElementById(`row-${jumpTo}`)?.scrollIntoView({ block: "center" });
    setJumpTo(null);
  }, [jumpTo]);

  const families = [...new Set(requirements.map(r => r.family))];
  const update = (key: RequirementKey, patch: Partial<DraftRow>) => {
    onEdit();
    setRows(prev => new Map(prev).set(key, { ...prev.get(key)!, ...patch }));
  };
  const toggle = <T,>(set: Set<T>, value: T, on: boolean) => {
    const next = new Set(set);
    if (on) next.add(value);
    else next.delete(value);
    return next;
  };

  const visible = requirements.filter(
    r =>
      (!family || r.family === family) &&
      (!level || String(r.level) === level) &&
      (!coveredOnly || rows.get(r.key)!.value) &&
      (!blankShown || blankShown.has(r.key)),
  );
  const groups = groupByPart(visible);
  const allGroups = groupByPart(requirements);
  const blankKeys = agent ? requirements.filter(r => !rows.get(r.key)!.value).map(r => r.key) : [];
  const changed = (key: RequirementKey) => rowChanged(rows.get(key)!, initial.get(key));
  const changedCount = requirements.filter(r => changed(r.key)).length;
  const covered = [...rows.values()].filter(r => r.value).length;
  const errorFor = (key: RequirementKey) => errors.find(e => e.key === key)?.message;
  const blocker = saveBlocker({ changed: changedCount, blankRows: blankKeys.length, fromAgent: !!agent });
  const reqOf = (key: string) => requirements.find(r => r.key === key);

  const fillFromAgent = (result: AgentFilled) => {
    const next = new Map(result.rows.map(r => [r.key, r]));
    setRows(next);
    setAgent({ fileName: result.fileName, filled: result.filled });
    setSource(`Coding agent: ${result.fileName}`);
    setErrors([]);
    onEdit();
    setBlankShown(null);
    setOpenGroups(new Set(allGroups.filter(g => g.items.some(r => next.get(r.key)?.value)).map(g => g.part.id)));
  };

  const showBlank = (keys: RequirementKey[] | null) => {
    setBlankShown(keys ? new Set(keys) : null);
    if (keys) {
      const blankGroups = groupByPart(requirements.filter(r => keys.includes(r.key))).map(g => g.part.id);
      setOpenGroups(prev => new Set([...prev, ...blankGroups]));
    }
  };

  const goToRow = (key: RequirementKey) => {
    const req = reqOf(key);
    if (!req) return;
    // A filter could hide the row: clear the filters that would.
    setFamily("");
    setLevel("");
    setCoveredOnly(false);
    setBlankShown(null);
    setOpenGroups(prev => new Set(prev).add(groupByPart([req])[0].part.id));
    setOpenRows(prev => new Set(prev).add(key));
    setJumpTo(key);
  };

  const save = () =>
    startTransition(async () => {
      const result = await saveVersionAction(toolId, profileId, [...rows.values()], source, changeNote, agent?.fileName);
      if (result.ok) {
        setErrors([]);
        onSaved(result.version);
        router.refresh();
      } else {
        setErrors(result.errors);
        // The rows with an error open at once, so the tool owner sees where the errors are.
        const keyed = result.errors.filter(e => e.key).map(e => e.key as RequirementKey);
        if (keyed.length) {
          setOpenGroups(prev => new Set([...prev, ...keyed.flatMap(k => (reqOf(k) ? [groupByPart([reqOf(k)!])[0].part.id] : []))]));
        }
      }
    });

  return (
    <div className="flex flex-col gap-5">
      <Panel title="Fill in" description="Choose how to fill in the rows. The rows below stay the same.">
        <div className="flex flex-col gap-5">
          <Segmented
            label="Fill in"
            value={way}
            onChange={setWay}
            options={[
              { value: "hand", label: "By hand" },
              { value: "guide", label: "From a Component Guide" },
              { value: "agent", label: "With a coding agent" },
            ]}
          />
          {way === "hand" && <p className="max-w-measure">Open a group below, then choose who handles each control. Rows you leave blank say nothing about the control.</p>}
          {way === "guide" && (
            <div className="flex flex-col gap-3">
              <p className="max-w-measure">
                A product team publishes a Component Guide as a spreadsheet. Import it to create a new version of {toolName}. Unsaved changes on this page are lost.
              </p>
              <div>
                <ButtonLink href={importHref} variant="secondary">
                  Import a Component Guide
                </ButtonLink>
              </div>
            </div>
          )}
          {way === "agent" && <AgentFill toolId={toolId} profileId={profileId} onFilled={fillFromAgent} />}
        </div>
      </Panel>

      {agent && (
        <Note tone={blankKeys.length ? "attention" : "success"} role="status">
          <span className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span>
              Filled in from {agent.fileName}: {agent.filled} of {requirements.length} rows.
              {blankKeys.length > 0 && ` Fill the ${blankKeys.length} blank row${blankKeys.length === 1 ? "" : "s"} before you save.`}
            </span>
            {blankKeys.length > 0 && !blankShown && (
              <Button variant="secondary" size="sm" onClick={() => showBlank(blankKeys)}>
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
          {agent && <Checkbox label="Blank rows only" checked={!!blankShown} onChange={e => showBlank(e.target.checked ? blankKeys : null)} />}
        </div>
        <div className="flex items-center justify-end gap-4 pb-1">
          <p className="tnum text-small text-ink-soft">
            {visible.length} shown, {covered} with coverage
          </p>
          <Button variant="secondary" size="sm" onClick={() => setOpenGroups(new Set(groups.map(g => g.part.id)))}>
            Open all
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setOpenGroups(new Set())}>
            Close all
          </Button>
        </div>
      </div>

      {groups.length === 0 && <Note>No controls match these filters. Change a filter to see more.</Note>}

      <div className="rounded-sm border border-rule bg-paper">
        {groups.map(({ part, items }) => {
          const total = allGroups.find(g => g.part.id === part.id)!.items;
          const answered = total.filter(r => rows.get(r.key)!.value).length;
          const changedHere = total.filter(r => changed(r.key)).length;
          return (
            <Collapse
              key={part.id}
              id={`group-${part.id}`}
              open={openGroups.has(part.id)}
              onToggle={open => setOpenGroups(prev => toggle(prev, part.id, open))}
              summary={
                <span className="flex flex-col">
                  <span className="text-lead font-semibold">
                    {part.name}
                    <span className="font-normal text-ink-soft"> · {[...new Set(total.map(r => familyName(r.family)))].join(", ")}</span>
                  </span>
                  <span className="tnum text-small text-ink-soft">{answerLine(answered, total.length)}</span>
                </span>
              }
              aside={changedHere > 0 && <Tag>{changedLine(changedHere)}</Tag>}
            >
              <div className="px-4">
                {items.map(req => {
                  const row = rows.get(req.key)!;
                  const error = errorFor(req.key);
                  const needsAnswer = agent !== null && !row.value;
                  return (
                    <Collapse
                      key={req.key}
                      id={`row-${req.key}`}
                      nested
                      open={openRows.has(req.key)}
                      onToggle={open => setOpenRows(prev => toggle(prev, req.key, open))}
                      summary={
                        <span className="flex flex-col">
                          <span className="text-body font-semibold">{req.title}</span>
                          <span className="tnum text-small text-ink-soft">
                            {req.id}, level {req.level}
                          </span>
                        </span>
                      }
                      aside={
                        <span className="flex flex-wrap items-center justify-end gap-2">
                          {changed(req.key) && <Tag>Changed</Tag>}
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
                    </Collapse>
                  );
                })}
              </div>
            </Collapse>
          );
        })}
      </div>

      <div className="sticky bottom-0 z-10 -mx-8 flex flex-col gap-3 border-t border-rule-strong bg-paper px-8 py-4">
        {errors.length > 0 && (
          <Note tone="error" title="Fix these before you save.">
            <ul className="flex max-h-32 flex-col gap-1 overflow-y-auto">
              {errors.map((e, i) => {
                const req = e.key ? reqOf(e.key) : undefined;
                return (
                  <li key={`${e.key ?? "version"}-${i}`}>
                    {req ? (
                      <button type="button" onClick={() => goToRow(req.key)} className="text-left underline decoration-1 underline-offset-2 hover:decoration-2">
                        {req.id}, {req.title}: {e.message}
                      </button>
                    ) : (
                      e.message
                    )}
                  </li>
                );
              })}
            </ul>
          </Note>
        )}
        <div className="grid grid-cols-[170px_1fr_1fr_auto] items-end gap-4">
          <div className="flex flex-col gap-1 pb-1">
            <p className="tnum text-body font-semibold text-ink">{changedLine(changedCount)}</p>
            {blocker && (
              <p id="save-reason" className="text-small text-ink-soft">
                {blocker}
              </p>
            )}
          </div>
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
          <Button disabled={pending || !!blocker} aria-describedby={blocker ? "save-reason" : undefined} onClick={save}>
            {pending ? "Saving…" : "Save new version"}
          </Button>
        </div>
      </div>
    </div>
  );
}
