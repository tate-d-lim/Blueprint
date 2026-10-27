/** Official statements carry inline placeholders; show each one as its default value. */
export function resolveParameters(text: string): string {
  return text
    .replace(/\[[^\]]*?:\s*default\s*=\s*([^\]]*)\]/g, (_, value: string) => value.trim())
    .replace(/\[\s*insert:[^\]]*\]/g, '(to be set by your organisation)');
}
