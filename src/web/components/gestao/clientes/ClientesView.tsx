'use client';

import React, { useState, useMemo } from 'react';
import { RefreshCw, Plus, Search, X, Users, Building2, Truck, HelpCircle, Filter } from 'lucide-react';
import { useClientes } from '@/web/hooks/useClientes';
import {
  type TipoParceiro,
  TIPO_PARCEIRO_LABELS,
} from '@/core/domain/cliente.schema';

export interface ClientesViewProps {
  onNovoCadastro: () => void;
}

type FiltroTipo = 'TODOS' | TipoParceiro;

const CHIPS_TIPO: Array<{ chave: FiltroTipo; rotulo: string }> = [
  { chave: 'TODOS', rotulo: 'Todos' },
  { chave: 'CLIENTE', rotulo: TIPO_PARCEIRO_LABELS.CLIENTE },
  { chave: 'FORNECEDOR', rotulo: TIPO_PARCEIRO_LABELS.FORNECEDOR },
  { chave: 'TRANSPORTADORA', rotulo: TIPO_PARCEIRO_LABELS.TRANSPORTADORA },
  { chave: 'OUTRO', rotulo: TIPO_PARCEIRO_LABELS.OUTRO },
];

export function ClientesView({ onNovoCadastro }: ClientesViewProps) {
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>('TODOS');
  const [busca, setBusca] = useState('');

  const { clientes, isLoading, isFetching, refetch } = useClientes({
    tipo: filtroTipo,
    busca,
    apenasAtivos: true,
  });

  // Consulta todos os clientes para calcular contadores em tempo real para os chips
  const { clientes: todosClientes } = useClientes({
    tipo: 'TODOS',
    apenasAtivos: true,
  });

  const contagemPorTipo = useMemo(() => {
    const mapa: Record<FiltroTipo, number> = {
      TODOS: todosClientes.length,
      CLIENTE: 0,
      FORNECEDOR: 0,
      TRANSPORTADORA: 0,
      OUTRO: 0,
    };
    for (const c of todosClientes) {
      if (c.tipo in mapa) {
        mapa[c.tipo as TipoParceiro] += 1;
      }
    }
    return mapa;
  }, [todosClientes]);

  const getTipoBadgeStyle = (tipo: TipoParceiro) => {
    switch (tipo) {
      case 'CLIENTE':
        return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/60';
      case 'FORNECEDOR':
        return 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/60';
      case 'TRANSPORTADORA':
        return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800/60';
      case 'OUTRO':
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    }
  };

  const getTipoIcon = (tipo: TipoParceiro) => {
    switch (tipo) {
      case 'CLIENTE':
        return <Users className="w-3 h-3 text-blue-600 dark:text-blue-400" />;
      case 'FORNECEDOR':
        return <Building2 className="w-3 h-3 text-amber-600 dark:text-amber-400" />;
      case 'TRANSPORTADORA':
        return <Truck className="w-3 h-3 text-purple-600 dark:text-purple-400" />;
      default:
        return <HelpCircle className="w-3 h-3 text-slate-500" />;
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 animate-fade-in">
      {/* Cabeçalho */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold tracking-normal text-slate-900 dark:text-white">
            Clientes
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-normal">
            Cadastro de clientes, fornecedores, transportadoras e outros contatos.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
          <button
            type="button"
            onClick={onNovoCadastro}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-semibold text-white bg-[#1d4ea3] dark:bg-[#3273dc] hover:bg-blue-800 dark:hover:bg-blue-600 transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Novo cadastro</span>
          </button>

          <button
            type="button"
            onClick={() => refetch()}
            disabled={isLoading || isFetching}
            className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors cursor-pointer disabled:opacity-50"
            title="Atualizar lista de parceiros"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>
        </div>
      </header>

      {/* Chips de Filtragem por Tipo e Barra de Busca */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        {/* Chips de Tipo */}
        <div
          className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-700/60"
          role="group"
          aria-label="Filtro de categoria de parceiro"
        >
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 px-2 flex items-center gap-1 hidden md:flex">
            <Filter className="w-3 h-3" /> Categoria:
          </span>
          {CHIPS_TIPO.map(({ chave, rotulo }) => {
            const isActive = filtroTipo === chave;
            const count = contagemPorTipo[chave];

            return (
              <button
                key={chave}
                type="button"
                onClick={() => setFiltroTipo(chave)}
                aria-pressed={isActive}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>{rotulo}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isActive
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      : 'bg-slate-200/60 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Busca Operacional */}
        <div className="relative flex-1 min-w-[260px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, documento, contato ou cidade..."
            className="w-full pl-9 pr-8 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {busca && (
            <button
              type="button"
              onClick={() => setBusca('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Tabela de Clientes e Parceiros */}
      <div className="w-full bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 font-semibold select-none">
                <th className="py-2.5 px-3">Nome / Razão Social</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Tipo</th>
                <th className="py-2.5 px-3 whitespace-nowrap font-mono">CNPJ / CPF</th>
                <th className="py-2.5 px-3">Contato</th>
                <th className="py-2.5 px-3 whitespace-nowrap font-mono">Telefone</th>
                <th className="py-2.5 px-3">Cidade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-500" />
                    <span>Carregando cadastros...</span>
                  </td>
                </tr>
              ) : clientes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Nenhum cadastro encontrado nesta categoria.
                  </td>
                </tr>
              ) : (
                clientes.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    {/* Nome ou Razão Social */}
                    <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                      {c.nome}
                    </td>

                    {/* Tipo com Badge */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium border ${getTipoBadgeStyle(
                          c.tipo
                        )}`}
                      >
                        {getTipoIcon(c.tipo)}
                        <span>{TIPO_PARCEIRO_LABELS[c.tipo] || c.tipo}</span>
                      </span>
                    </td>

                    {/* Documento (CNPJ/CPF) */}
                    <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {c.documento || '—'}
                    </td>

                    {/* Contato */}
                    <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                      {c.contato || '—'}
                    </td>

                    {/* Telefone */}
                    <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {c.telefone || '—'}
                    </td>

                    {/* Cidade */}
                    <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                      {c.cidade || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
