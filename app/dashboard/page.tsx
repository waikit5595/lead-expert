'use client';

import Link from 'next/link';
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
  notes?: string;
  interest?: string;
  budget?: string;
  area?: string;
  updatedAt?: any;
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

export default function DashboardPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);

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

  const stats = useMemo(() => {
    const totalContacts = contacts.length;
    const leads = contacts.filter((c) => c.type === 'lead').length;
    const customers = contacts.filter((c) => c.type === 'customer').length;
    const personal = contacts.filter((c) => c.type === 'personal').length;
    const unknown = contacts.filter((c) => !c.type || c.type === 'unknown').length;
    const autoReplyOn = contacts.filter((c) => c.autoReplyEnabled).length;

    const now = Date.now();

    const messageMap = new Map<string, Message[]>();
    for (const msg of messages) {
      if (!messageMap.has(msg.from)) {
        messageMap.set(msg.from, []);
      }
      messageMap.get(msg.from)!.push(msg);
    }

    let needFollowUp = 0;

    for (const contact of contacts) {
      if (contact.type !== 'lead' && contact.type !== 'customer') continue;

      const convo = messageMap.get(contact.phone) || [];
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

      if (latestOutboundAt > latestInboundAt && daysBetween(latestOutboundAt, now) < 2) {
        continue;
      }

      if (daysSinceInbound >= 2) {
        needFollowUp += 1;
      }
    }

    return {
      totalContacts,
      leads,
      customers,
      personal,
      unknown,
      autoReplyOn,
      needFollowUp,
    };
  }, [contacts, messages]);

  const recentActivities = useMemo(() => {
    return messages.slice(0, 8);
  }, [messages]);

  const hotLeads = useMemo(() => {
    return contacts.filter(
      (c) =>
        (c.type === 'lead' || c.type === 'customer') &&
        (c.interest || c.budget || c.area)
    ).slice(0, 6);
  }, [contacts]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Your AI WhatsApp CRM workspace for leads, follow-up, and sales conversion.
        </p>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Total Contacts" value={stats.totalContacts} />
        <StatCard title="Leads" value={stats.leads} />
        <StatCard title="Customers" value={stats.customers} />
        <StatCard title="Need Follow Up" value={stats.needFollowUp} />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Unknown" value={stats.unknown} />
        <StatCard title="Personal" value={stats.personal} />
        <StatCard title="Auto Reply ON" value={stats.autoReplyOn} />
        <StatCard title="Tracked Contacts" value={stats.totalContacts - stats.unknown} />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <QuickLinkCard
          title="Open Inbox"
          description="Reply to WhatsApp messages, classify contacts, and send AI-assisted replies."
          href="/inbox"
        />
        <QuickLinkCard
          title="Manage Leads"
          description="View and organize leads, customers, personal contacts, and unknown contacts."
          href="/leads"
        />
        <QuickLinkCard
          title="Find Public Leads"
          description="Search business leads by category and location, then save to your CRM."
          href="/lead-finder"
        />
        <QuickLinkCard
          title="Follow Up Queue"
          description="See who needs a follow-up and generate WhatsApp follow-up drafts quickly."
          href="/follow-up"
        />
        <QuickLinkCard
          title="Billing & Plans"
          description="Upgrade your plan, manage subscription, and unlock more features."
          href="/billing"
        />
      </div>

      {/* Main Panels */}
      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_1fr] gap-6">
        <div className="border rounded-2xl bg-white overflow-hidden">
          <div className="px-5 py-4 border-b">
            <h2 className="font-semibold text-lg">Recent Message Activity</h2>
            <p className="text-sm text-gray-500">
              Latest inbound and outbound WhatsApp activity.
            </p>
          </div>

          <div className="divide-y">
            {recentActivities.length === 0 ? (
              <div className="p-5 text-sm text-gray-500">No activity yet.</div>
            ) : (
              recentActivities.map((msg) => (
                <div key={msg.id} className="p-4 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm text-gray-500">
                      {msg.name} ({msg.from})
                    </div>
                    <div className="mt-1 font-medium truncate">{msg.text}</div>
                  </div>

                  <span
                    className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${
                      msg.direction === 'outbound'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {msg.direction === 'outbound' ? 'outbound' : 'inbound'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="border rounded-2xl bg-white overflow-hidden">
          <div className="px-5 py-4 border-b">
            <h2 className="font-semibold text-lg">Tracked Lead Profiles</h2>
            <p className="text-sm text-gray-500">
              Contacts with saved project interest, budget, or area preferences.
            </p>
          </div>

          <div className="divide-y">
            {hotLeads.length === 0 ? (
              <div className="p-5 text-sm text-gray-500">
                No tracked lead profiles yet. Save project, budget, or area in Inbox.
              </div>
            ) : (
              hotLeads.map((lead) => (
                <div key={lead.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-medium">{lead.name}</div>
                      <div className="text-sm text-gray-500">{lead.phone}</div>
                    </div>

                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        lead.type === 'customer'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {lead.type}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-2 text-sm text-gray-700">
                    {lead.interest ? <div><span className="text-gray-500">Interest:</span> {lead.interest}</div> : null}
                    {lead.area ? <div><span className="text-gray-500">Area:</span> {lead.area}</div> : null}
                    {lead.budget ? <div><span className="text-gray-500">Budget:</span> {lead.budget}</div> : null}
                    {lead.notes ? <div><span className="text-gray-500">Notes:</span> {lead.notes}</div> : null}
                  </div>
                </div>
              ))
            )}
          </div>
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

function QuickLinkCard({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="border rounded-2xl bg-white p-5 block hover:bg-gray-50 transition"
    >
      <div className="font-semibold">{title}</div>
      <div className="text-sm text-gray-500 mt-2">{description}</div>
    </Link>
  );
}