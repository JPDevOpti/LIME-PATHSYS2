'use client';

import { BaseCard } from '@/shared/components/base/BaseCard';
import { RichTextEditor } from '@/shared/components/ui/form';
import { MethodSection } from './MethodSection';
import { DiseaseSearch } from './DiseaseSearch';
import { DiagnosisImagesPanel } from './DiagnosisImagesPanel';
import type { ResultEditorSection, ResultSections, CIE10Diagnosis, CIEODiagnosis } from '../types/results.types';
import { AssignedPathologist } from '@/features/cases/types/case.types';
import { clsx } from 'clsx';
import { UserPlus } from 'lucide-react';

const TABS: { key: ResultEditorSection; label: string }[] = [
    { key: 'method', label: 'Método' },
    { key: 'macro', label: 'Corte Macro' },
    { key: 'micro', label: 'Descrip Micro' },
    { key: 'diagnosis', label: 'Diagnóstico' },
    { key: 'images', label: 'Imágenes' },
    { key: 'cie', label: 'CIE-10' },
];

const PLACEHOLDERS: Record<string, string> = {
    macro: 'Describa los hallazgos macroscópicos: tamaño, forma, color, consistencia, superficie, bordes...',
    micro: 'Describa los hallazgos microscópicos: características celulares, arquitectura tisular, patrones de crecimiento...',
    diagnosis: 'Escriba el diagnóstico final: conciso, preciso, nomenclatura patológica estándar. Ej: "Adenocarcinoma de colon moderadamente diferenciado"...',
};

interface SignResultEditorProps {
    sections: ResultSections;
    activeSection: ResultEditorSection;
    onSectionsChange: (sections: ResultSections) => void;
    onActiveSectionChange: (section: ResultEditorSection) => void;
    cie10: CIE10Diagnosis | null;
    cieo: CIEODiagnosis | null;
    onCie10Change: (value: CIE10Diagnosis | null) => void;
    onCieoChange: (value: CIEODiagnosis | null) => void;
    showValidation?: boolean;
    disabled?: boolean;
    footer?: React.ReactNode;
    assignedPathologist?: string | null;
    assistantPathologists?: { id: string; name: string }[] | null;
    status?: string | null;
    onAssignPathologistClick?: () => void;
    onAddAssistantClick?: () => void;
}

export function SignResultEditor({
    sections,
    activeSection,
    onSectionsChange,
    onActiveSectionChange,
    cie10,
    cieo,
    onCie10Change,
    onCieoChange,
    showValidation = false,
    disabled = false,
    footer,
    assignedPathologist,
    assistantPathologists,
    status,
    onAssignPathologistClick,
    onAddAssistantClick,
}: SignResultEditorProps) {
    const updateSection = (key: ResultEditorSection, value: string | string[]) => {
        onSectionsChange({ ...sections, [key]: value });
    };

    return (
        <BaseCard
            variant="default"
            padding="none"
            className="flex flex-col overflow-hidden border border-neutral-200"
        >
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 border-b border-neutral-200 bg-neutral-50/50">
                <div className="flex flex-wrap gap-2">
                    {TABS.map((tab) => (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => onActiveSectionChange(tab.key)}
                            className={clsx(
                                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                                activeSection === tab.key
                                    ? 'bg-lime-brand-600 text-white'
                                    : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50'
                            )}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
                <div className="flex flex-col gap-1 items-end shrink-0 text-right">
                    {status && (
                        <span
                            className={clsx(
                                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium',
                                status === 'En recepción' && 'bg-blue-50 border-blue-200 text-blue-800',
                                status === 'Corte macro' && 'bg-cyan-50 border-cyan-200 text-cyan-800',
                                status === 'Descrip micro' && 'bg-indigo-50 border-indigo-200 text-indigo-800',
                                status === 'Por firmar' && 'bg-amber-50 border-amber-200 text-amber-800',
                                status === 'Por entregar' && 'bg-violet-50 border-violet-200 text-violet-800',
                                status === 'Completado' && 'bg-green-50 border-green-200 text-green-700',
                                !['En recepción', 'Corte macro', 'Descrip micro', 'Por firmar', 'Por entregar', 'Completado'].includes(status) &&
                                'bg-neutral-50 border-neutral-200 text-neutral-800'
                            )}
                        >
                            <span
                                className={clsx(
                                    'w-1.5 h-1.5 rounded-full',
                                    status === 'En recepción' && 'bg-blue-500',
                                    status === 'Corte macro' && 'bg-cyan-500',
                                    status === 'Descrip micro' && 'bg-indigo-500',
                                    status === 'Por firmar' && 'bg-amber-500',
                                    status === 'Por entregar' && 'bg-violet-500',
                                    status === 'Completado' && 'bg-green-500',
                                    !['En recepción', 'Corte macro', 'Descrip micro', 'Por firmar', 'Por entregar', 'Completado'].includes(status) &&
                                    'bg-neutral-500'
                                )}
                            />
                            {status}
                        </span>
                    )}
                    <div className="flex flex-col gap-1 items-end">
                        {assignedPathologist ? (
                            <div className="flex items-center gap-2">
                                {onAssignPathologistClick ? (
                                    <button
                                        type="button"
                                        onClick={onAssignPathologistClick}
                                        className="text-sm font-medium text-neutral-900 hover:text-lime-brand-600 hover:underline cursor-pointer"
                                    >
                                        {assignedPathologist}
                                    </button>
                                ) : (
                                    <p className="text-sm font-medium text-neutral-900">{assignedPathologist}</p>
                                )}
                                {onAddAssistantClick && (
                                    <button
                                        type="button"
                                        onClick={onAddAssistantClick}
                                        className="p-1 rounded-md bg-lime-brand-50 text-lime-brand-700 hover:bg-lime-brand-100 transition-colors"
                                        title="Agregar patólogo asistente"
                                    >
                                        <UserPlus className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        ) : onAssignPathologistClick ? (
                            <button
                                type="button"
                                onClick={onAssignPathologistClick}
                                className="text-sm font-medium text-red-600 hover:text-red-700 underline cursor-pointer"
                            >
                                sin patólogo
                            </button>
                        ) : (
                            <p className="text-sm font-medium text-red-600">sin patólogo</p>
                        )}

                        {assistantPathologists && assistantPathologists.length > 0 && (
                            <div className="flex flex-col gap-1 items-end">
                                {assistantPathologists.map((ap) => (
                                    <span key={ap.id} className="text-[10px] bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded border border-neutral-200 block w-fit">
                                        Asist: {ap.name}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex-1 p-6 min-h-[320px]">
                {activeSection === 'method' ? (
                    <MethodSection
                        value={sections.method || []}
                        onChange={(v) => updateSection('method', v)}
                        showValidation={showValidation}
                        disabled={disabled}
                    />
                ) : activeSection === 'cie' ? (
                    <div className="min-h-[320px]">
                        <DiseaseSearch
                            cie10={cie10}
                            cieo={cieo}
                            onCie10Change={onCie10Change}
                            onCieoChange={onCieoChange}
                            disabled={disabled}
                        />
                    </div>
                ) : activeSection === 'images' ? (
                    <div className="min-h-[320px]">
                        <DiagnosisImagesPanel
                            value={sections.diagnosisImages || []}
                            onChange={(urls) => onSectionsChange({ ...sections, diagnosisImages: urls })}
                            disabled={disabled}
                            variant="full"
                        />
                    </div>
                ) : (
                    <RichTextEditor
                        value={sections[activeSection] || ''}
                        onChange={(html) => updateSection(activeSection, html)}
                        placeholder={PLACEHOLDERS[activeSection]}
                        disabled={disabled}
                        minHeight={280}
                        className="min-h-[320px]"
                    />
                )}
            </div>

            {footer && (
                <div className="px-6 py-4 border-t border-neutral-200 bg-neutral-50/50 flex-shrink-0">
                    {footer}
                </div>
            )}
        </BaseCard>
    );
}
