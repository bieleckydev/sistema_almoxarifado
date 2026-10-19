import { describe, it, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { setIdentityAuthenticator } from '../api-helpers';
import type { AuthenticatedIdentity } from '@/server/auth/identity';
import { GET as getTerceiros, POST as postReceberTerceiro } from '../terceiros/route';
import { POST as postMovimentarTerceiro } from '../terceiros/movimentacoes/route';

const mockAdminIdentity: AuthenticatedIdentity = {
  token: { uid: 'user-admin', role: 'admin' } as any,
  user: {
    id: 'user-admin',
    name: 'Almoxarife Responsável',
    email: 'admin@empresa.com',
    role: 'admin',
    ativo: true,
    mustChangePassword: false,
  },
};

const HEADERS_JSON = {
  'Content-Type': 'application/json',
};

describe('Fase 3 — API: Módulo de Material de Terceiros e Automação de Retorno', () => {
  beforeEach(() => {
    setIdentityAuthenticator(async () => mockAdminIdentity);
  });

  after(() => {
    setIdentityAuthenticator(null);
    setTimeout(() => process.exit(0), 100);
  });

  it('GET /api/terceiros deve retornar materiais enriquecidos, extrato e KPIs', async () => {
    const req = new Request('http://localhost:3000/api/terceiros', {
      method: 'GET',
    });

    const res = await getTerceiros(req);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.ok(Array.isArray(body.materiais));
    assert.ok(Array.isArray(body.movimentacoesRecentes));
    assert.ok(body.kpis);
    assert.ok(body.kpis.totalMateriais > 0);
    assert.ok(body.kpis.saldoTotalItens >= 0);
    assert.ok(body.kpis.clientesAtivosCount >= 0);

    const primeiro = body.materiais[0];
    assert.ok(primeiro.descricao);
    assert.ok(primeiro.clienteNome);
    assert.equal(typeof primeiro.saldoAtual, 'number');
  });

  it('POST /api/terceiros deve registrar recebimento de remessa e inicializar saldo', async () => {
    const req = new Request('http://localhost:3000/api/terceiros', {
      method: 'POST',
      headers: HEADERS_JSON,
      body: JSON.stringify({
        clienteId: 'cli-1',
        descricao: 'Barra Chata Aço Inox 25x5mm (Cliente X)',
        codigoSku: 'BAR-INOX-01',
        unidade: 'barra',
        quantidade: 50,
        dataRecebimento: '2026-10-15',
        numeroNFRemessa: '77441',
        responsavel: 'Recebimento Portaria',
        observacao: 'Remessa para usinagem',
      }),
    });

    const res = await postReceberTerceiro(req);
    assert.equal(res.status, 201);

    const body = await res.json();
    assert.ok(body.material);
    assert.equal(body.material.saldoAtual, 50);
    assert.equal(body.material.numeroNFRemessa, '77441');
    assert.ok(body.movimentacao);
    assert.equal(body.movimentacao.tipo, 'ENTRADA_REMESSA');
    assert.equal(body.movimentacao.quantidade, 50);
  });

  it('POST /api/terceiros/movimentacoes deve registrar CONSUMO_PRODUCAO e abater saldo', async () => {
    // 1. Cria um material com 30 unidades
    const resNovo = await postReceberTerceiro(
      new Request('http://localhost:3000/api/terceiros', {
        method: 'POST',
        headers: HEADERS_JSON,
        body: JSON.stringify({
          clienteId: 'cli-2',
          descricao: 'Tubo Teste Consumo 1 Polegada',
          unidade: 'barra',
          quantidade: 30,
          dataRecebimento: '2026-10-18',
          numeroNFRemessa: '9910',
        }),
      })
    );
    const matCriado = (await resNovo.json()).material;

    // 2. Aponta consumo de 12 unidades na OP-881
    const reqConsumo = new Request('http://localhost:3000/api/terceiros/movimentacoes', {
      method: 'POST',
      headers: HEADERS_JSON,
      body: JSON.stringify({
        tipo: 'CONSUMO_PRODUCAO',
        materialTerceiroId: matCriado.id,
        quantidade: 12,
        dataMovimentacao: '2026-10-19',
        ordemProducaoOuDocumento: 'OP-881',
        responsavel: 'Setor de Usinagem',
      }),
    });

    const resConsumo = await postMovimentarTerceiro(reqConsumo);
    assert.equal(resConsumo.status, 201);

    const bodyConsumo = await resConsumo.json();
    assert.equal(bodyConsumo.material.saldoAtual, 18);
    assert.equal(bodyConsumo.movimentacao.tipo, 'CONSUMO_PRODUCAO');
    assert.equal(bodyConsumo.movimentacao.saldoResultante, 18);
  });

  it('POST /api/terceiros/movimentacoes deve rejeitar consumo se saldo for insuficiente', async () => {
    // Cria material com 10 unidades
    const resNovo = await postReceberTerceiro(
      new Request('http://localhost:3000/api/terceiros', {
        method: 'POST',
        headers: HEADERS_JSON,
        body: JSON.stringify({
          clienteId: 'cli-2',
          descricao: 'Material para teste de saldo insuficiente',
          unidade: 'un',
          quantidade: 10,
          dataRecebimento: '2026-10-18',
          numeroNFRemessa: '5511',
        }),
      })
    );
    const mat = (await resNovo.json()).material;

    // Tenta consumir 15 unidades (superior aos 10 disponíveis)
    const reqExcesso = new Request('http://localhost:3000/api/terceiros/movimentacoes', {
      method: 'POST',
      headers: HEADERS_JSON,
      body: JSON.stringify({
        tipo: 'CONSUMO_PRODUCAO',
        materialTerceiroId: mat.id,
        quantidade: 15,
        dataMovimentacao: '2026-10-19',
        ordemProducaoOuDocumento: 'OP-EXCESSO',
      }),
    });

    const resExcesso = await postMovimentarTerceiro(reqExcesso);
    assert.equal(resExcesso.status, 422);

    const bodyErro = await resExcesso.json();
    assert.match(bodyErro.error, /Saldo insuficiente/);
  });

  it('POST /api/terceiros/movimentacoes deve registrar DEVOLUCAO_RETORNO e gerar NF-e de Retorno automaticamente', async () => {
    // 1. Cria material com 40 unidades
    const resNovo = await postReceberTerceiro(
      new Request('http://localhost:3000/api/terceiros', {
        method: 'POST',
        headers: HEADERS_JSON,
        body: JSON.stringify({
          clienteId: 'cli-1',
          descricao: 'Eixo Usinado Retorno Industrializacao',
          unidade: 'peca',
          quantidade: 40,
          dataRecebimento: '2026-10-10',
          numeroNFRemessa: '33221',
        }),
      })
    );
    const mat = (await resNovo.json()).material;

    // 2. Registra devolução de 20 peças com valor de industrialização R$ 1.500 e NF-e de retorno 6601
    const reqDevolucao = new Request('http://localhost:3000/api/terceiros/movimentacoes', {
      method: 'POST',
      headers: HEADERS_JSON,
      body: JSON.stringify({
        tipo: 'DEVOLUCAO_RETORNO',
        materialTerceiroId: mat.id,
        quantidade: 20,
        dataMovimentacao: '2026-10-19',
        numeroNFRetorno: '6601',
        valorServico: 1500,
        responsavel: 'Expedição',
        observacao: 'Devolução com serviço de usinagem concluído',
      }),
    });

    const resDev = await postMovimentarTerceiro(reqDevolucao);
    assert.equal(resDev.status, 201);

    const bodyDev = await resDev.json();
    assert.equal(bodyDev.material.saldoAtual, 20);
    assert.equal(bodyDev.movimentacao.tipo, 'DEVOLUCAO_RETORNO');
    assert.equal(bodyDev.movimentacao.saldoResultante, 20);

    // Valida automação: geração da nota fiscal de retorno de industrialização
    assert.ok(bodyDev.notaFiscalRetorno);
    assert.equal(bodyDev.notaFiscalRetorno.numeroNF, '6601');
    assert.equal(bodyDev.notaFiscalRetorno.tipo, 'RETORNO_INDUSTRIALIZACAO');
    assert.equal(bodyDev.notaFiscalRetorno.valorTotal, 1500);
    assert.equal(bodyDev.notaFiscalRetorno.clienteId, 'cli-1');
  });
});
