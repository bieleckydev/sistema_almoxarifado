import { NextResponse } from 'next/server';
import { changeManagedUserRole } from '@/server/users/change-user-role';
import { readJson, requireIdentity, toErrorResponse } from '../../api-utils';

interface UserRouteContext {
  params: Promise<{ uid: string }>;
}

export async function POST(request: Request, context: UserRouteContext) {
  try {
    const identity = await requireIdentity(request);
    const { uid } = await context.params;
    const body = await readJson(request);
    return NextResponse.json(await changeManagedUserRole(identity.user, uid, body));
  } catch (error) {
    return toErrorResponse(error);
  }
}
