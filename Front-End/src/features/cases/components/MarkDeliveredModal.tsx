'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, PackageCheck, FlaskConical, ChevronDown, ChevronUp, Loader2, Trash2, Plus, Search } from 'lucide-react';
import type { Case } from '../types/case.types';
import { labTestsService } from '@/features/test-management/services/lab-tests.service';
import type { LabTest } from '@/features/test-management/types/lab-tests.types';

interface TestEdit {
    code: string;
    name: string;
    quantity: number;
    sampleIndex: number;
    testIndex: number;
}

interface CaseEdit {
    caseId: string;
    caseCode: string;
    patientName: string;
    tests: TestEdit[];
    expanded: boolean;
}

interface MarkDeliveredModalProps {
    isOpen: boolean;
    cases: Case[];
    onClose: () => void;
    onConfirm: (deliveredTo: string, caseEdits: { caseId: string; tests: TestEdit[] }[]) => Promise<void>;
}

function buildCaseEdits(cases: Case[]): CaseEdit[] {
    return cases.map(c => {
        const tests: TestEdit[] = [];
        c.samples?.forEach((sample, sIdx) => {
            sample.tests?.forEach((t, tIdx) => {
                const code = t.test_code || t.name || '';
                if (!code) return;
                const existing = tests.find(e => e.code === code);
                if (existing) {
                    existing.quantity += t.quantity ?? 1;
                } else {
                    tests.push({ code, name: t.name || code, quantity: t.quantity ?? 1, sampleIndex: sIdx, testIndex: tIdx });
                }
            });
        });
        return { caseId: c.id, caseCode: c.case_code, patientName: c.patient?.full_name ?? '', tests, expanded: cases.length === 1 };
    });
}

interface TestAdderProps {
    allTests: LabTest[];
    existingCodes: Set<string>;
    onAdd: (code: string, name: string, quantity: number) => void;
    disabled: boolean;
}

function TestAdder({ allTests, existingCodes, onAdd, disabled }: TestAdderProps) {
    const [query, setQuery] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [selected, setSelected] = useState<{ code: string; name: string } | null>(null);
    const [open, setOpen] = useState(false);
    const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
    const inputRef = useRef<HTMLInputElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const filtered = query.trim()
        ? allTests.filter(t =>
            t.test_code.toLowerCase().includes(query.toLowerCase()) ||
            t.name.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 20)
        : allTests.slice(0, 20);

    useEffect(() => {
        if (!open || !inputRef.current) return;
        const rect = inputRef.current.getBoundingClientRect();
        setDropdownStyle({
            position: 'fixed',
            top: rect.bottom + 4,
            left: rect.left,
            width: rect.width,
            zIndex: 9999,
        });
    }, [open, query]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleSelect = (t: LabTest) => {
        setSelected({ code: t.test_code, name: t.name });
        setQuery(t.name);
        setOpen(false);
    };

    const handleAdd = () => {
        if (!selected) return;
        onAdd(selected.code, selected.name, Math.max(1, quantity));
        setSelected(null);
        setQuery('');
        setQuantity(1);
    };

    const alreadyAdded = selected ? existingCodes.has(selected.code) : false;

    const dropdown = open && filtered.length > 0 ? createPortal(
        <div
            style={dropdownStyle}
            className="bg-white border border-gray-200 rounded-lg shadow-xl max-h-48 overflow-y-auto"
        >
            {filtered.map(t => (
                <button
                    key={t.test_code}
                    type="button"
                    onMouseDown={e => { e.preventDefault(); handleSelect(t); }}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-left"
                >
                    <span className="font-mono text-xs bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded text-gray-600 flex-shrink-0">
                        {t.test_code}
                    </span>
                    <span className="text-sm text-gray-800 truncate">{t.name}</span>
                </button>
            ))}
        </div>,
        document.body
    ) : null;

    return (
        <div className="mt-3 pt-3 border-t border-dashed border-gray-200">
            <p className="text-xs font-medium text-gray-500 mb-2">Agregar prueba</p>
            <div className="flex gap-2" ref={wrapperRef}>
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={e => { setQuery(e.target.value); setSelected(null); setOpen(true); }}
                        onFocus={() => setOpen(true)}
                        placeholder="Buscar prueba..."
                        disabled={disabled}
                        className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-500 disabled:bg-gray-50"
                    />
                    {dropdown}
                </div>
                <input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    disabled={disabled}
                    className="w-16 rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-1 focus:ring-green-500 disabled:bg-gray-50"
                    title="Cantidad"
                />
                <button
                    type="button"
                    onClick={handleAdd}
                    disabled={disabled || !selected || alreadyAdded}
                    title={alreadyAdded ? 'Ya está en la lista' : 'Agregar prueba'}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                >
                    <Plus className="w-4 h-4" />
                    Agregar
                </button>
            </div>
            {alreadyAdded && (
                <p className="text-xs text-amber-600 mt-1">Esta prueba ya está en la lista.</p>
            )}
        </div>
    );
}

export function MarkDeliveredModal({ isOpen, cases, onClose, onConfirm }: MarkDeliveredModalProps) {
    const [deliveredTo, setDeliveredTo] = useState('');
    const [caseEdits, setCaseEdits] = useState<CaseEdit[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [allTests, setAllTests] = useState<LabTest[]>([]);

    useEffect(() => {
        labTestsService.getAll(true).then(setAllTests).catch(() => setAllTests([]));
    }, []);

    useEffect(() => {
        if (isOpen) {
            setCaseEdits(buildCaseEdits(cases));
            setDeliveredTo('');
            setError(null);
            setIsLoading(false);
        }
    }, [isOpen, cases]);

    if (!isOpen) return null;

    const toggleExpanded = (idx: number) => {
        setCaseEdits(prev => prev.map((ce, i) => i === idx ? { ...ce, expanded: !ce.expanded } : ce));
    };

    const updateQuantity = (caseIdx: number, testIdx: number, value: number) => {
        setCaseEdits(prev =>
            prev.map((ce, ci) => ci !== caseIdx ? ce : {
                ...ce,
                tests: ce.tests.map((t, ti) => ti !== testIdx ? t : { ...t, quantity: Math.max(1, value) })
            })
        );
    };

    const removeTest = (caseIdx: number, testIdx: number) => {
        setCaseEdits(prev =>
            prev.map((ce, ci) => ci !== caseIdx ? ce : {
                ...ce,
                tests: ce.tests.filter((_, ti) => ti !== testIdx)
            })
        );
    };

    const addTest = (caseIdx: number, code: string, name: string, quantity: number) => {
        setCaseEdits(prev =>
            prev.map((ce, ci) => ci !== caseIdx ? ce : {
                ...ce,
                tests: [...ce.tests, { code, name, quantity, sampleIndex: 0, testIndex: ce.tests.length }]
            })
        );
    };

    const handleSubmit = async () => {
        if (!deliveredTo.trim()) {
            setError('El campo "Entregado a" es obligatorio');
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            await onConfirm(deliveredTo.trim(), caseEdits.map(ce => ({ caseId: ce.caseId, tests: ce.tests })));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al marcar como entregado');
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center gap-2">
                        <PackageCheck className="w-5 h-5 text-green-600" />
                        <h2 className="text-lg font-semibold text-gray-900">Marcar como entregado</h2>
                    </div>
                    <button type="button" onClick={onClose} disabled={isLoading}
                        className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 disabled:opacity-50">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Entregado a <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={deliveredTo}
                            onChange={e => setDeliveredTo(e.target.value)}
                            maxLength={100}
                            placeholder="Nombre del receptor"
                            disabled={isLoading}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-50"
                        />
                    </div>

                    <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">
                            Casos a entregar ({caseEdits.length})
                        </p>
                        <div className="space-y-2">
                            {caseEdits.map((ce, cIdx) => (
                                <div key={ce.caseId} className="border border-gray-200 rounded-lg overflow-hidden">
                                    <button
                                        type="button"
                                        onClick={() => toggleExpanded(cIdx)}
                                        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 text-left"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="font-mono text-sm font-semibold text-gray-800">{ce.caseCode}</span>
                                            <span className="text-sm text-gray-600">{ce.patientName}</span>
                                            <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-white border border-gray-200 rounded px-1.5 py-0.5">
                                                <FlaskConical className="w-3 h-3" />
                                                {ce.tests.length} prueba{ce.tests.length !== 1 ? 's' : ''}
                                            </span>
                                        </div>
                                        {ce.expanded
                                            ? <ChevronUp className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                            : <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                        }
                                    </button>

                                    {ce.expanded && (
                                        <div className="px-4 py-3 bg-white">
                                            {ce.tests.length === 0 ? (
                                                <p className="text-sm text-gray-400 italic">Sin pruebas registradas</p>
                                            ) : (
                                                <div className="space-y-2">
                                                    {ce.tests.map((t, tIdx) => (
                                                        <div key={`${t.code}-${tIdx}`} className="flex items-center justify-between gap-3">
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                <span className="font-mono text-xs bg-gray-100 border border-gray-200 px-2 py-0.5 rounded text-gray-700 flex-shrink-0">
                                                                    {t.code}
                                                                </span>
                                                                <span className="text-xs text-gray-600 truncate">{t.name}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                                <label className="text-xs text-gray-500">Cant.:</label>
                                                                <input
                                                                    type="number"
                                                                    min={1}
                                                                    value={t.quantity}
                                                                    onChange={e => updateQuantity(cIdx, tIdx, parseInt(e.target.value) || 1)}
                                                                    disabled={isLoading}
                                                                    className="w-16 rounded border border-gray-300 px-2 py-0.5 text-sm text-center text-gray-800 focus:outline-none focus:ring-1 focus:ring-green-500 disabled:bg-gray-50"
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removeTest(cIdx, tIdx)}
                                                                    disabled={isLoading}
                                                                    className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600 disabled:opacity-50"
                                                                    title="Eliminar prueba"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            <TestAdder
                                                allTests={allTests}
                                                existingCodes={new Set(ce.tests.map(t => t.code))}
                                                onAdd={(code, name, qty) => addTest(cIdx, code, name, qty)}
                                                disabled={isLoading}
                                            />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {error && (
                        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                            {error}
                        </p>
                    )}
                </div>

                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
                    <button type="button" onClick={onClose} disabled={isLoading}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">
                        Cancelar
                    </button>
                    <button type="button" onClick={handleSubmit} disabled={isLoading || !deliveredTo.trim()}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed">
                        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                        <PackageCheck className="w-4 h-4" />
                        Marcar como entregado
                    </button>
                </div>
            </div>
        </div>
    );
}
