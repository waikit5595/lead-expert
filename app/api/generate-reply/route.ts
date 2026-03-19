import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { name, message } = await req.json();

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { reply: '❌ OPENAI_API_KEY not found' },
        { status: 500 }
      );
    }

    const openaiRes = await fetch(
      'https://api.openai.com/v1/chat/completions',
      {
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
                'You are a helpful WhatsApp sales assistant. Reply briefly and naturally.',
            },
            {
              role: 'user',
              content: `Customer name: ${name}\nMessage: ${message}`,
            },
          ],
        }),
      }
    );

    const data = await openaiRes.json();

    console.log('OpenAI response:', data); // 🔥 debug用

    if (!data.choices) {
      return NextResponse.json({
        reply: '❌ OpenAI error: ' + JSON.stringify(data),
      });
    }

    const reply = data.choices[0].message.content;

    return NextResponse.json({ reply });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { reply: '❌ Server error' },
      { status: 500 }
    );
  }
}