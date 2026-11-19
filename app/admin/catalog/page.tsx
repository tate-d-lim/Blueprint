import { ResetButton } from "@/app/components/reset-button";
import { ButtonLink, DownloadButton } from "@/app/ui/button";
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
import { getRole } from "@/lib/role";
import { CatalogBrowser, type Row } from "./catalog-browser";
import { GovtechCheck } from "./govtech-check";
import { ProfileSwitch } from "./profile-switch";

/** The last check found changes, and the admin has applied or discarded them since. */
const HANDLED = "GovTech had changes. You applied or discarded them.";

type Props = { searchParams: Promise<{ profile?: string; applied?: string }> };

/** Every role can read the catalog. Only the admin can change it. */
export default async function CatalogPage({ searchParams }: Props) {
  const isAdmin = (await getRole()) === "admin";
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
        {isAdmin && <SourceData />}
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
  const due = isAdmin && data.due && autoCheckEnabled();

  return (
    <div className="flex max-w-page flex-col gap-8">
      <PageHeader title="IM8 catalog">
        {isAdmin
          ? "The official wording of each IM8 control, by profile. Update it with a release, then write the plain text that builders read."
          : "The official wording of each IM8 control, by profile, with the plain text that builders read. Only an admin can change it."}
      </PageHeader>

      {isAdmin && justApplied && <Applied release={justApplied} profiles={profiles} />}

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
          <dd>
            {last ? (
              <>
                <span className="tnum">{stampOf(last.at)}</span>. {last.outcome === "changed" && !data.waiting ? HANDLED : describeCheck(last, lastGood)}
              </>
            ) : (
              "Not checked yet."
            )}
          </dd>
        </dl>
        {isAdmin && (
          <div className="flex flex-wrap items-start gap-3 md:justify-end">
            <GovtechCheck due={due} />
            <ButtonLink href="/admin/catalog/upload">Upload a release</ButtonLink>
          </div>
        )}
      </section>

      {isAdmin && data.waiting && (
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
          {isAdmin ? "Select a control to read its official wording, see what the tools say, and write its plain text." : "Select a control to read its official wording, see what the tools say, and read its plain text."}
        </SectionHeading>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <ProfileSwitch
            value={profile._id}
            options={profiles.map(p => ({ value: p._id, label: `${p.title} · ${plural(p.entries.length, "control")}` }))}
          />
          <DownloadButton href={`/api/export/oscal/catalog?profile=${encodeURIComponent(profile._id)}`} variant="secondary">
            Download {profile.title} as OSCAL
          </DownloadButton>
        </div>
        <CatalogBrowser key={profile._id} canEdit={isAdmin} profileId={profile._id} profileTitle={profile.title} rows={rows} />
      </section>

      <History releases={releases} profiles={profiles} />
      {isAdmin && <SourceData />}
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
