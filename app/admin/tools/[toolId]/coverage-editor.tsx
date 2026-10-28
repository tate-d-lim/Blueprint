"use client";

import {
  SgdsAccordion,
  SgdsAccordionItem,
  SgdsAlert,
  SgdsBadge,
  SgdsButton,
  SgdsCheckbox,
  SgdsInput,
  SgdsSelect,
  SgdsTextarea,
} from "@govtechsg/sgds-web-component/react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { checkedOf, valueOf } from "@/app/components/sgds-events";
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

const BADGE_VARIANT = {
  provided: "success",
  shared: "info",
  "app-builder": "neutral",
  "not-applicable": "neutral",
  "other-tool": "cyan",
} as const satisfies Record<CoverageValue, string>;


/** The select components can't hold an empty value, so "no statement" and "all" travel as words. */
const NONE = "none";
const ALL = "all";

const LEVEL_OPTIONS = [
  { label: "All levels", value: ALL },
  { label: "Level 0", value: "0" },
  { label: "Level 1", value: "1" },
  { label: "Level 2", value: "2" },
];

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
  const [family, setFamily] = useState(ALL);
  const [level, setLevel] = useState(ALL);
  const [coveredOnly, setCoveredOnly] = useState(false);
  const [saving, setSaving] = useState(false);
  // Starts empty on purpose: a changed row is credited to the source typed here, never to the previous one.
  const [source, setSource] = useState("");
  const [changeNote, setChangeNote] = useState("");
  const [errors, setErrors] = useState<{ key?: string; message: string }[]>([]);
  const [savedVersion, setSavedVersion] = useState<number | null>(null);

  const update = (key: RequirementKey, patch: Partial<DraftRow>) =>
    setRows(prev => new Map(prev).set(key, { ...prev.get(key)!, ...patch }));
  const visible = requirements.filter(
    r => (family === ALL || r.family === family) && (level === ALL || String(r.level) === level) && (!coveredOnly || rows.get(r.key)!.value),
  );
  const covered = [...rows.values()].filter(r => r.value).length;
  const errorFor = (key: RequirementKey) => errors.find(e => e.key === key)?.message;
  const changed = (key: RequirementKey) => JSON.stringify(strip(rows.get(key)!)) !== JSON.stringify(strip(initial.get(key) ?? { key, value: "" }));
  const toolNameOf = (id?: string) => otherTools.find(t => t.id === id)?.name;
  const familyOptions = useMemo(
    () => [{ label: "All families", value: ALL }, ...[...new Set(requirements.map(r => r.family))].map(f => ({ label: f.toUpperCase(), value: f }))],
    [requirements],
  );
  const valueOptions = useMemo(
    () => [
      { label: "No statement", value: NONE },
      ...VALUES.map(v => ({ label: v === "other-tool" ? "Handled by another tool…" : VALUE_LABEL(v, toolName), value: v })),
    ],
    [toolName],
  );
  const otherToolOptions = useMemo(() => otherTools.map(t => ({ label: t.name, value: t.id })), [otherTools]);

  const statusBadges = (row: DraftRow, hasError: boolean, isChanged: boolean) => (
    <>
      {isChanged && (
        <SgdsBadge show variant="warning">
          Changed
        </SgdsBadge>
      )}
      {hasError && (
        <SgdsBadge show variant="danger">
          Needs attention
        </SgdsBadge>
      )}
      {row.value ? (
        <SgdsBadge show variant={BADGE_VARIANT[row.value]}>
          {VALUE_LABEL(row.value, toolName, toolNameOf(row.otherToolId))}
        </SgdsBadge>
      ) : (
        <SgdsBadge show variant="neutral" outlined>
          No statement
        </SgdsBadge>
      )}
    </>
  );

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
    <div className="sgds:flex sgds:flex-col sgds:gap-sm">
      <div className="sgds:grid sgds:items-end sgds:gap-sm sgds:md:grid-cols-[12rem_12rem_auto_1fr]">
        <SgdsSelect label="Family" name="family" value={family} menuList={familyOptions} onSgdsChange={e => setFamily(valueOf(e))} />
        <SgdsSelect label="Level" name="level" value={level} menuList={LEVEL_OPTIONS} onSgdsChange={e => setLevel(valueOf(e))} />
        <SgdsCheckbox name="coveredOnly" value="yes" checked={coveredOnly} onSgdsChange={e => setCoveredOnly(checkedOf(e))}>
          Rows with coverage only
        </SgdsCheckbox>
        <p className="sgds:text-body-sm sgds:text-subtle">
          {visible.length} shown · {covered} with coverage
        </p>
      </div>

      {savedVersion !== null && (
        <SgdsAlert show outlined variant="success">
          Saved version {savedVersion}. It is not yet verified: a verifier needs to approve it before builders see it as verified.
        </SgdsAlert>
      )}

      <SgdsAccordion allowMultiple>
        {visible.map(req => {
          const row = rows.get(req.key)!;
          const error = errorFor(req.key);
          return (
            <SgdsAccordionItem key={req.key}>
              <div slot="header" className="sgds:flex sgds:flex-col sgds:gap-text-xs">
                <span>{req.title}</span>
                <span className="sgds:font-code sgds:text-caption-md sgds:font-regular sgds:text-subtle">
                  {req.id} · Level {req.level}
                </span>
                {/* Small screens have no room beside the title, so the badges go underneath it. */}
                <span className="sgds:flex sgds:flex-wrap sgds:items-center sgds:gap-text-xs sgds:md:hidden">{statusBadges(row, !!error, changed(req.key))}</span>
              </div>
              <span slot="badge" className="sgds:hidden sgds:flex-wrap sgds:items-center sgds:gap-text-xs sgds:md:flex">
                {statusBadges(row, !!error, changed(req.key))}
              </span>
              <div slot="content" className="sgds:flex sgds:flex-col sgds:gap-sm">
                {error && (
                  <SgdsAlert show outlined variant="danger">
                    {error}
                  </SgdsAlert>
                )}
                <div className="sgds:grid sgds:gap-sm sgds:md:grid-cols-2">
                  <SgdsSelect
                    label="Who handles it"
                    name={`value-${req.id}`}
                    value={row.value || NONE}
                    menuList={valueOptions}
                    onSgdsChange={e => update(req.key, { value: (valueOf(e) === NONE ? "" : valueOf(e)) as DraftRow["value"] })}
                  />
                  {row.value === "other-tool" && (
                    <SgdsSelect
                      label="Which tool handles it"
                      name={`other-${req.id}`}
                      placeholder="Pick a tool"
                      value={row.otherToolId ?? ""}
                      menuList={otherToolOptions}
                      onSgdsChange={e => update(req.key, { otherToolId: valueOf(e) })}
                    />
                  )}
                </div>
                <SgdsTextarea
                  label="Explanation"
                  placeholder="What the tool does for this requirement"
                  name={`explanation-${req.id}`}
                  rows={2}
                  value={row.explanation ?? ""}
                  onSgdsInput={e => update(req.key, { explanation: valueOf(e) })}
                />
                {(row.value === "shared" || row.value === "app-builder") && (
                  <SgdsTextarea
                    label="App Builder's part"
                    placeholder="What the App Builder still has to do"
                    name={`builder-part-${req.id}`}
                    rows={2}
                    value={row.builderPart ?? ""}
                    onSgdsInput={e => update(req.key, { builderPart: valueOf(e) })}
                  />
                )}
                <SgdsInput
                  label="Source"
                  name={`source-${req.id}`}
                  placeholder="Same as before"
                  value={row.source ?? ""}
                  onSgdsInput={e => update(req.key, { source: valueOf(e) })}
                />
              </div>
            </SgdsAccordionItem>
          );
        })}
      </SgdsAccordion>

      <div className="sgds:sticky sgds:bottom-0 sgds:z-10 sgds:border-t sgds:border-muted sgds:bg-surface-default sgds:py-sm sgds:shadow-edge-top">
        {!saving ? (
          <SgdsButton
            onClick={() => {
              setSaving(true);
              setSavedVersion(null);
            }}
          >
            Save new version
          </SgdsButton>
        ) : (
          <div className="sgds:flex sgds:flex-col sgds:gap-sm">
            <div className="sgds:grid sgds:items-end sgds:gap-sm sgds:md:grid-cols-[1fr_1fr_auto]">
              <SgdsInput
                label="Source for this version"
                name="version-source"
                value={source}
                placeholder={defaultSource ? `Where the changes come from (before: ${defaultSource})` : "Where this coverage comes from"}
                onSgdsInput={e => setSource(valueOf(e))}
              />
              <SgdsInput
                label="What changed"
                name="version-note"
                value={changeNote}
                placeholder="Optional"
                onSgdsInput={e => setChangeNote(valueOf(e))}
              />
              <div className="sgds:flex sgds:gap-sm">
                <SgdsButton disabled={pending} onClick={save}>
                  {pending ? "Saving…" : "Save"}
                </SgdsButton>
                <SgdsButton
                  variant="outline"
                  onClick={() => {
                    setSaving(false);
                    setErrors([]);
                  }}
                >
                  Cancel
                </SgdsButton>
              </div>
            </div>
            {errors
              .filter(e => !e.key)
              .map(e => (
                <SgdsAlert key={e.message} show outlined variant="danger">
                  {e.message}
                </SgdsAlert>
              ))}
            {errors.some(e => e.key) && (
              <SgdsAlert show outlined variant="danger">
                Fix the highlighted rows and save again.
              </SgdsAlert>
            )}
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
    otherToolId: row.otherToolId || undefined,
    explanation: row.explanation || undefined,
    builderPart: row.builderPart || undefined,
    source: row.source || undefined,
  };
}
