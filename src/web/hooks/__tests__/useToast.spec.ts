import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { useToastStore } from '../useToast';

describe('useToast — Sistema de Notificações Operacionais', () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] });
  });

  it('deve inicializar com lista vazia de toasts', () => {
    const toasts = useToastStore.getState().toasts;
    assert.deepStrictEqual(toasts, []);
  });

  it('deve adicionar um toast com mensagem e valores padrão', () => {
    useToastStore.getState().showToast('Movimentação registrada com sucesso');

    const toasts = useToastStore.getState().toasts;
    assert.strictEqual(toasts.length, 1);
    assert.strictEqual(toasts[0].message, 'Movimentação registrada com sucesso');
    assert.strictEqual(toasts[0].type, 'info');
    assert.strictEqual(toasts[0].duration, 3200);
  });

  it('deve permitir configurar tipo success ou error e duração customizada', () => {
    useToastStore.getState().showToast('Item cadastrado', { type: 'success', duration: 5000 });

    const toasts = useToastStore.getState().toasts;
    assert.strictEqual(toasts.length, 1);
    assert.strictEqual(toasts[0].message, 'Item cadastrado');
    assert.strictEqual(toasts[0].type, 'success');
    assert.strictEqual(toasts[0].duration, 5000);
  });

  it('deve remover um toast pelo id', () => {
    useToastStore.getState().showToast('Mensagem 1');
    const toastId = useToastStore.getState().toasts[0].id;

    useToastStore.getState().removeToast(toastId);
    assert.strictEqual(useToastStore.getState().toasts.length, 0);
  });

  it('deve limitar a exibição para no máximo 3 toasts simultâneos', () => {
    useToastStore.getState().showToast('Toast 1');
    useToastStore.getState().showToast('Toast 2');
    useToastStore.getState().showToast('Toast 3');
    useToastStore.getState().showToast('Toast 4');

    const toasts = useToastStore.getState().toasts;
    assert.strictEqual(toasts.length, 3);
    assert.strictEqual(toasts[0].message, 'Toast 2');
    assert.strictEqual(toasts[1].message, 'Toast 3');
    assert.strictEqual(toasts[2].message, 'Toast 4');
  });
});
