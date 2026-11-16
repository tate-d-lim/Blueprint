import { RoleGate } from "@/app/components/role-gate";
import { ResetButton } from "@/app/components/reset-button";
import { ButtonLink } from "@/app/ui/button";
import { Note } from "@/app/ui/note";
import { PageHeader, SectionHeading } from "@/app/ui/panel";
import { Cell, Table } from "@/app/ui/table";
import { autoCheckEnabled, checkIsDue, lastChecks, mongoStore, SOURCES } from "@/lib/catalog/check";
import { changeCounts, describeCheck, longDate, plural, sourceName, stampOf } from "@/lib/catalog/format";
import { LEVEL_LABEL, plainState, releaseKinds, toolsCovering } from "@/lib/catalog/state";
import { withDb } from "@/lib/data/db";
import { loadCatalogPage, newestFetched } from "@/lib/data/repos/catalog";
import type { CatalogRelease, Profile } from "@/lib/domain/types";
import { familyName } from "@/lib/plan/hotel";
import { CatalogBrowser, type Row } from "./catalog-browser";
import { GovtechCheck } from "./govtech-check";
import { ProfileSwitch } from "./profile-switch";

type Props = { searchParams: Promise<{ profile?: string; applied?: string }> };

export default function CatalogPage(props: Props) {
  return (
    <RoleGate need="admin">
      <Catalog {...props} />
    </RoleGate>
  );
}

async function Catalog({ searchParams }: Props) {
  const { profile: chosen, applied } = await searchParams;
  const source = SOURCES[0];
  const data = await withDb(async db => {
    const page = await loadCatalogPage(db);
    const store = mongoStore(db);
    return { ...page, checks: await lastChecks(db, source.id), due: await checkIsDue(store, source.id), waiting: await newestFetched(db) };
  });
  const { profiles, releases } = data;

  if (profiles.length === 0) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader title="IM8 catalog">The official wording of the IM8 controls, by profile.</PageHeader>
        <Note tone="error" title="The database has no profiles.">
          Reset the data below to load the catalog from the seed files.
        </Note>
        <SourceData />
      </div>
    );
  }

  const profile = profiles.find(p => p._id === chosen) ?? profiles[0];
  const rows: Row[] = profile.entries.map(entry => ({
    id: entry.id,
    family: entry.family,
    familyName: familyName(entry.family),
    title: entry.title,
    plainTitle: entry.plain?.title,
    levelLabel: LEVEL_LABEL[entry.level],
    state: plainState(entry, profile._id, releases),
    tools: toolsCovering(entry, profile._id, data.tools, data.versions).map(t => ({ id: t.toolId, name: t.toolName, value: t.value, explanation: t.explanation })),
    statement: entry.statement,
    recommendations: entry.recommendations,
    rationale: entry.rationale,
    references: entry.references.split(";").map(r => r.trim()).filter(Boolean),
    plain: entry.plain && { title: entry.plain.title, task: entry.plain.task, why: entry.plain.why },
  }));

  const lastRelease = releases.find(r => r.changes.some(c => c.profileId === profile._id)) ?? releases.at(-1);
  const justApplied = applied ? releases.find(r => r._id === applied) : undefined;
  const { last, lastGood } = data.checks;
  const due = data.due && autoCheckEnabled();

  return (
    <div className="flex max-w-page flex-col gap-8">
      <PageHeader title="IM8 catalog">
        The official wording of each IM8 control, by profile. Update it with a release, then write the plain text that builders read.
      </PageHeader>

      {justApplied && <Applied release={justApplied} profiles={profiles} />}

      <section aria-label="Release and checks" className="grid gap-x-10 gap-y-5 border-y border-rule py-5 md:grid-cols-[1fr_auto]">
        <dl className="grid grid-cols-[max-content_1fr] gap-x-8 gap-y-2 text-body">
          <dt className="font-semibold">Current release</dt>
          <dd>
            {profile.title}, version <span className="tnum">{profile.version}</span>
          </dd>
          <dt className="font-semibold">Source</dt>
          <dd>{lastRelease ? sourceName(lastRelease) : profile.sourceFile}</dd>
          <dt className="font-semibold">Applied</dt>
          <dd className="tnum">{lastRelease ? stampOf(lastRelease.appliedAt) : "Unknown"}</dd>
          <dt className="font-semibold">Last check of GovTech</dt>
          <dd>{last ? <><span className="tnum">{stampOf(last.at)}</span>. {describeCheck(last, lastGood)}</> : "Not checked yet."}</dd>
        </dl>
        <div className="flex flex-wrap items-start gap-3 md:justify-end">
          <GovtechCheck due={due} />
          <ButtonLink href="/admin/catalog/upload">Upload a release</ButtonLink>
        </div>
      </section>

      {data.waiting && (
        <Note
          tone="attention"
          title="GovTech has changes that wait for your review."
          action={
            <ButtonLink href={`/admin/catalog/review/${data.waiting._id}`} variant="secondary">
              Review the release
            </ButtonLink>
          }
        >
          Found {stampOf(data.waiting.createdAt)}. Nothing changes in the catalog until you apply the release.
        </Note>
      )}

      <section className="flex flex-col gap-4" aria-label="Controls">
        <SectionHeading title="Controls" count={rows.length}>
          Select a control to read its official wording, see what the tools say, and write its plain text.
        </SectionHeading>
        <ProfileSwitch
          value={profile._id}
          options={profiles.map(p => ({ value: p._id, label: `${p.title} · ${plural(p.entries.length, "control")}` }))}
        />
        <CatalogBrowser key={profile._id} profileId={profile._id} profileTitle={profile.title} rows={rows} />
      </section>

      <History releases={releases} profiles={profiles} />
      <SourceData />
    </div>
  );
}

function Applied({ release, profiles }: { release: CatalogRelease; profiles: Profile[] }) {
  const lines = release.changes.map(c => `${profiles.find(p => p._id === c.profileId)?.title ?? c.profileId}: ${changeCounts(c)}`);
  return (
    <Note tone="success" role="status" title={`Release applied from ${sourceName(release)}.`}>
      <ul className="list-disc pl-5">
        {lines.map(l => (
          <li key={l}>{l}</li>
        ))}
      </ul>
      <p className="mt-1">Controls that were reworded now show &ldquo;Check the plain text&rdquo;.</p>
    </Note>
  );
}

function History({ releases, profiles }: { releases: CatalogRelease[]; profiles: Profile[] }) {
  return (
    <section className="flex flex-col gap-3" aria-label="Release history">
      <SectionHeading title="Release history" count={releases.length} />
      {releases.length === 0 ? (
        <Note title="No release is recorded.">Reset the data below. The seed becomes the first release.</Note>
      ) : (
        <Table head={["Applied", "Source", "Profiles", "Added", "Removed", "Reworded", "New level"]}>
          {releases.map(r => {
            const k = releaseKinds(r);
            return (
              <tr key={r._id}>
                <Cell nowrap className="tnum">
                  {stampOf(r.appliedAt)}
                </Cell>
                <Cell>
                  {sourceName(r)}
                  {r.source.sourceDate && <span className="block text-small text-ink-soft">Dated {longDate(r.source.sourceDate)}</span>}
                </Cell>
                <Cell>{r.changes.length === 0 ? <span className="text-ink-soft">No change</span> : r.changes.map(c => profiles.find(p => p._id === c.profileId)?.title ?? c.profileId).join(", ")}</Cell>
                <Cell className="tnum">{k.added}</Cell>
                <Cell className="tnum">{k.removed}</Cell>
                <Cell className="tnum">{k.reworded}</Cell>
                <Cell className="tnum">{k.levelChanged}</Cell>
              </tr>
            );
          })}
        </Table>
      )}
    </section>
  );
}

function SourceData() {
  return (
    <section className="flex flex-col gap-3 border-t border-rule pt-6" aria-label="Source data">
      <SectionHeading title="Source data">
        Blueprint loads the catalog, the tools and the sample projects from the files in the data folder. Reset data loads them again.
      </SectionHeading>
      <ResetButton />
    </section>
  );
}
