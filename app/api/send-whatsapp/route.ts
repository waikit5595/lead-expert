import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export async function POST(req: Request) {
  try {
    const { to, message, name } = await req.json();

    if (!process.env.WHATSAPP_PHONE_NUMBER_ID) {
      return NextResponse.json(
        { error: 'Missing WHATSAPP_PHONE_NUMBER_ID' },
        { status: 500 }
      );
    }

    if (!process.env.WHATSAPP_ACCESS_TOKEN) {
      return NextResponse.json(
        { error: 'Missing WHATSAPP_ACCESS_TOKEN' },
        { status: 500 }
      );
    }

    if (!to || !message) {
      return NextResponse.json(
        { error: 'Missing "to" or "message"' },
        { status: 400 }
      );
    }

    const res = await fetch(
      `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: {
            body: message,
          },
        }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      console.error('WhatsApp API error:', data);
      return NextResponse.json(
        { error: data?.error?.message || 'Failed to send WhatsApp message' },
        { status: res.status }
      );
    }

    await addDoc(collection(db, 'messages'), {
      from: to,
      name: name || 'Unknown',
      text: message,
      direction: 'outbound',
      createdAt: serverTimestamp(),
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Send WhatsApp error:', error);
    return NextResponse.json(
      { error: 'Failed to send' },
      { status: 500 }
    );
  }
}