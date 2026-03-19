import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { name, message } = await req.json();

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
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
              'You are a helpful WhatsApp sales assistant. Reply briefly, naturally, and persuasively. Keep replies suitable for WhatsApp.',
          },
          {
            role: 'user',
            content: `Customer name: ${name}\nCustomer message: ${message}\nGenerate a friendly WhatsApp reply.`,
          },
        ],
        temperature: 0.7,
      }),
    });

    const data = await openaiRes.json();

    const reply =
      data.choices?.[0]?.message?.content || 'Sorry, no reply could be generated.';

    return NextResponse.json({ reply });
  } catch (error) {
    console.error('Generate reply error:', error);
    return NextResponse.json({ reply: 'Failed to generate reply.' }, { status: 500 });
  }
}