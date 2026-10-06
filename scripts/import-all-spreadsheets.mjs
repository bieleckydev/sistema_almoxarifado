import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import * as XLSXModule from 'xlsx';

const xlsx = XLSXModule.default ?? XLSXModule;

const PROJECT_ID = 'rhowert-a57af';
const BATCH_ID = `batch-${Date.now()}`;
const NOW = new Date().toISOString();

// Helper para ler token de autenticação local do Firebase CLI
function getAuthToken() {
  const configPath = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');
  if (!fs.existsSync(configPath)) {
    throw new Error('Configuração do Firebase CLI não encontrada em ' + configPath);
  }
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const token = config.tokens?.access_token;
  if (!token) {
    throw new Error('Token de acesso não encontrado no firebase-tools.json. Faça login no Firebase CLI.');
  }
  return token;
}

// Mapeamento de setores para catálogo do Core
const SECTOR_ALIASES = {
  FERRAMENTARIA: 'FERRAMENTARIA',
  QUALIDADE: 'QUALIDADE',
  LOGISTICA: 'LOGISTICA',
  LOGÍSTICA: 'LOGISTICA',
  CADEIRA: 'CADEIRA',
  MONTAGEM: 'MONTAGEM',
  SOLDA: 'SOLDA',
  USINAGEM: 'FERRAMENTARIA',
  DOBRA: 'MONTAGEM',
  PRENSA: 'MONTAGEM',
  ACABAMENTO: 'MONTAGEM',
  CORTE: 'FERRAMENTARIA',
  MANUTENCAO: 'FERRAMENTARIA',
  MANUTENÇÃO: 'FERRAMENTARIA',
};

function normalizeSector(val) {
  if (!val) return 'OUTRO';
  const clean = String(val).toUpperCase().trim();
  return SECTOR_ALIASES[clean] || 'OUTRO';
}

function normalizeMatricula(val) {
  const digits = String(val ?? '').replace(/\D/g, '');
  if (!digits) return '';
  return digits.length <= 3 ? digits.padStart(3, '0') : digits;
}

function normalizeUnit(unit) {
  if (!unit) return 'UNIDADE';
  const u = String(unit).trim().toUpperCase();
  if (['KG', 'QUILO', 'KILO'].includes(u)) return 'KG';
  if (['METRO', 'M', 'MT', 'MTS'].includes(u)) return 'METRO';
  if (['PACOTE', 'PCT'].includes(u)) return 'PACOTE';
  if (['PECA', 'PEÇA', 'PC', 'PÇ'].includes(u)) return 'PECA';
  if (['LITRO', 'L', 'LT'].includes(u)) return 'LITRO';
  return 'UNIDADE'; // UN, UND, UNID, RL, FD, Unit. -> UNIDADE
}

function determineTipoItem(codigo) {
  const upper = String(codigo).trim().toUpperCase();
  if (upper.startsWith('10-') || upper.startsWith('20-') || upper.startsWith('500-')) {
    return 'PRODUTIVO_MATERIA_PRIMA';
  }
  if (upper.startsWith('90-') || upper.startsWith('900-')) {
    return 'IMPRODUTIVO_CONSUMIVEL';
  }
  if (upper.startsWith('100-') || upper.startsWith('200-')) {
    return 'ACABADO';
  }
  return 'IMPRODUTIVO_CONSUMIVEL';
}

function generateItemId(codigo) {
  return `legacy-${codigo.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
}

function generateCollaboratorId(matricula) {
  return `legacy-${matricula}`;
}

export function extractAllData() {
  const itemsMap = new Map();
  const collaboratorsMap = new Map();

  // ==========================================
  // 1. PLANILHA DE MATERIAIS IMPRODUTIVOS
  // ==========================================
  const file1 = 'docs/excel/Cont. de Estoque Disco Flap, Mat. de Solda e Brocas.xlsx';
  const wb1 = xlsx.readFile(file1);

  // 1.1 Itens Improdutivos
  const sheetItens1 = xlsx.utils.sheet_to_json(wb1.Sheets['Tabela de ítens'], { header: 1 });
  // Linhas duplicadas para ignorar conforme decisão (mantendo linhas 25, 22, 36):
  const mergeIgnoreRows1 = new Set([71, 72, 74]); // 1-indexed (brocas duplicadas)

  sheetItens1.forEach((row, idx) => {
    const rowNum = idx + 1;
    if (rowNum < 4) return; // header
    if (mergeIgnoreRows1.has(rowNum)) return;

    const codigoRaw = row[0];
    const descRaw = row[1];
    if (!codigoRaw || !descRaw) return;

    const codigo = String(codigoRaw).trim().toUpperCase();
    const descricao = String(descRaw).trim();
    const estoqueSeguranca = typeof row[7] === 'number' ? row[7] : 0;
    const unidade = normalizeUnit(row[8]);

    const id = generateItemId(codigo);
    itemsMap.set(codigo, {
      id,
      codigo,
      descricao,
      tipo: determineTipoItem(codigo),
      unidade,
      estoqueAtual: 0,
      estoqueSeguranca,
      ativo: true,
      origem: `${path.basename(file1)}|Tabela de ítens|${rowNum}`,
      createdAt: NOW,
      updatedAt: NOW,
    });
  });

  // 1.2 Colaboradores
  const sheetColab1 = xlsx.utils.sheet_to_json(wb1.Sheets['Tabela de Colobaradores'], { header: 1 });
  sheetColab1.forEach((row, idx) => {
    const rowNum = idx + 1;
    if (rowNum < 4) return;
    if (rowNum === 56) return; // Bruno Monteiro duplicado (mantida linha 10)

    const matRaw = row[0];
    const nomeRaw = row[1];
    if (!matRaw || !nomeRaw) return;

    const matricula = normalizeMatricula(matRaw);
    const nome = String(nomeRaw).trim();
    const setor = normalizeSector(row[2]);
    const funcao = String(row[5] || row[3] || 'Não informado').trim();

    if (!collaboratorsMap.has(matricula)) {
      collaboratorsMap.set(matricula, {
        id: generateCollaboratorId(matricula),
        matricula,
        nome,
        setor,
        funcao,
        ativo: true,
        origem: `${path.basename(file1)}|Tabela de Colobaradores|${rowNum}`,
        createdAt: NOW,
        updatedAt: NOW,
      });
    }
  });

  // ==========================================
  // 2. PLANILHA DE CONTROLE DE PEÇAS ACABADAS
  // ==========================================
  const file2 = 'docs/excel/CONTROLE_PEÇAS 2026_ALMOXARIFADO_ATUALIZADA.xlsx';
  const wb2 = xlsx.readFile(file2);

  // 2.1 Peças Acabadas
  const sheetItens2 = xlsx.utils.sheet_to_json(wb2.Sheets['Tabela de ítens'], { header: 1 });
  sheetItens2.forEach((row, idx) => {
    const rowNum = idx + 1;
    if (rowNum < 4) return;

    const codigoRaw = row[0];
    const descRaw = row[1];
    if (!codigoRaw || !descRaw) return;

    const codigo = String(codigoRaw).trim().toUpperCase();
    const descricao = String(descRaw).trim();

    if (!itemsMap.has(codigo)) {
      itemsMap.set(codigo, {
        id: generateItemId(codigo),
        codigo,
        descricao,
        tipo: 'ACABADO',
        unidade: 'UNIDADE',
        estoqueAtual: 0,
        estoqueSeguranca: 0,
        ativo: true,
        origem: `${path.basename(file2)}|Tabela de ítens|${rowNum}`,
        createdAt: NOW,
        updatedAt: NOW,
      });
    }
  });

  // 2.2 Colaboradores complementares
  const sheetColab2 = xlsx.utils.sheet_to_json(wb2.Sheets['Tabela de Colobaradores'], { header: 1 });
  sheetColab2.forEach((row, idx) => {
    const rowNum = idx + 1;
    if (rowNum < 4) return;

    const matRaw = row[0];
    const nomeRaw = row[1];
    if (!matRaw || !nomeRaw) return;

    const matricula = normalizeMatricula(matRaw);
    const nome = String(nomeRaw).trim();
    const setor = normalizeSector(row[2]);
    const funcao = String(row[3] || 'Não informado').trim();

    if (!collaboratorsMap.has(matricula)) {
      collaboratorsMap.set(matricula, {
        id: generateCollaboratorId(matricula),
        matricula,
        nome,
        setor,
        funcao,
        ativo: true,
        origem: `${path.basename(file2)}|Tabela de Colobaradores|${rowNum}`,
        createdAt: NOW,
        updatedAt: NOW,
      });
    }
  });

  // ==========================================
  // 3. PLANILHA DE ESTOQUE 2026 (MATÉRIA-PRIMA)
  // ==========================================
  const file3 = 'docs/excel/ESTOQUE 2026.xlsx';
  const wb3 = xlsx.readFile(file3);
  const sheetItens3 = xlsx.utils.sheet_to_json(wb3.Sheets['JANEIRO'], { header: 1 });

  sheetItens3.forEach((row, idx) => {
    const rowNum = idx + 1;
    if (rowNum < 2) return; // header is row 1

    const codigoRaw = row[0];
    const descRaw = row[1];
    if (!codigoRaw || !descRaw) return;

    const codigo = String(codigoRaw).trim().toUpperCase();
    const descricao = String(descRaw).trim();
    const unidade = normalizeUnit(row[2]);
    // Saldo da última coluna 'TOTAL' ou 'INVENTÁRIO'
    const totalRaw = row[row.length - 1] ?? row[3];
    const estoqueAtual = typeof totalRaw === 'number' && !isNaN(totalRaw) ? Math.max(0, totalRaw) : 0;

    if (!itemsMap.has(codigo)) {
      itemsMap.set(codigo, {
        id: generateItemId(codigo),
        codigo,
        descricao,
        tipo: determineTipoItem(codigo),
        unidade,
        estoqueAtual,
        estoqueSeguranca: 0,
        ativo: true,
        origem: `${path.basename(file3)}|JANEIRO|${rowNum}`,
        createdAt: NOW,
        updatedAt: NOW,
      });
    } else {
      // Se já existia (ex: arame cadastrado em improdutivos), atualiza saldo
      const existing = itemsMap.get(codigo);
      if (estoqueAtual > 0 && existing.estoqueAtual === 0) {
        existing.estoqueAtual = estoqueAtual;
      }
    }
  });

  return {
    items: Array.from(itemsMap.values()),
    collaborators: Array.from(collaboratorsMap.values()),
    sources: [file1, file2, file3],
  };
}

// Converte objeto JavaScript para fields do Firestore REST API
function toFirestoreFields(obj) {
  const fields = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      fields[key] = { nullValue: null };
    } else if (typeof value === 'string') {
      fields[key] = { stringValue: value };
    } else if (typeof value === 'number') {
      if (Number.isInteger(value)) {
        fields[key] = { integerValue: String(value) };
      } else {
        fields[key] = { doubleValue: value };
      }
    } else if (typeof value === 'boolean') {
      fields[key] = { booleanValue: value };
    } else if (Array.isArray(value)) {
      fields[key] = {
        arrayValue: {
          values: value.map((v) => ({ stringValue: String(v) })),
        },
      };
    }
  }
  return fields;
}

// Executa commits atômicos em blocos de até 200 documentos
async function commitBatch(token, writes) {
  const commitUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:commit`;
  const response = await fetch(commitUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ writes }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Falha no commit do Firestore (HTTP ${response.status}): ${errText}`);
  }

  return response.json();
}

async function runImport() {
  console.log('--- Iniciando Extração e Estruturação de Todas as Planilhas ---');
  const { items, collaborators, sources } = extractAllData();

  console.log(`Itens extraídos e validados: ${items.length}`);
  console.log(`Colaboradores extraídos e validados: ${collaborators.length}`);

  const isDryRun = process.argv.includes('--dry-run');
  if (isDryRun) {
    console.log('Modo DRY-RUN concluído com sucesso. Nenhuma alteração gravada.');
    return;
  }

  console.log('\n--- Conectando ao Firestore do projeto: ' + PROJECT_ID + ' ---');
  const token = getAuthToken();

  const allWrites = [];

  // 1. Gravar registro do lote em importBatches
  const batchDocName = `projects/${PROJECT_ID}/databases/(default)/documents/importBatches/${BATCH_ID}`;
  allWrites.push({
    update: {
      name: batchDocName,
      fields: toFirestoreFields({
        batchId: BATCH_ID,
        status: 'COMPLETED',
        project: PROJECT_ID,
        executedAt: NOW,
        totalItemsImported: items.length,
        totalCollaboratorsImported: collaborators.length,
        sources: sources.map((s) => path.basename(s)),
      }),
    },
  });

  // 2. Gravar Itens na coleção items
  for (const item of items) {
    allWrites.push({
      update: {
        name: `projects/${PROJECT_ID}/databases/(default)/documents/items/${item.id}`,
        fields: toFirestoreFields(item),
      },
    });
  }

  // 3. Gravar Colaboradores na coleção collaborators
  for (const colab of collaborators) {
    allWrites.push({
      update: {
        name: `projects/${PROJECT_ID}/databases/(default)/documents/collaborators/${colab.id}`,
        fields: toFirestoreFields(colab),
      },
    });
  }

  console.log(`Total de documentos a persistir no Firestore: ${allWrites.length}`);

  // Enviar em blocos de até 200 gravações por commit
  const CHUNK_SIZE = 200;
  for (let i = 0; i < allWrites.length; i += CHUNK_SIZE) {
    const chunk = allWrites.slice(i, i + CHUNK_SIZE);
    const chunkNum = Math.floor(i / CHUNK_SIZE) + 1;
    const totalChunks = Math.ceil(allWrites.length / CHUNK_SIZE);
    process.stdout.write(`Gravando bloco ${chunkNum}/${totalChunks} (${chunk.length} documentos)... `);
    await commitBatch(token, chunk);
    console.log('OK');
  }

  console.log('\n✅ Importação concluída com sucesso para o Firestore!');
  console.log(`Lote registrado: ${BATCH_ID}`);
  console.log(`Coleções atualizadas: items (${items.length}), collaborators (${collaborators.length}), importBatches (1)`);
}

runImport().catch((err) => {
  console.error('\n❌ Erro durante a importação:', err.message);
  process.exit(1);
});
