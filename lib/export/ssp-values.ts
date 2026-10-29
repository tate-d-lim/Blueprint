import type { TaskStatus } from '../domain/types';
import type { Claim, PlanItem } from '../plan/engine';
import { STATUS_LABEL } from '../plan/labels';
import { itemVerification } from '../plan/verification';

export { STATUS_LABEL };

export type Implemented = 'Y' | 'N' | 'N/A' | 'Partial' | '';

const BLANK = { implemented: '' as Implemented, explanation: '' };
const NOT_YET_VERIFIED = '[Not yet verified] ';

/** Ends a sentence with exactly one full stop (or keeps its own ! or ?). */
const end = (text: string): string => {
  const t = text.trim();
  return /[.!?]$/.test(t) ? t : `${t}.`;
};

const unverified = (claims: Pick<Claim, 'verification'>[]) =>
  claims.some(c => c.verification === 'not-yet-verified') ? NOT_YET_VERIFIED : '';

const taskStatus = (item: PlanItem): { status: TaskStatus; note?: string } =>
  item.status && 'status' in item.status ? item.status : { status: 'todo' };

const withNote = (note?: string) => (note?.trim() ? ` ${end(note)}` : '');

/** One text per claim, joined with "; " (each but the last loses its full stop). */
function perClaim(claims: Claim[], lead: (c: Claim) => string): string {
  const texts = claims.map(c => {
    const body = c.explanation?.trim() ? `${lead(c)}: ${c.explanation.trim()}` : lead(c);
    const source = c.source.trim() ? ` Source: ${end(c.source)}` : '';
    return `${unverified([c])}${end(body)}${source}`;
  });
  return texts.map((t, i) => (i < texts.length - 1 ? t.replace(/\.$/, '') : t)).join('; ');
}

/** The two cells a plan item fills in on the security review spreadsheet. */
export function sspValues(item: PlanItem): { implemented: Implemented; explanation: string } {
  switch (item.placement) {
    case 'provided':
      return { implemented: 'Y', explanation: perClaim(item.decisive, c => `Provided by ${c.toolName}`) };

    case 'not-applicable':
      return { implemented: 'N/A', explanation: perClaim(item.decisive, c => `Not applicable when using ${c.toolName}`) };

    case 'shared': {
      const { status, note } = taskStatus(item);
      const toolPart = item.decisive
        .map(c => (c.explanation?.trim() ? `${c.toolName}: ${c.explanation.trim()}` : `${c.toolName} handles its part`))
        .join('; ');
      const part = item.decisive.map(c => c.builderPart?.trim()).find(Boolean) ?? item.plain?.task ?? item.title;
      const sources = [...new Set(item.decisive.map(c => c.source.trim()).filter(Boolean))].join('; ');
      const text =
        `${unverified(item.decisive)}Shared. ${end(toolPart)} App builder: ${end(part)} ` +
        `Status: ${STATUS_LABEL[status]} (self-declared).${withNote(note)}` +
        (sources ? ` Source: ${end(sources)}` : '');
      return { implemented: status === 'done' ? 'Y' : 'Partial', explanation: text };
    }

    case 'app-builder':
    case 'default-builder':
    case 'answered-applies': {
      const { status, note } = taskStatus(item);
      const tips = [...new Set(item.decisive.map(c => c.builderPart?.trim()).filter((t): t is string => Boolean(t)))];
      const prefix = itemVerification(item) === 'not-yet-verified' ? NOT_YET_VERIFIED : '';
      const text =
        `${prefix}App builder's responsibility.${tips.map(t => ` ${end(t)}`).join('')} ` +
        `Status: ${STATUS_LABEL[status]} (self-declared).${withNote(note)}`;
      return { implemented: status === 'done' ? 'Y' : status === 'in-progress' ? 'Partial' : 'N', explanation: text };
    }

    case 'answered-not-applicable': {
      const reason = item.status && 'reason' in item.status ? item.status.reason : '';
      return { implemented: 'N/A', explanation: `Does not apply (self-declared): ${end(reason)}` };
    }

    case 'not-for-app':
      return { implemented: 'N/A', explanation: `Does not apply to this app: ${end(item.reason)}` };

    case 'open':
    case 'redirect':
    case 'conflict':
      return { ...BLANK };
  }
}
