import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { montarCorpoAlerta, notificarErroInterno } from '../alerta-erro';

const alerta = { erroId: 'ab12cd34', quando: '2026-11-26T12:00:00.000Z', tipo: 'Error', mensagem: 'falha' };

describe('Alerta de erro interno', () => {
  const fetchOriginal = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = fetchOriginal;
    delete process.env.ERROR_ALERT_WEBHOOK_URL;
  });

  it('monta texto legível para Slack e Discord e corta mensagens longas', () => {
    const corpo = montarCorpoAlerta({ ...alerta, mensagem: 'x'.repeat(1000) }, 'production');
    assert.ok(String(corpo.text).includes('ab12cd34'));
    assert.equal(corpo.text, corpo.content);
    assert.ok(String(corpo.mensagem).length <= 301);
    assert.equal('stack' in corpo, false);
  });

  it('não envia nada quando o webhook não está configurado', () => {
    let chamadas = 0;
    globalThis.fetch = (async () => {
      chamadas++;
      return new Response(null);
    }) as typeof fetch;
    notificarErroInterno(alerta);
    assert.equal(chamadas, 0);
  });

  it('envia o alerta ao webhook configurado', async () => {
    process.env.ERROR_ALERT_WEBHOOK_URL = 'https://hooks.example.com/alerta';
    const recebidos: { url: string; corpo: Record<string, unknown> }[] = [];
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      recebidos.push({ url: String(url), corpo: JSON.parse(String(init?.body)) });
      return new Response(null);
    }) as typeof fetch;

    notificarErroInterno(alerta);
    await new Promise((r) => setImmediate(r));

    assert.equal(recebidos.length, 1);
    assert.equal(recebidos[0].url, 'https://hooks.example.com/alerta');
    assert.equal(recebidos[0].corpo.erroId, 'ab12cd34');
  });
});
