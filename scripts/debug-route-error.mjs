import { authenticateIdentity } from '../src/server/auth/identity.js';
import { FirestoreEstoqueRepository } from '../src/server/storage/firestore-estoque.repository.js';

console.log('Testing authenticateIdentity & FirestoreEstoqueRepository...');
try {
  const repo = new FirestoreEstoqueRepository();
  console.log('Testing repo.listarComFiltros...');
  const res = await repo.listarComFiltros({ limite: 5 });
  console.log('Success! Items found:', res.itens.length);
} catch (err) {
  console.error('Error during execution:', err);
}
