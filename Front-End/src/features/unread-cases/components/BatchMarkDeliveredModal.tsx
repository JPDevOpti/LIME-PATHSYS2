'use client';

import { useState } from 'react';
import { BaseModal } from '@/shared/components/overlay/BaseModal';
import { BaseButton } from '@/shared/components/base';
import { Input, FormField } from '@/shared/components/ui/form';
import type { UnreadCase } from '../types/unread-cases.types';

function getNowISO(): string {
    return new Date().toISOString();
}

function formatDateTimeLocal(iso: string): string {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface BatchFormProps {
    selectedCases: UnreadCase[];
    onClose: () => void;
    onSave: (payload: { deliveredTo: string; deliveryDate?: string }) => Promise<void>;
}

function BatchForm({ selectedCases, onClose, onSave }: BatchFormProps) {
    const [saving, setSaving] = useState(false);
    const [deliveredTo, setDeliveredTo] = useState('');
    const [deliveryDate] = useState(() => getNowISO());

    const handleSubmit = async () => {
        if (!deliveredTo.trim()) return;
        setSaving(true);
        try {
            await onSave({
                deliveredTo: deliveredTo.trim(),
                deliveryDate
            });
            onClose();
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <div className="space-y-4">
                <p className="text-sm text-neutral-600">
                    {selectedCases.length} caso{selectedCases.length !== 1 ? 's' : ''} seleccionado
                    {selectedCases.length !== 1 ? 's' : ''}
                </p>
                <FormField label="Entregado a" htmlFor="batch-delivered-to">
                    <Input
                        id="batch-delivered-to"
                        placeholder="Nombre o lugar de entrega"
                        value={deliveredTo}
                        onChange={(e) => setDeliveredTo(e.target.value)}
                    />
                </FormField>
                <FormField label="Fecha de entrega">
                    <Input
                        type="datetime-local"
                        value={formatDateTimeLocal(deliveryDate)}
                        readOnly
                        className="bg-neutral-100 cursor-not-allowed"
                    />
                </FormField>
            </div>
            <div className="flex justify-end gap-2 mt-4">
                <BaseButton variant="secondary" size="sm" onClick={onClose}>
                    Cancelar
                </BaseButton>
                <BaseButton
                    variant="primary"
                    size="sm"
                    onClick={handleSubmit}
                    disabled={!deliveredTo.trim() || saving}
                    loading={saving}
                >
                    Confirmar
                </BaseButton>
            </div>
        </>
    );
}

interface BatchMarkDeliveredModalProps {
    isOpen: boolean;
    selectedCases: UnreadCase[];
    onClose: () => void;
    onSave: (payload: { deliveredTo: string; deliveryDate?: string }) => Promise<void>;
}

export function BatchMarkDeliveredModal({
    isOpen,
    selectedCases,
    onClose,
    onSave
}: BatchMarkDeliveredModalProps) {
    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title="Marcar como completados"
            size="md"
        >
            {isOpen && (
                <BatchForm
                    key="open"
                    selectedCases={selectedCases}
                    onClose={onClose}
                    onSave={onSave}
                />
            )}
        </BaseModal>
    );
}
