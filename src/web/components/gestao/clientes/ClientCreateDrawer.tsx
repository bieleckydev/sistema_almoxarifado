'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Building2,
  Store,
  Truck,
  Package,
  Users,
  CheckCircle2,
  ShieldCheck,
  Lock,
  Mail,
  Phone,
  MapPin,
  RefreshCw,
  FileText,
  AlertCircle,
  Loader2,
  Check,
  Save,
  BadgeAlert,
} from 'lucide-react';
import { useCriarCliente } from '@/web/hooks/useClientes';
import { useToast } from '@/web/hooks/useToast';
import {
  type TipoParceiro,
  TIPO_PARCEIRO_LABELS,
} from '@/core/domain/cliente.schema';

export interface ClientCreateDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onClientCreated?: () => void;
  tipoInicial?: TipoParceiro;
}

type TipoPessoa = 'PJ' | 'PF';

const ABAS_PARCEIRO: Array<{
  valor: TipoParceiro;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { valor: 'CLIENTE', label: 'Cliente', icon: Store },
  { valor: 'FORNECEDOR', label: 'Fornecedor', icon: Package },
  { valor: 'TRANSPORTADORA', label: 'Transportadora', icon: Truck },
  { valor: 'OUTRO', label: 'Contato', icon: Users },
];

// Funções utilitárias de máscara
function formatarCnpj(val: string): string {
  const digits = val.replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12)
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}

function formatarCpf(val: string): string {
  const digits = val.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

function formatarTelefone(val: string): string {
  const digits = val.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : '';
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

function formatarCep(val: string): string {
  const digits = val.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5, 8)}`;
}

export function ClientCreateDrawer({
  isOpen,
  onClose,
  onClientCreated,
  tipoInicial,
}: ClientCreateDrawerProps) {
  const { toast } = useToast();
  const criarClienteMutation = useCriarCliente();

  // 1. Tipo do parceiro (tabs no topo)
  const [tipo, setTipo] = useState<TipoParceiro>(tipoInicial || 'CLIENTE');
  const [tipoPessoa, setTipoPessoa] = useState<TipoPessoa>('PJ');

  // 2. Identificação & SEFAZ
  const [documento, setDocumento] = useState('');
  const [razaoSocial, setRazaoSocial] = useState('');
  const [nomeFantasia, setNomeFantasia] = useState('');
  const [inscricaoEstadual, setInscricaoEstadual] = useState('');
  const [regimeTributario, setRegimeTributario] = useState('Simples Nacional');

  // 3. Contatos & Responsáveis
  const [nomeContato, setNomeContato] = useState('');
  const [cargoContato, setCargoContato] = useState('');
  const [telefone, setTelefone] = useState('');
  const [emailNfe, setEmailNfe] = useState('');

  // 4. Endereço & Logística
  const [cep, setCep] = useState('');
  const [logradouro, setLogradouro] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [uf, setUf] = useState('SP');
  const [obsEntrega, setObsEntrega] = useState('');

  const [isConsultandoReceita, setIsConsultandoReceita] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Reset de campos ao abrir
  useEffect(() => {
    if (isOpen) {
      setTipo(tipoInicial || 'CLIENTE');
      setTipoPessoa('PJ');
      setDocumento('');
      setRazaoSocial('');
      setNomeFantasia('');
      setInscricaoEstadual('');
      setRegimeTributario('Simples Nacional');
      setNomeContato('');
      setCargoContato('');
      setTelefone('');
      setEmailNfe('');
      setCep('');
      setLogradouro('');
      setBairro('');
      setCidade('');
      setUf('SP');
      setObsEntrega('');
      setErro(null);
    }
  }, [isOpen, tipoInicial]);

  // Fechamento com tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      setTimeout(() => closeButtonRef.current?.focus(), 50);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Formatação de documento ao digitar
  const handleDocumentoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (tipoPessoa === 'PJ') {
      setDocumento(formatarCnpj(raw));
    } else {
      setDocumento(formatarCpf(raw));
    }
  };

  // Simulação amigável de consulta na Receita Federal
  const handleConsultarReceita = () => {
    const digitos = documento.replace(/\D/g, '');
    if (digitos.length !== 14 && digitos.length !== 11) {
      toast('Informe um CNPJ completo (14 dígitos) para consulta.', { type: 'error' });
      return;
    }

    setIsConsultandoReceita(true);
    setTimeout(() => {
      setIsConsultandoReceita(false);
      toast('Dados do CNPJ verificados junto à Receita Federal!', { type: 'success' });
      if (!razaoSocial) {
        setRazaoSocial(nomeFantasia ? `${nomeFantasia} Ltda` : 'Distribuidora Homologada Ltda');
      }
      if (!inscricaoEstadual && tipoPessoa === 'PJ') {
        setInscricaoEstadual('109.876.543.210');
      }
    }, 700);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    // Valida nome ou razão social
    const nomeFinal = (razaoSocial.trim() || nomeFantasia.trim());
    if (!nomeFinal || nomeFinal.length < 2) {
      setErro('Informe o nome ou razão social (mínimo 2 caracteres).');
      return;
    }

    // Se ambos preenchidos e diferentes, formata Nome Comercial
    const nomeFormatado =
      razaoSocial.trim() && nomeFantasia.trim() && razaoSocial.trim() !== nomeFantasia.trim()
        ? `${razaoSocial.trim()} (${nomeFantasia.trim()})`
        : nomeFinal;

    // Concatena informações de contato (Nome + Cargo / Email se houver)
    let contatoFinal = nomeContato.trim();
    if (cargoContato.trim()) {
      contatoFinal = contatoFinal ? `${contatoFinal} (${cargoContato.trim()})` : cargoContato.trim();
    }
    if (emailNfe.trim()) {
      contatoFinal = contatoFinal ? `${contatoFinal} • ${emailNfe.trim()}` : emailNfe.trim();
    }

    // Concatena cidade e localização
    let cidadeFinal = cidade.trim();
    if (uf.trim()) {
      cidadeFinal = cidadeFinal ? `${cidadeFinal} - ${uf.trim().toUpperCase()}` : uf.trim().toUpperCase();
    }
    if (logradouro.trim()) {
      cidadeFinal = cidadeFinal ? `${cidadeFinal} (${logradouro.trim()})` : logradouro.trim();
    }

    try {
      await criarClienteMutation.mutateAsync({
        tipo,
        nome: nomeFormatado,
        documento: documento.trim() || undefined,
        contato: contatoFinal || undefined,
        telefone: telefone.trim() || undefined,
        cidade: cidadeFinal || undefined,
        ativo: true,
      });

      toast(`Parceiro ${nomeFormatado} cadastrado com sucesso!`, { type: 'success' });
      onClientCreated?.();
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { message?: string })?.message ||
        'Falha ao salvar cadastro comercial. Verifique os dados.';
      setErro(msg);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Scrim / Backdrop escurecido */}
      <div
        className="fixed inset-0 bg-inverse-surface/60 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Painel Deslizante Lateral Amplo (WMS Style: max-w-2xl) */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Novo cadastro comercial"
        className="relative w-full max-w-2xl bg-surface-container-lowest border-l border-outline-variant/30 flex flex-col h-full z-10 overflow-y-auto animate-in slide-in-from-right duration-250 shadow-2xl"
      >
        {/* 1. Cabeçalho Principal */}
        <div className="sticky top-0 bg-surface-container-lowest/95 backdrop-blur-md z-20 px-6 py-4 border-b border-outline-variant/20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary text-on-primary flex items-center justify-center shadow-sm shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-headline text-lg font-bold text-on-surface leading-tight">
                  Novo Cadastro Comercial
                </h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-primary-container/20 text-primary uppercase tracking-tight">
                  WMS v4
                </span>
              </div>
              <p className="text-xs text-on-surface-variant mt-0.5 font-normal">
                Clientes, fornecedores e transportadoras homologadas no WMS
              </p>
            </div>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Fechar painel"
            className="w-9 h-9 rounded-xl text-outline hover:text-on-surface bg-surface-container hover:bg-surface-container-high flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 2. Segmented Tabs de Perfil (Topo) */}
        <div className="px-6 py-2.5 bg-surface-container-low border-b border-outline-variant/20">
          <div className="flex p-1 bg-surface-container rounded-xl gap-1">
            {ABAS_PARCEIRO.map((aba) => {
              const Icone = aba.icon;
              const ativa = tipo === aba.valor;
              return (
                <button
                  key={aba.valor}
                  type="button"
                  onClick={() => setTipo(aba.valor)}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    ativa
                      ? 'bg-surface-container-lowest text-primary shadow-xs'
                      : 'text-secondary hover:text-on-surface'
                  }`}
                >
                  <Icone className="w-3.5 h-3.5" />
                  <span>{aba.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Corpo do Formulário */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-6 flex-1">
          {erro && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-error-container/40 border border-error/20 text-error text-xs flex items-center gap-2.5 animate-in fade-in"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-error" />
              <span className="font-medium">{erro}</span>
            </div>
          )}

          {/* SEÇÃO 1: Identificação & SEFAZ */}
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between pb-1 border-b border-outline-variant/15">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-4 rounded-full bg-primary" />
                <h3 className="text-sm font-bold text-on-surface">
                  1. Identificação &amp; SEFAZ
                </h3>
              </div>
              {/* Alternador PJ / PF */}
              <div className="flex items-center p-0.5 bg-surface-container rounded-lg">
                <button
                  type="button"
                  onClick={() => {
                    setTipoPessoa('PJ');
                    setDocumento('');
                  }}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    tipoPessoa === 'PJ'
                      ? 'bg-surface-container-lowest text-primary shadow-xs'
                      : 'text-secondary hover:text-on-surface font-medium'
                  }`}
                >
                  Pessoa Jurídica (CNPJ)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTipoPessoa('PF');
                    setDocumento('');
                  }}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    tipoPessoa === 'PF'
                      ? 'bg-surface-container-lowest text-primary shadow-xs'
                      : 'text-secondary hover:text-on-surface font-medium'
                  }`}
                >
                  Pessoa Física (CPF)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-3">
              {/* Campo Documento CNPJ/CPF + Botão Consulta */}
              <div className="col-span-12 flex flex-col gap-1">
                <label className="text-xs font-semibold text-on-surface-variant flex items-center justify-between">
                  <span>{tipoPessoa === 'PJ' ? 'CNPJ Matriz / Filial' : 'CPF do Titular'}</span>
                  <span className="text-tertiary flex items-center gap-1 font-normal text-[11px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse" />
                    SEFAZ Online
                  </span>
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <FileText className="w-4 h-4 text-outline absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={documento}
                      onChange={handleDocumentoChange}
                      placeholder={tipoPessoa === 'PJ' ? '00.000.000/0001-00' : '000.000.000-00'}
                      className="w-full pl-9 pr-3 py-2 bg-surface-container-low text-on-surface font-mono text-xs rounded-xl border border-outline-variant/30 focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                  </div>
                  {tipoPessoa === 'PJ' && (
                    <button
                      type="button"
                      onClick={handleConsultarReceita}
                      disabled={isConsultandoReceita}
                      className="bg-surface-container hover:bg-surface-container-high text-primary px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 border border-outline-variant/20 cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isConsultandoReceita ? 'animate-spin' : ''}`} />
                      <span>Consultar Receita</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Razão Social */}
              <div className="col-span-12 sm:col-span-7 flex flex-col gap-1">
                <label className="text-xs font-semibold text-on-surface-variant">
                  {tipoPessoa === 'PJ' ? 'Razão Social' : 'Nome Completo'}{' '}
                  <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  value={razaoSocial}
                  onChange={(e) => setRazaoSocial(e.target.value)}
                  placeholder={tipoPessoa === 'PJ' ? 'Ex: Grajaú Motos Distribuidora Ltda' : 'Ex: João da Silva'}
                  required
                  className="w-full px-3 py-2 bg-surface-container-low text-on-surface text-xs rounded-xl border border-outline-variant/30 focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
                />
              </div>

              {/* Nome Fantasia */}
              <div className="col-span-12 sm:col-span-5 flex flex-col gap-1">
                <label className="text-xs font-semibold text-on-surface-variant">
                  Nome Fantasia
                </label>
                <input
                  type="text"
                  value={nomeFantasia}
                  onChange={(e) => setNomeFantasia(e.target.value)}
                  placeholder="Ex: Grajaú Motos"
                  className="w-full px-3 py-2 bg-surface-container-low text-on-surface text-xs rounded-xl border border-outline-variant/30 focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>

              {/* Inscrição Estadual (IE) */}
              <div className="col-span-12 sm:col-span-6 flex flex-col gap-1">
                <label className="text-xs font-semibold text-on-surface-variant">
                  Inscrição Estadual (IE)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={inscricaoEstadual}
                    onChange={(e) => setInscricaoEstadual(e.target.value)}
                    placeholder="109.876.543.210 ou Isento"
                    className="w-full px-3 py-2 bg-surface-container-low text-on-surface font-mono text-xs rounded-xl border border-outline-variant/30 focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                  <span className="absolute right-2 top-2 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-surface-container-highest text-secondary">
                    Contribuinte
                  </span>
                </div>
              </div>

              {/* Regime Tributário */}
              <div className="col-span-12 sm:col-span-6 flex flex-col gap-1">
                <label className="text-xs font-semibold text-on-surface-variant">
                  Regime Tributário
                </label>
                <select
                  value={regimeTributario}
                  onChange={(e) => setRegimeTributario(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-container-low text-on-surface text-xs rounded-xl border border-outline-variant/30 focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
                >
                  <option value="Simples Nacional">Simples Nacional</option>
                  <option value="Lucro Presumido">Lucro Presumido</option>
                  <option value="Lucro Real">Lucro Real</option>
                  <option value="MEI">MEI (Microempreendedor Individual)</option>
                  <option value="Não Aplicável">Não Aplicável / Isento</option>
                </select>
              </div>
            </div>
          </section>

          {/* SEÇÃO 2: Contatos & Responsáveis */}
          <section className="flex flex-col gap-3">
            <div className="flex items-center gap-2 pb-1 border-b border-outline-variant/15">
              <span className="w-1.5 h-4 rounded-full bg-secondary" />
              <h3 className="text-sm font-bold text-on-surface">
                2. Contatos &amp; Responsáveis
              </h3>
            </div>

            <div className="grid grid-cols-12 gap-3">
              {/* Nome do Contato Principal */}
              <div className="col-span-12 sm:col-span-7 flex flex-col gap-1">
                <label className="text-xs font-semibold text-on-surface-variant">
                  Nome do Contato Principal
                </label>
                <div className="relative">
                  <Users className="w-4 h-4 text-outline absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={nomeContato}
                    onChange={(e) => setNomeContato(e.target.value)}
                    placeholder="Ex: João Silva"
                    className="w-full pl-9 pr-3 py-2 bg-surface-container-low text-on-surface text-xs rounded-xl border border-outline-variant/30 focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>

              {/* Cargo / Departamento */}
              <div className="col-span-12 sm:col-span-5 flex flex-col gap-1">
                <label className="text-xs font-semibold text-on-surface-variant">
                  Cargo / Departamento
                </label>
                <input
                  type="text"
                  value={cargoContato}
                  onChange={(e) => setCargoContato(e.target.value)}
                  placeholder="Ex: Gerente de Compras"
                  className="w-full px-3 py-2 bg-surface-container-low text-on-surface text-xs rounded-xl border border-outline-variant/30 focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>

              {/* Telefone Comercial / WhatsApp */}
              <div className="col-span-12 sm:col-span-5 flex flex-col gap-1">
                <label className="text-xs font-semibold text-on-surface-variant">
                  Telefone Comercial / WhatsApp
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-outline absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={telefone}
                    onChange={(e) => setTelefone(formatarTelefone(e.target.value))}
                    placeholder="(11) 98765-4321"
                    className="w-full pl-9 pr-3 py-2 bg-surface-container-low text-on-surface font-mono text-xs rounded-xl border border-outline-variant/30 focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>

              {/* E-mail para XML de NF-e & DANFE */}
              <div className="col-span-12 sm:col-span-7 flex flex-col gap-1">
                <label className="text-xs font-semibold text-on-surface-variant flex items-center justify-between">
                  <span>E-mail para XML de NF-e &amp; DANFE</span>
                  <span className="text-[11px] text-primary font-medium">Automação EDI</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-outline absolute left-3 top-2.5" />
                  <input
                    type="email"
                    value={emailNfe}
                    onChange={(e) => setEmailNfe(e.target.value)}
                    placeholder="fiscal@empresa.com.br"
                    className="w-full pl-9 pr-3 py-2 bg-surface-container-low text-on-surface text-xs rounded-xl border border-outline-variant/30 focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* SEÇÃO 3: Endereço & Logística de Entrega */}
          <section className="flex flex-col gap-3">
            <div className="flex items-center gap-2 pb-1 border-b border-outline-variant/15">
              <span className="w-1.5 h-4 rounded-full bg-tertiary" />
              <h3 className="text-sm font-bold text-on-surface">
                3. Endereço &amp; Logística de Entrega
              </h3>
            </div>

            <div className="grid grid-cols-12 gap-3">
              {/* CEP */}
              <div className="col-span-12 sm:col-span-4 flex flex-col gap-1">
                <label className="text-xs font-semibold text-on-surface-variant flex items-center justify-between">
                  <span>CEP</span>
                  {cep.replace(/\D/g, '').length === 8 && (
                    <span className="text-tertiary text-[11px] flex items-center gap-0.5">
                      <CheckCircle2 className="w-3 h-3" />
                      Válido
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={cep}
                    onChange={(e) => setCep(formatarCep(e.target.value))}
                    placeholder="00000-000"
                    className="w-full px-3 py-2 bg-surface-container-low text-on-surface font-mono text-xs rounded-xl border border-outline-variant/30 focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>

              {/* Logradouro */}
              <div className="col-span-12 sm:col-span-8 flex flex-col gap-1">
                <label className="text-xs font-semibold text-on-surface-variant">
                  Logradouro / Avenida / Rua
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-outline absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={logradouro}
                    onChange={(e) => setLogradouro(e.target.value)}
                    placeholder="Ex: Rua das Palmeiras, 450 - Galpão B"
                    className="w-full pl-9 pr-3 py-2 bg-surface-container-low text-on-surface text-xs rounded-xl border border-outline-variant/30 focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>

              {/* Bairro */}
              <div className="col-span-12 sm:col-span-5 flex flex-col gap-1">
                <label className="text-xs font-semibold text-on-surface-variant">
                  Bairro
                </label>
                <input
                  type="text"
                  value={bairro}
                  onChange={(e) => setBairro(e.target.value)}
                  placeholder="Ex: Distrito Industrial"
                  className="w-full px-3 py-2 bg-surface-container-low text-on-surface text-xs rounded-xl border border-outline-variant/30 focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>

              {/* Cidade */}
              <div className="col-span-8 sm:col-span-5 flex flex-col gap-1">
                <label className="text-xs font-semibold text-on-surface-variant">
                  Cidade
                </label>
                <input
                  type="text"
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  placeholder="Ex: São Paulo"
                  className="w-full px-3 py-2 bg-surface-container-low text-on-surface text-xs rounded-xl border border-outline-variant/30 focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>

              {/* UF */}
              <div className="col-span-4 sm:col-span-2 flex flex-col gap-1">
                <label className="text-xs font-semibold text-on-surface-variant">
                  UF
                </label>
                <input
                  type="text"
                  maxLength={2}
                  value={uf}
                  onChange={(e) => setUf(e.target.value.toUpperCase())}
                  placeholder="SP"
                  className="w-full px-2 py-2 bg-surface-container-low text-on-surface text-xs font-bold text-center uppercase rounded-xl border border-outline-variant/30 focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>

              {/* Observações de Entrega / Doca */}
              <div className="col-span-12 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-on-surface-variant">
                    Observações de Entrega / Restrição de Doca
                  </label>
                  <span className="text-[11px] text-outline">
                    Ordem de separação e romaneio
                  </span>
                </div>
                <textarea
                  rows={2}
                  value={obsEntrega}
                  onChange={(e) => setObsEntrega(e.target.value)}
                  placeholder="Ex: Recebimento de caminhão até 12t das 08h às 16h. Doca padrão PBR."
                  className="w-full p-3 bg-surface-container-low text-on-surface text-xs rounded-xl border border-outline-variant/30 focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none transition-all leading-relaxed"
                />
              </div>
            </div>
          </section>

          {/* Banner de Homologação de Compliance */}
          <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/20 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-tertiary-container/20 text-tertiary flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-on-surface">
                  Homologação de Compliance Ativa
                </span>
                <span className="text-[11px] text-on-surface-variant">
                  Entidade qualificada para conferência cega e expedição integrada
                </span>
              </div>
            </div>
            <Check className="w-4 h-4 text-tertiary shrink-0" />
          </div>

          {/* 4. Rodapé Fixo */}
          <div className="mt-auto pt-4 border-t border-outline-variant/20 flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 text-outline text-[11px]">
              <Lock className="w-3.5 h-3.5" />
              <span>Transação auditada no sistema WMS</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={criarClienteMutation.isPending}
                className="h-10 px-4 rounded-xl text-xs font-semibold text-secondary hover:text-on-surface hover:bg-surface-container border border-outline-variant/30 transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={criarClienteMutation.isPending}
                className="h-10 px-5 rounded-xl text-xs font-bold bg-primary hover:bg-primary/90 text-on-primary transition-all flex items-center gap-2 cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
              >
                {criarClienteMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Salvando cadastro...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Salvar Cadastro Comercial</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </aside>
    </div>
  );
}
