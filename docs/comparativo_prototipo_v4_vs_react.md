# Relatório Comparativo: Protótipo (`almoxarifado4.html`) vs Frontend React

Este documento apresenta uma análise detalhada das funcionalidades, fluxos operacionais, telas e componentes presentes no arquivo de protótipo [almoxarifado4.html](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/Front%20end%20Almoxarifado/almoxarifado4.html) em comparação com a implementação atual da aplicação em React / Next.js ([src/web](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web)).

---

## 1. Visão Geral Comparativa

| Módulo / Funcionalidade | Protótipo (`almoxarifado4.html`) | Frontend React (`src/web`) | Situação |
| :--- | :--- | :--- | :--- |
| **Topbar & Busca Global** | Header sticky com breadcrumb, input global com atalhos (`/`, `Ctrl+K`) e dropdown de busca híbrida (itens, NF-e, clientes, pedidos). | Inexistente. | ❌ **Ausente** |
| **Tela Início: Ações Rápidas** | 4 botões de ação imediata: `Registrar entrada`, `Registrar saída`, `Novo pedido`, `Novo cadastro`. | Inexistente no [InicioDashboardView.tsx](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/dashboard/inicio/InicioDashboardView.tsx). | ❌ **Ausente** |
| **Tela Início: "Precisa de Atenção"** | Painel com alerta de pedidos atrasados + ranking dos itens mais críticos/baixos com botão direto `+ Entrada` e abertura de detalhes. | Inexistente. O início exibe apenas métricas e cards de navegação. | ❌ **Ausente** |
| **Tela Início: Ícones temáticos nos cards** | SVGs temáticos para Matéria-prima, Improdutivos, Motos, Vendas, Clientes e Saída manual. | Cards sem ícones no [SummaryNavCard.tsx](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/dashboard/inicio/SummaryNavCard.tsx). | ⚠️ **Divergência Visual** |
| **Abas de Estoque: Cadastro de Item** | Botão `[Nova matéria-prima]`, `[Novo material improdutivo]` ou `[Nova peça de moto]` com drawer de cadastro completo e atributos por categoria. | Não há botão nem formulário/drawer de cadastro de novo produto. | ❌ **Ausente** |
| **Abas de Estoque: Ações na Tabela** | Botões por linha: `+ Entrada` (abre entrada) e `Retirar` (abre saída). | Botões `Detalhes` e `Baixa`, mas ambos apenas abrem o drawer de detalhes sem formulário de movimentação. | ❌ **Ausente** |
| **Abas de Estoque: Contadores nos Chips** | Chips de filtro indicam contagem em tempo real: `Todos (18)`, `Normal (9)`, `Abaixo do mínimo (6)`, `Crítico (3)`. | Chips de texto simples sem contadores no [StockFilterToolbar.tsx](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/dashboard/StockFilterToolbar.tsx). | ⚠️ **Parcial** |
| **Item Details Drawer: Ações de Movimento** | Botões de ação rápida no drawer: `[Adicionar entrada]` e `[Retirar para produção]`. | O [ItemDetailsDrawer.tsx](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/dashboard/ItemDetailsDrawer.tsx) é puramente visualizador (somente leitura). | ❌ **Ausente** |
| **Formulário de Entrada de Material** | Drawer com data, quantidade, campos técnicos (`NF-e`, `Fornecedor`, `Lote`, `CA`), validação de NF-e duplicada e observações. | Inexistente no frontend React. | ❌ **Ausente** |
| **Formulário de Retirada / Saída** | Drawer com data, quantidade, responsável/setor, observação e validação impeditiva de saldo insuficiente. | Inexistente no frontend React. | ❌ **Ausente** |
| **Drawer de Seleção Rápida de Produto** | Modal com busca em tempo real (`#pk`) para selecionar produto e direcionar para formulário de Entrada ou Saída. | Inexistente no frontend React. | ❌ **Ausente** |
| **Módulo de Vendas** | Tela completa com KPIs de pedidos, tabela de pedidos, status progressivo (`Pendente` → `Separado` → `Entregue`), baixa automática e modal de novo pedido. | Apenas tela placeholder com loader ("Módulo de vendas"). | ❌ **Ausente** |
| **Módulo de Clientes** | Tela completa com filtros por tipo (`Cliente`, `Fornecedor`, `Transportadora`, `Outro`), tabela com dados de contato e modal de novo cadastro. | Apenas tela placeholder com loader ("Módulo de clientes"). | ❌ **Ausente** |
| **Módulo de Saída Manual & Relatórios** | Tela com formulário avulso de movimentação, relatório consolidado por período (`Hoje`, `Ontem`, `7 dias`, `Tudo`), extrato e exportação CSV. | Apenas tela placeholder com loader ("Módulo de saida"). | ❌ **Ausente** |
| **Notificações Toast Flutuantes** | Toast animado na base da tela confirmando operações ("Item cadastrado", "Movimentação registrada", etc.). | Inexistente. | ❌ **Ausente** |
| **Atalhos de Teclado Globais** | Tecla `/` ou `Ctrl+K` para busca global, `Enter` na tabela para abrir item, `Escape` fecha drawers/busca. | Apenas `Escape` no drawer de detalhes está implementado. | ⚠️ **Parcial** |

---

## 2. Detalhamento das Funcionalidades Faltantes

### 2.1. Topbar Global (Header Superior) e Busca Unificada
No protótipo ([almoxarifado4.html:L96-102](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/Front%20end%20Almoxarifado/almoxarifado4.html#L96-L102) e [L297-307](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/Front%20end%20Almoxarifado/almoxarifado4.html#L297-L307)):
- **Breadcrumbs Operacionais**: Exibição da trilha atual: `Início › Estoque › Matéria-prima` ou `Início › Gestão › Vendas`, com links clicáveis para navegação rápida de volta ao início.
- **Barra de Busca Global Multifuncional (`#gs`)**:
  - Input fixo no topo com atalho exibido: `Buscar item, cliente, pedido ou NF-e ( / )`.
  - Disparo de atalho via teclado: Pressionar `/` em qualquer lugar da tela (fora de inputs) ou `Ctrl + K` / `Cmd + K` foca o campo instantaneamente.
  - Caixa de resultados categorizados em tempo real (`#gsr`):
    - **Itens de estoque**: Exibe nome, categoria, código e saldo atual. Ao clicar, navega até a aba correspondente e abre imediatamente o Drawer do item.
    - **Notas Fiscais (NF-e)**: Localiza movimentações vinculadas a notas fiscais pelo número, exibindo item, responsável, data/hora e quantidade. Ao clicar, direciona para o item.
    - **Clientes e Parceiros**: Busca por razão social, CNPJ/CPF ou nome de contato. Ao clicar, navega para a tela de Clientes.
    - **Pedidos de Venda**: Busca por número do pedido (`#101`) ou nome do cliente. Ao clicar, navega para a tela de Vendas.
  - No React: Não há Topbar; o layout divide a tela diretamente entre a barra lateral [AppSidebar.tsx](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/layout/AppSidebar.tsx) e a área central [page.tsx](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/app/page.tsx).

---

### 2.2. Tela Inicial: Ações Rápidas e Painel "Precisa de Atenção"
No protótipo ([almoxarifado4.html:L263-278](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/Front%20end%20Almoxarifado/almoxarifado4.html#L263-L278)):
- **Barra de Ações Rápidas (`.quick`)**:
  1. `[Registrar entrada]`: Abre o picker/seletor de item para lançar entrada.
  2. `[Registrar saída]`: Abre o picker/seletor de item para lançar saída de material.
  3. `[Novo pedido]`: Abre o drawer com o formulário de pedido de venda.
  4. `[Novo cadastro]`: Abre o drawer com o formulário de novo contato/cliente/fornecedor.
- **Painel Central "Precisa de atenção" (`.panel`)**:
  - Bloco de alertas com prioridade máxima:
    - Se houver pedidos atrasados: Exibe `X pedidos atrasados` com botão `[Ver pedidos]` para ir direto à tela de Vendas.
    - Lista dos itens em situação crítica ou baixa mais urgentes (ordenados pela proporção `estoqueAtual / estoqueSeguranca`), contendo:
      - Nome do item, aba de origem, quantidade atual e quantidade mínima.
      - Tag colorida de situação (`Crítico` ou `Abaixo do mínimo`).
      - Botão rápido `[+ Entrada]` para abrir o formulário de entrada do item diretamente da tela inicial.
      - Clique no nome do item para abrir sua ficha técnica completa.
- No React: [InicioDashboardView.tsx](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/dashboard/inicio/InicioDashboardView.tsx) implementa apenas os cards numéricos de navegação para as abas, sem as ações rápidas e sem o painel operacional de atenção imediata.

---

### 2.3. Abas de Estoque: Cadastro de Novos Produtos e Ações na Linha
No protótipo ([almoxarifado4.html:L229-244](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/Front%20end%20Almoxarifado/almoxarifado4.html#L229-L244) e [L483-519](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/Front%20end%20Almoxarifado/almoxarifado4.html#L483-L519)):
- **Botão de Criação no Cabeçalho**:
  - Conforme a aba ativa, exibe o botão com rótulo específico: `[Nova matéria-prima]`, `[Novo material improdutivo]` ou `[Nova peça de moto]`.
- **Drawer de Cadastro (`novo(aba)`)**:
  - Dados cadastrais padrão: Nome do item, Código/SKU, Categoria, Unidade de medida (un, kg, m, etc.), Quantidade inicial, Estoque mínimo e Capacidade máxima.
  - Validações: Unicidade do código/SKU (impede cadastro duplicado), obrigatoriedade de campos e validação de números válidos.
  - Campos técnicos contextuais dinâmicos conforme a classificação do material:
    - *Matéria-prima*: Lote, Certificado, NF-e, Fornecedor.
    - *Materiais improdutivos*: Lote, Certificado de Aprovação (CA), NF-e, Fornecedor.
    - *Peças de moto*: Modelo compatível, Marca, Código original, Medida.
- **Ações Rápidas nas Linhas da Tabela (`StockTable`)**:
  - Cada item possui na última coluna os botões:
    - `[+ Entrada]`: Dispara o drawer de entrada de material para aquele produto.
    - `[Retirar]`: Dispara o drawer de retirada/saída para aquele produto.
- **Contadores em Tempo Real nos Chips de Filtro**:
  - Os chips de situação (`Todos`, `Normal`, `Abaixo do mínimo`, `Crítico`) exibem pequenos contadores numéricos integrados (ex: `Normal 9`, `Crítico 3`).
- No React: [StockTable.tsx](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/dashboard/StockTable.tsx) possui apenas botões "Detalhes" e "Baixa", mas "Baixa" apenas abre o drawer de leitura. Não existe botão nem formulário de cadastro de novo item no frontend.

---

### 2.4. Drawer de Detalhes do Item: Formulários Operacionais de Entrada e Saída
No protótipo ([almoxarifado4.html:L436-461](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/Front%20end%20Almoxarifado/almoxarifado4.html#L436-L461) e [L469-480](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/Front%20end%20Almoxarifado/almoxarifado4.html#L469-L480)):
- **Botões de Ação no Drawer**:
  - Ao visualizar qualquer item, existem botões destacados para `[Adicionar entrada]` e `[Retirar para produção]`.
- **Formulário de Entrada (`formMov(id, 'Entrada')`)**:
  - Data de chegada (padrão hoje, bloqueia datas futuras).
  - Quantidade a acrescentar.
  - Atributos fiscais e técnicos da remessa:
    - Campo `NF-e` com validação de duplicidade: impede lançar a mesma NF-e mais de uma vez para o mesmo produto.
    - Campo `Fornecedor` (pré-preenchido com fornecedor anterior caso já cadastrado).
    - Campo `Lote` e `Certificado` / `CA` conforme o tipo do item.
  - Observações gerais.
  - Efeito: Incrementa o saldo, gera registro no histórico do item com as especificações da nota e atualiza a ficha técnica do item.
- **Formulário de Retirada (`formMov(id, 'Saída')`)**:
  - Data da retirada (padrão hoje, bloqueia datas futuras).
  - Quantidade a debitar.
  - Campo "Retirado por / setor" (padrão preenchido como "Produção").
  - Observação da retirada.
  - Validação estrita de saldo: Bloqueia retiradas com quantidade superior ao estoque atual com mensagem explicativa (`Estoque insuficiente: há X unidades`).
  - Efeito: Decrementa o saldo e registra a saída no histórico.
- No React: [ItemDetailsDrawer.tsx](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/dashboard/ItemDetailsDrawer.tsx) exibe os dados cadastrais, a barra de nível e o histórico de movimentações, mas não tem botões nem telas para registrar novas entradas ou saídas.

---

### 2.5. Drawer Seletor de Item para Movimentação Rápida (`escolher(tipo)`)
No protótipo ([almoxarifado4.html:L308-315](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/Front%20end%20Almoxarifado/almoxarifado4.html#L308-L315)):
- Disparado ao clicar em "Registrar entrada" ou "Registrar saída" a partir da tela inicial.
- Abre um drawer com:
  - Título adaptado ("Registrar entrada" ou "Registrar saída").
  - Campo de pesquisa rápida em tempo real (`#pk`) que busca por nome, código SKU, lote ou categoria.
  - Lista de resultados dinâmicos exibindo nome do produto, código, aba e saldo atual.
  - Ao selecionar um produto da lista, a interface transiciona diretamente para o formulário de movimentação correspondente (`formMov`).
- No React: Inexistente.

---

### 2.6. Módulo Completo de Gestão: Vendas e Pedidos (`telaVendas`)
No protótipo ([almoxarifado4.html:L327-372](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/Front%20end%20Almoxarifado/almoxarifado4.html#L327-L372)):
- **Métricas do Cabeçalho**:
  - Pedidos a entregar (total em aberto).
  - Pedidos atrasados (prazo < data atual).
  - Pedidos sem estoque suficiente (verifica se a quantidade pedida supera o saldo atual de qualquer item).
- **Tabela de Pedidos**:
  - Colunas: Pedido (`#ID`), Cliente, Lista de Itens (quantidade, unidade e nome de cada material), Prazo de entrega (DD/MM/AAAA) e Situação.
  - Tags de status:
    - Status base: `Pendente` (azul), `Separado` (azul claro), `Entregue` (verde).
    - Badges contextuais: `Atrasado` (vermelho) e `Falta estoque` (amarelo).
- **Fluxo de Trabalho Operacional (Workflows)**:
  - Botão na linha de ação:
    - Se status for `Pendente`: Botão `[Marcar separado]`.
    - Se status for `Separado`: Botão `[Entregar]`.
  - Transição de status:
    - Clique em `Marcar separado`: Atualiza o pedido para `Separado`.
    - Clique em `Entregar`:
      - Valida o saldo de todos os itens do pedido.
      - Se faltar estoque em algum item, bloqueia a entrega e exibe alerta em destaque: `Estoque insuficiente de [item] para o pedido #[ID].`.
      - Se todos os itens tiverem saldo: debita automaticamente as quantidades de cada item no estoque, cria registros de movimentação do tipo "Saída" referenciando o pedido e cliente, marca o pedido como `Entregue` e exibe confirmação.
- **Drawer de Criação de Pedido (`novoPedido`)**:
  - Seleção do cliente a partir do catálogo de clientes.
  - Data limite de entrega.
  - Linhas dinâmicas de itens do pedido:
    - Dropdown de produto agrupado por abas (`Matéria-prima`, `Improdutivos`, `Peças de motos`) com indicação de saldo atual e unidade.
    - Campo numérico de quantidade.
    - Botão `[+ Adicionar item]` para incluir múltiplos itens no mesmo pedido.
  - Validações completas e gravação do pedido.
- No React: Em [page.tsx](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/app/page.tsx), selecionar "Vendas" renderiza apenas o placeholder estático `Módulo de vendas - Conectando ao banco de dados Firestore...`.

---

### 2.7. Módulo Completo de Gestão: Clientes e Parceiros (`telaClientes`)
No protótipo ([almoxarifado4.html:L375-402](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/Front%20end%20Almoxarifado/almoxarifado4.html#L375-L402)):
- **Filtros por Categoria de Contato**:
  - Chips de filtro rápido por tipo: `Todos`, `Cliente`, `Fornecedor`, `Transportadora` e `Outro`.
- **Tabela de Cadastros**:
  - Colunas: Razão Social / Nome, Tipo (badge azul), CNPJ / CPF, Nome do Contato, Telefone e Cidade.
- **Drawer de Cadastro (`novoCadastro`)**:
  - Campos do formulário:
    - Tipo (`Cliente`, `Fornecedor`, `Transportadora`, `Outro`).
    - Razão Social / Nome (obrigatório).
    - CNPJ ou CPF.
    - Nome do Contato.
    - Telefone de Contato.
    - Cidade.
  - Validação e gravação imediata com feedback em toast.
- No React: Em [page.tsx](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/app/page.tsx), selecionar "Clientes" renderiza apenas o placeholder estático `Módulo de clientes - Conectando ao banco de dados Firestore...`.

---

### 2.8. Módulo de Gestão: Saída Manual e Relatório Consolidado (`telaSaida`)
No protótipo ([almoxarifado4.html:L405-435](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/Front%20end%20Almoxarifado/almoxarifado4.html#L405-L435) e [L462-466](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/Front%20end%20Almoxarifado/almoxarifado4.html#L462-L466)):
- **Formulário Embutido de Registro Rápido**:
  - Seção integrada no topo da tela permitindo lançar movimentações diretamente:
    - Data (padrão hoje, limite máximo na data de hoje).
    - Tipo de Movimento (`Saída` ou `Entrada`).
    - Seleção de Produto (dropdown com itens agrupados e com saldo visível).
    - Quantidade.
    - "Retirado por / setor" (obrigatório).
    - Observação.
  - Validação de saldo ao registrar saída para evitar estoques negativos.
- **Relatório Sintético por Período**:
  - Campo de busca em tempo real (`#buscam`) por número de NF-e, lote, código, descrição do material ou responsável.
  - Chips de seleção de período: `Hoje`, `Ontem`, `7 dias` e `Tudo`.
  - Tabela sintética consolidada com cálculo de volume movimentado:
    - Colunas: Item (Nome, SKU, Classificação), Total que Entrou (`+X un` em verde), Total que Saiu (`−X un` em vermelho) e Saldo de Estoque Atual.
- **Extrato Analítico Cronológico**:
  - Lista de todas as movimentações do período selecionado contendo: Item, Data/Hora relativa e absoluta, Responsável e Setor, Observações, Metadados fiscais (Lote, NF-e) e Quantidade com sinal e unidade.
- **Exportação para Arquivo CSV (`baixarCSV`)**:
  - Botão no cabeçalho `[Baixar relatório (CSV)]`.
  - Geração e download imediato do arquivo `relatorio-movimentacoes.csv` formatado em UTF-8 com BOM (`\ufeff`) e separador `;` para compatibilidade total com o Microsoft Excel.
  - Colunas exportadas: Data, Hora, Movimento, Código, Item, Quantidade, Unidade, Responsável, NF-e, Lote e Observação.
- No React: Em [page.tsx](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/app/page.tsx), selecionar "Saída manual" renderiza apenas o placeholder estático `Módulo de saida - Conectando ao banco de dados Firestore...`.

---

### 2.9. Notificações Flutuantes (Sistema de Toast)
No protótipo ([almoxarifado4.html:L112-113](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/Front%20end%20Almoxarifado/almoxarifado4.html#L112-L113) e [L290](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/Front%20end%20Almoxarifado/almoxarifado4.html#L290)):
- Elemento `#toast` com animação vertical suave (`transform: translate(-50%, 0)`) e exibição de 3,2 segundos.
- Feedback fornecido para as seguintes ações:
  - "Item cadastrado: [Nome]"
  - "Entrada registrada: [Qtd] [Un] de [Nome]"
  - "Retirada registrada: [Qtd] [Un] de [Nome]"
  - "Pedido criado."
  - "Pedido #[ID] entregue e estoque atualizado."
  - "Cadastro salvo."
  - "Movimentação registrada."
- No React: Não há sistema de notificações ou toast implementado na aplicação web.

---

### 2.10. Interações de Teclado e Acessibilidade
No protótipo ([almoxarifado4.html:L548-552](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/Front%20end%20Almoxarifado/almoxarifado4.html#L548-L552)):
- Pressionar `/` foca na busca global.
- Pressionar `Ctrl + K` / `Cmd + K` foca na busca global.
- Pressionar `Escape` fecha qualquer modal/drawer aberto e fecha o dropdown de busca global.
- Pressionar `Enter` com foco em qualquer linha da tabela abre a gaveta de detalhes do item.
- No React: Apenas o fechamento por `Escape` está implementado no [ItemDetailsDrawer.tsx](file:///c:/Users/Eduardo/Desktop/exemplo/sistema_almoxarifado/src/web/components/dashboard/ItemDetailsDrawer.tsx).

---

## 3. Síntese dos Requisitos para Alinhamento Futuro

Para que o frontend React atinja paridade funcional completa com o protótipo `almoxarifado4.html`, os seguintes blocos precisarão ser construídos:

1. **Camada de Header / Topbar**:
   - Componente de Topbar com breadcrumbs dinâmicos.
   - Campo de Busca Global com atalho `/` e dropdown de pesquisa multi-entidade (produtos, NF-e, clientes, pedidos).
2. **Evolução da Tela Início**:
   - Barra de 4 Ações Rápidas (Entrada, Saída, Novo Pedido, Novo Cadastro).
   - Painel "Precisa de atenção" com pedidos atrasados e lista ordenada dos itens mais críticos com ação rápida de entrada.
3. **Módulo de Movimentações e Itens**:
   - Drawer de Cadastro de Novo Item com campos técnicos específicos por aba (MP, IMP, MOTOS).
   - Drawer de Entrada de Material com validação de NF-e duplicada.
   - Drawer de Retirada/Saída de Material com validação de estoque suficiente.
   - Drawer Seletor de Item para lançamento rápido (picker).
   - Inclusão dos botões de ação "+ Entrada" e "Retirar" nas linhas da tabela de estoque e no drawer de detalhes.
4. **Implementação das Telas de Gestão**:
   - **Vendas**: Listagem de pedidos, badges de atraso e falta de estoque, avanço de status (`Pendente` → `Separado` → `Entregue`), baixa automática e modal de novo pedido com itens múltiplos.
   - **Clientes**: Listagem de clientes/parceiros com filtro por tipo (Cliente, Fornecedor, etc.) e drawer de novo cadastro.
   - **Saída Manual**: Formulário avulso de movimentação, relatório consolidado por período (Hoje, Ontem, 7 dias, Tudo), extrato detalhado e exportador CSV.
5. **Utilitários Globais**:
   - Provedor / componente de Toast Notification para feedback de ações do usuário.
