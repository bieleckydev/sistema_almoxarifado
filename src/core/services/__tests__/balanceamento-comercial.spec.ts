import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { classificarBalanceamentoComercial } from '../estoque-calculator';

describe('Balanceamento comercial (vender x produzir)', () => {
  it('recomenda produzir quando o saldo está no mínimo ou abaixo', () => {
    const r = classificarBalanceamentoComercial(8, 10, 0, 30);
    assert.equal(r.recomendacao, 'produzir');
    assert.equal(r.quantidadeProduzir, 2);
    assert.equal(r.quantidadeExcedente, 0);
  });

  it('recomenda produzir com giro alto (cobertura de até 30 dias)', () => {
    // 1 un/dia -> 25 dias de cobertura; alvo = 10 + 30
    const r = classificarBalanceamentoComercial(25, 10, 30, 30);
    assert.equal(r.recomendacao, 'produzir');
    assert.equal(r.giro, 'alto');
    assert.equal(r.coberturaDias, 25);
    assert.equal(r.saldoAlvo, 40);
    assert.equal(r.quantidadeProduzir, 15);
  });

  it('prioriza produzir sobre vender mesmo com saldo acima de 3x o mínimo', () => {
    const r = classificarBalanceamentoComercial(40, 10, 60, 30);
    assert.equal(r.recomendacao, 'produzir');
    assert.equal(r.quantidadeProduzir, 30);
  });

  it('recomenda vender quando o saldo atinge 3x o mínimo', () => {
    const r = classificarBalanceamentoComercial(30, 10, 0, 30);
    assert.equal(r.recomendacao, 'vender');
    assert.equal(r.quantidadeExcedente, 20);
    assert.equal(r.quantidadeProduzir, 0);
  });

  it('recomenda vender com saldo >= 2x o mínimo e giro lento', () => {
    // 0,1 un/dia -> 220 dias de cobertura (lento); alvo = 10 + 3
    const r = classificarBalanceamentoComercial(22, 10, 3, 30);
    assert.equal(r.recomendacao, 'vender');
    assert.equal(r.giro, 'lento');
    assert.equal(r.quantidadeExcedente, 9);
  });

  it('mantém equilibrado com saldo >= 2x o mínimo quando o giro é regular', () => {
    const r = classificarBalanceamentoComercial(22, 10, 10, 30);
    assert.equal(r.recomendacao, 'equilibrado');
    assert.equal(r.giro, 'regular');
    assert.equal(r.quantidadeExcedente, 0);
    assert.equal(r.quantidadeProduzir, 0);
  });

  it('mantém equilibrado entre o mínimo e 2x o mínimo, mesmo parado', () => {
    assert.equal(classificarBalanceamentoComercial(15, 10, 0, 30).recomendacao, 'equilibrado');
  });

  it('não acusa excesso quando o item não tem mínimo cadastrado', () => {
    assert.equal(classificarBalanceamentoComercial(500, 0, 0, 30).recomendacao, 'equilibrado');
  });

  it('trata saldo zerado como produzir, com cobertura zero', () => {
    const r = classificarBalanceamentoComercial(0, 0, 3, 30);
    assert.equal(r.recomendacao, 'produzir');
    assert.equal(r.quantidadeProduzir, 3);
    assert.equal(r.coberturaDias, 0);
  });

  it('normaliza as saídas pela duração da janela', () => {
    // As mesmas 7 saídas: em 7 dias é alta procura; em 365 dias é giro lento.
    assert.equal(classificarBalanceamentoComercial(25, 10, 7, 7).recomendacao, 'produzir');
    assert.equal(classificarBalanceamentoComercial(25, 10, 7, 365).recomendacao, 'vender');
  });

  it('trata janela não positiva como um dia', () => {
    assert.deepEqual(
      classificarBalanceamentoComercial(25, 10, 7, 0),
      classificarBalanceamentoComercial(25, 10, 7, 1)
    );
  });
});
