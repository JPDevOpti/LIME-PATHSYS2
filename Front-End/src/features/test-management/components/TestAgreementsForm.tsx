'use client';

import { useState } from 'react';
import { BaseButton, BaseInput } from '@/shared/components/base';
import { FormField } from '@/shared/components/ui/form';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { EntitiesCombobox } from '@/shared/components/lists';
import type { TestAgreement } from '../types/lab-tests.types';

interface TestAgreementsFormProps {
    agreements: TestAgreement[];
    onChange: (agreements: TestAgreement[]) => void;
}

export function TestAgreementsForm({ agreements, onChange }: TestAgreementsFormProps) {
    const [selectedEntity, setSelectedEntity] = useState<{ code: string; name: string } | null>(null);
    const [customPrice, setCustomPrice] = useState<number>(0);

    const handleAddAgreement = () => {
        if (!selectedEntity || customPrice < 0) return;

        // Evitar duplicados por nombre o código (usamos el nombre como ID en el backend actualmente por compatibilidad)
        if (agreements.find(a => a.entity_id === selectedEntity.name || a.entity_name === selectedEntity.name)) {
            alert('Esta entidad ya tiene un convenio configurado para esta prueba.');
            return;
        }

        const newAgreement: TestAgreement = {
            entity_id: selectedEntity.name, // El backend espera el nombre como identificador para la facturación actual
            entity_name: selectedEntity.name,
            price: customPrice
        };

        onChange([...agreements, newAgreement]);
        setSelectedEntity(null);
        setCustomPrice(0);
    };

    const handleRemoveAgreement = (entityName: string) => {
        onChange(agreements.filter(a => a.entity_name !== entityName));
    };

    return (
        <div className="space-y-4 border-t border-neutral-200 pt-4 mt-4">
            <div>
                <h4 className="text-sm font-semibold text-neutral-900 mb-1">Convenios por Entidad</h4>
                <p className="text-xs text-neutral-500 mb-4">
                    Configure precios especiales para entidades específicas.
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end bg-neutral-50 p-3 rounded-lg border border-neutral-200">
                <div className="sm:col-span-6 lg:col-span-6">
                    <FormField label="Entidad" htmlFor="agreement-entity">
                        <EntitiesCombobox
                            value={selectedEntity?.code || ''}
                            onChange={(v) => {
                                if (!v) setSelectedEntity(null);
                            }}
                            onEntitySelected={(code, name) => setSelectedEntity({ code, name })}
                            placeholder="Buscar entidad..."
                        />
                    </FormField>
                </div>
                <div className="sm:col-span-4 lg:col-span-4">
                    <FormField label="Precio Especial (COP)" htmlFor="agreement-price">
                        <BaseInput
                            id="agreement-price"
                            type="number"
                            min={0}
                            step={100}
                            placeholder="Ej. 45000"
                            value={customPrice === 0 ? '' : customPrice}
                            onChange={(e) => setCustomPrice(parseFloat(e.target.value) || 0)}
                        />
                    </FormField>
                </div>
                <div className="sm:col-span-2 lg:col-span-2">
                    <BaseButton
                        type="button"
                        variant="primary"
                        className="w-full"
                        onClick={handleAddAgreement}
                        disabled={!selectedEntity}
                    >
                        <PlusIcon className="w-4 h-4 mr-1" />
                        Añadir
                    </BaseButton>
                </div>
            </div>

            {agreements.length > 0 ? (
                <div className="overflow-hidden border border-neutral-200 rounded-lg">
                    <table className="min-w-full divide-y divide-neutral-200">
                        <thead className="bg-neutral-50">
                            <tr>
                                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Entidad</th>
                                <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-neutral-500 uppercase">Precio Especial</th>
                                <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-neutral-500 uppercase">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-neutral-200">
                            {agreements.map((agreement) => (
                                <tr key={agreement.entity_name}>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-neutral-900">{agreement.entity_name}</td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-right font-medium text-neutral-900">
                                        ${agreement.price.toLocaleString('es-CO')}
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveAgreement(agreement.entity_name)}
                                            className="text-red-600 hover:text-red-900 transition-colors"
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="text-center py-4 bg-neutral-50 rounded-lg border border-dashed border-neutral-300">
                    <p className="text-xs text-neutral-400 font-medium">No hay convenios configurados.</p>
                </div>
            )}
        </div>
    );
}
