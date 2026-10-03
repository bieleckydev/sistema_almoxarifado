import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  MOVIMENTACAO_QUERY_KEYS,
  setGlobalEstoqueRepository,
  getGlobalMovimentacaoService,
} from '../useMovimentacao';
import { MemoryEstoqueRepository } from '../../storage/memory-estoque.adapter';

describe('2.5 — Custom Hooks Agnósticos (useMovimentacao)', () => {
  it('deve gerar chaves de cache hierárquicas corretas para o TanStack Query', () => {
    assert.deepEqual(MOVIMENTACAO_QUERY_KEYS.all, ['movimentacoes']);
    assert.deepEqual(MOVIMENTACAO_QUERY_KEYS.itens, ['itens']);
    assert.deepEqual(MOVIMENTACAO_QUERY_KEYS.item('item-10-3812'), ['itens', 'item-10-3812']);
    assert.deepEqual(MOVIMENTACAO_QUERY_KEYS.extrato('item-90-1105'), [
      'movimentacoes',
      'extrato',
      'item-90-1105',
    ]);
    assert.deepEqual(MOVIMENTACAO_QUERY_KEYS.colaboradores, ['colaboradores']);
  });

  it('deve permitir configurar repositório global para os hooks', () => {
    const customRepo = new MemoryEstoqueRepository();
    setGlobalEstoqueRepository(customRepo);
    const service = getGlobalMovimentacaoService();
    assert(service !== null);
  });
});
