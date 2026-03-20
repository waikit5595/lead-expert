import { plans, type PlanKey } from '@/lib/plans';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export async function getUserPlan(userId: string): Promise<PlanKey> {
  const snap = await getDoc(doc(db, 'subscriptions', userId));

  if (!snap.exists()) return 'free';

  const data = snap.data();
  return (data.plan || 'free') as PlanKey;
}

export async function getUserLimits(userId: string) {
  const plan = await getUserPlan(userId);
  return plans[plan];
}