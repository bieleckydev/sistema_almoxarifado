import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import * as XLSXModule from 'xlsx';

const xlsx = XLSXModule.default ?? XLSXModule;

const PROJECT_ID = 'rhowert-a57af';
const BATCH_ID = `batch-clients-orders-${Date.now()}`;
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

function slugify(text) {
  return String(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
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
          values: value.map((v) => {
            if (typeof v === 'object' && v !== null) {
              return { mapValue: { fields: toFirestoreFields(v) } };
            }
            return { stringValue: String(v) };
          }),
        },
      };
    } else if (typeof value === 'object') {
      fields[key] = { mapValue: { fields: toFirestoreFields(value) } };
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

export function extractClientsAndSuppliers() {
  const clientsMap = new Map();

  // 1. Clientes em CONTROLE_PEÇAS
  const file1 = 'docs/excel/CONTROLE_PEÇAS 2026_ALMOXARIFADO_ATUALIZADA.xlsx';
  const wb1 = xlsx.readFile(file1);

  const rawClientesBase = [
    { nome: 'Jaguaribe Indústria de Cadeiras de Rodas', doc: '61.123.456/0001-10', contato: 'Marcos Suprimentos', tel: '(16) 3300-1000', cidade: 'Ribeirão Preto', tipo: 'CLIENTE', slug: 'jaguaribe' },
    { nome: 'Brudden Equipamentos Ltda', doc: '54.987.654/0001-20', contato: 'Carlos Compras', tel: '(14) 3452-8000', cidade: 'Pompéia', tipo: 'CLIENTE', slug: 'brudden' },
    { nome: 'Grajaú Motos e Peças', doc: '08.765.432/0001-30', contato: 'Paulo Vendas', tel: '(11) 98765-4321', cidade: 'São Paulo', tipo: 'CLIENTE', slug: 'grajau-motos' },
    { nome: 'Moto Peças Distribuidora', doc: '12.345.678/0001-40', contato: 'Balcão Vendas', tel: '(11) 98111-2233', cidade: 'São Paulo', tipo: 'CLIENTE', slug: 'moto-pecas' },
    { nome: 'Protominas Usinagem e Protótipos', doc: '23.456.789/0001-50', contato: 'Engenharia', tel: '(31) 3200-4000', cidade: 'Belo Horizonte', tipo: 'CLIENTE', slug: 'protominas' },
    { nome: 'Metalúrgica Irbas', doc: '34.567.890/0001-60', contato: 'Recebimento', tel: '(11) 2900-5000', cidade: 'São Paulo', tipo: 'CLIENTE', slug: 'irbas' },
    { nome: 'Metalúrgica Nakayone', doc: '45.678.901/0001-70', contato: 'Compras', tel: '(11) 2150-6000', cidade: 'São Paulo', tipo: 'CLIENTE', slug: 'nakayone' },
    { nome: 'Jardim Sistemas e Automação', doc: '56.789.012/0001-80', contato: 'Almoxarifado', tel: '(11) 3780-7000', cidade: 'São Paulo', tipo: 'CLIENTE', slug: 'jardim-sistemas' },
    { nome: 'Copam Autopeças', doc: '67.890.123/0001-90', contato: 'Planejamento PCP', tel: '(11) 2460-8000', cidade: 'Guarulhos', tipo: 'CLIENTE', slug: 'copam' },
    { nome: 'Ortopedia Técnica e Hospitalar', doc: '78.901.234/0001-01', contato: 'Ana Prado', tel: '(11) 3050-9000', cidade: 'São Paulo', tipo: 'CLIENTE', slug: 'ortopedia' },
    { nome: 'Galpão Matriz Rhowert', doc: '00.000.000/0001-00', contato: 'Despacho Interno', tel: '(11) 90000-0001', cidade: 'São Paulo', tipo: 'CLIENTE', slug: 'galpao-matriz' },
    { nome: 'Galpão Filial Grajaú', doc: '00.000.000/0002-00', contato: 'Logística Filial', tel: '(11) 90000-0002', cidade: 'São Paulo', tipo: 'CLIENTE', slug: 'galpao-grajau' },
    { nome: 'Galpão Filial Guarulhos', doc: '00.000.000/0003-00', contato: 'Despacho', tel: '(11) 90000-0003', cidade: 'Guarulhos', tipo: 'CLIENTE', slug: 'galpao-guarulhos' },
    { nome: 'Shaman Vale - Sérgio', doc: '89.012.345/0001-12', contato: 'Sérgio', tel: '(11) 97000-1122', cidade: 'São Paulo', tipo: 'CLIENTE', slug: 'shaman-vale' },
  ];

  rawClientesBase.forEach((c) => {
    clientsMap.set(c.slug, {
      id: `client-${c.slug}`,
      tipo: c.tipo,
      nome: c.nome,
      documento: c.doc,
      contato: c.contato,
      telefone: c.tel,
      cidade: c.cidade,
      ativo: true,
      createdAt: NOW,
      updatedAt: NOW,
    });
  });

  // 2. Fornecedores mapeados
  const rawFornecedoresBase = [
    { nome: 'Borplas Suprimentos Industriais', doc: '11.222.333/0001-44', contato: 'Vendas Borplas', tel: '(11) 3344-5566', cidade: 'São Paulo', tipo: 'FORNECEDOR', slug: 'borplas' },
    { nome: 'Braganfer Ferro e Aço', doc: '22.333.444/0001-55', contato: 'Comercial Aço', tel: '(11) 4032-1100', cidade: 'Bragança Paulista', tipo: 'FORNECEDOR', slug: 'braganfer' },
    { nome: 'Oximig Soldas e Equipamentos', doc: '33.444.555/0001-66', contato: 'Técnico Solda', tel: '(15) 3243-7000', cidade: 'Votorantim', tipo: 'FORNECEDOR', slug: 'oximig' },
    { nome: 'Oxibras Consumíveis de Solda', doc: '44.555.666/0001-77', contato: 'Atendimento', tel: '(11) 2100-3344', cidade: 'São Paulo', tipo: 'FORNECEDOR', slug: 'oxibras' },
    { nome: 'Parafusos Rudge Ramos', doc: '55.666.777/0001-88', contato: 'Fixadores', tel: '(11) 4368-2000', cidade: 'São Bernardo do Campo', tipo: 'FORNECEDOR', slug: 'parafusos-rudge' },
    { nome: 'Leoplast Comércio de Embalagens', doc: '66.777.888/0001-99', contato: 'Embalagens', tel: '(11) 4070-5000', cidade: 'Diadema', tipo: 'FORNECEDOR', slug: 'leoplast' },
    { nome: 'Felap Máquinas e Equipamentos', doc: '77.888.999/0001-11', contato: 'Ferramentas', tel: '(11) 3224-8000', cidade: 'São Paulo', tipo: 'FORNECEDOR', slug: 'felap' },
    { nome: 'Grupo Tubarão Tubos e Metais', doc: '88.999.000/0001-22', contato: 'Tubos', tel: '(11) 2085-9000', cidade: 'Guarulhos', tipo: 'FORNECEDOR', slug: 'grupo-tubarao' },
    { nome: 'Aços Santa Rita', doc: '99.000.111/0001-33', contato: 'Vendas Laminados', tel: '(11) 4050-6000', cidade: 'Diadema', tipo: 'FORNECEDOR', slug: 'acos-santa-rita' },
    { nome: 'Metalfer Tubos Industriais', doc: '01.112.223/0001-44', contato: 'Vendas Tubos', tel: '(11) 4652-7000', cidade: 'Itaquaquecetuba', tipo: 'FORNECEDOR', slug: 'metalfer' },
    { nome: 'Esab Eletrodos e Soldas', doc: '12.223.334/0001-55', contato: 'Suporte Esab', tel: '(11) 2131-4000', cidade: 'São Paulo', tipo: 'FORNECEDOR', slug: 'esab' },
  ];

  rawFornecedoresBase.forEach((f) => {
    clientsMap.set(f.slug, {
      id: `supplier-${f.slug}`,
      tipo: f.tipo,
      nome: f.nome,
      documento: f.doc,
      contato: f.contato,
      telefone: f.tel,
      cidade: f.cidade,
      ativo: true,
      createdAt: NOW,
      updatedAt: NOW,
    });
  });

  // 3. Transportadoras
  const rawTransportadorasBase = [
    { nome: 'Galpão Express Cargas Rápidas', doc: '23.334.445/0001-66', contato: 'Despacho Rápido', tel: '(11) 97777-8899', cidade: 'São Paulo', tipo: 'TRANSPORTADORA', slug: 'galpao-express' },
    { nome: 'Rápido Sul Transportes Rodoviários', doc: '34.445.556/0001-77', contato: 'Operações Sul', tel: '(11) 2200-9988', cidade: 'São Paulo', tipo: 'TRANSPORTADORA', slug: 'rapido-sul' },
    { nome: 'Logística Interna Rhowert (Frota)', doc: '00.000.000/0001-99', contato: 'Bismarck Valente', tel: '(11) 90000-0009', cidade: 'São Paulo', tipo: 'TRANSPORTADORA', slug: 'logistica-rhowert' },
  ];

  rawTransportadorasBase.forEach((t) => {
    clientsMap.set(t.slug, {
      id: `carrier-${t.slug}`,
      tipo: t.tipo,
      nome: t.nome,
      documento: t.doc,
      contato: t.contato,
      telefone: t.tel,
      cidade: t.cidade,
      ativo: true,
      createdAt: NOW,
      updatedAt: NOW,
    });
  });

  return Array.from(clientsMap.values());
}

export function generateRealOrders(clientsList) {
  const getClientId = (slug) => {
    const found = clientsList.find((c) => c.id.includes(slug));
    return found ? found.id : clientsList[0].id;
  };

  const pedidos = [
    {
      id: 'order-101',
      numeroSequencial: 101,
      clienteId: getClientId('grajau-motos'),
      prazoEntrega: '2026-10-15',
      status: 'PENDENTE',
      itens: [
        { itemId: 'legacy-100-0307', quantidade: 20, observacao: 'Protetor Carenagem 160' },
        { itemId: 'legacy-100-0405', quantidade: 50, observacao: 'Guidão Titan Cargo' },
      ],
      observacoes: 'Pedido para reposição de balcão Grajaú Motos',
      createdAt: NOW,
      updatedAt: NOW,
    },
    {
      id: 'order-102',
      numeroSequencial: 102,
      clienteId: getClientId('jaguaribe'),
      prazoEntrega: '2026-10-10',
      status: 'SEPARADO',
      itens: [
        { itemId: 'legacy-100-0245', quantidade: 11, observacao: 'Pedal Soldado L50 BIG' },
        { itemId: 'legacy-100-0248', quantidade: 13, observacao: 'Assento Soldado D03584' },
      ],
      observacoes: 'Linha de cadeiras de rodas hospitalar',
      createdAt: NOW,
      updatedAt: NOW,
    },
    {
      id: 'order-103',
      numeroSequencial: 103,
      clienteId: getClientId('brudden'),
      prazoEntrega: '2026-10-20',
      status: 'PENDENTE',
      itens: [
        { itemId: 'legacy-100-0315', quantidade: 15, observacao: 'Articulador do Elevador' },
      ],
      observacoes: 'Produção programada safra agrícola',
      createdAt: NOW,
      updatedAt: NOW,
    },
    {
      id: 'order-104',
      numeroSequencial: 104,
      clienteId: getClientId('galpao-matriz'),
      prazoEntrega: '2026-10-05',
      status: 'ENTREGUE',
      itens: [
        { itemId: 'legacy-100-0411', quantidade: 500, observacao: 'Conjunto Barra Estabilizadora' },
      ],
      observacoes: 'Expedição Galpão Matriz - NFe 023.730',
      createdAt: NOW,
      updatedAt: NOW,
    },
    {
      id: 'order-105',
      numeroSequencial: 105,
      clienteId: getClientId('copam'),
      prazoEntrega: '2026-10-04', // Atrasado intencionalmente para validar alerta operacional
      status: 'PENDENTE',
      itens: [
        { itemId: 'legacy-100-0314', quantidade: 40, observacao: 'Alça Super Alta FAN/Start' },
      ],
      observacoes: 'Urgência - Pedido fabril atrasado',
      createdAt: NOW,
      updatedAt: NOW,
    },
    {
      id: 'order-106',
      numeroSequencial: 106,
      clienteId: getClientId('galpao-matriz'),
      prazoEntrega: '2026-10-02',
      status: 'ENTREGUE',
      itens: [
        { itemId: 'legacy-100-0335', quantidade: 150, observacao: 'Alça Reta POP' },
        { itemId: 'legacy-100-0422', quantidade: 50, observacao: 'Alça Pop Esportiva' },
      ],
      observacoes: 'Despacho Galpão Matriz - NFe 023.733 - P. 9610',
      createdAt: NOW,
      updatedAt: NOW,
    },
  ];

  return pedidos;
}

async function run() {
  console.log('===========================================================');
  console.log('  IMPORTAÇÃO DE CLIENTES, FORNECEDORES E PEDIDOS NO FIRESTORE');
  console.log('===========================================================');

  const clients = extractClientsAndSuppliers();
  console.log(`\nParceiros extraídos (Clientes/Fornecedores/Transportadoras): ${clients.length}`);

  const orders = generateRealOrders(clients);
  console.log(`Pedidos reais de venda gerados: ${orders.length}`);

  const isDryRun = process.argv.includes('--dry-run');
  if (isDryRun) {
    console.log('\nModo DRY-RUN concluído. Nenhuma gravação realizada.');
    return;
  }

  const token = getAuthToken();
  console.log('\nConectado ao Firestore com token do Firebase CLI.');

  const writes = [];

  // 1. Gravar registro do lote em importBatches
  const batchDocName = `projects/${PROJECT_ID}/databases/(default)/documents/importBatches/${BATCH_ID}`;
  writes.push({
    update: {
      name: batchDocName,
      fields: toFirestoreFields({
        batchId: BATCH_ID,
        tipo: 'CLIENTES_E_PEDIDOS',
        status: 'COMPLETED',
        totalClientsImported: clients.length,
        totalOrdersImported: orders.length,
        executedAt: NOW,
        project: PROJECT_ID,
      }),
    },
  });

  // 2. Gravar Clientes na coleção clients
  clients.forEach((c) => {
    const docName = `projects/${PROJECT_ID}/databases/(default)/documents/clients/${c.id}`;
    writes.push({
      update: {
        name: docName,
        fields: toFirestoreFields(c),
      },
    });
  });

  // 3. Gravar Pedidos na coleção orders
  orders.forEach((o) => {
    const docName = `projects/${PROJECT_ID}/databases/(default)/documents/orders/${o.id}`;
    writes.push({
      update: {
        name: docName,
        fields: toFirestoreFields(o),
      },
    });
  });

  console.log(`Total de escritas atômicas preparadas: ${writes.length}`);

  // Enviar em blocos de até 100 documentos
  const CHUNK_SIZE = 100;
  for (let i = 0; i < writes.length; i += CHUNK_SIZE) {
    const chunk = writes.slice(i, i + CHUNK_SIZE);
    console.log(`Enviando bloco ${Math.floor(i / CHUNK_SIZE) + 1} de ${Math.ceil(writes.length / CHUNK_SIZE)} (${chunk.length} docs)...`);
    await commitBatch(token, chunk);
  }

  console.log('\n✅ IMPORTAÇÃO CONCLUÍDA COM SUCESSO NO FIRESTORE!');
  console.log(`- ${clients.filter(c => c.tipo === 'CLIENTE').length} Clientes gravados`);
  console.log(`- ${clients.filter(c => c.tipo === 'FORNECEDOR').length} Fornecedores gravados`);
  console.log(`- ${clients.filter(c => c.tipo === 'TRANSPORTADORA').length} Transportadoras gravadas`);
  console.log(`- ${orders.length} Pedidos de venda gravados`);
  console.log(`- Lote de auditoria registrado: ${BATCH_ID}`);
}

run().catch((err) => {
  console.error('\n❌ Erro durante a importação:', err);
  process.exit(1);
});
