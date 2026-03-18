import type { Metadata } from 'next';

import './globals.css';

import { AuthProvider } from '@/features/auth/context/AuthContext';
import { AuthLayout } from '@/features/auth/components/AuthLayout';

export const metadata: Metadata = {
  title: 'PathSys',
  description: 'Sistema de gestión de patología',
  icons: {
    icon: '/favico.png',
    shortcut: '/favico.png',
    apple: '/favico.png',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="bg-[var(--app-bg)] text-neutral-900">
        <AuthProvider>
          <AuthLayout>{children}</AuthLayout>
        </AuthProvider>
      </body>
    </html>
  );
}
