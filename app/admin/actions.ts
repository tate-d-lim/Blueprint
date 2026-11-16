"use server";

import { revalidatePath } from "next/cache";
import { withDb } from "@/lib/data/db";
import {
  DecidedVersionError,
  SendBackNoteError,
  StaleVersionError,
  approveCurrentVersion,
  sendBackCurrentVersion,
} from "@/lib/data/repos/tool-versions";
import { getRole } from "@/lib/role";

export type DecisionResult = { error?: string };

const refresh = () => {
  revalidatePath("/admin");
  revalidatePath("/tool-owner");
};

/** The message for a decision that the rules refuse. Any other error is not ours to explain. */
function explain(err: unknown): string | undefined {
  if (err instanceof StaleVersionError) return `${err.message}. Reload to see the latest version.`;
  if (err instanceof DecidedVersionError || err instanceof SendBackNoteError) return err.message;
  return undefined;
}

export async function approveAction(versionId: string): Promise<DecisionResult> {
  if ((await getRole()) !== "admin") return { error: "Switch to admin to approve." };
  try {
    await withDb(db => approveCurrentVersion(db, versionId, "Admin"));
  } catch (err) {
    const message = explain(err);
    if (message) return { error: message };
    throw err;
  }
  refresh();
  return {};
}

export async function sendBackAction(versionId: string, note: string): Promise<DecisionResult> {
  if ((await getRole()) !== "admin") return { error: "Switch to admin to send a version back." };
  try {
    await withDb(db => sendBackCurrentVersion(db, versionId, "Admin", note));
  } catch (err) {
    const message = explain(err);
    if (message) return { error: message };
    throw err;
  }
  refresh();
  return {};
}
