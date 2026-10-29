import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  MovimentacaoService,
  ItemNaoEncontradoError,
  ItemInativoError,
  ColaboradorNaoEncontradoError,
  ColaboradorInativoError,
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

    it('deve recalcular e persistir o custo médio ponderado quando valorUnitario for informado', async () => {
      // Configura item inicial com 10 un a R$ 50,00
      const itemInicial = await repo.buscarItemPorId('item-2');
      assert.ok(itemInicial);
      await repo.salvarItem({
        ...itemInicial,
        estoqueAtual: 10,
        custoUnitario: 50,
      });

      // Entrada de 10 un a R$ 100,00
      // Custo médio esperado: ((10 * 50) + (10 * 100)) / 20 = 1500 / 20 = R$ 75,00
      await service.executarEntrada({
        itemId: 'item-2',
        tipo: 'ENTRADA_COMPRA',
        quantidade: 10,
        valorUnitario: 100,
        fornecedor: 'Fornecedor Aço Nobre',
      });

      const itemAtualizado = await repo.buscarItemPorId('item-2');
      assert.equal(itemAtualizado?.estoqueAtual, 20);
      assert.equal(itemAtualizado?.custoUnitario, 75);
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

    it('deve processar ajuste de inventário em lote para múltiplos itens', async () => {
      const resultado = await service.executarAjusteInventarioLote([
        {
          itemId: 'item-1',
          tipo: 'AJUSTE_INVENTARIO_POSITIVO',
          quantidade: 10,
          motivo: 'Sobra física na contagem',
          responsavelId: 'user-admin',
        },
        {
          itemId: 'item-2',
          tipo: 'AJUSTE_INVENTARIO_NEGATIVO',
          quantidade: 1,
          motivo: 'Quebra física na contagem',
          responsavelId: 'user-admin',
        },
      ]);

      assert.equal(resultado.length, 2);
      assert.equal(resultado[0].tipo, 'AJUSTE_INVENTARIO_POSITIVO');
      assert.equal(resultado[0].saldoResultante, 60); // 50 + 10
      assert.equal(resultado[1].tipo, 'AJUSTE_INVENTARIO_NEGATIVO');
      assert.equal(resultado[1].saldoResultante, 2); // 3 - 1

      const item1 = await repo.buscarItemPorId('item-1');
      const item2 = await repo.buscarItemPorId('item-2');
      assert.equal(item1?.estoqueAtual, 60);
      assert.equal(item2?.estoqueAtual, 2);
    });
  });

  describe('Delegação e Fallback de Transações Atômicas', () => {
    it('deve utilizar registrarMovimentacaoComSaldo e registrarOperacoesAtomicas quando disponíveis no repositório', async () => {
      let chamouComSaldo = false;
      let chamouOperacoesAtomicas = false;

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

      const origOperacoesAtomicas = repoEspiao.registrarOperacoesAtomicas.bind(repoEspiao);
      repoEspiao.registrarOperacoesAtomicas = async (ops) => {
        chamouOperacoesAtomicas = true;
        return origOperacoesAtomicas(ops);
      };

      const servicoComEspiao = new MovimentacaoService(repoEspiao);

      // 1. Testa entrada delegando para transação atômica
      await servicoComEspiao.executarEntrada({
        itemId: 'item-espiao-1',
        quantidade: 10,
      });
      assert.equal(chamouComSaldo, true);

      // 2. Testa ajuste em lote delegando para operações atômicas
      await servicoComEspiao.executarAjusteInventarioLote([
        {
          itemId: 'item-espiao-1',
          tipo: 'AJUSTE_INVENTARIO_POSITIVO',
          quantidade: 5,
          motivo: 'Ajuste espiao',
          responsavelId: 'user-1',
        },
      ]);
      assert.equal(chamouOperacoesAtomicas, true);
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
      delete (repoSemAtomico as any).registrarOperacoesAtomicas;

      const servicoFallback = new MovimentacaoService(repoSemAtomico);

      const entrada = await servicoFallback.executarEntrada({
        itemId: 'item-sem-1',
        quantidade: 10,
      });
      assert.equal(entrada.saldoResultante, 30);

      const ajustes = await servicoFallback.executarAjusteInventarioLote([
        {
          itemId: 'item-sem-1',
          tipo: 'AJUSTE_INVENTARIO_POSITIVO',
          quantidade: 5,
          motivo: 'Ajuste fallback',
          responsavelId: 'user-1',
        },
      ]);
      assert.equal(ajustes.length, 1);
      assert.equal(ajustes[0].saldoResultante, 35);
    });
  });

  describe('Regressões de integridade de saldo', () => {
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
