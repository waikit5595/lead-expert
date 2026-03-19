import './globals.css';
import { AuthProvider } from '@/components/auth-provider';

export const metadata = {
  title: 'Closer AI',
  description: 'Sales MVP with AI assistant and lead finder',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
