"use server";

import { revalidatePath } from "next/cache";
import { withDb } from "@/lib/data/db";
import { StaleVersionError, approveCurrentVersion } from "@/lib/data/repos/tool-versions";
import { getRole } from "@/lib/role";

export async function approveAction(versionId: string): Promise<{ error?: string }> {
  if ((await getRole()) !== "admin") return { error: "Switch to admin to approve." };
  try {
    await withDb(db => approveCurrentVersion(db, versionId, "Admin"));
  } catch (err) {
    if (err instanceof StaleVersionError) return { error: `${err.message}. Reload to see the latest version.` };
    throw err;
  }
  revalidatePath("/admin");
  revalidatePath("/tool-owner");
  return {};
}
