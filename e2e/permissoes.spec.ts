import { test, expect } from '@playwright/test';
import { USUARIOS } from './support/ambiente';
import { entrar, menu } from './support/sessao';

test.describe('Permissões por perfil', () => {
  test('mestre vê as telas de controle', async ({ page }) => {
    await entrar(page, USUARIOS.mestre);
    await expect(menu(page).getByText('Gestão de Usuários', { exact: true })).toBeVisible();
    await expect(menu(page).getByText('Auditoria', { exact: true })).toBeVisible();
  });

  test('requisitante não vê gestão de usuários nem faturamento', async ({ page }) => {
    await entrar(page, USUARIOS.requisitante);
    await expect(menu(page).getByText('Requisições', { exact: true })).toBeVisible();
    await expect(menu(page).getByText('Gestão de Usuários', { exact: true })).toHaveCount(0);
    await expect(menu(page).getByText('Faturamento', { exact: true })).toHaveCount(0);
  });
});
