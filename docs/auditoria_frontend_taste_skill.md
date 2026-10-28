# Relatório de Auditoria e Diretrizes de Melhoria Frontend: Taste Skill v2

> **Auditoria realizada com a engine `design-taste-frontend` (`taste-skill v2`)**  
> **Referência Técnica:** `references/app-screens.md`, `references/tells.md`, `references/critique.md` e `.agents/rules/ui-guidelines.md`  
> **Escopo Auditado:** Frontend completo Next.js 16 / React 19 ([src/web](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web))  
> **Data:** 28 de Outubro de 2026  

---

## 1. Sumário Executivo & Diagnóstico Taste Skill

A auditoria inspecionou o código-fonte de todas as telas, componentes, tokens de estilo e interações do frontend utilizando as regras especializadas para **telas de aplicação corporativa (app screens)** da biblioteca `design-taste-frontend`.

O sistema possui uma fundação arquitetural de altíssimo nível (Next.js App Router, TanStack Query, Zustand, TypeScript estrito, controle de papéis/permissões e persistência Firestore). No entanto, o acabamento visual e a experiência de usuário ainda exibem diversos **"AI Slop Tells" (vícios típicos de geração de código por IA)**:
- Cards de KPI com ícones dentro de caixinhas coloridas flutuantes;
- Rótulos minúsculos em caixa alta com espaçamento excessivo (`uppercase tracking-wider text-xs`);
- Sombras desnecessárias em elementos de repouso (`shadow-xs`, `shadow-sm`, `shadow-md`);
- Vidro fosco com desfoque de fundo (`backdrop-blur`) em gavetas e modais operacionais;
- Pontos de status pulsantes (`animate-ping`, `animate-pulse`) que poluem a visão;
- Degraus de cor e listras decorativas no topo de cada card;
- Sobrecarga visual em células de tabela onde até 5 indicadores disputam atenção no mesmo espaço;
- 111 ocorrências de `transition-all` gerando custo desnecessário de renderização.

### Resultado do Linter Estático Oficial (`lint.mjs src/web --app`)

```text
TASTESKILL · LINT — 140 arquivos analisados
──────────────────────────────────────────────────────────────────────
STATUS GERAL: 16 FAIL | 333 WARN

FALHAS CRÍTICAS (FAIL):
  • [micro-label]  10 ocorrências de rótulos minúsculos em caixa alta com tracking aberto
  • [gradient]      2 ocorrências de gradientes em superfícies de trabalho
  • [emoji]         3 ocorrências de emojis literais usados na interface (ex: "✕")
  • [purple]        1 ocorrência de tom violeta/roxo arbitrário (TerceirosView)

ALERTAS RELEVANTES (WARN):
  • [transition-all]   111 ocorrências de animação irrestrita em todas as propriedades
  • [mono]             103 ocorrências de monospace aplicadas fora de códigos técnicos/SKU
  • [shadow]            73 ocorrências de sombras em cards e elementos estáticos
  • [glass]             26 ocorrências de backdrop-blur em gavetas operacionais
  • [bounce]            16 ocorrências de animações pulsantes decorativas (animate-pulse/ping)
  • [framework-colour]   2 cores hexadecimais padrão do Tailwind misturadas com tokens MD3
──────────────────────────────────────────────────────────────────────
```

---

## 2. Os 8 Grandes Vícios de IA Identificados no Projeto

### 2.1. Tell 1: KPIs com "Ícone em Quadrado Colorido" (`icon-chips`)
- **Onde está:**
  - [StockMetricsCards.tsx:L104-L106](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/dashboard/StockMetricsCards.tsx#L104-L106): `<div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0"><Package className="w-5 h-5" /></div>`
  - [StockMetricsCards.tsx:L149-L151](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/dashboard/StockMetricsCards.tsx#L149-L151): `<div className="w-10 h-10 rounded-xl bg-amber-500/10..."><AlertTriangle className="w-5 h-5" /></div>`
  - [StockMetricsCards.tsx:L203-L205](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/dashboard/StockMetricsCards.tsx#L203-L205): `<div className="w-10 h-10 rounded-xl bg-error-container..."><AlertCircle className="w-5 h-5 text-error" /></div>`
  - [KpiCard.tsx:L125-L131](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/ui/KpiCard.tsx#L125-L131): Primitiva base que força a caixinha colorida com ícone
  - [VendasView.tsx:L199-L201](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/gestao/vendas/VendasView.tsx#L199-L201), [TerceirosView.tsx:L178](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/gestao/terceiros/TerceirosView.tsx#L178)
- **Diagnóstico Taste Skill (`app-screens.md §1 & §2`):**
  > *"KPIs are type, not tiles. No screen puts an icon in a coloured circle on a KPI, and none draws a sparkline on one. This is the commonest tell of a generated dashboard. Drop the tinted square: a KPI is a label and a number; an icon, if it helps, is plain and in the text colour."*
- **Impacto:** Transforma uma ferramenta profissional de almoxarifado em um painel infantilizado ou cópia genérica de dashboard comercial.

---

### 2.2. Tell 2: Micro-labels em Caixa Alta Espaçada (`micro-label`)
- **Onde está:**
  - [StockTable.tsx:L185](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/dashboard/StockTable.tsx#L185): `<tr className="text-xs font-label-sm uppercase tracking-wider text-secondary select-none">`
  - [StockMetricsCards.tsx:L92](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/dashboard/StockMetricsCards.tsx#L92): `font-label-sm text-label-sm uppercase tracking-wider text-secondary font-semibold`
  - [ItemEditDrawer.tsx:L308](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/dashboard/drawers/ItemEditDrawer.tsx#L308): `text-xs font-semibold text-secondary uppercase tracking-wider mb-2`
  - [BaixaRapidaDrawer.tsx:L270, L321, L393](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/gestao/saida/BaixaRapidaDrawer.tsx#L270)
- **Diagnóstico Taste Skill (`tells.md §4`):**
  > *"Tiny tracked capitals are the one item in this group the data condemns: 16% of top sites against 57% of weak ones. Sentence case at readable size, placed with the content it describes."*
- **Impacto:** Textos em caixa alta com espaçamento largo forçado dificultam a leitura rápida e ocupam espaço horizontal precioso em telas de operação densa.

---

### 2.3. Tell 3: Listras Coloridas Superiores em Cada Card (`borderTop`)
- **Onde está:**
  - [StockMetricsCards.tsx:L89, L134, L183, L225](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/dashboard/StockMetricsCards.tsx#L89): `<div className="absolute top-0 left-0 right-0 h-1 bg-primary" />`
  - [CategoryBalanceCard.tsx:L75](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/dashboard/inicio/CategoryBalanceCard.tsx#L75): `<div className="absolute top-0 left-0 right-0 h-1 ${topBorderColor}" />`
  - [KpiCard.tsx:L98](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/ui/KpiCard.tsx#L98): `<div className="absolute top-0 left-0 right-0 h-1 ${config.borderTop}" />`
- **Diagnóstico Taste Skill (`app-screens.md §1`):**
  > *"Colour goes on data, not chrome. The median screen has about 3% coloured pixels; 17 of 23 stay at 5% or less. 12 have no filled primary button at all."*
- **Impacto:** As bordas superiores coloridas criam ruído visual repetitivo. O operador olha para a borda do card em vez de olhar para o número real do estoque.

---

### 2.4. Tell 4: Sombras em Elementos de Repouso e Desfoques de Vidro (`shadow` e `glass`)
- **Onde está:**
  - 73 ocorrências de `shadow-xs`, `shadow-sm`, `shadow-md` em cards de métricas, cabeçalhos de tabela e botões fixos.
  - 26 ocorrências de `backdrop-blur` em gavetas laterais ([ItemCreateDrawer.tsx:L171](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/dashboard/drawers/ItemCreateDrawer.tsx#L171), [ItemEditDrawer.tsx:L132](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/dashboard/drawers/ItemEditDrawer.tsx#L132), [MovementFormDrawer.tsx:L235](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/dashboard/drawers/MovementFormDrawer.tsx#L235)).
- **Diagnóstico Taste Skill (`app-screens.md §3` & `tells.md §1`):**
  > *"Surfaces are flat. 17 of 23 give their cards no shadow; separation is a 1px line or one tone step. Elements at rest carry none; only real overlays (dropdown menus, dialog modals) may carry a very subtle shadow."*
  > *"Glass panels / backdrop-blur: Opaque surfaces one tone step from the ground."*
- **Impacto:** Elementos planos transmitem solidez de engenharia e foco; sombras e vidros translúcidos fazem a tela parecer instável e artificial.

---

### 2.5. Tell 5: Animações Contínuas e Pontos Pulsantes (`bounce`, `animate-pulse`, `animate-ping`)
- **Onde está:**
  - [CriticalStockTable.tsx:L49-L50](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/dashboard/inicio/CriticalStockTable.tsx#L49-L50): `<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-75" />`
  - [StockMetricsCards.tsx:L191](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/dashboard/StockMetricsCards.tsx#L191): `<span className="w-2 h-2 rounded-full bg-error animate-ping" />`
  - [PriorityAlertBanner.tsx:L33](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/dashboard/inicio/PriorityAlertBanner.tsx#L33): `<AlertCircle className="w-6 h-6 animate-pulse" />`
  - [InicioDashboardView.tsx:L73](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/dashboard/inicio/InicioDashboardView.tsx#L73): Ponto verde decorativo de status.
- **Diagnóstico Taste Skill (`tells.md §2`):**
  > *"Decorative status dot ('Available for work', pulsing 'live') -> remove. Looping attention animation (bounce / ping / pulse dot) tires the human eye in everyday work."*
- **Impacto:** Um almoxarife que passa 8 horas operando o sistema fica visualmente exausto com elementos piscando sem parar. Uma cor sólida de alto contraste resolve a comunicação sem animação contínua.

---

### 2.6. Tell 6: Sobrecarga Visual na Célula de Saldo & Cobertura
- **Onde está:**
  - [StockTable.tsx:L357-L396](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/dashboard/StockTable.tsx#L357-L396): Uma única célula da tabela exibe:
    1. Saldo atual com unidade (ex: `150 un`);
    2. Rótulo de mínimo (`Mín: 50`);
    3. Barra de progresso horizontal bicolor (`h-1.5`);
    4. Porcentagem da capacidade máxima calculada;
    5. Texto de déficit em vermelho (ex: `-20 un`).
- **Diagnóstico Taste Skill & Regra do Projeto (`.agents/rules/ui-guidelines.md §2 & §4`):**
  > *"Zero redundant status indicators: Never combine a color bar, a status badge, and a verbal status unless each presents unique, non-overlapping information."*
  > *"Zero Micro-Copy Clutter: Avoid stacking more than 2 distinct font styles/sizes inside a single table cell."*
- **Impacto:** A tabela fica pesada, poluída e lenta de escanear visualmente.

---

### 2.7. Tell 7: Dados Inventados & Numeração Artificial
- **Onde está:**
  - [InicioDashboardView.tsx:L174, L188, L202](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/dashboard/inicio/InicioDashboardView.tsx#L174): `categoryNumber="Categoria 01"`, `"Categoria 02"`, `"Categoria 03"`.
  - [InicioDashboardView.tsx:L180-L195](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/dashboard/inicio/InicioDashboardView.tsx#L180-L195): `footerLabel="Lead-time médio reposição:" footerValue="4.2 dias"` e `footerValue="R$ 42.500,00"`.
- **Diagnóstico Taste Skill (`tells.md §4` & `app-screens.md §8`):**
  > *"Index numbering: 01 / 02 / 03, 'Step 02' -> banned. Order by position, scale, or the words."*
  > *"Data states are honest. Zeros print as zeros, missing values as a grey dash... A screen whose arithmetic does not close, or that shows placeholder data, damages trust."*
- **Impacto:** Métricas fictícias quebram a credibilidade do sistema com os operadores e gestores de almoxarifado.

---

### 2.8. Tell 8: Abuso de `transition-all` (111 instâncias) e Emojis Literais
- **Onde está:**
  - 111 instâncias de `transition-all` distribuídas por gavetas, botões, cards e linhas.
  - [StockMetricsCards.tsx:L162, L216](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/dashboard/StockMetricsCards.tsx#L162): Botão de filtro com `Ativo ✕` (caractere emoji de cruz).
  - [StockFilterToolbar.tsx:L214](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/dashboard/StockFilterToolbar.tsx#L214): `✕`.
- **Diagnóstico Taste Skill (`lint.mjs: transition-all, emoji`):**
  > *"transition: all. Name the properties (transform, opacity, colors). Avoid animating layout properties (width, height, margin, padding) which trigger browser reflows."*
  > *"Emoji used as UI: Emoji render inconsistently across Windows, macOS, Android and Linux. Use Lucide SVG icons or explicit text."*
- **Impacto:** Quedas de taxa de quadros (jank) em computadores mais antigos de chão de fábrica e inconsistência de renderização entre plataformas.

---

## 3. Revisão Específica por Módulo do Sistema

| Módulo / Componente | Situação Atual | O que a Taste Skill Exige Melhorar |
| :--- | :--- | :--- |
| **Shell & Layout Global** ([AppSidebar](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/layout/AppSidebar.tsx), [AppTopHeader](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/layout/AppTopHeader.tsx)) | Item ativo com pílula azul brilhante saturada e sombra (`shadow-xs`). Seletor de Galpão estático simulando dropdown. | A barra lateral deve recuar visualmente (`navigation recedes`). O item ativo deve ser um tom neutro discreto ou linha guia esquerda sutil. O seletor de galpão deve refletir estado real. |
| **Página Inicial** ([InicioDashboardView](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/dashboard/inicio/InicioDashboardView.tsx)) | Faixa superior com "WMS Shopfloor Control" em caixa alta com ponto pulsante. 5 cards de ações rápidas grandes estilo landing page. | Substituir a faixa superior por um cabeçalho operacional limpo. Transformar as ações rápidas em uma barra de ferramentas (`Action Ribbon`) compacta e direta. |
| **Catálogo de Estoque** ([StockMetricsCards](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/dashboard/StockMetricsCards.tsx)) | 4 cards altos com listras de cor no topo, caixinhas com ícones flutuantes e emojis `✕`. | KPIs tipográficos sóbrios: rótulo claro em sentence case, número em destaque tabular, e contexto de segurança sem ícones em bolhas coloridas. |
| **Tabela de Estoque** ([StockTable](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/dashboard/StockTable.tsx)) | Cabeçalhos em caixa alta forçada. Célula de saldo acumulando 5 dados conflitantes. Coluna de ações com botões minúsculos amontoados. | Cabeçalhos em sentence case. Separar coluna de saldo numérico da barra de cobertura. Alinhamento rigoroso à direita de valores numéricos e monetários. |
| **Filtros e Busca** ([StockFilterToolbar](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/dashboard/StockFilterToolbar.tsx)) | Pílulas totalmente arredondadas (`rounded-full`) com sombras e contadores coloridos. | Segmented controls (`rounded-md` ou `rounded-lg`) de visual discreto e integrado à barra de busca. |
| **Vendas & Faturamento** ([VendasView](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/gestao/vendas/VendasView.tsx), [FaturamentoView](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/gestao/faturamento/FaturamentoView.tsx)) | Repetição do mesmo padrão de 4 cards com ícones em caixinhas coloridas e sombras. | Alinhamento com o estilo de dados corporativos: tabelas com linhas limpas, badges de status sutis e KPIs de faturamento com números alinhados. |
| **Material de Terceiros** ([TerceirosView](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/gestao/terceiros/TerceirosView.tsx)) | Uso de `bg-purple-500` (tom roxo banido pelo linter) e mistura de classes Tailwind (`slate-900`) com tokens MD3. | Eliminar `purple-500` em favor do token primário do sistema (`--primary`). Padronizar o uso estrito dos tokens de superfície. |
| **Gavetas & Modais Operacionais** ([drawers/](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/dashboard/drawers)) | `backdrop-blur-sm`, `shadow-2xl` excessivo e 10+ ocorrências de `transition-all`. | Fundos opacos com separação nítida de borda (`border-l border-outline-variant/30`), transições leves focadas em `transform` e `opacity`. |

---

## 4. Guia Técnico de Implementação: Antes vs. Depois

### 4.1. Refatoração dos KPI Cards
```tsx
// ❌ ANTES (AI Slop: Listra colorida no topo, ícone em caixinha colorida, micro-label em caixa alta)
<button className="relative overflow-hidden rounded-xl p-4 bg-surface-container-lowest border border-outline-variant/30 shadow-xs">
  <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
  <div className="flex items-start justify-between">
    <div>
      <span className="font-label-sm uppercase tracking-wider text-secondary font-semibold">
        Abaixo do Mínimo
      </span>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="font-kpi-value text-3xl font-extrabold text-amber-600 tabular-nums">
          {totalAbaixoMinimo}
        </span>
        <span className="font-label-md text-secondary">em atenção</span>
      </div>
    </div>
    <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
      <AlertTriangle className="w-5 h-5" />
    </div>
  </div>
</button>

// ✅ DEPOIS (Taste Skill: Tipografia pura, superfície plana, hierarquia de engenharia)
<button className="rounded-lg p-4 bg-surface-container-lowest border border-outline-variant/20 hover:border-outline-variant/60 text-left transition-colors">
  <div className="flex items-center justify-between">
    <span className="text-xs font-medium text-secondary">Abaixo do mínimo</span>
    {totalAbaixoMinimo > 0 && (
      <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
        Requer reposição
      </span>
    )}
  </div>
  <div className="mt-2 flex items-baseline gap-1.5">
    <span className="text-3xl font-bold tracking-tight text-on-surface tabular-nums">
      {totalAbaixoMinimo.toLocaleString('pt-BR')}
    </span>
    <span className="text-xs text-secondary">materiais</span>
  </div>
  <p className="mt-2 text-[11px] text-secondary border-t border-outline-variant/15 pt-2">
    {percentualAbaixo}% do catálogo em nível de segurança
  </p>
</button>
```

---

### 4.2. Refatoração do Cabeçalho e Células da Tabela de Estoque
```tsx
// ❌ ANTES (Cabeçalhos em caixa alta, tracking excessivo, sem suporte tabular explícito)
<thead className="bg-surface-container-low border-b border-outline-variant/20 shadow-xs">
  <tr className="text-xs font-label-sm uppercase tracking-wider text-secondary select-none">
    <th className="py-3 px-4">Código / SKU</th>
    <th className="py-3 px-4 text-right">Valor Total</th>
  </tr>
</thead>

// ✅ DEPOIS (Sentence case legível, sem sombras falsas, números com tabular-nums rigoroso)
<thead className="bg-surface-container-low/75 border-b border-outline-variant/25">
  <tr className="text-xs font-medium text-secondary select-none">
    <th className="py-2.5 px-4 font-medium">Código SKU</th>
    <th className="py-2.5 px-4 text-right font-medium">Valor total em estoque</th>
  </tr>
</thead>
```

---

### 4.3. Refatoração da Barra de Ações Rápidas (QuickActionsBar)
```tsx
// ❌ ANTES (5 cards grandes com ícones flutuantes, setas deslizando e sombras)
<div className="grid grid-cols-5 gap-3">
  <button className="group flex items-center justify-between p-3.5 rounded-xl bg-primary shadow-sm hover:shadow-md">
    <div className="w-9 h-9 rounded-lg bg-surface-container-lowest/15 ...">...</div>
    <ArrowRight className="group-hover:translate-x-1 ..." />
  </button>
</div>

// ✅ DEPOIS (Barra de ferramentas operacional de chão de fábrica, limpa e produtiva)
<div className="flex flex-wrap items-center gap-2 p-2 bg-surface-container-low rounded-lg border border-outline-variant/20">
  <button className="inline-flex items-center gap-2 h-9 px-3.5 rounded-md bg-primary text-on-primary text-xs font-semibold hover:bg-primary/90 transition-colors">
    <Plus className="w-4 h-4" />
    <span>Registrar Entrada</span>
  </button>
  <button className="inline-flex items-center gap-2 h-9 px-3.5 rounded-md bg-surface-container-lowest hover:bg-surface-container text-on-surface text-xs font-semibold border border-outline-variant/30 transition-colors">
    <Minus className="w-4 h-4 text-error" />
    <span>Registrar Saída</span>
  </button>
  <button className="inline-flex items-center gap-2 h-9 px-3.5 rounded-md bg-surface-container-lowest hover:bg-surface-container text-on-surface text-xs font-medium border border-outline-variant/30 transition-colors">
    <span>Receber de Terceiro</span>
  </button>
  <button className="inline-flex items-center gap-2 h-9 px-3.5 rounded-md bg-surface-container-lowest hover:bg-surface-container text-on-surface text-xs font-medium border border-outline-variant/30 transition-colors">
    <span>Novo Pedido</span>
  </button>
</div>
```

---

## 5. Plano de Execução Recomendado (Roadmap de Melhorias)

### Fase 1: Eliminação Imediata dos FAILs do Linter (Quick Wins)
1. **Substituição de Emojis Literais:** Trocar `✕` em [StockMetricsCards.tsx](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/dashboard/StockMetricsCards.tsx) e [StockFilterToolbar.tsx](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/dashboard/StockFilterToolbar.tsx) por ícone `X` do Lucide ou texto `"Limpar"`.
2. **Correção de Cores Proibidas:** Remover `bg-purple-500` em [TerceirosView.tsx:L178](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/gestao/terceiros/TerceirosView.tsx#L178) e substituir por `--primary` ou tom neutro.
3. **Remoção de Gradientes:** Trocar `bg-gradient-to-r` em [PriorityAlertBanner.tsx](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/dashboard/inicio/PriorityAlertBanner.tsx) por cor de fundo sólida semitransparente (`bg-error-container/20 border-error/40`).
4. **Normalização de Micro-Labels:** Converter classes `uppercase tracking-wider` dos cabeçalhos de gavetas e tabelas para `font-medium normal-case text-xs`.

### Fase 2: Redesign dos Indicadores e Ações Rápidas (Human-Crafted ERP)
1. **Redesenho do `StockMetricsCards` e `KpiCard`:** Eliminar as listras coloridas no topo e os ícones em caixinhas coloridas, focando em tipografia limpa, números tabulares e comparativos objetivos.
2. **Compactação da `QuickActionsBar`:** Transformar os 5 cards de marketing em uma toolbar operacional industrial rápida.
3. **Remoção de Dados Fictícios em `CategoryBalanceCard`:** Substituir `"Categoria 01"`, lead time inventado e valores fixos por agregações reais ou remoção de campos enganosos.

### Fase 3: Limpeza da Tabela de Alta Densidade (`StockTable`)
1. **Despoluição da Célula de Saldo:** Exibir o saldo atual numérico de forma limpa, reservando a barra de cobertura como indicador sutil sem duplicar números de mínimo e déficit no mesmo espaço.
2. **Alinhamento Numérico Estrito:** Garantir que todas as colunas de quantidade, valores em reais e porcentagens fiquem alinhadas à direita com `tabular-nums`.
3. **Eliminação de `animate-ping`:** Trocar os indicadores pulsantes de ruptura por badges sólidos (`rounded-md`, fundo sutil).

### Fase 4: Otimização de Performance e Padronização de Tokens
1. **Substituição em Massa de `transition-all`:** Trocar por `transition-colors duration-150` em botões e `transition-transform duration-200` em drawers.
2. **Remoção de `backdrop-blur`:** Estabelecer superfícies opacas sólidas (`bg-surface-container-lowest` / dark mode) nas gavetas e modais.
3. **Revisão de Sombras:** Eliminar `shadow-xs`, `shadow-sm` e `shadow-md` de cards em repouso, preservando sombras suaves apenas em menus dropdown e diálogos flutuantes.
