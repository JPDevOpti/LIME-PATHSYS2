'use client';

import Link from 'next/link';
import { Input, Select } from '@/shared/components/ui/form';
import { SearchButton, ClearButton } from '@/shared/components/ui/buttons';
import { UserPlus } from 'lucide-react';
import { IDENTIFICATION_TYPE_OPTIONS } from '../types/patient.types';

interface PatientSearchProps {
    identificationType: string;
    identificationNumber: string;
    errorMessage?: string;
    patientVerified?: boolean;
    loading?: boolean;
    onUpdateIdentificationType: (value: string) => void;
    onUpdateIdentificationNumber: (value: string) => void;
    onSearch: () => void;
    onClear: () => void;
    createPatientHref?: string;
}

export function PatientSearch({
    identificationType,
    identificationNumber,
    errorMessage,
    patientVerified = false,
    loading = false,
    onUpdateIdentificationType,
    onUpdateIdentificationNumber,
    onSearch,
    onClear,
    createPatientHref
}: PatientSearchProps) {
    const identificationTypeOptions = [
        { value: '', label: 'Tipo de identificación' },
        ...IDENTIFICATION_TYPE_OPTIONS
    ];

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !patientVerified && identificationType && identificationNumber.trim()) {
            onSearch();
        }
    };

    return (
        <div className="bg-neutral-100 rounded-lg p-3 sm:p-4 lg:p-6 border border-neutral-200">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-end">
                <div className="sm:w-64">
                    <Select
                        value={identificationType || ''}
                        onChange={(e) => onUpdateIdentificationType(e.target.value || '')}
                        options={identificationTypeOptions}
                        disabled={loading || patientVerified}
                    />
                </div>

                <div className="flex-1">
                    <Input
                        type="text"
                        value={identificationNumber}
                        onChange={(e) =>
                            onUpdateIdentificationNumber(
                                e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20),
                            )
                        }
                        onKeyPress={handleKeyPress}
                        placeholder="Número de identificación"
                        maxLength={20}
                        disabled={loading || patientVerified}
                    />
                </div>

                <div className="flex gap-2 sm:gap-3">
                    <SearchButton
                        onClick={onSearch}
                        disabled={!identificationType || !identificationNumber.trim() || patientVerified}
                        loading={loading}
                        text="Buscar"
                        loadingText="Buscando..."
                    />
                    <ClearButton
                        onClick={onClear}
                        disabled={loading}
                        text="Limpiar"
                    />
                </div>
            </div>

            {errorMessage && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex flex-row items-center justify-between gap-3 flex-wrap">
                    <p className="text-sm text-red-600">{errorMessage}</p>
                    {createPatientHref && (
                        <Link
                            href={`${createPatientHref}?idType=${encodeURIComponent(identificationType)}&idNumber=${encodeURIComponent(identificationNumber)}`}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-white text-red-600 text-sm font-medium rounded-lg border border-red-600 hover:bg-red-50 transition-colors shrink-0"
                        >
                            <UserPlus className="w-4 h-4" />
                            Crear Paciente
                        </Link>
                    )}
                </div>
            )}
        </div>
    );
}
