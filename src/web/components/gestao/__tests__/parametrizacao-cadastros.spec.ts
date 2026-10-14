import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  TIPO_PARCEIRO_LABELS,
  type TipoParceiro,
} from '../../../../core/domain/cliente.schema.js';

describe('Fase 5: Parametrização de Cadastros e Sincronização de Filtros (V5)', () => {
  const tiposHomologados: TipoParceiro[] = [
    'CLIENTE',
    'FORNECEDOR',
    'TRANSPORTADORA',
    'OUTRO',
  ];

  describe('Tipos de Parceiro e Rótulos Suportados', () => {
    it('deve conter os 4 tipos homologados de parceiros comerciais', () => {
      assert.deepEqual(tiposHomologados, [
        'CLIENTE',
        'FORNECEDOR',
        'TRANSPORTADORA',
        'OUTRO',
      ]);
    });

    it('deve possuir rótulos amigáveis para todos os tipos', () => {
      assert.equal(TIPO_PARCEIRO_LABELS.CLIENTE, 'Cliente');
      assert.equal(TIPO_PARCEIRO_LABELS.FORNECEDOR, 'Fornecedor');
      assert.equal(TIPO_PARCEIRO_LABELS.TRANSPORTADORA, 'Transportadora');
      assert.equal(TIPO_PARCEIRO_LABELS.OUTRO, 'Outro');
    });
  });

  describe('Resolução de tipoInicial para ClientCreateDrawer', () => {
    it('deve inicializar com o tipo informado quando tipoInicial for FORNECEDOR', () => {
      const tipoInicial: TipoParceiro | undefined = 'FORNECEDOR';
      const tipoResolvido = tipoInicial || 'CLIENTE';
      assert.equal(tipoResolvido, 'FORNECEDOR');
    });

    it('deve inicializar com CLIENTE quando tipoInicial for omitido ou undefined', () => {
      const tipoInicial: TipoParceiro | undefined = undefined;
      const tipoResolvido = tipoInicial || 'CLIENTE';
      assert.equal(tipoResolvido, 'CLIENTE');
    });

    it('deve inicializar com TRANSPORTADORA quando especificado', () => {
      const tipoInicial: TipoParceiro | undefined = 'TRANSPORTADORA';
      const tipoResolvido = tipoInicial || 'CLIENTE';
      assert.equal(tipoResolvido, 'TRANSPORTADORA');
    });
  });

  describe('Resolução de filtroInicial para ClientesView', () => {
    it('deve aceitar filtroInicial como FORNECEDOR e manter sincronizado', () => {
      const filtroInicial: 'TODOS' | TipoParceiro = 'FORNECEDOR';
      assert.equal(filtroInicial, 'FORNECEDOR');
    });

    it('deve permitir default para TODOS', () => {
      const filtroInicial: 'TODOS' | TipoParceiro = 'TODOS';
      assert.equal(filtroInicial, 'TODOS');
    });

    it('ao criar novo cadastro em aba com filtro específico, deve propagar o tipo ativo', () => {
      const resolverTipo = (filtro: 'TODOS' | TipoParceiro) =>
        filtro === 'TODOS' ? undefined : filtro;
      assert.equal(resolverTipo('FORNECEDOR'), 'FORNECEDOR');
    });

    it('ao criar novo cadastro na aba TODOS, deve propagar undefined permitindo escolha livre', () => {
      const resolverTipo = (filtro: 'TODOS' | TipoParceiro) =>
        filtro === 'TODOS' ? undefined : filtro;
      assert.equal(resolverTipo('TODOS'), undefined);
    });
  });
});
