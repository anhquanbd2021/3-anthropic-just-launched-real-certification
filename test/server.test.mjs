import test from 'node:test';
import assert from 'node:assert/strict';
import { startProduction } from '../app/server.js';

async function withServer(fn) {
  const { server, close } = await startProduction({ port: 0 });
  const base = `http://127.0.0.1:${server.address().port}`;
  try { await fn(base); } finally { await close(); }
}

test('health and version endpoints answer correctly', async () => {
  await withServer(async base => {
    const health = await fetch(`${base}/health`);
    assert.equal(health.status, 200);
    assert.equal(await health.text(), 'ok');

    const version = await fetch(`${base}/version`);
    assert.equal(version.status, 200);
    const body = await version.json();
    assert.equal(body.name, 'cert-blueprint-demo');
  });
});

test('static allowlist serves the lab and blocks everything else', async () => {
  await withServer(async base => {
    for (const path of ['/', '/guide.html', '/styles.css', '/app.js', '/blueprint.mjs', '/questions.mjs']) {
      const res = await fetch(`${base}${path}`);
      assert.equal(res.status, 200, path);
      assert.ok(res.headers.get('content-security-policy'), 'CSP header present');
    }
    for (const path of ['/package.json', '/app/server.js', '/examples/sample-assessment.json', '/test/blueprint.test.mjs']) {
      const res = await fetch(`${base}${path}`);
      assert.equal(res.status, 404, path);
    }
    const post = await fetch(`${base}/`, { method: 'POST' });
    assert.equal(post.status, 404);
  });
});
