import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { db } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getPlanFromPriceId } from '@/lib/plans';

export async function POST(req: Request) {
  try {
    const signature = req.headers.get('stripe-signature');

    if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
      return NextResponse.json(
        { error: 'Missing Stripe signature or webhook secret' },
        { status: 400 }
      );
    }

    const rawBody = await req.text();

    const event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const plan = session.metadata?.plan || 'free';

        if (userId) {
          await setDoc(
            doc(db, 'subscriptions', userId),
            {
              userId,
              plan,
              status: 'active',
              stripeCustomerId: session.customer || null,
              stripeSubscriptionId: session.subscription || null,
              updatedAt: serverTimestamp(),
              createdAt: serverTimestamp(),
            },
            { merge: true }
          );
        }
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.created':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;

        const priceId =
          subscription.items.data[0]?.price?.id || null;
        const plan = getPlanFromPriceId(priceId);
        const subscriptionStatus = subscription.status;

        const userId =
          subscription.metadata?.userId ||
          null;

        if (userId) {
          await setDoc(
            doc(db, 'subscriptions', userId),
            {
              userId,
              plan,
              status: subscriptionStatus,
              stripeCustomerId: subscription.customer || null,
              stripeSubscriptionId: subscription.id,
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
        }
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 400 }
    );
  }
}