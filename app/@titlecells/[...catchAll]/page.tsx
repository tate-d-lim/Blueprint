/**
 * Matches every other sheet, so the project's cells leave the title block when you move to another page.
 * (On a client-side move, an unmatched slot would otherwise keep showing what it showed last.)
 */
export default function NoCells() {
  return null;
}
