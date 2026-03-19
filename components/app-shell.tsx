'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BarChart3, Bot, ClipboardList, Inbox, LogOut, MapPinned, Settings, Users, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/auth-provider';

const items = [
  { href: '/dashboard', label: 'Dashboard', icon: BarChart3 },
  { href: '/leads', label: 'Leads', icon: Users },
  { href: '/lead-finder', label: 'Lead Finder', icon: MapPinned },
  { href: '/assistant', label: 'AI Assistant', icon: Bot },
  { href: '/inbox', label: 'WhatsApp Inbox', icon: Inbox },
  { href: '/automation', label: 'Automation', icon: Zap },
  { href: '/follow-up', label: 'Follow Up', icon: ClipboardList },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="border-r border-slate-200 bg-white p-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Closer AI</h1>
          <p className="text-sm text-slate-500">Sales MVP</p>
        </div>
        <nav className="space-y-1">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium',
                  pathname === item.href ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100',
                )}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-8 rounded-xl bg-slate-100 p-3 text-sm text-slate-600">
          <p className="font-semibold text-slate-800">Signed in as</p>
          <p>{user?.displayName || user?.email || 'Unknown user'}</p>
          <button
            onClick={async () => {
              await logout();
              router.push('/login');
            }}
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-slate-800 shadow-sm hover:bg-slate-50"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>
      <main className="p-4 md:p-8">{children}</main>
    </div>
  );
}
