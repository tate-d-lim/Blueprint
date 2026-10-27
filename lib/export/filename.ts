export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** `low-risk-cloud-ssp.xlsx`, or with the project's slug when there is one. */
export function sspFileName(projectName?: string): string {
  const slug = projectName ? slugify(projectName) : '';
  return slug ? `low-risk-cloud-ssp-${slug}.xlsx` : 'low-risk-cloud-ssp.xlsx';
}
