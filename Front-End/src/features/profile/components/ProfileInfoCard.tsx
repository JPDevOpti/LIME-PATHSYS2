'use client';

import {
    UserIcon,
    EnvelopeIcon,
    UserGroupIcon,
    CheckCircleIcon,
    XCircleIcon,
    DocumentTextIcon,
    UserCircleIcon,
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
    user: UserIcon,
    email: EnvelopeIcon,
    role: UserGroupIcon,
    initials: UserCircleIcon,
    registro: DocumentTextIcon,
    document: DocumentTextIcon,
};

interface ProfileInfoCardProps {
    icon: string;
    label: string;
    value: string;
    isEmpty?: boolean;
    statusColor?: 'green' | 'red' | 'yellow';
    tooltip?: string;
}

export function ProfileInfoCard({
    icon,
    label,
    value,
    isEmpty = false,
    statusColor,
    tooltip,
}: ProfileInfoCardProps) {
    const IconComponent =
        icon === 'status'
            ? statusColor === 'green'
                ? CheckCircleIcon
                : XCircleIcon
            : ICON_MAP[icon] || UserIcon;

    const iconColor =
        isEmpty || icon === 'status'
            ? icon === 'status'
                ? statusColor === 'green'
                    ? 'text-green-500'
                    : 'text-red-500'
                : 'text-neutral-400'
            : icon === 'user'
              ? 'text-blue-500'
              : icon === 'email'
                ? 'text-purple-500'
                : icon === 'role'
                  ? 'text-indigo-500'
                  : icon === 'initials'
                    ? 'text-violet-500'
                    : icon === 'registro'
                      ? 'text-cyan-500'
                      : 'text-neutral-500';

    const valueColor =
        isEmpty || icon === 'status'
            ? icon === 'status'
                ? statusColor === 'green'
                    ? 'text-green-700'
                    : 'text-red-700'
                : 'text-neutral-400'
            : 'text-neutral-900';

    return (
        <div
            className={clsx(
                'p-4 bg-neutral-50 rounded-xl border border-neutral-100 hover:shadow-sm transition-all duration-200',
                isEmpty && 'opacity-60'
            )}
            title={tooltip}
        >
            <div className="flex items-start gap-3">
                <div className="p-2 bg-white rounded-lg shadow-sm">
                    <IconComponent className={clsx('w-5 h-5', iconColor)} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-neutral-500 mb-1">{label}</p>
                    <p className={clsx('text-sm font-semibold truncate', valueColor)}>{value}</p>
                </div>
            </div>
        </div>
    );
}
