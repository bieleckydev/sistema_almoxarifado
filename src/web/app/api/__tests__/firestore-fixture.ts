import { FakeFirestore } from '@/server/testing/fake-firestore';
import { MemoryAuditoriaRepository } from '@/core/services/auditoria.service';
import { setAuditoriaRepository, setServerDb } from '../api-helpers';
import {
  CLIENTES_INICIAIS,
  PEDIDOS_INICIAIS,
  NOTAS_INICIAIS,
  MATERIAIS_TERCEIROS_INICIAIS,
  MOVIMENTACOES_TERCEIROS_INICIAIS,
} from '@/web/data/mock-almoxarifado';

/**
 * Cria um Firestore em memória populado com os dados de demonstração e o instala
 * como banco do servidor e repositório de auditoria das rotas.
 */
export function instalarFirestoreDeTeste(): FakeFirestore {
  const db = new FakeFirestore();
  const limpar = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

  db.seed('clients', limpar(CLIENTES_INICIAIS));
  db.seed('orders', limpar(PEDIDOS_INICIAIS));
  db.seed('invoices', limpar(NOTAS_INICIAIS));
  db.seed('third_party_materials', limpar(MATERIAIS_TERCEIROS_INICIAIS));
  db.seed('third_party_movements', limpar(MOVIMENTACOES_TERCEIROS_INICIAIS));
  db.seed('items', [
    { id: 'item-1', codigo: '10-0001', descricao: 'Item de teste 1', unidade: 'UNIDADE', estoqueAtual: 100, ativo: true },
    { id: 'item-2', codigo: '10-0002', descricao: 'Item de teste 2', unidade: 'UNIDADE', estoqueAtual: 3, ativo: true },
    { id: 'item-3', codigo: '10-0003', descricao: 'Item de teste 3', unidade: 'UNIDADE', estoqueAtual: 40, ativo: true },
  ]);

  setServerDb(db);
  setAuditoriaRepository(new MemoryAuditoriaRepository());
  return db;
}

export function desinstalarFirestoreDeTeste(): void {
  setServerDb(null);
  setAuditoriaRepository(null);
}
