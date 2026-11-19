import Ajv, { type ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync } from 'node:fs';

/** A validator for one of the NIST OSCAL 1.1.2 JSON schemas kept in test/fixtures/oscal. */
export function oscalValidator(schema: 'component' | 'ssp' | 'catalog'): (doc: unknown) => { ok: boolean; errors: string[] } {
  const ajv = new Ajv({ strict: false, allErrors: true });
  addFormats(ajv);
  const validate: ValidateFunction = ajv.compile(JSON.parse(readFileSync(`test/fixtures/oscal/oscal_${schema}_schema.json`, 'utf8')));
  return doc => {
    const ok = validate(doc) as boolean;
    return { ok, errors: (validate.errors ?? []).slice(0, 8).map(e => `${e.instancePath} ${e.message}`) };
  };
}
