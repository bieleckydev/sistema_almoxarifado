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
    const { sendUserInvite } = await import('@/server/users/invite-user');

    const delivery = {
      async sendInvite(input: {
        recipientEmail: string;
        recipientName: string;
        inviteLink: string;
      }) {
        const endpoint = process.env.USER_EMAIL_DELIVERY_URL?.trim();
        if (!endpoint) {
          throw new Error('USER_EMAIL_DELIVERY_URL não está configurada.');
        }
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ type: 'user-invite', ...input }),
        });
        if (!response.ok) {
          throw new Error(`Entrega de e-mail recusada com status ${response.status}.`);
        }
      },
    };

    return NextResponse.json(
      await sendUserInvite(identity.user, uid, body, delivery)
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
