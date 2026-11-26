import { test, expect, type Page } from '@playwright/test';
import { USUARIOS } from './support/ambiente';
import { abrirTela, entrar } from './support/sessao';

async function buscarLinhaDoItem(page: Page, codigo: string) {
  await abrirTela(page, 'Materiais improdutivos');
  await page.getByRole('searchbox', { name: 'Buscar material no almoxarifado' }).fill(codigo);
  return page.getByRole('row').filter({ hasText: codigo });
}

test.describe('Estoque', () => {
  test('cadastra um material improdutivo e registra uma entrada', async ({ page }) => {
    const codigo = `20-${String(Date.now()).slice(-4)}`;
    const descricao = `Luva de raspa E2E ${codigo}`;

    await entrar(page, USUARIOS.mestre);

    await test.step('cadastro com estoque inicial de 10', async () => {
      await abrirTela(page, 'Materiais improdutivos');
      await page.getByRole('button', { name: 'Novo improdutivo' }).click();

      const formulario = page.locator('form').filter({ hasText: 'Salvar item' });
      await formulario.getByLabel('Nome ou descrição do item *').fill(descricao);
      await formulario.getByLabel('Código SKU *').fill(codigo);
      await formulario.getByLabel('Estoque inicial').fill('10');
      await formulario.getByLabel('Estoque mínimo *').fill('2');
      await formulario.getByRole('button', { name: 'Salvar item' }).click();

      const linha = await buscarLinhaDoItem(page, codigo);
      await expect(linha).toContainText(descricao);
      await expect(linha).toContainText('10');
    });

    await test.step('entrada de 5 unidades leva o saldo a 15', async () => {
      await abrirTela(page, 'Entradas e saídas');
      const form = page.getByRole('region', { name: 'Registrar movimentação avulsa' });

      await form.getByRole('combobox').first().selectOption({ label: 'Entrada por Compra / Devolução' });
      const opcao = form.locator('select[name="p"] option', { hasText: codigo });
      await expect(opcao).toHaveCount(1);
      await form.locator('select[name="p"]').selectOption((await opcao.getAttribute('value'))!);
      await form.locator('input[name="q"]').fill('5');
      await form.locator('input[name="quem"]').fill('Fornecedor E2E, NF 123');
      await form.getByRole('button', { name: 'Confirmar Movimentação' }).click();

      await expect(page.getByText('Movimentação registrada com sucesso!')).toBeVisible();

      const linha = await buscarLinhaDoItem(page, codigo);
      await expect(linha).toContainText('15');
    });
  });
});
