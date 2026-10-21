'use client';

import React, { useState, useMemo } from 'react';
import {
  ClipboardList,
  Search,
  RefreshCw,
  Plus,
  CheckCircle2,
  XCircle,
  Truck,
  AlertTriangle,
  Clock,
  User,
  ShieldCheck,
} from 'lucide-react';
import { useRequisicoes, useAtualizarStatusRequisicao } from '@/web/hooks/useRequisicoes';
import { NovaRequisicaoModal } from './NovaRequisicaoModal';
import { useAuthStore } from '@/core/store/useAuthStore';
import { podeExecutar } from '@/core/domain/permissions';
import { useToast } from '@/web/hooks/useToast';
import { useSubmitLock } from '@/web/hooks/useSubmitLock';
import type { Requisicao } from '@/core/domain/requisicao.schema';

export function RequisicoesView() {
  const { toast } = useToast();
  const { user } = useAuthStore();
  const { isSubmitting, runWithLock } = useSubmitLock(900);

  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('TODOS');
  const [isNovaReqOpen, setIsNovaReqOpen] = useState(false);
  const [reqParaRejeitar, setReqParaRejeitar] = useState<Requisicao | null>(null);
  const [motivoRejeicao, setMotivoRejeicao] = useState('');

  const { data, isLoading, isFetching, refetch } = useRequisicoes({
    status: filtroStatus !== 'TODOS' ? filtroStatus : undefined,
  });

  const atualizarStatusMutation = useAtualizarStatusRequisicao();

  const podeAprovar = podeExecutar(user?.role, 'aprovar');
  const podeMover = podeExecutar(user?.role, 'mover');
  const podeSolicitar = podeExecutar(user?.role, 'requisitar');

  const requisicoes = data?.dados || [];

  const filtradas = useMemo(() => {
    if (!busca.trim()) return requisicoes;
    const termo = busca.toLowerCase();
    return requisicoes.filter(
      (r) =>
        r.requisitanteNome.toLowerCase().includes(termo) ||
        r.setor.toLowerCase().includes(termo) ||
        String(r.numeroSequencial || '').includes(termo) ||
        r.itens.some((i) => (i.descricao || '').toLowerCase().includes(termo))
    );
  }, [requisicoes, busca]);

  const handleAprovar = async (req: Requisicao) => {
    await runWithLock(async () => {
      try {
        await atualizarStatusMutation.mutateAsync({
          id: req.id,
          status: 'APROVADA',
        });
        toast(`Requisição #${req.numeroSequencial || req.id} aprovada!`, {
          type: 'success',
        });
      } catch (err: unknown) {
        toast((err as Error)?.message || 'Erro ao aprovar requisição.', { type: 'error' });
      }
    });
  };

  const handleConfirmarRejeicao = async () => {
    if (!reqParaRejeitar) return;
    const motivo = motivoRejeicao.trim();
    if (motivo.length < 5) {
      toast('Informe um motivo de rejeição com no mínimo 5 caracteres.', { type: 'error' });
      return;
    }

    await runWithLock(async () => {
      try {
        await atualizarStatusMutation.mutateAsync({
          id: reqParaRejeitar.id,
          status: 'REJEITADA',
          motivoRejeicao: motivo,
        });
        toast(`Requisição #${reqParaRejeitar.numeroSequencial || reqParaRejeitar.id} rejeitada.`, {
          type: 'info',
        });
        setReqParaRejeitar(null);
        setMotivoRejeicao('');
      } catch (err: unknown) {
        toast((err as Error)?.message || 'Erro ao rejeitar requisição.', { type: 'error' });
      }
    });
  };

  const handleEntregar = async (req: Requisicao) => {
    await runWithLock(async () => {
      try {
        await atualizarStatusMutation.mutateAsync({
          id: req.id,
          status: 'ENTREGUE',
        });
        toast(
          `Requisição #${req.numeroSequencial || req.id} entregue e materiais baixados no estoque!`,
          { type: 'success' }
        );
      } catch (err: unknown) {
        toast((err as Error)?.message || 'Erro ao entregar requisição.', { type: 'error' });
      }
    });
  };

  return (
    <div className="flex-1 flex flex-col gap-5 animate-fade-in min-w-0">
      {/* Topo / Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-outline-variant/20 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary" />
            <h1 className="font-headline-sm text-base md:text-lg font-bold text-on-surface">
              Requisições de Material
            </h1>
          </div>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Solicitações de materiais da produção com fluxo de aprovação e entrega com baixa física
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          {podeSolicitar && (
            <button
              type="button"
              onClick={() => setIsNovaReqOpen(true)}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold text-on-primary bg-primary hover:bg-primary/90 transition-colors cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nova Requisição</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => refetch()}
            disabled={isLoading || isFetching}
            className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs font-semibold text-secondary hover:text-on-surface bg-surface-container-low hover:bg-surface-container border border-outline-variant/30 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </button>
        </div>
      </div>

      {/* Métricas Rápidas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/20 flex flex-col">
          <span className="text-[11px] text-outline font-medium">Total de Requisições</span>
          <span className="text-lg font-bold text-on-surface font-data-tabular mt-0.5">
            {requisicoes.length}
          </span>
        </div>
        <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/20 flex flex-col">
          <span className="text-[11px] text-outline font-medium">Pendentes de Aprovação</span>
          <span className="text-lg font-bold text-amber-600 dark:text-amber-400 font-data-tabular mt-0.5">
            {requisicoes.filter((r) => r.status === 'PENDENTE').length}
          </span>
        </div>
        <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/20 flex flex-col">
          <span className="text-[11px] text-outline font-medium">Aprovadas (Aguardando Retirada)</span>
          <span className="text-lg font-bold text-primary font-data-tabular mt-0.5">
            {requisicoes.filter((r) => r.status === 'APROVADA').length}
          </span>
        </div>
        <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/20 flex flex-col">
          <span className="text-[11px] text-outline font-medium">Entregues</span>
          <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-data-tabular mt-0.5">
            {requisicoes.filter((r) => r.status === 'ENTREGUE').length}
          </span>
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-container-low p-2.5 rounded-xl border border-outline-variant/20">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'TODOS', label: 'Todas' },
            { id: 'PENDENTE', label: 'Pendentes' },
            { id: 'APROVADA', label: 'Aprovadas' },
            { id: 'ENTREGUE', label: 'Entregues' },
            { id: 'REJEITADA', label: 'Rejeitadas' },
          ].map(({ id, label }) => {
            const isActive = filtroStatus === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setFiltroStatus(id)}
                className={`h-7 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-primary text-on-primary shadow-2xs'
                    : 'text-secondary hover:text-on-surface hover:bg-surface-container'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-outline absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por solicitante, setor ou item..."
            className="w-full text-xs pl-8 pr-3 h-7 rounded-lg bg-surface-container border border-outline-variant/30 text-on-surface placeholder:text-outline/70 focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Tabela de Requisições */}
      <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant/20 bg-surface-container-low/60 text-secondary font-label-sm text-[11px] uppercase tracking-wider">
                <th className="py-2.5 px-3.5">Req #</th>
                <th className="py-2.5 px-3.5">Solicitante & Setor</th>
                <th className="py-2.5 px-3.5">Itens Requisitados</th>
                <th className="py-2.5 px-3.5">Prioridade</th>
                <th className="py-2.5 px-3.5">Status</th>
                <th className="py-2.5 px-3.5 text-right">Ações Operacionais</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-outline">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-primary mb-2" />
                    <span>Carregando requisições...</span>
                  </td>
                </tr>
              ) : filtradas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-outline">
                    Nenhuma requisição encontrada.
                  </td>
                </tr>
              ) : (
                filtradas.map((req) => {
                  const isPendente = req.status === 'PENDENTE';
                  const isAprovada = req.status === 'APROVADA';
                  const isEntregue = req.status === 'ENTREGUE';
                  const isRejeitada = req.status === 'REJEITADA';

                  return (
                    <tr key={req.id} className="hover:bg-surface-container-low/40 transition-colors">
                      <td className="py-3 px-3.5 font-mono font-bold text-primary">
                        #{req.numeroSequencial || req.id}
                      </td>
                      <td className="py-3 px-3.5">
                        <div className="font-semibold text-on-surface">
                          {req.requisitanteNome}
                        </div>
                        <div className="text-[10.5px] text-outline">
                          Setor: <b className="text-secondary">{req.setor}</b>
                        </div>
                      </td>
                      <td className="py-3 px-3.5">
                        <div className="space-y-0.5 max-w-sm">
                          {req.itens.map((it, idx) => (
                            <div key={idx} className="text-[11px] flex items-center gap-1.5">
                              <span className="font-mono font-bold font-data-tabular text-on-surface">
                                {it.quantidadeSolicitada} {it.unidade}
                              </span>
                              <span className="text-outline">·</span>
                              <span className="truncate text-secondary">{it.descricao || it.itemId}</span>
                            </div>
                          ))}
                        </div>
                        {req.observacao && (
                          <div className="text-[10px] text-outline mt-1 italic truncate">
                            &quot;{req.observacao}&quot;
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            req.prioridade === 'URGENTE'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                              : req.prioridade === 'BAIXA'
                              ? 'bg-surface-container text-outline'
                              : 'bg-primary/10 text-primary'
                          }`}
                        >
                          {req.prioridade}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold ${
                            isPendente
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                              : isAprovada
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300'
                              : isEntregue
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                          }`}
                        >
                          {req.status}
                        </span>
                        {isRejeitada && req.motivoRejeicao && (
                          <div className="text-[10px] text-error mt-0.5 max-w-[150px] truncate" title={req.motivoRejeicao}>
                            Motivo: {req.motivoRejeicao}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Aprovador (Gestor/Admin) pode aprovar ou rejeitar */}
                          {isPendente && podeAprovar && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleAprovar(req)}
                                disabled={isSubmitting}
                                className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 transition-colors cursor-pointer shadow-2xs"
                                title="Aprovar requisição para retirada"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Aprovar</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setReqParaRejeitar(req);
                                  setMotivoRejeicao('');
                                }}
                                disabled={isSubmitting}
                                className="inline-flex items-center gap-1 h-7 px-2 rounded-lg text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 transition-colors cursor-pointer"
                                title="Rejeitar requisição"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Rejeitar</span>
                              </button>
                            </>
                          )}

                          {/* Almoxarife pode entregar quando aprovada */}
                          {isAprovada && podeMover && (
                            <button
                              type="button"
                              onClick={() => handleEntregar(req)}
                              disabled={isSubmitting}
                              className="inline-flex items-center gap-1.5 h-7 px-3 rounded-lg text-xs font-semibold text-on-primary bg-primary hover:bg-primary/90 transition-colors cursor-pointer shadow-xs"
                              title="Confirmar entrega de material e baixar estoque"
                            >
                              <Truck className="w-3.5 h-3.5" />
                              <span>Entregar & Baixar</span>
                            </button>
                          )}

                          {isEntregue && (
                            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Concluída
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Rejeição de Requisição */}
      {reqParaRejeitar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-2xl overflow-hidden animate-scale-up">
            <div className="p-4 sm:p-5 border-b border-outline-variant/20 flex items-center justify-between bg-error-container/20">
              <div className="flex items-center gap-2 text-error">
                <XCircle className="w-5 h-5" />
                <h3 className="font-headline-sm text-sm font-bold text-on-surface">
                  Rejeitar Requisição #{reqParaRejeitar.numeroSequencial || reqParaRejeitar.id}
                </h3>
              </div>
            </div>

            <div className="p-4 sm:p-5 flex flex-col gap-4">
              <p className="text-xs text-secondary">
                Informe o motivo da recusa desta requisição para conhecimento do solicitante ({reqParaRejeitar.requisitanteNome}):
              </p>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="motivo-rej" className="text-xs font-semibold text-on-surface">
                  Motivo da Rejeição <span className="text-error">*</span>
                </label>
                <textarea
                  id="motivo-rej"
                  rows={3}
                  value={motivoRejeicao}
                  onChange={(e) => setMotivoRejeicao(e.target.value)}
                  placeholder="Ex: Material em falta com compra agendada para semana que vem..."
                  className="w-full text-xs p-2.5 rounded-lg bg-surface-container-low border border-outline-variant/40 text-on-surface resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline-variant/20">
                <button
                  type="button"
                  onClick={() => setReqParaRejeitar(null)}
                  disabled={isSubmitting}
                  className="h-8 px-3 rounded-lg text-xs font-medium text-secondary hover:text-on-surface bg-surface-container-low hover:bg-surface-container transition-colors cursor-pointer"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmarRejeicao}
                  disabled={isSubmitting || motivoRejeicao.trim().length < 5}
                  className="h-8 px-3.5 rounded-lg text-xs font-semibold text-on-error bg-error hover:bg-error/90 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  Confirmar Rejeição
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nova Requisição */}
      <NovaRequisicaoModal
        isOpen={isNovaReqOpen}
        onClose={() => setIsNovaReqOpen(false)}
      />
    </div>
  );
}
