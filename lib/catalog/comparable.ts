/**
 * The form of a statement that is used only to decide whether two statements differ. The local files and the GovTech
 * site write the same words in different ways: parameters, links and bullet lists. All of these compare equal.
 * Never show or store this form.
 */
export function comparable(statement: string): string {
  return (
    statement
      // Quotes, dashes and spaces that look alike.
      .replace(/[‘’]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/[–—]/g, '-')
      .replace(/[  ​]/g, ' ')
      // Parameters: `[as-5_prm_1: default = 12]`, `[ insert: param, as-5_prm_1 ]`, `{{ insert: param, as-5_prm_1 }}`.
      .replace(/\[\s*insert:\s*param,\s*([\w-]+)\s*\]/gi, '[$1]')
      .replace(/\{\{\s*insert:\s*param,\s*([\w-]+)\s*\}\}/gi, '[$1]')
      .replace(/\[\s*([\w-]+)\s*:\s*default\s*=[^\]]*\]/gi, '[$1]')
      // Links: `[text](https://…)` keeps its text; the site adds "(opens in new tab)".
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/\s*\(opens in new tab\)/gi, '')
      // The site flattens a bullet list into lines; the local files keep "- " at the start of each line.
      .replace(/\n\s*(?:[-*•]\s+)/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

const PARAMETER = /\[[a-z]{2,3}-\d+_prm_\d+\]/gi;
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * True when `open` (a statement with parameter placeholders) is the same sentence as `filled`, where some of the
 * placeholders already hold their value: "Require MFA for [ac-2_prm_1] accounts" and "Require MFA for privileged accounts".
 */
function sameWithValues(open: string, filled: string): boolean {
  const ids = open.match(PARAMETER);
  if (!ids) return false;
  const parts = open.split(PARAMETER);
  // In place of a placeholder the other side has the same placeholder, or a value. Another placeholder is not a value.
  const value = '(?:(?!\\[[a-z]{2,3}-\\d+_prm_\\d+\\]).)+?';
  const pattern = parts.map((part, i) => escape(part) + (i < ids.length ? `(?:${escape(ids[i])}|${value})` : '')).join('');
  return new RegExp(`^${pattern}$`, 'i').test(filled);
}

/** Whether two statements say the same thing. A parameter with its value filled in is not a change of wording. */
export function sameWording(a: string, b: string): boolean {
  const x = comparable(a);
  const y = comparable(b);
  return x === y || sameWithValues(x, y) || sameWithValues(y, x);
}
