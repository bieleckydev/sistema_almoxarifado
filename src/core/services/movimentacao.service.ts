import {
  RegistrarEntradaSchema,
  RegistrarEntradaInput,
  RegistrarBaixaInternaSchema,
  RegistrarBaixaInternaInput,
  RegistrarSaidaExpedicaoSchema,
  RegistrarSaidaExpedicaoInput,
  RegistrarBaixaLoteSchema,
  RegistrarBaixaLoteInput,
  RegistrarAjusteInventarioSchema,
  RegistrarAjusteInventarioInput,
  Movimentacao,
} from '../domain/movimentacao.schema';
import { Item } from '../domain/item.schema';
import { Colaborador } from '../domain/colaborador.schema';
import {
  calcularNovoSaldo,
  validarDisponibilidadeEstoque,
  SaldoInsuficienteError,
} from './estoque-calculator';
import { IEstoqueRepository } from '../storage/estoque.repository.interface';
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

export class LoteEstoqueInsuficienteError extends Error {
  constructor(
    public readonly itensComProblema: Array<{
      itemId: string;
      codigo: string;
      descricao: string;
      saldoAtual: number;
      quantidadeSolicitada: number;
      faltante: number;
    }>
  ) {
    const detalhes = itensComProblema
      .map(
        (i) =>
          `[Item: ${i.codigo} - ${i.descricao} | Disponível: ${i.saldoAtual}, Solicitado: ${i.quantidadeSolicitada}]`
      )
      .join('; ');
    super(`A baixa em lote não pôde ser efetuada devido a saldo insuficiente nos itens: ${detalhes}`);
    this.name = 'LoteEstoqueInsuficienteError';
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
   * Orquestra a baixa rápida de múltiplos itens em lote (carrinho de retirada rápida do operador).
   * Garante validação transacional prévia: nenhum item é baixado se houver insuficiência em qualquer um deles.
   */
  async executarBaixaLote(dados: RegistrarBaixaLoteInput): Promise<Movimentacao[]> {
    const validado = RegistrarBaixaLoteSchema.parse(dados);
    const colaborador = await this.validarColaboradorAtivo(validado.colaboradorId);

    // 1. Fase de Verificação e Carregamento de Itens
    const itensCarregados: Array<{ item: Item; quantidade: number; observacao?: string }> = [];
    const itensComProblema: Array<{
      itemId: string;
      codigo: string;
      descricao: string;
      saldoAtual: number;
      quantidadeSolicitada: number;
      faltante: number;
    }> = [];

    for (const itemSolicitado of validado.itens) {
      const item = await this.validarItemAtivo(itemSolicitado.itemId);
      const disponibilidade = validarDisponibilidadeEstoque(
        item.estoqueAtual,
        itemSolicitado.quantidade
      );

      if (!disponibilidade.disponivel) {
        itensComProblema.push({
          itemId: item.id,
          codigo: item.codigo,
          descricao: item.descricao,
          saldoAtual: item.estoqueAtual,
          quantidadeSolicitada: itemSolicitado.quantidade,
          faltante: disponibilidade.faltante,
        });
      }

      itensCarregados.push({
        item,
        quantidade: itemSolicitado.quantidade,
        observacao: itemSolicitado.observacao,
      });
    }

    // Se qualquer item tiver saldo insuficiente, aborta todo o lote para proteger o estoque
    if (itensComProblema.length > 0) {
      throw new LoteEstoqueInsuficienteError(itensComProblema);
    }

    // 2. Fase de Aplicação e Persistência
    const agora = validado.dataMovimentacao || new Date().toISOString();
    const setorOperacao = validado.setor || colaborador.setor;
    const operacoesParaPersistir: Array<{
      itemId: string;
      novoSaldo: number;
      movimentacao: Movimentacao;
    }> = [];

    for (const { item, quantidade, observacao } of itensCarregados) {
      const saldoAnterior = item.estoqueAtual;
      const saldoResultante = calcularNovoSaldo(
        saldoAnterior,
        'SAIDA_CONSUMO_INTERNO',
        quantidade
      );

      const movimentacao: Movimentacao = {
        id: this.gerarIdMovimentacao(),
        itemId: item.id,
        tipo: 'SAIDA_CONSUMO_INTERNO',
        quantidade,
        saldoAnterior,
        saldoResultante,
        dataMovimentacao: agora,
        colaboradorId: colaborador.id,
        colaboradorMatricula: colaborador.matricula,
        colaboradorNome: colaborador.nome,
        setor: setorOperacao,
        observacao: observacao || validado.observacaoGeral,
        createdAt: agora,
      };

      operacoesParaPersistir.push({
        itemId: item.id,
        novoSaldo: saldoResultante,
        movimentacao,
      });

      // Atualiza o saldo local para o caso de itens duplicados no mesmo lote
      item.estoqueAtual = saldoResultante;
    }

    if (typeof this.repository.registrarBaixaLoteAtomica === 'function') {
      return this.repository.registrarBaixaLoteAtomica(operacoesParaPersistir);
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
   * Alias semântico para executarBaixaLote.
   */
  async executarBaixaEmLote(dados: RegistrarBaixaLoteInput): Promise<Movimentacao[]> {
    return this.executarBaixaLote(dados);
  }
}
