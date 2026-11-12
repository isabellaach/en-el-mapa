"""Genera docs/data/informe_ejemplo.json: fichas SIMULADAS para mostrar el informe del distrito.

Son 8 asentamientos FICTICIOS (nombres inventados que no coinciden con ninguno del
Relevamiento 2018) con datos inventados pero verosímiles. Sirven solo para ver cómo
se calcula y se lee el informe. Mirador Las Brisas usa la ficha de ejemplo de la app,
que viene de la entrevista simulada en docs/demo/guion_ejemplo.txt.

Uso:
    python data/informe_ejemplo.py
"""

import json
import re
import unicodedata
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
NM = "no_mencionado"


def campo(valor):
    return {"valor": valor, "cita": ""}


# nombre, lat, lng y valores (en el orden de la ficha). Los datos son inventados.
FICTICIOS = [
    dict(nombre="Lomas del Sol Naciente", lat=-12.1160, lng=-76.9480, familias=60, personas=230, lotes=64,
         anio=2019, constitucion="ocupacion_organizada", tenencia="constancia_posesion", desalojo="no",
         agua="cisterna", agua_beber="hervida", desague="silo_letrina", electricidad="medidor_comunitario",
         alumbrado="si", combustible="gas", paredes="madera", techos="calamina_eternit", pisos="tierra",
         entorno=["cerro_pendiente", "pircas"], eventos=["derrumbes"], acceso="vehicular",
         emergencias=["ambulancia", "policia"], organizacion="junta_directiva", reuniones="mensual", local_comunal="no",
         externas=["ong"], problemas=["agua", "zona_de_riesgo", "caminos"], salud="15_a_30_min",
         colegio="15_a_30_min", paradero="menos_15_min", obs=("malo", "regular", "malo"),
         verificar=["Si las pircas de la parte alta fueron reforzadas después del derrumbe."]),
    dict(nombre="Villa Los Cedros Altos", lat=-12.1230, lng=-76.9420, familias=140, personas=520, lotes=150,
         anio=2008, constitucion="compra_a_tercero", tenencia="titulo_con_carga", desalojo="no",
         agua="pilon_comunitario", agua_beber="clorada", desague="pozo_ciego", electricidad="medidor_domiciliario",
         alumbrado="si", combustible="gas", paredes="ladrillo_cemento", techos="calamina_eternit",
         pisos="cemento_loseta", entorno=["torres_alta_tension"], eventos=[], acceso="vehicular",
         emergencias=["ambulancia", "bomberos", "policia"], organizacion="junta_directiva", reuniones="quincenal",
         local_comunal="si", externas=["estado", "iglesia"], problemas=["desague", "titulacion", "inseguridad"],
         salud="15_a_30_min", colegio="menos_15_min", paradero="menos_15_min", obs=("regular", "bueno", "bueno"),
         verificar=[]),
    dict(nombre="Brisas de Quebrada Honda", lat=-12.1300, lng=-76.9435, familias=45, personas=170, lotes=48,
         anio=2022, constitucion="ocupacion_hormiga", tenencia="ninguno", desalojo="intento",
         agua="cisterna", agua_beber="sin_tratamiento", desague="no_tienen", electricidad="conexion_irregular",
         alumbrado="no", combustible="lena_carbon", paredes="esteras", techos="esteras", pisos="tierra",
         entorno=["quebrada", "cerro_pendiente"], eventos=["huaicos_inundaciones", "incendios"],
         acceso="peatonal", emergencias=["ninguno"], organizacion="comites", reuniones="semanal",
         local_comunal="no", externas=["ninguna"], problemas=["agua", "zona_de_riesgo", "electricidad"],
         salud="mas_30_min", colegio="mas_30_min", paradero="15_a_30_min", obs=("malo", "malo", "malo"),
         verificar=["Número de familias: dicen 45, pero siguen llegando familias nuevas.",
                    "Si el cauce de la quebrada se activó en el último verano."]),
    dict(nombre="Nuevo Horizonte de la Loma", lat=-12.1365, lng=-76.9450, familias=95, personas=360, lotes=100,
         anio=2014, constitucion="ocupacion_organizada", tenencia="constancia_posesion", desalojo="no",
         agua="cisterna", agua_beber="hervida", desague="silo_letrina", electricidad="medidor_comunitario",
         alumbrado="parcial", combustible="gas", paredes="madera", techos="calamina_eternit", pisos="cemento_loseta",
         entorno=["cerro_pendiente"], eventos=["caida_postes"], acceso="vehicular",
         emergencias=["ambulancia", "policia", "bomberos"], organizacion="junta_directiva", reuniones="mensual",
         local_comunal="si", externas=["ong"], problemas=["agua", "desague", "caminos"],
         salud="15_a_30_min", colegio="15_a_30_min", paradero="menos_15_min", obs=("regular", "regular", "regular"),
         verificar=[]),
    dict(nombre="Las Terrazas del Cerro", lat=-12.1340, lng=-76.9575, familias=210, personas=780, lotes=220,
         anio=2001, constitucion="lotizacion_estatal", tenencia="titulo_sin_carga", desalojo="no",
         agua="red_publica", agua_beber="hervida", desague="alcantarillado", electricidad="medidor_domiciliario",
         alumbrado="si", combustible="gas", paredes="ladrillo_cemento", techos="concreto", pisos="cemento_loseta",
         entorno=["cerro_pendiente"], eventos=[], acceso="vehicular",
         emergencias=["ambulancia", "bomberos", "policia"], organizacion="junta_directiva", reuniones="mensual",
         local_comunal="si", externas=["estado"], problemas=["inseguridad", "basura"],
         salud="menos_15_min", colegio="menos_15_min", paradero="menos_15_min", obs=("bueno", "bueno", "bueno"),
         verificar=[]),
    dict(nombre="Rinconada de las Flores", lat=-12.1250, lng=-76.9590, familias=70, personas=NM, lotes=NM,
         anio=2017, constitucion="ocupacion_hormiga", tenencia="contrato_compraventa", desalojo="no",
         agua="pilon_comunitario", agua_beber="hervida", desague="pozo_ciego", electricidad="conexion_irregular",
         alumbrado="no", combustible="gas", paredes="adobe", techos="calamina_eternit", pisos="tierra",
         entorno=["basural"], eventos=["incendios"], acceso="peatonal", emergencias=["policia"],
         organizacion="junta_directiva", reuniones="otra", local_comunal="no", externas=["iglesia"],
         problemas=["basura", "electricidad", "salud"], salud="mas_30_min", colegio="15_a_30_min",
         paradero="15_a_30_min", obs=("regular", "regular", "malo"),
         verificar=["No dieron el número de personas ni de lotes: completar en la próxima visita."]),
    dict(nombre="Altos de la Esperanza", lat=-12.1180, lng=-76.9560, familias=35, personas=120, lotes=40,
         anio=2023, constitucion="ocupacion_hormiga", tenencia="ninguno", desalojo="si",
         agua="no_tienen", agua_beber="sin_tratamiento", desague="no_tienen", electricidad="no_tienen",
         alumbrado="no", combustible="lena_carbon", paredes="desechos", techos="esteras", pisos="tierra",
         entorno=["cerro_pendiente", "pircas"], eventos=["derrumbes"], acceso="peatonal", emergencias=["ninguno"],
         organizacion="sin_organizacion", reuniones=NM, local_comunal="no", externas=["ninguna"],
         problemas=["agua", "zona_de_riesgo", "titulacion"], salud="mas_30_min", colegio="mas_30_min",
         paradero="mas_30_min", obs=("malo", "malo", "malo"),
         verificar=["Si las familias desalojadas en 2024 volvieron al mismo lugar."]),
]


def norm(s):
    s = unicodedata.normalize("NFD", s).encode("ascii", "ignore").decode().lower()
    return set(w for w in re.sub(r"[^a-z0-9 ]", " ", s).split() if len(w) > 3)


def ficha_de(d):
    return {
        "nombre_asentamiento": d["nombre"],
        "familias": campo(d["familias"]), "anio_fundacion": campo(d["anio"]),
        "constitucion": campo(d["constitucion"]), "tenencia": campo(d["tenencia"]),
        "agua": campo(d["agua"]), "desague": campo(d["desague"]), "electricidad": campo(d["electricidad"]),
        "paredes": campo(d["paredes"]), "techos": campo(d["techos"]), "entorno": campo(d["entorno"]),
        "eventos_12_meses": campo(d["eventos"]), "organizacion": campo(d["organizacion"]),
        "reuniones": campo(d["reuniones"]), "problemas": campo(d["problemas"]),
        "personas": campo(None if d["personas"] == NM else d["personas"]),
        "lotes": campo(None if d["lotes"] == NM else d["lotes"]),
        "acceso": campo(d["acceso"]), "emergencias": campo(d["emergencias"]), "alumbrado": campo(d["alumbrado"]),
        "agua_beber": campo(d["agua_beber"]), "combustible": campo(d["combustible"]), "pisos": campo(d["pisos"]),
        "local_comunal": campo(d["local_comunal"]), "desalojo": campo(d["desalojo"]),
        "organizaciones_externas": campo(d["externas"]), "salud_cercana": campo(d["salud"]),
        "colegio_cercano": campo(d["colegio"]), "paradero_cercano": campo(d["paradero"]),
        "resumen": "", "por_verificar": d["verificar"],
    }


def main():
    reales = [norm(f["properties"]["nombre"]) for f in
              json.load(open(RAIZ / "docs/data/asentamientos_sjm_2018.geojson"))["features"]]
    ejemplo = json.load(open(RAIZ / "docs/data/ejemplo.json"))
    fichas = [{"id": "ej-0", "poligono_id": None, "nombre": "Mirador Las Brisas", "lat": -12.1192, "lng": -76.9447,
               "fecha": "2026-11-10", "brigadista": "B-07", "simulado": True, "ficha": ejemplo["ficha"],
               "observacion": {"estado_techos": "regular", "estado_paredes": "malo", "estado_pisos": "malo"}}]
    for i, d in enumerate(FICTICIOS, 1):
        # Ningún nombre ficticio puede compartir dos palabras con un asentamiento real de 2018.
        choque = [r for r in reales if len(norm(d["nombre"]) & r) >= 2]
        assert not choque, (d["nombre"], choque)
        t, p, s = d["obs"]
        fichas.append({"id": f"ej-{i}", "poligono_id": None, "nombre": d["nombre"], "lat": d["lat"], "lng": d["lng"],
                       "fecha": f"2026-11-{9 + i % 3:02d}", "brigadista": ["B-07", "B-03", "B-12"][i % 3],
                       "simulado": True, "ficha": ficha_de(d),
                       "observacion": {"estado_techos": t, "estado_paredes": p, "estado_pisos": s}})
    salida = {"nota": "Ejemplo con 8 asentamientos FICTICIOS y datos simulados, solo para mostrar el informe.",
              "fichas": fichas}
    (RAIZ / "docs/data/informe_ejemplo.json").write_text(json.dumps(salida, ensure_ascii=False, indent=1))
    print(f"{len(fichas)} fichas de ejemplo")


if __name__ == "__main__":
    main()
