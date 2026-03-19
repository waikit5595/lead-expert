'use client';

import { FormEvent, useMemo, useState } from 'react';
import { AppShell } from '@/components/app-shell';
import { Card } from '@/components/cards';
import { Protected } from '@/components/protected';
import { useAuth } from '@/components/auth-provider';
import { addLead } from '@/lib/firestore';
import { SourcedLead } from '@/types';

export default function LeadFinderPage() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    category: 'beauty salon',
    keyword: '',
    location: 'Kuala Lumpur',
    maxResults: '8',
  });
  const [results, setResults] = useState<SourcedLead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [messageLoadingId, setMessageLoadingId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [savedIds, setSavedIds] = useState<Record<string, boolean>>({});

  const subtitle = useMemo(() => {
    const parts = [form.category, form.keyword, form.location].filter(Boolean);
    return parts.join(' • ');
  }, [form]);

  async function onSearch(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResults([]);

    try {
      const res = await fetch('/api/lead-finder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload: form }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Search failed');
      setResults(data.results || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  }

  async function saveBusinessLead(item: SourcedLead) {
    if (!user) return;
    setSavingId(item.sourceId);
    try {
      await addLead({
        userId: user.uid,
        name: item.name,
        phone: item.phone || 'No phone found',
        projectInterest: `${form.category} outreach`,
        budget: '',
        status: 'New',
        notes: [
          `Source: Google Places`,
          item.address ? `Address: ${item.address}` : '',
          item.website ? `Website: ${item.website}` : '',
          item.mapsUrl ? `Maps: ${item.mapsUrl}` : '',
          item.rating ? `Rating: ${item.rating}` : '',
        ]
          .filter(Boolean)
          .join('\n'),
        lastContact: new Date().toISOString(),
      });
      setSavedIds((prev) => ({ ...prev, [item.sourceId]: true }));
    } finally {
      setSavingId(null);
    }
  }

  async function generateOutreach(item: SourcedLead) {
    setMessageLoadingId(item.sourceId);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'outreach',
          payload: {
            businessName: item.name,
            category: form.category,
            location: form.location,
            keyword: form.keyword,
            address: item.address,
            rating: item.rating ? String(item.rating) : '',
            website: item.website,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      setMessages((prev) => ({ ...prev, [item.sourceId]: data.message }));
    } catch (err) {
      setMessages((prev) => ({
        ...prev,
        [item.sourceId]: err instanceof Error ? err.message : 'Generation failed',
      }));
    } finally {
      setMessageLoadingId(null);
    }
  }

  return (
    <Protected>
      <AppShell>
        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <Card title="Lead Finder">
            <p className="mb-4 text-sm text-slate-600">
              Search public business listings and turn them into leads you can follow up with.
            </p>
            <form className="space-y-4" onSubmit={onSearch}>
              <input placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required />
              <input placeholder="Keyword (optional)" value={form.keyword} onChange={(e) => setForm({ ...form, keyword: e.target.value })} />
              <input placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} required />
              <input placeholder="Max results" type="number" min={1} max={10} value={form.maxResults} onChange={(e) => setForm({ ...form, maxResults: e.target.value })} required />
              <button className="w-full rounded-xl bg-slate-900 px-4 py-3 font-medium text-white" disabled={loading}>
                {loading ? 'Searching...' : 'Search Leads'}
              </button>
            </form>
            <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
              <p className="font-semibold text-slate-800">Good examples</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>beauty salon • Malay skincare • Shah Alam</li>
                <li>property agency • condo investor • Petaling Jaya</li>
                <li>spa • facial • Klang Valley</li>
              </ul>
            </div>
          </Card>

          <Card title="Search Results">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-slate-500">{subtitle || 'No search yet'}</p>
              <p className="text-sm text-slate-500">{results.length} results</p>
            </div>

            {error ? <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

            <div className="space-y-4">
              {results.map((item) => (
                <div key={item.sourceId} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="max-w-3xl">
                      <p className="text-lg font-semibold">{item.name}</p>
                      <p className="mt-1 text-sm text-slate-600">{item.address || 'No address found'}</p>
                      <div className="mt-2 space-y-1 text-sm text-slate-600">
                        <p>Phone: {item.phone || 'Not available'}</p>
                        <p>Website: {item.website || 'Not available'}</p>
                        <p>
                          Rating: {item.rating ?? '—'}
                          {item.reviewCount ? ` (${item.reviewCount} reviews)` : ''}
                        </p>
                      </div>

                      {messages[item.sourceId] ? <div className="mt-3 whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-sm">{messages[item.sourceId]}</div> : null}
                    </div>

                    <div className="flex min-w-[180px] flex-col gap-2">
                      <button
                        className="rounded-xl bg-slate-900 px-4 py-2 text-white disabled:opacity-60"
                        disabled={savingId === item.sourceId || !!savedIds[item.sourceId]}
                        onClick={() => saveBusinessLead(item)}
                      >
                        {savedIds[item.sourceId] ? 'Saved to Leads' : savingId === item.sourceId ? 'Saving...' : 'Save to Leads'}
                      </button>
                      <button
                        className="rounded-xl border border-slate-300 px-4 py-2 disabled:opacity-60"
                        disabled={messageLoadingId === item.sourceId}
                        onClick={() => generateOutreach(item)}
                      >
                        {messageLoadingId === item.sourceId ? 'Generating...' : 'Generate Outreach'}
                      </button>
                      {messages[item.sourceId] ? (
                        <button className="rounded-xl border border-slate-300 px-4 py-2" onClick={() => navigator.clipboard.writeText(messages[item.sourceId])}>
                          Copy Message
                        </button>
                      ) : null}
                      {item.mapsUrl ? (
                        <a className="rounded-xl border border-slate-300 px-4 py-2 text-center" href={item.mapsUrl} target="_blank" rel="noreferrer">
                          Open Maps
                        </a>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}

              {!results.length && !loading ? <p className="text-slate-500">Search for public businesses to build your prospect list.</p> : null}
            </div>
          </Card>
        </div>
      </AppShell>
    </Protected>
  );
}
