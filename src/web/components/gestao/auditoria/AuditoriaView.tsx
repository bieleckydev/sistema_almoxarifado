'use client';

import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  Search,
  RefreshCw,
  Clock,
  User,
  Activity,
  Layers,
  FileText,
  Filter,
} from 'lucide-react';
import { useAuditoria } from '@/web/hooks/useAuditoria';
import { ROTULO_PAPEL } from '@/core/domain/permissions';
import type { UserRole } from '@/core/domain/user.schema';

export function AuditoriaView() {
  const [busca, setBusca] = useState('');
  const [acaoFiltro, setAcaoFiltro] = useState<string>('TODAS');

  const { data, isLoading, isFetching, refetch } = useAuditoria({
    acao: acaoFiltro !== 'TODAS' ? acaoFiltro : undefined,
  });

  const eventos = data?.dados || [];

  const eventosFiltrados = useMemo(() => {
    if (!busca.trim()) return eventos;
    const termo = busca.toLowerCase();
    return eventos.filter(
      (e) =>
        e.usuarioNome.toLowerCase().includes(termo) ||
        e.acao.toLowerCase().includes(termo) ||
        e.detalhe.toLowerCase().includes(termo) ||
        (e.entidade && e.entidade.toLowerCase().includes(termo)) ||
        (e.entidadeId && e.entidadeId.toLowerCase().includes(termo))
    );
  }, [eventos, busca]);

  const acoesUnicas = useMemo(() => {
    const set = new Set<string>();
    eventos.forEach((e) => set.add(e.acao));
    return Array.from(set);
  }, [eventos]);

  return (
    <div className="flex-1 flex flex-col gap-5 animate-fade-in min-w-0">
      {/* Topo / Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-outline-variant/20 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <h1 className="font-headline-sm text-base md:text-lg font-bold text-on-surface">
              Trilha de Auditoria Operacional
            </h1>
          </div>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Registro imutável de todas as ações operacionais, alterações de saldo, faturamento e cancelamentos
          </p>
        </div>

        <button
          type="button"
          onClick={() => refetch()}
          disabled={isLoading || isFetching}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold text-secondary hover:text-on-surface bg-surface-container-low hover:bg-surface-container border border-outline-variant/30 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          <span>Atualizar</span>
        </button>
      </div>

      {/* Métricas Rápidas */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/20 flex flex-col">
          <span className="text-[11px] text-outline font-medium">Eventos Auditados</span>
          <span className="text-lg font-bold text-on-surface font-data-tabular mt-0.5">
            {eventos.length}
          </span>
        </div>
        <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/20 flex flex-col">
          <span className="text-[11px] text-outline font-medium">Tipos de Ação</span>
          <span className="text-lg font-bold text-primary font-data-tabular mt-0.5">
            {acoesUnicas.length}
          </span>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-container-low p-2.5 rounded-xl border border-outline-variant/20">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <Filter className="w-3.5 h-3.5 text-outline shrink-0 ml-1" />
          <select
            value={acaoFiltro}
            onChange={(e) => setAcaoFiltro(e.target.value)}
            className="text-xs h-7 px-2.5 rounded-lg bg-surface-container border border-outline-variant/30 text-on-surface cursor-pointer"
          >
            <option value="TODAS">Todas as ações</option>
            {acoesUnicas.map((acao) => (
              <option key={acao} value={acao}>
                {acao}
              </option>
            ))}
          </select>
        </div>

        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-outline absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por usuário, ação ou detalhe..."
            className="w-full text-xs pl-8 pr-3 h-7 rounded-lg bg-surface-container border border-outline-variant/30 text-on-surface placeholder:text-outline/70 focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Tabela de Eventos */}
      <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant/20 bg-surface-container-low/60 text-secondary font-label-sm text-[11px] uppercase tracking-wider">
                <th className="py-2.5 px-3.5">Data / Hora</th>
                <th className="py-2.5 px-3.5">Usuário Responsável</th>
                <th className="py-2.5 px-3.5">Ação Realizada</th>
                <th className="py-2.5 px-3.5">Entidade</th>
                <th className="py-2.5 px-3.5">Detalhe da Transação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-outline">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-primary mb-2" />
                    <span>Carregando trilha de auditoria...</span>
                  </td>
                </tr>
              ) : eventosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-outline">
                    Nenhum registro de auditoria encontrado.
                  </td>
                </tr>
              ) : (
                eventosFiltrados.map((evento, idx) => {
                  const dataFmt = new Date(evento.quando || evento.createdAt || Date.now()).toLocaleString('pt-BR');
                  const roleLabel =
                    ROTULO_PAPEL[evento.papel as UserRole] || evento.papel;

                  const isDestrutivo =
                    evento.acao.includes('CANCELAMENTO') ||
                    evento.acao.includes('ESTORNO') ||
                    evento.acao.includes('NEGATIVO');

                  return (
                    <tr key={evento.id || idx} className="hover:bg-surface-container-low/40 transition-colors">
                      <td className="py-2.5 px-3.5 whitespace-nowrap font-mono text-[11px] text-secondary">
                        {dataFmt}
                      </td>
                      <td className="py-2.5 px-3.5">
                        <div className="font-semibold text-on-surface truncate">
                          {evento.usuarioNome}
                        </div>
                        <div className="text-[10px] text-primary uppercase font-bold tracking-wider">
                          {roleLabel}
                        </div>
                      </td>
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-bold ${
                            isDestrutivo
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300'
                              : 'bg-primary-container/30 text-primary dark:text-primary-fixed'
                          }`}
                        >
                          {evento.acao}
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5">
                        <span className="font-semibold text-on-surface">
                          {evento.entidade || '—'}
                        </span>
                        {evento.entidadeId && (
                          <div className="font-mono text-[10.5px] text-outline truncate max-w-[120px]">
                            #{evento.entidadeId}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3.5 max-w-sm">
                        <div className="text-[11px] text-secondary bg-surface-container-low/70 p-1.5 rounded border border-outline-variant/20 font-mono truncate">
                          {evento.detalhe}
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
    </div>
  );
}
