# Plano Completo de Redesign do Frontend — Impeccable & Emil Design Engineering

> **Objetivo:** Eliminar em definitivo o aspecto de "site gerado por IA", o caos cromático (arco-íris de botões e badges) e a sobrecarga de elementos no chão de fábrica/almoxarifado, elevando o sistema ao padrão de software industrial contemporâneo (referências: Linear, Katana WMS, Flexport, Stripe Dashboard e Datadog).
> **Diretrizes e Skills Aplicadas:**
> - **Impeccable:** Modo *Operate* (a ferramenta desaparece no trabalho), Comandos *Quieter* (redução drástica de saturação) e *Distill* (eliminação de containers redundantes e ações concorrentes).
> - **Emil Kowalski Design Engineering:** Rigor de tipografia, eliminação de micro-animações decorativas, refinamento de detalhes imperceptíveis que se acumulam, e tabela comparativa de engenharia.
> - **Taste Skill v2:** Anti-slop radical, cor reservada para dados e não para chrome, eliminação da síndrome de cartões aninhados.

---

## 1. Diagnóstico Implacável da Interface Atual (Por que ainda parece IA?)

A partir da análise do código-fonte e do screenshot real da aplicação, identificam-se quatro causas-raiz que transmitem a sensação imediata de "template barato de IA":

### 1.1. O Caos Cromático (A Síndrome do Arco-Íris)
Em um único viewport de 1080p, coexistem simultaneamente **8 tonalidades saturadas e desconectadas**:
1. **Azul Elétrico (`#2563eb` / `#004ac6`):** No active state do menu lateral, nos botões da barra rápida e no link de turno.
2. **Azul Bebê Saturado (`#eff4ff`, `#e5eeff`, `#dae2fd`):** Fundo de todos os containers de métricas (`bg-surface-container-low`), dando a toda a aplicação uma película azulada artificial em vez de superfície neutra.
3. **Verde Esmeralda (`#006329` / `emerald-700`):** No botão `+ Entrada` do topo superior e em partes da barra bi-tonal.
4. **Rosa Bebê / Salmão (`#ffdad6`):** No banner de alerta gigante que cobre 100% da largura da tela.
5. **Vermelho Carmim (`#ba1a1a` / `#ba1a1a`):** No botão `- Saída` do topo, no botão `Resolver Críticos`, nos ícones de erro e nas 4 badges numéricas circulares do menu lateral.
6. **Âmbar / Laranja Queimado (`#f59e0b` / `amber-800`):** No botão `Baixa em Lote` do topo e no cartão de materiais improdutivos.
7. **Verde Limão (`#7ffc97`):** No token de badge de regularidade.
8. **Cinza Azulado Escuro (`#213145`):** No fundo do menu lateral.

*Veredito da Impeccable (Regra Quieter):* Software de produção não pode ter botões de semáforo (verde, vermelho, amarelo) misturados com azul elétrico. A paleta do chrome deve ser **90% neutra** (zinc/cinza neutro balanceado), com cor aplicada estritamente como **acento de 10%** para estados semânticos críticos.

---

### 1.2. A Síndrome de "Cartão dentro de Cartão" (Card Clutter)
Quase todos os elementos na tela estão confinados dentro de um retângulo branco com borda, que por sua vez contém pílulas com fundo azul bebê, que por sua vez contêm badges coloridas:
- O card de categoria tem borda, dentro tem uma pílula superior de percentual, dentro tem a barra bi-tonal, dentro tem a contagem com ícone de triângulo, e na base tem outro retângulo azul bebê (`bg-surface-container-low`) contendo outro texto!
- Isso gera **peso visual desnecessário** e faz com que o olho do operador não tenha para onde olhar.

---

### 1.3. Duplicação e Concorrência de Ações (Falta de Ponto Focal)
Existem **dois conjuntos de botões concorrentes para as mesmas funções** na mesma tela:
1. No cabeçalho superior (`AppTopHeader`): botões coloridos `+ Entrada`, `- Saída`, `Baixa em Lote`.
2. Logo abaixo, no corpo da página (`QuickActionsBar`): botões `Registrar Entrada`, `Registrar Saída`, `Receber de Terceiro`, `Novo Pedido`, `Cadastrar Material`.
3. Dentro do banner de alerta: botão `Resolver Críticos` e `Ver 4 Pedidos Atrasados`.
4. Dentro da tabela: botões `+ Entrada Rápida`.

*Veredito da Impeccable (Regra Distill):* O usuário sofre da "paráxia da escolha". Deve haver **uma única ação primária clara** na barra de comando e atalhos contextuais diretos, não 4 botões coloridos espalhados em níveis diferentes.

---

### 1.4. O Menu Lateral em "Modo Alarme Permanente"
No menu lateral (`AppSidebar`), quatro itens (`Matéria-prima: 104`, `Materiais Improdutivos: 41`, `Peças de motos: 96`, `Pedidos de venda: 4`) exibem círculos vermelho-vivo permanentes.
- Se tudo está em alerta vermelho o tempo todo, o vermelho perde qualquer poder de urgência.
- O menu lateral deve ser discreto, calmo e neutro; badges de estoque são dados de catálogo e não notificações de chat não lidas.

---

## 2. A Nova Filosofia de Design: "Industrial Neutrality"

Inspirada nas diretrizes do **Impeccable (Operate & Quieter)** e **Emil Kowalski Design Engineering**:

```
+-----------------------------------------------------------------------------------+
| 90% NEUTRO (CHROME CALMO)                                                         |
| - Superfícies: Branco puro (#ffffff) e Cinza Neutro Zinc (#f9fafb / #f4f4f5)      |
| - Bordas: Sutis e monocromáticas (#e4e4e7 em light / #27272a em dark)              |
| - Textos: Contraste hierárquico sóbrio (#09090b para títulos, #71717a secundário)  |
| - Sidebar: Cinza escuro discreto (#18181b) ou Light Unificado, sem neon          |
+-----------------------------------------------------------------------------------+
| 10% SEMÂNTICO (DADOS E AÇÕES REAIS)                                              |
| - Ação Primária: 1 único tom de destaque industrial (Dark Zinc ou Azul Escuro)    |
| - Ruptura Crítica: Vermelho suave estritamente em ponto 6px ou texto numérico      |
| - Regular / OK: Texto tabular neutro ou verde oliva contido (sem fundo pastel)    |
+-----------------------------------------------------------------------------------+
```

---

## 3. Tabela de Engenharia de Design (Padrão Emil Kowalski)

| Componente / Elemento | Antes (AI Slop Atual) | Depois (Operate / Impeccable) | Justificativa de Engenharia |
| :--- | :--- | :--- | :--- |
| **Paleta Global (`globals.css`)** | `--surface-container` e fundos com tom azul-bebê saturado (`#eff4ff`, `#e5eeff`). | Tons neutros equilibrados (escala Zinc neutra: `#ffffff`, `#fafafa`, `#f4f4f5`, `#e4e4e7`). | Elimina o visual "azul bebê genérico de IA" e cria uma tela de trabalho descansada e de alto contraste. |
| **Top Header (`AppTopHeader.tsx`)** | 3 botões coloridos concorrentes (Verde, Vermelho e Âmbar) colados na busca. | Cabeçalho sóbrio com seletor de galpão limpo, busca central e 1 único botão de ação global ou atalhos monocromáticos com ícone e texto neutro. | Elimina a sensação de "semáforo" no topo e despolui o campo de visão primário. |
| **Sidebar (`AppSidebar.tsx`)** | 4 badges vermelho-alarme berrantes (`bg-error`) permanentes em cada categoria. | Contadores tabulares monocromáticos discretos (`text-zinc-400 font-mono text-[11px]`) sem fundo vermelho. Ponto vermelho apenas se o galpão estiver paralisado. | Badges de estoque não são mensagens não lidas de WhatsApp. Vermelho é reservado para bloqueio real. |
| **Active State no Menu** | Retângulo azul elétrico forte (`bg-primary-container shadow-xs`). | Fundo neutro sutil (`bg-white/10` em dark ou `bg-zinc-100` em light) com traço lateral de 2px ou texto em alto contraste. | O menu lateral não deve competir com os dados da área de trabalho. |
| **Banner de Alerta (`PriorityAlertBanner.tsx`)** | Faixa rosa-bebê gigante de 120px com caixa de ícone vermelha, badge vermelha e botão vermelho. | Linha de alerta industrial compacta (36px a 44px), fundo neutro com borda lateral de acento de 3px ou barra fina, texto conciso e botão de ação inline discreto. | Notificações operacionais não devem roubar 25% da altura útil da tela em tom pastel. |
| **Quick Actions (`QuickActionsBar.tsx`)** | Fileira de 5 botões com ícones e cores diferentes disputando atenção com o topo. | Integrar diretamente como barra de ferramentas de comando unificada (Toolbar industrial com 1 botão primário escuro `+ Nova Movimentação` e ações secundárias em dropdown/menu agrupado). | Reduz a redundância onde o mesmo comando existia 3 vezes no mesmo ecrã. |
| **Cartões de Categoria (`CategoryBalanceCard.tsx`)** | 3 caixas contendo 5 métricas cada, badges coloridas no topo, barra bi-tonal verde/vermelho e caixa azul-bebê colada no rodapé. | Cartões limpos com hierarquia tipográfica: Categoria, Número grande tabular, barra de saúde fina de 2px monocromática/semântica, e dados em linha sem caixas azuis aninhadas. | Destrói a síndrome de card-in-card e permite leitura instantânea em menos de 1 segundo. |
| **Tabela de Ruptura (`CriticalStockTable.tsx`)** | Cabeçalho em maiúsculas minúsculas, texto vermelho gigante "0 UNIDADE", tag vermelha e botão azul. | Tabela de alta densidade padrão Datadog/Linear: colunas alinhadas à direita para números, tipografia tabular (`tabular-nums`), tags sutis sem saturação excessiva. | Alinhamento tabular numérico e contraste profissional sem ornamentos. |
| **Feed de Atividades (`RecentActivityFeed.tsx`)** | Caixas com fundo rosa e laranja com setas para `-6 KG`. | Linha do tempo minimalista monocromática com indicador sutil `+` ou `-` em fonte mono tabular. | Elimina os quadradinhos coloridos estilo "extrato de fintech infantil". |

---

## 4. Plano de Mudança Detalhado em 5 Fases

### Fase 1: Fundação do Sistema de Cores e Tokens Neutros (`globals.css`)
- **Ação 1.1:** Substituir os valores de `--surface`, `--surface-container`, `--surface-container-low` e `--secondary-container` que possuem matiz azul saturado (`#eff4ff`, `#e5eeff`, `#dae2fd`) por uma escala neutra de cinzas industriais (Zinc/Neutral: `#ffffff`, `#fafafa`, `#f4f4f5`, `#e4e4e7`, `#d4d4d8`, `#71717a`, `#18181b`).
- **Ação 1.2:** Redefinir `--primary` para um tom técnico sóbrio (e.g. `#0f172a` escuro em light mode, ou `#2563eb` controlado estritamente para o único botão de ação principal da tela).
- **Ação 1.3:** Limpar tokens de apoio (`--error-container`, `--tertiary-fixed`) para que não gerem fundos pastel berrantes (rosa bebê e verde limão).

### Fase 2: Unificação e Limpeza do Shell da Aplicação (`AppTopHeader.tsx` & `AppSidebar.tsx`)
- **Ação 2.1 (`AppTopHeader`):**
  - Remover os botões coloridos de semáforo (`+ Entrada` verde, `- Saída` rosa, `Baixa em Lote` laranja).
  - Manter no topo apenas: Seletor de Galpão sóbrio, Busca Global com atalho `⌘K`, Botão de Notificação neutro, Seletor de Tema e Avatar do Usuário.
  - O acesso rápido à entrada e saída fica centralizado no espaço de trabalho ou via comando da busca/tecla de atalho.
- **Ação 2.2 (`AppSidebar`):**
  - Remover a cor de fundo navy saturada em favor de um tom neutro elegante (`#18181b` dark zinc).
  - Substituir os círculos vermelhos alarmistas de contagem por números em texto cinza neutro (`text-zinc-400 font-mono text-[11px]`).
  - Trocar o active state de azul elétrico por um indicador sóbrio (fundo sutil e texto nítido).

### Fase 3: Redesenho Radical da Tela Inicial (`InicioDashboardView.tsx`)
- **Ação 3.1 (`PriorityAlertBanner`):**
  - Redesenhar de um card rosa gigante de 120px para uma barra compacta de 40px: ícone discreto de aviso, texto informativo limpo, e link/botão "Ver 1 item crítico" sem saturação agressiva.
- **Ação 3.2 (Eliminação da barra redundante de botões):**
  - Fundir a `QuickActionsBar` com a barra de comando da página: 1 botão principal `+ Registrar Movimentação` e ações secundárias alinhadas à direita em grupo neutro.
- **Ação 3.3 (`CategoryBalanceCard`):**
  - Eliminar a caixa azul de rodapé (`bg-surface-container-low`).
  - Simplificar as métricas: mostrar o total de itens em destaque, uma barra única e discreta de proporção e a contagem de itens em atenção sem múltiplas cores concorrentes no mesmo card.
- **Ação 3.4 (`CriticalStockTable` & `RecentActivityFeed`):**
  - Remover pílulas azuis brilhantes dos filtros.
  - Alinhar todos os valores numéricos com precisão tabular à direita.
  - Padronizar o feed de histórico para tipografia limpa sem quadrados coloridos para cada baixa.

### Fase 4: Padronização das Telas de Gestão e Tabelas (`StockTable.tsx`, `VendasView.tsx`, `SaidaManualView.tsx`)
- **Ação 4.1:** Aplicar a mesma toolbar limpa e botões segmentados monocromáticos em `StockFilterToolbar.tsx`, `VendasView.tsx`, `FaturamentoView.tsx` e `SaidaManualView.tsx`.
- **Ação 4.2:** Garantir que todas as tabelas usem o mesmo espaçamento vertical, mesma cor de cabeçalho (sem sombras e sem maiúsculas forçadas) e mesmo estilo de tag de situação.

### Fase 5: Auditoria de Verificação e Polish Final
- **Ação 5.1:** Executar linter `design-taste-frontend` para validar zero regressões.
- **Ação 5.2:** Executar checagem de tipos (`npm run typecheck`) e bateria completa de testes (`npm run test`).
- **Ação 5.3:** Validar contraste de acessibilidade (WCAG AA) em modo claro e escuro.

---

## 5. Próximos Passos Recomendados

1. **Aprovação do Plano:** Alinhamento do usuário com as 5 fases propostas.
2. **Execução Granular com Commits Atômicos:** Implementação fase a fase com commits locais formatados via Conventional Commits após cada validação.
