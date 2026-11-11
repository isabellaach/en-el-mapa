# Datos

| Archivo | Qué es | Fuente |
|---|---|---|
| `asentamientos_sjm_2018.geojson` | 83 polígonos de asentamientos humanos de San Juan de Miraflores (Pamplona Alta y Nueva Rinconada), en WGS84, con nombre y área en m² | Relevamiento de Asentamientos Informales 2018, **TECHO Perú** |
| `preparar_poligonos.py` | Convierte los shapefiles originales (UTM 18S) a este GeoJSON | Propio |
| `familias_2018.csv` | Nombre del asentamiento, zona, número exacto de familias (109 de 138 filas) y rango declarado en la pregunta 2.4 de la ficha (las 138 filas). **Sin el nombre del dirigente**, que sí estaba en la base original | Base del Relevamiento 2018, TECHO Perú |
| `unir_familias.py` | Empareja los nombres escritos a mano en campo con los polígonos (normalización + rapidfuzz + 9 pares revisados a mano). 63 de 83 polígonos emparejados: todos con rango declarado y 50 con número exacto. 5 marcados como `dato_inconsistente_2018` porque el número exacto cae fuera del rango declarado (la ficha no tenía opción por debajo de 8 familias, así que eso no se marca) | Propio |

## Crédito y alcance

- Los polígonos fueron levantados por TECHO Perú en el Relevamiento 2018 (oct. 2017 – jun. 2018), que coordiné. Informe público: [Informe de Relevamiento de Asentamientos Informales, San Juan de Miraflores](https://peru.techo.org/wp-content/uploads/sites/18/2021/12/InformeRelevamientoFINAL.pdf).
- Se conservan 83 de los 138 polígonos del relevamiento (60 %).
- Solo contienen límites y nombres de asentamientos. **No hay datos personales.**
- La licencia MIT del repo cubre el código; los datos se citan como TECHO Perú (2018). En el Mapa no es un proyecto de TECHO ni cuenta con su respaldo institucional.

- El número de familias es **declarado por la dirigencia en 2018**: sirve de línea de base, no como cifra actual. La columna de número de personas no se usa porque es inconsistente (por ejemplo, menos personas que familias).
