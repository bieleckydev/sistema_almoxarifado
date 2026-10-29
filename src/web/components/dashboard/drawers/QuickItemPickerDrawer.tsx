'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Search, Package, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { type DashboardItem, METADADOS_ABAS, UNIDADE_LABELS } from '@/web/data/mock-almoxarifado';
import { db } from '@/core/services/firebase';
import { collection, getDocs } from 'firebase/firestore';

export interface QuickItemPickerDrawerProps {
  isOpen: boolean;
  tipo: 'Entrada' | 'Saída';
  onClose: () => void;
  onSelectItem: (item: DashboardItem) => void;
}

export function QuickItemPickerDrawer({
  isOpen,
  tipo,
  onClose,
  onSelectItem,
}: QuickItemPickerDrawerProps) {
  const [busca, setBusca] = useState('');
  const [todosItens, setTodosItens] = useState<DashboardItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Carrega itens para o picker
  useEffect(() => {
    if (isOpen) {
      setBusca('');
      setIsLoading(true);

      const carregarItens = async () => {
        try {
          const snap = await getDocs(collection(db, 'items'));
          const lista: DashboardItem[] = [];

          snap.forEach((doc) => {
            const d = doc.data();
            let aba: DashboardItem['aba'] = 'mp';
            if (d.tipo === 'IMPRODUTIVO_CONSUMIVEL') aba = 'imp';
            else if (d.tipo === 'ACABADO') aba = 'motos';

            lista.push({
              id: doc.id,
              descricao: String(d.descricao || d.nome || 'Material'),
              codigo: String(d.codigo || ''),
              categoria: String(d.categoria || METADADOS_ABAS[aba].titulo),
              aba,
              tipo: d.tipo || 'PRODUTIVO_MATERIA_PRIMA',
              unidade: d.unidade || 'UNIDADE',
              estoqueAtual: Number(d.estoqueAtual) || 0,
              estoqueSeguranca: Number(d.estoqueSeguranca) || 0,
              capacidadeMaxima: Number(d.capacidadeMaxima) || 100,
              especificacoes: (d.especificacoes as Record<string, string>) || {},
              ativo: d.ativo ?? true,
            });
          });

          setTodosItens(lista);
        } catch (err) {
          console.warn('Erro ao carregar itens no picker:', err);
        } finally {
          setIsLoading(false);
          setTimeout(() => inputRef.current?.focus(), 50);
        }
      };

      carregarItens();
    }
  }, [isOpen]);

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

  if (!isOpen) return null;

  const termoLimpo = busca.trim().toLowerCase();
  const itensFiltrados = todosItens
    .filter((it) => {
      if (!termoLimpo) return true;
      const campos = [
        it.descricao,
        it.codigo,
        it.categoria,
        ...Object.values(it.especificacoes || {}),
      ];
      return campos.some((val) => val && String(val).toLowerCase().includes(termoLimpo));
    })
    .slice(0, 30);

  const isEntrada = tipo === 'Entrada';

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
        aria-label={isEntrada ? 'Escolha o item para entrada' : 'Escolha o item para saída'}
        className="relative w-full max-w-md bg-surface-container-lowest border-l border-outline-variant/30 flex flex-col h-full z-10 animate-in slide-in-from-right duration-200"
      >
        {/* Cabeçalho */}
        <div className="p-6 pb-4 border-b border-outline-variant/20 flex items-start justify-between gap-3 shrink-0">
          <div>
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
              <h2 className="font-headline text-base font-bold text-on-surface leading-tight">
                {isEntrada ? 'Registrar entrada' : 'Registrar saída'}
              </h2>
            </div>
            <p className="text-xs text-on-surface-variant mt-1 font-normal">
              Escolha o item do almoxarifado para movimentar.
            </p>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Fechar seletor"
            className="p-1.5 rounded-xl text-outline hover:text-on-surface bg-surface-container hover:bg-surface-container-high transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Campo de Busca Rápida */}
        <div className="p-4 border-b border-outline-variant/20 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline pointer-events-none" />
            <input
              ref={inputRef}
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome ou código..."
              aria-label="Filtrar materiais"
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-outline-variant/30 bg-surface-container-lowest text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
        </div>

        {/* Lista de Produtos Encontrados */}
        <div className="flex-1 overflow-y-auto divide-y divide-outline-variant/10">
          {isLoading ? (
            <div className="p-6 text-center text-xs text-on-surface-variant animate-pulse">
              Carregando catálogo de materiais...
            </div>
          ) : itensFiltrados.length === 0 ? (
            <div className="p-8 text-center text-xs text-on-surface-variant">
              Nenhum material encontrado com o termo informado.
            </div>
          ) : (
            itensFiltrados.map((item) => {
              const unidadeFmt = UNIDADE_LABELS[item.unidade] || item.unidade.toLowerCase();
              const abaNome = METADADOS_ABAS[item.aba]?.titulo || 'Estoque';

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectItem(item)}
                  className="w-full p-3.5 flex items-center justify-between gap-3 text-left hover:bg-surface-container-low transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-surface-container-high border border-outline-variant/20 flex items-center justify-center text-on-surface-variant shrink-0">
                      <Package className="w-4 h-4" />
                    </div>

                    <div className="min-w-0">
                      <b className="block text-xs font-semibold text-on-surface truncate group-hover:text-primary transition-colors">
                        {item.descricao}
                      </b>
                      <small className="block text-[11px] text-on-surface-variant truncate mt-0.5 font-normal">
                        {item.codigo} · {abaNome}
                      </small>
                    </div>
                  </div>

                  <span className="text-xs font-mono font-medium text-on-surface tabular-nums shrink-0 px-2 py-0.5 rounded-lg bg-surface-container border border-outline-variant/20">
                    {item.estoqueAtual.toLocaleString('pt-BR')} {unidadeFmt}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </aside>
    </div>
  );
}
