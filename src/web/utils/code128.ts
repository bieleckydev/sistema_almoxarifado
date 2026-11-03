/**
 * Codificador Code 128 (conjunto B) para etiquetas de identificação.
 *
 * O conjunto B cobre os caracteres ASCII imprimíveis (32 a 126), suficiente
 * para os códigos SKU do almoxarifado. Retorna as larguras dos módulos
 * alternando barra e espaço, começando por barra, já com o dígito
 * verificador e o símbolo de parada.
 */

// Larguras (barra, espaço, barra, espaço, barra, espaço) de cada valor 0..105.
// O índice 106 é o símbolo de parada, que tem uma barra final extra.
const PADROES = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112',
] as const;

export const CODE128_PADROES: readonly string[] = PADROES;

const START_B = 104;
const STOP = 106;

/** Indica se o texto pode ser codificado no conjunto B (ASCII 32 a 126, não vazio). */
export function podeCodificarCode128(texto: string): boolean {
  if (texto.length === 0) return false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto.charCodeAt(i);
    if (c < 32 || c > 126) return false;
  }
  return true;
}

/** Valores de símbolo (start, dados, verificador, stop) do texto no conjunto B. */
export function simbolosCode128(texto: string): number[] {
  if (!podeCodificarCode128(texto)) {
    throw new Error('Code 128 (conjunto B) aceita apenas caracteres ASCII imprimíveis.');
  }
  const dados = Array.from(texto, (ch) => ch.charCodeAt(0) - 32);
  const soma = dados.reduce((acc, valor, i) => acc + valor * (i + 1), START_B);
  return [START_B, ...dados, soma % 103, STOP];
}

/**
 * Larguras dos módulos do código de barras, alternando barra e espaço a
 * partir de uma barra. Não inclui a zona de silêncio.
 */
export function modulosCode128(texto: string): number[] {
  return simbolosCode128(texto).flatMap((valor) => Array.from(PADROES[valor], Number));
}
