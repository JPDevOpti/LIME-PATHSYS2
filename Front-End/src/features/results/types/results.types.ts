import { SampleInfo } from '@/features/cases/types/case.types';

export type ResultEditorSection = 'method' | 'macro' | 'micro' | 'diagnosis' | 'images' | 'cie';

export interface ResultSections {
    method: string[];
    macro: string;
    micro: string;
    cie10?: CIE10Diagnosis | null;
    cieo?: CIEODiagnosis | null;
    diagnosis: string;
    /** URLs base64 de imágenes asociadas al diagnóstico (solo visualización) */
    diagnosisImages?: string[];
}

export interface CIEODiagnosis {
    code: string;
    name: string;
}

export interface UpdateResultRequest {
    method?: string[];
    macro_result?: string;
    micro_result?: string;
    diagnosis?: string;
    cie10_diagnosis?: CIE10Diagnosis | null;
    cieo_diagnosis?: CIEODiagnosis | null;
    complementary_tests?: ComplementaryTest[];
    complementary_tests_reason?: string;
    samples?: SampleInfo[];
}

export interface CIE10Diagnosis {
    code: string;
    name: string;
}

export interface ComplementaryTest {
    code: string;
    name: string;
    quantity: number;
}

export type AdditionalTest = ComplementaryTest;

export interface SignFormData extends ResultSections {
    cie10: CIE10Diagnosis | null;
    needsComplementaryTests: boolean;
    complementaryTests: ComplementaryTest[];
    complementaryTestsReason: string;
}
