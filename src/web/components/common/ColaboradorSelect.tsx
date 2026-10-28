'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { User, Search, ChevronDown, Check, X, Loader2, AlertCircle } from 'lucide-react';
import { useColaboradores } from '@/web/hooks/useColaboradores';
import {
  type Colaborador,
  SETOR_FABRIL_LABELS,
  type SetorFabril,
} from '@/core/domain/colaborador.schema';

export interface ColaboradorSelectProps {
  value?: string;
  onChange?: (colaborador: Colaborador | null) => void;
  disabled?: boolean;
  required?: boolean;
  error?: string | null;
  label?: string;
  placeholder?: string;
  setorFiltro?: SetorFabril;
  className?: string;
  id?: string;
}

export function ColaboradorSelect({
  value,
  onChange,
  disabled = false,
  required = false,
  error,
  label = 'Colaborador Solicitante *',
  placeholder = 'Buscar por nome ou matrícula...',
  setorFiltro,
  className = '',
  id = 'colaborador-select',
}: ColaboradorSelectProps) {
  const { colaboradores, isLoading } = useColaboradores({
    apenasAtivos: true,
    limite: 100,
    setor: setorFiltro,
  });

  const [isOpen, setIsOpen] = useState(false);
  const [termoBusca, setTermoBusca] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Colaborador atualmente selecionado
  const colaboradorSelecionado = useMemo(() => {
    if (!value) return null;
    return colaboradores.find((c) => c.id === value || c.matricula === value) || null;
  }, [value, colaboradores]);

  // Lista filtrada em memória para resposta instantânea na digitação
  const colaboradoresFiltrados = useMemo(() => {
    if (!termoBusca.trim()) return colaboradores;
    const t = termoBusca.trim().toLowerCase();
    return colaboradores.filter(
      (c) =>
        c.nome.toLowerCase().includes(t) ||
        c.matricula.includes(t) ||
        (c.funcao && c.funcao.toLowerCase().includes(t)) ||
        (SETOR_FABRIL_LABELS[c.setor] && SETOR_FABRIL_LABELS[c.setor].toLowerCase().includes(t))
    );
  }, [colaboradores, termoBusca]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Foca no input de busca ao abrir
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setTermoBusca('');
    }
  }, [isOpen]);

  const handleSelect = (colaborador: Colaborador) => {
    onChange?.(colaborador);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange?.(null);
  };

  return (
    <div className={`flex flex-col gap-1.5 ${className}`} ref={containerRef}>
      {label && (
        <label htmlFor={id} className="font-medium text-on-surface-variant flex items-center justify-between">
          <span>
            {label} {required && <span className="text-error">*</span>}
          </span>
          {colaboradorSelecionado && (
            <span className="text-xs text-primary font-medium bg-primary/10 px-2 py-0.5 rounded-full">
              Setor: {SETOR_FABRIL_LABELS[colaboradorSelecionado.setor] || colaboradorSelecionado.setor}
            </span>
          )}
        </label>
      )}

      {/* Gatilho do Dropdown */}
      <div className="relative">
        <button
          type="button"
          id={id}
          disabled={disabled || isLoading}
          onClick={() => setIsOpen((prev) => !prev)}
          className={`w-full min-h-[44px] px-3 py-2 rounded-xl border text-left flex items-center justify-between gap-2 transition-all ${
            error
              ? 'border-error bg-error/5 focus:ring-2 focus:ring-error/20'
              : isOpen
              ? 'border-primary ring-2 ring-primary/20 bg-surface-container-lowest'
              : 'border-outline-variant/30 bg-surface-container-lowest hover:border-outline-variant/60'
          } ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-7 h-7 rounded-lg bg-surface-container-high flex items-center justify-center shrink-0 text-on-surface-variant">
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              ) : (
                <User className="w-4 h-4" />
              )}
            </div>

            {colaboradorSelecionado ? (
              <div className="min-w-0 flex-1 flex items-center gap-2">
                <span className="font-mono text-xs font-semibold px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant shrink-0">
                  #{colaboradorSelecionado.matricula}
                </span>
                <span className="font-medium text-on-surface truncate text-sm">
                  {colaboradorSelecionado.nome}
                </span>
                <span className="text-xs text-on-surface-variant truncate hidden sm:inline">
                  • {colaboradorSelecionado.funcao}
                </span>
              </div>
            ) : (
              <span className="text-sm text-outline truncate">
                {isLoading ? 'Carregando colaboradores...' : placeholder}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {colaboradorSelecionado && !disabled && (
              <span
                role="button"
                tabIndex={0}
                onClick={handleClear}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onChange?.(null);
                  }
                }}
                className="p-1 text-on-surface-variant hover:text-error rounded-md transition-colors"
                title="Limpar seleção"
              >
                <X className="w-3.5 h-3.5" />
              </span>
            )}
            <ChevronDown
              className={`w-4 h-4 text-on-surface-variant transition-transform duration-200 ${
                isOpen ? 'rotate-180 text-primary' : ''
              }`}
            />
          </div>
        </button>

        {/* Menu Flutuante */}
        {isOpen && (
          <div className="absolute z-50 left-0 right-0 mt-1.5 bg-surface-container-lowest border border-outline-variant/30 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Input de Busca Rápida */}
            <div className="p-2 border-b border-outline-variant/15 bg-surface-container/30">
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 absolute left-2.5 text-on-surface-variant" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={termoBusca}
                  onChange={(e) => setTermoBusca(e.target.value)}
                  placeholder="Filtrar por nome, matrícula ou setor..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-surface-container border border-outline-variant/30 text-on-surface placeholder:text-outline focus:outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>

            {/* Lista de Opções */}
            <div className="max-h-56 overflow-y-auto divide-y divide-outline-variant/10">
              {colaboradoresFiltrados.length === 0 ? (
                <div className="p-4 text-center text-xs text-on-surface-variant flex flex-col items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-outline" />
                  <span>Nenhum colaborador ativo encontrado.</span>
                  {termoBusca && (
                    <span className="text-[11px] text-outline">Tente outro termo de busca.</span>
                  )}
                </div>
              ) : (
                colaboradoresFiltrados.map((colab) => {
                  const isSelected = colab.id === value || colab.matricula === value;
                  return (
                    <button
                      key={colab.id}
                      type="button"
                      onClick={() => handleSelect(colab)}
                      className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'hover:bg-surface-container text-on-surface'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="font-mono text-[11px] px-1 py-0.5 rounded bg-surface-container-high text-on-surface-variant shrink-0 font-semibold">
                          #{colab.matricula}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-on-surface">{colab.nome}</p>
                          <p className="truncate text-[11px] text-on-surface-variant">
                            {colab.funcao} • {SETOR_FABRIL_LABELS[colab.setor] || colab.setor}
                          </p>
                        </div>
                      </div>

                      {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {error && <span className="text-xs text-error font-medium">{error}</span>}
    </div>
  );
}
