export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** The OSCAL file: `{project}-ssp.json`, or plain `ssp.json` when there is no project (or its name has no letters or digits). */
export function oscalFileName(kind: 'ssp' | 'component-definition', projectName?: string): string {
  const slug = projectName ? slugify(projectName) : '';
  return slug ? `${slug}-${kind}.json` : `${kind}.json`;
}

/** `{profile}-ssp.xlsx`, or with the project's slug when there is one. */
export function sspFileName(profileId: string, projectName?: string): string {
  const slug = projectName ? slugify(projectName) : '';
  return slug ? `${profileId}-ssp-${slug}.xlsx` : `${profileId}-ssp.xlsx`;
}
