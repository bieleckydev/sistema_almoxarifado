/**
 * Utilitários para concordância gramatical, singular/plural e flexão de unidades.
 * Evita inconsistências como "faltam 1 unidades" ou "falta 4 unidade".
 */

export interface FormatarFaltaOptions {
  /** Se verdadeiro, usa o nome completo da unidade (ex: "unidade/unidades") em vez de abreviação (ex: "un") */
  porExtenso?: boolean;
  /** Sufixo explicativo após a unidade. Padrão: "para o mínimo". Pode ser vazio ('') */
  sufixo?: string;
}

const UNIDADES_EXTENSO_MAP: Record<string, { singular: string; plural: string }> = {
  UNIDADE: { singular: 'unidade', plural: 'unidades' },
  UN: { singular: 'unidade', plural: 'unidades' },
  PECA: { singular: 'peça', plural: 'peças' },
  PÇA: { singular: 'peça', plural: 'peças' },
  PACOTE: { singular: 'pacote', plural: 'pacotes' },
  PCT: { singular: 'pacote', plural: 'pacotes' },
  LITRO: { singular: 'litro', plural: 'litros' },
  L: { singular: 'litro', plural: 'litros' },
  METRO: { singular: 'metro', plural: 'metros' },
  M: { singular: 'metro', plural: 'metros' },
  KG: { singular: 'kg', plural: 'kg' },
  QUILO: { singular: 'quilo', plural: 'quilos' },
};

const UNIDADES_ABREV_MAP: Record<string, string> = {
  UNIDADE: 'un',
  UN: 'un',
  PECA: 'pç',
  PÇA: 'pç',
  PACOTE: 'pct',
  PCT: 'pct',
  LITRO: 'L',
  L: 'L',
  METRO: 'm',
  M: 'm',
  KG: 'kg',
  QUILO: 'kg',
};

/**
 * Retorna a unidade formatada respeitando a regra de singular/plural quando por extenso.
 */
export function formatarUnidadeMedida(
  quantidade: number,
  unidade: string,
  porExtenso = false
): string {
  if (!unidade) return '';
  const chave = unidade.trim().toUpperCase();
  const isSingular = Math.abs(quantidade) === 1;

  if (porExtenso) {
    const extenso = UNIDADES_EXTENSO_MAP[chave];
    if (extenso) {
      return isSingular ? extenso.singular : extenso.plural;
    }
    // Caso caia numa unidade textual direta já em minúsculo
    if (chave === 'UNIDADES') return isSingular ? 'unidade' : 'unidades';
    if (chave === 'PEÇAS') return isSingular ? 'peça' : 'peças';
    return unidade.toLowerCase();
  }

  return UNIDADES_ABREV_MAP[chave] || unidade.toLowerCase();
}

/**
 * Formata mensagem de déficit de estoque com concordância verbal e nominal perfeita.
 * Exemplos com abreviação:
 * - formatarTextoFalta(1, 'un') => "Falta 1 un para o mínimo"
 * - formatarTextoFalta(14, 'un') => "Faltam 14 un para o mínimo"
 *
 * Exemplos por extenso:
 * - formatarTextoFalta(1, 'UNIDADE', { porExtenso: true }) => "Falta 1 unidade para o mínimo"
 * - formatarTextoFalta(4, 'UNIDADE', { porExtenso: true }) => "Faltam 4 unidades para o mínimo"
 */
export function formatarTextoFalta(
  quantidade: number,
  unidade: string,
  options: FormatarFaltaOptions = {}
): string {
  const { porExtenso = false, sufixo = 'para o mínimo' } = options;
  const isSingular = Math.abs(quantidade) === 1;
  const verbo = isSingular ? 'Falta' : 'Faltam';
  const textoUnidade = formatarUnidadeMedida(quantidade, unidade, porExtenso);
  const quantidadeStr = quantidade.toLocaleString('pt-BR');

  if (sufixo) {
    return `${verbo} ${quantidadeStr} ${textoUnidade} ${sufixo}`.trim();
  }

  return `${verbo} ${quantidadeStr} ${textoUnidade}`.trim();
}

/**
 * Pluraliza substantivos e termos operacionais de acordo com a contagem.
 * Exemplos:
 * - pluralizarTermo(1, 'item exibido', 'itens exibidos') => "1 item exibido"
 * - pluralizarTermo(6, 'item exibido', 'itens exibidos') => "6 itens exibidos"
 */
export function pluralizarTermo(
  quantidade: number,
  singular: string,
  plural: string,
  incluirNumero = true
): string {
  const isSingular = Math.abs(quantidade) === 1;
  const termo = isSingular ? singular : plural;
  if (!incluirNumero) {
    return termo;
  }
  return `${quantidade.toLocaleString('pt-BR')} ${termo}`;
}
