import { E2E, type UsuarioE2E } from './ambiente';

const docsUrl = `${E2E.firestoreUrl}/v1/projects/${E2E.projectId}/databases/(default)/documents`;
// "Bearer owner" é o token administrativo do emulador: ignora as regras de segurança.
const ADMIN = { authorization: 'Bearer owner', 'content-type': 'application/json' };

async function requisitar(url: string, init: RequestInit = {}): Promise<unknown> {
  const res = await fetch(url, init);
  const corpo = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`${init.method ?? 'GET'} ${url}: ${res.status} ${JSON.stringify(corpo)}`);
  return corpo;
}

/** Apaga todas as contas e documentos dos emuladores. */
export async function limparEmuladores(): Promise<void> {
  await requisitar(`${E2E.authUrl}/emulator/v1/projects/${E2E.projectId}/accounts`, { method: 'DELETE' });
  await requisitar(`${E2E.firestoreUrl}/emulator/v1/projects/${E2E.projectId}/databases/(default)/documents`, {
    method: 'DELETE',
  });
}

type ValorFirestore = string | number | boolean;

function campo(valor: ValorFirestore): Record<string, unknown> {
  if (typeof valor === 'boolean') return { booleanValue: valor };
  if (typeof valor === 'number') {
    return Number.isInteger(valor) ? { integerValue: String(valor) } : { doubleValue: valor };
  }
  return { stringValue: valor };
}

/** Grava um documento diretamente no emulador do Firestore. */
export async function gravarDocumento(
  colecao: string,
  id: string,
  dados: Record<string, ValorFirestore>
): Promise<void> {
  const fields = Object.fromEntries(Object.entries(dados).map(([k, v]) => [k, campo(v)]));
  await requisitar(`${docsUrl}/${colecao}/${id}`, { method: 'PATCH', headers: ADMIN, body: JSON.stringify({ fields }) });
}

/** Cria a conta no emulador do Auth e o perfil correspondente em `users`. */
export async function criarUsuario(usuario: UsuarioE2E): Promise<string> {
  const conta = (await requisitar(
    `${E2E.authUrl}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-api-key`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: usuario.email, password: usuario.senha, returnSecureToken: true }),
    }
  )) as { localId: string };

  const agora = new Date().toISOString();
  await requisitar(`${docsUrl}/users/${conta.localId}`, {
    method: 'PATCH',
    headers: ADMIN,
    body: JSON.stringify({
      fields: {
        id: { stringValue: conta.localId },
        name: { stringValue: usuario.nome },
        email: { stringValue: usuario.email },
        role: { stringValue: usuario.papel },
        ativo: { booleanValue: true },
        mustChangePassword: { booleanValue: false },
        createdAt: { timestampValue: agora },
        updatedAt: { timestampValue: agora },
      },
    }),
  });
  return conta.localId;
}
