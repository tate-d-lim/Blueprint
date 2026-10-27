import { readFileSync } from 'node:fs';
import type { PlainText } from '@/lib/domain/types';
import { loadSeed } from '../helpers/seed';

type PlainFile = Record<string, PlainText>;
const read = (file: string): PlainFile => JSON.parse(readFileSync(`data/plain-language/${file}.json`, 'utf8'));

const REQUIRES_QUESTION: Record<string, string[]> = {
  'low-risk-cloud': ['pm-1', 'pm-2', 'pm-3', 'pm-4', 'pm-5', 'pm-6', 'is-11', 'is-14', 'is-15'],
  'generative-ai': ['ga-1', 'ga-2', 'ga-3', 'ga-4', 'ga-5', 'ga-6', 'ga-7', 'ga-8'],
};
const BANNED = /\b(IM8|SSP|OSCAL|controls?|agency|agencies)\b/i;

describe.each(['low-risk-cloud', 'generative-ai'])('%s plain language', profileId => {
  const file = read(profileId);

  test('has an entry for every requirement in the profile, and nothing else', async () => {
    const profile = (await loadSeed()).profiles.find(p => p._id === profileId)!;
    expect(Object.keys(file).sort()).toEqual(profile.entries.map(e => e.id).sort());
  });

  test('every entry has a short title, a task and a reason', () => {
    for (const [id, p] of Object.entries(file)) {
      expect(p.title, `${id} title`).toBeTruthy();
      expect(p.title.length, `${id} title length`).toBeLessThanOrEqual(60);
      expect(p.task.trim().length, `${id} task`).toBeGreaterThan(10);
      expect(p.why.trim().length, `${id} why`).toBeGreaterThan(10);
    }
  });

  test('the requirements that need a person have a question ending in "?"', () => {
    for (const id of REQUIRES_QUESTION[profileId]) {
      expect(file[id].question, `${id} question`).toMatch(/\?$/);
    }
  });

  test('builder language only: no IM8, SSP, OSCAL, "control" or "agency"', () => {
    for (const [id, p] of Object.entries(file)) {
      for (const [field, text] of Object.entries(p)) expect(text, `${id}.${field}`).not.toMatch(BANNED);
    }
  });
});
