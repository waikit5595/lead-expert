import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

function getRuleBasedReply(text: string): string | null {
  const lower = text.toLowerCase().trim();

  if (
    lower.includes('hi') ||
    lower.includes('hello') ||
    lower.includes('你好') ||
    lower.includes('哈喽')
  ) {
    return '你好呀 👋 很高兴收到你的消息，请问有什么我可以帮你的吗？';
  }

  if (
    lower.includes('price') ||
    lower.includes('多少钱') ||
    lower.includes('价钱') ||
    lower.includes('价格')
  ) {
    return '当然可以 😊 请告诉我你想了解哪一个项目或服务，我可以把价格和详情发给你。';
  }

  if (
    lower.includes('location') ||
    lower.includes('在哪里') ||
    lower.includes('地址') ||
    lower.includes('哪里')
  ) {
    return '可以的 📍 请告诉我你想了解哪一个项目或服务，我会把地点和相关资料发给你。';
  }

  if (
    lower.includes('promo') ||
    lower.includes('promotion') ||
    lower.includes('优惠')
  ) {
    return '有的哦 🎉 目前我们这边有最新优惠活动，我可以把详情整理发给你。';
  }

  return null;
}

async function generateAIReply(name: string, text: string): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    return '你好呀 😊 请问有什么我可以帮你的吗？';
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a friendly WhatsApp sales assistant for a CRM system. Reply naturally, briefly, politely, and in the same language as the customer when possible. Keep replies short and WhatsApp-friendly.',
        },
        {
          role: 'user',
          content: `Customer name: ${name}\nCustomer message: ${text}\nGenerate a helpful WhatsApp reply.`,
        },
      ],
      temperature: 0.7,
    }),
  });

  const data = await res.json();

  const reply = data?.choices?.[0]?.message?.content?.trim();
  return reply || '你好呀 😊 请问有什么我可以帮你的吗？';
}

async function sendWhatsAppMessage(to: string, message: string) {
  if (!process.env.WHATSAPP_PHONE_NUMBER_ID) {
    throw new Error('Missing WHATSAPP_PHONE_NUMBER_ID');
  }

  if (!process.env.WHATSAPP_ACCESS_TOKEN) {
    throw new Error('Missing WHATSAPP_ACCESS_TOKEN');
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
    throw new Error(data?.error?.message || 'Failed to send WhatsApp message');
  }

  return data;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === process.env.META_VERIFY_TOKEN) {
    return new Response(challenge || '', { status: 200 });
  }

  return new Response('Verification failed', { status: 403 });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    const message = value?.messages?.[0];
    const contact = value?.contacts?.[0];

    // 没有消息事件时，直接返回成功，避免 Meta 重试
    if (!message) {
      return NextResponse.json({ success: true });
    }

    const from: string = message.from;
    const text: string = message.text?.body || 'No text';
    const name: string = contact?.profile?.name || 'Unknown';

    console.log('📩 Incoming message:', { from, name, text });

    // 1. 存 inbound 消息
    await addDoc(collection(db, 'messages'), {
      from,
      name,
      text,
      direction: 'inbound',
      createdAt: serverTimestamp(),
    });

    // 2. 优先规则回复，否则走 AI
    let reply: string | null = getRuleBasedReply(text);

    if (!reply) {
      reply = await generateAIReply(name, text);
    }

    if (!reply) {
      reply = '你好呀 👋 请问有什么我可以帮你的吗？';
    }

    console.log('🤖 Auto reply:', reply);

    // 3. 自动发送 WhatsApp
    await sendWhatsAppMessage(from, reply);

    // 4. 存 outbound 消息
    await addDoc(collection(db, 'messages'), {
      from,
      name,
      text: reply,
      direction: 'outbound',
      createdAt: serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Webhook Error:', error);
    // 返回 200，避免 Meta 一直重复重试
    return NextResponse.json({ success: true });
  }
}