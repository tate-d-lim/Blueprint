import path from "node:path";
import { buildAboutInfo } from "@/lib/export/about";
import { sspFileName } from "@/lib/export/filename";
import { errorResponse, resolvePlanRequest } from "@/lib/export/plan-request";
import { buildSspWorkbook, fillSspWorkbook } from "@/lib/export/ssp-xlsx";
import { GENAI_PROFILE_ID } from "@/lib/plan/select";

const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** The profiles that have an official spreadsheet to fill, by profile. The others get a sheet with the same columns. */
const TEMPLATES: Record<string, string> = {
  "low-risk-cloud": path.join(process.cwd(), "data", "source", "low-risk-cloud-ssp.xlsx"),
};

export async function GET(request: Request) {
  try {
    const { plan, data, project, meta, profileId } = await resolvePlanRequest(new URL(request.url).searchParams);
    const profile = data.profiles.find(p => p._id === profileId)!;
    const genai = plan.items.some(i => i.profileId === GENAI_PROFILE_ID) ? data.profiles.find(p => p._id === GENAI_PROFILE_ID) : undefined;
    const about = buildAboutInfo(meta, profile, project?.name);
    const templatePath = TEMPLATES[profileId];
    const buffer = templatePath
      ? await fillSspWorkbook(plan, { templatePath, profileId, genai: genai && { profile: genai }, about })
      : Buffer.from(await (await buildSspWorkbook(plan, profile, { genai: genai && { profile: genai }, about })).xlsx.writeBuffer());
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": XLSX,
        "Content-Disposition": `attachment; filename="${sspFileName(profileId, project?.name)}"`,
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
