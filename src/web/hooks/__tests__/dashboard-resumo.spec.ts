import { describe, it } from 'node:test';
import assert from 'node:assert';
import { calcularStatusCriticidade } from '@/web/data/mock-almoxarifado';

describe('Hub Inicial — Lógica de Alertas e Atenção Prioritária', () => {
  it('deve classificar como crítico (crit) itens com saldo <= 50% do estoque mínimo', () => {
    assert.strictEqual(calcularStatusCriticidade(5, 20), 'crit');
    assert.strictEqual(calcularStatusCriticidade(10, 20), 'crit');
    assert.strictEqual(calcularStatusCriticidade(0, 10), 'crit');
  });

  it('deve classificar como atenção (low) itens com saldo <= estoque mínimo mas > 50%', () => {
    assert.strictEqual(calcularStatusCriticidade(12, 20), 'low');
    assert.strictEqual(calcularStatusCriticidade(20, 20), 'low');
  });

  it('deve classificar como normal (ok) itens com saldo estritamente superior ao mínimo', () => {
    assert.strictEqual(calcularStatusCriticidade(21, 20), 'ok');
    assert.strictEqual(calcularStatusCriticidade(100, 20), 'ok');
  });

  it('deve ordenar o ranking de atenção pela menor proporção atual / mínimo', () => {
    const itens = [
      { id: '1', nome: 'Item A', atual: 14, min: 20 }, // 14/20 = 0.70
      { id: '2', nome: 'Item B', atual: 0, min: 10 },  // 0/10 = 0.00 (mais crítico)
      { id: '3', nome: 'Item C', atual: 5, min: 20 },  // 5/20 = 0.25
      { id: '4', nome: 'Item D', atual: 2, min: 20 },  // 2/20 = 0.10
    ];

    const ordenados = [...itens]
      .sort((a, b) => a.atual / a.min - b.atual / b.min)
      .slice(0, 6);

    assert.strictEqual(ordenados[0].id, '2'); // 0.00
    assert.strictEqual(ordenados[1].id, '4'); // 0.10
    assert.strictEqual(ordenados[2].id, '3'); // 0.25
    assert.strictEqual(ordenados[3].id, '1'); // 0.70
  });
});
