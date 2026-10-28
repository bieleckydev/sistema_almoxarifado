import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  podeExecutar,
  podeAcessarTela,
  ACOES_PERMISSAO,
  ROTULO_PAPEL,
  type AcaoPermissao,
} from '../permissions';

describe('Permissões Operacionais do Protótipo 3.0 (permissions.ts)', () => {
  it('Administrador (mestre) deve ter permissão irrestrita para todas as 13 ações', () => {
    for (const acao of ACOES_PERMISSAO) {
      assert.equal(podeExecutar('mestre', acao), true, `mestre deve ter acesso à ação ${acao}`);
    }
  });

  it('Gestor (admin) deve ter permissão para todas as ações operacionais e de controle', () => {
    const acoesGestor: AcaoPermissao[] = [
      'mover',
      'cadastrar',
      'editar',
      'estornar',
      'ajustar',
      'faturar',
      'vender',
      'cadastros',
      'terceiros',
      'aprovar',
      'requisitar',
      'entregar',
      'auditar',
    ];
    for (const acao of acoesGestor) {
      assert.equal(podeExecutar('admin', acao), true, `admin deve ter acesso à ação ${acao}`);
    }
  });

  it('Almoxarife (operador) não pode aprovar, estornar, ajustar, faturar nem auditar', () => {
    assert.equal(podeExecutar('operador', 'mover'), true);
    assert.equal(podeExecutar('operador', 'cadastrar'), true);
    assert.equal(podeExecutar('operador', 'editar'), true);
    assert.equal(podeExecutar('operador', 'vender'), true);
    assert.equal(podeExecutar('operador', 'cadastros'), true);
    assert.equal(podeExecutar('operador', 'terceiros'), true);
    assert.equal(podeExecutar('operador', 'requisitar'), true);
    assert.equal(podeExecutar('operador', 'entregar'), true);

    // Proibições expressas do 3.0
    assert.equal(podeExecutar('operador', 'estornar'), false);
    assert.equal(podeExecutar('operador', 'ajustar'), false);
    assert.equal(podeExecutar('operador', 'faturar'), false);
    assert.equal(podeExecutar('operador', 'aprovar'), false);
    assert.equal(podeExecutar('operador', 'auditar'), false);
  });

  it('Produção (requisitante) só pode requisitar', () => {
    assert.equal(podeExecutar('requisitante', 'requisitar'), true);
    assert.equal(podeExecutar('requisitante', 'mover'), false);
    assert.equal(podeExecutar('requisitante', 'cadastrar'), false);
    assert.equal(podeExecutar('requisitante', 'editar'), false);
    assert.equal(podeExecutar('requisitante', 'estornar'), false);
    assert.equal(podeExecutar('requisitante', 'ajustar'), false);
    assert.equal(podeExecutar('requisitante', 'faturar'), false);
    assert.equal(podeExecutar('requisitante', 'vender'), false);
    assert.equal(podeExecutar('requisitante', 'cadastros'), false);
    assert.equal(podeExecutar('requisitante', 'terceiros'), false);
    assert.equal(podeExecutar('requisitante', 'aprovar'), false);
    assert.equal(podeExecutar('requisitante', 'entregar'), false);
    assert.equal(podeExecutar('requisitante', 'auditar'), false);
  });

  it('podeAcessarTela deve controlar visibilidade conforme a regra VER do 3.0', () => {
    // Telas públicas / básicas (Início e Estoques principais)
    assert.equal(podeAcessarTela('requisitante', 'inicio'), true);
    assert.equal(podeAcessarTela('requisitante', 'mp'), true);
    assert.equal(podeAcessarTela('requisitante', 'imp'), true);
    assert.equal(podeAcessarTela('requisitante', 'motos'), true);

    // Faturamento (só quem fatura: mestre, admin)
    assert.equal(podeAcessarTela('mestre', 'fat'), true);
    assert.equal(podeAcessarTela('admin', 'fat'), true);
    assert.equal(podeAcessarTela('operador', 'fat'), false);
    assert.equal(podeAcessarTela('requisitante', 'fat'), false);

    // Inventário (só quem ajusta: mestre, admin)
    assert.equal(podeAcessarTela('admin', 'inv'), true);
    assert.equal(podeAcessarTela('operador', 'inv'), false);

    // Auditoria (só quem audita: mestre, admin)
    assert.equal(podeAcessarTela('admin', 'aud'), true);
    assert.equal(podeAcessarTela('operador', 'aud'), false);

    // Terceiros (mestre, admin, operador)
    assert.equal(podeAcessarTela('operador', 'terc'), true);
    assert.equal(podeAcessarTela('requisitante', 'terc'), false);

    // Vendas e Clientes (mestre, admin, operador)
    assert.equal(podeAcessarTela('operador', 'vendas'), true);
    assert.equal(podeAcessarTela('operador', 'clientes'), true);
    assert.equal(podeAcessarTela('requisitante', 'vendas'), false);
    assert.equal(podeAcessarTela('requisitante', 'clientes'), false);

    // Requisições (mestre, admin, operador e requisitante podem acessar)
    assert.equal(podeAcessarTela('requisitante', 'req'), true);
    assert.equal(podeAcessarTela('operador', 'req'), true);
    assert.equal(podeAcessarTela('admin', 'req'), true);

    // Gestão de Usuários (exclusivo para mestre)
    assert.equal(podeAcessarTela('mestre', 'usuarios'), true);
    assert.equal(podeAcessarTela('admin', 'usuarios'), false);
    assert.equal(podeAcessarTela('operador', 'usuarios'), false);
    assert.equal(podeAcessarTela('requisitante', 'usuarios'), false);
    assert.equal(podeAcessarTela(null, 'usuarios'), false);
  });

  it('ROTULO_PAPEL deve fornecer os nomes exatos do Protótipo 3.0', () => {
    assert.equal(ROTULO_PAPEL.mestre, 'Administrador');
    assert.equal(ROTULO_PAPEL.admin, 'Gestor');
    assert.equal(ROTULO_PAPEL.operador, 'Almoxarife');
    assert.equal(ROTULO_PAPEL.requisitante, 'Produção');
  });
});
