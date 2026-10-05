# Plano de Implementação da Importação para o Firestore

## 1. Objetivo

Este plano transforma o pipeline de descoberta, normalização e `dry-run` em um
processo de importação controlado para o Firestore.

O processo deverá suportar três modos:

```text
DRY_RUN      leitura, normalização e validação sem persistência
STAGING      persistência somente no Firebase Emulator Suite
PRODUCTION   persistência no projeto Firebase real, com confirmação explícita
```

A importação produtiva somente será liberada quando os gates de qualidade,
idempotência, reconciliação e segurança forem aprovados.

Plano conceitual relacionado:
[plano_migracao_planilhas.md](./plano_migracao_planilhas.md).

## 2. Estado inicial

O pipeline atual processa a primeira fonte:

`Cont. de Estoque Disco Flap, Mat. de Solda e Brocas.xlsx`

Resultado mais recente do `dry-run`:

| Métrica | Quantidade |
| --- | ---: |
| Registros lidos | 172 |
| Registros válidos | 131 |
| Registros rejeitados | 41 |
| Duplicidades | 4 |
| Avisos | 133 |
| Erros bloqueantes | 43 |

O Firestore do projeto `rhowert-a57af` está ativo, as regras estão publicadas e
o Emulator Suite está configurado. Ainda não existe uma camada de persistência
específica para os candidatos da migração.

## 3. Princípios obrigatórios

1. Nenhum registro com erro bloqueante será persistido.
2. `dry-run` nunca grava no Firestore.
3. Produção exige confirmação explícita e o identificador da fonte.
4. Cada registro possui chave determinística de origem.
5. Reexecutar o mesmo lote não cria duplicatas.
6. O importador não altera silenciosamente o significado dos dados.
7. Todo lote produz relatório persistente e relatório local.
8. Falhas parciais são registradas e reconciliáveis.
9. Credenciais Admin nunca aparecem em planilhas, relatórios ou logs.
10. O schema do domínio é a fonte de verdade da validação.

## 4. Entidades e escopo da primeira carga

### 4.1. Primeira carga

O primeiro lote abrangerá somente:

- `items`;
- `collaborators`;
- saldo inicial quando comprovadamente representado pela fonte;
- metadados e registros de controle da importação.

Movimentações históricas, expedições e inventários mensais ficam fora da primeira
carga até que sua semântica seja validada.

### 4.2. Coleções de controle

Será criada uma estrutura de controle compatível com as regras publicadas:

```text
importBatches/{batchId}
importBatches/{batchId}/records/{recordId}
```

Cada lote deverá conter:

- `id`;
- modo da execução;
- arquivo e hash da fonte;
- data de início e término;
- versão do importador;
- status;
- contadores;
- resumo de erros e avisos;
- responsável pela execução, quando houver;
- parâmetros usados;
- referência ao relatório local.

Cada registro deverá conter:

- `id`;
- `sourceKey`;
- entidade de destino;
- chave natural;
- ação planejada ou executada;
- status;
- origem da planilha;
- mensagens de validação;
- identificador do documento criado ou atualizado;
- data da operação.

Nenhum valor de senha, token ou credencial poderá ser armazenado nesses
documentos.

## 5. Fases de implementação

## Fase 0 — Congelamento e baseline

### Tarefa 0.1 — Registrar a fonte de referência

- calcular hash SHA-256 do arquivo de entrada;
- registrar nome, tamanho, data de modificação e abas;
- guardar o resultado junto ao relatório do lote;
- impedir que um arquivo seja substituído durante a execução.

**Aceite:** duas execuções identificam exatamente a mesma fonte pelo hash.

### Tarefa 0.2 — Fixar o baseline do `dry-run`

- gerar novo relatório;
- salvar os contadores atuais;
- listar os 43 erros por categoria, entidade, aba e linha;
- separar avisos revisáveis de erros bloqueantes.

**Aceite:** o relatório é reproduzível e permite rastrear cada erro até a linha
original.

### Tarefa 0.3 — Definir versão do importador

- criar uma constante de versão;
- incluir a versão em relatórios e lotes;
- alterar a versão sempre que o mapeamento mudar.

**Aceite:** um lote pode ser relacionado ao código que o produziu.

## Fase 1 — Resolução dos erros da fonte

### Tarefa 1.1 — Classificar os erros bloqueantes

Classificar cada erro em:

- código inválido;
- descrição ausente ou insuficiente;
- número inválido;
- unidade não mapeada;
- duplicidade de chave natural;
- matrícula inválida;
- setor não mapeado;
- registro inconsistente;
- outra categoria explícita.

**Aceite:** 100% dos erros possuem categoria, origem e ação recomendada.

### Tarefa 1.2 — Corrigir a fonte ou criar mapeamento documentado

- corrigir a planilha quando o dado original estiver errado;
- criar tabela de mapeamento somente para equivalências conhecidas;
- não transformar erro semântico em valor arbitrário;
- preservar valor original e valor normalizado.

**Aceite:** cada correção possui justificativa e não depende de lógica oculta.

### Tarefa 1.3 — Resolver duplicidades

- identificar a primeira e as demais ocorrências;
- decidir entre mesclar, corrigir a chave ou rejeitar;
- não mesclar registros com descrições conflitantes automaticamente;
- manter a decisão em arquivo de revisão.

**Aceite:** nenhuma duplicidade bloqueante permanece sem decisão.

**Implementação atual:** o relatório
`migration-reports/improdutivos-duplicate-resolution.json` relaciona as quatro
duplicidades à primeira ocorrência correspondente. As decisões continuam
pendentes até revisão humana; nenhuma prevalência é escolhida automaticamente.
O template de decisões inclui o fingerprint SHA-256 da fonte, e
`npm run migration:validate-resolutions` rejeita decisões de outra versão da
planilha, `sourceKey` inexistente ou mesclagem aprovada sem destino compatível.

### Tarefa 1.4 — Reexecutar o `dry-run`

- gerar relatório após as correções;
- comparar com o baseline;
- confirmar redução dos erros;
- verificar que nenhuma nova categoria surgiu.

**Gate:** não avançar enquanto houver erro bloqueante no subconjunto que será
importado.

## Fase 2 — Contrato de persistência

### Tarefa 2.1 — Implementar chaves naturais

Definir:

- item: código normalizado;
- colaborador: matrícula normalizada;
- registro de origem: `fonte|arquivo|aba|linha|entidade`.

As chaves deverão ser determinísticas, estáveis e independentes da ordem de
execução.

**Aceite:** reprocessar a mesma linha produz a mesma chave.

### Tarefa 2.2 — Definir estratégia de conflito

Por padrão:

- documento inexistente: `CREATE`;
- mesma chave e mesmo conteúdo: `SKIP`;
- mesma chave e conteúdo diferente: `CONFLICT`;
- alteração explícita aprovada: `UPDATE`, somente nos campos permitidos.

Nenhum conflito será sobrescrito silenciosamente.

### Tarefa 2.3 — Implementar adaptação para documentos Firestore

- converter datas para `Timestamp` ou formato adotado pelo repositório;
- garantir `id` igual ao identificador do documento;
- garantir `estoqueAtual` explícito nos itens;
- manter campos compatíveis com `firestore.rules`;
- validar o documento final antes da escrita.

**Aceite:** todo documento planejado passa pelo schema e pela política de
campos do Firestore.

### Tarefa 2.4 — Definir política de saldo

- importar saldo somente quando a coluna for comprovadamente um saldo;
- não criar movimentação histórica artificial;
- registrar `estoqueInicial` e origem quando aplicável;
- registrar divergências entre saldo informado e calculado.

**Aceite:** cada saldo importado possui evidência da sua origem.

## Fase 3 — Implementação do importador seguro

### Tarefa 3.1 — Criar serviço de planejamento

Criar um serviço que receba os candidatos dos adaptadores e produza um plano:

```ts
{
  batchId: string;
  sourceHash: string;
  items: ImportOperation[];
  collaborators: ImportOperation[];
  summary: ImportSummary;
}
```

O planejamento não grava dados.

**Aceite:** o mesmo input gera o mesmo conjunto de operações, exceto timestamps
e o identificador deliberadamente aleatório do lote.

### Tarefa 3.2 — Criar comando de importação

Disponibilizar:

```bash
npm run migration:import -- --mode=dry-run --input=...
npm run migration:import -- --mode=staging --input=...
npm run migration:import -- --mode=production --input=... --confirm=IMPORTAR
```

Parâmetros adicionais:

```text
--batch-id=...
--limit=...
--entity=items|collaborators|all
--on-conflict=skip|fail|update
--report=...
```

**Aceite:** produção sem `--confirm=IMPORTAR` é rejeitada antes de qualquer
escrita.

### Tarefa 3.3 — Implementar escrita em lotes

- usar `BulkWriter` ou batches compatíveis com o Admin SDK;
- limitar tamanho e concorrência;
- registrar sucesso individual;
- capturar falha individual sem mascarar o lote;
- usar `create` quando a idempotência exigir ausência do documento;
- impedir escrita fora das coleções autorizadas.

**Aceite:** falhas individuais aparecem no relatório e não são convertidas em
sucesso.

### Tarefa 3.4 — Persistir `importBatches`

Fluxo:

1. criar o lote como `PLANNED`;
2. atualizar para `RUNNING`;
3. gravar registros de controle;
4. executar operações;
5. atualizar contadores;
6. finalizar como `COMPLETED`, `COMPLETED_WITH_ERRORS` ou `FAILED`.

**Aceite:** não existe lote sem status final ou sem contadores coerentes.

### Tarefa 3.5 — Implementar retomada e reconciliação

- localizar operações pendentes por `sourceKey`;
- não repetir operação concluída;
- permitir retomada de lote interrompido;
- gerar relatório de divergências;
- fornecer comando de reconciliação.

**Aceite:** interromper e repetir o processo não duplica documentos.

## Fase 4 — Staging no Emulator Suite

### Tarefa 4.1 — Criar fixture de staging

- importar uma amostra pequena e representativa;
- incluir item válido, colaborador válido, duplicidade e rejeição;
- usar projeto e emuladores separados de produção;
- limpar o estado ao final ou usar identificador de execução.

**Aceite:** nenhum documento de staging é criado no projeto real.

### Tarefa 4.2 — Testar idempotência

Executar o mesmo lote duas vezes e verificar:

- mesma quantidade de documentos;
- operações repetidas classificadas como `SKIP`;
- nenhuma duplicidade;
- mesmo vínculo entre origem e destino.

**Aceite:** segunda execução não aumenta a quantidade de entidades.

### Tarefa 4.3 — Testar falhas parciais

Simular:

- falha ao criar item;
- falha ao gravar registro de controle;
- interrupção do processo;
- conflito de chave;
- documento inválido.

**Aceite:** o lote termina com status explícito e pode ser reconciliado.

### Tarefa 4.4 — Testar reconciliação

- comparar plano com documentos persistidos;
- verificar campos obrigatórios;
- verificar contadores;
- verificar vínculos de origem;
- confirmar ausência de registros órfãos.

**Gate:** staging só é aprovado quando a reconciliação for zero divergências
inesperadas.

## Fase 5 — Preparação para produção

### Tarefa 5.1 — Configurar credenciais server-side

Configurar no ambiente de execução:

- `FIREBASE_ADMIN_PROJECT_ID`;
- `FIREBASE_ADMIN_CLIENT_EMAIL`;
- `FIREBASE_ADMIN_PRIVATE_KEY`.

Nunca usar credenciais do cliente web para o importador.

**Aceite:** o importador identifica o projeto correto e não imprime segredos.

### Tarefa 5.2 — Revisar regras e permissões

O importador usará o Admin SDK em ambiente confiável. Ainda assim:

- limitar o código às coleções previstas;
- validar os campos antes da escrita;
- auditar lote e operações;
- não permitir que o frontend invoque o comando diretamente.

**Aceite:** não existe endpoint público para iniciar importação produtiva.

### Tarefa 5.3 — Criar backup e plano de reversão

Antes da produção:

- exportar o estado relevante do Firestore;
- guardar o relatório do lote;
- guardar o hash da fonte;
- definir como desativar ou remover somente documentos deste lote;
- validar o procedimento em staging.

**Aceite:** existe procedimento testado para reverter o lote sem apagar dados
anteriores.

### Tarefa 5.4 — Executar dry-run final

O dry-run final deverá:

- usar exatamente a planilha que será importada;
- usar a mesma versão do importador;
- produzir zero erros bloqueantes no escopo;
- listar todos os avisos aceitos;
- gerar contagem esperada por entidade.

**Gate de produção:** qualquer diferença entre o dry-run aprovado e o arquivo
usado na carga cancela a execução.

## Fase 6 — Piloto produtivo

### Tarefa 6.1 — Importar lote pequeno

- selecionar uma amostra aprovada;
- executar com `--mode=production`;
- exigir `--confirm=IMPORTAR`;
- monitorar logs e contadores;
- interromper diante de conflito inesperado.

**Aceite:** lote piloto reconciliado e sem erro bloqueante.

### Tarefa 6.2 — Validar no Firestore

Conferir:

- itens e colaboradores esperados;
- chaves naturais;
- `id` dos documentos;
- saldo inicial;
- campos opcionais;
- origem em `importBatches`;
- ausência de senhas e tokens.

**Aceite:** amostra manual e reconciliação automática concordam.

### Tarefa 6.3 — Decidir liberação da carga completa

Registrar decisão com:

- responsável;
- data;
- batch piloto;
- relatório;
- divergências resolvidas;
- autorização para carga completa.

**Aceite:** não executar carga completa sem aprovação registrada.

## Fase 7 — Importação produtiva completa

### Tarefa 7.1 — Executar carga completa

- congelar a versão da planilha;
- calcular e registrar hash;
- executar o comando com confirmação;
- acompanhar progresso;
- preservar o relatório e os logs;
- não executar duas cargas concorrentes da mesma fonte.

### Tarefa 7.2 — Finalizar o lote

O lote somente poderá ser `COMPLETED` quando:

- todas as operações planejadas tiverem estado final;
- nenhum erro bloqueante permanecer sem decisão;
- contadores planejados e executados coincidirem;
- a reconciliação estiver aprovada.

Caso contrário, usar `COMPLETED_WITH_ERRORS` ou `FAILED`.

### Tarefa 7.3 — Publicar relatório de resultado

O relatório final deverá conter:

- hash da fonte;
- versão do importador;
- batch ID;
- totais por entidade;
- criados, atualizados, ignorados e rejeitados;
- conflitos;
- erros;
- avisos;
- divergências de reconciliação.

Não incluir credenciais, tokens ou senhas.

## Fase 8 — Pós-importação e próximas fontes

### Tarefa 8.1 — Validação operacional

- consultar itens e colaboradores pelo sistema;
- verificar filtros e paginação;
- verificar saldo inicial;
- testar uma operação de estoque em staging antes de produção;
- confirmar que as regras do Firestore permitem o fluxo esperado.

### Tarefa 8.2 — Monitoramento pós-carga

Durante o período inicial:

- acompanhar erros de leitura e escrita;
- acompanhar conflitos de chave;
- registrar correções como novos lotes;
- não editar silenciosamente documentos importados.

### Tarefa 8.3 — Liberar a segunda fonte

Somente depois da primeira fonte estar reconciliada:

1. `CONTROLE_PEÇAS 2026_ALMOXARIFADO_ATUALIZADA.xlsx`;
2. `ESTOQUE 2026.xlsx`;
3. movimentações e inventários mensais após validação semântica.

Cada fonte terá seu próprio hash, lote, relatório e aprovação.

## 6. Critérios finais de conclusão

A primeira importação será considerada concluída quando:

1. todos os erros bloqueantes do escopo tiverem sido resolvidos ou formalmente
   excluídos;
2. o dry-run final tiver sido aprovado;
3. staging tiver sido executado duas vezes sem duplicações;
4. falhas parciais tiverem sido testadas;
5. o lote produtivo tiver sido criado e finalizado;
6. a reconciliação não tiver divergências inesperadas;
7. os relatórios estiverem preservados;
8. nenhum segredo tiver sido persistido;
9. o sistema conseguir consultar os registros importados;
10. houver decisão documentada para a próxima fonte.

## 7. Próxima tarefa recomendada

Iniciar pela **Tarefa 0.1**, seguida da **Tarefa 1.1**:

```bash
npm run migration:dry-run-improdutivos
```

Depois implementar o classificador de resolução dos 43 erros e somente então
começar a camada de persistência do importador.
