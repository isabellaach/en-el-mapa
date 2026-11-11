# Conversaciones con usuarios potenciales

Tres conversaciones con personas que levantan o usan información de asentamientos humanos en Lima. Se citan por rol, sin nombres ni datos personales.

| # | Rol | Lado del mercado |
|---|---|---|
| 1 | Funcionario municipal que trabajó en Desarrollo Urbano | Quien paga (municipalidad) |
| 2 | Trabajador de ONG con trabajo territorial en asentamientos humanos (TECHO) | Quien usa (plan Organización) y antecedente del relevamiento 2018 |
| 3 | Especialista en Gestión del Riesgo de Desastres | Quien usa la información para evaluar riesgo |

## Conversación 1: funcionario municipal que trabajó en Desarrollo Urbano

- La municipalidad cuenta con información sobre los asentamientos humanos, pero esta se encuentra dispersa entre distintas áreas, principalmente Desarrollo Urbano, Catastro y Gestión del Riesgo.
- No necesariamente existe una única base de datos actualizada y compartida. Algunos asentamientos tienen información más completa que otros, especialmente aquellos que llevan más tiempo consolidados.
- Para conseguir información suelen revisar documentos municipales, planos, expedientes anteriores y coordinar con dirigentes vecinales. Cuando necesitan información más específica, realizan visitas de campo o solicitan apoyo de otras áreas.
- El principal problema es que la información no siempre está actualizada y muchas veces hay que volver a verificarla.
- No tiene muy claro cuánto costó el último diagnóstico o levantamiento de información, ya que estos trabajos pueden ser gestionados por diferentes áreas y mediante consultorías externas.
- El presupuesto podría provenir de partidas relacionadas con gestión del riesgo, como el PP 0068, dependiendo del objetivo del proyecto.
- Considera interesante contar con una herramienta que permita obtener información de los asentamientos de manera más rápida, pero tendría que generar información confiable y compatible con los sistemas que utiliza la municipalidad.
- Para contratar una herramienta de este tipo se necesitaría justificar el gasto y pasar por los procedimientos administrativos correspondientes. La decisión no depende únicamente del funcionario técnico.
- Podría ser más viable comenzar con un piloto en un grupo reducido de asentamientos antes de contratar un diagnóstico completo.

## Conversación 2: trabajador de ONG con trabajo territorial en asentamientos humanos (TECHO)

- El relevamiento de San Juan de Miraflores de 2018 fue un proyecto que requirió bastante coordinación y recursos. No necesariamente se ha mantenido una actualización integral y periódica de toda esa información.
- Los asentamientos cambian constantemente: aparecen nuevos sectores, aumenta la población y se modifican las condiciones de acceso a servicios básicos.
- Una de las principales dificultades del relevamiento fue organizar el trabajo de campo, capacitar a los voluntarios y asegurar que todos aplicaran las fichas de manera homogénea.
- También tomó bastante tiempo procesar y sistematizar la información recopilada. El trabajo no terminaba con las visitas: después había que revisar, ordenar y analizar los datos.
- El relevamiento de SJM contó con un financiamiento de aproximadamente US$ 20 000 de una empresa privada, que permitió financiar el trabajo.
- Esto da una referencia de los recursos que puede requerir un proyecto de esta naturaleza: la herramienta tendría que ofrecer una alternativa considerablemente más económica, reduciendo los costos de levantamiento y procesamiento.
- Automatizar la transcripción y el llenado de fichas podría ahorrar bastante tiempo, especialmente cuando se trabaja con muchos asentamientos.
- Sin embargo, no se puede sacrificar la calidad metodológica por hacer el proceso más rápido. La información debe seguir siendo verificable y consistente.
- Sobre usar los polígonos del relevamiento de 2018 en un demo público, sería necesario revisar las condiciones de uso de la información y solicitar la autorización correspondiente a TECHO.
  - *Aclaración posterior de la fundadora:* los datos del relevamiento se publicaron para el uso de quien los necesitara, y En el Mapa cuenta con la autorización de TECHO para usarlos.
- La herramienta podría ser útil no solo para municipalidades, sino también para organizaciones que hacen investigación e intervenciones territoriales.

## Conversación 3: especialista en Gestión del Riesgo de Desastres

- Para evaluar riesgo se necesita información física y social de los asentamientos. No basta con conocer su ubicación: también importa identificar las viviendas, los servicios básicos, las características de la población y su exposición a peligros.
- La recopilación suele combinar visitas de campo, entrevistas con dirigentes, observación directa y revisión de información secundaria.
- En algunos proyectos se usan formularios digitales como ArcGIS Survey123, que registran información en campo y luego se exportan para su procesamiento.
- El tiempo que toma levantar información depende de la extensión del asentamiento, su accesibilidad y la cantidad de variables que se necesitan registrar.
- Una entrevista con un dirigente facilita la información general, pero no necesariamente permite verificar todos los datos.
- Entre las principales dificultades: conseguir información completa, coordinar con los dirigentes y verificar los límites de los asentamientos. A veces los nombres y límites no coinciden entre fuentes.
- Una herramienta que automatice el llenado de fichas sería útil para reducir el trabajo administrativo posterior a las visitas.
- Le interesa especialmente exportar a Excel y a formatos compatibles con herramientas GIS.
- Una de sus principales preocupaciones es que la IA interprete mal las respuestas o complete información que el dirigente nunca dio.
- Es importante poder revisar las grabaciones, corregir los datos y diferenciar la información declarada por el dirigente de la verificada en campo.
- La herramienta debería funcionar desde un celular y, de ser posible, sin conexión a internet.
- Una ficha generada a partir de una conversación no reemplaza una evaluación oficial de riesgo, que requiere criterios técnicos y profesionales especializados.

## Qué aprendimos y qué cambia en En el Mapa

| Lo que escuchamos | Qué hace o hará el producto |
|---|---|
| La información está dispersa entre áreas y hay que volver a verificarla (1) | Una ficha estándar por asentamiento, en un solo mapa del distrito, con lo dudoso marcado "por verificar" |
| Tiene que ser compatible con los sistemas municipales (1); exportar a Excel y GIS (3) | Descarga en CSV y GeoJSON desde el tablero |
| Mejor empezar con un piloto chico; la decisión no es solo del técnico (1) | Piloto de 15 asentamientos por S/ 4 500, antes del diagnóstico completo |
| El presupuesto podría salir del PP 0068 (1) | El plan Distrito se dirige a Gestión del Riesgo |
| Lo difícil fue capacitar, homogeneizar y sistematizar (2) | La IA llena siempre la misma ficha; guía de conversación en la app |
| US$ 20 000 para el relevamiento de 2018 (2) | Referencia para el precio: el diagnóstico debe costar mucho menos |
| No sacrificar calidad (2); miedo a que la IA invente (3) | Cada dato lleva su cita literal; si no se dijo, queda "no mencionado"; una persona revisa antes de guardar |
| Diferenciar lo declarado de lo verificado (3) | Hoy: "por verificar". Próximo paso: un estado "verificado en campo" por dato |
| Celular y sin conexión (3) | Funciona en el navegador del celular; sin señal se graba y se sube después. Próximo paso: modo sin conexión |
| Nombres y límites no coinciden entre fuentes (3) | Cruce difuso de nombres con revisión manual (`data/unir_familias.py`). Próximo paso: dibujar el polígono en campo |
| No reemplaza una evaluación oficial de riesgo (3) | Se presenta como insumo para esos estudios, no como evaluación |
| Útil también para ONG e investigación (2) | Plan Organización |
| Usar los polígonos 2018 requiere autorización de TECHO (2) | Resuelto: los datos se publicaron para el uso de quien los necesitara y contamos con la autorización de TECHO; se cita la fuente en el mapa y en el README |
