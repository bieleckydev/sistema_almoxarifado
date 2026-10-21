import { arredondar3 } from '../domain/quantidade';

export interface LoteEstoque {
  lote: string;
  quantidade: number;
}

export interface MovimentacaoParaLote {
  tipo: string; // 'Entrada' | 'Saída' | 'ENTRADA_COMPRA' | 'ENTRADA_PRODUCAO' | 'SAIDA_CONSUMO_INTERNO' | 'SAIDA_EXPEDICAO' | 'SAIDA_AJUSTE' | etc.
  quantidade: number;
  lote?: string;
  info?: Record<string, string>;
}

export interface ItemParaLote {
  id: string;
  saldo: number;
  loteBase?: string;
  especificacoes?: Record<string, string>;
}

function isEntrada(tipo: string): boolean {
  const t = tipo.toUpperCase();
  return t === 'ENTRADA' || t.startsWith('ENTRADA_');
}

/**
 * Calcula a decomposição de lotes em estoque de um item, idêntico à função lotesDe do Protótipo 3.0.
 * Entradas de um lote menos saídas daquele lote.
 * O saldo residual (sem lote informado ou anterior ao controle) é atribuído ao loteBase (padrão: "Saldo anterior").
 */
export function calcularLotesDeItem(
  item: ItemParaLote,
  movimentacoes: MovimentacaoParaLote[]
): LoteEstoque[] {
  const mapaLotes: Record<string, number> = {};

  for (const mov of movimentacoes) {
    const loteIdentificado =
      mov.lote ||
      (mov.info && (mov.info['Lote'] || mov.info['lote'])) ||
      undefined;

    if (loteIdentificado) {
      const entrada = isEntrada(mov.tipo);
      const delta = entrada ? mov.quantidade : -mov.quantidade;
      mapaLotes[loteIdentificado] = (mapaLotes[loteIdentificado] || 0) + delta;
    }
  }

  // Arredonda os saldos de cada lote
  for (const l in mapaLotes) {
    mapaLotes[l] = arredondar3(mapaLotes[l]);
  }

  const somaLotes = Object.values(mapaLotes).reduce((acc, curr) => acc + curr, 0);
  const saldoBase = arredondar3(Math.max(0, item.saldo - somaLotes));

  const loteBaseNome =
    item.loteBase ||
    (item.especificacoes && item.especificacoes['Lote']) ||
    'Saldo anterior';

  if (saldoBase > 0) {
    mapaLotes[loteBaseNome] = arredondar3((mapaLotes[loteBaseNome] || 0) + saldoBase);
  }

  return Object.entries(mapaLotes)
    .filter(([, qtd]) => qtd > 0)
    .map(([lote, quantidade]) => ({
      lote,
      quantidade,
    }));
}

/**
 * Encontra o primeiro lote disponível que tenha saldo suficiente para atender a quantidade necessária (FIFO simples).
 */
export function escolherLoteDisponivel(
  lotes: LoteEstoque[],
  quantidadeNecessaria: number
): LoteEstoque | null {
  const encontrado = lotes.find((l) => l.quantidade >= quantidadeNecessaria);
  return encontrado || null;
}
