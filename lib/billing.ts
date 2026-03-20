import { db } from '@/lib/firebase';
import { plans, type PlanKey } from '@/lib/plans';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';

type WorkspaceSubscription = {
  ownerId: string;
  plan: PlanKey;
  status: string;
};

type UsageDoc = {
  ownerId: string;
  monthKey: string;
  aiRepliesUsed: number;
  autoRepliesUsed: number;
};

export function getCurrentMonthKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export async function getWorkspaceSubscription(): Promise<WorkspaceSubscription> {
  const snap = await getDocs(collection(db, 'subscriptions'));

  if (snap.empty) {
    return {
      ownerId: 'free_workspace',
      plan: 'free',
      status: 'active',
    };
  }

  const rows = snap.docs.map((d) => d.data() as any);

  const active =
    rows.find((r) => r.status === 'active' || r.status === 'trialing') || rows[0];

  return {
    ownerId: active.userId || 'free_workspace',
    plan: (active.plan || 'free') as PlanKey,
    status: active.status || 'active',
  };
}

export async function getWorkspacePlan() {
  const sub = await getWorkspaceSubscription();
  return {
    ...sub,
    limits: plans[sub.plan],
  };
}

export async function getWorkspaceContactCount() {
  const snap = await getDocs(collection(db, 'contacts'));
  return snap.size;
}

export async function getWorkspaceUsage() {
  const { ownerId } = await getWorkspaceSubscription();
  const monthKey = getCurrentMonthKey();
  const usageId = `${ownerId}_${monthKey}`;

  const snap = await getDoc(doc(db, 'usage', usageId));

  if (!snap.exists()) {
    return {
      ownerId,
      monthKey,
      usageId,
      aiRepliesUsed: 0,
      autoRepliesUsed: 0,
    };
  }

  const data = snap.data() as Partial<UsageDoc>;

  return {
    ownerId,
    monthKey,
    usageId,
    aiRepliesUsed: data.aiRepliesUsed || 0,
    autoRepliesUsed: data.autoRepliesUsed || 0,
  };
}

export async function incrementWorkspaceUsage(
  kind: 'aiRepliesUsed' | 'autoRepliesUsed',
  amount = 1
) {
  const usage = await getWorkspaceUsage();

  await setDoc(
    doc(db, 'usage', usage.usageId),
    {
      ownerId: usage.ownerId,
      monthKey: usage.monthKey,
      aiRepliesUsed:
        kind === 'aiRepliesUsed'
          ? usage.aiRepliesUsed + amount
          : usage.aiRepliesUsed,
      autoRepliesUsed:
        kind === 'autoRepliesUsed'
          ? usage.autoRepliesUsed + amount
          : usage.autoRepliesUsed,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function getWorkspaceBillingSummary() {
  const workspace = await getWorkspacePlan();
  const usage = await getWorkspaceUsage();
  const contactCount = await getWorkspaceContactCount();

  return {
    ownerId: workspace.ownerId,
    plan: workspace.plan,
    status: workspace.status,
    limits: workspace.limits,
    usage: {
      aiRepliesUsed: usage.aiRepliesUsed,
      autoRepliesUsed: usage.autoRepliesUsed,
      contactCount,
    },
  };
}