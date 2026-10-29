'use client';
import React, { useEffect, useRef, useState } from 'react';
import { X, ArrowDownRight, ArrowUpRight, Clock, MapPin, ShieldAlert, Cpu, Edit3, Printer, RotateCcw, AlertTriangle, Loader2 } from 'lucide-react';
import { type DashboardItem, UNIDADE_LABELS } from '@/web/data/mock-almoxarifado';
import { formatarTextoFalta } from '@/web/utils/pluralization';
import { useExtratoItem } from '@/web/hooks/useExtratoItem';
import { StockGauge } from './StockGauge';
import { StockStatusBadge } from './StockStatusBadge';
import { api } from '@/core/api/client';
import { useToast } from '@/web/hooks/useToast';
import { useQueryClient } from '@tanstack/react-query';

export interface ItemDetailsDrawerProps {
  item: DashboardItem | null;
  isOpen: boolean;
  onClose: () => void;
  onRegistrarEntrada?: (item: DashboardItem) => void;
  onRegistrarSaida?: (item: DashboardItem) => void;
  onEditarItem?: (item: DashboardItem) => void;
  onImprimirEtiqueta?: (item: DashboardItem) => void;
  onMovimentacaoEstornada?: () => void;
}

export function ItemDetailsDrawer({
  item,
  isOpen,
  onClose,
  onRegistrarEntrada,
  onRegistrarSaida,
  onEditarItem,
  onImprimirEtiqueta,
  onMovimentacaoEstornada,
}: ItemDetailsDrawerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const [estornoModal, setEstornoModal] = useState<{
    isOpen: boolean;
    movId: string;
    tipo: string;
    quantidade: number;
  } | null>(null);
  const [motivoEstorno, setMotivoEstorno] = useState('');
  const [isEstornando, setIsEstornando] = useState(false);

  // Hook de extrato de movimentações (executado sob demanda quando o Drawer estiver aberto)
  const { movimentacoes, isLoading: isLoadingExtrato, refetch: refetchExtrato } = useExtratoItem({
    itemId: item?.id,
    enabled: isOpen && Boolean(item),
  });

  // Fechamento com tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      // Foca no botão fechar para acessibilidade
      setTimeout(() => closeButtonRef.current?.focus(), 50);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const handleConfirmarEstorno = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!estornoModal) return;

    if (!motivoEstorno.trim()) {
      toast('Informe o motivo do estorno.', { type: 'error' });
      return;
    }

    try {
      setIsEstornando(true);
      await api.post(`/movimentacoes/${estornoModal.movId}/estorno`, {
        motivo: motivoEstorno.trim(),
      });

      toast('Movimentação estornada com sucesso!', { type: 'success' });
      setEstornoModal(null);
      setMotivoEstorno('');
      refetchExtrato();
      queryClient.invalidateQueries({ queryKey: ['itens-estoque'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-resumo-geral'] });
      onMovimentacaoEstornada?.();
    } catch (err: unknown) {
      const responseData = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data;
      const msg =
        responseData?.error ||
        responseData?.message ||
        (err as Error)?.message ||
        'Erro ao estornar movimentação.';
      toast(msg, { type: 'error' });
    } finally {
      setIsEstornando(false);
    }
  };

  if (!isOpen || !item) {
    return null;
  }

  const unidadeFormatada = UNIDADE_LABELS[item.unidade] || item.unidade.toLowerCase();
  const faltaParaMinimo = Math.max(0, item.estoqueSeguranca - item.estoqueAtual);
  const especificacoes = Object.entries(item.especificacoes || {}).filter(
    ([chave]) => !(item.aba === 'motos' && chave.toLowerCase() === 'marca')
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Scrim / Backdrop escurecido */}
      <div
        className="fixed inset-0 bg-inverse-surface/60 transition-opacity duration-200 animate-in fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Painel Lateral Deslizante */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Detalhes do produto ${item.descricao}`}
        className="relative w-full max-w-md bg-surface-container-lowest border-l border-outline-variant/30 flex flex-col h-full z-10 overflow-y-auto animate-in slide-in-from-right duration-250"
      >
        {/* Cabeçalho do Drawer */}
        <div className="sticky top-0 bg-surface-container-lowest z-20 px-6 py-4 border-b border-outline-variant/20 flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <StockStatusBadge
              estoqueAtual={item.estoqueAtual}
              estoqueSeguranca={item.estoqueSeguranca}
              size="sm"
            />
            <h2 className="font-headline text-xl font-bold text-on-surface leading-tight">
              {item.descricao}
            </h2>
            <p className="text-xs text-on-surface-variant font-mono">
              {item.codigo} · {item.categoria}
            </p>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Fechar painel de detalhes"
            className="p-1.5 rounded-xl text-outline hover:text-on-surface bg-surface-container hover:bg-surface-container-high transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corpo do Drawer */}
        <div className="p-6 flex flex-col gap-5 flex-1">
          {/* Destaque de Quantidade Atual */}
          <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/20 flex flex-col gap-2.5">
            <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
              Saldo Físico Atual
            </span>
            <div className="flex items-baseline gap-2">
              <span className="font-kpi-value text-3xl font-extrabold text-on-surface tracking-tight tabular-nums">
                {item.estoqueAtual.toLocaleString('pt-BR')}
              </span>
              <span className="text-sm font-semibold text-on-surface-variant">
                {unidadeFormatada}
              </span>
            </div>

            <div className="mt-1">
              <StockGauge
                estoqueAtual={item.estoqueAtual}
                estoqueSeguranca={item.estoqueSeguranca}
                capacidadeMaxima={item.capacidadeMaxima}
                unidade={unidadeFormatada}
                size="md"
                showLabels
              />
            </div>
          </div>

          {/* Ações Operacionais Imediatas (Entrada / Retirada) */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => onRegistrarEntrada?.(item)}
              className="flex-1 h-9 px-3.5 rounded-xl text-xs font-semibold bg-primary hover:bg-primary/90 text-on-primary transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Adicionar Entrada</span>
            </button>

            <button
              type="button"
              onClick={() => onRegistrarSaida?.(item)}
              className="flex-1 h-9 px-3.5 rounded-xl text-xs font-medium border border-outline-variant/30 bg-surface-container-lowest hover:bg-surface-container text-on-surface transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
            >
              <ArrowDownRight className="w-4 h-4 text-outline" />
              <span>Retirar p/ Produção</span>
            </button>
          </div>

          {/* Ações Cadastrais e Rótulos (3.0) */}
          <div className="flex items-center gap-2.5">
            {onEditarItem && (
              <button
                type="button"
                onClick={() => onEditarItem(item)}
                className="flex-1 h-8 px-3 rounded-xl text-xs font-medium border border-outline-variant/30 bg-surface-container-low hover:bg-surface-container text-on-surface transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 text-primary" />
                <span>Editar Cadastro</span>
              </button>
            )}

            {onImprimirEtiqueta && (
              <button
                type="button"
                onClick={() => onImprimirEtiqueta(item)}
                className="flex-1 h-8 px-3 rounded-xl text-xs font-medium border border-outline-variant/30 bg-surface-container-low hover:bg-surface-container text-on-surface transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-secondary" />
                <span>Imprimir Etiqueta</span>
              </button>
            )}
          </div>

          {/* Grid de Informações de Armazenamento */}
          <div>
            <h3 className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-2.5">
              Parâmetros de Estoque
            </h3>
            <dl className="grid grid-cols-2 gap-2.5">
              <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/20">
                <dt className="text-xs text-on-surface-variant mb-0.5">Estoque Mínimo</dt>
                <dd className="text-sm font-semibold text-on-surface tabular-nums">
                  {item.estoqueSeguranca.toLocaleString('pt-BR')} {unidadeFormatada}
                </dd>
              </div>

              <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/20">
                <dt className="text-xs text-on-surface-variant mb-0.5">Capacidade Máxima</dt>
                <dd className="text-sm font-semibold text-on-surface tabular-nums">
                  {item.capacidadeMaxima.toLocaleString('pt-BR')} {unidadeFormatada}
                </dd>
              </div>

              <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/20">
                <dt className="text-xs text-on-surface-variant mb-0.5">Endereço Físico</dt>
                <dd className="text-sm font-mono font-semibold text-on-surface">
                  {item.localizacaoFisica || 'Não alocado'}
                </dd>
              </div>

              {faltaParaMinimo > 0 ? (
                <div className="p-3 rounded-xl bg-error-container/40 border border-error/20">
                  <dt className="text-xs text-error font-medium mb-0.5">
                    Reposição Necessária
                  </dt>
                  <dd className="text-sm font-bold text-error tabular-nums">
                    {formatarTextoFalta(faltaParaMinimo, item.unidade, { sufixo: '' })}
                  </dd>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-tertiary-fixed/30 border border-tertiary/20">
                  <dt className="text-xs text-tertiary font-medium mb-0.5">
                    Margem de Segurança
                  </dt>
                  <dd className="text-sm font-bold text-tertiary tabular-nums">
                    +{(item.estoqueAtual - item.estoqueSeguranca).toLocaleString('pt-BR')} {unidadeFormatada}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Especificações Técnicas (Atributos Livres) */}
          {especificacoes.length > 0 && (
            <div>
              <h3 className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-2.5">
                Especificações do Material
              </h3>
              <div className="rounded-xl border border-outline-variant/20 overflow-hidden divide-y divide-outline-variant/15 text-xs bg-surface-container-low">
                {especificacoes.map(([chave, valor]) => (
                  <div key={chave} className="flex justify-between py-2 px-3">
                    <span className="text-on-surface-variant font-medium">{chave}</span>
                    <span className="text-on-surface font-semibold text-right max-w-[65%]">
                      {valor}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Histórico Recente de Movimentações */}
          <div>
            <h3 className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Movimentações Recentes
            </h3>

            {isLoadingExtrato ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-surface-container-low rounded-xl animate-pulse" />
                ))}
              </div>
            ) : movimentacoes.length === 0 ? (
              <div className="p-4 text-center rounded-xl border border-outline-variant/20 bg-surface-container-low text-on-surface-variant text-xs">
                Sem movimentações recentes registradas para este item.
              </div>
            ) : (
              <div className="space-y-2">
                {movimentacoes.map((mov) => {
                  const isEntrada = mov.tipo === 'Entrada';

                  return (
                    <div
                      key={mov.id}
                      className="p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/20 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                            isEntrada
                              ? 'bg-tertiary-fixed text-on-tertiary-fixed'
                              : 'bg-error-container text-on-error-container'
                          }`}
                        >
                          {isEntrada ? (
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowDownRight className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <div>
                          <b className="block text-on-surface font-semibold">
                            {mov.tipo} · {mov.responsavel}
                          </b>
                          <span className="text-on-surface-variant text-xs">
                            {mov.dataHora}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <b
                          className={`text-sm tabular-nums font-semibold ${
                            isEntrada
                              ? 'text-tertiary'
                              : 'text-error'
                          }`}
                        >
                          {isEntrada ? '+' : '−'}
                          {mov.quantidade.toLocaleString('pt-BR')} {unidadeFormatada}
                        </b>

                        <button
                          type="button"
                          onClick={() => setEstornoModal({
                            isOpen: true,
                            movId: mov.id,
                            tipo: mov.tipo,
                            quantidade: mov.quantidade,
                          })}
                          title="Estornar movimentação"
                          className="p-1 rounded text-secondary hover:text-error hover:bg-surface-container transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Modal de Confirmação de Estorno */}
      {estornoModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-inverse-surface/60"
            onClick={() => setEstornoModal(null)}
          />
          <div className="relative w-full max-w-sm bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-5 z-10">
            <div className="flex items-center gap-2.5 text-error mb-3">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h4 className="font-bold text-sm text-on-surface">Confirmar Estorno</h4>
            </div>
            <p className="text-xs text-secondary mb-4 leading-relaxed">
              Você está prestes a estornar a movimentação de <strong>{estornoModal.tipo}</strong> ({estornoModal.quantidade} {unidadeFormatada}). O saldo físico será revertido automaticamente.
            </p>

            <form onSubmit={handleConfirmarEstorno} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-secondary mb-1">
                  Motivo ou Justificativa do Estorno <span className="text-error">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={motivoEstorno}
                  onChange={(e) => setMotivoEstorno(e.target.value)}
                  placeholder="Ex: Lançamento em duplicidade, quantidade incorreta..."
                  className="w-full p-2.5 rounded-lg border border-outline-variant/40 bg-surface-container-lowest text-xs text-on-surface focus:border-error focus:ring-1 focus:ring-error"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEstornoModal(null)}
                  disabled={isEstornando}
                  className="px-3 py-1.5 text-xs font-semibold text-secondary hover:bg-surface-container rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isEstornando || !motivoEstorno.trim()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-on-primary bg-error hover:bg-error/90 rounded-lg disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {isEstornando ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Estornando...</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Confirmar Estorno</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
