import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  toIsoString,
  sanitizeForFirestore,
  itemFromFirestore,
  itemToFirestore,
  colaboradorFromFirestore,
  colaboradorToFirestore,
  movimentacaoFromFirestore,
  movimentacaoToFirestore,
} from '../firestore-estoque.mapper';
import { Item } from '@/core/domain/item.schema';
import { Colaborador } from '@/core/domain/colaborador.schema';
import { Movimentacao } from '@/core/domain/movimentacao.schema';

describe('Fase 1 — Mapeadores e Sanitizadores Firestore (firestore-estoque.mapper)', () => {
  describe('toIsoString', () => {
    it('deve converter mock de Firestore Timestamp (objeto com toDate)', () => {
      const mockTimestamp = {
        toDate: () => new Date('2026-10-01T15:30:00.000Z'),
      };
      const result = toIsoString(mockTimestamp);
      assert.equal(result, '2026-10-01T15:30:00.000Z');
    });

    it('deve converter objeto Date nativo', () => {
      const date = new Date('2026-05-10T12:00:00.000Z');
      assert.equal(toIsoString(date), '2026-05-10T12:00:00.000Z');
    });

    it('deve preservar string ISO válida', () => {
      const iso = '2026-08-20T09:15:00.000Z';
      assert.equal(toIsoString(iso), iso);
    });

    it('deve converter número epoch em milissegundos', () => {
      const epochMs = 1790000000000;
      const expected = new Date(epochMs).toISOString();
      assert.equal(toIsoString(epochMs), expected);
    });

    it('deve retornar undefined para valores nulos, vazios ou indefinidos', () => {
      assert.equal(toIsoString(null), undefined);
      assert.equal(toIsoString(undefined), undefined);
      assert.equal(toIsoString(''), undefined);
    });
  });

  describe('sanitizeForFirestore', () => {
    it('deve remover propriedades undefined recursivamente', () => {
      const payload = {
        id: '123',
        nome: 'Teste',
        indefinido: undefined,
        aninhado: {
          ativo: true,
          opcional: undefined,
          zero: 0,
          falso: false,
          nulo: null,
        },
      };

      const sanitizado = sanitizeForFirestore(payload);
      assert.equal('indefinido' in sanitizado, false);
      assert.equal('opcional' in sanitizado.aninhado, false);
      assert.equal(sanitizado.aninhado.zero, 0);
      assert.equal(sanitizado.aninhado.falso, false);
      assert.equal(sanitizado.aninhado.nulo, null);
    });
  });

  describe('itemFromFirestore & itemToFirestore', () => {
    it('deve converter documento Firestore com Timestamp para entidade Item válida', () => {
      const docRaw = {
        codigo: '90-1105',
        descricao: 'Disco Flap Grão 60',
        tipo: 'IMPRODUTIVO_CONSUMIVEL',
        unidade: 'UNIDADE',
        estoqueSeguranca: 20,
        estoqueAtual: 35,
        embalagem: { possuiEmbalagem: false, fatorConversao: 1 },
        ativo: true,
        createdAt: { toDate: () => new Date('2026-01-10T10:00:00.000Z') },
        updatedAt: { toDate: () => new Date('2026-01-15T10:00:00.000Z') },
      };

      const item = itemFromFirestore('doc-flap-1', docRaw);
      assert.equal(item.id, 'doc-flap-1');
      assert.equal(item.codigo, '90-1105');
      assert.equal(item.createdAt, '2026-01-10T10:00:00.000Z');
      assert.equal(item.updatedAt, '2026-01-15T10:00:00.000Z');
    });

    it('deve sanitizar item antes de persistir no Firestore', () => {
      const item: Item = {
        id: 'item-10-3812',
        codigo: '10-3812',
        descricao: 'Tubo de Aço Carbono',
        tipo: 'PRODUTIVO_MATERIA_PRIMA',
        unidade: 'KG',
        estoqueSeguranca: 100,
        estoqueAtual: 500,
        ativo: true,
        embalagem: { possuiEmbalagem: false, fatorConversao: 1 },
        clienteDestino: undefined,
        observacoes: undefined,
      };

      const firestoreDoc = itemToFirestore(item);
      assert.equal('clienteDestino' in firestoreDoc, false);
      assert.equal('observacoes' in firestoreDoc, false);
      assert.equal(firestoreDoc.codigo, '10-3812');
      assert(typeof firestoreDoc.updatedAt === 'string');
    });
  });

  describe('colaboradorFromFirestore & colaboradorToFirestore', () => {
    it('deve normalizar matrícula e campos do colaborador a partir do Firestore', () => {
      const docRaw = {
        matricula: '42', // deve virar '042'
        nome: 'João da Silva',
        setor: 'SOLDA',
        funcao: 'Soldador TIG',
        ativo: true,
      };

      const colab = colaboradorFromFirestore('colab-joao', docRaw);
      assert.equal(colab.id, 'colab-joao');
      assert.equal(colab.matricula, '042');
      assert.equal(colab.setor, 'SOLDA');
    });

    it('deve sanitizar colaborador para persistência', () => {
      const colab: Colaborador = {
        id: 'colab-1',
        matricula: '042',
        nome: 'Carlos Eduardo',
        setor: 'FERRAMENTARIA',
        funcao: 'Ferramenteiro',
        ativo: true,
        telefone: undefined,
      };

      const doc = colaboradorToFirestore(colab);
      assert.equal('telefone' in doc, false);
      assert.equal(doc.matricula, '042');
    });
  });

  describe('movimentacaoFromFirestore & movimentacaoToFirestore', () => {
    it('deve converter documento de movimentação com Timestamp e id derivado', () => {
      const docRaw = {
        itemId: 'item-90-1105',
        tipo: 'SAIDA_CONSUMO_INTERNO',
        quantidade: 5,
        saldoAnterior: 30,
        saldoResultante: 25,
        dataMovimentacao: { toDate: () => new Date('2026-10-05T14:00:00.000Z') },
        colaboradorId: 'colab-1',
        setor: 'FERRAMENTARIA',
      };

      const mov = movimentacaoFromFirestore('mov-100', docRaw);
      assert.equal(mov.id, 'mov-100');
      assert.equal(mov.dataMovimentacao, '2026-10-05T14:00:00.000Z');
      assert.equal(mov.saldoResultante, 25);
    });

    it('deve sanitizar movimentação para o Firestore', () => {
      const mov: Movimentacao = {
        id: 'mov-1',
        itemId: 'item-1',
        tipo: 'ENTRADA_COMPRA',
        quantidade: 100,
        saldoAnterior: 0,
        saldoResultante: 100,
        dataMovimentacao: '2026-10-05T10:00:00.000Z',
        numeroNF: undefined,
        destinatario: undefined,
      };

      const doc = movimentacaoToFirestore(mov);
      assert.equal('numeroNF' in doc, false);
      assert.equal('destinatario' in doc, false);
      assert.equal(doc.id, 'mov-1');
    });
  });
});
