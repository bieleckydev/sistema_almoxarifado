'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  Plus,
  Search,
  X,
  Users,
  Building2,
  Truck,
  HelpCircle,
  Phone,
  MapPin,
  Briefcase,
  FileText,
  UserCheck,
} from 'lucide-react';
import { useClientes } from '@/web/hooks/useClientes';
import {
  type TipoParceiro,
  TIPO_PARCEIRO_LABELS,
} from '@/core/domain/cliente.schema';
import { FilterPill } from '@/web/components/ui/FilterPill';

export interface ClientesViewProps {
  onNovoCadastro: (tipo?: TipoParceiro) => void;
  filtroInicial?: FiltroTipo;
}

type FiltroTipo = 'TODOS' | TipoParceiro;

const CHIPS_TIPO: Array<{ chave: FiltroTipo; rotulo: string; icon: React.ReactNode }> = [
  { chave: 'TODOS', rotulo: 'Todos', icon: <Users className="w-3.5 h-3.5" /> },
  { chave: 'CLIENTE', rotulo: TIPO_PARCEIRO_LABELS.CLIENTE, icon: <Briefcase className="w-3.5 h-3.5" /> },
  { chave: 'FORNECEDOR', rotulo: TIPO_PARCEIRO_LABELS.FORNECEDOR, icon: <Building2 className="w-3.5 h-3.5" /> },
  { chave: 'TRANSPORTADORA', rotulo: TIPO_PARCEIRO_LABELS.TRANSPORTADORA, icon: <Truck className="w-3.5 h-3.5" /> },
  { chave: 'OUTRO', rotulo: TIPO_PARCEIRO_LABELS.OUTRO, icon: <HelpCircle className="w-3.5 h-3.5" /> },
];

export function ClientesView({ onNovoCadastro, filtroInicial = 'TODOS' }: ClientesViewProps) {
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>(filtroInicial);
  const [busca, setBusca] = useState('');

  // Sincroniza quando o filtroInicial mudar via navegação externa
  useEffect(() => {
    if (filtroInicial) {
      setFiltroTipo(filtroInicial);
    }
  }, [filtroInicial]);

  // Tecla Escape para limpar a busca
  const handleKeyDownBusca = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setBusca('');
    }
  }, []);

  const { clientes, isLoading, isFetching, refetch } = useClientes({
    tipo: filtroTipo,
    busca,
    apenasAtivos: true,
  });

  // Consulta todos os clientes para calcular contadores em tempo real para os chips e cards de métricas
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

  const getTipoBadge = (tipo: TipoParceiro) => {
    switch (tipo) {
      case 'CLIENTE':
        return {
          bg: 'bg-primary-container/10 text-primary border-primary/20 dark:bg-primary-container/20 dark:text-inverse-primary',
          icon: <Briefcase className="w-3 h-3 text-primary" />,
          label: TIPO_PARCEIRO_LABELS.CLIENTE,
        };
      case 'FORNECEDOR':
        return {
          bg: 'bg-tertiary-fixed/40 text-tertiary border-tertiary/20 dark:bg-tertiary/20 dark:text-tertiary-fixed',
          icon: <Building2 className="w-3 h-3 text-tertiary" />,
          label: TIPO_PARCEIRO_LABELS.FORNECEDOR,
        };
      case 'TRANSPORTADORA':
        return {
          bg: 'bg-secondary-container text-on-secondary-fixed border-secondary-fixed-dim/40 dark:bg-secondary-container/20 dark:text-secondary-fixed-dim',
          icon: <Truck className="w-3 h-3 text-secondary" />,
          label: TIPO_PARCEIRO_LABELS.TRANSPORTADORA,
        };
      case 'OUTRO':
      default:
        return {
          bg: 'bg-surface-container-high text-on-surface-variant border-outline-variant/30',
          icon: <HelpCircle className="w-3 h-3 text-outline" />,
          label: TIPO_PARCEIRO_LABELS.OUTRO,
        };
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 animate-fade-in pb-12">
      {/* 1. Sub-header Operacional no Padrão Stitch */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-outline-variant/20">
        <div className="flex flex-col">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-primary-container/10 text-primary">
              <Users className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-headline text-xl md:text-2xl font-bold tracking-tight text-on-surface">
                  Clientes &amp; Parceiros
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant text-xs font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
                  Cadastros Ativos
                </span>
              </div>
              <p className="text-xs text-on-surface-variant mt-0.5 font-normal">
                Gestão integrada de clientes, fornecedores homologados e transportadoras credenciadas.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-center shrink-0">
          <button
            type="button"
            onClick={() => onNovoCadastro(filtroTipo === 'TODOS' ? undefined : filtroTipo)}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-xl text-xs font-semibold text-white bg-primary hover:bg-primary/90 transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Cadastro</span>
          </button>

          <button
            type="button"
            onClick={() => refetch()}
            disabled={isLoading || isFetching}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-medium text-on-surface bg-surface-container-lowest border border-outline-variant/30 hover:bg-surface-container transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            title="Atualizar lista de parceiros"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>
        </div>
      </section>

      {/* 2. Grid de 4 KPIs Operacionais no Estilo Stitch */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Card 1: Total Geral */}
        <div className="relative overflow-hidden rounded-2xl bg-surface-container-lowest p-4 shadow-sm border border-outline-variant/20 flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1 bg-primary"></div>
          <div>
            <div className="flex items-center justify-between text-on-surface-variant mb-1">
              <span className="text-[11px] uppercase tracking-wider font-semibold">Total de Parceiros</span>
              <Users className="w-4 h-4 text-primary" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-kpi-value text-2xl font-extrabold tracking-tight text-on-surface">
                {contagemPorTipo.TODOS}
              </span>
              <span className="text-xs text-on-surface-variant font-medium">registros</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-outline-variant/10 flex items-center justify-between text-xs text-on-surface-variant">
            <span>Base sincronizada</span>
            <span className="text-primary font-semibold flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5" /> 100% ativos
            </span>
          </div>
        </div>

        {/* Card 2: Clientes */}
        <div className="relative overflow-hidden rounded-2xl bg-surface-container-lowest p-4 shadow-sm border border-outline-variant/20 flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1 bg-secondary"></div>
          <div>
            <div className="flex items-center justify-between text-on-surface-variant mb-1">
              <span className="text-[11px] uppercase tracking-wider font-semibold">Clientes da Fábrica</span>
              <Briefcase className="w-4 h-4 text-secondary" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-kpi-value text-2xl font-extrabold tracking-tight text-on-surface">
                {contagemPorTipo.CLIENTE}
              </span>
              <span className="text-xs text-secondary font-medium">compradores</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-outline-variant/10 flex items-center justify-between text-xs text-on-surface-variant">
            <span>Destino de pedidos</span>
            <span className="font-semibold text-on-surface">Carteira ativa</span>
          </div>
        </div>

        {/* Card 3: Fornecedores */}
        <div className="relative overflow-hidden rounded-2xl bg-surface-container-lowest p-4 shadow-sm border border-outline-variant/20 flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1 bg-tertiary"></div>
          <div>
            <div className="flex items-center justify-between text-on-surface-variant mb-1">
              <span className="text-[11px] uppercase tracking-wider font-semibold">Fornecedores Homologados</span>
              <Building2 className="w-4 h-4 text-tertiary" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-kpi-value text-2xl font-extrabold tracking-tight text-tertiary">
                {contagemPorTipo.FORNECEDOR}
              </span>
              <span className="text-xs text-tertiary font-medium">homologados</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-outline-variant/10 flex items-center justify-between text-xs text-on-surface-variant">
            <span>Matéria-prima &amp; Insumos</span>
            <span className="text-tertiary font-semibold">Suprimentos OK</span>
          </div>
        </div>

        {/* Card 4: Transportadoras */}
        <div className="relative overflow-hidden rounded-2xl bg-surface-container-lowest p-4 shadow-sm border border-outline-variant/20 flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1 bg-outline"></div>
          <div>
            <div className="flex items-center justify-between text-on-surface-variant mb-1">
              <span className="text-[11px] uppercase tracking-wider font-semibold">Transportadoras</span>
              <Truck className="w-4 h-4 text-outline" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-kpi-value text-2xl font-extrabold tracking-tight text-on-surface">
                {contagemPorTipo.TRANSPORTADORA}
              </span>
              <span className="text-xs text-on-surface-variant font-medium">credenciadas</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-outline-variant/10 flex items-center justify-between text-xs text-on-surface-variant">
            <span>Expedição &amp; Logística</span>
            <span className="font-semibold text-on-surface">Frete habilitado</span>
          </div>
        </div>
      </section>

      {/* 3. Barra de Ferramentas: Pílulas de Filtro e Busca com atalho ESC */}
      <section className="flex flex-wrap items-center justify-between gap-4 mb-4">
        {/* Pílulas de Categoria */}
        <div
          className="flex flex-wrap items-center gap-1.5 p-1 bg-surface-container-low rounded-xl border border-outline-variant/20"
          role="group"
          aria-label="Filtro de categoria de parceiro"
        >
          {CHIPS_TIPO.map(({ chave, rotulo }) => {
            const isActive = filtroTipo === chave;
            const count = contagemPorTipo[chave];

            return (
              <FilterPill
                key={chave}
                label={rotulo}
                isActive={isActive}
                onClick={() => setFiltroTipo(chave)}
                count={count}
              />
            );
          })}
        </div>

        {/* Campo de Busca Rápida com atalho ESC */}
        <div className="relative flex-1 min-w-[280px] max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-outline pointer-events-none" />
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            onKeyDown={handleKeyDownBusca}
            placeholder="Buscar parceiro por nome, CNPJ/CPF, cidade..."
            className="w-full pl-10 pr-14 py-2 text-xs rounded-xl border border-outline-variant/30 bg-surface-container-lowest text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
          />
          {busca ? (
            <button
              type="button"
              onClick={() => setBusca('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-outline hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
              title="Limpar busca"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded text-[10px] font-mono bg-surface-container-high text-on-surface-variant border border-outline-variant/30 pointer-events-none">
              ESC
            </kbd>
          )}
        </div>
      </section>

      {/* 4. Tabela de Parceiros de Alta Densidade no Padrão Stitch */}
      <div className="w-full bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-outline-variant/20 bg-surface-container-low text-on-surface-variant font-label-md select-none">
                <th className="py-3 px-4">Parceiro / Razão Social</th>
                <th className="py-3 px-3 whitespace-nowrap">Categoria</th>
                <th className="py-3 px-3 whitespace-nowrap font-mono">CNPJ / CPF</th>
                <th className="py-3 px-3">Contato Comercial</th>
                <th className="py-3 px-3 whitespace-nowrap font-mono">Telefone</th>
                <th className="py-3 px-4">Cidade / UF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-on-surface-variant">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                    <span className="font-medium text-xs">Carregando cadastros homologados...</span>
                  </td>
                </tr>
              ) : clientes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-on-surface-variant">
                    <Users className="w-8 h-8 mx-auto mb-2 text-outline/50" />
                    <p className="font-medium text-sm text-on-surface">Nenhum parceiro encontrado</p>
                    <p className="text-xs text-outline mt-1">
                      {busca
                        ? `Nenhum resultado para o termo "${busca}". Pressione ESC para limpar.`
                        : 'Cadastre um novo parceiro clicando em "+ Novo Cadastro" acima.'}
                    </p>
                  </td>
                </tr>
              ) : (
                clientes.map((c) => {
                  const badge = getTipoBadge(c.tipo);
                  const inicial = c.nome ? c.nome.charAt(0).toUpperCase() : '?';

                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-surface-container-low/70 transition-colors group"
                    >
                      {/* Nome / Razão Social com Avatar Corporativo */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-surface-container-high text-on-surface font-headline font-bold text-xs flex items-center justify-center shrink-0 border border-outline-variant/20">
                            {inicial}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-on-surface text-xs truncate max-w-[240px]">
                              {c.nome}
                            </span>
                            <span className="text-[11px] text-outline font-mono">
                              ID: {c.id.slice(0, 10)}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Tipo com Badge Estilizado */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${badge.bg}`}
                        >
                          {badge.icon}
                          <span>{badge.label}</span>
                        </span>
                      </td>

                      {/* Documento (CNPJ/CPF) */}
                      <td className="py-3 px-3 font-mono font-medium text-on-surface whitespace-nowrap">
                        {c.documento ? (
                          <span className="inline-flex items-center gap-1 text-on-surface">
                            <FileText className="w-3 h-3 text-outline" />
                            {c.documento}
                          </span>
                        ) : (
                          <span className="text-outline">—</span>
                        )}
                      </td>

                      {/* Contato Comercial */}
                      <td className="py-3 px-3 text-on-surface">
                        {c.contato || <span className="text-outline">—</span>}
                      </td>

                      {/* Telefone */}
                      <td className="py-3 px-3 font-mono text-on-surface whitespace-nowrap">
                        {c.telefone ? (
                          <span className="inline-flex items-center gap-1">
                            <Phone className="w-3 h-3 text-outline" />
                            {c.telefone}
                          </span>
                        ) : (
                          <span className="text-outline">—</span>
                        )}
                      </td>

                      {/* Cidade / UF */}
                      <td className="py-3 px-4 text-on-surface">
                        {c.cidade ? (
                          <span className="inline-flex items-center gap-1 text-on-surface-variant">
                            <MapPin className="w-3 h-3 text-outline" />
                            {c.cidade}
                          </span>
                        ) : (
                          <span className="text-outline">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

