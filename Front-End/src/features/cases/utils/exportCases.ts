import ExcelJS from 'exceljs';
import { Case, getDateFromDateInfo } from '../types/case.types';
import { BODY_REGION_OPTIONS } from '../data/case-options';
import { getElapsedDays, getWasTimely, getMaxOpportunityTime } from '@/shared/utils/dateUtils';

function stripHtml(html: string): string {
    if (!html) return '';
    let text = html.replace(/<p>|<\/p>|<br\s*\/?>|<div>|<\/div>/gi, (match) => {
        if (match.toLowerCase().startsWith('</p') || match.toLowerCase().startsWith('<br') || match.toLowerCase().startsWith('</div')) {
            return '\n';
        }
        return '';
    });
    text = text.replace(/<[^>]*>/g, '');
    text = text.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    return text.trim();
}

export async function exportCasesToExcel(cases: Case[]) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Casos');

    const maxSamples = Math.max(...cases.map(c => c.samples?.length ?? 0), 0);
    const maxTestsPerSample = Math.max(
        ...cases.flatMap(c => (c.samples ?? []).map(s => s.tests?.length ?? 0)),
        0
    );

    const generalColumns = [
        { header: 'Código Caso', key: 'case_code', width: 22 },
        { header: 'Estado', key: 'status', width: 16 },
        { header: 'Prioridad', key: 'priority', width: 14 },
        { header: 'Fecha Creación', key: 'created_at', width: 22 },
        { header: 'Días Transcurridos', key: 'days', width: 16 },
        { header: 'Oportunidad Máxima', key: 'max_opportunity', width: 22 },
        { header: 'Oportunidad', key: 'opportunity', width: 16 },
        { header: 'Médico Solicitante', key: 'doctor', width: 28 },
        { header: 'Servicio', key: 'service', width: 22 },
        { header: 'Entidad', key: 'entity', width: 28 },
        { header: 'Patólogo Asignado', key: 'pathologist_name', width: 28 },
        { header: 'Fecha Creación', key: 'reception_date', width: 20 },
        { header: 'Fecha Firma', key: 'signed_at', width: 22 },
        { header: 'Fecha Entrega', key: 'delivered_at', width: 22 },
    ];

    const patientColumns = [
        { header: 'Paciente Apellido 1', key: 'p_last1', width: 18 },
        { header: 'Paciente Apellido 2', key: 'p_last2', width: 18 },
        { header: 'Paciente Nombre 1', key: 'p_name1', width: 18 },
        { header: 'Paciente Nombre 2', key: 'p_name2', width: 18 },
        { header: 'Paciente Tipo Doc', key: 'p_id_type', width: 12 },
        { header: 'Paciente Documento', key: 'p_id_num', width: 20 },
        { header: 'Paciente Sexo', key: 'p_gender', width: 12 },
        { header: 'Paciente Edad', key: 'p_age', width: 10 },
        { header: 'Paciente Teléfono', key: 'p_phone', width: 18 },
        { header: 'Paciente Email', key: 'p_email', width: 28 },
    ];

    const sampleColumns: { header: string; key: string; width: number }[] = [];
    for (let i = 1; i <= maxSamples; i++) {
        sampleColumns.push({ header: `Muestra ${i} - Región`, key: `s${i}_region`, width: 28 });
        for (let j = 1; j <= maxTestsPerSample; j++) {
            sampleColumns.push({ header: `M${i} Prueba ${j}`, key: `s${i}_test${j}`, width: 14 });
            sampleColumns.push({ header: `M${i} Cantidad ${j}`, key: `s${i}_qty${j}`, width: 12 });
        }
    }

    const resultColumns = [
        { header: 'Macroscopía', key: 'macro', width: 60 },
        { header: 'Microscopía', key: 'micro', width: 60 },
        { header: 'Diagnóstico', key: 'diagnosis', width: 60 },
        { header: 'CIE-10 Código', key: 'cie10_code', width: 18 },
        { header: 'CIE-10 Nombre', key: 'cie10_name', width: 30 },
        { header: 'CIE-O Código', key: 'cieo_code', width: 18 },
        { header: 'CIE-O Nombre', key: 'cieo_name', width: 30 },
    ];

    worksheet.columns = [...generalColumns, ...patientColumns, ...sampleColumns, ...resultColumns];
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE9F5DB' } };

    cases.forEach(c => {
        const createdTimestamp = getDateFromDateInfo(c.date_info, 'created_at');
        const diffDays = getElapsedDays(c);
        const wasTimely = getWasTimely(c);
        const maxOpp = getMaxOpportunityTime(c);
        const opportunityText = wasTimely === true ? 'Sí' : (wasTimely === false ? 'No' : '');
        const signedTimestamp = getDateFromDateInfo(c.date_info, 'signed_at');
        const deliveredTimestamp = getDateFromDateInfo(c.date_info, 'delivered_at');

        const rowData: Record<string, unknown> = {
            case_code: c.case_code,
            status: c.status,
            priority: c.priority,
            created_at: createdTimestamp ? new Date(createdTimestamp).toLocaleString() : '',
            days: diffDays,
            max_opportunity: maxOpp ?? '',
            opportunity: opportunityText,
            doctor: c.doctor,
            service: c.service,
            entity: c.entity?.name || '',
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
            p_email: c.patient?.email || '',
        };

        (c.samples ?? []).forEach((sample, idx) => {
            const i = idx + 1;
            const regionLabel = BODY_REGION_OPTIONS.find(o => o.value === sample.body_region)?.label || sample.body_region || '';
            rowData[`s${i}_region`] = regionLabel;
            (sample.tests ?? []).forEach((t, tIdx) => {
                const j = tIdx + 1;
                const code = t.test_code || t.name || '';
                if (!code) return;
                rowData[`s${i}_test${j}`] = code;
                rowData[`s${i}_qty${j}`] = t.quantity || 1;
            });
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
