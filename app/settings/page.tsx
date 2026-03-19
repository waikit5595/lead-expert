'use client';

import { AppShell } from '@/components/app-shell';
import { Card } from '@/components/cards';
import { Protected } from '@/components/protected';
import { useAuth } from '@/components/auth-provider';

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <Protected>
      <AppShell>
        <div className="grid gap-4 md:grid-cols-2">
          <Card title="Profile">
            <div className="space-y-2 text-sm text-slate-700">
              <p><span className="font-semibold">Name:</span> {user?.displayName || '—'}</p>
              <p><span className="font-semibold">Email:</span> {user?.email || '—'}</p>
            </div>
          </Card>
          <Card title="Plan">
            <p className="text-lg font-semibold">Trial / MVP Plan</p>
            <p className="mt-2 text-slate-600">Add Stripe later after your first test users validate the product.</p>
          </Card>
        </div>
      </AppShell>
    </Protected>
  );
}
