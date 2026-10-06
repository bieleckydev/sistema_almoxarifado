import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ClienteSchema,
  CreateClienteSchema,
  UpdateClienteSchema,
  ClienteFiltrosSchema,
  normalizarTipoParceiro,
  TIPO_PARCEIRO_LABELS,
} from '../cliente.schema';

describe('Cliente e Parceiro Domain Schemas', () => {
  it('deve normalizar tipos de parceiros em diferentes formatos e maiúsculas/minúsculas', () => {
    assert.strictEqual(normalizarTipoParceiro('Cliente'), 'CLIENTE');
    assert.strictEqual(normalizarTipoParceiro('cliente'), 'CLIENTE');
    assert.strictEqual(normalizarTipoParceiro('Fornecedor'), 'FORNECEDOR');
    assert.strictEqual(normalizarTipoParceiro('transportadora'), 'TRANSPORTADORA');
    assert.strictEqual(normalizarTipoParceiro('Outro'), 'OUTRO');
    assert.strictEqual(normalizarTipoParceiro('Desconhecido'), 'OUTRO');
  });

  it('deve possuir rótulos amigáveis em português para todos os tipos', () => {
    assert.strictEqual(TIPO_PARCEIRO_LABELS.CLIENTE, 'Cliente');
    assert.strictEqual(TIPO_PARCEIRO_LABELS.FORNECEDOR, 'Fornecedor');
    assert.strictEqual(TIPO_PARCEIRO_LABELS.TRANSPORTADORA, 'Transportadora');
    assert.strictEqual(TIPO_PARCEIRO_LABELS.OUTRO, 'Outro');
  });

  it('deve validar e instanciar um cliente válido com dados completos', () => {
    const raw = {
      id: 'cli-01',
      tipo: 'Cliente',
      nome: 'Metalúrgica Horizonte',
      documento: '00.000.000/0001-01',
      contato: 'Marcos Lima',
      telefone: '(11) 90000-0001',
      cidade: 'São Paulo',
      ativo: true,
    };

    const cliente = ClienteSchema.parse(raw);
    assert.strictEqual(cliente.id, 'cli-01');
    assert.strictEqual(cliente.tipo, 'CLIENTE');
    assert.strictEqual(cliente.nome, 'Metalúrgica Horizonte');
    assert.strictEqual(cliente.documento, '00.000.000/0001-01');
    assert.strictEqual(cliente.cidade, 'São Paulo');
    assert.strictEqual(cliente.ativo, true);
  });

  it('deve transformar strings vazias em undefined para campos opcionais', () => {
    const raw = {
      id: 'cli-02',
      tipo: 'FORNECEDOR',
      nome: 'Aços Santa Rita',
      documento: '   ',
      contato: '',
      telefone: '',
      cidade: '',
    };

    const cliente = ClienteSchema.parse(raw);
    assert.strictEqual(cliente.documento, undefined);
    assert.strictEqual(cliente.contato, undefined);
    assert.strictEqual(cliente.telefone, undefined);
    assert.strictEqual(cliente.cidade, undefined);
  });

  it('deve falhar se o nome tiver menos de 2 caracteres', () => {
    assert.throws(
      () => {
        ClienteSchema.parse({
          id: 'cli-03',
          tipo: 'CLIENTE',
          nome: 'A',
        });
      },
      (err: Error) => err.message.includes('mínimo 2 caracteres')
    );
  });

  it('deve validar criação de novo parceiro via CreateClienteSchema', () => {
    const input = {
      tipo: 'Transportadora',
      nome: 'Rápido Sul Transportes',
      telefone: '(11) 90000-0006',
    };

    const validado = CreateClienteSchema.parse(input);
    assert.strictEqual(validado.tipo, 'TRANSPORTADORA');
    assert.strictEqual(validado.nome, 'Rápido Sul Transportes');
    assert.strictEqual(validado.ativo, true);
  });

  it('deve validar atualização de dados via UpdateClienteSchema', () => {
    const input = {
      id: 'cli-01',
      telefone: '(11) 99999-8888',
    };

    const validado = UpdateClienteSchema.parse(input);
    assert.strictEqual(validado.id, 'cli-01');
    assert.strictEqual(validado.telefone, '(11) 99999-8888');
  });

  it('deve validar filtros de busca de clientes', () => {
    const filtrosPadrao = ClienteFiltrosSchema.parse({});
    assert.strictEqual(filtrosPadrao.tipo, 'TODOS');
    assert.strictEqual(filtrosPadrao.apenasAtivos, true);

    const filtrosCustom = ClienteFiltrosSchema.parse({
      tipo: 'CLIENTE',
      busca: 'Horizonte',
      apenasAtivos: false,
    });
    assert.strictEqual(filtrosCustom.tipo, 'CLIENTE');
    assert.strictEqual(filtrosCustom.busca, 'Horizonte');
    assert.strictEqual(filtrosCustom.apenasAtivos, false);
  });
});
