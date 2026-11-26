import { NextResponse } from 'next/server';
import { getServerDb, registrarErroInterno } from '../api-helpers';

/**
 * GET /api/health
 * Rota pública para monitores de disponibilidade (UptimeRobot, Better Stack).
 * Confirma que a função responde e que o Firestore do servidor está acessível,
 * lendo um documento que não precisa existir. Não devolve dados do sistema.
 */
export async function GET() {
  const versao = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'local';
  try {
    await getServerDb().collection('_health').doc('ping').get();
    return NextResponse.json({ status: 'ok', versao }, { status: 200 });
  } catch (error) {
    const erroId = registrarErroInterno(error);
    return NextResponse.json({ status: 'indisponivel', versao, erroId }, { status: 503 });
  }
}
