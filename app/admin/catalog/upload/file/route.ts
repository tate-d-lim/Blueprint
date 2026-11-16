import { CatalogError } from "@/lib/catalog/types";
import { MAX_UPLOAD_BYTES, parseReleaseFile } from "@/lib/catalog/parse-file";
import { DatabaseUnavailableError, withDb } from "@/lib/data/db";
import { createPending } from "@/lib/data/repos/catalog";
import type { Profile } from "@/lib/domain/types";
import { isTrustedRequest } from "@/lib/request-origin";
import { getRole } from "@/lib/role";

/** Reads an uploaded release file and keeps it as a pending release. It applies nothing. */
export async function POST(request: Request) {
  const fail = (error: string, status = 400) => Response.json({ ok: false, error }, { status });
  if (!isTrustedRequest(request.headers)) return fail("The upload has to start from the Catalog sheet.", 403);
  if ((await getRole()) !== "admin") return fail("Switch to admin to upload a release.", 403);

  const form = await request.formData().catch(() => undefined);
  const file = form?.get("file");
  if (!(file instanceof File) || file.size === 0) return fail("Choose a file first. Blueprint reads .xlsx and .json files.");
  if (file.size > MAX_UPLOAD_BYTES) return fail(`${file.name} is larger than 5 MB. Choose a smaller file.`);
  const profileId = String(form?.get("profileId") ?? "") || undefined;

  try {
    const id = await withDb(async db => {
      const profiles = (await db.collection("profiles").find().toArray()) as unknown as Profile[];
      const known = profiles.map(p => ({ id: p._id, title: p.title }));
      if (known.length === 0) throw new CatalogError("The database has no profiles. Reset the data at the foot of the Catalog sheet first.");
      const release = await parseReleaseFile(Buffer.from(await file.arrayBuffer()), file.name, known, profileId);
      return createPending(db, release, "Admin");
    });
    return Response.json({ ok: true, id });
  } catch (err) {
    if (err instanceof CatalogError) return fail(err.message);
    if (err instanceof DatabaseUnavailableError) return fail(err.message, 503);
    throw err;
  }
}
