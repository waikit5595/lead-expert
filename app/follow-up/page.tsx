'use client';

import { useEffect, useMemo, useState } from 'react';
import { db } from '@/lib/firebase';
import {
  collection,
  onSnapshot,
  orderBy,
  query,
} from 'firebase/firestore';
import {
  defaultFollowUpSettings,
  type FollowUpSettings,
} from '@/lib/followup-rules';

type Message = {
  id: string;
  from: string;
  name: string;
  text: string;
  direction?: 'inbound' | 'outbound';
  createdAt?: any;
};

type Contact = {
  id: string;
  phone: string;
  name: string;
  type?: 'unknown' | 'lead' | 'customer' | 'personal';
  autoReplyEnabled?: boolean;
};

type Template = {
  id: string;
  title: string;
  category: string;
  content: string;
};

type FollowUpItem = {
  phone: string;
  name: string;
  type: string;
  priority: 'normal' | 'high';
  daysSinceInbound: number;
  lastInboundText: string;
  latestInboundAt: number;
  recommendedTemplate?: string;
};

function toMillis(value: any): number {
  if (!value) return 0;

  if (typeof value?.toDate === 'function') {
    return value.toDate().getTime();
  }

  if (typeof value?.seconds === 'number') {
    return value.seconds * 1000;
  }

  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

function daysBetween(fromMs: number, toMs: number) {
  const diff = toMs - fromMs;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export default function FollowUpPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [settings, setSettings] = useState<FollowUpSettings>(defaultFollowUpSettings);

  const [selected, setSelected] = useState<FollowUpItem | null>(null);
  const [draft, setDraft] = useState('');
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [sending, setSending] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'messages'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Message[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as any),
      }));
      setMessages(data);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'contacts'), (snapshot) => {
      const data: Contact[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as any),
      }));
      setContacts(data);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadTemplates() {
      try {
        const res = await fetch('/api/templates');
        const data = await res.json();

        if (mounted && data.success) {
          setTemplates(data.templates || []);
        }
      } catch (error) {
        console.error(error);
      }
    }

    async function loadSettings() {
      try {
        const res = await fetch('/api/followup-settings');
        const data = await res.json();

        if (mounted && data.success) {
          setSettings(data.settings);
        }
      } catch (error) {
        console.error(error);
      }
    }

    loadTemplates();
    loadSettings();

    return () => {
      mounted = false;
    };
  }, []);

  const recommendedFollowupTemplate = useMemo(() => {
    return templates.find((t) => t.category === 'follow-up')?.content || '';
  }, [templates]);

  const followUps = useMemo(() => {
    const now = Date.now();
    const map = new Map<string, Message[]>();

    for (const msg of messages) {
      if (!map.has(msg.from)) {
        map.set(msg.from, []);
      }
      map.get(msg.from)!.push(msg);
    }

    const rows: FollowUpItem[] = [];

    for (const contact of contacts) {
      if (contact.type !== 'lead' && contact.type !== 'customer') continue;

      const convo = (map.get(contact.phone) || []).slice();

      if (convo.length === 0) continue;

      const inboundMessages = convo.filter((m) => m.direction !== 'outbound');
      const outboundMessages = convo.filter((m) => m.direction === 'outbound');

      if (inboundMessages.length === 0) continue;

      const latestInbound = inboundMessages.reduce((a, b) =>
        toMillis(a.createdAt) > toMillis(b.createdAt) ? a : b
      );

      const latestOutbound = outboundMessages.length
        ? outboundMessages.reduce((a, b) =>
            toMillis(a.createdAt) > toMillis(b.createdAt) ? a : b
          )
        : null;

      const latestInboundAt = toMillis(latestInbound.createdAt);
      const latestOutboundAt = latestOutbound ? toMillis(latestOutbound.createdAt) : 0;

      const daysSinceInbound = daysBetween(latestInboundAt, now);

      if (
        latestOutboundAt > latestInboundAt &&
        daysBetween(latestOutboundAt, now) < settings.firstReminderDays
      ) {
        continue;
      }

      if (daysSinceInbound < settings.firstReminderDays) continue;

      rows.push({
        phone: contact.phone,
        name: contact.name || latestInbound.name || 'Unknown',
        type: contact.type || 'lead',
        priority:
          daysSinceInbound >= settings.highPriorityDays ? 'high' : 'normal',
        daysSinceInbound,
        lastInboundText: latestInbound.text,
        latestInboundAt,
        recommendedTemplate: recommendedFollowupTemplate,
      });
    }

    return rows.sort((a, b) => {
      if (a.priority === 'high' && b.priority !== 'high') return -1;
      if (a.priority !== 'high' && b.priority === 'high') return 1;
      return b.daysSinceInbound - a.daysSinceInbound;
    });
  }, [messages, contacts, settings, recommendedFollowupTemplate]);

  const stats = useMemo(() => {
    return {
      total: followUps.length,
      high: followUps.filter((x) => x.priority === 'high').length,
      normal: followUps.filter((x) => x.priority === 'normal').length,
    };
  }, [followUps]);

  async function saveSettings() {
    try {
      setSavingSettings(true);

      const res = await fetch('/api/followup-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      const data = await res.json();

      if (!data.success) {
        alert(data.error || 'Failed to save settings');
        return;
      }

      alert('✅ Follow-up settings saved');
    } catch (error) {
      console.error(error);
      alert('❌ Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  }

  async function generateFollowUp(item: FollowUpItem) {
    try {
      setSelected(item);
      setLoadingDraft(true);
      setDraft('');

      if (settings.autoDraftEnabled && item.recommendedTemplate) {
        const res = await fetch('/api/generate-followup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item),
        });

        const data = await res.json();
        setDraft(data.reply || 'No follow-up generated');
      } else {
        setDraft(item.recommendedTemplate || '');
      }
    } catch (error) {
      console.error(error);
      setDraft('Failed to generate follow-up');
    } finally {
      setLoadingDraft(false);
    }
  }

  async function sendFollowUp() {
    if (!selected || !draft.trim()) return;

    try {
      setSending(true);

      const res = await fetch('/api/send-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: selected.phone,
          name: selected.name,
          message: draft,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        alert(`❌ Failed to send: ${data.error || 'Unknown error'}`);
        return;
      }

      alert('✅ Follow-up sent');
      setDraft('');
    } catch (error) {
      console.error(error);
      alert('❌ Failed to send follow-up');
    } finally {
      setSending(false);
    }
  }

  function typeBadge(type: string) {
    if (type === 'customer') return 'bg-green-100 text-green-700';
    return 'bg-blue-100 text-blue-700';
  }

  function priorityBadge(priority: 'normal' | 'high') {
    return priority === 'high'
      ? 'bg-red-100 text-red-700'
      : 'bg-yellow-100 text-yellow-700';
  }

  return (
    <div className="p-6 h-[calc(100vh-40px)] space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Follow Up</h1>
        <p className="text-sm text-gray-500 mt-1">
          Automatically identify leads that need follow-up and generate smart WhatsApp drafts.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard title="Need Follow Up" value={stats.total} />
        <StatCard title="High Priority" value={stats.high} />
        <StatCard title="Normal Priority" value={stats.normal} />
      </div>

      {/* Rules */}
      <div className="border rounded-2xl bg-white p-5 space-y-4">
        <div className="font-semibold">Follow-up Rules</div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-gray-500 mb-1">
              First Reminder (days)
            </label>
            <input
              type="number"
              min={1}
              value={settings.firstReminderDays}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  firstReminderDays: Number(e.target.value || 1),
                }))
              }
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-500 mb-1">
              High Priority (days)
            </label>
            <input
              type="number"
              min={1}
              value={settings.highPriorityDays}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  highPriorityDays: Number(e.target.value || 1),
                }))
              }
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-500 mb-1">
              Auto Draft Generation
            </label>
            <select
              value={settings.autoDraftEnabled ? 'on' : 'off'}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  autoDraftEnabled: e.target.value === 'on',
                }))
              }
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              <option value="on">ON</option>
              <option value="off">OFF</option>
            </select>
          </div>
        </div>

        <button
          onClick={saveSettings}
          disabled={savingSettings}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50"
        >
          {savingSettings ? 'Saving...' : 'Save Follow-up Settings'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[420px_1fr] gap-6 h-[calc(100%-290px)]">
        <div className="border rounded-2xl bg-white overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b">
            <h2 className="font-semibold">Need Follow Up</h2>
            <p className="text-sm text-gray-500">
              {followUps.length} contact{followUps.length === 1 ? '' : 's'}
            </p>
          </div>

          <div className="overflow-y-auto flex-1 p-3 space-y-3">
            {followUps.length === 0 ? (
              <div className="text-sm text-gray-500">
                No follow-up needed right now.
              </div>
            ) : (
              followUps.map((item) => (
                <button
                  key={item.phone}
                  type="button"
                  onClick={() => {
                    setSelected(item);
                    setDraft('');
                  }}
                  className={`w-full text-left border rounded-xl p-4 transition ${
                    selected?.phone === item.phone
                      ? 'bg-blue-100 border-blue-300'
                      : 'bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium">{item.name}</div>
                    <span className={`text-xs px-2 py-1 rounded-full ${typeBadge(item.type)}`}>
                      {item.type}
                    </span>
                  </div>

                  <div className="text-sm text-gray-500 mt-1">{item.phone}</div>
                  <div className="text-sm mt-2 line-clamp-2">{item.lastInboundText}</div>

                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    <span className={`text-xs px-2 py-1 rounded-full ${priorityBadge(item.priority)}`}>
                      {item.priority}
                    </span>
                    <span className="text-xs text-orange-600">
                      {item.daysSinceInbound} day(s) since last inbound
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="border rounded-2xl bg-white overflow-hidden flex flex-col">
          {selected ? (
            <>
              <div className="px-5 py-4 border-b">
                <h2 className="font-semibold text-lg">{selected.name}</h2>
                <p className="text-sm text-gray-500">{selected.phone}</p>
                <p className="text-sm text-orange-600 mt-2">
                  {selected.daysSinceInbound} day(s) since last inbound
                </p>
              </div>

              <div className="p-5 space-y-4 flex-1 overflow-y-auto">
                <div>
                  <label className="block text-sm text-gray-500 mb-2">Last inbound message</label>
                  <div className="border rounded-xl p-4 bg-gray-50">
                    {selected.lastInboundText}
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-500 mb-2">Recommended template</label>
                  <div className="border rounded-xl p-4 bg-gray-50 whitespace-pre-wrap">
                    {selected.recommendedTemplate || 'No follow-up template found.'}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => generateFollowUp(selected)}
                    disabled={loadingDraft}
                    className="px-4 py-2 rounded-lg bg-black text-white disabled:opacity-50"
                  >
                    {loadingDraft ? 'Generating...' : 'Generate Follow-up'}
                  </button>
                </div>

                <div>
                  <label className="block text-sm text-gray-500 mb-2">Follow-up Draft</label>
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Generate or type a follow-up message here..."
                    className="w-full min-h-[180px] border rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={sendFollowUp}
                    disabled={sending || !draft.trim()}
                    className="px-4 py-2 rounded-lg bg-green-600 text-white disabled:opacity-50"
                  >
                    {sending ? 'Sending...' : 'Send Follow-up'}
                  </button>

                  <button
                    onClick={() => setDraft('')}
                    disabled={!draft}
                    className="px-4 py-2 rounded-lg border disabled:opacity-50"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              Select a contact
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="border rounded-2xl bg-white p-5">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-3xl font-bold mt-2">{value}</div>
    </div>
  );
}