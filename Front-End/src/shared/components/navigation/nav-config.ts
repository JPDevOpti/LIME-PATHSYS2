import type { ComponentType, SVGProps } from 'react';
import type { Role } from '@/features/auth/types/auth.types';

import {
  AdjustmentsHorizontalIcon,
  BanknotesIcon,
  ChartPieIcon,
  ClipboardDocumentCheckIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  HomeIcon,
  PencilSquareIcon,
  PlusIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';

import { BarChart3, Building2, ClipboardPlus, EyeOff, FlaskConical, MessageCircleQuestion, Microscope, UserCircle } from 'lucide-react';

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

type NavItem = {
  title: string;
  href: string;
  icon: IconType;
  badge?: 'new' | 'pro';
  children?: NavItem[];
  roles?: Role[];
};

type NavSection = {
  title: string;
  items: NavItem[];
  roles?: Role[];
};

function itemVisible(item: NavItem, userRole: Role | null): boolean {
  if (!userRole) return false;
  if (!item.roles || item.roles.length === 0) return true;
  return item.roles.includes(userRole);
}

function filterItem(item: NavItem, userRole: Role | null): NavItem | null {
  if (!itemVisible(item, userRole)) return null;
  if (item.children) {
    const filtered = item.children
      .map((c) => filterItem(c, userRole))
      .filter((c): c is NavItem => c !== null);
    if (filtered.length === 0) return null;
    return { ...item, children: filtered };
  }
  return item;
}

export function filterNavByRole(sections: NavSection[], userRole: Role | null): NavSection[] {
  if (!userRole) return [];
  return sections
    .map((sec) => {
      const items = sec.items
        .map((item) => filterItem(item, userRole))
        .filter((item): item is NavItem => item !== null);
      if (items.length === 0) return null;
      return { ...sec, items };
    })
    .filter((sec): sec is NavSection => sec !== null);
}

const ROLES_ALL: Role[] = ['administrator', 'pathologist', 'resident', 'recepcionista', 'visitante'];
const ROLES_NOT_VISITANTE: Role[] = ['administrator', 'pathologist', 'resident', 'recepcionista'];
// Roles que pueden crear/editar pacientes y casos (NO patólogo ni visitante)
const ROLES_CREATE_EDIT: Role[] = ['administrator', 'resident', 'recepcionista'];
// Roles que pueden ver listado de pacientes (NO visitante)
const ROLES_PATIENTS: Role[] = ['administrator', 'pathologist', 'resident', 'recepcionista'];
// Roles con acceso a lab (NO patólogo ni visitante)
const ROLES_LAB: Role[] = ['administrator', 'resident', 'recepcionista'];
// Roles que pueden transcribir resultados (NO patólogo ni visitante)
const ROLES_TRANSCRIBE: Role[] = ['administrator', 'resident', 'recepcionista'];
const ROLES_SIGNING: Role[] = ['administrator', 'pathologist'];
const ROLES_ANALYTICS: Role[] = ['administrator', 'recepcionista', 'visitante'];
const ROLES_BILLING: Role[] = ['administrator', 'recepcionista'];
const ROLES_ADMIN: Role[] = ['administrator'];

const applicationNav: NavSection[] = [
  {
    title: 'HOME',
    items: [
      { title: 'Panel principal', href: '/dashboard', icon: HomeIcon },
    ],
  },
  {
    title: 'Gestión clínica',
    items: [
      {
        title: 'Pacientes',
        href: '/patients',
        icon: UsersIcon,
        roles: ROLES_PATIENTS,
        children: [
          { title: 'Crear paciente', href: '/patients/create', icon: PlusIcon, roles: ROLES_CREATE_EDIT },
          { title: 'Editar paciente', href: '/patients/edit', icon: PencilSquareIcon, roles: ROLES_CREATE_EDIT },
          { title: 'Listado de pacientes', href: '/patients', icon: UsersIcon, roles: ROLES_PATIENTS },
        ],
      },
      {
        title: 'Casos',
        href: '/cases',
        icon: ClipboardPlus as IconType,
        roles: ROLES_ALL,
        children: [
          { title: 'Crear caso', href: '/cases/create', icon: PlusIcon, roles: ROLES_CREATE_EDIT },
          { title: 'Editar caso', href: '/cases/edit', icon: PencilSquareIcon, roles: ROLES_CREATE_EDIT },
          { title: 'Listado de casos', href: '/cases', icon: ClipboardPlus as IconType, roles: ROLES_ALL },
        ],
      },
      {
        title: 'Resultados',
        href: '/results',
        icon: DocumentTextIcon,
        roles: ROLES_NOT_VISITANTE,
        children: [
          { title: 'Transcribir resultados', href: '/results/transcribe', icon: PencilSquareIcon, roles: ROLES_TRANSCRIBE },
          { title: 'Firmar resultados', href: '/results/sign', icon: ClipboardDocumentCheckIcon, roles: ROLES_SIGNING },
        ],
      },
      {
        title: 'Pruebas Adicionales',
        href: '/lab/additional-tests',
        icon: FlaskConical as IconType,
        roles: ROLES_LAB,
      },
      {
        title: 'Casos sin lectura',
        href: '/lab/unread-cases',
        icon: EyeOff as IconType,
        roles: ROLES_LAB,
      },
    ],
  },
  {
    title: 'Análisis y contabilidad',
    items: [
      {
        title: 'Estadísticas',
        href: '/analytics',
        icon: ChartPieIcon,
        roles: ROLES_ANALYTICS,
        children: [
          { title: 'Oportunidad general', href: '/analytics/opportunity-general', icon: BarChart3 as IconType, roles: ROLES_ANALYTICS },
          { title: 'Oportunidad por patólogo', href: '/analytics/opportunity-pathologist', icon: UserCircle as IconType, roles: ROLES_ANALYTICS },
          { title: 'Oportunidad por entidad', href: '/analytics/opportunity-entity', icon: Building2 as IconType, roles: ROLES_ANALYTICS },
          { title: 'Oportunidad por prueba', href: '/analytics/opportunity-test', icon: FlaskConical as IconType, roles: ROLES_ANALYTICS },
          { title: 'Reporte de cáncer', href: '/analytics/cancer-report', icon: Microscope as IconType, roles: ROLES_ANALYTICS },
        ],
      },
      {
        title: 'Facturación',
        href: '/billing',
        icon: BanknotesIcon,
        roles: ROLES_BILLING,
        children: [
          { title: 'Contabilidad por prueba', href: '/billing/tests', icon: FlaskConical as IconType, roles: ROLES_BILLING },
          { title: 'Contabilidad por patólogo', href: '/billing/pathologist', icon: UserCircle as IconType, roles: ROLES_BILLING },
        ],
      },
    ],
  },
  {
    title: 'Herramientas',
    items: [
      {
        title: 'Configuración',
        href: '/settings/tests',
        icon: Cog6ToothIcon,
        roles: ROLES_ADMIN,
        children: [
          { title: 'Gestión de pruebas', href: '/settings/tests', icon: FlaskConical as IconType, roles: ROLES_ADMIN },
          { title: 'Gestión de entidades', href: '/settings/entities', icon: Building2 as IconType, roles: ROLES_ADMIN },
          { title: 'Gestión de perfiles', href: '/settings/profiles', icon: UsersIcon, roles: ROLES_ADMIN },
        ],
      },
      {
        title: 'Soporte',
        href: '/support',
        icon: MessageCircleQuestion as IconType,
      },
    ],
  },
];

export type { NavItem, NavSection, IconType };
export { applicationNav };
