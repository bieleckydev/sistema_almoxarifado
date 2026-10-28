# 📋 Relatório de Varredura Completa: Bugs, Falhas e Vulnerabilidades do Sistema

> **Projeto:** Sistema de Almoxarifado Industrial  
> **Data da Auditoria:** 28 de Outubro de 2026  
> **Status dos Serviços:** Frontend e Backend (Next.js 16 App Router) ativos em `http://localhost:3000`  
> **Resultado da Suíte de Testes Automatizados:** 427 testes executados (427 aprovados, 0 falhas)  
> **Tipo de Inspeção:** Varredura E2E estática, dinâmica, arquitetural, transacional e de segurança  

---

## 📑 Sumário

1. [Visão Geral e Metodologia](#1-visão-geral-e-metodologia)
2. [Matriz de Criticidade e Sumário de Falhas](#2-matriz-de-criticidade-e-sumário-de-falhas)
3. [Detalhamento Completo dos Bugs e Falhas Encontrados](#3-detalhamento-completo-dos-bugs-e-falhas-encontrados)
   - [BUG-01: Baixa Manual de Material Falha com 404 por Envio de Texto Livre como `colaboradorId`](#bug-01-crítico--baixa-manual-de-material-falha-com-404-por-envio-de-texto-livre-como-colaboradorid)
   - [BUG-02: Backend Trava em Timeout de ADC por Falta de Credenciais Admin ou Conexão a Emuladores](#bug-02-crítico--backend-trava-em-timeout-de-adc-por-falta-de-credenciais-admin-ou-conexão-a-emuladores)
   - [BUG-03: Custo Médio Ponderado não é Recalculado nem Atualizado nas Entradas de Estoque](#bug-03-alto--custo-médio-ponderado-não-é-recalculado-nem-atualizado-nas-entradas-de-estoque)
   - [BUG-04: Varredura de Coleções Inteiras sem Paginação ou Limite Temporal no Firestore](#bug-04-alto--varredura-de-coleções-inteiras-sem-paginação-ou-limite-temporal-no-firestore)
   - [BUG-05: Falta de Índices Compostos em `firestore.indexes.json` para Consultas de Auditoria](#bug-05-alto--falta-de-índices-compostos-em-firestoreindexesjson-para-consultas-de-auditoria)
   - [BUG-06: Cadastro de Item com `estoqueInicial > 0` não Registra Movimentação no Extrato](#bug-06-médio--cadastro-de-item-com-estoqueinicial--0-não-registra-movimentação-no-extrato)
   - [BUG-07: Ajuste de Inventário em Lote não é Transacional (Falta de Atomicidade ACID)](#bug-07-médio--ajuste-de-inventário-em-lote-não-é-transacional-falta-de-atomicidade-acid)
   - [BUG-08: Fallback do Firestore em `useItensEstoque` Expõe Instâncias de `Timestamp` não Tratadas](#bug-08-médio--fallback-do-firestore-em-useitensestoque-expõe-instâncias-de-timestamp-não-tratadas)
   - [BUG-09: Desconexão da Store `useBaixaRapidaStore` no Frontend](#bug-09-médio--desconexão-da-store-usebaixarapidastore-no-frontend)
   - [BUG-10: ID Oculto do Cliente Gravado no Lugar do Nome no Histórico de Expedição de Pedidos](#bug-10-baixo--id-oculto-do-cliente-gravado-no-lugar-do-nome-no-histórico-de-expedição-de-pedidos)
   - [BUG-11: Imprecisão Decimal por Ponto Flutuante em Conversão de Unidades e Embalagens](#bug-11-baixo--imprecisão-decimal-por-ponto-flutuante-em-conversão-de-unidades-e-embalagens)
   - [BUG-12: Falha no Download do Driver do Playwright no Ambiente Windows](#bug-12-infra--falha-no-download-do-driver-do-playwright-no-ambiente-windows)
4. [Recomendações e Plano de Ação Prioritário](#4-recomendações-e-plano-de-ação-prioritário)

---

## 1. Visão Geral e Metodologia

Para realizar esta varredura de ponta a ponta:
1. **Subida dos Serviços:** O ambiente Next.js 16 (App Router com Turbopack) foi inicializado com sucesso em `http://localhost:3000`, expondo tanto a interface Web (`/`, `/login`) quanto as rotas de API do backend (`/api/*`).
2. **Execução da Suíte de Testes:** Foram executados todos os 427 testes automatizados do repositório (`tsx --test`), garantindo que as regras matemáticas e fluxos cobertos por mocks estejam íntegros.
3. **Auditoria de Código-Fonte (Static Analysis & Code Sweep):** Foi realizada a leitura minuciosa de cada camada:
   - **Core de Negócio (`src/core/`):** Schemas Zod, calculadora de estoque, regras de lotes, custo médio, serviços de conciliação NFe e stores Zustand.
   - **Server & Backend (`src/server/` & `src/web/app/api/`):** Inicialização do Firebase Admin SDK, autenticação RBAC, transações ACID no Firestore e rotas REST.
   - **Apresentação Web (`src/web/`):** Páginas, Drawers operacionais, formulários de baixa, hooks TanStack Query e adaptadores de armazenamento.
   - **Segurança & Infraestrutura:** `firestore.rules`, `firestore.indexes.json` e variáveis de ambiente.

---

## 2. Matriz de Criticidade e Sumário de Falhas

| ID | Classificação | Severidade | Módulo | Resumo do Problema |
| :--- | :--- | :--- | :--- | :--- |
| **BUG-01** | Operacional / Bloqueante | 🔴 **Crítica** | Frontend / Movimentações | Saída manual envia texto livre como `colaboradorId`, gerando erro 404 em todas as baixas |
| **BUG-02** | Infra / Conectividade | 🔴 **Crítica** | Server / Firebase Admin | Falta de credenciais de serviço ou emulador trava requisições da API com timeout de ADC |
| **BUG-03** | Regra de Negócio | 🟠 **Alta** | Core / Custos | Custo Médio Ponderado não é recalculado e não atualiza o item após entradas por compra/NFe |
| **BUG-04** | Performance / Custos Cloud | 🟠 **Alta** | Frontend / API | Varredura de coleções completas no Firestore sem paginação ou filtro temporal |
| **BUG-05** | Banco de Dados | 🟠 **Alta** | Firestore / Auditoria | `firestore.indexes.json` vazio quebra consultas filtradas por ação/usuário na Auditoria |
| **BUG-06** | Integridade / Auditoria | 🟡 **Média** | API / Catálogo | Cadastro de item com `estoqueInicial > 0` não grava movimentação no extrato físico |
| **BUG-07** | Concorrência / ACID | 🟡 **Média** | API / Inventário | Ajuste de inventário físico direto em lote não é transacional (loop não atômico) |
| **BUG-08** | Tipagem / Runtime | 🟡 **Média** | Frontend / Hooks | Fallback direto do Firestore em `useItensEstoque` expõe objetos `Timestamp` onde se espera string |
| **BUG-09** | Arquitetura de Software | 🟡 **Média** | Frontend / Store | `useBaixaRapidaStore` foi totalmente implementada e testada, mas esquecida/desconectada da UI |
| **BUG-10** | Usabilidade / UI | 🔵 **Baixa** | API / Pedidos | Ao entregar pedido, o extrato grava o ID do cliente (`client-xxx`) em vez do nome da empresa |
| **BUG-11** | Precisão Numérica | 🔵 **Baixa** | Core / Embalagens | Operador `%` em números com casas decimais pode gerar resíduos em frações de embalagem |
| **BUG-12** | Automação E2E | ⚪ **Infra** | Ferramental | Playwright falha no download de binário para Windows com erro 404 da CDN da Microsoft |

---

## 3. Detalhamento Completo dos Bugs e Falhas Encontrados

---

### BUG-01: [Crítico] Baixa Manual de Material Falha com 404 por Envio de Texto Livre como `colaboradorId`

- **Arquivos Afetados:**
  - [`MovementFormDrawer.tsx`](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/dashboard/drawers/MovementFormDrawer.tsx#L188-L195) (linhas 188-195 e 367-377)
  - [`SaidaManualView.tsx`](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/gestao/saida/SaidaManualView.tsx#L168-L175) (linhas 168-175)
  - [`useMovimentacoesPeriodo.ts`](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/hooks/useMovimentacoesPeriodo.ts#L281-L287) (linhas 281-287)
  - [`movimentacao.service.ts`](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/core/services/movimentacao.service.ts#L133-L146) (linhas 133-146)
- **Descrição da Causa Raiz:**
  Nos formulários de saída manual de estoque (tanto no Drawer lateral quanto na aba "Saída Manual"), existe um campo de texto livre rotulado *"Retirado por / Setor"* com o placeholder `"Ex: Produção, Serralheria"` e valor padrão `"Produção"`.
  Quando o usuário clica em **"Confirmar Saída"**, o formulário envia para a API backend (`POST /api/movimentacoes/baixa-interna`) o seguinte payload:
  ```typescript
  colaboradorId: quem.trim() || 'PRODUCAO'
  ```
  No backend, o método `validarColaboradorAtivo` busca esse valor no repositório de colaboradores:
  ```typescript
  const colaborador = await this.repository.buscarColaboradorPorId(colaboradorId);
  if (!colaborador) {
    throw new ColaboradorNaoEncontradoError(colaboradorId);
  }
  ```
  Como `"Produção"` é um nome de setor ou texto arbitrário e não uma matrícula ou ID de colaborador previamente cadastrado, a chamada é recusada com **HTTP 404**:
  `"Colaborador com ID 'Produção' não foi encontrado no sistema."`
- **Impacto:** O operador ou almoxarife é incapaz de registrar qualquer retirada rápida ou avulsa através dessas duas telas essenciais do sistema.
- **Correção Recomendada:**
  Substituir o campo de texto livre por um componente de seleção/autocomplete de colaboradores cadastrados (`useColaboradores`), enviando o `colaborador.id` real e repassando o setor selecionado no campo opcional `setor`.

---

### BUG-02: [Crítico] Backend Trava em Timeout de ADC por Falta de Credenciais Admin ou Conexão a Emuladores

- **Arquivos Afetados:**
  - [`firebase-admin.ts`](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/server/firebase-admin.ts#L15-L39) (linhas 15-39)
  - [`.env.local`](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/.env.local) (linhas 1-8)
  - [`.env.example`](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/.env.example#L9-L14)
- **Descrição da Causa Raiz:**
  O backend do Next.js instancia o Firebase Admin SDK via `initializeApp({ projectId })`. Em ambiente local, se `FIREBASE_ADMIN_CLIENT_EMAIL` e `FIREBASE_ADMIN_PRIVATE_KEY` não estiverem definidos (como ocorre no `.env.local` atual), o Google Auth Library tenta localizar credenciais padrão (ADC - Application Default Credentials) consultando a rede e os servidores de metadados do Google Cloud (`169.254.169.254`).
  Isso gera avisos e bloqueios:
  ```
  MetadataLookupWarning: received unexpected error = All promises were rejected code = ETIMEDOUT, ENOTFOUND
  Error: Could not load the default credentials.
  ```
  Além disso, o arquivo [`firebase.json`](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/firebase.json) define emuladores locais de Firestore (8080) e Auth (9099), mas [`firebase-admin.ts`](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/server/firebase-admin.ts) e [`firebase.ts`](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/core/services/firebase.ts) não apontam para as portas dos emuladores quando executados localmente.
- **Impacto:** Qualquer chamada às rotas de API que autenticam via Admin SDK (`/api/itens`, `/api/movimentacoes`, etc.) sofre um congelamento de vários segundos em conexões de desenvolvimento local antes de estourar erro 401/500.
- **Correção Recomendada:**
  1. Suportar variáveis de ambiente `FIRESTORE_EMULATOR_HOST=localhost:8080` e `FIREBASE_AUTH_EMULATOR_HOST=localhost:9099` quando em modo de desenvolvimento.
  2. Disponibilizar ou documentar as chaves de Service Account (`FIREBASE_ADMIN_CLIENT_EMAIL` e `FIREBASE_ADMIN_PRIVATE_KEY`) no `.env.local` para testes locais com a nuvem.

---

### BUG-03: [Alto] Custo Médio Ponderado não é Recalculado nem Atualizado nas Entradas de Estoque

- **Arquivos Afetados:**
  - [`movimentacao.service.ts`](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/core/services/movimentacao.service.ts#L158-L213) (linhas 158-213)
  - [`nfe-entrada.service.ts`](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/core/services/nfe-entrada.service.ts#L193-L222) (linhas 193-222)
  - [`custo-medio.ts`](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/core/services/custo-medio.ts#L8-L29)
- **Descrição da Causa Raiz:**
  A função `calcularCustoMedioPonderado` foi concebida conforme as regras contábeis do almoxarifado:
  $$\text{novoCusto} = \frac{(\text{saldoAtual} \times \text{custoAtual}) + (\text{qtdEntrada} \times \text{custoEntrada})}{\text{saldoAtual} + \text{qtdEntrada}}$$
  Porém, ao inspecionar `MovimentacaoService.executarEntrada` e `NFeEntradaService.efetivarEntradaNFe`, constata-se que ambos os serviços atualizam **única e exclusivamente** o saldo físico do item (`repository.atualizarSaldoItem(item.id, novoSaldo)`). O campo `custoUnitario` do cadastro do item **nunca é recalculado nem gravado** após a chegada de uma nova compra ou NF-e com preço unitário diferente.
- **Impacto:** A precificação e valorização financeira do estoque em relatórios gerenciais e no fechamento contábil continuam congeladas no custo cadastral inicial, gerando distorções no valuation da empresa.
- **Correção Recomendada:**
  Ao registrar uma entrada com `valorUnitario > 0`, calcular o custo médio ponderado e invocar um método no repositório para atualizar tanto o saldo quanto o custo unitário do item (ex: `atualizarSaldoECustoItem(itemId, novoSaldo, novoCusto)`).

---

### BUG-04: [Alto] Varredura de Coleções Inteiras sem Paginação ou Limite Temporal no Firestore

- **Arquivos Afetados:**
  - [`useDashboardResumo.ts`](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/hooks/useDashboardResumo.ts#L55-L148) (linhas 55, 104, 125 e 138)
  - [`firestore-estoque.repository.ts`](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/server/storage/firestore-estoque.repository.ts#L324-L365) (linhas 331-363)
  - [`faturamento/route.ts`](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/app/api/faturamento/route.ts#L62-L67)
  - [`pedidos/route.ts`](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/app/api/pedidos/route.ts#L74-L78)
  - [`terceiros/route.ts`](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/app/api/terceiros/route.ts#L45-L49)
- **Descrição da Causa Raiz:**
  1. Em `useDashboardResumo.ts`, para contabilizar movimentações ocorridas hoje, o hook do frontend executa:
     ```typescript
     const movsSnap = await getDocs(collection(db, 'movements'));
     movsSnap.forEach((doc) => {
       if (dataMov.startsWith(hojeISO)) totalMovsHoje += 1;
     });
     ```
     Ele baixa a coleção inteira de movimentações históricas no navegador do usuário para fazer um filtro local com `if`.
  2. Em `FirestoreEstoqueRepository.listarMovimentacoes`, quando nenhum filtro específico é fornecido, a query executa `this.db.collection('movements').get()`, transferindo todas as movimentações da base de dados para a memória do servidor e realizando `lista.slice(inicio, inicio + limite)` em JavaScript.
  3. Em `/api/faturamento`, `/api/pedidos` e `/api/terceiros`, a rota executa `Promise.all` baixando todas as coleções de pedidos, itens, notas e parceiros de uma só vez.
- **Impacto:** Conforme o estoque opera ao longo de semanas e meses, o volume de documentos causará:
  - Consumo explosivo da cota diária de leitura do Cloud Firestore (faturamento desnecessário).
  - Lentidão severa no carregamento da tela inicial.
  - Sobrecarga de memória RAM em dispositivos clientes móveis e desktop.
- **Correção Recomendada:**
  Aplicar filtros na query do Firestore:
  - Em `useDashboardResumo`: `query(collection(db, 'movements'), where('dataMovimentacao', '>=', hojeISO))`.
  - Em `listarMovimentacoes`: utilizar `.orderBy('dataMovimentacao', 'desc').limit(limite)`.

---

### BUG-05: [Alto] Falta de Índices Compostos em `firestore.indexes.json` para Consultas de Auditoria

- **Arquivos Afetados:**
  - [`firestore.indexes.json`](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/firestore.indexes.json)
  - [`firestore-auditoria.repository.ts`](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/server/storage/firestore-auditoria.repository.ts#L54-L64) (linhas 54-64)
- **Descrição da Causa Raiz:**
  No arquivo [`firestore-auditoria.repository.ts`](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/server/storage/firestore-auditoria.repository.ts), a consulta de listagem de eventos de auditoria aplica:
  ```typescript
  if (filtros?.acao) {
    query = query.where('acao', '==', filtros.acao);
  }
  query = query.orderBy('createdAt', 'desc');
  ```
  No Firestore, qualquer consulta que combine uma cláusula de igualdade (`==`) com uma ordenação por outro campo (`orderBy('createdAt', 'desc')`) **exige a definição prévia de um índice composto**.
  O arquivo [`firestore.indexes.json`](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/firestore.indexes.json) encontra-se atualmente vazio (`"indexes": []`).
- **Impacto:** Ao utilizar o filtro por ação na tela de **Auditoria Operacional** em ambiente de produção, a query lançará erro fatal: `FAILED_PRECONDITION: The query requires an index`.
- **Correção Recomendada:**
  Declarar os índices compostos necessários no arquivo `firestore.indexes.json` e efetuar o deploy via Firebase CLI:
  ```json
  {
    "collectionGroup": "auditoria_operacional",
    "queryScope": "COLLECTION",
    "fields": [
      { "fieldPath": "acao", "order": "ASCENDING" },
      { "fieldPath": "createdAt", "order": "DESCENDING" }
    ]
  }
  ```

---

### BUG-06: [Médio] Cadastro de Item com `estoqueInicial > 0` não Registra Movimentação no Extrato

- **Arquivos Afetados:**
  - [`itens/route.ts`](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/app/api/itens/route.ts#L104-L113) (linhas 104-113)
- **Descrição da Causa Raiz:**
  Na rota `POST /api/itens`, quando um novo item é cadastrado contendo um saldo inicial (`estoqueInicial > 0`), o documento é gravado com `estoqueAtual: input.estoqueInicial`. No entanto, nenhuma movimentação correspondente (ex: `AJUSTE_INVENTARIO_POSITIVO` ou `ENTRADA_PRODUCAO`) é registrada na coleção `movements`.
- **Impacto:** O item passa a exibir saldo físico disponível no painel, mas o seu histórico/extrato analítico de movimentações fica totalmente vazio. A auditoria contábil não consegue rastrear de onde se originou aquele estoque inicial.
- **Correção Recomendada:**
  Quando `input.estoqueInicial > 0`, executar a gravação de uma movimentação inicial de abertura (`saldoAnterior: 0`, `saldoResultante: input.estoqueInicial`, `observacao: 'Saldo de implantação/abertura de cadastro'`).

---

### BUG-07: [Médio] Ajuste de Inventário em Lote não é Transacional (Falta de Atomicidade ACID)

- **Arquivos Afetados:**
  - [`ajuste-direto/route.ts`](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/app/api/inventario/ajuste-direto/route.ts#L58-L90) (linhas 58-90)
- **Descrição da Causa Raiz:**
  Na rota `POST /api/inventario/ajuste-direto`, o processamento de múltiplos itens divergentes é executado através de um loop simples:
  ```typescript
  for (const item of divergentes) {
    const res = await service.executarAjusteInventario({ ... });
  }
  ```
  As chamadas não estão encapsuladas em uma transação única (`runTransaction`) ou lote de escrita (`writeBatch`).
- **Impacto:** Se o processo for interrompido no meio do lote (por exemplo, queda de rede ou erro de validação no 10º item), os 9 itens anteriores já foram alterados no banco de dados e os itens subsequentes não serão processados, quebrando a integridade atômica do balanço de inventário.
- **Correção Recomendada:**
  Implementar um método `registrarAjusteInventarioLoteAtomico` no repositório que agrupe todas as leituras e atualizações dentro de um `runTransaction` único, idêntico ao já existente `registrarBaixaLoteAtomica`.

---

### BUG-08: [Médio] Fallback do Firestore em `useItensEstoque` Expõe Instâncias de `Timestamp` não Tratadas

- **Arquivos Afetados:**
  - [`useItensEstoque.ts`](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/hooks/useItensEstoque.ts#L106-L115) (linhas 106-115)
  - [`firestore-estoque.mapper.ts`](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/server/storage/firestore-estoque.mapper.ts)
- **Descrição da Causa Raiz:**
  Quando a chamada da API `/itens` falha e o hook `useItensEstoque` aciona seu fallback consultando o Firestore diretamente pelo navegador, os documentos retornados possuem campos de data (`createdAt`, `updatedAt`) no formato de objeto proprietário do SDK (`Timestamp { seconds, nanoseconds }`), e não como string ISO.
  Como o hook faz apenas `(d.data() as Item)`, essas instâncias de Timestamp são propagadas diretamente para a interface React.
- **Impacto:** Componentes que utilizam `.slice(0, 10)`, `new Date(item.createdAt)` ou `.localeCompare()` podem sofrer quebra de renderização com erros de JavaScript no cliente (`TypeError`).
- **Correção Recomendada:**
  Utilizar um sanitizador/conversor no cliente (análogo ao `itemFromFirestore` do servidor) para transformar os objetos `Timestamp` em strings ISO antes de repassar os dados ao estado do React.

---

### BUG-09: [Médio] Desconexão da Store `useBaixaRapidaStore` no Frontend

- **Arquivos Afetados:**
  - [`useBaixaRapidaStore.ts`](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/core/store/useBaixaRapidaStore.ts)
  - [`QuickItemPickerDrawer.tsx`](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/dashboard/drawers/QuickItemPickerDrawer.tsx)
  - [`AppRibbonHeader.tsx`](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/layout/AppRibbonHeader.tsx)
- **Descrição da Causa Raiz:**
  Foi desenvolvido um carrinho de baixa rápida com validação atômica de lotes e retenção de colaborador (`useBaixaRapidaStore`). Todos os testes unitários da store passam com excelência (`useBaixaRapidaStore.spec.ts`).
  No entanto, **nenhum componente da camada visual em `src/web` consome essa store**. A Ribbon e os botões de ação rápida chamam apenas drawers de item avulso (`MovementFormDrawer`).
- **Impacto:** A funcionalidade de "Carrinho de Retirada para Chão de Fábrica" (onde o almoxarife atende um colaborador com múltiplos itens de uma vez) está inacessível para os usuários finais na interface.
- **Correção Recomendada:**
  Conectar a store `useBaixaRapidaStore` a uma gaveta ou modal de retirada em lote na interface web.

---

### BUG-10: [Baixo] ID Oculto do Cliente Gravado no Lugar do Nome no Histórico de Expedição de Pedidos

- **Arquivos Afetados:**
  - [`pedidos/[id]/route.ts`](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/app/api/pedidos/%5Bid%5D/route.ts#L119) (linha 119)
- **Descrição da Causa Raiz:**
  Ao transicionar o status de um pedido para `ENTREGUE`, o backend realiza a baixa de estoque e grava o registro na coleção `movements` com:
  ```typescript
  destinatario: pedido.clienteId // Ex: "client-09238490234"
  ```
  Deveria ser o nome fantasia ou razão social da empresa compradora.
- **Impacto:** Na tabela de extrato de movimentações e nos relatórios de auditoria, a coluna *"Destinatário / Colaborador"* exibe um código técnico opaco em vez do nome do cliente.
- **Correção Recomendada:**
  Consultar ou propagar o nome do cliente no momento da transação (ex: `destinatario: clienteNome || pedido.clienteId`).

---

### BUG-11: [Baixo] Imprecisão Decimal por Ponto Flutuante em Conversão de Unidades e Embalagens

- **Arquivos Afetados:**
  - [`item.schema.ts`](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/core/domain/item.schema.ts#L173-L175) (linhas 173-175)
- **Descrição da Causa Raiz:**
  A função `converterUnidadeParaEmbalagem` utiliza o operador módulo do JavaScript:
  ```typescript
  const sobraAvulsa = quantidadeUnidades % fatorConversao;
  ```
  Quando `quantidadeUnidades` ou `fatorConversao` contêm números fracionários (ex: 5.75 metros ou quilos), o operador `%` do IEEE 754 pode gerar pequenas dízimas binárias (ex: `5.75 % 2 = 1.7500000000000004`).
- **Impacto:** Pequenas distorções visuais de casas decimais em etiquetas ou relatórios de embalagem.
- **Correção Recomendada:**
  Aplicar o utilitário `arredondar3(quantidadeUnidades % fatorConversao)` para garantir 3 casas decimais exatas.

---

### BUG-12: [Infra] Falha no Download do Driver do Playwright no Ambiente Windows

- **Arquivos Afetados:**
  - Subagente de automação do navegador / Playwright Manager
- **Descrição da Causa Raiz:**
  Durante a tentativa de execução do `browser_subagent` para varredura dinâmica no navegador, a ferramenta tentou baixar o executável `playwright-1.57.0-win32_x64.zip` a partir das CDNs Azure/Akamai/Verizon, recebendo `HTTP 404 Not Found`.
- **Impacto:** Automações headless diretas pelo Playwright não puderam abrir a janela gráfica, exigindo que a inspeção dinâmica de frontend e backend fosse realizada através de testes de integração via HTTP (`curl.exe`), leitura de SSR e inspeção estática.
- **Correção Recomendada:**
  Instalar ou travar a versão dos binários do Playwright compatível com o ambiente local (ex: via `npx playwright install` com binários oficiais estáveis).

---

## 4. Recomendações e Plano de Ação Prioritário

Para elevar o sistema ao nível máximo de robustez e confiabilidade operacional:

1. **Fase 1 (Imediata / Bloqueante):**
   - Corrigir o campo de colaborador em `MovementFormDrawer` e `SaidaManualView` para enviar identificadores válidos de colaboradores em vez de texto livre (`BUG-01`).
   - Configurar variáveis do Firebase Admin SDK ou suporte ao emulador local no backend (`BUG-02`).
2. **Fase 2 (Regras Contábeis & Segurança):**
   - Integrar o cálculo de Custo Médio Ponderado às entradas de mercadoria (`BUG-03`).
   - Adicionar os índices compostos no `firestore.indexes.json` (`BUG-05`).
   - Gerar movimentação de abertura de saldo quando um item for criado com estoque inicial (`BUG-06`).
3. **Fase 3 (Performance e Escalabilidade):**
   - Substituir os escaneamentos completos de coleções por consultas paginadas e filtradas por data (`BUG-04`).
   - Tornar o ajuste de inventário em lote estritamente transacional (`BUG-07`).
   - Conectar a store `useBaixaRapidaStore` na interface visual do operador (`BUG-09`).
