'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  X,
  Package,
  FileText,
  Users,
  ShoppingCart,
  Loader2,
  Receipt,
  Layers,
} from 'lucide-react';
import { useGlobalSearch, type GlobalSearchResult } from '@/web/hooks/useGlobalSearch';

export interface GlobalSearchInputProps {
  onSelectResult: (result: GlobalSearchResult) => void;
  className?: string;
}

const RESULT_ICONS: Record<GlobalSearchResult['type'], React.ComponentType<{ className?: string }>> = {
  item: Package,
  nfe: FileText,
  cliente: Users,
  pedido: ShoppingCart,
  faturamento: Receipt,
  terceiro: Layers,
};

export function GlobalSearchInput({ onSelectResult, className = '' }: GlobalSearchInputProps) {
  const [termo, setTermo] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { resultados, isLoading } = useGlobalSearch(termo);

  // Atalhos globais de teclado: '/' ou 'Ctrl+K' / 'Cmd+K' e 'Escape'
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignora se estiver digitando em outros inputs ou textareas
      const targetTag = (e.target as HTMLElement)?.tagName;
      const isInput = targetTag === 'INPUT' || targetTag === 'TEXTAREA' || targetTag === 'SELECT';

      if (e.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
        return;
      }

      if ((e.key === '/' && !isInput) || (e.key.toLowerCase() === 'k' && (e.ctrlKey || e.metaKey))) {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fechar ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (res: GlobalSearchResult) => {
    setIsOpen(false);
    setTermo('');
    onSelectResult(res);
  };

  return (
    <div ref={containerRef} className={`relative flex-1 max-w-md w-full ${className}`}>
      {/* Campo de Busca Principal com atalho visível */}
      <div className="relative flex items-center">
        <Search className="absolute left-3 w-4 h-4 text-outline pointer-events-none" />

        <input
          ref={inputRef}
          type="search"
          value={termo}
          onChange={(e) => {
            setTermo(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            if (termo.trim()) setIsOpen(true);
          }}
          placeholder="Buscar item, SKU ou pedido..."
          autoComplete="off"
          aria-label="Busca geral no almoxarifado"
          className="w-full pl-9 pr-14 py-1.5 text-xs sm:text-sm rounded-lg bg-surface-container text-on-surface placeholder:text-outline focus:outline-none focus:bg-surface-container-lowest focus:ring-1.5 focus:ring-primary transition-all border-0 shadow-inner"
        />

        <div className="absolute right-2 flex items-center gap-1.5">
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
          ) : termo ? (
            <button
              type="button"
              onClick={() => {
                setTermo('');
                setIsOpen(false);
                inputRef.current?.focus();
              }}
              className="p-1 rounded text-outline hover:text-on-surface cursor-pointer"
              title="Limpar busca"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono font-semibold text-on-surface-variant bg-surface-container-highest rounded border border-outline-variant/30 select-none">
              ⌘K
            </kbd>
          )}
        </div>
      </div>

      {/* Dropdown com Resultados Categorizados */}
      {isOpen && termo.trim().length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-surface-container-lowest border border-outline-variant/30 rounded-xl shadow-lg overflow-hidden z-50 max-h-[380px] overflow-y-auto divide-y divide-outline-variant/20">
          {resultados.length === 0 ? (
            <div className="p-5 text-center text-xs text-on-surface-variant">
              Nada encontrado para &ldquo;{termo}&rdquo;.
            </div>
          ) : (
            resultados.map((res) => {
              const Icon = RESULT_ICONS[res.type];
              return (
                <button
                  key={res.id}
                  type="button"
                  onClick={() => handleSelect(res)}
                  className="w-full px-4 py-2.5 flex items-center justify-between gap-3 text-left hover:bg-surface-container transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-surface-container text-primary group-hover:bg-primary-container group-hover:text-on-primary transition-colors shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <b className="block text-xs font-semibold text-on-surface truncate group-hover:text-primary transition-colors">
                        {res.title}
                      </b>
                      <small className="block text-[11px] text-on-surface-variant truncate">
                        {res.subtitle}
                      </small>
                    </div>
                  </div>

                  {res.badge && (
                    <span className="font-label-sm text-[10px] uppercase font-bold text-on-surface-variant px-2 py-0.5 rounded bg-surface-container-highest shrink-0">
                      {res.badge}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
