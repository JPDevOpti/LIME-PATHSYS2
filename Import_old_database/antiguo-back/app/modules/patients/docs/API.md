# API del Módulo Pacientes

Base de ruta: `/api/v1/patients`

Autenticación: (si aplica en el proyecto) usar encabezados/estrategia definida globalmente.

## Esquemas relevantes
- Request/Response: se basan en `PatientCreate`, `PatientUpdate`, `PatientResponse`.
- Enums:
  - `IdentificationType` (int): 1..12
  - `Gender` (str): `Masculino` | `Femenino`
  - `CareType` (str): `Ambulatorio` | `Hospitalizado`

## Endpoints

### Crear paciente
- Método: POST
- URL: `/`
- Body (JSON): PatientCreate
- Respuesta: 201 + PatientResponse
- Errores: 400, 409, 500

Ejemplo:
```json
{
  "patient_code": "CC-ABC12345",
  "identification_type": 1,
  "identification_number": "ABC12345",
  "first_name": "Paciente",
  "second_name": "De",
  "first_lastname": "Prueba",
  "second_lastname": "Unodos",
  "birth_date": "2000-01-01",
  "gender": "Femenino",
  "location": {
    "municipality_code": "05001",
    "municipality_name": "Medellín",
    "subregion": "Valle De Aburrá",
    "address": "Calle 123 #12-12 Apto 123"
  },
  "entity_info": {"id": "HAMA", "name": "Hospital Alma Máter de Antioquia"},
  "care_type": "Hospitalizado",
  "observations": "Notas"
}
```

### Listar pacientes
- Método: GET
- URL: `/`
- Query params: `skip` (int≥0), `limit` (int 1..1000), `search`, `entity`, `gender`, `care_type`
- Respuesta: 200 + `PatientResponse[]`
- Errores: 500

Ejemplo: `/api/v1/patients/?skip=0&limit=50`

### Búsqueda avanzada
- Método: GET
- URL: `/search/advanced`
- Query params: `identification_type`, `identification_number`, `first_name`, `first_lastname`, `birth_date_from`, `birth_date_to`, `municipality_code`, `municipality_name`, `subregion`, `age_min`, `age_max`, `entity`, `gender`, `care_type`, `date_from`, `date_to`, `skip`, `limit`
- Respuesta: 200 + `{ patients: PatientResponse[], total: number }`
- Errores: 400, 500

### Total de pacientes
- Método: GET
- URL: `/count`
- Respuesta: 200 + `{ total: number }`
- Errores: 500

### Obtener paciente por código
- Método: GET
- URL: `/{patient_code}`
- Path params: `patient_code` (string) p.ej. `CC-ABC12345`
- Respuesta: 200 + PatientResponse
- Errores: 404, 500

### Actualizar paciente
- Método: PUT
- URL: `/{patient_code}`
- Body (JSON): PatientUpdate (campos opcionales)
- Respuesta: 200 + PatientResponse
- Errores: 400, 404, 500

### Cambiar identificación
- Método: PUT
- URL: `/{patient_code}/change-identification`
- Query params:
  - `new_identification_type`: `IdentificationType` (enum int)
  - `new_identification_number`: string
- Respuesta: 200 + PatientResponse
- Errores: 400, 404, 409, 500

Ejemplo: `/api/v1/patients/CC-ABC12345/change-identification?new_identification_type=2&new_identification_number=A1234567`

### Eliminar paciente
- Método: DELETE
- URL: `/{patient_code}`
- Respuesta: 200 + `{ message: string }` cuando elimina OK
- Errores: 400, 404, 500

## Notas de implementación
- El servicio valida que `new_identification_number` no esté vacío y que el nuevo `patient_code` sea distinto del actual.
- Los enums se devuelven por sus valores (`use_enum_values = True`) en los esquemas.
- `identification_number` permite caracteres alfanuméricos (normalizado en mayúsculas).
- `patient_code` se forma como `CODIGO_DOCUMENTO` + `-` + `identification_number` (ej.: `CC-ABC12345`, `NN-123456`).

## Versionado
- Versión de API: v1
- Cambios recientes: simplificación de logs y herencia de `PatientResponse` desde `PatientBase` para reducir líneas sin romper compatibilidad.