'use client';

import { useState, useEffect } from 'react';
import { statisticsService } from '../services/statistics.service';

const normalizeText = (value: string) =>
    (value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();

/** Texto de opción en filtros (nombre/código de entidad del API), no documento de caso. */
export const isHamaEntity = (value: string) => {
    const normalized = normalizeText(value);
    if (!normalized) return false;
    // Renales Hospital Alma Mater es otra línea comercial, no el catálogo 003.
    if (normalized.includes('renales')) return false;
    return normalized === 'hama' || normalized.includes('alma mater') || normalized.includes('hama');
};

export function useAvailableEntities() {
    const [entities, setEntities] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        statisticsService.getAvailableEntities()
            .then(setEntities)
            .catch(() => setEntities([]))
            .finally(() => setIsLoading(false));
    }, []);

    const options = [
        { value: '', label: 'Todas las entidades' },
        ...entities
            .filter((entity) => !isHamaEntity(entity))
            .map((e) => ({ value: e, label: e })),
    ];

    return { options, isLoading };
}

export function useAvailablePathologists() {
    const [pathologists, setPathologists] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        statisticsService.getAvailablePathologists()
            .then(setPathologists)
            .catch(() => setPathologists([]))
            .finally(() => setIsLoading(false));
    }, []);

    const options = [
        { value: '', label: 'Todos los patólogos' },
        ...pathologists.map((p) => ({ value: p, label: p })),
    ];

    return { options, isLoading };
}
