import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// 1. Domínio e Schemas
import { Item, ItemSchema } from '../domain/item.schema';
import { Colaborador, ColaboradorSchema } from '../domain/colaborador.schema';
import { PedidoCompra, NotaFiscal } from '../domain/nfe.schema';

// 2. Repositórios e Adaptadores
import { MemoryEstoqueRepository } from '../storage/memory-estoque.adapter';
import { MemoryInventarioRepository } from '../storage/inventario.repository.interface';
import { MemoryFechamentoMensalRepository } from '../storage/fechamento-mensal.repository.interface';
import { MemoryStorageAdapter } from '../storage/memory-storage.adapter';

// 3. Serviços de Domínio
import { MovimentacaoService } from '../services/movimentacao.service';
import { NFeReconciliationService } from '../services/nfe-reconciliation.service';
import { NFeEntradaService } from '../services/nfe-entrada.service';
import { NFeArchiveService } from '../services/nfe-archive.service';
import { InventarioService } from '../services/inventario.service';
import { FechamentoMensalService } from '../services/fechamento-mensal.service';


describe('5.4 — Suite de Testes de Integração Ponta a Ponta do Core Agnóstico', () => {
  it('deve executar o ciclo de vida operacional fabril completo: Cadastro -> Entrada NFe -> Baixa Rápida -> Inventário -> Fechamento Mensal', async () => {
    // =========================================================================
    // ETAPA 1: Setup da Infraestrutura Agnóstica e Serviços
    // =========================================================================
    const estoqueRepo = new MemoryEstoqueRepository();
    const inventarioRepo = new MemoryInventarioRepository();
    const fechamentoRepo = new MemoryFechamentoMensalRepository();
    const storageAdapter = new MemoryStorageAdapter();

    const movimentacaoService = new MovimentacaoService(estoqueRepo);
    const nfeReconciliationService = new NFeReconciliationService();
    const nfeEntradaService = new NFeEntradaService(estoqueRepo);
    const nfeArchiveService = new NFeArchiveService();
    const inventarioService = new InventarioService(estoqueRepo, inventarioRepo, movimentacaoService);
    const fechamentoMensalService = new FechamentoMensalService(estoqueRepo, fechamentoRepo);

    // =========================================================================
    // ETAPA 2: Cadastro de Itens e Colaborador Fabril
    // =========================================================================
    const itemTuboInput = {
      id: 'item-tubo-01',
      codigo: '10-001',
      descricao: 'Tubo de Aço Carbono Redondo 2 POL',
      tipo: 'PRODUTIVO_MATERIA_PRIMA' as const,
      unidade: 'KG' as const,
      estoqueAtual: 0,
      estoqueSeguranca: 200,
      ativo: true,
      embalagem: { possuiEmbalagem: false, fatorConversao: 1 },
    };
    const itemTubo: Item = ItemSchema.parse(itemTuboInput);
    await estoqueRepo.salvarItem(itemTubo);

    const itemFlapInput = {
      id: 'item-flap-01',
      codigo: '90-1105',
      descricao: 'Disco Flap 4.1/2 Grão 60',
      tipo: 'IMPRODUTIVO_CONSUMIVEL' as const,
      unidade: 'UNIDADE' as const,
      estoqueAtual: 10,
      estoqueSeguranca: 15,
      ativo: true,
      embalagem: { possuiEmbalagem: false, fatorConversao: 1 },
    };
    const itemFlap: Item = ItemSchema.parse(itemFlapInput);
    await estoqueRepo.salvarItem(itemFlap);

    const colaboradorInput = {
      id: 'colab-solda-01',
      matricula: '042',
      nome: 'Carlos Silva',
      setor: 'SOLDA' as const,
      funcao: 'Soldador TIG',
      ativo: true,
    };
    const colaborador: Colaborador = ColaboradorSchema.parse(colaboradorInput);
    await estoqueRepo.salvarColaborador(colaborador);

    // =========================================================================
    // ETAPA 3: Conciliação de NFe contra Pedido de Compra e Arquivamento
    // =========================================================================
    const pedidoCompra: PedidoCompra = {
      id: 'pc-2026-001',
      numeroPedido: 'PED-2026-001',
      cnpjFornecedor: '12.345.678/0001-90',
      razaoSocialFornecedor: 'Siderúrgica & Metais Brasil S/A',
      dataAutorizacao: '2026-01-10T08:00:00.000Z',
      statusPedido: 'PENDENTE',
      valorTotalPedido: 11500,
      itens: [
        {
          id: 'pci-tubo',
          numeroItem: 1,
          codigoInternoRhowert: '10-001',
          descricao: 'Tubo de Aço Carbono Redondo 2 POL',
          unidade: 'KG',
          quantidadeAutorizada: 1000,
          quantidadeJaEntregue: 0,
          valorUnitarioContratado: 10.0,
          valorTotalContratado: 10000,
          toleranciaPercentual: 5, // até 1050 KG
        },
        {
          id: 'pci-flap',
          numeroItem: 2,
          codigoInternoRhowert: '90-1105',
          descricao: 'Disco Flap 4.1/2 Grão 60',
          unidade: 'UNIDADE',
          quantidadeAutorizada: 100,
          quantidadeJaEntregue: 0,
          valorUnitarioContratado: 15.0,
          valorTotalContratado: 1500,
          toleranciaPercentual: 0,
        },
      ],
    };

    // Nota fiscal com leve variação de peso no tubo (1020 KG faturados, dentro dos 5% permitidos)
    const notaFiscalRecebida: NotaFiscal = {
      id: 'nfe-7788',
      chaveAcesso: '35260112345678000190550010000077881234567890',
      numero: '7788',
      serie: '1',
      cnpjFornecedor: '12.345.678/0001-90',
      razaoSocialFornecedor: 'Siderúrgica & Metais Brasil S/A',
      dataEmissao: '2026-01-15T10:00:00.000Z',
      dataRecebimento: '2026-01-15T14:30:00.000Z',
      valorTotalNota: 11700,
      status: 'RECEBIDA',
      numeroPedidoCompra: 'PED-2026-001',
      itens: [
        {
          id: 'nfi-tubo',
          numeroItem: 1,
          codigoFornecedor: 'FORN-TUBO-2POL',
          codigoInternoRhowert: '10-001',
          descricao: 'Tubo de Aço Carbono Redondo 2 POL',
          unidadeComercial: 'KG',
          quantidadeFaturada: 1020,
          valorUnitario: 10.0,
          valorTotal: 10200,
          statusConciliacao: 'PENDENTE',
        },
        {
          id: 'nfi-flap',
          numeroItem: 2,
          codigoFornecedor: 'FORN-FLAP-60',
          codigoInternoRhowert: '90-1105',
          descricao: 'Disco Flap 4.1/2 Grão 60',
          unidadeComercial: 'UN',
          quantidadeFaturada: 100,
          valorUnitario: 15.0,
          valorTotal: 1500,
          statusConciliacao: 'PENDENTE',
        },
      ],
    };

    // 1. Reconciliação Contábil
    const resultadoConciliacao = nfeReconciliationService.reconciliar(
      notaFiscalRecebida,
      pedidoCompra
    );
    assert.equal(resultadoConciliacao.statusGeral, 'APROVADA_TOTAL');
    assert.equal(resultadoConciliacao.statusConferenciaSugerido, 'APROVADA');
    assert.equal(resultadoConciliacao.totalItensConciliados, 2);

    // 2. Indexação de Arquivamento
    const metadadosArquivo = nfeArchiveService.gerarMetadadosArquivamento(
      resultadoConciliacao.notaFiscalAtualizada
    );
    assert.equal(
      metadadosArquivo.caminhoArquivoDanfe,
      'nfe-archive/2026/01/15/35260112345678000190550010000077881234567890.pdf'
    );
    await storageAdapter.setJson(`nfe_${metadadosArquivo.chaveAcesso}`, metadadosArquivo);

    // =========================================================================
    // ETAPA 4: Efetivação de Entrada no Estoque Físico
    // =========================================================================
    const resultadoEntrada = await nfeEntradaService.efetivarEntrada(
      resultadoConciliacao.notaFiscalAtualizada
    );
    assert.equal(resultadoEntrada.totalItensEfetivados, 2);
    assert.equal(resultadoEntrada.notaFiscalAtualizada.status, 'ARQUIVADA');

    // Validação dos saldos físicos após a entrada:
    // Tubo: 0 anterior + 1020 recebido = 1020 KG
    const tuboAposEntrada = await estoqueRepo.buscarItemPorId(itemTubo.id);
    assert.equal(tuboAposEntrada?.estoqueAtual, 1020);

    // Flap: 10 anterior + 100 recebido = 110 UN
    const flapAposEntrada = await estoqueRepo.buscarItemPorId(itemFlap.id);
    assert.equal(flapAposEntrada?.estoqueAtual, 110);

    // =========================================================================
    // ETAPA 5: Chão de Fábrica — Retirada Interna para Colaborador
    // =========================================================================
    await movimentacaoService.executarBaixaInterna({
      itemId: itemTubo.id,
      quantidade: 20,
      colaboradorId: colaborador.id,
      setor: colaborador.setor,
      observacao: 'Ordem de Fabricação OF-2026-90',
    });

    await movimentacaoService.executarBaixaInterna({
      itemId: itemFlap.id,
      quantidade: 5,
      colaboradorId: colaborador.id,
      setor: colaborador.setor,
      observacao: 'Ordem de Fabricação OF-2026-90',
    });

    // Conferência dos novos saldos físicos:
    // Tubo: 1020 - 20 = 1000 KG
    const tuboAposBaixa = await estoqueRepo.buscarItemPorId(itemTubo.id);
    assert.equal(tuboAposBaixa?.estoqueAtual, 1000);

    // Flap: 110 - 5 = 105 UN
    const flapAposBaixa = await estoqueRepo.buscarItemPorId(itemFlap.id);
    assert.equal(flapAposBaixa?.estoqueAtual, 105);

    // =========================================================================
    // ETAPA 6: Sessão de Inventário Físico e Apuração de Divergência
    // =========================================================================
    const sessaoInventario = await inventarioService.abrirSessao({
      titulo: 'Balanço Geral de Fechamento - Janeiro/2026',
      escopo: 'GERAL',
      responsavelAberturaId: colaborador.id,
      observacoes: 'Auditoria de encerramento mensal de estoque',
    });

    // Contagem física apurada pelo almoxarife:
    // Flap: 105 contados (100% de acurácia, divergência 0)
    await inventarioService.registrarContagem({
      sessaoId: sessaoInventario.id,
      itemId: itemFlap.id,
      quantidadeContada: 105,
      responsavelContagemId: colaborador.id,
    });

    // Tubo: 998 KG contados (2 KG de perda/sucata por corte, divergência -2)
    await inventarioService.registrarContagem({
      sessaoId: sessaoInventario.id,
      itemId: itemTubo.id,
      quantidadeContada: 998,
      responsavelContagemId: colaborador.id,
      observacao: '2 KG de apara/sucata de ponta de tubo',
    });

    // Encerramento da sessão gerando compensação automática
    const sessaoEncerrada = await inventarioService.encerrarSessao({
      sessaoId: sessaoInventario.id,
      responsavelFechamentoId: colaborador.id,
      gerarAjustesAutomaticos: true,
    });
    assert.equal(sessaoEncerrada.status, 'CONCLUIDO');

    // Saldos equalizados após o inventário:
    // Tubo ajustado para exatamente 998 KG
    const tuboAposInventario = await estoqueRepo.buscarItemPorId(itemTubo.id);
    assert.equal(tuboAposInventario?.estoqueAtual, 998);

    // Flap permanece em 105 UN
    const flapAposInventario = await estoqueRepo.buscarItemPorId(itemFlap.id);
    assert.equal(flapAposInventario?.estoqueAtual, 105);

    // =========================================================================
    // ETAPA 7: Fechamento Mensal e Transporte Temporal de Saldos
    // =========================================================================
    // 1. Fechamento de Janeiro/2026
    const fechamentoJaneiro = await fechamentoMensalService.executarFechamento({
      ano: 2026,
      mes: 1,
      responsavelId: colaborador.id,
      observacoes: 'Fechamento mensal aprovado pela contabilidade',
    });
    assert.equal(fechamentoJaneiro.ano, 2026);
    assert.equal(fechamentoJaneiro.mes, 1);

    const linhaTuboJan = fechamentoJaneiro.itens.find((l) => l.itemId === itemTubo.id);
    assert.equal(linhaTuboJan?.saldoFinal, 998);

    const linhaFlapJan = fechamentoJaneiro.itens.find((l) => l.itemId === itemFlap.id);
    assert.equal(linhaFlapJan?.saldoFinal, 105);

    // 2. Fechamento de Fevereiro transportando o saldo final de Janeiro como saldo inicial
    const fechamentoFevereiro = await fechamentoMensalService.executarFechamento({
      ano: 2026,
      mes: 2,
      responsavelId: colaborador.id,
    });
    assert.equal(fechamentoFevereiro.mes, 2);

    const linhaTuboFev = fechamentoFevereiro.itens.find((l) => l.itemId === itemTubo.id);
    assert.equal(linhaTuboFev?.saldoInicial, 998);

    const linhaFlapFev = fechamentoFevereiro.itens.find((l) => l.itemId === itemFlap.id);
    assert.equal(linhaFlapFev?.saldoInicial, 105);

    // =========================================================================
    // ETAPA 8: Auditoria Completa da Trilha de Movimentações
    // =========================================================================
    const extratoTubo = await estoqueRepo.consultarExtratoItem(itemTubo.id);

    // Histórico de movimentações do Tubo:
    // 1. ENTRADA_COMPRA (+1020)
    // 2. SAIDA_CONSUMO_INTERNO (-20)
    // 3. AJUSTE_INVENTARIO_NEGATIVO (-2)
    assert.equal(extratoTubo.length, 3);
    assert.equal(extratoTubo[0].tipo, 'ENTRADA_COMPRA');
    assert.equal(extratoTubo[0].quantidade, 1020);
    assert.equal(extratoTubo[1].tipo, 'SAIDA_CONSUMO_INTERNO');
    assert.equal(extratoTubo[1].quantidade, 20);
    assert.equal(extratoTubo[2].tipo, 'AJUSTE_INVENTARIO_NEGATIVO');
    assert.equal(extratoTubo[2].quantidade, 2);

    // Reconciliação matemática do saldo final
    const saldoFinalAuditoria = extratoTubo.reduce((saldo, mov) => {
      if (mov.tipo === 'ENTRADA_COMPRA') return saldo + mov.quantidade;
      if (mov.tipo === 'SAIDA_CONSUMO_INTERNO') return saldo - mov.quantidade;
      if (mov.tipo === 'AJUSTE_INVENTARIO_NEGATIVO') return saldo - mov.quantidade;
      return saldo;
    }, 0);

    assert.equal(saldoFinalAuditoria, 998);
    assert.equal(saldoFinalAuditoria, tuboAposInventario?.estoqueAtual);
  });
});
