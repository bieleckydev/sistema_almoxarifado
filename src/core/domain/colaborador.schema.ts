import { z } from 'zod';

/**
 * Setores fabris operacionais da fábrica.
 * Mapeados a partir da planilha de controle interno:
 * Ferramentaria, Qualidade, Logística, Cadeira, Montagem e Solda.
 */
export const SetorFabrilSchema = z.enum([
  'FERRAMENTARIA',
  'QUALIDADE',
  'LOGISTICA',
  'CADEIRA',
  'MONTAGEM',
  'SOLDA',
  'OUTRO',
]);

export type SetorFabril = z.infer<typeof SetorFabrilSchema>;

export const SETOR_FABRIL_LABELS: Record<SetorFabril, string> = {
  FERRAMENTARIA: 'Ferramentaria',
  QUALIDADE: 'Qualidade',
  LOGISTICA: 'Logística',
  CADEIRA: 'Cadeira',
  MONTAGEM: 'Montagem',
  SOLDA: 'Solda',
  OUTRO: 'Outro',
};

/**
 * Regex para validação da matrícula do colaborador.
 * Padrão operacional legado: códigos numéricos de 001 a 999 (ou até 4 dígitos).
 */
export const MATRICULA_REGEX = /^\d{3,4}$/;

/**
 * Função utilitária para normalizar e preencher a matrícula com zeros à esquerda (padrão 3 dígitos).
 * Exemplo: 1 -> "001", 42 -> "042", "99" -> "099".
 */
export function normalizarMatricula(matricula: string | number): string {
  const digitsOnly = String(matricula).replace(/\D/g, '');
  if (!digitsOnly) return '';
  return digitsOnly.length <= 3 ? digitsOnly.padStart(3, '0') : digitsOnly;
}

/**
 * Schema principal da entidade Colaborador.
 * Identifica o operador fabril para autorização e rastreabilidade de consumo interno.
 */
export const ColaboradorSchema = z.object({
  id: z.string().min(1, 'ID do colaborador é obrigatório'),
  matricula: z
    .string()
    .trim()
    .transform((val) => normalizarMatricula(val))
    .pipe(
      z
        .string()
        .regex(
          MATRICULA_REGEX,
          'A matrícula deve ser numérica com 3 a 4 dígitos (ex: 001 a 999)'
        )
    ),
  nome: z
    .string()
    .trim()
    .min(3, 'O nome do colaborador deve conter no mínimo 3 caracteres'),
  setor: SetorFabrilSchema,
  funcao: z
    .string()
    .trim()
    .min(2, 'O cargo/função deve conter no mínimo 2 caracteres'),
  ativo: z.boolean().default(true),
  email: z.string().trim().email('E-mail inválido').optional().or(z.literal('')),
  telefone: z.string().trim().optional(),
  observacoes: z.string().trim().optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export type Colaborador = z.infer<typeof ColaboradorSchema>;

/**
 * Schema de criação de novo colaborador.
 */
export const CreateColaboradorSchema = ColaboradorSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  id: z.string().optional(),
});

export type CreateColaboradorInput = z.infer<typeof CreateColaboradorSchema>;

/**
 * Schema de atualização parcial de colaborador.
 */
export const UpdateColaboradorSchema = CreateColaboradorSchema.partial();

export type UpdateColaboradorInput = z.infer<typeof UpdateColaboradorSchema>;

/**
 * Schema de filtros para listagem de colaboradores.
 */
export const ColaboradorFiltrosSchema = z.object({
  busca: z.string().trim().optional(),
  setor: SetorFabrilSchema.optional(),
  apenasAtivos: z.boolean().default(true),
  pagina: z.number().int().min(1).default(1),
  limite: z.number().int().min(1).max(100).default(20),
});

export type ColaboradorFiltros = z.infer<typeof ColaboradorFiltrosSchema>;
