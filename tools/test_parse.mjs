import { parseGuide, parseGuideText, expandRef } from '../src/lib/wol.js';
const lines = `16-22 DE NOVIEMBRE
LAMENTACIONES 1, 2
Canción 28 y oración | Palabras de introducción (1 min.)
TESOROS DE LA BIBLIA
1. Una reacción natural ante una situación devastadora
(10 mins.)
Jeremías se sintió devastado cuando el pueblo que él amaba sufrió...
2. Busquemos perlas escondidas
(10 mins.)
Lam 2:19. ¿Cómo se parece...
3. Lectura de la Biblia
(4 mins.) Lam 1:8-18 (th lección 10).
SEAMOS MEJORES MAESTROS
4. Empecemos conversaciones (3 mins.)
DE CASA EN CASA. Enseña una verdad bíblica.
5. Hagamos revisitas (4 mins.)
PREDICACIÓN PÚBLICA. Presenta...
6. ¿Qué dirías? (5 mins.) Análisis con el auditorio.
NUESTRA VIDA CRISTIANA
Canción 90
7. No nos olvidemos de nuestros hermanos inactivos
(15 mins.) Análisis con el auditorio.
8. Estudio bíblico de la congregación
(30 mins.) wcg cap. 17.
Palabras de conclusión (3 mins.) | Canción 75 y oración`.split('\n');
const w = parseGuide(lines);
console.log(JSON.stringify(w, null, 1).slice(0, 2500));
const t2 = `28 DE DICIEMBRE A 3 DE ENERO
EZEQUIEL 9, 10
Canción 119 y oración | Palabras de introducción (1 min.)
TESOROS DE LA BIBLIA
1. Ayudemos a otros a sobrevivir al Armagedón (10 mins.)
2. Busquemos perlas escondidas (10 mins.)
3. Lectura de la Biblia (4 mins.)
Eze 9:1-11 (th lección 5).
SEAMOS MEJORES MAESTROS
4. Empecemos conversaciones (3 mins.)
5. Hagamos revisitas (4 mins.)
6. Expliquemos nuestras creencias (5 mins.)
NUESTRA VIDA CRISTIANA
Canción 60
7. “Te salvarás a ti mismo y también a los que te escuchan” (15 mins.)
8. Estudio bíblico de la congregación (30 mins.)
wcg introducción a la sección 2, línea de tiempo y cap. 22.
Palabras de conclusión (3 mins.)
Canción 135 y oración`;
console.log(JSON.stringify(parseGuideText(t2)).slice(0,1800));
console.log(expandRef('Lam 1:8-18'), '|', expandRef('1Co 10:1-13'), '|', expandRef('Sl 23:1-6'));
