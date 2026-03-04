'use client';

import { useEffect, useState } from 'react';

import {
  Bars3Icon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  EllipsisVerticalIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import Link from 'next/link';
import Image from 'next/image';

import { BaseButton } from '@/shared/components/base';
import { useLayoutContext } from '@/shared/components/layout';
import { useAuth } from '@/features/auth/context/AuthContext';
import limeLogo from '@/shared/assets/images/Logo-LIME-NoFondo.png';

import { UserMenu } from './UserMenu';
import { NotificationBell } from './NotificationBell';
import { OnboardingReminder } from './OnboardingReminder';

function AppHeader() {
  const { toggleSidebar, toggleSidebarCollapse, isSidebarCollapsed } = useLayoutContext();
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isRestrictedRole = user?.role === 'paciente' || user?.role === 'visitante';

  useEffect(() => {
    const handler = () => {
      if (window.innerWidth >= 640) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  return (
    <>
    <OnboardingReminder />
    <header className="sticky top-0 z-50 border-b border-neutral-200 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
        {!isRestrictedRole && (
          <div className="flex items-center gap-3">
            <BaseButton
              variant="ghost"
              size="sm"
              aria-label={isSidebarCollapsed ? 'Expandir menú lateral' : 'Colapsar menú lateral'}
              onClick={toggleSidebarCollapse}
              className="hidden border border-transparent bg-neutral-100 text-neutral-700 hover:bg-neutral-200 lg:inline-flex"
            >
              {isSidebarCollapsed ? (
                <ChevronDoubleRightIcon className="h-5 w-5" aria-hidden="true" />
              ) : (
                <ChevronDoubleLeftIcon className="h-5 w-5" aria-hidden="true" />
              )}
            </BaseButton>
            <BaseButton
              variant="ghost"
              size="sm"
              aria-label="Alternar menú lateral"
              onClick={toggleSidebar}
              className="border border-transparent bg-neutral-100 text-neutral-700 hover:bg-neutral-200 lg:hidden"
            >
              <Bars3Icon className="h-5 w-5" aria-hidden="true" />
            </BaseButton>
          </div>
        )}

        {!isRestrictedRole && (
          <div className="hidden flex-1 items-center justify-center sm:flex">
            <HeaderSearch />
          </div>
        )}

        <div className="flex items-center gap-2 ml-auto">
          <NotificationBell />
          <div className="hidden sm:block">
            <UserMenu />
          </div>
          {!isRestrictedRole && (
            <BaseButton
              variant="ghost"
              size="sm"
              aria-label="Acciones"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="sm:hidden"
            >
              <EllipsisVerticalIcon className="h-5 w-5" aria-hidden="true" />
            </BaseButton>
          )}
        </div>
      </div>
      {!isRestrictedRole && (
        <div
          className={clsx(
            'grid gap-4 border-t border-neutral-200 px-4 py-4 transition-[grid-template-rows,padding] duration-200 ease-in-out sm:hidden',
            mobileMenuOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr] border-transparent py-0',
          )}
        >
          <div
            className={clsx(
              'overflow-hidden transition-opacity duration-150',
              mobileMenuOpen ? 'opacity-100' : 'opacity-0',
            )}
          >
            <HeaderSearch />
            <div className="mt-4">
              <UserMenu />
            </div>
          </div>
        </div>
      )}
    </header>
    </>
  );
}

function HeaderSearch() {
  return (
    <form role="search" className="w-full max-w-md">
      <label htmlFor="app-search" className="sr-only">
        Buscar en el sistema
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-neutral-400">
          <MagnifyingGlassIcon className="h-5 w-5" aria-hidden="true" />
        </span>
        <input
          id="app-search"
          type="search"
          placeholder="Buscar casos, pacientes o resultados"
          className="w-full rounded-lg border border-neutral-300 bg-white py-2 pl-10 pr-3 text-body-sm text-neutral-900 placeholder:text-neutral-400 focus:ring-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-blue-200"
        />
      </div>
    </form>
  );
}

export { AppHeader };
