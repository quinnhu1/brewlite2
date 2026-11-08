import assert from 'node:assert/strict';

const web = new URL(process.argv[2] ?? 'http://localhost:3000');
const api = (process.argv[3] ?? 'http://localhost:3001').replace(/\/+$/, '');

const [webResponse, health, products] = await Promise.all([
  fetch(web, { signal: AbortSignal.timeout(20_000) }),
  fetch(`${api}/health`, { signal: AbortSignal.timeout(20_000) }),
  fetch(`${api}/products`, {
    headers: { Origin: web.origin },
    signal: AbortSignal.timeout(20_000),
  }),
]);

assert.equal(webResponse.status, 200, 'Web must be reachable');
assert.equal(health.status, 200, 'API and PostgreSQL must be ready');
assert.equal((await health.json()).status, 'ok');
assert.equal(products.status, 200, 'Catalog endpoint must be reachable');
assert.equal(products.headers.get('access-control-allow-origin'), web.origin);
const catalog = await products.json();
assert.ok(Array.isArray(catalog) && catalog.length > 0, 'Catalog must contain products');
console.log(`Smoke test passed for web, API, PostgreSQL and ${catalog.length} products.`);
