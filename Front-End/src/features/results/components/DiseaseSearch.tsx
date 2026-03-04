"use client";

import { useState, useEffect } from 'react';
import { Input } from '@/shared/components/ui/form';
import { BaseButton } from '@/shared/components/base';
import { diseaseService, type Disease } from '../services/disease.service';
import { Search, Loader2 } from 'lucide-react';

export interface CIEDiagnosis {
    code: string;
    name: string;
}

interface DiseaseSearchProps {
    cie10: CIEDiagnosis | null;
    cieo: CIEDiagnosis | null;
    onCie10Change: (value: CIEDiagnosis | null) => void;
    onCieoChange: (value: CIEDiagnosis | null) => void;
    disabled?: boolean;
}

function SearchBlock({
    label,
    placeholder,
    table,
    value,
    onChange,
    disabled,
}: {
    label: string;
    placeholder: string;
    table: 'CIE10' | 'CIEO';
    value: CIEDiagnosis | null;
    onChange: (v: CIEDiagnosis | null) => void;
    disabled?: boolean;
}) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Disease[]>([]);
    const [searching, setSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);
        const [showCreateForm, setShowCreateForm] = useState(false);
        const [newCode, setNewCode] = useState('');
        const [newName, setNewName] = useState('');
        const [creating, setCreating] = useState(false);

    const handleSearch = async () => {
        if (!query.trim() || disabled) return;
        setSearching(true);
        setHasSearched(true);
        setSearchError(null);
        try {
            const count = await diseaseService.count();
            if (count) {
                console.log('[DiseaseSearch] /api/v1/diseases/count', count);
            }

            const list = await diseaseService.search(query.trim(), table);
            setResults(list);
            console.log(`[DiseaseSearch][${table}] enfermedades mostradas: ${list.length}`);
                setShowCreateForm(list.length === 0);
        } catch (error) {
            setResults([]);
                console.log(`[DiseaseSearch][${table}] enfermedades mostradas: 0`);
                setShowCreateForm(false);
                setSearchError(error instanceof Error ? error.message : 'No se pudo buscar diagnósticos');
        } finally {
            setSearching(false);
        }
    };

    const selectDisease = (d: Disease) => {
        onChange({ code: d.code, name: d.name });
        setResults([]);
        setHasSearched(false);
    };

    const clearSelection = () => {
        onChange(null);
        setQuery('');
        setResults([]);
        setHasSearched(false);
            setSearchError(null);
            setShowCreateForm(false);
            setNewCode('');
            setNewName('');
    };

    useEffect(() => {
        if (value) {
            setSearchError(null);
            setShowCreateForm(false);
            setNewCode('');
            setNewName('');
        }
    }, [value]);
    return (
        <div className="space-y-3">
            <div className="flex gap-2">
                <Input
                    value={value ? `${value.code} - ${value.name}` : query}
                    onChange={(e) => !value && setQuery(e.target.value)}
                    placeholder={placeholder}
                    disabled={disabled || !!value}
                    onKeyDown={(e) => e.key === 'Enter' && !value && (handleSearch(), e.preventDefault())}
                    className="flex-1"
                />
                {value ? (
                    <BaseButton variant="secondary" size="sm" onClick={clearSelection} disabled={disabled}>
                        Limpiar
                    </BaseButton>
                ) : (
                    <BaseButton
                        variant="secondary"
                        size="sm"
                        onClick={handleSearch}
                        disabled={disabled || searching || !query.trim()}
                        loading={searching}
                        startIcon={<Search className="w-4 h-4" />}
                    >
                        Buscar
                    </BaseButton>
                )}
            </div>

            {value && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-700">
                        <span className="font-medium">{value.code}</span> - {value.name}
                    </p>
                </div>
            )}

            {!value && (
                <div className="border border-neutral-200 rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                    <table className="w-full text-sm table-fixed">
                        <thead className="bg-neutral-50 sticky top-0">
                            <tr>
                                <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 w-[20%]">Código</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 w-[58%]">Nombre</th>
                                <th className="px-3 py-2 text-center text-xs font-medium text-neutral-500 w-[10%]">Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                            {results.length > 0 ? (
                                results.map((d) => (
                                    <tr
                                        key={d.id}
                                        className="hover:bg-neutral-50 cursor-pointer border-t border-neutral-100"
                                        onClick={() => selectDisease(d)}
                                    >
                                        <td className="px-3 py-2 w-[20%]">
                                            <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                                {d.code}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2 text-neutral-900 w-[58%] truncate" title={d.name}>{d.name}</td>
                                        <td className="px-3 py-2 w-[22%] text-right">
                                            <BaseButton
                                                type="button"
                                                size="sm"
                                                onClick={(e) => { e.stopPropagation(); selectDisease(d); }}
                                                className="text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white border-0"
                                            >
                                                Seleccionar
                                            </BaseButton>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={3} className="px-3 py-8 text-center text-neutral-500">
                                        {searching ? (
                                            <span className="flex items-center justify-center gap-2 text-sm">
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Buscando...
                                            </span>
                                        ) : !hasSearched ? (
                                            <span className="text-sm">Busque para ver resultados</span>
                                        ) : (
                                            <>
                                                {searchError && <p className="text-sm text-red-600 mb-2">{searchError}</p>}
                                                <p className="text-sm">No se encontraron resultados</p>
                                                    {showCreateForm && (
                                                        <div className="mt-4 p-4 border border-dashed border-blue-300 rounded-lg bg-blue-50">
                                                            <h5 className="text-sm font-semibold mb-2 text-blue-700">Agregar nuevo diagnóstico</h5>
                                                            <div className="flex flex-col gap-2">
                                                                <Input
                                                                    value={newCode}
                                                                    onChange={e => setNewCode(e.target.value)}
                                                                    placeholder="Código (CIE-10 o CIE-O)"
                                                                    disabled={creating}
                                                                />
                                                                <Input
                                                                    value={newName}
                                                                    onChange={e => setNewName(e.target.value)}
                                                                    placeholder="Nombre del diagnóstico"
                                                                    disabled={creating}
                                                                />
                                                                <BaseButton
                                                                    variant="primary"
                                                                    size="sm"
                                                                    loading={creating}
                                                                    disabled={!newCode.trim() || !newName.trim() || creating}
                                                                    onClick={async () => {
                                                                        setCreating(true);
                                                                        try {
                                                                            const newDisease = await diseaseService.create({ code: newCode.trim(), name: newName.trim(), table });
                                                                            // Select the new diagnosis and hide the create form
                                                                            onChange({ code: newDisease.code, name: newDisease.name });
                                                                            setResults([]);
                                                                            setHasSearched(false);
                                                                            setShowCreateForm(false);
                                                                            setNewCode('');
                                                                            setNewName('');
                                                                        } catch {
                                                                            // Manejar error
                                                                        } finally {
                                                                            setCreating(false);
                                                                        }
                                                                    }}
                                                                >
                                                                    Guardar diagnóstico
                                                                </BaseButton>
                                                            </div>
                                                        </div>
                                                    )}
                                            </>
                                        )}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                    {results.length > 0 && (
                        <div className="px-3 py-2 bg-neutral-50 border-t border-neutral-200 text-xs text-neutral-500">
                            {results.length} resultado{results.length !== 1 ? 's' : ''} encontrado
                            {results.length !== 1 ? 's' : ''}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export function DiseaseSearch({
    cie10,
    cieo,
    onCie10Change,
    onCieoChange,
    disabled,
}: DiseaseSearchProps) {
    const [showCieo, setShowCieo] = useState(!!cieo);
    const effectiveShowCieo = showCieo || !!cieo;

    return (
        <div className="space-y-6">
            <div>
                <h4 className="text-sm font-semibold text-neutral-700 mb-2">Diagnóstico CIE-10</h4>
                <SearchBlock
                    label="CIE-10"
                    placeholder="Buscar enfermedad CIE-10..."
                    table="CIE10"
                    value={cie10}
                    onChange={onCie10Change}
                    disabled={disabled}
                />
            </div>

            <div>
                <label className="flex items-center gap-2 cursor-pointer mb-2">
                    <input
                        type="checkbox"
                        checked={effectiveShowCieo}
                        onChange={(e) => {
                            setShowCieo(e.target.checked);
                            if (!e.target.checked) onCieoChange(null);
                        }}
                        disabled={disabled}
                        className="rounded border-neutral-300"
                    />
                    <span className="text-sm font-semibold text-neutral-700">
                        Incluir diagnóstico de cáncer (CIE-O)
                    </span>
                </label>

                {effectiveShowCieo && (
                    <SearchBlock
                        label="CIE-O"
                        placeholder="Buscar cáncer CIE-O..."
                        table="CIEO"
                        value={cieo}
                        onChange={onCieoChange}
                        disabled={disabled}
                    />
                )}
            </div>
        </div>
    );
}
