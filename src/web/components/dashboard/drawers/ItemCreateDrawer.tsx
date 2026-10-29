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
      ? ['Certificado', 'NF-e', 'Fornecedor']
      : aba === 'imp'
        ? ['NF-e', 'Fornecedor']
        : ['Modelo compatível', 'Código original', 'Medida'];

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
        className="fixed inset-0 bg-inverse-surface/60 transition-opacity animate-in fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Deslizante */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Cadastrar item em ${METADADOS_ABAS[aba].titulo}`}
        className="relative w-full max-w-md bg-surface-container-lowest border-l border-outline-variant/30 flex flex-col h-full z-10 overflow-y-auto animate-in slide-in-from-right duration-200"
      >
        {/* Cabeçalho */}
        <div className="sticky top-0 bg-surface-container-lowest z-20 px-6 py-4 border-b border-outline-variant/20 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-xl bg-primary-container/10 text-primary">
              <PackagePlus className="w-5 h-5" />
            </span>
            <h2 className="font-headline text-base font-bold text-on-surface">
              Novo item · {METADADOS_ABAS[aba].titulo}
            </h2>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Fechar formulário"
            className="p-1.5 rounded-xl text-outline hover:text-on-surface bg-surface-container hover:bg-surface-container-high transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 text-xs">
          {erro && (
            <div className="p-3 rounded-xl bg-error-container/40 border border-error/20 text-error flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          {/* Nome / Descrição */}
          <label className="flex flex-col gap-1.5 font-medium text-on-surface-variant">
            <span>Nome ou descrição do item *</span>
            <input
              type="text"
              required
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: Chapa de aço 3 mm, Luva de raspa, Pastilha de freio"
              className="p-2.5 rounded-xl border border-outline-variant/30 bg-surface-container-lowest text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </label>

          {/* Código e Categoria */}
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5 font-medium text-on-surface-variant">
              <span>Código SKU *</span>
              <input
                type="text"
                required
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                placeholder="Ex: 10-0300"
                className="p-2.5 font-mono uppercase rounded-xl border border-outline-variant/30 bg-surface-container-lowest text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
              <span className="text-[10px] text-outline">
                Prefixos: {PREFIXOS_SUGERIDOS[aba].join(', ')}
              </span>
            </label>

            <label className="flex flex-col gap-1.5 font-medium text-on-surface-variant">
              <span>Categoria</span>
              <input
                type="text"
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                placeholder="Ex: Chapas, EPI, Freios"
                className="p-2.5 rounded-xl border border-outline-variant/30 bg-surface-container-lowest text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </label>
          </div>

          {/* Unidade de Medida */}
          <label className="flex flex-col gap-1.5 font-medium text-on-surface-variant">
            <span>Unidade de medida *</span>
            <select
              value={unidade}
              onChange={(e) => setUnidade(e.target.value)}
              className="p-2.5 rounded-xl border border-outline-variant/30 bg-surface-container-lowest text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer"
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
            <label className="flex flex-col gap-1.5 font-medium text-on-surface-variant">
              <span>Estoque inicial</span>
              <input
                type="number"
                min={0}
                value={estoqueInicial}
                onChange={(e) => setEstoqueInicial(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="p-2.5 rounded-xl border border-outline-variant/30 bg-surface-container-lowest text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all tabular-nums"
              />
            </label>

            <label className="flex flex-col gap-1.5 font-medium text-on-surface-variant">
              <span>Estoque mínimo *</span>
              <input
                type="number"
                min={0}
                required
                value={estoqueSeguranca}
                onChange={(e) => setEstoqueSeguranca(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="p-2.5 rounded-xl border border-outline-variant/30 bg-surface-container-lowest text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all tabular-nums"
              />
            </label>
          </div>

          {/* Capacidade Máxima */}
          <label className="flex flex-col gap-1.5 font-medium text-on-surface-variant">
            <span>Capacidade máxima do almoxarifado *</span>
            <input
              type="number"
              min={1}
              required
              value={capacidadeMaxima}
              onChange={(e) => setCapacidadeMaxima(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="p-2.5 rounded-xl border border-outline-variant/30 bg-surface-container-lowest text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all tabular-nums"
            />
          </label>

          {/* Campos Técnicos Específicos da Categoria */}
          <div className="pt-2 border-t border-outline-variant/20">
            <h3 className="text-[11px] font-semibold text-on-surface-variant mb-2 uppercase tracking-wider">
              Informações de {METADADOS_ABAS[aba].titulo.toLowerCase()}
            </h3>

            <div className="space-y-3">
              {camposEspecificos.map((campo) => (
                <label key={campo} className="flex flex-col gap-1 font-medium text-on-surface-variant">
                  <span>{campo}</span>
                  <input
                    type="text"
                    value={especificacoes[campo] || ''}
                    onChange={(e) => handleSpecChange(campo, e.target.value)}
                    placeholder={`Informar ${campo.toLowerCase()}`}
                    className="p-2.5 rounded-xl border border-outline-variant/30 bg-surface-container-lowest text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Botão de Envio */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-4 w-full h-10 px-4 rounded-xl text-xs font-semibold bg-primary hover:bg-primary/90 text-on-primary transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
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
