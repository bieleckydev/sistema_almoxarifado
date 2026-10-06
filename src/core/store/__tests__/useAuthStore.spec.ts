import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { useAuthStore } from '../useAuthStore';

describe('useAuthStore — Gestão de Sessão e Autenticação', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isInitialized: false,
      isLoading: false,
      error: null,
    });
  });

  it('deve inicializar com valores padrão deslogados', () => {
    const state = useAuthStore.getState();
    assert.equal(state.user, null);
    assert.equal(state.isAuthenticated, false);
    assert.equal(state.isLoading, false);
    assert.equal(state.error, null);
  });

  it('deve limpar erro com clearError()', () => {
    useAuthStore.setState({ error: 'Erro de teste' });
    assert.equal(useAuthStore.getState().error, 'Erro de teste');

    useAuthStore.getState().clearError();
    assert.equal(useAuthStore.getState().error, null);
  });

  it('deve resetar o estado ao chamar logout()', async () => {
    useAuthStore.setState({
      user: {
        id: 'user-1',
        name: 'Mestre Almoxarife',
        email: 'mestre@empresa.com.br',
        role: 'mestre',
        ativo: true,
        mustChangePassword: false,
      },
      token: 'jwt-token-fake',
      isAuthenticated: true,
    });

    await useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    assert.equal(state.user, null);
    assert.equal(state.token, null);
    assert.equal(state.isAuthenticated, false);
    assert.equal(state.error, null);
  });

  it('deve lançar erro corporativo amigável em caso de credenciais inválidas', async () => {
    await assert.rejects(
      async () => {
        await useAuthStore.getState().login('invalido@teste.com', 'senhaerrada');
      },
      (err: Error) => {
        assert.ok(
          err.message.includes('E-mail corporativo ou senha incorretos') ||
          err.message.includes('Falha na autenticação') ||
          err.message.includes('Falha de conexão')
        );
        return true;
      }
    );
  });
});
