import { NextResponse } from 'next/server';
import { CreateUserCommandSchema } from '@/core/domain/user.schema';
import { createManagedUser } from '@/server/users/create-user';
import { listManagedUsers } from '@/server/users/list-users';
import {
  readJson,
  requireIdentity,
  toErrorResponse,
} from './api-utils';

export async function GET(request: Request) {
  try {
    const identity = await requireIdentity(request);
    const url = new URL(request.url);
    const query = Object.fromEntries(url.searchParams.entries());
    return NextResponse.json(await listManagedUsers(identity.user, query));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const identity = await requireIdentity(request);
    const command = CreateUserCommandSchema.parse(await readJson(request));
    return NextResponse.json(
      await createManagedUser(identity.user, command),
      { status: 201 }
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
