"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Button } from "@/app/ui/button";
import { Dialog } from "@/app/ui/dialog";
import { Field, inputClass, textareaClass } from "@/app/ui/field";
import { Note } from "@/app/ui/note";
import { Segmented } from "@/app/ui/segmented";
import { Stamp, Tag } from "@/app/ui/stamp";
import { Cell, Table } from "@/app/ui/table";
import { PLAIN_LABEL, type PlainState } from "@/lib/catalog/state";
import { savePlainAction } from "./actions";

/** One control of the chosen profile, as the sheet shows it. Built on the server. */
export interface Row {
  id: string;
  family: string;
  familyName: string;
  title: string;
  plainTitle?: string;
  levelLabel: string;
  state: PlainState;
  tools: { id: string; name: string; value: "provided" | "shared"; explanation?: string }[];
  statement: string;
  recommendations: string;
  rationale: string;
  references: string[];
  plain?: { title: string; task: string; why: string };
}

type Filter = "all" | "needs-work";

const toolSays = { provided: "Provides it", shared: "Shares it with the app builder" } as const;

export function CatalogBrowser({ profileId, profileTitle, rows }: { profileId: string; profileTitle: string; rows: Row[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [lastOpen, setLastOpen] = useState<Row | null>(null);

  const needsWork = rows.filter(r => r.state !== "written").length;
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(
      r => (filter === "all" || r.state !== "written") && (!q || r.id.includes(q) || r.title.toLowerCase().includes(q) || r.plainTitle?.toLowerCase().includes(q)),
    );
  }, [rows, query, filter]);

  const groups = useMemo(() => {
    const out: { family: string; name: string; rows: Row[] }[] = [];
    for (const r of shown) {
      let g = out.find(x => x.family === r.family);
      if (!g) out.push((g = { family: r.family, name: r.familyName, rows: [] }));
      g.rows.push(r);
    }
    return out;
  }, [shown]);

  const open = (r: Row) => {
    setLastOpen(r);
    setOpenId(r.id);
  };
  // The panel shows the row as it is now, so a save that refreshes the page shows the saved text.
  const current = rows.find(r => r.id === openId) ?? lastOpen;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <Field label="Find a control">
          {props => (
            <input {...props} type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Id or title, such as as-5" className={`${inputClass} w-[320px]`} />
          )}
        </Field>
        <Segmented<Filter>
          label="Show"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: `All ${rows.length} controls` },
            { value: "needs-work", label: `Needs work (${needsWork})` },
          ]}
        />
        <p role="status" className="tnum pb-2 text-small text-ink-soft">
          {shown.length} of {rows.length} controls shown
        </p>
      </div>

      {shown.length === 0 ? (
        <Note title={query ? `No control matches "${query.trim()}".` : "No control needs work."}>
          {query ? "Check the id or the title, or clear the search." : `Every control of ${profileTitle} has plain text that is up to date.`}
          {(query || filter !== "all") && (
            <span className="mt-2 flex">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setQuery("");
                  setFilter("all");
                }}
              >
                Show all controls
              </Button>
            </span>
          )}
        </Note>
      ) : (
        <Table head={["Id", "Control", "Level", "Covered by", "Plain text"]}>
          {groups.flatMap(g => [
            <tr key={`h-${g.family}`} className="bg-ground">
              <th colSpan={5} scope="colgroup" className="px-4 py-2 text-left text-small font-semibold text-ink">
                {g.name} <span className="tnum font-normal text-ink-soft">· {g.rows.length} {g.rows.length === 1 ? "control" : "controls"}</span>
              </th>
            </tr>,
            ...g.rows.map(r => (
              <tr key={r.id} onClick={() => open(r)} className="cursor-pointer hover:bg-ground">
                <Cell nowrap className="tnum font-semibold">
                  {r.id}
                </Cell>
                <Cell>
                  <button type="button" onClick={() => open(r)} className="text-left font-semibold text-ink underline-offset-4 hover:underline">
                    {r.title}
                  </button>
                  {r.plainTitle && <span className="block text-small text-ink-soft">{r.plainTitle}</span>}
                </Cell>
                <Cell nowrap>{r.levelLabel}</Cell>
                <Cell>
                  {r.tools.length === 0 ? (
                    <span className="text-small text-ink-soft">No tool</span>
                  ) : (
                    <span className="flex flex-wrap gap-1.5">
                      {r.tools.map(t => (
                        <Tag key={t.id}>{t.name}</Tag>
                      ))}
                    </span>
                  )}
                </Cell>
                <Cell nowrap>
                  {r.state === "recheck" ? <Stamp tone="pending">{PLAIN_LABEL.recheck}</Stamp> : r.state === "missing" ? <Tag>{PLAIN_LABEL.missing}</Tag> : <span className="text-small">{PLAIN_LABEL.written}</span>}
                </Cell>
              </tr>
            )),
          ])}
        </Table>
      )}

      <Dialog
        side
        open={openId !== null}
        onClose={() => setOpenId(null)}
        title={current ? `${current.id}: ${current.title}` : "Control"}
        description={current ? `${current.familyName} · ${current.levelLabel} · ${profileTitle}` : undefined}
        footer={
          current && <FooterButtons formId={`plain-${current.id}`} onClose={() => setOpenId(null)} />
        }
      >
        {current && <Detail key={`${profileId}:${current.id}`} profileId={profileId} row={current} />}
      </Dialog>
    </div>
  );
}

function FooterButtons({ formId, onClose }: { formId: string; onClose: () => void }) {
  return (
    <div className="flex gap-3">
      <Button type="submit" form={formId}>
        Save plain text
      </Button>
      <Button variant="secondary" onClick={onClose}>
        Close
      </Button>
    </div>
  );
}

function Detail({ profileId, row }: { profileId: string; row: Row }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [title, setTitle] = useState(row.plain?.title ?? "");
  const [task, setTask] = useState(row.plain?.task ?? "");
  const [why, setWhy] = useState(row.plain?.why ?? "");
  const [result, setResult] = useState<{ ok: boolean; text: string }>();

  const save = () =>
    start(async () => {
      const r = await savePlainAction(profileId, row.id, { title, task, why });
      setResult(r.ok ? { ok: true, text: "Saved. Builders see the new plain text at once." } : { ok: false, text: r.error });
      if (r.ok) router.refresh();
    });

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3" aria-labelledby={`official-${row.id}`}>
        <h3 id={`official-${row.id}`} className="text-lead font-semibold">
          Official wording
        </h3>
        <p className="text-small text-ink-soft">IM8 wording is read-only. It changes only when you apply a release.</p>
        <dl className="flex flex-col gap-4">
          <Part label="Statement">{row.statement}</Part>
          <Part label="Recommendations">{row.recommendations}</Part>
          <Part label="Risk statement">{row.rationale}</Part>
          {row.references.length > 0 && (
            <div className="flex flex-col gap-1">
              <dt className="text-small font-semibold text-ink-soft">References</dt>
              <dd>
                <ul className="list-disc pl-5 text-body">
                  {row.references.map(r => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </dd>
            </div>
          )}
        </dl>
      </section>

      <section className="flex flex-col gap-3" aria-labelledby={`tools-${row.id}`}>
        <h3 id={`tools-${row.id}`} className="text-lead font-semibold">
          What the tools say
        </h3>
        {row.tools.length === 0 ? (
          <p className="text-body text-ink-soft">No tool says it provides or shares this control.</p>
        ) : (
          <ul className="divide-y divide-rule rounded-sm border border-rule">
            {row.tools.map(t => (
              <li key={t.id} className="flex flex-col gap-0.5 px-4 py-2.5">
                <span className="font-semibold">
                  {t.name} <span className="font-normal text-ink-soft">· {toolSays[t.value]}</span>
                </span>
                {t.explanation && <span className="text-small text-ink-soft">{t.explanation}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-4" aria-labelledby={`plain-title-${row.id}`}>
        <h3 id={`plain-title-${row.id}`} className="text-lead font-semibold">
          Plain text
        </h3>
        {row.state === "recheck" && (
          <Note tone="attention" title="A release reworded this control after the plain text was written.">
            Read the new wording above. Change the plain text if it no longer fits, then save it.
          </Note>
        )}
        {row.state === "missing" && <p className="text-body text-ink-soft">This control has no plain text. Builders see the official wording.</p>}
        <form
          id={`plain-${row.id}`}
          className="flex flex-col gap-4"
          onSubmit={e => {
            e.preventDefault();
            setResult(undefined);
            save();
          }}
        >
          <Field label="Title" hint="A short name for the control, in daily words.">
            {props => <input {...props} value={title} maxLength={120} onChange={e => setTitle(e.target.value)} className={inputClass} />}
          </Field>
          <Field label="What to do" hint="One or two sentences that start with a verb.">
            {props => <textarea {...props} rows={3} maxLength={1200} value={task} onChange={e => setTask(e.target.value)} className={textareaClass} />}
          </Field>
          <Field label="Why it matters" hint="What can go wrong when nobody does it.">
            {props => <textarea {...props} rows={3} maxLength={1200} value={why} onChange={e => setWhy(e.target.value)} className={textareaClass} />}
          </Field>
          {pending && <p role="status" className="text-small text-ink-soft">Saving…</p>}
          {result && <Note tone={result.ok ? "success" : "error"} role={result.ok ? "status" : undefined}>{result.text}</Note>}
        </form>
      </section>
    </div>
  );
}

function Part({ label, children }: { label: string; children: string }) {
  if (!children) return null;
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-small font-semibold text-ink-soft">{label}</dt>
      <dd className="text-body whitespace-pre-line">{children}</dd>
    </div>
  );
}
