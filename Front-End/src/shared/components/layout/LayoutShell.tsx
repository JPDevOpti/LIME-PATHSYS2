'use client';

import type { FocusEvent, ReactElement, ReactNode } from 'react';
import { Fragment, cloneElement, isValidElement, useCallback, useEffect, useMemo } from 'react';
import { twMerge } from 'tailwind-merge';

import { LayoutProvider, useLayoutContext } from './LayoutContext';

type SidebarRenderer = ReactElement | null;

type ContentPadding = 'none' | 'sm' | 'md' | 'lg';
type ContentWidth = 'full' | 'xl' | '2xl';

type LayoutShellProps = {
  header?: ReactNode;
  sidebar?: SidebarRenderer;
  children: ReactNode;
  contentPadding?: ContentPadding;
  maxContentWidth?: ContentWidth;
};

const paddingMap: Record<ContentPadding, string> = {
  none: 'px-0 py-0',
  sm: 'px-2 py-2 sm:px-3 sm:py-3',
  md: 'px-3 py-3 sm:px-4 sm:py-4 2xl:px-6 2xl:py-6',
  lg: 'px-4 py-4 sm:px-6 sm:py-6 2xl:px-8 2xl:py-8',
};

const widthMap: Record<ContentWidth, string> = {
  full: 'max-w-full',
  xl: 'max-w-screen-xl',
  '2xl': 'max-w-screen-2xl',
};

function LayoutShell({
  header,
  sidebar,
  children,
  contentPadding = 'md',
  maxContentWidth = '2xl',
}: LayoutShellProps) {
  return (
    <LayoutProvider>
      <LayoutViewport
        header={header}
        sidebar={sidebar}
        contentPadding={contentPadding}
        maxContentWidth={maxContentWidth}
      >
        {children}
      </LayoutViewport>
    </LayoutProvider>
  );
}

type LayoutViewportProps = {
  header?: ReactNode;
  sidebar?: SidebarRenderer;
  children: ReactNode;
  contentPadding: ContentPadding;
  maxContentWidth: ContentWidth;
};

function LayoutViewport({
  header,
  sidebar,
  children,
  contentPadding,
  maxContentWidth,
}: LayoutViewportProps) {
  const {
    isSidebarOpen,
    closeSidebar,
    isSidebarCollapsed,
    isSidebarHovered,
    setSidebarHovered,
  } = useLayoutContext();

  const isDesktopSidebarExpanded = !isSidebarCollapsed || isSidebarHovered;

  const renderSidebar = useMemo(() => {
    if (!sidebar) return null;

    return (display: 'desktop' | 'mobile', key: string) => {
      if (!sidebar) return null;

      if (isValidElement(sidebar)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return cloneElement(sidebar as ReactElement<any>, { key, display });
      }

      return <Fragment key={key}>{sidebar}</Fragment>;
    };
  }, [sidebar]);

  const handleSidebarMouseEnter = useCallback(() => {
    setSidebarHovered(true);
  }, [setSidebarHovered]);

  const handleSidebarMouseLeave = useCallback(() => {
    setSidebarHovered(false);
  }, [setSidebarHovered]);

  const handleSidebarBlur = useCallback(
    (event: FocusEvent<HTMLDivElement>) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
        setSidebarHovered(false);
      }
    },
    [setSidebarHovered],
  );

  const handleSidebarFocus = useCallback(() => {
    setSidebarHovered(true);
  }, [setSidebarHovered]);

  useEffect(() => {
    if (!isSidebarOpen) {
      document.body.classList.remove('overflow-hidden');
      return;
    }

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeSidebar();
      }
    };

    document.body.classList.add('overflow-hidden');
    window.addEventListener('keydown', handleKeydown);

    return () => {
      document.body.classList.remove('overflow-hidden');
      window.removeEventListener('keydown', handleKeydown);
    };
  }, [isSidebarOpen, closeSidebar]);

  return (
    <div className="relative flex min-h-screen bg-[var(--app-bg)] text-neutral-900">
      {sidebar && renderSidebar ? (
        <>
          <aside
            className={twMerge(
              'sticky top-0 hidden h-screen flex-shrink-0 border-r border-neutral-200 bg-white pt-6 pb-0 transition-[width] duration-300 ease-in-out lg:flex lg:flex-col lg:shadow-none',
              isDesktopSidebarExpanded ? 'w-72 px-4' : 'w-20 px-2 items-center',
            )}
            onMouseEnter={handleSidebarMouseEnter}
            onMouseLeave={handleSidebarMouseLeave}
            onFocus={handleSidebarFocus}
            onBlur={handleSidebarBlur}
          >
            {renderSidebar('desktop', 'desktop')}
          </aside>
          <div
            className={twMerge(
              'fixed inset-y-0 left-0 z-50 w-72 max-w-[80vw] transform bg-white shadow-elevation-lg transition-transform duration-300 ease-in-out lg:hidden',
              isSidebarOpen ? 'translate-x-0' : '-translate-x-full',
            )}
          >
            <div className="h-full overflow-y-auto px-4 py-6">
              {renderSidebar('mobile', 'mobile')}
            </div>
          </div>
          <button
            type="button"
            className={twMerge(
              'fixed inset-0 z-40 bg-neutral-900/40 backdrop-blur-sm transition-opacity duration-300 ease-in-out lg:hidden',
              isSidebarOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
            )}
            aria-label="Cerrar menú de navegación"
            onClick={closeSidebar}
          />
        </>
      ) : null}
      <div className="relative flex min-h-screen flex-1 flex-col">
        {header ?? null}
        <main className="flex-1 overflow-x-hidden">
          <div className={twMerge('mx-auto w-full', widthMap[maxContentWidth], paddingMap[contentPadding])}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export { LayoutShell };
