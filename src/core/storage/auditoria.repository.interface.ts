import type {
  EventoAuditoriaOperacional,
  RegistrarEventoAuditoriaInput,
} from '../domain/auditoria-operacional.schema';

export interface FiltrosAuditoria {
  limite?: number;
  acao?: string;
  usuarioId?: string;
}

export interface IAuditoriaRepository {
  registrar(dados: RegistrarEventoAuditoriaInput): Promise<EventoAuditoriaOperacional>;
  listar(filtros?: FiltrosAuditoria): Promise<EventoAuditoriaOperacional[]>;
}
