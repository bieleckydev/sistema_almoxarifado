import {
  montarCatalogoSetoresDestino,
  type SetorDestinoOpcao,
} from '@/core/domain/pedido.schema';

/**
 * Converte a lista de destinos extras ("Pintura, Usinagem; Filial Sul") em opções.
 * Aceita vírgula, ponto e vírgula ou quebra de linha como separador.
 */
export function parsearSetoresDestinoExtras(texto: string | undefined): Array<{ rotulo: string }> {
  if (!texto) return [];
  return texto
    .split(/[,;\n]/)
    .map((rotulo) => rotulo.trim())
    .filter((rotulo) => rotulo.length >= 2)
    .map((rotulo) => ({ rotulo }));
}

/**
 * Catálogo de setores de destino exibido nos pedidos de venda: o padrão do core
 * mais os destinos extras configurados em NEXT_PUBLIC_SETORES_DESTINO_EXTRAS.
 */
export const CATALOGO_SETORES_DESTINO: readonly SetorDestinoOpcao[] = montarCatalogoSetoresDestino(
  parsearSetoresDestinoExtras(process.env.NEXT_PUBLIC_SETORES_DESTINO_EXTRAS)
);
