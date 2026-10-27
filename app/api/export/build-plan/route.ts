import { renderBuildPlan } from "@/lib/export/build-plan-md";
import { errorResponse, resolvePlanRequest } from "@/lib/export/plan-request";

export async function GET(request: Request) {
  try {
    const { plan, meta } = await resolvePlanRequest(new URL(request.url).searchParams);
    return new Response(renderBuildPlan(plan, meta), {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": 'attachment; filename="BUILD-PLAN.md"',
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
