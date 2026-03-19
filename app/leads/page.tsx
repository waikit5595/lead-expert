'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/app-shell';
import { Card } from '@/components/cards';
import { Protected } from '@/components/protected';
import { useAuth } from '@/components/auth-provider';
import { addLead, deleteLead, fetchLeads, updateLeadStatus } from '@/lib/firestore';
import { formatDate } from '@/lib/utils';
import { Lead, LeadStatus } from '@/types';

const initialForm = {
  name: '',
  phone: '',
  projectInterest: '',
  budget: '',
  notes: '',
};

export default function LeadsPage() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);

  async function reload() {
    if (!user) return;
    const rows = await fetchLeads(user.uid);
    setLeads(rows);
  }

  useEffect(() => {
    reload();
  }, [user]);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return leads.filter((lead) =>
      [lead.name, lead.phone, lead.projectInterest, lead.notes].join(' ').toLowerCase().includes(keyword),
    );
  }, [leads, search]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    await addLead({
      userId: user.uid,
      name: form.name,
      phone: form.phone,
      projectInterest: form.projectInterest,
      budget: form.budget,
      status: 'New',
      notes: form.notes,
      lastContact: new Date().toISOString(),
    });
    setForm(initialForm);
    await reload();
    setSaving(false);
  }

  return (
    <Protected>
      <AppShell>
        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <Card title="Add New Lead">
            <form className="space-y-4" onSubmit={onSubmit}>
              <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
              <input placeholder="Project Interest" value={form.projectInterest} onChange={(e) => setForm({ ...form, projectInterest: e.target.value })} />
              <input placeholder="Budget" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
              <textarea placeholder="Notes" rows={4} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              <button className="w-full rounded-xl bg-slate-900 px-4 py-3 font-medium text-white" disabled={saving}>
                {saving ? 'Saving...' : 'Save Lead'}
              </button>
            </form>
          </Card>

          <Card title="Lead List">
            <input placeholder="Search leads" value={search} onChange={(e) => setSearch(e.target.value)} className="mb-4" />
            <div className="space-y-3">
              {filtered.map((lead) => (
                <div key={lead.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-lg font-semibold">{lead.name}</p>
                      <p className="text-sm text-slate-600">{lead.phone} • {lead.projectInterest || 'No project'}</p>
                      <p className="text-sm text-slate-500">Budget: {lead.budget || '—'} • Last contact: {formatDate(lead.lastContact)}</p>
                      {lead.notes ? <p className="mt-2 text-sm text-slate-700">{lead.notes}</p> : null}
                    </div>
                    <div className="flex flex-col gap-2">
                      <select
                        value={lead.status}
                        onChange={async (e) => {
                          await updateLeadStatus(lead.id, e.target.value as LeadStatus);
                          await reload();
                        }}
                      >
                        {['New', 'Contacted', 'Interested', 'Closed'].map((status) => (
                          <option key={status}>{status}</option>
                        ))}
                      </select>
                      <button
                        className="rounded-xl border border-red-300 px-3 py-2 text-red-600"
                        onClick={async () => {
                          await deleteLead(lead.id);
                          await reload();
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {!filtered.length ? <p className="text-slate-500">No leads found.</p> : null}
            </div>
          </Card>
        </div>
      </AppShell>
    </Protected>
  );
}
