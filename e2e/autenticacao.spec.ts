import { test, expect } from '@playwright/test';
import { USUARIOS } from './support/ambiente';
import { entrar, menu } from './support/sessao';

test.describe('Autenticação', () => {
  test('recusa senha incorreta sem entrar no sistema', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('E-mail corporativo').fill(USUARIOS.mestre.email);
    await page.locator('#password').fill('senha-errada-123');
    await page.getByRole('button', { name: 'Entrar no sistema' }).click();

    await expect(page.getByText('E-mail corporativo ou senha incorretos.')).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('redireciona para o login quem não está autenticado', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/, { timeout: 30_000 });
  });

  test('entra e sai do sistema', async ({ page }) => {
    await entrar(page, USUARIOS.mestre);
    await expect(menu(page)).toBeVisible();

    await page.getByRole('button', { name: 'Encerrar sessão' }).first().click();
    await expect(page).toHaveURL(/\/login/, { timeout: 30_000 });
  });
});
