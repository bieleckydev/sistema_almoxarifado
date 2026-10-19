'use client';

import { useQuery } from '@tanstack/react-query';
import { db } from '@/core/services/firebase';
import { collection, getDocs, limit, query, orderBy } from 'firebase/firestore';
import {
  type AbaEstoque,
  METADADOS_ABAS,
  UNIDADE_LABELS,
  NOTAS_INICIAIS,
  MATERIAIS_TERCEIROS_INICIAIS,
  CLIENTES_INICIAIS,
} from '@/web/data/mock-almoxarifado';

export type SearchResultType =
  | 'item'
  | 'nfe'
  | 'cliente'
  | 'pedido'
  | 'faturamento'
  | 'terceiro';

export interface GlobalSearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle: string;
  badge?: string;
  targetAba?: AbaEstoque;
  targetItemId?: string;
  targetScreen?: 'inicio' | AbaEstoque | 'vendas' | 'clientes' | 'saida' | 'fat' | 'terc';
}

interface RawDataCache {
  itens: Array<{
    id: string;
    nome: string;
    codigo: string;
    categoria: string;
    aba: AbaEstoque;
    saldo: number;
    unidade: string;
    especificacoes: Record<string, string>;
  }>;
  nfes: Array<{
    id: string;
    nfe: string;
    itemId: string;
    itemNome: string;
    aba: AbaEstoque;
    quantidade: number;
    unidade: string;
    dataHora: string;
    fornecedor?: string;
  }>;
  clientes: Array<{
    id: string;
    nome: string;
    tipo: string;
    documento?: string;
    contato?: string;
  }>;
  pedidos: Array<{
    id: string;
    codigo: string;
    clienteNome: string;
    prazoEntrega: string;
    status: string;
  }>;
  notasFaturamento: Array<{
    id: string;
    numeroNF: string;
    serie: string;
    clienteNome: string;
    tipo: string;
    valorTotal: number;
    dataEmissao: string;
  }>;
  terceiros: Array<{
    id: string;
    descricao: string;
    codigoSku?: string;
    clienteNome: string;
    saldoAtual: number;
    unidade: string;
    numeroNFRemessa?: string;
  }>;
}

/**
 * Carrega a base indexada para a busca global rápida no cliente.
 */
async function fetchGlobalSearchIndex(): Promise<RawDataCache> {
  const result: RawDataCache = {
    itens: [],
    nfes: [],
    clientes: [],
    pedidos: [],
    notasFaturamento: [],
    terceiros: [],
  };

  // 1. Itens de estoque
  try {
    const itemsSnap = await getDocs(collection(db, 'items'));
    itemsSnap.forEach((doc) => {
      const d = doc.data();
      let aba: AbaEstoque = 'mp';
      if (d.tipo === 'IMPRODUTIVO_CONSUMIVEL') aba = 'imp';
      else if (d.tipo === 'ACABADO') aba = 'motos';

      const unidadeStr = String(d.unidade || 'UNIDADE');
      const unidadeFmt = UNIDADE_LABELS[unidadeStr] || unidadeStr.toLowerCase();

      result.itens.push({
        id: doc.id,
        nome: String(d.descricao || d.nome || ''),
        codigo: String(d.codigo || ''),
        categoria: String(d.categoria || METADADOS_ABAS[aba].titulo),
        aba,
        saldo: Number(d.estoqueAtual) || 0,
        unidade: unidadeFmt,
        especificacoes: (d.especificacoes as Record<string, string>) || {},
      });
    });
  } catch (err) {
    console.warn('Erro ao carregar itens para busca global:', err);
  }

  // 2. Movimentações com NF-e
  try {
    const movsQ = query(collection(db, 'movements'), orderBy('createdAt', 'desc'), limit(150));
    const movsSnap = await getDocs(movsQ);
    const itemMap = new Map(result.itens.map((it) => [it.id, it]));

    movsSnap.forEach((doc) => {
      const d = doc.data();
      const nfe = String(d.numeroNotaFiscal || d.nfe || (d.info as Record<string, unknown>)?.[`NF-e`] || '');
      if (nfe && nfe.trim()) {
        const itemId = String(d.itemId || '');
        const item = itemMap.get(itemId);
        result.nfes.push({
          id: doc.id,
          nfe: nfe.trim(),
          itemId,
          itemNome: item?.nome || 'Material',
          aba: item?.aba || 'mp',
          quantidade: Number(d.quantidade) || 0,
          unidade: item?.unidade || 'un',
          dataHora: d.createdAt ? new Date(d.createdAt).toLocaleDateString('pt-BR') : '',
          fornecedor: String(d.fornecedor || (d.info as Record<string, unknown>)?.[`Fornecedor`] || ''),
        });
      }
    });
  } catch (err) {
    console.warn('Erro ao carregar movimentações para busca global:', err);
  }

  // 3. Clientes e Parceiros
  try {
    const clientsSnap = await getDocs(collection(db, 'clients'));
    clientsSnap.forEach((doc) => {
      const d = doc.data();
      result.clientes.push({
        id: doc.id,
        nome: String(d.nome || d.razaoSocial || ''),
        tipo: String(d.tipo || 'Cliente'),
        documento: d.documento ? String(d.documento) : undefined,
        contato: d.contato ? String(d.contato) : undefined,
      });
    });
  } catch (err) {
    CLIENTES_INICIAIS.forEach((c) => {
      result.clientes.push({
        id: c.id,
        nome: c.nome,
        tipo: c.tipo,
        documento: c.documento,
        contato: c.contato,
      });
    });
  }

  const clientMap = new Map(result.clientes.map((c) => [c.id, c.nome]));

  // 4. Pedidos de Venda
  try {
    const ordersSnap = await getDocs(collection(db, 'orders'));
    ordersSnap.forEach((doc) => {
      const d = doc.data();
      const clienteId = String(d.clienteId || '');
      const clienteNome = String(d.clienteNome || clientMap.get(clienteId) || 'Cliente');
      const prazo = d.prazoEntrega ? String(d.prazoEntrega).split('-').reverse().join('/') : '';

      result.pedidos.push({
        id: doc.id,
        codigo: String(d.codigo || d.numeroSequencial || doc.id.slice(0, 6)),
        clienteNome,
        prazoEntrega: prazo,
        status: String(d.status || 'PENDENTE'),
      });
    });
  } catch (err) {
    console.warn('Erro ao carregar pedidos para busca global:', err);
  }

  // 5. Notas Fiscais Emitidas (Faturamento)
  try {
    const invoicesSnap = await getDocs(collection(db, 'invoices'));
    invoicesSnap.forEach((doc) => {
      const d = doc.data();
      result.notasFaturamento.push({
        id: doc.id,
        numeroNF: String(d.numeroNF || ''),
        serie: String(d.serie || '1'),
        clienteNome: clientMap.get(String(d.clienteId || '')) || 'Cliente',
        tipo: d.tipo === 'RETORNO_INDUSTRIALIZACAO' ? 'Retorno' : 'Venda',
        valorTotal: Number(d.valorTotal) || 0,
        dataEmissao: String(d.dataEmissao || ''),
      });
    });
  } catch (err) {
    NOTAS_INICIAIS.forEach((n) => {
      result.notasFaturamento.push({
        id: n.id,
        numeroNF: n.numeroNF,
        serie: n.serie,
        clienteNome: clientMap.get(n.clienteId) || 'Cliente',
        tipo: n.tipo === 'RETORNO_INDUSTRIALIZACAO' ? 'Retorno' : 'Venda',
        valorTotal: n.valorTotal,
        dataEmissao: n.dataEmissao,
      });
    });
  }

  // 6. Materiais de Terceiros (Custódia)
  try {
    const thirdsSnap = await getDocs(collection(db, 'third_party_materials'));
    thirdsSnap.forEach((doc) => {
      const d = doc.data();
      result.terceiros.push({
        id: doc.id,
        descricao: String(d.descricao || ''),
        codigoSku: d.codigoSku ? String(d.codigoSku) : undefined,
        clienteNome: clientMap.get(String(d.clienteId || '')) || 'Cliente',
        saldoAtual: Number(d.saldoAtual) || 0,
        unidade: String(d.unidade || 'un'),
        numeroNFRemessa: d.numeroNFRemessa ? String(d.numeroNFRemessa) : undefined,
      });
    });
  } catch (err) {
    MATERIAIS_TERCEIROS_INICIAIS.forEach((t) => {
      result.terceiros.push({
        id: t.id,
        descricao: t.descricao,
        codigoSku: t.codigoSku,
        clienteNome: clientMap.get(t.clienteId) || 'Cliente',
        saldoAtual: t.saldoAtual,
        unidade: t.unidade,
        numeroNFRemessa: t.numeroNFRemessa,
      });
    });
  }

  return result;
}

export function useGlobalSearch(termoBusca: string) {
  const { data: index, isLoading } = useQuery<RawDataCache>({
    queryKey: ['global-search-index'],
    queryFn: fetchGlobalSearchIndex,
    staleTime: 60 * 1000, // 1 minuto
  });

  const queryClean = termoBusca.trim().toLowerCase();

  if (!queryClean || !index) {
    return {
      resultados: [],
      totalResultados: 0,
      isLoading,
    };
  }

  const has = (...args: (string | undefined | null)[]) =>
    args.some((arg) => (arg ? String(arg).toLowerCase().includes(queryClean) : false));

  // 1. Filtrar Itens (máximo 6)
  const itensResultados: GlobalSearchResult[] = index.itens
    .filter((item) =>
      has(
        item.nome,
        item.codigo,
        item.categoria,
        ...Object.values(item.especificacoes || {})
      )
    )
    .slice(0, 6)
    .map((item) => ({
      id: `item-${item.id}`,
      type: 'item',
      title: item.nome,
      subtitle: `${METADADOS_ABAS[item.aba].titulo} · ${item.codigo}`,
      badge: `${item.saldo.toLocaleString('pt-BR')} ${item.unidade}`,
      targetAba: item.aba,
      targetItemId: item.id,
    }));

  // 2. Filtrar NF-e de entrada (máximo 3)
  const nfeResultados: GlobalSearchResult[] = index.nfes
    .filter((nfe) => has(nfe.nfe, nfe.fornecedor))
    .slice(0, 3)
    .map((nfe) => ({
      id: `nfe-${nfe.id}`,
      type: 'nfe',
      title: `NF-e ${nfe.nfe}`,
      subtitle: `${nfe.itemNome}${nfe.dataHora ? ' · ' + nfe.dataHora : ''}`,
      badge: `+${nfe.quantidade.toLocaleString('pt-BR')} ${nfe.unidade}`,
      targetAba: nfe.aba,
      targetItemId: nfe.itemId,
    }));

  // 3. Filtrar Clientes (máximo 3)
  const clientesResultados: GlobalSearchResult[] = index.clientes
    .filter((c) => has(c.nome, c.documento, c.contato))
    .slice(0, 3)
    .map((c) => ({
      id: `cli-${c.id}`,
      type: 'cliente',
      title: c.nome,
      subtitle: c.tipo,
      badge: c.contato || undefined,
      targetScreen: 'clientes',
    }));

  // 4. Filtrar Pedidos (máximo 3)
  const pedidosResultados: GlobalSearchResult[] = index.pedidos
    .filter((p) => has(`#${p.codigo}`, p.codigo, p.clienteNome))
    .slice(0, 3)
    .map((p) => ({
      id: `ped-${p.id}`,
      type: 'pedido',
      title: `Pedido #${p.codigo}`,
      subtitle: `${p.clienteNome}${p.prazoEntrega ? ' · entrega ' + p.prazoEntrega : ''}`,
      badge: p.status,
      targetScreen: 'vendas',
    }));

  // 5. Filtrar Notas Fiscais Emitidas / Faturamento (máximo 3)
  const faturamentoResultados: GlobalSearchResult[] = index.notasFaturamento
    .filter((nf) => has(nf.numeroNF, `nf-${nf.numeroNF}`, `nf ${nf.numeroNF}`, nf.clienteNome, nf.tipo))
    .slice(0, 3)
    .map((nf) => ({
      id: `fat-${nf.id}`,
      type: 'faturamento',
      title: `NF-e ${nf.numeroNF} (${nf.tipo})`,
      subtitle: `${nf.clienteNome} · R$ ${nf.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      badge: nf.tipo === 'Retorno' ? 'Retorno Ind.' : 'Venda',
      targetScreen: 'fat',
    }));

  // 6. Filtrar Materiais de Terceiros sob Custódia (máximo 3)
  const terceirosResultados: GlobalSearchResult[] = index.terceiros
    .filter((t) => has(t.descricao, t.codigoSku, t.clienteNome, t.numeroNFRemessa))
    .slice(0, 3)
    .map((t) => ({
      id: `terc-${t.id}`,
      type: 'terceiro',
      title: t.descricao,
      subtitle: `${t.clienteNome}${t.numeroNFRemessa ? ' · NF-e Remessa ' + t.numeroNFRemessa : ''}`,
      badge: `${t.saldoAtual} ${t.unidade}`,
      targetScreen: 'terc',
    }));

  const resultados = [
    ...itensResultados,
    ...nfeResultados,
    ...faturamentoResultados,
    ...terceirosResultados,
    ...clientesResultados,
    ...pedidosResultados,
  ];

  return {
    resultados,
    totalResultados: resultados.length,
    isLoading,
  };
}
