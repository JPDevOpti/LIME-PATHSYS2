'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SettingsRedirectPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/settings/tests');
    }, [router]);

    return (
        <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-lime-brand-600 border-t-transparent" />
        </div>
    );
}
