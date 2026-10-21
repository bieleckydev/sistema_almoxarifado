# Plano de Implementação: Paridade total com o Protótipo 3.0

- **Referência única:** `Front end Almoxarifado/Almoxarife Finalizado 3.0/` (commit `91dd7c7`). Ribbon e módulos corporativos do protótipo v5 **deixam de ser referência**.
- **Insumo:** [auditoria_prototipo_3_0_vs_react.md](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/docs/auditoria_prototipo_3_0_vs_react.md)
- **Destino:** `src/web` (Next.js) com regras de negócio em `src/core` e persistência Firestore (`src/server`).
- **Princípio:** regra de negócio no `core` (testável, sem React); rota API fina; UI consome via hook (TanStack Query). Cada fase termina com testes passando e é entregável isoladamente.

> [!IMPORTANT]
> Decisões que precisam de confirmação antes da Fase 0 estão na seção 10. Os defaults recomendados já estão aplicados neste plano.

---

## 1. Estado de partida (verificado)

| Área | Situação atual no repositório |
| :--- | :--- |
| Navegação | `page.tsx` usa `moduloAtivo` + `handleSelectModulo`/`handleRibbonAction`; `AppRibbonHeader` é importado mas não renderizado; `AppSidebar` já tem grupos (Estoque / Movimentações / Comercial) |
| Telas (`TelaOuAba`) | `inicio, mp, imp, motos, terc, saida, vendas, fat, clientes`. Faltam `req`, `inv`, `aud` |
| Permissões | `core/domain/user-authorization.ts`: roles `mestre/admin/operador/requisitante`; permissões grossas (`stock:operate`, `catalog:manage`, `audit:read`…). Não usadas na UI |
| Inventário | `core/services/inventario.service.ts` é **por sessão** (abrir → contar → encerrar). Rota `api/movimentacoes/ajuste` existe. O protótipo faz contagem direta e gera ajustes |
| Movimentação | `RegistrarEntradaSchema` tem `numeroNF`, `valorUnitario`, `fornecedor`; **sem** `lote`, `estorno`, `ajuste`, `motivo` |
| Item | `Item` sem `custoUnitario`/`custoMedio`/lotes |
| Pedido | Enum já contém `CANCELADO`; `PATCH /api/pedidos/[id]` só avança PENDENTE→SEPARADO→ENTREGUE |
| Terceiros | Tipos: `ENTRADA_REMESSA`, `CONSUMO_PRODUCAO`, `DEVOLUCAO_RETORNO` (sem sucata) |
| NF-e | `nfe-entrada.service.ts`, `nfe.schema.ts`, anti-duplicidade já existem no core |

---

## 2. Decisões de arquitetura

### D1. Navegação = menu lateral do 3.0
Grupos exatos do protótipo (`MENU`):

| Grupo | Telas |
| :--- | :--- |
| *(sem título)* | Início |
| Estoque | Matéria-prima, Materiais improdutivos, Peças de motos, Material de terceiros |
| Movimentações | Entradas e saídas, **Requisições**, **Inventário (contagem)** |
| Comercial | Pedidos de venda, Faturamento, Clientes e fornecedores |
| Controle | **Auditoria** |

- Remover `ModuloCorporativo`, `obterModuloDeTela`, `AppRibbonHeader`, `modulos-ribbon.spec.ts` e o estado `moduloAtivo`/`abaRibbonAtiva`. (Remoção só após a Fase 1 estar verde.)
- `TelaOuAba` ganha `'req' | 'inv' | 'aud'`.
- Topbar do 3.0: busca global + **+ Registrar entrada** + **Registrar saída** + identificação do perfil (ver D2) + Tema.

### D2. Perfis do protótipo mapeados ao modelo real

| Perfil 3.0 | Role React | Observação |
| :--- | :--- | :--- |
| Administrador (`admin`, `*`) | `mestre` | Todas as ações |
| Gestor | `admin` | Aprova requisições, estorna, ajusta, fatura, audita |
| Almoxarife (`almox`) | `operador` | Movimenta, cadastra, edita, vende, entrega requisição |
| Produção (`prod`) | `requisitante` | Só cria requisição |

- O seletor "Usuário" do protótipo **não** é reproduzido como troca de identidade (o login é real). Em seu lugar: chip com nome e perfil do usuário logado na topbar. Em desenvolvimento, um seletor opcional de "visualizar como" pode ser ligado por flag para testes manuais.
- Novo módulo `core/domain/permissions.ts` com as 13 permissões finas do protótipo e a matriz `PERM` por role:
  `mover, cadastrar, editar, estornar, ajustar, faturar, vender, cadastros, terceiros, aprovar, requisitar, entregar, auditar`.
  Mantém `hasUserPermission` existente para as permissões administrativas.
- `VER` (tela → permissão) e `ACAO` (ação → permissão) portados como constantes tipadas em `web/data/navegacao.ts`.
- **Backend é a autoridade:** toda rota valida a permissão fina via `api-helpers`; a UI apenas esconde/avisa.

### D3. Lotes
- Novo campo `lote?: string` em `Movimentacao` (entrada e saída) e `loteBase` em `Item` (default `"Saldo anterior"`).
- Função pura `calcularLotes(item, movimentacoes)` em `core/services/lotes.ts`, idêntica à `lotesDe` do protótipo (entradas − saídas por lote; resíduo vai para `loteBase`; só lotes com saldo > 0).
- Escolha automática de lote (primeiro com saldo ≥ quantidade) em pedido, requisição e saída manual: `escolherLote(lotes, qtd)`.

### D4. Custo
- `Item.custoUnitario` (média ponderada) e `Movimentacao.custo`.
- `calcularCustoMedio(saldoAtual, custoAtual, qtdEntrada, custoEntrada)`, idêntica à fórmula do protótipo.

### D5. Auditoria
- Nova coleção Firestore `auditoria_operacional` (separada de `user-audit`): `{ quando, usuarioId, usuarioNome, papel, acao, detalhe, entidade?, entidadeId? }`.
- `AuditoriaService.registrar()` chamado **no servidor** dentro de cada rota mutadora (nunca confiar no cliente). Regras Firestore: leitura só com `auditar`; escrita só via Admin SDK.

### D6. Estorno, ajuste e cancelamentos
- `Movimentacao` ganha `estorno?: boolean`, `estornoDe?: string`, `estornadoPor?: string`, `ajuste?: boolean`, `motivo?: string`.
- Pedido ganha `motivoCancelamento`; Nota fiscal ganha `cancelada`, `motivoCancelamento`.
- Material de terceiro ganha tipo `SUCATA_PERDA`.

### D7. Quantidades fracionárias
- Utilitário `core/domain/quantidade.ts`: `arredondar3(n)` e schema de quantidade positiva com 3 casas. Todos os inputs numéricos usam `step="any"` e `min=0.001`.

---

## 3. Fases

Estimativa: P ≈ 0,5 dia · M ≈ 1–2 dias · G ≈ 3–5 dias.

### Fase 0: Fundação (M)
| # | Tarefa | Arquivos |
| :-: | :--- | :--- |
| 0.1 | Permissões finas + matriz por role + testes | `core/domain/permissions.ts` (+ `__tests__`) |
| 0.2 | Hook `usePermissao()` e componente `<Can acao="...">` | `web/hooks/usePermissao.ts`, `web/components/auth/Can.tsx` |
| 0.3 | Guard server-side por permissão | `web/app/api/api-helpers.ts` (`exigirPermissao(request, acao)`) |
| 0.4 | `AuditoriaService` + repositório + coleção + regras | `core/services/auditoria.service.ts`, `core/storage/auditoria.repository.*`, `server/storage/firestore-auditoria.repository.ts`, `firestore.rules` |
| 0.5 | Utilitários `quantidade`, `lotes`, `custo-medio` com testes unitários | `core/domain/quantidade.ts`, `core/services/lotes.ts`, `core/services/custo-medio.ts` |
| 0.6 | Extensão dos schemas (D3–D6) com defaults retrocompatíveis | `item.schema.ts`, `movimentacao.schema.ts`, `pedido.schema.ts`, `nota-fiscal-emitida.schema.ts`, `material-terceiro.schema.ts` |
| 0.7 | Script de migração: `loteBase="Saldo anterior"`, `custoUnitario=0` nos itens existentes | `scripts/migrar-lotes-custo.mjs` |

**Aceite:** testes de permissão cobrem as 4 roles × 13 ações; `calcularLotes` reproduz os exemplos do protótipo; build e `tsc` verdes.

### Fase 1: Navegação 3.0 e topbar (M)
| # | Tarefa | Arquivos |
| :-: | :--- | :--- |
| 1.1 | `TelaOuAba` + `MENU` por grupos (incl. Controle/Auditoria) | extrair de `web/data/mock-almoxarifado.ts` para `web/data/navegacao.ts` |
| 1.2 | `AppSidebar` lê `MENU`, filtra por `VER`/permissão, badges: críticos por aba, atrasados, a faturar, **requisições pendentes (só quem pode `aprovar`)** | `AppSidebar.tsx` |
| 1.3 | Aviso "O perfil X não tem acesso a esta tela" + redirecionamento ao Início quando a tela atual fica inacessível | `page.tsx` |
| 1.4 | Topbar: botões fixos **+ Registrar entrada** / **Registrar saída** (permissão `mover`), chip de usuário/perfil, tema | `AppTopHeader.tsx` |
| 1.5 | Remover Ribbon/módulos e testes obsoletos; atualizar `sidebar-modules.spec.ts` | vários |
| 1.6 | Atalhos: Esc fecha drawer e resultados da busca; Enter abre linha da tabela; manter `/` e Ctrl/⌘+K | `GlobalSearchInput.tsx`, `StockTable.tsx` |
| 1.7 | Handler global de erro → toast "Algo inesperado aconteceu. Atualize a página e tente de novo." | `providers.tsx` |
| 1.8 | Padrão anti-duplo-clique: hook `useSubmitLock(900)` em todos os formulários de drawer | `web/hooks/useSubmitLock.ts` |

**Aceite:** menu idêntico em grupos/ordem ao `MENU` do 3.0; `requisitante` vê só Início, estoque (consulta) e Requisições; sem referências a `AppRibbonHeader`.

### Fase 2: Estoque: tabela, stats, ordenação, paginação, custo (M–G)
| # | Tarefa |
| :-: | :--- |
| 2.1 | Stats: Itens, Abaixo do mínimo, Crítico, **Valor em estoque** (`Σ qtd × custo`) em `StockMetricsCards` |
| 2.2 | `StockTable`: colunas do 3.0 (**Item**, **Quantidade**, **Valor**, **Nível**, **Situação**, ações); Localização mantida como coluna extra opcional |
| 2.3 | Ordenação por Item/Quantidade/Valor/Nível com `aria-sort` e ▲/▼; `razao(item)` com mínimo 0 seguro (`min>0 ? qtd/min : (qtd>0 ? 999 : 0)`), reutilizada no painel "Precisa de atenção" |
| 2.4 | Paginação "‹ Anterior · Página X de Y · N itens" (20/página, constante configurável) |
| 2.5 | Busca por nome, código, categoria **e valores da ficha técnica (lote, NF-e, fornecedor…)** |
| 2.6 | Chips de situação com contagem (validar igualdade com o protótipo) |
| 2.7 | `useItensEstoque` retorna `custoUnitario`, `valorEmEstoque`, ordenação e paginação |

**Aceite:** contagens e ordenação iguais ao protótipo com o mesmo conjunto de dados; testes de `razao` e ordenação.

### Fase 3: Item: cadastro, edição, drawer, etiqueta (M–G)
| # | Tarefa |
| :-: | :--- |
| 3.1 | `ItemCreateDrawer`: nome, código, categoria, unidade, **custo**, quantidade, mínimo, capacidade + campos por aba (`CAMPOS`); validações: SKU duplicado, **mín ≤ capacidade**, capacidade > 0, quantidades ≥ 0 |
| 3.2 | **`ItemEditDrawer`** (novo) + `PUT /api/itens/[id]`: edita tudo exceto quantidade; SKU duplicado em outro item é erro; auditoria "Edição de item" |
| 3.3 | `ItemDetailsDrawer`: Estoque mínimo, Capacidade, **Custo unitário**, **Valor em estoque**, **Lotes em estoque**, **Falta para o mínimo**, Ficha técnica, Histórico |
| 3.4 | Ações do drawer: Adicionar entrada, Retirar para produção, **Editar item**, **Imprimir etiqueta** |
| 3.5 | **Etiqueta**: `EtiquetaItem` (nome, código, categoria, lote, unidade) + CSS `@media print` isolado (`body.print-etq`) |
| 3.6 | Permissões: `cadastrar`, `editar` |

**Aceite:** criar/editar reproduz as mensagens de erro do protótipo; impressão mostra só a etiqueta.

### Fase 4: Movimentações: entrada, retirada, lotes, XML, estorno (G)
| # | Tarefa |
| :-: | :--- |
| 4.1 | `MovementFormDrawer` entrada: data (máx. hoje), quantidade fracionária, campos por aba (motos → NF-e + Fornecedor), **custo unitário** com recálculo do custo médio, fornecedor pré-preenchido |
| 4.2 | **Importar XML da NF-e**: parser puro em `core/services/nfe-xml-parser.ts`: extrai `nNF`, `xNome` do emitente, `dhEmi`/`dEmi`, e o `det` que casa por `cProd`≡SKU ou `xProd` contendo o primeiro termo do nome; preenche `qCom`, `vUnCom`, `nLote`; toasts "XML lido…", "…nenhum item corresponde…", "Não consegui ler este XML" |
| 4.3 | Retirada: **select "Lote de onde sai"** (via `calcularLotes`) + "Não informar"; valida saldo do item e do lote; "Retirado por / setor" default = usuário |
| 4.4 | Anti-duplicidade de NF-e por item (já existe; garantir mensagem "Esta NF-e já foi lançada para este item.") |
| 4.5 | API `entrada` e `baixa-interna` aceitam `lote`, `custo`; recalculam custo médio; gravam auditoria |
| 4.6 | **Estorno**: `POST /api/movimentacoes/[id]/estorno` `{motivo}`; cria lançamento contrário (`estorno:true`, `estornoDe`), marca original estornado; bloqueia se já estornado/estorno/ajuste ou se a entrada já foi consumida; permissão `estornar` |
| 4.7 | UI: botão **Estornar** no histórico (drawer do item e "Movimentações do período"), `EstornoDrawer` com motivo obrigatório; tags "Estornado"/"Estorno"/"Ajuste" |
| 4.8 | Histórico mostra `· lote X` e dados da entrada (NF-e, fornecedor…) |
| 4.9 | Seletor rápido (topbar): busca por nome, código, lote e ficha; 30 resultados |

**Aceite:** estornar entrada consumida → erro; estornar duas vezes → erro; retirada acima do saldo do lote → "O lote X tem apenas N un."; XML de exemplo preenche NF-e, fornecedor, data, quantidade, custo e lote.

### Fase 5: Entradas e saídas (tela de relatório) (M)
| # | Tarefa |
| :-: | :--- |
| 5.1 | Form "Registrar movimentação" com **Movimento (Saída/Entrada)**, data máx. hoje, produto agrupado por categoria, retirado por (obrigatório), observação; lote automático na saída |
| 5.2 | Relatório por item (Entrou/Saiu/Estoque atual) e lista "Movimentações do período" com **Estornar** |
| 5.3 | Períodos Hoje/Ontem/7 dias/Tudo + busca por NF-e, lote, item ou responsável |
| 5.4 | **Imprimir** (`window.print`) com CSS de impressão (esconde sidebar/topbar) |
| 5.5 | **CSV**: colunas `Data;Hora;Movimento;Código;Item;Quantidade;Unidade;Responsável;NF-e;Lote;Observação`, BOM UTF-8, separador `;`, arquivo `relatorio-movimentacoes.csv` |
| 5.6 | "Relatório de Turno" do Início abre Entradas e saídas em "Hoje" e aciona impressão |

### Fase 6: Vendas: cancelar pedido (M)
| # | Tarefa |
| :-: | :--- |
| 6.1 | `PATCH /api/pedidos/[id]` aceita `CANCELADO` com `motivo`; bloqueia se `ENTREGUE` ou faturado ("Este pedido já foi faturado. Cancele a nota primeiro."); sem movimentar estoque; auditoria |
| 6.2 | `VendasView`: botão **Cancelar** (permissão `vender`) em pedidos abertos + `CancelarPedidoDrawer` (motivo obrigatório) |
| 6.3 | "Aberto" = nem entregue nem cancelado: KPIs (a entregar, atrasados, sem estoque), ordenação (abertos primeiro por prazo); cancelado nunca é atrasado nem a faturar |
| 6.4 | Tags: `Faturado · NF xxxx` / `A faturar` / `Atrasado` / `Falta estoque` |
| 6.5 | Entrega escolhe lote automaticamente; auditoria "Pedido criado/separado/entregue" |
| 6.6 | `OrderCreateDrawer`: preço unitário por item, quantidade fracionária, validações ("Informe a data de entrega.", "As quantidades precisam ser maiores que zero.") |

### Fase 7: Faturamento: cancelar nota e retorno (M)
| # | Tarefa |
| :-: | :--- |
| 7.1 | `FaturarPedidoDrawer`: itens com valores, NF-e, série (default 1), emissão (máx. hoje), vencimento; bloqueios: pedido sem preços, NF-e+série duplicada |
| 7.2 | `POST /api/faturamento/notas/[id]/cancelar` `{motivo}`: marca `cancelada`, limpa o faturamento do pedido (volta a "a faturar"); só tipo `Venda`; auditoria |
| 7.3 | `FaturamentoView`: stats (a faturar com total R$, notas emitidas, total faturado, **excluindo canceladas**); tag **Cancelada** e botão **Cancelar** (permissão `estornar`) |
| 7.4 | Lista de notas inclui **Retorno de industrialização** gerado pela devolução de terceiros |
| 7.5 | Botão **Imprimir** |

### Fase 8: Material de terceiros (M)
| # | Tarefa |
| :-: | :--- |
| 8.1 | Tipo `SUCATA_PERDA` (schema, API, hook, drawer); motivo obrigatório; coluna **Sucata** na tabela e "Sucata ou perda" no detalhe |
| 8.2 | Tabela: Proprietário, Material (+código ou "sem código"), NF de remessa, Recebido, Consumido, Devolvido, Sucata, Saldo; ações por linha **Consumir / Devolver / Sucata** |
| 8.3 | Devolução: NF-e de retorno obrigatória + **valor do serviço de industrialização** → nota `Retorno de industrialização` (série 1) |
| 8.4 | Regras: saldo = entrada − (consumo + devolução + sucata); NF de remessa duplicada por cliente bloqueada; material existente do mesmo cliente (código ou nome) **soma** |
| 8.5 | Stats: materiais cadastrados e clientes com material em mãos (saldo > 0) |
| 8.6 | Auditoria "Terceiros · Entrada/Consumo/Devolução/Sucata" |

### Fase 9: Requisições (G)
| # | Tarefa |
| :-: | :--- |
| 9.1 | Domínio: `Requisicao { id sequencial, itemId, quantidade, setor, solicitante, motivo, data, status: PENDENTE|APROVADA|RECUSADA|ENTREGUE }` + schema + repositório + coleção + regras Firestore |
| 9.2 | Serviço: `criar` (`requisitar`), `decidir` (`aprovar`), `entregar` (`entregar`; valida saldo, escolhe lote, gera saída "Requisição #N" e auditoria) |
| 9.3 | Rotas: `GET/POST /api/requisicoes`, `PATCH /api/requisicoes/[id]` |
| 9.4 | `RequisicoesView` + `NovaRequisicaoDrawer`; **Aprovar/Recusar** com `aprovar`, **Entregar** com `entregar`; tags por status |
| 9.5 | Badge na sidebar com pendentes (só para quem pode aprovar) |
| 9.6 | Validações: quantidade > 0, motivo obrigatório, setor default "Produção", "Estoque insuficiente: há N un de X" |

### Fase 10: Inventário (contagem) (M–G)
| # | Tarefa |
| :-: | :--- |
| 10.1 | O protótipo é **contagem direta** (não sessão). Estender `POST /api/movimentacoes/ajuste` para lote: `{ motivo, contagens:[{itemId, contado}] }`; o `InventarioService` por sessão permanece para fechamento mensal |
| 10.2 | `InventarioView`: chips por categoria; Item / No sistema / **Contado** / **Diferença** (verde +, vermelho −, ao digitar); campo motivo/nº da contagem |
| 10.3 | Regras: negativo → "A contagem não pode ser negativa."; sem diferenças → "Nenhuma diferença para ajustar…"; sem motivo → "Informe o motivo ou o número da contagem."; cada diferença vira Entrada/Saída com `ajuste:true` e motivo "Ajuste de inventário: …" |
| 10.4 | Toast "N ajuste(s) lançado(s)"; permissão `ajustar`; auditoria |

### Fase 11: Auditoria (M)
| # | Tarefa |
| :-: | :--- |
| 11.1 | `GET /api/auditoria` (permissão `auditar`), paginada, data desc |
| 11.2 | `AuditoriaView`: Quando / Quem + perfil / Ação (tag) / Detalhe; estado vazio do protótipo |
| 11.3 | Cobertura: movimentação, estorno, ajuste, edição e cadastro de item, cadastro de cliente, pedido criado/separado/entregue/cancelado, faturamento, nota cancelada, requisição criada/aprovada/recusada, terceiros (4 tipos) |
| 11.4 | Teste de contrato: cada rota mutadora chama `AuditoriaService.registrar` |

### Fase 12: Clientes, busca global e Início (P–M)
| # | Tarefa |
| :-: | :--- |
| 12.1 | Busca global: itens (6), NF-e das entradas (3), clientes (3), pedidos (3), notas (3), terceiros (3); conferir limites e rótulos |
| 12.2 | Início: ações rápidas "Receber material de terceiro / Novo pedido / Novo cadastro"; "Precisa de atenção" (pedidos atrasados + até 6 itens por `razao`); cards Estoque e Gestão |
| 12.3 | `ClientCreateDrawer`: mensagens e sanitização do protótipo |

### Fase 13: Paridade visual e QA final (M)
| # | Tarefa |
| :-: | :--- |
| 13.1 | Checklist visual lado a lado (seção 6) |
| 13.2 | E2E (Playwright) dos 12 fluxos da seção 7 |
| 13.3 | Acessibilidade (`aria-sort`, `role=alert`, foco ao abrir drawer, `aria-live` no toast) |
| 13.4 | Atualizar `README.md` e `docs/` removendo a Ribbon; rodar migração em homologação |

---

## 4. Rastreabilidade: cada ponto da auditoria → fase

| Auditoria | Fase |
| :--- | :-: |
| §2 Requisições | 9 |
| §2 Inventário | 10 |
| §2 Auditoria | 11 |
| §3.1 Perfis/permissões | 0, 1 |
| §3.2 Lotes | 0, 4, 5, 6, 9 |
| §3.3 Custo e valor | 0, 2, 3, 4 |
| §3.4 XML NF-e | 4 |
| §3.5 Estorno | 4, 5 |
| §3.6 Edição de item | 3 |
| §3.7 Etiqueta | 3 |
| §3.8 Impressão de relatórios | 5, 7 |
| §3.9 Ordenação/paginação | 2 |
| §3.10 Atalhos, erro global, anti-duplo-clique | 1 |
| §4 Estoque (stats, colunas, busca, fracionárias, mín ≤ cap, razão) | 0, 2, 3 |
| §5 Vendas (cancelar, tags, lote) | 6 |
| §5 Faturamento (cancelar nota, retorno, bloqueios) | 7 |
| §5 Terceiros (sucata, valor de serviço, ações por linha) | 8 |
| §5 Saída manual e estorno no relatório | 4, 5 |
| §6 Menu em grupos, badges, ocultação por perfil, topbar | 1 |
| §7 Regras de negócio 1–10 | 0, 4, 6, 7, 8, 10 |
| §8 Backend sem UI (ajuste, baixa-lote, NF-e, roles) | 10, 4, 4, 0–1 |

---

## 5. Estratégia de testes

| Camada | O quê | Onde |
| :--- | :--- | :--- |
| Unitário (core) | `permissions`, `calcularLotes`, `escolherLote`, `calcularCustoMedio`, `razao`, `arredondar3`, parser XML, regras de estorno/ajuste/cancelamento | `src/core/**/__tests__` |
| Rotas API | 403 por permissão, validações com as mesmas mensagens do protótipo, auditoria gravada | `src/web/app/api/__tests__` (padrão dos specs existentes) |
| Componentes/fluxo | Drawers e views (padrão `*-flow.spec.ts`) | `src/web/components/**/__tests__` |
| E2E | Fluxos da seção 7 | `e2e/` (Playwright) |
| Paridade de dados | Dados de exemplo do protótipo (18 itens, movimentações, pedidos) como fixture; comparar críticos, valor total e lotes | `src/core/__fixtures__/prototipo-3-0.ts` |

---

## 6. Checklist de paridade visual/UX

- Menu: grupos e rótulos exatos do 3.0; badge de críticos/atrasados, de a faturar e de requisições.
- Topbar: busca com placeholder "Pesquisar item, cliente, pedido ou NF-e ( / )"; botões Entrada/Saída; perfil; Tema.
- Tela de estoque: título + botão "Nova matéria-prima / Novo material improdutivo / Nova peça de moto", subtítulo "A marca vertical na barra indica o estoque mínimo.", 4 stats, chips com contagem, tabela com gauge e marca do mínimo.
- Drawer lateral direito para todos os formulários, com "Fechar", scrim e foco.
- Erros inline (`role="alert"`), toasts de 3,2 s, estados vazios com os textos do protótipo.
- Rótulos de botões conforme o protótipo ("Retirar para produção", "Registrar faturamento", "Confirmar estorno").

> Identidade visual (IBM Plex Sans, logo "A", faixa `.stripe`): ver D8.

---

## 7. Fluxos E2E de aceite

1. `requisitante` cria requisição → `admin` aprova → `operador` entrega → estoque baixa e auditoria registra os 3 eventos.
2. Entrada com XML → item preenchido → custo médio recalculado → lote visível no drawer.
3. Retirada com lote de saldo insuficiente → mensagem do lote.
4. Estorno de entrada não consumida → ok; consumida → erro.
5. Inventário com 2 diferenças → 2 ajustes; contagem negativa → erro.
6. Pedido: criar → separar → entregar (lote automático) → faturar → cancelar nota → volta a "a faturar".
7. Pedido pendente → cancelar com motivo; pedido faturado → bloqueado.
8. Terceiros: receber (soma no existente), consumir, devolver (gera nota de retorno), sucata.
9. Edição de item com SKU duplicado → erro; válida → auditoria.
10. Ordenação e paginação em MP com mais de 20 itens.
11. CSV e impressão da tela Entradas e saídas.
12. Perfil sem acesso tenta abrir Faturamento → aviso e redirecionamento ao Início.

---

## 8. Riscos e mitigação

| Risco | Mitigação |
| :--- | :--- |
| Dados reais sem lote/custo | Migração 0.7 com defaults; "Saldo anterior" como lote base (igual ao protótipo) |
| Saldo por lote derivado do histórico fica lento | Calcular no servidor por item sob demanda; se necessário, subcoleção `lotes` materializada depois |
| Estorno/ajuste concorrentes alterando saldo | Transação Firestore (saldo + movimentação + auditoria atômicos) |
| Remoção da Ribbon quebra testes/rotas | Fase 1.5 só depois da nova navegação verde; buscar referências antes de apagar |
| Perfis do protótipo diferentes das roles reais | Matriz D2 versionada e testada; gestão de usuários existente continua definindo roles |
| Escopo grande | Fases independentes e ordem de entrega abaixo |

### Ordem de entrega recomendada
`0 → 1 → 6 → 10 → 2 → 3 → 4 → 5 → 7 → 8 → 9 → 11 → 12 → 13`

Perfis e navegação primeiro; cancelar pedido e inventário são rápidos por já terem base; o serviço de auditoria entra cedo (Fase 0) e a tela por último, quando todas as rotas já registram eventos.

---

## 9. Definição de pronto (paridade total)

- [ ] As 12 telas do `MENU` do 3.0 existem e respeitam permissões.
- [ ] Todas as ações da tabela `ACAO` do 3.0 existem e são bloqueadas por perfil na UI **e** na API.
- [ ] Mensagens de validação do `sistema.js` reproduzidas.
- [ ] Rastreabilidade (seção 4) 100% marcada.
- [ ] Testes unitários, de rota e E2E verdes; `tsc` e build sem erros.
- [ ] Fixture do protótipo reproduz os mesmos números na versão web.
- [ ] Nenhuma referência a Ribbon/módulos corporativos.

---

## 10. Decisões pendentes (defaults aplicados)

| # | Pergunta | Default adotado |
| :-: | :--- | :--- |
| D8 | Reproduzir a **identidade visual** do 3.0 (IBM Plex Sans, logo "A", cores) ou manter o design Stitch/MD3 atual com o mesmo layout e comportamento? | Manter o design atual (paridade funcional e de layout, não de tema) |
| D9 | Mapeamento Administrador→`mestre`, Gestor→`admin`, Almoxarife→`operador`, Produção→`requisitante` | Conforme D2 |
| D10 | Seletor "visualizar como" de perfil em desenvolvimento | Atrás de flag, desligado em produção |
| D11 | Inventário: manter também o fluxo por sessão (fechamento mensal)? | Sim, sem alterar |
| D12 | Itens por página | 20 (o protótipo usa 5 só para demonstração) |
