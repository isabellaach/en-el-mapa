"""API de En el Mapa: audio -> transcripción (Whisper) -> ficha (Gemini).

Local:
    .venv/bin/uvicorn backend.main:app --port 8000
    y abrir http://localhost:8000  (sirve también la página de docs/)
"""

import os
import sys
import tempfile
import time
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

RAIZ = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(RAIZ))
load_dotenv(RAIZ / ".env")

from ai.ficha import anonimizar, llenar_ficha  # noqa: E402

WHISPER_MODELO = os.getenv("WHISPER_MODEL", "small")
MAX_MB = 25

app = FastAPI(title="En el Mapa")
app.add_middleware(  # la página publicada en GitHub Pages llama a esta API
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"],
)


@lru_cache(maxsize=1)
def whisper():
    from faster_whisper import WhisperModel

    return WhisperModel(WHISPER_MODELO, device="cpu", compute_type="int8")


@app.get("/api/salud")
def salud():
    return {"ok": True, "whisper": WHISPER_MODELO, "gemini": bool(os.getenv("GEMINI_API_KEY"))}


@app.post("/api/transcribir")
async def transcribir(audio: UploadFile = File(...)):
    datos = await audio.read()
    if len(datos) > MAX_MB * 1024 * 1024:
        raise HTTPException(413, f"El audio supera {MAX_MB} MB.")
    if len(datos) < 2000:  # una grabación cortada al instante llega vacía
        raise HTTPException(400, "La grabación está vacía o es muy corta. Graba al menos 5 segundos.")
    sufijo = Path(audio.filename or "audio.webm").suffix or ".webm"
    with tempfile.NamedTemporaryFile(suffix=sufijo) as tmp:
        tmp.write(datos)
        tmp.flush()
        t0 = time.time()
        try:
            segmentos, info = whisper().transcribe(
                tmp.name, language="es", vad_filter=True, beam_size=1,
                initial_prompt="Conversación con la dirigencia de un asentamiento humano de Lima: "
                               "cisterna, pircas, constancia de posesión, junta directiva.",
            )
            segmentos = [{"ini": round(s.start, 1), "fin": round(s.end, 1), "texto": s.text.strip()}
                         for s in segmentos]
        except Exception as e:  # audio dañado, cortado o en un formato que no se puede leer
            print("Error al leer el audio:", repr(e)[:300])
            raise HTTPException(400, "No se pudo leer el audio. Vuelve a grabar o sube el archivo "
                                     "en otro formato (m4a, mp3 o wav).")
    texto = anonimizar(" ".join(s["texto"] for s in segmentos))
    if not texto.strip():
        raise HTTPException(422, "No se escuchó voz en la grabación. Revisa que el micrófono "
                                 "correcto esté activo y vuelve a grabar.")
    return {"texto": texto, "duracion_audio": round(info.duration, 1),
            "segundos_proceso": round(time.time() - t0, 1), "modelo": f"whisper-{WHISPER_MODELO}"}


class Texto(BaseModel):
    texto: str


@app.post("/api/ficha")
def ficha(entrada: Texto):
    if len(entrada.texto.strip()) < 40:
        raise HTTPException(422, "Se entendió muy poco de la conversación para llenar una ficha. "
                                 "Graba al menos un minuto de conversación.")
    t0 = time.time()
    try:
        resultado = llenar_ficha(entrada.texto)
    except Exception as e:  # el detalle va al log; al usuario, un mensaje claro
        print("Error Gemini:", repr(e)[:300])
        raise HTTPException(503, "Gemini no respondió. Intenta de nuevo en unos segundos.")
    resultado["_segundos"] = round(time.time() - t0, 1)
    return resultado


app.mount("/", StaticFiles(directory=RAIZ / "docs", html=True), name="web")
