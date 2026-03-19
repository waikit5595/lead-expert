export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function asDate(input?: unknown) {
  if (!input) return null;
  if (typeof input === 'string') return new Date(input);
  if (typeof input === 'object' && input && 'toDate' in input && typeof (input as { toDate: () => Date }).toDate === 'function') {
    return (input as { toDate: () => Date }).toDate();
  }
  return new Date(String(input));
}

export function daysSince(input?: unknown) {
  const date = asDate(input);
  if (!date) return 999;
  const now = Date.now();
  return Math.floor((now - date.getTime()) / (1000 * 60 * 60 * 24));
}

export function formatDate(input?: unknown) {
  const date = asDate(input);
  if (!date) return '—';
  return date.toLocaleDateString();
}
