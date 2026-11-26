'use client';

import React, { useEffect, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { arredondar3 } from '@/core/domain/quantidade';

/** Unidades que admitem quantidade fracionada no pedido. */
const UNIDADES_FRACIONARIAS = new Set(['KG', 'METRO', 'LITRO']);

export function aceitaFracao(unidade: string): boolean {
  return UNIDADES_FRACIONARIAS.has(unidade.toUpperCase());
}

/**
 * Converte o texto digitado (vírgula ou ponto decimal) em quantidade válida, ou null.
 */
export function parsearQuantidade(texto: string, fracionaria: boolean): number | null {
  const limpo = texto.trim();
  // Com vírgula, pontos são separadores de milhar ("1.250,5"); sem vírgula, o ponto é decimal.
  const normalizado = limpo.includes(',') ? limpo.replace(/\./g, '').replace(',', '.') : limpo;
  const valor = limpo ? Number(normalizado) : NaN;
  if (!Number.isFinite(valor) || valor <= 0) return null;
  return fracionaria ? arredondar3(valor) : Math.max(1, Math.round(valor));
}

function formatar(valor: number): string {
  return String(valor).replace('.', ',');
}

export interface QuantidadeStepperProps {
  valor: number;
  unidade: string;
  onChange: (valor: number) => void;
  /** Rótulo acessível (ex.: "Quantidade de Disco flap"). */
  rotulo: string;
  invalido?: boolean;
}

/**
 * Campo de quantidade com botões de − / + e digitação livre.
 * O rascunho só é aplicado quando representa uma quantidade válida; ao sair do
 * campo, um valor inválido volta para a última quantidade aceita.
 */
export function QuantidadeStepper({ valor, unidade, onChange, rotulo, invalido }: QuantidadeStepperProps) {
  const fracionaria = aceitaFracao(unidade);
  const [rascunho, setRascunho] = useState(formatar(valor));
  const [editando, setEditando] = useState(false);

  useEffect(() => {
    if (!editando) setRascunho(formatar(valor));
  }, [valor, editando]);

  const passo = 1;
  const alterarPor = (delta: number) => {
    const minimo = fracionaria ? 0.001 : 1;
    onChange(Math.max(minimo, arredondar3(valor + delta)));
  };

  return (
    <div
      className={`inline-flex items-stretch h-8 rounded-md border bg-surface-container-lowest overflow-hidden ${
        invalido ? 'border-amber-500/70' : 'border-outline-variant/40'
      }`}
    >
      <button
        type="button"
        onClick={() => alterarPor(-passo)}
        disabled={valor <= passo && !fracionaria}
        aria-label={`Diminuir ${rotulo}`}
        className="w-7 flex items-center justify-center text-on-surface-variant hover:bg-surface-container disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
      >
        <Minus className="w-3.5 h-3.5" />
      </button>
      <input
        type="text"
        inputMode={fracionaria ? 'decimal' : 'numeric'}
        aria-label={rotulo}
        value={rascunho}
        onFocus={(e) => {
          setEditando(true);
          e.target.select();
        }}
        onChange={(e) => {
          setRascunho(e.target.value);
          const parsed = parsearQuantidade(e.target.value, fracionaria);
          if (parsed !== null) onChange(parsed);
        }}
        onBlur={() => {
          setEditando(false);
          setRascunho(formatar(valor));
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            alterarPor(passo);
          } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            alterarPor(-passo);
          }
        }}
        className="w-16 text-center text-xs font-semibold tabular-nums text-on-surface bg-transparent border-x border-outline-variant/30 focus:outline-none focus:bg-surface-container-low"
      />
      <button
        type="button"
        onClick={() => alterarPor(passo)}
        aria-label={`Aumentar ${rotulo}`}
        className="w-7 flex items-center justify-center text-on-surface-variant hover:bg-surface-container cursor-pointer"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
