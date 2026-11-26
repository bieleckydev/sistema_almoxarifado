import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { aceitaFracao, parsearQuantidade } from '../QuantidadeStepper';

describe('Quantidade do pedido', () => {
  it('aceita fração só em unidades de medida contínua', () => {
    assert.equal(aceitaFracao('KG'), true);
    assert.equal(aceitaFracao('metro'), true);
    assert.equal(aceitaFracao('UNIDADE'), false);
    assert.equal(aceitaFracao('PECA'), false);
  });

  it('interpreta vírgula decimal e arredonda para 3 casas', () => {
    assert.equal(parsearQuantidade('1,5', true), 1.5);
    assert.equal(parsearQuantidade('2,12345', true), 2.123);
    assert.equal(parsearQuantidade('1.5', true), 1.5);
    assert.equal(parsearQuantidade('1.250,5', true), 1250.5);
  });

  it('arredonda para inteiro em unidades discretas', () => {
    assert.equal(parsearQuantidade('2,6', false), 3);
    assert.equal(parsearQuantidade('0,2', false), 1);
  });

  it('rejeita vazio, zero, negativo e texto', () => {
    for (const texto of ['', '0', '-3', 'abc']) {
      assert.equal(parsearQuantidade(texto, true), null, texto);
    }
  });
});
