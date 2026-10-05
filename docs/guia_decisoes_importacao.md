# Guia de decisões da importação

Este documento explica como revisar os registros que ainda impedem a
importação da planilha para o Firestore.

## Arquivos gerados

Os relatórios ficam na pasta `migration-reports/`, que é local e ignorada pelo
Git:

- `improdutivos-resolution-decisions.json`: arquivo principal para preencher.
  Atualmente contém 41 registros pendentes.
- `improdutivos-duplicate-resolution.json`: resumo específico das 4
  duplicidades, relacionando cada ocorrência duplicada à primeira ocorrência.
- `improdutivos-dry-run.json`: relatório completo, com os valores originais,
  valores normalizados, erros, abas e linhas da planilha.
- `improdutivos-error-resolution.json`: erros agrupados por categoria.

O arquivo que deve ser editado para registrar as escolhas é:

```text
migration-reports/improdutivos-resolution-decisions.json
```

Ele pode ser aberto no VS Code. Não altere `sourceKey` nem
`sourceFingerprint`.

## O que precisa ser decidido

Cada objeto do arquivo representa um registro bloqueante. Os campos mais
importantes são:

| Campo | O que significa |
| --- | --- |
| `sourceKey` | Identificação da origem: arquivo, aba, linha e entidade. |
| `entity` | Tipo do registro: `ITEM` ou `COLABORADOR`. |
| `category` | Categoria do problema encontrado. |
| `status` | Deve permanecer `PENDING` até a decisão ser confirmada. |
| `decision` | Ação que será tomada. |
| `correctedValue` | Valor corrigido, quando a decisão for `CORRECT_SOURCE`. |
| `mapping` | Valor equivalente conhecido, quando a decisão for `MAP_VALUE`. |
| `mergeIntoSourceKey` | Registro que continuará sendo usado, quando for `MERGE`. |
| `justification` | Motivo e evidência da decisão. É obrigatório para aprovar. |

## Opções disponíveis

### `CORRECT_SOURCE`

Use quando a planilha contém um erro claro e existe evidência para corrigi-lo.

Preencha:

```json
{
  "status": "APPROVED",
  "decision": "CORRECT_SOURCE",
  "correctedValue": "valor correto",
  "justification": "Corrigido conforme cadastro oficial ... "
}
```

Não use essa opção para adivinhar códigos, matrículas ou números.

### `MAP_VALUE`

Use quando o valor antigo possui uma equivalência conhecida no catálogo atual,
como uma unidade legada que corresponde inequivocamente a uma unidade válida.

Preencha:

```json
{
  "status": "APPROVED",
  "decision": "MAP_VALUE",
  "mapping": "UNIDADE",
  "justification": "O cadastro legado define ... "
}
```

### `MERGE`

Use quando duas linhas representam o mesmo item ou colaborador e uma delas
deve ser incorporada à outra.

Preencha `mergeIntoSourceKey` com o `sourceKey` da primeira ocorrência ou do
registro escolhido, além da justificativa:

```json
{
  "status": "APPROVED",
  "decision": "MERGE",
  "mergeIntoSourceKey": "arquivo.xlsx|Tabela de ítens|25|item",
  "justification": "Descrição, unidade e demais dados confirmam que as linhas representam o mesmo item."
}
```

Não mescle automaticamente registros com descrição, unidade, matrícula ou
outros dados conflitantes.

### `REASSIGN`

Use quando a linha está associada ao código ou registro errado, mas o registro
correto é conhecido. A justificativa deve informar a origem da confirmação.

### `REJECT`

Use quando o registro não deve ser importado. Explique por que ele é inválido,
obsoleto ou não possui evidência suficiente para uma correção segura.

## Como validar as decisões

Depois de preencher o arquivo, execute:

```bash
npm run migration:validate-resolutions
```

O comando verifica o fingerprint da planilha, os `sourceKey`, os campos
obrigatórios e os destinos de mesclagem. Ele não altera a planilha nem grava
no Firestore.

Uma decisão só poderá ser aplicada ao pipeline quando:

1. estiver com `status: "APPROVED"`;
2. tiver justificativa;
3. tiver os campos específicos da ação;
4. passar pela validação contra o relatório atual;
5. o novo `dry-run` não apresentar erros bloqueantes nos registros a importar.

## Situação atual das duplicidades

O relatório específico está em
`migration-reports/improdutivos-duplicate-resolution.json`. As quatro
duplicidades ainda estão como `PENDING`:

- item: linha 71 contra linha 25;
- item: linha 72 contra linha 22;
- item: linha 74 contra linha 36;
- colaborador: linha 56 contra linha 10.

Nenhuma dessas linhas foi escolhida automaticamente como correta.
