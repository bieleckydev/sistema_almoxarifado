import { defineConfig, devices } from '@playwright/test';

/**
 * Configuração do Playwright para testes End-to-End (E2E) no Almoxarifado Industrial.
 *
 * Suporta execução via binários embutidos ou navegadores pré-instalados no SO
 * (Google Chrome ou Microsoft Edge), contornando bloqueios de firewall corporativo
 * e erros de CDN de download de binários (BUG-12).
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['html', { open: 'never' }], ['list']],

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    // 1. Projeto padrão com Chromium baixado
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    // 2. Projeto resiliente utilizando Google Chrome nativo do Windows
    {
      name: 'chrome',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
      },
    },

    // 3. Projeto resiliente utilizando Microsoft Edge nativo do Windows
    {
      name: 'msedge',
      use: {
        ...devices['Desktop Edge'],
        channel: 'msedge',
      },
    },
  ],

  // Inicia automaticamente o servidor Next.js se não estiver rodando
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120 * 1000,
  },
});
