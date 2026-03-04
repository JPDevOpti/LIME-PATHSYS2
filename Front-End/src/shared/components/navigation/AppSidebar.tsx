'use client';

import Image from 'next/image';
import Link from 'next/link';
import clsx from 'clsx';

import { PrimaryNav } from './PrimaryNav';
import { useLayoutContext } from '@/shared/components/layout';
import limeLogoFull from '@/shared/assets/images/Logo-LIME-NoFondo.png';
import limeLogoMark from '@/shared/assets/images/LOGO-LIME-Inicial.png';

type AppSidebarProps = {
  display?: 'desktop' | 'mobile';
};

function AppSidebar({ display = 'desktop' }: AppSidebarProps) {
  const { closeSidebar, isSidebarCollapsed, isSidebarHovered } = useLayoutContext();

  const isMobile = display === 'mobile';
  const isExpanded = isMobile || !isSidebarCollapsed || isSidebarHovered;

  return (
    <div className={clsx('flex h-full flex-col', isExpanded ? '' : 'items-center')}>
      <div className="flex w-full shrink-0 items-center justify-center">
        <Link
          href="/"
          className="flex items-center justify-center"
          onClick={closeSidebar}
          aria-label="Ir al inicio"
        >
          <div
            className={clsx(
              'relative overflow-hidden transition-all duration-300',
              isExpanded ? 'h-24 w-48' : 'h-10 w-10',
            )}
          >
            <Image
              src={isExpanded ? limeLogoFull : limeLogoMark}
              alt="LIME PathSys"
              fill
              sizes={isExpanded ? '192px' : '40px'}
              className="object-contain"
              priority
            />
          </div>
        </Link>
      </div>
      <div className={clsx('mt-6 flex-1 overflow-y-auto pr-1', isExpanded ? '' : 'w-full')}>
        <PrimaryNav onNavigate={closeSidebar} isExpanded={isExpanded} />
      </div>
      <div className="mt-auto w-full border-t border-neutral-200 px-4 pt-4 pb-2">
        {isExpanded ? (
          <div className="flex flex-col gap-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
              Desarrollado por
            </p>
            <a
              href="https://github.com/JPDevOpti"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-bold text-neutral-700 transition-colors hover:text-lime-brand-700 hover:underline"
            >
              Juan Pablo Restrepo Mancilla
            </a>
            <span className="text-[10px] text-neutral-400">v1.0.0</span>
          </div>
        ) : (
          <div className="flex justify-center" title="Desarrollado por Juan Pablo Restrepo Mancilla">
            <span className="text-xs font-bold text-neutral-400">JP</span>
          </div>
        )}
      </div>
    </div>
  );
}

export { AppSidebar };
