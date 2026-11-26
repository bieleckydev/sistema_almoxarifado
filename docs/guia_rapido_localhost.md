# 🚀 Guia Rápido: Como Rodar o Sistema em Localhost (Desenvolvimento e Testes)

Este guia prático foi feito para o desenvolvedor que precisa colocar o **Sistema de Almoxarifado** rodando em sua máquina local (`localhost`) para desenvolvimento, testes de interface ou testes de regras de negócio.

---

## 📋 Pré-requisitos

- **Node.js**: Versão `20.x` ou superior recomendada ([download](https://nodejs.org/)).
- **npm**: Versão `10.x` ou superior (incluso com o Node.js).
- **Git** instalado.

---

## ⚡ Passo a Passo de Execução

### 1. Clonar o Repositório e Instalar Dependências
No terminal, acesse o diretório do projeto e instale as dependências:

```bash
git clone https://github.com/bieleckydev/sistema_almoxarifado.git
cd sistema_almoxarifado
npm install
```

---

### 2. Configurar as Variáveis de Ambiente (`.env.local`)
O sistema utiliza Firebase (Authentication e Cloud Firestore). Crie o arquivo `.env.local` na raiz do projeto com base no modelo `.env.example`:

**No Windows (PowerShell):**
```powershell
Copy-Item .env.example .env.local
```

**No Linux / macOS / Git Bash:**
```bash
cp .env.example .env.local
```

> **Nota:** As chaves de acesso público do Firebase SDK Web (`NEXT_PUBLIC_FIREBASE_*`) já possuem valores padrão configurados para conexão com o ambiente compartilhado de desenvolvimento/homologação.

---

### 3. Iniciar o Servidor de Desenvolvimento Web
Execute o comando:

```bash
npm run dev
```

O Next.js inicializará o servidor local em:
👉 **[http://localhost:3000](http://localhost:3000)**

---

### 4. Acesso e Autenticação
Ao acessar `http://localhost:3000`, o sistema redirecionará automaticamente para a tela de login (`/login`):

- **Ambiente Conectado ao Firebase:** Utilize suas credenciais de usuário cadastradas no Firebase Authentication do projeto.
- O sistema reconhece os perfis e permissões: `mestre`, `admin`, `operador` e `requisitante`.

---

## 🧪 Opção 2: Rodar 100% Offline com Emuladores Firebase (Sem Custo e Isolado)

Se preferir testar funcionalidades sem conexão com a internet ou sem alterar o banco de nuvem:

1. **Configurar o `.env.local` para usar emuladores:**
   ```ini
   NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true
   NEXT_PUBLIC_FIREBASE_EMULATOR_HOST=localhost
   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
   FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
   ```

2. **Iniciar os Emuladores do Firebase:**
   Em um terminal separado:
   ```bash
   npx firebase emulators:start
   ```
   *Painel visual do emulador (para criar usuários e inspecionar coleções):* **[http://localhost:4000](http://localhost:4000)**

3. **Iniciar a aplicação web:**
   ```bash
   npm run dev
   ```

---

## 🛠️ Scripts Úteis de Validação e Testes

| Comando | O que faz |
| :--- | :--- |
| `npm run dev` | Inicia o servidor Next.js em modo de desenvolvimento com hot-reload. |
| `npm run typecheck` | Executa a checagem estrita de tipos do TypeScript sem gerar arquivos (`tsc --noEmit`). |
| `npm test` | Roda a suíte completa de testes unitários e de serviços do Core via Node Test Runner. |
| `npm run test:e2e:chrome` | Executa testes ponta a ponta (E2E) com Playwright utilizando o Google Chrome nativo instalado. |
| `npm run test:rules` | Valida as regras de segurança do Firestore (`firestore.rules`) contra o emulador local. |

---

## ❓ Dúvidas e Problemas Comuns

- **Porta 3000 já em uso:**
  Caso a porta 3000 esteja ocupada, você pode definir outra porta no comando:
  ```bash
  npx next dev src/web -p 3001
  ```
- **Erro de tipagem no build:**
  Rode `npm run typecheck` para identificar rapidamente qualquer inconsistência de tipos antes de testar.
