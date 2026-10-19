import { NextResponse } from 'next/server';
import {
  ConsumirMaterialTerceiroSchema,
  DevolverMaterialTerceiroSchema,
  validarSaldoSuficienteTerceiro,
  type MaterialTerceiro,
  type MovimentacaoTerceiro,
} from '@/core/domain/material-terceiro.schema';
import type { NotaFiscalEmitida } from '@/core/domain/nota-fiscal-emitida.schema';
import {
  ApiError,
  readJson,
  requireIdentity,
  requirePermission,
  toErrorResponse,
} from '../../api-helpers';
import { db } from '@/core/services/firebase';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import {
  MATERIAIS_TERCEIROS_INICIAIS,
  MOVIMENTACOES_TERCEIROS_INICIAIS,
  NOTAS_INICIAIS,
} from '@/web/data/mock-almoxarifado';

/**
 * POST /api/terceiros/movimentacoes
 * Registra movimentação de CONSUMO NA PRODUÇÃO ou DEVOLUÇÃO AO CLIENTE em material de terceiros.
 * No caso de devolução, gera automaticamente a nota fiscal de Retorno de Industrialização caso aplicável.
 */
export async function POST(request: Request) {
  try {
    const identity = await requireIdentity(request);
    requirePermission(identity, 'stock:operate');

    const body = await readJson(request);
    if (!body || typeof body !== 'object') {
      throw new ApiError(400, 'Corpo da requisição inválido.');
    }

    const tipo = (body as any).tipo;
    if (tipo !== 'CONSUMO' && tipo !== 'CONSUMO_PRODUCAO' && tipo !== 'DEVOLUCAO' && tipo !== 'DEVOLUCAO_RETORNO') {
      throw new ApiError(
        400,
        "Tipo de movimentação inválido. Deve ser 'CONSUMO_PRODUCAO' ou 'DEVOLUCAO_RETORNO'."
      );
    }

    const isConsumo = tipo === 'CONSUMO' || tipo === 'CONSUMO_PRODUCAO';
    const materialId = String((body as any).materialTerceiroId || '');
    if (!materialId) {
      throw new ApiError(400, 'ID do material de terceiro é obrigatório.');
    }

    // 1. Busca material no Firestore ou em memória
    let material: MaterialTerceiro | null = null;
    const materialRef = doc(db, 'third_party_materials', materialId);

    try {
      const snap = await getDoc(materialRef);
      if (snap.exists()) {
        material = { id: snap.id, ...(snap.data() as any) };
      }
    } catch {
      // Fallback para memória
    }

    if (!material) {
      material = MATERIAIS_TERCEIROS_INICIAIS.find((m) => m.id === materialId) || null;
    }

    if (!material) {
      throw new ApiError(404, `Material de terceiro '${materialId}' não encontrado.`);
    }

    const now = new Date().toISOString();
    let novaMovimentacao: MovimentacaoTerceiro;
    let notaFiscalRetorno: NotaFiscalEmitida | null = null;
    let novoSaldo = material.saldoAtual;

    if (isConsumo) {
      // Fluxo 1: CONSUMO NA PRODUÇÃO
      const input = ConsumirMaterialTerceiroSchema.parse(body);

      if (!validarSaldoSuficienteTerceiro(material.saldoAtual, input.quantidade)) {
        throw new ApiError(
          422,
          `Saldo insuficiente de ${material.descricao}. Saldo atual sob custódia: ${material.saldoAtual} ${material.unidade}, quantidade requisitada para consumo: ${input.quantidade} ${material.unidade}.`
        );
      }

      novoSaldo = material.saldoAtual - input.quantidade;
      const movId = `mov-cons-${Date.now()}`;

      novaMovimentacao = {
        id: movId,
        materialTerceiroId: material.id,
        tipo: 'CONSUMO_PRODUCAO',
        quantidade: input.quantidade,
        saldoAnterior: material.saldoAtual,
        saldoResultante: novoSaldo,
        documento: input.ordemProducaoOuDocumento,
        dataMovimentacao: input.dataMovimentacao,
        responsavel: input.responsavel || identity.user.name || 'Produção',
        observacao: input.observacao,
        createdAt: now,
      };
    } else {
      // Fluxo 2: DEVOLUÇÃO AO CLIENTE (RETORNO DE INDUSTRIALIZAÇÃO)
      const input = DevolverMaterialTerceiroSchema.parse(body);

      if (!validarSaldoSuficienteTerceiro(material.saldoAtual, input.quantidade)) {
        throw new ApiError(
          422,
          `Saldo insuficiente para devolução de ${material.descricao}. Saldo atual: ${material.saldoAtual} ${material.unidade}, quantidade a devolver: ${input.quantidade} ${material.unidade}.`
        );
      }

      novoSaldo = material.saldoAtual - input.quantidade;
      const movId = `mov-dev-${Date.now()}`;
      const valorServico = input.valorServico || 0;

      novaMovimentacao = {
        id: movId,
        materialTerceiroId: material.id,
        tipo: 'DEVOLUCAO_RETORNO',
        quantidade: input.quantidade,
        saldoAnterior: material.saldoAtual,
        saldoResultante: novoSaldo,
        documento: `NF-e ${input.numeroNFRetorno}`,
        dataMovimentacao: input.dataMovimentacao,
        responsavel: input.responsavel || identity.user.name || 'Expedição',
        valorServico,
        observacao: input.observacao,
        createdAt: now,
      };

      // Automação: Gera automaticamente a Nota Fiscal de Retorno de Industrialização
      const idNF = `nf-retorno-${input.numeroNFRetorno}`;
      notaFiscalRetorno = {
        id: idNF,
        numeroNF: input.numeroNFRetorno,
        serie: '1',
        dataEmissao: input.dataMovimentacao,
        tipo: 'RETORNO_INDUSTRIALIZACAO',
        clienteId: material.clienteId,
        valorTotal: valorServico,
        referencia: `Devolução ${input.quantidade} ${material.unidade} de ${material.descricao}`,
        materialTerceiroId: material.id,
        observacoes: input.observacao || `Retorno de industrialização referente a NF de remessa ${material.numeroNFRemessa || 'do cliente'}.`,
        createdAt: now,
        updatedAt: now,
      };
    }

    // Persistência no Firestore
    try {
      await updateDoc(materialRef, {
        saldoAtual: novoSaldo,
        updatedAt: now,
      });
      await setDoc(doc(db, 'third_party_movements', novaMovimentacao.id), novaMovimentacao);

      if (notaFiscalRetorno) {
        await setDoc(doc(db, 'invoices', notaFiscalRetorno.id), notaFiscalRetorno);
      }
    } catch {
      // Ignora erro se Firestore offline
    }

    // Sincroniza em memória
    material.saldoAtual = novoSaldo;
    material.updatedAt = now;

    const memMat = MATERIAIS_TERCEIROS_INICIAIS.find((m) => m.id === material!.id);
    if (memMat) {
      memMat.saldoAtual = novoSaldo;
      memMat.updatedAt = now;
    }

    MOVIMENTACOES_TERCEIROS_INICIAIS.unshift(novaMovimentacao);

    if (notaFiscalRetorno && !NOTAS_INICIAIS.some((n) => n.id === notaFiscalRetorno!.id)) {
      NOTAS_INICIAIS.unshift(notaFiscalRetorno as any);
    }

    return NextResponse.json(
      {
        mensagem: isConsumo
          ? `Consumo de ${novaMovimentacao.quantidade} ${material.unidade} registrado na OP '${novaMovimentacao.documento}'.`
          : `Devolução de ${novaMovimentacao.quantidade} ${material.unidade} registrada. NF-e de Retorno emitida sob o nº ${novaMovimentacao.documento}.`,
        material: {
          ...material,
          saldoAtual: novoSaldo,
        },
        movimentacao: novaMovimentacao,
        notaFiscalRetorno,
      },
      { status: 201 }
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
