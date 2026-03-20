import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

type RequestBody = {
  userId: string;
  email: string;
  plan: 'starter' | 'pro' | 'team';
};

function getPriceId(plan: RequestBody['plan']) {
  if (plan === 'starter') return process.env.STRIPE_PRICE_STARTER;
  if (plan === 'pro') return process.env.STRIPE_PRICE_PRO;
  if (plan === 'team') return process.env.STRIPE_PRICE_TEAM;
  return null;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RequestBody;
    const { userId, email, plan } = body;

    if (!userId || !email || !plan) {
      return NextResponse.json(
        { error: 'Missing userId, email, or plan' },
        { status: 400 }
      );
    }

    const priceId = getPriceId(plan);

    if (!priceId) {
      return NextResponse.json(
        { error: 'Invalid plan or missing Stripe price ID' },
        { status: 400 }
      );
    }

    if (!process.env.NEXT_PUBLIC_APP_URL) {
      return NextResponse.json(
        { error: 'Missing NEXT_PUBLIC_APP_URL' },
        { status: 500 }
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?success=1`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?canceled=1`,
      metadata: {
        userId,
        plan,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}