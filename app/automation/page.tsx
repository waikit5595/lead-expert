'use client';

import { useState } from 'react';
import { AppShell } from '@/components/app-shell';
import { Card } from '@/components/cards';
import { Protected } from '@/components/protected';

const defaultRules = [
  {
    name: 'Welcome Reply',
    trigger: 'first_inbound_message',
    enabled: true,
    template: 'Hi! Thanks for reaching out. I can help with pricing, details, and next steps. What would you like to know first?',
  },
  {
    name: 'After Hours Reply',
    trigger: 'outside_business_hours',
    enabled: false,
    template: 'Thanks for your message. We are currently offline and will reply during business hours. If urgent, leave your name and request here.',
  },
  {
    name: 'Follow Up Reminder',
    trigger: 'no_reply_24h',
    enabled: true,
    template: 'Hi! Just checking in on your earlier message. Let me know if you still want the latest details or pricing.',
  },
];

export default function AutomationPage() {
  const [rules, setRules] = useState(defaultRules);

  function toggle(index: number) {
    setRules((prev) => prev.map((r, i) => (i === index ? { ...r, enabled: !r.enabled } : r)));
  }

  return (
    <Protected>
      <AppShell>
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold">Automation</h2>
            <p className="text-slate-500">This page lets you define which WhatsApp situations should get a prepared auto-reply. For the free MVP, the rules are local UI settings. Persist them to Firestore in phase two.</p>
          </div>
          <div className="grid gap-4">
            {rules.map((rule, index) => (
              <Card key={rule.name} title={rule.name}>
                <div className="space-y-3 text-sm">
                  <p><span className="font-semibold">Trigger:</span> {rule.trigger}</p>
                  <textarea className="min-h-28 w-full rounded-2xl border border-slate-300 p-3" value={rule.template} onChange={(e) => setRules((prev) => prev.map((r, i) => (i === index ? { ...r, template: e.target.value } : r)))} />
                  <button onClick={() => toggle(index)} className={`rounded-xl px-4 py-2 text-white ${rule.enabled ? 'bg-green-600' : 'bg-slate-900'}`}>
                    {rule.enabled ? 'Enabled' : 'Enable Rule'}
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </AppShell>
    </Protected>
  );
}
