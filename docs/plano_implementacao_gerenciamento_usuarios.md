# Plano de Implementação: Gerenciamento de Usuários

## 1. Objetivo

Implementar o gerenciamento administrativo de usuários pelo papel `mestre`,
mantendo sincronizados o Firebase Authentication e o documento
`users/{uid}` no Firestore, com auditoria, controle de permissões e suporte
futuro ao frontend.

O fluxo deverá permitir que o `mestre` crie e administre usuários com os
papéis:

```text
mestre
  └── admin
        └── operador
              └── requisitante
```

O `mestre` será um login administrativo acima dos demais papéis e poderá
executar operações de administração do sistema.

## 2. Decisões obrigatórias

### 2.1. Senhas

Senhas existentes **nunca serão visualizadas, armazenadas no Firestore,
retornadas pela API ou gravadas em logs**. O sistema oferecerá:

- convite por e-mail;
- link de redefinição de senha;
- senha temporária aleatória exibida uma única vez, quando necessário;
- exigência de troca da senha no primeiro acesso.

O `mestre` poderá iniciar uma redefinição, mas não descobrir a senha atual de
outro usuário.

### 2.2. Backend confiável

Operações administrativas usarão Firebase Admin SDK em backend confiável,
como uma rota server-side do Next.js ou Cloud Functions. O Admin SDK nunca
será importado em código executado no navegador.

O backend deverá validar novamente o papel do chamador. As regras do
Firestore não substituem essa validação, especialmente porque o Admin SDK
ignora as regras de segurança do Firestore.

### 2.3. Identidade

O UID do Firebase Authentication será a chave do documento:

```text
users/{uid}
```

O e-mail não será usado como identificador primário.

### 2.4. Fonte de verdade

O documento `users/{uid}` será a fonte de verdade administrativa. Custom
claims poderão ser usadas posteriormente como cache de autorização rápida,
mas deverão ser atualizadas junto com o papel persistido.

## 3. Modelo de dados

### 3.1. Documento `users/{uid}`

Estrutura inicial:

```ts
{
  id: string;
  name: string;
  email: string;
  role: 'mestre' | 'admin' | 'operador' | 'requisitante';
  ativo: boolean;
  mustChangePassword: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}
```

Regras do modelo:

- `id` deve ser igual ao UID do Authentication;
- novos usuários começam ativos ou inativos conforme o fluxo de convite;
- `mustChangePassword` será `true` para senha temporária;
- campos de auditoria não poderão ser alterados livremente pelo cliente;
- não haverá campo para armazenar senha.

### 3.2. Coleção `userAuditLogs/{logId}`

Estrutura:

```ts
{
  targetUserId: string;
  performedBy: string;
  action:
    | 'CREATE'
    | 'UPDATE'
    | 'DISABLE'
    | 'ENABLE'
    | 'RESET_PASSWORD'
    | 'CHANGE_ROLE'
    | 'DELETE';
  changedFields: string[];
  reason?: string;
  createdAt: string;
}
```

Logs serão imutáveis e não conterão senhas, tokens ou segredos.

## 4. Fases de implementação

Cada fase deve ser concluída e validada antes do início da seguinte.

### Fase 0 — Preparação e proteção

#### Tarefa 0.1 — Registrar decisões de segurança

- Confirmar a hierarquia de papéis.
- Confirmar que senha existente nunca será exibida.
- Confirmar o fluxo de convite e redefinição.

**Critério de aceite:** decisões documentadas e utilizadas pelas tarefas
seguintes.

#### Tarefa 0.2 — Revisar segredos e ambientes

- Manter `.env.local` fora do Git.
- Identificar como o backend receberá as credenciais do Admin SDK.
- Não adicionar chave privada ao repositório.
- Separar configuração de desenvolvimento e produção.

**Critério de aceite:** nenhum segredo administrativo é exposto ao bundle web
ou ao controle de versão.

#### Tarefa 0.3 — Configurar o Firebase Emulator Suite

- Configurar Authentication e Firestore localmente.
- Criar dados de teste mínimos.
- Documentar os comandos de execução.

**Critério de aceite:** testes de regras podem ser executados sem modificar o
projeto Firebase de produção.

### Fase 1 — Modelo de domínio

#### Tarefa 1.1 — Expandir `UserSchema`

Adicionar ao domínio:

- `ativo`;
- `mustChangePassword`;
- `updatedAt`;
- `createdBy`;
- `updatedBy`.

**Critério de aceite:** entradas inválidas são rejeitadas e dados legados
continuam compatíveis quando permitido.

#### Tarefa 1.2 — Criar schemas de comandos administrativos

Criar schemas para:

- criação de usuário;
- atualização de perfil;
- alteração de papel;
- ativação e desativação;
- solicitação de redefinição;
- envio de convite.

**Critério de aceite:** cada comando possui validação de entrada independente
e não aceita senha em respostas ou modelos persistidos.

#### Tarefa 1.3 — Criar tipos de auditoria

Definir ações, estrutura do log e tipos de resultado público retornado ao
frontend.

**Critério de aceite:** logs possuem formato estável e não contêm dados
secretos.

### Fase 2 — Regras do Firestore

#### Tarefa 2.1 — Completar regras de `users`

Garantir que:

- o usuário leia o próprio perfil;
- o `mestre` leia perfis administrativos;
- o próprio usuário não altere `role`;
- o próprio usuário não altere `createdBy`;
- apenas o `mestre` altere papéis;
- o `mestre` não altere o próprio papel;
- o cliente não crie diretamente um perfil privilegiado.

**Critério de aceite:** testes de regras cobrem cada combinação de papel e
operação.

#### Tarefa 2.2 — Proteger `userAuditLogs`

- Bloquear criação direta pelo cliente.
- Bloquear alteração e exclusão.
- Permitir leitura somente ao `mestre`, conforme a política definida.

**Critério de aceite:** somente o backend confiável consegue gravar logs.

#### Tarefa 2.3 — Publicar regras após validação

- Executar validação local.
- Executar `firebase deploy --only firestore:rules --dry-run`.
- Publicar somente após revisão.

**Critério de aceite:** regras compilam e o comportamento publicado é
confirmado por teste autenticado.

### Fase 3 — Firebase Admin SDK

#### Tarefa 3.1 — Criar inicialização server-side

Implementar um módulo de inicialização do Admin SDK com credenciais seguras e
proteção contra inicialização duplicada.

**Critério de aceite:** o módulo só pode ser importado em ambiente server-side
e não expõe credenciais ao cliente.

#### Tarefa 3.2 — Criar verificação de identidade

Implementar middleware/helper para:

- validar o Firebase ID token;
- carregar o UID;
- carregar o perfil em `users/{uid}`;
- verificar `role` e `ativo`;
- rejeitar usuários desativados.

**Critério de aceite:** toda operação administrativa rejeita usuário sem
autenticação, perfil inexistente ou papel insuficiente.

#### Tarefa 3.3 — Criar autorização hierárquica

Implementar regras de serviço para diferenciar:

- `mestre`;
- `admin`;
- `operador`;
- `requisitante`.

A autorização deve impedir que um `admin` crie ou promova outro `mestre`.

**Critério de aceite:** tentativas de elevação de privilégio são rejeitadas e
auditadas quando aplicável.

### Fase 4 — Criação sincronizada

#### Tarefa 4.1 — Implementar comando de criação

Entrada:

```ts
{
  name: string;
  email: string;
  role: 'admin' | 'operador' | 'requisitante';
  sendInvite: boolean;
}
```

O fluxo deverá:

1. autenticar e autorizar o `mestre`;
2. validar os dados;
3. verificar e-mail duplicado;
4. criar o usuário no Authentication;
5. criar `users/{uid}` no Firestore;
6. registrar `CREATE`;
7. gerar ou enviar convite;
8. retornar somente dados públicos.

Criação de outro `mestre` deverá ser uma operação separada, com confirmação
adicional e política explícita.

**Critério de aceite:** usuário criado possui Authentication e documento
correspondente com o mesmo UID.

#### Tarefa 4.2 — Implementar compensação de falha

Se o Authentication for criado e o Firestore falhar:

- registrar o erro;
- tentar remover o usuário recém-criado;
- registrar pendência se a remoção falhar;
- nunca retornar sucesso parcial.

**Critério de aceite:** falhas artificiais não deixam um usuário sem perfil
sem registro operacional da pendência.

#### Tarefa 4.3 — Implementar idempotência

- Usar e-mail normalizado e uma chave de operação.
- Rejeitar duplicidade previsível.
- Permitir consulta de operações pendentes.

**Critério de aceite:** repetir a mesma solicitação não cria contas
duplicadas.

### Fase 5 — Convites e senhas

#### Tarefa 5.1 — Implementar convite

- Gerar link de redefinição pelo Admin SDK.
- Enviar pelo provedor configurado ou retornar link somente em ambiente
controlado.
- Não registrar o link em logs de produção.

**Critério de aceite:** o usuário consegue definir a própria senha sem que o
`mestre` conheça a senha.

#### Tarefa 5.2 — Implementar senha temporária opcional

- Gerar senha aleatória forte.
- Exibir uma única vez, se o fluxo exigir.
- Definir `mustChangePassword: true`.
- Nunca persistir a senha.

**Critério de aceite:** uma senha temporária não aparece em Firestore, logs,
respostas posteriores ou relatórios.

#### Tarefa 5.3 — Implementar redefinição

Permitir que o `mestre` solicite redefinição sem visualizar a senha atual.

**Critério de aceite:** a redefinição invalida o fluxo anterior conforme a
política do Authentication e gera auditoria sem segredo.

### Fase 6 — Administração de usuários

#### Tarefa 6.1 — Listar e consultar usuários

Implementar busca por:

- nome;
- e-mail;
- papel;
- status ativo.

**Critério de aceite:** respostas não incluem dados sensíveis e respeitam o
escopo do chamador.

#### Tarefa 6.2 — Editar perfil

Permitir ao `mestre` alterar dados administrativos e ao próprio usuário
alterar somente os campos autorizados.

**Critério de aceite:** qualquer alteração relevante gera auditoria.

#### Tarefa 6.3 — Alterar papel

- Permitir alteração somente pelo `mestre`.
- Impedir alteração do próprio papel.
- Impedir remoção ou rebaixamento do último `mestre`.
- Atualizar Firestore e custom claims, se utilizadas.

**Critério de aceite:** a hierarquia permanece válida após cada alteração.

#### Tarefa 6.4 — Ativar e desativar

- Sincronizar `ativo` no Firestore com `disabled` no Authentication.
- Impedir login de usuário desativado.
- Preferir desativação a exclusão.

**Critério de aceite:** usuário desativado não consegue iniciar nova sessão e
seu histórico permanece preservado.

#### Tarefa 6.5 — Exclusão controlada

Implementar somente se houver necessidade real. Antes disso, usar
desativação. Nunca permitir exclusão do último `mestre`.

**Critério de aceite:** exclusão, quando habilitada, possui confirmação,
auditoria e política de retenção.

### Fase 7 — API para o futuro frontend

Criar endpoints server-side equivalentes a:

```text
GET    /api/admin/users
POST   /api/admin/users
GET    /api/admin/users/:uid
PATCH  /api/admin/users/:uid
POST   /api/admin/users/:uid/send-invite
POST   /api/admin/users/:uid/reset-password
POST   /api/admin/users/:uid/disable
POST   /api/admin/users/:uid/enable
GET    /api/admin/users/:uid/audit
```

Cada endpoint deverá:

- exigir ID token válido;
- verificar papel no backend;
- validar entrada;
- retornar erros explícitos;
- nunca retornar senha, token ou segredo;
- registrar auditoria nas operações administrativas.

**Critério de aceite:** a API pode ser consumida por um cliente futuro sem
duplicar regras de autorização.

### Fase 8 — Testes e publicação

#### Tarefa 8.1 — Testes unitários

Cobrir:

- validação de comandos;
- hierarquia de papéis;
- e-mail duplicado;
- auto-rebaixamento;
- último `mestre`;
- usuário desativado;
- ausência de senha em respostas e logs.

#### Tarefa 8.2 — Testes de integração

Cobrir:

- criação no Authentication e Firestore;
- compensação de falha;
- alteração de e-mail;
- redefinição;
- auditoria;
- sincronização de status;
- idempotência.

#### Tarefa 8.3 — Testes das regras

Usar o Emulator Suite para validar:

- usuário comum não altera seu papel;
- `admin` não gerencia usuários;
- `mestre` gerencia usuários permitidos;
- auditoria não pode ser escrita pelo cliente;
- usuário desativado não acessa operações protegidas.

#### Tarefa 8.4 — Publicação gradual

1. Validar em emulador.
2. Executar `--dry-run`.
3. Publicar regras.
4. Deploy do backend.
5. Testar com o usuário `mestre`.
6. Monitorar falhas e operações parciais.

## 5. API e resposta pública

Respostas administrativas poderão conter:

```ts
{
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  ativo: boolean;
  mustChangePassword: boolean;
  createdAt?: string;
  updatedAt?: string;
}
```

Nunca poderão conter:

- senha atual ou temporária após o primeiro retorno;
- refresh token;
- ID token;
- chave privada;
- credenciais do Admin SDK;
- links de convite em logs.

## 6. Ordem recomendada de execução

1. Fase 0 — preparação e proteção;
2. Fase 1 — modelo de domínio;
3. Fase 2 — regras do Firestore;
4. Fase 3 — Admin SDK;
5. Fase 4 — criação sincronizada;
6. Fase 5 — convite e redefinição;
7. Fase 6 — administração;
8. Fase 7 — API;
9. Fase 8 — testes e publicação.

O primeiro incremento de código deve ser a **Tarefa 1.1**, seguida dos testes
do modelo. Nenhuma tela deve ser criada antes de o contrato server-side e as
regras de autorização estarem definidos.

## 7. Critérios de conclusão

A funcionalidade estará pronta quando:

1. o `mestre` puder criar um usuário por operação autenticada;
2. Authentication e `users/{uid}` forem criados com o mesmo UID;
3. falhas parciais forem compensadas ou registradas;
4. o novo usuário receber convite ou redefinição segura;
5. nenhuma senha for visualizada ou persistida;
6. papéis e status forem sincronizados;
7. alterações forem auditadas;
8. o último `mestre` não puder ser removido ou rebaixado;
9. testes de domínio, integração e regras passarem;
10. o frontend futuro puder consumir a API sem conhecer credenciais
    administrativas.
