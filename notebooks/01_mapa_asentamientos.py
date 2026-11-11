"""Primer mapa: los 83 asentamientos del Relevamiento 2018 de TECHO Perú en
San Juan de Miraflores, sobre mapa base y sobre imagen satelital.

Uso:
    python notebooks/01_mapa_asentamientos.py
Genera docs/mapa_asentamientos.html
"""

from pathlib import Path

import folium
import geopandas as gpd

RAIZ = Path(__file__).resolve().parents[1]
gdf = gpd.read_file(RAIZ / "data" / "asentamientos_sjm_2018.geojson")
gdf["area_txt"] = gdf.area_m2.map(lambda a: f"{a:,.0f} m²".replace(",", " "))

centro = gdf.union_all().centroid
m = folium.Map(location=[centro.y, centro.x], zoom_start=15, tiles=None)
folium.TileLayer("CartoDB positron", name="Mapa base").add_to(m)
folium.TileLayer(
    tiles="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attr="Esri, Maxar, Earthstar Geographics",
    name="Satélite",
).add_to(m)

folium.GeoJson(
    gdf[["nombre", "area_txt", "geometry"]],
    name="Asentamientos (TECHO 2018)",
    style_function=lambda f: {
        "color": "#6B3FA0", "weight": 2, "fillColor": "#E8833A", "fillOpacity": 0.35,
    },
    highlight_function=lambda f: {"weight": 4, "fillOpacity": 0.6},
    tooltip=folium.GeoJsonTooltip(
        fields=["nombre", "area_txt"], aliases=["Asentamiento", "Área"],
    ),
).add_to(m)

m.fit_bounds([[gdf.total_bounds[1], gdf.total_bounds[0]],
              [gdf.total_bounds[3], gdf.total_bounds[2]]])
folium.LayerControl(collapsed=False).add_to(m)

salida = RAIZ / "docs" / "mapa_asentamientos.html"
salida.parent.mkdir(exist_ok=True)
m.save(salida)
print(f"{len(gdf)} polígonos -> {salida}")
