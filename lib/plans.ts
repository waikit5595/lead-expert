export type PlanKey = 'free' | 'starter' | 'pro' | 'team';

export const plans = {
  free: {
    key: 'free',
    name: 'Free',
    monthlyPrice: 0,
    contactLimit: 20,
    aiReplyLimit: 30,
    autoReplyLimit: 0,
  },
  starter: {
    key: 'starter',
    name: 'Starter',
    monthlyPrice: 29,
    contactLimit: 200,
    aiReplyLimit: 300,
    autoReplyLimit: 100,
  },
  pro: {
    key: 'pro',
    name: 'Pro',
    monthlyPrice: 79,
    contactLimit: 2000,
    aiReplyLimit: 3000,
    autoReplyLimit: 1500,
  },
  team: {
    key: 'team',
    name: 'Team',
    monthlyPrice: 199,
    contactLimit: 10000,
    aiReplyLimit: 15000,
    autoReplyLimit: 10000,
  },
} as const;

export function getPlanFromPriceId(priceId?: string | null): PlanKey {
  if (!priceId) return 'free';

  if (priceId === process.env.STRIPE_PRICE_STARTER) return 'starter';
  if (priceId === process.env.STRIPE_PRICE_PRO) return 'pro';
  if (priceId === process.env.STRIPE_PRICE_TEAM) return 'team';

  return 'free';
}