import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CATEGORIAS_ESTOQUE,
  CATEGORIA_ESTOQUE_LABELS,
  CategoriaEstoqueSchema,
  TIPO_ITEM_POR_CATEGORIA,
  categoriaEstoqueDoTipo,
} from '../categoria-estoque';

describe('Categorias oficiais de estoque', () => {
  it('expõe as três categorias na ordem canônica', () => {
    assert.deepEqual([...CATEGORIAS_ESTOQUE], ['mp', 'imp', 'motos']);
    assert.equal(CATEGORIA_ESTOQUE_LABELS.mp, 'Matéria-Prima');
    assert.equal(CATEGORIA_ESTOQUE_LABELS.imp, 'Materiais Improdutivos');
    assert.equal(CATEGORIA_ESTOQUE_LABELS.motos, 'Peças de Motos');
  });

  it('rejeita categorias fora do catálogo', () => {
    assert.throws(() => CategoriaEstoqueSchema.parse('acabado'));
  });

  it('mapeia tipo de item para categoria e de volta', () => {
    for (const categoria of CATEGORIAS_ESTOQUE) {
      assert.equal(categoriaEstoqueDoTipo(TIPO_ITEM_POR_CATEGORIA[categoria]), categoria);
    }
  });

  it('trata tipo ausente ou desconhecido como matéria-prima', () => {
    assert.equal(categoriaEstoqueDoTipo(undefined), 'mp');
    assert.equal(categoriaEstoqueDoTipo('LEGADO'), 'mp');
  });
});
