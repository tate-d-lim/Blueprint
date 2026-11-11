import { withDb } from "@/lib/data/db";
import { loadPlanData } from "@/lib/data/repos/plan-data";
import { renderCoverageBrief } from "@/lib/export/coverage-brief-md";
import { getRole } from "@/lib/role";

export async function GET(request: Request, { params }: { params: Promise<{ toolId: string }> }) {
  if ((await getRole()) !== "admin") return new Response("Switch to admin to download this.", { status: 403 });
  const { toolId } = await params;
  const profileId = new URL(request.url).searchParams.get("profile");
  const data = await withDb(loadPlanData);
  const tool = data.tools.find(t => t._id === toolId);
  const profile = data.profiles.find(p => p._id === profileId);
  if (!tool || !profile) return new Response("No such tool or profile.", { status: 404 });

  const brief = renderCoverageBrief({ tool, profile, generatedAt: new Date().toISOString() });
  return new Response(brief, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": 'attachment; filename="BUILD-COVERAGE.md"',
    },
  });
}
