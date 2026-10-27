import { buildComponentDefinition, buildSsp } from "@/lib/export/oscal";
import { errorResponse, resolvePlanRequest } from "@/lib/export/plan-request";

const PROFILE_ID = "low-risk-cloud";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const kind = params.get("kind");
  if (kind !== "component-definition" && kind !== "ssp") {
    return new Response("kind must be component-definition or ssp", { status: 400 });
  }
  try {
    const { plan, data, toolIds, project, answers } = await resolvePlanRequest(params);
    const profile = data.profiles.find(p => p._id === PROFILE_ID)!;
    const tools = data.tools
      .filter(t => toolIds.includes(t._id))
      .flatMap(tool => {
        const pair = data.versions.find(v => v.current.toolId === tool._id && v.current.profileId === PROFILE_ID);
        return pair ? [{ tool, pair }] : [];
      });
    const generatedAt = new Date().toISOString();
    const document =
      kind === "ssp"
        ? buildSsp({ plan, profile, tools, answers, project: project && { id: project._id, name: project.name }, generatedAt })
        : buildComponentDefinition({ tools, profile, generatedAt });
    return new Response(JSON.stringify(document, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${kind}.json"`,
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
