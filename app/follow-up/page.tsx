'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/app-shell';
import { Card } from '@/components/cards';
import { Protected } from '@/components/protected';
import { useAuth } from '@/components/auth-provider';
import { fetchLeads } from '@/lib/firestore';
import { daysSince } from '@/lib/utils';
import { Lead } from '@/types';

export default function FollowUpPage() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user) return;
    fetchLeads(user.uid).then((rows) => setLeads(rows.filter((lead) => daysSince(lead.lastContact) >= 3)));
  }, [user]);

  async function generateFollowUp(lead: Lead) {
    setLoadingId(lead.id);
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'follow_up',
        payload: {
          leadName: lead.name,
          projectInterest: lead.projectInterest,
          budget: lead.budget,
          days: String(daysSince(lead.lastContact)),
          notes: lead.notes,
        },
      }),
    });
    const data = await res.json();
    setMessages((prev) => ({ ...prev, [lead.id]: data.message }));
    setLoadingId(null);
  }

  return (
    <Protected>
      <AppShell>
        <Card title="Follow Up Reminders">
          <div className="space-y-4">
            {leads.map((lead) => (
              <div key={lead.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="max-w-2xl">
                    <p className="text-lg font-semibold">{lead.name}</p>
                    <p className="text-sm text-slate-600">{lead.projectInterest || 'No project'} • {daysSince(lead.lastContact)} days since last contact</p>
                    {messages[lead.id] ? <div className="mt-3 whitespace-pre-wrap rounded-xl bg-slate-50 p-3">{messages[lead.id]}</div> : null}
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => generateFollowUp(lead)}
                      className="rounded-xl bg-slate-900 px-4 py-2 text-white"
                      disabled={loadingId === lead.id}
                    >
                      {loadingId === lead.id ? 'Generating...' : 'Generate Follow Up'}
                    </button>
                    {messages[lead.id] ? (
                      <button onClick={() => navigator.clipboard.writeText(messages[lead.id])} className="rounded-xl border border-slate-300 px-4 py-2">
                        Copy Message
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
            {!leads.length ? <p className="text-slate-500">No follow ups needed right now.</p> : null}
          </div>
        </Card>
      </AppShell>
    </Protected>
  );
}
