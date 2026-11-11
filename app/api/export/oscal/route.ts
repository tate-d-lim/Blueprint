import { buildComponentDefinition, buildSsp } from "@/lib/export/oscal";
import { oscalFileName } from "@/lib/export/filename";
import { errorResponse, resolvePlanRequest } from "@/lib/export/plan-request";

import { GENAI_PROFILE_ID } from "@/lib/plan/select";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const kind = params.get("kind");
  if (kind !== "component-definition" && kind !== "ssp") {
    return new Response("kind must be component-definition or ssp", { status: 400 });
  }
  try {
    const { plan, data, toolIds, project, answers, profileId } = await resolvePlanRequest(params);
    // The same rule as the spreadsheet route: GenAI is in when the plan has GenAI items.
    const profileIds = [profileId, ...(plan.items.some(i => i.profileId === GENAI_PROFILE_ID) ? [GENAI_PROFILE_ID] : [])];
    const profiles = profileIds.map(id => data.profiles.find(p => p._id === id)!);
    const tools = toolIds.flatMap(id => {
      const tool = data.tools.find(t => t._id === id);
      if (!tool) return [];
      const pairs = profileIds.flatMap(profileId => data.versions.filter(v => v.current.toolId === id && v.current.profileId === profileId));
      return [{ tool, pairs }];
    });
    const generatedAt = new Date().toISOString();
    const document =
      kind === "ssp"
        ? buildSsp({ plan, profiles, tools, answers, project: project && { id: project._id, name: project.name }, generatedAt })
        : buildComponentDefinition({ tools, profiles, generatedAt });
    return new Response(JSON.stringify(document, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${oscalFileName(kind, project?.name)}"`,
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
