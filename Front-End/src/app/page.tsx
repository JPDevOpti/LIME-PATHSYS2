'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/features/auth/context/AuthContext';

export default function HomePage() {
  const router = useRouter();
  const { isLoggedIn, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (isLoggedIn) {
      router.replace('/dashboard');
    }
  }, [isLoggedIn, isLoading, router]);

  return null;
}
