"use server";

import { revalidatePath } from "next/cache";
import { applyRelease } from "@/lib/catalog/apply";
import { SOURCES, autoCheckEnabled, checkIsDue, mongoStore, runCheck, runExclusive, storeBaseline } from "@/lib/catalog/check";
import { describeCheck } from "@/lib/catalog/format";
import { CatalogError } from "@/lib/catalog/types";
import { withDb } from "@/lib/data/db";
import { deletePending, getPending, savePlainText } from "@/lib/data/repos/catalog";
import { getRole } from "@/lib/role";

export type Result = { ok: true; message?: string; id?: string } | { ok: false; error: string };

async function requireAdmin(): Promise<string | undefined> {
  return (await getRole()) === "admin" ? undefined : "Switch to admin to do this.";
}

/** Every page that reads the catalog: builders, tool owners and admins. */
const refreshEverywhere = () => revalidatePath("/", "layout");

/** The button "Check GovTech now". It always runs, and it reads the pages again even when their dates did not change. */
export async function checkNowAction(): Promise<Result> {
  const denied = await requireAdmin();
  if (denied) return { ok: false, error: denied };
  const source = SOURCES[0];
  const check = await withDb(db => runExclusive(() => runCheck(mongoStore(db), source, "Admin", undefined, { full: true })));
  revalidatePath("/admin/catalog");
  return { ok: true, message: describeCheck(check), id: check.pendingId };
}

/** The check that starts by itself after the page shows. It does nothing when it is switched off or the last check is recent. */
export async function autoCheckAction(): Promise<Result> {
  if (!autoCheckEnabled()) return { ok: true };
  const denied = await requireAdmin();
  if (denied) return { ok: false, error: denied };
  const source = SOURCES[0];
  const ran = await withDb(async db => {
    if (!(await checkIsDue(mongoStore(db), source.id))) return false;
    await runExclusive(() => runCheck(mongoStore(db), source, "Blueprint"));
    return true;
  });
  if (ran) revalidatePath("/admin/catalog");
  return { ok: true };
}

export async function savePlainAction(profileId: string, controlId: string, input: { title: string; task: string; why: string }): Promise<Result> {
  const denied = await requireAdmin();
  if (denied) return { ok: false, error: denied };
  try {
    await withDb(db => savePlainText(db, profileId, controlId, input));
  } catch (err) {
    if (err instanceof CatalogError) return { ok: false, error: err.message };
    throw err;
  }
  refreshEverywhere();
  return { ok: true };
}

export async function applyReleaseAction(pendingId: string): Promise<Result> {
  const denied = await requireAdmin();
  if (denied) return { ok: false, error: denied };
  let result: Result;
  try {
    result = await withDb(async (db): Promise<Result> => {
      const waiting = await getPending(db, pendingId);
      if (!waiting) return { ok: false, error: "This release is no longer waiting. Upload the file again, or check GovTech." };
      const applied = await applyRelease(db, waiting.incoming, "Admin");
      if (!applied.applied) return { ok: false, error: applied.message };
      await storeBaseline(mongoStore(db), waiting);
      await deletePending(db, pendingId);
      return { ok: true, id: applied.release._id };
    });
  } catch (err) {
    if (err instanceof CatalogError) return { ok: false, error: err.message };
    throw err;
  }
  if (result.ok) refreshEverywhere();
  return result;
}

export async function discardReleaseAction(pendingId: string): Promise<Result> {
  const denied = await requireAdmin();
  if (denied) return { ok: false, error: denied };
  await withDb(async db => {
    // A discarded GovTech release must not come back at each automatic check.
    const waiting = await getPending(db, pendingId);
    if (waiting) await storeBaseline(mongoStore(db), waiting);
    await deletePending(db, pendingId);
  });
  revalidatePath("/admin/catalog");
  return { ok: true };
}
