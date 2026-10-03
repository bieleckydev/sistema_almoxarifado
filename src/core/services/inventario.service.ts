import {
  AbrirSessaoInventarioSchema,
  AbrirSessaoInventarioInput,
  RegistrarContagemItemSchema,
  RegistrarContagemItemInput,
  FechamentoInventarioSchema,
  FechamentoInventarioInput,
  SessaoInventario,
  ItemContagem,
  calcularDivergenciaItem,
  calcularMetricasSessao,
} from '../domain/inventario.schema';
import { IEstoqueRepository } from '../storage/estoque.repository.interface';
import { IInventarioRepository } from '../storage/inventario.repository.interface';
import { MovimentacaoService } from './movimentacao.service';
import { StatusInventario } from '../domain/types';

export class SessaoInventarioNaoEncontradaError extends Error {
  constructor(public readonly sessaoId: string) {
    super(`Sessão de inventário "${sessaoId}" não foi encontrada.`);
    this.name = 'SessaoInventarioNaoEncontradaError';
  }
}

export class SessaoInventarioJaFechadaError extends Error {
  constructor(public readonly sessaoId: string, public readonly status: StatusInventario) {
    super(`A sessão de inventário "${sessaoId}" já se encontra ${status.toLowerCase()} e não aceita novas contagens.`);
    this.name = 'SessaoInventarioJaFechadaError';
  }
}

export interface RelatorioDivergencias {
  sessaoId: string;
  titulo: string;
  totalItens: number;
  totalConciliados: number;
  totalDivergentes: number;
  acuraciaPercentual: number;
  sobras: Array<{
    itemId: string;
    codigo: string;
    descricao: string;
    saldoSistema: number;
    quantidadeContada: number;
    sobra: number;
  }>;
  faltas: Array<{
    itemId: string;
    codigo: string;
    descricao: string;
    saldoSistema: number;
    quantidadeContada: number;
    falta: number;
  }>;
  conciliados: Array<{
    itemId: string;
    codigo: string;
    descricao: string;
    saldo: number;
  }>;
}

/**
 * Serviço de orquestração de sessões de inventário, apuração de divergências
 * e geração de movimentações compensatórias de ajuste de estoque.
 */
export class InventarioService {
  constructor(
    private readonly estoqueRepo: IEstoqueRepository,
    private readonly inventarioRepo: IInventarioRepository,
    private readonly movimentacaoService: MovimentacaoService
  ) {}

  /**
   * Abre uma nova sessão de inventário e inicializa as linhas de contagem física.
   */
  async abrirSessao(dados: AbrirSessaoInventarioInput): Promise<SessaoInventario> {
    const validado = AbrirSessaoInventarioSchema.parse(dados);

    // Carregar itens do catálogo com base no escopo selecionado
    const resultadoItens = await this.estoqueRepo.listarComFiltros({
      tipo: validado.tipoItemAlvo,
      apenasAtivos: true,
      pagina: 1,
      limite: 1000,
    });

    let itensParaContar = resultadoItens.itens;

    // Se informou IDs específicos (inventário rotativo/cíclico)
    if (validado.itensIds && validado.itensIds.length > 0) {
      const idsSet = new Set(validado.itensIds);
      itensParaContar = itensParaContar.filter((i) => idsSet.has(i.id));
    }

    const agora = validado.dataInicio || new Date().toISOString();
    const sessaoId = `inv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const contagensIniciais: ItemContagem[] = itensParaContar.map((item) => ({
      id: `cont-${item.id}-${Date.now()}`,
      itemId: item.id,
      codigoItem: item.codigo,
      descricaoItem: item.descricao,
      unidade: item.unidade,
      saldoSistema: item.estoqueAtual,
      quantidadeContada: item.estoqueAtual, // default no saldo atual até ser contada
      divergencia: 0,
      dataHoraContagem: agora,
      responsavelContagemId: validado.responsavelAberturaId,
      statusContagem: 'PENDENTE',
    }));

    const metricas = calcularMetricasSessao(
      contagensIniciais.map((c) => ({
        saldoSistema: c.saldoSistema,
        quantidadeContada: c.quantidadeContada,
      }))
    );

    const novaSessao: SessaoInventario = {
      id: sessaoId,
      titulo: validado.titulo,
      escopo: validado.escopo,
      setorAlvo: validado.setorAlvo,
      tipoItemAlvo: validado.tipoItemAlvo,
      status: 'ABERTO',
      dataInicio: agora,
      responsavelAberturaId: validado.responsavelAberturaId,
      contagens: contagensIniciais,
      totalItens: metricas.totalItens,
      totalConciliados: metricas.totalConciliados,
      totalDivergentes: metricas.totalDivergentes,
      acuraciaPercentual: metricas.acuraciaPercentual,
      observacoes: validado.observacoes,
      createdAt: agora,
      updatedAt: agora,
    };

    return this.inventarioRepo.salvarSessao(novaSessao);
  }

  /**
   * Registra ou atualiza a contagem física de um item dentro da sessão de inventário.
   */
  async registrarContagem(dados: RegistrarContagemItemInput): Promise<SessaoInventario> {
    const validado = RegistrarContagemItemSchema.parse(dados);

    const sessao = await this.inventarioRepo.buscarSessaoPorId(validado.sessaoId);
    if (!sessao) {
      throw new SessaoInventarioNaoEncontradaError(validado.sessaoId);
    }

    if (sessao.status === 'CONCLUIDO' || sessao.status === 'CANCELADO') {
      throw new SessaoInventarioJaFechadaError(sessao.id, sessao.status);
    }

    const agora = validado.dataHoraContagem || new Date().toISOString();
    let contagemIndex = sessao.contagens.findIndex((c) => c.itemId === validado.itemId);

    if (contagemIndex === -1) {
      // Item não estava previamente no lote: busca do catálogo e adiciona à sessão
      const itemCatalogo = await this.estoqueRepo.buscarItemPorId(validado.itemId);
      if (!itemCatalogo) {
        throw new Error(`Item "${validado.itemId}" não encontrado no catálogo de estoque.`);
      }

      const { divergencia, status } = calcularDivergenciaItem(
        itemCatalogo.estoqueAtual,
        validado.quantidadeContada
      );

      const novaContagem: ItemContagem = {
        id: `cont-${itemCatalogo.id}-${Date.now()}`,
        itemId: itemCatalogo.id,
        codigoItem: itemCatalogo.codigo,
        descricaoItem: itemCatalogo.descricao,
        unidade: itemCatalogo.unidade,
        saldoSistema: itemCatalogo.estoqueAtual,
        quantidadeContada: validado.quantidadeContada,
        divergencia,
        dataHoraContagem: agora,
        responsavelContagemId: validado.responsavelContagemId,
        responsavelContagemNome: validado.responsavelContagemNome,
        statusContagem: status,
        observacao: validado.observacao,
      };

      sessao.contagens.push(novaContagem);
    } else {
      const contagemExistente = sessao.contagens[contagemIndex];
      const { divergencia, status } = calcularDivergenciaItem(
        contagemExistente.saldoSistema,
        validado.quantidadeContada
      );

      sessao.contagens[contagemIndex] = {
        ...contagemExistente,
        quantidadeContada: validado.quantidadeContada,
        divergencia,
        dataHoraContagem: agora,
        responsavelContagemId: validado.responsavelContagemId,
        responsavelContagemNome:
          validado.responsavelContagemNome || contagemExistente.responsavelContagemNome,
        statusContagem: status,
        observacao: validado.observacao || contagemExistente.observacao,
      };
    }

    // Recalcular métricas consolidadas da sessão
    const metricas = calcularMetricasSessao(
      sessao.contagens.map((c) => ({
        saldoSistema: c.saldoSistema,
        quantidadeContada: c.quantidadeContada,
      }))
    );

    sessao.status = 'EM_ANDAMENTO';
    sessao.totalItens = metricas.totalItens;
    sessao.totalConciliados = metricas.totalConciliados;
    sessao.totalDivergentes = metricas.totalDivergentes;
    sessao.acuraciaPercentual = metricas.acuraciaPercentual;
    sessao.updatedAt = agora;

    return this.inventarioRepo.salvarSessao(sessao);
  }

  /**
   * Emite relatório analítico com as sobras, faltas e acurácia da sessão de inventário.
   */
  async apurarDivergencias(sessaoId: string): Promise<RelatorioDivergencias> {
    const sessao = await this.inventarioRepo.buscarSessaoPorId(sessaoId);
    if (!sessao) {
      throw new SessaoInventarioNaoEncontradaError(sessaoId);
    }

    const sobras: RelatorioDivergencias['sobras'] = [];
    const faltas: RelatorioDivergencias['faltas'] = [];
    const conciliados: RelatorioDivergencias['conciliados'] = [];

    for (const c of sessao.contagens) {
      if (c.divergencia > 0) {
        sobras.push({
          itemId: c.itemId,
          codigo: c.codigoItem,
          descricao: c.descricaoItem,
          saldoSistema: c.saldoSistema,
          quantidadeContada: c.quantidadeContada,
          sobra: c.divergencia,
        });
      } else if (c.divergencia < 0) {
        faltas.push({
          itemId: c.itemId,
          codigo: c.codigoItem,
          descricao: c.descricaoItem,
          saldoSistema: c.saldoSistema,
          quantidadeContada: c.quantidadeContada,
          falta: Math.abs(c.divergencia),
        });
      } else {
        conciliados.push({
          itemId: c.itemId,
          codigo: c.codigoItem,
          descricao: c.descricaoItem,
          saldo: c.saldoSistema,
        });
      }
    }

    return {
      sessaoId: sessao.id,
      titulo: sessao.titulo,
      totalItens: sessao.totalItens,
      totalConciliados: sessao.totalConciliados,
      totalDivergentes: sessao.totalDivergentes,
      acuraciaPercentual: sessao.acuraciaPercentual,
      sobras,
      faltas,
      conciliados,
    };
  }

  /**
   * Encerra a sessão de inventário e gera movimentações compensatórias automáticas de ajuste.
   */
  async encerrarSessao(dados: FechamentoInventarioInput): Promise<SessaoInventario> {
    const validado = FechamentoInventarioSchema.parse(dados);

    const sessao = await this.inventarioRepo.buscarSessaoPorId(validado.sessaoId);
    if (!sessao) {
      throw new SessaoInventarioNaoEncontradaError(validado.sessaoId);
    }

    if (sessao.status === 'CONCLUIDO') {
      return sessao;
    }

    const agora = validado.dataFechamento || new Date().toISOString();

    // Se habilitado, gerar movimentações compensatórias para todos os itens divergentes
    if (validado.gerarAjustesAutomaticos !== false) {
      for (let i = 0; i < sessao.contagens.length; i++) {
        const contagem = sessao.contagens[i];
        if (contagem.divergencia !== 0 && contagem.statusContagem !== 'AJUSTADO') {
          const isSobra = contagem.divergencia > 0;
          const tipoAjuste = isSobra
            ? 'AJUSTE_INVENTARIO_POSITIVO'
            : 'AJUSTE_INVENTARIO_NEGATIVO';
          const quantidadeAjuste = Math.abs(contagem.divergencia);

          const motivo = isSobra
            ? `Sobra apurada no inventário "${sessao.titulo}" (${contagem.divergencia} ${contagem.unidade})`
            : `Falta apurada no inventário "${sessao.titulo}" (${contagem.divergencia} ${contagem.unidade})`;

          const movimentacaoAjuste = await this.movimentacaoService.executarAjusteInventario({
            itemId: contagem.itemId,
            tipo: tipoAjuste,
            quantidade: quantidadeAjuste,
            motivo,
            inventarioId: sessao.id,
            responsavelId: validado.responsavelFechamentoId,
            dataMovimentacao: agora,
          });

          sessao.contagens[i] = {
            ...contagem,
            statusContagem: 'AJUSTADO',
            ajusteMovimentacaoId: movimentacaoAjuste.id,
          };
        }
      }
    }

    sessao.status = 'CONCLUIDO';
    sessao.dataFechamento = agora;
    sessao.responsavelFechamentoId = validado.responsavelFechamentoId;
    if (validado.observacoes) {
      sessao.observacoes = sessao.observacoes
        ? `${sessao.observacoes} | ${validado.observacoes}`
        : validado.observacoes;
    }
    sessao.updatedAt = agora;

    return this.inventarioRepo.salvarSessao(sessao);
  }

  async buscarSessaoPorId(sessaoId: string): Promise<SessaoInventario | null> {
    return this.inventarioRepo.buscarSessaoPorId(sessaoId);
  }

  async listarSessoes(status?: StatusInventario): Promise<SessaoInventario[]> {
    return this.inventarioRepo.listarSessoes(status);
  }
}
