/* En el Mapa: lo que comparten la página (app.js) y la app del celular (movil.js).
   Las fichas se guardan en el mismo lugar del navegador, así que se ven en ambas. */

// ---------- Configuración ----------
// En local la API está en el mismo servidor. Publicada en GitHub Pages, usa
// la API desplegada (o ?api=https://... en la URL para probar otra).
const API_PUBLICA = "";
const params = new URLSearchParams(location.search);
const ES_LOCAL = ["localhost", "127.0.0.1"].includes(location.hostname);
const API = params.get("api") || (ES_LOCAL ? "" : API_PUBLICA);
const CLAVE_LOCAL = "enelmapa_fichas_v1";

// ---------- Etiquetas de la ficha (TECHO, Ficha de Catastro 2018) ----------
// El orden y el grupo definen cómo se muestra la ficha. bueno/malo dan el color del dato.
const DISTANCIAS = { menos_15_min: "Menos de 15 min", "15_a_30_min": "15 a 30 min", mas_30_min: "Más de 30 min" };
const CAMPOS = {
  familias: { grupo: "Población", etq: "Familias", tipo: "numero" },
  personas: { grupo: "Población", etq: "Personas", tipo: "numero" },
  lotes: { grupo: "Población", etq: "Lotes", tipo: "numero" },
  anio_fundacion: { grupo: "Población", etq: "Año de fundación", tipo: "numero" },
  constitucion: { grupo: "Población", etq: "Cómo se formó", ops: {
    ocupacion_hormiga: "Ocupación progresiva", ocupacion_organizada: "Ocupación organizada",
    compra_a_tercero: "Compra a un tercero", lotizacion_estatal: "Lotización estatal", otra: "Otra" } },
  tenencia: { grupo: "Terreno", etq: "Tenencia del terreno", ops: {
    titulo_sin_carga: "Título sin carga", titulo_con_carga: "Título con carga",
    constancia_posesion: "Constancia de posesión", contrato_compraventa: "Contrato de compra-venta",
    ninguno: "Ningún documento", otro: "Otro" }, bueno: ["titulo_sin_carga"],
    malo: ["constancia_posesion", "ninguno", "contrato_compraventa"] },
  desalojo: { grupo: "Terreno", etq: "Desalojo", ops: { si: "Sí hubo", intento: "Hubo un intento", no: "No" },
    bueno: ["no"], malo: ["si", "intento"] },
  agua: { grupo: "Servicios", etq: "Agua", ops: {
    red_publica: "Red pública", cisterna: "Camión cisterna", pilon_comunitario: "Pilón comunitario",
    pozo: "Pozo", fuente_natural: "Fuente natural", no_tienen: "No tienen", otro: "Otro" },
    bueno: ["red_publica"], malo: ["cisterna", "pozo", "fuente_natural", "no_tienen"] },
  agua_beber: { grupo: "Servicios", etq: "Agua para beber", ops: {
    hervida: "La hierven", clorada: "La cloran", filtrada: "La filtran", envasada: "Compran envasada",
    sin_tratamiento: "Sin tratar", otro: "Otro" }, malo: ["sin_tratamiento"] },
  desague: { grupo: "Servicios", etq: "Desagüe", ops: {
    alcantarillado: "Red pública", pozo_ciego: "Pozo ciego", silo_letrina: "Silo o letrina",
    bano_seco: "Baño seco", no_tienen: "No tienen", otro: "Otro" },
    bueno: ["alcantarillado"], malo: ["pozo_ciego", "silo_letrina", "no_tienen"] },
  electricidad: { grupo: "Servicios", etq: "Electricidad", ops: {
    medidor_domiciliario: "Medidor propio", medidor_comunitario: "Medidor comunitario",
    conexion_irregular: "Conexión irregular", no_tienen: "No tienen", otro: "Otro" },
    bueno: ["medidor_domiciliario"], malo: ["conexion_irregular", "no_tienen"] },
  alumbrado: { grupo: "Servicios", etq: "Alumbrado público", ops: { si: "Sí", parcial: "En parte", no: "No" },
    bueno: ["si"], malo: ["no", "parcial"] },
  combustible: { grupo: "Servicios", etq: "Cocinan con", ops: {
    gas: "Gas", lena_carbon: "Leña o carbón", kerosene: "Kerosene", electricidad: "Electricidad", otro: "Otro" },
    malo: ["lena_carbon", "kerosene"] },
  paredes: { grupo: "Viviendas", etq: "Paredes", ops: {
    ladrillo_cemento: "Ladrillo o cemento", adobe: "Adobe", madera: "Madera", esteras: "Esteras",
    desechos: "Material de desecho", otro: "Otro" }, bueno: ["ladrillo_cemento"],
    malo: ["madera", "esteras", "desechos"] },
  techos: { grupo: "Viviendas", etq: "Techos", ops: {
    concreto: "Concreto", calamina_eternit: "Calamina o eternit", madera: "Madera",
    esteras: "Esteras", desechos: "Material de desecho", otro: "Otro" }, bueno: ["concreto"],
    malo: ["calamina_eternit", "esteras", "desechos"] },
  pisos: { grupo: "Viviendas", etq: "Pisos", ops: {
    cemento_loseta: "Cemento o loseta", tierra: "Tierra", madera: "Madera", otro: "Otro" },
    bueno: ["cemento_loseta"], malo: ["tierra"] },
  entorno: { grupo: "Riesgo", etq: "Riesgos del entorno", lista: true, malo: "todos", ops: {
    cerro_pendiente: "Pendiente", quebrada: "Quebrada", torres_alta_tension: "Torres de alta tensión",
    basural: "Basural", pircas: "Pircas", otro: "Otro" } },
  eventos_12_meses: { grupo: "Riesgo", etq: "Últimos 12 meses", lista: true, malo: "todos", ops: {
    derrumbes: "Derrumbe", incendios: "Incendio", huaicos_inundaciones: "Huaico o inundación",
    caida_postes: "Caída de postes", otro: "Otro" } },
  acceso: { grupo: "Riesgo", etq: "Acceso principal", ops: {
    vehicular: "Entra un vehículo", peatonal: "Solo a pie", escaleras: "Escaleras", otro: "Otro" },
    bueno: ["vehicular"], malo: ["peatonal", "escaleras"] },
  emergencias: { grupo: "Riesgo", etq: "Pueden entrar", lista: true, ops: {
    ambulancia: "Ambulancia", bomberos: "Bomberos", policia: "Policía", ninguno: "Ninguno" }, malo: ["ninguno"] },
  organizacion: { grupo: "Comunidad", etq: "Organización", ops: {
    junta_directiva: "Junta directiva", comites: "Comités", sin_organizacion: "Sin organización" },
    bueno: ["junta_directiva", "comites"] },
  reuniones: { grupo: "Comunidad", etq: "Se reúnen", ops: {
    semanal: "Cada semana", quincenal: "Cada 15 días", mensual: "Cada mes", otra: "Otra" } },
  local_comunal: { grupo: "Comunidad", etq: "Local comunal", ops: { si: "Sí", no: "No" }, bueno: ["si"] },
  organizaciones_externas: { grupo: "Comunidad", etq: "Trabajan ahí", lista: true, ops: {
    ong: "ONG", estado: "Estado", iglesia: "Iglesia", empresa_privada: "Empresa privada", ninguna: "Ninguna", otro: "Otra" } },
  problemas: { grupo: "Comunidad", etq: "Problemas principales", lista: true, ops: {
    agua: "Agua", desague: "Desagüe", zona_de_riesgo: "Zona de riesgo", titulacion: "Titulación",
    inseguridad: "Inseguridad", caminos: "Caminos", basura: "Basura", electricidad: "Electricidad",
    salud: "Salud", educacion: "Educación", empleo: "Empleo", otro: "Otro" } },
  salud_cercana: { grupo: "Cerca del asentamiento", etq: "Centro de salud", ops: DISTANCIAS, malo: ["mas_30_min"] },
  colegio_cercano: { grupo: "Cerca del asentamiento", etq: "Colegio", ops: DISTANCIAS, malo: ["mas_30_min"] },
  paradero_cercano: { grupo: "Cerca del asentamiento", etq: "Paradero", ops: DISTANCIAS, malo: ["mas_30_min"] },
};

// Lo que el brigadista observa en campo (no sale de la conversación): TECHO 2018, preguntas 4.1 a 4.3.
const OBSERVACION = {
  estado_techos: "Techos",
  estado_paredes: "Paredes",
  estado_pisos: "Pisos",
};
const ESTADOS = { bueno: "Bueno", regular: "Regular", malo: "Malo" };

// ---------- Utilidades ----------
const $ = (s) => document.querySelector(s);
const fmt = (n) => n == null ? "—" : Number(n).toLocaleString("es-PE").replace(/,/g, " ");
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
  .replace(/\b(aa\.?\s?hh\.?|asentamiento humano|asociacion|agrupacion|de propietarios|de vivienda|organizacion vecinal)\b/g, " ")
  .replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

// Fecha de hoy en la hora del celular (no en UTC: de noche en Lima, UTC ya es el día siguiente).
const hoy = () => new Date().toLocaleDateString("en-CA");

function leerGuardadas() {
  try { return JSON.parse(localStorage.getItem(CLAVE_LOCAL)) || []; } catch { return []; }
}
function escribirGuardadas(lista) {
  try { localStorage.setItem(CLAVE_LOCAL, JSON.stringify(lista)); } catch { /* sin almacenamiento */ }
}

// Tramos de la pregunta 2.4 de la ficha de 2018 (rango declarado por la dirigencia).
const TRAMOS = [
  { rangos: ["8-49"], color: "#EFE6CC", txt: "8 a 49" },
  { rangos: ["50-99"], color: "#E9B949", txt: "50 a 99" },
  { rangos: ["100-249"], color: "#C65D3B", txt: "100 a 249" },
  { rangos: ["250-499", "500-999", "1000-1999"], color: "#1F3D2B", txt: "250 o más" },
];
const SIN_DATO = "#A7ADA8";
const colorRango = (r) => TRAMOS.find((t) => t.rangos.includes(r))?.color ?? SIN_DATO;
const rangoTxt = (r) => r ? r.replace("-", " a ") : "—";

// El servidor responde los errores en JSON ({detail}); si no, se usa un mensaje según el código.
async function textoError(r, porDefecto) {
  try { const j = await r.json(); if (j.detail) return typeof j.detail === "string" ? j.detail : porDefecto; }
  catch { /* respuesta sin JSON */ }
  if (r.status === 413) return "El audio supera los 25 MB.";
  if (r.status >= 500) return `${porDefecto} El servidor tuvo un problema; intenta de nuevo.`;
  return porDefecto;
}

function etiqueta(campo, valor) {
  const c = CAMPOS[campo];
  if (!c || valor == null || valor === "no_mencionado") return "No se mencionó";
  return c.ops?.[valor] ?? String(valor);
}

function claseValor(c, v) {
  if (v == null || v === "no_mencionado") return "nada";
  if (c.malo === "todos" || c.malo?.includes(v)) return "malo";
  if (c.bueno?.includes(v)) return "bueno";
  return "";
}

function descargar(nombre, contenido, tipo) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([contenido], { type: tipo }));
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(a.href);
}

function filaPlana(x) {
  const f = x.ficha;
  const fila = { nombre: x.nombre, poligono_2018: x.poligono_id ?? "", lat: x.lat ?? "", lng: x.lng ?? "",
    fecha: x.fecha, brigadista: x.brigadista || "", simulado: x.simulado ? "si" : "no" };
  for (const k of Object.keys(CAMPOS)) {
    const v = f[k]?.valor;
    fila[k] = Array.isArray(v) ? v.join("|") : (v ?? "");
    fila[k + "_cita"] = f[k]?.cita || "";
  }
  for (const k of Object.keys(OBSERVACION)) fila["obs_" + k.replace("estado_", "")] = x.observacion?.[k] || "";
  return fila;
}

const MIN_SEGUNDOS = 5;

function mensajeMicrofono(err) {
  if (err?.name === "NotAllowedError")
    return "El navegador no tiene permiso para usar el micrófono. Haz clic en el candado junto a la dirección de la página, permite el micrófono y vuelve a intentar.";
  if (err?.name === "NotFoundError") return "No se encontró ningún micrófono conectado.";
  if (err?.name === "NotReadableError") return "Otra aplicación está usando el micrófono. Ciérrala y vuelve a intentar.";
  return "No se pudo usar el micrófono. Revisa los permisos del navegador.";
}

// ---------- Llamadas a la API ----------
async function apiSalud() {
  try {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 5000);
    const j = await (await fetch(`${API}/api/salud`, { signal: ctrl.signal })).json();
    return !!j.ok && !!j.gemini;
  } catch { return false; }
}

async function apiTranscribir(blob, nombre) {
  const fd = new FormData();
  fd.append("audio", blob, nombre);
  let r;
  try { r = await fetch(`${API}/api/transcribir`, { method: "POST", body: fd }); }
  catch { throw new Error("Se perdió la conexión con el servidor."); }
  if (!r.ok) throw new Error(await textoError(r, "No se pudo transcribir el audio."));
  return r.json();
}

async function apiFicha(texto) {
  let r;
  try {
    r = await fetch(`${API}/api/ficha`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ texto }) });
  } catch { throw new Error("Se perdió la conexión con el servidor."); }
  if (!r.ok) throw new Error(await textoError(r, "Gemini no respondió."));
  return r.json();
}

let ejemploCache = null;
async function cargarEjemplo() {
  if (!ejemploCache) ejemploCache = await (await fetch("data/ejemplo.json")).json();
  return ejemploCache;
}

// ---------- Emparejar con los asentamientos de 2018 ----------
// Devuelve el polígono cuyo nombre coincide (igual, o al menos 75 % de palabras en común).
function poligonoPorNombre(nombre, features) {
  const n = norm(nombre);
  let mejor = null, puntaje = 0;
  const palabras = new Set(n.split(" ").filter((w) => w.length > 2));
  for (const f of features) {
    const m = norm(f.properties.nombre);
    if (m === n) return f;
    const pm = m.split(" ").filter((w) => w.length > 2);
    const comunes = pm.filter((w) => palabras.has(w)).length;
    const s = comunes / Math.max(pm.length, palabras.size, 1);
    if (s > puntaje) { puntaje = s; mejor = f; }
  }
  return puntaje >= 0.75 ? mejor : null;
}

// ---------- Tablero del distrito ----------
function tableroHTML(fichas) {
  const n = fichas.length;
  const fams = fichas.reduce((s, x) => s + (x.ficha.familias?.valor || 0), 0);
  const conDato = (k) => fichas.filter((x) => x.ficha[k]?.valor && x.ficha[k].valor !== "no_mencionado");
  const pct = (lista, pred) => lista.length ? Math.round(100 * lista.filter(pred).length / lista.length) + " %" : "—";
  const nuevos = fichas.filter((x) => x.poligono_id == null).length;
  const riesgo = fichas.filter((x) => (x.ficha.entorno?.valor?.length || 0) + (x.ficha.eventos_12_meses?.valor?.length || 0) > 0);
  const tiles = [
    ["", n, "fichas levantadas"],
    ["", fmt(fams), "familias registradas en esas fichas"],
    ["naranja", nuevos, "asentamientos nuevos, no estaban en 2018"],
    ["naranja", pct(conDato("agua"), (x) => x.ficha.agua.valor !== "red_publica"), "sin agua de red pública"],
    ["naranja", pct(conDato("tenencia"), (x) => x.ficha.tenencia.valor !== "titulo_sin_carga"), "sin título de propiedad"],
    ["naranja", n ? Math.round(100 * riesgo.length / n) + " %" : "—", "con riesgos o eventos recientes"],
  ].map(([c, v, q]) => `<div class="tile ${c}"><span class="num">${v}</span><span class="que">${q}</span></div>`).join("");

  const grafico = (campo, titulo) => {
    const c = CAMPOS[campo];
    const cuenta = {};
    fichas.forEach((x) => {
      const v = x.ficha[campo]?.valor;
      (Array.isArray(v) ? v : [v]).forEach((k) => { if (k && k !== "no_mencionado") cuenta[k] = (cuenta[k] || 0) + 1; });
    });
    const filas = Object.entries(cuenta).sort((a, b) => b[1] - a[1]);
    if (!filas.length) return "";
    const max = Math.max(...filas.map((f) => f[1]));
    return `<div class="grafico"><h3>${titulo}</h3>${filas.map(([k, v]) =>
      `<div class="barra-fila"><span>${esc(etiqueta(campo, k))}</span><span class="pista"><span class="relleno ${claseValor(c, k)}" style="width:${100 * v / max}%"></span></span><span class="n">${v}</span></div>`).join("")}</div>`;
  };
  // Quién levantó cada ficha: sirve para el control de calidad y el avance de cada brigada.
  const porBrigadista = () => {
    if (!fichas.some((x) => x.brigadista)) return "";
    const cuenta = {};
    fichas.forEach((x) => { const b = x.brigadista || "Sin código"; cuenta[b] = (cuenta[b] || 0) + 1; });
    const filas = Object.entries(cuenta).sort((a, b) => b[1] - a[1]);
    const max = Math.max(...filas.map((f) => f[1]));
    return `<div class="grafico"><h3>Fichas por brigadista</h3>${filas.map(([b, v]) =>
      `<div class="barra-fila"><span>${esc(b)}</span><span class="pista"><span class="relleno" style="width:${100 * v / max}%"></span></span><span class="n">${v}</span></div>`).join("")}</div>`;
  };
  const barras = n ? grafico("agua", "Acceso al agua") + grafico("tenencia", "Tenencia del terreno") +
    grafico("problemas", "Problemas que prioriza la dirigencia") + porBrigadista() : "";
  return { tiles, barras };
}

// ---------- Exportar ----------
function csvDeFichas(fichas) {
  const filas = fichas.map(filaPlana);
  const cols = Object.keys(filas[0]);
  return "﻿" + [cols.join(","), ...filas.map((r) => cols.map((c) => `"${String(r[c]).replace(/"/g, '""')}"`).join(","))].join("\n");
}

function geojsonDeFichas(fichas, poligonos) {
  const feats = fichas.map((x) => {
    const geom = x.poligono_id != null
      ? poligonos.features.find((f) => f.properties.id === x.poligono_id).geometry
      : { type: "Point", coordinates: [x.lng, x.lat] };
    return { type: "Feature", geometry: geom, properties: filaPlana(x) };
  });
  return JSON.stringify({ type: "FeatureCollection", features: feats });
}

// ---------- Grabación ----------
// Graba con el micrófono. Avisa cada segundo (alTic), al terminar (alTerminar con el audio)
// o si algo falla (alError con un mensaje claro). La interfaz decide qué mostrar.
function crearGrabadora({ alTic, alTerminar, alError }) {
  let grabador = null, trozos = [], inicio = 0, intervalo = null;
  return {
    get activa() { return grabador?.state === "recording"; },
    async iniciar() {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
        alError("Este navegador no permite grabar. Graba con el celular y usa “Subir un audio”.");
        return;
      }
      let stream;
      try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
      catch (err) { alError(mensajeMicrofono(err)); return; }
      grabador = new MediaRecorder(stream);
      trozos = [];
      grabador.ondataavailable = (e) => { if (e.data.size) trozos.push(e.data); };
      grabador.onstop = () => {
        clearInterval(intervalo);
        stream.getTracks().forEach((t) => t.stop());
        const segundos = (Date.now() - inicio) / 1000;
        if (segundos < MIN_SEGUNDOS) {
          alError(`Grabaste ${Math.round(segundos)} s. Graba al menos ${MIN_SEGUNDOS} segundos de conversación.`);
          return;
        }
        const tipo = grabador.mimeType || "audio/webm";
        const ext = tipo.includes("mp4") ? "m4a" : tipo.includes("ogg") ? "ogg" : "webm";
        alTerminar(new Blob(trozos, { type: tipo }), `grabacion.${ext}`);
      };
      grabador.start(1000);  // entrega el audio por partes: si algo falla, no se pierde todo
      inicio = Date.now();
      alTic(0);
      intervalo = setInterval(() => alTic(Math.floor((Date.now() - inicio) / 1000)), 1000);
    },
    detener() { if (grabador?.state === "recording") grabador.stop(); },
  };
}

const minutos = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

// ---------- Mapa: estilos, tarjetas y leyenda ----------
function estiloPoligonoCon(fichas, f) {
  const act = fichas.find((x) => x.poligono_id === f.properties.id);
  const p = f.properties;
  return {
    color: act ? "#2E7FB8" : p.dato_inconsistente_2018 ? "#1E2620" : "#FFFFFF",
    weight: act ? 4 : p.dato_inconsistente_2018 ? 2.5 : 1.2, opacity: 1,
    dashArray: !act && p.dato_inconsistente_2018 ? "5 4" : null,
    fillColor: colorRango(p.rango_2018), fillOpacity: act ? 0.85 : 0.68,
  };
}

function popupPoligonoCon(fichas, p) {
  const act = fichas.find((x) => x.poligono_id === p.id);
  let html = `<h4>${esc(p.nombre)}</h4><table class="pop-tabla">
    <tr><td>Familias, rango declarado (2018)</td><td>${rangoTxt(p.rango_2018)}</td></tr>
    <tr><td>Familias, número exacto (2018)</td><td>${fmt(p.familias_2018)}</td></tr>
    <tr><td>Área</td><td>${fmt(p.area_m2)} m²</td></tr>`;
  if (p.dato_inconsistente_2018) html += `<tr><td colspan="2" style="color:#1E2620;padding-top:6px">⚠ En 2018 el número exacto no coincide con el rango declarado. Hay que confirmarlo en campo.</td></tr>`;
  if (!p.rango_2018) html += `<tr><td colspan="2" style="color:#5C6660;padding-top:6px">Este polígono no se pudo emparejar con la base de 2018.</td></tr>`;
  if (act) {
    const f = act.ficha;
    html += `<tr><td colspan="2" style="padding-top:8px"><span class="pop-nuevo" style="color:#2E7FB8">Actualizado ${esc(act.fecha)}</span></td></tr>
      <tr><td>Familias (hoy)</td><td>${fmt(f.familias?.valor)}</td></tr>
      <tr><td>Agua</td><td>${esc(etiqueta("agua", f.agua?.valor))}</td></tr>
      <tr><td>Tenencia</td><td>${esc(etiqueta("tenencia", f.tenencia?.valor))}</td></tr>`;
  }
  return html + "</table>";
}

function leyendaHTML() {
  return `<b>Familias declaradas en 2018</b>` +
    TRAMOS.map((t) => `<div class="fila"><span class="caja" style="background:${t.color}"></span>${t.txt}</div>`).join("") +
    `<div class="fila"><span class="caja" style="background:${SIN_DATO}"></span>Sin dato</div>
     <div class="fila"><span class="caja" style="background:transparent;border:2px dashed #1E2620"></span>Dato inconsistente en 2018</div>
     <div class="fila"><span class="caja" style="background:transparent;border:3px solid #2E7FB8"></span>Actualizado con En el Mapa</div>
     <div class="fila"><span class="caja" style="background:#C65D3B;border-radius:50%"></span>Nuevo, no estaba en 2018</div>`;
}


// Punto de un asentamiento nuevo (no estaba en 2018), con su tarjeta.
function marcadorNuevo(x) {
  return L.circleMarker([x.lat, x.lng], { radius: 11, color: "#fff", weight: 2.5, fillColor: "#C65D3B", fillOpacity: 1 })
    .bindPopup(`<span class="pop-nuevo">Nuevo · no estaba en 2018</span><h4>${esc(x.nombre)}</h4>
      <table class="pop-tabla"><tr><td>Familias</td><td>${fmt(x.ficha.familias?.valor)}</td></tr>
      <tr><td>Fundado</td><td>${x.ficha.anio_fundacion?.valor ?? "—"}</td></tr>
      <tr><td>Agua</td><td>${esc(etiqueta("agua", x.ficha.agua?.valor))}</td></tr>
      <tr><td>Tenencia</td><td>${esc(etiqueta("tenencia", x.ficha.tenencia?.valor))}</td></tr></table>`);
}

// ---------- Brechas para el diagnóstico ----------
// Cada brecha mira un campo de la ficha. Si la dirigencia no lo mencionó, ese asentamiento no
// cuenta ni a favor ni en contra (se informa cuántos tienen dato).
const sinDato = (v) => v == null || v === "no_mencionado" || (Array.isArray(v) && !v.length);
const BRECHAS = [
  { campo: "agua", corto: "Agua", txt: "Sin agua de red pública", es: (v) => v !== "red_publica" },
  { campo: "desague", corto: "Desagüe", txt: "Sin desagüe de red pública", es: (v) => v !== "alcantarillado" },
  { campo: "electricidad", corto: "Luz", txt: "Luz irregular o sin luz", es: (v) => ["conexion_irregular", "no_tienen"].includes(v) },
  { campo: "alumbrado", corto: "Alumbrado", txt: "Sin alumbrado público completo", es: (v) => ["no", "parcial"].includes(v) },
  { campo: "tenencia", corto: "Título", txt: "Sin título de propiedad", es: (v) => !["titulo_sin_carga", "titulo_con_carga"].includes(v) },
  { campo: "pisos", corto: "Piso de tierra", txt: "Viviendas con piso de tierra", es: (v) => v === "tierra" },
  { campo: "acceso", corto: "Acceso", txt: "Sin acceso vehicular", es: (v) => ["peatonal", "escaleras"].includes(v) },
  { campo: "emergencias", corto: "Ambulancia", txt: "No entra una ambulancia", es: (v) => !v.includes("ambulancia") },
  { campo: "entorno", corto: "Zona de riesgo", txt: "Expuesto a pendiente, quebrada, pircas u otro riesgo", es: (v) => v.length > 0 },
  { campo: "eventos_12_meses", corto: "Evento reciente", txt: "Tuvo un derrumbe, incendio u otro evento en el último año", es: (v) => v.length > 0 },
  { campo: "combustible", corto: "Leña o carbón", txt: "Cocinan con leña, carbón o kerosene", es: (v) => ["lena_carbon", "kerosene"].includes(v) },
  { campo: "salud_cercana", corto: "Salud lejos", txt: "Centro de salud a más de 30 minutos", es: (v) => v === "mas_30_min" },
];

// Brechas de una ficha: { brechas: [txt…], cortas: [corto…], conDato: n }.
function brechasDe(ficha) {
  const res = { brechas: [], cortas: [], conDato: 0 };
  for (const b of BRECHAS) {
    const v = ficha[b.campo]?.valor;
    if (sinDato(v)) continue;
    res.conDato += 1;
    if (b.es(v)) { res.brechas.push(b.txt); res.cortas.push(b.corto); }
  }
  return res;
}

// Prioridad según cuántas brechas tiene: alta (8 o más de 12), media (4 a 7) o baja.
function prioridadDe(n) {
  return n >= 8 ? { nivel: "alta", txt: "Alta" } : n >= 4 ? { nivel: "media", txt: "Media" } : { nivel: "baja", txt: "Baja" };
}

// Identificador estable de una ficha guardada (las antiguas no lo tenían).
const nuevoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

// ---------- Mostrar un dato de la ficha ----------
function valorTexto(k, d) {
  const c = CAMPOS[k];
  if (c.tipo === "numero") return d.valor == null ? "No se mencionó" : String(d.valor);
  if (c.lista) return d.valor?.length ? d.valor.map((v) => etiqueta(k, v)).join(", ") : "No se mencionó";
  return etiqueta(k, d.valor);
}

function claseCampo(k, d) {
  const c = CAMPOS[k];
  if (d.valor == null || d.valor === "no_mencionado" || (c.lista && !d.valor?.length)) return "nada";
  if (c.lista) return d.valor.some((v) => claseValor(c, v) === "malo") ? "malo" : "";
  return c.tipo === "numero" ? "" : claseValor(c, d.valor);
}
