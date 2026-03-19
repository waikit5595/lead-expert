export type ContactType = 'unknown' | 'lead' | 'customer' | 'personal';

export function shouldAutoReply(type?: string) {
  return type === 'lead' || type === 'customer';
}