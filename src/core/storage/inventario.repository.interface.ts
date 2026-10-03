import { SessaoInventario } from '../domain/inventario.schema';
import { StatusInventario } from '../domain/types';

/**
 * Contrato de repositório para sessões de inventário físico e conferência cíclica.
 */
export interface IInventarioRepository {
  /**
   * Salva ou atualiza uma sessão de inventário.
   */
  salvarSessao(sessao: SessaoInventario): Promise<SessaoInventario>;

  /**
   * Busca uma sessão de inventário pelo seu ID único.
   */
  buscarSessaoPorId(id: string): Promise<SessaoInventario | null>;

  /**
   * Lista as sessões de inventário registradas, com filtro opcional por status.
   */
  listarSessoes(status?: StatusInventario): Promise<SessaoInventario[]>;
}

/**
 * Adaptador de repositório em memória para sessões de inventário.
 */
export class MemoryInventarioRepository implements IInventarioRepository {
  private sessoes = new Map<string, SessaoInventario>();

  constructor(initialSessoes?: SessaoInventario[]) {
    if (initialSessoes) {
      for (const s of initialSessoes) {
        this.sessoes.set(s.id, { ...s });
      }
    }
  }

  async salvarSessao(sessao: SessaoInventario): Promise<SessaoInventario> {
    const clone = JSON.parse(JSON.stringify(sessao));
    this.sessoes.set(sessao.id, clone);
    return JSON.parse(JSON.stringify(clone));
  }

  async buscarSessaoPorId(id: string): Promise<SessaoInventario | null> {
    const s = this.sessoes.get(id);
    return s ? JSON.parse(JSON.stringify(s)) : null;
  }

  async listarSessoes(status?: StatusInventario): Promise<SessaoInventario[]> {
    let list = Array.from(this.sessoes.values());
    if (status) {
      list = list.filter((s) => s.status === status);
    }
    return list.map((s) => JSON.parse(JSON.stringify(s)));
  }

  clear(): void {
    this.sessoes.clear();
  }
}
