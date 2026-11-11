export const SAVE_FAILED = "Your last change was not saved. Check the server is running, then reload the page.";

export type SaveOutcome = { ok: true } | { ok: false; error: string };

/** Runs a background save. Returns what to tell the builder, or null when it worked. */
export async function runSave(action: () => Promise<SaveOutcome>): Promise<string | null> {
  try {
    const outcome = await action();
    return outcome.ok ? null : outcome.error;
  } catch {
    // The request itself failed: the server is down, or an open tab calls an action a rebuild removed.
    return SAVE_FAILED;
  }
}
