import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { setServerDb } from '../api-helpers';
import { instalarFirestoreDeTeste, desinstalarFirestoreDeTeste } from './firestore-fixture';
import { GET } from '../health/route';

describe('GET /api/health', () => {
  afterEach(() => desinstalarFirestoreDeTeste());

  it('responde ok quando o Firestore está acessível', async () => {
    instalarFirestoreDeTeste();
    const res = await GET();
    assert.equal(res.status, 200);
    assert.equal((await res.json()).status, 'ok');
  });

  it('responde 503 sem expor detalhes quando o Firestore falha', async () => {
    setServerDb({
      collection: () => ({ doc: () => ({ get: async () => { throw new Error('credencial inválida'); } }) }),
    });
    const original = console.error;
    console.error = () => {};
    try {
      const res = await GET();
      assert.equal(res.status, 503);
      const body = await res.json();
      assert.equal(body.status, 'indisponivel');
      assert.ok(body.erroId);
      assert.ok(!JSON.stringify(body).includes('credencial'));
    } finally {
      console.error = original;
    }
  });
});
