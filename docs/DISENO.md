# Diseño del juego (borrador 0.1)

Todo lo marcado con **(?)** está sin decidir. Lo demás es una propuesta basada en lo que hemos hablado.

Título de trabajo: **PARADISE** (provisional, como el complejo).

## Premisa

Un país con aire español, sin nombre todavía **(?)**, estuvo décadas bajo un gobernante que nadie eligió (lo llaman *el rey*, aunque el título sea suyo y de nadie más). Hizo mala fama con sus vecinos y se rodeó de lujo. Su obra favorita fue **la Hacienda Nápoles**, un complejo privado que imitaba lo mejor del mundo: paisajes, arquitectura, tecnología. Era su paraíso particular.

El tirano ha desaparecido. La hacienda sigue ahí, encendida a medias, con sus máquinas todavía funcionando.

El protagonista, un soldado muerto en una de sus guerras y devuelto a la vida dentro de una máquina, viaja a la hacienda para averiguar qué pasó con el gobernante, con el país y con él mismo.

### Tono

El juego **empieza luminoso** (la hacienda se ve como un parque encantador, casi turístico) y **se oscurece por zonas** a medida que el jugador descubre lo que costó construirla. Cada zona nueva cambia la paleta y la música. El contraste es la idea central del juego: un paraíso que se pudre desde dentro.

## El mundo: la Hacienda Nápoles

Cada zona imita un paisaje distinto, hecho a mano o con maquinaria. Esa es la excusa narrativa para tener ambientes muy variados dentro de un único lugar.

| # | Zona | Qué imita | Tono / paleta | Habilidad que da |
|---|------|-----------|---------------|------------------|
| 1 | **Jardines de Entrada** | Patios andaluces, fuentes, setos, azulejos | Alegre, cálido, cielo azul | Doble salto |
| 2 | **La Meseta** | Páramo castellano, molinos, dehesa, castillo en ruinas | Dorado y seco, viento | Impulso (dash) |
| 3 | **Poblado Ibérico** | Castro y cuevas con arte rupestre | Ocre, tierra, fuego | Salto en pared |
| 4 | **El Fiordo** | Valle noruego con agua importada, pinos, nieve | Frío, azul y verde oscuro | Gancho |
| 5 | **Parque Tecnológico** | Biodomos, laboratorios, teleféricos, robots de servicio | Neón, blanco clínico | Habilidad de zona **(?)** |
| 6 | **El Palacio** | Mármol, oro, salones, la colección del tirano | Opulento, apagado | Llave final |
| 7 | **Los Sótanos** | Búnker bajo la hacienda, donde está la verdad | Oscuro, rojo, silencio | Final |

Cada zona tiene un jefe. El mapa es un nudo: casi todas las zonas se enlazan entre sí por atajos que se abren con habilidades de otras zonas, como en Hollow Knight.

## Protagonista

Un **androide humanoide gris** que fue una persona. Murió como soldado en la **guerra que el gobernante provocó en Italia**.

Después de la guerra, el gobernante lanzó un **software para "vivir para siempre"**: copiar los recuerdos de una persona a una máquina. Se vendió como un regalo al pueblo. En realidad era una jugada maquiavélica cuyo propósito real está por decidir **(?)** (control, mano de obra, un ejército que no muere, o su propia inmortalidad).

El protagonista despierta en ese cuerpo de máquina y viaja a la hacienda para saber qué pasó con el gobernante y qué le hicieron a él.

Ideas para el diseño:

- **Aspecto:** cuerpo de metal gris, articulaciones a la vista, rostro liso con un visor luminoso. Lleva **ropa encima** (capa con capucha bajada, túnica, cinturón), como si intentara seguir pareciendo humano.
- **La gran contradicción:** existe gracias a la tecnología del tirano al que persigue.
- **Recuerdos como mecánica:** fragmentos de memoria repartidos por la hacienda que reconstruyen quién era. Pueden dar habilidades o desbloquear el final.
- **Pregunta de fondo:** ¿sigue siendo la misma persona, o solo una copia que cree serlo?

## El tirano

Inspirado en la figura del **capo con poder de estado**: un hombre que se hizo rico fuera de la ley, compró el país y se presentó como benefactor. Construyó la hacienda como monumento a sí mismo, con su propio parque, sus animales exóticos y su gente armada.

Rasgos para el juego:

- Populista: repartía dinero y obras, y mucha gente del país lo recuerda con cariño. Eso da NPCs con opiniones enfrentadas.
- Excesivo: la hacienda mezcla paisajes de medio mundo porque quería tenerlo todo.
- Su paradero es el misterio central. Su importancia se decide más adelante **(?)**: puede ser jefe final, víctima o algo peor.

- Provocó una **guerra en Italia** y, tras ella, lanzó el software de "vida eterna" que convierte recuerdos en máquinas.

Es un personaje ficticio, con otro nombre y otra historia que cualquier persona real.

## Qué pesa en el juego

Has pedido las cuatro cosas, así que las repartimos por sistemas:

- **Exploración y secretos:** mapa grande con atajos, salas ocultas, coleccionables que explican el pasado, marcadores propios en el mapa.
- **Combate y jefes:** ataque base más una segunda herramienta, esquiva con ventana de invulnerabilidad, parry, curación que cuesta algo, enemigos con patrones leíbles, un jefe memorable por zona.
- **Plataformas y movimiento:** controles muy sensibles, habilidades que se combinan (doble salto + impulso + pared + gancho) y salas de reto opcionales.
- **Historia y personajes:** NPCs en cada zona, notas y grabaciones del tirano, y un final que cambia según lo que hayas descubierto.

## Dirección de arte

Buscas algo cercano a Blasphemous y Hollow Knight. Hay que ser claros sobre dónde estamos:

- **Lo que hay ahora** es pixel art de 240×160 dibujado como texto. Funciona como prototipo y se parece a una GBA, pero no llega al nivel de detalle de Blasphemous.
- **Subir la calidad desde código** es posible hasta cierto punto: más resolución (por ejemplo 480×270), capas de parallax con niebla, luz dinámica, partículas, bloom y viñeta. Eso da una atmósfera mucho más moderna, pero los sprites siguen siendo tan buenos como los dibujemos.
- **Para llegar de verdad al nivel de Blasphemous** hace falta arte hecho a mano o generado y retocado: personaje animado con muchos fotogramas, jefes grandes, fondos pintados. Ahí entran las herramientas que enlazaste (que necesitan correr en tu ordenador), un artista, o packs de assets.

**Propuesta:** hacer una prueba visual de una sola sala (los Jardines) a mayor resolución, con luz, niebla y parallax, para decidir con una imagen y no a ciegas.

## Plan de trabajo sugerido

1. Decidir nombres definitivos (país, tirano, protagonista) y el propósito real del software. *Protagonista (androide) y título provisional: hechos.*
2. Prueba visual de los Jardines (una sala, resolución más alta).
3. Rehacer los Jardines de Entrada con la nueva ambientación, un jefe y su habilidad.
4. Añadir sistemas de fondo: parry, curación, moneda, marcadores de mapa, diálogos.
5. Una zona nueva por iteración, probándola antes de pasar a la siguiente.

## Nombres **(?)**

- **País:** pendiente. Algo con sonido ibérico pero inventado.
- **Hacienda:** "Nápoles" como nombre de trabajo. Alternativas por si luego quieres algo propio: *El Edén*, *Villa Aurora*, *La Dehesa Dorada*.
- **Tirano:** pendiente. Conviene un apodo más que un nombre (*El Patrón*, *El Benefactor*, *Su Excelencia*).
- **Título del juego:** PARADISE, provisional.
