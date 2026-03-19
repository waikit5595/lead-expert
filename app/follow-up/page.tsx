'use client';

import { useEffect, useMemo, useState } from 'react';
import { db } from '@/lib/firebase';
import {
  collection,
  onSnapshot,
  orderBy,
  query,
} from 'firebase/firestore';

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

type FollowUpItem = {
  phone: string;
  name: string;
  type: string;
  daysSinceInbound: number;
  lastInboundText: string;
  latestInboundAt: number;
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
  const [selected, setSelected] = useState<FollowUpItem | null>(null);
  const [draft, setDraft] = useState('');
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [sending, setSending] = useState(false);
  const [minDays, setMinDays] = useState(2);

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

      if (latestOutboundAt > latestInboundAt && daysBetween(latestOutboundAt, now) < minDays) {
        continue;
      }

      if (daysSinceInbound < minDays) continue;

      rows.push({
        phone: contact.phone,
        name: contact.name || latestInbound.name || 'Unknown',
        type: contact.type || 'lead',
        daysSinceInbound,
        lastInboundText: latestInbound.text,
        latestInboundAt,
      });
    }

    return rows.sort((a, b) => b.daysSinceInbound - a.daysSinceInbound);
  }, [messages, contacts, minDays]);

  async function generateFollowUp(item: FollowUpItem) {
    try {
      setSelected(item);
      setLoadingDraft(true);
      setDraft('');

      const res = await fetch('/api/generate-followup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });

      const data = await res.json();
      setDraft(data.reply || 'No follow-up generated');
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

  return (
    <div className="p-6 h-[calc(100vh-40px)]">
      <h1 className="text-2xl font-bold mb-6">Follow Up</h1>

      <div className="mb-4 flex items-center gap-3">
        <label className="text-sm text-gray-600">Show contacts with no reply for at least</label>
        <select
          value={minDays}
          onChange={(e) => setMinDays(Number(e.target.value))}
          className="border rounded-lg px-3 py-2"
        >
          <option value={1}>1 day</option>
          <option value={2}>2 days</option>
          <option value={3}>3 days</option>
          <option value={5}>5 days</option>
          <option value={7}>7 days</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[420px_1fr] gap-6 h-[calc(100%-92px)]">
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
                  <div className="text-xs text-orange-600 mt-2">
                    {item.daysSinceInbound} day(s) since last inbound
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

              <div className="p-5 space-y-4 flex-1">
                <div>
                  <label className="block text-sm text-gray-500 mb-2">Last inbound message</label>
                  <div className="border rounded-xl p-4 bg-gray-50">
                    {selected.lastInboundText}
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