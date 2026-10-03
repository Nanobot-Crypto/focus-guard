// Focus Guard API client with mock fallback for preview mode.
// Tries real endpoints at localhost:37291; on connection error, returns mocks.

const BASE = "http://localhost:37291/api";

export type Sensitivity = "low" | "medium" | "high";
export type OverlayTheme = "dark" | "calm" | "minimal";

export interface Status {
  monitoring: boolean;
  todayInterventions: number;
  uptime: string;
  lastDetection: string | null;
}
export interface Config {
  blockDuration: number;
  sensitivity: Sensitivity;
  autoStart: boolean;
  showProgress: boolean;
  overlayTheme: OverlayTheme;
  breakRemindersEnabled: boolean;
}
export interface Category {
  id: string;
  name: string;
  keywords: string[];
  enabled: boolean;
  detectionCount: number;
}
export interface PhrasesPayload { phrases: string[]; filePath: string; }
export interface Whitelist { sites: string[]; apps: string[]; }
export interface Stats {
  daily: { date: string; interventions: number; timeSaved: number }[];
  byCategory: { name: string; count: number }[];
  total: { interventions: number; timeSaved: number; streakDays: number };
}
export interface RecentEvent { time: string; category: string; title: string; }

// ---------- Mock store (lives in-memory for preview) ----------

const now = new Date();
const iso = (d: Date) => d.toISOString();

const mockCategories: Category[] = [
  { id: "c1", name: "Adult Content", keywords: ["xxx", "nsfw", "porn", "adult"], enabled: true, detectionCount: 12 },
  { id: "c2", name: "Short-form Video", keywords: ["tiktok", "shorts", "reels", "youtube shorts"], enabled: true, detectionCount: 47 },
  { id: "c3", name: "Social Media", keywords: ["twitter", "x.com", "instagram", "facebook", "reddit"], enabled: true, detectionCount: 31 },
  { id: "c4", name: "Gaming", keywords: ["steam", "epic games", "twitch", "lol"], enabled: false, detectionCount: 5 },
];

const mockPhrases: string[] = [
  "La sobreexposición a estímulos intensos puede reducir la sensibilidad; lo que antes activaba con fuerza empieza a pedir más intensidad para producir la misma respuesta. No es exageración: es adaptación neuronal a la repetición.",
  "Cuando el cerebro se acostumbra a picos altos de activación, los estímulos cotidianos pueden perder peso subjetivo y volverse demasiado planos durante un tiempo. No es exageración: es adaptación neuronal a la repetición.",
  "La repetición de señales muy potentes enseña al sistema nervioso a esperar más novedad, y esa expectativa puede volver más frágil la satisfacción ordinaria. No es exageración: es adaptación neuronal a la repetición.",
  "Lo que parecía un simple entretenimiento puede entrenar al cerebro para responder menos a lo normal y más a lo extremo, porque la adaptación no distingue intención. No es exageración: es adaptación neuronal a la repetición.",
  "Si el circuito de recompensa recibe siempre un golpe alto, la línea de base se mueve; después, lo moderado puede sentirse insuficiente sin haber perdido valor real. No es exageración: es adaptación neuronal a la repetición.",
  "La novedad constante compite con la atención sostenida; saltar de estímulo en estímulo deja menos capacidad para permanecer con una sola tarea. El cerebro aprende rápido cuando la recompensa llega sin esfuerzo.",
  "Cuando cada clic promete algo distinto, la mente aprende a buscar cambios rápidos y a impacientarse con cualquier proceso lento. El cerebro aprende rápido cuando la recompensa llega sin esfuerzo.",
  "La atención no se rompe de golpe: se va fragmentando con pequeñas interrupciones que vuelven más difícil entrar en foco profundo. El cerebro aprende rápido cuando la recompensa llega sin esfuerzo.",
  "Un flujo continuo de variaciones entrena al cerebro para preferir el sobresalto y desconfiar de la calma necesaria para pensar con claridad. El cerebro aprende rápido cuando la recompensa llega sin esfuerzo.",
  "Si el sistema aprende a perseguir lo nuevo, sostener una lectura, una conversación o un estudio largo puede exigir más esfuerzo del que debería. El cerebro aprende rápido cuando la recompensa llega sin esfuerzo.",
  "El hábito puede asociar malestar con alivio rápido; entonces el aburrimiento, la soledad o el estrés dejan de ser señales para pensar y pasan a ser disparadores. Así se estrecha el espacio mental para elegir con calma.",
  "Cuando una conducta se usa siempre para escapar del malestar, el cerebro empieza a leer la incomodidad como una orden de repetirla. Así se estrecha el espacio mental para elegir con calma.",
  "La conexión entre emoción difícil y recompensa inmediata fortalece una ruta automática que, con el tiempo, compite con opciones más sanas. Así se estrecha el espacio mental para elegir con calma.",
  "No es solo deseo: a menudo es aprendizaje. El sistema recuerda qué hizo para bajar tensión y puede pedir lo mismo antes de explorar otra salida. Así se estrecha el espacio mental para elegir con calma.",
  "Cada vez que el alivio llega por la misma puerta, el cerebro refuerza esa puerta; por eso el impulso puede aparecer incluso antes de que lo notes. Así se estrecha el espacio mental para elegir con calma.",
  "La tolerancia puede hacer que la satisfacción dure menos; lo que al principio bastaba durante un rato después pide más frecuencia o más intensidad. La costumbre cambia el umbral, no solo el gusto.",
  "A medida que una respuesta se vuelve predecible, el sistema puede necesitar más carga para sentir algo parecido a la primera vez. La costumbre cambia el umbral, no solo el gusto.",
  "La costumbre altera la experiencia: no porque el mundo haya empeorado, sino porque el cerebro ha ajustado sus umbrales. La costumbre cambia el umbral, no solo el gusto.",
  "Cuando la satisfacción se acorta, el hábito deja de ser un descanso y empieza a parecer una persecución interminable de la próxima descarga. La costumbre cambia el umbral, no solo el gusto.",
  "Si todo funciona por escalada, la propia búsqueda de alivio puede convertirse en una fuente de inquietud más que de descanso. La costumbre cambia el umbral, no solo el gusto.",
  "La impulsividad reduce el margen entre deseo y acción; sin ese pequeño espacio, la elección deja de parecer una elección. El patrón se fortalece incluso antes de que lo notes.",
  "Cuando la respuesta aparece antes que la reflexión, el cerebro no negocia: simplemente sigue la ruta más corta hacia el alivio. El patrón se fortalece incluso antes de que lo notes.",
  "Un impulso no siempre se siente como pérdida de control; a veces se presenta como una urgencia razonable que en realidad pide muy poca deliberación. El patrón se fortalece incluso antes de que lo notes.",
  "Cuanto más automática es la secuencia, menos sitio queda para recordar tus objetivos antes de actuar. El patrón se fortalece incluso antes de que lo notes.",
  "La libertad práctica depende de un segundo de pausa, y el hábito compulsivo intenta precisamente borrar ese segundo. El patrón se fortalece incluso antes de que lo notes.",
  "La recompensa intensa puede desordenar la motivación; después, lo que exige esfuerzo normal puede parecer demasiado lento para arrancar. Por eso la atención paga el precio de la velocidad.",
  "Si el cerebro aprende a recibir mucho con poco trabajo, cualquier tarea que pida persistencia compite en desventaja. Por eso la atención paga el precio de la velocidad.",
  "La motivación no desaparece por completo, pero puede desplazarse hacia lo que promete una ganancia inmediata y visible. Por eso la atención paga el precio de la velocidad.",
  "Cuando la recompensa se vuelve demasiado fácil, el esfuerzo honesto puede empezar a sentirse poco atractivo, aunque siga siendo valioso. Por eso la atención paga el precio de la velocidad.",
  "El problema no es disfrutar algo; el problema aparece cuando el placer rápido desplaza la energía que necesitabas para objetivos más largos. Por eso la atención paga el precio de la velocidad.",
  "La repetición fija caminos de respuesta; cada uso enseña al cerebro qué hacer cuando aparece cierta emoción o cierto contexto. La ruta fácil gana terreno a la paciencia necesaria.",
  "Lo que practicas en privado no se queda aislado: la plasticidad convierte esa práctica en una ruta más accesible la próxima vez. La ruta fácil gana terreno a la paciencia necesaria.",
  "Un comportamiento repetido deja de ser una excepción y pasa a ser un patrón preferente, incluso cuando ya no te conviene. La ruta fácil gana terreno a la paciencia necesaria.",
  "La mente aprende por insistencia, no por promesas; por eso un acto repetido puede ganar fuerza aunque en teoría lo desapruebes. La ruta fácil gana terreno a la paciencia necesaria.",
  "Cada repetición reduce un poco la sorpresa y aumenta la facilidad con la que la conducta vuelve a activarse. La ruta fácil gana terreno a la paciencia necesaria.",
  "La saturación puede restar valor a los placeres simples; una conversación tranquila, una caminata o una tarea bien hecha pueden parecer menos estimulantes. Lo simple pierde brillo cuando todo compite a gritos.",
  "Cuando el cerebro se acostumbra a excitación alta, los placeres cotidianos pierden contraste y necesitan más tiempo para recuperar su lugar. Lo simple pierde brillo cuando todo compite a gritos.",
  "No es que lo simple se vuelva inútil; es que el sistema, temporalmente, ha sido entrenado para subestimar lo sereno. Lo simple pierde brillo cuando todo compite a gritos.",
  "Un hábito de alta intensidad puede volver menos visibles los beneficios de descansar, concentrarse y disfrutar sin sobresaltos. Lo simple pierde brillo cuando todo compite a gritos.",
  "Si todo lo valioso tiene que competir con un estímulo exagerado, la vida ordinaria acaba pareciendo más pobre de lo que es. Lo simple pierde brillo cuando todo compite a gritos.",
  "El condicionamiento hace que el contexto dispare la conducta; no solo recuerdas la imagen, también recuerdas el momento, el dispositivo y la emoción asociada. Las señales del entorno terminan empujando la conducta.",
  "A veces el disparador no es el deseo en sí, sino la combinación de sitio, hora y estado mental que el cerebro ya aprendió a leer. Las señales del entorno terminan empujando la conducta.",
  "El entorno se vuelve un mapa de señales: lo que parecía casual acaba cargado de asociaciones que empujan hacia el mismo resultado. Las señales del entorno terminan empujando la conducta.",
  "Si el cerebro reconoce un patrón familiar, puede anticipar la recompensa antes de que aparezca la reflexión. Las señales del entorno terminan empujando la conducta.",
  "La conducta repetida no solo vive dentro de ti; también se engancha a lugares, rutinas y sensaciones que luego la reactivan. Las señales del entorno terminan empujando la conducta.",
  "La disponibilidad continua debilita la resistencia; cuando algo está siempre a un gesto de distancia, decir que no exige más deliberación. La facilidad de acceso debilita la resistencia cotidiana.",
  "La fricción mínima no es neutral: facilita la repetición y convierte la tentación en una opción demasiado fácil de ejecutar. La facilidad de acceso debilita la resistencia cotidiana.",
  "Cuanto más inmediato es el acceso, más trabajo necesita la voluntad para no seguir el camino ya preparado. La facilidad de acceso debilita la resistencia cotidiana.",
  "La abundancia de acceso puede engañar al cerebro con una falsa sensación de control, aunque en realidad aumente la exposición al hábito. La facilidad de acceso debilita la resistencia cotidiana.",
  "Si la puerta está siempre abierta, la fuerza de cerrar no depende solo del deseo sino también del cansancio acumulado. La facilidad de acceso debilita la resistencia cotidiana. Relaciones humanas",
  "La cosificación reduce a la otra persona a una función; cuando eso ocurre, desaparecen la historia, la voz y la complejidad que la vuelven humana. Y eso empobrece la empatía que sostiene un vínculo.",
  "Si alguien se convierte en medio para excitarte, la relación pierde reciprocidad y gana distancia emocional. Y eso empobrece la empatía que sostiene un vínculo.",
  "Mirar a una persona como objeto de consumo entrena una manera pobre de percibir límites, necesidades y dignidad. Y eso empobrece la empatía que sostiene un vínculo.",
  "La despersonalización no siempre se nota en el momento; a veces se filtra después en cómo interpretas cuerpos y gestos reales. Y eso empobrece la empatía que sostiene un vínculo.",
  "Cuando el valor de alguien se mide por utilidad erótica, la empatía queda en segundo plano y la conexión se empobrece. Y eso empobrece la empatía que sostiene un vínculo.",
  "Las expectativas irreales dificultan aceptar la realidad humana; una relación real incluye pausas, diferencias, dudas y negociación. La otra persona deja de sentirse completa y única.",
  "Si tu referencia principal son escenas construidas para impresionar, la vida compartida puede parecer menos intensa sin ser menos valiosa. La otra persona deja de sentirse completa y única.",
  "El problema no es desear más; el problema aparece cuando lo esperado está modelado por ficción, edición y rendimiento. La otra persona deja de sentirse completa y única.",
  "La comparación constante con fantasías prefabricadas puede convertir la imperfección normal en una decepción injusta. La otra persona deja de sentirse completa y única.",
  "Aceptar a una persona real exige paciencia con lo no ideal, y eso se entrena peor cuando solo has practicado consumo rápido. La otra persona deja de sentirse completa y única.",
  "La intimidad auténtica necesita tiempo y reciprocidad; no nace de la inmediatez, sino de la construcción compartida. Aceptar la realidad requiere más madurez que consumir fantasías.",
  "Una relación se profundiza cuando dos personas se ven de verdad, no cuando una mira y la otra desaparece como sujeto. Aceptar la realidad requiere más madurez que consumir fantasías.",
  "La cercanía humana implica ritmo, confianza y una memoria común que no puede comprimirse en un consumo instantáneo. Aceptar la realidad requiere más madurez que consumir fantasías.",
  "Si todo vínculo se mide por estímulo, se pierde la parte lenta que sostiene una unión durable. Aceptar la realidad requiere más madurez que consumir fantasías.",
  "La intimidad no es intensidad sin pausa; es presencia sostenida que permite conocerse sin máscaras constantes. Aceptar la realidad requiere más madurez que consumir fantasías.",
  "La vulnerabilidad es parte del vínculo real; mostrarte tal como eres permite que el otro te encuentre, no solo que te observe. La confianza no florece donde solo hay control.",
  "Cuando evitas cualquier exposición emocional, te proteges del rechazo pero también bloqueas la posibilidad de una relación profunda. La confianza no florece donde solo hay control.",
  "La práctica del consumo aislado puede acostumbrarte a no depender de nadie, y eso a veces termina pareciendo fortaleza cuando en realidad es aislamiento. La confianza no florece donde solo hay control.",
  "La cercanía afectiva requiere aceptar cierto riesgo, y ese riesgo no existe en la lógica del consumo controlado. La confianza no florece donde solo hay control.",
  "Si nunca te permites ser visto de forma incompleta, te quedas sin la experiencia de confianza que hace posible el amor. La confianza no florece donde solo hay control.",
  "La empatía disminuye cuando entrenas la mirada extractiva; empiezas a notar antes lo que obtienes que lo que la otra persona siente. La reciprocidad desaparece cuando todo gira en torno al impulso.",
  "Un hábito de consumo puede volver más fácil evaluar cuerpos que comprender personas. La reciprocidad desaparece cuando todo gira en torno al impulso.",
  "La sensibilidad a la experiencia ajena se debilita si la repetición te enseña a mirar para tomar y no para reconocer. La reciprocidad desaparece cuando todo gira en torno al impulso.",
  "Cuanto más automática es la extracción de estímulo, menos espacio queda para interesarte por la subjetividad del otro. La reciprocidad desaparece cuando todo gira en torno al impulso.",
  "La empatía exige salir de tu circuito; el consumo insistente, en cambio, te devuelve una y otra vez al mismo centro. La reciprocidad desaparece cuando todo gira en torno al impulso.",
  "La confianza se construye con constancia, no con fantasía; por eso los vínculos reales se sostienen en gestos repetidos y no en picos ocasionales. Sin presencia emocional, la cercanía se vuelve superficial.",
  "La seguridad emocional nace de la fiabilidad cotidiana, algo muy distinto al brillo rápido de una experiencia privada. Sin presencia emocional, la cercanía se vuelve superficial.",
  "Si te acostumbras a una relación sin riesgo ni respuesta, luego puede costarte tolerar la vulnerabilidad que hace posible confiar. Sin presencia emocional, la cercanía se vuelve superficial.",
  "La confianza necesita que la otra persona exista por completo, no como estímulo disponible según tu conveniencia. Sin presencia emocional, la cercanía se vuelve superficial.",
  "Confiar implica exponerse al tiempo compartido, y el hábito de consumo tiende a preferir control antes que reciprocidad. Sin presencia emocional, la cercanía se vuelve superficial.",
  "La conexión emocional no se reemplaza con estimulación; una descarga intensa no equivale a sentirse comprendido ni acompañado. El amor necesita riesgo, no solo estímulo administrado.",
  "Puedes estar muy activado y, al mismo tiempo, profundamente desconectado de lo humano que necesitas. El amor necesita riesgo, no solo estímulo administrado.",
  "La intensidad sensorial no resuelve soledad, vergüenza o vacío; a veces solo las cubre por un rato. El amor necesita riesgo, no solo estímulo administrado.",
  "Cuando confundes excitación con vínculo, corres el riesgo de pasar por alto la necesidad real de cercanía y cuidado. El amor necesita riesgo, no solo estímulo administrado.",
  "La vida afectiva no se mide por la intensidad del impulso, sino por la calidad del encuentro que permanece después. El amor necesita riesgo, no solo estímulo administrado.",
  "Amor y consumo responden a lógicas opuestas; uno busca bien compartido y el otro busca satisfacción privada. Los límites ajenos sostienen la dignidad del encuentro.",
  "El amor acepta límites, tiempos y acuerdos; el consumo intenta saltarse esas mediaciones para llegar directo al impacto. Los límites ajenos sostienen la dignidad del encuentro.",
  "Cuando tratas el deseo como compra, te alejas de la paciencia y la responsabilidad que requieren las relaciones humanas. Los límites ajenos sostienen la dignidad del encuentro.",
  "La diferencia entre amar y consumir no está solo en la conducta visible, sino en la forma de mirar al otro. Los límites ajenos sostienen la dignidad del encuentro.",
  "Si tu entrenamiento emocional gira alrededor de tomar sin responder, después te costará habitar una relación recíproca. Los límites ajenos sostienen la dignidad del encuentro.",
  "Los límites ajenos son esenciales para el respeto; sin esa frontera, el vínculo se convierte en invasión o en uso. La mirada humana se entrena con respeto, no con uso.",
  "Aprender a no cruzar límites en la imaginación también moldea cómo actúas fuera de ella. La mirada humana se entrena con respeto, no con uso.",
  "La lógica del consumo suele ignorar el consentimiento emocional, aunque en la vida real ese consentimiento sea central. La mirada humana se entrena con respeto, no con uso.",
  "Respetar al otro empieza por reconocer que no está para satisfacerte automáticamente. La mirada humana se entrena con respeto, no con uso.",
  "Un entorno que normaliza la disponibilidad total entrena mal para tratar a las personas como sujetos libres. La mirada humana se entrena con respeto, no con uso.",
  "La presencia real vale más que la versión editada de una persona; lo humano aparece con imperfecciones, silencios y tiempos propios. La relación real pide tiempo, no solo intensidad.",
  "Lo que ves en pantalla suele estar recortado para funcionar, no para representar una relación viva. La relación real pide tiempo, no solo intensidad.",
  "Aprender a querer lo no editado es una ventaja afectiva que el consumo rápido puede erosionar. La relación real pide tiempo, no solo intensidad.",
  "La realidad relacional no ofrece montaje; ofrece encuentro, y eso exige una mirada más madura. La relación real pide tiempo, no solo intensidad.",
  "Cuando te acostumbras a versiones sin asperezas, la vida compartida puede parecer injustamente lenta aunque sea más verdadera. La relación real pide tiempo, no solo intensidad. Industria pornográfica",
  "El modelo de negocio premia la retención, no tu bienestar; cuanto más tiempo pases dentro, más valor extrae la plataforma. La lógica comercial convierte tu permanencia en beneficio medible.",
  "Si una empresa gana cuando vuelves una vez más, tiene incentivos para diseñar una experiencia que no te deje ir. La lógica comercial convierte tu permanencia en beneficio medible.",
  "La lógica comercial no necesita odiarte; le basta con convertir tu permanencia en una métrica útil. La lógica comercial convierte tu permanencia en beneficio medible.",
  "Tu incomodidad no es un fallo del sistema, a veces es parte de su éxito financiero. La lógica comercial convierte tu permanencia en beneficio medible.",
  "Cuando la retención manda, la prioridad deja de ser la salud del usuario y pasa a ser la continuidad del consumo. La lógica comercial convierte tu permanencia en beneficio medible.",
  "Los algoritmos aprenden tus vulnerabilidades de consumo y las traducen en secuencias más eficaces para mantenerte conectado. La personalización refuerza la captura justo donde más respondes.",
  "No hace falta que conozcan tu biografía completa; basta con que detecten qué te detiene y qué te hace seguir. La personalización refuerza la captura justo donde más respondes.",
  "La personalización comercial puede parecer comodidad, pero también intensifica la probabilidad de repetición. La personalización refuerza la captura justo donde más respondes.",
  "Cuando el sistema entiende tus patrones, puede empujar justo donde tu resistencia es más baja. La personalización refuerza la captura justo donde más respondes.",
  "La máquina no necesita persuadirte con argumentos; aprende a estimular tus zonas de mayor arrastre. La personalización refuerza la captura justo donde más respondes.",
  "La sexualidad se mercantiliza cuando todo se convierte en producto; en ese marco, la dignidad compite con la rentabilidad. Cuando todo es producto, la dignidad queda subordinada.",
  "Cuando el deseo se empaqueta para venderse mejor, la persona queda subordinada al formato comercial. Cuando todo es producto, la dignidad queda subordinada.",
  "El mercado no conoce la ternura; conoce segmentos, conversiones y rendimiento. Cuando todo es producto, la dignidad queda subordinada.",
  "Convertir la intimidad en mercancía empobrece la idea de cuerpo, vínculo y presencia. Cuando todo es producto, la dignidad queda subordinada.",
  "Si el valor depende del precio, lo humano corre el riesgo de medirse con una regla demasiado pequeña. Cuando todo es producto, la dignidad queda subordinada.",
  "La explotación puede esconderse tras apariencia de elección libre; no toda decisión ocurre en igualdad de condiciones. La apariencia de libertad puede ocultar asimetrías muy reales.",
  "A veces hay precariedad, necesidad o presión detrás de lo que desde fuera parece simple consentimiento económico. La apariencia de libertad puede ocultar asimetrías muy reales.",
  "La pantalla suaviza la distancia entre quien consume y quien carga el coste real. La apariencia de libertad puede ocultar asimetrías muy reales.",
  "No todo lo que está disponible está libre de asimetrías de poder. La apariencia de libertad puede ocultar asimetrías muy reales.",
  "La industria puede vender autonomía mientras se beneficia de contextos donde otras opciones son mucho más débiles. La apariencia de libertad puede ocultar asimetrías muy reales.",
  "La manipulación comercial busca reducir tu fricción interna; cuanto menos tengas que pensar, más fácil resulta que vuelvas. Menos fricción significa más probabilidad de repetir la conducta.",
  "Si la navegación está diseñada para ser casi automática, la decisión deja de sentirse como decisión. Menos fricción significa más probabilidad de repetir la conducta.",
  "La comodidad no siempre es inocente: puede ser un mecanismo muy refinado de captura. Menos fricción significa más probabilidad de repetir la conducta.",
  "Cuando todo está hecho para que continúes sin pausa, tu capacidad de interrupción se vuelve más valiosa. Menos fricción significa más probabilidad de repetir la conducta.",
  "Una experiencia sin obstáculos puede parecer amable aunque esté orientada a debilitar tu distancia crítica. Menos fricción significa más probabilidad de repetir la conducta.",
  "El negocio funciona mejor cuando siempre parece haber algo más: otra escena, otra búsqueda, otra promesa de novedad. La siguiente novedad alimenta un negocio que nunca se sacia.",
  "La sensación de abundancia puede transformarse en insatisfacción estructural, que es precisamente lo que alimenta la continuidad. La siguiente novedad alimenta un negocio que nunca se sacia.",
  "Nunca saciar del todo es una estrategia rentable porque mantiene el deseo en movimiento. La siguiente novedad alimenta un negocio que nunca se sacia.",
  "La lógica de lo 'siguiente' convierte el consumo en una escalera que rara vez termina. La siguiente novedad alimenta un negocio que nunca se sacia.",
  "Si la oferta se renueva sin fin, el usuario puede empezar a perseguir la próxima opción en vez de preguntarse por qué sigue allí. La siguiente novedad alimenta un negocio que nunca se sacia.",
  "La industria externaliza el coste emocional y social; quien obtiene beneficio no siempre asume el desgaste que deja en el usuario. El coste humano suele quedar fuera de la interfaz.",
  "Lo que se monetiza en un lado puede traducirse en aislamiento, confusión o dependencia en otro. El coste humano suele quedar fuera de la interfaz.",
  "El precio real no siempre aparece en la interfaz, pero sí en los hábitos que se consolidan después. El coste humano suele quedar fuera de la interfaz.",
  "La ganancia privada puede coexistir con pérdidas dispersas que nadie registra de forma visible. El coste humano suele quedar fuera de la interfaz.",
  "Cuando una actividad rentable normaliza el desgaste, el daño tiende a volverse invisible precisamente porque está repartido. El coste humano suele quedar fuera de la interfaz.",
  "Las métricas empujan a intensificar lo que retiene; si una fórmula funciona, el sistema la amplifica hasta volverla dominante. La métrica empuja a intensificar lo que retiene más.",
  "Lo que mide tiempo de pantalla acaba incentivando contenido más adictivo, no necesariamente más humano. La métrica empuja a intensificar lo que retiene más.",
  "El bucle comercial premia la escalada de estímulos porque responde a indicadores de interacción. La métrica empuja a intensificar lo que retiene más.",
  "Una plataforma no necesita comprender tu bienestar para optimizar el recorrido que maximiza permanencia. La métrica empuja a intensificar lo que retiene más.",
  "El problema no es solo lo que ves, sino el tipo de optimización que decide qué aparece más. La métrica empuja a intensificar lo que retiene más.",
  "La relación entre oferta y deseo no es neutral; cuanto más repetida es la exposición, más fácil resulta confundir hábito con preferencia. La oferta moldea el deseo más de lo que parece.",
  "El mercado puede fabricar familiaridad y luego venderla como elección personal. La oferta moldea el deseo más de lo que parece.",
  "No siempre deseas primero y consumes después; a veces consumes tanto que el deseo se ajusta a lo ofrecido. La oferta moldea el deseo más de lo que parece.",
  "La oferta moldea el mapa mental de lo posible mucho más de lo que solemos admitir. La oferta moldea el deseo más de lo que parece.",
  "Cuando la disponibilidad dirige la preferencia, conviene preguntarse cuánta de tu elección nació de ti y cuánta del entorno. La oferta moldea el deseo más de lo que parece.",
  "La pantalla oculta la complejidad humana detrás del intercambio; lo visible parece limpio, pero la cadena alrededor puede ser larga. La pantalla simplifica; la realidad detrás sigue ahí.",
  "Ves un resultado, no siempre el contexto que lo hizo posible. La pantalla simplifica; la realidad detrás sigue ahí.",
  "La distancia tecnológica puede anestesiar preguntas sobre poder, consentimiento y coste humano. La pantalla simplifica; la realidad detrás sigue ahí.",
  "Cuando todo se reduce a acceso, es fácil olvidar la historia que hace que algo exista. La pantalla simplifica; la realidad detrás sigue ahí.",
  "La interfaz simplifica; la realidad detrás suele ser mucho menos cómoda. La pantalla simplifica; la realidad detrás sigue ahí. Desarrollo personal",
  "El autocontrol amplía tu margen de elección; no te vuelve rígido, te vuelve más libre para decidir con criterio. Eso protege tu futuro cuando el presente quiere distraerte.",
  "Cada vez que resistes una urgencia que no te conviene, recuperas un poco de soberanía sobre tu agenda mental. Eso protege tu futuro cuando el presente quiere distraerte.",
  "La capacidad de esperar no es pasividad; es una forma de poder interior. Eso protege tu futuro cuando el presente quiere distraerte.",
  "Quien puede tolerar una incomodidad breve suele tener más espacio para construir algo duradero. Eso protege tu futuro cuando el presente quiere distraerte.",
  "El impulso manda menos cuando entrenas la habilidad de no obedecerlo de inmediato. Eso protege tu futuro cuando el presente quiere distraerte.",
  "La disciplina protege tu energía para lo que importa; si la gastas toda en alivios breves, luego falta para metas serias. La soberanía interior crece con cada renuncia consciente.",
  "No se trata de dureza vacía, sino de asignar recursos limitados a objetivos con sentido. La soberanía interior crece con cada renuncia consciente.",
  "La energía que no se dispersa en hábitos reactivos se vuelve disponible para estudio, trabajo y vínculos. La soberanía interior crece con cada renuncia consciente.",
  "La disciplina no roba vida: evita que la vida se te escape por rendijas pequeñas y repetidas. La soberanía interior crece con cada renuncia consciente.",
  "Ordenar tu conducta ayuda a que tu atención no quede secuestrada por la urgencia del momento. La soberanía interior crece con cada renuncia consciente.",
  "Tu identidad se consolida por repetición; lo que haces a menudo acaba pareciendo más 'tú' que lo que solo dices. La repetición privada acaba moldeando tu identidad pública.",
  "Un hábito privado no es insignificante: también educa la historia que te cuentas sobre quién eres. La repetición privada acaba moldeando tu identidad pública.",
  "La identidad se vuelve más firme cuando tus actos diarios sostienen la imagen que quieres respetar. La repetición privada acaba moldeando tu identidad pública.",
  "No te defines por una intención aislada, sino por el patrón que repites cuando nadie te vigila. La repetición privada acaba moldeando tu identidad pública.",
  "Si repites algo que contradice tu mejor versión, la identidad termina tensándose por dentro. La repetición privada acaba moldeando tu identidad pública.",
  "La integridad reduce la fractura interna; vivir de forma coherente gasta menos energía que justificarte sin parar. La coherencia ahorra la energía que gasta la doble vida.",
  "Cuando valor y conducta se alinean, la conciencia descansa mejor. La coherencia ahorra la energía que gasta la doble vida.",
  "La parte de ti que sabe lo que importa deja de pelear tanto con la parte que busca una salida fácil. La coherencia ahorra la energía que gasta la doble vida.",
  "Ser íntegro no significa no fallar, sino no construir una vida partida en dos. La coherencia ahorra la energía que gasta la doble vida.",
  "La coherencia da una paz más estable que la satisfacción momentánea de ocultar lo que haces. La coherencia ahorra la energía que gasta la doble vida.",
  "La fortaleza mental crece al tolerar incomodidad; la urgencia pierde fuerza cuando descubres que no necesitas obedecerla siempre. Tolerar malestar te hace menos gobernable por el impulso.",
  "Sostener un malestar sin anestesiarlo de inmediato te vuelve más capaz de enfrentar retos más grandes. Tolerar malestar te hace menos gobernable por el impulso.",
  "La resistencia no nace del castigo, sino de la práctica de permanecer contigo mismo sin huir tan rápido. Tolerar malestar te hace menos gobernable por el impulso.",
  "Cada momento en que no corres al escape fortalece una calma más robusta y menos frágil. Tolerar malestar te hace menos gobernable por el impulso.",
  "La mente se hace más fuerte cuando aprende que el malestar es manejable y no una orden. Tolerar malestar te hace menos gobernable por el impulso.",
  "La libertad frente al impulso se entrena; no aparece por decreto, sino por práctica repetida de pausa y decisión. La pausa entrena un espacio donde puede entrar la elección.",
  "Entre sentir algo y actuar por ello hay un espacio que puede crecer con disciplina. La pausa entrena un espacio donde puede entrar la elección.",
  "No eres menos humano por tener impulsos; eres más libre cuando aprendes a no ser gobernado por ellos. La pausa entrena un espacio donde puede entrar la elección.",
  "La capacidad de detenerte un instante es una habilidad política de tu propia vida interior. La pausa entrena un espacio donde puede entrar la elección.",
  "Cuanto más practicas la pausa, menos automático se vuelve el gesto que antes parecía inevitable. La pausa entrena un espacio donde puede entrar la elección.",
  "El propósito compite con el alivio fácil; uno pide dirección y constancia, el otro solo pide que salgas del malestar ya. El significado sostiene lo que el alivio rápido debilita.",
  "Cuando eliges significado en lugar de escape, tus días se organizan alrededor de algo más grande que una urgencia momentánea. El significado sostiene lo que el alivio rápido debilita.",
  "La vida con propósito tolera mejor la incomodidad porque sabe para qué la soporta. El significado sostiene lo que el alivio rápido debilita.",
  "El alivio instantáneo cierra preguntas; el propósito las sostiene hasta encontrar una respuesta útil. El significado sostiene lo que el alivio rápido debilita.",
  "Si tu horizonte es claro, es más fácil decir no a lo que te distrae aunque resulte tentador. El significado sostiene lo que el alivio rápido debilita.",
  "El crecimiento personal suele verse como renuncia; muchas veces avanzar implica dejar de alimentar una costumbre que te daba salida rápida. Crecer suele sentirse como dejar atrás una comodidad vieja.",
  "Madurar no siempre se siente brillante: a veces parece simplemente dejar de repetir lo que te empequeñece. Crecer suele sentirse como dejar atrás una comodidad vieja.",
  "La parte más difícil de crecer no es aprender algo nuevo, sino abandonar lo que ya conocías. Crecer suele sentirse como dejar atrás una comodidad vieja.",
  "Una vida mejor suele exigir pequeñas pérdidas voluntarias antes de ofrecer beneficios más profundos. Crecer suele sentirse como dejar atrás una comodidad vieja.",
  "El progreso auténtico cambia tu relación con la incomodidad, no solo tu entusiasmo momentáneo. Crecer suele sentirse como dejar atrás una comodidad vieja.",
  "La constancia pesa más que la inspiración; avanzar depende más de hábitos estables que de picos de ánimo. La constancia da forma a lo que la inspiración solo inicia.",
  "Si solo actúas cuando te sientes motivado, cedes demasiado poder al clima emocional del día. La constancia da forma a lo que la inspiración solo inicia.",
  "La repetición deliberada convierte un valor en conducta y no solo en declaración. La constancia da forma a lo que la inspiración solo inicia.",
  "La disciplina cotidiana es menos vistosa que la inspiración, pero suele dejar un resultado más sólido. La constancia da forma a lo que la inspiración solo inicia.",
  "La confianza en ti mismo crece cuando cumples lo que dijiste incluso en días poco brillantes. La constancia da forma a lo que la inspiración solo inicia.",
  "La soberanía interior se construye con límites; decir 'hasta aquí' también es una forma de cuidado. Los límites bien elegidos ordenan la vida sin encogerla.",
  "No todo límite resta libertad: muchos protegen el espacio donde tu vida puede crecer sin ruido. Los límites bien elegidos ordenan la vida sin encogerla.",
  "Un límite claro reduce negociación interna y libera energía para lo importante. Los límites bien elegidos ordenan la vida sin encogerla.",
  "Saber renunciar a una tentación pequeña a tiempo puede evitar una pérdida mucho mayor después. Los límites bien elegidos ordenan la vida sin encogerla.",
  "La capacidad de marcar fronteras con tus impulsos hace que tu vida dependa menos del accidente. Los límites bien elegidos ordenan la vida sin encogerla. Coste de oportunidad",
  "El tiempo perdido suele salir disfrazado de descanso; a veces no notas la fuga hasta que el día ya no vuelve. Y el tiempo no vuelve cuando ya se ha evaporado.",
  "Una pausa breve puede convertirse en un desvío largo si se repite sin intención. Y el tiempo no vuelve cuando ya se ha evaporado.",
  "No todo lo que te detiene te repara; a veces solo te desconecta de lo que querías hacer. Y el tiempo no vuelve cuando ya se ha evaporado.",
  "El coste temporal rara vez es una sola sesión: suele extenderse en forma de demora y desorden. Y el tiempo no vuelve cuando ya se ha evaporado.",
  "Cuando el hábito ocupa huecos que antes usabas para avanzar, el reloj trabaja en tu contra aunque parezca silencioso. Y el tiempo no vuelve cuando ya se ha evaporado.",
  "La energía mental que se gasta no siempre se ve, pero su ausencia se nota cuando intentas estudiar, crear o resolver algo serio. El cansancio invisible aparece justo cuando más necesitas rendir.",
  "Puedes terminar una sesión sin haber corrido un maratón y aun así sentir la cabeza menos disponible. El cansancio invisible aparece justo cuando más necesitas rendir.",
  "El consumo repetido drena atención, iniciativa y paciencia, incluso si el cuerpo parece seguir intacto. El cansancio invisible aparece justo cuando más necesitas rendir.",
  "El verdadero desgaste a menudo aparece después, cuando descubres que te cuesta volver al trabajo profundo. El cansancio invisible aparece justo cuando más necesitas rendir.",
  "La fatiga invisible también cuenta, porque afecta a lo que puedes sostener con calidad. El cansancio invisible aparece justo cuando más necesitas rendir.",
  "Cada interrupción tiene un precio de reinicio; volver al punto de concentración consume más que seguir de largo. Recuperar el hilo cuesta más que seguir avanzando.",
  "El problema no es solo parar, sino el costo de recuperar el hilo mental perdido. Recuperar el hilo cuesta más que seguir avanzando.",
  "Un corte breve puede robarte más productividad de la que su duración sugiere. Recuperar el hilo cuesta más que seguir avanzando.",
  "La mente tarda en volver a la profundidad que había construido antes del desvío. Recuperar el hilo cuesta más que seguir avanzando.",
  "Cuando multiplicas pequeños cortes, el trabajo serio se vuelve más fragmentado y menos eficiente. Recuperar el hilo cuesta más que seguir avanzando.",
  "Las metas retrasadas acumulan frustración; lo aplazado no desaparece, solo se convierte en presión futura. La demora se acumula hasta parecer parte de tu identidad.",
  "Lo que hoy parece una excusa pequeña mañana puede ser la razón por la que te sientes estancado. La demora se acumula hasta parecer parte de tu identidad.",
  "Los hábitos que prometen alivio rápido suelen cobrar intereses en forma de objetivos pospuestos. La demora se acumula hasta parecer parte de tu identidad.",
  "Cada demora repetida modifica la relación emocional con tus propios proyectos. La demora se acumula hasta parecer parte de tu identidad.",
  "Cuando una conducta compite con tus metas, el retraso no es abstracto: se vuelve parte de tu biografía. La demora se acumula hasta parecer parte de tu identidad.",
  "El rendimiento académico depende de continuidad; aprender necesita continuidad más que fogonazos de esfuerzo. La concentración se deteriora antes de que el calendario grite.",
  "Si te dispersas con frecuencia, las ideas no llegan a consolidarse con la profundidad que requieren. La concentración se deteriora antes de que el calendario grite.",
  "La memoria y la comprensión agradecen menos interrupciones y más presencia sostenida. La concentración se deteriora antes de que el calendario grite.",
  "Un hábito que roba horas y foco no solo quita tiempo, también debilita la calidad del estudio. La concentración se deteriora antes de que el calendario grite.",
  "La excelencia académica suele parecer aburrida desde fuera porque se apoya en constancia, no en impulsos. La concentración se deteriora antes de que el calendario grite.",
  "La productividad cae cuando la atención se vuelve intermitente; alternar entre impulso y tarea deja menos trabajo terminado. La mente dividida produce más ruido que resultados.",
  "La mente dispersa confunde actividad con avance, pero no siempre son lo mismo. La mente dividida produce más ruido que resultados.",
  "Cuanto más fragmentado queda el día, más cuesta producir algo que tenga profundidad. La mente dividida produce más ruido que resultados.",
  "Un hábito que interrumpe el ritmo hace que todo lo demás requiera más esfuerzo para arrancar. La mente dividida produce más ruido que resultados.",
  "La sensación de estar ocupado puede ocultar un descenso real en la calidad de lo que construyes. La mente dividida produce más ruido que resultados.",
  "El aprendizaje necesita una mente disponible; si entras a clase o a estudiar arrastrando ruido mental, captas menos de lo que crees. Aprender bien exige una atención que no se rompa tanto.",
  "Aprender bien no consiste solo en sentarte, sino en llegar con atención íntegra. Aprender bien exige una atención que no se rompa tanto.",
  "El hábito compulsivo roba disponibilidad cognitiva antes incluso de robar horas visibles. Aprender bien exige una atención que no se rompa tanto.",
  "La mente saturada procesa peor, recuerda peor y conecta peor las ideas. Aprender bien exige una atención que no se rompa tanto.",
  "Cuando el cerebro está ocupado en buscar recompensa rápida, deja menos recursos para comprender algo complejo. Aprender bien exige una atención que no se rompa tanto.",
  "La creatividad requiere vacío y no solo estímulo; las ideas nuevas suelen aparecer cuando dejas de bombardearte constantemente. La creatividad necesita huecos que el estímulo rápido coloniza.",
  "Si llenas cada pausa con contenido rápido, reduces el espacio donde surge una solución original. La creatividad necesita huecos que el estímulo rápido coloniza.",
  "La imaginación trabaja mejor cuando no está compitiendo con una secuencia interminable de impactos. La creatividad necesita huecos que el estímulo rápido coloniza.",
  "A veces la mejor inversión para crear es tolerar un rato de silencio sin buscar escape inmediato. La creatividad necesita huecos que el estímulo rápido coloniza.",
  "La mente creativa necesita margen para combinar, no solo para reaccionar. La creatividad necesita huecos que el estímulo rápido coloniza.",
  "Las oportunidades pasan por la calidad de tus hábitos; lo que repites hoy influye en la versión de ti que mañana podrá responder. Tus oportunidades responden a los hábitos que sostienes hoy.",
  "No siempre pierdes una oportunidad por falta de talento; a veces la pierdes por agotamiento o dispersión acumulada. Tus oportunidades responden a los hábitos que sostienes hoy.",
  "La puerta que más se abre suele favorecer a quien conserva energía y enfoque. Tus oportunidades responden a los hábitos que sostienes hoy.",
  "Un hábito que consume tus mejores horas puede estar negociando en silencio con tus posibilidades futuras. Tus oportunidades responden a los hábitos que sostienes hoy.",
  "La suerte ayuda, pero llega mejor a una persona que todavía tiene capacidad de aprovecharla. Tus oportunidades responden a los hábitos que sostienes hoy.",
  "El coste no es solo inmediato, sino acumulativo; lo pequeño repetido acaba teniendo más peso que lo dramático pero aislado. Lo acumulado pesa más que cualquier episodio aislado.",
  "Mucho daño cotidiano entra por suma, no por golpe. Lo acumulado pesa más que cualquier episodio aislado.",
  "La pérdida de foco, sueño, energía y ambición puede ir creciendo sin un gran aviso final. Lo acumulado pesa más que cualquier episodio aislado.",
  "Lo acumulativo es difícil de notar precisamente porque no se presenta como catástrofe. Lo acumulado pesa más que cualquier episodio aislado.",
  "Un hábito que parece breve puede alterar de forma persistente tu disponibilidad para vivir y trabajar mejor. Lo acumulado pesa más que cualquier episodio aislado. Reflexión moral (no religiosa)",
  "La dignidad humana pide no reducirte ni reducir al otro; tratarse como sujeto, no como cosa, es una exigencia ética básica. Esa práctica deja huella en cómo te miras y miras.",
  "Cuando respetas la dignidad, el deseo no desaparece, pero deja de gobernar la forma en que miras. Esa práctica deja huella en cómo te miras y miras.",
  "La ética empieza donde termina la disposición a usar a alguien para tu alivio. Esa práctica deja huella en cómo te miras y miras.",
  "Reconocer dignidad implica admitir que el otro no existe para satisfacer tus impulsos. Esa práctica deja huella en cómo te miras y miras.",
  "La vida moral mejora cuando recuerdas que ninguna excitación justifica despersonalizar a una persona. Esa práctica deja huella en cómo te miras y miras.",
  "El respeto a uno mismo también se expresa en hábitos privados; lo que haces cuando nadie ve enseña cuánto valor te das. La verdad propia limpia más que la excusa elegante.",
  "Tu trato interior puede volverse más duro o más cuidado según lo que permitas repetidamente. La verdad propia limpia más que la excusa elegante.",
  "La autoestimación no se declara: se practica en lo que decides tolerar de ti mismo. La verdad propia limpia más que la excusa elegante.",
  "Cuidarte incluye no convertir en normal aquello que sabes que te degrada. La verdad propia limpia más que la excusa elegante.",
  "Si te tratas con descuido en secreto, tarde o temprano eso afecta la forma en que te presentas al mundo. La verdad propia limpia más que la excusa elegante.",
  "La honestidad personal exige mirar sin maquillaje; nombrar el hábito tal como es deja menos espacio para la autoexcusa. La coherencia da una paz que la culpa no compra.",
  "El autoengaño puede protegerte del malestar inmediato, pero te quita claridad para cambiar. La coherencia da una paz que la culpa no compra.",
  "Ser sincero contigo mismo no siempre resulta cómodo, aunque sí resulta liberador. La coherencia da una paz que la culpa no compra.",
  "La verdad sobre tu conducta no necesita dramatismo; necesita precisión. La coherencia da una paz que la culpa no compra.",
  "Una conciencia clara suele doler menos a largo plazo que una explicación elegante de lo que no quieres ver. La coherencia da una paz que la culpa no compra.",
  "La coherencia entre valores y acciones sostiene el carácter; vivir dividido desgasta mucho más que equivocarse y corregir. El respeto empieza en la imaginación antes de llegar al gesto.",
  "No basta con pensar bien de una manera si luego actúas de otra de forma repetida. El respeto empieza en la imaginación antes de llegar al gesto.",
  "La integridad tiene un costo, pero la incoherencia también lo tiene, y suele pagarse en forma de ruido interno. El respeto empieza en la imaginación antes de llegar al gesto.",
  "Cuando tus actos confirman tus principios, tu vida se vuelve más habitable. El respeto empieza en la imaginación antes de llegar al gesto.",
  "El carácter no es pureza; es la voluntad de no traicionarte por comodidad. El respeto empieza en la imaginación antes de llegar al gesto.",
  "La responsabilidad implica asumir el efecto de tus elecciones; tus hábitos no solo hablan de ti, también afectan tu atención y tus relaciones. Asumir consecuencias es parte de tratar a otros con seriedad.",
  "No eres culpable de todo, pero sí respondes por lo que decides repetir. Asumir consecuencias es parte de tratar a otros con seriedad.",
  "Asumir responsabilidad no es castigarte; es dejar de fingir que el hábito ocurre fuera de tu control. Asumir consecuencias es parte de tratar a otros con seriedad.",
  "La madurez ética empieza cuando aceptas que tus decisiones forman parte del mundo que compartes. Asumir consecuencias es parte de tratar a otros con seriedad.",
  "Tomar en serio tus actos es una forma de respeto hacia quienes conviven con sus consecuencias. Asumir consecuencias es parte de tratar a otros con seriedad.",
  "El respeto a los demás empieza por cómo los imaginas; una mente que aprende a usar sin ver termina tratando peor al encuentro real. La conciencia se endurece cuando normalizas usar sin ver.",
  "La mirada interior prepara la mirada externa. La conciencia se endurece cuando normalizas usar sin ver.",
  "Si entrenas una fantasía que borra la subjetividad del otro, después será más difícil sostener delicadeza en la vida cotidiana. La conciencia se endurece cuando normalizas usar sin ver.",
  "La forma en que representas a las personas influye en la forma en que te acercas a ellas. La conciencia se endurece cuando normalizas usar sin ver.",
  "Cuidar la imaginación también es cuidar el modo en que convivirás con otros cuerpos y otras libertades. La conciencia se endurece cuando normalizas usar sin ver.",
  "La honestidad con el propio deseo evita doble vida; esconder lo que haces mientras dices valorar otra cosa divide la conciencia. Renunciar también puede ser una afirmación de libertad.",
  "Cuando tus prácticas y tus palabras no coinciden, la mente tiene que hacer demasiada contabilidad interna. Renunciar también puede ser una afirmación de libertad.",
  "Vivir con una brecha persistente entre discurso y conducta agota más de lo que parece. Renunciar también puede ser una afirmación de libertad.",
  "La doble vida moral no siempre explota; a veces solo vuelve la identidad más frágil y menos confiable. Renunciar también puede ser una afirmación de libertad.",
  "Ser franco con tus impulsos no los justifica, pero sí evita que se vuelvan una sombra permanente. Renunciar también puede ser una afirmación de libertad.",
  "La libertad ética incluye poder renunciar; no todo lo posible merece ocupar tu tiempo, tu mirada y tu energía. La doble vida fragmenta la confianza en ti mismo.",
  "Elegir bien no consiste solo en escoger, sino también en excluir lo que te aleja de tu mejor versión. La doble vida fragmenta la confianza en ti mismo.",
  "Renunciar a un impulso puede ser una afirmación de humanidad, no una pérdida. La doble vida fragmenta la confianza en ti mismo.",
  "La capacidad de decir no protege la calidad de tus sí. La doble vida fragmenta la confianza en ti mismo.",
  "Una libertad sin criterio termina pareciendo libertad, pero funciona como simple obediencia al deseo inmediato. La doble vida fragmenta la confianza en ti mismo.",
  "La responsabilidad hacia otros incluye no convertirlos en consumo; una persona merece algo más que ser usada como estímulo. Cuidar a otros incluye no convertirlos en recurso.",
  "Si el otro solo existe para servirte, la relación deja de ser encuentro y pasa a ser extracción. Cuidar a otros incluye no convertirlos en recurso.",
  "El cuidado ético empieza cuando aceptas que nadie debe ser reducido a herramienta de placer. Cuidar a otros incluye no convertirlos en recurso.",
  "La moral cotidiana se mide también en la calidad del uso que haces de la imagen ajena. Cuidar a otros incluye no convertirlos en recurso.",
  "Respetar al otro es reconocer que su valor no depende de tu excitación. Cuidar a otros incluye no convertirlos en recurso.",
  "El carácter se fortalece con límites elegidos libremente; el límite correcto no te encoge, te ordena. El carácter crece cuando el límite protege tu humanidad.",
  "Hay renuncias que no mutilan la vida, sino que la vuelven más digna y más clara. El carácter crece cuando el límite protege tu humanidad.",
  "Un límite asumido por convicción vale más que una culpa repetida sin cambio. El carácter crece cuando el límite protege tu humanidad.",
  "La fuerza moral no consiste en nunca caer, sino en no acostumbrarte a traicionarte. El carácter crece cuando el límite protege tu humanidad.",
  "Cuando eliges un límite que protege tu humanidad, estás practicando una forma concreta de respeto. El carácter crece cuando el límite protege tu humanidad.",
];

const mockWhitelist: Whitelist = {
  sites: ["github.com", "stackoverflow.com", "docs.python.org"],
  apps: ["code", "firefox-developer", "ghostty"],
};

const mockConfig: Config = {
  blockDuration: 40,
  sensitivity: "medium",
  autoStart: true,
  showProgress: true,
  overlayTheme: "dark",
  breakRemindersEnabled: true,
};

const mockState = {
  monitoring: true,
  todayInterventions: 7,
  uptimeStart: Date.now() - 1000 * 60 * 137,
  lastDetection: iso(new Date(Date.now() - 1000 * 60 * 4)),
};

const mockRecent: RecentEvent[] = [
  { time: iso(new Date(Date.now() - 1000 * 60 * 4)), category: "Short-form Video", title: "YouTube Shorts — Mozilla Firefox" },
  { time: iso(new Date(Date.now() - 1000 * 60 * 22)), category: "Social Media", title: "(15) X / Home — Mozilla Firefox" },
  { time: iso(new Date(Date.now() - 1000 * 60 * 48)), category: "Short-form Video", title: "TikTok — Make Your Day — Chromium" },
  { time: iso(new Date(Date.now() - 1000 * 60 * 75)), category: "Social Media", title: "r/all — Reddit — Mozilla Firefox" },
  { time: iso(new Date(Date.now() - 1000 * 60 * 96)), category: "Gaming", title: "Steam Library" },
  { time: iso(new Date(Date.now() - 1000 * 60 * 130)), category: "Short-form Video", title: "Instagram Reels — Chromium" },
  { time: iso(new Date(Date.now() - 1000 * 60 * 180)), category: "Social Media", title: "Facebook" },
  { time: iso(new Date(Date.now() - 1000 * 60 * 220)), category: "Short-form Video", title: "YouTube Shorts" },
  { time: iso(new Date(Date.now() - 1000 * 60 * 260)), category: "Adult Content", title: "[blocked window]" },
  { time: iso(new Date(Date.now() - 1000 * 60 * 305)), category: "Social Media", title: "Twitter / Home" },
];

const mockStats: Stats = {
  daily: Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (6 - i));
    return {
      date: d.toISOString().slice(0, 10),
      interventions: Math.floor(4 + Math.random() * 18),
      timeSaved: Math.floor(5 + Math.random() * 40),
    };
  }),
  byCategory: [
    { name: "Short-form Video", count: 47 },
    { name: "Social Media", count: 31 },
    { name: "Adult Content", count: 12 },
    { name: "Gaming", count: 5 },
  ],
  total: { interventions: 95, timeSaved: 187, streakDays: 12 },
};

function formatUptime(startMs: number): string {
  const s = Math.floor((Date.now() - startMs) / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}h ${m}m`;
}

// ---------- Fetch wrapper with fallback ----------

async function tryFetch<T>(path: string, init: RequestInit | undefined, fallback: () => T | Promise<T>): Promise<T> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 1200);
    const res = await fetch(`${BASE}${path}`, { ...init, signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } catch {
    // Silent fallback to mock
    return await fallback();
  }
}

const jsonInit = (method: string, body?: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: body !== undefined ? JSON.stringify(body) : undefined,
});

// ---------- API ----------

export const api = {
  getStatus: () => tryFetch<Status>("/status", undefined, () => ({
    monitoring: mockState.monitoring,
    todayInterventions: mockState.todayInterventions,
    uptime: formatUptime(mockState.uptimeStart),
    lastDetection: mockState.lastDetection,
  })),

  setMonitoring: (action: "start" | "stop") =>
    tryFetch<{ monitoring: boolean }>("/monitoring", jsonInit("POST", { action }), () => {
      mockState.monitoring = action === "start";
      if (mockState.monitoring) mockState.uptimeStart = Date.now();
      return { monitoring: mockState.monitoring };
    }),

  getRecent: () => tryFetch<RecentEvent[]>("/recent", undefined, () => mockRecent),

  getConfig: () => tryFetch<Config>("/config", undefined, () => ({ ...mockConfig })),
  updateConfig: (patch: Partial<Config>) =>
    tryFetch<{ ok: boolean }>("/config", jsonInit("PUT", patch), () => {
      Object.assign(mockConfig, patch);
      return { ok: true };
    }),

  getCategories: () => tryFetch<Category[]>("/categories", undefined, () => [...mockCategories]),
  createCategory: (c: { name: string; keywords: string[]; enabled: boolean }) =>
    tryFetch<Category>("/categories", jsonInit("POST", c), () => {
      const nc: Category = { id: `c${Date.now()}`, detectionCount: 0, ...c };
      mockCategories.push(nc);
      return nc;
    }),
  updateCategory: (id: string, patch: Partial<Category>) =>
    tryFetch<Category>(`/categories/${id}`, jsonInit("PUT", patch), () => {
      const i = mockCategories.findIndex(c => c.id === id);
      if (i >= 0) mockCategories[i] = { ...mockCategories[i], ...patch };
      return mockCategories[i];
    }),
  deleteCategory: (id: string) =>
    tryFetch<{ ok: boolean }>(`/categories/${id}`, jsonInit("DELETE"), () => {
      const i = mockCategories.findIndex(c => c.id === id);
      if (i >= 0) mockCategories.splice(i, 1);
      return { ok: true };
    }),

  getPhrases: () => tryFetch<PhrasesPayload>("/phrases", undefined, () => ({
    phrases: [...mockPhrases],
    filePath: "~/.config/focus-guard/phrases.txt",
  })),
  updatePhrases: (phrases: string[]) =>
    tryFetch<{ ok: boolean }>("/phrases", jsonInit("PUT", { phrases }), () => {
      mockPhrases.splice(0, mockPhrases.length, ...phrases);
      return { ok: true };
    }),

  getWhitelist: () => tryFetch<Whitelist>("/whitelist", undefined, () => ({
    sites: [...mockWhitelist.sites],
    apps: [...mockWhitelist.apps],
  })),
  updateWhitelist: (w: Whitelist) =>
    tryFetch<{ ok: boolean }>("/whitelist", jsonInit("PUT", w), () => {
      mockWhitelist.sites = [...w.sites];
      mockWhitelist.apps = [...w.apps];
      return { ok: true };
    }),

  triggerWarning: (message: string) =>
    tryFetch<{ ok: boolean }>("/warning", jsonInit("POST", { message }), () => ({ ok: true })),

  getStats: () => tryFetch<Stats>("/stats", undefined, () => mockStats),
  resetStats: () => tryFetch<{ ok: boolean }>("/stats/reset", jsonInit("POST"), () => {
    mockState.todayInterventions = 0;
    mockStats.total = { interventions: 0, timeSaved: 0, streakDays: 0 };
    mockStats.daily = mockStats.daily.map(d => ({ ...d, interventions: 0, timeSaved: 0 }));
    return { ok: true };
  }),
};
