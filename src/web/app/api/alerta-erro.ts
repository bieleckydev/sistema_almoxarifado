import { after } from 'next/server';

/** Dados mínimos de um erro inesperado, enviados ao webhook de alerta. */
export interface AlertaErroInterno {
  erroId: string;
  quando: string;
  tipo: string;
  mensagem: string;
}

const TAMANHO_MAXIMO_MENSAGEM = 300;

/**
 * Monta o corpo do alerta. `text` é lido pelo Slack e pelo Google Chat; `content`, pelo
 * Discord. A stack fica só no log da Vercel: o webhook recebe o mínimo para triagem.
 */
export function montarCorpoAlerta(alerta: AlertaErroInterno, ambiente: string): Record<string, unknown> {
  const mensagem =
    alerta.mensagem.length > TAMANHO_MAXIMO_MENSAGEM
      ? `${alerta.mensagem.slice(0, TAMANHO_MAXIMO_MENSAGEM)}…`
      : alerta.mensagem;
  const texto = `[Almoxarifado ${ambiente}] Erro interno ${alerta.erroId} (${alerta.tipo}): ${mensagem}`;
  return { text: texto, content: texto, ...alerta, mensagem, ambiente };
}

/**
 * Envia o alerta ao webhook de ERROR_ALERT_WEBHOOK_URL, quando configurado, depois que a
 * resposta já foi entregue ao usuário. Falhas no envio nunca afetam a requisição.
 */
export function notificarErroInterno(alerta: AlertaErroInterno): void {
  const url = process.env.ERROR_ALERT_WEBHOOK_URL;
  if (!url) return;

  const ambiente = process.env.VERCEL_ENV || process.env.NODE_ENV || 'desconhecido';
  const enviar = async () => {
    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(montarCorpoAlerta(alerta, ambiente)),
        signal: AbortSignal.timeout(5000),
      });
    } catch (err) {
      console.warn(JSON.stringify({ nivel: 'aviso', evento: 'falha-alerta-erro', erroId: alerta.erroId, motivo: String(err) }));
    }
  };

  try {
    after(enviar);
  } catch {
    // Fora do ciclo de uma requisição (scripts, testes), `after` não está disponível.
    void enviar();
  }
}
