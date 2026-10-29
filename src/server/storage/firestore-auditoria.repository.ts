import type { Firestore } from 'firebase-admin/firestore';
import type {
  IAuditoriaRepository,
  FiltrosAuditoria,
} from '@/core/storage/auditoria.repository.interface';
import type {
  EventoAuditoriaOperacional,
  RegistrarEventoAuditoriaInput,
} from '@/core/domain/auditoria-operacional.schema';
import { adminDb } from '../firebase-admin';

export class FirestoreAuditoriaRepository implements IAuditoriaRepository {
  private readonly db: Firestore;

  constructor(db?: Firestore) {
    this.db = db || adminDb;
  }


  async registrar(dados: RegistrarEventoAuditoriaInput): Promise<EventoAuditoriaOperacional> {
    const agora = new Date().toISOString();
    const docData = {
      ...dados,
      createdAt: agora,
    };

    if (this.db && typeof this.db.collection === 'function') {
      try {
        const docRef = await this.db.collection('auditoria_operacional').add(docData);
        return {
          id: docRef.id,
          ...docData,
        };
      } catch (err) {
        console.warn('Falha ao persistir auditoria operacional no Firestore:', err instanceof Error ? err.message : err);
      }
    }


    return {
      id: `aud-mock-${Date.now()}`,
      ...docData,
    };
  }

  async listar(filtros?: FiltrosAuditoria): Promise<EventoAuditoriaOperacional[]> {
    if (!this.db || typeof this.db.collection !== 'function') {
      return [];
    }

    let query: any = this.db.collection('auditoria_operacional');

    if (filtros?.acao) {
      query = query.where('acao', '==', filtros.acao);
    }
    if (filtros?.usuarioId) {
      query = query.where('usuarioId', '==', filtros.usuarioId);
    }

    query = query.orderBy('createdAt', 'desc');

    if (filtros?.limite) {
      query = query.limit(filtros.limite);
    } else {
      query = query.limit(100);
    }

    const snap = await query.get();
    return snap.docs.map((doc: any) => {
      const d = doc.data();
      return {
        id: doc.id,
        quando: d.quando || d.createdAt,
        usuarioId: d.usuarioId,
        usuarioNome: d.usuarioNome,
        papel: d.papel,
        acao: d.acao,
        detalhe: d.detalhe,
        entidade: d.entidade,
        entidadeId: d.entidadeId,
        createdAt: d.createdAt,
      };
    });
  }
}
