import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AbrirSessaoInventarioInput,
  RegistrarContagemItemInput,
  FechamentoInventarioInput,
  ExecutarFechamentoMensalInput,
  SessaoInventario,
  FechamentoMensal,
} from '../domain/inventario.schema';
import { StatusInventario } from '../domain/types';
import { InventarioService, RelatorioDivergencias } from '../services/inventario.service';
import { FechamentoMensalService } from '../services/fechamento-mensal.service';
import { MovimentacaoService } from '../services/movimentacao.service';
import { MemoryEstoqueRepository } from '../storage/memory-estoque.adapter';
import { MemoryInventarioRepository } from '../storage/inventario.repository.interface';
import { MemoryFechamentoMensalRepository } from '../storage/fechamento-mensal.repository.interface';
import { MOVIMENTACAO_QUERY_KEYS } from './useMovimentacao';

// Instâncias padrão para operação agnóstica na ausência de injeção externa
const defaultEstoqueRepo = new MemoryEstoqueRepository();
const defaultInventarioRepo = new MemoryInventarioRepository();
const defaultFechamentoRepo = new MemoryFechamentoMensalRepository();
const defaultMovimentacaoService = new MovimentacaoService(defaultEstoqueRepo);

let globalInventarioService = new InventarioService(
  defaultEstoqueRepo,
  defaultInventarioRepo,
  defaultMovimentacaoService
);

let globalFechamentoService = new FechamentoMensalService(
  defaultEstoqueRepo,
  defaultFechamentoRepo
);

export function configureGlobalInventarioServices(
  inventarioService: InventarioService,
  fechamentoService?: FechamentoMensalService
): void {
  globalInventarioService = inventarioService;
  if (fechamentoService) {
    globalFechamentoService = fechamentoService;
  }
}

export function getGlobalInventarioService(): InventarioService {
  return globalInventarioService;
}

export function getGlobalFechamentoService(): FechamentoMensalService {
  return globalFechamentoService;
}

/**
 * Chaves de cache do TanStack Query para o módulo de inventário e fechamento.
 */
export const INVENTARIO_QUERY_KEYS = {
  all: ['inventarios'] as const,
  sessao: (id: string) => ['inventarios', 'sessao', id] as const,
  divergencias: (id: string) => ['inventarios', 'divergencias', id] as const,
  fechamentos: ['fechamentos-mensais'] as const,
  fechamento: (ano: number, mes: number) => ['fechamentos-mensais', ano, mes] as const,
};

/**
 * Hook para consultar uma sessão de inventário específica por ID.
 */
export function useSessaoInventario(
  sessaoId: string | undefined,
  customService?: InventarioService
) {
  const service = customService || globalInventarioService;

  return useQuery({
    queryKey: INVENTARIO_QUERY_KEYS.sessao(sessaoId || ''),
    queryFn: () => service.buscarSessaoPorId(sessaoId!),
    enabled: Boolean(sessaoId),
  });
}

/**
 * Hook para consultar o relatório de divergências de uma sessão de inventário.
 */
export function useRelatorioDivergencias(
  sessaoId: string | undefined,
  customService?: InventarioService
) {
  const service = customService || globalInventarioService;

  return useQuery({
    queryKey: INVENTARIO_QUERY_KEYS.divergencias(sessaoId || ''),
    queryFn: () => service.apurarDivergencias(sessaoId!),
    enabled: Boolean(sessaoId),
  });
}

/**
 * Hook para listar todas as sessões de inventário com filtro opcional por status.
 */
export function useListarSessoesInventario(
  status?: StatusInventario,
  customService?: InventarioService
) {
  const service = customService || globalInventarioService;

  return useQuery({
    queryKey: [...INVENTARIO_QUERY_KEYS.all, status || 'TODOS'],
    queryFn: () => service.listarSessoes(status),
  });
}

/**
 * Hook para abrir uma nova sessão de inventário físico.
 */
export function useAbrirSessaoInventario(customService?: InventarioService) {
  const queryClient = useQueryClient();
  const service = customService || globalInventarioService;

  return useMutation({
    mutationFn: (dados: AbrirSessaoInventarioInput): Promise<SessaoInventario> =>
      service.abrirSessao(dados),
    onSuccess: (novaSessao) => {
      queryClient.invalidateQueries({ queryKey: INVENTARIO_QUERY_KEYS.all });
      queryClient.setQueryData(INVENTARIO_QUERY_KEYS.sessao(novaSessao.id), novaSessao);
    },
  });
}

/**
 * Hook para lançar a contagem física de um item bipado/contado pelo operador.
 */
export function useRegistrarContagemItem(customService?: InventarioService) {
  const queryClient = useQueryClient();
  const service = customService || globalInventarioService;

  return useMutation({
    mutationFn: (dados: RegistrarContagemItemInput): Promise<SessaoInventario> =>
      service.registrarContagem(dados),
    onSuccess: (sessaoAtualizada, variables) => {
      queryClient.setQueryData(
        INVENTARIO_QUERY_KEYS.sessao(variables.sessaoId),
        sessaoAtualizada
      );
      queryClient.invalidateQueries({
        queryKey: INVENTARIO_QUERY_KEYS.divergencias(variables.sessaoId),
      });
      queryClient.invalidateQueries({ queryKey: INVENTARIO_QUERY_KEYS.all });
    },
  });
}

/**
 * Hook para encerrar uma sessão de inventário e aplicar ajustes compensatórios no estoque.
 */
export function useEncerrarSessaoInventario(customService?: InventarioService) {
  const queryClient = useQueryClient();
  const service = customService || globalInventarioService;

  return useMutation({
    mutationFn: (dados: FechamentoInventarioInput): Promise<SessaoInventario> =>
      service.encerrarSessao(dados),
    onSuccess: (sessaoFechada, variables) => {
      queryClient.setQueryData(
        INVENTARIO_QUERY_KEYS.sessao(variables.sessaoId),
        sessaoFechada
      );
      queryClient.invalidateQueries({
        queryKey: INVENTARIO_QUERY_KEYS.divergencias(variables.sessaoId),
      });
      queryClient.invalidateQueries({ queryKey: INVENTARIO_QUERY_KEYS.all });

      // Invalidação cruzada dos saldos de itens que sofreram movimentações de ajuste
      queryClient.invalidateQueries({ queryKey: MOVIMENTACAO_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: MOVIMENTACAO_QUERY_KEYS.itens });
    },
  });
}

/**
 * Hook consolidado para gestão de inventário e contagem física no chão de fábrica.
 */
export function useInventario(
  sessaoId?: string,
  customServices?: {
    inventario?: InventarioService;
    fechamento?: FechamentoMensalService;
  }
) {
  const sessaoQuery = useSessaoInventario(sessaoId, customServices?.inventario);
  const divergenciasQuery = useRelatorioDivergencias(sessaoId, customServices?.inventario);

  const abrirMutation = useAbrirSessaoInventario(customServices?.inventario);
  const contagemMutation = useRegistrarContagemItem(customServices?.inventario);
  const encerrarMutation = useEncerrarSessaoInventario(customServices?.inventario);

  return {
    // Dados reativos
    sessao: sessaoQuery.data,
    isLoadingSessao: sessaoQuery.isLoading,
    relatorioDivergencias: divergenciasQuery.data,
    isLoadingDivergencias: divergenciasQuery.isLoading,

    // Ações de mutação
    abrirSessao: abrirMutation.mutateAsync,
    isAbrindoSessao: abrirMutation.isPending,

    registrarContagem: contagemMutation.mutateAsync,
    isRegistrandoContagem: contagemMutation.isPending,

    encerrarSessao: encerrarMutation.mutateAsync,
    isEncerrandoSessao: encerrarMutation.isPending,

    // Status global
    isPending:
      abrirMutation.isPending || contagemMutation.isPending || encerrarMutation.isPending,
  };
}
