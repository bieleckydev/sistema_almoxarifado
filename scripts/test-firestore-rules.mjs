import fs from 'node:fs/promises';
import process from 'node:process';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, addDoc, collection } from 'firebase/firestore';

const projectId = 'rhowert-a57af';
const rules = await fs.readFile(new URL('../firestore.rules', import.meta.url), 'utf8');
const testEnv = await initializeTestEnvironment({
  projectId,
  firestore: {
    host: '127.0.0.1',
    port: 8080,
    rules,
  },
});

const user = (id, role, email, ativo = true) => ({
  id,
  name: id,
  email,
  role,
  ativo,
  mustChangePassword: false,
});

async function seed() {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await Promise.all([
      setDoc(doc(db, 'users/mestre-1'), user('mestre-1', 'mestre', 'mestre@example.com')),
      setDoc(doc(db, 'users/admin-1'), user('admin-1', 'admin', 'admin@example.com')),
      setDoc(doc(db, 'users/operador-1'), user('operador-1', 'operador', 'operador@example.com')),
      setDoc(doc(db, 'users/requisitante-1'), user('requisitante-1', 'requisitante', 'req@example.com')),
      setDoc(doc(db, 'clients/client-1'), { id: 'client-1', nome: 'Cliente de teste' }),
      setDoc(doc(db, 'collaborators/collaborator-1'), {
        id: 'collaborator-1',
        nome: 'Colaborador de teste',
      }),
    ]);
  });
}

await seed();

try {
  const mestreDb = testEnv.authenticatedContext('mestre-1').firestore();
  const adminDb = testEnv.authenticatedContext('admin-1').firestore();
  const operadorDb = testEnv.authenticatedContext('operador-1').firestore();
  const requisitanteDb = testEnv.authenticatedContext('requisitante-1').firestore();
  const anonymousDb = testEnv.unauthenticatedContext().firestore();

  await assertSucceeds(getDoc(doc(adminDb, 'clients/client-1')));
  await assertSucceeds(getDoc(doc(operadorDb, 'clients/client-1')));
  await assertFails(getDoc(doc(requisitanteDb, 'clients/client-1')));
  await assertSucceeds(getDoc(doc(adminDb, 'collaborators/collaborator-1')));
  await assertSucceeds(getDoc(doc(operadorDb, 'collaborators/collaborator-1')));
  await assertFails(getDoc(doc(requisitanteDb, 'collaborators/collaborator-1')));

  await assertSucceeds(getDoc(doc(mestreDb, 'users/admin-1')));
  await assertFails(getDoc(doc(adminDb, 'users/requisitante-1')));
  await assertSucceeds(getDoc(doc(requisitanteDb, 'users/requisitante-1')));
  await assertFails(getDoc(doc(anonymousDb, 'users/requisitante-1')));

  await assertFails(updateDoc(doc(adminDb, 'users/requisitante-1'), { role: 'mestre' }));
  await assertFails(updateDoc(doc(mestreDb, 'users/mestre-1'), { role: 'admin' }));
  await assertFails(addDoc(collection(mestreDb, 'userAuditLogs'), {
    targetUserId: 'admin-1',
    performedBy: 'mestre-1',
    action: 'UPDATE',
    changedFields: ['name'],
    createdAt: new Date().toISOString(),
  }));

  await assertSucceeds(setDoc(doc(mestreDb, 'users/admin-1'), {
    ...user('admin-1', 'operador', 'admin@example.com'),
    updatedBy: 'mestre-1',
  }));
  await assertFails(setDoc(doc(mestreDb, 'unknownCollection/item-1'), { value: true }));

  console.log('Testes das regras Firestore concluídos com sucesso.');
} finally {
  await testEnv.cleanup();
}
