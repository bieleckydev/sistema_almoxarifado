import type { Firestore, Query, DocumentData } from 'firebase-admin/firestore';
import { IEstoqueRepository } from '@/core/storage/estoque.repository.interface';
import { Item, ItemFiltros } from '@/core/domain/item.schema';
import { Colaborador, ColaboradorFiltros, normalizarMatricula } from '@/core/domain/colaborador.schema';
import { Movimentacao, MovimentacaoFiltros } from '@/core/domain/movimentacao.schema';
import { determinarStatusEstoque } from '@/core/services/estoque-calculator';
import {
  itemFromFirestore,
  itemToFirestore,
  colaboradorFromFirestore,
  colaboradorToFirestore,
  movimentacaoFromFirestore,
  movimentacaoToFirestore,
} from './firestore-estoque.mapper';

/**
 * Implementação de produção do IEstoqueRepository utilizando o Google Cloud Firestore via Firebase Admin SDK.
 * Executada no backend confiável para garantir integridade, auditoria e isolamento de regras.
 */
export class FirestoreEstoqueRepository implements IEstoqueRepository {
  private readonly db: Firestore;

  constructor(db?: Firestore) {
    if (db) {
      this.db = db;
    } else {
      // Lazy import para evitar erro de 'server-only' em suites de teste unitário
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { adminDb } = require('@/server/firebase-admin');
      this.db = adminDb;
    }
  }

  // ==========================================
  // ITENS & CATÁLOGO
  // ==========================================

  async buscarItemPorId(id: string): Promise<Item | null> {
    const docSnap = await this.db.collection('items').doc(id).get();
    if (!docSnap.exists) {
      return null;
    }
    return itemFromFirestore(docSnap.id, docSnap.data() || {});
  }

  async buscarPorCodigo(codigo: string): Promise<Item | null> {
    const upperCode = codigo.trim().toUpperCase();
    const snap = await this.db
      .collection('items')
      .where('codigo', '==', upperCode)
      .limit(1)
      .get();

    if (snap.empty) {
      return null;
    }

    const doc = snap.docs[0];
    return itemFromFirestore(doc.id, doc.data());
  }

  async listarComFiltros(filtros?: ItemFiltros): Promise<{ itens: Item[]; total: number }> {
    let query: Query<DocumentData> = this.db.collection('items');

    if (filtros?.apenasAtivos !== false) {
      query = query.where('ativo', '==', true);
    }

    if (filtros?.tipo) {
      query = query.where('tipo', '==', filtros.tipo);
    }

    if (filtros?.clienteDestino) {
      query = query.where('clienteDestino', '==', filtros.clienteDestino);
    }

    const snap = await query.get();
    let lista: Item[] = snap.docs.map((d) => itemFromFirestore(d.id, d.data()));

    // Filtros em memória (para cálculo reativo e busca textual)
    if (filtros?.statusEstoque) {
      lista = lista.filter((i) => {
        const status = determinarStatusEstoque(i.estoqueAtual, i.estoqueSeguranca);
        return status === filtros.statusEstoque;
      });
    }

    if (filtros?.busca) {
      const q = filtros.busca.toLowerCase();
      lista = lista.filter(
        (i) => i.codigo.toLowerCase().includes(q) || i.descricao.toLowerCase().includes(q)
      );
    }

    const total = lista.length;
    const pagina = filtros?.pagina || 1;
    const limite = filtros?.limite || 20;
    const inicio = (pagina - 1) * limite;
    const itensPaginados = lista.slice(inicio, inicio + limite);

    return { itens: itensPaginados, total };
  }

  async salvarItem(item: Item): Promise<Item> {
    const data = itemToFirestore(item);
    await this.db.collection('items').doc(item.id).set(data, { merge: true });
    return item;
  }

  async atualizarSaldoItem(itemId: string, novoSaldo: number): Promise<void> {
    await this.db.collection('items').doc(itemId).update({
      estoqueAtual: novoSaldo,
      updatedAt: new Date().toISOString(),
    });
  }

  // ==========================================
  // COLABORADORES & OPERADORES
  // ==========================================

  async buscarColaboradorPorId(idOrMatricula: string): Promise<Colaborador | null> {
    // 1. Tenta buscar diretamente pelo ID do documento
    const docSnap = await this.db.collection('collaborators').doc(idOrMatricula).get();
    if (docSnap.exists) {
      return colaboradorFromFirestore(docSnap.id, docSnap.data() || {});
    }

    // 2. Se não encontrou pelo ID, busca pela matrícula normalizada
    const matriculaNorm = normalizarMatricula(idOrMatricula);
    if (matriculaNorm) {
      const querySnap = await this.db
        .collection('collaborators')
        .where('matricula', '==', matriculaNorm)
        .limit(1)
        .get();

      if (!querySnap.empty) {
        const doc = querySnap.docs[0];
        return colaboradorFromFirestore(doc.id, doc.data());
      }
    }

    return null;
  }

  async listarColaboradores(
    filtros?: ColaboradorFiltros
  ): Promise<{ colaboradores: Colaborador[]; total: number }> {
    let query: Query<DocumentData> = this.db.collection('collaborators');

    if (filtros?.apenasAtivos !== false) {
      query = query.where('ativo', '==', true);
    }

    if (filtros?.setor) {
      query = query.where('setor', '==', filtros.setor);
    }

    const snap = await query.get();
    let lista: Colaborador[] = snap.docs.map((d) => colaboradorFromFirestore(d.id, d.data()));

    if (filtros?.busca) {
      const q = filtros.busca.toLowerCase();
      lista = lista.filter(
        (c) =>
          c.nome.toLowerCase().includes(q) ||
          c.matricula.includes(q) ||
          c.funcao.toLowerCase().includes(q)
      );
    }

    const total = lista.length;
    const pagina = filtros?.pagina || 1;
    const limite = filtros?.limite || 20;
    const inicio = (pagina - 1) * limite;
    const paginados = lista.slice(inicio, inicio + limite);

    return { colaboradores: paginados, total };
  }

  async salvarColaborador(colaborador: Colaborador): Promise<Colaborador> {
    const data = colaboradorToFirestore(colaborador);
    await this.db.collection('collaborators').doc(colaborador.id).set(data, { merge: true });
    return colaborador;
  }

  // ==========================================
  // MOVIMENTAÇÕES & AUDITORIA
  // ==========================================

  async registrarMovimentacao(movimentacao: Movimentacao): Promise<Movimentacao> {
    const data = movimentacaoToFirestore(movimentacao);
    await this.db.collection('movements').doc(movimentacao.id).set(data);
    return movimentacao;
  }

  async consultarExtratoItem(
    itemId: string,
    filtros?: MovimentacaoFiltros
  ): Promise<Movimentacao[]> {
    let query: Query<DocumentData> = this.db
      .collection('movements')
      .where('itemId', '==', itemId);

    if (filtros?.tipo) {
      query = query.where('tipo', '==', filtros.tipo);
    }

    const snap = await query.get();
    let lista: Movimentacao[] = snap.docs.map((d) =>
      movimentacaoFromFirestore(d.id, d.data())
    );

    // Filtros por data
    if (filtros?.dataInicio) {
      lista = lista.filter((m) => m.dataMovimentacao >= filtros.dataInicio!);
    }
    if (filtros?.dataFim) {
      lista = lista.filter((m) => m.dataMovimentacao <= filtros.dataFim!);
    }

    // Ordenação decrescente (mais recente primeiro)
    lista.sort((a, b) => b.dataMovimentacao.localeCompare(a.dataMovimentacao));

    if (filtros?.pagina && filtros?.limite) {
      const inicio = (filtros.pagina - 1) * filtros.limite;
      return lista.slice(inicio, inicio + filtros.limite);
    }

    return lista;
  }

  async listarMovimentacoes(
    filtros?: MovimentacaoFiltros
  ): Promise<{ movimentacoes: Movimentacao[]; total: number }> {
    let query: Query<DocumentData> = this.db.collection('movements');

    if (filtros?.itemId) {
      query = query.where('itemId', '==', filtros.itemId);
    }
    if (filtros?.colaboradorId) {
      query = query.where('colaboradorId', '==', filtros.colaboradorId);
    }
    if (filtros?.tipo) {
      query = query.where('tipo', '==', filtros.tipo);
    }

    const snap = await query.get();
    let lista: Movimentacao[] = snap.docs.map((d) =>
      movimentacaoFromFirestore(d.id, d.data())
    );

    if (filtros?.dataInicio) {
      lista = lista.filter((m) => m.dataMovimentacao >= filtros.dataInicio!);
    }
    if (filtros?.dataFim) {
      lista = lista.filter((m) => m.dataMovimentacao <= filtros.dataFim!);
    }

    lista.sort((a, b) => b.dataMovimentacao.localeCompare(a.dataMovimentacao));

    const total = lista.length;
    const pagina = filtros?.pagina || 1;
    const limite = filtros?.limite || 20;
    const inicio = (pagina - 1) * limite;
    const paginados = lista.slice(inicio, inicio + limite);

    return { movimentacoes: paginados, total };
  }
}
