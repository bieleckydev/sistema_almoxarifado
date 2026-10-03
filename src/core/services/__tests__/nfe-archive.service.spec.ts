import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NFeArchiveService } from '../nfe-archive.service';
import { NotaFiscal } from '../../domain/nfe.schema';

describe('4.4 — Gestor de Metadados de Arquivamento (NFeArchiveService)', () => {
  const service = new NFeArchiveService();

  const notaFiscalExemplo: NotaFiscal = {
    id: 'nf-001',
    chaveAcesso: '35260112345678000190550010000012341234567890',
    numero: '1234',
    serie: '1',
    cnpjFornecedor: '12.345.678/0001-90',
    razaoSocialFornecedor: 'Aço & Metais Indústria LTDA',
    nomeFantasiaFornecedor: 'AçoMetais',
    dataEmissao: '2026-01-12T10:00:00.000Z',
    dataRecebimento: '2026-01-15T14:30:00.000Z',
    valorTotalNota: 25000,
    status: 'APROVADA',
    numeroPedidoCompra: 'PED-2026-001',
    itens: [
      {
        id: 'item-1',
        numeroItem: 1,
        codigoFornecedor: 'FORN-01',
        codigoInternoRhowert: '10-001',
        descricao: 'TUBO INDUSTRIAL 2 POL',
        unidadeComercial: 'KG',
        quantidadeFaturada: 1000,
        valorUnitario: 25.0,
        valorTotal: 25000,
        statusConciliacao: 'CONCILIADO',
      },
    ],
  };

  it('deve extrair particionamento de data em ano, mês e dia com 2 dígitos', () => {
    const particao = service.extrairParticionamentoData('2026-01-15T14:30:00.000Z');

    assert.equal(particao.ano, 2026);
    assert.equal(particao.mes, 1);
    assert.equal(particao.dia, 15);
    assert.equal(particao.anoStr, '2026');
    assert.equal(particao.mesStr, '01');
    assert.equal(particao.diaStr, '15');
    assert.equal(particao.caminhoParticao, '2026/01/15');
  });

  it('deve rejeitar data inválida no particionamento', () => {
    assert.throws(
      () => service.extrairParticionamentoData('data-invalida'),
      /Data inválida/
    );
  });

  it('deve gerar caminho virtual padronizado da fábrica (nfe-archive/AAAA/MM/DD/CHAVE_NFE)', () => {
    const caminhoBase = service.gerarCaminhoVirtual(
      notaFiscalExemplo.dataRecebimento,
      notaFiscalExemplo.chaveAcesso
    );
    assert.equal(
      caminhoBase,
      'nfe-archive/2026/01/15/35260112345678000190550010000012341234567890'
    );

    const caminhoXml = service.gerarCaminhoVirtual(
      notaFiscalExemplo.dataRecebimento,
      notaFiscalExemplo.chaveAcesso,
      'xml'
    );
    assert.equal(
      caminhoXml,
      'nfe-archive/2026/01/15/35260112345678000190550010000012341234567890.xml'
    );

    const caminhoDanfe = service.gerarCaminhoVirtual(
      notaFiscalExemplo.dataRecebimento,
      notaFiscalExemplo.chaveAcesso,
      '.pdf'
    );
    assert.equal(
      caminhoDanfe,
      'nfe-archive/2026/01/15/35260112345678000190550010000012341234567890.pdf'
    );
  });

  it('deve rejeitar chave de acesso com quantidade de dígitos diferente de 44', () => {
    assert.throws(
      () => service.gerarCaminhoVirtual('2026-01-15T10:00:00.000Z', '123456'),
      /Chave de acesso inválida/
    );
  });

  it('deve gerar metadados completos de arquivamento para indexação', () => {
    const metadados = service.gerarMetadadosArquivamento(notaFiscalExemplo);

    assert.equal(metadados.id, 'nf-001');
    assert.equal(metadados.chaveAcesso, notaFiscalExemplo.chaveAcesso);
    assert.ok(metadados.chaveAcessoFormatada.includes(' '));
    assert.equal(metadados.numeroNota, '1234');
    assert.equal(metadados.ano, 2026);
    assert.equal(metadados.mes, 1);
    assert.equal(metadados.dia, 15);
    assert.equal(metadados.valorTotalNota, 25000);
    assert.equal(metadados.statusConferencia, 'APROVADA');
    assert.equal(metadados.caminhoArquivoXml, 'nfe-archive/2026/01/15/35260112345678000190550010000012341234567890.xml');
    assert.equal(metadados.caminhoArquivoDanfe, 'nfe-archive/2026/01/15/35260112345678000190550010000012341234567890.pdf');
    assert.equal(metadados.quantidadeItens, 1);
    assert.ok(metadados.tagsBusca.includes('1234'));
    assert.ok(metadados.tagsBusca.includes('PED-2026-001'));
  });

  it('deve filtrar metadados por ano, fornecedor e status', () => {
    const meta1 = service.gerarMetadadosArquivamento(notaFiscalExemplo);
    const meta2 = service.gerarMetadadosArquivamento({
      ...notaFiscalExemplo,
      id: 'nf-002',
      chaveAcesso: '35251212345678000190550010000012351234567890',
      numero: '1235',
      dataRecebimento: '2025-12-20T10:00:00.000Z',
      status: 'DIVERGENTE',
      cnpjFornecedor: '98.765.432/0001-10',
      razaoSocialFornecedor: 'Ferramentas do Brasil LTDA',
      nomeFantasiaFornecedor: 'FerramentasBrasil',
      numeroPedidoCompra: 'PED-2025-999',
    });

    const acervo = [meta1, meta2];

    // Filtrar por ano 2026
    const em2026 = service.filtrarMetadados(acervo, { ano: 2026 });
    assert.equal(em2026.length, 1);
    assert.equal(em2026[0].id, 'nf-001');

    // Filtrar por status DIVERGENTE
    const divergentes = service.filtrarMetadados(acervo, { statusConferencia: 'DIVERGENTE' });
    assert.equal(divergentes.length, 1);
    assert.equal(divergentes[0].id, 'nf-002');

    // Filtrar por termo de busca do fornecedor
    const buscaNome = service.filtrarMetadados(acervo, { termoBusca: 'Metais' });
    assert.equal(buscaNome.length, 1);
    assert.equal(buscaNome[0].id, 'nf-001');

    // Filtrar por número do pedido
    const buscaPedido = service.filtrarMetadados(acervo, { numeroPedidoCompra: 'PED-2025' });
    assert.equal(buscaPedido.length, 1);
    assert.equal(buscaPedido[0].id, 'nf-002');
  });

  it('deve agrupar registros por período de ano e mês (AAAA-MM)', () => {
    const meta1 = service.gerarMetadadosArquivamento(notaFiscalExemplo);
    const meta2 = service.gerarMetadadosArquivamento({
      ...notaFiscalExemplo,
      id: 'nf-002',
      chaveAcesso: '35260112345678000190550010000012351234567890',
      numero: '1235',
      dataRecebimento: '2026-01-28T10:00:00.000Z',
    });
    const meta3 = service.gerarMetadadosArquivamento({
      ...notaFiscalExemplo,
      id: 'nf-003',
      chaveAcesso: '35260212345678000190550010000012361234567890',
      numero: '1236',
      dataRecebimento: '2026-02-05T10:00:00.000Z',
    });

    const grupos = service.agruparPorPeriodo([meta1, meta2, meta3]);

    assert.equal(Object.keys(grupos).length, 2);
    assert.equal(grupos['2026-01'].length, 2);
    assert.equal(grupos['2026-02'].length, 1);
  });

  it('deve calcular sumário estatístico do acervo de notas arquivadas', () => {
    const meta1 = service.gerarMetadadosArquivamento(notaFiscalExemplo); // R$ 25.000, APROVADA, 2026
    const meta2 = service.gerarMetadadosArquivamento({
      ...notaFiscalExemplo,
      id: 'nf-002',
      chaveAcesso: '35260112345678000190550010000012351234567890',
      valorTotalNota: 15000,
      status: 'ARQUIVADA',
    });

    const sumario = service.gerarSumario([meta1, meta2]);

    assert.equal(sumario.totalNotas, 2);
    assert.equal(sumario.valorTotalAcumulado, 40000);
    assert.equal(sumario.totalAprovadas, 1);
    assert.equal(sumario.totalArquivadas, 1);
    assert.equal(sumario.totalDivergentes, 0);
    assert.deepEqual(sumario.anosDisponiveis, [2026]);
  });
});
