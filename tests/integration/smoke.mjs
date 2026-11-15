import assert from 'node:assert/strict';

const web = new URL(process.argv[2] ?? 'http://localhost:3000');
const api = (process.argv[3] ?? 'http://localhost:3001').replace(/\/+$/, '');
const options = { signal: AbortSignal.timeout(20_000) };

const [homeResponse, menuResponse, healthResponse, productsResponse] = await Promise.all([
  fetch(web, options),
  fetch(new URL('/menu', web), options),
  fetch(`${api}/health`, options),
  fetch(`${api}/products`, {
    headers: { Origin: web.origin },
    signal: AbortSignal.timeout(20_000),
  }),
]);

assert.equal(homeResponse.status, 200, 'Web home page must be reachable');
assert.match(homeResponse.headers.get('content-type') ?? '', /text\/html/i, 'Home page must return HTML');
const homeHtml = await homeResponse.text();
assert.match(homeHtml, /<html[\s>]/i, 'Home response must contain an HTML document');

assert.equal(menuResponse.status, 200, 'Menu page must be reachable');
assert.match(menuResponse.headers.get('content-type') ?? '', /text\/html/i, 'Menu page must return HTML');
const menuHtml = await menuResponse.text();
assert.match(menuHtml, /<html[\s>]/i, 'Menu response must contain an HTML document');

assert.equal(healthResponse.status, 200, 'API and PostgreSQL must be ready');
assert.deepEqual(await healthResponse.json(), { status: 'ok' });
assert.equal(productsResponse.status, 200, 'Catalog endpoint must be reachable');
assert.equal(productsResponse.headers.get('access-control-allow-origin'), web.origin);
const catalog = await productsResponse.json();
assert.ok(Array.isArray(catalog) && catalog.length > 0, 'Catalog must contain products');

console.log(`Smoke test passed: web home, /menu HTML, API/PostgreSQL health, CORS and ${catalog.length} catalog products.`);
