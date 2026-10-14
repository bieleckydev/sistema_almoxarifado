'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, PackagePlus, AlertCircle, Loader2 } from 'lucide-react';
import {
  type AbaEstoque,
  METADADOS_ABAS,
  type DashboardItem,
} from '@/web/data/mock-almoxarifado';
import { api } from '@/core/api/client';
import { useToast } from '@/web/hooks/useToast';

export interface ItemCreateDrawerProps {
  aba: AbaEstoque;
  isOpen: boolean;
  onClose: () => void;
  onItemCreated: (item: DashboardItem) => void;
}

const PREFIXOS_SUGERIDOS: Record<AbaEstoque, string[]> = {
  mp: ['10-', '20-'],
  imp: ['90-'],
  motos: ['100-', '200-', '500-'],
};

const UNIDADES_OPCOES = [
  { valor: 'UNIDADE', label: 'un (Unidade)' },
  { valor: 'KG', label: 'kg (Quilograma)' },
  { valor: 'METRO', label: 'm (Metro)' },
  { valor: 'PECA', label: 'pç (Peça)' },
  { valor: 'PACOTE', label: 'pct (Pacote)' },
  { valor: 'LITRO', label: 'L (Litro)' },
];

export function ItemCreateDrawer({
  aba,
  isOpen,
  onClose,
  onItemCreated,
}: ItemCreateDrawerProps) {
  const { toast } = useToast();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const [descricao, setDescricao] = useState('');
  const [codigo, setCodigo] = useState('');
  const [categoria, setCategoria] = useState('');
  const [unidade, setUnidade] = useState('UNIDADE');
  const [estoqueInicial, setEstoqueInicial] = useState<number>(0);
  const [estoqueSeguranca, setEstoqueSeguranca] = useState<number>(0);
  const [capacidadeMaxima, setCapacidadeMaxima] = useState<number>(100);
  const [especificacoes, setEspecificacoes] = useState<Record<string, string>>({});
  const [erro, setErro] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inicializa com o prefixo sugerido ao abrir
  useEffect(() => {
    if (isOpen) {
      setDescricao('');
      setCodigo(PREFIXOS_SUGERIDOS[aba][0] || '');
      setCategoria(METADADOS_ABAS[aba].titulo);
      setUnidade('UNIDADE');
      setEstoqueInicial(0);
      setEstoqueSeguranca(10);
      setCapacidadeMaxima(100);
      setEspecificacoes({});
      setErro(null);
      setIsSubmitting(false);

      setTimeout(() => closeButtonRef.current?.focus(), 50);
    }
  }, [isOpen, aba]);

  // Tecla Escape para fechar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const camposEspecificos: string[] =
    aba === 'mp'
      ? ['Lote', 'Certificado', 'NF-e', 'Fornecedor']
      : aba === 'imp'
        ? ['Lote', 'Certificado de aprovação (CA)', 'NF-e', 'Fornecedor']
        : ['Modelo compatível', 'Marca', 'Código original', 'Medida'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    const descTrim = descricao.trim();
    const codTrim = codigo.trim().toUpperCase();

    if (!descTrim || !codTrim) {
      setErro('Preencha o nome e o código do item.');
      return;
    }

    if (capacidadeMaxima <= 0 || estoqueInicial < 0 || estoqueSeguranca < 0) {
      setErro('Informe capacidade máxima e quantidades válidas maiores ou iguais a zero.');
      return;
    }

    setIsSubmitting(true);

    try {
      const tipoDominio = METADADOS_ABAS[aba].tipoDominio;

      const payload = {
        descricao: descTrim,
        codigo: codTrim,
        tipo: tipoDominio,
        unidade,
        estoqueInicial,
        estoqueSeguranca,
        capacidadeMaxima,
        categoria: categoria.trim() || METADADOS_ABAS[aba].titulo,
        especificacoes: Object.fromEntries(
          Object.entries(especificacoes).filter(([_, v]) => v && v.trim())
        ),
      };

      const res = await api.post('/itens', payload);
      const novoItemCriado = res.data;

      const dashboardItem: DashboardItem = {
        ...novoItemCriado,
        aba,
        categoria: payload.categoria,
        capacidadeMaxima,
        especificacoes: payload.especificacoes,
      };

      toast(`Item cadastrado: ${descTrim}`, { type: 'success' });
      onItemCreated(dashboardItem);
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err as Error)?.message ||
        'Erro ao salvar item no catálogo.';
      setErro(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSpecChange = (campo: string, valor: string) => {
    setEspecificacoes((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Scrim / Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 dark:bg-black/75 transition-opacity animate-in fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Deslizante */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Cadastrar item em ${METADADOS_ABAS[aba].titulo}`}
        className="relative w-full max-w-md bg-white dark:bg-[#2b2b2e] border-l border-slate-200 dark:border-[#3e3e42] flex flex-col h-full z-10 overflow-y-auto animate-in slide-in-from-right duration-200"
      >
        {/* Cabeçalho */}
        <div className="sticky top-0 bg-white dark:bg-[#2b2b2e] z-20 px-6 py-4 border-b border-slate-200 dark:border-[#3e3e42] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PackagePlus className="w-5 h-5 text-[#1d4ea3] dark:text-[#5aa9ea]" />
            <h2 className="text-base font-bold text-slate-900 dark:text-[#ececee]">
              Novo item · {METADADOS_ABAS[aba].titulo}
            </h2>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Fechar formulário"
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-slate-100 dark:bg-[#343438] hover:bg-slate-200 dark:hover:bg-[#3e3e42] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 text-xs">
          {erro && (
            <div className="p-3 rounded-md bg-rose-50 dark:bg-[#40201d] border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-[#f0796b] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          {/* Nome / Descrição */}
          <label className="flex flex-col gap-1 font-medium text-slate-700 dark:text-slate-300">
            <span>Nome ou descrição do item *</span>
            <input
              type="text"
              required
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: Chapa de aço 3 mm, Luva de raspa, Pastilha de freio"
              className="p-2.5 rounded-md border border-slate-300 dark:border-[#3e3e42] bg-white dark:bg-[#232325] text-slate-900 dark:text-[#ececee] focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-500"
            />
          </label>

          {/* Código e Categoria */}
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 font-medium text-slate-700 dark:text-slate-300">
              <span>Código SKU *</span>
              <input
                type="text"
                required
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                placeholder="Ex: 10-0300"
                className="p-2.5 font-mono uppercase rounded-md border border-slate-300 dark:border-[#3e3e42] bg-white dark:bg-[#232325] text-slate-900 dark:text-[#ececee] focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-500"
              />
              <span className="text-[10px] text-slate-400">
                Prefixos: {PREFIXOS_SUGERIDOS[aba].join(', ')}
              </span>
            </label>

            <label className="flex flex-col gap-1 font-medium text-slate-700 dark:text-slate-300">
              <span>Categoria</span>
              <input
                type="text"
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                placeholder="Ex: Chapas, EPI, Freios"
                className="p-2.5 rounded-md border border-slate-300 dark:border-[#3e3e42] bg-white dark:bg-[#232325] text-slate-900 dark:text-[#ececee] focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-500"
              />
            </label>
          </div>

          {/* Unidade de Medida */}
          <label className="flex flex-col gap-1 font-medium text-slate-700 dark:text-slate-300">
            <span>Unidade de medida *</span>
            <select
              value={unidade}
              onChange={(e) => setUnidade(e.target.value)}
              className="p-2.5 rounded-md border border-slate-300 dark:border-[#3e3e42] bg-white dark:bg-[#232325] text-slate-900 dark:text-[#ececee] focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-500"
            >
              {UNIDADES_OPCOES.map((u) => (
                <option key={u.valor} value={u.valor}>
                  {u.label}
                </option>
              ))}
            </select>
          </label>

          {/* Saldo Inicial e Mínimo */}
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 font-medium text-slate-700 dark:text-slate-300">
              <span>Estoque inicial</span>
              <input
                type="number"
                min={0}
                value={estoqueInicial}
                onChange={(e) => setEstoqueInicial(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="p-2.5 rounded-md border border-slate-300 dark:border-[#3e3e42] bg-white dark:bg-[#232325] text-slate-900 dark:text-[#ececee] focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-500 tabular-nums"
              />
            </label>

            <label className="flex flex-col gap-1 font-medium text-slate-700 dark:text-slate-300">
              <span>Estoque mínimo *</span>
              <input
                type="number"
                min={0}
                required
                value={estoqueSeguranca}
                onChange={(e) => setEstoqueSeguranca(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="p-2.5 rounded-md border border-slate-300 dark:border-[#3e3e42] bg-white dark:bg-[#232325] text-slate-900 dark:text-[#ececee] focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-500 tabular-nums"
              />
            </label>
          </div>

          {/* Capacidade Máxima */}
          <label className="flex flex-col gap-1 font-medium text-slate-700 dark:text-slate-300">
            <span>Capacidade máxima do almoxarifado *</span>
            <input
              type="number"
              min={1}
              required
              value={capacidadeMaxima}
              onChange={(e) => setCapacidadeMaxima(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="p-2.5 rounded-md border border-slate-300 dark:border-[#3e3e42] bg-white dark:bg-[#232325] text-slate-900 dark:text-[#ececee] focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-500 tabular-nums"
            />
          </label>

          {/* Campos Técnicos Específicos da Categoria */}
          <div className="pt-2 border-t border-slate-200 dark:border-[#3e3e42]">
            <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
              Informações de {METADADOS_ABAS[aba].titulo.toLowerCase()}
            </h3>

            <div className="space-y-3">
              {camposEspecificos.map((campo) => (
                <label key={campo} className="flex flex-col gap-1 font-medium text-slate-600 dark:text-slate-400">
                  <span>{campo}</span>
                  <input
                    type="text"
                    value={especificacoes[campo] || ''}
                    onChange={(e) => handleSpecChange(campo, e.target.value)}
                    placeholder={`Informar ${campo.toLowerCase()}`}
                    className="p-2 rounded-md border border-slate-300 dark:border-[#3e3e42] bg-white dark:bg-[#232325] text-slate-900 dark:text-[#ececee] focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-500"
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Botão de Envio */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-4 w-full h-9 px-4 rounded-md text-xs font-semibold bg-[#1d4ea3] dark:bg-[#5aa9ea] text-white dark:text-[#06182e] hover:bg-[#163c7e] dark:hover:bg-[#4898d5] transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Salvando item...</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Salvar item</span>
              </>
            )}
          </button>
        </form>
      </aside>
    </div>
  );
}
