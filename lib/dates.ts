/**
 * Dates on screen. Blueprint is for CPFB in Singapore, so a time in the database (UTC) shows as a Singapore date.
 * Singapore has no summer time, so the offset is fixed.
 */
const SGT_OFFSET_MS = 8 * 60 * 60 * 1000;

function inSingapore(iso: string): string | undefined {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? undefined : new Date(t + SGT_OFFSET_MS).toISOString();
}

/** "2026-11-16T17:05:00.000Z" gives "2026-11-17". A date with no time stays the same day. */
export function dayOf(iso: string): string {
  return inSingapore(iso)?.slice(0, 10) ?? iso.slice(0, 10);
}

/** "2026-11-16T17:05:00.000Z" gives "2026-11-17 01:05 SGT". */
export function stampOf(iso: string): string {
  const local = inSingapore(iso);
  return local ? `${local.slice(0, 10)} ${local.slice(11, 16)} SGT` : iso;
}
