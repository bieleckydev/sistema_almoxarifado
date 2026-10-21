import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getMovimentacaoService,
  getAuditoriaService,
  readJson,
  requireIdentity,
  requirePermission,
  toErrorResponse,
  ApiError,
} from '../../api-helpers';

const ItemAjusteDiretoSchema = z.object({
  itemId: z.string().min(1),
  codigo: z.string().optional(),
  descricao: z.string().optional(),
  saldoSistema: z.number().min(0),
  quantidadeContada: z.number().min(0, 'Quantidade contada não pode ser negativa'),
  motivo: z.string().optional(),
});

const AjusteDiretoLoteSchema = z.object({
  itens: z.array(ItemAjusteDiretoSchema).min(1, 'Informe pelo menos um item para ajuste'),
  motivoGeral: z.string().optional(),
});

/**
 * POST /api/inventario/ajuste-direto
 * Aplica ajustes de contagem física direta em lote para todos os itens divergentes.
 * Requer permissão 'stock:operate'.
 */
export async function POST(request: Request) {
  try {
    const identity = await requireIdentity(request);
    requirePermission(identity, 'stock:operate');

    const body = await readJson(request);
    const { itens, motivoGeral } = AjusteDiretoLoteSchema.parse(body);

    const service = getMovimentacaoService();
    const divergentes = itens.filter(
      (item) => Math.abs(item.quantidadeContada - item.saldoSistema) > 0.0001
    );

    if (divergentes.length === 0) {
      return NextResponse.json({
        mensagem: 'Nenhum item apresentou divergência em relação ao sistema.',
        totalAjustados: 0,
        sobras: 0,
        faltas: 0,
      });
    }

    const resultados = [];
    let totalSobras = 0;
    let totalFaltas = 0;

    for (const item of divergentes) {
      const diff = item.quantidadeContada - item.saldoSistema;
      const ehSobra = diff > 0;
      const tipo = ehSobra ? 'AJUSTE_INVENTARIO_POSITIVO' : 'AJUSTE_INVENTARIO_NEGATIVO';
      const quantidadeAjuste = Math.abs(diff);

      if (ehSobra) totalSobras++;
      else totalFaltas++;

      const motivo =
        item.motivo?.trim() ||
        motivoGeral?.trim() ||
        `Inventário físico direto (${ehSobra ? 'Sobra' : 'Falta'} de ${quantidadeAjuste})`;

      const res = await service.executarAjusteInventario({
        itemId: item.itemId,
        tipo,
        quantidade: quantidadeAjuste,
        motivo,
        responsavelId: identity.user.id,
      });

      resultados.push({
        itemId: item.itemId,
        codigo: item.codigo,
        descricao: item.descricao,
        saldoAnterior: item.saldoSistema,
        saldoNovo: item.quantidadeContada,
        tipo,
        quantidadeAjuste,
        movimentacaoId: res.id,
      });
    }

    // Auditoria Operacional
    try {
      await getAuditoriaService().registrar({
        quando: new Date().toISOString(),
        usuarioId: identity.user.id,
        usuarioNome: identity.user.name || 'Almoxarife',
        papel: identity.user.role || 'operador',
        acao: 'AJUSTE_ESTOQUE',
        detalhe: `${divergentes.length} itens ajustados no inventário físico direto (${totalSobras} sobras, ${totalFaltas} faltas)`,
        entidade: 'Inventario',
        entidadeId: `inv-direto-${Date.now()}`,
      });
    } catch (auditErr) {
      console.warn('Falha ao auditar ajuste direto de inventário:', auditErr);
    }

    return NextResponse.json(
      {
        mensagem: `${divergentes.length} ajuste(s) de inventário aplicado(s) com sucesso.`,
        totalAjustados: divergentes.length,
        sobras: totalSobras,
        faltas: totalFaltas,
        detalhes: resultados,
      },
      { status: 200 }
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
