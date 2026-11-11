"""Agrega al GeoJSON el número de familias de 2018 (familias_2018.csv).

Los nombres en la base de 2018 se escribieron a mano en campo
("AAHH los rosales", "Asociación Villa Sol"...), así que se emparejan
después de normalizarlos: sin tildes, sin prefijos como AAHH o Asociación,
y con similitud de texto (rapidfuzz). Solo se acepta un par si la similitud
es alta; los dudosos se listan para revisión manual y no se unen.

Uso:
    python data/unir_familias.py
"""

import csv
import re
import unicodedata
from pathlib import Path

import geopandas as gpd
from rapidfuzz import fuzz, process

DATA = Path(__file__).parent
UMBRAL = 90

# Pares revisados a mano: mismo asentamiento, escrito distinto en campo.
MANUAL = {
    "Absalon Alarcon Bravo de Rueda": "Absalon Alarcon",
    "Amanecer Ticane": "Pasaje amanecer ticane",
    "El Retoño": "Retoño",
    "Emmanuel": "Enmanuel",
    "Mirador II": "Asentamiento Humano El Mirador II",
    "Paz de Villa": "La Paz de Villa",
    "Villa Hermoza II": "Villa hermosa 2",
    "Villa Los 3 Reyes": "Urb. villa los tres reyes",
    "Junta de Propietarios 52A": "AAHH Junta de Propietarios 52 A",
}

PREFIJOS = r"""^(
    asentamiento\s+humano | aa\s*\.?\s*hh\s*\.? | ah | asoc\s*\.? |
    asociacion(\s+de)?(\s+(vivienda|viviendas|propietarios|pobladores))?(\s+vecinal)? |
    agrupacion(\s+de)?(\s+(vivienda|viviendas|propietarios|pobladores))? |
    organizacion\s+vecinal | urb\s*\.? | sector
)\s+"""


def normalizar(texto: str) -> str:
    t = unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode().lower()
    t = re.sub(r"[_\-]", " ", t)
    for _ in range(3):  # "Organización Vecinal AAHH Cerro Azul"
        t = re.sub(PREFIJOS, "", t.strip(), flags=re.X)
    return " ".join(t.split())


def marcas(texto: str) -> set[str]:
    """Números y letras sueltas ("7", "II", "B"): deben coincidir para unir."""
    romanos = {"i": "1", "ii": "2", "iii": "3", "tres": "3"}
    return {romanos.get(t, t) for t in texto.split()
            if t.isdigit() or len(t) == 1 or t in romanos}


def main() -> None:
    gdf = gpd.read_file(DATA / "asentamientos_sjm_2018.geojson")
    with open(DATA / "familias_2018.csv") as f:
        bbdd = [r for r in csv.DictReader(f)]
    opciones = {i: normalizar(r["nombre_bbdd"]) for i, r in enumerate(bbdd)}

    familias, nombre_bbdd, zona, rango, inconsistente, dudosos = [], [], [], [], [], []
    por_nombre = {r["nombre_bbdd"]: i for i, r in enumerate(bbdd)}
    for nombre in gdf.nombre:
        texto, score, i = process.extractOne(normalizar(nombre), opciones, scorer=fuzz.ratio)
        if nombre in MANUAL:
            i, score = por_nombre[MANUAL[nombre]], 100
        elif marcas(normalizar(nombre)) != marcas(texto):
            score = min(score, UMBRAL - 1)
        if score >= UMBRAL:
            r = bbdd[i]
            n = int(r["familias"]) if r["familias"] else None
            lo, hi = (int(x) for x in r["rango_2018"].split("-"))
            familias.append(n)
            nombre_bbdd.append(r["nombre_bbdd"])
            zona.append(r["zona"] or None)
            rango.append(r["rango_2018"])
            # La ficha de 2018 no tenía opción por debajo de 8 familias: eso no es error.
            inconsistente.append(n is not None and (n > hi or (n < lo and lo > 8)))
        else:
            familias.append(None); nombre_bbdd.append(None); zona.append(None)
            rango.append(None); inconsistente.append(False)
            if score >= 70:
                dudosos.append((nombre, bbdd[i]["nombre_bbdd"], round(score)))

    gdf["familias_2018"] = familias
    gdf["rango_2018"] = rango
    gdf["dato_inconsistente_2018"] = inconsistente
    gdf["nombre_bbdd_2018"] = nombre_bbdd
    gdf["zona_2018"] = zona
    gdf.to_file(DATA / "asentamientos_sjm_2018.geojson", driver="GeoJSON",
                COORDINATE_PRECISION=6)

    emparejados = gdf.nombre_bbdd_2018.notna().sum()
    con_familias = gdf.familias_2018.notna().sum()
    print(f"emparejados: {emparejados}/{len(gdf)} | con nº de familias: {con_familias}")
    print(f"familias en polígonos emparejados: {int(gdf.familias_2018.sum())}")
    if dudosos:
        print("\nDudosos (no unidos, revisar a mano):")
        for a, b, s in dudosos:
            print(f"  {s:>3}  {a!r:45} ~ {b!r}")


if __name__ == "__main__":
    main()
