'use client';

import { BodyRegionCombobox } from '@/shared/components/lists/BodyRegionList';
import type { SampleInfo } from '@/features/cases/types/case.types';

interface BodyRegionSectionProps {
    samples: SampleInfo[];
    onChange: (samples: SampleInfo[]) => void;
    disabled?: boolean;
}

export function BodyRegionSection({ samples, onChange, disabled }: BodyRegionSectionProps) {
    const updateRegion = (index: number, val: string) => {
        const next = [...samples];
        next[index] = { ...next[index], body_region: val };
        onChange(next);
    };

    return (
        <div className="space-y-4 pt-6 border-t border-neutral-100 mt-6">
            <div className="flex flex-col gap-1">
                <label className="block text-sm font-bold text-neutral-700">Regiones del Cuerpo (Muestras)</label>
                <p className="text-xs text-neutral-500">Ajuste las regiones del cuerpo si es necesario para el informe final.</p>
            </div>
            
            <div className="space-y-3">
                {samples.map((s, i) => (
                    <div
                        key={i}
                        className="flex flex-col gap-2 rounded-xl border border-neutral-200 p-4 bg-white shadow-sm"
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-lime-brand-600 uppercase tracking-wider">Muestra #{i + 1}</span>
                            <span className="text-[10px] text-neutral-400 font-medium bg-neutral-50 px-2 py-0.5 rounded-full border border-neutral-100">
                                {s.tests?.length || 0} prueba(s) asociada(s)
                            </span>
                        </div>
                        
                        <div className="w-full">
                            <BodyRegionCombobox
                                value={s.body_region}
                                onChange={(val) => updateRegion(i, val)}
                                disabled={disabled}
                                placeholder="Seleccionar o escribir región..."
                            />
                        </div>

                        {s.tests && s.tests.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-1">
                                {s.tests.map((t, idx) => (
                                    <span key={idx} className="text-[10px] bg-neutral-50 text-neutral-600 px-2 py-0.5 rounded border border-neutral-100">
                                        {t.test_code} - {t.name}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
            
            {samples.length === 0 && (
                <div className="p-8 text-center border-2 border-dashed border-neutral-200 rounded-xl bg-neutral-50/50">
                    <p className="text-sm text-neutral-500 italic font-medium">No hay muestras registradas para este caso.</p>
                </div>
            )}
        </div>
    );
}
