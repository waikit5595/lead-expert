'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/app-shell';
import { Card, StatCard } from '@/components/cards';
import { Protected } from '@/components/protected';
import { useAuth } from '@/components/auth-provider';
import { fetchLeads } from '@/lib/firestore';
import { daysSince } from '@/lib/utils';
import { Lead } from '@/types';

export default function DashboardPage() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);

  useEffect(() => {
    if (!user) return;
    fetchLeads(user.uid).then(setLeads);
  }, [user]);

  const followUps = leads.filter((lead) => daysSince(lead.lastContact) >= 3).length;
  const interested = leads.filter((lead) => lead.status === 'Interested').length;
  const closed = leads.filter((lead) => lead.status === 'Closed').length;

  return (
    <Protected>
      <AppShell>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="mt-1 text-slate-600">Your lightweight sales workspace for leads, outreach, and follow up.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total Leads" value={leads.length} />
            <StatCard label="Need Follow Up" value={followUps} />
            <StatCard label="Interested" value={interested} />
            <StatCard label="Closed" value={closed} />
          </div>

          <Card title="Quick Actions">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Link href="/lead-finder" className="rounded-xl border border-slate-200 p-4 hover:bg-slate-50">
                <p className="font-semibold">Find public leads</p>
                <p className="mt-1 text-sm text-slate-600">Search businesses by category and location.</p>
              </Link>
              <Link href="/leads" className="rounded-xl border border-slate-200 p-4 hover:bg-slate-50">
                <p className="font-semibold">Manage leads</p>
                <p className="mt-1 text-sm text-slate-600">Add, update, and organize your prospects.</p>
              </Link>
              <Link href="/assistant" className="rounded-xl border border-slate-200 p-4 hover:bg-slate-50">
                <p className="font-semibold">Generate sales copy</p>
                <p className="mt-1 text-sm text-slate-600">Create WhatsApp messages for products or projects.</p>
              </Link>
              <Link href="/follow-up" className="rounded-xl border border-slate-200 p-4 hover:bg-slate-50">
                <p className="font-semibold">Follow up now</p>
                <p className="mt-1 text-sm text-slate-600">See who needs a reminder and generate a message.</p>
              </Link>
            </div>
          </Card>
        </div>
      </AppShell>
    </Protected>
  );
}
