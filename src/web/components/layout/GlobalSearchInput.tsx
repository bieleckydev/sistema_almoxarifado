'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Package, FileText, Users, ShoppingCart, Loader2 } from 'lucide-react';
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
        <Search className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />

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
          placeholder="Buscar item, cliente, pedido ou NF-e   ( / )"
          autoComplete="off"
          aria-label="Busca geral no almoxarifado"
          className="w-full pl-9 pr-16 py-2 text-xs rounded-md border border-slate-300 dark:border-[#3e3e42] bg-white dark:bg-[#2b2b2e] text-slate-900 dark:text-[#ececee] placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1.5 focus:ring-[#1d4ea3] dark:focus:ring-[#5aa9ea] transition-colors"
        />

        <div className="absolute right-2.5 flex items-center gap-1.5">
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />
          ) : termo ? (
            <button
              type="button"
              onClick={() => {
                setTermo('');
                setIsOpen(false);
                inputRef.current?.focus();
              }}
              className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              title="Limpar busca"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono font-semibold text-slate-400 bg-slate-200/60 dark:bg-[#1a1a1c] rounded border border-slate-300/60 dark:border-[#3e3e42] select-none">
              /
            </kbd>
          )}
        </div>
      </div>

      {/* Dropdown com Resultados Categorizados */}
      {isOpen && termo.trim().length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-[#2b2b2e] border border-slate-200 dark:border-[#3e3e42] rounded-md shadow-lg overflow-hidden z-50 max-h-[380px] overflow-y-auto divide-y divide-slate-100 dark:divide-[#3e3e42]">
          {resultados.length === 0 ? (
            <div className="p-5 text-center text-xs text-slate-500 dark:text-slate-400">
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
                  className="w-full px-4 py-2.5 flex items-center justify-between gap-3 text-left hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-1.5 rounded-md bg-slate-100 dark:bg-[#1a1a1c] text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <b className="block text-xs font-semibold text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {res.title}
                      </b>
                      <small className="block text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {res.subtitle}
                      </small>
                    </div>
                  </div>

                  {res.badge && (
                    <span className="text-xs font-mono font-medium text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 shrink-0">
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
