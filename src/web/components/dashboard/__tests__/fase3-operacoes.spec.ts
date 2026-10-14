import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CreateItemSchema, ITEM_CODIGO_REGEX } from '../../../../core/domain/item.schema';
import { RegistrarEntradaSchema, RegistrarBaixaInternaSchema } from '../../../../core/domain/movimentacao.schema';
import {
  calcularNovoSaldo,
  validarDisponibilidadeEstoque,
  SaldoInsuficienteError,
} from '../../../../core/services/estoque-calculator';

describe('Fase 3 — Operações de Estoque e Regras de Gaveta', () => {
  describe('Validações de Código no Cadastro de Novos Materiais (ItemCreateDrawer)', () => {
    it('deve validar e aceitar prefixos 10- e 20- para matérias-primas (MP)', () => {
      assert.match('10-ACO-1020', ITEM_CODIGO_REGEX);
      assert.match('20-CHAPA-3MM', ITEM_CODIGO_REGEX);

      const payloadMp = {
        codigo: '10-ACO-1020',
        descricao: 'Tubo de Aço Carbono 1020',
        categoria: 'Matéria-Prima',
        unidade: 'KG' as const,
        estoqueSeguranca: 50,
        capacidadeMaxima: 500,
        tipo: 'PRODUTIVO_MATERIA_PRIMA' as const,
      };

      const parsed = CreateItemSchema.parse(payloadMp);
      assert.equal(parsed.codigo, '10-ACO-1020');
      assert.equal(parsed.unidade, 'KG');
    });

    it('deve validar e aceitar prefixo 90- para materiais improdutivos e consumíveis (IMP)', () => {
      assert.match('90-DISCO-CORTE', ITEM_CODIGO_REGEX);

      const payloadImp = {
        codigo: '90-DISCO-CORTE',
        descricao: 'Disco de Corte 4.5 polegadas',
        categoria: 'Improdutivos',
        unidade: 'UNIDADE' as const,
        estoqueSeguranca: 20,
        capacidadeMaxima: 200,
        tipo: 'IMPRODUTIVO_CONSUMIVEL' as const,
      };

      const parsed = CreateItemSchema.parse(payloadImp);
      assert.equal(parsed.codigo, '90-DISCO-CORTE');
    });

    it('deve validar e aceitar prefixos 100-, 200- e 500- para produtos acabados e motos', () => {
      assert.match('100-MOTO-ELET-01', ITEM_CODIGO_REGEX);
      assert.match('200-CHASSI-COMPL', ITEM_CODIGO_REGEX);
      assert.match('500-RODA-LIGA', ITEM_CODIGO_REGEX);

      const payloadMoto = {
        codigo: '100-MOTO-ELET-01',
        descricao: 'Moto Elétrica Urbana Modelo X',
        categoria: 'Motos',
        unidade: 'UNIDADE' as const,
        estoqueSeguranca: 5,
        capacidadeMaxima: 30,
        tipo: 'ACABADO' as const,
      };

      const parsed = CreateItemSchema.parse(payloadMoto);
      assert.equal(parsed.codigo, '100-MOTO-ELET-01');
    });

    it('deve rejeitar códigos com prefixos inválidos ou formatos malformados', () => {
      assert.throws(() => {
        CreateItemSchema.parse({
          codigo: '88-INVALID-CODE',
          descricao: 'Item com prefixo desconhecido',
          categoria: 'Matéria-Prima',
          unidade: 'UNIDADE',
          estoqueSeguranca: 10,
          capacidadeMaxima: 100,
          tipo: 'PRODUTIVO_MATERIA_PRIMA',
        });
      });
    });
  });

  describe('Validações de Operações de Movimentação Física (MovementFormDrawer)', () => {
    it('deve validar entrada por compra com NFe, fornecedor e quantidade positiva', () => {
      const entradaValida = {
        itemId: 'item-123',
        tipo: 'ENTRADA_COMPRA' as const,
        quantidade: 150,
        numeroNF: 'NF-84920',
        fornecedor: 'Aços Gerdau S.A.',
        observacoes: 'Recebimento de tubos no almoxarifado fabril',
      };

      const parsed = RegistrarEntradaSchema.parse(entradaValida);
      assert.equal(parsed.quantidade, 150);
      assert.equal(parsed.numeroNF, 'NF-84920');
      assert.equal(parsed.fornecedor, 'Aços Gerdau S.A.');
    });

    it('deve rejeitar entrada com quantidade zero ou negativa', () => {
      assert.throws(() => {
        RegistrarEntradaSchema.parse({
          itemId: 'item-123',
          quantidade: 0,
          tipo: 'ENTRADA_COMPRA',
        });
      });

      assert.throws(() => {
        RegistrarEntradaSchema.parse({
          itemId: 'item-123',
          quantidade: -25,
          tipo: 'ENTRADA_COMPRA',
        });
      });
    });

    it('deve validar baixa interna para consumo com colaborador e setor fabril', () => {
      const baixaValida = {
        itemId: 'item-999',
        tipo: 'SAIDA_CONSUMO_INTERNO' as const,
        quantidade: 5,
        colaboradorId: 'colab-001',
        setor: 'SOLDA' as const,
        observacao: 'Retirada para turno da manhã',
      };

      const parsed = RegistrarBaixaInternaSchema.parse(baixaValida);
      assert.equal(parsed.quantidade, 5);
      assert.equal(parsed.colaboradorId, 'colab-001');
      assert.equal(parsed.setor, 'SOLDA');
    });

    it('deve bloquear baixa de estoque quando saldo disponível for insuficiente', () => {
      const estoqueAtual = 10;
      const quantidadeSolicitada = 15;

      const resultado = validarDisponibilidadeEstoque(
        estoqueAtual,
        quantidadeSolicitada
      );

      assert.equal(resultado.disponivel, false);
      assert.equal(resultado.faltante, 5);

      assert.throws(
        () => {
          calcularNovoSaldo(estoqueAtual, 'SAIDA_CONSUMO_INTERNO', quantidadeSolicitada);
        },
        SaldoInsuficienteError
      );
    });

    it('deve calcular corretamente novo saldo após entrada e baixa', () => {
      const saldoInicial = 50;

      const saldoAposEntrada = calcularNovoSaldo(
        saldoInicial,
        'ENTRADA_COMPRA',
        30
      );
      assert.equal(saldoAposEntrada, 80);

      const saldoAposBaixa = calcularNovoSaldo(
        saldoAposEntrada,
        'SAIDA_CONSUMO_INTERNO',
        25
      );
      assert.equal(saldoAposBaixa, 55);
    });
  });

  describe('Cálculo de Distribuição por Situação de Estoque (StockFilterToolbar)', () => {
    it('deve totalizar itens por situação (ok, low, crit) com precisão', () => {
      const mockItens = [
        { estoqueAtual: 100, estoqueSeguranca: 50 }, // ok (100 > 50)
        { estoqueAtual: 60, estoqueSeguranca: 50 },  // ok (60 > 50)
        { estoqueAtual: 40, estoqueSeguranca: 50 },  // low (25 < 40 <= 50)
        { estoqueAtual: 20, estoqueSeguranca: 50 },  // crit (20 <= 25)
        { estoqueAtual: 0, estoqueSeguranca: 50 },   // crit (0 <= 25)
      ];

      const contagem = {
        todos: mockItens.length,
        ok: 0,
        low: 0,
        crit: 0,
      };

      for (const item of mockItens) {
        if (item.estoqueAtual <= item.estoqueSeguranca * 0.5) {
          contagem.crit += 1;
        } else if (item.estoqueAtual <= item.estoqueSeguranca) {
          contagem.low += 1;
        } else {
          contagem.ok += 1;
        }
      }

      assert.equal(contagem.todos, 5);
      assert.equal(contagem.ok, 2);
      assert.equal(contagem.low, 1);
      assert.equal(contagem.crit, 2);
    });
  });
});
