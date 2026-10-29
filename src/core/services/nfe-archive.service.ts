import { NotaFiscal } from '../domain/nfe.schema';
import { StatusConferenciaNFe } from '../domain/types';
import {
  sanitizarChaveAcessoNFe,
  validarChaveAcessoNFe,
  formatarChaveAcessoNFe,
  sanitizarNumeroNF,
} from '../utils/formatters';

/**
 * Metadados normalizados para indexação e arquivamento virtual de Notas Fiscais Eletrônicas.
 */
export interface NFeArchiveMetadata {
  id: string;
  chaveAcesso: string;
  chaveAcessoFormatada: string;
  numeroNota: string;
  serie: string;
  cnpjFornecedor: string;
  razaoSocialFornecedor: string;
  dataEmissao: string;
  dataRecebimento: string;
  ano: number;
  mes: number;
  dia: number;
  valorTotalNota: number;
  statusConferencia: StatusConferenciaNFe;
  numeroPedidoCompra?: string;
  caminhoDiretorio: string;
  caminhoArquivoDanfe: string;
  quantidadeItens: number;
  tagsBusca: string[];
  arquivadoEm: string;
}

/**
 * Critérios de busca e filtros para consulta de notas arquivadas.
 */
export interface NFeArchiveFiltros {
  termoBusca?: string;
  ano?: number;
  mes?: number;
  dia?: number;
  dataInicial?: string;
  dataFinal?: string;
  cnpjFornecedor?: string;
  statusConferencia?: StatusConferenciaNFe;
  numeroPedidoCompra?: string;
}

/**
 * Resumo estatístico do acervo de notas fiscais arquivadas.
 */
export interface NFeArchiveSumario {
  totalNotas: number;
  valorTotalAcumulado: number;
  totalAprovadas: number;
  totalDivergentes: number;
  totalArquivadas: number;
  anosDisponiveis: number[];
}

/**
 * Serviço puro e agnóstico de Gestão de Metadados e Arquivamento de NFe.
 * Padroniza o particionamento temporal de caminhos virtuais (AAAA/MM/DD/CHAVE_NFE)
 * e fornece indexação com busca rápida por múltiplos critérios.
 */
export class NFeArchiveService {
  private static readonly ROOT_ARCHIVE_PATH = 'nfe-archive';

  /**
   * Extrai e formata o particionamento de data a partir de uma data ISO.
   *
   * @param dataIso String de data no padrão ISO 8601
   * @returns Objeto com ano, mês, dia (formatados com 2 dígitos) e caminho relativo
   */
  public extrairParticionamentoData(dataIso: string): {
    ano: number;
    mes: number;
    dia: number;
    anoStr: string;
    mesStr: string;
    diaStr: string;
    caminhoParticao: string;
  } {
    const data = new Date(dataIso);
    if (isNaN(data.getTime())) {
      throw new Error(`Data inválida fornecida para particionamento de arquivamento: "${dataIso}"`);
    }

    const ano = data.getUTCFullYear();
    const mes = data.getUTCMonth() + 1; // 1-12
    const dia = data.getUTCDate();

    const anoStr = String(ano);
    const mesStr = String(mes).padStart(2, '0');
    const diaStr = String(dia).padStart(2, '0');
    const caminhoParticao = `${anoStr}/${mesStr}/${diaStr}`;

    return {
      ano,
      mes,
      dia,
      anoStr,
      mesStr,
      diaStr,
      caminhoParticao,
    };
  }

  /**
   * Gera o caminho virtual padronizado para o diretório ou arquivo da NFe.
   * Padrão da fábrica: `nfe-archive/AAAA/MM/DD/CHAVE_NFE`
   *
   * @param dataIso Data base para o particionamento (recebimento ou emissão)
   * @param chaveAcesso Chave de acesso de 44 dígitos da NFe
   * @param extensao Extensão opcional do arquivo (ex.: 'pdf')
   */
  public gerarCaminhoVirtual(dataIso: string, chaveAcesso: string, extensao?: string): string {
    const chaveLimpa = sanitizarChaveAcessoNFe(chaveAcesso);
    if (!validarChaveAcessoNFe(chaveLimpa)) {
      throw new Error(
        `Chave de acesso inválida para arquivamento: "${chaveAcesso}". Deve conter exatamente 44 dígitos numéricos.`
      );
    }

    const { caminhoParticao } = this.extrairParticionamentoData(dataIso);
    const caminhoBase = `${NFeArchiveService.ROOT_ARCHIVE_PATH}/${caminhoParticao}/${chaveLimpa}`;

    if (!extensao) {
      return caminhoBase;
    }

    const extLimpa = extensao.replace(/^\./, '').toLowerCase();
    return `${caminhoBase}.${extLimpa}`;
  }

  /**
   * Constrói tags de busca normalizadas para indexação em cache ou banco de dados.
   */
  public construirTagsBusca(notaFiscal: NotaFiscal): string[] {
    const chaveLimpa = sanitizarChaveAcessoNFe(notaFiscal.chaveAcesso);
    const numeroLimpo = sanitizarNumeroNF(notaFiscal.numero);
    const cnpjLimpo = notaFiscal.cnpjFornecedor.replace(/\D/g, '');

    const tags = new Set<string>();

    if (chaveLimpa) tags.add(chaveLimpa);
    if (numeroLimpo) {
      tags.add(numeroLimpo);
      tags.add(`NF-${numeroLimpo}`);
    }
    if (cnpjLimpo) tags.add(cnpjLimpo);

    if (notaFiscal.numeroPedidoCompra) {
      tags.add(notaFiscal.numeroPedidoCompra.toUpperCase());
    }

    if (notaFiscal.razaoSocialFornecedor) {
      notaFiscal.razaoSocialFornecedor
        .toUpperCase()
        .split(/\s+/)
        .filter((word) => word.length >= 3)
        .forEach((word) => tags.add(word));
    }

    if (notaFiscal.nomeFantasiaFornecedor) {
      notaFiscal.nomeFantasiaFornecedor
        .toUpperCase()
        .split(/\s+/)
        .filter((word) => word.length >= 3)
        .forEach((word) => tags.add(word));
    }

    const dataRec = new Date(notaFiscal.dataRecebimento);
    if (!isNaN(dataRec.getTime())) {
      tags.add(String(dataRec.getUTCFullYear()));
      tags.add(`${dataRec.getUTCFullYear()}-${String(dataRec.getUTCMonth() + 1).padStart(2, '0')}`);
    }

    return Array.from(tags);
  }

  /**
   * Gera os metadados completos de arquivamento para uma Nota Fiscal.
   *
   * @param notaFiscal Objeto da Nota Fiscal
   * @param options Opções adicionais (ex.: timestamp customizado de arquivamento)
   */
  public gerarMetadadosArquivamento(
    notaFiscal: NotaFiscal,
    options: { dataArquivamento?: string } = {}
  ): NFeArchiveMetadata {
    const chaveLimpa = sanitizarChaveAcessoNFe(notaFiscal.chaveAcesso);
    const dataRef = notaFiscal.dataRecebimento || notaFiscal.dataEmissao;
    const { ano, mes, dia, caminhoParticao } = this.extrairParticionamentoData(dataRef);

    const caminhoDiretorio = `${NFeArchiveService.ROOT_ARCHIVE_PATH}/${caminhoParticao}/${chaveLimpa}`;
    const caminhoArquivoDanfe = `${caminhoDiretorio}.pdf`;

    const tagsBusca = this.construirTagsBusca(notaFiscal);
    const arquivadoEm = options.dataArquivamento || new Date().toISOString();

    return {
      id: notaFiscal.id,
      chaveAcesso: chaveLimpa,
      chaveAcessoFormatada: formatarChaveAcessoNFe(chaveLimpa),
      numeroNota: notaFiscal.numero,
      serie: notaFiscal.serie,
      cnpjFornecedor: notaFiscal.cnpjFornecedor,
      razaoSocialFornecedor: notaFiscal.razaoSocialFornecedor,
      dataEmissao: notaFiscal.dataEmissao,
      dataRecebimento: notaFiscal.dataRecebimento,
      ano,
      mes,
      dia,
      valorTotalNota: notaFiscal.valorTotalNota,
      statusConferencia: notaFiscal.status,
      numeroPedidoCompra: notaFiscal.numeroPedidoCompra,
      caminhoDiretorio,
      caminhoArquivoDanfe,
      quantidadeItens: notaFiscal.itens.length,
      tagsBusca,
      arquivadoEm,
    };
  }

  /**
   * Filtra registros de metadados em memória de acordo com os filtros informados.
   *
   * @param registros Lista de metadados de notas arquivadas
   * @param filtros Parâmetros de pesquisa
   */
  public filtrarMetadados(
    registros: NFeArchiveMetadata[],
    filtros: NFeArchiveFiltros = {}
  ): NFeArchiveMetadata[] {
    return registros.filter((item) => {
      if (filtros.ano !== undefined && item.ano !== filtros.ano) {
        return false;
      }

      if (filtros.mes !== undefined && item.mes !== filtros.mes) {
        return false;
      }

      if (filtros.dia !== undefined && item.dia !== filtros.dia) {
        return false;
      }

      if (filtros.cnpjFornecedor) {
        const cnpjFiltro = filtros.cnpjFornecedor.replace(/\D/g, '');
        const cnpjItem = item.cnpjFornecedor.replace(/\D/g, '');
        if (cnpjFiltro && cnpjItem !== cnpjFiltro) {
          return false;
        }
      }

      if (filtros.statusConferencia && item.statusConferencia !== filtros.statusConferencia) {
        return false;
      }

      if (filtros.numeroPedidoCompra) {
        if (!item.numeroPedidoCompra) return false;
        const pedidoFiltro = filtros.numeroPedidoCompra.trim().toUpperCase();
        if (!item.numeroPedidoCompra.toUpperCase().includes(pedidoFiltro)) {
          return false;
        }
      }

      if (filtros.dataInicial) {
        if (new Date(item.dataRecebimento) < new Date(filtros.dataInicial)) {
          return false;
        }
      }

      if (filtros.dataFinal) {
        if (new Date(item.dataRecebimento) > new Date(filtros.dataFinal)) {
          return false;
        }
      }

      if (filtros.termoBusca) {
        const termo = filtros.termoBusca.trim().toUpperCase();
        const bateTermo =
          item.chaveAcesso.includes(termo) ||
          item.numeroNota.toUpperCase().includes(termo) ||
          item.razaoSocialFornecedor.toUpperCase().includes(termo) ||
          item.tagsBusca.some((t) => t.includes(termo));

        if (!bateTermo) return false;
      }

      return true;
    });
  }

  /**
   * Agrupa registros de notas arquivadas por período (Ano-Mês, ex: '2026-01').
   */
  public agruparPorPeriodo(
    registros: NFeArchiveMetadata[]
  ): Record<string, NFeArchiveMetadata[]> {
    const grupos: Record<string, NFeArchiveMetadata[]> = {};

    for (const reg of registros) {
      const chavePeriodo = `${reg.ano}-${String(reg.mes).padStart(2, '0')}`;
      if (!grupos[chavePeriodo]) {
        grupos[chavePeriodo] = [];
      }
      grupos[chavePeriodo].push(reg);
    }

    return grupos;
  }

  /**
   * Calcula sumário estatístico a partir de uma coleção de metadados arquivados.
   */
  public gerarSumario(registros: NFeArchiveMetadata[]): NFeArchiveSumario {
    let valorTotal = 0;
    let totalAprovadas = 0;
    let totalDivergentes = 0;
    let totalArquivadas = 0;
    const anosSet = new Set<number>();

    for (const r of registros) {
      valorTotal += r.valorTotalNota;
      anosSet.add(r.ano);

      if (r.statusConferencia === 'APROVADA') totalAprovadas++;
      if (r.statusConferencia === 'DIVERGENTE') totalDivergentes++;
      if (r.statusConferencia === 'ARQUIVADA') totalArquivadas++;
    }

    return {
      totalNotas: registros.length,
      valorTotalAcumulado: valorTotal,
      totalAprovadas,
      totalDivergentes,
      totalArquivadas,
      anosDisponiveis: Array.from(anosSet).sort((a, b) => b - a),
    };
  }
}
