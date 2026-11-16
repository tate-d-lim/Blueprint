"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, ButtonLink } from "@/app/ui/button";
import { Field, selectClass } from "@/app/ui/field";
import { Note } from "@/app/ui/note";
import { Panel } from "@/app/ui/panel";

const MAX_BYTES = 5 * 1024 * 1024;
const FROM_FILE = "";

export function UploadForm({ profiles }: { profiles: { id: string; title: string }[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [file, setFile] = useState<File | null>(null);
  const [profileId, setProfileId] = useState(FROM_FILE);
  const [error, setError] = useState<string>();

  const tooBig = !!file && file.size > MAX_BYTES;

  const submit = () =>
    start(async () => {
      setError(undefined);
      if (!file) return;
      const form = new FormData();
      form.set("file", file);
      form.set("profileId", profileId);
      try {
        const res = await fetch("/admin/catalog/upload/file", { method: "POST", body: form });
        const body = (await res.json()) as { ok: boolean; id?: string; error?: string };
        if (body.ok && body.id) router.push(`/admin/catalog/review/${body.id}`);
        else setError(body.error ?? "Blueprint could not read the file. Try again.");
      } catch {
        setError("The upload did not reach Blueprint. Check that the server is running, then try again.");
      }
    });

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={e => {
        e.preventDefault();
        submit();
      }}
    >
      <Panel title="The file">
        <div className="flex flex-col gap-5">
          <Field
            label="Release file (.xlsx or .json, up to 5 MB)"
            hint="Blueprint reads an .xlsx file with a sheet named ssp or catalog, and an OSCAL catalog in a .json file."
            error={tooBig ? `${file?.name} is larger than 5 MB. Choose a smaller file.` : undefined}
          >
            {props => (
              <input
                {...props}
                type="file"
                accept=".xlsx,.json"
                onChange={e => {
                  setFile(e.target.files?.[0] ?? null);
                  setError(undefined);
                }}
                className="text-body file:mr-4 file:h-10 file:cursor-pointer file:rounded-sm file:border file:border-rule-strong file:bg-paper file:px-4 file:font-semibold file:text-ink hover:file:bg-ground"
              />
            )}
          </Field>
          <Field
            label="Profile the file is for"
            hint="A file with a sheet named ssp holds one profile and does not say which. Pick it here. Other files name their profiles."
          >
            {props => (
              <select {...props} value={profileId} onChange={e => setProfileId(e.target.value)} className={`${selectClass} max-w-[360px]`}>
                <option value={FROM_FILE}>Read it from the file</option>
                {profiles.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </div>
      </Panel>

      {error && <Note tone="error" title="Blueprint could not use this file.">{error}</Note>}

      <div className="flex gap-3">
        <Button type="submit" disabled={!file || tooBig || pending}>
          {pending ? "Reading the file…" : "Check the file"}
        </Button>
        <ButtonLink href="/admin/catalog" variant="secondary">
          Back to the catalog
        </ButtonLink>
      </div>
    </form>
  );
}
