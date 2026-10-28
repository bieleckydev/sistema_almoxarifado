import { FieldPath } from 'firebase-admin/firestore';
import type {
  Firestore,
  Query,
  QueryDocumentSnapshot,
} from 'firebase-admin/firestore';
import { z } from 'zod';
import { PublicUserProfileSchema, type PublicUserProfile } from '../../core/domain/user-audit.schema';
import { UserRoleSchema } from '../../core/domain/user.schema';
import { hasUserPermission } from '../../core/domain/user-authorization';
import { adminDb } from '../firebase-admin';
import type { AuthenticatedIdentity } from '../auth/identity';

export class UserListError extends Error {
  readonly statusCode = 500;

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'UserListError';
  }
}

export const ListUsersQuerySchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    email: z.string().trim().email().optional(),
    role: UserRoleSchema.optional(),
    ativo: z.boolean().optional(),
    pageSize: z.coerce.number().int().min(1).max(100).default(25),
    pageToken: z.string().trim().min(1).optional(),
  })
  .strict();

export type ListUsersQuery = z.input<typeof ListUsersQuerySchema>;

export interface ListUsersResult {
  users: PublicUserProfile[];
  nextPageToken: string | null;
}

interface UserListDependencies {
  db: Firestore;
}

const defaultDependencies: UserListDependencies = { db: adminDb };

function parseBoolean(value: unknown): unknown {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}

function toPublicProfile(document: QueryDocumentSnapshot): PublicUserProfile {
  return PublicUserProfileSchema.parse({
    id: document.id,
    ...document.data(),
  });
}

function decodePageToken(pageToken: string): { name: string; id: string } {
  try {
    const decoded = JSON.parse(Buffer.from(pageToken, 'base64url').toString('utf8'));
    if (
      !decoded
      || typeof decoded.name !== 'string'
      || typeof decoded.id !== 'string'
      || !decoded.name
      || !decoded.id
    ) {
      throw new Error('Formato inválido');
    }
    return decoded;
  } catch (error) {
    throw new UserListError('Token de paginação inválido.', { cause: error });
  }
}

function encodePageToken(document: QueryDocumentSnapshot): string {
  return Buffer.from(JSON.stringify({ name: document.get('name'), id: document.id })).toString(
    'base64url'
  );
}

export async function listManagedUsers(
  actor: AuthenticatedIdentity['user'],
  input: unknown,
  dependencies: UserListDependencies = defaultDependencies
): Promise<ListUsersResult> {
  if (!hasUserPermission(actor, 'users:read')) {
    throw new UserListError('Somente um mestre pode consultar usuários.');
  }

  const rawInput = input && typeof input === 'object'
    ? { ...(input as Record<string, unknown>), ativo: parseBoolean((input as Record<string, unknown>).ativo) }
    : input;
  const query = ListUsersQuerySchema.parse(rawInput);

  let firestoreQuery: Query = dependencies.db
    .collection('users')
    .orderBy('name')
    .orderBy(FieldPath.documentId());
  if (query.role) firestoreQuery = firestoreQuery.where('role', '==', query.role);
  if (query.ativo !== undefined) firestoreQuery = firestoreQuery.where('ativo', '==', query.ativo);
  if (query.email) firestoreQuery = firestoreQuery.where('email', '==', query.email.toLowerCase());
  if (query.name) firestoreQuery = firestoreQuery.where('name', '>=', query.name).where('name', '<=', `${query.name}\uf8ff`);
  if (query.pageToken) {
    const token = decodePageToken(query.pageToken);
    firestoreQuery = firestoreQuery.startAfter(token.name, token.id);
  }

  const snapshot = await firestoreQuery.limit(query.pageSize).get();
  const users = snapshot.docs.map(toPublicProfile);
  const lastDocument = snapshot.docs.at(-1);

  return {
    users,
    nextPageToken: lastDocument ? encodePageToken(lastDocument) : null,
  };
}
