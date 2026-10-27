"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { carrySources, validateNewVersion, type DraftRow } from "@/lib/admin/new-version";
import { withDb } from "@/lib/data/db";
import { createToolVersion, getCurrentVersion } from "@/lib/data/repos/tool-versions";
import { createTool } from "@/lib/data/repos/tools";
import type { Section } from "@/lib/domain/types";
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
): Promise<SaveResult> {
  await requireAdmin();
  const saved = await withDb(async db => {
    const result = validateNewVersion(carrySources(rows, (await getCurrentVersion(db, toolId, profileId)) ?? undefined), source);
    if (!result.ok) return result;
    return createToolVersion(db, { toolId, profileId, source: source.trim(), changeNote, entries: result.entries, createdByRole: "admin" });
  });
  if ("ok" in saved) return saved;
  revalidatePath("/admin");
  revalidatePath("/verify");
  return { ok: true, version: saved.version };
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
