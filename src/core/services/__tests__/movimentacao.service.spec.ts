import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  MovimentacaoService,
  ItemNaoEncontradoError,
  ItemInativoError,
  ColaboradorNaoEncontradoError,
  ColaboradorInativoError,
  LoteEstoqueInsuficienteError,
} from '../movimentacao.service';
import { MemoryEstoqueRepository } from '../../storage/memory-estoque.adapter';
import { SaldoInsuficienteError } from '../estoque-calculator';

describe('2.3 — MovimentacaoService (Orquestração e Regras de Negócio)', () => {
  let repo: MemoryEstoqueRepository;
  let service: MovimentacaoService;

  beforeEach(async () => {
    repo = new MemoryEstoqueRepository();
    service = new MovimentacaoService(repo);

    // Carregar dados de teste
    await repo.salvarItem({
      id: 'item-1',
      codigo: '90-1105',
      descricao: 'Disco Flap 4.1/2 Grão 60',
      tipo: 'IMPRODUTIVO_CONSUMIVEL',
      unidade: 'UNIDADE',
      estoqueSeguranca: 10,
      estoqueAtual: 50,
      ativo: true,
      embalagem: { possuiEmbalagem: false, fatorConversao: 1 },
    });

    await repo.salvarItem({
      id: 'item-2',
      codigo: '90-2001',
      descricao: 'Broca HSS Aço Rápido 6mm',
      tipo: 'IMPRODUTIVO_CONSUMIVEL',
      unidade: 'UNIDADE',
      estoqueSeguranca: 5,
      estoqueAtual: 3,
      ativo: true,
      embalagem: { possuiEmbalagem: false, fatorConversao: 1 },
    });

    await repo.salvarItem({
      id: 'item-inativo',
      codigo: '90-0000',
      descricao: 'Item Obsoleto',
      tipo: 'IMPRODUTIVO_CONSUMIVEL',
      unidade: 'UNIDADE',
      estoqueSeguranca: 0,
      estoqueAtual: 10,
      ativo: false,
      embalagem: { possuiEmbalagem: false, fatorConversao: 1 },
    });

    await repo.salvarColaborador({
      id: 'colab-1',
      matricula: '001',
      nome: 'João da Solda',
      setor: 'SOLDA',
      funcao: 'Soldador Especialista',
      ativo: true,
    });

    await repo.salvarColaborador({
      id: 'colab-inativo',
      matricula: '999',
      nome: 'Ex-Colaborador',
      setor: 'MONTAGEM',
      funcao: 'Operador',
      ativo: false,
    });
  });

  describe('Entrada de Estoque', () => {
    it('deve registrar entrada e atualizar o saldo com sucesso', async () => {
      const mov = await service.executarEntrada({
        itemId: 'item-1',
        tipo: 'ENTRADA_COMPRA',
        quantidade: 100,
        numeroNF: '45600',
        numeroPedidoRhowert: 'PED-100',
        fornecedor: 'Fornecedor Teste',
      });

      assert.equal(mov.tipo, 'ENTRADA_COMPRA');
      assert.equal(mov.quantidade, 100);
      assert.equal(mov.saldoAnterior, 50);
      assert.equal(mov.saldoResultante, 150);

      const itemAtualizado = await repo.buscarItemPorId('item-1');
      assert.equal(itemAtualizado?.estoqueAtual, 150);
    });

    it('deve rejeitar entrada para item inexistente', async () => {
      await assert.rejects(
        () =>
          service.executarEntrada({
            itemId: 'item-inexistente',
            quantidade: 10,
          }),
        ItemNaoEncontradoError
      );
    });

    it('deve rejeitar entrada para item inativo', async () => {
      await assert.rejects(
        () =>
          service.executarEntrada({
            itemId: 'item-inativo',
            quantidade: 10,
          }),
        ItemInativoError
      );
    });
  });

  describe('Baixa Interna por Colaborador', () => {
    it('deve registrar baixa interna e debitar o saldo do item', async () => {
      const mov = await service.executarBaixaInterna({
        itemId: 'item-1',
        quantidade: 10,
        colaboradorId: 'colab-1',
        observacao: 'Consumo no turno matutino',
      });

      assert.equal(mov.tipo, 'SAIDA_CONSUMO_INTERNO');
      assert.equal(mov.quantidade, 10);
      assert.equal(mov.saldoAnterior, 50);
      assert.equal(mov.saldoResultante, 40);
      assert.equal(mov.colaboradorMatricula, '001');
      assert.equal(mov.setor, 'SOLDA');

      const itemAtualizado = await repo.buscarItemPorId('item-1');
      assert.equal(itemAtualizado?.estoqueAtual, 40);
    });

    it('deve rejeitar baixa se colaborador não existir', async () => {
      await assert.rejects(
        () =>
          service.executarBaixaInterna({
            itemId: 'item-1',
            quantidade: 5,
            colaboradorId: 'colab-inexistente',
          }),
        ColaboradorNaoEncontradoError
      );
    });

    it('deve rejeitar baixa se colaborador estiver inativo', async () => {
      await assert.rejects(
        () =>
          service.executarBaixaInterna({
            itemId: 'item-1',
            quantidade: 5,
            colaboradorId: 'colab-inativo',
          }),
        ColaboradorInativoError
      );
    });

    it('deve rejeitar baixa se o saldo for insuficiente', async () => {
      await assert.rejects(
        () =>
          service.executarBaixaInterna({
            itemId: 'item-2', // tem saldo 3
            quantidade: 10,
            colaboradorId: 'colab-1',
          }),
        SaldoInsuficienteError
      );
    });
  });

  describe('Orquestração de Baixa Rápida em Lote', () => {
    it('deve processar baixa em lote com múltiplos itens com sucesso', async () => {
      const resultado = await service.executarBaixaLote({
        colaboradorId: 'colab-1',
        itens: [
          { itemId: 'item-1', quantidade: 5 },
          { itemId: 'item-2', quantidade: 2 },
        ],
        observacaoGeral: 'Kit inicial montagem',
      });

      assert.equal(resultado.length, 2);
      const item1 = await repo.buscarItemPorId('item-1');
      const item2 = await repo.buscarItemPorId('item-2');
      assert.equal(item1?.estoqueAtual, 45); // 50 - 5
      assert.equal(item2?.estoqueAtual, 1);  // 3 - 2
    });

    it('deve abortar o lote INTEIRO se qualquer item não tiver saldo suficiente', async () => {
      // item-1 tem 50 (suficiente), mas item-2 tem apenas 3 (solicitado 10)
      await assert.rejects(
        () =>
          service.executarBaixaLote({
            colaboradorId: 'colab-1',
            itens: [
              { itemId: 'item-1', quantidade: 10 },
              { itemId: 'item-2', quantidade: 10 }, // vai falhar
            ],
          }),
        LoteEstoqueInsuficienteError
      );

      // Garante atomicidade: o item-1 NÃO deve ter sido debitado!
      const item1 = await repo.buscarItemPorId('item-1');
      const item2 = await repo.buscarItemPorId('item-2');
      assert.equal(item1?.estoqueAtual, 50);
      assert.equal(item2?.estoqueAtual, 3);

      const lista = await repo.listarMovimentacoes();
      assert.equal(lista.total, 0);
    });
  });

  describe('Saída para Expedição e Ajuste de Inventário', () => {
    it('deve processar saída para expedição vinculada a cliente', async () => {
      const mov = await service.executarSaidaExpedicao({
        itemId: 'item-1',
        quantidade: 15,
        clienteDestino: 'Grajau Motos',
        numeroNF: '11223',
      });

      assert.equal(mov.tipo, 'SAIDA_EXPEDICAO');
      assert.equal(mov.destinatario, 'Grajau Motos');
      assert.equal(mov.saldoResultante, 35);
    });

    it('deve processar ajuste de inventário compensatório', async () => {
      const mov = await service.executarAjusteInventario({
        itemId: 'item-1',
        tipo: 'AJUSTE_INVENTARIO_POSITIVO',
        quantidade: 5,
        motivo: 'Sobra física verificada no balanço mensal',
      });

      assert.equal(mov.tipo, 'AJUSTE_INVENTARIO_POSITIVO');
      assert.equal(mov.saldoResultante, 55);
    });
  });

  describe('Delegação e Fallback de Transações Atômicas', () => {
    it('deve utilizar registrarMovimentacaoComSaldo e registrarBaixaLoteAtomica quando disponíveis no repositório', async () => {
      let chamouComSaldo = false;
      let chamouLoteAtomico = false;

      const repoEspiao = new MemoryEstoqueRepository({
        itens: [
          {
            id: 'item-espiao-1',
            codigo: '90-1105',
            descricao: 'Disco Flap',
            tipo: 'IMPRODUTIVO_CONSUMIVEL',
            unidade: 'UNIDADE',
            estoqueSeguranca: 5,
            estoqueAtual: 20,
            ativo: true,
            embalagem: { possuiEmbalagem: false, fatorConversao: 1 },
          },
        ],
        colaboradores: [
          {
            id: 'colab-1',
            matricula: '042',
            nome: 'Carlos Eduardo',
            setor: 'FERRAMENTARIA',
            funcao: 'Ferramenteiro',
            ativo: true,
          },
        ],
      });

      const origComSaldo = repoEspiao.registrarMovimentacaoComSaldo.bind(repoEspiao);
      repoEspiao.registrarMovimentacaoComSaldo = async (id, saldo, mov) => {
        chamouComSaldo = true;
        return origComSaldo(id, saldo, mov);
      };

      const origLoteAtomico = repoEspiao.registrarBaixaLoteAtomica.bind(repoEspiao);
      repoEspiao.registrarBaixaLoteAtomica = async (ops) => {
        chamouLoteAtomico = true;
        return origLoteAtomico(ops);
      };

      const servicoComEspiao = new MovimentacaoService(repoEspiao);

      // 1. Testa entrada delegando para transação atômica
      await servicoComEspiao.executarEntrada({
        itemId: 'item-espiao-1',
        quantidade: 10,
      });
      assert.equal(chamouComSaldo, true);

      // 2. Testa baixa em lote delegando para baixa lote atômica
      await servicoComEspiao.executarBaixaLote({
        colaboradorId: 'colab-1',
        itens: [{ itemId: 'item-espiao-1', quantidade: 5 }],
      });
      assert.equal(chamouLoteAtomico, true);
    });

    it('deve realizar fallback suave quando repositório não implementar métodos atômicos', async () => {
      const repoSemAtomico = new MemoryEstoqueRepository({
        itens: [
          {
            id: 'item-sem-1',
            codigo: '90-1105',
            descricao: 'Disco Flap',
            tipo: 'IMPRODUTIVO_CONSUMIVEL',
            unidade: 'UNIDADE',
            estoqueSeguranca: 5,
            estoqueAtual: 20,
            ativo: true,
            embalagem: { possuiEmbalagem: false, fatorConversao: 1 },
          },
        ],
        colaboradores: [
          {
            id: 'colab-1',
            matricula: '042',
            nome: 'Carlos Eduardo',
            setor: 'FERRAMENTARIA',
            funcao: 'Ferramenteiro',
            ativo: true,
          },
        ],
      });

      // Remove intencionalmente os métodos atômicos
      delete (repoSemAtomico as any).registrarMovimentacaoComSaldo;
      delete (repoSemAtomico as any).registrarBaixaLoteAtomica;

      const servicoFallback = new MovimentacaoService(repoSemAtomico);

      const entrada = await servicoFallback.executarEntrada({
        itemId: 'item-sem-1',
        quantidade: 10,
      });
      assert.equal(entrada.saldoResultante, 30);

      const lote = await servicoFallback.executarBaixaLote({
        colaboradorId: 'colab-1',
        itens: [{ itemId: 'item-sem-1', quantidade: 5 }],
      });
      assert.equal(lote.length, 1);
      assert.equal(lote[0].saldoResultante, 25);
    });
  });

  describe('Regressões de integridade de saldo', () => {
    it('baixa em lote com o mesmo item repetido debita a soma das quantidades', async () => {
      const resultado = await service.executarBaixaLote({
        colaboradorId: 'colab-1',
        itens: [
          { itemId: 'item-1', quantidade: 3 },
          { itemId: 'item-1', quantidade: 4 },
        ],
      });
      assert.equal(resultado.length, 2);
      assert.equal(resultado[0].saldoResultante, 47);
      assert.equal(resultado[1].saldoAnterior, 47);
      assert.equal(resultado[1].saldoResultante, 43);
      const item = await repo.buscarItemPorId('item-1');
      assert.equal(item?.estoqueAtual, 43);
    });

    it('baixa em lote com item repetido recusa quando a soma excede o saldo', async () => {
      await assert.rejects(
        () =>
          service.executarBaixaLote({
            colaboradorId: 'colab-1',
            itens: [
              { itemId: 'item-2', quantidade: 2 },
              { itemId: 'item-2', quantidade: 2 },
            ],
          }),
        LoteEstoqueInsuficienteError
      );
      const item = await repo.buscarItemPorId('item-2');
      assert.equal(item?.estoqueAtual, 3);
    });

    it('não permite estornar a mesma movimentação duas vezes', async () => {
      const mov = await service.executarBaixaInterna({
        itemId: 'item-1',
        quantidade: 5,
        colaboradorId: 'colab-1',
      });
      await service.executarEstorno(mov.id, 'Lançado errado');
      await assert.rejects(() => service.executarEstorno(mov.id, 'De novo'));
      const item = await repo.buscarItemPorId('item-1');
      assert.equal(item?.estoqueAtual, 50);
    });
  });
});
