'use client';

import React, { useState } from 'react';
import {
  Layers,
  PackagePlus,
  ArrowRightLeft,
  Search,
  Building2,
  RefreshCw,
  FileText,
  Calendar,
  Eye,
  Filter,
  CheckCircle2,
  Factory,
  RotateCcw,
  Clock,
  ArrowDownToLine,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { useMaterialTerceiros } from '@/web/hooks/useMaterialTerceiros';
import { useClientes } from '@/web/hooks/useClientes';
import { ReceberTerceiroDrawer } from './ReceberTerceiroDrawer';
import { MovimentarTerceiroDrawer } from './MovimentarTerceiroDrawer';
import { DetalhesTerceiroDrawer } from './DetalhesTerceiroDrawer';
import type { MaterialTerceiroEnriquecido } from '@/web/app/api/terceiros/route';

export interface TerceirosViewProps {
  onNavegarFaturamento?: () => void;
}

export function TerceirosView({ onNavegarFaturamento }: TerceirosViewProps) {
  const [busca, setBusca] = useState('');
  const [clienteIdFiltro, setClienteIdFiltro] = useState('TODOS');

  // Estados dos Modais / Drawers
  const [isReceberOpen, setIsReceberOpen] = useState(false);
  const [materialParaMovimentar, setMaterialParaMovimentar] =
    useState<MaterialTerceiroEnriquecido | null>(null);
  const [materialParaDetalhes, setMaterialParaDetalhes] =
    useState<MaterialTerceiroEnriquecido | null>(null);

  const { clientes } = useClientes();
  const clientesDisponiveis = clientes.filter(
    (c) => c.tipo === 'CLIENTE' || c.tipo === 'OUTRO' || !c.tipo
  );

  const {
    materiais,
    movimentacoesRecentes,
    kpis,
    isLoading,
    isFetching,
    refetch,
    receberMaterial,
    isRecebendo,
    consumirMaterial,
    devolverMaterial,
    isConsumindo,
    isDevolvendo,
  } = useMaterialTerceiros({
    clienteId: clienteIdFiltro,
    busca: busca.trim(),
  });

  return (
    <div className="flex-1 flex flex-col gap-5 p-4 sm:p-6 max-w-7xl mx-auto w-full animate-fade-in">
      {/* 1. Cabeçalho Executivo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Material de Terceiros
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50">
              Industrialização por Encomenda
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Gestão de matérias-primas e insumos de clientes sob custódia, consumo fabril e retorno
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isLoading || isFetching}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 bg-surface-container-low dark:bg-slate-800 hover:bg-surface-container border border-outline-variant/30 transition-colors cursor-pointer disabled:opacity-50"
            title="Atualizar lista de materiais"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </button>

          <button
            type="button"
            onClick={() => setIsReceberOpen(true)}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-xl text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 shadow-xs transition-colors cursor-pointer"
          >
            <PackagePlus className="w-4 h-4" />
            <span>Receber Material de Terceiro</span>
          </button>
        </div>
      </div>

      {/* 2. Banner de Esclarecimento sobre Saldo Segregado */}
      <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5 text-amber-900 dark:text-amber-200">
          <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Conformidade Fiscal:</strong> O estoque de terceiros é mantido apartado do
            estoque próprio. Ele não integra o patrimônio da empresa e na devolução gera
            automaticamente NF-e de Retorno com cobrança do serviço de beneficiamento.
          </span>
        </div>
        {onNavegarFaturamento && (
          <button
            type="button"
            onClick={onNavegarFaturamento}
            className="text-[11px] font-bold text-amber-700 dark:text-amber-300 hover:underline shrink-0"
          >
            Ver Faturamento →
          </button>
        )}
      </div>

      {/* 3. Cards de Métricas Operacionais (KPIs) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-surface-container-lowest dark:bg-slate-900 border border-outline-variant/30 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
              Materiais sob Custódia
            </span>
            <span className="text-xl font-extrabold text-slate-900 dark:text-white">
              {kpis.totalMateriais}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-surface-container-lowest dark:bg-slate-900 border border-outline-variant/30 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
              Saldo Total de Peças/Insumos
            </span>
            <span className="text-xl font-extrabold text-slate-900 dark:text-white">
              {kpis.saldoTotalItens}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-surface-container-lowest dark:bg-slate-900 border border-outline-variant/30 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
              Clientes Proprietários
            </span>
            <span className="text-xl font-extrabold text-slate-900 dark:text-white">
              {kpis.clientesAtivosCount}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-surface-container-lowest dark:bg-slate-900 border border-outline-variant/30 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <ArrowRightLeft className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
              Apontamentos no Histórico
            </span>
            <span className="text-xl font-extrabold text-slate-900 dark:text-white">
              {kpis.movimentacoesMesCount}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Barra de Filtros e Busca Instantânea */}
      <div className="p-3.5 rounded-2xl bg-surface-container-lowest dark:bg-slate-900 border border-outline-variant/30 shadow-xs flex flex-col sm:flex-row items-center gap-3">
        {/* Busca Textual */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por descrição, cliente, SKU ou NF de remessa..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-surface-container-low dark:bg-slate-800 border border-outline-variant/30 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {/* Filtro por Cliente */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <select
            value={clienteIdFiltro}
            onChange={(e) => setClienteIdFiltro(e.target.value)}
            className="w-full sm:w-60 px-3 py-1.5 text-xs rounded-xl bg-surface-container-low dark:bg-slate-800 border border-outline-variant/30 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="TODOS">Todos os Clientes</option>
            {clientesDisponiveis.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 5. Tabela de Materiais de Terceiros */}
      <div className="rounded-2xl bg-surface-container-lowest dark:bg-slate-900 border border-outline-variant/30 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-outline-variant/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Materiais Sob Custódia
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {materiais.length} {materiais.length === 1 ? 'item' : 'itens'}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 border-b border-outline-variant/30">
              <tr>
                <th className="px-4 py-3">Material / SKU</th>
                <th className="px-4 py-3">Cliente Proprietário</th>
                <th className="px-4 py-3">NF-e Remessa</th>
                <th className="px-4 py-3 text-right">Saldo Atual</th>
                <th className="px-4 py-3 text-center">Apontamentos</th>
                <th className="px-4 py-3 text-right">Ações Operacionais</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500" />
                    Carregando estoque de terceiros...
                  </td>
                </tr>
              ) : materiais.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    Nenhum material de terceiro encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                materiais.map((mat) => {
                  const temSaldo = mat.saldoAtual > 0;

                  return (
                    <tr
                      key={mat.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {mat.descricao}
                        </div>
                        {mat.codigoSku && (
                          <span className="font-mono text-[10px] text-slate-400 block">
                            SKU: {mat.codigoSku}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          {mat.clienteNome}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-amber-500" />
                          {mat.numeroNFRemessa || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-extrabold ${
                            temSaldo
                              ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {mat.saldoAtual} {mat.unidade}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {mat.totalMovimentacoes} movs
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setMaterialParaDetalhes(mat)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Ver ficha e extrato do material"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setMaterialParaMovimentar(mat)}
                            disabled={!temSaldo}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs transition-colors cursor-pointer"
                            title={temSaldo ? 'Apontar consumo ou devolução' : 'Sem saldo disponível'}
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                            <span>Movimentar</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. Extrato Recente Global de Movimentações de Terceiros */}
      <div className="rounded-2xl bg-surface-container-lowest dark:bg-slate-900 border border-outline-variant/30 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-outline-variant/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Histórico Operacional Recente
            </h2>
          </div>
          <span className="text-[11px] text-slate-400">
            Últimas {movimentacoesRecentes.length} movimentações
          </span>
        </div>

        <div className="divide-y divide-outline-variant/20">
          {movimentacoesRecentes.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              Nenhuma movimentação registrada recentemente.
            </div>
          ) : (
            movimentacoesRecentes.slice(0, 8).map((mov) => {
              const isEntrada = mov.tipo === 'ENTRADA_REMESSA';
              const isConsumo = mov.tipo === 'CONSUMO_PRODUCAO';

              return (
                <div
                  key={mov.id}
                  className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center font-bold mt-0.5 ${
                        isEntrada
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          : isConsumo
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                          : 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300'
                      }`}
                    >
                      {isEntrada ? (
                        <ArrowDownToLine className="w-3.5 h-3.5" />
                      ) : isConsumo ? (
                        <Factory className="w-3.5 h-3.5" />
                      ) : (
                        <RotateCcw className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {mov.materialDescricao}
                        </span>
                        <span className="text-slate-400">·</span>
                        <span className="text-slate-500 dark:text-slate-400 font-medium">
                          {mov.clienteNome}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                        <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded">
                          {mov.documento}
                        </span>
                        <span>{mov.dataMovimentacao}</span>
                        <span>•</span>
                        <span>{mov.responsavel}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`font-bold ${
                        isEntrada
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-red-500'
                      }`}
                    >
                      {isEntrada ? '+' : '-'}
                      {mov.quantidade} un
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      Saldo restante: {mov.saldoResultante}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 7. Drawers Operacionais */}
      <ReceberTerceiroDrawer
        isOpen={isReceberOpen}
        onClose={() => setIsReceberOpen(false)}
        onSalvar={receberMaterial}
        isSalvando={isRecebendo}
      />

      <MovimentarTerceiroDrawer
        isOpen={!!materialParaMovimentar}
        material={materialParaMovimentar}
        onClose={() => setMaterialParaMovimentar(null)}
        onConsumir={consumirMaterial}
        onDevolver={devolverMaterial}
        isSalvando={isConsumindo || isDevolvendo}
      />

      <DetalhesTerceiroDrawer
        isOpen={!!materialParaDetalhes}
        material={materialParaDetalhes}
        movimentacoes={movimentacoesRecentes}
        onClose={() => setMaterialParaDetalhes(null)}
        onMovimentar={() => {
          const mat = materialParaDetalhes;
          setMaterialParaDetalhes(null);
          setMaterialParaMovimentar(mat);
        }}
      />
    </div>
  );
}
