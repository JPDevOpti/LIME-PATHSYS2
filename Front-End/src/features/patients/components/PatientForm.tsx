'use client';

import { useState, useEffect, useMemo } from 'react';
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser';
import { patientService } from '../services/patient.service';
import { Patient, CreatePatientRequest, Gender, CareType, IDENTIFICATION_TYPE_OPTIONS, IdentificationType } from '../types/patient.types';
import { BaseCard } from '@/shared/components/base/BaseCard';
import { FormField, Input, Select, Textarea, Combobox, FormErrorAlert } from '@/shared/components/ui/form';
import { PatientSuccessModal } from './PatientSuccessModal';
import { ConfirmDialog } from '@/shared/components/overlay/ConfirmDialog';
import { SaveButton, DeleteButton } from '@/shared/components/ui/buttons';
import { EntitiesCombobox } from '@/shared/components/lists';
import { COLOMBIA_DEPARTMENT_OPTIONS, COLOMBIA_MUNICIPALITIES_BY_DEPARTMENT } from '@/shared/components/lists';
import type { ComboboxOption } from '@/shared/components/ui/form/Combobox';

const INITIAL_FORM_DATA: CreatePatientRequest = {
    identification_type: '' as IdentificationType,
    identification_number: '',
    first_name: '',
    second_name: '',
    first_lastname: '',
    second_lastname: '',
    birth_date: '',
    age: undefined,
    gender: '' as Gender,
    phone: '',
    email: '',
    care_type: '' as CareType,
    entity_info: { entity_name: '', eps_name: '' },
    location: {
        country: '',
        department: 'antioquia',
        municipality: 'Medellín',
        address: ''
    },
    observations: ''
};

interface PatientFormProps {
    initialData?: Patient;
    isEditMode?: boolean;
    onCloseSuccess?: (patient?: Patient) => void;
    onCancel?: () => void;
    onDelete?: () => void | Promise<void>;
    /** Oculta "Crear caso" en el modal de éxito (ej: cuando se edita desde crear caso) */
    hideCrearCasoLink?: boolean;
}

export function PatientForm({ initialData, isEditMode = false, onCloseSuccess, onCancel, onDelete, hideCrearCasoLink = false }: PatientFormProps) {
    const { email: userEmail } = useCurrentUser();
    const [formData, setFormData] = useState<CreatePatientRequest>({ ...INITIAL_FORM_DATA });

    const [isLoading, setIsLoading] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<{ message: string; type: 'validation' | 'submit'; field?: string; errors?: Array<{ field: string; message: string }> } | null>(null);
    const [successPatient, setSuccessPatient] = useState<Patient | null>(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (initialData) {
            setFormData({
                identification_type: initialData.identification_type,
                identification_number: initialData.identification_number,
                first_name: initialData.first_name,
                second_name: initialData.second_name || '',
                first_lastname: initialData.first_lastname,
                second_lastname: initialData.second_lastname || '',
                birth_date: initialData.birth_date || '',
                age: initialData.age,
                gender: initialData.gender,
                phone: initialData.phone || '',
                email: initialData.email || '',
                care_type: initialData.care_type,
                entity_info: initialData.entity_info || {
                    entity_name: '',
                    eps_name: ''
                },
                location: initialData.location || {
                    country: '',
                    department: 'antioquia',
                    municipality: 'Medellín',
                    address: ''
                },
                observations: initialData.observations || ''
            });
        }
    }, [initialData]);

    // Opciones de municipios según el departamento seleccionado
    const municipalityOptions = useMemo((): ComboboxOption[] => {
        const dept = formData.location?.department;
        if (dept && COLOMBIA_MUNICIPALITIES_BY_DEPARTMENT[dept]) {
            return COLOMBIA_MUNICIPALITIES_BY_DEPARTMENT[dept].map(m => ({ value: m, label: m }));
        }
        // Sin departamento seleccionado: mostrar todos
        return Object.values(COLOMBIA_MUNICIPALITIES_BY_DEPARTMENT)
            .flat()
            .map(m => ({ value: m, label: m }));
    }, [formData.location?.department]);

    const validateField = (name: string, value: any): string => {
        switch (name) {
            case 'identification_type':
                if (!value || !value.trim()) return 'Requerido';
                break;
            case 'identification_number':
                if (!value || !value.trim()) return 'Requerido';
                const idNum = value.trim();
                if (idNum.length < 4 || idNum.length > 20) return 'Entre 4 y 20 caracteres';
                if (!/^[a-zA-Z0-9]+$/.test(idNum)) return 'Solo letras y números';
                break;
            case 'first_name':
            case 'first_lastname':
                if (!value || value.trim().length < 2) return 'Mínimo 2 caracteres';
                if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(value)) return 'Solo letras';
                break;
            case 'birth_date':
                if (value) {
                    const birthDate = new Date(value);
                    if (birthDate > new Date()) return 'No puede ser futura';
                }
                break;
            case 'age':
                if (value !== undefined && value !== '') {
                    const ageNum = parseInt(value);
                    if (isNaN(ageNum) || ageNum < 0 || ageNum > 120) return 'Entre 0 y 120';
                }
                break;
            case 'email':
                if (value && value.trim()) {
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(value)) return 'Correo inválido';
                }
                break;
            case 'phone':
                if (value && value.trim()) {
                    const digits = value.replace(/\D/g, '');
                    if (digits.length !== 10) return '10 dígitos';
                }
                break;
        }
        return '';
    };

    const validateForm = (): boolean => {
        const errors: Record<string, string> = {};

        // Campos obligatorios según backend
        errors.identification_type = !formData.identification_type?.trim() ? 'Requerido' : '';
        errors.identification_number = validateField('identification_number', formData.identification_number);
        errors.first_name = validateField('first_name', formData.first_name);
        errors.first_lastname = validateField('first_lastname', formData.first_lastname);
        errors.gender = !formData.gender?.trim() ? 'Requerido' : '';
        errors.care_type = !formData.care_type?.trim() ? 'Requerido' : '';
        errors.entity_name = !formData.entity_info?.entity_name?.trim() ? 'Requerido' : '';
        // Opcionales con validación de formato si tienen valor
        errors.birth_date = validateField('birth_date', formData.birth_date);
        errors.age = validateField('age', formData.age);
        errors.email = validateField('email', formData.email);
        errors.phone = validateField('phone', formData.phone);

        Object.keys(errors).forEach(key => { if (!errors[key]) delete errors[key]; });
        setFieldErrors(errors);

        const allTouched: Record<string, boolean> = {};
        Object.keys(formData).forEach(key => { allTouched[key] = true; });
        if (formData.entity_info) allTouched.entity_name = true;
        setTouched(allTouched);

        const fieldLabels: Record<string, string> = {
            identification_type: 'Tipo de Identificación',
            identification_number: 'Número de Identificación',
            first_name: 'Primer Nombre',
            first_lastname: 'Primer Apellido',
            gender: 'Sexo',
            care_type: 'Tipo de Atención',
            entity_name: 'Entidad',
            birth_date: 'Fecha de Nacimiento',
            age: 'Edad',
            email: 'Correo Electrónico',
            phone: 'Teléfono'
        };
        if (Object.keys(errors).length > 0) {
            setError({
                message: 'Los siguientes campos tienen errores o están incompletos:',
                type: 'validation',
                errors: Object.entries(errors).map(([key, msg]) => ({ field: fieldLabels[key] ?? key, message: msg }))
            });
        }
        return Object.keys(errors).length === 0;
    };

    const getFieldError = (fieldName: string): string => {
        if (!touched[fieldName]) return '';
        return fieldErrors[fieldName] ?? '';
    };

    // Formato visual del teléfono: XXX-XXX-XXXX
    const formatPhoneDisplay = (digits: string): string => {
        const d = digits.replace(/\D/g, '').slice(0, 10);
        if (d.length <= 3) return d;
        if (d.length <= 6) return `${d.slice(0, 3)}-${d.slice(3)}`;
        return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
    };

    // Elimina strings vacíos de campos opcionales antes de enviar al backend
    const sanitizePayload = (data: Omit<CreatePatientRequest, 'age'>) => {
        const optionalStrFields = ['second_name', 'second_lastname', 'birth_date', 'phone', 'email', 'observations'] as const;
        const out: any = { ...data };
        for (const field of optionalStrFields) {
            if (out[field] === '') out[field] = null;
        }
        if (out.entity_info?.eps_name === '') out.entity_info = { ...out.entity_info, eps_name: null };
        if (out.location) {
            const loc = { ...out.location };
            if (loc.country === '') loc.country = null;
            if (loc.department === '') loc.department = null;
            if (loc.municipality === '') loc.municipality = null;
            if (loc.address === '') loc.address = null;
            out.location = loc;
        }
        return out;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate form
        if (!validateForm()) return;

        setIsLoading(true);
        setError(null);

        try {
            let savedPatient: Patient;
            const { age, ...raw } = formData;
            const dataToSend = sanitizePayload(raw);

            if (isEditMode && initialData?.id) {
                savedPatient = await patientService.updatePatient(initialData.id, dataToSend, userEmail);
                setSuccessPatient(savedPatient);
                setShowSuccessModal(true);
            } else {
                savedPatient = await patientService.createPatient(dataToSend, userEmail);
                setSuccessPatient(savedPatient);
                setShowSuccessModal(true);
            }

        } catch (err: any) {
            setError({ message: err.message || 'Error al guardar paciente', type: 'submit' });
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => ({
        ...INITIAL_FORM_DATA,
        entity_info: { entity_name: '', eps_name: '' },
        location: {
            country: '',
            department: 'antioquia',
            municipality: 'Medellín',
            address: ''
        }
    });

    const handleCloseSuccessModal = () => {
        const updated = successPatient;
        setShowSuccessModal(false);
        setSuccessPatient(null);
        setFormData(resetForm());
        setFieldErrors({});
        setTouched({});
        setError(null);
        onCloseSuccess?.(updated ?? undefined);
    };

    const handleCancel = () => {
        setFormData(resetForm());
        setFieldErrors({});
        setTouched({});
        setError(null);
        onCancel?.();
    };

    // Helper functions for age and birth date synchronization
    const calculateAgeFromBirthDate = (birthDate: string): number | null => {
        if (!birthDate) return null;
        const birth = new Date(birthDate);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();

        // Adjust age if birthday hasn't occurred yet this year
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }

        return age >= 0 ? age : null;
    };

    const calculateBirthDateFromAge = (age: number): string => {
        const today = new Date();
        const birthYear = today.getFullYear() - age;
        // Use January 1st of that year as approximate birth date
        return `${birthYear}-01-01`;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;

        // Sanitize input based on field type
        let sanitizedValue = value;

        // Restriction rules
        if (name === 'identification_number') {
            sanitizedValue = value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20);
        } else if (['first_name', 'second_name', 'first_lastname', 'second_lastname'].includes(name)) {
            // Only letters and spaces
            sanitizedValue = value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
        } else if (name === 'age') {
            // Only numbers
            sanitizedValue = value.replace(/[^0-9]/g, '');
        } else if (name === 'phone') {
            sanitizedValue = value.replace(/\D/g, '').slice(0, 10);
        }

        if (fieldErrors[name]) setFieldErrors(prev => { const n = { ...prev }; delete n[name]; return n; });

        // Handle age and birth_date synchronization
        if (name === 'birth_date' && sanitizedValue) {
            const calculatedAge = calculateAgeFromBirthDate(sanitizedValue);
            setFormData(prev => ({
                ...prev,
                birth_date: sanitizedValue,
                age: calculatedAge !== null ? calculatedAge : prev.age
            }));
            return;
        } else if (name === 'age' && sanitizedValue) {
            const ageNum = parseInt(sanitizedValue);
            if (!isNaN(ageNum) && ageNum >= 0 && ageNum <= 120) {
                const calculatedBirthDate = calculateBirthDateFromAge(ageNum);
                setFormData(prev => ({
                    ...prev,
                    age: ageNum,
                    birth_date: calculatedBirthDate
                }));
                return;
            }
        } else if (name === 'age' && !sanitizedValue) {
            // If age is cleared, don't clear birth_date
            setFormData(prev => ({ ...prev, age: undefined }));
            return;
        }

        if (name.startsWith('location.')) {
            const field = name.split('.')[1];
            setFormData(prev => ({
                ...prev,
                location: {
                    ...prev.location,
                    [field]: sanitizedValue
                }
            }));
        } else if (name.startsWith('entity_info.')) {
            const field = name.split('.')[1];
            setFormData(prev => ({
                ...prev,
                entity_info: {
                    ...prev.entity_info!,
                    [field]: sanitizedValue
                }
            }));
        } else {
            setFormData(prev => ({ ...prev, [name]: sanitizedValue }));
        }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;

        // Mark field as touched
        setTouched(prev => ({ ...prev, [name]: true }));

        // Validate field
        const error = validateField(name, value);
        if (error) {
            setFieldErrors(prev => ({ ...prev, [name]: error }));
        }
    };

    const handleDepartmentChange = (slug: string) => {
        setFormData(prev => ({
            ...prev,
            location: {
                ...prev.location,
                department: slug,
                municipality: '' // Reset municipality when department changes
            }
        }));
    };

    const handleMunicipalityChange = (municipalityName: string) => {
        // Find the department that contains this municipality
        let deptSlug = formData.location?.department || '';
        if (!deptSlug || !COLOMBIA_MUNICIPALITIES_BY_DEPARTMENT[deptSlug]?.includes(municipalityName)) {
            const found = Object.entries(COLOMBIA_MUNICIPALITIES_BY_DEPARTMENT).find(
                ([, muns]) => muns.includes(municipalityName)
            );
            if (found) deptSlug = found[0];
        }
        setFormData(prev => ({
            ...prev,
            location: {
                ...prev.location,
                municipality: municipalityName,
                department: deptSlug
            }
        }));
    };

    return (
        <BaseCard padding="lg">
            <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left Column */}
                    <div className="space-y-6">
                        {/* Identification */}
                        <BaseCard title="Identificación" variant="muted">
                            <div className="grid grid-cols-1 gap-4">
                                <FormField label="Tipo de Identificación" required>
                                    <Select
                                        name="identification_type"
                                        value={formData.identification_type}
                                        onChange={handleChange}
                                        options={[
                                            { label: 'Seleccionar tipo de identificación', value: '' },
                                            ...IDENTIFICATION_TYPE_OPTIONS
                                        ]}
                                        error={getFieldError('identification_type') ? ' ' : undefined}
                                    />
                                </FormField>
                                <FormField label="Número de Identificación" required>
                                    <Input
                                        type="text"
                                        name="identification_number"
                                        value={formData.identification_number}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        error={getFieldError('identification_number')}
                                        placeholder="Ingresar documento Ej: 1010302542, AN1020343, NN1231234"
                                        maxLength={20}
                                        required
                                    />
                                </FormField>
                            </div>
                        </BaseCard>

                        {/* Personal Info */}
                        <BaseCard title="Información Personal" variant="muted">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField label="Primer Nombre" required>
                                    <Input
                                        type="text"
                                        name="first_name"
                                        value={formData.first_name}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        error={getFieldError('first_name')}
                                        placeholder="Ej: Juan"
                                        required
                                    />
                                </FormField>
                                <FormField label="Segundo Nombre">
                                    <Input
                                        type="text"
                                        name="second_name"
                                        value={formData.second_name}
                                        onChange={handleChange}
                                        placeholder="Ej: Carlos"
                                    />
                                </FormField>
                                <FormField label="Primer Apellido" required>
                                    <Input
                                        type="text"
                                        name="first_lastname"
                                        value={formData.first_lastname}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        error={getFieldError('first_lastname')}
                                        placeholder="Ej: Pérez"
                                        required
                                    />
                                </FormField>
                                <FormField label="Segundo Apellido">
                                    <Input
                                        type="text"
                                        name="second_lastname"
                                        value={formData.second_lastname}
                                        onChange={handleChange}
                                        placeholder="Ej: José"
                                    />
                                </FormField>
                                <FormField label="Fecha de Nacimiento">
                                    <Input
                                        type="date"
                                        name="birth_date"
                                        value={formData.birth_date}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        error={getFieldError('birth_date')}
                                    />
                                </FormField>
                                <FormField label="Edad">
                                    <Input
                                        type="number"
                                        name="age"
                                        value={formData.age || ''}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        error={getFieldError('age')}
                                        placeholder="Ej: 35"
                                        min="0"
                                        max="120"
                                    />
                                </FormField>
                                <FormField label="Sexo" required>
                                    <Select
                                        name="gender"
                                        value={formData.gender}
                                        onChange={handleChange}
                                        options={[
                                            { label: 'Seleccionar sexo biológico', value: '' },
                                            { label: 'Masculino', value: 'Masculino' },
                                            { label: 'Femenino', value: 'Femenino' }
                                        ]}
                                        placeholder="Seleccionar sexo biológico"
                                        error={getFieldError('gender') ? ' ' : undefined}
                                    />
                                </FormField>
                                <FormField label="Teléfono">
                                    <Input
                                        type="tel"
                                        name="phone"
                                        value={formatPhoneDisplay(formData.phone ?? '')}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        error={getFieldError('phone')}
                                        placeholder="e.g. 300-123-4567"
                                        inputMode="numeric"
                                        maxLength={12}
                                    />
                                </FormField>
                                <FormField label="Correo Electrónico">
                                    <Input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        error={getFieldError('email')}
                                        placeholder="ejemplo@correo.com"
                                    />
                                </FormField>
                            </div>
                        </BaseCard>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-6">
                        {/* Entity & Care Type */}
                        <BaseCard title="Atención" variant="muted">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField label="Entidad" required>
                                    <EntitiesCombobox
                                        value={formData.entity_info?.entity_name || ''}
                                        onChange={(value) => {
                                            setFormData(prev => ({
                                                ...prev,
                                                entity_info: {
                                                    ...prev.entity_info!,
                                                    entity_name: value
                                                }
                                            }));
                                            if (fieldErrors.entity_name) setFieldErrors(prev => { const n = { ...prev }; delete n.entity_name; return n; });
                                        }}
                                        onEntitySelected={(_code, name) => {
                                            setFormData(prev => ({
                                                ...prev,
                                                entity_info: {
                                                    ...prev.entity_info!,
                                                    entity_name: name
                                                }
                                            }));
                                        }}
                                        placeholder="Buscar y seleccionar entidad..."
                                        error={getFieldError('entity_name') ? ' ' : undefined}
                                        name="entity_info.entity_name"
                                    />
                                </FormField>
                                <FormField label="EPS">
                                    <Input
                                        type="text"
                                        name="entity_info.eps_name"
                                        value={formData.entity_info?.eps_name || ''}
                                        onChange={handleChange}
                                        placeholder="Ingrese el nombre de la EPS"
                                    />
                                </FormField>
                                <FormField label="Tipo de Atención" required>
                                    <Select
                                        name="care_type"
                                        value={formData.care_type}
                                        onChange={handleChange}
                                        options={[
                                            { label: 'Seleccione tipo de atención', value: '' },
                                            { label: 'Ambulatorio', value: 'Ambulatorio' },
                                            { label: 'Hospitalizado', value: 'Hospitalizado' }
                                        ]}
                                        placeholder="Seleccione tipo de atención"
                                        error={getFieldError('care_type') ? ' ' : undefined}
                                    />
                                </FormField>
                            </div>
                        </BaseCard>

                        {/* Location */}
                        <BaseCard title="Ubicación" variant="muted">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField label="Departamento">
                                    <Combobox
                                        name="location.department"
                                        value={formData.location?.department || ''}
                                        onChange={handleDepartmentChange}
                                        options={COLOMBIA_DEPARTMENT_OPTIONS}
                                        placeholder="Buscar departamento..."
                                    />
                                </FormField>
                                <FormField label="Municipio">
                                    <Combobox
                                        name="location.municipality"
                                        value={formData.location?.municipality || ''}
                                        onChange={handleMunicipalityChange}
                                        options={municipalityOptions}
                                        placeholder="Buscar municipio..."
                                    />
                                </FormField>
                                <FormField label="Dirección">
                                    <Input
                                        type="text"
                                        name="location.address"
                                        value={formData.location?.address}
                                        onChange={handleChange}
                                        placeholder="Ej: Calle 123 #45-67"
                                    />
                                </FormField>
                            </div>
                        </BaseCard>

                        {/* Observaciones */}
                        <BaseCard variant="muted">
                            <FormField label="Observaciones">
                                <Textarea
                                    name="observations"
                                    value={formData.observations}
                                    onChange={handleChange}
                                    rows={3}
                                />
                            </FormField>
                        </BaseCard>
                    </div>
                </div>

                {error && (
                    <FormErrorAlert message={error.message} type={error.type} field={error.field} errors={error.errors} />
                )}

                {/* Actions */}
                <div className="flex flex-wrap justify-end items-center gap-3 pt-4 border-t border-neutral-200" dir="ltr">
                    <button
                        type="button"
                        onClick={handleCancel}
                        className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-lime-brand-500"
                        disabled={isLoading}
                    >
                        Cancelar
                    </button>
                    {isEditMode && onDelete && (
                        <DeleteButton
                            onClick={() => setShowDeleteConfirm(true)}
                            disabled={isLoading}
                            text="Borrar"
                        />
                    )}
                    <SaveButton loading={isLoading} disabled={isLoading}>
                        {isEditMode ? 'Guardar Cambios' : 'Crear Paciente'}
                    </SaveButton>
                </div>
            </form>

            {isEditMode && onDelete && (
                <ConfirmDialog
                    isOpen={showDeleteConfirm}
                    onClose={() => setShowDeleteConfirm(false)}
                    title="Borrar paciente"
                    message="¿Está seguro que desea eliminar este paciente? Esta acción no se puede deshacer."
                    confirmText="Eliminar"
                    cancelText="Cancelar"
                    variant="danger"
                    loading={isDeleting}
                    onConfirm={async () => {
                        setIsDeleting(true);
                        try {
                            await onDelete();
                            setShowDeleteConfirm(false);
                        } finally {
                            setIsDeleting(false);
                        }
                    }}
                />
            )}

            {/* Success Modal */}
            {successPatient && (
                <PatientSuccessModal
                    isOpen={showSuccessModal}
                    onClose={handleCloseSuccessModal}
                    patient={successPatient}
                    variant={isEditMode ? 'edit' : 'create'}
                    hideCrearCasoLink={hideCrearCasoLink}
                />
            )}
        </BaseCard>
    );
}
