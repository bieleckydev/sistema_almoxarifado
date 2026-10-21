# Auditoria: Protótipo 3.0 (commit `91dd7c7`) vs Projeto Web React/Next

- **Commit auditado:** `91dd7c7` – "Projeto Finalizado, testado, sem erros SEM ALTERAS" (2026-10-20)
- **Protótipo:** `Front end Almoxarifado/Almoxarife Finalizado 3.0/` (`sistema.html`, `sistema.css`, `sistema.js`)
- **Projeto real:** `src/web` (Next.js) + `src/core` (domínio/serviços)
- **Método:** leitura integral do `sistema.js` (900 linhas) e do `sistema.html`; diff 2.0 → 3.0; inspeção de `page.tsx`, `AppSidebar.tsx`, drawers, views, hooks e rotas API do React.
- **Nenhum código foi alterado.** Este documento é somente levantamento.

> [!NOTE]
> O commit adiciona a pasta 3.0 inteira (3 arquivos). O `sistema.css` é idêntico ao da 2.0; as mudanças da 3.0 sobre a 2.0 estão no `sistema.js` (+66/−35 linhas) e estão marcadas com 🆕 abaixo.
> Os itens "Backend existe, UI não" foram confirmados por haver serviço/rota em `src/core` ou `src/web/app/api` sem consumo em `src/web/components`.

Legenda: ❌ ausente · ⚠️ parcial/diferente · ✅ equivalente

---

## 1. Resumo executivo

O protótipo 3.0 é um sistema com **controle completo** (perfis de acesso, auditoria, inventário, requisições, estorno, lotes, custo, importação de XML). O React cobre bem o **fluxo operacional básico** (estoque, vendas, clientes, saída manual, faturamento, terceiros, busca global), mas **não tem 3 telas inteiras** (Requisições, Inventário, Auditoria) e vários recursos transversais.

| Categoria | Quantidade de lacunas |
| :--- | :---: |
| Telas inteiras ausentes | 3 |
| Recursos transversais ausentes (perfis, lotes, custo/valor, XML, etiqueta, ordenação/paginação…) | 10 |
| Ações/fluxos ausentes dentro de telas existentes | 12 |
| Divergências de aparência/UX | 8 |
| Backend pronto mas sem UI | 3 |

---

## 2. Telas e módulos

| # | Tela do protótipo | Função no protótipo | React | Situação |
| :-: | :--- | :--- | :--- | :---: |
| 1 | **Requisições** (`telaReq`) | Produção solicita → Gestor aprova/recusa → Almoxarife entrega (baixa estoque com lote). Badge de pendentes no menu (só quem pode aprovar). | Não existe tela, rota, schema nem hook. | ❌ |
| 2 | **Inventário (contagem)** (`telaInv`) | Chips por categoria, campo "Contado" por item, diferença colorida em tempo real, motivo obrigatório, gera lançamentos de **Ajuste de inventário**. Bloqueia contagem negativa 🆕. | Sem tela. Existem `src/core/services/inventario.service.ts`, `useInventario.ts` e rota `api/movimentacoes/ajuste`, **sem UI**. | ❌ (backend pronto) |
| 3 | **Auditoria** (`telaAud`) | Log "quando / quem + perfil / ação / detalhe" de todas as ações (movimentações, estornos, ajustes, edições, faturamentos, pedidos, cadastros, terceiros). | Sem tela. Só existe `api/admin/users/[uid]/audit` (auditoria de usuários, não operacional). | ❌ |
| 4 | Início | Ações rápidas, "Precisa de atenção", cards de Estoque e Gestão (Vendas/Clientes/Saída manual). | `InicioDashboardView` | ✅ (mais rico no React) |
| 5 | MP / IMP / Motos | Lista com stats, busca, chips de situação. | `page.tsx` + `StockTable` | ⚠️ ver §4 |
| 6 | Vendas, Clientes, Entradas e saídas, Faturamento, Terceiros | — | Views existentes | ⚠️ ver §5 |

---

## 3. Recursos transversais ausentes no React

### 3.1 Perfis de acesso e permissões (RBAC na interface) ❌
**Protótipo:** 4 perfis (`admin`, `gestor`, `almox`, `prod`), mapa `PERM`, `VER` (telas visíveis por perfil) e `ACAO` (botão → permissão). Itens do menu somem conforme o perfil; clique sem permissão mostra aviso "O perfil X não permite esta ação". Trocar de usuário mudando de tela inacessível redireciona para Início 🆕. Seletor "Usuário" na barra superior simula o login.
**React:** `AppSidebar` mostra os mesmos itens para todos; só distingue o rótulo `mestre` ("Gestor de Estoque") vs outros ("Almoxarife"). Há `ROLE_PERMISSIONS` em `src/core/domain/user-authorization.ts` (`mestre/admin/operador/requisitante`) e `firestore.rules`, mas **não são aplicados à UI** (botões e telas).
**Lacuna extra:** os perfis do protótipo (Gestor, Almoxarife, Produção) não têm correspondência 1:1 com os roles do React (`operador`, `requisitante`); precisa de mapeamento.

### 3.2 Lotes de estoque (FIFO simples) ❌
- `lotesDe(item)` calcula lotes em estoque (entradas com lote − saídas do lote + "Saldo anterior").
- Retirada oferece **"Lote de onde sai"** (select) e valida saldo do lote.
- Saída por pedido, requisição e saída manual escolhe automaticamente um lote com saldo.
- Drawer do item mostra "Lotes em estoque"; histórico mostra `· lote X`.
- **React:** `lote` aparece só como campo de texto informativo na entrada e no CSV; sem cálculo de saldo por lote, sem seleção na saída. (A rota `baixa-lote` existe no backend sem UI de lote.)

### 3.3 Custo unitário, valor em estoque e custo médio ❌
- Campo "Custo unitário (R$)" no cadastro, edição e entrada; **custo médio ponderado** recalculado em cada entrada.
- Stat "Valor em estoque" por aba; coluna "Valor" na tabela; "Valor em estoque" e "Custo unitário" no drawer do item.
- **React:** `DashboardItem` não tem custo; nenhuma coluna/stat de valor monetário no estoque.

### 3.4 Importação de XML da NF-e na entrada ❌
`lerXML()` lê o arquivo (`nNF`, emitente `xNome`, `dhEmi`, item por `cProd`/`xProd`, `qCom`, `vUnCom`, `nLote`) e **preenche o formulário**; avisa se o item não casar. **React:** sem upload de XML no `MovementFormDrawer`. (Há `nfe-entrada.service.ts`/`nfe.schema.ts` no core, sem UI.)

### 3.5 Estorno de lançamento (com motivo) ❌
Botão **Estornar** em cada movimentação do histórico do item: cria lançamento contrário com `estorno:true`, marca o original como `estornado`, tags "Estornado"/"Estorno", impede estornar entrada já consumida. **React:** inexistente (histórico é só leitura).

### 3.6 Edição de item ❌
"Editar item" no drawer: nome, código, categoria, unidade, custo, mínimo, capacidade e campos específicos; valida SKU duplicado e mínimo ≤ capacidade; quantidade só muda por movimentação. **React:** `ItemDetailsDrawer` não tem edição; só há criação (`ItemCreateDrawer`).

### 3.7 Etiqueta imprimível do item ❌
"Imprimir etiqueta" (`#etiq`, classe `print-etq`) com nome, código, categoria, lote e unidade. **React:** sem etiqueta.

### 3.8 Impressão de relatórios ❌
Botão **Imprimir** (`window.print`) em "Entradas e saídas" e "Faturamento". **React:** nenhum `window.print`; "Relatório de Turno" no Início apenas navega para `saida`.

### 3.9 Ordenação e paginação da lista de itens ❌
Cabeçalhos clicáveis (Item, Quantidade, Valor, Nível) com ▲/▼ e `aria-sort`; paginação "‹ Anterior · Página X de Y · N itens" (5/pág. no protótipo, 20 em produção). **React:** `StockTable` sem ordenação por coluna e sem paginação.

### 3.10 Atalhos e rede de segurança ⚠️
- Esc fecha painel/busca; `Enter` abre linha; `/` ou `Ctrl+K` abre busca — React tem `/` e Ctrl/⌘+K em `GlobalSearchInput`; **verificar** Esc/Enter em linhas.
- 🆕 Handler global de erro (`window.onerror` → toast "Algo inesperado aconteceu"). **React:** sem equivalente global.
- 🆕 Anti-duplo-clique: botão de submit desabilitado por 900 ms. **React:** verificar por formulário (não há padrão central).

---

## 4. Telas de estoque (MP / IMP / Motos)

| Item | Protótipo | React | Situação |
| :--- | :--- | :--- | :---: |
| Stats | Itens, Abaixo do mínimo, Crítico, **Valor em estoque** | Itens, Abaixo, Crítico (sem valor) | ⚠️ |
| Colunas | Item, Quantidade, Valor, Nível, Situação, ações | Código/SKU, Descrição, Localização, Saldo & Cobertura, Situação, Ações | ⚠️ (React tem Localização; sem Valor) |
| Busca | Nome, código, categoria **e lote/ficha técnica** | Verificar cobertura de especificações | ⚠️ |
| Ações por linha | + Entrada, Retirar | Entrada, Saída, Baixa rápida | ✅ |
| Drawer do item | Mín., Capacidade, Custo, Valor, **Lotes**, Falta p/ mínimo, Ficha técnica, Histórico c/ **Estornar** | Ficha técnica e histórico (sem custo, lotes, estorno, edição, etiqueta) | ⚠️ |
| Anti-duplicidade de NF-e | Bloqueia NF-e já lançada para o item | Implementada no core (`anti-duplicidade-nfe.spec.ts`) | ✅ |
| Quantidades fracionárias 🆕 | `step="any"`, mín. 0,001, arredondamento a 3 casas | **Verificar** `step`/validação nos drawers e `Math.round` em quantidades | ⚠️ |
| Validação mín. ≤ capacidade 🆕 | Bloqueia no cadastro | **Verificar** em `ItemCreateDrawer` | ⚠️ |
| Nível com mínimo = 0 🆕 | `razao()` evita divisão por zero | **Verificar** cálculo de cobertura/ordenação "Atenção" | ⚠️ |

---

## 5. Ações ausentes dentro de telas existentes

| # | Tela | Ação/recurso do protótipo | React | Situação |
| :-: | :--- | :--- | :--- | :---: |
| 1 | Vendas 🆕 | **Cancelar pedido** (botão + drawer com motivo obrigatório; bloqueia se já faturado; status `Cancelado`; não aparece como "a faturar") | Schema/badge tratam `CANCELADO`, mas **não há botão/fluxo** nem transição na API (`PATCH` só PENDENTE→SEPARADO→ENTREGUE) | ❌ |
| 2 | Vendas | Tag "Faturado · NF xxxx" / "A faturar" por pedido | **Verificar** em `VendasView`/`OrderStatusBadge` | ⚠️ |
| 3 | Vendas | Baixa de estoque na entrega com lote | Baixa existe; sem lote | ⚠️ |
| 4 | Faturamento | **Cancelar nota** (motivo; pedido volta para "a faturar"; tag "Cancelada"; exclui do total faturado) | Sem cancelamento de nota | ❌ |
| 5 | Faturamento | Notas emitidas listam também **Retorno de industrialização** (gerada na devolução de terceiros) | **Verificar** integração terceiros → notas | ⚠️ |
| 6 | Faturamento | Bloqueia faturar pedido sem preços e NF-e/série duplicada | Verificar no `FaturarPedidoDrawer`/rota | ⚠️ |
| 7 | Terceiros | Movimento **Sucata/Perda** (motivo obrigatório; coluna "Sucata"; botão por linha) | Só `ENTRADA_REMESSA`, `CONSUMO_PRODUCAO`, `DEVOLUCAO_RETORNO` | ❌ |
| 8 | Terceiros | Devolução com **valor do serviço de industrialização** gerando nota de retorno | Verificar campo de valor em `MovimentarTerceiroDrawer` | ⚠️ |
| 9 | Terceiros | Ações por linha **Consumir / Devolver / Sucata** direto na tabela | Verificar `TerceirosView` | ⚠️ |
| 10 | Saída manual | Lançar **Entrada ou Saída** no mesmo formulário (campo "Movimento") | Verificar `SaidaManualView` | ⚠️ |
| 11 | Entradas e saídas | Seção "Movimentações do período" com **Estornar** | Sem estorno | ❌ |
| 12 | Clientes | Tela somente cadastro (sem edição) | React equivalente ou superior | ✅ |

---

## 6. Navegação, layout e aparência

| # | Aspecto | Protótipo 3.0 | React | Situação |
| :-: | :--- | :--- | :--- | :---: |
| 1 | Menu lateral | 5 grupos: *(Início)*, Estoque, Movimentações (**Entradas e saídas, Requisições, Inventário**), Comercial, Controle (**Auditoria**) | Grupos Estoque, Movimentações (só "Entradas e Saídas"), Comercial; **sem Requisições, Inventário, Controle/Auditoria** | ❌ |
| 2 | Badges do menu | Críticos por aba, atrasados em Vendas, a faturar, **requisições pendentes** | Tem os três primeiros; falta requisições | ⚠️ |
| 3 | Ocultação de itens por perfil | Sim | Não | ❌ |
| 4 | Seletor de usuário na topbar | `#user` (simula login/perfil) | Login real; sem indicação de perfil operacional | ⚠️ |
| 5 | Botões fixos na topbar | "+ Registrar entrada" / "Registrar saída" sempre visíveis | `AppTopHeader`: verificar presença; ribbon existe mas **`AppRibbonHeader` não é usado em `page.tsx`** | ⚠️ |
| 6 | Tema claro/escuro | Botão "Tema" (padrão claro) | `ThemeToggle` | ✅ |
| 7 | Identidade visual | Fonte IBM Plex Sans, logo "A", faixa de identidade `.stripe` | Design Stitch/MD3, logo "R / Rhowert" | ⚠️ (decisão de design, não bug) |
| 8 | Início: ações rápidas | "Receber material de terceiro", "Novo pedido", "Novo cadastro" | `QuickActionsBar` com ações equivalentes | ✅ |

> [!IMPORTANT]
> O React segue a arquitetura de **módulos + Ribbon (protótipo v5)**, enquanto o protótipo 3.0 **abandonou a Ribbon e os módulos** e voltou a um **menu lateral único em grupos**. A sidebar atual do React (commit `9cc4e41`) já se aproxima do 3.0, porém a Ribbon e o conceito de `moduloAtivo` permanecem no código. É preciso decidir qual navegação é a oficial.

---

## 7. Regras de negócio do protótipo para conferir no React

1. Saída não pode exceder saldo do item **nem do lote escolhido**.
2. NF-e repetida para o mesmo item é bloqueada (✅ já no core).
3. Pedido só entrega com saldo para todos os itens; entrega baixa estoque e registra lote.
4. Pedido cancelado não é "atrasado", "a faturar" nem conta como aberto 🆕.
5. Cancelar nota de venda exige motivo e devolve o pedido para "a faturar"; pedido já faturado não pode ser cancelado antes de cancelar a nota.
6. Terceiros: não entram no estoque próprio nem no faturamento de venda; NF de remessa duplicada por cliente é bloqueada; material existente do mesmo cliente **soma** no saldo.
7. Estorno exige motivo, não estorna estorno/ajuste/já estornado.
8. Inventário só lança diferenças ≠ 0, exige motivo e contagem ≥ 0.
9. Data de lançamento não pode ser futura (`max=hoje`).
10. Textos digitados são escapados (`esc`) — no React o JSX já escapa (✅).

---

## 8. Backend/core já existente sem UI (oportunidades rápidas)

| Recurso | Local | Falta |
| :--- | :--- | :--- |
| Ajuste de inventário | `core/services/inventario.service.ts`, `core/hooks/useInventario.ts`, `api/movimentacoes/ajuste` | Tela de contagem |
| Baixa por lote | `api/movimentacoes/baixa-lote` | Seleção de lote na saída |
| NF-e (XML/arquivo) | `core/services/nfe-entrada.service.ts`, `nfe-archive.service.ts`, `domain/nfe.schema.ts` | Upload/preenchimento no drawer de entrada |
| Roles/permissões | `core/domain/user-authorization.ts`, `firestore.rules` | Aplicação na UI |

---

## 9. Backlog sugerido (priorizado)

| Prioridade | Item | Esforço |
| :-: | :--- | :-: |
| P0 | Perfis/permissões na UI (menu, botões, redirecionamento) | M |
| P0 | Tela **Inventário** (usa backend pronto) | M |
| P0 | Cancelar pedido (UI + API + status) | M |
| P1 | Tela **Auditoria** operacional (coleção de logs + gravação nas ações) | G |
| P1 | Tela **Requisições** (schema, API, aprovação, entrega) | G |
| P1 | Estorno de movimentação | M |
| P1 | Cancelar nota fiscal (reabre pedido) | M |
| P1 | Editar item | M |
| P2 | Lotes (saldo por lote + seleção) | G |
| P2 | Custo médio e valor em estoque | M |
| P2 | Importar XML NF-e | M |
| P2 | Sucata/Perda em terceiros | P |
| P3 | Ordenação e paginação da tabela | P |
| P3 | Etiqueta e impressão de relatórios | P |
| P3 | Handler global de erro e anti-duplo-clique | P |
| — | Decidir navegação oficial (Ribbon v5 × menu 3.0) | Decisão |

Esforço: P = pequeno · M = médio · G = grande.

---

## 10. Itens marcados "verificar"

Os itens ⚠️ com "Verificar" foram identificados como pontos de conferência e não têm evidência conclusiva de lacuna nesta passagem (leitura por busca de padrões, não execução da aplicação). Recomenda-se validar rodando ambos lado a lado antes de abrir tarefas.
