import { z } from 'zod';

/**
 * Classificação do tipo de parceiro/contato do almoxarifado.
 * Mapeado a partir das necessidades operacionais:
 * - CLIENTE: Destinatário de pedidos, peças e produtos acabados
 * - FORNECEDOR: Origem de matérias-primas, consumíveis e insumos
 * - TRANSPORTADORA: Responsável pelo frete e despacho logístico
 * - OUTRO: Prestadores de serviço, manutenção externa e outros contatos
 */
export const TipoParceiroSchema = z.enum([
  'CLIENTE',
  'FORNECEDOR',
  'TRANSPORTADORA',
  'OUTRO',
]);

export type TipoParceiro = z.infer<typeof TipoParceiroSchema>;

export const TIPO_PARCEIRO_LABELS: Record<TipoParceiro, string> = {
  CLIENTE: 'Cliente',
  FORNECEDOR: 'Fornecedor',
  TRANSPORTADORA: 'Transportadora',
  OUTRO: 'Outro',
};

/**
 * Converte qualquer representação textual (como 'Cliente', 'fornecedor', etc.)
 * para o enum oficial em caixa alta TipoParceiro.
 */
export function normalizarTipoParceiro(valor: unknown): TipoParceiro {
  if (typeof valor !== 'string') return 'OUTRO';
  const normalizado = valor.trim().toUpperCase();

  switch (normalizado) {
    case 'CLIENTE':
      return 'CLIENTE';
    case 'FORNECEDOR':
      return 'FORNECEDOR';
    case 'TRANSPORTADORA':
      return 'TRANSPORTADORA';
    default:
      return 'OUTRO';
  }
}

/**
 * Zod schema com transformação suave para TipoParceiro, aceitando variações
 * de maiúsculas/minúsculas vindas de formulários ou legados.
 */
export const TipoParceiroFlexivelSchema = z.preprocess(
  (val) => (typeof val === 'string' ? normalizarTipoParceiro(val) : val),
  TipoParceiroSchema
);

/**
 * Schema principal da entidade Cliente / Parceiro Comercial do almoxarifado.
 */
export const ClienteSchema = z.object({
  id: z.string().min(1, 'ID do cliente/parceiro é obrigatório'),
  tipo: TipoParceiroFlexivelSchema.default('CLIENTE'),
  nome: z
    .string()
    .trim()
    .min(2, 'O nome ou razão social deve conter no mínimo 2 caracteres'),
  documento: z
    .string()
    .trim()
    .optional()
    .transform((val) => (val === '' ? undefined : val)),
  contato: z
    .string()
    .trim()
    .optional()
    .transform((val) => (val === '' ? undefined : val)),
  telefone: z
    .string()
    .trim()
    .optional()
    .transform((val) => (val === '' ? undefined : val)),
  cidade: z
    .string()
    .trim()
    .optional()
    .transform((val) => (val === '' ? undefined : val)),
  ativo: z.boolean().default(true),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export type Cliente = z.infer<typeof ClienteSchema>;

/**
 * Schema para cadastro de um novo parceiro/cliente.
 */
export const CreateClienteSchema = ClienteSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  id: z.string().optional(),
});

export type CreateClienteInput = z.infer<typeof CreateClienteSchema>;

/**
 * Schema para atualização de dados do cliente/parceiro.
 */
export const UpdateClienteSchema = CreateClienteSchema.partial().extend({
  id: z.string().min(1, 'ID do cliente/parceiro é obrigatório para atualização'),
});

export type UpdateClienteInput = z.infer<typeof UpdateClienteSchema>;

/**
 * Filtros de busca e consulta para listagem de clientes/parceiros.
 */
export const ClienteFiltrosSchema = z.object({
  tipo: z.union([TipoParceiroSchema, z.literal('TODOS')]).optional().default('TODOS'),
  busca: z.string().trim().optional(),
  apenasAtivos: z.boolean().optional().default(true),
});

export type ClienteFiltros = z.infer<typeof ClienteFiltrosSchema>;
