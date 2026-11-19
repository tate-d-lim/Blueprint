import { describe, expect, it } from 'vitest';
import { parseOscal } from '@/lib/catalog/parse-oscal';
import { buildCatalog } from '@/lib/export/oscal';
import { oscalValidator } from '../helpers/oscal-validate';
import { loadSeed } from '../helpers/seed';

const AT = '2026-11-19T00:00:00.000Z';

describe('the OSCAL catalog export', () => {
  it('gives a valid OSCAL 1.1.2 catalog for every seeded profile', async () => {
    const seed = await loadSeed();
    const validate = oscalValidator('catalog');
    for (const profile of seed.profiles) {
      const doc = buildCatalog({ profile, generatedAt: AT }) as { catalog: { groups: { controls: unknown[] }[] } };
      const result = validate(doc);
      expect(result.errors, profile._id).toEqual([]);
      expect(doc.catalog.groups.flatMap(g => g.controls)).toHaveLength(profile.entries.length);
    }
  });

  it('can be read back by the upload, with the same wording', async () => {
    const seed = await loadSeed();
    const profile = seed.profiles.find(p => p._id === 'low-risk-cloud')!;
    const doc = JSON.parse(JSON.stringify(buildCatalog({ profile, generatedAt: AT })));
    const release = parseOscal(doc, 'im8-low-risk-cloud-catalog.json', [{ id: 'low-risk-cloud' } as never]);
    const back = release.profiles[0].entries;
    expect(back).toHaveLength(profile.entries.length);
    for (const e of profile.entries) {
      const b = back.find(x => x.id === e.id)!;
      expect(b, e.id).toBeDefined();
      expect(b.statement).toBe(e.statement);
      expect(b.recommendations).toBe(e.recommendations);
      expect(b.title).toBe(e.title);
      expect(b.rationale).toBe(e.rationale.replace(/\s+/g, ' ').trim());
      expect(b.references.split(';').map(r => r.trim()).filter(Boolean)).toEqual(e.references.split(';').map(r => r.trim()).filter(Boolean));
    }
  });
});
