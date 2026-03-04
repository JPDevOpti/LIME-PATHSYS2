export type UserRole = 'admin' | 'patologo' | 'residente' | 'auxiliar' | 'visitante';

export type DocumentType = 'CC' | 'CE' | 'PP';

export interface RoleSpecificData {
    iniciales?: string;
    registroMedico?: string;
    firmaUrl?: string;
    observaciones?: string;
    patologoCode?: string;
    pathologistCode?: string;
    residentCode?: string;
    administratorCode?: string;
    visitanteCode?: string;
    associatedEntities?: Array<{ id: string; name: string; codigo?: string; nombre?: string }>;
}

export interface UserProfile {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    document: string;
    documentType: DocumentType;
    role: UserRole;
    avatar?: string;
    isActive: boolean;
    lastLogin?: Date;
    createdAt: Date;
    updatedAt: Date;
    roleSpecificData?: RoleSpecificData;
}

export interface ValidationError {
    field: string;
    message: string;
}

export type ProfileEditPayload =
    | {
          role: 'patologo';
          patologoName: string;
          InicialesPatologo?: string;
          PatologoEmail: string;
          registro_medico: string;
          password?: string;
          passwordConfirm?: string;
          observaciones?: string;
      }
    | {
          role: 'residente';
          residenteName: string;
          InicialesResidente?: string;
          ResidenteEmail: string;
          registro_medico: string;
          password?: string;
          passwordConfirm?: string;
          observaciones?: string;
      }
    | {
          role: 'auxiliar';
          auxiliarName: string;
          auxiliarCode: string;
          AuxiliarEmail: string;
          password?: string;
          passwordConfirm?: string;
          observaciones?: string;
      }
    | {
          role: 'visitante';
          visitanteName: string;
          visitanteCode: string;
          VisitanteEmail: string;
          password?: string;
          passwordConfirm?: string;
          observaciones?: string;
      }
    | {
          role: 'admin';
          firstName: string;
          lastName: string;
          email: string;
      };
