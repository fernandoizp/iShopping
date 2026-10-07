// Textos del juego. Todo es provisional y fácil de reescribir.

export const INTRO = [
  'Moriste en Italia, en una guerra que no era tuya.',
  'Despertaste en un cuerpo que tampoco lo es.',
  'El Patrón, que gobernó el país durante trece años, ha desaparecido.',
  'Su paraíso privado, la Hacienda Nápoles, sigue encendido.',
  'Ve. Averigua qué le pasó a él.\nY qué te hicieron a ti.',
];

export const NPCS = {
  rosario: {
    name: 'ROSARIO', role: 'Jardinera copiada',
    talk(s) {
      if (s.abilities.key) return ['Llevas su sello. Ten cuidado de no acabar pareciéndote a él.'];
      if (s.abilities.double) return ['Ya tienes el propulsor. Los soldados como tú lo llevaban en la espalda.', 'El Palacio está cerrado con su emblema. Solo el Sello del Patrón abre esas puertas.', 'La Meseta queda al este, subiendo por la fuente. Allí manda un gigante que antes era un molino.'];
      return [
        'Otro despertado. Se te nota en cómo te miras las manos.',
        'Yo era Rosario. Cuidaba los naranjos de mi pueblo, antes de que el Patrón comprara el pueblo entero.',
        'Ahora cuido los suyos. Para siempre, decía el contrato.',
        'Si buscas respuestas, sigue hasta la Fuente de los Leones. Y cuidado: los jardineros ya no distinguen entre malas hierbas y visitantes.',
      ];
    },
  },
  ermitano: {
    name: 'EL ERMITAÑO', role: 'Humano',
    talk(s) {
      if (s.flags.cuelebreDead) return ['¿Volviste de la gruta? Eres terco, como los de antes.', 'Dicen que la sierpe dormía sobre el oro de toda una generación. Que se lo lleve el agua.'];
      return [
        '¡Un ingenio que habla! Hacía años que nadie bajaba hasta aquí.',
        'Soy de los pocos de carne y hueso que quedan. Me escondí cuando empezaron a "guardar" a la gente en máquinas.',
        'Más abajo, en la gruta, el Patrón esconde su oro. Lo guarda una sierpe que trajo de las montañas de Asturias.',
        'El paso del tesoro tiene el techo bajo y el suelo lleno de pinchos. Solo lo cruza quien se mueve más rápido que un parpadeo.',
      ];
    },
  },
  ingrid: {
    name: 'INGRID', role: 'Holograma',
    talk(s) {
      if (s.abilities.key) return ['Ya lo tienes. Ahora el Palacio no puede negarte la entrada.', 'Cuando lo encuentres... recuerda que él también tiene miedo a morir. Por eso hizo todo esto.'];
      return [
        'Hei. Soy... era Ingrid. Ingeniera. Ayudé a escribir el software de la memoria.',
        'Nos dijeron que era para que los soldados volvieran a casa. Que nadie más tendría que llorar a un hijo.',
        'Pero cada copia lleva una orden escondida en el fondo: obedecer al Sello del Patrón.',
        'Tú no la obedeces. Algo salió mal contigo. O salió bien.',
        'El Centinela guarda el sello en el Parque Tecnológico. Baja a través del hielo.',
      ];
    },
  },
};

export const RECORDS = {
  trono: [
    '[GRABACIÓN · SALÓN DEL TRONO]',
    'PATRÓN: Me llaman tirano. Pero os he dado lo que ningún rey dio jamás: no morir.',
    'PATRÓN: Lo de Italia fue necesario. Necesitaba cuerpos. Y necesitaba recuerdos.',
    'PATRÓN: Cuando mi corazón falle, yo también subiré a la máquina. Y este jardín será mío para siempre.',
    '[FIN DE LA GRABACIÓN]',
    'Tras el trono, un ascensor baja a los sótanos.',
  ],
};

export const MEMORIES = [
  ['RECUERDO I · La partida', 'Lucía me ató la bufanda azul antes de subir al tren. "Para que vuelvas", dijo. Tenía siete años.'],
  ['RECUERDO II · Los carteles', 'Los carteles decían que Italia nos había ofendido. Nadie en el pueblo sabía cómo. Fuimos igual.'],
  ['RECUERDO III · Los ciervos', 'De niño pintaba ciervos en la pared del corral, como los de las cuevas. Mi padre los borraba. Mi madre volvía a pintarlos.'],
  ['RECUERDO IV · El frente', 'Nevaba en los Apeninos. Compartí la última naranja con un italiano herido. Él tampoco sabía por qué luchábamos.'],
  ['RECUERDO V · El contrato', 'Firmé un papel en el hospital de campaña. "Si caes, el Patrón te traerá de vuelta." Pensé que era una broma.'],
  ['RECUERDO VI · El silencio', 'Recuerdo el ruido. Luego el silencio. Recuerdo pensar en Lucía. Y después, nada.'],
  ['RECUERDO VII · El laboratorio', 'Luz blanca. Una voz: "Unidad S-27, carga completa. Orden de obediencia: error." Otra voz: "Déjalo. Se borrará solo."'],
  ['RECUERDO VIII · La estación', 'Lucía tiene veintidós años. Cada domingo espera en la estación del norte. Nadie le ha dicho que volví. Así.'],
];

export const ITEMS = {
  double: ['PROPULSOR DORSAL', 'Pulsa SALTAR en el aire para un segundo salto.'],
  dash: ['SERVOS DE IMPULSO', 'Pulsa IMPULSO (C) para lanzarte hacia delante. Eres intocable mientras dura.'],
  wall: ['GARRAS MAGNÉTICAS', 'Deslízate por las paredes y salta desde ellas.'],
  key: ['SELLO DEL PATRÓN', 'Abre las puertas selladas del Palacio, sobre la Fuente de los Leones.'],
  core: ['NÚCLEO DE ENERGÍA', 'Tu integridad máxima aumenta en uno.'],
};

export function ending(memories) {
  const lines = [
    'La Máquina Eterna se apaga.',
    'Por primera vez en trece años, la hacienda queda en silencio.',
    'En todo el país, las copias dejan de oír la orden. Algunas se sientan. Otras lloran, aunque ya no tengan lágrimas.',
  ];
  if (memories >= 8) lines.push('Es domingo. En el andén de la estación del norte, una mujer con una bufanda azul levanta la vista.', '—¿Papá?');
  else lines.push('Aún no recuerdas del todo quién eras. Pero sabes adónde ir.', 'Hay una estación, al norte.');
  return lines;
}
