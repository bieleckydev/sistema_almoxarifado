# Plano de Migração das Planilhas para o Banco de Dados

## 1. Objetivo

Este documento define a abordagem técnica e operacional para migrar os dados
legados das planilhas do almoxarifado para o banco de dados da aplicação,
preservando rastreabilidade, validação e possibilidade de reprocessamento
seguro.

A migração não será uma cópia direta de células. Ela será um processo de
**extração, normalização, validação, revisão e persistência**, usando os
schemas e as regras de negócio do Core Agnóstico como fonte de verdade.

O resultado esperado é permitir que o primeiro fluxo operacional do sistema
seja desenvolvido sobre dados reais, sem depender de mocks ou de regras
duplicadas no frontend.

## 2. Fontes de dados

As fontes iniciais estão em [`docs/excel/`](./excel/):

| Arquivo | Conteúdo principal | Tratamento inicial |
| --- | --- | --- |
| `Cont. de Estoque Disco Flap, Mat. de Solda e Brocas.xlsx` | Materiais improdutivos, consumíveis, colaboradores e saídas internas | Primeira candidata à migração |
| `CONTROLE_PEÇAS 2026_ALMOXARIFADO_ATUALIZADA.xlsx` | Peças acabadas, clientes/destinos e expedições | Segunda etapa |
| `ESTOQUE 2026.xlsx` | Matéria-prima produtiva, saldos e lançamentos diários em abas mensais | Terceira etapa, após definição da semântica das colunas diárias |

Os schemas de destino estão em [`src/core/domain/`](../src/core/domain/):

- [`item.schema.ts`](../src/core/domain/item.schema.ts): itens e saldos;
- [`colaborador.schema.ts`](../src/core/domain/colaborador.schema.ts):
  colaboradores e setores;
- [`movimentacao.schema.ts`](../src/core/domain/movimentacao.schema.ts):
  entradas, baixas, expedições e ajustes;
- [`inventario.schema.ts`](../src/core/domain/inventario.schema.ts):
  contagens e sessões de inventário.

## 3. Princípios da solução

### 3.1. O Core é a fonte de verdade

Todo registro importado deverá ser convertido para um modelo aceito pelos
schemas existentes. O importador não deve criar uma segunda versão das regras
de código, unidade, saldo ou movimentação.

Quando uma coluna da planilha não puder ser representada com segurança no
modelo atual, o registro deverá ser sinalizado para revisão. Não será permitido
descartar silenciosamente informação ou preencher um valor arbitrário.

### 3.2. Migração em etapas pequenas

A migração será executada por arquivo, entidade e lote. A primeira entrega
deverá contemplar apenas o catálogo de itens, colaboradores e saldo inicial da
planilha de materiais improdutivos. As demais fontes serão adicionadas depois
que o fluxo de validação estiver comprovado.

### 3.3. Modo de simulação obrigatório

O importador deverá oferecer `dry-run`, que executa leitura, normalização e
validação sem gravar no banco. O resultado deverá informar:

- quantidade de linhas lidas;
- quantidade de registros válidos;
- quantidade de registros rejeitados;
- quantidade de duplicidades;
- quantidade de avisos;
- quantidade de registros que seriam criados ou atualizados.

Nenhum lote será persistido antes da revisão do relatório do `dry-run`.

### 3.4. Reprocessamento seguro

Executar o mesmo lote duas vezes não poderá criar itens, colaboradores ou
movimentações duplicados. Cada registro deverá possuir uma chave determinística
de origem, formada pelo menos por:

```text
fonte + arquivo + aba + linha + tipo_de_registro
```

Essa chave deverá ser armazenada nos metadados de importação ou em uma coleção
de controle. Para movimentações, a chave também deverá considerar o código do
item, data, quantidade e demais campos que distinguem lançamentos quando a
linha representar mais de um evento.

### 3.5. Nenhuma correção automática sem evidência

Normalizações previsíveis, como remoção de espaços, padronização de caixa,
conversão de matrícula para três dígitos e conversão de separador decimal,
podem ser aplicadas automaticamente. Correções semânticas, como decidir se
uma coluna diária representa estoque ou movimentação, deverão gerar revisão
explícita.

## 4. Modelo de destino

### 4.1. Itens

Cada item importado será convertido para `Item`, validado pelo
`ItemSchema` e persistido através do repositório de estoque.

Mapeamento mínimo:

| Planilha | Entidade | Regra |
| --- | --- | --- |
| Código | `codigo` | Normalizar e validar o padrão `10-*`, `90-*` ou `100-*` |
| Descrição | `descricao` | Remover espaços externos; rejeitar descrição vazia |
| Categoria/origem | `tipo` | Mapear para `PRODUTIVO_MATERIA_PRIMA`, `IMPRODUTIVO_CONSUMIVEL` ou `ACABADO` |
| Unidade | `unidade` | Converter para uma unidade suportada; valores desconhecidos vão para revisão |
| Estoque mínimo | `estoqueSeguranca` | Normalizar número não negativo |
| Saldo atual | `estoqueAtual` | Usar somente quando a coluna for identificada como saldo confiável |
| Localização | `localizacaoFisica` | Preservar texto normalizado |
| Cliente/destino | `clienteDestino` | Aplicar apenas a itens acabados |

O identificador interno não será derivado apenas da posição da linha. O código
normalizado será a chave natural do item.

### 4.2. Colaboradores

Cada colaborador será convertido para `Colaborador` e validado pelo
`ColaboradorSchema`.

Mapeamento mínimo:

| Planilha | Entidade | Regra |
| --- | --- | --- |
| Matrícula/código | `matricula` | Remover caracteres não numéricos e preencher com zeros à esquerda |
| Nome | `nome` | Exigir pelo menos três caracteres |
| Setor | `setor` | Mapear para `SetorFabrilSchema`; valores desconhecidos exigem revisão |
| Função/cargo | `funcao` | Preservar texto normalizado |
| Status | `ativo` | Usar o status explícito; na ausência, assumir ativo somente com aviso |

A matrícula normalizada será a chave natural. Matrículas duplicadas com nomes
divergentes não serão mescladas automaticamente.

### 4.3. Saldos iniciais

O saldo inicial deve ser distinguido de uma movimentação histórica. Quando a
planilha fornecer somente uma fotografia do estoque, o importador criará o item
com seu saldo inicial e registrará a origem. Não será inventado um histórico de
entradas e saídas que não esteja presente na fonte.

Quando houver histórico suficiente para reconstruir o saldo, o saldo será
calculado pelas movimentações e comparado ao saldo informado na planilha:

```text
saldo_calculado = saldo_inicial + entradas - saídas + ajustes
```

Diferenças serão reportadas para revisão. O sistema não escolherá
automaticamente entre o saldo calculado e o saldo informado.

### 4.4. Movimentações

Linhas que representem eventos serão convertidas para `MovimentacaoSchema`.
Os tipos previstos são:

- `ENTRADA_COMPRA`;
- `ENTRADA_PRODUCAO`;
- `SAIDA_CONSUMO_INTERNO`;
- `SAIDA_EXPEDICAO`;
- `AJUSTE_INVENTARIO_POSITIVO`;
- `AJUSTE_INVENTARIO_NEGATIVO`.

Cada movimentação deverá preservar:

- data original e data normalizada;
- item e código original;
- quantidade e unidade;
- saldo anterior e resultante, quando disponíveis ou calculáveis;
- colaborador, setor, cliente ou fornecedor;
- número de NF e pedido, quando informados;
- observação e origem do registro.

Se não for possível obter `saldoAnterior` e `saldoResultante` com segurança, o
registro não será convertido silenciosamente em movimentação. Ele deverá ser
classificado como saldo histórico ou pendência de mapeamento.

### 4.5. Inventários mensais

As abas mensais de `ESTOQUE 2026.xlsx` serão tratadas como inventário ou
movimentação somente depois da análise da estrutura e de uma amostra validada.

A hipótese inicial é:

- valores de fechamento representam saldo de inventário;
- lançamentos datados representam movimentações;
- o fechamento de um mês deve ser comparável ao saldo inicial do mês seguinte.

Essa hipótese deverá ser confirmada por reconciliação de pelo menos dois meses
antes da migração completa do arquivo.

## 5. Pipeline de migração

O importador será organizado em seis etapas independentes.

### Etapa 1 — Descoberta e inventário da fonte

Antes de importar, será gerado um inventário estrutural de cada arquivo:

- nome das abas;
- quantidade de linhas e colunas;
- cabeçalhos identificados;
- células mescladas;
- fórmulas;
- colunas com datas, números e textos;
- linhas vazias e linhas de total;
- exemplos de valores distintos por coluna.

Essa etapa não grava dados e serve para confirmar o mapeamento antes da
implementação do adaptador de cada planilha.

### Etapa 2 — Extração

O leitor de planilhas produzirá registros intermediários com metadados de
origem. Cada registro deverá manter:

```ts
{
  arquivo: string;
  aba: string;
  linha: number;
  valoresOriginais: Record<string, unknown>;
}
```

O extrator não aplicará regras de negócio nem persistirá dados.

### Etapa 3 — Normalização

Serão aplicadas transformações determinísticas:

- remoção de espaços extras;
- padronização de maiúsculas e minúsculas quando aplicável;
- normalização de códigos e matrículas;
- conversão de datas do Excel para ISO 8601;
- conversão de números com vírgula decimal;
- conversão de quantidades para a unidade base;
- normalização de nomes de setores, unidades e tipos.

Cada transformação deverá ser registrada no relatório quando alterar o valor
original.

### Etapa 4 — Validação

Os registros normalizados serão validados pelos schemas Zod do domínio e por
regras adicionais de migração:

- unicidade de códigos e matrículas;
- consistência de tipo e prefixo do item;
- quantidade positiva em movimentações;
- ausência de saídas que gerem saldo negativo;
- compatibilidade entre unidade, fator de conversão e quantidade;
- referência existente para item e colaborador;
- datas dentro do período esperado;
- consistência entre saldo calculado e saldo informado.

Os erros deverão ser classificados como:

- **erro bloqueante**: impede a persistência do registro;
- **aviso revisável**: permite a simulação, mas requer decisão antes da carga;
- **informativo**: transformação ou divergência sem impacto impeditivo.

### Etapa 5 — Revisão do relatório

O relatório deverá ser emitido em formato legível e também em formato
estruturado para automação. Ele deverá permitir localizar a origem exata do
problema:

```text
arquivo, aba, linha, campo, valor_original, valor_normalizado,
classificacao, mensagem
```

O lote somente poderá avançar quando:

- não houver erros bloqueantes;
- os avisos tiverem uma decisão registrada;
- duplicidades tiverem sido resolvidas ou explicitamente ignoradas;
- a reconciliação de saldos estiver dentro do critério aprovado.

### Etapa 6 — Persistência

A persistência deverá ocorrer em lotes pequenos e transacionais quando
possível, respeitando a ordem:

1. metadados do lote de importação;
2. colaboradores;
3. itens;
4. saldos iniciais ou inventários;
5. movimentações;
6. resultado e métricas da importação.

Falhas deverão ser explícitas. O importador não deve marcar um lote como
concluído se apenas parte das entidades tiver sido persistida sem registrar o
estado parcial.

## 6. Fases de execução

### Fase 0 — Preparação da persistência

Antes do primeiro importador:

- implementar o adaptador Firestore para `IEstoqueRepository`;
- definir coleções, índices e regras de unicidade;
- definir a coleção de lotes e erros de importação;
- confirmar transações e comportamento de reprocessamento;
- criar dados de teste pequenos e controlados.

### Fase 1 — Catálogo de materiais improdutivos

Fonte: `Cont. de Estoque Disco Flap, Mat. de Solda e Brocas.xlsx`.

Escopo:

- itens `90-*`;
- estoque de segurança;
- unidade e embalagem;
- localização;
- colaboradores e setores;
- saldo inicial confiável.

Critério de conclusão: consultar no repositório os mesmos itens válidos da
planilha, sem duplicidades e com relatório de rejeições revisado.

### Fase 2 — Histórico de consumo interno

Ainda na primeira planilha:

- converter saídas por colaborador em `SAIDA_CONSUMO_INTERNO`;
- associar matrícula ao colaborador;
- validar que o item exista;
- calcular saldos quando a sequência temporal permitir;
- separar linhas sem data, item ou responsável para revisão.

### Fase 3 — Peças acabadas e expedições

Fonte: `CONTROLE_PEÇAS 2026_ALMOXARIFADO_ATUALIZADA.xlsx`.

Escopo:

- itens `100-*`;
- clientes e destinos;
- saldos de pronta entrega;
- saídas de expedição;
- NF e status quando disponíveis.

### Fase 4 — Matéria-prima e inventários mensais

Fonte: `ESTOQUE 2026.xlsx`.

Execução inicial com uma amostra de meses, seguida de reconciliação. A carga
completa somente será liberada após confirmar:

- interpretação das colunas diárias;
- unidade em KG e metros;
- fechamento de cada mês;
- transição para o mês seguinte;
- tratamento de fórmulas e totais;
- compatibilidade com inventário e movimentações.

## 7. Controle de idempotência e auditoria

Cada execução deverá gerar um `importBatchId` com:

- identificador da execução;
- arquivo e versão da fonte;
- data da execução;
- modo (`dry-run` ou persistência);
- usuário ou processo executor;
- status (`SIMULADO`, `EM_PROCESSAMENTO`, `CONCLUIDO`, `CONCLUIDO_COM_AVISOS`,
  `FALHO`, `PARCIAL`);
- contadores por tipo de registro.

Para cada registro processado, deverão estar disponíveis:

- chave de origem;
- entidade de destino;
- ação (`CRIAR`, `ATUALIZAR`, `IGNORAR`, `REJEITAR`);
- valor original e valor normalizado quando relevante;
- mensagens de validação;
- identificador criado no banco, quando houver.

Atualizações automáticas deverão ser limitadas a campos explicitamente
autorizados. Uma nova planilha não poderá sobrescrever alterações operacionais
posteriores sem uma política de reconciliação aprovada.

## 8. Estratégia para conflitos

| Situação | Decisão |
| --- | --- |
| Mesmo código, mesma descrição e valores equivalentes | Tratar como o mesmo item |
| Mesmo código com descrição diferente | Bloquear e exigir revisão |
| Matrícula duplicada com os mesmos dados | Consolidar com aviso e preservar as origens |
| Matrícula duplicada com dados divergentes | Bloquear |
| Unidade desconhecida | Bloquear o registro |
| Data ausente em histórico | Não criar movimentação; enviar para pendência |
| Saldo negativo calculado | Bloquear o lote afetado |
| Fórmula sem valor calculável | Registrar o valor exibido e sinalizar revisão |
| Linha de total ou cabeçalho repetido | Ignorar somente quando identificada explicitamente |
| Item fora do padrão de código | Bloquear até decisão sobre o padrão |

## 9. Critérios de aceitação

Uma etapa de migração será considerada concluída quando:

1. o `dry-run` puder ser executado novamente com o mesmo resultado;
2. todos os registros persistidos forem válidos pelos schemas do domínio;
3. nenhum registro rejeitado desaparecer sem justificativa;
4. não houver duplicação em uma segunda execução;
5. itens e colaboradores puderem ser encontrados pelas chaves naturais;
6. movimentações mantiverem a origem da planilha;
7. saldos importados forem reconciliados com a fonte;
8. erros e avisos estiverem disponíveis por arquivo, aba e linha;
9. o adaptador de persistência puder ser testado sem a interface web;
10. um teste de integração validar o fluxo de leitura até consulta no repositório.

## 10. Testes necessários

O importador deverá ter testes para:

- datas do Excel e datas inválidas;
- números com vírgula, ponto e separadores de milhar;
- códigos e matrículas com espaços ou zeros ausentes;
- duplicidade de itens e colaboradores;
- unidades e fatores de conversão;
- linhas vazias, totais e cabeçalhos repetidos;
- saldo negativo;
- reprocessamento idempotente;
- interrupção durante persistência;
- divergência entre saldo informado e saldo calculado;
- associação de movimentação a item e colaborador;
- relatório determinístico de erros.

Também deverá existir um conjunto pequeno de arquivos ou fixtures de teste,
sem depender das planilhas completas para cada execução da suíte.

## 11. Fora do escopo da primeira entrega

Não fazem parte da primeira entrega:

- construção de todas as telas do sistema;
- edição manual de planilhas dentro da aplicação;
- importação automática sem revisão;
- interpretação definitiva das abas mensais antes da análise;
- conciliação automática de NFe sem workflow aprovado;
- exclusão ou sobrescrita de dados já migrados;
- suporte a qualquer formato de planilha não mapeado.

## 12. Próximo incremento recomendado

O próximo incremento deve ser a **Fase 0**, seguida por um importador em
`dry-run` para o catálogo de itens da planilha de materiais improdutivos.

A implementação deve entregar, nesta ordem:

1. leitor da planilha e relatório estrutural;
2. modelo intermediário com origem;
3. normalizadores de código, unidade, número e data;
4. validação por `ItemSchema`;
5. relatório de erros e avisos;
6. teste de reprocessamento;
7. somente então o adaptador de persistência.

Esse recorte reduz o risco, valida a arquitetura com dados reais e cria a base
necessária para o frontend operacional de consulta e movimentação.
