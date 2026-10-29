import {
  RegistrarEntradaSchema,
  RegistrarEntradaInput,
  RegistrarBaixaInternaSchema,
  RegistrarBaixaInternaInput,
  RegistrarSaidaExpedicaoSchema,
  RegistrarSaidaExpedicaoInput,
  RegistrarAjusteInventarioSchema,
  RegistrarAjusteInventarioInput,
  Movimentacao,
} from '../domain/movimentacao.schema';
import { TipoMovimentacao } from '../domain/types';
import { Item } from '../domain/item.schema';
import { Colaborador } from '../domain/colaborador.schema';
import {
  calcularNovoSaldo,
  validarDisponibilidadeEstoque,
  SaldoInsuficienteError,
} from './estoque-calculator';
import { IEstoqueRepository } from '../storage/estoque.repository.interface';
import { calcularCustoMedioPonderado } from './custo-medio';
import { NotaFiscal } from '../domain/nfe.schema';
import {
  NFeEntradaService,
  EfetivarEntradaNFeOptions,
  ResultadoEfetivacaoNFe,
} from './nfe-entrada.service';

export class ItemNaoEncontradoError extends Error {
  constructor(public readonly itemId: string) {
    super(`Item com identificador "${itemId}" não foi encontrado no catálogo.`);
    this.name = 'ItemNaoEncontradoError';
  }
}

export class ItemInativoError extends Error {
  constructor(public readonly itemId: string, public readonly codigo: string) {
    super(`Item "${codigo}" (${itemId}) está inativo para movimentações de estoque.`);
    this.name = 'ItemInativoError';
  }
}

export class ColaboradorNaoEncontradoError extends Error {
  constructor(public readonly colaboradorId: string) {
    super(`Colaborador com ID "${colaboradorId}" não foi encontrado no sistema.`);
    this.name = 'ColaboradorNaoEncontradoError';
  }
}

export class ColaboradorInativoError extends Error {
  constructor(
    public readonly colaboradorId: string,
    public readonly matricula: string,
    public readonly nome: string
  ) {
    super(
      `Colaborador "${nome}" (matrícula: ${matricula}) está com cadastro inativo e não pode retirar materiais.`
    );
    this.name = 'ColaboradorInativoError';
  }
}

export class NotaFiscalDuplicadaError extends Error {
  constructor(
    public readonly numeroNF: string,
    public readonly itemId: string,
    public readonly dataMovimentacaoExistente?: string
  ) {
    const dataMsg = dataMovimentacaoExistente
      ? ` em ${dataMovimentacaoExistente.slice(0, 10)}`
      : '';
    super(
      `A Nota Fiscal nº ${numeroNF} já foi lançada para este item${dataMsg}. Verifique antes de continuar.`
    );
    this.name = 'NotaFiscalDuplicadaError';
  }
}

export class MovimentacaoJaEstornadaError extends Error {
  constructor(public readonly movimentacaoId: string) {
    super('Esta movimentação já foi estornada anteriormente.');
    this.name = 'MovimentacaoJaEstornadaError';
  }
}

/**
 * Serviço responsável por coordenar e orquestrar todas as operações de movimentação física de estoque,
 * assegurando integridade referencial, validação de regras de negócio e trilha de auditoria.
 */
export class MovimentacaoService {
  constructor(private readonly repository: IEstoqueRepository) {}

  /**
   * Valida e recupera um item ativo do catálogo.
   */
  private async validarItemAtivo(itemId: string): Promise<Item> {
    const item = await this.repository.buscarItemPorId(itemId);
    if (!item) {
      throw new ItemNaoEncontradoError(itemId);
    }
    if (!item.ativo) {
      throw new ItemInativoError(item.id, item.codigo);
    }
    return item;
  }

  /**
   * Valida e recupera um colaborador ativo para autorização de retirada.
   */
  private async validarColaboradorAtivo(colaboradorId: string): Promise<Colaborador> {
    const colaborador = await this.repository.buscarColaboradorPorId(colaboradorId);
    if (!colaborador) {
      throw new ColaboradorNaoEncontradoError(colaboradorId);
    }
    if (!colaborador.ativo) {
      throw new ColaboradorInativoError(
        colaborador.id,
        colaborador.matricula,
        colaborador.nome
      );
    }
    return colaborador;
  }

  /**
   * Gera um ID único de movimentação para persistência agnóstica.
   */
  private gerarIdMovimentacao(): string {
    return `mov-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Executa a entrada de mercadoria por compra (NFe) ou produção interna.
   */
  async executarEntrada(dados: RegistrarEntradaInput): Promise<Movimentacao> {
    const validado = RegistrarEntradaSchema.parse(dados);
    const item = await this.validarItemAtivo(validado.itemId);

    // Validação Anti-duplicidade de NF-e para o mesmo item
    if (validado.numeroNF && validado.numeroNF.trim().length > 0) {
      const nfLimpa = validado.numeroNF.trim().toLowerCase();
      const extrato = await this.repository.consultarExtratoItem(validado.itemId);
      const entradaExistente = extrato.find(
        (m) =>
          m.tipo === 'ENTRADA_COMPRA' &&
          m.numeroNF &&
          m.numeroNF.trim().toLowerCase() === nfLimpa
      );

      if (entradaExistente) {
        throw new NotaFiscalDuplicadaError(
          validado.numeroNF.trim(),
          validado.itemId,
          entradaExistente.dataMovimentacao
        );
      }
    }

    const saldoAnterior = item.estoqueAtual;
    const saldoResultante = calcularNovoSaldo(
      saldoAnterior,
      validado.tipo,
      validado.quantidade
    );

    const agora = validado.dataMovimentacao || new Date().toISOString();

    const movimentacao: Movimentacao = {
      id: this.gerarIdMovimentacao(),
      itemId: item.id,
      tipo: validado.tipo,
      quantidade: validado.quantidade,
      saldoAnterior,
      saldoResultante,
      dataMovimentacao: agora,
      numeroNF: validado.numeroNF,
      documentoFiscalId: validado.documentoFiscalId,
      fornecedor: validado.fornecedor,
      numeroPedidoRhowert: validado.numeroPedidoRhowert,
      observacao: validado.observacoes,
      createdAt: agora,
    };

    if (validado.valorUnitario !== undefined && validado.valorUnitario > 0) {
      const novoCusto = calcularCustoMedioPonderado(
        saldoAnterior,
        item.custoUnitario || 0,
        validado.quantidade,
        validado.valorUnitario
      );
      await this.repository.atualizarSaldoECustoItem(item.id, saldoResultante, novoCusto);
      return this.repository.registrarMovimentacao(movimentacao);
    }

    if (typeof this.repository.registrarMovimentacaoComSaldo === 'function') {
      return this.repository.registrarMovimentacaoComSaldo(item.id, saldoResultante, movimentacao);
    }

    await this.repository.atualizarSaldoItem(item.id, saldoResultante);
    return this.repository.registrarMovimentacao(movimentacao);
  }

  /**
   * Executa a baixa interna de consumo por colaborador fabril (ex: discos, solda, brocas).
   */
  async executarBaixaInterna(dados: RegistrarBaixaInternaInput): Promise<Movimentacao> {
    const validado = RegistrarBaixaInternaSchema.parse(dados);
    const colaborador = await this.validarColaboradorAtivo(validado.colaboradorId);
    const item = await this.validarItemAtivo(validado.itemId);

    const saldoAnterior = item.estoqueAtual;
    const saldoResultante = calcularNovoSaldo(
      saldoAnterior,
      validado.tipo,
      validado.quantidade,
      { itemId: item.codigo }
    );

    const agora = validado.dataMovimentacao || new Date().toISOString();
    const setorOperacao = validado.setor || colaborador.setor;

    const movimentacao: Movimentacao = {
      id: this.gerarIdMovimentacao(),
      itemId: item.id,
      tipo: validado.tipo,
      quantidade: validado.quantidade,
      saldoAnterior,
      saldoResultante,
      dataMovimentacao: agora,
      colaboradorId: colaborador.id,
      colaboradorMatricula: colaborador.matricula,
      colaboradorNome: colaborador.nome,
      setor: setorOperacao,
      observacao: validado.observacao,
      createdAt: agora,
    };

    if (typeof this.repository.registrarMovimentacaoComSaldo === 'function') {
      return this.repository.registrarMovimentacaoComSaldo(item.id, saldoResultante, movimentacao);
    }

    await this.repository.atualizarSaldoItem(item.id, saldoResultante);
    return this.repository.registrarMovimentacao(movimentacao);
  }

  /**
   * Executa a saída de produto acabado para expedição a cliente ou filial.
   */
  async executarSaidaExpedicao(dados: RegistrarSaidaExpedicaoInput): Promise<Movimentacao> {
    const validado = RegistrarSaidaExpedicaoSchema.parse(dados);
    const item = await this.validarItemAtivo(validado.itemId);

    const saldoAnterior = item.estoqueAtual;
    const saldoResultante = calcularNovoSaldo(
      saldoAnterior,
      validado.tipo,
      validado.quantidade,
      { itemId: item.codigo }
    );

    const agora = validado.dataMovimentacao || new Date().toISOString();

    const movimentacao: Movimentacao = {
      id: this.gerarIdMovimentacao(),
      itemId: item.id,
      tipo: validado.tipo,
      quantidade: validado.quantidade,
      saldoAnterior,
      saldoResultante,
      dataMovimentacao: agora,
      destinatario: validado.clienteDestino,
      numeroNF: validado.numeroNF,
      status: validado.status,
      observacao: validado.observacao,
      createdAt: agora,
    };

    if (typeof this.repository.registrarMovimentacaoComSaldo === 'function') {
      return this.repository.registrarMovimentacaoComSaldo(item.id, saldoResultante, movimentacao);
    }

    await this.repository.atualizarSaldoItem(item.id, saldoResultante);
    return this.repository.registrarMovimentacao(movimentacao);
  }


  /**
   * Executa ajuste de inventário compensatório (contagem física vs sistema).
   */
  async executarAjusteInventario(dados: RegistrarAjusteInventarioInput): Promise<Movimentacao> {
    const validado = RegistrarAjusteInventarioSchema.parse(dados);
    const item = await this.validarItemAtivo(validado.itemId);

    const saldoAnterior = item.estoqueAtual;
    const saldoResultante = calcularNovoSaldo(
      saldoAnterior,
      validado.tipo,
      validado.quantidade
    );

    const agora = validado.dataMovimentacao || new Date().toISOString();

    const movimentacao: Movimentacao = {
      id: this.gerarIdMovimentacao(),
      itemId: item.id,
      tipo: validado.tipo,
      quantidade: validado.quantidade,
      saldoAnterior,
      saldoResultante,
      dataMovimentacao: agora,
      observacao: `[Ajuste de Inventário] ${validado.motivo}`,
      createdAt: agora,
    };

    if (typeof this.repository.registrarMovimentacaoComSaldo === 'function') {
      return this.repository.registrarMovimentacaoComSaldo(item.id, saldoResultante, movimentacao);
    }

    await this.repository.atualizarSaldoItem(item.id, saldoResultante);
    return this.repository.registrarMovimentacao(movimentacao);
  }

  /**
   * Executa atomicamente o ajuste de inventário de múltiplos itens divergentes.
   * Utiliza a infraestrutura transacional do repositório para assegurar atomicidade ACID estrita.
   */
  async executarAjusteInventarioLote(
    ajustes: Array<{
      itemId: string;
      tipo: 'AJUSTE_INVENTARIO_POSITIVO' | 'AJUSTE_INVENTARIO_NEGATIVO';
      quantidade: number;
      motivo: string;
      responsavelId: string;
      dataMovimentacao?: string;
    }>
  ): Promise<Movimentacao[]> {
    if (ajustes.length === 0) return [];

    const agora = new Date().toISOString();
    const operacoesParaPersistir: Array<{
      itemId: string;
      novoSaldo: number;
      movimentacao: Movimentacao;
    }> = [];

    for (const ajuste of ajustes) {
      const item = await this.validarItemAtivo(ajuste.itemId);
      const saldoAnterior = item.estoqueAtual;
      const saldoResultante = calcularNovoSaldo(
        saldoAnterior,
        ajuste.tipo,
        ajuste.quantidade
      );

      const dataHora = ajuste.dataMovimentacao || agora;
      const movimentacao: Movimentacao = {
        id: this.gerarIdMovimentacao(),
        itemId: item.id,
        tipo: ajuste.tipo,
        quantidade: ajuste.quantidade,
        saldoAnterior,
        saldoResultante,
        dataMovimentacao: dataHora,
        observacao: `[Ajuste de Inventário] ${ajuste.motivo}`,
        createdAt: dataHora,
      };

      operacoesParaPersistir.push({
        itemId: item.id,
        novoSaldo: saldoResultante,
        movimentacao,
      });
    }

    if (typeof this.repository.registrarOperacoesAtomicas === 'function') {
      return this.repository.registrarOperacoesAtomicas(operacoesParaPersistir);
    }

    const movimentacoesGeradas: Movimentacao[] = [];
    for (const op of operacoesParaPersistir) {
      await this.repository.atualizarSaldoItem(op.itemId, op.novoSaldo);
      const movPersistida = await this.repository.registrarMovimentacao(op.movimentacao);
      movimentacoesGeradas.push(movPersistida);
    }
    return movimentacoesGeradas;
  }

  /**
   * Efetiva a entrada de mercadorias no estoque a partir de uma Nota Fiscal conferida,
   * gerando movimentações do tipo ENTRADA_COMPRA e atualizando os saldos dos itens.
   */
  async efetivarEntradaNFe(
    notaFiscal: NotaFiscal,
    options?: EfetivarEntradaNFeOptions
  ): Promise<ResultadoEfetivacaoNFe> {
    const entradaService = new NFeEntradaService(this.repository);
    return entradaService.efetivarEntrada(notaFiscal, options);
  }


  /**
   * Executa o estorno de uma movimentação anterior com auditoria completa.
   * Inverte os efeitos da movimentação no saldo físico e vincula ambas as movimentações.
   */
  async executarEstorno(
    movimentacaoId: string,
    motivo: string,
    usuarioResponsavel?: { id: string; nome: string; papel: string }
  ): Promise<Movimentacao> {
    if (!motivo || !motivo.trim()) {
      throw new Error('O motivo do estorno é obrigatório.');
    }

    const movOriginal = await this.repository.buscarMovimentacaoPorId?.(movimentacaoId);
    if (!movOriginal) {
      throw new Error(`Movimentação com ID "${movimentacaoId}" não foi encontrada para estorno.`);
    }

    if (movOriginal.estornado) {
      throw new MovimentacaoJaEstornadaError(movOriginal.id);
    }

    if (movOriginal.estorno) {
      throw new Error('Não é permitido estornar uma movimentação que já é um estorno.');
    }

    const item = await this.validarItemAtivo(movOriginal.itemId);
    const saldoAnterior = item.estoqueAtual;

    const ehEntradaOriginal =
      movOriginal.tipo === 'ENTRADA_COMPRA' ||
      movOriginal.tipo === 'ENTRADA_PRODUCAO' ||
      movOriginal.tipo === 'AJUSTE_INVENTARIO_POSITIVO';

    const tipoEstorno: TipoMovimentacao = ehEntradaOriginal
      ? 'AJUSTE_INVENTARIO_NEGATIVO'
      : 'AJUSTE_INVENTARIO_POSITIVO';
    const saldoResultante = calcularNovoSaldo(
      saldoAnterior,
      tipoEstorno,
      movOriginal.quantidade,
      { itemId: item.codigo }
    );

    const agora = new Date().toISOString();
    const idEstorno = this.gerarIdMovimentacao();

    const movimentacaoEstorno: Movimentacao = {
      id: idEstorno,
      itemId: item.id,
      tipo: tipoEstorno,
      quantidade: movOriginal.quantidade,
      saldoAnterior,
      saldoResultante,
      dataMovimentacao: agora,
      estorno: true,
      estornoDe: movOriginal.id,
      motivo: motivo.trim(),
      colaboradorId: usuarioResponsavel?.id,
      colaboradorNome: usuarioResponsavel?.nome,
      observacao: `[ESTORNO de ${movOriginal.id}] ${motivo.trim()}`,
      createdAt: agora,
    };

    const movOriginalAtualizada: Movimentacao = {
      ...movOriginal,
      estornado: true,
      estornadoPor: idEstorno,
    };

    if (typeof this.repository.registrarMovimentacaoComSaldo === 'function') {
      // O repositório marca a original como estornada na mesma transação,
      // recusando o estorno se outra requisição já o tiver feito.
      return this.repository.registrarMovimentacaoComSaldo(
        item.id,
        saldoResultante,
        movimentacaoEstorno,
        { estornoDe: movOriginal.id }
      );
    }

    await this.repository.salvarItem({
      ...item,
      estoqueAtual: saldoResultante,
      updatedAt: agora,
    });
    await this.repository.registrarMovimentacao(movOriginalAtualizada);
    return this.repository.registrarMovimentacao(movimentacaoEstorno);
  }
}
