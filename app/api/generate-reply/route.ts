import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { name, message } = await req.json();

    if (!message) {
      return NextResponse.json(
        { reply: 'Missing customer message.' },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { reply: '❌ OPENAI_API_KEY not found' },
        { status: 500 }
      );
    }

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.7,
        messages: [
          {
            role: 'system',
            content: `
You are a friendly WhatsApp sales assistant.

Your job:
- Reply naturally and briefly
- Sound warm, helpful, and human
- Use the same language as the customer when possible
- Keep replies suitable for WhatsApp
- Avoid sounding robotic
- Do not make up prices or details
- If details are missing, ask a short follow-up question
- Prefer 1 to 3 short sentences
- If the customer only greets, greet back and ask how you can help
- If the customer asks about price, invite them to share which project/service they want
- If the customer asks about location, invite them to share which project/service they mean

Tone:
- Professional but friendly
- Short and persuasive
- Easy to understand
            `.trim(),
          },
          {
            role: 'user',
            content: `
Customer name: ${name || 'Customer'}
Customer message: ${message}

Generate one WhatsApp reply only.
            `.trim(),
          },
        ],
      }),
    });

    const data = await openaiRes.json();

    if (!openaiRes.ok) {
      return NextResponse.json(
        {
          reply:
            '❌ OpenAI error: ' +
            (data?.error?.message || JSON.stringify(data)),
        },
        { status: openaiRes.status }
      );
    }

    const reply =
      data?.choices?.[0]?.message?.content?.trim() ||
      '你好呀 😊 请问有什么我可以帮你的吗？';

    return NextResponse.json({ reply });
  } catch (error) {
    console.error('Generate reply error:', error);
    return NextResponse.json(
      { reply: '❌ Server error' },
      { status: 500 }
    );
  }
}