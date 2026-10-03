import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryStorageAdapter } from '../memory-storage.adapter';

describe('5.2 — Adaptador de Persistência em Memória/Cache (MemoryStorageAdapter)', () => {
  let adapter: MemoryStorageAdapter;

  beforeEach(() => {
    adapter = new MemoryStorageAdapter();
  });

  it('deve armazenar, recuperar e remover valores de texto (chave-valor)', async () => {
    // Inicialmente vazio
    const valorInicial = await adapter.getItem('chave_inexistente');
    assert.equal(valorInicial, null);

    // Gravação
    await adapter.setItem('auth_token', 'jwt-token-123456');
    const valorGravado = await adapter.getItem('auth_token');
    assert.equal(valorGravado, 'jwt-token-123456');

    // Remoção
    await adapter.removeItem('auth_token');
    const valorAposRemocao = await adapter.getItem('auth_token');
    assert.equal(valorAposRemocao, null);
  });

  it('deve inicializar com dados pré-carregados', async () => {
    const preCarregado = new MemoryStorageAdapter({
      tenantId: 'almoxarifado-rhowert',
      ambiente: 'producao',
    });

    assert.equal(await preCarregado.getItem('tenantId'), 'almoxarifado-rhowert');
    assert.equal(await preCarregado.getItem('ambiente'), 'producao');
    assert.equal(preCarregado.size, 2);
  });

  it('deve listar todas as chaves e limpar o armazenamento completamente', async () => {
    await adapter.setItem('k1', 'v1');
    await adapter.setItem('k2', 'v2');
    await adapter.setItem('k3', 'v3');

    const chaves = await adapter.getAllKeys();
    assert.equal(chaves.length, 3);
    assert.ok(chaves.includes('k1'));
    assert.ok(chaves.includes('k2'));
    assert.ok(chaves.includes('k3'));
    assert.equal(adapter.size, 3);

    // Limpeza
    await adapter.clear();
    assert.equal(adapter.size, 0);
    assert.equal((await adapter.getAllKeys()).length, 0);
    assert.equal(await adapter.getItem('k1'), null);
  });

  it('deve serializar e deserializar objetos JSON tipados com segurança', async () => {
    interface SessaoUsuario {
      matricula: string;
      setor: string;
      permissoes: string[];
    }

    const sessaoMock: SessaoUsuario = {
      matricula: '042',
      setor: 'SOLDA',
      permissoes: ['BAIXA_RAPIDA', 'CONSULTA_ESTOQUE'],
    };

    await adapter.setJson('sessao_ativa', sessaoMock);

    const sessaoRecuperada = await adapter.getJson<SessaoUsuario>('sessao_ativa');
    assert.notEqual(sessaoRecuperada, null);
    assert.equal(sessaoRecuperada?.matricula, '042');
    assert.equal(sessaoRecuperada?.setor, 'SOLDA');
    assert.deepEqual(sessaoRecuperada?.permissoes, ['BAIXA_RAPIDA', 'CONSULTA_ESTOQUE']);

    // Retorna null para chave inexistente
    const naoExiste = await adapter.getJson('chave_falsa');
    assert.equal(naoExiste, null);

    // Retorna null com resiliência caso o dado em string não seja JSON válido
    await adapter.setItem('dado_corrompido', '{json-invalido...');
    const corrompido = await adapter.getJson('dado_corrompido');
    assert.equal(corrompido, null);
  });
});
