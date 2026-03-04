export interface TestAgreement {
    entity_id: string;
    entity_name: string;
    price: number;
}

export interface TestFormModel {
    testCode: string;
    testName: string;
    testDescription: string;
    timeDays: number;
    price: number;
    isActive: boolean;
    agreements: TestAgreement[];
}

export interface LabTest {
    id: string;
    test_code: string;
    name: string;
    description: string;
    time: number;
    price: number;
    is_active: boolean;
    agreements?: TestAgreement[];
    created_at: string;
    updated_at?: string;
}

export interface CreateTestRequest {
    test_code: string;
    name: string;
    description: string;
    time: number;
    price: number;
    is_active: boolean;
    agreements?: TestAgreement[];
}

export interface UpdateTestRequest {
    test_code?: string;
    name?: string;
    description?: string;
    time?: number;
    price?: number;
    is_active?: boolean;
    agreements?: TestAgreement[];
}
