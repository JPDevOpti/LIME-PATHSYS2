export interface EntityDetail {
    name: string;
    type: string;
    codigo: string;
    casesCount: number;
}

export interface TestDetail {
    name: string;
    category: string;
    codigo: string;
    count: number;
}

const MOCK_ENTITIES: Record<string, EntityDetail[]> = {
    'Dr. Maria Lopez': [
        { name: 'Hospital Pablo Tobón Uribe', type: 'Hospital', codigo: 'HPTU-001', casesCount: 35 },
        { name: 'Universidad de Antioquia', type: 'Universidad', codigo: 'UDEA-001', casesCount: 25 },
    ],
    'Dr. Jorge Ramirez': [
        { name: 'Hospital Pablo Tobón Uribe', type: 'Hospital', codigo: 'HPTU-001', casesCount: 28 },
        { name: 'Clínica Las Américas', type: 'Clínica', codigo: 'CLA-002', casesCount: 14 },
    ],
    'Dr. Ana Martinez': [
        { name: 'Universidad de Antioquia', type: 'Universidad', codigo: 'UDEA-001', casesCount: 22 },
        { name: 'Hospital Pablo Tobón Uribe', type: 'Hospital', codigo: 'HPTU-001', casesCount: 11 },
    ],
    'Dr. Carlos Mendoza': [
        { name: 'Hospital Pablo Tobón Uribe', type: 'Hospital', codigo: 'HPTU-001', casesCount: 18 },
    ],
    'Dra. Sofia Herrera': [
        { name: 'Hospital Pablo Tobón Uribe', type: 'Hospital', codigo: 'HPTU-001', casesCount: 30 },
        { name: 'Universidad de Antioquia', type: 'Universidad', codigo: 'UDEA-001', casesCount: 18 },
    ],
    'Dr. Luis Fernandez': [
        { name: 'Clínica Las Américas', type: 'Clínica', codigo: 'CLA-002', casesCount: 25 },
        { name: 'Hospital Pablo Tobón Uribe', type: 'Hospital', codigo: 'HPTU-001', casesCount: 14 },
    ],
    'Dra. Patricia Gomez': [
        { name: 'Universidad de Antioquia', type: 'Universidad', codigo: 'UDEA-001', casesCount: 20 },
    ],
    'Dr. Ricardo Torres': [
        { name: 'Hospital Pablo Tobón Uribe', type: 'Hospital', codigo: 'HPTU-001', casesCount: 15 },
        { name: 'Clínica Las Américas', type: 'Clínica', codigo: 'CLA-002', casesCount: 11 },
    ],
};

const MOCK_TESTS: Record<string, TestDetail[]> = {
    'Dr. Maria Lopez': [
        { name: 'Biopsia de piel', category: 'Dermatopatología', codigo: 'BP-001', count: 28 },
        { name: 'Citología', category: 'Citología', codigo: 'CIT-002', count: 18 },
        { name: 'Inmunohistoquímica', category: 'Especial', codigo: 'IHQ-003', count: 6 },
    ],
    'Dr. Jorge Ramirez': [
        { name: 'Biopsia de piel', category: 'Dermatopatología', codigo: 'BP-001', count: 22 },
        { name: 'Citología', category: 'Citología', codigo: 'CIT-002', count: 14 },
        { name: 'Punch biopsy', category: 'Dermatopatología', codigo: 'PB-004', count: 6 },
    ],
    'Dr. Ana Martinez': [
        { name: 'Biopsia de piel', category: 'Dermatopatología', codigo: 'BP-001', count: 18 },
        { name: 'Inmunohistoquímica', category: 'Especial', codigo: 'IHQ-003', count: 8 },
        { name: 'Citología', category: 'Citología', codigo: 'CIT-002', count: 7 },
    ],
    'Dr. Carlos Mendoza': [
        { name: 'Biopsia de piel', category: 'Dermatopatología', codigo: 'BP-001', count: 15 },
        { name: 'Citología', category: 'Citología', codigo: 'CIT-002', count: 10 },
    ],
    'Dra. Sofia Herrera': [
        { name: 'Biopsia de piel', category: 'Dermatopatología', codigo: 'BP-001', count: 25 },
        { name: 'Citología', category: 'Citología', codigo: 'CIT-002', count: 12 },
        { name: 'Punch biopsy', category: 'Dermatopatología', codigo: 'PB-004', count: 5 },
    ],
    'Dr. Luis Fernandez': [
        { name: 'Biopsia de piel', category: 'Dermatopatología', codigo: 'BP-001', count: 20 },
        { name: 'Citología', category: 'Citología', codigo: 'CIT-002', count: 14 },
        { name: 'Inmunohistoquímica', category: 'Especial', codigo: 'IHQ-003', count: 5 },
    ],
    'Dra. Patricia Gomez': [
        { name: 'Biopsia de piel', category: 'Dermatopatología', codigo: 'BP-001', count: 18 },
        { name: 'Citología', category: 'Citología', codigo: 'CIT-002', count: 10 },
    ],
    'Dr. Ricardo Torres': [
        { name: 'Biopsia de piel', category: 'Dermatopatología', codigo: 'BP-001', count: 12 },
        { name: 'Citología', category: 'Citología', codigo: 'CIT-002', count: 8 },
        { name: 'Punch biopsy', category: 'Dermatopatología', codigo: 'PB-004', count: 6 },
    ],
};

export async function getPathologistEntities(
    pathologistName: string,
    _month: number,
    _year: number
): Promise<{ entidades: EntityDetail[] }> {
    await new Promise((r) => setTimeout(r, 400));
    const entidades = MOCK_ENTITIES[pathologistName] ?? [];
    return { entidades };
}

export async function getPathologistTests(
    pathologistName: string,
    _month: number,
    _year: number
): Promise<{ pruebas: TestDetail[] }> {
    await new Promise((r) => setTimeout(r, 500));
    const pruebas = MOCK_TESTS[pathologistName] ?? [];
    return { pruebas };
}
