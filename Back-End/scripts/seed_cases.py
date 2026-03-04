"""
seed_cases.py — Siembra casos clínicos realistas de dermatopatología en la BD.

Uso:
    python seed_cases.py                     # Inserta 200 casos
    python seed_cases.py --count 500         # Inserta 500 casos
    python seed_cases.py --dry-run           # Solo muestra, no inserta
    python seed_cases.py --clear             # Elimina casos existentes antes de insertar
    python seed_cases.py --clear --dry-run   # Muestra qué eliminaría y qué insertaría
"""

import sys
import os
import argparse
import random
import math
from datetime import datetime, timedelta

# ---------------------------------------------------------------------------
# Path setup
# ---------------------------------------------------------------------------
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

if os.getenv("MONGODB_URL") and not os.getenv("MONGODB_URI"):
    os.environ["MONGODB_URI"] = os.environ["MONGODB_URL"]

from app.database import get_db
from app.core.business_days import calculate_opportunity_days

# ---------------------------------------------------------------------------
# Datos clínicos realistas — Dermatopatología
# ---------------------------------------------------------------------------

REQUESTING_PHYSICIANS = [
    "Dr. Andrés Felipe Moreno Vargas",
    "Dra. Claudia Patricia Restrepo Jiménez",
    "Dr. Gustavo Adolfo Peña Suárez",
    "Dra. Marcela Hernández Ospina",
    "Dr. Juan Carlos Velásquez Ríos",
    "Dra. Sandra Milena Cardona Gómez",
    "Dr. Hernán Darío Castillo Arango",
    "Dra. Natalia Andrea Zuluaga Montoya",
    "Dr. Ricardo Alberto Salazar Bermúdez",
    "Dra. Gloria Eugenia Patiño Castaño",
    "Dr. Camilo Ernesto Londoño Giraldo",
    "Dra. Alejandra María Agudelo Serna",
    "Dr. Fabio Antonio Cárdenas Mejía",
    "Dra. Esperanza del Carmen Rojas Nieto",
    "Dr. Luis Enrique Ramírez Quintero",
    "Dra. Diana Carolina Muñoz Betancur",
    "Dr. Jorge Iván Ríos Ocampo",
    "Dra. Paula Andrea Botero Holguín",
    "Dr. Óscar Mauricio Torres Leal",
    "Dra. Adriana Sofía Caballero Vásquez",
]

SERVICES = [
    "Dermatología",
    "Cirugía Plástica y Estética",
    "Cirugía General",
    "Oncología",
    "Medicina Interna",
    "Cirugía Dermatológica",
    "Consulta Externa",
    "Urgencias",
    "Oncología Cutánea",
]

BODY_REGIONS = [
    "Dorso",
    "Cara",
    "Cuello",
    "Abdomen",
    "Tórax anterior",
    "Tórax posterior",
    "Brazo derecho",
    "Brazo izquierdo",
    "Antebrazo derecho",
    "Antebrazo izquierdo",
    "Muslo derecho",
    "Muslo izquierdo",
    "Pierna derecha",
    "Pierna izquierda",
    "Cuero cabelludo",
    "Región inguinal derecha",
    "Región inguinal izquierda",
    "Región perianal",
    "Nariz",
    "Mejilla derecha",
    "Mejilla izquierda",
    "Labio superior",
    "Región supraclavicular",
    "Axila derecha",
    "Axila izquierda",
    "Planta del pie derecho",
    "Planta del pie izquierdo",
    "Región lumbar",
    "Flanco derecho",
    "Flanco izquierdo",
]

# Cada diagnóstico tiene: nombre, texto macro, texto micro, CIE-10, CIEO
DIAGNOSES = [
    {
        "name": "Nevus melanocítico compuesto",
        "macro": (
            "<p>Fragmento de piel elíptica que mide <strong>0,8 × 0,5 × 0,3 cm</strong>. "
            "La superficie muestra una lesión pigmentada de coloración parda homogénea, bordes bien definidos. "
            "Al corte superficie de sección homogénea de coloración parda. Se incluye en su totalidad en un cassette.</p>"
        ),
        "micro": (
            "<p>Cortes histológicos de piel que muestran epidermis con acantosis leve. "
            "En dermis papilar y reticular se observan nidos y tecas de melanocitos névicos sin atipia significativa, "
            "con maduración progresiva hacia la profundidad. No se identifican figuras de mitosis. "
            "No se observa inflamación asociada relevante.</p>"
        ),
        "diagnosis": (
            "<p><strong>NEVUS MELANOCÍTICO COMPUESTO</strong></p>"
            "<p>Márgenes quirúrgicos libres de lesión.</p>"
        ),
        "cie10": {"code": "D22.9", "name": "Nevus melanocítico, no especificado"},
        "cieo": {"code": "8760/0", "name": "Nevus melanocítico compuesto"},
        "methods": ["Hematoxilina-Eosina (H&E)"],
    },
    {
        "name": "Nevus melanocítico intradérmico",
        "macro": (
            "<p>Fragmento de piel oval que mide <strong>0,6 × 0,4 × 0,3 cm</strong>. "
            "Lesión pápulo-nodular de superficie lisa, pigmentada de color pardo claro, bordes netos. "
            "Se incluye en su totalidad en un cassette.</p>"
        ),
        "micro": (
            "<p>Cortes histológicos de piel que evidencian nidos de melanocitos névicos exclusivamente en dermis, "
            "con ausencia de actividad de unión. Los melanocitos presentan maduración progresiva hacia la profundidad "
            "y no muestran atipia citológica. Sin actividad mitótica. Epidermis sin alteraciones significativas.</p>"
        ),
        "diagnosis": (
            "<p><strong>NEVUS MELANOCÍTICO INTRADÉRMICO</strong></p>"
            "<p>Resección completa. Márgenes libres.</p>"
        ),
        "cie10": {"code": "D22.9", "name": "Nevus melanocítico, no especificado"},
        "cieo": {"code": "8750/0", "name": "Nevus melanocítico intradérmico"},
        "methods": ["Hematoxilina-Eosina (H&E)"],
    },
    {
        "name": "Carcinoma basocelular sólido",
        "macro": (
            "<p>Fragmento de piel elíptica que mide <strong>1,5 × 0,9 × 0,5 cm</strong>. "
            "En la superficie se identifica lesión pápulo-nodular de coloración rosada perlada, centro umbilicado, "
            "bordes enrollados. Al corte la lesión tiene una profundidad de 0,3 cm aproximadamente. "
            "Se incluye en su totalidad en dos cassettes seriados.</p>"
        ),
        "micro": (
            "<p>Cortes histológicos de piel que muestran nidos y cordones de células basaloides con disposición "
            "en empalizada periférica y retracción del estroma circundante. Las células presentan escaso citoplasma, "
            "núcleos ovoides hipercromáticos con pocas figuras de mitosis. Estroma fibromixoide. "
            "No se identifican focos de diferenciación escamosa ni glandular.</p>"
        ),
        "diagnosis": (
            "<p><strong>CARCINOMA BASOCELULAR SÓLIDO</strong></p>"
            "<p>Márgenes profundos y laterales libres de neoplasia.</p>"
        ),
        "cie10": {"code": "C44.9", "name": "Tumor maligno de la piel, no especificado"},
        "cieo": {"code": "8090/3", "name": "Carcinoma de células basales, NOS"},
        "methods": ["Hematoxilina-Eosina (H&E)"],
    },
    {
        "name": "Carcinoma basocelular superficial",
        "macro": (
            "<p>Fragmento de piel elíptica que mide <strong>1,2 × 0,7 × 0,2 cm</strong>. "
            "La superficie muestra lesión eritematosa con áreas de descamación fina, bordes mal definidos. "
            "Se incluye en su totalidad en un cassette.</p>"
        ),
        "micro": (
            "<p>Cortes de piel con focos de proliferación de células basaloides dispuestas en continuidad con la "
            "epidermis, con proyecciones hacia la dermis papilar superficial. Se observa retracción artefactual "
            "estromal periférica. Epidermis con áreas de adelgazamiento. Sin invasión de dermis reticular.</p>"
        ),
        "diagnosis": (
            "<p><strong>CARCINOMA BASOCELULAR SUPERFICIAL (MULTICÉNTRICO)</strong></p>"
            "<p>Márgenes laterales y profundos evaluados, sin evidencia de tumor en los mismos.</p>"
        ),
        "cie10": {"code": "C44.9", "name": "Tumor maligno de la piel, no especificado"},
        "cieo": {"code": "8091/3", "name": "Carcinoma basocelular multifocal superficial"},
        "methods": ["Hematoxilina-Eosina (H&E)"],
    },
    {
        "name": "Carcinoma basocelular infiltrante",
        "macro": (
            "<p>Fragmento de piel elíptica que mide <strong>2,1 × 1,2 × 0,8 cm</strong>. "
            "Se observa cicatriz de biopsia previa. La superficie muestra área indurada de aspecto nacarado. "
            "Se incluye en su totalidad en tres cassettes seriados.</p>"
        ),
        "micro": (
            "<p>Cortes histológicos que muestran nidos irregulares, cordones y trabéculas de células basaloides "
            "que infiltran la dermis reticular y el tejido celular subcutáneo. Las células presentan "
            "núcleos hipercromáticos angulados con escaso citoplasma. Estroma desmoplásico prominente. "
            "Invasión perineural focal identificada. Figuras de mitosis ocasionales.</p>"
        ),
        "diagnosis": (
            "<p><strong>CARCINOMA BASOCELULAR INFILTRANTE</strong></p>"
            "<p><em>Nota:</em> Se documenta invasión perineural. Márgenes profundos comprometidos. "
            "Se recomienda correlación con imágenes y valoración por el equipo quirúrgico.</p>"
        ),
        "cie10": {"code": "C44.9", "name": "Tumor maligno de la piel, no especificado"},
        "cieo": {"code": "8092/3", "name": "Carcinoma basocelular infiltrante"},
        "methods": ["Hematoxilina-Eosina (H&E)", "Inmunohistoquímica (IHQ)"],
    },
    {
        "name": "Carcinoma espinocelular bien diferenciado",
        "macro": (
            "<p>Fragmento de piel elíptica que mide <strong>1,8 × 1,0 × 0,6 cm</strong>. "
            "Lesión exofítica verrucosa, superficie queratósica, consistencia firme. "
            "Al corte, tumor de aspecto blanquecino-amarillento con extensión hacia la dermis. "
            "Se incluye en su totalidad en dos cassettes seriados.</p>"
        ),
        "micro": (
            "<p>Proliferación de células epidermoides atípicas que invaden la dermis en lóbulos irregulares "
            "con abundante producción de queratina (perlas córneas). Las células presentan núcleos pleomórficos, "
            "nucléolos prominentes y abundante citoplasma eosinófilo. Moderada actividad mitótica. "
            "Infiltrado inflamatorio crónico peritumoral.</p>"
        ),
        "diagnosis": (
            "<p><strong>CARCINOMA ESCAMOCELULAR BIEN DIFERENCIADO</strong></p>"
            "<p>Invasión limitada a dermis reticular. Márgenes laterales y profundos libres de neoplasia.</p>"
        ),
        "cie10": {"code": "C44.9", "name": "Tumor maligno de la piel, no especificado"},
        "cieo": {"code": "8070/3", "name": "Carcinoma de células escamosas, NOS"},
        "methods": ["Hematoxilina-Eosina (H&E)"],
    },
    {
        "name": "Enfermedad de Bowen (carcinoma espinocelular in situ)",
        "macro": (
            "<p>Fragmento de piel elíptica que mide <strong>1,0 × 0,6 × 0,2 cm</strong>. "
            "Lesión eritemato-descamativa de bordes bien definidos. "
            "Se incluye en su totalidad en un cassette.</p>"
        ),
        "micro": (
            "<p>Cortes de piel con epidermis que muestra disrupción completa de la maduración queratinocítica "
            "en todo su espesor: células con núcleos pleomórficos hipercromáticos, figuras de mitosis atípicas "
            "incluyendo niveles suprabasales, y células disqueratósicas. La membrana basal se encuentra íntegra. "
            "No se identifica invasión de la dermis.</p>"
        ),
        "diagnosis": (
            "<p><strong>ENFERMEDAD DE BOWEN — CARCINOMA ESCAMOCELULAR IN SITU</strong></p>"
            "<p>Márgenes laterales libres. Se recomienda seguimiento clínico estrecho.</p>"
        ),
        "cie10": {"code": "D04.9", "name": "Carcinoma in situ de la piel, no especificado"},
        "cieo": {"code": "8081/2", "name": "Enfermedad de Bowen"},
        "methods": ["Hematoxilina-Eosina (H&E)"],
    },
    {
        "name": "Queratosis actínica",
        "macro": (
            "<p>Fragmento de piel irregular que mide <strong>0,7 × 0,5 × 0,2 cm</strong>. "
            "Lesión eritematosa con descamación adherente y textura áspera. "
            "Se incluye en su totalidad en un cassette.</p>"
        ),
        "micro": (
            "<p>Piel con epidermis que muestra paraqueratosis alternante, atipía queratinocítica basal con "
            "núcleos pleomórficos hipercromáticos, pérdida de la polaridad basal y células disqueratósicas. "
            "Las alteraciones respetan los ostia foliculares (patrón en bandera). Dermis superior con elastosis "
            "solar y discreto infiltrado inflamatorio crónico.</p>"
        ),
        "diagnosis": (
            "<p><strong>QUERATOSIS ACTÍNICA (GRADO II)</strong></p>"
            "<p>Sin evidencia de transformación invasora en el material estudiado.</p>"
        ),
        "cie10": {"code": "L57.0", "name": "Queratosis actínica"},
        "cieo": {"code": "8070/2", "name": "Carcinoma escamocelular in situ NOS"},
        "methods": ["Hematoxilina-Eosina (H&E)"],
    },
    {
        "name": "Queratosis seborreica",
        "macro": (
            "<p>Fragmento de piel oval que mide <strong>1,1 × 0,8 × 0,4 cm</strong>. "
            "Lesión pápulo-nodular de superficie verrucosa, color pardo oscuro a negro, bordes bien definidos. "
            "Consistencia firme. Se incluye en su totalidad en un cassette.</p>"
        ),
        "micro": (
            "<p>Cortes histológicos de piel con proliferación exofítica de queratinocitos basaloides bien "
            "diferenciados formando un patrón acantótico. Se identifican quistes de inclusión córnea (pseudoquistes) "
            "múltiples. Sin atipia citológica significativa. Sin actividad mitótica. "
            "Dermis subyacente sin alteraciones relevantes.</p>"
        ),
        "diagnosis": (
            "<p><strong>QUERATOSIS SEBORREICA (PATRÓN ACANTÓTICO)</strong></p>"
        ),
        "cie10": {"code": "L82", "name": "Queratosis seborreica"},
        "cieo": {"code": "8052/0", "name": "Queratosis seborreica NOS"},
        "methods": ["Hematoxilina-Eosina (H&E)"],
    },
    {
        "name": "Dermatofibroma",
        "macro": (
            "<p>Fragmento de piel elíptica que mide <strong>1,3 × 0,8 × 0,5 cm</strong>. "
            "Lesión nódulo-dérmica de consistencia firme, superficie cutánea con hiperpigmentación central leve. "
            "Al corte, nódulo mal delimitado de coloración blanquecino-amarillenta. "
            "Se incluye en su totalidad en un cassette.</p>"
        ),
        "micro": (
            "<p>Proliferación dérmica de células fusiformes dispuestas en fascículos entrecruzados con patrón "
            "estoriforme, sin atipia significativa. Las células presentan núcleos ovales de cromatina fina. "
            "Se identifica atrapamiento de fibras de colágeno periféricas (signo del cuello de botella). "
            "Epidermis suprayacente con acantosis e hiperpigmentación basal. Sin mitosis atípicas.</p>"
        ),
        "diagnosis": (
            "<p><strong>DERMATOFIBROMA (HISTIOCITOMA FIBROSO BENIGNO)</strong></p>"
        ),
        "cie10": {"code": "M8832/0", "name": "Histiocitoma fibroso benigno"},
        "cieo": {"code": "8832/0", "name": "Dermatofibroma NOS"},
        "methods": ["Hematoxilina-Eosina (H&E)"],
    },
    {
        "name": "Lipoma",
        "macro": (
            "<p>Fragmento nodular de tejido adiposo que mide <strong>3,5 × 2,8 × 1,5 cm</strong>, peso aproximado "
            "18 g. Superficie lobulada, consistencia blanda, coloración amarilla. Al corte, tejido adiposo maduro "
            "sin áreas de necrosis ni hemorragia. Se toman secciones representativas para estudio en dos cassettes.</p>"
        ),
        "micro": (
            "<p>Proliferación de adipocitos maduros de tamaño uniforme, dispuestos en lóbulos separados por "
            "tabiques fibrovasculares delicados. Los núcleos son pequeños, excéntricos y sin atipia. "
            "No se identifican lipoblastos ni células atípicas. Sin actividad mitótica. "
            "Cápsula fibrosa delgada presente.</p>"
        ),
        "diagnosis": (
            "<p><strong>LIPOMA</strong></p>"
            "<p>Lesión completamente excindida.</p>"
        ),
        "cie10": {"code": "D17.9", "name": "Tumor benigno lipomatoso, no especificado"},
        "cieo": {"code": "8850/0", "name": "Lipoma NOS"},
        "methods": ["Hematoxilina-Eosina (H&E)"],
    },
    {
        "name": "Quiste epidérmico de inclusión",
        "macro": (
            "<p>Lesión quística de paredes blancas-amarillentas que mide <strong>1,8 × 1,5 × 1,2 cm</strong>. "
            "Al corte, cavidad llena de material queratinoso laminado blanquecino con olor característico. "
            "Pared de 0,1 cm de espesor. Se incluye en su totalidad en un cassette.</p>"
        ),
        "micro": (
            "<p>Quiste revestido por epitelio escamoso estratificado queratinizante, con granular bien formada. "
            "La cavidad contiene queratina laminada. La pared no muestra atipia. No se identifican estructuras "
            "anexiales en la pared. Discreto infiltrado inflamatorio crónico peripared.</p>"
        ),
        "diagnosis": (
            "<p><strong>QUISTE EPIDÉRMICO DE INCLUSIÓN (QUISTE INFUNDIBULAR)</strong></p>"
            "<p>Resección completa.</p>"
        ),
        "cie10": {"code": "L72.0", "name": "Quiste epidérmico"},
        "cieo": {"code": "9390/0", "name": "Quiste epidérmico"},
        "methods": ["Hematoxilina-Eosina (H&E)"],
    },
    {
        "name": "Melanoma in situ",
        "macro": (
            "<p>Fragmento de piel elíptica que mide <strong>1,4 × 0,9 × 0,3 cm</strong>. "
            "Lesión maculosa de pigmentación heterogénea (parda, negra, rosada), bordes irregulares. "
            "Se incluye en su totalidad en dos cassettes seriados.</p>"
        ),
        "micro": (
            "<p>Melanocitos atípicos con núcleos pleomórficos, nucléolos prominentes y citoplasma con pigmento melánico "
            "distribuidos de forma pagetoide en todos los estratos de la epidermis. Aumento en el número de melanocitos "
            "en la capa basal con tendencia a la confluencia. Patrón lentiginoso prominente. La membrana basal se "
            "encuentra íntegra sin invasión dérmica. Inflamación crónica en banda en dermis papilar.</p>"
        ),
        "diagnosis": (
            "<p><strong>MELANOMA IN SITU (NIVEL I DE CLARK)</strong></p>"
            "<p><em>Importante:</em> Márgenes laterales con tumor a <strong>menos de 1 mm</strong> del borde de resección. "
            "Se recomienda ampliación de márgenes con margen libre mínimo de 5 mm.</p>"
        ),
        "cie10": {"code": "D03.9", "name": "Melanoma in situ, no especificado"},
        "cieo": {"code": "8720/2", "name": "Melanoma in situ"},
        "methods": ["Hematoxilina-Eosina (H&E)", "Inmunohistoquímica (IHQ)"],
    },
    {
        "name": "Melanoma maligno (nivel III de Clark)",
        "macro": (
            "<p>Fragmento de piel elíptica que mide <strong>2,5 × 1,6 × 0,9 cm</strong>. "
            "Lesión nodular pigmentada de coloración heterogénea, superficie ulcerada en área de 0,4 cm. "
            "Al corte, tumor que infiltra hasta la dermis reticular. "
            "Se incluye en su totalidad en cuatro cassettes seriados.</p>"
        ),
        "micro": (
            "<p>Proliferación de melanocitos malignos con crecimiento pagetoide epidérmico prominente y componente "
            "dérmico invasor que alcanza la dermis reticular (Nivel III de Clark, Breslow 0,9 mm). "
            "Las células tumorales presentan marcado pleomorfismo nuclear, nucléolos eosinófilos prominentes y "
            "abundante pigmento melánico. Elevado índice mitótico (4 mitosis/mm²). Ulceración focal. "
            "Regresión parcial identificada. Sin invasión linfovascular ni perineural.</p>"
        ),
        "diagnosis": (
            "<p><strong>MELANOMA MALIGNO</strong></p>"
            "<ul>"
            "<li>Nivel de Clark: III</li>"
            "<li>Índice de Breslow: 0,9 mm</li>"
            "<li>Ulceración: presente (focal)</li>"
            "<li>Mitosis: 4/mm²</li>"
            "<li>Regresión: presente</li>"
            "<li>Márgenes: libres (margen profundo 1,2 mm)</li>"
            "</ul>"
            "<p>Estadio pT1b. Se recomienda evaluación del ganglio centinela y presentación en comité de tumores.</p>"
        ),
        "cie10": {"code": "C43.9", "name": "Melanoma maligno de la piel, no especificado"},
        "cieo": {"code": "8720/3", "name": "Melanoma maligno NOS"},
        "methods": ["Hematoxilina-Eosina (H&E)", "Inmunohistoquímica (IHQ)"],
    },
    {
        "name": "Dermatitis espongiótica",
        "macro": (
            "<p>Fragmento de piel de <strong>0,5 × 0,4 × 0,3 cm</strong>. "
            "Lesión eritematosa con vesiculación superficial y costras serosas. "
            "Se incluye en su totalidad en un cassette.</p>"
        ),
        "micro": (
            "<p>Cortes de piel con espongiosis epidérmica moderada-severa con formación de vesículas intraepidérmicas. "
            "Exocitosis de linfocitos y eosinófilos. Paraqueratosis focal. Dermis superficial con edema y denso "
            "infiltrado inflamatorio perivascular de linfocitos y eosinófilos. Hallazgos compatibles con "
            "dermatitis espongiótica de etiología alérgica de contacto.</p>"
        ),
        "diagnosis": (
            "<p><strong>DERMATITIS ESPONGIÓTICA SUBAGUDA</strong></p>"
            "<p>Patrón histológico compatible con dermatitis alérgica de contacto. "
            "Correlacionar con antecedentes de exposición.</p>"
        ),
        "cie10": {"code": "L23.9", "name": "Dermatitis alérgica de contacto, causa no especificada"},
        "cieo": None,
        "methods": ["Hematoxilina-Eosina (H&E)"],
    },
    {
        "name": "Psoriasis vulgar",
        "macro": (
            "<p>Punch de piel de <strong>0,4 cm</strong> de diámetro. "
            "Lesión eritematoescamosa con escamas blanquecinas plateadas. "
            "Se incluye en su totalidad en un cassette.</p>"
        ),
        "micro": (
            "<p>Epidermis con acantosis regular, elongación de las crestas interpapilares con adelgazamiento "
            "suprapapilar, paraqueratosis con ausencia de granulosa, y colecciones de neutrófilos intracórneas "
            "(microabscesos de Munro) e intraepidérmicas (pústulas de Kogoj). Papilas dérmicas elongadas con "
            "capilares tortuosos y edematosos. Infiltrado inflamatorio mixto en dermis superficial.</p>"
        ),
        "diagnosis": (
            "<p><strong>PSORIASIS VULGAR — PATRÓN PSORIASIFORME</strong></p>"
            "<p>Hallazgos histológicos clásicos de psoriasis. Correlacionar con cuadro clínico.</p>"
        ),
        "cie10": {"code": "L40.0", "name": "Psoriasis vulgar"},
        "cieo": None,
        "methods": ["Hematoxilina-Eosina (H&E)"],
    },
    {
        "name": "Fibroepitelioma de Pinkus",
        "macro": (
            "<p>Fragmento de piel nodular que mide <strong>1,0 × 0,7 × 0,5 cm</strong>. "
            "Lesión pédiculada de superficie lisa y coloración rosada. "
            "Se incluye en su totalidad en un cassette.</p>"
        ),
        "micro": (
            "<p>Proliferación de cordones anastomosantes de células basaloides que se extienden desde la epidermis "
            "hacia la dermis, inmersos en un estroma fibromixoide bien vascularizado. No se identifican atipias "
            "significativas ni mitosis. Patrón fenestrado característico.</p>"
        ),
        "diagnosis": (
            "<p><strong>FIBROEPITELIOMA DE PINKUS</strong></p>"
            "<p>Variante de carcinoma basocelular. Márgenes libres.</p>"
        ),
        "cie10": {"code": "C44.9", "name": "Tumor maligno de la piel, no especificado"},
        "cieo": {"code": "8093/3", "name": "Fibroepitelioma basocelular"},
        "methods": ["Hematoxilina-Eosina (H&E)"],
    },
    {
        "name": "Angiolipoma",
        "macro": (
            "<p>Fragmento nodular encapsulado que mide <strong>2,2 × 1,8 × 1,3 cm</strong>. "
            "Consistencia blanda, coloración amarillo-rosada. Al corte, tejido adiposo con áreas hemorrágicas puntiformes. "
            "Se incluye en su totalidad en dos cassettes.</p>"
        ),
        "micro": (
            "<p>Tejido adiposo maduro con proliferación vascular prominente de capilares pequeños con microtrombos "
            "fibrinosos intraluminales (hallazgo característico). Sin atipia citológica. Sin actividad mitótica. "
            "Cápsula fibrosa bien definida.</p>"
        ),
        "diagnosis": (
            "<p><strong>ANGIOLIPOMA</strong></p>"
            "<p>Lesión benigna. Resección completa.</p>"
        ),
        "cie10": {"code": "D17.9", "name": "Tumor benigno lipomatoso, no especificado"},
        "cieo": {"code": "8861/0", "name": "Angiolipoma NOS"},
        "methods": ["Hematoxilina-Eosina (H&E)"],
    },
    {
        "name": "Tricoepitelioma",
        "macro": (
            "<p>Fragmento de piel nodular que mide <strong>0,8 × 0,6 × 0,5 cm</strong>. "
            "Lesión pápulo-nodular color piel, superficie lisa. "
            "Se incluye en su totalidad en un cassette.</p>"
        ),
        "micro": (
            "<p>Proliferación dérmica de nidos de células basaloides con diferenciación hacia estructuras papilares "
            "del folículo piloso. Se identifican nidos germinativos y papilas foliculares rudimentarias. "
            "Estroma fibroso concéntrico. Sin atipia citológica ni mitosis. Epidermis suprayacente sin cambios.</p>"
        ),
        "diagnosis": (
            "<p><strong>TRICOEPITELIOMA</strong></p>"
            "<p>Tumor benigno de diferenciación folicular. Resección completa.</p>"
        ),
        "cie10": {"code": "D23.9", "name": "Tumor benigno de la piel, no especificado"},
        "cieo": {"code": "8100/0", "name": "Tricoepitelioma"},
        "methods": ["Hematoxilina-Eosina (H&E)"],
    },
    {
        "name": "Queratoacantoma",
        "macro": (
            "<p>Fragmento de piel elíptica que mide <strong>1,6 × 1,2 × 0,8 cm</strong>. "
            "Lesión nodular cupuliforme con cráter central relleno de queratina. "
            "Al corte, arquitectura en copa. Se incluye en su totalidad en tres cassettes seriados.</p>"
        ),
        "micro": (
            "<p>Lesión de arquitectura simétrica en copa con invaginación epidérmica rellena de queratina ortohiperqueratósica. "
            "Las células escamosas son grandes con citoplasma eosinófilo vítreo (células en vidrio esmerilado). "
            "Moderada atipia citológica. Infiltrado inflamatorio mixto en el margen. "
            "Patrón de crecimiento expansivo con bordes netos.</p>"
        ),
        "diagnosis": (
            "<p><strong>QUERATOACANTOMA</strong></p>"
            "<p><em>Nota:</em> Lesión con potencial maligno incierto. Se recomienda correlación clínico-patológica y seguimiento. "
            "Márgenes libres.</p>"
        ),
        "cie10": {"code": "L85.8", "name": "Otras hiperqueratosis especificadas"},
        "cieo": {"code": "8071/1", "name": "Queratoacantoma"},
        "methods": ["Hematoxilina-Eosina (H&E)"],
    },
]

OBSERVATIONS_TEMPLATES = [
    "Procedimiento realizado bajo anestesia local. Sin complicaciones.",
    "Biopsia excisional con margen de 2 mm.",
    "Punch de 4 mm. Hemostasia por electrocoagulación.",
    "Resección amplia por antecedente de lesión previa.",
    "Material fijado en formol al 10%, adecuadamente etiquetado.",
    "Paciente con anticoagulación: se suspendió 5 días antes del procedimiento.",
    "Segunda biopsia. Primera realizada en otra institución.",
    None,
    None,
    None,
]

ADDITIONAL_NOTES_POOL = [
    "Correlacionar con cuadro clínico y hallazgos dermatoscópicos.",
    "Se recomienda seguimiento cada 3 meses por 1 año.",
    "Notificar al equipo tratante de forma prioritaria.",
    "Material insuficiente para estudio de márgenes completos.",
    "Se realizó estudio en niveles adicionales sin cambios.",
    "Pendiente correlación con pruebas de imagen.",
]

# ---------------------------------------------------------------------------
# Generación de casos
# ---------------------------------------------------------------------------

def get_next_case_code(db, year: int, offset: int = 0) -> str:
    """Obtiene el siguiente código de caso para el año dado."""
    counters_col = db["counters"]
    counter_doc = counters_col.find_one({"_id": f"case_code_{year}"})
    current_seq = counter_doc["seq"] if counter_doc else 0
    return f"{year}-{(current_seq + offset + 1):05d}"


def update_counter(db, year: int, count: int):
    """Incrementa el contador de case_code en count unidades."""
    counters_col = db["counters"]
    counters_col.update_one(
        {"_id": f"case_code_{year}"},
        {"$inc": {"seq": count}},
        upsert=True,
    )


def random_datetime_in_range(start: datetime, end: datetime) -> datetime:
    """Retorna un datetime aleatorio entre start y end."""
    delta = end - start
    random_seconds = random.randint(0, int(delta.total_seconds()))
    return start + timedelta(seconds=random_seconds)


def add_business_hours(dt: datetime, min_hours: float, max_hours: float) -> datetime:
    """Añade horas aleatorias (en rango) y asegura que caiga en día hábil."""
    hours = random.uniform(min_hours, max_hours)
    result = dt + timedelta(hours=hours)
    # Si cae en fin de semana, mover al lunes siguiente
    while result.weekday() >= 5:
        result += timedelta(days=1)
    return result


def build_patient_info_snapshot(patient: dict, fallback_entity: dict = None) -> dict:
    """Construye el snapshot de patient_info a partir del documento de paciente."""
    raw_entity = patient.get("entity_info") or {}
    entity_name = raw_entity.get("entity_name")
    eps_name = raw_entity.get("eps_name")

    if entity_name or eps_name:
        entity_info = {
            "entity_name": entity_name,
            "eps_name": eps_name,
        }
    elif fallback_entity:
        entity_info = {
            "entity_name": fallback_entity.get("name"),
            "eps_name": None,
        }
    else:
        entity_info = None

    location = None
    if any(patient.get(k) for k in ["country", "department", "municipality", "address"]):
        location = {
            "country": patient.get("country"),
            "department": patient.get("department"),
            "municipality": patient.get("municipality"),
            "subregion": patient.get("subregion"),
            "address": patient.get("address"),
        }

    return {
        "patient_id": patient["_id"],
        "patient_code": patient.get("patient_code", ""),
        "identification_type": patient.get("identification_type", "CC"),
        "identification_number": patient.get("identification_number", ""),
        "first_name": patient.get("first_name", ""),
        "second_name": patient.get("second_name"),
        "first_lastname": patient.get("first_lastname", ""),
        "second_lastname": patient.get("second_lastname"),
        "full_name": patient.get("full_name"),
        "age": patient.get("age"),
        "gender": patient.get("gender", "Masculino"),
        "phone": patient.get("phone"),
        "email": patient.get("email"),
        "care_type": patient.get("care_type", "Ambulatorio"),
        "entity_info": entity_info,
        "location": location,
        "observations": patient.get("observations"),
    }


def build_samples(tests: list, body_regions: list) -> list:
    """Construye 1-2 muestras con regiones corporales y pruebas asignadas."""
    num_samples = random.choices([1, 2], weights=[75, 25])[0]
    samples = []
    used_regions = random.sample(body_regions, min(num_samples, len(body_regions)))

    for region in used_regions:
        num_tests = random.choices([1, 2], weights=[80, 20])[0]
        chosen_tests = random.sample(tests, min(num_tests, len(tests)))
        sample_tests = []
        for t in chosen_tests:
            sample_tests.append({
                "id": t.get("test_code", str(t["_id"])),
                "name": t.get("name", ""),
                "quantity": 1,
            })
        samples.append({
            "body_region": region,
            "tests": sample_tests,
        })
    return samples


def pick_max_opportunity_time(tests: list, samples: list) -> float:
    """Calcula el tiempo máximo de oportunidad basado en los tests de las muestras."""
    test_map = {t.get("test_code", str(t["_id"])): t for t in tests}
    max_time = 5  # default días hábiles
    for sample in samples:
        for t_info in sample.get("tests", []):
            t = test_map.get(t_info["id"])
            if t and t.get("time"):
                max_time = max(max_time, t["time"])
    return float(max_time)


def build_case_document(
    case_code: str,
    patient: dict,
    pathologist: dict,
    tests: list,
    body_regions: list,
    diagnosis_data: dict,
    created_at: datetime,
    target_state: str,
    case_number: int,
    audit_user: dict,
    fallback_entity: dict = None,
) -> dict:
    """Construye el documento completo de un caso."""

    patient_info = build_patient_info_snapshot(patient, fallback_entity=fallback_entity)
    samples = build_samples(tests, body_regions)
    max_opp_time = pick_max_opportunity_time(tests, samples)

    requesting_physician = random.choice(REQUESTING_PHYSICIANS)
    service = random.choice(SERVICES)
    priority = random.choices(["Normal", "Prioritario"], weights=[85, 15])[0]

    observations = random.choice(OBSERVATIONS_TEMPLATES)

    # Audit entries y timestamps
    audit_info = []
    date_info = {
        "created_at": created_at,
        "update_at": created_at,
        "transcribed_at": None,
        "signed_at": None,
        "delivered_at": None,
    }

    audit_info.append({
        "action": "created",
        "user_name": audit_user["name"],
        "user_email": audit_user["email"],
        "timestamp": created_at.isoformat(),
    })

    # Estado inicial
    state = "En recepción"
    result = None
    opportunity_info = [{
        "opportunity_time": None,
        "max_opportunity_time": max_opp_time,
        "was_timely": None,
    }]

    # Construir progresión según target_state
    STATES_ORDER = ["En recepción", "Corte macro", "Descrip micro", "Por firmar", "Por entregar", "Completado"]
    target_idx = STATES_ORDER.index(target_state)

    if target_idx >= 1:
        # Tiene macro
        transcribed_at = add_business_hours(created_at, 4, 48)
        date_info["update_at"] = transcribed_at
        date_info["transcribed_at"] = transcribed_at
        state = "Corte macro"
        result = {
            "method": diagnosis_data["methods"][:],
            "macro_result": diagnosis_data["macro"],
            "micro_result": None,
            "diagnosis": None,
            "cie10_diagnosis": None,
            "cieo_diagnosis": None,
            "diagnosis_images": [],
        }
        audit_info.append({
            "action": "transcribed",
            "user_name": audit_user["name"],
            "user_email": audit_user["email"],
            "timestamp": transcribed_at.isoformat(),
        })

    if target_idx >= 2:
        # Tiene micro
        micro_at = add_business_hours(date_info["transcribed_at"], 8, 72)
        date_info["update_at"] = micro_at
        state = "Descrip micro"
        result["micro_result"] = diagnosis_data["micro"]
        audit_info.append({
            "action": "transcribed",
            "user_name": audit_user["name"],
            "user_email": audit_user["email"],
            "timestamp": micro_at.isoformat(),
        })

    if target_idx >= 3:
        # Tiene diagnóstico completo → Por firmar
        diag_at = add_business_hours(date_info["update_at"], 4, 48)
        date_info["update_at"] = diag_at
        state = "Por firmar"
        result["diagnosis"] = diagnosis_data["diagnosis"]
        result["cie10_diagnosis"] = diagnosis_data["cie10"]
        result["cieo_diagnosis"] = diagnosis_data["cieo"]
        audit_info.append({
            "action": "transcribed",
            "user_name": audit_user["name"],
            "user_email": audit_user["email"],
            "timestamp": diag_at.isoformat(),
        })

    if target_idx >= 4:
        # Firmado → Por entregar
        signed_at = add_business_hours(date_info["update_at"], 2, 24)
        date_info["signed_at"] = signed_at
        date_info["update_at"] = signed_at
        state = "Por entregar"

        opp_days = calculate_opportunity_days(created_at, signed_at)
        opportunity_info = [{
            "opportunity_time": float(opp_days),
            "max_opportunity_time": max_opp_time,
            "was_timely": opp_days <= max_opp_time,
        }]

        audit_info.append({
            "action": "signed",
            "user_name": pathologist.get("name", "Patólogo"),
            "user_email": pathologist.get("email", ""),
            "timestamp": signed_at.isoformat(),
        })

    if target_idx >= 5:
        # Entregado → Completado
        delivered_at = add_business_hours(date_info["signed_at"], 1, 72)
        date_info["delivered_at"] = delivered_at
        date_info["update_at"] = delivered_at
        state = "Completado"

        delivered_to = patient_info.get("full_name") or (
            f"{patient_info['first_name']} {patient_info['first_lastname']}"
        )
        if random.random() > 0.7:
            delivered_to = requesting_physician

        audit_info.append({
            "action": "delivered",
            "user_name": audit_user["name"],
            "user_email": audit_user["email"],
            "timestamp": delivered_at.isoformat(),
        })

    else:
        delivered_to = None

    # Notas adicionales (20% de probabilidad)
    additional_notes = []
    if random.random() < 0.2:
        additional_notes = [random.choice(ADDITIONAL_NOTES_POOL)]

    doc = {
        "case_code": case_code,
        "state": state,
        "priority": priority,
        "service": service,
        "requesting_physician": requesting_physician,
        "assigned_pathologist": {
            "id": str(pathologist["_id"]),
            "name": pathologist.get("name", ""),
        },
        "assistant_pathologists": [],
        "patient_info": patient_info,
        "samples": samples,
        "observations": observations,
        "previous_study": random.random() < 0.1,
        "additional_notes": additional_notes,
        "complementary_tests": [],
        "complementary_tests_reason": None,
        "approval_state": None,
        "opportunity_info": opportunity_info,
        "result": result,
        "delivered_to": delivered_to,
        "audit_info": audit_info,
        "date_info": [date_info],
        "created_at": created_at,
        "updated_at": date_info["update_at"],
    }

    return doc


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Siembra casos clínicos de dermatopatología en la BD.")
    parser.add_argument("--count", type=int, default=200, help="Número total de casos a insertar (default: 200)")
    parser.add_argument("--dry-run", action="store_true", help="Solo muestra lo que haría, no inserta")
    parser.add_argument("--clear", action="store_true", help="Elimina todos los casos existentes antes de insertar")
    args = parser.parse_args()

    mongo_uri = os.environ.get("MONGODB_URI", os.environ.get("MONGODB_URL", "mongodb://localhost:27017"))

    print("=" * 70)
    print("  SEED CASES — DermaPathSys")
    print("=" * 70)
    print(f"  URI       : {mongo_uri}")
    print(f"  Casos     : {args.count}")
    print(f"  Dry-run   : {args.dry_run}")
    print(f"  Clear     : {args.clear}")
    print("=" * 70)

    # Conectar
    db = get_db()

    # Cargar datos existentes
    patients = list(db["patients"].find({"is_active": {"$ne": False}}))
    pathologists = list(db["users"].find({"role": "pathologist", "is_active": {"$ne": False}}))
    tests = list(db["tests"].find({"is_active": {"$ne": False}}))
    entities = list(db["entities"].find({"is_active": {"$ne": False}}))

    print(f"\n  Pacientes encontrados   : {len(patients)}")
    print(f"  Patólogos encontrados   : {len(pathologists)}")
    print(f"  Pruebas encontradas     : {len(tests)}")
    print(f"  Entidades encontradas   : {len(entities)}")

    if not patients:
        print("\n[ERROR] No hay pacientes en la BD. Ejecuta primero los scripts de importación de pacientes.")
        sys.exit(1)
    if not pathologists:
        print("\n[ERROR] No hay patólogos en la BD. Ejecuta primero import_pathologists.py.")
        sys.exit(1)
    if not tests:
        print("\n[ERROR] No hay pruebas en la BD. Ejecuta primero import_tests.py.")
        sys.exit(1)

    # Usuario de auditoría (primer admin o auxiliar disponible)
    audit_user_doc = db["users"].find_one({"role": {"$in": ["administrator", "auxiliar"]}})
    if not audit_user_doc:
        audit_user_doc = {"name": "Sistema", "email": "sistema@dermapath.co"}

    # Clear
    if args.clear:
        if args.dry_run:
            existing_count = db["cases"].count_documents({})
            print(f"\n[DRY-RUN] Se eliminarían {existing_count} casos existentes.")
        else:
            deleted = db["cases"].delete_many({})
            db["counters"].delete_many({"_id": {"$regex": "^case_code_"}})
            print(f"\n[CLEAR] Eliminados {deleted.deleted_count} casos existentes y contadores.")

    # Distribución de estados
    total = args.count
    n_completados = math.floor(total * 0.80)
    n_incompletos = total - n_completados

    # Los incompletos se distribuyen uniformemente en 5 estados
    incomplete_states = ["En recepción", "Corte macro", "Descrip micro", "Por firmar", "Por entregar"]
    per_state = n_incompletos // len(incomplete_states)
    remainder = n_incompletos % len(incomplete_states)

    state_distribution = {s: per_state for s in incomplete_states}
    for i in range(remainder):
        state_distribution[incomplete_states[i]] += 1
    state_distribution["Completado"] = n_completados

    print(f"\n  Distribución de estados:")
    for state, cnt in state_distribution.items():
        pct = cnt / total * 100
        print(f"    {state:<20} {cnt:>4} casos  ({pct:.1f}%)")

    # Rangos de fechas: 1 de enero de 2026 hasta hoy
    now = datetime.utcnow()
    start_date = datetime(2026, 1, 1, 0, 0, 0)
    date_range = now - start_date

    print(f"\n  Rango de fechas: {start_date.strftime('%Y-%m-%d')} → {now.strftime('%Y-%m-%d')}")

    # Construir lista de (target_state, created_at) con distribución temporal uniforme
    cases_to_build = []

    # Para completados: distribuidos uniformemente en el rango completo
    interval = date_range / n_completados if n_completados > 0 else timedelta(days=1)
    for i in range(n_completados):
        # Fecha de creación uniformemente distribuida
        created_at = start_date + interval * i + timedelta(
            hours=random.uniform(0, interval.total_seconds() / 3600)
        )
        if created_at > now:
            created_at = now - timedelta(hours=random.uniform(1, 12))
        cases_to_build.append(("Completado", created_at))

    # Para incompletos: distribuidos uniformemente en el rango completo
    for state, count in state_distribution.items():
        if state == "Completado":
            continue
        if count == 0:
            continue
        interval_inc = date_range / count if count > 0 else timedelta(days=1)
        for i in range(count):
            created_at = start_date + interval_inc * i + timedelta(
                hours=random.uniform(0, interval_inc.total_seconds() / 3600)
            )
            if created_at > now:
                created_at = now - timedelta(hours=random.uniform(1, 24))
            cases_to_build.append((state, created_at))

    # Barajar para insertar en orden mixto
    random.shuffle(cases_to_build)

    # Obtener el año actual para case_code
    year = now.year
    current_counter = 0
    if not args.clear:
        counter_doc = db["counters"].find_one({"_id": f"case_code_{year}"})
        current_counter = counter_doc["seq"] if counter_doc else 0

    print(f"\n  Iniciando generación de {total} casos...\n")

    created_count = 0
    error_count = 0
    state_counts = {}

    cases_batch = []

    for idx, (target_state, created_at) in enumerate(cases_to_build):
        try:
            patient = random.choice(patients)
            pathologist = random.choice(pathologists)
            diagnosis_data = random.choice(DIAGNOSES)

            # Si el paciente no tiene entidad asignada, usar una de las disponibles en BD
            patient_entity = (patient.get("entity_info") or {}).get("entity_name")
            fallback_entity = None if patient_entity else (random.choice(entities) if entities else None)

            case_code = f"{year}-{(current_counter + idx + 1):05d}"

            doc = build_case_document(
                case_code=case_code,
                patient=patient,
                pathologist=pathologist,
                tests=tests,
                body_regions=BODY_REGIONS,
                diagnosis_data=diagnosis_data,
                created_at=created_at,
                target_state=target_state,
                case_number=idx + 1,
                audit_user=audit_user_doc,
                fallback_entity=fallback_entity,
            )

            state_counts[doc["state"]] = state_counts.get(doc["state"], 0) + 1

            if args.dry_run:
                print(
                    f"  [{idx+1:>4}] {case_code}  |  {doc['state']:<20}  |  "
                    f"{patient.get('full_name', 'N/A')[:30]:<30}  |  "
                    f"{created_at.strftime('%Y-%m-%d')}"
                )
                created_count += 1
            else:
                cases_batch.append(doc)
                created_count += 1

                # Insertar en lotes de 50
                if len(cases_batch) >= 50:
                    db["cases"].insert_many(cases_batch)
                    cases_batch = []
                    sys.stdout.write(f"\r  Insertados: {created_count}/{total}")
                    sys.stdout.flush()

        except Exception as e:
            error_count += 1
            print(f"\n  [ERROR] Caso {idx+1}: {e}")

    # Insertar los restantes
    if not args.dry_run and cases_batch:
        db["cases"].insert_many(cases_batch)
        sys.stdout.write(f"\r  Insertados: {created_count}/{total}\n")
        sys.stdout.flush()

    # Actualizar contador
    if not args.dry_run and created_count > 0:
        update_counter(db, year, created_count)

    # Resumen
    print("\n")
    print("=" * 70)
    print("  RESUMEN")
    print("=" * 70)
    print(f"  Casos {'mostrados' if args.dry_run else 'insertados'} : {created_count}")
    print(f"  Errores            : {error_count}")
    print(f"\n  Por estado:")
    for state, cnt in sorted(state_counts.items()):
        print(f"    {state:<22} {cnt:>4}")
    print("=" * 70)


if __name__ == "__main__":
    main()
