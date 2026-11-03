# Roteiro de entrada em produção

Passos que dependem de acesso às contas (Vercel, Firebase/Google Cloud, GitHub) e por isso não são feitos pelo código. Faça na ordem.

## 1. Variáveis de ambiente na Vercel

Em *Project Settings > Environment Variables* (ambiente **Production**), configure as variáveis de [`.env.example`](../.env.example):

| Variável | Obrigatória | Observação |
| --- | --- | --- |
| `NEXT_PUBLIC_FIREBASE_*` | Sim | Config do app web no Firebase Console. |
| `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY` | Sim | Conta de serviço do Admin SDK. A chave vai com os `\n` literais. |
| `FIREBASE_AUTH_CONTINUE_URL` | Recomendado | `https://<seu-dominio>/login`. Sem ela, usa a URL de produção da Vercel + `/login`. |
| `USER_EMAIL_DELIVERY_URL` | Opcional | Webhook que envia os e-mails de convite e redefinição. Sem ele, o link aparece na tela de usuários para envio manual. |

Nunca configure `NEXT_PUBLIC_USE_FIREBASE_EMULATOR`, `FIRESTORE_EMULATOR_HOST` ou `FIREBASE_AUTH_EMULATOR_HOST` em produção.

## 2. Firebase Authentication

- *Authentication > Settings > Authorized domains*: adicione o domínio de produção. Sem isso, convites e redefinições de senha falham.
- O login vai direto do navegador ao Firebase Auth, que já bloqueia tentativas repetidas de senha. Para barrar uso automatizado da API, considere ativar o **App Check**.

## 3. Regras e índices do Firestore

O workflow [`firestore-deploy.yml`](../.github/workflows/firestore-deploy.yml) publica `firestore.rules` e `firestore.indexes.json` sempre que esses arquivos mudam na `main`.

1. Crie uma conta de serviço com os papéis **Firebase Rules Admin** e **Cloud Datastore Index Admin**.
2. Gere uma chave JSON e salve o conteúdo no secret `FIREBASE_SERVICE_ACCOUNT` do repositório (ambiente `production`).
3. Rode o workflow manualmente uma vez (*Actions > Deploy das regras e índices do Firestore > Run workflow*).
4. No Firebase Console, aguarde todos os índices ficarem **Ativados**. Até lá, as consultas que dependem deles falham. Desde a correção do repositório, isso aparece como erro 500 com código de rastreio, e não mais como lista vazia.

## 4. Backup do Firestore

Ative backups diários e a recuperação pontual (PITR) no Google Cloud (requer plano Blaze):

```bash
gcloud config set project rhowert-a57af

# Backup diário retido por 14 dias
gcloud firestore backups schedules create \
  --database='(default)' --recurrence=daily --retention=14d

# Recuperação pontual dos últimos 7 dias
gcloud firestore databases update --database='(default)' --enable-pitr
```

Teste a restauração ao menos uma vez em um banco separado:

```bash
gcloud firestore backups list --location=<regiao>
gcloud firestore databases restore --source-backup=<nome-do-backup> --destination-database=restore-teste
```

## 5. Monitoramento de erros

- Erros inesperados da API respondem com um código curto (`erroId`), mostrado ao usuário na mensagem de erro.
- O detalhe completo é registrado como uma linha JSON (`{"nivel":"erro","erroId":...}`) nos logs da Vercel. Para investigar um relato, filtre os logs pelo código.
- Recomendado: criar um alerta de logs na Vercel (ou ligar uma integração como Sentry) para `"nivel":"erro"`.

## 6. Verificação final

- [ ] `npm run typecheck`, `npm test` e `npm run build` passando no CI.
- [ ] Job "Regras do Firestore (emulador)" passando no CI.
- [ ] Login, convite de usuário e redefinição de senha testados no domínio de produção.
- [ ] Cadastro, edição e inativação testados em itens, clientes e colaboradores.
- [ ] Cabeçalhos de segurança presentes (`curl -I https://<seu-dominio>/login`).
- [ ] Backup diário listado em `gcloud firestore backups schedules list`.

## Pendências conhecidas

- **Testes E2E**: `playwright.config.ts` e o script `test:e2e` existem, mas não há pasta `e2e/` nem a dependência `@playwright/test`. Os fluxos de tela não têm teste automatizado.
- **Notas fiscais**: `GET /api/faturamento` ainda lê todas as notas emitidas, porque os indicadores somam o faturamento total. Com muitos anos de histórico, vale limitar por período.
