import type { DocumentData, Firestore } from 'firebase-admin/firestore';

/** Quantidade de documentos por chamada de getAll, para não montar requisições gigantes. */
const LOTE = 300;

/**
 * Lê apenas os documentos com os IDs informados, em vez de varrer a coleção inteira.
 * IDs vazios e repetidos são ignorados; documentos inexistentes não aparecem no mapa.
 */
export async function buscarDocsPorIds(
  db: Firestore,
  colecao: string,
  ids: Iterable<string | undefined | null>
): Promise<Map<string, DocumentData>> {
  const unicos = [...new Set([...ids].filter((id): id is string => typeof id === 'string' && id !== ''))];
  const resultado = new Map<string, DocumentData>();
  if (unicos.length === 0) return resultado;

  const ref = db.collection(colecao);
  for (let i = 0; i < unicos.length; i += LOTE) {
    const refs = unicos.slice(i, i + LOTE).map((id) => ref.doc(id));
    const snaps = await db.getAll(...refs);
    for (const snap of snaps) {
      if (snap.exists) resultado.set(snap.id, snap.data() ?? {});
    }
  }
  return resultado;
}
