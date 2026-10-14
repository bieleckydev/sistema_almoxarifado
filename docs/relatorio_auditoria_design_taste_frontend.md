# Relatório de Auditoria de Design: Identificação de AI Slop UI e Guia de Design Humano

> **Auditoria baseada na Skill `design-taste-frontend` (`taste-skill`) e nas Diretrizes de UI/UX do Projeto (`.agents/rules/ui-guidelines.md`)**  
> **Escopo:** Frontend React / Next.js ([src/web](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web)) comparado ao Protótipo Operacional de Referência ([almoxarifado5.html](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/Front%20end%20Almoxarifado/almoxarifado5.html))  
> **Data:** 14 de Outubro de 2026

---

## 1. Sumário Executivo & Diagnóstico Geral (Taste Skill Score)

A auditoria utilizou as diretrizes rigorosas da `design-taste-frontend` e o catálogo de vícios de geração (`tells.md`) para inspecionar todas as páginas, componentes e tokens visuais do frontend React deste sistema de almoxarifado.

### O Diagnóstico
O projeto possui uma **excelente base funcional, arquitetura robusta e boa cobertura de regras de negócio**, mas visualmente carrega diversos **"AI Tells" (vícios de geração automática de IA)**. Esses elementos fazem com que a interface pareça um "template gerado por IA genérico" (estilo marketing SaaS / Tailwind default) em vez de um **software corporativo e industrial de alta precisão desenhado por humanos** (como o protótipo [almoxarifado5.html](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/Front%20end%20Almoxarifado/almoxarifado5.html)).

```
AVALIAÇÃO GERAL ATUAL (Critério Taste Skill / Awwwards Juror):
┌───────────────────────────┬────────┬────────────────────────────────────────────────────────┐
│ Critério                  │ Nota   │ Justificativa Técnica                                  │
├───────────────────────────┼────────┼────────────────────────────────────────────────────────┤
│ Design (40%)              │ 6.0/10 │ Inconsistência de raios de borda, sombras artificiais, │
│                           │        │ tipografia Inter genérica, blur/vidro desnecessário.   │
├───────────────────────────┼────────┼────────────────────────────────────────────────────────┤
│ Usabilidade (30%)         │ 7.8/10 │ Boa densidade de tabela e teclado, mas prejudicada por │
│                           │        │ botões pílula pequenos e dispersão de cores em ícones. │
├───────────────────────────┼────────┼────────────────────────────────────────────────────────┤
│ Criatividade (20%)        │ 6.5/10 │ Copia clichês de dashboards SaaS em vez de abraçar a   │
│                           │        │ sobriedade de um ERP industrial confiável.             │
├───────────────────────────┼────────┼────────────────────────────────────────────────────────┤
│ Conteúdo / Domínio (10%)  │ 8.5/10 │ Excelente modelo de domínio de almoxarifado (SKU, CA). │
└───────────────────────────┴────────┴────────────────────────────────────────────────────────┘
SCORE PONDERADO ATUAL: 6.8 / 10.0 (Cap aplicado: não pode exceder 6.5 devido a tells de IA)
```

---

## 2. Taxonomia de "AI Slop UI" Identificados no Projeto

Abaixo estão os 7 grandes vícios de geração detectados no código atual:

### Tell 1: Pílulas Flutuantes (`rounded-full`) e Caos de Raios de Borda
- **O Vício:** Botões, badges e chips formatados com `rounded-full` misturados com cards `rounded-2xl`, inputs `rounded-lg` e botões `rounded-md`.
- **Onde está:**
  - [QuickActionsBar.tsx:L40,L50,L60](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/dashboard/inicio/QuickActionsBar.tsx#L40-L60): Botões de ação como pílulas arredondadas com bordas cinzas.
  - [SummaryNavCard.tsx:L106](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/dashboard/inicio/SummaryNavCard.tsx#L106): Tags de situação com `rounded-full`.
  - [AttentionPanel.tsx:L108](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/dashboard/inicio/AttentionPanel.tsx#L108): `px-2 py-0.5 rounded-full text-[11px]`.
  - [ClientesView.tsx:L157](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/gestao/clientes/ClientesView.tsx#L157): Badges numéricos com `rounded-full`.
- **Por que é AI Slop:** A regra da `taste-skill` define: *"Replace overly rounded 'pill' badges with subtle status tags (rounded-md, border-subtle). Decide corner radius once: either square or crisp 6-8px."* Pílulas remetem a sites de brinquedo ou landing pages de 2023, não a softwares de controle patrimonial.

### Tell 2: Pulsing Live Dot Syndrome (`animate-pulse` decorativo)
- **O Vício:** Pontos vermelhos ou indicadores de status pulsando infinitamente no viewport.
- **Onde está:**
  - [StockStatusBadge.tsx:L38](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/dashboard/StockStatusBadge.tsx#L38): `dotColor: 'bg-rose-500 animate-pulse'`.
- **Por que é AI Slop:** `tells.md §2`: *"Decorative status dot ('Available for work', pulsing 'live') -> remove"*. Em softwares industriais, animações contínuas competem desnecessariamente pela atenção visual do operador e cansam a vista após 8 horas de uso. O status deve ser transmitido por cor sólida e texto claro.

### Tell 3: "Ícone dentro de uma Caixa Arredondada" & Rainbow Icons
- **O Vício:** Colocar ícones isolados dentro de quadradinhos arredondados com cores pastel (azul claro, rosa claro) flutuando sem contexto, ou pintar cada ícone de uma cor diferente do arco-íris sem hierarquia funcional.
- **Onde está:**
  - [UserProfileCard.tsx:L24](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/UserProfileCard.tsx#L24): `<div className="p-2 bg-blue-50 dark:bg-blue-950 text-blue-600 rounded-lg"><UserIcon /></div>`.
  - [SummaryNavCard.tsx:L72-76](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/dashboard/inicio/SummaryNavCard.tsx#L72-L76): Ícones soltos no topo do card puramente para preencher espaço.
  - [EmptyState.tsx:L23](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/feedback/EmptyState.tsx#L23): Ícone dentro de um círculo cinza `rounded-full` em um box tracejado (`border-dashed`).
  - [QuickActionsBar.tsx:L42,L52,L62](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/dashboard/inicio/QuickActionsBar.tsx#L42): Ícones coloridos arbitrariamente (verde, rosa, azul) gerando ruído de "árvore de natal".
- **Por que é AI Slop:** `tells.md §1`: *"Three identical feature cards, each with an icon in a rounded square -> banned"*. No design humano, o valor numérico e a etiqueta textual comandam a tela; o ícone tem função semiótica direta ou é omitido.

### Tell 4: Sombras Flutuantes e Elevação Falsa (`shadow-md`, `hover:shadow-md`)
- **O Vício:** Aplicar sombras difusas (`shadow-xs`, `shadow-2xs`, `shadow-md`, `shadow-xl`) em cartões que estão em repouso no plano de fundo.
- **Onde está:**
  - [SummaryNavCard.tsx:L68](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/dashboard/inicio/SummaryNavCard.tsx#L68): `hover:shadow-md hover:border-slate-300`.
  - [QuickActionsBar.tsx:L30](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/dashboard/inicio/QuickActionsBar.tsx#L30): `hover:shadow-md`.
  - [VendasView.tsx:L135,L220](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/gestao/vendas/VendasView.tsx#L135): `shadow-2xs`.
  - [SaidaManualView.tsx:L227,L433](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/gestao/saida/SaidaManualView.tsx#L227): `shadow-2xs`.
- **Por que é AI Slop:** `design-taste-frontend §Laws of the craft`: *"No shadows on things at rest. No glows. A tone step between surfaces. Shadows only on what truly floats: a menu, a dialog."* Softwares como o protótipo original separam elementos por **degraus de tom (tone steps)** e linhas finas estruturadas, nunca por sombras esfumaçadas de template genérico.

### Tell 5: Vidro Falso e Desfoque de Fundo (`backdrop-blur-sm`, `backdrop-blur-md`)
- **O Vício:** Usar `backdrop-blur` em cabeçalhos fixos e gavetas.
- **Onde está:**
  - [AppTopHeader.tsx:L34](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/layout/AppTopHeader.tsx#L34): `bg-white/95 backdrop-blur-md`.
  - [ItemDetailsDrawer.tsx:L67,L80](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/dashboard/ItemDetailsDrawer.tsx#L67): `backdrop-blur-xs`, `backdrop-blur-sm`.
  - [ItemCreateDrawer.tsx:L171,L184](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/dashboard/drawers/ItemCreateDrawer.tsx#L171): `backdrop-blur-sm`.
- **Por que é AI Slop:** `tells.md §1`: *"Glass panels: backdrop blur, translucent cards -> warned / banned. Use opaque surfaces one tone step from the ground"*. Em ferramentas operacionais, superfícies opacas garantem contraste absoluto de leitura e melhor desempenho de renderização sem artefatos visuais.

### Tell 6: Tipografia Genérica Padrão de IA (`Inter`) vs Tipografia Industrial (`IBM Plex Sans`)
- **O Vício:** Adoção de `Inter` como fonte global da aplicação.
- **Onde está:**
  - [layout.tsx:L6](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/app/layout.tsx#L6) e [globals.css:L47](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/app/globals.css#L47).
- **Por que é AI Slop:** A fonte `Inter` é o padrão inalterado de 95% dos geradores de código. No protótipo original humano ([almoxarifado5.html:L9](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/Front%20end%20Almoxarifado/almoxarifado5.html#L9)), foi escolhida **`IBM Plex Sans`**, uma fonte desenhada especificamente pela IBM para sistemas de informação e engenharia, com proporções mecânicas, ritmo industrial e legibilidade superior.

### Tell 7: Desconexão Cromática no Modo Escuro (Azul-Marinho Saturado vs Grafite Técnico)
- **O Vício:** Uso de azul petróleo e ardósia saturada (`#0c1218`, `#17212a`, `#0a1217`, `bg-blue-950`) no modo escuro em vez de uma escala de grafite/carvão técnico.
- **Onde está:**
  - [globals.css:L27-43](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/app/globals.css#L27-L43): `--background: #0e151b; --surface: #17212a; --sidebar-bg: #0a1217;`.
  - [almoxarifado5.html:L13-14](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/Front%20end%20Almoxarifado/almoxarifado5.html#L13-L14) usa a autêntica paleta humana:
    `--bg: #232325`, `--surface: #2b2b2e`, `--side: #1a1a1c`, `--line: #3e3e42`, `--ink: #ececee`.

---

## 3. Matriz Completa de Auditoria Componente a Componente

Abaixo está o inventário de todas as páginas e componentes do frontend React com os problemas encontrados e o plano de ação de design humano:

| Arquivo / Componente | Sintomas de AI Slop Detectados | O que o Design Humano Deve Fazer | Severidade |
| :--- | :--- | :--- | :---: |
| [globals.css](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/app/globals.css) & [layout.tsx](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/app/layout.tsx) | Importação de `Inter`, tokens de tema com tons azuis saturados no dark mode, transição CSS global em todas as propriedades (`* { transition-property: ... }`). | Migrar fonte primária para `IBM Plex Sans`. Adotar os tons de grafite industrial de `almoxarifado5.html`. Remover transição genérica global em `*` que gera repintura lenta em tabelas. | 🔴 Alta |
| [login/page.tsx](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/app/login/page.tsx) | Card com `shadow-xs`, ícone de caixas dentro de quadrado arredondado azul claro (`bg-[#0f5c7a]/10`), subtítulo decorativo genérico. | Card com borda limpa e degrau de tom sólido (sem sombra). Alinhamento sóbrio de tipografia com hierarquia industrial (versão do sistema e aviso em texto direto). | 🟡 Média |
| [LoginForm.tsx](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/auth/LoginForm.tsx) | Labels em uppercase rastreados (`tracking-wide uppercase text-xs`), botões com `shadow-xs`, ícone de cadeado solto. | Usar Sentence case nos rótulos de formulário. Inputs com borda sóbria de 1px e padding confortável de ERP (8px). Botão com cor de preenchimento única e cantos de 6-8px. | 🟡 Média |
| [AppSidebar.tsx](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/layout/AppSidebar.tsx) | Fundo `#0b0c0f` destoa dos painéis, badge com `rounded-full`, ícone de avatar dentro de quadrado arredondado. | Unificar com os tokens de sidebar da v5 (`--side: #0b0c0f` claro / `#1a1a1c` escuro). Usar tags quadradas ou raio único (4-6px) para as badges numéricas. | 🟡 Média |
| [AppRibbonHeader.tsx](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/layout/AppRibbonHeader.tsx) | Transições desnecessárias, botões verticais com ícones `lucide` soltos em vez de SVG industrial proporcional. | Alinhar proporção dos botões verticais da Ribbon (88px) com espaçamento de 4px entre botões e bordas divisórias verticais sutis (`border-line`). | 🟢 Baixa |
| [GlobalSearchInput.tsx](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/layout/GlobalSearchInput.tsx) | Input com `rounded-xl`, sombra `shadow-2xs`, backdrop com foco excessivo. | Adotar `rounded-md` (6-8px) consistente com todos os inputs do sistema. Eliminar sombras difusas; usar destaque de borda limpa (`outline: 2px solid var(--brand)`). | 🟡 Média |
| [InicioDashboardView.tsx](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/dashboard/inicio/InicioDashboardView.tsx) | Grid com espaçamentos desiguais, títulos sem hierarquia de escala (`text-2xl md:text-3xl font-bold tracking-tight`). | Adotar a escala tipográfica humana da v5 (`h1 { font-size: clamp(24px, 3.2vw, 34px); font-weight: 600 }`). Agrupar cartões com degrau tonal exato. | 🟡 Média |
| [QuickActionsBar.tsx](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/dashboard/inicio/QuickActionsBar.tsx) | Disparidade grotesca: 1 botão `rounded-xl` e 3 botões em formato pílula `rounded-full`. Rainbow icons (verde, rosa, azul). | Padronizar todos os botões com raio único (`rounded-md`, 6px). Ação primária com preenchimento sólido da marca; ações secundárias com botão neutro e texto direto. | 🔴 Alta |
| [AttentionPanel.tsx](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/dashboard/inicio/AttentionPanel.tsx) | Painel com `rounded-xl`, sombra `shadow-2xs`, tags em formato pílula `rounded-full`, ícones de alerta amarelos soltos. | Estruturar painel como uma lista operacional com bordas de 1px e topo em destaque. Trocar tags pílula por etiquetas retangulares sutis (`rounded-md`, `tag ok/low/crit`). | 🔴 Alta |
| [SummaryNavCard.tsx](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/dashboard/inicio/SummaryNavCard.tsx) | `rounded-xl`, `hover:shadow-md`, ícone flutuante decorativo em cima, tags pílula com `rounded-full` no rodapé. | Remover o ícone solto ou integrá-lo de forma limpa ao título. Usar cantos de 8-10px. Remover `hover:shadow-md`; usar apenas borda superior colorida (sky/brand). | 🔴 Alta |
| [StockMetricsCards.tsx](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/dashboard/StockMetricsCards.tsx) | Indicador `ring-2 ring-amber-500` muito agressivo, texto "100% catálogo" em fonte monospace desnecessária. | Usar borda superior tricolor ou degrau de tom ativo da v5 (`stat.crit`, `stat.low`). Manter fonte de texto natural (sans-serif) para descrições. | 🟡 Média |
| [StockFilterToolbar.tsx](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/dashboard/StockFilterToolbar.tsx) | Chips de filtro em formato pílula `rounded-full`, sombras `shadow-2xs`. | Adotar os chips retangulares ou pill discreto com borda neutra de 1px (`almoxarifado5.html .chip`). Estado ativo com preenchimento limpo sem sombras. | 🟡 Média |
| [StockTable.tsx](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/dashboard/StockTable.tsx) | Tabela envolvida em `shadow-2xs`, botões de ação com bordas de cores variadas (`hover:border-emerald-500`, `hover:border-rose-500`), texto em células muito fragmentado. | Tabela com cabeçalho de 1 linha de 13.5px (`font-weight: 500`), sem sombra. Ações compactas e discretas (`.mini`), com foco em legibilidade e densidade de ERP. | 🟡 Média |
| [StockStatusBadge.tsx](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/dashboard/StockStatusBadge.tsx) | `animate-pulse` decorativo no dot de ruptura (`bg-rose-500 animate-pulse`), acúmulo de dot + badge + texto. | Remover `animate-pulse`. Adotar a classe `.tag.ok`, `.tag.low`, `.tag.crit` com fundo pastel sólido e texto escuro de alto contraste, sem dot pulsante. | 🔴 Alta |
| [StockGauge.tsx](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/dashboard/StockGauge.tsx) | Barra de progresso com marcador vertical sem rótulo claro de mínimo na linha principal. | Alinhar à `.gauge` de `almoxarifado5.html`: altura de 8px, trilha neutra, preenchimento com cor de criticidade e marcador `u` sóbrio. | 🟢 Baixa |
| [ItemDetailsDrawer.tsx](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/dashboard/ItemDetailsDrawer.tsx) | `rounded-2xl` no bloco de saldo, `backdrop-blur` no cabeçalho e scrim, sombra `shadow-2xl`, múltiplos ícones decorativos (`Cpu`, `MapPin`, `ShieldAlert`). | Gaveta com fundo sólido, sem blur. Saldo com tipografia em escala dominante (`40px font-weight: 600`), lista de especificações limpa em tabela de duas colunas (`dl`/`dt`/`dd`). | 🔴 Alta |
| [ItemCreateDrawer.tsx](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/dashboard/drawers/ItemCreateDrawer.tsx) | Scrim com desfoque de fundo (`backdrop-blur-xs`), botões com `shadow-xs`, caixas de alerta exageradas. | Formulário sóbrio com campos de 1px de borda, sem sombras e sem desfoque. Mensagens de erro em linha abaixo do campo afetado. | 🟡 Média |
| [MovementFormDrawer.tsx](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/dashboard/drawers/MovementFormDrawer.tsx) | `backdrop-blur-xs`, botões com sombras, ícones coloridos de entrada e saída. | Alinhar com o modal operacional clássico: foco imediato no input numérico, botões com preenchimento sólido sem sombra. | 🟡 Média |
| [QuickItemPickerDrawer.tsx](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/dashboard/drawers/QuickItemPickerDrawer.tsx) | Lista com itens em cartões arredondados e sombras em repouso. | Renderizar lista de seleção como uma tabela operacional densa (`.pk` do protótipo), com hover de cor de fundo sem elevação. | 🟡 Média |
| [VendasView.tsx](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/gestao/vendas/VendasView.tsx) | 3 cards de KPI com `rounded-xl`, borda esquerda grossa (`border-l-4 border-l-rose-500`) e sombras `shadow-2xs`. | Usar a mesma grade de estatísticas do estoque (`.stat`), com borda superior fina (`border-top: 3px`) e números tabulares grandes e limpos. | 🟡 Média |
| [OrderStatusBadge.tsx](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/gestao/vendas/OrderStatusBadge.tsx) | Badges com formatos diferentes e sobreposição de múltiplas etiquetas coloridas. | Consolidar status e anotação em uma única tag coerente de 13px, sem empilhar 3 micro-badges coloridos. | 🟡 Média |
| [ClientesView.tsx](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/gestao/clientes/ClientesView.tsx) | Chips de categorias com contadores em pílula microscópica (`rounded-full font-mono text-[10px]`), ícones coloridos por tipo de parceiro. | Chips planos com contagem entre parênteses em texto normal, sem ícones coloridos concorrentes. | 🟡 Média |
| [SaidaManualView.tsx](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/gestao/saida/SaidaManualView.tsx) | Formulário de saída em box `rounded-xl` com sombra `shadow-2xs`, misturado com chips de período azuis. | Painel de formulário sóbrio com bordas de 1px. Tabela consolidada com colunas limpas (Item, Entrou, Saiu, Estoque Atual) e números alinhados à direita. | 🟡 Média |
| [UserProfileCard.tsx](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/UserProfileCard.tsx) | **Caso clássico de AI Slop**: card com `shadow-md`, ícone `UserIcon` numa caixinha azul redonda, botão azul genérico de "Atualizar Nome". | Componente não utilizado na navegação principal; deve ser refatorado para o padrão de ficha cadastral ou removido do bundle de produção. | 🔴 Alta |
| [EmptyState.tsx](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/feedback/EmptyState.tsx) | **Outro clichê de IA**: caixa cinza com borda tracejada (`border-dashed`), ícone dentro de círculo cinza `rounded-full` no centro. | `tells.md §3`: substituir caixa tracejada por um bloco limpo com texto claro de uma linha: *"Nenhum material encontrado com os filtros atuais."* e botão de ação direta. | 🔴 Alta |
| [ToastContainer.tsx](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/feedback/ToastContainer.tsx) | Toasts com `shadow-xl`, cantos excessivamente arredondados (`rounded-xl`). | Notificação minimalista com cantos de 8-10px, fundo escuro sólido e borda fina de 1px (`#toast` de `almoxarifado5.html`). | 🟢 Baixa |

---

## 4. Plano Diretor de Refatoração: Rumo ao Design Humano de Alta Precisão

Para transformar o frontend React de um "AI Slop" em um software de **design humano maduro e de classe mundial**, siga este plano em 5 etapas:

### Etapa 1: Tipografia Industrial de Alto Nível
1. Substituir a fonte Google `Inter` por **`IBM Plex Sans`** no [layout.tsx](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/app/layout.tsx):
   ```tsx
   import { IBM_Plex_Sans, JetBrains_Mono } from 'next/font/google';

   const ibmPlexSans = IBM_Plex_Sans({
     subsets: ['latin'],
     weight: ['400', '500', '600', '700'],
     display: 'swap',
     variable: '--font-sans',
   });
   ```
2. Manter estritamente `JetBrains Mono` apenas para códigos técnicos (SKU, lote, NF-e, endereço físico).
3. Aplicar `font-variant-numeric: tabular-nums` em todos os valores numéricos.

### Etapa 2: Unificação da Paleta & Degraus de Tom (Tone Steps)
1. Atualizar as variáveis de [globals.css](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/app/globals.css) para espelhar rigorosamente o protótipo [almoxarifado5.html](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/Front%20end%20Almoxarifado/almoxarifado5.html):
   - **Claro:** `--bg: #e9eff7`, `--surface: #ffffff`, `--line: #d9dfe5`, `--ink: #17212b`, `--muted: #5b6876`, `--brand: #1d4ea3`, `--sky: #4fa8e0`, `--yellow: #f2b705`, `--red: #d9372f`.
   - **Escuro:** `--bg: #232325`, `--surface: #2b2b2e`, `--line: #3e3e42`, `--ink: #ececee`, `--muted: #a3a3a9`, `--brand: #5aa9ea`, `--sky: #7cc3f2`.
2. Remover a regra `* { transition-property: ... }` que causa lag e repintura global desnecessária.

### Etapa 3: Disciplina de Raios de Borda (Fim do Caos de Borda)
Estabelecer um sistema rígido de raios de borda:
- **`rounded-md` (6px a 8px):** Para todos os botões, campos de entrada (`input`, `select`), tags de status e células interativas.
- **`rounded-lg` (10px):** Para os cartões de estatísticas (`.stat`, `.card`), tabelas e contêineres principais.
- **Proibir terminantemente:** `rounded-full` em botões de ação e tags; banir `rounded-2xl` e `rounded-3xl`.

### Etapa 4: Eliminação de Sombras Artificiais e Blur Cosmético
1. Substituir todas as classes `shadow-xs`, `shadow-2xs`, `shadow-md`, `hover:shadow-md` por bordas nítidas de 1px (`border border-slate-200 dark:border-slate-800`).
2. Remover `backdrop-blur-sm`, `backdrop-blur-md` e `backdrop-blur-xs` dos cabeçalhos e gavetas, tornando os fundos 100% opacos com a cor da superfície (`--surface`).

### Etapa 5: Limpeza de Clichês em Componentes Críticos
1. **[QuickActionsBar.tsx](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/dashboard/inicio/QuickActionsBar.tsx):** Padronizar todos os 4 botões com a mesma altura (36px), raio de borda único (`rounded-md`), um botão principal com preenchimento da marca e botões secundários neutros sem cores aleatórias em ícones.
2. **[StockStatusBadge.tsx](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/dashboard/StockStatusBadge.tsx):** Remover o `animate-pulse` e transformar o componente em uma tag sólida e limpa (`rounded-md`, 6px), garantindo leitura instantânea.
3. **[SummaryNavCard.tsx](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/dashboard/inicio/SummaryNavCard.tsx):** Remover o ícone genérico superior; o valor numérico e o título comandam o card. A borda superior sky/brand fornece a identidade visual.
4. **[EmptyState.tsx](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/feedback/EmptyState.tsx):** Eliminar a borda tracejada e o círculo cinza; exibir mensagem sóbria e o botão de ação.

---

## 5. Conclusão da Avaliação

O sistema possui uma excelente base funcional, mas suas escolhas visuais herdaram clichês típicos de geração por IA que diluem a credibilidade de um software industrial sério. A aplicação das 5 etapas acima alinha o React à sofisticação sóbria e humana demonstrada no protótipo [almoxarifado5.html](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/Front%20end%20Almoxarifado/almoxarifado5.html), elevando o produto a uma nota de excelência no critério da `taste-skill`.
