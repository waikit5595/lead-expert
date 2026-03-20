'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { plans, type PlanKey } from '@/lib/plans';

type SubscriptionDoc = {
  userId: string;
  plan?: PlanKey;
  status?: string;
};

type BillingSummary = {
  ownerId: string;
  plan: PlanKey;
  status: string;
  limits: {
    contactLimit: number;
    aiReplyLimit: number;
    autoReplyLimit: number;
  };
  usage: {
    contactCount: number;
    aiRepliesUsed: number;
    autoRepliesUsed: number;
  };
};

export default function BillingPage() {
  const [user, setUser] = useState<User | null>(null);
  const [sub, setSub] = useState<SubscriptionDoc | null>(null);
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [loadingPlan, setLoadingPlan] = useState<'starter' | 'pro' | 'team' | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = onSnapshot(doc(db, 'subscriptions', user.uid), (snap) => {
      if (snap.exists()) {
        setSub(snap.data() as SubscriptionDoc);
      } else {
        setSub({
          userId: user.uid,
          plan: 'free',
          status: 'active',
        });
      }
    });

    return () => unsubscribe();
  }, [user?.uid]);

  useEffect(() => {
    let mounted = true;

    async function loadSummary() {
      try {
        setSummaryLoading(true);
        const res = await fetch('/api/billing/summary');
        const data = await res.json();

        if (mounted && data.success) {
          setSummary(data.summary);
        }
      } catch (error) {
        console.error(error);
      } finally {
        if (mounted) setSummaryLoading(false);
      }
    }

    loadSummary();

    return () => {
      mounted = false;
    };
  }, [sub?.plan, sub?.status]);

  async function startCheckout(plan: 'starter' | 'pro' | 'team') {
    if (!user?.uid || !user?.email) {
      alert('Please log in first.');
      return;
    }

    try {
      setLoadingPlan(plan);

      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          email: user.email,
          plan,
        }),
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

  if (authLoading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-2">Billing</h1>
        <p className="text-sm text-gray-500">Loading account...</p>
      </div>
    );
  }

  const currentPlan = sub?.plan || 'free';
  const currentStatus = sub?.status || 'active';

  const usage = summary?.usage;
  const limits = summary?.limits;

  const contactRemaining =
    summary && limits ? Math.max(limits.contactLimit - usage!.contactCount, 0) : 0;
  const aiRemaining =
    summary && limits ? Math.max(limits.aiReplyLimit - usage!.aiRepliesUsed, 0) : 0;
  const autoRemaining =
    summary && limits ? Math.max(limits.autoReplyLimit - usage!.autoRepliesUsed, 0) : 0;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Billing</h1>
        <p className="text-sm text-gray-500 mt-1">
          Upgrade your plan to unlock more contacts, AI replies, and automation.
        </p>
      </div>

      {!user ? (
        <div className="border rounded-2xl bg-white p-5">
          <div className="text-lg font-semibold">You are not logged in</div>
          <div className="text-sm text-gray-500 mt-2">
            Please sign in first before starting checkout.
          </div>
        </div>
      ) : (
        <>
          <div className="border rounded-2xl bg-white p-5 space-y-3">
            <div className="text-sm text-gray-500">Current Plan</div>
            <div className="text-2xl font-bold">{plans[currentPlan].name}</div>
            <div className="text-sm text-gray-500">Status: {currentStatus}</div>
            <div className="text-sm text-gray-500">Signed in as: {user.email}</div>
          </div>

          <div className="border rounded-2xl bg-white p-5">
            <div className="font-semibold mb-4">Current Usage</div>

            {summaryLoading || !summary ? (
              <div className="text-sm text-gray-500">Loading usage...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <UsageCard
                  title="Contacts"
                  used={usage!.contactCount}
                  limit={limits!.contactLimit}
                  remaining={contactRemaining}
                />
                <UsageCard
                  title="AI Replies"
                  used={usage!.aiRepliesUsed}
                  limit={limits!.aiReplyLimit}
                  remaining={aiRemaining}
                />
                <UsageCard
                  title="Auto Replies"
                  used={usage!.autoRepliesUsed}
                  limit={limits!.autoReplyLimit}
                  remaining={autoRemaining}
                />
              </div>
            )}
          </div>

          {currentPlan === 'free' && (
            <div className="border rounded-2xl bg-yellow-50 border-yellow-200 p-5">
              <div className="font-semibold text-yellow-800">You are on the Free plan</div>
              <div className="text-sm text-yellow-700 mt-2">
                Free accounts are limited in contacts, AI replies, and auto replies.
                Upgrade to unlock more capacity and automation.
              </div>
            </div>
          )}

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
        </>
      )}
    </div>
  );
}

function UsageCard({
  title,
  used,
  limit,
  remaining,
}: {
  title: string;
  used: number;
  limit: number;
  remaining: number;
}) {
  const percentage = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;

  return (
    <div className="border rounded-xl p-4 bg-gray-50">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-2xl font-bold mt-2">
        {used} / {limit}
      </div>
      <div className="text-sm text-gray-500 mt-1">{remaining} remaining</div>

      <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${
            percentage >= 90
              ? 'bg-red-500'
              : percentage >= 70
              ? 'bg-yellow-500'
              : 'bg-green-500'
          }`}
          style={{ width: `${percentage}%` }}
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