'use client';

import { create } from 'zustand';
import { formatarDataBR } from '../components/gestao/saida/exportCsv';

export type PeriodoFiltro = 'Hoje' | 'Ontem' | '7 dias' | 'Tudo';

export const PERIODOS_DISPONIVEIS: PeriodoFiltro[] = ['Hoje', 'Ontem', '7 dias', 'Tudo'];

/**
 * Converte um objeto Date em string YYYY-MM-DD considerando o fuso horário local.
 */
export const isoDate = (d: Date = new Date()): string =>
  new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

/**
 * Retorna a data correspondente a N dias antes da data base (padrão: hoje).
 */
export const diaAntes = (n: number, dataBase: Date = new Date()): string => {
  const d = new Date(dataBase);
  d.setDate(d.getDate() - n);
  return isoDate(d);
};

export const hoje = (dataBase: Date = new Date()): string => diaAntes(0, dataBase);
export const ontem = (dataBase: Date = new Date()): string => diaAntes(1, dataBase);

/**
 * Retorna a formatação textual exata do intervalo de datas do período de análise.
 * Equivalente à função perTxt() de almoxarifado5.html.
 *
 * Exemplos:
 * - 'Tudo'   => 'todo o histórico'
 * - 'Hoje'   => '14/10/2026'
 * - 'Ontem'  => '13/10/2026'
 * - '7 dias' => '08/10/2026 à 14/10/2026'
 */
export function calcularIntervaloPeriodo(
  periodo: PeriodoFiltro,
  dataBase: Date = new Date()
): string {
  if (periodo === 'Tudo') {
    return 'todo o histórico';
  }
  if (periodo === 'Hoje') {
    return formatarDataBR(hoje(dataBase));
  }
  if (periodo === 'Ontem') {
    return formatarDataBR(ontem(dataBase));
  }
  if (periodo === '7 dias') {
    const dataInicio = formatarDataBR(diaAntes(6, dataBase));
    const dataFim = formatarDataBR(hoje(dataBase));
    return `${dataInicio} à ${dataFim}`;
  }
  return 'todo o histórico';
}

/**
 * Retorna o próximo período analítico na ordem circular (Hoje -> Ontem -> 7 dias -> Tudo -> Hoje).
 */
export function obterProximoPeriodo(atual: PeriodoFiltro): PeriodoFiltro {
  const index = PERIODOS_DISPONIVEIS.indexOf(atual);
  return PERIODOS_DISPONIVEIS[(index + 1) % PERIODOS_DISPONIVEIS.length];
}

/**
 * Valida se uma data (YYYY-MM-DD ou ISO) pertence ao período de análise especificado.
 */
export function isNoPeriodo(
  dataStr: string,
  periodo: PeriodoFiltro,
  dataBase: Date = new Date()
): boolean {
  if (!dataStr) return false;
  const d = dataStr.split('T')[0];
  if (periodo === 'Tudo') return true;
  if (periodo === 'Hoje') return d === hoje(dataBase);
  if (periodo === 'Ontem') return d === ontem(dataBase);
  if (periodo === '7 dias') return d >= diaAntes(6, dataBase) && d <= hoje(dataBase);
  return true;
}

export interface IntervaloIsoPeriodo {
  /** Início inclusivo (00:00 local) em ISO 8601; ausente em 'Tudo'. */
  dataInicio?: string;
  /** Fim inclusivo (23:59:59.999 local) em ISO 8601; ausente quando vai até agora. */
  dataFim?: string;
  /** Duração do período em dias; null em 'Tudo' (depende do histórico). */
  janelaDias: number | null;
}

function inicioDoDiaLocal(diasAtras: number, dataBase: Date): Date {
  const d = new Date(dataBase);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - diasAtras);
  return d;
}

/**
 * Converte o período de análise em um intervalo ISO para consultas na API,
 * respeitando os limites do dia no fuso local (mesma regra de isNoPeriodo).
 */
export function calcularIntervaloIsoPeriodo(
  periodo: PeriodoFiltro,
  dataBase: Date = new Date()
): IntervaloIsoPeriodo {
  if (periodo === 'Hoje') {
    return { dataInicio: inicioDoDiaLocal(0, dataBase).toISOString(), janelaDias: 1 };
  }
  if (periodo === 'Ontem') {
    const fim = new Date(inicioDoDiaLocal(0, dataBase).getTime() - 1);
    return {
      dataInicio: inicioDoDiaLocal(1, dataBase).toISOString(),
      dataFim: fim.toISOString(),
      janelaDias: 1,
    };
  }
  if (periodo === '7 dias') {
    return { dataInicio: inicioDoDiaLocal(6, dataBase).toISOString(), janelaDias: 7 };
  }
  return { janelaDias: null };
}

export interface PeriodoGlobalState {
  periodo: PeriodoFiltro;
  textoIntervalo: string;
  setPeriodo: (novoPeriodo: PeriodoFiltro) => void;
  proximoPeriodo: () => void;
}

/**
 * Store global Zustand para o período de análise da aplicação.
 * Sincroniza em tempo real a Ribbon, a tela de Saída Manual e relatórios analíticos.
 */
export const usePeriodoStore = create<PeriodoGlobalState>((set) => ({
  periodo: 'Hoje',
  textoIntervalo: calcularIntervaloPeriodo('Hoje'),

  setPeriodo: (novoPeriodo: PeriodoFiltro) => {
    set({
      periodo: novoPeriodo,
      textoIntervalo: calcularIntervaloPeriodo(novoPeriodo),
    });
  },

  proximoPeriodo: () => {
    set((state) => {
      const prox = obterProximoPeriodo(state.periodo);
      return {
        periodo: prox,
        textoIntervalo: calcularIntervaloPeriodo(prox),
      };
    });
  },
}));

/**
 * Hook de conveniência para consumo e manipulação do período global.
 */
export function usePeriodoGlobal() {
  const periodo = usePeriodoStore((state) => state.periodo);
  const textoIntervalo = usePeriodoStore((state) => state.textoIntervalo);
  const setPeriodo = usePeriodoStore((state) => state.setPeriodo);
  const proximoPeriodo = usePeriodoStore((state) => state.proximoPeriodo);

  return {
    periodo,
    textoIntervalo,
    setPeriodo,
    proximoPeriodo,
  };
}
