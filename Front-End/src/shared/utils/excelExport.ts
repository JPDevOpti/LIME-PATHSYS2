import ExcelJS from 'exceljs';
import { Patient } from '@/features/patients/types/patient.types';
import { Case, getDateFromDateInfo } from '@/features/cases/types/case.types';
import { getElapsedDays, getWasTimely, getMaxOpportunityTime } from './dateUtils';
import { formatAge } from './formatAge';

/**
 * Elimina etiquetas HTML de una cadena.
 */
function stripHtml(html: string): string {
    if (!html) return '';
    // Reemplazar <p>, <br>, <div> con saltos de línea para mantener cierta estructura
    let text = html.replace(/<p>|<\/p>|<br\s*\/?>|<div>|<\/div>/gi, (match) => {
        if (match.toLowerCase().startsWith('</p') || match.toLowerCase().startsWith('<br') || match.toLowerCase().startsWith('</div')) {
            return '\n';
        }
        return '';
    });
    // Eliminar el resto de etiquetas
    text = text.replace(/<[^>]*>/g, '');
    // Decodificar entidades básicas si es necesario (ej. &nbsp;)
    text = text.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    return text.trim();
}

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

/**
 * Exporta una lista de casos a un archivo Excel.
 */
export async function exportCasesToExcel(cases: Case[]) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Casos');

    // Preparar tests: una lista plana de {name, quantity} por caso
    const casesWithTests = cases.map(c => {
        const tests = c.samples?.flatMap(s => s.tests?.map(t => ({
            name: t.name,
            quantity: t.quantity
        })) || []) || [];
        return { ...c, flatTests: tests };
    });

    // Encontrar el máximo número de tests en un solo caso para definir columnas
    const maxTests = Math.max(...casesWithTests.map(c => c.flatTests.length), 0);

    // 1. Columnas de Información General del Caso
    const generalColumns = [
        { header: 'Código Caso', key: 'case_code', width: 20 },
        { header: 'Estado', key: 'status', width: 15 },
        { header: 'Prioridad', key: 'priority', width: 12 },
        { header: 'Fecha Creación', key: 'created_at', width: 20 },
        { header: 'Días Transcurridos', key: 'days', width: 15 },
        { header: 'Oportunidad Máxima', key: 'max_opportunity', width: 20 },
        { header: 'Oportunidad', key: 'opportunity', width: 15 },
        { header: 'Médico Solicitante', key: 'doctor', width: 25 },
        { header: 'Servicio', key: 'service', width: 20 },
        { header: 'Entidad', key: 'entity', width: 25 },
        { header: 'Patólogo Asignado', key: 'pathologist_name', width: 25 },
        { header: 'Fecha Creación', key: 'reception_date', width: 18 },
        { header: 'Fecha Firma', key: 'signed_at', width: 20 },
        { header: 'Fecha Entrega', key: 'delivered_at', width: 20 },
    ];

    // 2. Datos del Paciente
    const patientColumns = [
        { header: 'Paciente Apellido 1', key: 'p_last1', width: 15 },
        { header: 'Paciente Apellido 2', key: 'p_last2', width: 15 },
        { header: 'Paciente Nombre 1', key: 'p_name1', width: 15 },
        { header: 'Paciente Nombre 2', key: 'p_name2', width: 15 },
        { header: 'Paciente Tipo Doc', key: 'p_id_type', width: 10 },
        { header: 'Paciente Documento', key: 'p_id_num', width: 18 },
        { header: 'Paciente Sexo', key: 'p_gender', width: 12 },
        { header: 'Paciente Edad', key: 'p_age', width: 8 },
        { header: 'Paciente Teléfono', key: 'p_phone', width: 15 },
        { header: 'Paciente Email', key: 'p_email', width: 25 },
    ];

    // 3. Columnas dinámicas de pruebas
    const testColumns = [];
    for (let i = 1; i <= maxTests; i++) {
        testColumns.push({ header: `Prueba ${i}`, key: `test_name_${i}`, width: 30 });
        testColumns.push({ header: `Cant ${i}`, key: `test_qty_${i}`, width: 10 });
    }

    // 4. Resultados (Descriptive tags stripped in row mapping)
    const resultColumns = [
        { header: 'Macroscopía', key: 'macro', width: 40 },
        { header: 'Microscopía', key: 'micro', width: 40 },
        { header: 'Diagnóstico', key: 'diagnosis', width: 40 },
        { header: 'CIE-10 Código', key: 'cie10_code', width: 15 },
        { header: 'CIE-10 Nombre', key: 'cie10_name', width: 25 },
        { header: 'CIE-O Código', key: 'cieo_code', width: 15 },
        { header: 'CIE-O Nombre', key: 'cieo_name', width: 25 },
    ];

    worksheet.columns = [...generalColumns, ...patientColumns, ...testColumns, ...resultColumns];

    // Estilo de encabezado
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE9F5DB' }
    };

    // Agregar datos
    casesWithTests.forEach(c => {
        const createdTimestamp = getDateFromDateInfo(c.date_info, 'created_at');
        const diffDays = getElapsedDays(c);
        const wasTimely = getWasTimely(c);
        const maxOpp = getMaxOpportunityTime(c);
        const opportunityText = wasTimely === true ? 'Sí' : (wasTimely === false ? 'No' : '');

        const signedTimestamp = getDateFromDateInfo(c.date_info, 'signed_at');
        const deliveredTimestamp = getDateFromDateInfo(c.date_info, 'delivered_at');

        const rowData: any = {
            case_code: c.case_code,
            status: c.status,
            priority: c.priority,
            created_at: createdTimestamp ? new Date(createdTimestamp).toLocaleString() : '',
            days: diffDays,
            max_opportunity: maxOpp ?? '',
            opportunity: opportunityText,
            doctor: c.doctor,
            service: c.service,
            entity: c.entity,
            pathologist_name: c.assigned_pathologist?.name || 'No asignado',
            reception_date: createdTimestamp ? new Date(createdTimestamp).toLocaleString() : '',
            signed_at: signedTimestamp ? new Date(signedTimestamp).toLocaleString() : '',
            delivered_at: deliveredTimestamp ? new Date(deliveredTimestamp).toLocaleString() : '',
            macro: stripHtml(c.result?.macro_result || ''),
            micro: stripHtml(c.result?.micro_result || ''),
            diagnosis: stripHtml(c.result?.diagnosis || ''),
            cie10_code: c.result?.cie10_diagnosis?.code || '',
            cie10_name: c.result?.cie10_diagnosis?.name || '',
            cieo_code: c.result?.cieo_diagnosis?.code || '',
            cieo_name: c.result?.cieo_diagnosis?.name || '',
            p_last1: c.patient?.first_lastname || '',
            p_last2: c.patient?.second_lastname || '',
            p_name1: c.patient?.first_name || '',
            p_name2: c.patient?.second_name || '',
            p_id_type: c.patient?.identification_type || '',
            p_id_num: c.patient?.identification_number || '',
            p_gender: c.patient?.gender || '',
            p_age: c.patient?.age || '',
            p_phone: c.patient?.phone || '',
            p_email: c.patient?.email || ''
        };

        // Rellenar pruebas dinámicas
        c.flatTests.forEach((t, idx) => {
            const i = idx + 1;
            rowData[`test_name_${i}`] = t.name;
            rowData[`test_qty_${i}`] = t.quantity;
        });

        worksheet.addRow(rowData);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `Casos_${new Date().toISOString().slice(0, 10)}.xlsx`;
    anchor.click();
    window.URL.revokeObjectURL(url);
}
