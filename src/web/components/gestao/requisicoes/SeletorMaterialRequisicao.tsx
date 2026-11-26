'use client';

import React, { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import {
  buscarItensParaPedido,
  type FiltroCategoriaPedido,
  type ItemBuscavelPedido,
} from '@/core/services/busca-itens-pedido';
import type { DashboardItem } from '@/web/data/mock-almoxarifado';
import { useDebounce } from '@/web/hooks/useDebounce';

const LIMITE_RESULTADOS = 30;

type FiltroCategoriaRequisicao = Extract<FiltroCategoriaPedido, 'todas' | 'mp' | 'imp'>;

const FILTROS: ReadonlyArray<{ valor: FiltroCategoriaRequisicao; rotulo: string }> = [
  { valor: 'todas', rotulo: 'Todas' },
  { valor: 'mp', rotulo: 'Matéria-Prima' },
  { valor: 'imp', rotulo: 'Improdutivos' },
];

interface ItemBuscavelRequisicao extends ItemBuscavelPedido {
  original: DashboardItem;
}

export interface SeletorMaterialRequisicaoProps {
  catalogo: readonly DashboardItem[];
  selecionado: DashboardItem | null;
  onSelecionar: (item: DashboardItem | null) => void;
}

/**
 * Busca de materiais da requisição: filtra por texto (código, descrição ou
 * localização), por categoria e, por padrão, oculta itens sem saldo.
 */
export function SeletorMaterialRequisicao({
  catalogo,
  selecionado,
  onSelecionar,
}: SeletorMaterialRequisicaoProps) {
  const [termo, setTermo] = useState('');
  const [categoria, setCategoria] = useState<FiltroCategoriaRequisicao>('todas');
  const [incluirSemSaldo, setIncluirSemSaldo] = useState(false);
  const termoAplicado = useDebounce(termo, 150);

  const buscaveis = useMemo<ItemBuscavelRequisicao[]>(
    () =>
      catalogo.map((item) => ({
        id: item.id,
        codigo: item.codigo,
        descricao: item.descricao,
        categoria: item.aba,
        estoqueAtual: Number(item.estoqueAtual) || 0,
        unidade: item.unidade,
        localizacaoFisica: item.localizacaoFisica,
        ativo: item.ativo,
        original: item,
      })),
    [catalogo]
  );

  const { resultados, contagemPorCategoria, ocultosSemSaldo, totalEncontrado } = useMemo(
    () =>
      buscarItensParaPedido(buscaveis, {
        termo: termoAplicado,
        categoria,
        incluirSemSaldo,
        limite: LIMITE_RESULTADOS,
      }),
    [buscaveis, termoAplicado, categoria, incluirSemSaldo]
  );

  if (selecionado) {
    return (
      <div className="flex items-center justify-between gap-2 h-8 px-2 rounded-lg bg-surface-container border border-primary/40 text-xs">
        <div className="flex items-center gap-2 truncate">
          <span className="font-mono font-bold text-primary">{selecionado.codigo}</span>
          <span className="text-on-surface truncate">{selecionado.descricao}</span>
          <span className="text-outline shrink-0">
            (Disp: {selecionado.estoqueAtual} {selecionado.unidade})
          </span>
        </div>
        <button
          type="button"
          onClick={() => onSelecionar(null)}
          aria-label="Trocar material"
          className="p-1 rounded text-outline hover:text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-outline" />
        <input
          type="search"
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
          placeholder="Buscar por código, descrição ou localização..."
          aria-label="Buscar material"
          className="w-full text-xs h-8 pl-7 pr-2 rounded-lg bg-surface-container border border-outline-variant/30 text-on-surface"
        />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {FILTROS.map((f) => {
          const ativo = categoria === f.valor;
          return (
            <button
              key={f.valor}
              type="button"
              onClick={() => setCategoria(f.valor)}
              aria-pressed={ativo}
              className={`h-6 px-2 rounded-full text-[11px] font-medium border transition-colors cursor-pointer ${
                ativo
                  ? 'bg-primary text-on-primary border-primary'
                  : 'bg-surface-container text-secondary border-outline-variant/30 hover:text-on-surface'
              }`}
            >
              {f.rotulo} ({contagemPorCategoria[f.valor]})
            </button>
          );
        })}
        <label className="ml-auto flex items-center gap-1 text-[11px] text-secondary cursor-pointer">
          <input
            type="checkbox"
            checked={incluirSemSaldo}
            onChange={(e) => setIncluirSemSaldo(e.target.checked)}
          />
          Mostrar sem saldo
        </label>
      </div>

      <ul
        role="listbox"
        aria-label="Materiais encontrados"
        className="max-h-48 overflow-y-auto rounded-lg border border-outline-variant/20 bg-surface-container-lowest divide-y divide-outline-variant/10"
      >
        {resultados.length === 0 ? (
          <li className="p-2 text-[11px] text-outline text-center">
            Nenhum material encontrado
            {!incluirSemSaldo && ocultosSemSaldo > 0
              ? ` (${ocultosSemSaldo} sem saldo ocultos)`
              : ''}
            .
          </li>
        ) : (
          resultados.map((r) => {
            const semSaldo = r.estoqueAtual <= 0;
            return (
              <li key={r.id} role="option" aria-selected={false}>
                <button
                  type="button"
                  onClick={() => onSelecionar(r.original)}
                  className="w-full flex items-center justify-between gap-2 p-2 text-left text-xs hover:bg-surface-container transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2 truncate">
                    <span className="font-mono font-bold text-primary shrink-0">{r.codigo}</span>
                    <span className="text-on-surface truncate">{r.descricao}</span>
                  </span>
                  <span
                    className={`font-mono shrink-0 ${semSaldo ? 'text-error' : 'text-secondary'}`}
                  >
                    {r.estoqueAtual} {r.unidade}
                  </span>
                </button>
              </li>
            );
          })
        )}
      </ul>

      {(totalEncontrado > resultados.length || (!incluirSemSaldo && ocultosSemSaldo > 0)) &&
        resultados.length > 0 && (
          <p className="text-[11px] text-outline">
            {totalEncontrado > resultados.length &&
              `Mostrando ${resultados.length} de ${totalEncontrado}. Refine a busca para ver mais. `}
            {!incluirSemSaldo &&
              ocultosSemSaldo > 0 &&
              `${ocultosSemSaldo} ${ocultosSemSaldo === 1 ? 'item sem saldo oculto' : 'itens sem saldo ocultos'}.`}
          </p>
        )}
    </div>
  );
}
