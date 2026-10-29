'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  ArrowRightLeft,
  Factory,
  RotateCcw,
  Calendar,
  FileText,
  DollarSign,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Layers,
  Building2,
  Trash2,
} from 'lucide-react';
import type { MaterialTerceiroEnriquecido } from '@/web/app/api/terceiros/route';
import type {
  ConsumirMaterialTerceiroInput,
  DevolverMaterialTerceiroInput,
} from '@/core/domain/material-terceiro.schema';

export interface MovimentarTerceiroDrawerProps {
  isOpen: boolean;
  material: MaterialTerceiroEnriquecido | null;
  onClose: () => void;
  onConsumir: (dados: ConsumirMaterialTerceiroInput) => Promise<void>;
  onDevolver: (dados: DevolverMaterialTerceiroInput) => Promise<void>;
  onSucata?: (dados: {
    materialTerceiroId: string;
    quantidade: number;
    dataMovimentacao?: string;
    motivo: string;
    responsavel?: string;
    observacao?: string;
  }) => Promise<void>;
  isSalvando?: boolean;
}

type TipoOperacao = 'CONSUMO' | 'DEVOLUCAO' | 'SUCATA';

export function MovimentarTerceiroDrawer({
  isOpen,
  material,
  onClose,
  onConsumir,
  onDevolver,
  onSucata,
  isSalvando = false,
}: MovimentarTerceiroDrawerProps) {
  const inputQtdRef = useRef<HTMLInputElement | null>(null);
  const hoje = new Date().toISOString().slice(0, 10);

  const [tipoOperacao, setTipoOperacao] = useState<TipoOperacao>('CONSUMO');
  const [quantidade, setQuantidade] = useState<number | ''>(1);
  const [dataMovimentacao, setDataMovimentacao] = useState(hoje);
  const [ordemProducao, setOrdemProducao] = useState('');
  const [numeroNFRetorno, setNumeroNFRetorno] = useState('');
  const [valorServico, setValorServico] = useState<number | ''>(0);
  const [motivoSucata, setMotivoSucata] = useState('Refugo de Usinagem');
  const [responsavel, setResponsavel] = useState('Produção');
  const [observacao, setObservacao] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && material) {
      setTipoOperacao('CONSUMO');
      setQuantidade(1);
      setDataMovimentacao(new Date().toISOString().slice(0, 10));
      setOrdemProducao('');
      setNumeroNFRetorno('');
      setValorServico(0);
      setMotivoSucata('Refugo de Usinagem');
      setResponsavel('Produção');
      setObservacao('');
      setErro(null);

      setTimeout(() => inputQtdRef.current?.focus(), 150);
    }
  }, [isOpen, material]);

  useEffect(() => {
    if (tipoOperacao === 'CONSUMO' || tipoOperacao === 'SUCATA') {
      setResponsavel('Produção');
    } else {
      setResponsavel('Expedição');
    }
  }, [tipoOperacao]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !material) return null;

  const saldoDisponivel = material.saldoAtual;
  const qtdNumero = typeof quantidade === 'number' ? quantidade : 0;
  const saldoAposOperacao = Math.max(0, saldoDisponivel - qtdNumero);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    if (!quantidade || Number(quantidade) <= 0) {
      setErro('Informe uma quantidade maior que zero.');
      return;
    }

    if (Number(quantidade) > saldoDisponivel) {
      setErro(
        `Saldo insuficiente. O cliente possui apenas ${saldoDisponivel} ${material.unidade} sob custódia.`
      );
      return;
    }

    try {
      if (tipoOperacao === 'CONSUMO') {
        if (!ordemProducao.trim()) {
          setErro('Informe o número da Ordem de Produção (O.P.) ou documento de requisição.');
          return;
        }

        await onConsumir({
          materialTerceiroId: material.id,
          quantidade: Number(quantidade),
          dataMovimentacao,
          ordemProducaoOuDocumento: ordemProducao.trim(),
          responsavel: responsavel.trim() || undefined,
          observacao: observacao.trim() || undefined,
        });
      } else if (tipoOperacao === 'DEVOLUCAO') {
        if (!numeroNFRetorno.trim()) {
          setErro('Informe o número da NF-e de Retorno emitida.');
          return;
        }

        await onDevolver({
          materialTerceiroId: material.id,
          quantidade: Number(quantidade),
          dataMovimentacao,
          numeroNFRetorno: numeroNFRetorno.trim(),
          valorServico: valorServico === '' ? 0 : Number(valorServico),
          responsavel: responsavel.trim() || undefined,
          observacao: observacao.trim() || undefined,
        });
      } else {
        if (!motivoSucata.trim()) {
          setErro('Informe o motivo do refugo ou perda de material.');
          return;
        }

        if (onSucata) {
          await onSucata({
            materialTerceiroId: material.id,
            quantidade: Number(quantidade),
            dataMovimentacao,
            motivo: motivoSucata.trim(),
            responsavel: responsavel.trim() || undefined,
            observacao: observacao.trim() || undefined,
          });
        }
      }
      onClose();
    } catch (err: any) {
      setErro(err.message || 'Erro ao registrar movimentação de terceiro.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 flex justify-end animate-fade-in">
      <div
        className="w-full max-w-lg bg-surface-container-lowest dark:bg-slate-900 h-full flex flex-col border-l border-outline-variant/30 animate-slide-left"
        role="dialog"
        aria-modal="true"
      >
        {/* Cabeçalho */}
        <div className="p-5 border-b border-outline-variant/30 flex items-center justify-between bg-surface-container-low dark:bg-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Movimentar Material de Terceiro
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Apontamento de consumo fabril ou devolução ao cliente
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Card Resumo do Material Selecionado */}
        <div className="p-4 mx-6 mt-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-blue-500" />
              {material.clienteNome}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
              Custódia
            </span>
          </div>
          <p className="text-xs font-bold text-slate-900 dark:text-white">
            {material.descricao}
          </p>
          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
            <span className="text-slate-500 dark:text-slate-400">
              Saldo Atual em Estoque:
            </span>
            <span className="font-extrabold text-blue-600 dark:text-blue-400">
              {material.saldoAtual} {material.unidade}
            </span>
          </div>
        </div>

        {/* Seletor de Tipo de Operação (Tabs) */}
        <div className="px-6 pt-4">
          <div className="grid grid-cols-3 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 gap-1">
            <button
              type="button"
              onClick={() => setTipoOperacao('CONSUMO')}
              className={`flex items-center justify-center gap-1.5 py-2 px-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                tipoOperacao === 'CONSUMO'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Factory className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Consumo O.P.</span>
            </button>
            <button
              type="button"
              onClick={() => setTipoOperacao('DEVOLUCAO')}
              className={`flex items-center justify-center gap-1.5 py-2 px-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                tipoOperacao === 'DEVOLUCAO'
                  ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Devolução</span>
            </button>
            <button
              type="button"
              onClick={() => setTipoOperacao('SUCATA')}
              className={`flex items-center justify-center gap-1.5 py-2 px-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                tipoOperacao === 'SUCATA'
                  ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Sucata/Perda</span>
            </button>
          </div>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {erro && (
            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 flex items-start gap-2.5 text-xs text-red-700 dark:text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{erro}</span>
            </div>
          )}

          {/* Quantidade e Saldo Resultante */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Quantidade a {tipoOperacao === 'CONSUMO' ? 'Consumir' : tipoOperacao === 'DEVOLUCAO' ? 'Devolver' : 'Descartar'} *
              </label>
              <input
                ref={inputQtdRef}
                type="number"
                min="0.001"
                max={saldoDisponivel}
                step="any"
                value={quantidade}
                onChange={(e) =>
                  setQuantidade(e.target.value === '' ? '' : Number(e.target.value))
                }
                disabled={isSalvando}
                className="w-full px-3 py-2 text-xs font-bold rounded-xl bg-surface-container-low dark:bg-slate-800 border border-outline-variant/40 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                Saldo Resultante
              </label>
              <div className="px-3 py-2 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>{saldoAposOperacao}</span>
                <span className="text-[10px] text-slate-400">{material.unidade}</span>
              </div>
            </div>
          </div>

          {/* Campos Específicos por Tipo de Operação */}
          {tipoOperacao === 'CONSUMO' ? (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Ordem de Produção (O.P.) / Documento Fabril *
              </label>
              <div className="relative">
                <Factory className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={ordemProducao}
                  onChange={(e) => setOrdemProducao(e.target.value)}
                  placeholder="Ex: OP-2026-95 ou Ordem de Corte 12"
                  disabled={isSalvando}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-surface-container-low dark:bg-slate-800 border border-outline-variant/40 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
          ) : tipoOperacao === 'DEVOLUCAO' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Nº NF-e de Retorno Emitida *
                  </label>
                  <div className="relative">
                    <FileText className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      value={numeroNFRetorno}
                      onChange={(e) => setNumeroNFRetorno(e.target.value)}
                      placeholder="Ex: 5542"
                      disabled={isSalvando}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-surface-container-low dark:bg-slate-800 border border-outline-variant/40 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Valor Serviço / Industrialização (R$)
                  </label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={valorServico}
                      onChange={(e) =>
                        setValorServico(e.target.value === '' ? '' : Number(e.target.value))
                      }
                      placeholder="0,00"
                      disabled={isSalvando}
                      className="w-full pl-9 pr-3 py-2 text-xs font-semibold rounded-xl bg-surface-container-low dark:bg-slate-800 border border-outline-variant/40 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 text-[11px] text-blue-800 dark:text-blue-300 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Automação Fiscal:</strong> Ao registrar esta devolução, a NF-e de retorno{' '}
                  {numeroNFRetorno ? `nº ${numeroNFRetorno}` : ''} será integrada automaticamente ao{' '}
                  <strong>Módulo de Faturamento</strong> com tipo <em>Retorno de Industrialização</em>.
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Motivo da Sucata / Perda *
                </label>
                <div className="relative">
                  <Trash2 className="w-4 h-4 absolute left-3 top-2.5 text-rose-500" />
                  <input
                    type="text"
                    value={motivoSucata}
                    onChange={(e) => setMotivoSucata(e.target.value)}
                    placeholder="Ex: Refugo na usinagem, Peça avariada, Aparas"
                    disabled={isSalvando}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-surface-container-low dark:bg-slate-800 border border-outline-variant/40 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                    required
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 text-[11px] text-rose-800 dark:text-rose-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Baixa Operacional:</strong> A sucata ou refugo reduz imediatamente o saldo sob custódia do cliente e fica registrada para prestação de contas no relatório de terceiros e auditoria.
                </span>
              </div>
            </div>
          )}

          {/* Data e Responsável */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Data da Movimentação *
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="date"
                  value={dataMovimentacao}
                  onChange={(e) => setDataMovimentacao(e.target.value)}
                  disabled={isSalvando}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-surface-container-low dark:bg-slate-800 border border-outline-variant/40 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Responsável / Operador
              </label>
              <input
                type="text"
                value={responsavel}
                onChange={(e) => setResponsavel(e.target.value)}
                disabled={isSalvando}
                className="w-full px-3 py-2 text-xs rounded-xl bg-surface-container-low dark:bg-slate-800 border border-outline-variant/40 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Observações / Justificativa
            </label>
            <textarea
              rows={2}
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Ex: Corte de peças ou material com sobras devolvido"
              disabled={isSalvando}
              className="w-full px-3 py-2 text-xs rounded-xl bg-surface-container-low dark:bg-slate-800 border border-outline-variant/40 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        </form>

        {/* Rodapé */}
        <div className="p-4 border-t border-outline-variant/30 bg-surface-container-low dark:bg-slate-800/60 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSalvando}
            className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-xl transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSalvando}
            className={`inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50 ${
              tipoOperacao === 'CONSUMO'
                ? 'bg-blue-600 hover:bg-blue-700'
                : tipoOperacao === 'DEVOLUCAO'
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-rose-600 hover:bg-rose-700'
            }`}
          >
            {isSalvando ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Registrando Apontamento...</span>
              </>
            ) : (
              <>
                {tipoOperacao === 'SUCATA' ? (
                  <Trash2 className="w-4 h-4" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>
                  Confirmar {tipoOperacao === 'CONSUMO' ? 'Consumo' : tipoOperacao === 'DEVOLUCAO' ? 'Devolução' : 'Sucata / Perda'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
