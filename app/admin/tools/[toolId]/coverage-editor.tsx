"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import type { DraftRow } from "@/lib/admin/new-version";
import type { CoverageValue, Level, RequirementKey } from "@/lib/domain/types";
import { VALUE_LABEL } from "@/lib/plan/labels";
import { saveVersionAction } from "../../actions";

interface Requirement {
  key: RequirementKey;
  id: string;
  family: string;
  title: string;
  level: Level;
}

const VALUES: CoverageValue[] = ["provided", "shared", "app-builder", "not-applicable", "other-tool"];
const INPUT = "w-full rounded-md border border-line bg-surface px-2 py-1.5 text-sm";

export function CoverageEditor({
  toolId,
  toolName,
  profileId,
  requirements,
  initialRows,
  otherTools,
  defaultSource,
}: {
  toolId: string;
  toolName: string;
  profileId: string;
  requirements: Requirement[];
  initialRows: DraftRow[];
  otherTools: { id: string; name: string }[];
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
  const [source, setSource] = useState(defaultSource);
  const [changeNote, setChangeNote] = useState("");
  const [errors, setErrors] = useState<{ key?: string; message: string }[]>([]);
  const [savedVersion, setSavedVersion] = useState<number | null>(null);

  const families = [...new Set(requirements.map(r => r.family))];
  const update = (key: RequirementKey, patch: Partial<DraftRow>) =>
    setRows(prev => new Map(prev).set(key, { ...prev.get(key)!, ...patch }));
  const visible = requirements.filter(
    r => (!family || r.family === family) && (!level || String(r.level) === level) && (!coveredOnly || rows.get(r.key)!.value),
  );
  const covered = [...rows.values()].filter(r => r.value).length;
  const errorFor = (key: RequirementKey) => errors.find(e => e.key === key)?.message;
  const changed = (key: RequirementKey) => JSON.stringify(strip(rows.get(key)!)) !== JSON.stringify(strip(initial.get(key) ?? { key, value: "" }));

  const save = () =>
    startTransition(async () => {
      const result = await saveVersionAction(toolId, profileId, [...rows.values()], source, changeNote);
      if (result.ok) {
        setErrors([]);
        setSavedVersion(result.version);
        setSaving(false);
        router.refresh();
      } else {
        setErrors(result.errors);
      }
    });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <select aria-label="Family" value={family} onChange={e => setFamily(e.target.value)} className={`${INPUT} w-auto`}>
          <option value="">All families</option>
          {families.map(f => (
            <option key={f} value={f}>
              {f.toUpperCase()}
            </option>
          ))}
        </select>
        <select aria-label="Level" value={level} onChange={e => setLevel(e.target.value)} className={`${INPUT} w-auto`}>
          <option value="">All levels</option>
          <option value="0">Level 0</option>
          <option value="1">Level 1</option>
          <option value="2">Level 2</option>
        </select>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={coveredOnly} onChange={e => setCoveredOnly(e.target.checked)} className="size-4 accent-[var(--accent)]" />
          Rows with coverage only
        </label>
        <span className="text-muted">
          {visible.length} shown · {covered} with coverage
        </span>
      </div>

      {savedVersion !== null && (
        <p className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm">
          Saved version {savedVersion}. It is not yet verified: a verifier needs to approve it before builders see it as verified.
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full min-w-[60rem] text-left text-sm">
          <thead className="border-b border-line text-muted">
            <tr>
              <th className="px-3 py-2 font-medium">Requirement</th>
              <th className="px-3 py-2 font-medium">Who handles it</th>
              <th className="px-3 py-2 font-medium">Explanation</th>
              <th className="px-3 py-2 font-medium">App Builder&apos;s part</th>
              <th className="px-3 py-2 font-medium">Source</th>
            </tr>
          </thead>
          <tbody>
            {visible.map(req => {
              const row = rows.get(req.key)!;
              const error = errorFor(req.key);
              return (
                <tr key={req.key} className={`border-b border-line align-top last:border-0 ${changed(req.key) ? "bg-accent-soft/60" : ""}`}>
                  <td className="w-64 px-3 py-2">
                    <div className="font-medium">{req.title}</div>
                    <div className="font-mono text-xs text-muted">
                      {req.id} · Level {req.level}
                    </div>
                  </td>
                  <td className="w-56 px-3 py-2">
                    <select
                      aria-label={`Who handles ${req.id}`}
                      value={row.value}
                      onChange={e => update(req.key, { value: e.target.value as DraftRow["value"] })}
                      className={INPUT}
                    >
                      <option value="">No statement</option>
                      {VALUES.map(v => (
                        <option key={v} value={v}>
                          {v === "other-tool" ? "Handled by another tool…" : VALUE_LABEL(v, toolName)}
                        </option>
                      ))}
                    </select>
                    {row.value === "other-tool" && (
                      <select
                        aria-label={`Which tool handles ${req.id}`}
                        value={row.otherToolId ?? ""}
                        onChange={e => update(req.key, { otherToolId: e.target.value })}
                        className={`${INPUT} mt-1`}
                      >
                        <option value="">Pick a tool</option>
                        {otherTools.map(t => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    )}
                    {error && <p className="mt-1 text-xs font-medium text-red-700">{error}</p>}
                  </td>
                  <td className="px-3 py-2">
                    <textarea
                      aria-label={`Explanation for ${req.id}`}
                      rows={2}
                      value={row.explanation ?? ""}
                      onChange={e => update(req.key, { explanation: e.target.value })}
                      className={INPUT}
                    />
                  </td>
                  <td className="px-3 py-2">
                    {(row.value === "shared" || row.value === "app-builder") && (
                      <textarea
                        aria-label={`App Builder's part for ${req.id}`}
                        rows={2}
                        value={row.builderPart ?? ""}
                        onChange={e => update(req.key, { builderPart: e.target.value })}
                        className={INPUT}
                      />
                    )}
                  </td>
                  <td className="w-48 px-3 py-2">
                    <input
                      aria-label={`Source for ${req.id}`}
                      value={row.source ?? ""}
                      onChange={e => update(req.key, { source: e.target.value })}
                      placeholder="Same as version"
                      className={INPUT}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="sticky bottom-0 -mx-6 border-t border-line bg-surface px-6 py-3">
        {!saving ? (
          <button type="button" onClick={() => { setSaving(true); setSavedVersion(null); }} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90">
            Save new version
          </button>
        ) : (
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <label className="text-sm font-medium">
              Source for this version
              <input value={source} onChange={e => setSource(e.target.value)} className={`${INPUT} mt-1`} />
            </label>
            <label className="text-sm font-medium">
              What changed
              <input value={changeNote} onChange={e => setChangeNote(e.target.value)} placeholder="Optional" className={`${INPUT} mt-1`} />
            </label>
            <div className="flex gap-2">
              <button type="button" disabled={pending} onClick={save} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
                {pending ? "Saving…" : "Save"}
              </button>
              <button type="button" onClick={() => { setSaving(false); setErrors([]); }} className="rounded-lg border border-line px-4 py-2 text-sm">
                Cancel
              </button>
            </div>
            {errors.filter(e => !e.key).map(e => (
              <p key={e.message} className="text-sm font-medium text-red-700 sm:col-span-3">{e.message}</p>
            ))}
            {errors.some(e => e.key) && <p className="text-sm font-medium text-red-700 sm:col-span-3">Fix the highlighted rows and save again.</p>}
          </div>
        )}
      </div>
    </div>
  );
}

/** Compares rows ignoring blank strings. */
function strip(row: DraftRow) {
  return { key: row.key, value: row.value, otherToolId: row.otherToolId || undefined, explanation: row.explanation || undefined, builderPart: row.builderPart || undefined, source: row.source || undefined };
}
