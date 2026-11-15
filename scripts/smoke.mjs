#!/usr/bin/env node
// Post-deploy smoke test: `npm run test:smoke -- <webUrl> <apiUrl>`
//
// <apiUrl> is the public API base the browser uses, e.g.
// https://brew.example.com/api (Caddy strips the /api prefix).
// Exits non-zero on the first response that is not the expected shape, so the
// GitHub deploy job fails instead of reporting a broken release.

const [webUrl, apiUrl] = process.argv.slice(2);

if (!webUrl || !apiUrl) {
  console.error('usage: npm run test:smoke -- <webUrl> <apiUrl>');
  process.exit(2);
}

const strip = (value) => value.replace(/\/+$/, '');

for (const [name, value] of Object.entries({ webUrl, apiUrl })) {
  if (!/^https?:\/\/[^/]+/i.test(value)) {
    console.error(`smoke: ${name} must start with http:// or https:// (got "${value}")`);
    process.exit(2);
  }
}

const web = strip(webUrl);
const api = strip(apiUrl);

const checks = [
  {
    name: 'api health',
    url: `${api}/health`,
    expect: (body) => body?.status === 'ok' || 'expected {"status":"ok"}',
  },
  {
    name: 'api catalog',
    url: `${api}/products`,
    expect: (body) => (Array.isArray(body) && body.length > 0) || 'expected a non-empty product array',
  },
  {
    name: 'web home',
    url: `${web}/`,
    raw: true,
  },
  {
    name: 'web menu',
    url: `${web}/menu`,
    raw: true,
  },
];

const failures = [];

for (const check of checks) {
  const started = Date.now();
  try {
    const response = await fetch(check.url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
      headers: { 'user-agent': 'brewlite-smoke/1.0' },
    });
    if (!response.ok) {
      failures.push(`${check.name}: HTTP ${response.status} from ${check.url}`);
      console.error(`FAIL ${check.name} (HTTP ${response.status})`);
      continue;
    }
    if (check.raw) {
      const text = await response.text();
      if (!text.includes('<html')) {
        failures.push(`${check.name}: response is not HTML (${check.url})`);
        console.error(`FAIL ${check.name} (not HTML)`);
        continue;
      }
    } else {
      const body = await response.json().catch(() => undefined);
      const result = check.expect(body);
      if (result !== true) {
        failures.push(`${check.name}: ${result}`);
        console.error(`FAIL ${check.name} (${result})`);
        continue;
      }
    }
    console.log(`ok   ${check.name} (${Date.now() - started}ms)`);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    failures.push(`${check.name}: ${reason}`);
    console.error(`FAIL ${check.name} (${reason})`);
  }
}

if (failures.length) {
  console.error(`\nsmoke: ${failures.length}/${checks.length} checks failed`);
  process.exit(1);
}

console.log(`\nsmoke: ${checks.length}/${checks.length} checks passed`);
