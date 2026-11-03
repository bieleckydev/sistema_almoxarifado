'use client';

import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, HardHat, Pencil, Plus, RefreshCw, Search, X } from 'lucide-react';
import {
  type Colaborador,
  type SetorFabril,
  SETOR_FABRIL_LABELS,
} from '@/core/domain/colaborador.schema';
import { hasUserPermission } from '@/core/domain/user-authorization';
import { useAuthStore } from '@/core/store/useAuthStore';
import { useColaboradores } from '@/web/hooks/useColaboradores';
import { useDebounce } from '@/web/hooks/useDebounce';
import { FilterPill } from '@/web/components/ui/FilterPill';
import { ColaboradorFormDrawer } from './ColaboradorFormDrawer';

const POR_PAGINA = 50;
const SETORES = Object.keys(SETOR_FABRIL_LABELS) as SetorFabril[];

/**
 * Cadastro de colaboradores fabris usados nas baixas internas (EPIs, consumíveis, ferramentas).
 */
export function ColaboradoresView() {
  const user = useAuthStore((s) => s.user);
  const podeEditar = user ? hasUserPermission(user, 'catalog:manage') : false;

  const [busca, setBusca] = useState('');
  const [setor, setSetor] = useState<SetorFabril | ''>('');
  const [mostrarInativos, setMostrarInativos] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [drawer, setDrawer] = useState<{ aberto: boolean; colaborador: Colaborador | null }>({
    aberto: false,
    colaborador: null,
  });

  const buscaDebounced = useDebounce(busca, 300);

  // Volta para a primeira página quando os filtros mudam
  useEffect(() => {
    setPagina(1);
  }, [buscaDebounced, setor, mostrarInativos]);

  const { colaboradores, total, isLoading, isFetching, error, refetch } = useColaboradores({
    busca: buscaDebounced || undefined,
    setor: setor || undefined,
    apenasAtivos: !mostrarInativos,
    apenasInativos: mostrarInativos || undefined,
    pagina,
    limite: POR_PAGINA,
  });

  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const primeiro = total === 0 ? 0 : (pagina - 1) * POR_PAGINA + 1;
  const ultimo = Math.min(pagina * POR_PAGINA, total);

  return (
    <div className="flex-1 flex flex-col min-w-0 animate-fade-in pb-12">
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-outline-variant/20">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-primary-container/10 text-primary">
            <HardHat className="w-5 h-5" />
          </span>
          <div>
            <h1 className="font-headline text-xl md:text-2xl font-bold tracking-tight text-on-surface">
              Colaboradores
            </h1>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Funcionários da fábrica que retiram materiais nas baixas internas.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-center shrink-0">
          {podeEditar && (
            <button
              type="button"
              onClick={() => setDrawer({ aberto: true, colaborador: null })}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-xl text-xs font-semibold text-white bg-primary hover:bg-primary/90 transition-all shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Novo colaborador</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isLoading || isFetching}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-medium text-on-surface bg-surface-container-lowest border border-outline-variant/30 hover:bg-surface-container transition-all cursor-pointer disabled:opacity-50"
            title="Atualizar lista"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>
        </div>
      </section>

      <section className="flex flex-wrap items-center gap-3 mb-4">
        <div
          className="flex items-center gap-1.5 p-1 bg-surface-container-low rounded-xl border border-outline-variant/20"
          role="group"
          aria-label="Filtro de situação"
        >
          <FilterPill label="Ativos" isActive={!mostrarInativos} onClick={() => setMostrarInativos(false)} />
          <FilterPill label="Inativos" isActive={mostrarInativos} onClick={() => setMostrarInativos(true)} />
        </div>

        <select
          value={setor}
          onChange={(e) => setSetor(e.target.value as SetorFabril | '')}
          aria-label="Filtrar por setor"
          className="h-9 px-3 text-xs rounded-xl border border-outline-variant/30 bg-surface-container-lowest text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
        >
          <option value="">Todos os setores</option>
          {SETORES.map((s) => (
            <option key={s} value={s}>
              {SETOR_FABRIL_LABELS[s]}
            </option>
          ))}
        </select>

        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-outline pointer-events-none" />
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && setBusca('')}
            placeholder="Buscar por nome, matrícula ou função..."
            className="w-full pl-10 pr-9 py-2 text-xs rounded-xl border border-outline-variant/30 bg-surface-container-lowest text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
          {busca && (
            <button
              type="button"
              onClick={() => setBusca('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-outline hover:text-on-surface cursor-pointer"
              title="Limpar busca"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </section>

      <div className="w-full bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-outline-variant/20 bg-surface-container-low text-on-surface-variant select-none">
                <th className="py-3 px-4 whitespace-nowrap">Matrícula</th>
                <th className="py-3 px-3">Nome</th>
                <th className="py-3 px-3">Setor</th>
                <th className="py-3 px-3">Função</th>
                <th className="py-3 px-3">Contato</th>
                <th className="py-3 px-4 text-right">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-on-surface-variant">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                    Carregando colaboradores...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-error">
                    Não foi possível carregar os colaboradores. Tente atualizar.
                  </td>
                </tr>
              ) : colaboradores.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-on-surface-variant">
                    {buscaDebounced || setor
                      ? 'Nenhum colaborador corresponde aos filtros.'
                      : mostrarInativos
                        ? 'Nenhum colaborador inativo.'
                        : 'Nenhum colaborador cadastrado.'}
                  </td>
                </tr>
              ) : (
                colaboradores.map((c) => (
                  <tr key={c.id} className="hover:bg-surface-container-low/70 transition-colors">
                    <td className="py-2.5 px-4 font-mono font-semibold text-on-surface tabular-nums">
                      {c.matricula}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-on-surface">{c.nome}</td>
                    <td className="py-2.5 px-3 text-on-surface-variant">
                      {SETOR_FABRIL_LABELS[c.setor] ?? c.setor}
                    </td>
                    <td className="py-2.5 px-3 text-on-surface-variant">{c.funcao}</td>
                    <td className="py-2.5 px-3 text-on-surface-variant">
                      {c.email || c.telefone || <span className="text-outline">—</span>}
                    </td>
                    <td className="py-2.5 px-4 text-right whitespace-nowrap">
                      {podeEditar && (
                        <button
                          type="button"
                          onClick={() => setDrawer({ aberto: true, colaborador: c })}
                          className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg text-xs font-medium text-on-surface-variant hover:text-primary hover:bg-surface-container border border-outline-variant/30 transition-colors cursor-pointer"
                          title={`Editar ${c.nome}`}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>Editar</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {total > 0 && (
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-t border-outline-variant/20 text-xs text-on-surface-variant">
            <span className="tabular-nums">
              {primeiro}–{ultimo} de {total}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
                disabled={pagina <= 1 || isFetching}
                aria-label="Página anterior"
                className="p-1.5 rounded-lg hover:bg-surface-container disabled:opacity-40 cursor-pointer disabled:cursor-default"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="tabular-nums px-1">
                {pagina} / {totalPaginas}
              </span>
              <button
                type="button"
                onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                disabled={pagina >= totalPaginas || isFetching}
                aria-label="Próxima página"
                className="p-1.5 rounded-lg hover:bg-surface-container disabled:opacity-40 cursor-pointer disabled:cursor-default"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <ColaboradorFormDrawer
        isOpen={drawer.aberto}
        colaborador={drawer.colaborador}
        onClose={() => setDrawer({ aberto: false, colaborador: null })}
      />
    </div>
  );
}
