'use client';

import type { LucideIcon } from 'lucide-react';

import { BaseCard } from '@/shared/components/base/BaseCard';

export type PageTitleCardProps = {
    title: string;
    description: string;
    icon?: LucideIcon;
    accentColor?: 'sky' | 'emerald' | 'amber' | 'rose' | 'violet';
};

const accentConfig: Record<
    NonNullable<PageTitleCardProps['accentColor']>,
    { border: string; icon: string }
> = {
    sky: { border: 'border-l-sky-500', icon: 'bg-sky-50 text-sky-600' },
    emerald: { border: 'border-l-emerald-500', icon: 'bg-emerald-50 text-emerald-600' },
    amber: { border: 'border-l-amber-500', icon: 'bg-amber-50 text-amber-600' },
    rose: { border: 'border-l-rose-500', icon: 'bg-rose-50 text-rose-600' },
    violet: { border: 'border-l-violet-500', icon: 'bg-violet-50 text-violet-600' },
};

export function PageTitleCard({ title, description, icon: Icon, accentColor = 'sky' }: PageTitleCardProps) {
    const { border, icon } = accentConfig[accentColor];

    return (
        <BaseCard
            variant="elevated"
            padding="lg"
            className={`overflow-hidden border-l-4 ${border}`}
        >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
                {Icon && (
                    <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl ${icon}`}>
                        <Icon className="h-7 w-7" strokeWidth={2} />
                    </div>
                )}
                <div className="min-w-0 flex-1">
                    <h1 className="text-xl font-bold tracking-tight text-neutral-900 sm:text-2xl">
                        {title}
                    </h1>
                    <p className="mt-1.5 text-sm leading-relaxed text-neutral-600 sm:text-base">
                        {description}
                    </p>
                </div>
            </div>
        </BaseCard>
    );
}
