import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { InventarioService } from '../inventario.service';
import { MovimentacaoService } from '../movimentacao.service';
import { MemoryEstoqueRepository } from '../../storage/memory-estoque.adapter';
import { MemoryInventarioRepository } from '../../storage/inventario.repository.interface';
import { Item } from '../../domain/item.schema';

describe('3.2 — InventarioService (Apuração de Divergências e Ajustes Automáticos)', () => {
  let estoqueRepo: MemoryEstoqueRepository;
  let inventarioRepo: MemoryInventarioRepository;
  let movimentacaoService: MovimentacaoService;
  let inventarioService: InventarioService;

  const item1: Item = {
    id: 'item-flap-60',
    codigo: '90-1105',
    descricao: 'Disco Flap 4.1/2 Grão 60',
    tipo: 'IMPRODUTIVO_CONSUMIVEL',
    unidade: 'UNIDADE',
    estoqueSeguranca: 10,
    estoqueAtual: 50,
    ativo: true,
    embalagem: { possuiEmbalagem: false, fatorConversao: 1 },
  };

  const item2: Item = {
    id: 'item-broca-6',
    codigo: '90-2001',
    descricao: 'Broca HSS 6mm',
    tipo: 'IMPRODUTIVO_CONSUMIVEL',
    unidade: 'UNIDADE',
    estoqueSeguranca: 5,
    estoqueAtual: 20,
    ativo: true,
    embalagem: { possuiEmbalagem: false, fatorConversao: 1 },
  };

  beforeEach(async () => {
    estoqueRepo = new MemoryEstoqueRepository();
    inventarioRepo = new MemoryInventarioRepository();
    movimentacaoService = new MovimentacaoService(estoqueRepo);
    inventarioService = new InventarioService(
      estoqueRepo,
      inventarioRepo,
      movimentacaoService
    );

    await estoqueRepo.salvarItem(item1);
    await estoqueRepo.salvarItem(item2);
  });

  it('deve abrir sessão de inventário e carregar itens ativos com contagem pendente', async () => {
    const sessao = await inventarioService.abrirSessao({
      titulo: 'Inventário Mensal Consumíveis - Outubro 2026',
      escopo: 'POR_TIPO_ITEM',
      tipoItemAlvo: 'IMPRODUTIVO_CONSUMIVEL',
      responsavelAberturaId: 'colab-1',
    });

    assert.equal(sessao.status, 'ABERTO');
    assert.equal(sessao.contagens.length, 2);
    assert.equal(sessao.totalItens, 2);
    assert.equal(sessao.acuraciaPercentual, 100);
  });

  it('deve registrar contagens e calcular divergências de sobra e falta', async () => {
    const sessao = await inventarioService.abrirSessao({
      titulo: 'Balanço Geral',
      escopo: 'GERAL',
      responsavelAberturaId: 'colab-1',
    });

    // Contagem 1: Disco Flap tem 50 no sistema, operador contou 55 (sobra de +5)
    await inventarioService.registrarContagem({
      sessaoId: sessao.id,
      itemId: 'item-flap-60',
      quantidadeContada: 55,
      responsavelContagemId: 'colab-1',
    });

    // Contagem 2: Broca tem 20 no sistema, operador contou 18 (falta de -2)
    const sessaoAtualizada = await inventarioService.registrarContagem({
      sessaoId: sessao.id,
      itemId: 'item-broca-6',
      quantidadeContada: 18,
      responsavelContagemId: 'colab-1',
    });

    assert.equal(sessaoAtualizada.status, 'EM_ANDAMENTO');
    assert.equal(sessaoAtualizada.totalConciliados, 0);
    assert.equal(sessaoAtualizada.totalDivergentes, 2);
    assert.equal(sessaoAtualizada.acuraciaPercentual, 0); // 0 de 2 conciliados
  });

  it('deve emitir relatório analítico de divergências com sobras e faltas', async () => {
    const sessao = await inventarioService.abrirSessao({
      titulo: 'Auditoria de Estoque',
      escopo: 'GERAL',
      responsavelAberturaId: 'colab-1',
    });

    // Flap: sobra de 5 (50 -> 55)
    await inventarioService.registrarContagem({
      sessaoId: sessao.id,
      itemId: 'item-flap-60',
      quantidadeContada: 55,
      responsavelContagemId: 'colab-1',
    });

    // Broca: conciliado (20 -> 20)
    await inventarioService.registrarContagem({
      sessaoId: sessao.id,
      itemId: 'item-broca-6',
      quantidadeContada: 20,
      responsavelContagemId: 'colab-1',
    });

    const relatorio = await inventarioService.apurarDivergencias(sessao.id);
    assert.equal(relatorio.totalItens, 2);
    assert.equal(relatorio.totalConciliados, 1);
    assert.equal(relatorio.totalDivergentes, 1);
    assert.equal(relatorio.acuraciaPercentual, 50); // 50%

    assert.equal(relatorio.sobras.length, 1);
    assert.equal(relatorio.sobras[0].itemId, 'item-flap-60');
    assert.equal(relatorio.sobras[0].sobra, 5);

    assert.equal(relatorio.conciliados.length, 1);
    assert.equal(relatorio.conciliados[0].itemId, 'item-broca-6');
  });

  it('deve encerrar sessão gerando movimentações compensatórias automáticas de ajuste', async () => {
    const sessao = await inventarioService.abrirSessao({
      titulo: 'Fechamento Cíclico Semanal',
      escopo: 'GERAL',
      responsavelAberturaId: 'colab-1',
    });

    // Flap: sobra de 5 (50 -> 55)
    await inventarioService.registrarContagem({
      sessaoId: sessao.id,
      itemId: 'item-flap-60',
      quantidadeContada: 55,
      responsavelContagemId: 'colab-1',
    });

    // Broca: falta de 3 (20 -> 17)
    await inventarioService.registrarContagem({
      sessaoId: sessao.id,
      itemId: 'item-broca-6',
      quantidadeContada: 17,
      responsavelContagemId: 'colab-1',
    });

    // Encerra sessão com geração automática de ajustes compensatórios
    const sessaoEncerrada = await inventarioService.encerrarSessao({
      sessaoId: sessao.id,
      responsavelFechamentoId: 'colab-gerente',
      gerarAjustesAutomaticos: true,
    });

    assert.equal(sessaoEncerrada.status, 'CONCLUIDO');
    assert(sessaoEncerrada.dataFechamento !== undefined);

    // Verificar se o estoque físico foi equalizado no catálogo!
    const flapAtualizado = await estoqueRepo.buscarItemPorId('item-flap-60');
    const brocaAtualizada = await estoqueRepo.buscarItemPorId('item-broca-6');
    assert.equal(flapAtualizado?.estoqueAtual, 55); // equalizado para a contagem física!
    assert.equal(brocaAtualizada?.estoqueAtual, 17); // equalizado para a contagem física!

    // Verificar se as movimentações compensatórias foram gravadas no extrato
    const extratoFlap = await estoqueRepo.consultarExtratoItem('item-flap-60');
    assert.equal(extratoFlap.length, 1);
    assert.equal(extratoFlap[0].tipo, 'AJUSTE_INVENTARIO_POSITIVO');
    assert.equal(extratoFlap[0].quantidade, 5);

    const extratoBroca = await estoqueRepo.consultarExtratoItem('item-broca-6');
    assert.equal(extratoBroca.length, 1);
    assert.equal(extratoBroca[0].tipo, 'AJUSTE_INVENTARIO_NEGATIVO');
    assert.equal(extratoBroca[0].quantidade, 3);
  });
});
