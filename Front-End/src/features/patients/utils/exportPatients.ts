import ExcelJS from 'exceljs';
import { Patient } from '../types/patient.types';
import { formatAge } from '@/shared/utils/formatAge';

/**
 * Exporta una lista de pacientes a un archivo Excel.
 * Incluye todos los campos relevantes en un formato legible.
 */
export async function exportPatientsToExcel(patients: Patient[]) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Pacientes');

    // Configurar columnas
    worksheet.columns = [
        { header: 'Código', key: 'patient_code', width: 15 },
        { header: 'Tipo Doc', key: 'identification_type', width: 10 },
        { header: 'Documento', key: 'identification_number', width: 18 },
        { header: 'Primer Nombre', key: 'first_name', width: 20 },
        { header: 'Segundo Nombre', key: 'second_name', width: 20 },
        { header: 'Primer Apellido', key: 'first_lastname', width: 20 },
        { header: 'Segundo Apellido', key: 'second_lastname', width: 20 },
        { header: 'Nombre Completo', key: 'full_name', width: 35 },
        { header: 'Fecha de Nacimiento', key: 'birth_date', width: 18 },
        { header: 'Edad', key: 'age', width: 8 },
        { header: 'Sexo', key: 'gender', width: 12 },
        { header: 'Teléfono', key: 'phone', width: 15 },
        { header: 'Email', key: 'email', width: 25 },
        { header: 'Departamento', key: 'department', width: 18 },
        { header: 'Municipio', key: 'municipality', width: 18 },
        { header: 'Dirección', key: 'address', width: 30 },
        { header: 'Entidad', key: 'entity_name', width: 25 },
        { header: 'EPS', key: 'eps_name', width: 20 },
        { header: 'Tipo de Atención', key: 'care_type', width: 18 },
        { header: 'Observaciones', key: 'observations', width: 40 },
        { header: 'Fecha Creación', key: 'created_at', width: 20 },
    ];

    // Estilo de encabezado
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE9F5DB' } // Lime light background
    };

    // Agregar datos
    patients.forEach(p => {
        worksheet.addRow({
            patient_code: p.patient_code,
            identification_type: p.identification_type,
            identification_number: p.identification_number,
            first_name: p.first_name,
            second_name: p.second_name || '',
            first_lastname: p.first_lastname,
            second_lastname: p.second_lastname || '',
            full_name: p.full_name || `${p.first_name} ${p.first_lastname}`,
            birth_date: p.birth_date || '',
            age: formatAge(p.age, p.birth_date) || '',
            gender: p.gender,
            phone: p.phone || '',
            email: p.email || '',
            department: p.location?.department || '',
            municipality: p.location?.municipality || '',
            address: p.location?.address || '',
            entity_name: p.entity_info?.entity_name || '',
            eps_name: p.entity_info?.eps_name || '',
            care_type: p.care_type,
            observations: p.observations || '',
            created_at: p.created_at ? new Date(p.created_at).toLocaleString() : ''
        });
    });

    // Generar buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Descargar archivo en el navegador
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `Pacientes_${new Date().toISOString().slice(0, 10)}.xlsx`;
    anchor.click();
    window.URL.revokeObjectURL(url);
}
