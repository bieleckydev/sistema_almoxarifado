import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  RegistrarEntradaInput,
  RegistrarBaixaInternaInput,
  RegistrarSaidaExpedicaoInput,
  RegistrarAjusteInventarioInput,
  Movimentacao,
} from '../domain/movimentacao.schema';
import { MovimentacaoService } from '../services/movimentacao.service';
import { MemoryEstoqueRepository } from '../storage/memory-estoque.adapter';
import { IEstoqueRepository } from '../storage/estoque.repository.interface';

/**
 * Repositório e serviço padrão para execução agnóstica na ausência de injeção externa.
 */
let globalRepository: IEstoqueRepository = new MemoryEstoqueRepository();
let defaultMovimentacaoService = new MovimentacaoService(globalRepository);

/**
 * Permite configurar o repositório global utilizado pelos hooks (ex: Firestore no Next.js).
 */
export function setGlobalEstoqueRepository(repo: IEstoqueRepository): void {
  globalRepository = repo;
  defaultMovimentacaoService = new MovimentacaoService(repo);
}

export function getGlobalMovimentacaoService(): MovimentacaoService {
  return defaultMovimentacaoService;
}

/**
 * Chaves de cache do TanStack Query para reatividade do estoque.
 */
export const MOVIMENTACAO_QUERY_KEYS = {
  all: ['movimentacoes'] as const,
  extrato: (itemId: string) => ['movimentacoes', 'extrato', itemId] as const,
  itens: ['itens'] as const,
  item: (idOrCodigo: string) => ['itens', idOrCodigo] as const,
  colaboradores: ['colaboradores'] as const,
};

/**
 * Hook para registrar entrada de estoque (por NFe ou produção) com invalidação atômica.
 */
export function useRegistrarEntrada(customService?: MovimentacaoService) {
  const queryClient = useQueryClient();
  const service = customService || defaultMovimentacaoService;

  return useMutation({
    mutationFn: (dados: RegistrarEntradaInput): Promise<Movimentacao> =>
      service.executarEntrada(dados),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: MOVIMENTACAO_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: MOVIMENTACAO_QUERY_KEYS.itens });
      queryClient.invalidateQueries({
        queryKey: MOVIMENTACAO_QUERY_KEYS.item(variables.itemId),
      });
      queryClient.invalidateQueries({
        queryKey: MOVIMENTACAO_QUERY_KEYS.extrato(variables.itemId),
      });
    },
  });
}

/**
 * Hook para registrar baixa interna por colaborador com invalidação de cache do item e extrato.
 */
export function useRegistrarBaixaInterna(customService?: MovimentacaoService) {
  const queryClient = useQueryClient();
  const service = customService || defaultMovimentacaoService;

  return useMutation({
    mutationFn: (dados: RegistrarBaixaInternaInput): Promise<Movimentacao> =>
      service.executarBaixaInterna(dados),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: MOVIMENTACAO_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: MOVIMENTACAO_QUERY_KEYS.itens });
      queryClient.invalidateQueries({
        queryKey: MOVIMENTACAO_QUERY_KEYS.item(variables.itemId),
      });
      queryClient.invalidateQueries({
        queryKey: MOVIMENTACAO_QUERY_KEYS.extrato(variables.itemId),
      });
    },
  });
}


/**
 * Hook para registrar saída de produto acabado para expedição/cliente.
 */
export function useRegistrarSaidaExpedicao(customService?: MovimentacaoService) {
  const queryClient = useQueryClient();
  const service = customService || defaultMovimentacaoService;

  return useMutation({
    mutationFn: (dados: RegistrarSaidaExpedicaoInput): Promise<Movimentacao> =>
      service.executarSaidaExpedicao(dados),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: MOVIMENTACAO_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: MOVIMENTACAO_QUERY_KEYS.itens });
      queryClient.invalidateQueries({
        queryKey: MOVIMENTACAO_QUERY_KEYS.item(variables.itemId),
      });
      queryClient.invalidateQueries({
        queryKey: MOVIMENTACAO_QUERY_KEYS.extrato(variables.itemId),
      });
    },
  });
}

/**
 * Hook para registrar ajuste de inventário (balanço físico).
 */
export function useRegistrarAjusteInventario(customService?: MovimentacaoService) {
  const queryClient = useQueryClient();
  const service = customService || defaultMovimentacaoService;

  return useMutation({
    mutationFn: (dados: RegistrarAjusteInventarioInput): Promise<Movimentacao> =>
      service.executarAjusteInventario(dados),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: MOVIMENTACAO_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: MOVIMENTACAO_QUERY_KEYS.itens });
      queryClient.invalidateQueries({
        queryKey: MOVIMENTACAO_QUERY_KEYS.item(variables.itemId),
      });
      queryClient.invalidateQueries({
        queryKey: MOVIMENTACAO_QUERY_KEYS.extrato(variables.itemId),
      });
    },
  });
}

/**
 * Hook consolidado de operações de movimentação para uso em telas de almoxarifado.
 */
export function useMovimentacao(customService?: MovimentacaoService) {
  const entradaMutation = useRegistrarEntrada(customService);
  const baixaInternaMutation = useRegistrarBaixaInterna(customService);
  const saidaExpedicaoMutation = useRegistrarSaidaExpedicao(customService);
  const ajusteInventarioMutation = useRegistrarAjusteInventario(customService);

  const isPending =
    entradaMutation.isPending ||
    baixaInternaMutation.isPending ||
    saidaExpedicaoMutation.isPending ||
    ajusteInventarioMutation.isPending;

  return {
    // Mutações individuais
    registrarEntrada: entradaMutation.mutateAsync,
    isRegistrandoEntrada: entradaMutation.isPending,
    erroEntrada: entradaMutation.error,

    registrarBaixaInterna: baixaInternaMutation.mutateAsync,
    isRegistrandoBaixaInterna: baixaInternaMutation.isPending,
    erroBaixaInterna: baixaInternaMutation.error,

    registrarSaidaExpedicao: saidaExpedicaoMutation.mutateAsync,
    isRegistrandoSaidaExpedicao: saidaExpedicaoMutation.isPending,
    erroSaidaExpedicao: saidaExpedicaoMutation.error,

    registrarAjusteInventario: ajusteInventarioMutation.mutateAsync,
    isRegistrandoAjusteInventario: ajusteInventarioMutation.isPending,
    erroAjusteInventario: ajusteInventarioMutation.error,

    // Status global
    isPending,
  };
}
