import { NextResponse } from 'next/server';
import { toPublicUserProfile } from '@/core/domain/user-audit.schema';
import { hasUserPermission } from '@/core/domain/user-authorization';
import { readJson, requireIdentity, toErrorResponse } from '../api-utils';

interface UserRouteContext {
  params: Promise<{ uid: string }>;
}

export async function GET(request: Request, context: UserRouteContext) {
  try {
    const identity = await requireIdentity(request);
    if (!hasUserPermission(identity.user, 'users:read')) {
      return NextResponse.json({ error: 'Permissão insuficiente para: users:read.' }, { status: 403 });
    }
    const { uid } = await context.params;
    const { adminDb } = await import('@/server/firebase-admin');
    const snapshot = await adminDb.collection('users').doc(uid).get();
    if (!snapshot.exists) {
      return NextResponse.json({ error: 'Perfil do usuário não foi encontrado.' }, { status: 404 });
    }
    return NextResponse.json(toPublicUserProfile({ id: snapshot.id, ...snapshot.data() }));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: UserRouteContext) {
  try {
    const identity = await requireIdentity(request);
    const { uid } = await context.params;
    const { updateManagedUserProfile } = await import('@/server/users/update-user-profile');
    return NextResponse.json(
      await updateManagedUserProfile(identity.user, uid, await readJson(request))
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(request: Request, context: UserRouteContext) {
  try {
    const identity = await requireIdentity(request);
    const { uid } = await context.params;
    const { deleteManagedUser } = await import('@/server/users/delete-user');
    return NextResponse.json(await deleteManagedUser(identity.user, uid, await readJson(request)));
  } catch (error) {
    return toErrorResponse(error);
  }
}
