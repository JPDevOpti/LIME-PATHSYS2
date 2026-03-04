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

interface DeliveryFormProps {
    caseData: UnreadCase;
    onClose: () => void;
    onSave: (payload: { deliveredTo: string; deliveryDate?: string }) => Promise<void>;
}

function DeliveryForm({ caseData, onClose, onSave }: DeliveryFormProps) {
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
                    Caso: <span className="font-medium">{caseData.caseCode}</span>
                </p>
                <FormField label="Entregado a" htmlFor="delivered-to">
                    <Input
                        id="delivered-to"
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
                    Marcar como completado
                </BaseButton>
            </div>
        </>
    );
}

interface DeliveryInfoModalProps {
    caseData: UnreadCase | null;
    onClose: () => void;
    onSave: (payload: { deliveredTo: string; deliveryDate?: string }) => Promise<void>;
}

export function DeliveryInfoModal({ caseData, onClose, onSave }: DeliveryInfoModalProps) {
    if (!caseData) return null;

    return (
        <BaseModal
            isOpen={!!caseData}
            onClose={onClose}
            title="Gestionar entrega"
            size="md"
        >
            <DeliveryForm
                key={caseData.caseCode}
                caseData={caseData}
                onClose={onClose}
                onSave={onSave}
            />
        </BaseModal>
    );
}
