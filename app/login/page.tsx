'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, loginWithGoogle } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard');
  }, [user, loading, router]);

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-8 text-center">
          <p className="mb-2 text-sm font-medium text-slate-500">Closer AI</p>
          <h1 className="text-3xl font-bold">Welcome back</h1>
          <p className="mt-2 text-sm text-slate-600">Sign in to manage leads, generate outreach, and follow up faster.</p>
        </div>

        <button
          className="w-full rounded-xl bg-slate-900 px-4 py-3 font-medium text-white disabled:opacity-60"
          disabled={loading || submitting}
          onClick={async () => {
            try {
              setSubmitting(true);
              setError('');
              await loginWithGoogle();
              router.replace('/dashboard');
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Login failed');
            } finally {
              setSubmitting(false);
            }
          }}
        >
          {submitting ? 'Signing in...' : 'Continue with Google'}
        </button>

        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

        <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
          <p className="font-semibold text-slate-800">Included in this MVP</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Lead CRM</li>
            <li>AI sales message generator</li>
            <li>Public business lead finder</li>
            <li>Follow-up reminders</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
