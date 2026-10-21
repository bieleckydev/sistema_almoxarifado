/**
 * scripts/migrar-lotes-custo.mjs
 * Script utilitário para migração retrocompatível de itens no Firestore:
 * Garante que todos os itens possuam loteBase ("Saldo anterior") e custoUnitario (0 se indefinido).
 */
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('--- Iniciando verificação e migração de lotes e custo dos itens ---');

  if (getApps().length === 0) {
    // Inicialização via emulador ou credenciais padrão do Google Cloud
    initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'sistema-almoxarifado',
    });
  }

  const db = getFirestore();
  const itemsSnapshot = await db.collection('items').get();

  if (itemsSnapshot.empty) {
    console.log('Nenhum item encontrado no Firestore para migrar.');
    return;
  }

  let atualizados = 0;
  const batch = db.batch();

  itemsSnapshot.forEach((doc) => {
    const data = doc.data();
    const updates = {};

    if (data.loteBase === undefined) {
      updates.loteBase = (data.especificacoes && data.especificacoes.Lote) || 'Saldo anterior';
    }

    if (data.custoUnitario === undefined) {
      updates.custoUnitario = Number(data.custo) || 0;
    }

    if (data.capacidadeMaxima === undefined) {
      updates.capacidadeMaxima = Number(data.capacidade) || 100;
    }

    if (Object.keys(updates).length > 0) {
      batch.update(doc.ref, updates);
      atualizados++;
    }
  });

  if (atualizados > 0) {
    await batch.commit();
    console.log(`Migração concluída com sucesso! ${atualizados} itens atualizados com campos padrão.`);
  } else {
    console.log('Todos os itens já possuem loteBase e custoUnitario preenchidos.');
  }
}

main().catch((err) => {
  console.error('Erro na migração:', err);
  process.exit(1);
});
