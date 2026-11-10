import { redirect } from "next/navigation";
import { withPlanData } from "@/app/plan/plan-data";
import { PageHeader } from "@/app/ui/panel";
import { parsePlanQuery } from "@/lib/plan/url-state";
import { profileFor } from "@/lib/risk/assess";
import { AppForm } from "./app-form";

export default async function AppFactsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  return withPlanData(data => {
    const parsed = parsePlanQuery(sp, []);
    const profileId = parsed && profileFor(parsed.answers, data.profiles);
    const profile = data.profiles.find(p => p._id === profileId);
    if (!parsed || !profile) redirect("/start");
    return (
      <div className="flex max-w-page flex-col gap-8">
        <PageHeader title="About your app">
          Tick what is true. We leave out the requirements that cannot apply to your app, and we tell you which ones.
        </PageHeader>
        <AppForm
          risk={parsed.answers}
          initial={parsed.facts}
          profile={{ facts: profile.facts, entries: profile.entries.map(e => ({ plain: e.plain?.appliesWhen ? { appliesWhen: e.plain.appliesWhen } : undefined })) }}
        />
      </div>
    );
  });
}
