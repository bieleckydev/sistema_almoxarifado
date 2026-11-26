import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parsearSetoresDestinoExtras } from '../setores-destino';

describe('parsearSetoresDestinoExtras', () => {
  it('separa por vírgula, ponto e vírgula ou quebra de linha', () => {
    assert.deepEqual(parsearSetoresDestinoExtras('Pintura, Usinagem;Filial Sul\nQualidade'), [
      { rotulo: 'Pintura' },
      { rotulo: 'Usinagem' },
      { rotulo: 'Filial Sul' },
      { rotulo: 'Qualidade' },
    ]);
  });

  it('ignora entradas vazias ou curtas demais', () => {
    assert.deepEqual(parsearSetoresDestinoExtras(' , x ,; '), []);
    assert.deepEqual(parsearSetoresDestinoExtras(undefined), []);
  });
});
