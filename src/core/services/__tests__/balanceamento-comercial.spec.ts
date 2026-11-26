import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { classificarBalanceamentoComercial } from '../estoque-calculator';

describe('Balanceamento comercial (vender x produzir)', () => {
  it('recomenda produzir quando o saldo está no mínimo ou abaixo', () => {
    const r = classificarBalanceamentoComercial(8, 10, 0);
    assert.equal(r.recomendacao, 'produzir');
    assert.equal(r.quantidadeProduzir, 2);
    assert.equal(r.quantidadeExcedente, 0);
  });

  it('recomenda produzir quando a demanda do período consumiria a margem de segurança', () => {
    // 25 - 20 = 5 <= 10 (mínimo): alta procura
    const r = classificarBalanceamentoComercial(25, 10, 20);
    assert.equal(r.recomendacao, 'produzir');
    assert.equal(r.saldoAlvo, 30);
    assert.equal(r.quantidadeProduzir, 5);
  });

  it('prioriza produzir sobre vender mesmo com saldo alto se a procura for maior', () => {
    const r = classificarBalanceamentoComercial(40, 10, 35);
    assert.equal(r.recomendacao, 'produzir');
    assert.equal(r.quantidadeProduzir, 5);
  });

  it('recomenda vender quando o saldo atinge 3x o mínimo', () => {
    const r = classificarBalanceamentoComercial(30, 10, 0);
    assert.equal(r.recomendacao, 'vender');
    assert.equal(r.quantidadeExcedente, 20);
    assert.equal(r.quantidadeProduzir, 0);
  });

  it('recomenda vender com saldo >= 2x o mínimo e giro abaixo de 10%', () => {
    const r = classificarBalanceamentoComercial(22, 10, 1);
    assert.equal(r.recomendacao, 'vender');
    assert.equal(r.quantidadeExcedente, 11);
  });

  it('mantém equilibrado com saldo >= 2x o mínimo quando o item gira', () => {
    const r = classificarBalanceamentoComercial(22, 10, 5);
    assert.equal(r.recomendacao, 'equilibrado');
    assert.equal(r.quantidadeExcedente, 0);
    assert.equal(r.quantidadeProduzir, 0);
  });

  it('mantém equilibrado entre o mínimo e 2x o mínimo sem alta procura', () => {
    assert.equal(classificarBalanceamentoComercial(15, 10, 0).recomendacao, 'equilibrado');
  });

  it('não acusa excesso quando o item não tem mínimo cadastrado', () => {
    assert.equal(classificarBalanceamentoComercial(500, 0, 0).recomendacao, 'equilibrado');
  });

  it('trata saldo zerado como produzir, com giro zero', () => {
    const r = classificarBalanceamentoComercial(0, 0, 3);
    assert.equal(r.recomendacao, 'produzir');
    assert.equal(r.quantidadeProduzir, 3);
    assert.equal(r.giro, 0);
  });
});
