'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { AppLayout } from '@/app/layouts/app-layout';
import { LayoutShell } from '@/shared/components/layout';
import { AppHeader } from '@/shared/components/navigation';
import { useAuth } from '../context/AuthContext';
import { LoginView } from './LoginView';

type AuthLayoutProps = {
  children: ReactNode;
};

export function AuthLayout({ children }: AuthLayoutProps) {
  const { isLoggedIn, isLoading, user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  // Roles con acceso restringido únicamente a /cases
  const isRestrictedRole = user?.role === 'paciente' || user?.role === 'visitante';

  useEffect(() => {
    if (isRestrictedRole && !pathname.startsWith('/cases')) {
      router.replace('/cases');
    }
  }, [isRestrictedRole, pathname, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#001730]">
        <div className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return <LoginView />;
  }

  // Paciente / Visitante: solo pueden ver /cases. Bloquear cualquier otra ruta.
  if (isRestrictedRole) {
    if (!pathname.startsWith('/cases')) {
      // Redirigiendo — mostrar spinner para evitar flash de contenido no autorizado
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#001730]">
          <div className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      );
    }
    return (
      <LayoutShell header={<AppHeader />}>
        {children}
      </LayoutShell>
    );
  }

  return <AppLayout>{children}</AppLayout>;
}
