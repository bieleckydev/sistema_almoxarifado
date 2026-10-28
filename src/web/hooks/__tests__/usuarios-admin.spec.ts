import { describe, it } from 'node:test';
import assert from 'node:assert';
import { podeAcessarTela } from '@/core/domain/permissions';
import { obterModuloDeTela } from '@/web/data/mock-almoxarifado';
import { filtrarMenuPorPerfil } from '@/web/data/navegacao';

describe('Gestão de Usuários — Navegação e Acesso Administrativo', () => {
  it('apenas usuário com papel "mestre" pode acessar a tela "usuarios"', () => {
    assert.strictEqual(podeAcessarTela('mestre', 'usuarios'), true);
    assert.strictEqual(podeAcessarTela('admin', 'usuarios'), false);
    assert.strictEqual(podeAcessarTela('operador', 'usuarios'), false);
    assert.strictEqual(podeAcessarTela('requisitante', 'usuarios'), false);
    assert.strictEqual(podeAcessarTela(null, 'usuarios'), false);
    assert.strictEqual(podeAcessarTela(undefined, 'usuarios'), false);
  });

  it('obterModuloDeTela deve associar "usuarios" ao módulo "inicio"', () => {
    assert.strictEqual(obterModuloDeTela('usuarios'), 'inicio');
  });

  it('filtrarMenuPorPerfil deve incluir "usuarios" no menu apenas quando o usuário for "mestre"', () => {
    const menuMestre = filtrarMenuPorPerfil('mestre');
    const grupoControleMestre = menuMestre.find((g) => g.titulo === 'Controle');
    assert.ok(grupoControleMestre, 'Grupo Controle deve existir para mestre');
    const itemUsuariosMestre = grupoControleMestre?.itens.find((i) => i.chave === 'usuarios');
    assert.ok(itemUsuariosMestre, 'Item Usuários deve existir no menu do mestre');

    const menuAdmin = filtrarMenuPorPerfil('admin');
    const grupoControleAdmin = menuAdmin.find((g) => g.titulo === 'Controle');
    const itemUsuariosAdmin = grupoControleAdmin?.itens.find((i) => i.chave === 'usuarios');
    assert.strictEqual(itemUsuariosAdmin, undefined, 'Item Usuários NÃO deve existir no menu do admin');

    const menuOperador = filtrarMenuPorPerfil('operador');
    const grupoControleOperador = menuOperador.find((g) => g.titulo === 'Controle');
    assert.strictEqual(grupoControleOperador, undefined, 'Grupo Controle não deve aparecer para operador sem auditoria nem usuarios');
  });
});
