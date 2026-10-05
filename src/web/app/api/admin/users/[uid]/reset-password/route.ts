import { NextResponse } from 'next/server';
import { sendPasswordReset } from '@/server/users/reset-password';
import { readJson, requireIdentity, toErrorResponse } from '../../api-utils';

interface UserRouteContext {
  params: Promise<{ uid: string }>;
}

const delivery = {
  async sendPasswordReset(input: {
    recipientEmail: string;
    recipientName: string;
    resetLink: string;
  }) {
    const endpoint = process.env.USER_EMAIL_DELIVERY_URL?.trim();
    if (!endpoint) {
      throw new Error('USER_EMAIL_DELIVERY_URL não está configurada.');
    }
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'password-reset', ...input }),
    });
    if (!response.ok) {
      throw new Error(`Entrega de e-mail recusada com status ${response.status}.`);
    }
  },
};

export async function POST(request: Request, context: UserRouteContext) {
  try {
    const identity = await requireIdentity(request);
    const { uid } = await context.params;
    return NextResponse.json(
      await sendPasswordReset(identity.user, uid, await readJson(request), delivery)
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
