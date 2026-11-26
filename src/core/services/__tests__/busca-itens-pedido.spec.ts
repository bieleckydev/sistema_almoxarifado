import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  avaliarSaldoLinha,
  buscarItensParaPedido,
  type ItemBuscavelPedido,
} from '../busca-itens-pedido';

const item = (over: Partial<ItemBuscavelPedido> & Pick<ItemBuscavelPedido, 'id'>): ItemBuscavelPedido => ({
  codigo: over.id.toUpperCase(),
  descricao: `Item ${over.id}`,
  categoria: 'mp',
  estoqueAtual: 10,
  unidade: 'UNIDADE',
  ...over,
});

const catalogo: ItemBuscavelPedido[] = [
  item({ id: 'tubo', codigo: '10-0001', descricao: 'Tubo de aço 1"', categoria: 'mp', estoqueAtual: 40 }),
  item({ id: 'chapa', codigo: '20-0002', descricao: 'Chapa de aço 3mm', categoria: 'mp', estoqueAtual: 0 }),
  item({ id: 'flap', codigo: '90-0010', descricao: 'Disco flap grão 80', categoria: 'imp', estoqueAtual: 12 }),
  item({ id: 'luva', codigo: '90-0011', descricao: 'Luva de raspa', categoria: 'imp', estoqueAtual: 0 }),
  item({ id: 'suporte', codigo: '100-0245', descricao: 'Suporte de placa CG', categoria: 'motos', estoqueAtual: 5 }),
  item({ id: 'bagageiro', codigo: '100-0248', descricao: 'Bagageiro traseiro', categoria: 'motos', estoqueAtual: 2, localizacaoFisica: 'Rua A' }),
  item({ id: 'inativo', codigo: '100-0999', descricao: 'Suporte antigo', categoria: 'motos', estoqueAtual: 9, ativo: false }),
];

describe('buscarItensParaPedido', () => {
  it('oculta itens sem saldo e inativos por padrão', () => {
    const { resultados, ocultosSemSaldo } = buscarItensParaPedido(catalogo);
    const ids = resultados.map((i) => i.id);
    assert.ok(!ids.includes('chapa'));
    assert.ok(!ids.includes('luva'));
    assert.ok(!ids.includes('inativo'));
    assert.equal(ocultosSemSaldo, 2);
  });

  it('inclui zerados quando pedido, depois dos itens com saldo', () => {
    const { resultados } = buscarItensParaPedido(catalogo, { categoria: 'imp', incluirSemSaldo: true });
    assert.deepEqual(resultados.map((i) => i.id), ['flap', 'luva']);
  });

  it('respeita a categoria e conta resultados por categoria', () => {
    const { resultados, contagemPorCategoria } = buscarItensParaPedido(catalogo, { categoria: 'motos' });
    assert.deepEqual(resultados.map((i) => i.id).sort(), ['bagageiro', 'suporte']);
    assert.deepEqual(contagemPorCategoria, { todas: 4, mp: 1, imp: 1, motos: 2 });
  });

  it('conta por categoria considerando o termo digitado', () => {
    const { contagemPorCategoria } = buscarItensParaPedido(catalogo, { termo: 'aço' });
    assert.deepEqual(contagemPorCategoria, { todas: 1, mp: 1, imp: 0, motos: 0 });
  });

  it('casa termos sem acento e em qualquer ordem', () => {
    const { resultados } = buscarItensParaPedido(catalogo, { termo: 'aco tubo' });
    assert.deepEqual(resultados.map((i) => i.id), ['tubo']);
  });

  it('prioriza código exato e prefixo de código', () => {
    const { resultados } = buscarItensParaPedido(catalogo, { termo: '100-0248' });
    assert.equal(resultados[0].id, 'bagageiro');
    const prefixo = buscarItensParaPedido(catalogo, { termo: '100-02' });
    assert.deepEqual(prefixo.resultados.map((i) => i.id), ['bagageiro', 'suporte']);
  });

  it('busca também pela localização física', () => {
    const { resultados } = buscarItensParaPedido(catalogo, { termo: 'rua a' });
    assert.deepEqual(resultados.map((i) => i.id), ['bagageiro']);
  });

  it('aplica o limite sem perder o total encontrado', () => {
    const { resultados, totalEncontrado } = buscarItensParaPedido(catalogo, { limite: 2 });
    assert.equal(resultados.length, 2);
    assert.equal(totalEncontrado, 4);
  });
});

describe('avaliarSaldoLinha', () => {
  it('indica déficit quando a quantidade passa do saldo', () => {
    assert.deepEqual(avaliarSaldoLinha(12, 10), { excede: true, deficit: 2 });
  });

  it('não indica déficit quando há saldo suficiente', () => {
    assert.deepEqual(avaliarSaldoLinha(10, 10), { excede: false, deficit: 0 });
  });

  it('trata saldo negativo como zero e arredonda frações', () => {
    assert.deepEqual(avaliarSaldoLinha(1.5, -3), { excede: true, deficit: 1.5 });
    assert.deepEqual(avaliarSaldoLinha(0.3, 0.1), { excede: true, deficit: 0.2 });
  });
});
