'use client';

import { Input } from '@/shared/components/ui/form';
import { SearchButton, ClearButton } from '@/shared/components/ui/buttons';
import { AlertCircle } from 'lucide-react';

interface CaseSearchProps {
    caseCode: string;
    errorMessage?: string;
    caseVerified?: boolean;
    loading?: boolean;
    onUpdateCaseCode: (value: string) => void;
    onSearch: () => void;
    onClear: () => void;
}

export function CaseSearch({
    caseCode,
    errorMessage,
    caseVerified = false,
    loading = false,
    onUpdateCaseCode,
    onSearch,
    onClear
}: CaseSearchProps) {
    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !caseVerified && caseCode.trim()) {
            onSearch();
        }
    };

    return (
        <div className="space-y-3">
            <div className="bg-neutral-100 rounded-lg p-3 sm:p-4 lg:p-6 border border-neutral-200">
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-end">
                    <div className="flex-1">
                        <Input
                            type="text"
                            value={caseCode}
                            onChange={(e) => onUpdateCaseCode(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Código del caso (ej: 2026-00001)"
                            disabled={loading || caseVerified}
                        />
                    </div>
                    <div className="flex gap-2 sm:gap-3">
                        {!caseVerified ? (
                            <SearchButton
                                onClick={onSearch}
                                disabled={!caseCode.trim()}
                                loading={loading}
                                text="Buscar"
                                loadingText="Buscando..."
                            />
                        ) : (
                            <ClearButton
                                onClick={onClear}
                                disabled={loading}
                                text="Limpiar"
                            />
                        )}
                    </div>
                </div>
            </div>
            {errorMessage && (
                <div
                    role="alert"
                    className="flex items-start gap-3 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg shadow-sm"
                >
                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <p className="text-sm font-medium text-red-800">{errorMessage}</p>
                </div>
            )}
        </div>
    );
}
