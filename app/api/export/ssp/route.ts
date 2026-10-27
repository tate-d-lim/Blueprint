import path from "node:path";
import { sspFileName } from "@/lib/export/filename";
import { errorResponse, resolvePlanRequest } from "@/lib/export/plan-request";
import { fillSspWorkbook } from "@/lib/export/ssp-xlsx";

const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export async function GET(request: Request) {
  try {
    const { plan, data, project } = await resolvePlanRequest(new URL(request.url).searchParams);
    const genai = plan.items.some(i => i.profileId === "generative-ai")
      ? data.profiles.find(p => p._id === "generative-ai")
      : undefined;
    const buffer = await fillSspWorkbook(plan, {
      templatePath: path.join(process.cwd(), "data", "source", "low-risk-cloud-ssp.xlsx"),
      genai: genai && { profile: genai },
    });
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": XLSX,
        "Content-Disposition": `attachment; filename="${sspFileName(project?.name)}"`,
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
