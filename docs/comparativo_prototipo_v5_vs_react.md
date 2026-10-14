# Relatório Comparativo e Matriz de Divergências: Protótipo (`almoxarifado5.html`) vs Frontend React

Este documento apresenta uma análise técnica detalhada comparando o protótipo operacional [almoxarifado5.html](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/Front%20end%20Almoxarifado/almoxarifado5.html) (versão 5) com a implementação atual do frontend React / Next.js localizada em [src/web](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web).

---

## 1. Sumário Executivo da Evolução (v4 → v5)

Na evolução do protótipo da versão 4 para a **versão 5 (`almoxarifado5.html`)**, a arquitetura de navegação e operação do sistema sofreu uma transformação profunda:

1. **Introdução da Ribbon Bar (Faixa de Opções Superior)**: A barra superior estática foi substituída por uma Ribbon no estilo Microsoft Office / ERP industrial, com abas contextuais, botões verticais com ícones grandes (30x30px) e agrupamento visual de comandos (`.grp2`).
2. **Novo Módulo de Compras**: Criação formal do módulo "Compras", com fluxos dedicados de recebimento de materiais, atalhos para fornecedores e cadastro pré-parametrizado.
3. **Sidebar Retrátil de Módulos Corporativos**: A barra lateral passou a agrupar o sistema em 4 grandes módulos (`Início`, `Estoque`, `Compras`, `Vendas`), com suporte a colapso para modo mini (52px).
4. **Controle Global do Período de Análise**: O filtro temporal (`Hoje`, `Ontem`, `7 dias`, `Tudo`) passou a ser um seletor dinâmico global na Ribbon, com exibição do intervalo exato de datas formatadas.
5. **Aba Global de Favoritos**: Criação de uma aba fixa na Ribbon com os atalhos de maior frequência operacional.
6. **Ações Parametrizadas na Navegação**: Suporte a disparos diretos como `novoCadastro('Fornecedor')`, `fc:Fornecedor` (filtro direto de contatos) e download de CSV direto da barra superior.

---

## 2. Matriz Comparativa Geral

| Funcionalidade / Módulo | Protótipo (`almoxarifado5.html`) | Frontend React (`src/web`) | Situação |
| :--- | :--- | :--- | :--- |
| **Faixa de Opções (Ribbon Menu)** | Header `.rib` com abas horizontais (`#tabbtns`), comandos agrupados (`.grp2`), botões verticais (`.rb`) com ícones 30px e faixa tricolor na borda. | Inexistente. Possui apenas o [AppTopHeader.tsx](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/layout/AppTopHeader.tsx) simples com breadcrumb e busca. | ❌ **Ausente no React** |
| **Módulo de Compras** | Módulo corporativo dedicado em `MOD.compras` com fluxos de entregas, fornecedores e relatórios de NF-e. | Inexistente. O React possui apenas Estoque, Vendas, Clientes e Saída manual. | ❌ **Ausente no React** |
| **Sidebar de Módulos Retrátil** | Sidebar `.mods` (178px) com toggle `#modtog` que colapsa para `.mods.mini` (52px), ocultando labels e mantendo ícones. | [AppSidebar.tsx](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/layout/AppSidebar.tsx) possui largura fixa de 256px (`w-64`), sem modo colapsável ou toggle. | ❌ **Ausente no React** |
| **Controle Global de Período** | Aba `Período de Análise` na Ribbon com botão dinâmico circular e exibição das datas reais formatadas ("08/10/2026 à 14/10/2026"). | Período restrito localmente à [SaidaManualView.tsx](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/gestao/saida/SaidaManualView.tsx), sem intervalo calculado visível. | ⚠️ **Divergência / Parcial** |
| **Aba de Favoritos na Ribbon** | Aba fixa com atalhos imediatos: `Adicionar entrada`, `Retirar para produção`, `Novo pedido`, `Pedidos a entregar`. | Inexistente no cabeçalho. As ações ficam confinadas dentro do início ou das views específicas. | ❌ **Ausente no React** |
| **Pré-seleção em Novo Cadastro** | `novoCadastro(tp)` aceita o tipo como argumento (`'Fornecedor'`, `'Cliente'`) e pré-seleciona no `<select>`. | [ClientCreateDrawer.tsx](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/gestao/clientes/ClientCreateDrawer.tsx) reseta sempre para `'CLIENTE'` fixo; não recebe `tipoInicial`. | ❌ **Ausente no React** |
| **Filtro Direto de Clientes via Navegação** | Comando `fc:Fornecedor` ou `fc:Cliente` navega e aplica o filtro de contatos de forma sincronizada. | [ClientesView.tsx](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/gestao/clientes/ClientesView.tsx) gerencia filtro apenas em estado local, sem receber parâmetro externo. | ⚠️ **Divergência** |
| **Exportação CSV Direta da Ribbon** | Comando `rb('csv')` acessível na aba de Movimentação do Estoque, disparando o download de qualquer tela. | O download de CSV exige abrir a tela [SaidaManualView.tsx](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/gestao/saida/SaidaManualView.tsx) e clicar no botão interno. | ⚠️ **Divergência** |
| **Atalho da Logo para Início** | Botão quadrado `.logo2` ("A") no topo esquerdo da Ribbon com tooltip "Início", levando à tela inicial. | Logo estática posicionada apenas na barra lateral esquerda. | ⚠️ **Divergência Visual** |
| **Trilha Tricolor no Header** | Borda inferior da Ribbon com gradiente tricolor contínuo (`--sky` 55%, `--red` 78%, `--yellow` 100%). | Faixa tricolor existe apenas no cabeçalho da sidebar lateral, não na área superior. | ⚠️ **Divergência Visual** |
| **Mapeamento de Módulo Contextual** | Função `modDe(view)` infere se `saida`/`clientes` pertencem a Compras, Estoque ou Vendas. | Telas são independentes e mapeadas apenas por chave fixa de rota/view. | ❌ **Ausente no React** |
| **Módulo de Vendas e Baixa Automática** | Status progressivo `Pendente` → `Separado` → `Entregue` com verificação de saldo e baixa automática. | Implementado no [VendasView.tsx](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/gestao/vendas/VendasView.tsx) e [OrderCreateDrawer.tsx](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/gestao/vendas/OrderCreateDrawer.tsx). | ✅ **Equivalente** |
| **Módulo de Clientes e Parceiros** | Filtros por tipo, listagem completa e cadastro em drawer com validação. | Implementado no [ClientesView.tsx](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/gestao/clientes/ClientesView.tsx) e [ClientCreateDrawer.tsx](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/gestao/clientes/ClientCreateDrawer.tsx). | ✅ **Equivalente** |
| **Saída Manual e Relatório de Período** | Formulário de lançamento avulso, balanço entrou/saiu, extrato e download de CSV. | Implementado no [SaidaManualView.tsx](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/gestao/saida/SaidaManualView.tsx) e [exportCsv.ts](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/gestao/saida/exportCsv.ts). | ✅ **Equivalente** |
| **Tela Início: Ações Rápidas e Atenção** | Ações rápidas superiores e painel "Precisa de atenção" com pedidos atrasados e ranking crítico. | Implementado no [InicioDashboardView.tsx](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/dashboard/inicio/InicioDashboardView.tsx) e [AttentionPanel.tsx](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/dashboard/inicio/AttentionPanel.tsx). | ✅ **Equivalente** |
| **Drawers Operacionais de Entrada/Saída** | Modais de Entrada (com NF-e, Fornecedor, Lote, CA) e Retirada (com validação impeditiva de saldo). | Implementado no [MovementFormDrawer.tsx](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/dashboard/drawers/MovementFormDrawer.tsx) e [QuickItemPickerDrawer.tsx](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/dashboard/drawers/QuickItemPickerDrawer.tsx). | ✅ **Equivalente** |
| **Cadastro de Novos Itens de Estoque** | Drawer contextual com atributos específicos por categoria (MP, IMP, Motos). | Implementado no [ItemCreateDrawer.tsx](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/dashboard/drawers/ItemCreateDrawer.tsx). | ✅ **Equivalente** |
| **Busca Global Unificada** | Pesquisa híbrida de itens, pedidos, notas fiscais e parceiros com atalhos (`/`, `Ctrl+K`). | Implementado no [GlobalSearchInput.tsx](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/layout/GlobalSearchInput.tsx). | ✅ **Equivalente** |

---

## 3. Detalhamento Técnico das Divergências e Funções Ausentes

### 3.1. Arquitetura da Ribbon Bar (`.rib` e `#ribbon`)
No arquivo [almoxarifado5.html:L116-130](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/Front%20end%20Almoxarifado/almoxarifado5.html#L116-L130) e [L377-392](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/Front%20end%20Almoxarifado/almoxarifado5.html#L377-L392):

#### Como funciona no protótipo:
- O topo da tela é ocupado por uma faixa estruturada em duas camadas:
  1. **Linha de Abas (`.tabs`)**:
     - Botão logotipo `.logo2` ("A") que navega para `inicio`.
     - Abas superiores dinâmicas: `Período de Análise`, `Favoritos` e as abas do módulo ativo (`M.abas.map(x => x[0])`).
     - Campo de busca global integrado (`.gs`) ocupando a lateral direita.
     - Botão de alternância de tema Claro/Escuro (`#theme`).
  2. **Faixa de Comandos (`.ribbon`)**:
     - Altura fixa/mínima de 96px com overflow horizontal suave.
     - Grupos funcionais divididos por linha vertical (`.grp2`): `Consulta`, `Cadastro`, `Registrar`, `Relatórios`, `Entregas`, `Pedidos`, `Entidades`.
     - Botões da Ribbon (`.rb`): Possuem formato de cartão vertical de 88px, com ícones SVG de 30x30px destacados na cor de destaque (`var(--sky)`), rótulo em 2 linhas abaixo e estado hover destacado.
- O objeto `MOD` define a hierarquia de comandos de cada módulo:
```javascript
const MOD = {
  estoque: {
    n: 'Estoque', i: 'mp', abas: [
      ['Materiais', [
        ['Consulta', [['v:mp','Matéria-prima','mp'], ['v:imp','Materiais improdutivos','imp'], ['v:motos','Peças de motos','motos']]],
        ['Cadastro', [['novoitem:mp','Nova matéria-prima','novo'], ['novoitem:imp','Novo improdutivo','novo'], ['novoitem:motos','Nova peça de moto','novo']]]
      ]],
      ['Movimentação', [
        ['Registrar', [['pick:Entrada','Adicionar entrada','entrada'], ['pick:Saída','Retirar para produção','retirada'], ['v:saida','Saída manual','saida']]],
        ['Relatórios', [['v:saida','Entradas e saídas','rel'], ['csv','Baixar CSV','rel']]]
      ]]
    ]
  },
  compras: {
    n: 'Compras', i: 'entrada', abas: [
      ['Recebimentos', [
        ['Entregas', [['pick:Entrada','Receber material','entrada'], ['fc:Fornecedor','Fornecedores','clientes'], ['novocad:Fornecedor','Novo fornecedor','novo']]],
        ['Relatórios', [['v:saida','Entradas por NF-e','rel']]]
      ]]
    ]
  },
  vendas: {
    n: 'Vendas', i: 'vendas', abas: [
      ['Pedidos', [
        ['Pedidos', [['v:vendas','Pedidos a entregar','vendas'], ['novopedido','Novo pedido','novo']]]
      ]],
      ['Cadastros', [
        ['Entidades', [['fc:todos','Todos os cadastros','clientes'], ['fc:Cliente','Clientes','clientes'], ['novocad:Cliente','Novo cadastro','novo']]]
      ]]
    ]
  }
};
```

#### No Frontend React:
- O [AppTopHeader.tsx](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/layout/AppTopHeader.tsx) implementa apenas um cabeçalho fino convencional (altura ~56px) contendo breadcrumbs à esquerda, o componente [GlobalSearchInput.tsx](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/layout/GlobalSearchInput.tsx) e o [ThemeToggle.tsx](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/layout/ThemeToggle.tsx).
- Toda a lógica de agrupamento em Ribbon inexiste no React.

---

### 3.2. Sidebar Retrátil de Módulos (`#mods` e `#modtog`)
No arquivo [almoxarifado5.html:L131-139](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/Front%20end%20Almoxarifado/almoxarifado5.html#L131-L139) e [L387-389](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/Front%20end%20Almoxarifado/almoxarifado5.html#L387-L389):

#### Como funciona no protótipo:
- A barra lateral não tem mais 256px de largura fixa. Ela possui **178px** no modo normal e **52px** no modo mini (`.mods.mini`).
- Possui cabeçalho com botão de recolhimento:
  `<div class="mh"><span>Módulos</span><button id="modtog" title="Recolher ou expandir">‹</button></div>`
- Ao clicar no botão, dispara `$('#mods').classList.toggle('mini')`:
  - No modo mini, as classes `.ml` (rótulo textual), `.mh span` (título "Módulos") e `.badge` recebem `display: none`.
  - A barra fica extremamente compacta, exibindo apenas os ícones alinhados centralmente.
- Cada botão de módulo exibe badge de notificação crítica:
  - Módulo Estoque: exibe badge vermelha com a quantidade de itens em nível crítico.
  - Módulo Vendas: exibe badge vermelha com a quantidade de pedidos atrasados.

#### No Frontend React:
- O componente [AppSidebar.tsx](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/layout/AppSidebar.tsx) possui largura estática de `md:w-64` (256px) e não dispõe de funcionalidade de minimizar/recolher para modo ícone.

---

### 3.3. Módulo Corporativo de Compras
No arquivo [almoxarifado5.html:L352-353](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/Front%20end%20Almoxarifado/almoxarifado5.html#L352-L353) e [L361-364](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/Front%20end%20Almoxarifado/almoxarifado5.html#L361-L364):

#### Como funciona no protótipo:
- O módulo de Compras é selecionável diretamente na barra lateral (`data-mod="compras"`).
- Ao ativar Compras:
  - A visualização primária carrega `view = 'saida'`, focada em recebimento e entradas por NF-e.
  - A Ribbon exibe a aba `Recebimentos` com ações diretas:
    - `Receber material`: chama `escolher('Entrada')`, abrindo a gaveta de busca rápida de item para dar entrada.
    - `Fornecedores`: chama `fc = 'Fornecedor'; ir('clientes')`, levando à tela de contatos filtrada para fornecedores.
    - `Novo fornecedor`: chama `novoCadastro('Fornecedor')`, abrindo o formulário já pré-marcado.
    - `Entradas por NF-e`: navega para o extrato de movimentações.
- A função `modDe(v)` gerencia a procedência:
```javascript
const modDe = v => ({
  mp: 'estoque', imp: 'estoque', motos: 'estoque', vendas: 'vendas', inicio: null,
  saida: mod === 'compras' ? 'compras' : 'estoque',
  clientes: mod === 'compras' ? 'compras' : 'vendas'
})[v];
```

#### No Frontend React:
- O tipo `TelaOuAba` em [mock-almoxarifado.ts](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/data/mock-almoxarifado.ts#L6) aceita apenas `'inicio' | 'mp' | 'imp' | 'motos' | 'vendas' | 'clientes' | 'saida'`.
- Não existe conceito de módulo "Compras" nem agrupamento de fornecedores e recebimentos sob este domínio.

---

### 3.4. Controle Global de Período e Cálculo Textual de Datas
No arquivo [almoxarifado5.html:L358-360](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/Front%20end%20Almoxarifado/almoxarifado5.html#L358-L360) e [L381-382](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/Front%20end%20Almoxarifado/almoxarifado5.html#L381-L382):

#### Como funciona no protótipo:
- O período `per` é uma variável de estado transversal à aplicação (`'Hoje' | 'Ontem' | '7 dias' | 'Tudo'`).
- A função `perTxt()` calcula e formata dinamicamente o intervalo com base na data do sistema:
```javascript
const perTxt = () => per === 'Tudo' ? 'todo o histórico'
  : per === 'Hoje' ? dBR(hoje())
  : per === 'Ontem' ? dBR(ontem())
  : dBR(diaAntes(6)) + ' à ' + dBR(hoje());
```
- Na aba `Período de Análise` da Ribbon, o botão exibe tanto o nome do período quanto o intervalo legível (ex: `Período: 7 dias <br> 08/10/2026 à 14/10/2026`).
- Clicar no botão cicla entre os 4 períodos e atualiza o estado global.

#### No Frontend React:
- O estado de período fica confinado dentro do hook `useMovimentacoesPeriodo` usado exclusivamente em [SaidaManualView.tsx](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/gestao/saida/SaidaManualView.tsx).
- O cabeçalho global não exibe nem permite alternar o período analítico.
- Não há cálculo e exibição do intervalo textual formatado ("DD/MM/AAAA à DD/MM/AAAA").

---

### 3.5. Pré-Seleção de Tipo no Cadastro de Contatos (`novoCadastro(tp)`)
No arquivo [almoxarifado5.html:L451-454](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/Front%20end%20Almoxarifado/almoxarifado5.html#L451-L454):

#### Como funciona no protótipo:
- A assinatura da função de cadastro de cliente/fornecedor aceita um parâmetro opcional de tipo:
```javascript
function novoCadastro(tp) {
  $('#drawer').innerHTML = `...
    <label>Tipo
      <select name="tipo">
        ${TIPOS.map(t => `<option${t === tp ? ' selected' : ''}>${t}</option>`).join('')}
      </select>
    </label>...`;
}
```
- Isso permite que o botão "Novo fornecedor" de Compras ou "Novo cadastro" de Vendas abra o modal já configurado adequadamente para o operador.

#### No Frontend React:
- O componente [ClientCreateDrawer.tsx](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/gestao/clientes/ClientCreateDrawer.tsx#L25-L33) define:
```typescript
export interface ClientCreateDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onClientCreated?: () => void;
}
```
- E no `useEffect` reseta rigidamente com `setTipo('CLIENTE')`. Não suporta receber uma prop `tipoInicial?: TipoParceiro`.

---

### 3.6. Ações Parametrizadas da Ribbon (`rb(a)`)
No arquivo [almoxarifado5.html:L365-375](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/Front%20end%20Almoxarifado/almoxarifado5.html#L365-L375):

#### Como funciona no protótipo:
- O despachante `rb(a)` processa comandos com prefixos:
  - `v:mp`, `v:imp`, `v:motos`, `v:vendas`, `v:saida`: navegação simples para a view.
  - `novoitem:aba`: navega para a aba de estoque e já abre o drawer de cadastro do item daquela aba (`ir(v); novo(v)`).
  - `pick:Tipo`: abre imediatamente a seleção de item para `Entrada` ou `Saída`.
  - `novopedido`: abre a gaveta de criação de pedido.
  - `novocad:Tipo`: abre a gaveta de contato com o tipo pré-selecionado.
  - `csv`: navega para a tela de saída e dispara o download do CSV (`baixarCSV()`).
  - `fc:Tipo`: define o filtro de parceiros e navega para clientes.
  - `per`: avança o período temporal.

#### No Frontend React:
- As navegações no React são baseadas em chamadas simples `onSelectTela(tela)`.
- Não existe despachante centralizado de ações parametrizadas entre a barra superior e as gavetas modais operacionais.

---

## 4. Comparativo de Funções JavaScript vs Componentes/Hooks React

| Função em `almoxarifado5.html` | Responsabilidade | Equivalente no React | Divergência Técnica |
| :--- | :--- | :--- | :--- |
| `modulo(k)` | Troca o módulo corporativo (`estoque`, `compras`, `vendas`), ajustando a aba ativa da Ribbon e a view inicial. | Inexistente. | O React possui apenas navegação direta por tela em `handleSelectTela(novaTela)` no [page.tsx](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/app/page.tsx). |
| `rb(a)` | Interpretador e executor de ações disparadas pelos botões da Ribbon (`data-rb`). | Inexistente. | As ações no React são disparadas por handlers pontuais em cada componente. |
| `perTxt()` | Formata o texto descritivo e intervalo de datas do período de análise. | Inexistente. | No React há apenas o array `PERIODOS = ['Hoje', 'Ontem', '7 dias', 'Tudo']` sem formatação do intervalo real. |
| `modDe(v)` | Identifica o módulo pai correspondente a uma view específica. | Inexistente. | No React não há hierarquia de módulos acima das telas. |
| `novoCadastro(tp)` | Abre o modal de cadastro de parceiro com o tipo pré-selecionado (`Cliente`, `Fornecedor`). | [ClientCreateDrawer.tsx](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/gestao/clientes/ClientCreateDrawer.tsx) | Não aceita parâmetro de tipo inicial; define sempre `'CLIENTE'`. |
| `baixarCSV()` | Monta o arquivo CSV a partir do filtro global e aciona o download via Blob. | [exportCsv.ts](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/gestao/saida/exportCsv.ts) | O utilitário existe no React, mas só pode ser invocado internamente por [SaidaManualView.tsx](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/gestao/saida/SaidaManualView.tsx). |
| `escolher(tipo)` | Abre gaveta com input `#pk` para buscar e selecionar item para entrada ou saída. | [QuickItemPickerDrawer.tsx](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/dashboard/drawers/QuickItemPickerDrawer.tsx) | Totalmente equivalente. |
| `formMov(id, tipo)` | Abre gaveta com formulário técnico de entrada ou retirada para um item específico. | [MovementFormDrawer.tsx](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/dashboard/drawers/MovementFormDrawer.tsx) | Totalmente equivalente. |
| `novo(aba)` | Abre gaveta de cadastro de novo item com campos específicos da categoria. | [ItemCreateDrawer.tsx](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/dashboard/drawers/ItemCreateDrawer.tsx) | Totalmente equivalente. |
| `novoPedido()` | Abre gaveta com cliente, prazo e itens dinâmicos do pedido. | [OrderCreateDrawer.tsx](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/gestao/vendas/OrderCreateDrawer.tsx) | Totalmente equivalente. |
| `avancar(id)` | Altera status do pedido (`Pendente` → `Separado` → `Entregue`), valida estoque e realiza baixa automática. | `handleAvancarStatus` em [VendasView.tsx](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/gestao/vendas/VendasView.tsx) | Totalmente equivalente. |
| `gsRender(v)` | Renderiza dropdown com resultados agrupados da busca global (`/` ou `Ctrl+K`). | [GlobalSearchInput.tsx](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/layout/GlobalSearchInput.tsx) | Totalmente equivalente. |
| `abrir(id)` | Abre gaveta de detalhes do produto, histórico e ficha técnica. | [ItemDetailsDrawer.tsx](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/dashboard/ItemDetailsDrawer.tsx) | Totalmente equivalente. |

---

## 5. Recomendações de Evolução para o Frontend React

Para atingir **paridade total com o protótipo `almoxarifado5.html`**, recomenda-se o seguinte plano de implementação:

### Passo 1: Criação do Componente `AppRibbonHeader` (ou evolução do `AppTopHeader`)
- Implementar a Faixa de Opções (Ribbon Menu) com:
  - Abas superiores: `Período de Análise`, `Favoritos` e abas contextuais do módulo atual (`Materiais`, `Movimentação`, `Recebimentos`, `Pedidos`, `Cadastros`).
  - Painel da Ribbon com grupos verticais (`.grp2`) e botões com ícones SVG 30px e texto descritivo.
  - Faixa decorativa tricolor na borda inferior da Ribbon (`linear-gradient(90deg, #4fa8e0 55%, #d9372f 78%, #f2b705 100%)`).
  - Seletor do período global com exibição do intervalo formatado de datas (`perTxt`).

### Passo 2: Evolução do `AppSidebar` com Suporte ao Modo Mini e Módulos
- Adicionar o botão de alternância de recolhimento (`#modtog`).
- Suportar estado colapsado (largura reduzida para ~56px), ocultando labels e exibindo ícones centralizados com tooltips.
- Incorporar o Módulo de **Compras** na estrutura de navegação lateral.

### Passo 3: Parametrização do `ClientCreateDrawer`
- Adicionar a prop opcional `tipoInicial?: TipoParceiro` na interface [ClientCreateDrawerProps](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/gestao/clientes/ClientCreateDrawer.tsx#L12).
- Garantir que, ao abrir, caso `tipoInicial` seja informado, o formulário inicialize selecionando esse valor (permitindo cadastrar Fornecedor ou Cliente diretamente).

### Passo 4: Sincronização do Filtro de Parceiros em `ClientesView`
- Permitir que [ClientesView.tsx](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/gestao/clientes/ClientesView.tsx) receba uma prop `filtroInicial?: TipoParceiro | 'TODOS'`, sincronizando quando a navegação vier da Ribbon ou de Compras.
