import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      name,
      type,
      daysSinceInbound,
      lastInboundText,
      recommendedTemplate,
    } = body;

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
You are a WhatsApp sales follow-up assistant.

Your job:
- Write short, natural follow-up messages
- Sound human, warm, and polite
- Do not sound pushy
- Use the same language as the customer when possible
- Keep it suitable for WhatsApp
- Prefer 1 to 3 short sentences
- If the contact is a lead, encourage light engagement
- If the contact is a customer, sound more service-oriented
- Do not invent prices, promotions, or unavailable details
- If a recommended template is provided, use its style and intent, but still sound natural
            `.trim(),
          },
          {
            role: 'user',
            content: `
Contact name: ${name}
Contact type: ${type}
Days since last inbound: ${daysSinceInbound}
Last inbound message: ${lastInboundText}
Recommended template: ${recommendedTemplate || 'None'}

Generate one WhatsApp follow-up message only.
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
      '你好呀 😊 想跟进一下，不知道你这边是否还想继续了解？';

    return NextResponse.json({ reply });
  } catch (error) {
    console.error('Generate follow-up error:', error);
    return NextResponse.json(
      { reply: '❌ Server error' },
      { status: 500 }
    );
  }
}