import { existsSync } from 'node:fs';
import path from 'node:path';
import { ANCHORS, BUILDERS, MODEL_URLS } from '@/app/hotel/models';
import { PARTS } from '@/lib/plan/hotel';

test('every part has an anchor and every piece a builder, in table order', () => {
  for (const part of PARTS) {
    expect(ANCHORS[part.id]).toHaveLength(3);
    expect(Object.keys(BUILDERS[part.id])).toEqual([...part.pieces]);
  }
});

test('every model file the builders use is in public/models/hotel', () => {
  expect(MODEL_URLS.length).toBeGreaterThan(10);
  for (const url of MODEL_URLS) expect(existsSync(path.join('public', url)), url).toBe(true);
});

test('the licence texts and the colour map are served with the models', () => {
  for (const file of ['building/License.txt', 'furniture/License.txt']) expect(existsSync(path.join('public/models/hotel', file)), file).toBe(true);
  expect(existsSync('public/models/hotel/building/Textures')).toBe(true);
});
