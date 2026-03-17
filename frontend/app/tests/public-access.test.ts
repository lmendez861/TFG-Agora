import assert from 'node:assert/strict';
import test from 'node:test';
import {
  fetchPublicAccessSnapshot,
  startPublicAccess,
  stopPublicAccess,
} from '../src/services/api.ts';
import type { PublicAccessSnapshot } from '../src/types.ts';

const originalFetch = globalThis.fetch;

function buildSnapshot(status: PublicAccessSnapshot['status']): PublicAccessSnapshot {
  return {
    status,
    detail: `estado-${status}`,
    publicUrl: status === 'active' ? 'https://demo.trycloudflare.com' : null,
    targetUrl: 'http://127.0.0.1:8000',
    startedAt: status === 'active' ? '2026-03-16T10:00:00+00:00' : null,
    processId: status === 'active' ? 3210 : null,
  };
}

test('fetchPublicAccessSnapshot consulta el endpoint de estado', async () => {
  const expected = buildSnapshot('inactive');
  const calls: Array<{ url: string; method: string }> = [];

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({
      url: String(input),
      method: init?.method ?? 'GET',
    });

    return new Response(JSON.stringify(expected), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as typeof fetch;

  try {
    assert.deepEqual(await fetchPublicAccessSnapshot(), expected);
    assert.equal(calls.length, 1);
    assert.match(calls[0].url, /\/api\/public-access$/);
    assert.equal(calls[0].method, 'GET');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('startPublicAccess y stopPublicAccess usan POST sobre sus endpoints', async () => {
  const responses = [buildSnapshot('starting'), buildSnapshot('inactive')];
  const calls: Array<{ url: string; method: string }> = [];

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({
      url: String(input),
      method: init?.method ?? 'GET',
    });

    const payload = responses.shift() ?? buildSnapshot('inactive');

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as typeof fetch;

  try {
    assert.deepEqual(await startPublicAccess(), buildSnapshot('starting'));
    assert.deepEqual(await stopPublicAccess(), buildSnapshot('inactive'));
    assert.equal(calls.length, 2);
    assert.match(calls[0].url, /\/api\/public-access\/start$/);
    assert.equal(calls[0].method, 'POST');
    assert.match(calls[1].url, /\/api\/public-access\/stop$/);
    assert.equal(calls[1].method, 'POST');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
