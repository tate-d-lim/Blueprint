import { readFileSync } from 'node:fs';

test('MongoDB is published on this machine only, because it has no password', () => {
  const compose = readFileSync('docker-compose.yml', 'utf8');
  expect(compose).toContain('"127.0.0.1:27017:27017"');
  expect(compose).not.toMatch(/-\s*"?27017:27017/);
});

test('the app itself listens on this machine only', () => {
  const scripts = JSON.parse(readFileSync('package.json', 'utf8')).scripts;
  expect(scripts.dev).toContain('-H 127.0.0.1');
  expect(scripts.start).toContain('-H 127.0.0.1');
});
