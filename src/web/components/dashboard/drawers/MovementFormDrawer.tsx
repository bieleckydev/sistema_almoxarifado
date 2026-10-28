'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, ArrowUpRight, ArrowDownRight, AlertCircle, Loader2, FileText, Upload, Calendar } from 'lucide-react';
import { type DashboardItem, UNIDADE_LABELS } from '@/web/data/mock-almoxarifado';
import { api } from '@/core/api/client';
import { useToast } from '@/web/hooks/useToast';
import { useQueryClient } from '@tanstack/react-query';
import { ColaboradorSelect } from '@/web/components/common/ColaboradorSelect';
import type { Colaborador } from '@/core/domain/colaborador.schema';

export interface MovementFormDrawerProps {
  item: DashboardItem | null;
  tipo: 'Entrada' | 'Saída';
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function MovementFormDrawer({
  item,
  tipo,
  isOpen,
  onClose,
  onSuccess,
}: MovementFormDrawerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hoje = new Date().toISOString().slice(0, 10);
  const [dataMov, setDataMov] = useState(hoje);
  const [quantidade, setQuantidade] = useState<number>(1);
  const [lote, setLote] = useState('');
  const [valorUnitario, setValorUnitario] = useState<number>(0);
  const [colaboradorSelecionado, setColaboradorSelecionado] = useState<Colaborador | null>(null);
  const [observacao, setObservacao] = useState('');
  const [camposInfo, setCamposInfo] = useState<Record<string, string>>({});
  const [erro, setErro] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEntrada = tipo === 'Entrada';

  useEffect(() => {
    if (isOpen && item) {
      setDataMov(new Date().toISOString().slice(0, 10));
      setQuantidade(1);
      setLote('');
      setValorUnitario(item.custoUnitario || 0);
      setColaboradorSelecionado(null);
      setObservacao('');
      setErro(null);
      setIsSubmitting(false);

      const fornecedorPrevio = item.especificacoes?.Fornecedor || '';
      setCamposInfo(fornecedorPrevio ? { Fornecedor: fornecedorPrevio } : {});

      setTimeout(() => closeButtonRef.current?.focus(), 50);
    }
  }, [isOpen, item, tipo]);

  // Tecla Escape para fechar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !item) return null;

  const unidadeFmt = UNIDADE_LABELS[item.unidade] || item.unidade.toLowerCase();
  const camposEntrada: string[] =
    item.aba === 'motos'
      ? ['NF-e', 'Fornecedor']
      : item.aba === 'imp'
        ? ['NF-e', 'Fornecedor', 'Lote', 'Certificado de aprovação (CA)']
        : ['NF-e', 'Fornecedor', 'Lote', 'Certificado'];

  const handleImportarXml = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parser = new DOMParser();
        const xml = parser.parseFromString(text, 'application/xml');

        const parserError = xml.querySelector('parsererror');
        if (parserError) {
          throw new Error('Arquivo XML corrompido ou inválido.');
        }

        const nNF = xml.querySelector('ide > nNF')?.textContent || xml.querySelector('nNF')?.textContent || '';
        const xNome = xml.querySelector('emit > xNome')?.textContent || '';
        const qComStr = xml.querySelector('det > prod > qCom')?.textContent || xml.querySelector('qCom')?.textContent;
        const vUnComStr = xml.querySelector('det > prod > vUnCom')?.textContent || xml.querySelector('vUnCom')?.textContent;
        const nLote = xml.querySelector('rastro > nLote')?.textContent || xml.querySelector('nLote')?.textContent || '';

        if (nNF) {
          setCamposInfo((prev) => ({ ...prev, 'NF-e': nNF, ...(xNome ? { Fornecedor: xNome } : {}) }));
        }
        if (nLote) {
          setLote(nLote);
          setCamposInfo((prev) => ({ ...prev, Lote: nLote }));
        }
        if (qComStr) {
          const parsedQtd = Math.round(parseFloat(qComStr));
          if (parsedQtd > 0) setQuantidade(parsedQtd);
        }
        if (vUnComStr) {
          const parsedVal = parseFloat(vUnComStr);
          if (parsedVal > 0) setValorUnitario(parsedVal);
        }

        toast(`NF-e ${nNF || 'importada'}${xNome ? ` de ${xNome}` : ''} lida com sucesso!`, { type: 'success' });
      } catch {
        toast('Erro ao processar o arquivo XML da NF-e.', { type: 'error' });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    if (!dataMov) {
      setErro('Informe a data da movimentação.');
      return;
    }

    if (quantidade <= 0) {
      setErro('A quantidade deve ser maior que zero.');
      return;
    }

    if (!isEntrada && quantidade > item.estoqueAtual) {
      setErro(
        `Estoque insuficiente: há apenas ${item.estoqueAtual.toLocaleString('pt-BR')} ${unidadeFmt} de ${item.descricao}.`
      );
      return;
    }

    if (!isEntrada && !colaboradorSelecionado) {
      setErro('Selecione o colaborador responsável pela retirada do material.');
      return;
    }

    setIsSubmitting(true);

    try {
      const loteFinal = lote.trim() || camposInfo['Lote']?.trim() || undefined;

      if (isEntrada) {
        const numeroNF = camposInfo['NF-e']?.trim() || undefined;
        const fornecedor = camposInfo['Fornecedor']?.trim() || undefined;

        await api.post('/movimentacoes/entrada', {
          itemId: item.id,
          tipo: 'ENTRADA_COMPRA',
          quantidade,
          numeroNF,
          fornecedor,
          lote: loteFinal,
          valorUnitario: valorUnitario > 0 ? valorUnitario : undefined,
          observacoes: observacao.trim() || undefined,
          dataMovimentacao: new Date(dataMov + 'T12:00:00Z').toISOString(),
        });

        toast(
          `Entrada registrada: +${quantidade.toLocaleString('pt-BR')} ${unidadeFmt} de ${item.descricao}.`,
          { type: 'success' }
        );
      } else {
        // Saída / Retirada
        if (!colaboradorSelecionado) {
          throw new Error('Colaborador não selecionado.');
        }

        await api.post('/movimentacoes/baixa-interna', {
          itemId: item.id,
          quantidade,
          colaboradorId: colaboradorSelecionado.id,
          setor: colaboradorSelecionado.setor,
          lote: loteFinal,
          observacao: observacao.trim() || undefined,
          dataMovimentacao: new Date(dataMov + 'T12:00:00Z').toISOString(),
        });

        toast(
          `Retirada registrada: −${quantidade.toLocaleString('pt-BR')} ${unidadeFmt} de ${item.descricao}.`,
          { type: 'success' }
        );
      }

      // Invalida caches do React Query para atualização em tempo real
      queryClient.invalidateQueries({ queryKey: ['itens-estoque'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-resumo-geral'] });
      queryClient.invalidateQueries({ queryKey: ['extrato-item', item.id] });
      queryClient.invalidateQueries({ queryKey: ['global-search-index'] });

      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const responseData = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data;
      const msg =
        responseData?.error ||
        responseData?.message ||
        (err as Error)?.message ||
        'Erro ao processar movimentação.';
      setErro(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Scrim / Backdrop */}
      <div
        className="fixed inset-0 bg-inverse-surface/60 transition-opacity animate-in fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Deslizante */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={isEntrada ? 'Registrar entrada de material' : 'Registrar retirada para produção'}
        className="relative w-full max-w-md bg-surface-container-lowest border-l border-outline-variant/30 flex flex-col h-full z-10 overflow-y-auto animate-in slide-in-from-right duration-200"
      >
        {/* Cabeçalho */}
        <div className="sticky top-0 bg-surface-container-lowest z-20 px-6 py-4 border-b border-outline-variant/20 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span
              className={`p-1.5 rounded-xl ${
                isEntrada
                  ? 'bg-tertiary-fixed text-on-tertiary-fixed'
                  : 'bg-error-container text-on-error-container'
              }`}
            >
              {isEntrada ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
            </span>
            <div>
              <h2 className="font-headline text-base font-bold text-on-surface leading-tight">
                {isEntrada ? 'Entrada de material' : 'Retirada para produção'}
              </h2>
              <p className="text-xs text-on-surface-variant font-normal">
                {item.descricao} · saldo atual{' '}
                <span className="font-semibold text-on-surface tabular-nums">
                  {item.estoqueAtual.toLocaleString('pt-BR')} {unidadeFmt}
                </span>
              </p>
            </div>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Fechar formulário"
            className="p-1.5 rounded-xl text-outline hover:text-on-surface bg-surface-container hover:bg-surface-container-high transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 text-xs">
          {erro && (
            <div className="p-3 rounded-xl bg-error-container/40 border border-error/20 text-error flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          {/* Importador Rápido de XML NF-e (3.0) */}
          {isEntrada && (
            <div className="p-3 bg-surface-container-low border border-primary/20 rounded-xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary shrink-0" />
                <div>
                  <span className="font-bold text-on-surface block text-[11px]">Importar XML da NF-e</span>
                  <span className="text-[10px] text-secondary">Preenche número, fornecedor, quantidade e lote</span>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xml"
                onChange={handleImportarXml}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-[11px] font-semibold text-primary bg-primary/10 hover:bg-primary hover:text-on-primary transition-colors cursor-pointer shrink-0"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Carregar XML</span>
              </button>
            </div>
          )}

          {/* Data e Quantidade */}
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5 font-medium text-on-surface-variant">
              <span>{isEntrada ? 'Data de chegada *' : 'Data da retirada *'}</span>
              <input
                type="date"
                required
                max={hoje}
                value={dataMov}
                onChange={(e) => setDataMov(e.target.value)}
                className="p-2.5 rounded-xl border border-outline-variant/30 bg-surface-container-lowest text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </label>

            <label className="flex flex-col gap-1.5 font-medium text-on-surface-variant">
              <span>Quantidade ({unidadeFmt}) *</span>
              <input
                type="number"
                min={1}
                required
                value={quantidade}
                onChange={(e) => setQuantidade(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="p-2.5 rounded-xl border border-outline-variant/30 bg-surface-container-lowest text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all tabular-nums font-semibold"
              />
            </label>
          </div>

          {/* Entrada: Lote e Custo Médio Unitário | Saída: Lote e Seleção de Colaborador */}
          {isEntrada ? (
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5 font-medium text-on-surface-variant">
                <span>Número do Lote</span>
                <input
                  type="text"
                  value={lote}
                  onChange={(e) => setLote(e.target.value)}
                  placeholder="Ex: LOTE-2026-A"
                  className="p-2.5 rounded-xl border border-outline-variant/30 bg-surface-container-lowest text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-mono"
                />
              </label>

              <label className="flex flex-col gap-1.5 font-medium text-on-surface-variant">
                <span>Custo Unitário (R$)</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={valorUnitario}
                  onChange={(e) => setValorUnitario(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="p-2.5 rounded-xl border border-outline-variant/30 bg-surface-container-lowest text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-mono"
                />
              </label>
            </div>
          ) : (
            <div className="space-y-3">
              <label className="flex flex-col gap-1.5 font-medium text-on-surface-variant">
                <span>Lote (FIFO Sugerido)</span>
                <input
                  type="text"
                  value={lote}
                  onChange={(e) => setLote(e.target.value)}
                  placeholder="Padrão: Mais antigo"
                  className="p-2.5 rounded-xl border border-outline-variant/30 bg-surface-container-lowest text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-mono"
                />
              </label>

              <ColaboradorSelect
                value={colaboradorSelecionado?.id}
                onChange={(colab) => setColaboradorSelecionado(colab)}
                required
                label="Retirado por / Colaborador Solicitante"
                placeholder="Selecione ou busque por nome/matrícula..."
              />
            </div>
          )}

          {/* Campos específicos da Entrada */}
          {isEntrada && (
            <div className="space-y-3 pt-1">
              {camposEntrada.filter((c) => c !== 'Lote').map((campo) => (
                <label key={campo} className="flex flex-col gap-1.5 font-medium text-on-surface-variant">
                  <span>{campo}</span>
                  <input
                    type="text"
                    value={camposInfo[campo] || ''}
                    onChange={(e) =>
                      setCamposInfo((prev) => ({
                        ...prev,
                        [campo]: e.target.value,
                      }))
                    }
                    placeholder={`Informar ${campo.toLowerCase()}`}
                    className="p-2.5 rounded-xl border border-outline-variant/30 bg-surface-container-lowest text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </label>
              ))}
            </div>
          )}

          {/* Observações Gerais */}
          <label className="flex flex-col gap-1.5 font-medium text-on-surface-variant">
            <span>Observação</span>
            <input
              type="text"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Ex: Ordem de produção #104, reposição preventiva, etc."
              className="p-2.5 rounded-xl border border-outline-variant/30 bg-surface-container-lowest text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </label>

          {/* Botão de Envio */}
          <button
            type="submit"
            disabled={isSubmitting}
            className={`mt-4 w-full h-10 px-4 rounded-xl text-xs font-semibold text-white transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
              isEntrada
                ? 'bg-tertiary hover:bg-tertiary/90 text-on-tertiary'
                : 'bg-error hover:bg-error/90 text-on-error'
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processando movimentação...</span>
              </>
            ) : (
              <>
                {isEntrada ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                <span>{isEntrada ? 'Registrar entrada' : 'Registrar retirada'}</span>
              </>
            )}
          </button>
        </form>
      </aside>
    </div>
  );
}
