'use client';

import React from 'react';
import {
  Plus,
  Minus,
  PackageCheck,
  ShoppingBag,
  PackagePlus,
  UserPlus,
} from 'lucide-react';

export interface QuickActionsBarProps {
  onRegistrarEntrada: () => void;
  onRegistrarSaida: () => void;
  onReceberTerceiro?: () => void;
  onNovoPedido: () => void;
  onNovoMaterial?: () => void;
  onNovoUsuario?: () => void;
  onNovoCadastro?: () => void;
  className?: string;
}

export function QuickActionsBar({
  onRegistrarEntrada,
  onRegistrarSaida,
  onReceberTerceiro,
  onNovoPedido,
  onNovoMaterial,
  onNovoUsuario,
  onNovoCadastro,
  className = '',
}: QuickActionsBarProps) {
  const handleMaterial = onNovoMaterial || onNovoCadastro;

  return (
    <div
      aria-label="Ações rápidas de chão de fábrica"
      className={`flex flex-wrap items-center gap-2 mb-6 ${className}`}
    >
      {/* Ação Primária de Destaque */}
      <button
        type="button"
        onClick={onRegistrarEntrada}
        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-semibold hover:bg-zinc-800 dark:hover:bg-white transition-colors cursor-pointer shadow-2xs"
        title="Registrar nova entrada por nota fiscal ou compra"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>Registrar Entrada</span>
      </button>

      {/* Ações Secundárias Neutras Monocromáticas */}
      <button
        type="button"
        onClick={onRegistrarSaida}
        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-surface-container-lowest text-on-surface hover:bg-surface-container text-xs font-medium border border-outline-variant/40 transition-colors cursor-pointer"
        title="Registrar saída manual ou consumo interno"
      >
        <Minus className="w-3.5 h-3.5 text-zinc-500" />
        <span>Registrar Saída</span>
      </button>

      {onReceberTerceiro && (
        <button
          type="button"
          onClick={onReceberTerceiro}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-surface-container-lowest text-on-surface hover:bg-surface-container text-xs font-medium border border-outline-variant/40 transition-colors cursor-pointer"
          title="Receber remessa de material de terceiro"
        >
          <PackageCheck className="w-3.5 h-3.5 text-zinc-500" />
          <span>Receber de Terceiro</span>
        </button>
      )}

      <button
        type="button"
        onClick={onNovoPedido}
        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-surface-container-lowest text-on-surface hover:bg-surface-container text-xs font-medium border border-outline-variant/40 transition-colors cursor-pointer"
        title="Criar novo pedido de venda para cliente"
      >
        <ShoppingBag className="w-3.5 h-3.5 text-zinc-500" />
        <span>Novo Pedido</span>
      </button>

      {handleMaterial && (
        <button
          type="button"
          onClick={handleMaterial}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-surface-container-lowest text-on-surface hover:bg-surface-container text-xs font-medium border border-outline-variant/40 transition-colors cursor-pointer"
          title="Cadastrar novo SKU no catálogo de materiais"
        >
          <PackagePlus className="w-3.5 h-3.5 text-zinc-500" />
          <span>Cadastrar Material</span>
        </button>
      )}

      {onNovoUsuario && (
        <button
          type="button"
          onClick={onNovoUsuario}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-surface-container-lowest text-on-surface hover:bg-surface-container text-xs font-medium border border-outline-variant/40 transition-colors cursor-pointer"
          title="Cadastrar novo usuário no sistema (Administrador Mestre)"
        >
          <UserPlus className="w-3.5 h-3.5 text-zinc-500" />
          <span>Novo Usuário</span>
        </button>
      )}
    </div>
  );
}
