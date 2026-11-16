import type { Level } from '../../domain/types';
import type { IncomingEntry } from '../types';

/** The page does not look the way the parser expects. Nothing is applied. */
export class SiteLayoutError extends Error {
  constructor(detail?: string) {
    super('The GovTech page has a new layout. Upload a file as a replacement.');
    this.name = 'SiteLayoutError';
    this.detail = detail;
  }
  readonly detail?: string;
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', ndash: '–', mdash: '—', hellip: '…' };

function decode(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (all, body: string) => {
    if (body[0] === '#') {
      const code = body[1].toLowerCase() === 'x' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : all;
    }
    return ENTITIES[body.toLowerCase()] ?? all;
  });
}

const BLOCK = 'address|article|aside|blockquote|br|dd|details|div|dl|dt|figcaption|figure|footer|h[1-6]|header|hr|li|main|nav|ol|p|pre|section|summary|table|tbody|td|tfoot|th|thead|tr|ul';

/** The text of the `<main>` element, one line for each block. Scripts and styles are dropped, and nothing is run. */
export function mainLines(html: string): string[] {
  const start = html.search(/<main[\s>]/i);
  const end = html.lastIndexOf('</main>');
  if (start < 0 || end < start) throw new SiteLayoutError('no main element');
  const text = html
    .slice(start, end)
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|svg|noscript)\b[\s\S]*?<\/\1\s*>/gi, '')
    .replace(new RegExp(`</?(?:${BLOCK})\\b[^>]*>`, 'gi'), '\n')
    .replace(/<[^>]+>/g, '');
  return decode(text)
    .split('\n')
    .map(l => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

/** "Last updated on 10 November 2026" gives "2026-11-10". */
export function updatedOn(lines: string[]): string | undefined {
  for (const line of lines) {
    const m = /^Last updated on (\d{1,2}) ([A-Za-z]+) (\d{4})$/.exec(line);
    const month = m ? MONTHS.indexOf(m[2].toLowerCase()) : -1;
    if (m && month >= 0) return `${m[3]}-${String(month + 1).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  return undefined;
}

const CONTROL = /^([A-Za-z]{2,3})-(\d+): (.+)$/;
const FAMILY = /^([A-Z]{2,3}): .+ \((\d+)\)$/;
type Section = 'meta' | 'statement' | 'recommendations' | 'rationale' | 'parameters';

export interface ParsedPage {
  entries: IncomingEntry[];
  /** The date the page gives for itself, such as "2026-11-10". */
  updated?: string;
}

/** Reads the controls of a profile page of info.standards.tech.gov.sg. It fails loudly when the layout is not the known one. */
export function parseProfilePage(html: string): ParsedPage {
  const lines = mainLines(html);
  const marks = lines.reduce<number[]>((all, l, i) => (l === 'System Characteristics' ? [...all, i] : all), []);
  // "On this page" lists the family headings with their counts. The controls start after the second "System Characteristics".
  const first = marks.length >= 2 ? marks[1] : 0;
  const expected = new Map<string, number>();
  for (const l of lines.slice(0, first)) {
    const f = FAMILY.exec(l);
    if (f) expected.set(f[1].toLowerCase(), Number(f[2]));
  }

  const entries: IncomingEntry[] = [];
  type Draft = { id: string; title: string; level?: Level; statement: string[]; recommendations: string[]; rationale: string[] };
  let draft: Draft | undefined;
  let section: Section = 'meta';
  const close = () => {
    if (!draft) return;
    const statement = draft.statement.join('\n');
    if (!statement) throw new SiteLayoutError(`${draft.id} has no statement`);
    if (draft.level === undefined) throw new SiteLayoutError(`${draft.id} has no level`);
    if (entries.some(e => e.id === draft!.id)) throw new SiteLayoutError(`${draft.id} appears twice`);
    entries.push({
      id: draft.id,
      title: draft.title,
      level: draft.level,
      statement,
      recommendations: draft.recommendations.join('\n'),
      rationale: draft.rationale.join('\n'),
      // The pages do not list the references of a control.
      references: '',
    });
    draft = undefined;
  };

  for (const line of lines.slice(first)) {
    const c = CONTROL.exec(line);
    if (c) {
      close();
      draft = { id: `${c[1]}-${c[2]}`.toLowerCase(), title: c[3], statement: [], recommendations: [], rationale: [] };
      section = 'meta';
      continue;
    }
    if (FAMILY.test(line) || line === 'Back to') {
      close();
      continue;
    }
    if (!draft) continue;
    if (line === 'Control Statement') section = 'statement';
    else if (line === 'Control Recommendations') section = 'recommendations';
    else if (line === 'Risk Statement') section = 'rationale';
    else if (line === 'Parameters') section = 'parameters';
    else if (section === 'meta') {
      const level = /^Profile Level: (\d)$/.exec(line);
      if (level) {
        const n = Number(level[1]);
        if (n > 2) throw new SiteLayoutError(`${draft.id} has level ${n}`);
        draft.level = n as Level;
      }
    } else if (section === 'statement') draft.statement.push(line);
    else if (section === 'recommendations') draft.recommendations.push(line);
    else if (section === 'rationale') draft.rationale.push(line);
  }
  close();

  if (entries.length === 0) throw new SiteLayoutError('no controls');
  for (const [family, count] of expected) {
    const found = entries.filter(e => e.id.startsWith(`${family}-`)).length;
    if (found !== count) throw new SiteLayoutError(`${family.toUpperCase()}: the page says ${count} controls and the parser found ${found}`);
  }
  return { entries, updated: updatedOn(lines) };
}
