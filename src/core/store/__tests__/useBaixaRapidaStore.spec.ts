import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { useBaixaRapidaStore } from '../useBaixaRapidaStore';
import { Colaborador } from '../../domain/colaborador.schema';
import { Item } from '../../domain/item.schema';
import { RegistrarBaixaLoteSchema } from '../../domain/movimentacao.schema';

describe('5.1 — Store de Baixa Rápida / Carrinho de Retirada (useBaixaRapidaStore)', () => {
  const colaboradorTeste: Colaborador = {
    id: 'colab-001',
    matricula: '042',
    nome: 'Carlos Silva',
    setor: 'SOLDA',
    funcao: 'Soldador TIG',
    ativo: true,
  };

  const itemFlap: Item = {
    id: 'item-flap-1',
    codigo: '90-1105',
    descricao: 'Disco Flap 4.1/2 Grão 60',
    tipo: 'IMPRODUTIVO_CONSUMIVEL',
    unidade: 'UNIDADE',
    estoqueAtual: 50,
    estoqueSeguranca: 10,
    ativo: true,
    embalagem: { possuiEmbalagem: false, fatorConversao: 1 },
  };

  const itemBroca: Item = {
    id: 'item-broca-1',
    codigo: '90-2001',
    descricao: 'Broca Aço Rápido 6mm',
    tipo: 'IMPRODUTIVO_CONSUMIVEL',
    unidade: 'UNIDADE',
    estoqueAtual: 5,
    estoqueSeguranca: 2,
    ativo: true,
    embalagem: { possuiEmbalagem: false, fatorConversao: 1 },
  };

  beforeEach(() => {
    useBaixaRapidaStore.getState().reset();
  });

  it('deve selecionar colaborador e herdar automaticamente seu setor', () => {
    const store = useBaixaRapidaStore.getState();

    store.selecionarColaborador(colaboradorTeste);
    const estadoAtualizado = useBaixaRapidaStore.getState();

    assert.equal(estadoAtualizado.colaboradorSelecionado?.id, 'colab-001');
    assert.equal(estadoAtualizado.colaboradorSelecionado?.nome, 'Carlos Silva');
    assert.equal(estadoAtualizado.setorDestino, 'SOLDA');

    // Permite sobrescrever o setor de destino se retirado para outra área
    estadoAtualizado.definirSetorDestino('MONTAGEM');
    assert.equal(useBaixaRapidaStore.getState().setorDestino, 'MONTAGEM');

    // Desmarcar colaborador
    useBaixaRapidaStore.getState().desmarcarColaborador();
    assert.equal(useBaixaRapidaStore.getState().colaboradorSelecionado, null);
    assert.equal(useBaixaRapidaStore.getState().setorDestino, null);
  });

  it('deve adicionar múltiplos itens ao carrinho acumulando quantidades', () => {
    const store = useBaixaRapidaStore.getState();

    store.adicionarItem(itemFlap, 2);
    assert.equal(useBaixaRapidaStore.getState().itens.length, 1);
    assert.equal(useBaixaRapidaStore.getState().obterTotalItensDiferentes(), 1);
    assert.equal(useBaixaRapidaStore.getState().obterTotalUnidadesFisicas(), 2);

    // Adiciona o mesmo item novamente (deve somar)
    useBaixaRapidaStore.getState().adicionarItem(itemFlap, 3);
    assert.equal(useBaixaRapidaStore.getState().itens.length, 1);
    assert.equal(useBaixaRapidaStore.getState().obterTotalUnidadesFisicas(), 5);

    // Adiciona outro item
    useBaixaRapidaStore.getState().adicionarItem(itemBroca, 1);
    assert.equal(useBaixaRapidaStore.getState().itens.length, 2);
    assert.equal(useBaixaRapidaStore.getState().obterTotalItensDiferentes(), 2);
    assert.equal(useBaixaRapidaStore.getState().obterTotalUnidadesFisicas(), 6);
  });

  it('deve manipular incremento, decremento e remoção de itens', () => {
    const store = useBaixaRapidaStore.getState();
    store.adicionarItem(itemFlap, 3);

    // Incrementar
    store.incrementarItem(itemFlap.id, 2);
    assert.equal(useBaixaRapidaStore.getState().itens[0].quantidade, 5);

    // Decrementar
    store.decrementarItem(itemFlap.id, 1);
    assert.equal(useBaixaRapidaStore.getState().itens[0].quantidade, 4);

    // Decrementar além do saldo remove o item
    store.decrementarItem(itemFlap.id, 10);
    assert.equal(useBaixaRapidaStore.getState().itens.length, 0);

    // Adicionar e remover diretamente
    store.adicionarItem(itemBroca, 2);
    assert.equal(useBaixaRapidaStore.getState().itens.length, 1);
    store.removerItem(itemBroca.id);
    assert.equal(useBaixaRapidaStore.getState().itens.length, 0);
  });

  it('deve validar disponibilidade de estoque e impedir prontidão com saldo insuficiente', () => {
    const store = useBaixaRapidaStore.getState();
    store.selecionarColaborador(colaboradorTeste);

    // Item broca tem estoqueAtual: 5. Adicionando 8 unidades.
    store.adicionarItem(itemBroca, 8);

    const validacao = useBaixaRapidaStore.getState().validarDisponibilidadeGeral();
    assert.equal(validacao.valido, false);
    assert.equal(validacao.itensComEstoqueInsuficiente.length, 1);
    assert.equal(validacao.itensComEstoqueInsuficiente[0].itemId, itemBroca.id);
    assert.equal(validacao.itensComEstoqueInsuficiente[0].quantidadeDesejada, 8);
    assert.equal(validacao.itensComEstoqueInsuficiente[0].estoqueAtual, 5);

    // Não está pronto para confirmar por falta de estoque
    assert.equal(useBaixaRapidaStore.getState().estaProntoParaConfirmar(), false);

    // Ajusta quantidade para 3 (dentro do estoque de 5)
    store.atualizarQuantidade(itemBroca.id, 3);
    assert.equal(useBaixaRapidaStore.getState().validarDisponibilidadeGeral().valido, true);
    assert.equal(useBaixaRapidaStore.getState().estaProntoParaConfirmar(), true);
  });

  it('deve gerar payload válido para RegistrarBaixaLoteSchema', () => {
    const store = useBaixaRapidaStore.getState();
    store.selecionarColaborador(colaboradorTeste);
    store.definirObservacaoGeral('Troca de turno da oficina');
    store.adicionarItem(itemFlap, 2);
    store.adicionarItem(itemBroca, 1);
    store.definirObservacaoItem(itemBroca.id, 'Broca quebrou na furadeira');

    const payload = useBaixaRapidaStore.getState().obterPayloadBaixaLote();

    assert.notEqual(payload, null);
    assert.equal(payload?.colaboradorId, 'colab-001');
    assert.equal(payload?.setor, 'SOLDA');
    assert.equal(payload?.observacaoGeral, 'Troca de turno da oficina');
    assert.equal(payload?.itens.length, 2);
    assert.equal(payload?.itens[1].observacao, 'Broca quebrou na furadeira');

    // Valida contra o schema Zod de baixa em lote
    const validado = RegistrarBaixaLoteSchema.parse(payload);
    assert.equal(validado.colaboradorId, 'colab-001');
    assert.equal(validado.itens.length, 2);
  });

  it('deve limpar carrinho e resetar estado completamente', () => {
    const store = useBaixaRapidaStore.getState();
    store.selecionarColaborador(colaboradorTeste);
    store.adicionarItem(itemFlap, 1);
    store.definirObservacaoGeral('Teste');

    store.limparCarrinho();
    assert.equal(useBaixaRapidaStore.getState().itens.length, 0);
    assert.notEqual(useBaixaRapidaStore.getState().colaboradorSelecionado, null);

    store.reset();
    assert.equal(useBaixaRapidaStore.getState().colaboradorSelecionado, null);
    assert.equal(useBaixaRapidaStore.getState().observacaoGeral, '');
    assert.equal(useBaixaRapidaStore.getState().itens.length, 0);
  });
});
