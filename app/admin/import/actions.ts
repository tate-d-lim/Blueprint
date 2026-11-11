"use server";

import { revalidatePath } from "next/cache";
import { withDb } from "@/lib/data/db";
import { createToolVersion } from "@/lib/data/repos/tool-versions";
import { createTool } from "@/lib/data/repos/tools";
import type { CoverageValue, Profile, Section } from "@/lib/domain/types";
import { GuideParseError, parseGuide } from "@/lib/import/parse-guide";
import { buildImportEntries, previewImport, type ImportPreview } from "@/lib/import/plan-import";
import { getRole } from "@/lib/role";

export type PreviewResult =
  | { ok: true; fileName: string; sheetName: string; rowCount: number; profileTitle: string; preview: ImportPreview }
  | { ok: false; error: string };

export type CreateResult = { ok: true; toolId: string; version: number } | { ok: false; error: string };

async function requireAdmin() {
  if ((await getRole()) !== "admin") throw new Error("Switch to admin to do this.");
}

async function readUpload(formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new GuideParseError("not-a-workbook", "Choose a Component Guide (.xlsx) first.");
  return parseGuide(Buffer.from(await file.arrayBuffer()), file.name);
}

async function profileOf(formData: FormData): Promise<Profile> {
  const id = String(formData.get("profileId") ?? "");
  const profile = await withDb(async db => (await db.collection<Profile>("profiles").findOne({ _id: id })) ?? undefined);
  if (!profile) throw new Error("Pick a profile.");
  return profile;
}

const message = (err: unknown) => (err instanceof Error ? err.message : "The file could not be read. Check it is a Component Guide (.xlsx), then try again.");

export async function previewImportAction(formData: FormData): Promise<PreviewResult> {
  try {
    await requireAdmin();
    const guide = await readUpload(formData);
    const profile = await profileOf(formData);
    return {
      ok: true,
      fileName: guide.fileName,
      sheetName: guide.sheetName,
      rowCount: guide.rows.length,
      profileTitle: profile.title,
      preview: previewImport(guide, profile),
    };
  } catch (err) {
    return { ok: false, error: message(err) };
  }
}

export async function createImportAction(formData: FormData): Promise<CreateResult> {
  try {
    await requireAdmin();
    const guide = await readUpload(formData);
    const profile = await profileOf(formData);
    const preview = previewImport(guide, profile);
    if (preview.unknownIds.length) throw new Error(`This guide does not match ${profile.title}.`);
    const mapping = JSON.parse(String(formData.get("mapping") ?? "{}")) as Record<string, CoverageValue>;
    const entries = buildImportEntries(guide, profile, mapping);
    const source = String(formData.get("source") ?? "").trim() || `Component Guide: ${guide.fileName}`;
    const changeNote = String(formData.get("changeNote") ?? "").trim() || undefined;

    const choice = String(formData.get("tool") ?? "");
    const saved = await withDb(async db => {
      const toolId =
        choice === "new"
          ? (
              await createTool(db, {
                name: String(formData.get("newToolName") ?? ""),
                description: "",
                section: String(formData.get("newToolSection") ?? "cpf") as Section,
                oscalType: "service",
                isSample: false,
              })
            )._id
          : choice;
      return createToolVersion(db, {
        toolId,
        profileId: profile._id,
        source,
        changeNote,
        entries,
        writtenAgainst: preview.writtenAgainst,
        createdByRole: "admin",
        importedFrom: { fileName: guide.fileName, missingKeys: preview.missingKeys },
      });
    });
    revalidatePath("/admin");
    revalidatePath("/verify");
    return { ok: true, toolId: saved.toolId, version: saved.version };
  } catch (err) {
    return { ok: false, error: message(err) };
  }
}
