"""Esquema de la ficha y extracción estructurada con Gemini.

Las preguntas y opciones vienen de la Ficha de Catastro que TECHO Perú usó en
el Relevamiento 2018 de San Juan de Miraflores (secciones 2 a 11). Se dejan
fuera a propósito los datos personales de la ficha original (nombre, DNI,
celular y dirección del dirigente).

Cada dato trae `cita`: la frase literal de la transcripción que lo respalda.
Si la conversación no lo menciona, el valor es "no_mencionado" y la cita va
vacía. Así el voluntario revisa en segundos y nada se inventa.
"""

import os
import re
from typing import Literal, Optional

from pydantic import BaseModel, Field

MODELO = os.getenv("GEMINI_MODEL", "gemini-3.5-flash")
RESPALDO = ["gemini-3.8-flash", "gemini-flash-latest", "gemini-3.1-flash-lite"]

NM = "no_mencionado"


class Familias(BaseModel):
    valor: Optional[int] = Field(description="Número aproximado de familias. null si no se menciona.")
    cita: str


class Anio(BaseModel):
    valor: Optional[int] = Field(description="Año aproximado en que se fundó. null si no se menciona.")
    cita: str


class Constitucion(BaseModel):
    valor: Literal["ocupacion_hormiga", "ocupacion_organizada", "compra_a_tercero",
                   "lotizacion_estatal", "otra", "no_mencionado"]
    cita: str


class Tenencia(BaseModel):
    valor: Literal["titulo_sin_carga", "titulo_con_carga", "constancia_posesion",
                   "contrato_compraventa", "ninguno", "otro", "no_mencionado"]
    cita: str


class Agua(BaseModel):
    valor: Literal["red_publica", "cisterna", "pilon_comunitario", "pozo",
                   "fuente_natural", "no_tienen", "otro", "no_mencionado"]
    cita: str


class Desague(BaseModel):
    valor: Literal["alcantarillado", "pozo_ciego", "silo_letrina", "bano_seco",
                   "no_tienen", "otro", "no_mencionado"]
    cita: str


class Electricidad(BaseModel):
    valor: Literal["medidor_domiciliario", "medidor_comunitario", "conexion_irregular",
                   "no_tienen", "otro", "no_mencionado"]
    cita: str


class Paredes(BaseModel):
    valor: Literal["ladrillo_cemento", "adobe", "madera", "esteras", "desechos",
                   "otro", "no_mencionado"]
    cita: str


class Techos(BaseModel):
    valor: Literal["concreto", "calamina_eternit", "madera", "esteras", "desechos",
                   "otro", "no_mencionado"]
    cita: str


class Entorno(BaseModel):
    valor: list[Literal["cerro_pendiente", "quebrada", "torres_alta_tension",
                        "basural", "pircas", "otro"]] = Field(
        description="Riesgos dentro o a menos de 500 m. Lista vacía si no se menciona.")
    cita: str


class Eventos(BaseModel):
    valor: list[Literal["derrumbes", "incendios", "huaicos_inundaciones",
                        "caida_postes", "otro"]] = Field(
        description="Eventos de los últimos 12 meses. Lista vacía si no se menciona.")
    cita: str


class Organizacion(BaseModel):
    valor: Literal["junta_directiva", "comites", "sin_organizacion", "no_mencionado"]
    cita: str


class Reuniones(BaseModel):
    valor: Literal["semanal", "quincenal", "mensual", "otra", "no_mencionado"]
    cita: str


class Problemas(BaseModel):
    valor: list[Literal["agua", "desague", "zona_de_riesgo", "titulacion",
                        "inseguridad", "caminos", "basura", "electricidad",
                        "salud", "educacion", "empleo", "otro"]] = Field(
        description="Problemas que la dirigencia considera principales.")
    cita: str


class Ficha(BaseModel):
    nombre_asentamiento: str = Field(description="Como lo nombra la dirigencia. Vacío si no se dice.")
    familias: Familias
    anio_fundacion: Anio
    constitucion: Constitucion
    tenencia: Tenencia
    agua: Agua
    desague: Desague
    electricidad: Electricidad
    paredes: Paredes
    techos: Techos
    entorno: Entorno
    eventos_12_meses: Eventos
    organizacion: Organizacion
    reuniones: Reuniones
    problemas: Problemas
    resumen: str = Field(description="Dos oraciones sobre la situación del asentamiento.")
    por_verificar: list[str] = Field(
        description="Datos contradictorios, dudosos o que el voluntario debe confirmar en campo.")


PROMPT = """Eres asistente de un voluntario que levanta la Ficha de Catastro de un
asentamiento humano de Lima a partir de una conversación con su dirigencia.

Reglas:
1. Llena cada campo SOLO con lo que se dice en la transcripción. No supongas.
2. En `cita` copia literalmente la frase más corta de la transcripción que respalda el
   dato (máximo 25 palabras). Si no se menciona: valor "no_mencionado" (o null, o lista
   vacía) y cita "".
3. Si la dirigencia da un rango o un número aproximado ("unas 120 familias"), usa ese número.
4. Lo que el entrevistado duda o se contradice va en `por_verificar`.
5. No registres nombres de personas, DNI, teléfonos ni direcciones de viviendas.

Transcripción:
\"\"\"{texto}\"\"\"
"""

# DNI (8 dígitos) y celulares (9 dígitos que empiezan con 9): se tapan antes de
# enviar el texto al modelo.
_PATRON_PERSONAL = re.compile(r"\b9\d{2}[\s-]?\d{3}[\s-]?\d{3}\b|\b\d{8}\b")


def anonimizar(texto: str) -> str:
    return _PATRON_PERSONAL.sub("[dato personal omitido]", texto)


def llenar_ficha(texto: str, api_key: str | None = None) -> dict:
    """Transcripción -> ficha validada (dict)."""
    from google import genai

    from google.genai import errors

    from google.genai import types

    # Pocos reintentos y tiempo límite: si un modelo está saturado, mejor pasar
    # rápido al siguiente que hacer esperar al voluntario.
    cliente = genai.Client(
        api_key=api_key or os.environ["GEMINI_API_KEY"],
        http_options=types.HttpOptions(
            timeout=45_000, retry_options=types.HttpRetryOptions(attempts=2, initial_delay=1)),
    )
    ultimo_error = None
    # Si un modelo está saturado (503) o sin cuota (429), se prueba el siguiente.
    for modelo in dict.fromkeys([MODELO, *RESPALDO]):
        try:
            resp = cliente.models.generate_content(
                model=modelo,
                contents=PROMPT.format(texto=anonimizar(texto)),
                config={"response_mime_type": "application/json", "response_schema": Ficha,
                        "temperature": 0},
            )
        except (errors.ServerError, errors.ClientError) as e:
            if getattr(e, "code", None) not in (429, 500, 503, 404):
                raise
            ultimo_error = e
            continue
        ficha = Ficha.model_validate_json(resp.text).model_dump()
        ficha["_modelo"] = modelo
        return ficha
    raise RuntimeError(f"Ningún modelo de Gemini respondió: {ultimo_error}")


if __name__ == "__main__":
    import json
    import sys

    from dotenv import load_dotenv

    load_dotenv()
    texto = open(sys.argv[1]).read()
    print(json.dumps(llenar_ficha(texto), ensure_ascii=False, indent=2))
