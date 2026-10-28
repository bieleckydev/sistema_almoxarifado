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
    const { changeManagedUserRole } = await import('@/server/users/change-user-role');
    return NextResponse.json(await changeManagedUserRole(identity.user, uid, body));
  } catch (error) {
    return toErrorResponse(error);
  }
}
