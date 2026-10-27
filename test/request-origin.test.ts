import { isTrustedRequest } from '@/lib/request-origin';

const headers = (h: Record<string, string>) => new Headers(h);

test('requests from tools like curl and Playwright have no browser headers and are allowed', () => {
  expect(isTrustedRequest(headers({ host: 'localhost:3000' }))).toBe(true);
});

test('a form on our own pages is allowed', () => {
  expect(isTrustedRequest(headers({ host: 'localhost:3000', 'sec-fetch-site': 'same-origin', origin: 'http://localhost:3000' }))).toBe(true);
});

test('a page on another site posting to us is refused', () => {
  expect(isTrustedRequest(headers({ host: 'localhost:3000', 'sec-fetch-site': 'cross-site', origin: 'https://evil.example' }))).toBe(false);
  expect(isTrustedRequest(headers({ host: 'localhost:3000', 'sec-fetch-site': 'same-site' }))).toBe(false);
});

test('without Sec-Fetch-Site, an Origin that is not our host is refused', () => {
  expect(isTrustedRequest(headers({ host: 'localhost:3000', origin: 'https://evil.example' }))).toBe(false);
  expect(isTrustedRequest(headers({ host: 'localhost:3000', origin: 'http://localhost:3000' }))).toBe(true);
});
