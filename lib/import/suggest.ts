import type { CoverageValue } from '../domain/types';

const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '');

/**
 * Suggests how a Component Guide's "Who is responsible?" text maps onto our coverage values.
 * "For Agency Inputs = Not applicable" means the agency has nothing to do, so it only softens a
 * mention of the agency (shared becomes provided). Returns null when there is nothing to go on.
 */
export function suggestValue(owner: string, agencyInputs?: string): CoverageValue | null {
  const text = normalise(owner);
  if (!text) return null;
  if (text === 'agency') return 'app-builder';
  if (text === 'na' || text === 'notapplicable') return 'not-applicable';
  if (/\bagency\b/i.test(owner)) {
    return normalise(agencyInputs ?? '') === 'notapplicable' ? 'provided' : 'shared';
  }
  return 'provided';
}
