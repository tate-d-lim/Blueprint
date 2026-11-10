import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

function tsxFiles(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return tsxFiles(path);
    return path.endsWith('.tsx') ? [path] : [];
  });
}

test('the light look tokens have the shape-brief values', () => {
  const css = readFileSync('app/globals.css', 'utf8');
  for (const [name, value] of [['ground', '#f6f8fa'], ['ink', '#1c2b3a'], ['ink-soft', '#4b5c70'], ['hotel-line', '#5f86b3'], ['hotel-fill', '#eef3f9'], ['hotel-light', '#ffc879'], ['redline', '#b8322a']])
    expect(css).toMatch(new RegExp(`--color-${name}:\\s*${value}`, 'i'));
  expect(css).toMatch(/Archivo Variable/);
  expect(css).not.toMatch(/Barlow|drafting-grid|hatch-|revision-cloud|--shadow-/);
});

test('no component uses a removed token or utility', () => {
  const banned = /\b(bg-blueprint|text-blueprint|border-blueprint|blueprint-wash|blueprint-deep|bg-table|drafting-grid|hatch-built|hatch-progress|revision-cloud|shadow-dialog|shadow-dock|font-display|rounded-xs)\b/;
  const hits = tsxFiles('app').filter(f => banned.test(readFileSync(f, 'utf8')));
  expect(hits).toEqual([]);
});
