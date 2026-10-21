import type { IAuditoriaRepository, FiltrosAuditoria } from '../storage/auditoria.repository.interface';
import {
  type EventoAuditoriaOperacional,
  type RegistrarEventoAuditoriaInput,
  RegistrarEventoAuditoriaInputSchema,
} from '../domain/auditoria-operacional.schema';

export class AuditoriaService {
  constructor(private readonly repo: IAuditoriaRepository) {}

  async registrar(dados: RegistrarEventoAuditoriaInput): Promise<EventoAuditoriaOperacional> {
    const validado = RegistrarEventoAuditoriaInputSchema.parse(dados);
    return this.repo.registrar(validado);
  }

  async listar(filtros?: FiltrosAuditoria): Promise<EventoAuditoriaOperacional[]> {
    return this.repo.listar(filtros);
  }
}

/**
 * Implementação em memória para testes unitários.
 */
export class MemoryAuditoriaRepository implements IAuditoriaRepository {
  private eventos: EventoAuditoriaOperacional[] = [];

  async registrar(dados: RegistrarEventoAuditoriaInput): Promise<EventoAuditoriaOperacional> {
    const evento: EventoAuditoriaOperacional = {
      ...dados,
      id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
    };
    this.eventos.unshift(evento);
    return evento;
  }

  async listar(filtros?: FiltrosAuditoria): Promise<EventoAuditoriaOperacional[]> {
    let res = [...this.eventos];
    if (filtros?.acao) {
      res = res.filter((e) => e.acao === filtros.acao);
    }
    if (filtros?.usuarioId) {
      res = res.filter((e) => e.usuarioId === filtros.usuarioId);
    }
    if (filtros?.limite) {
      res = res.slice(0, filtros.limite);
    }
    return res;
  }
}
