import { expect, type Page } from '@playwright/test';
import type { UsuarioE2E } from './ambiente';

/** Faz login pela tela e espera o menu principal aparecer. */
export async function entrar(page: Page, usuario: UsuarioE2E): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('E-mail corporativo').fill(usuario.email);
  await page.locator('#password').fill(usuario.senha);
  await page.getByRole('button', { name: 'Entrar no sistema' }).click();
  await expect(menu(page)).toBeVisible({ timeout: 45_000 });
}

/** Menu lateral com as telas que o perfil pode acessar. */
export function menu(page: Page) {
  return page.getByRole('navigation', { name: 'Menu WMS Operacional' });
}

export async function abrirTela(page: Page, nome: string): Promise<void> {
  await menu(page).getByText(nome, { exact: true }).click();
}
