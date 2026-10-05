import { spawn } from 'node:child_process';
import process from 'node:process';

const projectId = 'rhowert-a57af';
const emulatorHost = '127.0.0.1';
const authUrl = `http://${emulatorHost}:9099`;
const firestoreUrl = `http://${emulatorHost}:8080`;
const appUrl = 'http://127.0.0.1:3100';
const email = `integration-${Date.now()}@example.test`;
const password = 'Integration-Password-123!';
const children = [];

function start(command, args, env = {}) {
  const child = spawn(command, args, {
    env: { ...process.env, ...env },
    stdio: 'inherit',
  });
  children.push(child);
  return child;
}

async function waitFor(url, attempts = 60) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok || response.status < 500) return;
    } catch {
      // The process is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Serviço não iniciou: ${url}`);
}

async function request(url, options = {}) {
  const response = await fetch(url, options);
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`${options.method ?? 'GET'} ${url}: ${response.status} ${JSON.stringify(body)}`);
  }
  return body;
}

async function main() {
  start('firebase', ['emulators:start', '--only', 'auth,firestore']);
  await waitFor(`${authUrl}/identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts`);
  await waitFor(`${firestoreUrl}/v1/projects/${projectId}/databases/(default)/documents`);

  start('npm', ['run', 'dev', '--', '--hostname', emulatorHost, '--port', '3100'], {
    FIREBASE_ADMIN_PROJECT_ID: projectId,
    FIREBASE_AUTH_EMULATOR_HOST: `${emulatorHost}:9099`,
    FIRESTORE_EMULATOR_HOST: `${emulatorHost}:8080`,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: projectId,
  });
  await waitFor(`${appUrl}/api/admin/users`);

  const auth = await request(
    `${authUrl}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  );
  const timestamp = new Date().toISOString();
  await request(
    `${firestoreUrl}/v1/projects/${projectId}/databases/(default)/documents/users/${auth.localId}`,
    {
      method: 'PATCH',
      headers: {
        authorization: 'Bearer owner',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        fields: {
          id: { stringValue: auth.localId },
          name: { stringValue: 'Mestre de Integração' },
          email: { stringValue: email },
          role: { stringValue: 'mestre' },
          ativo: { booleanValue: true },
          mustChangePassword: { booleanValue: false },
          createdAt: { timestampValue: timestamp },
          updatedAt: { timestampValue: timestamp },
        },
      }),
    }
  );

  const headers = {
    authorization: `Bearer ${auth.idToken}`,
    'content-type': 'application/json',
  };
  const listed = await request(`${appUrl}/api/admin/users`, { headers });
  if (!listed.users.some((user) => user.id === auth.localId)) {
    throw new Error('O usuário mestre não apareceu na listagem administrativa.');
  }
  if (listed.users.some((user) => 'password' in user || 'token' in user)) {
    throw new Error('A resposta administrativa expôs um segredo.');
  }

  const created = await request(`${appUrl}/api/admin/users`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: 'Usuário de Integração',
      email: `created-${Date.now()}@example.test`,
      role: 'requisitante',
      sendInvite: false,
      idempotencyKey: `integration-${Date.now()}`,
    }),
  });
  if (created.user.role !== 'requisitante') {
    throw new Error('A API não criou o usuário com o papel solicitado.');
  }

  const disabled = await request(`${appUrl}/api/admin/users/${created.user.id}/disable`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ reason: 'Teste de integração' }),
  });
  if (disabled.user.ativo !== false) {
    throw new Error('A API não sincronizou a desativação do perfil.');
  }

  console.log('Integração da API administrativa concluída com sucesso.');
}

try {
  await main();
} finally {
  for (const child of children) child.kill('SIGTERM');
}
