'use client';

import { useState, useEffect, useMemo } from 'react';
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser';
import { patientService } from '@/features/patients/services/patient.service';
import {
    Patient,
    CreatePatientRequest,
    IDENTIFICATION_TYPE_OPTIONS
} from '@/features/patients/types/patient.types';
import { BaseCard } from '@/shared/components/base/BaseCard';
import { COLOMBIA_DEPARTMENT_OPTIONS, COLOMBIA_MUNICIPALITIES_BY_DEPARTMENT } from '@/shared/components/lists';
import { FormField, Input, Select, Textarea, Combobox, FormErrorAlert } from '@/shared/components/ui/form';
import { EntitiesCombobox } from '@/shared/components/lists/EntitiesList';
import { CaseEditPatientSuccessModal } from './CaseEditPatientSuccessModal';
import type { ComboboxOption } from '@/shared/components/ui/form/Combobox';

const INITIAL_FORM_DATA: CreatePatientRequest = {
    identification_type: 'CC',
    identification_number: '',
    first_name: '',
    second_name: '',
    first_lastname: '',
    second_lastname: '',
    birth_date: '',
    age: undefined,
    gender: '' as Patient['gender'],
    phone: '',
    email: '',
    care_type: '' as Patient['care_type'],
    entity_info: { entity_name: '', eps_name: '' },
    location: {
        country: '',
        department: 'antioquia',
        municipality: 'Medellín',
        address: ''
    },
    observations: ''
};

interface CaseEditPatientFormProps {
    patient: Patient;
    formId: string;
    onLoadingChange: (loading: boolean) => void;
    onSuccess: (updatedPatient: Patient) => void;
    onClose: () => void;
    hideCrearCasoLink?: boolean;
}

export function CaseEditPatientForm({
    patient,
    formId,
    onLoadingChange,
    onSuccess,
    onClose,
    hideCrearCasoLink = false
}: CaseEditPatientFormProps) {
    const { email: userEmail } = useCurrentUser();
    const [formData, setFormData] = useState<CreatePatientRequest>({ ...INITIAL_FORM_DATA });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<{ message: string; type: 'validation' | 'submit'; field?: string; errors?: Array<{ field: string; message: string }> } | null>(null);
    const [successPatient, setSuccessPatient] = useState<Patient | null>(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});

    useEffect(() => {
        onLoadingChange(isLoading);
    }, [isLoading, onLoadingChange]);

    useEffect(() => {
        if (patient) {
            setFormData({
                identification_type: patient.identification_type,
                identification_number: patient.identification_number,
                first_name: patient.first_name,
                second_name: patient.second_name || '',
                first_lastname: patient.first_lastname,
                second_lastname: patient.second_lastname || '',
                birth_date: patient.birth_date || '',
                age: patient.age,
                gender: patient.gender,
                phone: patient.phone || '',
                email: patient.email || '',
                care_type: patient.care_type,
                entity_info: patient.entity_info || { entity_name: '', eps_name: '' },
                location: patient.location || {
                    country: '',
                    department: 'antioquia',
                    municipality: 'Medellín',
                    address: ''
                },
                observations: patient.observations || ''
            });
        }
    }, [patient]);

    const getFieldError = (name: string): string | undefined => {
        return touched[name] && fieldErrors[name] ? fieldErrors[name] : undefined;
    };

    const formatPhoneDisplay = (value: string): string => {
        const digits = value.replace(/\D/g, '').slice(0, 10);
        if (digits.length <= 3) return digits;
        if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
        return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    };

    // Opciones de municipios según el departamento seleccionado
    const municipalityOptions = useMemo((): ComboboxOption[] => {
        const dept = formData.location?.department;
        if (dept && COLOMBIA_MUNICIPALITIES_BY_DEPARTMENT[dept]) {
            return COLOMBIA_MUNICIPALITIES_BY_DEPARTMENT[dept].map(m => ({ value: m, label: m }));
        }
        return Object.values(COLOMBIA_MUNICIPALITIES_BY_DEPARTMENT)
            .flat()
            .map(m => ({ value: m, label: m }));
    }, [formData.location?.department]);

    const validateField = (name: string, value: unknown): string => {
        switch (name) {
            case 'identification_number':
                if (!value || !String(value).trim()) return 'Requerido';
                const idNum = String(value).trim();
                if (idNum.length < 4 || idNum.length > 20) return 'Entre 4 y 20 caracteres';
                if (!/^[a-zA-Z0-9]+$/.test(idNum)) return 'Solo letras y números';
                break;
            case 'first_name':
            case 'first_lastname':
                if (!value || String(value).trim().length < 2) return 'Mínimo 2 caracteres';
                if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(String(value))) return 'Solo letras';
                break;
            case 'birth_date':
                if (value) {
                    const birthDate = new Date(String(value));
                    if (birthDate > new Date()) return 'No puede ser futura';
                }
                break;
            case 'age':
                if (value != null && value !== '') {
                    const ageNum = parseInt(String(value));
                    if (isNaN(ageNum) || ageNum < 0 || ageNum > 120) return 'Entre 0 y 120';
                }
                break;
            case 'email':
                if (value && String(value).trim()) {
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(String(value))) return 'Correo inválido';
                }
                break;
            case 'phone':
                if (value && String(value).trim()) {
                    const digits = String(value).replace(/\D/g, '');
                    if (digits.length !== 10) return '10 dígitos';
                }
                break;
        }
        return '';
    };

    const validateForm = (): boolean => {
        const errors: Record<string, string> = {};
        errors.identification_number = validateField('identification_number', formData.identification_number);
        errors.first_name = validateField('first_name', formData.first_name);
        errors.first_lastname = validateField('first_lastname', formData.first_lastname);
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
                type: 'validation',
                message: 'Los siguientes campos tienen errores o están incompletos:',
                errors: Object.entries(errors).map(([key, msg]) => ({ field: fieldLabels[key] ?? key, message: String(msg) }))
            });
            return false;
        }
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;
        setIsLoading(true);
        setError(null);
        try {
            const savedPatient = await patientService.updatePatient(patient.id!, formData, userEmail);
            setSuccessPatient(savedPatient);
            setShowSuccessModal(true);
        } catch (err: unknown) {
            setError({ message: err instanceof Error ? err.message : 'Error al guardar paciente', type: 'submit' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCloseSuccessModal = () => {
        const updated = successPatient;
        setShowSuccessModal(false);
        setSuccessPatient(null);
        setFormData({ ...INITIAL_FORM_DATA, entity_info: { entity_name: '', eps_name: '' }, location: { country: '', department: 'antioquia', municipality: 'Medellín', address: '' } });
        setFieldErrors({});
        setTouched({});
        setError(null);
        if (updated) onSuccess(updated);
        onClose();
    };

    const calculateAgeFromBirthDate = (birthDate: string): number | null => {
        if (!birthDate) return null;
        const birth = new Date(birthDate);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
        return age >= 0 ? age : null;
    };

    const calculateBirthDateFromAge = (age: number): string => {
        const today = new Date();
        return `${today.getFullYear() - age}-01-01`;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        let sanitizedValue = value;
        if (name === 'identification_number') sanitizedValue = value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20);
        else if (['first_name', 'second_name', 'first_lastname', 'second_lastname'].includes(name)) sanitizedValue = value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
        else if (name === 'age') sanitizedValue = value.replace(/[^0-9]/g, '');
        else if (name === 'phone') sanitizedValue = value.replace(/\D/g, '').slice(0, 10);

        if (fieldErrors[name]) setFieldErrors(prev => { const n = { ...prev }; delete n[name]; return n; });

        if (name === 'birth_date' && sanitizedValue) {
            const calculatedAge = calculateAgeFromBirthDate(sanitizedValue);
            setFormData(prev => ({ ...prev, birth_date: sanitizedValue, age: calculatedAge ?? prev.age }));
            return;
        }
        if (name === 'age' && sanitizedValue) {
            const ageNum = parseInt(sanitizedValue);
            if (!isNaN(ageNum) && ageNum >= 0 && ageNum <= 120) {
                setFormData(prev => ({ ...prev, age: ageNum, birth_date: calculateBirthDateFromAge(ageNum) }));
                return;
            }
        }
        if (name === 'age' && !sanitizedValue) {
            setFormData(prev => ({ ...prev, age: undefined }));
            return;
        }

        if (name.startsWith('location.')) {
            const field = name.split('.')[1];
            setFormData(prev => ({ ...prev, location: { ...prev.location, [field]: sanitizedValue } }));
        } else if (name.startsWith('entity_info.')) {
            const field = name.split('.')[1];
            setFormData(prev => ({ ...prev, entity_info: { ...prev.entity_info!, [field]: sanitizedValue } }));
        } else {
            setFormData(prev => ({ ...prev, [name]: sanitizedValue }));
        }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setTouched(prev => ({ ...prev, [name]: true }));
        const err = validateField(name, value);
        if (err) setFieldErrors(prev => ({ ...prev, [name]: err }));
    };

    const handleDepartmentChange = (slug: string) => {
        setFormData(prev => ({
            ...prev,
            location: { ...prev.location, department: slug, municipality: '' }
        }));
    };

    const handleMunicipalityChange = (municipalityName: string) => {
        let deptSlug = formData.location?.department || '';
        if (!deptSlug || !COLOMBIA_MUNICIPALITIES_BY_DEPARTMENT[deptSlug]?.includes(municipalityName)) {
            const found = Object.entries(COLOMBIA_MUNICIPALITIES_BY_DEPARTMENT).find(
                ([, muns]) => muns.includes(municipalityName)
            );
            if (found) deptSlug = found[0];
        }
        setFormData(prev => ({
            ...prev,
            location: { ...prev.location, municipality: municipalityName, department: deptSlug }
        }));
    };

    return (
        <>
            <form id={formId} onSubmit={handleSubmit} className="space-y-6" noValidate>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-6">
                        <BaseCard title="Identificación" variant="muted">
                            <div className="grid grid-cols-1 gap-4">
                                <FormField label="Tipo de Identificación" required>
                                    <Select name="identification_type" value={formData.identification_type} onChange={handleChange} options={IDENTIFICATION_TYPE_OPTIONS} />
                                </FormField>
                                <FormField label="Número de Identificación" required>
                                    <Input type="text" name="identification_number" value={formData.identification_number} onChange={handleChange} onBlur={handleBlur} error={getFieldError('identification_number')} placeholder="4-20 caracteres, letras o números" maxLength={20} required />
                                </FormField>
                            </div>
                        </BaseCard>
                        <BaseCard title="Información Personal" variant="muted">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField label="Primer Nombre" required>
                                    <Input type="text" name="first_name" value={formData.first_name} onChange={handleChange} onBlur={handleBlur} error={getFieldError('first_name')} placeholder="Ej: Juan" required />
                                </FormField>
                                <FormField label="Segundo Nombre">
                                    <Input type="text" name="second_name" value={formData.second_name} onChange={handleChange} placeholder="Ej: Carlos" />
                                </FormField>
                                <FormField label="Primer Apellido" required>
                                    <Input type="text" name="first_lastname" value={formData.first_lastname} onChange={handleChange} onBlur={handleBlur} error={getFieldError('first_lastname')} placeholder="Ej: Pérez" required />
                                </FormField>
                                <FormField label="Segundo Apellido">
                                    <Input type="text" name="second_lastname" value={formData.second_lastname} onChange={handleChange} placeholder="Ej: José" />
                                </FormField>
                                <FormField label="Fecha de Nacimiento">
                                    <Input type="date" name="birth_date" value={formData.birth_date} onChange={handleChange} onBlur={handleBlur} error={getFieldError('birth_date')} />
                                </FormField>
                                <FormField label="Edad">
                                    <Input type="number" name="age" value={formData.age ?? ''} onChange={handleChange} onBlur={handleBlur} error={getFieldError('age')} placeholder="Ej: 25" min={0} max={120} />
                                </FormField>
                                <FormField label="Sexo" required>
                                    <Select name="gender" value={formData.gender} onChange={handleChange} options={[{ label: 'Seleccionar sexo biológico', value: '' }, { label: 'Masculino', value: 'Masculino' }, { label: 'Femenino', value: 'Femenino' }]} placeholder="Seleccionar sexo biológico" error={getFieldError('gender') ? ' ' : undefined} />
                                </FormField>
                                <FormField label="Teléfono">
                                    <Input type="tel" name="phone" value={formatPhoneDisplay(formData.phone || '')} onChange={handleChange} onBlur={handleBlur} error={getFieldError('phone')} placeholder="ej. 300-123-4567" inputMode="numeric" maxLength={12} />
                                </FormField>
                                <FormField label="Correo Electrónico">
                                    <Input type="email" name="email" value={formData.email} onChange={handleChange} onBlur={handleBlur} error={getFieldError('email')} placeholder="ejemplo@correo.com" />
                                </FormField>
                            </div>
                        </BaseCard>
                    </div>
                    <div className="space-y-6">
                        <BaseCard title="Atención" variant="muted">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField label="Entidad" required>
                                    <EntitiesCombobox
                                        value={formData.entity_info?.entity_name || ''}
                                        onChange={(code) => {
                                            if (!code) {
                                                setFormData(prev => ({ ...prev, entity_info: { ...prev.entity_info!, entity_name: '' } }));
                                            }
                                        }}
                                        onEntitySelected={(_, name) => {
                                            setFormData(prev => ({ ...prev, entity_info: { ...prev.entity_info!, entity_name: name } }));
                                            if (fieldErrors.entity_name) setFieldErrors(prev => { const n = { ...prev }; delete n.entity_name; return n; });
                                        }}
                                        error={getFieldError('entity_name') ? ' ' : undefined}
                                    />
                                </FormField>
                                <FormField label="EPS">
                                    <Input type="text" name="entity_info.eps_name" value={formData.entity_info?.eps_name || ''} onChange={handleChange} placeholder="Ingrese el nombre de la EPS" />
                                </FormField>
                                <FormField label="Tipo de Atención" required>
                                    <Select name="care_type" value={formData.care_type} onChange={handleChange} options={[{ label: 'Seleccionar tipo de atención', value: '' }, { label: 'Ambulatorio', value: 'Ambulatorio' }, { label: 'Hospitalizado', value: 'Hospitalizado' }]} placeholder="Seleccionar tipo de atención" error={getFieldError('care_type') ? ' ' : undefined} />
                                </FormField>
                            </div>
                        </BaseCard>
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
                                    <Input type="text" name="location.address" value={formData.location?.address} onChange={handleChange} placeholder="Ej: Calle 123 #45-67" />
                                </FormField>
                            </div>
                        </BaseCard>
                        <BaseCard variant="muted">
                            <FormField label="Observaciones">
                                <Textarea name="observations" value={formData.observations} onChange={handleChange} rows={3} />
                            </FormField>
                        </BaseCard>
                    </div>
                </div>

                {error && (
                    <FormErrorAlert message={error.message} type={error.type} field={error.field} errors={error.errors} />
                )}
            </form>
            {successPatient && (
                <CaseEditPatientSuccessModal isOpen={showSuccessModal} onClose={handleCloseSuccessModal} patient={successPatient} hideCrearCasoLink={hideCrearCasoLink} />
            )}
        </>
    );
}
