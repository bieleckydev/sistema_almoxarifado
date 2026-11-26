import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryEstoqueRepository } from '@/core/storage/memory-estoque.adapter';
import { MemoryAuditoriaRepository } from '@/core/services/auditoria.service';
import {
  getAuditoriaService,
  setAuditoriaRepository,
  setEstoqueRepository,
  setIdentityAuthenticator,
} from '../api-helpers';
import type { AuthenticatedIdentity } from '@/server/auth/identity';
import { GET as getColaboradores, POST as postColaboradores } from '../colaboradores/route';
import { GET as getColaboradorById, PATCH as patchColaboradorById } from '../colaboradores/[id]/route';
import { GET as getColaboradorByMatricula } from '../colaboradores/matricula/[matricula]/route';

// Mocks de Identidade para RBAC
const mockAdminIdentity: AuthenticatedIdentity = {
  token: { uid: 'user-admin', role: 'admin' } as any,
  user: {
    id: 'user-admin',
    name: 'Admin Fábrica',
    email: 'admin@empresa.com',
    role: 'admin',
    ativo: true,
    mustChangePassword: false,
  },
};

const mockRequisitanteIdentity: AuthenticatedIdentity = {
  token: { uid: 'user-req', role: 'requisitante' } as any,
  user: {
    id: 'user-req',
    name: 'Operador Fábrica',
    email: 'operador@empresa.com',
    role: 'requisitante',
    ativo: true,
    mustChangePassword: false,
  },
};

const mockOperadorIdentity: AuthenticatedIdentity = {
  token: { uid: 'user-operador', role: 'operador' } as any,
  user: {
    id: 'user-operador',
    name: 'Operador Fábrica',
    email: 'operador@empresa.com',
    role: 'operador',
    ativo: true,
    mustChangePassword: false,
  },
};

describe('Fase 3 — Rotas de API de Colaboradores (/api/colaboradores)', () => {
  let memoryRepo: MemoryEstoqueRepository;

  beforeEach(async () => {
    memoryRepo = new MemoryEstoqueRepository();
    setEstoqueRepository(memoryRepo);
    setAuditoriaRepository(new MemoryAuditoriaRepository());
    setIdentityAuthenticator(async () => mockAdminIdentity);

    // Cadastra colaboradores de teste
    await memoryRepo.salvarColaborador({
      id: 'colab-1',
      matricula: '042',
      nome: 'Carlos Silva',
      funcao: 'Torneiro Mecânico',
      setor: 'FERRAMENTARIA',
      ativo: true,
      email: 'carlos@empresa.com',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await memoryRepo.salvarColaborador({
      id: 'colab-2',
      matricula: '105',
      nome: 'Mariana Souza',
      funcao: 'Soldadora MIG/TIG',
      setor: 'SOLDA',
      ativo: true,
      email: 'mariana@empresa.com',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });

  describe('GET /api/colaboradores', () => {
    it('deve listar colaboradores com sucesso', async () => {
      const request = new Request('http://localhost:3000/api/colaboradores');
      const response = await getColaboradores(request);

      assert.equal(response.status, 200);
      const data = await response.json();
      assert.equal(data.total, 2);
      assert.equal(data.colaboradores.length, 2);
    });

    it('deve negar leitura para usuário sem permissão de cadastros', async () => {
      setIdentityAuthenticator(async () => mockRequisitanteIdentity);

      const response = await getColaboradores(
        new Request('http://localhost:3000/api/colaboradores')
      );

      assert.equal(response.status, 403);
    });

    it('deve permitir leitura para operador com permissão de cadastros', async () => {
      setIdentityAuthenticator(async () => mockOperadorIdentity);
      const response = await getColaboradores(
        new Request('http://localhost:3000/api/colaboradores')
      );

      assert.equal(response.status, 200);
    });

    it('deve filtrar colaboradores por setor', async () => {
      const request = new Request('http://localhost:3000/api/colaboradores?setor=FERRAMENTARIA');
      const response = await getColaboradores(request);

      assert.equal(response.status, 200);
      const data = await response.json();
      assert.equal(data.total, 1);
      assert.equal(data.colaboradores[0].matricula, '042');
    });

    it('deve filtrar colaboradores por busca textual', async () => {
      const request = new Request('http://localhost:3000/api/colaboradores?busca=Mariana');
      const response = await getColaboradores(request);

      assert.equal(response.status, 200);
      const data = await response.json();
      assert.equal(data.total, 1);
      assert.equal(data.colaboradores[0].matricula, '105');
    });
  });

  describe('POST /api/colaboradores', () => {
    it('deve criar um novo colaborador com sucesso quando usuário for admin', async () => {
      const request = new Request('http://localhost:3000/api/colaboradores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matricula: '99', // Deve ser normalizada para '099'
          nome: 'Roberto Dias',
          funcao: 'Inspetor de Qualidade',
          setor: 'QUALIDADE',
        }),
      });

      const response = await postColaboradores(request);
      assert.equal(response.status, 201);
      const criado = await response.json();

      assert.equal(criado.matricula, '099');
      assert.equal(criado.nome, 'Roberto Dias');
      assert.ok(criado.id);

      // Verificar persistência no repositório
      const noBanco = await memoryRepo.buscarColaboradorPorId('099');
      assert.ok(noBanco);
      assert.equal(noBanco.nome, 'Roberto Dias');
    });

    it('deve impedir criação por usuário requisitante (403 Forbidden)', async () => {
      setIdentityAuthenticator(async () => mockRequisitanteIdentity);

      const request = new Request('http://localhost:3000/api/colaboradores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matricula: '200',
          nome: 'Invasor Tentativa',
          funcao: 'Operador',
          setor: 'OUTRO',
        }),
      });

      const response = await postColaboradores(request);
      assert.equal(response.status, 403);
    });

    it('deve rejeitar matrícula duplicada (409 Conflict)', async () => {
      const request = new Request('http://localhost:3000/api/colaboradores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matricula: '42', // Equivalente a '042' que já existe
          nome: 'Carlos Clone',
          funcao: 'Ajudante',
          setor: 'FERRAMENTARIA',
        }),
      });

      const response = await postColaboradores(request);
      assert.equal(response.status, 409);
      const data = await response.json();
      assert.ok(data.error.includes('Já existe um colaborador cadastrado com a matrícula'));
    });

    it('deve rejeitar payload inválido (400 Bad Request)', async () => {
      const request = new Request('http://localhost:3000/api/colaboradores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matricula: 'letras',
          nome: 'A', // curto demais
        }),
      });

      const response = await postColaboradores(request);
      assert.equal(response.status, 400);
    });
  });

  describe('GET /api/colaboradores/[id]', () => {
    it('deve retornar colaborador por ID único', async () => {
      const request = new Request('http://localhost:3000/api/colaboradores/colab-1');
      const response = await getColaboradorById(request, {
        params: Promise.resolve({ id: 'colab-1' }),
      });

      assert.equal(response.status, 200);
      const colab = await response.json();
      assert.equal(colab.id, 'colab-1');
      assert.equal(colab.nome, 'Carlos Silva');
    });

    it('deve negar leitura por ID sem permissão de cadastros', async () => {
      setIdentityAuthenticator(async () => mockRequisitanteIdentity);
      const response = await getColaboradorById(
        new Request('http://localhost:3000/api/colaboradores/colab-1'),
        { params: Promise.resolve({ id: 'colab-1' }) }
      );

      assert.equal(response.status, 403);
    });

    it('deve retornar 404 para ID inexistente', async () => {
      const request = new Request('http://localhost:3000/api/colaboradores/colab-fantasma');
      const response = await getColaboradorById(request, {
        params: Promise.resolve({ id: 'colab-fantasma' }),
      });

      assert.equal(response.status, 404);
    });
  });

  describe('PATCH /api/colaboradores/[id]', () => {
    it('deve atualizar campos cadastrais com sucesso', async () => {
      const request = new Request('http://localhost:3000/api/colaboradores/colab-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          funcao: 'Líder de Ferramentaria',
          telefone: '(11) 98888-7777',
        }),
      });

      const response = await patchColaboradorById(request, {
        params: Promise.resolve({ id: 'colab-1' }),
      });

      assert.equal(response.status, 200);
      const atualizado = await response.json();
      assert.equal(atualizado.funcao, 'Líder de Ferramentaria');
      assert.equal(atualizado.telefone, '(11) 98888-7777');
    });

    it('deve rejeitar alteração para matrícula duplicada de outro colaborador (409 Conflict)', async () => {
      const request = new Request('http://localhost:3000/api/colaboradores/colab-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matricula: '105', // Pertence a Mariana (colab-2)
        }),
      });

      const response = await patchColaboradorById(request, {
        params: Promise.resolve({ id: 'colab-1' }),
      });

      assert.equal(response.status, 409);
      const data = await response.json();
      assert.ok(data.error.includes('Já existe outro colaborador'));
    });

    it('deve retornar 403 Forbidden se usuário não tiver permissão catalog:manage', async () => {
      setIdentityAuthenticator(async () => mockRequisitanteIdentity);

      const request = new Request('http://localhost:3000/api/colaboradores/colab-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ funcao: 'Tentativa Requisitante' }),
      });

      const response = await patchColaboradorById(request, {
        params: Promise.resolve({ id: 'colab-1' }),
      });

      assert.equal(response.status, 403);
    });

    const patchColab = (id: string, body: unknown) =>
      patchColaboradorById(
        new Request(`http://localhost:3000/api/colaboradores/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }),
        { params: Promise.resolve({ id }) }
      );

    it('deve inativar e reativar colaborador registrando auditoria', async () => {
      const inativar = await patchColab('colab-1', { ativo: false });
      assert.equal(inativar.status, 200);
      assert.equal((await inativar.json()).ativo, false);

      const reativar = await patchColab('colab-1', { ativo: true });
      assert.equal(reativar.status, 200);
      assert.equal((await reativar.json()).ativo, true);

      const acoes = (await getAuditoriaService().listar({})).map((e) => e.acao);
      assert.ok(acoes.includes('INATIVAR_COLABORADOR'));
      assert.ok(acoes.includes('REATIVAR_COLABORADOR'));
    });

    it('não deve reativar colaborador inativo ao editar outro campo', async () => {
      await patchColab('colab-1', { ativo: false });
      const response = await patchColab('colab-1', { funcao: 'Torneiro CNC' });
      assert.equal(response.status, 200);
      const data = await response.json();
      assert.equal(data.funcao, 'Torneiro CNC');
      assert.equal(data.ativo, false);
    });

    it('deve rejeitar corpo sem campos', async () => {
      const response = await patchColab('colab-1', {});
      assert.equal(response.status, 400);
    });

    it('deve listar apenas inativos quando apenasInativos=true', async () => {
      await patchColab('colab-2', { ativo: false });
      const response = await getColaboradores(
        new Request('http://localhost:3000/api/colaboradores?apenasInativos=true')
      );
      assert.equal(response.status, 200);
      const data = await response.json();
      assert.equal(data.total, 1);
      assert.equal(data.colaboradores[0].id, 'colab-2');
    });
  });

  describe('GET /api/colaboradores/matricula/[matricula]', () => {
    it('deve buscar colaborador por matrícula com normalização (ex: "42" -> "042")', async () => {
      const request = new Request('http://localhost:3000/api/colaboradores/matricula/42');
      const response = await getColaboradorByMatricula(request, {
        params: Promise.resolve({ matricula: '42' }),
      });

      assert.equal(response.status, 200);
      const colab = await response.json();
      assert.equal(colab.matricula, '042');
      assert.equal(colab.nome, 'Carlos Silva');
    });

    it('deve negar busca por matrícula sem permissão de cadastros', async () => {
      setIdentityAuthenticator(async () => mockRequisitanteIdentity);
      const response = await getColaboradorByMatricula(
        new Request('http://localhost:3000/api/colaboradores/matricula/42'),
        { params: Promise.resolve({ matricula: '42' }) }
      );

      assert.equal(response.status, 403);
    });

    it('deve retornar 404 para matrícula inexistente', async () => {
      const request = new Request('http://localhost:3000/api/colaboradores/matricula/999');
      const response = await getColaboradorByMatricula(request, {
        params: Promise.resolve({ matricula: '999' }),
      });

      assert.equal(response.status, 404);
    });
  });
});
