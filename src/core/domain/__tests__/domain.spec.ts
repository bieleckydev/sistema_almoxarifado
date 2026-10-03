import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ItemSchema,
  CreateItemSchema,
  converterEmbalagemParaUnidade,
  converterUnidadeParaEmbalagem,
} from '../item.schema';
import {
  ColaboradorSchema,
  normalizarMatricula,
} from '../colaborador.schema';
import {
  RegistrarEntradaSchema,
  RegistrarBaixaInternaSchema,
  RegistrarSaidaExpedicaoSchema,
  RegistrarBaixaLoteSchema,
  RegistrarAjusteInventarioSchema,
  MovimentacaoSchema,
} from '../movimentacao.schema';
import {
  AbrirSessaoInventarioSchema,
  RegistrarContagemItemSchema,
  SessaoInventarioSchema,
  calcularDivergenciaItem,
  calcularMetricasSessao,
} from '../inventario.schema';
import {
  NotaFiscalSchema,
  PedidoCompraSchema,
  ItemNotaFiscalSchema,
  ItemPedidoCompraSchema,
} from '../nfe.schema';
import {
  TipoItemSchema,
  UnidadeMedidaSchema,
  TipoMovimentacaoSchema,
  StatusEstoqueSchema,
  StatusConferenciaNFeSchema,
} from '../types';
import {
  normalizarCodigoItem,
  formatarPesoKg,
  formatarQuantidadeInteira,
  formatarQuantidadePorUnidade,
  sanitizarNumeroNF,
  sanitizarChaveAcessoNFe,
  validarChaveAcessoNFe,
  formatarChaveAcessoNFe,
} from '../../utils/formatters';

describe('1.1 — Enums e Schemas de Tipos Globais', () => {
  it('deve aceitar tipos de itens válidos e rejeitar inválidos', () => {
    assert.equal(TipoItemSchema.parse('PRODUTIVO_MATERIA_PRIMA'), 'PRODUTIVO_MATERIA_PRIMA');
    assert.equal(TipoItemSchema.parse('IMPRODUTIVO_CONSUMIVEL'), 'IMPRODUTIVO_CONSUMIVEL');
    assert.equal(TipoItemSchema.parse('ACABADO'), 'ACABADO');
    assert.throws(() => TipoItemSchema.parse('OUTRO_TIPO_INVALIDO'));
  });

  it('deve aceitar unidades de medida válidas e rejeitar inválidas', () => {
    const unidadesValidas = ['KG', 'UNIDADE', 'METRO', 'PACOTE', 'PECA', 'LITRO'];
    for (const u of unidadesValidas) {
      assert.equal(UnidadeMedidaSchema.parse(u), u);
    }
    assert.throws(() => UnidadeMedidaSchema.parse('TONELADA'));
  });

  it('deve validar tipos de movimentação suportados', () => {
    assert.equal(TipoMovimentacaoSchema.parse('ENTRADA_COMPRA'), 'ENTRADA_COMPRA');
    assert.equal(TipoMovimentacaoSchema.parse('SAIDA_CONSUMO_INTERNO'), 'SAIDA_CONSUMO_INTERNO');
    assert.equal(TipoMovimentacaoSchema.parse('SAIDA_EXPEDICAO'), 'SAIDA_EXPEDICAO');
    assert.throws(() => TipoMovimentacaoSchema.parse('MOVIMENTACAO_INEXISTENTE'));
  });

  it('deve validar status de estoque e conferencia de NFe', () => {
    assert.equal(StatusEstoqueSchema.parse('NORMAL'), 'NORMAL');
    assert.equal(StatusEstoqueSchema.parse('CRITICO_ZERADO'), 'CRITICO_ZERADO');
    assert.equal(StatusConferenciaNFeSchema.parse('DIVERGENTE'), 'DIVERGENTE');
    assert.equal(StatusConferenciaNFeSchema.parse('APROVADA'), 'APROVADA');
  });
});

describe('1.2 — ItemSchema e Regras de Negócio de Itens', () => {
  it('deve validar item de matéria-prima com código 10-XXX e unidade KG', () => {
    const itemMateriaPrima = {
      id: 'item-001',
      codigo: '10-3812',
      descricao: 'TUBO ACO SAE 1020 38.1 X 1.2 MM',
      tipo: 'PRODUTIVO_MATERIA_PRIMA',
      unidade: 'KG',
      estoqueSeguranca: 500,
      estoqueAtual: 1250.75,
    };

    const parsed = ItemSchema.parse(itemMateriaPrima);
    assert.equal(parsed.codigo, '10-3812');
    assert.equal(parsed.tipo, 'PRODUTIVO_MATERIA_PRIMA');
    assert.equal(parsed.unidade, 'KG');
    assert.equal(parsed.estoqueAtual, 1250.75);
    assert.equal(parsed.ativo, true);
  });

  it('deve validar item consumível com código 90-XXXX e embalagem de pacote', () => {
    const itemConsumivel = {
      id: 'item-002',
      codigo: '90-1105',
      descricao: 'DISCO FLAP 4.1/2 GRAO 60',
      tipo: 'IMPRODUTIVO_CONSUMIVEL',
      unidade: 'UNIDADE',
      estoqueSeguranca: 20,
      estoqueAtual: 45,
      embalagem: {
        possuiEmbalagem: true,
        unidadeCompra: 'PACOTE',
        unidadeConsumo: 'UNIDADE',
        fatorConversao: 10,
        descricaoEmbalagem: 'Pacote com 10 discos',
      },
    };

    const parsed = ItemSchema.parse(itemConsumivel);
    assert.equal(parsed.codigo, '90-1105');
    assert.equal(parsed.embalagem.fatorConversao, 10);
    assert.equal(parsed.embalagem.possuiEmbalagem, true);
  });

  it('deve validar item acabado com código 100-XXXX e cliente de destino', () => {
    const itemAcabado = {
      id: 'item-003',
      codigo: '100-089',
      descricao: 'SUPORTE GUIDAO SHAMAN PRETO',
      tipo: 'ACABADO',
      unidade: 'PECA',
      estoqueSeguranca: 50,
      estoqueAtual: 120,
      clienteDestino: 'Shaman',
    };

    const parsed = ItemSchema.parse(itemAcabado);
    assert.equal(parsed.codigo, '100-089');
    assert.equal(parsed.clienteDestino, 'Shaman');
  });

  it('deve rejeitar item com código fora dos prefixos homologados', () => {
    const itemInvalido = {
      id: 'item-err',
      codigo: '55-INVALIDO',
      descricao: 'Item com prefixo não reconhecido',
      tipo: 'IMPRODUTIVO_CONSUMIVEL',
      unidade: 'UNIDADE',
    };

    assert.throws(() => ItemSchema.parse(itemInvalido), /Código de item inválido/);
  });

  it('deve rejeitar estoque de segurança ou estoque atual negativos', () => {
    const itemNegativo = {
      id: 'item-err2',
      codigo: '90-1234',
      descricao: 'Broca HSS 6mm',
      tipo: 'IMPRODUTIVO_CONSUMIVEL',
      unidade: 'UNIDADE',
      estoqueSeguranca: -5,
      estoqueAtual: -10,
    };

    assert.throws(() => ItemSchema.parse(itemNegativo));
  });

  it('deve permitir criação via CreateItemSchema com estoque inicial', () => {
    const novoItem = {
      codigo: '90-9999',
      descricao: 'Eletrodo OK 46 2.5mm',
      tipo: 'IMPRODUTIVO_CONSUMIVEL',
      unidade: 'KG',
      estoqueSeguranca: 15,
      estoqueInicial: 50,
    };

    const parsed = CreateItemSchema.parse(novoItem);
    assert.equal(parsed.codigo, '90-9999');
    assert.equal(parsed.estoqueInicial, 50);
  });

  it('deve calcular conversão de embalagem para unidade e vice-versa corretamente', () => {
    // 5 pacotes com 10 unidades cada = 50 unidades
    const totalUnidades = converterEmbalagemParaUnidade(5, 10);
    assert.equal(totalUnidades, 50);

    // 45 unidades com fator 10 = 4 pacotes fechados + 5 avulsos
    const divisao = converterUnidadeParaEmbalagem(45, 10);
    assert.equal(divisao.embalagensFechadas, 4);
    assert.equal(divisao.sobraAvulsa, 5);

    // Rejeição de valores negativos
    assert.throws(() => converterEmbalagemParaUnidade(-1, 10));
    assert.throws(() => converterUnidadeParaEmbalagem(10, 0));
  });
});

describe('1.3 — ColaboradorSchema e Validação de Matrícula', () => {
  it('deve validar e auto-formatar matrícula numérica para 3 dígitos', () => {
    const colaborador = {
      id: 'colab-1',
      matricula: '1',
      nome: 'José da Silva',
      setor: 'SOLDA',
      funcao: 'Soldador TIG',
    };

    const parsed = ColaboradorSchema.parse(colaborador);
    assert.equal(parsed.matricula, '001');
    assert.equal(parsed.setor, 'SOLDA');
    assert.equal(parsed.ativo, true);
  });

  it('deve normalizar matrículas com 2 dígitos para 3 dígitos', () => {
    assert.equal(normalizarMatricula(42), '042');
    assert.equal(normalizarMatricula('7'), '007');
    assert.equal(normalizarMatricula('350'), '350');
  });

  it('deve rejeitar colaborador com nome muito curto ou matrícula inválida', () => {
    assert.throws(() => {
      ColaboradorSchema.parse({
        id: 'colab-err',
        matricula: 'ABC',
        nome: 'Zé',
        setor: 'QUALIDADE',
        funcao: 'Inspetor',
      });
    });
  });

  it('deve validar todos os setores fabris homologados', () => {
    const setores = ['FERRAMENTARIA', 'QUALIDADE', 'LOGISTICA', 'CADEIRA', 'MONTAGEM', 'SOLDA'];
    for (const setor of setores) {
      const res = ColaboradorSchema.parse({
        id: `c-${setor}`,
        matricula: '100',
        nome: `Operador ${setor}`,
        setor,
        funcao: 'Operador',
      });
      assert.equal(res.setor, setor);
    }
  });
});

describe('1.4 — Formatadores Puros de Domínio', () => {
  it('deve normalizar códigos de produto limpando espaços e barras', () => {
    assert.equal(normalizarCodigoItem(' 10 - 042 '), '10-042');
    assert.equal(normalizarCodigoItem('90/1001'), '90-1001');
    assert.equal(normalizarCodigoItem('100_050'), '100-050');
    assert.equal(normalizarCodigoItem(''), '');
  });

  it('deve formatar peso em KG no padrão brasileiro', () => {
    assert.equal(formatarPesoKg(1250.5), '1.250,50 KG');
    assert.equal(formatarPesoKg(1250.5, false), '1.250,50');
    assert.equal(formatarPesoKg(0), '0,00 KG');
    assert.equal(formatarPesoKg(null), '0,00 KG');
  });

  it('deve formatar quantidades inteiras', () => {
    assert.equal(formatarQuantidadeInteira(1500), '1.500');
    assert.equal(formatarQuantidadeInteira(45.8), '45');
    assert.equal(formatarQuantidadeInteira(null), '0');
  });

  it('deve formatar quantidades por unidade de medida', () => {
    assert.equal(formatarQuantidadePorUnidade(125.75, 'KG'), '125,75 KG');
    assert.equal(formatarQuantidadePorUnidade(50, 'UNIDADE'), '50 UN');
    assert.equal(formatarQuantidadePorUnidade(10, 'PACOTE'), '10 PCT');
    assert.equal(formatarQuantidadePorUnidade(5, 'PECA'), '5 PÇ');
  });

  it('deve sanitizar números de Nota Fiscal', () => {
    assert.equal(sanitizarNumeroNF('NF 000.123.456-1'), '1234561');
    assert.equal(sanitizarNumeroNF('000123'), '123');
    assert.equal(sanitizarNumeroNF(4567), '4567');
  });

  it('deve sanitizar, validar e formatar chave de acesso de NFe de 44 dígitos', () => {
    const chaveValida = '35260100000000000000550010000000011000000010';
    assert.equal(validarChaveAcessoNFe(chaveValida), true);
    assert.equal(validarChaveAcessoNFe('12345'), false);

    const chaveFormatada = formatarChaveAcessoNFe(chaveValida);
    assert.equal(
      chaveFormatada,
      '3526 0100 0000 0000 0000 5500 1000 0000 0110 0000 0010'
    );

    const chaveComMascara = '3526.0100.0000-0000';
    assert.equal(sanitizarChaveAcessoNFe(chaveComMascara), '3526010000000000');
  });
});

describe('2.1 — Schemas de Movimentações de Estoque', () => {
  it('deve validar entrada por compra com NFe e pedido Rhowert', () => {
    const entrada = {
      itemId: 'item-10-3812',
      tipo: 'ENTRADA_COMPRA' as const,
      quantidade: 500,
      numeroNF: '12345',
      fornecedor: 'Aços Tubulares S/A',
      numeroPedidoRhowert: 'PED-2026-08',
      valorUnitario: 14.5,
    };

    const parsed = RegistrarEntradaSchema.parse(entrada);
    assert.equal(parsed.itemId, 'item-10-3812');
    assert.equal(parsed.tipo, 'ENTRADA_COMPRA');
    assert.equal(parsed.quantidade, 500);
    assert.equal(parsed.numeroPedidoRhowert, 'PED-2026-08');
  });

  it('deve rejeitar entrada com quantidade negativa ou zero', () => {
    assert.throws(() => {
      RegistrarEntradaSchema.parse({
        itemId: 'item-1',
        quantidade: 0,
      });
    });

    assert.throws(() => {
      RegistrarEntradaSchema.parse({
        itemId: 'item-1',
        quantidade: -50,
      });
    });
  });

  it('deve validar baixa interna para colaborador e setor', () => {
    const baixa = {
      itemId: 'item-90-1105',
      quantidade: 3,
      colaboradorId: 'colab-001',
      setor: 'SOLDA' as const,
      observacao: 'Reposição para cabine 3',
    };

    const parsed = RegistrarBaixaInternaSchema.parse(baixa);
    assert.equal(parsed.tipo, 'SAIDA_CONSUMO_INTERNO');
    assert.equal(parsed.quantidade, 3);
    assert.equal(parsed.colaboradorId, 'colab-001');
    assert.equal(parsed.setor, 'SOLDA');
  });

  it('deve validar saída para expedição com cliente e status', () => {
    const expedicao = {
      itemId: 'item-100-089',
      quantidade: 25,
      clienteDestino: 'Grajau Motos',
      numeroNF: '99881',
      status: 'DESPACHADO' as const,
    };

    const parsed = RegistrarSaidaExpedicaoSchema.parse(expedicao);
    assert.equal(parsed.tipo, 'SAIDA_EXPEDICAO');
    assert.equal(parsed.clienteDestino, 'Grajau Motos');
    assert.equal(parsed.status, 'DESPACHADO');
  });

  it('deve validar baixa em lote com múltiplos itens para o mesmo colaborador', () => {
    const baixaLote = {
      colaboradorId: 'colab-042',
      setor: 'FERRAMENTARIA' as const,
      itens: [
        { itemId: 'item-90-1105', quantidade: 5 },
        { itemId: 'item-90-2001', quantidade: 2, observacao: 'Broca 8mm' },
      ],
      observacaoGeral: 'Retirada de início de turno',
    };

    const parsed = RegistrarBaixaLoteSchema.parse(baixaLote);
    assert.equal(parsed.itens.length, 2);
    assert.equal(parsed.colaboradorId, 'colab-042');
  });

  it('deve validar entidade consolidada Movimentacao com auditoria de saldo', () => {
    const mov = {
      id: 'mov-1001',
      itemId: 'item-90-1105',
      tipo: 'SAIDA_CONSUMO_INTERNO' as const,
      quantidade: 5,
      saldoAnterior: 20,
      saldoResultante: 15,
      dataMovimentacao: new Date().toISOString(),
      colaboradorId: 'colab-001',
      setor: 'SOLDA' as const,
    };

    const parsed = MovimentacaoSchema.parse(mov);
    assert.equal(parsed.saldoAnterior, 20);
    assert.equal(parsed.saldoResultante, 15);
  });
});

describe('3.1 — Schema de Inventário e Contagem Física', () => {
  it('deve validar abertura de sessão de inventário por setor', () => {
    const input = {
      titulo: 'Inventário Geral Solda - 2026/10',
      escopo: 'POR_SETOR' as const,
      setorAlvo: 'SOLDA' as const,
      responsavelAberturaId: 'colab-001',
    };

    const parsed = AbrirSessaoInventarioSchema.parse(input);
    assert.equal(parsed.titulo, 'Inventário Geral Solda - 2026/10');
    assert.equal(parsed.escopo, 'POR_SETOR');
    assert.equal(parsed.setorAlvo, 'SOLDA');
  });

  it('deve validar lançamento de contagem física de item', () => {
    const contagem = {
      sessaoId: 'sessao-1',
      itemId: 'item-90-1105',
      quantidadeContada: 42,
      responsavelContagemId: 'colab-001',
      responsavelContagemNome: 'João da Solda',
    };

    const parsed = RegistrarContagemItemSchema.parse(contagem);
    assert.equal(parsed.sessaoId, 'sessao-1');
    assert.equal(parsed.quantidadeContada, 42);
  });

  it('deve calcular divergência entre saldo do sistema e contagem física', () => {
    // Caso conciliado (sem divergência)
    const resConciliado = calcularDivergenciaItem(50, 50);
    assert.equal(resConciliado.divergencia, 0);
    assert.equal(resConciliado.status, 'CONCILIADO');

    // Caso divergente (sobra)
    const resSobra = calcularDivergenciaItem(50, 55);
    assert.equal(resSobra.divergencia, 5);
    assert.equal(resSobra.status, 'DIVERGENTE');

    // Caso divergente (perda/falta)
    const resFalta = calcularDivergenciaItem(50, 47);
    assert.equal(resFalta.divergencia, -3);
    assert.equal(resFalta.status, 'DIVERGENTE');
  });

  it('deve calcular acurácia percentual e métricas da sessão de inventário', () => {
    const contagens = [
      { saldoSistema: 100, quantidadeContada: 100 }, // conciliado
      { saldoSistema: 50, quantidadeContada: 50 },   // conciliado
      { saldoSistema: 30, quantidadeContada: 30 },   // conciliado
      { saldoSistema: 20, quantidadeContada: 18 },   // divergente
    ];

    const metricas = calcularMetricasSessao(contagens);
    assert.equal(metricas.totalItens, 4);
    assert.equal(metricas.totalConciliados, 3);
    assert.equal(metricas.totalDivergentes, 1);
    assert.equal(metricas.acuraciaPercentual, 75); // 3 de 4 = 75%
  });

  it('deve validar schema completo da SessaoInventario com contagens', () => {
    const agora = new Date().toISOString();
    const sessao = {
      id: 'inv-2026-10',
      titulo: 'Balanço Cíclico Flap e Brocas',
      escopo: 'CICLICO' as const,
      status: 'EM_ANDAMENTO' as const,
      dataInicio: agora,
      responsavelAberturaId: 'colab-1',
      contagens: [
        {
          id: 'c-1',
          itemId: 'item-90-1105',
          codigoItem: '90-1105',
          descricaoItem: 'Disco Flap',
          unidade: 'UNIDADE' as const,
          saldoSistema: 50,
          quantidadeContada: 48,
          divergencia: -2,
          dataHoraContagem: agora,
          responsavelContagemId: 'colab-1',
          statusContagem: 'DIVERGENTE' as const,
        },
      ],
      totalItens: 1,
      totalConciliados: 0,
      totalDivergentes: 1,
      acuraciaPercentual: 0,
    };

    const parsed = SessaoInventarioSchema.parse(sessao);
    assert.equal(parsed.id, 'inv-2026-10');
    assert.equal(parsed.contagens.length, 1);
    assert.equal(parsed.contagens[0].divergencia, -2);
  });
});

describe('4.1 — Schemas de NFe e Pedido de Compra', () => {
  it('deve validar item de Nota Fiscal com código de fornecedor e NCM', () => {
    const itemNFe = {
      id: 'item-nf-1',
      numeroItem: 1,
      codigoFornecedor: 'TB-1020-38',
      codigoInternoRhowert: '10-3812',
      descricao: 'TUBO ACO SAE 1020 38.1X1.2MM',
      ncm: '7306.30.00',
      cfop: '5102',
      unidadeComercial: 'KG',
      quantidadeFaturada: 1250.5,
      valorUnitario: 14.5,
      valorTotal: 18132.25,
    };

    const parsed = ItemNotaFiscalSchema.parse(itemNFe);
    assert.equal(parsed.codigoFornecedor, 'TB-1020-38');
    assert.equal(parsed.codigoInternoRhowert, '10-3812');
    assert.equal(parsed.quantidadeFaturada, 1250.5);
    assert.equal(parsed.statusConciliacao, 'PENDENTE');
  });

  it('deve validar Nota Fiscal Eletrônica com chave de acesso de 44 dígitos', () => {
    const agora = new Date().toISOString();
    const chave = '35260100000000000000550010000000011000000010';

    const nfe = {
      id: 'nfe-1',
      chaveAcesso: chave,
      numero: '12345',
      serie: '1',
      cnpjFornecedor: '12345678000199',
      razaoSocialFornecedor: 'Aços Tubulares do Brasil Ltda',
      dataEmissao: agora,
      dataRecebimento: agora,
      valorTotalNota: 18132.25,
      status: 'RECEBIDA' as const,
      itens: [
        {
          id: 'item-nf-1',
          numeroItem: 1,
          codigoFornecedor: 'TB-1020',
          descricao: 'Tubo de Aço',
          unidadeComercial: 'KG',
          quantidadeFaturada: 1000,
          valorUnitario: 18.13,
          valorTotal: 18130,
        },
      ],
    };

    const parsed = NotaFiscalSchema.parse(nfe);
    assert.equal(parsed.chaveAcesso, chave);
    assert.equal(parsed.status, 'RECEBIDA');
    assert.equal(parsed.itens.length, 1);
  });

  it('deve rejeitar Nota Fiscal com chave de acesso diferente de 44 dígitos', () => {
    assert.throws(() => {
      NotaFiscalSchema.parse({
        id: 'nfe-err',
        chaveAcesso: '12345', // Inválida
        numero: '123',
        cnpjFornecedor: '12345678000199',
        razaoSocialFornecedor: 'Fornecedor',
        dataEmissao: new Date().toISOString(),
        dataRecebimento: new Date().toISOString(),
        valorTotalNota: 100,
        itens: [
          {
            id: 'it-1',
            numeroItem: 1,
            codigoFornecedor: 'F1',
            descricao: 'Item 1',
            unidadeComercial: 'UN',
            quantidadeFaturada: 1,
            valorUnitario: 100,
            valorTotal: 100,
          },
        ],
      });
    }, /A chave de acesso da NFe deve conter exatamente 44 dígitos/);
  });

  it('deve validar Pedido de Compra com itens autorizados e tolerância percentual', () => {
    const agora = new Date().toISOString();
    const pedido = {
      id: 'ped-1',
      numeroPedido: 'PED-2026-08',
      cnpjFornecedor: '12345678000199',
      razaoSocialFornecedor: 'Aços Tubulares do Brasil Ltda',
      dataAutorizacao: agora,
      valorTotalPedido: 18000,
      itens: [
        {
          id: 'ped-item-1',
          numeroItem: 1,
          codigoInternoRhowert: '10-3812',
          descricao: 'Tubo de Aço Carbono SAE 1020',
          unidade: 'KG' as const,
          quantidadeAutorizada: 1200,
          quantidadeJaEntregue: 0,
          valorUnitarioContratado: 14.5,
          valorTotalContratado: 17400,
          toleranciaPercentual: 5,
        },
      ],
    };

    const parsed = PedidoCompraSchema.parse(pedido);
    assert.equal(parsed.numeroPedido, 'PED-2026-08');
    assert.equal(parsed.itens[0].toleranciaPercentual, 5);
    assert.equal(parsed.itens[0].quantidadeAutorizada, 1200);
  });
});
