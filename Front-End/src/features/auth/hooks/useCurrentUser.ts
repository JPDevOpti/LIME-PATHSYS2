'use client';

import { useAuth } from '../context/AuthContext';

/** Hook que devuelve el usuario actual desde el contexto de autenticación */
export function useCurrentUser(): { email: string } {
    const { user } = useAuth();
    return { email: user?.email ?? '' };
}
