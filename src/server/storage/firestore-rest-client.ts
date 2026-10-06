/**
 * Cliente REST resiliente do Firestore.
 * Permite que o backend consulte o Firestore em nome do usuário autenticado
 * utilizando o Firebase ID Token (Bearer), sem depender de credenciais privadas de Service Account.
 */

export function parseFirestoreRestValue(val: unknown): unknown {
  if (!val || typeof val !== 'object') return undefined;
  const v = val as Record<string, unknown>;

  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return parseInt(v.integerValue as string, 10);
  if ('doubleValue' in v) return parseFloat(v.doubleValue as string);
  if ('booleanValue' in v) return v.booleanValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('nullValue' in v) return null;
  if ('mapValue' in v) {
    const fields = ((v.mapValue as Record<string, unknown>)?.fields as Record<string, unknown>) || {};
    const res: Record<string, unknown> = {};
    for (const [k, valItem] of Object.entries(fields)) {
      res[k] = parseFirestoreRestValue(valItem);
    }
    return res;
  }
  if ('arrayValue' in v) {
    const values = ((v.arrayValue as Record<string, unknown>)?.values as unknown[]) || [];
    return values.map(parseFirestoreRestValue);
  }
  return undefined;
}

export function parseFirestoreRestDoc<T = Record<string, unknown>>(doc: {
  name: string;
  fields?: Record<string, unknown>;
}): T {
  const docId = doc.name ? doc.name.split('/').pop() || '' : '';
  const result: Record<string, unknown> = { id: docId };

  if (doc.fields) {
    for (const [key, value] of Object.entries(doc.fields)) {
      result[key] = parseFirestoreRestValue(value);
    }
  }

  return result as T;
}

export async function fetchFirestoreCollectionRest<T = Record<string, unknown>>(
  collection: string,
  token: string,
  projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'rhowert-a57af'
): Promise<T[]> {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}?pageSize=300`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Falha ao consultar Firestore REST (${response.status}): ${response.statusText}`);
  }

  const data = (await response.json()) as { documents?: Array<{ name: string; fields?: Record<string, unknown> }> };
  if (!data.documents || !Array.isArray(data.documents)) {
    return [];
  }

  return data.documents.map((d) => parseFirestoreRestDoc<T>(d));
}
