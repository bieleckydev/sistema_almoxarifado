# 🏭 Sistema de Almoxarifado Industrial

> Sistema moderno, robusto e escalável para controle de estoque, gestão de materiais produtivos/improdutivos, apontamento de movimentações, pedidos de venda e relacionamento com clientes e fornecedores.

---

## 📌 Sumário

1. [Visão Geral](#-visão-geral)
2. [Arquitetura de Software](#-arquitetura-de-software)
   - [Core Agnóstico](#1-core-agnóstico-srccore)
   - [Camada Server & Backend](#2-camada-server--backend-srcserver)
   - [Camada de Apresentação Web](#3-camada-de-apresentação-web-srcweb)
   - [Pipeline de Migração de Dados Legados](#4-pipeline-de-migração-de-dados-legados-srcmigration)
3. [Módulos e Funcionalidades](#-módulos-e-funcionalidades)
   - [Hub Inicial e Painel de Atenção](#hub-inicial-e-painel-de-atenção)
   - [Gestão de Estoque Multicategoria](#gestão-de-estoque-multicategoria)
   - [Apontamento de Movimentações](#apontamento-de-movimentações)
   - [Vendas, Pedidos e Baixa Automática](#vendas-pedidos-e-baixa-automática)
   - [Clientes, Fornecedores e Parceiros](#clientes-fornecedores-e-parceiros)
   - [Faixa de Opções (Ribbon Menu V5)](#faixa-de-opções-ribbon-menu-v5)
   - [Busca Global Unificada](#busca-global-unificada)
4. [Controle de Acesso e Segurança (RBAC)](#-controle-de-acesso-e-segurança-rbac)
5. [Estrutura do Projeto](#-estrutura-do-projeto)
6. [Stack Tecnológica](#-stack-tecnológica)
7. [Guia de Instalação e Execução](#-guia-de-instalação-e-execução)
   - [Pré-requisitos](#pré-requisitos)
   - [Passo a Passo](#passo-a-passo)
   - [Variáveis de Ambiente](#variáveis-de-ambiente)
8. [Scripts Disponíveis](#-scripts-disponíveis)
9. [Pipeline de Migração de Planilhas Excel](#-pipeline-de-migração-de-planilhas-excel)
10. [Testes Automatizados](#-testes-automatizados)
11. [Roadmap & Fase 2 (Mobile)](#-roadmap--fase-2-mobile)
12. [Licença](#-licença)

---

## 🌟 Visão Geral

O **Sistema de Almoxarifado Industrial** foi concebido para modernizar a operação de chão de fábrica e depósitos industriais, substituindo controles descentralizados em planilhas eletrônicas por uma plataforma web integrada de alta performance, tempo real e confiabilidade transacional.

### Principais Dores Resolvidas
- **Ruptura de Estoque Inesperada**: Alertas automatizados para itens abaixo do estoque mínimo e em nível crítico.
- **Divergência de Saldos**: Regras estritas de validação impeditiva que bloqueiam saídas sem saldo disponível, com transações atômicas no banco de dados.
- **Rastreabilidade Falha**: Histórico imutável de movimentações registrando operador, data/hora, tipo de documento (NF-e, requisição interna, lote, CA de segurança) e destinatário/colaborador.
- **Fluxo de Expedição Fragmentado**: Integração progressiva entre pedidos de venda (`Pendente` → `Separado` → `Entregue`) com baixa física de estoque no momento da entrega.

---

## 🏗 Arquitetura de Software

O projeto adota uma **Estratégia de Arquitetura Multiplataforma** com separação estrita entre o **Core de Negócio** e a **Camada de Apresentação**. Essa estrutura prepara o ecossistema para a futura expansão mobile (React Native / Expo), garantindo reaproveitamento superior a 70% de código.

```mermaid
graph TD
    subgraph Apresentacao ["Camada de Apresentação (src/web)"]
        UI[Next.js 16 / React 19]
        Ribbon[Ribbon Bar & Sidebar]
        Drawers[Drawers Operacionais & Modais]
        Theme[Tailwind CSS v4 & Dark Mode]
    end

    subgraph CoreAgnostico ["Core Agnóstico (src/core)"]
        Domain[Domínio & Schemas Zod]
        Calc[EstoqueCalculator & Regras Puras]
        Services[Services de Movimentação & Inventário]
        Store[Zustand Stores & TanStack Query]
    end

    subgraph ServerBackend ["Server & Backend (src/server & api)"]
        Routes[API Routes Next.js]
        Repo[FirestoreEstoqueRepository]
        Auth[Firebase Admin Auth & RBAC]
        Audit[UserAuditLogs]
    end

    subgraph Persistencia ["Persistência & Nuvem"]
        Firestore[(Cloud Firestore)]
        FBAuth[(Firebase Authentication)]
    end

    UI --> CoreAgnostico
    Ribbon --> CoreAgnostico
    Drawers --> CoreAgnostico
    Routes --> Repo
    Routes --> Auth
    Repo --> Firestore
    Auth --> FBAuth
    Services --> Repo
```

### 1. Core Agnóstico (`src/core/`)
O Core contém toda a inteligência da aplicação e **não possui qualquer dependência de APIs de navegador** (`window`, `document`, `localStorage`) nem de tags HTML/React Native:
- **`domain/`**: Schemas Zod de validação rigorosa (`item.schema.ts`, `movimentacao.schema.ts`, `pedido.schema.ts`, `cliente.schema.ts`, `colaborador.schema.ts`, `user.schema.ts`).
- **`services/`**: Serviços puros de negócio:
  - `EstoqueCalculator`: Funções matemáticas puras para cálculo de saldo, determinação de criticidade (`NORMAL`, `ATENCAO`, `CRITICO`, `ZERADO`) e reposição.
  - `MovimentacaoService`: Orquestração de entradas, baixas, conferência atômica de lotes e ajustes de inventário.
  - `FechamentoMensalService`: Consolidação contábil temporal e transporte de saldos entre competências.
- **`store/`**: Gerenciamento de estado via **Zustand** agnóstico (`usePeriodoStore`, `useBaixaRapidaStore`, `useAuthStore`).
- **`hooks/`**: Hooks assíncronos baseados em **TanStack Query** para cache e sincronização reativa de dados.

### 2. Camada Server & Backend (`src/server/`)
- **`firebase-admin.ts`**: Inicialização singleton segura do Firebase Admin SDK usando credenciais de serviço.
- **`storage/`**:
  - `firestore-estoque.repository.ts`: Repositório oficial implementando operações transacionais atômicas via `runTransaction`, garantindo que atualizações de estoque e gravações de movimentações sejam executadas atomicamente.
  - `firestore-estoque.mapper.ts`: Mapeadores e sanitizadores para conversão bidirecional entre documentos Firestore (Timestamps) e entidades Zod.
- **`users/`**: Gerenciamento corporativo de contas de usuário (criação, convite, ativação/desativação, alteração de permissão, redefinição de senha e auditoria).

### 3. Camada de Apresentação Web (`src/web/`)
- **Next.js 16 (App Router)** e **React 19**: Server Components e Client Components especializados.
- **Tailwind CSS v4**: Design industrial ergonômico, com tokens semânticos e alternância de temas Claro e Escuro.
- **Componentes Especializados**: Ribbon Header corporativa, tabelas virtualizadas com `@tanstack/react-virtual` para renderização fluida de grandes catálogos, gavetas operacionais (`Drawers`) e toasts operacionais acessíveis.

### 4. Pipeline de Migração de Dados Legados (`src/migration/`)
- Mecanismo completo para leitura, sanitização, normalização e resolução de inconsistências de planilhas Excel legadas (`.xlsx`), com classificação de erros e modo de simulação (`dry-run`).

---

## 📦 Módulos e Funcionalidades

### 🏠 Hub Inicial e Painel de Atenção
- **Cards de Métricas Globais**: Total de itens cadastrados, itens abaixo do mínimo de segurança, itens em situação crítica e movimentações no período.
- **Painel "Precisa de Atenção"**:
  - Alerta de pedidos com entrega pendente ou atrasada.
  - Ranking de criticidade de estoque ordenado pela menor razão entre `saldoAtual / estoqueMinimo`.
- **Barra de Ações Rápidas**: Acesso em um clique para receber materiais, registrar baixas, emitir pedidos ou cadastrar fornecedores.

### 📦 Gestão de Estoque Multicategoria
O catálogo é segmentado em três grandes categorias operacionais:
1. **Matéria-Prima (`mp`)**: Bobinas, perfis, chapas e insumos primários com controle de peso e dimensões.
2. **Materiais Improdutivos (`imp`)**: Ferramentas, discos de corte/flap, insumos de solda e EPIs (com controle de CA).
3. **Peças de Motos (`motos`)**: Peças acabadas para montagem, expedição e reposição comercial.

#### Recursos do Catálogo:
- Tabela virtualizada com paginação e busca instantânea com *debounce*.
- Filtros por criticidade: `Todos`, `Normal`, `Atenção`, `Crítico` e `Zerado`.
- Drawer lateral com ficha técnica detalhada do item, histórico completo de entradas/saídas e parâmetros de segurança.
- Cadastro de novos itens com validação contextual de campos específicos por categoria.

### 🔄 Apontamento de Movimentações
- **Entrada de Materiais**:
  - Registro de nota fiscal de compra (NF-e), fornecedor, lote, custo unitário e data de recebimento.
  - Incremento atômico de saldo no estoque.
- **Retirada para Produção / Baixa Rápida**:
  - Seleção de colaborador requisitante com autopreenchimento de setor e função.
  - **Validação impeditiva rigorosa**: Bloqueio total de registros caso o saldo disponível seja insuficiente.
  - Suporte a saídas em lote atômicas (se um item falhar por saldo, todo o lote é revertido).
- **Saída Manual & Extrato Analítico**:
  - Balanço do período calculado dinamicamente (total entrado vs. total saído).
  - Tabela de extrato detalhado por data, operador, colaborador e tipo de movimentação.
  - Exportação instantânea de relatórios consolidados em formato **CSV**.

### 💼 Vendas, Pedidos e Baixa Automática
- Fluxo de status progressivo:
  $$\text{Pendente} \xrightarrow{\quad\text{Separação}\quad} \text{Separado} \xrightarrow{\quad\text{Expedição}\quad} \text{Entregue}$$
- **Baixa Automática no Estoque**: Ao avançar o status do pedido para `Entregue`, o sistema debita automaticamente as quantidades de cada item no estoque físico com registro de rastreabilidade.
- Verificação automática de disponibilidade de estoque durante a criação e triagem do pedido.

### 👥 Clientes, Fornecedores e Parceiros
- Cadastro e consulta unificada de parceiros comerciais categorizados por tipo:
  - `CLIENTE`: Destinatários de peças acabadas e pedidos de venda.
  - `FORNECEDOR`: Emitentes de matéria-prima, consumíveis e ferramentas.
  - `TRANSPORTADORA`: Operadores logísticos de entrega e frete.
- Filtros rápidos na barra de navegação (`fc:Fornecedor`, `fc:Cliente`) e formulário com validação de CNPJ/CPF, e-mail e telefone.

### 🎀 Faixa de Opções (Ribbon Menu V5)
Inspirada nos sistemas industriais e suítes corporativas de alta produtividade:
- **Linha de Abas Contextuais**: Muda de acordo com o módulo selecionado (`Início`, `Estoque`, `Compras`, `Vendas`).
- **Aba Favoritos**: Atalhos fixos para as quatro ações mais frequentes do dia a dia.
- **Controle Global do Período de Análise**:
  - Alternância rápida com um clique: `Hoje` ➔ `Ontem` ➔ `7 dias` ➔ `Tudo`.
  - Exibição em tempo real do intervalo exato de datas formatadas (ex.: `08/10/2026 à 14/10/2026`).
- **Sidebar Retrátil**: Alternância suave entre barra expandida (256px) e modo mini (52px) com badges dinâmicas de alertas.

### 🔎 Busca Global Unificada
- Ativada via teclado através dos atalhos `/` ou `Ctrl+K`.
- Varredura cruzada instantânea em itens de estoque, códigos de produto, números de pedidos, nomes de parceiros e notas fiscais.

---

## 🔐 Controle de Acesso e Segurança (RBAC)

O sistema conta com controle de acesso baseado em papéis (Role-Based Access Control) enforced tanto a nível de rotas de API quanto nas regras nativas de segurança do **Cloud Firestore** ([firestore.rules](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/firestore.rules)):

| Papel (`role`) | Descrição | Permissões Principais |
| :--- | :--- | :--- |
| **`mestre`** | Administrador Máximo / TI | Gestão total de usuários, concessão de perfis, exclusões permanentes, auditoria de logs e parametrizações do sistema. |
| **`admin`** | Gestor de Almoxarifado / Suprimentos | Cadastro e edição de itens, gestão de clientes/fornecedores, visualização de custos e relatórios analíticos. |
| **`operador`** | Almoxarife / Operador de Estoque | Registro de entradas, saídas manuais, separação e entrega de pedidos de venda e contagem de inventário. |
| **`requisitante`** | Operador de Chão de Fábrica | Apenas consulta ao catálogo e solicitação de requisições de material. |

### Regras de Segurança no Firestore
- Documentos de usuários só podem ter seus privilégios alterados por usuários com role `mestre`.
- Coleção `userAuditLogs` é gravada exclusivamente através do backend com `Firebase Admin SDK`, mantendo histórico imutável.
- Movimentações de estoque não podem ser sobrescritas ou apagadas diretamente pelo cliente (`allow update, delete: if false`).

---

## 📂 Estrutura do Projeto

```text
sistema_almoxarifado/
├── .env.example                     # Modelo de variáveis de ambiente
├── firebase.json                    # Configuração de emuladores e serviços Firebase
├── firestore.rules                  # Regras de segurança rigorosas do Firestore
├── firestore.indexes.json           # Índices compostos do banco de dados
├── package.json                     # Metadados, scripts e dependências do projeto
├── tsconfig.json                    # Configuração do compilador TypeScript
├── docs/                            # Documentação técnica, arquitetura e propostas
│   ├── arquitetura.txt              # Especificação da arquitetura multiplataforma
│   ├── comparativo_prototipo_v5...  # Matriz comparativa entre protótipo e React
│   ├── plano_migracao_planilhas.md  # Especificação da ingestão de Excel
│   └── excel/                       # Planilhas legadas de referência
├── scripts/                         # Scripts operacionais e de teste emulados
│   ├── test-firestore-rules.mjs     # Teste automatizado de regras de segurança
│   └── integration-admin-api.mjs    # Testes de integração de API
└── src/
    ├── core/                        # CORE AGNÓSTICO (Regras puras de negócio)
    │   ├── api/                     # Interfaces e clientes HTTP genéricos
    │   ├── domain/                  # Schemas Zod, tipos TypeScript e contratos
    │   ├── hooks/                   # Custom hooks TanStack Query reutilizáveis
    │   ├── services/                # Regras de cálculo, movimentação e inventário
    │   ├── storage/                 # Interfaces abstratas de persistência
    │   ├── store/                   # Stores Zustand desacopladas de DOM
    │   └── utils/                   # Utilitários puros (datas, máscaras, pluralização)
    ├── server/                      # BACKEND & ADAPTERS (Node.js / Serverless)
    │   ├── auth/                    # Helpers de autorização e extração de sessão
    │   ├── firebase-admin.ts        # Singleton Firebase Admin SDK
    │   ├── storage/                 # Implementação Firestore com transações atômicas
    │   └── users/                   # Casos de uso de gestão de usuários e auditoria
    ├── web/                         # APRESENTAÇÃO WEB (Next.js 16 + React 19)
    │   ├── app/                     # Next.js App Router (Páginas, Layouts e APIs)
    │   │   ├── api/                 # Endpoints REST (/api/itens, /api/pedidos, etc.)
    │   │   ├── login/               # Tela de autenticação corporativa
    │   │   ├── layout.tsx           # Layout raiz com providers globais
    │   │   └── page.tsx             # Dashboard principal do almoxarifado
    │   ├── components/              # Componentes de interface do usuário
    │   │   ├── auth/                # Formulário de login e AuthGuard de rotas
    │   │   ├── dashboard/           # Tabela de estoque, métricas e gavetas (drawers)
    │   │   ├── gestao/              # Views de Vendas, Clientes e Saída Manual
    │   │   ├── layout/              # Ribbon Header, Sidebar retrátil e Busca global
    │   │   └── feedback/            # Toasts e alertas operacionais
    │   ├── hooks/                   # Hooks específicos de navegação e UI Web
    │   └── data/                    # Catálogo mock e metadados de configuração
    └── migration/                   # PIPELINE DE INGESTÃO DE PLANILHAS EXCEL
        ├── adapters/                # Conversores específicos por planilha
        ├── normalizers.ts           # Higienização de strings, números e datas Excel
        ├── issue-classification.ts  # Triagem de divergências bloqueantes vs revisáveis
        └── dry-run-report.ts        # Relatório de simulação sem escrita no banco
```

---

## 💻 Stack Tecnológica

| Camada | Tecnologia | Justificativa |
| :--- | :--- | :--- |
| **Linguagem** | [TypeScript 7](https://www.typescriptlang.org/) | Tipagem estrita ponta a ponta e máxima segurança de refatoração. |
| **Framework Web** | [Next.js 16](https://nextjs.org/) (App Router) | Alta performance com React Server Components e rotas de API serverless. |
| **Biblioteca UI** | [React 19](https://react.dev/) | Primitivas modernas de renderização e actions otimizadas. |
| **Estilização** | [Tailwind CSS v4](https://tailwindcss.com/) | Estilização utilitária de alta velocidade com temas claro/escuro nativos. |
| **Validação de Dados**| [Zod 4](https://zod.dev/) | Schemas de validação em tempo de execução compartilhados no Core. |
| **Gerenciamento de Estado** | [Zustand 5](https://zustand-demo.pmnd.rs/) | Estado local e global leve, sem boilerplate e desacoplado de UI. |
| **Data Fetching / Cache** | [TanStack Query v5](https://tanstack.com/query) | Cache inteligente, revalidação em segundo plano e sincronização assíncrona. |
| **Banco de Dados & Auth** | [Google Cloud Firestore & Firebase](https://firebase.google.com/) | Banco NoSQL distribuído em tempo real com transações ACID. |
| **Manipulação de Planilhas** | [SheetJS (xlsx)](https://sheetjs.com/) | Leitura e processamento de alto desempenho de arquivos Excel legados. |
| **Ícones** | [Lucide React](https://lucide.dev/) | Pacote consistente e moderno de ícones vetoriais. |

---

## 🚀 Guia de Instalação e Execução

### Pré-requisitos
- **Node.js**: Versão 20.x ou superior recomendada.
- **npm**: Versão 10.x ou superior.
- **Projeto Firebase**: Projeto ativo no console do Firebase com Cloud Firestore e Firebase Authentication habilitados.
- **Java JRE** (opcional): Necessário apenas para rodar o emulador local do Firebase (`firebase-tools`).

### Passo a Passo

1. **Clonar o Repositório**:
   ```bash
   git clone https://github.com/edubielecky/sistema_almoxarifado.git
   cd sistema_almoxarifado
   ```

2. **Instalar Dependências**:
   ```bash
   npm install
   ```

3. **Configurar as Variáveis de Ambiente**:
   Crie o arquivo `.env.local` na raiz do projeto copiando o modelo:
   ```bash
   cp .env.example .env.local
   ```
   Preencha os valores de acordo com as credenciais do seu projeto Firebase.

4. **Executar o Servidor de Desenvolvimento**:
   ```bash
   npm run dev
   ```
   A aplicação estará disponível em `http://localhost:3000`.

---

### Variáveis de Ambiente

O arquivo `.env.local` requer as seguintes chaves:

```ini
# Configuração do Firebase Web Client (Exposto no navegador)
NEXT_PUBLIC_FIREBASE_PROJECT_ID=seu-projeto-firebase
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=seu-projeto.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=000000000000
NEXT_PUBLIC_FIREBASE_APP_ID=1:000000000000:web:000000000000

# Configuração do Firebase Admin SDK (Privado / Somente Servidor)
FIREBASE_ADMIN_PROJECT_ID=seu-projeto-firebase
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxx@seu-projeto.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Alternativa: Caminho absoluto para o arquivo JSON da conta de serviço
# GOOGLE_APPLICATION_CREDENTIALS=/caminho/para/service-account.json

# Para onde o usuário volta após definir a senha na página de ação do Firebase (convites e redefinições)
FIREBASE_AUTH_CONTINUE_URL=http://localhost:3000/login

# Opcional: webhook que envia os e-mails de convite/redefinição (sem ele, o link aparece na tela de usuários)
# USER_EMAIL_DELIVERY_URL=https://seu-servico-de-email.example.com/hooks/almoxarifado
```

---

> **Produção:** antes do primeiro deploy, siga o roteiro em [docs/deploy-producao.md](docs/deploy-producao.md) (variáveis da Vercel, domínios autorizados, deploy de regras/índices e backup).

---

## 📜 Scripts Disponíveis

| Comando | Descrição |
| :--- | :--- |
| `npm run dev` | Inicia o servidor de desenvolvimento do Next.js em `src/web`. |
| `npm run build` | Compila o projeto para o pacote de produção otimizado. |
| `npm run start` | Inicializa a aplicação em modo de produção compilada. |
| `npm run typecheck` | Executa a verificação de tipos TypeScript em todo o projeto sem emitir arquivos (`tsc --noEmit`). |
| `npm test` | Executa a suíte completa de testes automatizados com o Node Test Runner nativo via `tsx`. |
| `npm run test:rules` | Executa testes automatizados das regras de segurança contra o Emulador local do Firestore. |
| `npm run test:integration:admin-api` | Executa testes de integração das rotas administrativas com o Firebase Admin. |

### Scripts do Pipeline de Migração

| Comando | Descrição |
| :--- | :--- |
| `npm run migration:discover` | Analisa e mapeia as estruturas de todas as abas das planilhas em `docs/excel/`. |
| `npm run migration:extract-source` | Extrai os registros brutos das planilhas para inspeção de layout. |
| `npm run migration:validate-improdutivos-items` | Valida o catálogo de materiais improdutivos contra os schemas do Core. |
| `npm run migration:validate-improdutivos-collaborators` | Valida a lista de colaboradores e matrículas contra o Core. |
| `npm run migration:dry-run-improdutivos` | Executa simulação completa de migração gerando relatório de auditoria e consistência. |
| `npm run migration:error-resolution` | Identifica e cataloga anomalias de dados bloqueantes e revisáveis. |
| `npm run migration:duplicate-resolution` | Detecta duplicidades naturais de códigos de produto e colaboradores. |

---

## 📊 Pipeline de Migração de Planilhas Excel

O sistema inclui uma pipeline de engenharia de dados em TypeScript criada para importar com segurança os registros históricos armazenados nas planilhas:
- `Cont. de Estoque Disco Flap, Mat. de Solda e Brocas.xlsx` (Materiais Improdutivos).
- `CONTROLE_PEÇAS 2026_ALMOXARIFADO_ATUALIZADA.xlsx` (Peças de Motos e Clientes).
- `ESTOQUE 2026.xlsx` (Matéria-Prima Industrial).

### Fases do Processo:
1. **Descoberta & Mapeamento**: Localização dinâmica de tabelas com cabeçalhos deslocados ou células mescladas.
2. **Normalização**: Limpeza de caracteres especiais, conversão de datas seriais do Excel e sanitização de matrículas.
3. **Classificação de Inconsistências**: Separação clara entre erros impeditivos (ex.: código de item em branco) e alertas solucionáveis (ex.: setor não padronizado mapeado para `OUTRO`).
4. **Modo Dry-Run**: Nenhum dado é persistido no banco de dados antes da emissão e conferência do relatório completo de integridade.

---

## 🧪 Testes Automatizados

A confiabilidade do sistema é comprovada por uma extensa suíte de **mais de 370 testes automatizados**, abrangendo:
- ✅ **Testes Unitários do Core**: Cálculos de estoque, ordenação de criticidade, validações Zod e regras de fechamento contábil.
- ✅ **Testes de Estado (Stores)**: Carrinho de baixa rápida, store de autenticação e ciclotimia do período analítico.
- ✅ **Testes de Repositório**: Mapeadores do Firestore, sanitizadores de dados e transações atômicas de saldo.
- ✅ **Testes de Rotas de API**: Validação de endpoints HTTP, tratamento de erros e respostas REST.
- ✅ **Testes de Regras de Segurança**: Verificação de autorização e negação em [firestore.rules](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/firestore.rules).

Para executar toda a bateria de testes:
```bash
npm test
```

---

## 🗺 Roadmap & Fase 2 (Mobile)

- [x] **Fase 1 (Web First)**:
  - [x] Arquitetura desacoplada com Core Agnóstico.
  - [x] Catálogo e estoque multicategoria com busca e virtualização.
  - [x] Transações atômicas de movimentações e controle de saldo impeditivo.
  - [x] Gestão de Vendas, Pedidos e baixa automática na expedição.
  - [x] Faixa de Opções (Ribbon Menu V5) e temas Claro/Escuro.
  - [x] Autenticação e RBAC corporativo completo.
- [ ] **Fase 2 (Mobile Nativo com Expo & React Native)**:
  - [ ] Extração do Core Agnóstico para pacote compartilhado em monorepo Turborepo (`@app/core`).
  - [ ] Desenvolvimento do aplicativo mobile para coletores de dados e smartphones.
  - [ ] Leitura de código de barras e QR Code via câmera integrada para apontamento instantâneo de retiradas e inventário no chão de fábrica.
  - [ ] Sincronização offline-first para áreas industriais com baixa cobertura de rede.

---

## 📄 Licença

Este projeto é desenvolvido para uso corporativo sob licença proprietária / ISC. Consulte os responsáveis pelo projeto para diretrizes de uso e distribuição.
