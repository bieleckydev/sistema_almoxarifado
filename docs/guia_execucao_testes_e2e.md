# 🧪 Guia de Configuração e Execução de Testes End-to-End (E2E) com Playwright

> **Projeto:** Sistema de Almoxarifado Industrial  
> **Diagnóstico Relacionado:** [BUG-12 (Infra / Playwright)](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/docs/relatorio_varredura_bugs_e_falhas.md#bug-12-infra--falha-no-download-do-driver-do-playwright-no-ambiente-windows)  
> **Arquivo de Configuração:** [`playwright.config.ts`](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/playwright.config.ts)

---

## 📌 1. Diagnóstico do Problema (BUG-12)

Em ambientes Windows corporativos e redes restritas com firewall/proxy, a tentativa de download automático dos binários do Chromium pelo Playwright pode resultar em:
- `HTTP 404 Not Found` ao acessar endpoints específicos da CDN (`playwright.azureedge.net` / Akamai / Verizon).
- Bloqueio por políticas de segurança da informação (restrição de download de arquivos executáveis `.zip` ou `.exe`).

---

## 🚀 2. Soluções e Estratégias de Execução

Configuramos o projeto para permitir **múltiplas abordagens**, eliminando bloqueios de ambiente:

### ✅ Abordagem A: Execução com Navegadores Nativos do Windows (Recomendada)
Esta abordagem utiliza os navegadores já homologados e instalados no seu computador, **sem precisar baixar nenhum binário adicional**:

```bash
# Executa os testes usando o Google Chrome instalado na sua máquina
npm run test:e2e:chrome

# Ou executa usando o Microsoft Edge nativo do Windows
npx playwright test --project=msedge
```

**Vantagens:**
- Zero downloads externos de binários pesados.
- Teste real na mesma versão do motor Chromium utilizado pelos operadores do almoxarifado.
- 100% imune a erros de CDN ou restrições de proxy.

---

### 📦 Abordagem B: Download Oficial do Chromium Embutido
Caso deseje utilizar o Chromium isolado gerenciado pelo Playwright:

```bash
# Instala o navegador Chromium com todas as dependências
npm run test:e2e:install

# Executa a suíte de testes padrão
npm run test:e2e
```

---

## 🛡️ 3. Configuração de Variáveis de Ambiente Corporativas

Se o seu terminal necessita de proxy corporativo ou espelho interno para baixar binários, adicione as seguintes variáveis no seu ambiente ou arquivo `.env.local`:

```bash
# Proxy corporativo
HTTP_PROXY=http://proxy.empresa.com.br:8080
HTTPS_PROXY=http://proxy.empresa.com.br:8080

# Espelhamento de CDN alternativo
PLAYWRIGHT_DOWNLOAD_HOST=https://playwright.azureedge.net

# Armazenamento dos binários dentro da pasta do projeto (node_modules/.local-browsers)
PLAYWRIGHT_BROWSERS_PATH=0
```

---

## 📋 4. Comandos de Operação Rápida

| Comando | Finalidade | Motor / Canal |
| :--- | :--- | :--- |
| `npm run test:e2e:install` | Baixa o Chromium oficial do Playwright | Chromium Headless |
| `npm run test:e2e` | Roda todos os testes E2E | Projeto Padrão |
| `npm run test:e2e:chrome` | Roda testes no Google Chrome do Windows | Canal `chrome` |
| `npx playwright test --ui` | Abre a interface gráfica interativa do Playwright | Navegador com DevTools |
| `npx playwright show-report` | Exibe o relatório HTML com capturas e gravações | Servidor local de relatório |

---

## 🔍 5. Validação do Ambiente

Para testar a inicialização do navegador no Windows:

```powershell
npx playwright --version
npm run test:e2e:chrome -- --list
```
