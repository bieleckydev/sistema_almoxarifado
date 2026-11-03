import { NextResponse } from 'next/server';
import { z } from 'zod';
import { UserAuditLogSchema } from '@/core/domain/user-audit.schema';
import { adminAuth, getAdminEnvironmentStatus } from '@/server/firebase-admin';
import {
  getServerDb,
  readJson,
  requireIdentity,
  toErrorResponse,
} from '../../api-helpers';

const ChangeOwnPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, 'A nova senha deve ter no mínimo 8 caracteres.')
      .max(128, 'A nova senha excede o tamanho máximo permitido.')
      .refine((val) => /[A-Za-z]/.test(val) && /\d/.test(val), {
        message: 'A nova senha deve conter pelo menos uma letra e um número.',
      }),
  })
  .strict();

/**
 * POST /api/auth/change-password
 * Permite ao usuário autenticado definir sua senha definitiva quando mustChangePassword=true
 * (ou atualizar sua própria senha), limpando o flag mustChangePassword no Firestore com auditoria.
 */
export async function POST(request: Request) {
  try {
    const identity = await requireIdentity(request);
    const body = await readJson(request);
    const { newPassword } = ChangeOwnPasswordSchema.parse(body);

    const uid = identity.user.id;
    const now = new Date().toISOString();

    if (getAdminEnvironmentStatus().configured && typeof adminAuth.updateUser === 'function') {
      await adminAuth.updateUser(uid, { password: newPassword });
    }

    const db = getServerDb();
    await db.collection('users').doc(uid).set(
      {
        mustChangePassword: false,
        updatedAt: now,
        updatedBy: uid,
      },
      { merge: true }
    );

    const audit = UserAuditLogSchema.parse({
      targetUserId: uid,
      performedBy: uid,
      action: 'UPDATE',
      changedFields: ['mustChangePassword'],
      reason: 'Definição de senha pessoal concluída pelo próprio usuário.',
      createdAt: now,
    });
    const auditId = `audit-pwd-${uid}-${Date.now()}`;
    await db.collection('userAuditLogs').doc(auditId).set(audit);

    return NextResponse.json(
      {
        updated: true,
        mustChangePassword: false,
      },
      { status: 200 }
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
