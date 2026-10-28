import { NextResponse } from 'next/server';
import { UserAuditLogSchema } from '@/core/domain/user-audit.schema';
import { hasUserPermission } from '@/core/domain/user-authorization';
import { requireIdentity, toErrorResponse } from '../../api-utils';

interface UserRouteContext {
  params: Promise<{ uid: string }>;
}

export async function GET(request: Request, context: UserRouteContext) {
  try {
    const identity = await requireIdentity(request);
    if (!hasUserPermission(identity.user, 'audit:read')) {
      return NextResponse.json({ error: 'Permissão insuficiente para: audit:read.' }, { status: 403 });
    }
    const { uid } = await context.params;
    const { adminDb } = await import('@/server/firebase-admin');
    const snapshot = await adminDb.collection('userAuditLogs')
      .where('targetUserId', '==', uid)
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();
    return NextResponse.json({
      logs: snapshot.docs.map((document) => UserAuditLogSchema.parse(document.data())),
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
