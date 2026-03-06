'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { NotebookPen, X as XIcon } from 'lucide-react';
import { caseService } from '../services/case.service';
import { Case } from '../types/case.types';

interface AddNoteModalProps {
    isOpen: boolean;
    caseId: string;
    onClose: () => void;
    onSaved: (updated: Case) => void;
}

export function AddNoteModal({ isOpen, caseId, onClose, onSaved }: AddNoteModalProps) {
    const [noteText, setNoteText] = useState('');
    const [saving, setSaving] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    if (!isOpen || !mounted) return null;

    const handleClose = () => {
        setNoteText('');
        onClose();
    };

    const handleSave = async () => {
        if (!noteText.trim()) return;
        setSaving(true);
        try {
            const updated = await caseService.addNote(caseId, noteText.trim());
            setNoteText('');
            onSaved(updated);
        } finally {
            setSaving(false);
        }
    };

    return createPortal(
        <div
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onMouseDown={handleClose}
        >
            <div
                className="w-full max-w-md rounded-2xl bg-white shadow-2xl p-6 space-y-4"
                onMouseDown={e => e.stopPropagation()}
            >
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex-shrink-0 w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center">
                            <NotebookPen className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <h3 className="text-base font-semibold text-neutral-800">Agregar nota adicional</h3>
                            <p className="mt-1 text-xs text-neutral-500 leading-relaxed">
                                Las notas adicionales permiten registrar aclaraciones, correcciones o
                                información complementaria sobre casos completados sin modificar el
                                resultado oficial del diagnóstico.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={handleClose}
                        className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
                    >
                        <XIcon className="w-4 h-4" />
                    </button>
                </div>

                <textarea
                    autoFocus
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                    rows={4}
                    placeholder="Escribe la nota aquí..."
                    value={noteText}
                    onChange={e => setNoteText(e.target.value)}
                />

                <div className="flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={handleClose}
                        className="px-4 py-2 text-sm rounded-lg border border-neutral-300 text-neutral-600 hover:bg-neutral-50 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        disabled={!noteText.trim() || saving}
                        onClick={handleSave}
                        className="px-4 py-2 text-sm font-medium rounded-lg text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 transition-colors"
                    >
                        {saving ? 'Guardando…' : 'Guardar nota'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
