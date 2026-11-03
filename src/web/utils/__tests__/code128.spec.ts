import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CODE128_PADROES,
  modulosCode128,
  podeCodificarCode128,
  simbolosCode128,
} from '../code128';

describe('Code 128 (conjunto B)', () => {
  it('tabela tem 107 padrões únicos com larguras e paridade válidas', () => {
    assert.equal(CODE128_PADROES.length, 107);
    assert.equal(new Set(CODE128_PADROES).size, 107);

    CODE128_PADROES.forEach((padrao, valor) => {
      const larguras = Array.from(padrao, Number);
      const total = larguras.reduce((a, b) => a + b, 0);
      // Símbolos de dados ocupam 11 módulos; a parada ocupa 13.
      assert.equal(total, valor === 106 ? 13 : 11, `largura do símbolo ${valor}`);
      // Em todo símbolo a soma das barras é par (propriedade de paridade do Code 128).
      const barras = larguras.filter((_, i) => i % 2 === 0).reduce((a, b) => a + b, 0);
      assert.equal(barras % 2, 0, `paridade do símbolo ${valor}`);
    });
  });

  it('calcula start B, dados, verificador e stop', () => {
    // "AB": A=33, B=34 → (104 + 33·1 + 34·2) % 103 = 205 % 103 = 102
    assert.deepEqual(simbolosCode128('AB'), [104, 33, 34, 102, 106]);
    // "PJJ123C": 104 + 48·1 + 42·2 + 42·3 + 17·4 + 18·5 + 19·6 + 35·7 = 879 → 879 % 103 = 55
    assert.equal(simbolosCode128('PJJ123C').at(-2), 55);
  });

  it('gera módulos coerentes com o número de símbolos', () => {
    const texto = 'MP-0042';
    const modulos = modulosCode128(texto);
    const totalModulos = modulos.reduce((a, b) => a + b, 0);
    // start + dados + verificador = 11 cada; stop = 13
    assert.equal(totalModulos, (texto.length + 2) * 11 + 13);
    // começa e termina com barra (quantidade ímpar de elementos)
    assert.equal(modulos.length % 2, 1);
  });

  it('rejeita textos fora do conjunto B', () => {
    assert.equal(podeCodificarCode128(''), false);
    assert.equal(podeCodificarCode128('PEÇA-1'), false);
    assert.equal(podeCodificarCode128('MP-01'), true);
    assert.throws(() => simbolosCode128('Ç'));
  });
});
