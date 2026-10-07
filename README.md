# PARADISE

Metroidvania de pixel art ambientado en la **Hacienda Nápoles**, el paraíso privado de un tirano desaparecido.

> Moriste en Italia, en una guerra que no era tuya. Despertaste en un cuerpo que tampoco lo es.

Eres un soldado cuya mente fue copiada a un cuerpo de androide por el software de "vida eterna" del Patrón. Recorres su hacienda para descubrir qué le pasó a él y qué te hicieron a ti.

**Prototipo jugable completo con arte provisional.** Todo el arte se genera por código y está pensado para sustituirse por arte final. La historia y el diseño están en [`docs/DISENO.md`](docs/DISENO.md).

## Jugar

Es una web estática, sin dependencias ni compilación. Se necesita un servidor local porque usa módulos ES:

```bash
python3 -m http.server 8000
# abre http://localhost:8000
```

### Controles

| Acción | Teclado | Mando | Táctil |
|---|---|---|---|
| Moverse | Flechas / WASD | Cruceta / stick | Cruceta |
| Saltar (mantén para saltar más alto) | Z / Espacio | A | A |
| Espada (con ↑ o ↓: tajo vertical; ↓ en el aire rebota) | X | X | B |
| Impulso | C / Shift | RB / B | R |
| Curar (mantén; gasta energía) | V | Y / LB | H |
| Hablar, guardar, usar | ↑ | ↑ | ▲ |
| Mapa y pausa | Enter / M | Start | MAPA |
| Silenciar | N | | SONIDO |

## Contenido

- **8 zonas y 17 salas**: Jardines de Entrada, La Meseta, Poblado Ibérico, Gruta del Tesoro, El Fiordo, Parque Tecnológico, El Palacio y Los Sótanos.
- **Habilidades que abren el mapa**: propulsor dorsal (doble salto), servos de impulso, garras magnéticas (salto en pared) y el Sello del Patrón.
- **4 jefes**: el Gigante del Molino, el Cuélebre, el Centinela y El Patrón.
- **8 tipos de enemigo**: jardinero autómata, dron vigía, toro de hierro, murciélago, ídolo escupefuego, lobo de hielo, guardia con escudo y torreta láser.
- **Historia**: 3 personajes con diálogo, grabaciones y 8 recuerdos. El final cambia si los encuentras todos.
- **Sistemas**: guardado en terminales, curación con energía, núcleos de vida, muros secretos, ascensores y mapa.
- **Gráficos**: 480×270, iluminación dinámica, niebla, bloom, parallax, partículas por zona y escenarios con biselado por campo de distancias.
- **Sonido**: música y efectos sintetizados, con reverberación y ambiente por zona.

## Estructura

```
index.html              Lienzo, fuentes y controles táctiles
src/main.js             Estados del juego, salas, cámara, jefes, guardado, dibujo
src/ui.js               HUD, diálogos, ventanas, mapa
src/story.js            Todos los textos (diálogos, recuerdos, final)
src/core/               Gráficos base, entrada, audio, partículas, postprocesado
src/world/zones.js      Paleta, material, luz, música y partículas de cada zona
src/world/rooms.js      Mapa del mundo: salas, puertas y entidades
src/world/render.js     Render de escenarios (materiales, remates, plataformas)
src/world/background.js Fondos parallax de exteriores
src/world/deco.js       Decorados (molinos, fuentes, tanques, tronos…)
src/actors/             Héroe, enemigos, jefes, objetos y física
prototypes/             Pruebas visuales anteriores
```

## Cómo meter arte final

- **Héroe**: `renderHero()` en `src/actors/hero.js` dibuja cada fotograma. Se puede sustituir por una hoja de sprites con el pie en `y = 60` y el centro en `x = 32`.
- **Enemigos**: la función `SPR.<tipo>` de `src/actors/enemies.js` genera sus fotogramas. Basta con devolver imágenes cargadas en su lugar.
- **Escenarios**: `renderRoom()` y `renderBackWall()` producen un lienzo por sala. Se pueden reemplazar por fondos pintados del mismo tamaño.
- **Salas**: cada sala de `src/world/rooms.js` se construye con instrucciones (`fill`, `plat`, `spikes`…). Las puertas se tallan solas en las dos salas vecinas.
