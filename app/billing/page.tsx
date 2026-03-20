'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { plans, type PlanKey } from '@/lib/plans';

type SubscriptionDoc = {
  userId: string;
  plan?: PlanKey;
  status?: string;
};

export default function BillingPage() {
  const [userId, setUserId] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [sub, setSub] = useState<SubscriptionDoc | null>(null);
  const [loadingPlan, setLoadingPlan] = useState<'starter' | 'pro' | 'team' | null>(null);

  useEffect(() => {
    const rawUser = localStorage.getItem('closer_user');

    if (rawUser) {
      const parsed = JSON.parse(rawUser);
      setUserId(parsed.uid || '');
      setEmail(parsed.email || '');
    }
  }, []);

  useEffect(() => {
    if (!userId) return;

    const unsubscribe = onSnapshot(doc(db, 'subscriptions', userId), (snap) => {
      if (snap.exists()) {
        setSub(snap.data() as SubscriptionDoc);
      } else {
        setSub({
          userId,
          plan: 'free',
          status: 'active',
        });
      }
    });

    return () => unsubscribe();
  }, [userId]);

  async function startCheckout(plan: 'starter' | 'pro' | 'team') {
    if (!userId || !email) {
      alert('Please log in first.');
      return;
    }

    try {
      setLoadingPlan(plan);

      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, email, plan }),
      });

      const data = await res.json();

      if (!res.ok || !data.url) {
        alert(data.error || 'Failed to start checkout');
        return;
      }

      window.location.href = data.url;
    } catch (error) {
      console.error(error);
      alert('Failed to start checkout');
    } finally {
      setLoadingPlan(null);
    }
  }

  const currentPlan = sub?.plan || 'free';
  const currentStatus = sub?.status || 'active';

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Billing</h1>
        <p className="text-sm text-gray-500 mt-1">
          Upgrade your plan to unlock more contacts, AI replies, and automation.
        </p>
      </div>

      <div className="border rounded-2xl bg-white p-5">
        <div className="text-sm text-gray-500">Current Plan</div>
        <div className="text-2xl font-bold mt-2">{plans[currentPlan].name}</div>
        <div className="text-sm text-gray-500 mt-1">Status: {currentStatus}</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <PlanCard
          title="Starter"
          price="$29/mo"
          features={[
            `${plans.starter.contactLimit} contacts`,
            `${plans.starter.aiReplyLimit} AI replies / month`,
            `${plans.starter.autoReplyLimit} auto replies / month`,
          ]}
          loading={loadingPlan === 'starter'}
          onClick={() => startCheckout('starter')}
        />

        <PlanCard
          title="Pro"
          price="$79/mo"
          features={[
            `${plans.pro.contactLimit} contacts`,
            `${plans.pro.aiReplyLimit} AI replies / month`,
            `${plans.pro.autoReplyLimit} auto replies / month`,
          ]}
          loading={loadingPlan === 'pro'}
          onClick={() => startCheckout('pro')}
        />

        <PlanCard
          title="Team"
          price="$199/mo"
          features={[
            `${plans.team.contactLimit} contacts`,
            `${plans.team.aiReplyLimit} AI replies / month`,
            `${plans.team.autoReplyLimit} auto replies / month`,
          ]}
          loading={loadingPlan === 'team'}
          onClick={() => startCheckout('team')}
        />
      </div>
    </div>
  );
}

function PlanCard({
  title,
  price,
  features,
  onClick,
  loading,
}: {
  title: string;
  price: string;
  features: string[];
  onClick: () => void;
  loading: boolean;
}) {
  return (
    <div className="border rounded-2xl bg-white p-5 space-y-4">
      <div>
        <div className="text-lg font-semibold">{title}</div>
        <div className="text-3xl font-bold mt-2">{price}</div>
      </div>

      <ul className="space-y-2 text-sm text-gray-600">
        {features.map((f) => (
          <li key={f}>• {f}</li>
        ))}
      </ul>

      <button
        onClick={onClick}
        disabled={loading}
        className="w-full px-4 py-2 rounded-lg bg-black text-white disabled:opacity-50"
      >
        {loading ? 'Redirecting...' : `Choose ${title}`}
      </button>
    </div>
  );
}