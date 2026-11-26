import { defineConfig, devices } from '@playwright/test';
import { E2E } from './e2e/support/ambiente';

/**
 * Testes End-to-End (E2E) do Almoxarifado Industrial.
 *
 * Os testes sobem os emuladores do Firebase (Auth + Firestore) com um projeto `demo-*`,
 * que o Firebase só aceita em emulador: nada aqui alcança o banco de produção.
 * O Next roda na porta 3100 para não disputar a porta do `npm run dev`.
 *
 * Navegadores: `chromium` usa o binário do Playwright (`npm run test:e2e:install`);
 * `chrome` e `msedge` usam o navegador instalado no Windows, útil atrás de proxy
 * corporativo que bloqueia o download do Chromium (BUG-12).
 */
export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [['html', { open: 'never' }], ['list']],

  use: {
    baseURL: E2E.appUrl,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // Vídeo exige o ffmpeg do Playwright; no CI ele é instalado junto com o Chromium.
    video: process.env.CI ? 'retain-on-failure' : 'off',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'chrome', use: { ...devices['Desktop Chrome'], channel: 'chrome' } },
    { name: 'msedge', use: { ...devices['Desktop Edge'], channel: 'msedge' } },
  ],

  webServer: [
    {
      command: `npx -y firebase-tools@14.11.0 emulators:start --only auth,firestore --project ${E2E.projectId}`,
      url: `${E2E.firestoreUrl}/`,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      stdout: 'ignore',
    },
    {
      command: `npm run dev -- --hostname 127.0.0.1 --port ${E2E.appPort}`,
      url: `${E2E.appUrl}/login`,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      env: E2E.envDoApp,
    },
  ],
});
