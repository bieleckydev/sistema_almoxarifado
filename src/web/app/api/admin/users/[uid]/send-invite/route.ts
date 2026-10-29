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
    const { sendUserInvite, resolveContinueUrl } = await import('@/server/users/invite-user');

    const origin =
      request.headers.get('origin') ||
      (request.headers.get('x-forwarded-proto') && request.headers.get('host')
        ? `${request.headers.get('x-forwarded-proto')}://${request.headers.get('host')}`
        : null) ||
      new URL(request.url).origin;

    const continueUrl =
      process.env.FIREBASE_AUTH_CONTINUE_URL?.trim() ||
      (origin && !origin.includes('localhost') && !origin.includes('127.0.0.1')
        ? `${origin.replace(/\/+$/, '')}/login`
        : resolveContinueUrl());

    const endpoint = process.env.USER_EMAIL_DELIVERY_URL?.trim();
    let emailSent = false;

    const delivery = {
      async sendInvite(input: {
        recipientEmail: string;
        recipientName: string;
        resetLink: string;
      }) {
        if (!endpoint) {
          // Quando não há webhook de entrega de e-mails configurado,
          // o link gerado será retornado na resposta para cópia e envio manual.
          return;
        }
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ type: 'user-invite', ...input }),
        });
        if (!response.ok) {
          throw new Error(`Entrega de e-mail recusada com status ${response.status}.`);
        }
        emailSent = true;
      },
    };

    const { adminAuth, adminDb } = await import('@/server/firebase-admin');

    const result = await sendUserInvite(identity.user, uid, body, delivery, {
      auth: adminAuth,
      db: adminDb,
      continueUrl,
      now: () => new Date(),
    });

    return NextResponse.json({
      ...result,
      emailDeliveryConfigured: Boolean(endpoint),
      emailSent,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
