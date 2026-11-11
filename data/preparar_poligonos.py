"""Convierte los polígonos del Relevamiento 2018 de TECHO Perú (San Juan de
Miraflores) a un solo GeoJSON en WGS84 (EPSG:4326), listo para mapas web.

Entrada: la carpeta "MAPA TECHO" descomprimida, con una subcarpeta por
asentamiento y un .shp en UTM 18S (EPSG:32718) dentro de cada una.
El nombre del asentamiento sale del nombre de la subcarpeta (el .dbf solo
trae un campo Id).

Uso:
    python data/preparar_poligonos.py "/ruta/a/MAPA TECHO"
"""

import sys
import unicodedata
from pathlib import Path

import geopandas as gpd
import pandas as pd

SALIDA = Path(__file__).parent / "asentamientos_sjm_2018.geojson"
UTM_18S = "EPSG:32718"


def main(carpeta: Path) -> None:
    filas = []
    for sub in sorted(p for p in carpeta.iterdir() if p.is_dir()):
        if sub.name == "MAPA PUNTOS":  # solo son los vértices de los mismos polígonos
            continue
        shp = next(sub.glob("*.shp"))
        gdf = gpd.read_file(shp)
        if gdf.crs is None:
            gdf = gdf.set_crs(UTM_18S)
        gdf = gdf.to_crs(UTM_18S)
        geom = gdf.geometry.union_all()
        if not geom.is_valid:
            geom = geom.buffer(0)
        filas.append({
            "nombre": unicodedata.normalize("NFC", sub.name),
            "area_m2": round(geom.area),
            "geometry": geom,
        })

    gdf = gpd.GeoDataFrame(pd.DataFrame(filas), geometry="geometry", crs=UTM_18S)
    gdf = gdf.sort_values("nombre").reset_index(drop=True)
    gdf.insert(0, "id", range(1, len(gdf) + 1))
    gdf = gdf.to_crs("EPSG:4326")
    gdf.to_file(SALIDA, driver="GeoJSON", COORDINATE_PRECISION=6)
    print(f"{len(gdf)} asentamientos -> {SALIDA}")
    print(f"área total: {gdf.area_m2.sum() / 10_000:.1f} ha | "
          f"mediana: {gdf.area_m2.median():,.0f} m²")


if __name__ == "__main__":
    main(Path(sys.argv[1]))
