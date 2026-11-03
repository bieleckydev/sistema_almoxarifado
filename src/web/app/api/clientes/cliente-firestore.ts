import type { Cliente } from '@/core/domain/cliente.schema';

/**
 * Converte um documento da coleção `clients` na entidade Cliente.
 * Campos vazios viram `undefined` e `ativo` assume `true` quando ausente (dados legados).
 */
export function clienteFromFirestore(id: string, data: Record<string, unknown> | undefined): Cliente {
  const d = data ?? {};
  const texto = (valor: unknown) =>
    typeof valor === 'string' && valor.trim() !== '' ? valor : undefined;

  return {
    id,
    nome: String(d.nome || ''),
    tipo: (d.tipo as Cliente['tipo']) || 'CLIENTE',
    documento: texto(d.documento),
    contato: texto(d.contato),
    telefone: texto(d.telefone),
    cidade: texto(d.cidade),
    ativo: d.ativo !== false,
    createdAt: texto(d.createdAt),
    updatedAt: texto(d.updatedAt),
  };
}
