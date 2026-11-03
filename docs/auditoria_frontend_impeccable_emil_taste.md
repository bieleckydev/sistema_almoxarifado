# Auditoria do Frontend — Impeccable, Emil Kowalski e Taste Skill

> **Data:** 03/11/2026
> **Escopo:** `src/web` (Next.js 16 / React 19 / Tailwind v4), 154 arquivos
> **Skills:** `impeccable` (audit), `emil-design-eng` (motion e detalhes), `design-taste-frontend` (app screens)
> **Método:** leitura do código, `lint.mjs --app` (taste-skill), `impeccable detect`, cálculo de contraste dos tokens e render da tela de login a 1440/768/390px. As telas internas foram auditadas pelo código (exigem login).
> **Auditorias anteriores:** `relatorio_auditoria_design_taste_frontend.md` (14/10), `auditoria_frontend_taste_skill.md` (28/10), `plano_redesign_frontend_impeccable.md` (28/10).

---

## 1. Resumo

O acabamento visual evoluiu bastante desde outubro: o lint da taste-skill caiu de **16 FAIL / 333 WARN** para **1 FAIL / 288 WARN**. O que resta são três famílias de problema:

1. **Conteúdo falso apresentado como real** (consulta simulada à Receita, código de barras decorativo, status fixos).
2. **Bugs de CSS e de tema** (classes tipográficas fora de `@layer` anulando utilitários, sidebar quebrada no modo escuro, animações inexistentes).
3. **Falta de componentes compartilhados** (6 padrões de KPI, 6 implementações de drawer/modal, 5 variantes de botão primário).

### Placar Impeccable

| # | Dimensão | Nota | Principal achado |
|---|---|---|---|
| 1 | Acessibilidade | 2 | 0 `focus-visible`, 81 `focus:outline-none`, dezenas de labels sem `htmlFor`, sem focus trap |
| 2 | Performance | 3 | 85 `transition-all`; fora isso, saudável |
| 3 | Tema | 1 | Sidebar quebrada no modo escuro, 430 usos de `slate` num sistema `zinc`, login com paleta própria |
| 4 | Responsivo | 2 | Funciona no celular, mas com rótulos de 10px e alvos de 32px |
| 5 | Integridade | 1 | Dados simulados como reais, padrões fragmentados, 5 componentes mortos |
| **Total** | | **9/20** | **Fraco** |

### Medições automáticas

```
lint.mjs --app src/web   → 1 FAIL (micro-label), 288 WARN
  mono 151 · transition-all 85 · shadow 30 · bounce/pulse 14 · glass 4 · framework-colour 2
impeccable detect        → 2 side-tab (border-l-4)
inspect.mjs /login       → 1 FAIL (contraste 2,1:1 no rodapé), 92% do texto < 13px
grep                     → prefers-reduced-motion 0 · focus-visible 0 · text-[10px] 63 · text-[9px] 2
                           slate 430 · zinc 195 · amber 167 · raios: xl 220, lg 194, md 80, full 76, 2xl 33
```

---

## 2. P0 — corrigir antes de tudo

1. **Consulta à Receita Federal simulada.** [ClientCreateDrawer.tsx:177-195](../src/web/components/gestao/clientes/ClientCreateDrawer.tsx) faz `setTimeout(700)`, exibe "Dados do CNPJ verificados junto à Receita Federal!" e preenche "Distribuidora Homologada Ltda" e IE `109.876.543.210`, que podem ir para o cadastro.
2. **Código de barras da etiqueta é decorativo.** [EtiquetaItemModal.tsx:49](../src/web/components/dashboard/modals/EtiquetaItemModal.tsx) usa um array fixo igual para todos os itens; nenhum leitor decodifica. `window.print()` imprime a página inteira (não há `@media print`).
3. **Status inventados:** "Coletor RF Online" pulsando (sidebar, Início, Saída), "Integridade Criptográfica Ativa" (Auditoria, sem hash algum), "SEFAZ Online" (cadastro de cliente e pedido), "Expedição Geral / Doca 01" em toda linha de pedido, "Unidade Matriz - Galpão 01" com chevron sem ação, "Terminal RF Online", turno "(06h - 15h)", data padrão `14/10/2026`, selos "100% auditado / catalogado / integradas", "Base sincronizada", ponto "Online" sempre verde no avatar.
4. **Tamanhos dos KPIs anulados.** `.font-kpi-value`, `.font-data-tabular`, `.font-label-*` estão fora de `@layer` em `globals.css`; no Tailwind v4 estilos sem camada vencem os utilitários, então `text-2xl`, `text-lg font-bold` etc. são ignorados.
5. **Sidebar no modo escuro.** Usa `bg-inverse-surface` (no escuro = `#f4f4f5`) com textos fixos `zinc-400`: sidebar clara num app escuro, rótulos a 2,3:1 e badges a 1,7:1.
6. **Animações inexistentes.** `animate-in`, `slide-in-from-right`, `zoom-in-95`, `animate-fade-in`, `animate-scale-up`, `animate-scale-in`, `animate-slide-left` dependem de `tw-animate-css`, que não está instalado: 35+ ocorrências sem efeito.
7. **"Crítico" com três definições.** Badge: saldo ≤ 50% do mínimo. Barra/número da `StockTable`: saldo = 0. Cards de métricas: rotulado "zerados". Uma mesma linha pode mostrar status contraditórios.

---

## 3. Marcas de AI slop (taste-skill)

| Marca | Onde | Troca |
|---|---|---|
| Ícone em quadrado colorido no KPI | ~15 casos em 5 telas | Rótulo + número, sem ícone |
| Faixa colorida no topo do KPI | 11 cards (Clientes, Saída, Faturamento) | Card plano, como em Vendas |
| `border-l-4` vermelho | `PriorityAlertBanner.tsx:29`, `VendasView.tsx:291` | Ícone + texto, ou um passo de tom no fundo |
| Rótulos minúsculos uppercase com tracking | Sidebar, cabeçalhos de tabela (8 telas), perfil | Sentence case 12–13px cinza |
| Monospace em texto comum | 151× ("Ver tudo", datas, nomes, botões) | Mono só para SKU, NF-e, lote |
| Sidebar escura com canvas claro | `AppSidebar` | Mesmo fundo do canvas, item ativo como pílula cinza |
| Logo = quadrado com "R" | `AppSidebar.tsx:349` | Monograma desenhado para a Rhowert |
| Copy que descreve a interface | "Ações rápidas e monitoramento…", "Distribuição dimensional e saúde de estoque das 3 famílias fabris" | Uma linha com o achado do dia |
| Login de template | Card centralizado, azul `#1d4ea3`/`#3273dc` exclusivo, sem "Rhowert", "Acesso Restrito" duas vezes, selo "Ambiente Seguro" | Paleta do app, nome e marca |
| Componentes mortos | `AppRibbonHeader`, `KpiCard`, `SummaryNavCard`, `AttentionPanel`, `UserProfileCard` (0 imports) | Apagar |

---

## 4. Motion e detalhes (Emil Kowalski)

| Antes | Depois | Por quê |
|---|---|---|
| `animate-in slide-in-from-right` sem plugin | `translateX(100%) → 0`, 240ms, `cubic-bezier(0.32,0.72,0,1)` via `@starting-style` | Hoje a gaveta surge de uma vez; a curva de drawer dá peso físico |
| Gaveta some instantaneamente | Saída de 180ms, mais rápida que a entrada | Saída sempre mais rápida que entrada |
| `transition-all` (85×) | `transition-[background-color,border-color]` ou `transform` | Nomear propriedades evita repaint em tabelas densas |
| Botões sem feedback de clique | `active:scale-[0.97]` com `transition-transform 160ms` | O botão precisa mostrar que ouviu o clique |
| 375 `hover:` sem media query | Hovers de movimento em `@media (hover:hover)` | Hover falso no toque/coletor |
| `animate-pulse` em pontos de status (14×) | Ponto sólido ou remover | Animação contínua cansa num turno de 8h |
| 0 `prefers-reduced-motion` | Manter opacidade, remover deslocamento | Acessibilidade |
| `animate-tab-switch` na troca de aba do estoque | Remover | Ação repetida dezenas de vezes por dia não anima |
| `setTimeout(focus, 50/80/150)` | Focus trap + devolver foco ao gatilho | Teclado completo |

---

## 5. Outros pontos de UX

- **Navegação sem URL:** a tela ativa vive em `useState` em `app/page.tsx`. Voltar não funciona, F5 volta ao Início, não há link compartilhável.
- **Erro tratado como lista vazia** em 9 de 10 telas de gestão; a Saída mostra "Nenhuma movimentação" durante o carregamento.
- **KPIs calculados sobre a lista filtrada:** ao filtrar "Pendentes", o card "Entregues" vira 0 (Requisições, Usuários, Clientes).
- **Ações destrutivas sem confirmação:** desativar usuário, "Entregar & Baixar".
- **Fragmentação:** 6 padrões de KPI, 6 implementações de drawer/modal, 5 botões primários, 4 cores de overlay, 4 larguras de drawer, 5 raios, 3 famílias tipográficas.
- **Nomenclatura:** "Peças de motos" vs "Peças & Componentes"; "Pedidos de Venda & Clientes" numa tela sem clientes; enums crus ("PENDENTE", "URGENTE"); chave interna `valorTotal` exibida na ordenação.
- **Ações duplicadas no Início:** barra de ações + banner + rodapé do feed; "Relatório de Turno" leva a Saídas.

---

## 6. O que está bom

- **Colaboradores** é a tela modelo: estado de erro, labels, vazio específico por filtro, paginação com `aria-label`.
- **KPIs de Vendas**: planos, sem ícone, `tabular-nums` — base para unificar.
- **"Drawer A"** (11 usos) já tem `role="dialog"`, `aria-modal`, Escape, trava de scroll e foco inicial.
- **StockTable**: linhas por teclado, valor à direita, paginação clara, `EmptyState` com "Limpar filtros".
- Proteção contra duplo envio (`useSubmitLock`), erros com `role="alert"`, sem gradientes, sombras moderadas.

---

## 7. Plano de implementação

Cada item é um commit atômico (Conventional Commits).

### Fase 0 — Honestidade dos dados (P0)
1. Remover a consulta simulada à Receita; desabilitar até haver integração real.
2. Remover status fixos: Coletor RF, SEFAZ, Integridade Criptográfica, Doca 01, Galpão 01, turno, selos "100%", data padrão `14/10/2026`.
3. Código de barras Code 128 real gerado do SKU + `@media print` só para a etiqueta.
4. Unificar a definição de "crítico" no core e usá-la no badge, na barra e nos cards.

### Fase 1 — Fundação de tokens e CSS
1. Mover `.font-*` para `@layer components`.
2. Tokens `--sidebar-*` próprios; corrigir sidebar no escuro.
3. Keyframes de drawer/modal com `@starting-style`, curvas próprias e `prefers-reduced-motion` (sem plugin).
4. Trocar `slate-*` e hex legados (`#232325`, `#3e3e42`…) por tokens.
5. 2 famílias tipográficas (remover Plus Jakarta Sans); escala de raio `md` controles / `lg` painéis.
6. Apagar os 5 componentes mortos.

### Fase 2 — Componentes compartilhados
1. `<Drawer>` / `<Modal>` únicos a partir do Drawer A (focus trap, devolução de foco, Escape, scroll lock, animação); migrar as 19 superfícies.
2. `<KpiStrip>`: container dividido por linhas de 1px, rótulo + número.
3. `<Button>` (`primary`/`secondary`/`ghost`), altura única, `focus-visible`, `active:scale-[0.97]`.
4. `<StatusTag>` (`rounded-md`, ponto + texto) no lugar das pílulas.
5. `<SearchInput>`, `<FilterChips>` com `aria-pressed`, `<DataState>` (carregando/vazio/erro).

### Fase 3 — Acessibilidade
1. `focus:outline-none` → anéis `focus-visible`.
2. `htmlFor`/`id` em todos os formulários; `aria-describedby`/`aria-invalid` por campo.
3. `aria-label` em botões só de ícone; `aria-sort` nas tabelas.
4. Textos < 11px (65×) e contraste (`tertiary` 3,3:1, `zinc-400` em texto).

### Fase 4 — UX e copy
1. Navegação por URL (rotas ou `?tela=`).
2. Estados de erro/carregamento nas 9 telas (modelo: Colaboradores).
3. KPIs independentes do filtro; confirmação em ações destrutivas.
4. Copy: títulos-substantivo, linha com o achado do dia, nomenclatura única, sem enums crus.
5. Início com uma ação primária, sem atalhos duplicados.

### Fase 5 — Identidade e acabamento
1. Login com paleta e marca Rhowert; botão de ver senha acessível.
2. Sidebar no fundo do canvas; contadores só em filas que exigem ação.
3. Monospace só em SKU/NF-e/lote; cabeçalhos em sentence case.
4. Re-rodar `lint.mjs --app`, `impeccable detect` e o inspector logado.

---

## Anexo A — Telas de gestão (`components/gestao/*View.tsx`)

### P0
- Status inventados: `AuditoriaView.tsx:92-93` ("Integridade Criptográfica Ativa" com `animate-pulse`); `VendasView.tsx:503` ("Expedição Geral / Doca 01"); `SaidaManualView.tsx:884` ("Saída - Produção"/"Entrada - Reposição" fixos); `SaidaManualView.tsx:886-888` (coluna "Tipo & Setor" repete `m.quem`).
- `.font-data-tabular`/`.font-kpi-value` fora de `@layer` anulam `text-lg font-bold` (`inventario:198`, `requisicoes:166`, `auditoria:79`) e `text-2xl sm:text-3xl` (`vendas:197`, `saida:333`).

### P1
- Erro tratado como vazio em 9/10 telas (só `ColaboradoresView.tsx:167` trata).
- Saída sem estado de carregamento (`saida:800,938-943`).
- KPIs sobre lista filtrada: `requisicoes:163-185`, `usuarios:71-94`, `clientes:157`.
- Sem confirmação: desativar usuário (`usuarios:500-512`), "Entregar & Baixar" (`vendas:632`, `requisicoes:372`).
- Labels sem `htmlFor`: `saida:465,484,504,523,597,631,649`; buscas só com placeholder (9 telas); selects sem label (`terceiros:209`, `auditoria:102`, `usuarios:285`, `saida:770`); `inventario:329`.
- Botões só de ícone sem `aria-label`: `terceiros:312`, `usuarios:479,489,500,543`, `inventario:369`, limpar busca (`vendas:324`, `saida:758`, `usuarios:272`).
- Foco invisível: `usuarios:288,593`; só `focus:border-primary/50` em `saida:477-773`, `vendas:321`.
- Modais sem `role="dialog"`/Escape/foco: `faturamento:467`, `inventario:389`, `requisicoes:402`.
- Contraste: `tertiary` em 11–12px (`vendas:192,281`, `saida:400`, `clientes:250,255`); `zinc-400` (`usuarios:229,404,456`); `slate-400` (`terceiros:252,277,350,426`).
- Vermelho de erro em saídas normais: `saida:353-374,876,898,1007`, `terceiros:420`.
- Paleta arco-íris: `requisicoes:321-328`, `terceiros:374-381`; botões `bg-amber-600` (`terceiros:104`) e `bg-blue-600` (`terceiros:324`).
- Quantidade travada: `saida:610` (`Math.max(0.1, parseFloat(v)||1)`).

### P2
- Animações inexistentes em 9 telas; `animate-pulse` em `saida:455,957`, `auditoria:92`.
- Texto < 11px: `usuarios:399` (9px), `vendas:488,555,586`, `requisicoes:284,308,321`, `auditoria:175,195`, `terceiros:80,277`.
- Números desalinhados: `vendas:600`, `faturamento:308` vs `:429`, `saida:1039,1048,893`, `terceiros:305`; `terceiros:143-186` sem `tabular-nums`.
- Enums crus (`requisicoes:316,331`); "Últimas N" vs 8 exibidas (`terceiros:351,361`); título enganoso (`vendas:150`); contagem cega revela saldo no placeholder (`inventario:335`); filtros sem `aria-pressed`.

### Padrões sistêmicos
- Esqueleto idêntico (cabeçalho, KPIs, filtros, tabela) em 9/10 telas.
- 6 padrões de KPI; 11 faixas de topo; ~15 ícones em quadrado; pílulas em 8 telas; cabeçalho uppercase em 8.
- Botão primário em 5 variantes; container de tabela em 3 raios; busca em 5 estilos; chips em 4 implementações; overlay em 3 variantes; sombras em repouso em 7 telas.

## Anexo B — Catálogo, drawers/modais, login e feedback

### P0
- Consulta simulada à Receita (`ClientCreateDrawer.tsx:176-195`) e "SEFAZ Online" fixo (`:386-388`).
- Código de barras falso e impressão sem CSS (`EtiquetaItemModal.tsx:45-49`), rodapé promete compatibilidade com Zebra/Elgin/Argox.
- `StockMetricsCards.tsx:175,184,214` chama de "zerados" o que é saldo ≤ 50% do mínimo; "100% catalogado" e "Base sincronizada" fixos (`:106-107`).

### P1
- Sem primitivo Drawer/Modal: 19 superfícies, 6 implementações; nenhuma com focus trap; foco nunca devolvido ao gatilho.
- `CancelarPedidoModal.tsx:50`, `NovaRequisicaoModal.tsx:95` sem `role`, Escape, foco ou scroll lock; estorno em `ItemDetailsDrawer.tsx:396` sem `role` e o Escape global fecha o drawer inteiro.
- `UserCreateDrawer.tsx:120-131` sem Escape e sem scroll lock; drawers de terceiros sem fechar pelo overlay, sem scroll lock, em `slate-*`.
- X de fechar sem `aria-label` em 6 superfícies.
- Labels sem `htmlFor`: `ClientCreateDrawer` (15), `OrderCreateDrawer` (6), `FaturarPedidoDrawer` (5), drawers de terceiros (9 cada). 0 `aria-describedby`/`aria-invalid`.
- `StockTable.tsx:285-295`: badge ≤ 50% vs barra `=== 0`; 4 sinais para o mesmo status; mínimo 0 e saldo 0 vira "Crítico".
- Login: azul `#1d4ea3`, `slate-*`, sem "Rhowert", "Acesso Restrito" duplicado, ver senha com `tabIndex={-1}` e `focus:outline-none`, inputs 12px.
- Contraste: `tertiary` 3,3:1 (`StockMetricsCards.tsx:106,213`); `outline` no escuro ~4,1:1; X do toast quase invisível no escuro (`ToastContainer.tsx:34`).

### P2/P3
- Ordenação exibe `valorTotal` e ↑/↓ unicode, sem `aria-sort` (`StockTable.tsx:477`); Saldo à esquerda vs Valor à direita; virtualizador sobre 20 linhas paginadas.
- `ColaboradorSelect.tsx:162`: `span role="button"` dentro de `button`, `listbox` sem `option`.
- `GlobalSearchInput`: limpar só com `title`, `⌘K` no Windows, ícone em quadrado.
- Toast de erro com `aria-live="polite"`; skeleton com 6 colunas vs 7; `StockTable` sem estado de erro.
- `py-0.2` inválido (`StockTable.tsx:339`, `StockFilterToolbar.tsx:96`); `text-[9px]` na etiqueta; `MobileBottomNav` com `text-[10px]` e `backdrop-blur-md`.
