export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** `{profile}-ssp.xlsx`, or with the project's slug when there is one. */
export function sspFileName(profileId: string, projectName?: string): string {
  const slug = projectName ? slugify(projectName) : '';
  return slug ? `${profileId}-ssp-${slug}.xlsx` : `${profileId}-ssp.xlsx`;
}
