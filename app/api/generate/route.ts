import { NextRequest, NextResponse } from 'next/server';

function salesPrompt(payload: Record<string, string>) {
  return `You are a professional sales copywriter.
Return valid JSON only with this shape:
{"message":"string","bullets":["string","string","string"]}

Generate a short WhatsApp sales message in simple persuasive English.
Product name: ${payload.productName}
Location: ${payload.location}
Price range: ${payload.priceRange}
Target customer: ${payload.targetCustomer}
Key selling points: ${payload.sellingPoints}

Rules:
- Friendly, natural, and suitable for WhatsApp.
- Keep message under 90 words.
- Include a soft call to action.
- bullets must contain exactly 3 short selling points.`;
}

function followUpPrompt(payload: Record<string, string>) {
  return `You are a sales follow-up assistant.
Return valid JSON only with this shape:
{"message":"string"}

Generate a short WhatsApp follow-up message.
Customer name: ${payload.leadName}
Project interest: ${payload.projectInterest}
Budget: ${payload.budget}
Last contact days ago: ${payload.days}
Notes: ${payload.notes}

Rules:
- Friendly and professional.
- Keep message under 70 words.
- Mention a possible update or promotion.
- End with a soft call to action.`;
}

function outreachPrompt(payload: Record<string, string>) {
  return `You are a B2B outreach assistant.
Return valid JSON only with this shape:
{"message":"string"}

Write a short first-contact WhatsApp message for a public business lead.
Business name: ${payload.businessName}
Business category: ${payload.category}
Location: ${payload.location}
Keyword or niche: ${payload.keyword}
Business address: ${payload.address}
Business rating: ${payload.rating}
Website: ${payload.website}

Rules:
- Friendly and respectful.
- Do not sound spammy.
- Mention a simple business benefit.
- Under 80 words.
- End with a low-pressure question.`;
}

function whatsappReplyPrompt(payload: Record<string, string>) {
  return `You are a WhatsApp sales assistant.
Return valid JSON only with this shape:
{"message":"string"}

Write one short WhatsApp reply.
Customer name: ${payload.contactName}
Latest customer message: ${payload.customerMessage}
Business type: ${payload.businessType}
Tone: ${payload.tone}

Rules:
- Reply in simple clear English.
- Under 70 words.
- Helpful and natural.
- End with a gentle question or next step.`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const prompt =
      body.type === 'follow_up'
        ? followUpPrompt(body.payload)
        : body.type === 'outreach'
          ? outreachPrompt(body.payload)
          : body.type === 'whatsapp_reply'
            ? whatsappReplyPrompt(body.payload)
            : salesPrompt(body.payload);

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-5.4',
        input: prompt,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ error: errorText }, { status: 500 });
    }

    const data = await response.json();
    const text = data.output_text as string;
    const parsed = JSON.parse(text);

    if (body.type === 'follow_up' || body.type === 'outreach' || body.type === 'whatsapp_reply') {
      return NextResponse.json({ message: parsed.message });
    }

    return NextResponse.json({
      message: parsed.message,
      bullets: Array.isArray(parsed.bullets) ? parsed.bullets : [],
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
