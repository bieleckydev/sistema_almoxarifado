'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { Loader2, MapPin, Plus, Search, X } from 'lucide-react';
import { CATEGORIA_ESTOQUE_LABELS } from '@/core/domain/categoria-estoque';
import {
  FILTROS_CATEGORIA_PEDIDO,
  temSaldoDisponivel,
  type FiltroCategoriaPedido,
} from '@/core/services/busca-itens-pedido';
import { calcularStatusCriticidade, UNIDADE_LABELS } from '@/web/data/mock-almoxarifado';
import { useBuscaItensPedido, type ItemCatalogoPedido } from '@/web/hooks/useBuscaItensPedido';

export interface AdicionarMaterialPanelProps {
  /** Quantidade já lançada no pedido por item (para indicar o que já foi adicionado). */
  quantidadeNoPedido: ReadonlyMap<string, number>;
  onAdicionar: (item: ItemCatalogoPedido) => void;
  /** Mantém o catálogo carregado apenas com o drawer aberto. */
  enabled?: boolean;
}

const ROTULO_FILTRO: Record<FiltroCategoriaPedido, string> = {
  todas: 'Todas',
  ...CATEGORIA_ESTOQUE_LABELS,
};

export function unidadeCurta(unidade: string): string {
  return UNIDADE_LABELS[unidade] || unidade.toLowerCase();
}

export function formatarQuantidade(valor: number): string {
  return valor.toLocaleString('pt-BR', { maximumFractionDigits: 3 });
}

/**
 * Busca e seleção de materiais para o pedido de venda, nas três categorias de estoque.
 * Itens sem saldo ficam ocultos por padrão e, quando exibidos, não podem ser adicionados.
 */
export function AdicionarMaterialPanel({
  quantidadeNoPedido,
  onAdicionar,
  enabled = true,
}: AdicionarMaterialPanelProps) {
  const [termo, setTermo] = useState('');
  const [categoria, setCategoria] = useState<FiltroCategoriaPedido>('todas');
  const [incluirSemSaldo, setIncluirSemSaldo] = useState(false);
  const [indiceAtivo, setIndiceAtivo] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listaRef = useRef<HTMLUListElement>(null);
  const listboxId = useId();

  const {
    resultados,
    contagemPorCategoria,
    ocultosSemSaldo,
    totalEncontrado,
    isDigitando,
    isLoading,
    isError,
    refetch,
  } = useBuscaItensPedido({ termo, categoria, incluirSemSaldo, enabled });

  // Volta o destaque para o primeiro resultado sempre que a busca muda.
  useEffect(() => {
    setIndiceAtivo(0);
  }, [termo, categoria, incluirSemSaldo]);

  useEffect(() => {
    const ativo = listaRef.current?.querySelector<HTMLElement>(`[data-indice="${indiceAtivo}"]`);
    ativo?.scrollIntoView({ block: 'nearest' });
  }, [indiceAtivo]);

  const adicionar = (item: ItemCatalogoPedido | undefined) => {
    if (!item || !temSaldoDisponivel(item)) return;
    onAdicionar(item);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (resultados.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIndiceAtivo((i) => Math.min(resultados.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndiceAtivo((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      adicionar(resultados[indiceAtivo]);
    }
  };

  const itemAtivo = resultados[indiceAtivo];

  return (
    <section
      aria-labelledby={`${listboxId}-titulo`}
      className="p-4 rounded-lg bg-surface-container-low border border-outline-variant/30 flex flex-col gap-3"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 id={`${listboxId}-titulo`} className="text-xs font-semibold text-on-surface">
          Adicionar material
        </h3>
        <span className="text-[11px] text-on-surface-variant">
          ↑ ↓ para navegar · Enter adiciona 1
        </span>
      </div>

      {/* Filtro das três categorias oficiais */}
      <div role="group" aria-label="Filtrar por categoria" className="flex flex-wrap gap-1.5">
        {FILTROS_CATEGORIA_PEDIDO.map((filtro) => {
          const ativo = categoria === filtro;
          return (
            <button
              key={filtro}
              type="button"
              aria-pressed={ativo}
              onClick={() => setCategoria(filtro)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                ativo
                  ? 'bg-on-surface text-surface border-on-surface'
                  : 'bg-surface-container-lowest text-on-surface-variant border-outline-variant/40 hover:bg-surface-container hover:text-on-surface'
              }`}
            >
              {ROTULO_FILTRO[filtro]}
              <span className="tabular-nums text-[11px] opacity-75">
                {isLoading ? '…' : contagemPorCategoria[filtro]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Busca preditiva */}
      <div className="relative">
        <Search className="w-4 h-4 text-outline absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-expanded={resultados.length > 0}
          aria-controls={listboxId}
          aria-activedescendant={itemAtivo ? `${listboxId}-${itemAtivo.id}` : undefined}
          aria-autocomplete="list"
          aria-label="Buscar material por código, descrição ou localização"
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Código, descrição ou localização"
          autoComplete="off"
          className="w-full h-9 pl-9 pr-9 text-xs rounded-md border border-outline-variant/40 bg-surface-container-lowest text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        />
        {isDigitando || (isLoading && enabled) ? (
          <Loader2 className="w-4 h-4 text-outline absolute right-3 top-1/2 -translate-y-1/2 animate-spin" />
        ) : termo ? (
          <button
            type="button"
            onClick={() => {
              setTermo('');
              inputRef.current?.focus();
            }}
            aria-label="Limpar busca"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-outline hover:text-on-surface cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : null}
      </div>

      <label className="inline-flex items-center gap-2 text-xs text-on-surface-variant cursor-pointer select-none w-fit">
        <input
          type="checkbox"
          checked={incluirSemSaldo}
          onChange={(e) => setIncluirSemSaldo(e.target.checked)}
          className="accent-primary"
        />
        Mostrar itens sem saldo
      </label>

      {/* Resultados */}
      <div className="rounded-md border border-outline-variant/30 bg-surface-container-lowest overflow-hidden">
        {isLoading ? (
          <p className="px-3 py-6 text-center text-xs text-on-surface-variant">
            Carregando materiais do estoque…
          </p>
        ) : isError && resultados.length === 0 ? (
          <div className="px-3 py-6 text-center text-xs text-on-surface-variant flex flex-col items-center gap-2">
            <span>Não foi possível carregar o estoque.</span>
            <button
              type="button"
              onClick={refetch}
              className="text-primary font-semibold hover:underline cursor-pointer"
            >
              Tentar novamente
            </button>
          </div>
        ) : resultados.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-on-surface-variant">
            {termo.trim()
              ? `Nenhum material com saldo encontrado para "${termo.trim()}".`
              : 'Nenhum material com saldo nesta categoria.'}
          </p>
        ) : (
          <ul
            ref={listaRef}
            id={listboxId}
            role="listbox"
            aria-label="Materiais encontrados"
            className="max-h-64 overflow-y-auto divide-y divide-outline-variant/20"
          >
            {resultados.map((item, indice) => {
              const disponivel = temSaldoDisponivel(item);
              const noPedido = quantidadeNoPedido.get(item.id) ?? 0;
              const status = calcularStatusCriticidade(item.estoqueAtual, item.estoqueSeguranca);
              const ativo = indice === indiceAtivo;
              const unidade = unidadeCurta(item.unidade);

              return (
                <li
                  key={item.id}
                  id={`${listboxId}-${item.id}`}
                  role="option"
                  aria-selected={ativo}
                  aria-disabled={!disponivel}
                  data-indice={indice}
                  onMouseEnter={() => setIndiceAtivo(indice)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => adicionar(item)}
                  className={`flex items-center gap-3 px-3 py-2 text-xs ${
                    disponivel ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
                  } ${ativo ? 'bg-surface-container' : ''}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-[11px] text-on-surface-variant shrink-0">
                        {item.codigo || '—'}
                      </span>
                      <span className="font-medium text-on-surface truncate">{item.descricao}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-on-surface-variant">
                      <span>{CATEGORIA_ESTOQUE_LABELS[item.categoria]}</span>
                      {item.localizacaoFisica && (
                        <span className="inline-flex items-center gap-0.5 truncate">
                          <MapPin className="w-3 h-3 shrink-0" />
                          {item.localizacaoFisica}
                        </span>
                      )}
                      {noPedido > 0 && (
                        <span className="text-primary font-medium tabular-nums">
                          No pedido: {formatarQuantidade(noPedido)} {unidade}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    {disponivel ? (
                      <span
                        className={`tabular-nums font-semibold ${
                          status === 'crit'
                            ? 'text-error'
                            : status === 'low'
                              ? 'text-amber-700 dark:text-amber-400'
                              : 'text-on-surface'
                        }`}
                        title={
                          status === 'ok'
                            ? undefined
                            : `Estoque mínimo: ${formatarQuantidade(item.estoqueSeguranca)} ${unidade}`
                        }
                      >
                        {formatarQuantidade(item.estoqueAtual)} {unidade}
                      </span>
                    ) : (
                      <span className="text-error font-semibold">Sem saldo</span>
                    )}
                  </div>

                  <span
                    aria-hidden="true"
                    className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                      disponivel
                        ? ativo
                          ? 'bg-primary text-on-primary'
                          : 'text-primary border border-outline-variant/40'
                        : 'text-outline border border-outline-variant/20'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {(ocultosSemSaldo > 0 || totalEncontrado > resultados.length) && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-on-surface-variant">
          {ocultosSemSaldo > 0 ? (
            <span>
              {ocultosSemSaldo} {ocultosSemSaldo === 1 ? 'item sem saldo oculto' : 'itens sem saldo ocultos'}.{' '}
              <button
                type="button"
                onClick={() => setIncluirSemSaldo(true)}
                className="text-primary font-semibold hover:underline cursor-pointer"
              >
                Mostrar
              </button>
            </span>
          ) : (
            <span />
          )}
          {totalEncontrado > resultados.length && (
            <span className="tabular-nums">
              Mostrando {resultados.length} de {totalEncontrado}. Refine a busca.
            </span>
          )}
        </div>
      )}
    </section>
  );
}
