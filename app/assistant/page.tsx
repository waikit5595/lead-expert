'use client';

import { FormEvent, useState } from 'react';
import { AppShell } from '@/components/app-shell';
import { Card } from '@/components/cards';
import { Protected } from '@/components/protected';

interface ResultShape {
  message: string;
  bullets: string[];
}

export default function AssistantPage() {
  const [form, setForm] = useState({
    productName: '',
    location: '',
    priceRange: '',
    targetCustomer: '',
    sellingPoints: '',
  });
  const [result, setResult] = useState<ResultShape | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'sales_message', payload: form }),
    });
    const data = await res.json();
    setResult(data);
    setLoading(false);
  }

  return (
    <Protected>
      <AppShell>
        <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
          <Card title="AI Sales Assistant">
            <form className="space-y-4" onSubmit={onSubmit}>
              <input placeholder="Product Name" value={form.productName} onChange={(e) => setForm({ ...form, productName: e.target.value })} required />
              <input placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} required />
              <input placeholder="Price Range" value={form.priceRange} onChange={(e) => setForm({ ...form, priceRange: e.target.value })} required />
              <input placeholder="Target Customer" value={form.targetCustomer} onChange={(e) => setForm({ ...form, targetCustomer: e.target.value })} required />
              <textarea placeholder="Key Selling Points (comma separated)" rows={4} value={form.sellingPoints} onChange={(e) => setForm({ ...form, sellingPoints: e.target.value })} required />
              <button className="w-full rounded-xl bg-slate-900 px-4 py-3 font-medium text-white" disabled={loading}>
                {loading ? 'Generating...' : 'Generate Sales Message'}
              </button>
            </form>
          </Card>

          <Card title="Generated Result">
            {!result ? (
              <p className="text-slate-500">Your WhatsApp message will appear here.</p>
            ) : (
              <div className="space-y-4">
                <div className="rounded-2xl bg-slate-50 p-4 whitespace-pre-wrap">{result.message}</div>
                <div>
                  <p className="mb-2 font-semibold">Key Selling Points</p>
                  <ul className="list-disc space-y-1 pl-5 text-slate-700">
                    {result.bullets.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText(result.message)}
                  className="rounded-xl border border-slate-300 px-4 py-2"
                >
                  Copy Message
                </button>
              </div>
            )}
          </Card>
        </div>
      </AppShell>
    </Protected>
  );
}
