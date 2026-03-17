import { useState, useEffect, useMemo } from 'react';
import { BaseModal } from '@/shared/components/overlay/BaseModal';
import { FormField } from '@/shared/components/ui/form';
import { PathologistsCombobox, ResidentsCombobox } from '@/shared/components/lists';
import { caseService } from '@/features/cases/services/case.service';
import { pathologistService, type PathologistForAssignment } from '@/features/results/services/pathologist.service';
import { residentService, type ResidentForAssignment } from '@/features/results/services/resident.service';
import { AssignedPathologist } from '@/features/cases/types/case.types';
import { Loader2, UserCircle, Mail, FileText, Users, User, X, GraduationCap } from 'lucide-react';
import { clsx } from 'clsx';
import { getStoredUser } from '@/shared/api/client';

interface AssignPathologistModalProps {
    isOpen: boolean;
    onClose: () => void;
    caseId: string;
    currentPathologist?: AssignedPathologist | null;
    currentAssistants?: AssignedPathologist[] | null;
    onAssigned?: (pathologist: AssignedPathologist) => void;
    onAssistantsUpdated?: (assistants: AssignedPathologist[]) => void;
    mode?: 'primary' | 'assistant' | 'resident';
}

function getInitials(name: string): string {
    return name.split(/\s+/).map((w) => w.charAt(0)).join('').toUpperCase();
}

export function AssignPathologistModal({
    isOpen,
    onClose,
    caseId,
    currentPathologist,
    currentAssistants,
    onAssigned,
    onAssistantsUpdated,
    mode: initialMode = 'primary'
}: AssignPathologistModalProps) {
    const [mode, setMode] = useState<'primary' | 'assistant' | 'resident'>(initialMode);
    const [selectedId, setSelectedId] = useState('');
    const [pathologists, setPathologists] = useState<PathologistForAssignment[]>([]);
    const [residents, setResidents] = useState<ResidentForAssignment[]>([]);
    const [loadingPathologists, setLoadingPathologists] = useState(false);
    const [loadingResidents, setLoadingResidents] = useState(false);
    const [pathologistsError, setPathologistsError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [assistants, setAssistants] = useState<AssignedPathologist[]>([]);

    const user = useMemo(() => getStoredUser() as { role?: string } | null, []);
    const role = (user?.role ?? '').toString().toLowerCase();
    const isPathologist = role === 'patologo' || role === 'pathologist';
    const isAdmin = role === 'administrator' || role === 'administrador';
    const isAuxiliar = role === 'recepcionista' || role === 'auxiliar';
    const canAssignResident = isAdmin || isAuxiliar;

    const selected = pathologists.find((p) => p.id === selectedId);
    const selectedResident = residents.find((r) => r.id === selectedId);

    const pathologistOptions = pathologists.map((p) => ({
        value: p.id,
        label: p.name,
        subtitle: getInitials(p.name),
    }));

    useEffect(() => {
        if (isOpen) {
            const finalMode = isPathologist ? 'assistant' : (initialMode === 'resident' && !canAssignResident ? 'assistant' : initialMode);
            setMode(finalMode);
            setAssistants(currentAssistants || []);
            setSelectedId(finalMode === 'primary' ? currentPathologist?.id || '' : '');
            setError('');
        }
    }, [isOpen, initialMode, currentAssistants, currentPathologist, isPathologist, canAssignResident]);

    useEffect(() => {
        if (!isOpen) return;
        setLoadingPathologists(true);
        setPathologistsError('');
        pathologistService
            .listPathologists()
            .then((list) => {
                setPathologists(list);
                setPathologistsError('');
            })
            .catch((e) => {
                setPathologistsError(e instanceof Error ? e.message : 'Error al cargar pat?logos');
                setPathologists([]);
            })
            .finally(() => setLoadingPathologists(false));
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen || !canAssignResident) return;
        setLoadingResidents(true);
        residentService
            .listResidents()
            .then((list) => setResidents(list))
            .catch(() => setResidents([]))
            .finally(() => setLoadingResidents(false));
    }, [isOpen, canAssignResident]);

    const handleAssignPrimary = async () => {
        if (!selected) {
            setError('Seleccione un pat?logo');
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            const updated = await caseService.updateCasePathologist(caseId, {
                id: selected.id,
                name: selected.name
            });
            onAssigned?.(updated.assigned_pathologist!);
            onClose();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Error al asignar pat?logo');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveAssistants = async () => {
        setIsLoading(true);
        setError('');
        try {
            const updated = await caseService.updateCaseAssistants(caseId, assistants);
            onAssistantsUpdated?.(updated.assistant_pathologists || []);
            onClose();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Error al actualizar asistentes');
        } finally {
            setIsLoading(false);
        }
    };

    const addAssistant = () => {
        const person = mode === 'resident' ? selectedResident : selected;
        if (!person) return;
        if (assistants.some((a) => a.id === person.id)) {
            setError(mode === 'resident' ? 'Este residente ya est? asignado' : 'Este pat?logo ya est? asignado como asistente');
            return;
        }
        if (mode !== 'resident' && currentPathologist?.id === person.id) {
            setError('Este pat?logo es el titular del caso');
            return;
        }
        setAssistants([...assistants, { id: person.id, name: person.name }]);
        setSelectedId('');
        setError('');
    };

    const removeAssistant = (id: string) => {
        setAssistants(assistants.filter(a => a.id !== id));
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title={mode === 'primary' ? "Asignar pat?logo titular" : mode === 'resident' ? "Asignar residente" : "Gestionar pat?logos asistentes"}
            size="2xl"
            footer={
                <div className="flex justify-end gap-3 w-full">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 border border-neutral-300 rounded-md text-sm font-medium text-neutral-700 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-lime-brand-500"
                        disabled={isLoading}
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={mode === 'primary' ? handleAssignPrimary : handleSaveAssistants}
                        disabled={isLoading || (mode === 'primary' && !selected)}
                        className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-lime-brand-600 hover:bg-lime-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-lime-brand-500 disabled:opacity-50 flex items-center gap-2"
                    >
                        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                        {mode === 'primary' ? 'Asignar Titular' : 'Guardar Asistentes'}
                    </button>
                </div>
            }
        >
            <div className="space-y-4 overflow-visible">
                {!isPathologist && (
                    <div className="flex p-1 bg-neutral-100 rounded-lg w-fit mb-4">
                        <button
                            onClick={() => {
                                setMode('primary');
                                setSelectedId(currentPathologist?.id || '');
                                setError('');
                            }}
                            className={clsx(
                                "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                                mode === 'primary' ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-700"
                            )}
                        >
                            <User className="w-4 h-4" />
                            Titular
                        </button>
                        <button
                            onClick={() => {
                                setMode('assistant');
                                setSelectedId('');
                                setError('');
                            }}
                            className={clsx(
                                "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                                mode === 'assistant' ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-700"
                            )}
                        >
                            <Users className="w-4 h-4" />
                            Asistentes
                        </button>
                        {canAssignResident && (
                            <button
                                onClick={() => {
                                    setMode('resident');
                                    setSelectedId('');
                                    setError('');
                                }}
                                className={clsx(
                                    "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                                    mode === 'resident' ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-700"
                                )}
                            >
                                <GraduationCap className="w-4 h-4" />
                                Asignar residente
                            </button>
                        )}
                    </div>
                )}

                <div className="space-y-4">
                    <div className="flex gap-2 items-end">
                        <div className="flex-1">
                            {mode === 'resident' ? (
                                <FormField label="Agregar Residente" htmlFor="resident-combobox">
                                    <ResidentsCombobox
                                        id="resident-combobox"
                                        name="resident"
                                        value={selectedId}
                                        onChange={(v) => setSelectedId(v)}
                                        placeholder={loadingResidents ? 'Cargando residentes...' : 'Buscar residente...'}
                                        disabled={loadingResidents}
                                    />
                                </FormField>
                            ) : (
                                <FormField label={mode === 'primary' ? "Pat?logo Titular" : "Agregar Pat?logo Asistente"} htmlFor="pathologist-combobox">
                                    <PathologistsCombobox
                                        id="pathologist-combobox"
                                        name="pathologist"
                                        value={selectedId}
                                        onChange={(v) => setSelectedId(v)}
                                        placeholder={loadingPathologists ? 'Cargando pat?logos...' : 'Buscar pat?logo...'}
                                        options={pathologistOptions}
                                        disabled={loadingPathologists}
                                    />
                                </FormField>
                            )}
                        </div>
                        {(mode === 'assistant' || mode === 'resident') && (
                            <button
                                type="button"
                                onClick={addAssistant}
                                disabled={mode === 'resident' ? !selectedResident : !selected}
                                className="h-10 px-4 bg-neutral-900 text-white rounded-md text-sm font-medium disabled:opacity-50 flex items-center justify-center"
                            >
                                Agregar
                            </button>
                        )}
                    </div>

                    {(mode === 'assistant' || mode === 'resident') && assistants.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Asistentes asignados</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {assistants.map((assistant) => (
                                    <div key={assistant.id} className="flex items-center justify-between p-2 pl-3 bg-white border border-neutral-200 rounded-lg group">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div className="w-6 h-6 rounded-full bg-lime-brand-100 text-lime-brand-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                                                {getInitials(assistant.name)}
                                            </div>
                                            <span className="text-sm font-medium text-neutral-700 truncate">{assistant.name}</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeAssistant(assistant.id)}
                                            className="p-1 text-neutral-400 hover:text-red-500 transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="rounded-lg border border-neutral-200 bg-neutral-50/50 p-4 space-y-3">
                        <dl className="grid grid-cols-1 gap-3 text-sm">
                            <div className="flex items-center gap-2">
                                <UserCircle className="h-4 w-4 shrink-0 text-neutral-400" />
                                <div className="min-w-0 flex-1">
                                    <dt className="text-neutral-500">Nombre</dt>
                                    {(mode === 'resident' ? selectedResident : selected) ? (
                                        <dd className="font-medium text-neutral-900 truncate">{(mode === 'resident' ? selectedResident : selected)!.name}</dd>
                                    ) : (
                                        <dd className="font-medium text-neutral-900">-</dd>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 shrink-0 text-neutral-400" />
                                <div>
                                    <dt className="text-neutral-500">Correo</dt>
                                    <dd className="font-medium text-neutral-900">{(mode === 'resident' ? selectedResident : selected)?.email ?? '-'}</dd>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 shrink-0 text-neutral-400" />
                                <div>
                                    <dt className="text-neutral-500">{mode === 'resident' ? 'C?digo' : 'Registro m?dico'}</dt>
                                    <dd className="font-medium text-neutral-900">{mode === 'resident' ? (selectedResident?.code ?? '-') : ((selected as PathologistForAssignment)?.medical_registry ?? '-')}</dd>
                                </div>
                            </div>
                        </dl>
                    </div>
                </div>

                {pathologistsError && <p className="text-sm font-medium text-amber-600">{pathologistsError}</p>}
                {error && <p className="text-sm font-medium text-red-600">{error}</p>}
            </div>
        </BaseModal>
    );
}
