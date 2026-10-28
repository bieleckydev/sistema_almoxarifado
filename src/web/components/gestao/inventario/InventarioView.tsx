'use client';

import React, { useState, useMemo } from 'react';
import {
  CheckSquare,
  Search,
  RefreshCw,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Check,
  RotateCcw,
  Layers,
  Wrench,
  Bike,
  Package,
  ShieldAlert,
} from 'lucide-react';
import { useItensEstoque } from '@/web/hooks/useItensEstoque';
import { useToast } from '@/web/hooks/useToast';
import { useSubmitLock } from '@/web/hooks/useSubmitLock';
import { api } from '@/core/api/client';
import { useQueryClient } from '@tanstack/react-query';
import type { AbaEstoque, DashboardItem } from '@/web/data/mock-almoxarifado';

export function InventarioView() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isSubmitting, runWithLock } = useSubmitLock(900);

  const [abaSelecionada, setAbaSelecionada] = useState<'todas' | AbaEstoque>('todas');
  const [busca, setBusca] = useState('');
  const [contagens, setContagens] = useState<Record<string, number>>({});
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [motivoGeral, setMotivoGeral] = useState('');

  // Carrega itens de todas as abas
  const { itens: itensMp, isLoading: lMp } = useItensEstoque({ aba: 'mp' });
  const { itens: itensImp, isLoading: lImp } = useItensEstoque({ aba: 'imp' });
  const { itens: itensMotos, isLoading: lMotos } = useItensEstoque({ aba: 'motos' });

  const todosItens = useMemo(() => {
    return [...itensMp, ...itensImp, ...itensMotos];
  }, [itensMp, itensImp, itensMotos]);

  const isLoading = lMp || lImp || lMotos;

  // Filtra itens por categoria e texto
  const itensFiltrados = useMemo(() => {
    let lista = todosItens;
    if (abaSelecionada !== 'todas') {
      lista = lista.filter((i) => i.aba === abaSelecionada);
    }
    if (busca.trim()) {
      const termo = busca.toLowerCase();
      lista = lista.filter(
        (i) =>
          i.codigo.toLowerCase().includes(termo) ||
          i.descricao.toLowerCase().includes(termo) ||
          i.categoria.toLowerCase().includes(termo)
      );
    }
    return lista;
  }, [todosItens, abaSelecionada, busca]);

  // Atualiza a contagem de um item
  const handleContagemChange = (itemId: string, valorStr: string) => {
    const parsed = parseFloat(valorStr);
    if (isNaN(parsed) || parsed < 0) {
      setContagens((prev) => {
        const copy = { ...prev };
        delete copy[itemId];
        return copy;
      });
      return;
    }
    setContagens((prev) => ({
      ...prev,
      [itemId]: parsed,
    }));
  };

  const handleResetItem = (itemId: string) => {
    setContagens((prev) => {
      const copy = { ...prev };
      delete copy[itemId];
      return copy;
    });
  };

  // Itens com contagem preenchida e divergente
  const divergencias = useMemo(() => {
    const list: Array<{
      item: DashboardItem;
      contado: number;
      sistema: number;
      diferenca: number;
    }> = [];

    for (const [id, contado] of Object.entries(contagens)) {
      const item = todosItens.find((i) => i.id === id);
      if (!item) continue;
      const sistema = item.estoqueAtual;
      const diferenca = contado - sistema;
      if (Math.abs(diferenca) > 0.0001) {
        list.push({ item, contado, sistema, diferenca });
      }
    }

    return list;
  }, [contagens, todosItens]);

  const totalContados = Object.keys(contagens).length;
  const totalSobras = divergencias.filter((d) => d.diferenca > 0).length;
  const totalFaltas = divergencias.filter((d) => d.diferenca < 0).length;

  const handleConfirmarAjuste = async () => {
    if (divergencias.length === 0) {
      toast('Nenhum item com divergência para ajustar.', { type: 'info' });
      return;
    }

    await runWithLock(async () => {
      try {
        const payload = {
          motivoGeral: motivoGeral.trim() || 'Inventário físico direto',
          itens: divergencias.map((d) => ({
            itemId: d.item.id,
            codigo: d.item.codigo,
            descricao: d.item.descricao,
            saldoSistema: d.sistema,
            quantidadeContada: d.contado,
          })),
        };

        const res = await api.post<{
          mensagem: string;
          totalAjustados: number;
        }>('/inventario/ajuste-direto', payload);

        toast(res.data.mensagem || 'Ajustes de inventário aplicados com sucesso!', {
          type: 'success',
        });

        // Limpa estado e invalida queries
        setContagens({});
        setMotivoGeral('');
        setIsConfirmModalOpen(false);

        queryClient.invalidateQueries({ queryKey: ['itens-estoque'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-resumo-geral'] });
        queryClient.invalidateQueries({ queryKey: ['movimentacoes-lista'] });
      } catch (err: unknown) {
        toast((err as Error)?.message || 'Erro ao aplicar ajustes de inventário.', {
          type: 'error',
        });
      }
    });
  };

  return (
    <div className="flex-1 flex flex-col gap-5 animate-fade-in min-w-0">
      {/* Topo / Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-outline-variant/20 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-primary" />
            <h1 className="font-headline-sm text-base md:text-lg font-bold text-on-surface">
              Inventário Físico & Contagem
            </h1>
          </div>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Ajuste direto por contagem de prateleira com cálculo automático de sobras e faltas
          </p>
        </div>

        {/* Botão de Aplicação em Lote */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsConfirmModalOpen(true)}
            disabled={divergencias.length === 0 || isSubmitting}
            className="inline-flex items-center gap-2 h-9 px-3.5 rounded-lg text-xs font-semibold text-on-primary bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-xs"
          >
            <Check className="w-4 h-4" />
            <span>
              Aplicar Ajustes ({divergencias.length}{' '}
              {divergencias.length === 1 ? 'divergência' : 'divergências'})
            </span>
          </button>
        </div>
      </div>

      {/* Cards de Métricas Rápidas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/20 flex flex-col">
          <span className="text-[11px] text-outline font-medium">Itens no Escopo</span>
          <span className="text-lg font-bold text-on-surface font-data-tabular mt-0.5">
            {itensFiltrados.length}
          </span>
        </div>
        <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/20 flex flex-col">
          <span className="text-[11px] text-outline font-medium">Itens Contados</span>
          <span className="text-lg font-bold text-primary font-data-tabular mt-0.5">
            {totalContados}
          </span>
        </div>
        <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/20 flex flex-col">
          <span className="text-[11px] text-outline font-medium">Sobras Identificadas</span>
          <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-data-tabular mt-0.5">
            {totalSobras}
          </span>
        </div>
        <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/20 flex flex-col">
          <span className="text-[11px] text-outline font-medium">Faltas Identificadas</span>
          <span className="text-lg font-bold text-error font-data-tabular mt-0.5">
            {totalFaltas}
          </span>
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-container-low p-2.5 rounded-xl border border-outline-variant/20">
        {/* Chips de Categoria */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'todas' as const, label: 'Todas as categorias', icon: Package },
            { id: 'mp' as const, label: 'Matéria-prima', icon: Layers },
            { id: 'imp' as const, label: 'Materiais Improdutivos', icon: Wrench },
            { id: 'motos' as const, label: 'Peças de motos', icon: Bike },
          ].map(({ id, label, icon: Icon }) => {
            const isActive = abaSelecionada === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setAbaSelecionada(id)}
                className={`flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-primary text-on-primary shadow-2xs'
                    : 'text-secondary hover:text-on-surface hover:bg-surface-container'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        {/* Input de Busca */}
        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-outline absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por código ou nome..."
            className="w-full text-xs pl-8 pr-3 h-7 rounded-lg bg-surface-container border border-outline-variant/30 text-on-surface placeholder:text-outline/70 focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Tabela de Contagem */}
      <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant/20 bg-surface-container-low/60 text-secondary font-label-sm text-[11px] uppercase tracking-wider">
                <th className="py-2.5 px-3.5">Código</th>
                <th className="py-2.5 px-3.5">Item & Categoria</th>
                <th className="py-2.5 px-3.5">Localização</th>
                <th className="py-2.5 px-3.5 text-right">No Sistema</th>
                <th className="py-2.5 px-3.5 text-center w-36">Contado</th>
                <th className="py-2.5 px-3.5 text-right">Diferença</th>
                <th className="py-2.5 px-3.5 text-center w-12">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-outline">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-primary mb-2" />
                    <span>Carregando itens de estoque...</span>
                  </td>
                </tr>
              ) : itensFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-outline">
                    Nenhum item encontrado para esta categoria ou busca.
                  </td>
                </tr>
              ) : (
                itensFiltrados.map((item) => {
                  const valorContado = contagens[item.id];
                  const foiContado = valorContado !== undefined;
                  const diff = foiContado ? valorContado - item.estoqueAtual : 0;
                  const temDivergencia = foiContado && Math.abs(diff) > 0.0001;

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-surface-container-low/40 transition-colors ${
                        temDivergencia
                          ? diff > 0
                            ? 'bg-emerald-500/5'
                            : 'bg-rose-500/5'
                          : ''
                      }`}
                    >
                      <td className="py-2.5 px-3.5 font-mono font-semibold text-primary">
                        {item.codigo}
                      </td>
                      <td className="py-2.5 px-3.5 max-w-xs">
                        <div className="font-semibold text-on-surface truncate">
                          {item.descricao}
                        </div>
                        <div className="text-[10.5px] text-outline truncate">
                          {item.categoria}
                        </div>
                      </td>
                      <td className="py-2.5 px-3.5 text-secondary">
                        {item.localizacaoFisica || '—'}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-mono font-bold text-on-surface font-data-tabular">
                        {item.estoqueAtual.toLocaleString('pt-BR')} {item.unidade}
                      </td>
                      <td className="py-2.5 px-3.5 text-center">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={valorContado !== undefined ? valorContado : ''}
                          onChange={(e) => handleContagemChange(item.id, e.target.value)}
                          placeholder={String(item.estoqueAtual)}
                          className={`w-28 text-center text-xs h-7 px-2 font-mono font-bold rounded-lg border focus:ring-1 focus:ring-primary ${
                            !foiContado
                              ? 'bg-surface-container-low border-outline-variant/30 text-on-surface'
                              : diff === 0
                              ? 'bg-surface-container border-outline text-on-surface'
                              : diff > 0
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700 dark:text-emerald-300'
                              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-rose-700 dark:text-rose-300'
                          }`}
                        />
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-mono font-bold font-data-tabular">
                        {!foiContado ? (
                          <span className="text-outline text-[11px]">—</span>
                        ) : diff === 0 ? (
                          <span className="inline-flex items-center gap-1 text-secondary text-[11px]">
                            <Check className="w-3 h-3 text-emerald-500" />
                            OK
                          </span>
                        ) : diff > 0 ? (
                          <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400">
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            +{diff.toLocaleString('pt-BR')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 text-error">
                            <ArrowDownRight className="w-3.5 h-3.5" />
                            {diff.toLocaleString('pt-BR')}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3.5 text-center">
                        {foiContado && (
                          <button
                            type="button"
                            onClick={() => handleResetItem(item.id)}
                            title="Limpar contagem"
                            className="p-1 rounded text-outline hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Confirmação de Ajustes */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-surface-container-lowest border border-outline-variant/30 overflow-hidden animate-scale-up">
            <div className="p-4 sm:p-5 border-b border-outline-variant/20 flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary">
                <CheckSquare className="w-5 h-5" />
                <h3 className="font-headline-sm text-sm font-bold text-on-surface">
                  Confirmar Ajustes de Inventário
                </h3>
              </div>
            </div>

            <div className="p-4 sm:p-5 flex flex-col gap-4">
              <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/20 text-xs flex flex-col gap-1.5">
                <div className="flex justify-between">
                  <span className="text-outline">Total de itens com divergência:</span>
                  <span className="font-bold text-on-surface font-mono">
                    {divergencias.length}
                  </span>
                </div>
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                  <span>Sobras a ajustar (+):</span>
                  <span className="font-bold font-mono">{totalSobras}</span>
                </div>
                <div className="flex justify-between text-error">
                  <span>Faltas a ajustar (-):</span>
                  <span className="font-bold font-mono">{totalFaltas}</span>
                </div>
              </div>

              <div className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-2.5 rounded-lg border border-amber-200/50 dark:border-amber-800/40">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  O saldo físico dos itens divergentes será alterado para o valor contado e
                  movimentações compensatórias serão gravadas para auditoria.
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="motivo-geral-inv"
                  className="text-xs font-semibold text-on-surface"
                >
                  Motivo / Observações gerais do ajuste
                </label>
                <input
                  id="motivo-geral-inv"
                  type="text"
                  value={motivoGeral}
                  onChange={(e) => setMotivoGeral(e.target.value)}
                  placeholder="Ex: Inventário cíclico mensal - Outubro/2026"
                  className="w-full text-xs p-2 rounded-lg bg-surface-container-low border border-outline-variant/40 text-on-surface"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline-variant/20">
                <button
                  type="button"
                  onClick={() => setIsConfirmModalOpen(false)}
                  disabled={isSubmitting}
                  className="h-8 px-3 rounded-lg text-xs font-medium text-secondary hover:text-on-surface bg-surface-container-low hover:bg-surface-container transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmarAjuste}
                  disabled={isSubmitting}
                  className="h-8 px-4 rounded-lg text-xs font-semibold text-on-primary bg-primary hover:bg-primary/90 disabled:opacity-50 transition-colors cursor-pointer shadow-xs"
                >
                  {isSubmitting ? 'Aplicando...' : 'Confirmar e Atualizar Estoque'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
