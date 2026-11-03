'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, Loader2, RotateCcw, Search, X } from 'lucide-react';
import { api } from '@/core/api/client';
import type { Item } from '@/core/domain/item.schema';
import { type AbaEstoque, METADADOS_ABAS } from '@/web/data/mock-almoxarifado';
import { useToast } from '@/web/hooks/useToast';

export interface InactiveItemsDrawerProps {
  isOpen: boolean;
  aba: AbaEstoque;
  onClose: () => void;
  onItemReativado: () => void;
}

/**
 * Lista os itens inativos da categoria atual e permite reativá-los.
 */
export function InactiveItemsDrawer({ isOpen, aba, onClose, onItemReativado }: InactiveItemsDrawerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [busca, setBusca] = useState('');
  const [reativandoId, setReativandoId] = useState<string | null>(null);

  const tipo = METADADOS_ABAS[aba].tipoDominio;
  const { data: itens = [], isLoading, error } = useQuery({
    queryKey: ['itens-inativos', tipo],
    enabled: isOpen,
    queryFn: async () => {
      const res = await api.get<{ itens: Item[] }>('/itens', {
        params: { tipo, apenasAtivos: 'false', limite: '1000' },
      });
      return res.data.itens.filter((i) => i.ativo === false);
    },
  });

  useEffect(() => {
    if (!isOpen) return;
    setBusca('');
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    const t = setTimeout(() => closeButtonRef.current?.focus(), 50);
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const termo = busca.trim().toLowerCase();
  const filtrados = termo
    ? itens.filter(
        (i) => i.codigo.toLowerCase().includes(termo) || i.descricao.toLowerCase().includes(termo)
      )
    : itens;

  const reativar = async (item: Item) => {
    setReativandoId(item.id);
    try {
      await api.patch(`/itens/${item.id}`, { ativo: true });
      toast(`Item ${item.codigo} reativado.`, { type: 'success' });
      await queryClient.invalidateQueries({ queryKey: ['itens-inativos'] });
      onItemReativado();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Falha ao reativar o item.', { type: 'error' });
    } finally {
      setReativandoId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="fixed inset-0 bg-inverse-surface/60 transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Itens inativos"
        className="relative w-full max-w-lg bg-surface-container-lowest border-l border-outline-variant/30 flex flex-col h-full z-10 animate-in slide-in-from-right duration-250"
      >
        <div className="px-6 py-4 border-b border-outline-variant/20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-surface-container-high flex items-center justify-center text-on-surface-variant shrink-0">
              <Archive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-headline text-lg font-bold text-on-surface">Itens inativos</h2>
              <p className="text-xs text-secondary">{METADADOS_ABAS[aba].titulo}</p>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Fechar painel de itens inativos"
            className="p-1.5 rounded-xl text-outline hover:text-on-surface bg-surface-container hover:bg-surface-container-high transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-3 border-b border-outline-variant/20">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline pointer-events-none" />
            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por código ou descrição..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-outline-variant/30 bg-surface-container-lowest text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="py-16 text-center text-xs text-on-surface-variant">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
              Carregando itens inativos...
            </div>
          ) : error ? (
            <p className="py-16 text-center text-xs text-error">
              Não foi possível carregar os itens inativos.
            </p>
          ) : filtrados.length === 0 ? (
            <p className="py-16 text-center text-xs text-on-surface-variant">
              {termo ? 'Nenhum item inativo corresponde à busca.' : 'Nenhum item inativo nesta categoria.'}
            </p>
          ) : (
            <ul className="divide-y divide-outline-variant/10">
              {filtrados.map((item) => (
                <li key={item.id} className="px-6 py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-xs font-semibold text-on-surface">{item.codigo}</p>
                    <p className="text-xs text-on-surface-variant truncate">{item.descricao}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => reativar(item)}
                    disabled={reativandoId !== null}
                    className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-xs font-semibold text-primary hover:bg-primary-container/20 border border-primary/30 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    {reativandoId === item.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RotateCcw className="w-3.5 h-3.5" />
                    )}
                    Reativar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}
