import path from "node:path";
import { sspFileName } from "@/lib/export/filename";
import { errorResponse, resolvePlanRequest } from "@/lib/export/plan-request";
import { fillSspWorkbook } from "@/lib/export/ssp-xlsx";

const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export async function GET(request: Request) {
  try {
    const { plan, project } = await resolvePlanRequest(new URL(request.url).searchParams);
    const buffer = await fillSspWorkbook(plan, {
      templatePath: path.join(process.cwd(), "data", "source", "low-risk-cloud-ssp.xlsx"),
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
