import { withDb } from "@/lib/data/db";
import { loadPlanData } from "@/lib/data/repos/plan-data";
import { catalogFileName } from "@/lib/export/filename";
import { buildCatalog } from "@/lib/export/oscal";

/** One profile of the IM8 catalog as an OSCAL 1.1.2 catalog. Every role can read the catalog, so every role can download it. */
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("profile");
  if (!id) return new Response("Give a profile, for example ?profile=low-risk-cloud", { status: 400 });
  const profile = await withDb(async db => (await loadPlanData(db)).profiles.find(p => p._id === id));
  if (!profile) return new Response(`No profile ${id}.`, { status: 404 });
  const document = buildCatalog({ profile, generatedAt: new Date().toISOString() });
  return new Response(JSON.stringify(document, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${catalogFileName(profile._id)}"`,
    },
  });
}
