import { isOscalCatalog, parseOscal } from './parse-oscal';
import { parseXlsx, type KnownProfile } from './parse-xlsx';
import { CatalogError, LAYOUT_HELP, type IncomingRelease } from './types';

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/** Reads an uploaded release file: .xlsx in either layout, or an OSCAL catalog in .json. */
export async function parseReleaseFile(
  buffer: Buffer,
  fileName: string,
  profiles: KnownProfile[],
  profileId?: string,
): Promise<IncomingRelease> {
  if (buffer.length === 0) throw new CatalogError(`${fileName} is empty. ${LAYOUT_HELP}`);
  if (buffer.length > MAX_UPLOAD_BYTES) throw new CatalogError(`${fileName} is larger than 5 MB. ${LAYOUT_HELP}`);
  const isZip = buffer[0] === 0x50 && buffer[1] === 0x4b; // "PK": an .xlsx file is a zip archive.
  if (isZip) return parseXlsx(buffer, { fileName, profiles, profileId });
  let json: unknown;
  try {
    json = JSON.parse(buffer.toString('utf8'));
  } catch {
    throw new CatalogError(`Blueprint cannot read ${fileName}. ${LAYOUT_HELP}`);
  }
  if (!isOscalCatalog(json)) throw new CatalogError(`${fileName} is JSON, but not an OSCAL catalog. ${LAYOUT_HELP}`);
  return parseOscal(json, fileName, profiles);
}
