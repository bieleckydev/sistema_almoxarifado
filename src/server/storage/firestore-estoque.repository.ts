import type { Firestore, Query, DocumentData } from 'firebase-admin/firestore';
import { IEstoqueRepository } from '@/core/storage/estoque.repository.interface';
import { Item, ItemFiltros } from '@/core/domain/item.schema';
import { Colaborador, ColaboradorFiltros, normalizarMatricula } from '@/core/domain/colaborador.schema';
import { Movimentacao, MovimentacaoFiltros } from '@/core/domain/movimentacao.schema';
import { determinarStatusEstoque, SaldoInsuficienteError } from '@/core/services/estoque-calculator';
import {
  ItemNaoEncontradoError,
  ItemInativoError,
  LoteEstoqueInsuficienteError,
} from '@/core/services/movimentacao.service';
import {
  itemFromFirestore,
  itemToFirestore,
  colaboradorFromFirestore,
  colaboradorToFirestore,
  movimentacaoFromFirestore,
  movimentacaoToFirestore,
} from './firestore-estoque.mapper';
import { fetchFirestoreCollectionRest } from './firestore-rest-client';

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
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const mod = require('../firebase-admin');
        this.db = mod.adminDb || mod.default?.adminDb;
      } catch {
        this.db = undefined as unknown as Firestore;
      }
    }
  }

  // ==========================================
  // ITENS & CATÁLOGO
  // ==========================================

  async buscarItemPorId(id: string): Promise<Item | null> {
    try {
      if (!this.db || typeof this.db.collection !== 'function') {
        throw new Error('Firestore db não inicializado');
      }
      const docSnap = await this.db.collection('items').doc(id).get();
      if (!docSnap.exists) {
        return null;
      }
      return itemFromFirestore(docSnap.id, docSnap.data() || {});
    } catch {
      return null;
    }
  }

  async buscarPorCodigo(codigo: string): Promise<Item | null> {
    const upperCode = codigo.trim().toUpperCase();
    try {
      if (!this.db || typeof this.db.collection !== 'function') {
        throw new Error('Firestore db não inicializado');
      }
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
    } catch {
      return null;
    }
  }

  async listarComFiltros(filtros?: ItemFiltros, authToken?: string): Promise<{ itens: Item[]; total: number }> {
    let lista: Item[] = [];
    try {
      if (!this.db || typeof this.db.collection !== 'function') {
        throw new Error('Firestore db não inicializado');
      }

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
      lista = snap.docs.map((d) => itemFromFirestore(d.id, d.data()));
    } catch {
      // Tenta recuperar itens REAIS do Firestore via API REST usando o Bearer Token do usuário
      if (authToken) {
        try {
          const itensReais = await fetchFirestoreCollectionRest<Item>('items', authToken);
          if (Array.isArray(itensReais) && itensReais.length > 0) {
            lista = itensReais;
          }
        } catch {
          // Sem conexão remota
        }
      }

      if (filtros?.apenasAtivos !== false) {
        lista = lista.filter((i: Item) => i.ativo);
      }
      if (filtros?.tipo) {
        lista = lista.filter((i: Item) => i.tipo === filtros.tipo);
      }
      if (filtros?.clienteDestino) {
        lista = lista.filter((i: Item) => i.clienteDestino === filtros.clienteDestino);
      }
    }

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
    try {
      if (!this.db || typeof this.db.collection !== 'function') {
        return null;
      }
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
    } catch {
      return null;
    }
  }

  async listarColaboradores(
    filtros?: ColaboradorFiltros
  ): Promise<{ colaboradores: Colaborador[]; total: number }> {
    let lista: Colaborador[] = [];
    try {
      if (!this.db || typeof this.db.collection !== 'function') {
        return { colaboradores: [], total: 0 };
      }
      let query: Query<DocumentData> = this.db.collection('collaborators');

      if (filtros?.apenasAtivos !== false) {
        query = query.where('ativo', '==', true);
      }

      if (filtros?.setor) {
        query = query.where('setor', '==', filtros.setor);
      }

      const snap = await query.get();
      lista = snap.docs.map((d) => colaboradorFromFirestore(d.id, d.data()));
    } catch {
      return { colaboradores: [], total: 0 };
    }

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
    try {
      if (!this.db || typeof this.db.collection !== 'function') {
        return [];
      }
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
    } catch {
      return [];
    }
  }

  async listarMovimentacoes(
    filtros?: MovimentacaoFiltros
  ): Promise<{ movimentacoes: Movimentacao[]; total: number }> {
    try {
      if (!this.db || typeof this.db.collection !== 'function') {
        return { movimentacoes: [], total: 0 };
      }
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
    } catch {
      return { movimentacoes: [], total: 0 };
    }
  }

  // ==========================================
  // TRANSAÇÕES ATÔMICAS (ACID)
  // ==========================================

  /**
   * Registra uma movimentação e atualiza o saldo do item dentro de uma única transação Firestore (runTransaction).
   * Garante trava otimista, verificação de concorrência e auditoria atômica.
   */
  async registrarMovimentacaoComSaldo(
    itemId: string,
    novoSaldo: number,
    movimentacao: Movimentacao
  ): Promise<Movimentacao> {
    const itemRef = this.db.collection('items').doc(itemId);
    const movRef = this.db.collection('movements').doc(movimentacao.id);

    await this.db.runTransaction(async (transaction) => {
      // 1. Leitura prévia (regra estrita do Firestore: leituras antes de escritas)
      const itemSnap = await transaction.get(itemRef);
      if (!itemSnap.exists) {
        throw new ItemNaoEncontradoError(itemId);
      }

      const itemData = itemSnap.data() || {};
      if (itemData.ativo === false) {
        throw new ItemInativoError(itemId, itemData.codigo || itemId);
      }

      // 2. Validação estrita de saldo
      if (novoSaldo < 0) {
        throw new SaldoInsuficienteError(
          itemData.estoqueAtual || 0,
          movimentacao.quantidade,
          itemData.codigo || itemId
        );
      }

      // 3. Escritas atômicas conjuntas
      transaction.update(itemRef, {
        estoqueAtual: novoSaldo,
        updatedAt: new Date().toISOString(),
      });

      const movData = movimentacaoToFirestore(movimentacao);
      transaction.set(movRef, movData);
    });

    return movimentacao;
  }

  /**
   * Registra a baixa simultânea de múltiplos itens em lote dentro de uma única transação atômica.
   * Se qualquer item apresentar divergência ou saldo insuficiente, todas as operações são abortadas pelo Firestore.
   */
  async registrarBaixaLoteAtomica(
    operacoes: Array<{
      itemId: string;
      novoSaldo: number;
      movimentacao: Movimentacao;
    }>
  ): Promise<Movimentacao[]> {
    if (operacoes.length === 0) {
      return [];
    }

    const itemRefs = operacoes.map((op) => this.db.collection('items').doc(op.itemId));

    await this.db.runTransaction(async (transaction) => {
      // 1. TODAS as leituras primeiro
      const itemSnaps = await Promise.all(itemRefs.map((ref) => transaction.get(ref)));

      // 2. Validações e detecção de concorrência/saldo insuficiente
      const itensComProblema: Array<{
        itemId: string;
        codigo: string;
        descricao: string;
        saldoAtual: number;
        quantidadeSolicitada: number;
        faltante: number;
      }> = [];

      for (let i = 0; i < operacoes.length; i++) {
        const op = operacoes[i];
        const snap = itemSnaps[i];

        if (!snap.exists) {
          throw new ItemNaoEncontradoError(op.itemId);
        }

        const data = snap.data() || {};
        if (data.ativo === false) {
          throw new ItemInativoError(op.itemId, data.codigo || op.itemId);
        }

        const saldoRealNoBanco = typeof data.estoqueAtual === 'number' ? data.estoqueAtual : 0;
        if (op.novoSaldo < 0 || saldoRealNoBanco < op.movimentacao.quantidade) {
          itensComProblema.push({
            itemId: op.itemId,
            codigo: data.codigo || op.itemId,
            descricao: data.descricao || '',
            saldoAtual: saldoRealNoBanco,
            quantidadeSolicitada: op.movimentacao.quantidade,
            faltante: Math.max(0, op.movimentacao.quantidade - saldoRealNoBanco),
          });
        }
      }

      if (itensComProblema.length > 0) {
        throw new LoteEstoqueInsuficienteError(itensComProblema);
      }

      // 3. TODAS as escritas atômicas
      const agora = new Date().toISOString();
      for (let i = 0; i < operacoes.length; i++) {
        const op = operacoes[i];
        const ref = itemRefs[i];
        const movRef = this.db.collection('movements').doc(op.movimentacao.id);

        transaction.update(ref, {
          estoqueAtual: op.novoSaldo,
          updatedAt: agora,
        });

        transaction.set(movRef, movimentacaoToFirestore(op.movimentacao));
      }
    });

    return operacoes.map((op) => op.movimentacao);
  }
}
