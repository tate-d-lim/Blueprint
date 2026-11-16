import { RoleGate } from "@/app/components/role-gate";
import { ButtonLink } from "@/app/ui/button";
import { Note } from "@/app/ui/note";
import { PageHeader, SectionHeading } from "@/app/ui/panel";
import { Tag } from "@/app/ui/stamp";
import { Breadcrumb, Cell, Table } from "@/app/ui/table";
import { diffRelease, type ReleaseDiff } from "@/lib/catalog/apply";
import { changeCounts, countsLine, longDate, plural, stampOf } from "@/lib/catalog/format";
import { LEVEL_LABEL } from "@/lib/catalog/state";
import { CatalogError } from "@/lib/catalog/types";
import { withDb } from "@/lib/data/db";
import { getPending } from "@/lib/data/repos/catalog";
import { ReviewActions } from "./review-actions";

type Props = { params: Promise<{ id: string }> };

export default function ReviewPage(props: Props) {
  return (
    <RoleGate need="admin">
      <Review {...props} />
    </RoleGate>
  );
}

const back = <Breadcrumb items={[{ label: "Catalog", href: "/admin/catalog" }, { label: "Review a release" }]} />;

async function Review({ params }: Props) {
  const { id } = await params;
  const result = await withDb(async db => {
    const waiting = await getPending(db, id);
    if (!waiting) return undefined;
    try {
      return { waiting, diffs: await diffRelease(db, waiting.incoming) };
    } catch (err) {
      if (err instanceof CatalogError) return { waiting, error: err.message };
      throw err;
    }
  });

  if (!result) {
    return (
      <div className="flex max-w-page flex-col gap-8">
        {back}
        <PageHeader title="Review a release" />
        <Note title="This release is no longer waiting.">
          Someone applied or discarded it, or the data was reset. Upload the file again, or check GovTech from the Catalog sheet.
        </Note>
        <div>
          <ButtonLink href="/admin/catalog" variant="secondary">
            Back to the catalog
          </ButtonLink>
        </div>
      </div>
    );
  }

  const { waiting } = result;
  const source = waiting.incoming.source;
  const diffs = "diffs" in result && result.diffs ? result.diffs : [];
  const removed = diffs.reduce((n, d) => n + d.diff.changes.removed.length, 0);
  const anyChange = diffs.some(d => d.diff.changed);
  const added = diffs.reduce((n, d) => n + d.diff.changes.added.length, 0);
  // A removed control can carry the rule behind a question on "About your app".
  const removedWithRule = diffs.reduce((n, d) => n + d.diff.changes.removed.filter(r => d.profile.entries.find(e => e.id === r.id)?.plain?.appliesWhen).length, 0);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex max-w-page flex-col gap-8">
        {back}
        <PageHeader title="Review this release">
          Check what changes in each profile. The catalog stays as it is until you apply the release.
        </PageHeader>

        <dl className="grid max-w-page grid-cols-[max-content_1fr] gap-x-8 gap-y-2 border-y border-rule py-4 text-body">
          <dt className="font-semibold">Source</dt>
          <dd>{source.kind === "fetch" ? `GovTech site (${source.label})` : `File ${source.label}`}</dd>
          {source.sourceDate && (
            <>
              <dt className="font-semibold">Dated</dt>
              <dd>{longDate(source.sourceDate)}</dd>
            </>
          )}
          <dt className="font-semibold">Read</dt>
          <dd className="tnum">{stampOf(waiting.createdAt)}</dd>
        </dl>

        {"error" in result && result.error && <Note tone="error" title="Blueprint cannot compare this release.">{result.error}</Note>}

        {waiting.incoming.notes.length > 0 && (
          <Note>
            <ul className="list-disc pl-5">
              {waiting.incoming.notes.map(n => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </Note>
        )}

        {removed > 0 && (
          <Note tone="attention" title={`This release removes ${plural(removed, "control")}.`}>
            {source.kind === "fetch"
              ? "GovTech no longer lists them. When you apply the release, the plans of builders and the coverage of tools lose these controls."
              : "Check that this is the newest file. An older file removes controls that a newer release added."}
            {removedWithRule > 0 && (
              <p className="mt-1">
                {plural(removedWithRule, "removed control")} {removedWithRule === 1 ? "has" : "have"} a rule that uses the answers on &ldquo;About your app&rdquo;. Blueprint stops asking a question
                that only removed controls use.
              </p>
            )}
          </Note>
        )}

        {added > 0 && (
          <Note title={`This release adds ${plural(added, "control")}.`}>
            A new control has no plain text and no rule, so it applies to each app of its profile and builders read the official wording. After you apply the release, write the plain
            text on the Catalog sheet.
          </Note>
        )}

        {diffs.map(d => (
          <ProfileSection key={d.profile._id} d={d} />
        ))}
      </div>

      {/* Outside the page column, so the bar goes across the whole sheet. */}
      <ReviewActions pendingId={waiting._id} canApply={anyChange} fetched={source.kind === "fetch"} summary={totalLine(diffs)} />
    </div>
  );
}

/** "15 added, 8 removed, 2 reworded, 1 with a new level, in 4 profiles." */
function totalLine(diffs: ReleaseDiff[]): string {
  const changed = diffs.filter(d => d.diff.changed);
  const sum = (kind: "added" | "removed" | "reworded" | "levelChanged") => changed.reduce((n, d) => n + d.diff.changes[kind].length, 0);
  return `${countsLine({ added: sum("added"), removed: sum("removed"), reworded: sum("reworded"), levelChanged: sum("levelChanged") })}, in ${plural(changed.length, "profile")}.`;
}

function ProfileSection({ d }: { d: ReleaseDiff }) {
  const { diff, profile } = d;
  const c = diff.changes;
  const levelOf = (n: 0 | 1 | 2) => LEVEL_LABEL[n];
  const title = (id: string, t: string) => (
    <>
      <span className="tnum font-semibold">{id}</span> {t}
    </>
  );
  const wording = (text: string) => <span className="whitespace-pre-line">{text}</span>;
  return (
    <section className="flex flex-col gap-3" aria-label={profile.title}>
      <SectionHeading title={profile.title}>{changeCounts(c)}.</SectionHeading>
      {diff.ignored.length > 0 && (
        <p className="text-small text-ink-soft">
          The file has {plural(diff.ignored.length, "control")} that {profile.title} does not hold. Blueprint ignores them.
        </p>
      )}
      {diff.retitled.length > 0 && (
        <p className="text-small text-ink-soft">{plural(diff.retitled.length, "title")} change with no change of wording. Applying the release updates them.</p>
      )}
      {diff.changed && (
        <Table head={["Change", "Control", "Before", "Now"]}>
          {c.removed.map(r => {
            const entry = profile.entries.find(e => e.id === r.id)!;
            return (
              <tr key={`rm-${r.id}`}>
                <Cell nowrap>
                  <Tag>Removed</Tag>
                </Cell>
                <Cell>{title(r.id, r.title)}</Cell>
                <Cell>{wording(entry.statement)}</Cell>
                <Cell className="text-ink-soft">Not in the release</Cell>
              </tr>
            );
          })}
          {diff.added.map(a => (
            <tr key={`add-${a.id}`}>
              <Cell nowrap>
                <Tag>Added</Tag>
              </Cell>
              <Cell>{title(a.id, a.title)}</Cell>
              <Cell className="text-ink-soft">Not in the catalog</Cell>
              <Cell>
                {a.level !== undefined && <span className="block text-small text-ink-soft">{levelOf(a.level)}</span>}
                {wording(a.statement)}
              </Cell>
            </tr>
          ))}
          {diff.reworded.map(r => (
            <tr key={`rw-${r.id}`}>
              <Cell nowrap>
                <Tag>Reworded</Tag>
              </Cell>
              <Cell>{title(r.id, r.title)}</Cell>
              <Cell>{wording(r.before)}</Cell>
              <Cell>{wording(r.after)}</Cell>
            </tr>
          ))}
          {c.levelChanged.map(l => (
            <tr key={`lv-${l.id}`}>
              <Cell nowrap>
                <Tag>Level changed</Tag>
              </Cell>
              <Cell>{title(l.id, l.title)}</Cell>
              <Cell>{levelOf(l.from)}</Cell>
              <Cell>{levelOf(l.to)}</Cell>
            </tr>
          ))}
        </Table>
      )}
      {!diff.changed && <p className="text-body text-ink-soft">No change in {profile.title}.</p>}
    </section>
  );
}
