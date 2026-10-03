import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calcularNovoSaldo,
  determinarStatusEstoque,
  validarDisponibilidadeEstoque,
  calcularNecessidadeReposicao,
  SaldoInsuficienteError,
  isMovimentacaoEntrada,
  isMovimentacaoSaida,
} from '../estoque-calculator';

describe('2.2 — Regras Puras de Estoque (EstoqueCalculator)', () => {
  it('deve identificar corretamente os tipos de entrada e saída', () => {
    assert.equal(isMovimentacaoEntrada('ENTRADA_COMPRA'), true);
    assert.equal(isMovimentacaoEntrada('ENTRADA_PRODUCAO'), true);
    assert.equal(isMovimentacaoEntrada('AJUSTE_INVENTARIO_POSITIVO'), true);
    assert.equal(isMovimentacaoEntrada('SAIDA_CONSUMO_INTERNO'), false);

    assert.equal(isMovimentacaoSaida('SAIDA_CONSUMO_INTERNO'), true);
    assert.equal(isMovimentacaoSaida('SAIDA_EXPEDICAO'), true);
    assert.equal(isMovimentacaoSaida('AJUSTE_INVENTARIO_NEGATIVO'), true);
    assert.equal(isMovimentacaoSaida('ENTRADA_COMPRA'), false);
  });

  it('deve somar saldo em operações de entrada (compra, produção, ajuste positivo)', () => {
    assert.equal(calcularNovoSaldo(100, 'ENTRADA_COMPRA', 50), 150);
    assert.equal(calcularNovoSaldo(200, 'ENTRADA_PRODUCAO', 80), 280);
    assert.equal(calcularNovoSaldo(50.5, 'AJUSTE_INVENTARIO_POSITIVO', 12.25), 62.75);
  });

  it('deve subtrair saldo em operações de saída (consumo, expedição, ajuste negativo)', () => {
    assert.equal(calcularNovoSaldo(100, 'SAIDA_CONSUMO_INTERNO', 30), 70);
    assert.equal(calcularNovoSaldo(500, 'SAIDA_EXPEDICAO', 200), 300);
    assert.equal(calcularNovoSaldo(100, 'AJUSTE_INVENTARIO_NEGATIVO', 15), 85);
  });

  it('deve lançar SaldoInsuficienteError em caso de saldo insuficiente (política estrita)', () => {
    assert.throws(
      () => calcularNovoSaldo(20, 'SAIDA_CONSUMO_INTERNO', 25, { itemId: 'item-90-1105' }),
      (err: unknown) => {
        assert(err instanceof SaldoInsuficienteError);
        assert.equal(err.name, 'SaldoInsuficienteError');
        assert.equal(err.saldoAtual, 20);
        assert.equal(err.quantidadeSolicitada, 25);
        assert.equal(err.saldoInsuficienteEm, 5);
        assert.equal(err.itemId, 'item-90-1105');
        return true;
      }
    );
  });

  it('deve permitir saldo negativo se a opção permitirSaldoNegativo estiver habilitada', () => {
    const saldo = calcularNovoSaldo(10, 'SAIDA_EXPEDICAO', 25, {
      permitirSaldoNegativo: true,
    });
    assert.equal(saldo, -15);
  });

  it('deve rejeitar movimentações com quantidade <= 0', () => {
    assert.throws(() => calcularNovoSaldo(100, 'ENTRADA_COMPRA', 0));
    assert.throws(() => calcularNovoSaldo(100, 'SAIDA_CONSUMO_INTERNO', -10));
  });

  it('deve classificar status de estoque corretamente (determinarStatusEstoque)', () => {
    const estoqueSeguranca = 50;

    // Saldo zerado ou negativo
    assert.equal(determinarStatusEstoque(0, estoqueSeguranca), 'CRITICO_ZERADO');
    assert.equal(determinarStatusEstoque(-5, estoqueSeguranca), 'CRITICO_ZERADO');

    // Saldo abaixo ou igual ao estoque de segurança
    assert.equal(determinarStatusEstoque(50, estoqueSeguranca), 'ESTOQUE_BAIXO');
    assert.equal(determinarStatusEstoque(12, estoqueSeguranca), 'ESTOQUE_BAIXO');

    // Saldo saudável / normal
    assert.equal(determinarStatusEstoque(50.01, estoqueSeguranca), 'NORMAL');
    assert.equal(determinarStatusEstoque(150, estoqueSeguranca), 'NORMAL');
  });

  it('deve validar disponibilidade de estoque sem lançar exceções', () => {
    // Caso suficiente
    const ok = validarDisponibilidadeEstoque(100, 40);
    assert.equal(ok.disponivel, true);
    assert.equal(ok.saldoRestante, 60);
    assert.equal(ok.faltante, 0);

    // Caso insuficiente
    const fail = validarDisponibilidadeEstoque(30, 50);
    assert.equal(fail.disponivel, false);
    assert.equal(fail.saldoRestante, 0);
    assert.equal(fail.faltante, 20);
  });

  it('deve calcular necessidade e sugestão de reposição de estoque', () => {
    // Normal: não precisa repor
    const repNormal = calcularNecessidadeReposicao(100, 50, 20);
    assert.equal(repNormal.precisaRepor, false);
    assert.equal(repNormal.quantidadeSugerida, 0);
    assert.equal(repNormal.status, 'NORMAL');

    // Baixo: precisa repor para atingir segurança + lote
    // saldo 20, seguranca 50 -> deficit = 30 + lote 100 = 130
    const repBaixo = calcularNecessidadeReposicao(20, 50, 100);
    assert.equal(repBaixo.precisaRepor, true);
    assert.equal(repBaixo.quantidadeSugerida, 130);
    assert.equal(repBaixo.status, 'ESTOQUE_BAIXO');

    // Crítico/Zerado: saldo 0, seguranca 50, lote 0 -> 50
    const repCritico = calcularNecessidadeReposicao(0, 50, 0);
    assert.equal(repCritico.precisaRepor, true);
    assert.equal(repCritico.quantidadeSugerida, 50);
    assert.equal(repCritico.status, 'CRITICO_ZERADO');
  });
});
