export type Role =
  | 'administrator'
  | 'pathologist'
  | 'resident'
  | 'recepcionista'
  | 'visitante'
  | 'paciente';

export interface User {
  id: string;
  email: string;
  name?: string;
  role: Role;
  is_active: boolean;
  administrator_code?: string;
  pathologist_code?: string;
  resident_code?: string;
  associated_entities?: Array<{ id: string; name: string }>;
  medical_license?: string;
  initials?: string;
  signature?: string;
  observations?: string;
  patient_id?: string;
  document?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  remember_me?: boolean;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}
