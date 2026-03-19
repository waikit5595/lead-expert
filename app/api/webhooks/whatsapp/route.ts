import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === process.env.META_VERIFY_TOKEN) {
    return new NextResponse(challenge ?? '', { status: 200 });
  }

  return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!adminDb) {
      return NextResponse.json(
        { ok: false, error: 'Firebase Admin is not configured' },
        { status: 500 },
      );
    }

    const entries = body.entry ?? [];

    for (const entry of entries) {
      for (const change of entry.changes ?? []) {
        const value = change.value;
        const messages = value?.messages ?? [];
        const contacts = value?.contacts ?? [];

        for (const message of messages) {
          const waId = message.from;
          const text = message.text?.body ?? '';
          const profileName = contacts.find((c: any) => c.wa_id === waId)?.profile?.name ?? 'Unknown';

          const convRef = adminDb.collection('conversations').doc(waId);
          await convRef.set(
            {
              phone: waId,
              contactName: profileName,
              channel: 'whatsapp',
              userId: 'demo-user',
              lastMessageText: text,
              lastMessageDirection: 'inbound',
              lastMessageAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            { merge: true },
          );

          await convRef.collection('messages').add({
            direction: 'inbound',
            text,
            type: message.type,
            rawPayload: message,
            createdAt: new Date().toISOString(),
          });
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
