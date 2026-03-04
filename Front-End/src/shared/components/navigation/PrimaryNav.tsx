'use client';

import { Disclosure, Transition } from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useAuth } from '@/features/auth/context/AuthContext';
import type { NavItem, NavSection } from './nav-config';
import { applicationNav, filterNavByRole } from './nav-config';

function isActive(pathname: string, href: string) {
  if (href === '/') {
    return pathname === href;
  }

  // Handle dynamic edit routes: /resource/edit matches /resource/123/edit
  if (href.endsWith('/edit') && pathname.startsWith(href.replace('/edit', '/')) && pathname.endsWith('/edit')) {
    return true;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

type PrimaryNavProps = {
  sections?: NavSection[];
  onNavigate?: () => void;
  isExpanded?: boolean;
};

function PrimaryNav({ sections, onNavigate, isExpanded = true }: PrimaryNavProps) {
  const pathname = usePathname() ?? '/';
  const { user, isLoading } = useAuth();
  const role = isLoading ? null : (user?.role ?? null);
  const filteredSections = sections ?? filterNavByRole(applicationNav, role);

  const handleNavigate = () => {
    if (onNavigate) {
      onNavigate();
    }
  };

  return (
    <nav aria-label="Navegación principal" className="flex flex-1 flex-col gap-6">
      {filteredSections.map((section) => (
        <div key={section.title} className="flex flex-col gap-3">
          {isExpanded ? (
            <p className="px-2 text-body-xs font-semibold uppercase tracking-wide text-neutral-400">
              {section.title}
            </p>
          ) : null}
          <ul className="flex flex-col gap-1">
            {section.items.map((item) => (
              <li key={item.title}>
                {item.children ? (
                  <NavDisclosure
                    item={item}
                    pathname={pathname}
                    onNavigate={handleNavigate}
                    isExpanded={isExpanded}
                  />
                ) : (
                  <NavLink
                    item={item}
                    pathname={pathname}
                    onNavigate={handleNavigate}
                    isExpanded={isExpanded}
                  />
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

type NavLinkProps = {
  item: NavItem;
  pathname: string;
  onNavigate?: () => void;
  isExpanded: boolean;
};

function NavLink({ item, pathname, onNavigate, isExpanded }: NavLinkProps) {
  const active = isActive(pathname, item.href);
  const Icon = item.icon;

  return (
    <Link
      href={{ pathname: item.href }}
      onClick={onNavigate}
      aria-label={item.title}
      className={clsx(
        'group flex items-center gap-3 rounded-lg py-2 text-body-sm font-medium transition-colors duration-200',
        isExpanded ? 'px-2' : 'justify-center',
        active
          ? 'bg-lime-brand-50 text-lime-brand-700'
          : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900',
      )}
    >
      <span
        className={clsx(
          'inline-flex h-9 w-9 items-center justify-center rounded-md border text-neutral-500 transition-colors duration-200',
          active
            ? 'border-transparent bg-lime-brand-100 text-lime-brand-700'
            : 'border-neutral-200 bg-white group-hover:border-neutral-300 group-hover:text-neutral-900',
        )}
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      {isExpanded ? <span className="flex-1 text-left">{item.title}</span> : null}
      {isExpanded && item.badge ? <Badge variant={item.badge} /> : null}
    </Link>
  );
}

type NavDisclosureProps = {
  item: NavItem;
  pathname: string;
  onNavigate?: () => void;
  isExpanded: boolean;
};

function NavDisclosure({ item, pathname, onNavigate, isExpanded }: NavDisclosureProps) {
  const Icon = item.icon;
  const hasActiveChild = item.children?.some((child) => isActive(pathname, child.href));

  // Logic to determine the specific active child (handling URL overlaps like /cases vs /cases/create)
  const children = item.children || [];
  const activeChild = children
    .filter((child) => isActive(pathname, child.href))
    .sort((a, b) => b.href.length - a.href.length)[0];

  return (
    <Disclosure defaultOpen={hasActiveChild}>
      {({ open }) => (
        <div>
          <Disclosure.Button
            className={clsx(
              'flex w-full items-center gap-3 rounded-lg py-2 text-body-sm font-medium transition-colors duration-200',
              isExpanded ? 'px-2' : 'justify-center',
              hasActiveChild || open
                ? 'bg-lime-brand-50 text-lime-brand-700'
                : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900',
            )}
            aria-label={item.title}
          >
            <span
              className={clsx(
                'inline-flex h-9 w-9 items-center justify-center rounded-md border text-neutral-500 transition-colors duration-200',
                hasActiveChild || open
                  ? 'border-transparent bg-lime-brand-100 text-lime-brand-700'
                  : 'border-neutral-200 bg-white group-hover:border-neutral-300 group-hover:text-neutral-900',
              )}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            {isExpanded ? <span className="flex-1 text-left">{item.title}</span> : null}
            {isExpanded && item.badge ? <Badge variant={item.badge} /> : null}
            {isExpanded ? (
              <ChevronDownIcon
                className={clsx('h-5 w-5 transition-transform duration-200', open ? 'rotate-180' : '')}
                aria-hidden="true"
              />
            ) : null}
          </Disclosure.Button>
          <Transition
            as="div"
            enter="transition duration-100 ease-out"
            enterFrom="transform scale-95 opacity-0"
            enterTo="transform scale-100 opacity-100"
            leave="transition duration-75 ease-out"
            leaveFrom="transform scale-100 opacity-100"
            leaveTo="transform scale-95 opacity-0"
          >
            {isExpanded ? (
              <Disclosure.Panel as="ul" className="mt-1 space-y-1 pl-11">
                {item.children?.map((child) => {
                  const active = activeChild?.href === child.href;

                  return (
                    <li key={child.title}>
                      <Link
                        href={{ pathname: child.href }}
                        onClick={onNavigate}
                        className={clsx(
                          'block rounded-md px-2 py-1.5 text-body-sm transition-colors duration-200',
                          active
                            ? 'bg-lime-brand-100 text-lime-brand-700'
                            : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900',
                        )}
                      >
                        {child.title}
                        {child.badge ? (
                          <span className="ml-2 inline-flex items-center rounded-full bg-lime-brand-100 px-2 py-0.5 text-[11px] font-semibold uppercase text-lime-brand-700">
                            {child.badge}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </Disclosure.Panel>
            ) : null}
          </Transition>
        </div>
      )}
    </Disclosure>
  );
}

type BadgeProps = {
  variant: 'new' | 'pro';
};

function Badge({ variant }: BadgeProps) {
  const label = variant === 'new' ? 'Nuevo' : 'Pro';

  return (
    <span
      className={clsx(
        'ml-auto inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase',
        variant === 'new'
          ? 'border-lime-blue-200 bg-lime-blue-50 text-lime-blue-700'
          : 'border-warning-200 bg-warning-50 text-warning-700',
      )}
    >
      {label}
    </span>
  );
}

export { PrimaryNav };
