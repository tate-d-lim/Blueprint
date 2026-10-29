"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { carrySources, validateNewVersion, type DraftRow } from "@/lib/admin/new-version";
import { withDb } from "@/lib/data/db";
import { createToolVersion, getCurrentVersion } from "@/lib/data/repos/tool-versions";
import { loadPlanData } from "@/lib/data/repos/plan-data";
import { createTool } from "@/lib/data/repos/tools";
import type { Section } from "@/lib/domain/types";
import { parseAgentOscal, type AgentParseResult } from "@/lib/import/parse-agent-oscal";
import { getRole } from "@/lib/role";

export type SaveResult =
  | { ok: true; version: number }
  | { ok: false; errors: { key?: string; message: string }[] };

async function requireAdmin() {
  if ((await getRole()) !== "admin") throw new Error("Switch to admin to do this.");
}

export async function saveVersionAction(
  toolId: string,
  profileId: string,
  rows: DraftRow[],
  source: string,
  changeNote?: string,
  fromAgentFile?: string,
): Promise<SaveResult> {
  await requireAdmin();
  const saved = await withDb(async db => {
    const result = validateNewVersion(carrySources(rows, (await getCurrentVersion(db, toolId, profileId)) ?? undefined), source, {
      requireAll: !!fromAgentFile,
    });
    if (!result.ok) return result;
    return createToolVersion(db, {
      toolId,
      profileId,
      source: source.trim(),
      changeNote,
      entries: result.entries,
      createdByRole: "admin",
      ...(fromAgentFile && { importedFrom: { fileName: fromAgentFile, missingKeys: [], by: "coding-agent" as const } }),
    });
  });
  if ("ok" in saved) return saved;
  revalidatePath("/admin");
  revalidatePath("/verify");
  return { ok: true, version: saved.version };
}

const MAX_AGENT_FILE = 2 * 1024 * 1024;

/** Reads a coding agent's coverage file into editor rows. It saves nothing: the admin reviews and submits. */
export async function readAgentFileAction(toolId: string, profileId: string, formData: FormData): Promise<AgentParseResult & { fileName?: string }> {
  await requireAdmin();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0 || file.size > MAX_AGENT_FILE) return { ok: false, error: "Choose a JSON file under 2 MB." };
  const data = await withDb(loadPlanData);
  const profile = data.profiles.find(p => p._id === profileId);
  if (!profile) return { ok: false, error: "No such profile." };
  const otherIds = data.tools.map(t => t._id).filter(id => id !== toolId);
  return { ...parseAgentOscal(await file.text(), profile, toolId, otherIds), fileName: file.name };
}

export async function createToolAction(_previous: { error: string } | null, formData: FormData): Promise<{ error: string } | null> {
  await requireAdmin();
  let id: string;
  try {
    const tool = await withDb(db =>
      createTool(db, {
        name: String(formData.get("name") ?? ""),
        description: String(formData.get("description") ?? "").trim(),
        section: String(formData.get("section")) as Section,
        oscalType: formData.get("oscalType") === "software" ? "software" : "service",
        isSample: formData.get("isSample") === "on",
      }),
    );
    id = tool._id;
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not create the tool." };
  }
  revalidatePath("/admin");
  redirect(`/admin/tools/${id}`);
}
