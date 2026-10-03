import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  INVENTARIO_QUERY_KEYS,
  configureGlobalInventarioServices,
  getGlobalInventarioService,
  getGlobalFechamentoService,
} from '../useInventario';
import { InventarioService } from '../../services/inventario.service';
import { FechamentoMensalService } from '../../services/fechamento-mensal.service';
import { MovimentacaoService } from '../../services/movimentacao.service';
import { MemoryEstoqueRepository } from '../../storage/memory-estoque.adapter';
import { MemoryInventarioRepository } from '../../storage/inventario.repository.interface';
import { MemoryFechamentoMensalRepository } from '../../storage/fechamento-mensal.repository.interface';

describe('3.4 — Custom Hooks Agnósticos de Inventário (useInventario)', () => {
  it('deve gerar chaves de cache hierárquicas corretas para o TanStack Query', () => {
    assert.deepEqual(INVENTARIO_QUERY_KEYS.all, ['inventarios']);
    assert.deepEqual(INVENTARIO_QUERY_KEYS.sessao('inv-01'), ['inventarios', 'sessao', 'inv-01']);
    assert.deepEqual(INVENTARIO_QUERY_KEYS.divergencias('inv-01'), [
      'inventarios',
      'divergencias',
      'inv-01',
    ]);
    assert.deepEqual(INVENTARIO_QUERY_KEYS.fechamentos, ['fechamentos-mensais']);
    assert.deepEqual(INVENTARIO_QUERY_KEYS.fechamento(2026, 10), [
      'fechamentos-mensais',
      2026,
      10,
    ]);
  });

  it('deve permitir configurar serviços globais customizados para os hooks de inventário', () => {
    const eRepo = new MemoryEstoqueRepository();
    const iRepo = new MemoryInventarioRepository();
    const fRepo = new MemoryFechamentoMensalRepository();
    const movService = new MovimentacaoService(eRepo);

    const invService = new InventarioService(eRepo, iRepo, movService);
    const fechService = new FechamentoMensalService(eRepo, fRepo);

    configureGlobalInventarioServices(invService, fechService);

    assert.equal(getGlobalInventarioService(), invService);
    assert.equal(getGlobalFechamentoService(), fechService);
  });
});
