'use client';

import { useQuery } from '@tanstack/react-query';
import { db } from '@/core/services/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { isPedidoAtrasado, type StatusPedido } from '@/core/domain/pedido.schema';
import { type AbaEstoque } from '../data/mock-almoxarifado';

export interface ResumoEstoqueAba {
  totalItens: number;
  criticos: number;
  abaixoMinimo: number;
}

export interface ItemAtencaoResumo {
  id: string;
  nome: string;
  codigo: string;
  aba: AbaEstoque;
  estoqueAtual: number;
  estoqueSeguranca: number;
  unidade: string;
  status: 'crit' | 'low';
}

export interface DashboardResumoData {
  estoque: Record<AbaEstoque, ResumoEstoqueAba>;
  vendas: {
    totalAEntregar: number;
    atrasados: number;
  };
  clientes: {
    totalCadastros: number;
  };
  movimentacoesHoje: {
    total: number;
  };
  itensAtencao: ItemAtencaoResumo[];
}

export function useDashboardResumo() {
  return useQuery<DashboardResumoData>({
    queryKey: ['dashboard-resumo-geral'],
    queryFn: async () => {
      // 1. Consulta Itens no Firestore
      const estoqueResumo: Record<AbaEstoque, ResumoEstoqueAba> = {
        mp: { totalItens: 0, criticos: 0, abaixoMinimo: 0 },
        imp: { totalItens: 0, criticos: 0, abaixoMinimo: 0 },
        motos: { totalItens: 0, criticos: 0, abaixoMinimo: 0 },
      };

      const itensParaAtencao: Array<ItemAtencaoResumo & { proporcao: number }> = [];

      try {
        const itemsSnap = await getDocs(collection(db, 'items'));
        itemsSnap.forEach((doc) => {
          const data = doc.data();
          const tipo = data.tipo;
          const atual = Number(data.estoqueAtual) || 0;
          const min = Number(data.estoqueSeguranca) || 0;

          let aba: AbaEstoque = 'mp';
          if (tipo === 'IMPRODUTIVO_CONSUMIVEL') aba = 'imp';
          else if (tipo === 'ACABADO') aba = 'motos';

          estoqueResumo[aba].totalItens += 1;
          if (atual <= min * 0.5) {
            estoqueResumo[aba].criticos += 1;
          } else if (atual <= min) {
            estoqueResumo[aba].abaixoMinimo += 1;
          }

          // Se estiver crítico ou abaixo do mínimo, insere na lista de atenção
          if (atual <= min && min > 0) {
            const proporcao = atual / min;
            itensParaAtencao.push({
              id: doc.id,
              nome: String(data.descricao || data.nome || 'Material'),
              codigo: String(data.codigo || ''),
              aba,
              estoqueAtual: atual,
              estoqueSeguranca: min,
              unidade: String(data.unidade || 'un'),
              status: atual <= min * 0.5 ? 'crit' : 'low',
              proporcao,
            });
          }
        });
      } catch (err) {
        console.warn('Erro ao carregar resumo de estoque:', err);
      }

      // Ordena por menor proporção (mais urgente) e limita aos 6 primeiros (idêntico ao protótipo)
      const itensAtencaoFinal: ItemAtencaoResumo[] = itensParaAtencao
        .sort((a, b) => a.proporcao - b.proporcao)
        .slice(0, 6)
        .map(({ proporcao: _, ...resto }) => resto);

      // 2. Consulta Pedidos no Firestore
      let totalAEntregar = 0;
      let pedidosAtrasados = 0;

      try {
        const ordersSnap = await getDocs(collection(db, 'orders'));
        ordersSnap.forEach((doc) => {
          const data = doc.data();
          const status = (data.status as StatusPedido) || 'PENDENTE';
          const prazoEntrega = String(data.prazoEntrega || '');

          if (status !== 'ENTREGUE' && status !== 'CANCELADO') {
            totalAEntregar += 1;
            if (isPedidoAtrasado({ status, prazoEntrega })) {
              pedidosAtrasados += 1;
            }
          }
        });
      } catch (err) {
        console.warn('Erro ao carregar resumo de pedidos:', err);
      }

      // 3. Consulta Clientes no Firestore
      let totalCadastros = 0;

      try {
        const clientsSnap = await getDocs(collection(db, 'clients'));
        totalCadastros = clientsSnap.size;
      } catch (err) {
        console.warn('Erro ao carregar resumo de clientes:', err);
      }

      // 4. Consulta Movimentações no Firestore (Movimentações de hoje)
      let totalMovsHoje = 0;
      try {
        const d = new Date();
        const offset = d.getTimezoneOffset() * 60000;
        const hojeISO = new Date(d.getTime() - offset).toISOString().slice(0, 10);
        const inicioHoje = `${hojeISO}T00:00:00.000Z`;

        const qMovs = query(
          collection(db, 'movements'),
          where('dataMovimentacao', '>=', inicioHoje)
        );
        const movsSnap = await getDocs(qMovs);
        totalMovsHoje = movsSnap.size;
      } catch (err) {
        console.warn('Erro ao carregar movimentações de hoje:', err);
      }

      return {
        estoque: estoqueResumo,
        vendas: {
          totalAEntregar,
          atrasados: pedidosAtrasados,
        },
        clientes: {
          totalCadastros,
        },
        movimentacoesHoje: {
          total: totalMovsHoje,
        },
        itensAtencao: itensAtencaoFinal,
      };
    },
    staleTime: 60 * 1000, // 1 minuto
  });
}
