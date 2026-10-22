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
  getAuditoriaService,
  getServerDb,
  semUndefined,
  toErrorResponse,
} from '../../api-helpers';

/** Subtração com arredondamento a 4 casas, igual ao cálculo de saldo do estoque. */
function subtrair(a: number, b: number): number {
  return Math.round((a - b + Number.EPSILON) * 10000) / 10000;
}

/**
 * POST /api/terceiros/movimentacoes
 * Registra movimentação de CONSUMO NA PRODUÇÃO, DEVOLUÇÃO AO CLIENTE ou SUCATA/PERDA em material de terceiros.
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

    const rawTipo = String((body as any).tipo || '').trim().toUpperCase();
    const isConsumo = rawTipo === 'CONSUMO' || rawTipo === 'CONSUMO_PRODUCAO';
    const isDevolucao = rawTipo === 'DEVOLUCAO' || rawTipo === 'DEVOLUCAO_RETORNO';
    const isSucata = rawTipo === 'SUCATA' || rawTipo === 'SUCATA_PERDA' || rawTipo === 'PERDA' || rawTipo === 'REFUGO';

    if (!isConsumo && !isDevolucao && !isSucata) {
      throw new ApiError(
        400,
        "Tipo de movimentação inválido. Deve ser 'CONSUMO_PRODUCAO', 'DEVOLUCAO_RETORNO' ou 'SUCATA_PERDA'."
      );
    }
    const materialId = String((body as any).materialTerceiroId || '');
    if (!materialId) {
      throw new ApiError(400, 'ID do material de terceiro é obrigatório.');
    }

    // Valida o corpo antes de abrir a transação.
    const consumo = isConsumo ? ConsumirMaterialTerceiroSchema.parse(body) : null;
    const devolucao = isDevolucao ? DevolverMaterialTerceiroSchema.parse(body) : null;
    const qtdSucata = isSucata ? Number((body as any).quantidade) : 0;
    if (isSucata && (!qtdSucata || qtdSucata <= 0)) {
      throw new ApiError(400, 'A quantidade de sucata/perda deve ser maior que zero.');
    }

    const db = getServerDb();
    const materialRef = db.collection('third_party_materials').doc(materialId);
    const now = new Date().toISOString();
    const sufixo = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    // Saldo relido e gravado na mesma transação, junto com a movimentação e a NF de retorno.
    const { material, novaMovimentacao, notaFiscalRetorno, novoSaldo } = await db.runTransaction(async (tx) => {
      const snap = await tx.get(materialRef);
      if (!snap.exists) {
        throw new ApiError(404, `Material de terceiro '${materialId}' não encontrado.`);
      }
      const mat = { ...(snap.data() as MaterialTerceiro), id: snap.id };
      mat.saldoAtual = Number(mat.saldoAtual) || 0;

      let mov: MovimentacaoTerceiro;
      let notaRetorno: NotaFiscalEmitida | null = null;
      let saldo: number;

      if (consumo) {
        if (!validarSaldoSuficienteTerceiro(mat.saldoAtual, consumo.quantidade)) {
          throw new ApiError(
            422,
            `Saldo insuficiente de ${mat.descricao}. Saldo atual sob custódia: ${mat.saldoAtual} ${mat.unidade}, quantidade requisitada para consumo: ${consumo.quantidade} ${mat.unidade}.`
          );
        }
        saldo = subtrair(mat.saldoAtual, consumo.quantidade);
        mov = {
          id: `mov-cons-${sufixo}`,
          materialTerceiroId: mat.id,
          tipo: 'CONSUMO_PRODUCAO',
          quantidade: consumo.quantidade,
          saldoAnterior: mat.saldoAtual,
          saldoResultante: saldo,
          documento: consumo.ordemProducaoOuDocumento,
          dataMovimentacao: consumo.dataMovimentacao,
          responsavel: consumo.responsavel || identity.user.name || 'Produção',
          observacao: consumo.observacao,
          createdAt: now,
        };
      } else if (isSucata) {
        if (!validarSaldoSuficienteTerceiro(mat.saldoAtual, qtdSucata)) {
          throw new ApiError(
            422,
            `Saldo insuficiente para baixa de sucata. Saldo atual: ${mat.saldoAtual} ${mat.unidade}, quantidade informada: ${qtdSucata} ${mat.unidade}.`
          );
        }
        saldo = subtrair(mat.saldoAtual, qtdSucata);
        const motivo = String((body as any).motivo || (body as any).observacao || 'Refugo/Sucata de produção').trim();
        mov = {
          id: `mov-suc-${sufixo}`,
          materialTerceiroId: mat.id,
          tipo: 'SUCATA_PERDA',
          quantidade: qtdSucata,
          saldoAnterior: mat.saldoAtual,
          saldoResultante: saldo,
          documento: motivo.slice(0, 30),
          dataMovimentacao: String((body as any).dataMovimentacao || now.slice(0, 10)),
          responsavel: String((body as any).responsavel || identity.user.name || 'Produção'),
          observacao: motivo,
          createdAt: now,
        };
      } else {
        const input = devolucao!;
        if (!validarSaldoSuficienteTerceiro(mat.saldoAtual, input.quantidade)) {
          throw new ApiError(
            422,
            `Saldo insuficiente para devolução de ${mat.descricao}. Saldo atual: ${mat.saldoAtual} ${mat.unidade}, quantidade a devolver: ${input.quantidade} ${mat.unidade}.`
          );
        }

        // Automação: gera a Nota Fiscal de Retorno de Industrialização (número não pode repetir).
        const notaRef = db.collection('invoices').doc(`nf-retorno-${input.numeroNFRetorno}`);
        const notaSnap = await tx.get(notaRef);
        if (notaSnap.exists) {
          throw new ApiError(409, `A NF-e de retorno ${input.numeroNFRetorno} já foi registrada.`);
        }

        saldo = subtrair(mat.saldoAtual, input.quantidade);
        const valorServico = input.valorServico || 0;
        mov = {
          id: `mov-dev-${sufixo}`,
          materialTerceiroId: mat.id,
          tipo: 'DEVOLUCAO_RETORNO',
          quantidade: input.quantidade,
          saldoAnterior: mat.saldoAtual,
          saldoResultante: saldo,
          documento: `NF-e ${input.numeroNFRetorno}`,
          dataMovimentacao: input.dataMovimentacao,
          responsavel: input.responsavel || identity.user.name || 'Expedição',
          valorServico,
          observacao: input.observacao,
          createdAt: now,
        };
        notaRetorno = {
          id: notaRef.id,
          numeroNF: input.numeroNFRetorno,
          serie: '1',
          dataEmissao: input.dataMovimentacao,
          tipo: 'RETORNO_INDUSTRIALIZACAO',
          clienteId: mat.clienteId,
          valorTotal: valorServico,
          referencia: `Devolução ${input.quantidade} ${mat.unidade} de ${mat.descricao}`,
          materialTerceiroId: mat.id,
          observacoes: input.observacao || `Retorno de industrialização referente a NF de remessa ${mat.numeroNFRemessa || 'do cliente'}.`,
          createdAt: now,
          updatedAt: now,
        };
        tx.create(notaRef, semUndefined({ ...notaRetorno, status: 'EMITIDA' }));
      }

      tx.update(materialRef, { saldoAtual: saldo, updatedAt: now });
      tx.create(db.collection('third_party_movements').doc(mov.id), semUndefined(mov));

      return { material: { ...mat, saldoAtual: saldo, updatedAt: now }, novaMovimentacao: mov, notaFiscalRetorno: notaRetorno, novoSaldo: saldo };
    });

    // Auditoria Operacional (3.0)
    try {
      await getAuditoriaService().registrar({
        quando: now,
        usuarioId: identity.user.id,
        usuarioNome: identity.user.name || 'Almoxarife',
        papel: identity.user.role || 'operador',
        acao: isSucata ? 'SUCATA_TERCEIRO' : isConsumo ? 'CONSUMO_TERCEIRO' : 'DEVOLUCAO_TERCEIRO',
        detalhe: `${isSucata ? 'Sucata/Refugo' : isConsumo ? 'Consumo' : 'Devolução'} de ${novaMovimentacao.quantidade} ${material.unidade} de ${material.descricao}. Saldo restante: ${novoSaldo}.`,
        entidade: 'MaterialTerceiro',
        entidadeId: material.id,
      });
    } catch (auditErr) {
      console.warn('Falha ao registrar auditoria em terceiros:', auditErr);
    }

    return NextResponse.json(
      {
        mensagem: isSucata
          ? `Sucata/perda de ${novaMovimentacao.quantidade} ${material.unidade} registrada com sucesso.`
          : isConsumo
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
