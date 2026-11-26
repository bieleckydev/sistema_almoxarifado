import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CreatePedidoSchema,
  PedidoSchema,
  SETORES_DESTINO_PADRAO,
  SETOR_DESTINO_PADRAO,
  SetorDestinoSchema,
  UpdatePedidoSchema,
  montarCatalogoSetoresDestino,
  normalizarSetorDestino,
  rotuloSetorDestino,
} from '../pedido.schema';

const pedidoBase = {
  clienteId: 'cli-001',
  prazoEntrega: '2026-12-01',
  itens: [{ itemId: 'item-1', quantidade: 2 }],
};

describe('Setor de destino do pedido', () => {
  it('expõe o catálogo padrão sem códigos repetidos', () => {
    const codigos = SETORES_DESTINO_PADRAO.map((s) => s.codigo);
    assert.deepEqual(codigos, ['PRODUCAO', 'EXPEDICAO', 'OFICINA', 'MONTAGEM', 'CLIENTE_EXTERNO']);
    assert.equal(new Set(codigos).size, codigos.length);
    assert.ok(codigos.includes(SETOR_DESTINO_PADRAO));
  });

  it('normaliza acentos, caixa, separadores e aliases legados', () => {
    assert.equal(normalizarSetorDestino('Expedição'), 'EXPEDICAO');
    assert.equal(normalizarSetorDestino('  produção '), 'PRODUCAO');
    assert.equal(normalizarSetorDestino('Logística'), 'EXPEDICAO');
    assert.equal(normalizarSetorDestino('Linha de Montagem'), 'MONTAGEM');
    assert.equal(normalizarSetorDestino('Terceiros / Cliente Externo'), 'CLIENTE_EXTERNO');
    assert.equal(normalizarSetorDestino('Cliente'), 'CLIENTE_EXTERNO');
  });

  it('aceita destinos novos fora do catálogo', () => {
    assert.equal(SetorDestinoSchema.parse('Pintura Eletrostática'), 'PINTURA_ELETROSTATICA');
  });

  it('rejeita destinos vazios ou só com símbolos', () => {
    assert.throws(() => SetorDestinoSchema.parse(''));
    assert.throws(() => SetorDestinoSchema.parse(' / '));
  });

  it('assume Expedição na criação quando o setor não é informado', () => {
    assert.equal(CreatePedidoSchema.parse(pedidoBase).setorDestino, 'EXPEDICAO');
    assert.equal(
      CreatePedidoSchema.parse({ ...pedidoBase, setorDestino: 'Oficina' }).setorDestino,
      'OFICINA'
    );
  });

  it('mantém pedidos legados sem setor válidos', () => {
    const legado = PedidoSchema.parse({ ...pedidoBase, id: 'order-101', numeroSequencial: 101 });
    assert.equal(legado.setorDestino, undefined);
  });

  it('valida o setor também na atualização', () => {
    assert.equal(UpdatePedidoSchema.parse({ id: 'order-1', setorDestino: 'montagem' }).setorDestino, 'MONTAGEM');
    assert.throws(() => UpdatePedidoSchema.parse({ id: 'order-1', setorDestino: '-' }));
  });

  it('soma destinos extras ao catálogo sem duplicar', () => {
    const catalogo = montarCatalogoSetoresDestino([
      { rotulo: 'Pintura' },
      { rotulo: 'Expedição' },
      { rotulo: 'pintura' },
    ]);
    assert.equal(catalogo.length, SETORES_DESTINO_PADRAO.length + 1);
    assert.deepEqual(catalogo.at(-1), { codigo: 'PINTURA', rotulo: 'Pintura' });
  });

  it('gera rótulos legíveis para códigos conhecidos e livres', () => {
    assert.equal(rotuloSetorDestino('CLIENTE_EXTERNO'), 'Terceiros / Cliente Externo');
    assert.equal(rotuloSetorDestino('expedição'), 'Expedição');
    assert.equal(rotuloSetorDestino('PINTURA_ELETROSTATICA'), 'Pintura Eletrostatica');
    assert.equal(rotuloSetorDestino(undefined), '');
  });
});
