import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CreateClienteSchema,
  ClienteFiltrosSchema,
  normalizarTipoParceiro,
  TIPO_PARCEIRO_LABELS,
  type TipoParceiro,
} from '../../../../core/domain/cliente.schema';

describe('Fase 5 — Módulo de Clientes, Fornecedores e Contatos Comerciais', () => {
  describe('Validações do Schema de Criação de Parceiros (CreateClienteSchema)', () => {
    it('deve validar um parceiro comercial completo com todos os campos preenchidos', () => {
      const payload = {
        tipo: 'CLIENTE' as const,
        nome: 'Grajaú Motos Distribuidora Ltda',
        documento: '12.345.678/0001-90',
        contato: 'Roberto Santos',
        telefone: '(11) 98765-4321',
        cidade: 'São Paulo',
        ativo: true,
      };

      const parsed = CreateClienteSchema.parse(payload);
      assert.equal(parsed.tipo, 'CLIENTE');
      assert.equal(parsed.nome, 'Grajaú Motos Distribuidora Ltda');
      assert.equal(parsed.documento, '12.345.678/0001-90');
      assert.equal(parsed.contato, 'Roberto Santos');
      assert.equal(parsed.telefone, '(11) 98765-4321');
      assert.equal(parsed.cidade, 'São Paulo');
      assert.equal(parsed.ativo, true);
    });

    it('deve aceitar campos opcionais vazios transformando-os em undefined', () => {
      const payloadMinimo = {
        tipo: 'FORNECEDOR' as const,
        nome: 'Aços Gerdau S.A.',
        documento: '',
        contato: '',
        telefone: '',
        cidade: '',
      };

      const parsed = CreateClienteSchema.parse(payloadMinimo);
      assert.equal(parsed.nome, 'Aços Gerdau S.A.');
      assert.equal(parsed.documento, undefined);
      assert.equal(parsed.contato, undefined);
      assert.equal(parsed.telefone, undefined);
      assert.equal(parsed.cidade, undefined);
    });

    it('deve rejeitar cadastro sem nome ou com menos de 2 caracteres', () => {
      assert.throws(() => {
        CreateClienteSchema.parse({
          tipo: 'CLIENTE',
          nome: '',
        });
      });

      assert.throws(() => {
        CreateClienteSchema.parse({
          tipo: 'CLIENTE',
          nome: 'A',
        });
      });
    });

    it('deve aceitar todos os tipos homologados: CLIENTE, FORNECEDOR, TRANSPORTADORA, OUTRO', () => {
      const tipos: TipoParceiro[] = ['CLIENTE', 'FORNECEDOR', 'TRANSPORTADORA', 'OUTRO'];

      for (const t of tipos) {
        const parsed = CreateClienteSchema.parse({
          tipo: t,
          nome: `Empresa Parceira ${t}`,
        });
        assert.equal(parsed.tipo, t);
      }
    });
  });

  describe('Normalização de Tipos de Parceiro e Rótulos (normalizarTipoParceiro)', () => {
    it('deve normalizar strings com maiúsculas, minúsculas e espaços', () => {
      assert.equal(normalizarTipoParceiro('cliente'), 'CLIENTE');
      assert.equal(normalizarTipoParceiro('Cliente'), 'CLIENTE');
      assert.equal(normalizarTipoParceiro('fornecedor'), 'FORNECEDOR');
      assert.equal(normalizarTipoParceiro('Transportadora'), 'TRANSPORTADORA');
      assert.equal(normalizarTipoParceiro('outro'), 'OUTRO');
    });

    it('deve retornar OUTRO para tipos não reconhecidos ou valores inválidos', () => {
      assert.equal(normalizarTipoParceiro('desconhecido'), 'OUTRO');
      assert.equal(normalizarTipoParceiro(null), 'OUTRO');
      assert.equal(normalizarTipoParceiro(undefined), 'OUTRO');
      assert.equal(normalizarTipoParceiro(123), 'OUTRO');
    });

    it('deve conter rótulos amigáveis em português para exibição em badges', () => {
      assert.equal(TIPO_PARCEIRO_LABELS.CLIENTE, 'Cliente');
      assert.equal(TIPO_PARCEIRO_LABELS.FORNECEDOR, 'Fornecedor');
      assert.equal(TIPO_PARCEIRO_LABELS.TRANSPORTADORA, 'Transportadora');
      assert.equal(TIPO_PARCEIRO_LABELS.OUTRO, 'Outro');
    });
  });

  describe('Filtros de Consulta de Parceiros (ClienteFiltrosSchema)', () => {
    it('deve aplicar defaults para tipo TODOS e apenasAtivos true', () => {
      const filtros = ClienteFiltrosSchema.parse({});
      assert.equal(filtros.tipo, 'TODOS');
      assert.equal(filtros.apenasAtivos, true);
    });

    it('deve validar filtro por categoria específica', () => {
      const filtros = ClienteFiltrosSchema.parse({ tipo: 'FORNECEDOR' });
      assert.equal(filtros.tipo, 'FORNECEDOR');
    });

    it('deve sanitizar termo de busca textual', () => {
      const filtros = ClienteFiltrosSchema.parse({
        busca: '  Gerdau Aços  ',
      });
      assert.equal(filtros.busca, 'Gerdau Aços');
    });
  });
});
