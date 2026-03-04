'use client';

import { Menu, Transition } from '@headlessui/react';
import {
  ArrowRightOnRectangleIcon,
  ChevronDownIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/features/auth/context/AuthContext';
import { useRoleLabel } from '@/features/auth/hooks/useRoleLabel';

type UserMenuProps = {
  name?: string;
  email?: string;
  role?: string;
};

function UserMenu({ name: nameProp, email: emailProp, role: roleProp }: UserMenuProps) {
  const router = useRouter();
  const { user, logout, isLoading } = useAuth();
  const { translateRole } = useRoleLabel();
  const name = nameProp ?? user?.name ?? user?.email ?? 'Usuario';
  const email = emailProp ?? user?.email ?? '';
  const role = roleProp ?? ((!isLoading && user?.role) ? translateRole(user.role) : '...');

  const isRestrictedRole = user?.role === 'paciente' || user?.role === 'visitante';

  const handleLogout = () => {
    logout();
    router.push('/');
  };
  return (
    <Menu as="div" className="relative">
      <Menu.Button className="group flex items-center gap-3 rounded-full border border-neutral-200 bg-white py-1.5 pl-1.5 pr-4 transition-all hover:bg-neutral-50 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-lime-brand-500 focus:ring-offset-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-lime-brand-100 text-sm font-bold text-lime-brand-700 ring-2 ring-white">
          {getInitials(name)}
        </span>
        <div className="flex flex-col items-start">
          <span className="text-sm font-bold text-neutral-900 leading-none">{name}</span>
          <span className="mt-0.5 text-xs text-neutral-500 leading-none">{role ?? 'Usuario'}</span>
        </div>
        <ChevronDownIcon className="ml-2 h-4 w-4 text-neutral-400 transition-transform duration-200 group-hover:text-neutral-600 ui-open:rotate-180" />
      </Menu.Button>
      <Transition
        as="div"
        enter="transition ease-out duration-200"
        enterFrom="transform opacity-0 scale-95 -translate-y-2"
        enterTo="transform opacity-100 scale-100 translate-y-0"
        leave="transition ease-in duration-150"
        leaveFrom="transform opacity-100 scale-100 translate-y-0"
        leaveTo="transform opacity-0 scale-95 -translate-y-2"
      >
        <Menu.Items className="absolute right-0 top-full mt-2 w-64 origin-top-right divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white shadow-xl ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
          <div className="px-4 py-3">
            <p className="text-sm font-semibold text-neutral-900">{name}</p>
            <p className="text-xs text-neutral-500 truncate">{email}</p>
          </div>
          {!isRestrictedRole && (
            <div className="p-1">
              <MenuItem icon={UserCircleIcon} label="Mi perfil" href="/profile" />
            </div>
          )}
          <div className="p-1">
            <MenuItem icon={ArrowRightOnRectangleIcon} label="Cerrar sesión" tone="danger" onClick={handleLogout} />
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
}

type MenuItemProps = {
  icon: typeof UserCircleIcon;
  label: string;
  tone?: 'default' | 'danger';
  href?: string;
  onClick?: () => void;
};

function MenuItem({ icon: Icon, label, tone = 'default', href, onClick }: MenuItemProps) {
  const baseClass = clsx(
    'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-body-sm transition-colors duration-150',
    tone === 'danger'
      ? 'text-danger-600 hover:bg-danger-50 focus:bg-danger-50'
      : 'text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 focus:bg-neutral-100 focus:text-neutral-900',
  );

  return (
    <Menu.Item>
      {({ active }) => {
        const activeClass = active ? (tone === 'danger' ? 'bg-danger-50' : 'bg-neutral-100 text-neutral-900') : '';
        return href ? (
          <Link href={href} className={clsx(baseClass, activeClass)}>
            <Icon className="h-5 w-5" aria-hidden="true" />
            <span>{label}</span>
          </Link>
        ) : (
          <button type="button" onClick={onClick} className={clsx(baseClass, activeClass)}>
            <Icon className="h-5 w-5" aria-hidden="true" />
            <span>{label}</span>
          </button>
        );
      }}
    </Menu.Item>
  );
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
}

export { UserMenu };
export type { UserMenuProps };
