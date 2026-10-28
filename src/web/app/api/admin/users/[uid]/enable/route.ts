import { NextResponse } from 'next/server';
import { readJson, requireIdentity, toErrorResponse } from '../../api-utils';

interface UserRouteContext {
  params: Promise<{ uid: string }>;
}

export async function POST(request: Request, context: UserRouteContext) {
  try {
    const identity = await requireIdentity(request);
    const { uid } = await context.params;
    const body = await readJson(request);
    const input = body && typeof body === 'object' ? { ...body, ativo: true } : { ativo: true };
    const { setManagedUserStatus } = await import('@/server/users/set-user-status');
    return NextResponse.json(await setManagedUserStatus(identity.user, uid, input));
  } catch (error) {
    return toErrorResponse(error);
  }
}
