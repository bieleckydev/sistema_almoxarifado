import { NextResponse } from 'next/server';
import { UserSchema } from '@/core/domain/user.schema';
import { PublicUserProfileSchema } from '@/core/domain/user-audit.schema';
import { hasUserPermission } from '@/core/domain/user-authorization';
import { adminDb } from '@/server/firebase-admin';
import { deleteManagedUser } from '@/server/users/delete-user';
import { updateManagedUserProfile } from '@/server/users/update-user-profile';
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
    const snapshot = await adminDb.collection('users').doc(uid).get();
    if (!snapshot.exists) {
      return NextResponse.json({ error: 'Perfil do usuário não foi encontrado.' }, { status: 404 });
    }
    return NextResponse.json(PublicUserProfileSchema.parse(
      UserSchema.parse({ id: snapshot.id, ...snapshot.data() })
    ));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: UserRouteContext) {
  try {
    const identity = await requireIdentity(request);
    const { uid } = await context.params;
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
    return NextResponse.json(await deleteManagedUser(identity.user, uid, await readJson(request)));
  } catch (error) {
    return toErrorResponse(error);
  }
}
