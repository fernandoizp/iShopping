# LUMBRE — La última brasa

Metroidvania de pixel art al estilo Game Boy Advance. Resolución nativa de 240×160, paleta de 15 bits, tramado ordenado y música chiptune sintetizada en tiempo real.

> Hace mil inviernos, el Gran Fuego se apagó. De sus cenizas quedó una sola brasa: tú.

## Jugar

Es una web estática, sin dependencias ni compilación. Hace falta un servidor local porque usa módulos ES:

```bash
python3 -m http.server 8000
# abre http://localhost:8000
```

Para publicarlo, activa **GitHub Pages** (Settings → Pages → rama `master`, carpeta `/`).

### Controles

| Acción | Teclado | Mando | Táctil |
|---|---|---|---|
| Mover | Flechas / WASD | Cruceta / stick | Cruceta |
| Saltar (mantén para saltar más alto) | Z / J / Espacio | A | A |
| Atacar | X / K | X / B | B |
| Tajo arriba / abajo (rebote sobre enemigos y pinchos) | ↑ / ↓ + atacar | | |
| Impulso (tras conseguirlo) | C / L / Shift | RB / RT | R |
| Guardar en un santuario | ↑ junto al santuario | | |
| Mapa / pausa | Enter / M | Start | START |
| Silenciar | N | | SONIDO |

## Contenido

- **3 zonas**: Jardín Hundido, Cavernas de Cristal y Fortaleza de Ceniza, cada una con su tileset, fondo parallax, iluminación y música.
- **10 salas** interconectadas en una rejilla al estilo Metroid, con mapa automático.
- **Habilidades que abren caminos**: *Alas de Ceniza* (doble salto) y *Zarpazo de Brasa* (impulso).
- **Enemigos**: caracol de cripta, murciélago y planta escupidora, más un jefe con dos fases: el **Coloso de Musgo**.
- Secretos: vasijas de vida y un muro rompible.
- Partida guardada en `localStorage`, con reaparición en el último santuario.

## Estructura

```
index.html        Lienzo + controles táctiles
src/main.js       Bucle a 60 Hz, estados, cámara, HUD, mapa, guardado, iluminación
src/entities.js   Física de tiles, protagonista, enemigos, jefe, proyectiles y objetos
src/world.js      Mapas de las salas (texto ASCII) y su leyenda
src/art.js        Todos los sprites como cuadrículas de texto (1 carácter = 1 píxel)
src/tiles.js      Tilesets por zona con autotiling y fondos parallax procedurales
src/gfx.js        Paleta, construcción de sprites, brillos tramados y fuente pixel 3×5
src/audio.js      Efectos y música chiptune con WebAudio (pulso, triángulo y ruido)
src/input.js      Teclado, Gamepad API y táctil
```

## Cómo ampliarlo

**Sprites.** En `src/art.js` cada sprite es un array de cadenas. Cada letra es un color de la paleta `PAL` de `src/gfx.js`, y `.` es transparente. Es el mismo formato de cuadrícula de texto que usa [aseprite-ai-artist](https://github.com/with-pebbly/aseprite-ai-artist). Puedes dibujar en Aseprite con esa herramienta y transcribir el resultado, o cargar los PNG que exporte en lugar de las cuadrículas. [sprite-gen](https://github.com/aldegad/sprite-gen) sirve para generar hojas de animación (correr, atacar…) a partir de una sola imagen del personaje.

**Salas.** En `src/world.js` cada sala es un mapa ASCII de 15×10 tiles por pantalla, con su posición `x, y` en la rejilla del mundo. Las salas vecinas se conectan solas si las aberturas de sus bordes coinciden. La leyenda está al principio del archivo.

**Zonas.** Para añadir una zona, crea una entrada en `AREAS` (`src/tiles.js`) con su rampa de colores, su acento y su cielo.
