import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryEstoqueRepository } from '../memory-estoque.adapter';
import { Item } from '../../domain/item.schema';
import { Colaborador } from '../../domain/colaborador.schema';
import { Movimentacao } from '../../domain/movimentacao.schema';

describe('2.4 — Contrato e Implementação de Repositório de Estoque', () => {
  let repo: MemoryEstoqueRepository;

  const item1: Item = {
    id: 'item-10-3812',
    codigo: '10-3812',
    descricao: 'Tubo de Aço Carbono SAE 1020',
    tipo: 'PRODUTIVO_MATERIA_PRIMA',
    unidade: 'KG',
    estoqueSeguranca: 500,
    estoqueAtual: 1200,
    ativo: true,
    embalagem: { possuiEmbalagem: false, fatorConversao: 1 },
  };

  const item2: Item = {
    id: 'item-90-1105',
    codigo: '90-1105',
    descricao: 'Disco Flap Grão 60',
    tipo: 'IMPRODUTIVO_CONSUMIVEL',
    unidade: 'UNIDADE',
    estoqueSeguranca: 20,
    estoqueAtual: 15, // ESTOQUE_BAIXO
    ativo: true,
    embalagem: { possuiEmbalagem: false, fatorConversao: 1 },
  };

  const item3: Item = {
    id: 'item-100-089',
    codigo: '100-089',
    descricao: 'Suporte Guidão Preto Shaman',
    tipo: 'ACABADO',
    unidade: 'PECA',
    estoqueSeguranca: 10,
    estoqueAtual: 0, // CRITICO_ZERADO
    clienteDestino: 'Shaman',
    ativo: true,
    embalagem: { possuiEmbalagem: false, fatorConversao: 1 },
  };

  const colab1: Colaborador = {
    id: 'colab-1',
    matricula: '042',
    nome: 'Carlos Eduardo',
    setor: 'FERRAMENTARIA',
    funcao: 'Ferramenteiro',
    ativo: true,
  };

  beforeEach(async () => {
    repo = new MemoryEstoqueRepository();
    await repo.salvarItem(item1);
    await repo.salvarItem(item2);
    await repo.salvarItem(item3);
    await repo.salvarColaborador(colab1);
  });

  it('deve buscar item por código padronizado com case-insensitivity', async () => {
    const achado = await repo.buscarPorCodigo('10-3812');
    assert(achado !== null);
    assert.equal(achado?.id, 'item-10-3812');

    const emMinusculo = await repo.buscarPorCodigo('10-3812');
    assert(emMinusculo !== null);

    const inexistente = await repo.buscarPorCodigo('99-9999');
    assert.equal(inexistente, null);
  });

  it('deve listar itens com filtros por tipo e status de estoque', async () => {
    // Filtro por tipo
    const apenasProdutivos = await repo.listarComFiltros({
      tipo: 'PRODUTIVO_MATERIA_PRIMA',
      apenasAtivos: true,
      pagina: 1,
      limite: 10,
    });
    assert.equal(apenasProdutivos.itens.length, 1);
    assert.equal(apenasProdutivos.itens[0].codigo, '10-3812');

    // Filtro por status ESTOQUE_BAIXO (item2 tem 15 <= 20)
    const estoqueBaixo = await repo.listarComFiltros({
      statusEstoque: 'ESTOQUE_BAIXO',
      apenasAtivos: true,
      pagina: 1,
      limite: 10,
    });
    assert.equal(estoqueBaixo.itens.length, 1);
    assert.equal(estoqueBaixo.itens[0].codigo, '90-1105');

    // Filtro por busca textual
    const buscaDisco = await repo.listarComFiltros({
      busca: 'Flap',
      apenasAtivos: true,
      pagina: 1,
      limite: 10,
    });
    assert.equal(buscaDisco.itens.length, 1);
    assert.equal(buscaDisco.itens[0].codigo, '90-1105');
  });

  it('deve atualizar o saldo físico do item corretamente', async () => {
    await repo.atualizarSaldoItem('item-10-3812', 1550.5);
    const atualizado = await repo.buscarItemPorId('item-10-3812');
    assert.equal(atualizado?.estoqueAtual, 1550.5);
  });

  it('deve atualizar simultaneamente saldo e custo unitário ponderado', async () => {
    await repo.atualizarSaldoECustoItem('item-10-3812', 2000, 18.75);
    const atualizado = await repo.buscarItemPorId('item-10-3812');
    assert.equal(atualizado?.estoqueAtual, 2000);
    assert.equal(atualizado?.custoUnitario, 18.75);
  });

  it('deve registrar movimentação e permitir consulta de extrato por item', async () => {
    const mov1: Movimentacao = {
      id: 'mov-1',
      itemId: 'item-90-1105',
      tipo: 'ENTRADA_COMPRA',
      quantidade: 50,
      saldoAnterior: 15,
      saldoResultante: 65,
      dataMovimentacao: '2026-10-01T10:00:00.000Z',
    };

    const mov2: Movimentacao = {
      id: 'mov-2',
      itemId: 'item-90-1105',
      tipo: 'SAIDA_CONSUMO_INTERNO',
      quantidade: 10,
      saldoAnterior: 65,
      saldoResultante: 55,
      dataMovimentacao: '2026-10-02T14:30:00.000Z',
      colaboradorId: 'colab-1',
    };

    await repo.registrarMovimentacao(mov1);
    await repo.registrarMovimentacao(mov2);

    const extrato = await repo.consultarExtratoItem('item-90-1105');
    assert.equal(extrato.length, 2);
    assert.equal(extrato[0].id, 'mov-1');
    assert.equal(extrato[1].id, 'mov-2');

    // Filtro por tipo no extrato
    const apenasSaidas = await repo.consultarExtratoItem('item-90-1105', {
      tipo: 'SAIDA_CONSUMO_INTERNO',
      pagina: 1,
      limite: 10,
    });
    assert.equal(apenasSaidas.length, 1);
    assert.equal(apenasSaidas[0].id, 'mov-2');
  });

  it('deve buscar colaborador por ID ou matrícula', async () => {
    const porId = await repo.buscarColaboradorPorId('colab-1');
    assert.equal(porId?.nome, 'Carlos Eduardo');

    const porMatricula = await repo.buscarColaboradorPorId('042');
    assert.equal(porMatricula?.id, 'colab-1');
  });

  it('deve registrar movimentação e atualizar saldo atomicamente (registrarMovimentacaoComSaldo)', async () => {
    const mov: Movimentacao = {
      id: 'mov-atomica-1',
      itemId: 'item-10-3812',
      tipo: 'ENTRADA_COMPRA',
      quantidade: 300,
      saldoAnterior: 1200,
      saldoResultante: 1500,
      dataMovimentacao: new Date().toISOString(),
    };

    const movSalva = await repo.registrarMovimentacaoComSaldo('item-10-3812', 1500, mov);
    assert.equal(movSalva.id, 'mov-atomica-1');

    const itemAtualizado = await repo.buscarItemPorId('item-10-3812');
    assert.equal(itemAtualizado?.estoqueAtual, 1500);

    const extrato = await repo.consultarExtratoItem('item-10-3812');
    assert(extrato.some((m) => m.id === 'mov-atomica-1'));
  });

  it('deve registrar baixa em lote atômica com múltiplos itens (registrarBaixaLoteAtomica)', async () => {
    const movItem1: Movimentacao = {
      id: 'mov-lote-1',
      itemId: 'item-10-3812',
      tipo: 'SAIDA_CONSUMO_INTERNO',
      quantidade: 200,
      saldoAnterior: 1200,
      saldoResultante: 1000,
      dataMovimentacao: new Date().toISOString(),
      colaboradorId: 'colab-1',
    };

    const movItem2: Movimentacao = {
      id: 'mov-lote-2',
      itemId: 'item-90-1105',
      tipo: 'SAIDA_CONSUMO_INTERNO',
      quantidade: 5,
      saldoAnterior: 15,
      saldoResultante: 10,
      dataMovimentacao: new Date().toISOString(),
      colaboradorId: 'colab-1',
    };

    const resultado = await repo.registrarBaixaLoteAtomica([
      { itemId: 'item-10-3812', novoSaldo: 1000, movimentacao: movItem1 },
      { itemId: 'item-90-1105', novoSaldo: 10, movimentacao: movItem2 },
    ]);

    assert.equal(resultado.length, 2);
    assert.equal(resultado[0].id, 'mov-lote-1');
    assert.equal(resultado[1].id, 'mov-lote-2');

    const i1 = await repo.buscarItemPorId('item-10-3812');
    const i2 = await repo.buscarItemPorId('item-90-1105');
    assert.equal(i1?.estoqueAtual, 1000);
    assert.equal(i2?.estoqueAtual, 10);
  });
});
