import { FechamentoMensal } from '../domain/inventario.schema';

/**
 * Contrato de repositório para fechamentos periódicos/mensais de estoque.
 */
export interface IFechamentoMensalRepository {
  salvarFechamento(fechamento: FechamentoMensal): Promise<FechamentoMensal>;
  buscarFechamento(ano: number, mes: number): Promise<FechamentoMensal | null>;
  listarFechamentos(ano?: number): Promise<FechamentoMensal[]>;
}

/**
 * Adaptador de repositório em memória para fechamentos mensais.
 */
export class MemoryFechamentoMensalRepository implements IFechamentoMensalRepository {
  private fechamentos = new Map<string, FechamentoMensal>();

  private gerarKey(ano: number, mes: number): string {
    return `${ano}-${String(mes).padStart(2, '0')}`;
  }

  async salvarFechamento(fechamento: FechamentoMensal): Promise<FechamentoMensal> {
    const key = this.gerarKey(fechamento.ano, fechamento.mes);
    const copia = JSON.parse(JSON.stringify(fechamento));
    this.fechamentos.set(key, copia);
    return JSON.parse(JSON.stringify(copia));
  }

  async buscarFechamento(ano: number, mes: number): Promise<FechamentoMensal | null> {
    const key = this.gerarKey(ano, mes);
    const f = this.fechamentos.get(key);
    return f ? JSON.parse(JSON.stringify(f)) : null;
  }

  async listarFechamentos(ano?: number): Promise<FechamentoMensal[]> {
    let list = Array.from(this.fechamentos.values());
    if (ano) {
      list = list.filter((f) => f.ano === ano);
    }
    // Ordenar cronologicamente por ano e mês
    list.sort((a, b) => a.ano - b.ano || a.mes - b.mes);
    return list.map((f) => JSON.parse(JSON.stringify(f)));
  }

  clear(): void {
    this.fechamentos.clear();
  }
}
