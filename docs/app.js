/* En el Mapa: conversación -> ficha de catastro -> mapa y tablero. */

// ---------- Configuración ----------
// En local la API está en el mismo servidor. Publicada en GitHub Pages, usa
// la API desplegada (o ?api=https://... en la URL para probar otra).
const API_PUBLICA = "";
const params = new URLSearchParams(location.search);
const ES_LOCAL = ["localhost", "127.0.0.1"].includes(location.hostname);
const API = params.get("api") || (ES_LOCAL ? "" : API_PUBLICA);
const CLAVE_LOCAL = "enelmapa_fichas_v1";

// ---------- Etiquetas de la ficha (TECHO, Ficha de Catastro 2018) ----------
const CAMPOS = {
  familias: { etq: "Familias", tipo: "numero" },
  anio_fundacion: { etq: "Año de fundación", tipo: "numero" },
  constitucion: { etq: "Cómo se formó", ops: {
    ocupacion_hormiga: "Ocupación progresiva", ocupacion_organizada: "Ocupación organizada",
    compra_a_tercero: "Compra a un tercero", lotizacion_estatal: "Lotización estatal", otra: "Otra" } },
  tenencia: { etq: "Tenencia del terreno", ops: {
    titulo_sin_carga: "Título sin carga", titulo_con_carga: "Título con carga",
    constancia_posesion: "Constancia de posesión", contrato_compraventa: "Contrato de compra-venta",
    ninguno: "Ningún documento", otro: "Otro" }, bueno: ["titulo_sin_carga"],
    malo: ["constancia_posesion", "ninguno", "contrato_compraventa"] },
  agua: { etq: "Agua", ops: {
    red_publica: "Red pública", cisterna: "Camión cisterna", pilon_comunitario: "Pilón comunitario",
    pozo: "Pozo", fuente_natural: "Fuente natural", no_tienen: "No tienen", otro: "Otro" },
    bueno: ["red_publica"], malo: ["cisterna", "pozo", "fuente_natural", "no_tienen"] },
  desague: { etq: "Desagüe", ops: {
    alcantarillado: "Red pública", pozo_ciego: "Pozo ciego", silo_letrina: "Silo o letrina",
    bano_seco: "Baño seco", no_tienen: "No tienen", otro: "Otro" },
    bueno: ["alcantarillado"], malo: ["pozo_ciego", "silo_letrina", "no_tienen"] },
  electricidad: { etq: "Electricidad", ops: {
    medidor_domiciliario: "Medidor propio", medidor_comunitario: "Medidor comunitario",
    conexion_irregular: "Conexión irregular", no_tienen: "No tienen", otro: "Otro" },
    bueno: ["medidor_domiciliario"], malo: ["conexion_irregular", "no_tienen"] },
  paredes: { etq: "Paredes", ops: {
    ladrillo_cemento: "Ladrillo o cemento", adobe: "Adobe", madera: "Madera", esteras: "Esteras",
    desechos: "Material de desecho", otro: "Otro" }, bueno: ["ladrillo_cemento"],
    malo: ["madera", "esteras", "desechos"] },
  techos: { etq: "Techos", ops: {
    concreto: "Concreto", calamina_eternit: "Calamina o eternit", madera: "Madera",
    esteras: "Esteras", desechos: "Material de desecho", otro: "Otro" }, bueno: ["concreto"],
    malo: ["calamina_eternit", "esteras", "desechos"] },
  entorno: { etq: "Riesgos del entorno", lista: true, malo: "todos", ops: {
    cerro_pendiente: "Pendiente", quebrada: "Quebrada", torres_alta_tension: "Torres de alta tensión",
    basural: "Basural", pircas: "Pircas", otro: "Otro" } },
  eventos_12_meses: { etq: "Últimos 12 meses", lista: true, malo: "todos", ops: {
    derrumbes: "Derrumbe", incendios: "Incendio", huaicos_inundaciones: "Huaico o inundación",
    caida_postes: "Caída de postes", otro: "Otro" } },
  organizacion: { etq: "Organización", ops: {
    junta_directiva: "Junta directiva", comites: "Comités", sin_organizacion: "Sin organización" },
    bueno: ["junta_directiva", "comites"] },
  reuniones: { etq: "Se reúnen", ops: {
    semanal: "Cada semana", quincenal: "Cada 15 días", mensual: "Cada mes", otra: "Otra" } },
  problemas: { etq: "Problemas principales", lista: true, ops: {
    agua: "Agua", desague: "Desagüe", zona_de_riesgo: "Zona de riesgo", titulacion: "Titulación",
    inseguridad: "Inseguridad", caminos: "Caminos", basura: "Basura", electricidad: "Electricidad",
    salud: "Salud", educacion: "Educación", empleo: "Empleo", otro: "Otro" } },
};

// ---------- Utilidades ----------
const $ = (s) => document.querySelector(s);
const fmt = (n) => n == null ? "—" : Number(n).toLocaleString("es-PE").replace(/,/g, " ");
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
  .replace(/\b(aa\.?\s?hh\.?|asentamiento humano|asociacion|agrupacion|de propietarios|de vivienda|organizacion vecinal)\b/g, " ")
  .replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

function leerGuardadas() {
  try { return JSON.parse(localStorage.getItem(CLAVE_LOCAL)) || []; } catch { return []; }
}
function escribirGuardadas(lista) {
  try { localStorage.setItem(CLAVE_LOCAL, JSON.stringify(lista)); } catch { /* sin almacenamiento */ }
}

// ---------- Estado ----------
let servidorOk = false;
let ejemplo = null;
let actual = null;          // { texto, ficha, simulado }
let poligonos = null;       // GeoJSON 2018
let capaPoligonos = null;
const capasPorId = {};
let fichas = leerGuardadas();
let modoUbicar = false;
const marcadoresNuevos = L.layerGroup();

// ---------- Mapa ----------
// Las tarjetas se abren con margen para que el botón de capas no las tape.
L.Popup.mergeOptions({ autoPanPaddingTopLeft: L.point(16, 72), autoPanPaddingBottomRight: L.point(16, 16) });
const mapa = L.map("mapa", { zoomControl: true, scrollWheelZoom: true });
// Calles y nombres de OpenStreetMap: muestra también lo que falta (muchos asentamientos casi no aparecen).
const base = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; colaboradores de OpenStreetMap", maxZoom: 19 });
const satelite = L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  { attribution: "Esri, Maxar, Earthstar Geographics", maxZoom: 19 });
satelite.addTo(mapa);
L.control.layers({ "Satélite": satelite, "Calles (OpenStreetMap)": base }, null, { position: "topright" }).addTo(mapa);
marcadoresNuevos.addTo(mapa);
mapa.setView([-12.127, -76.951], 15);

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

function estiloPoligono(f) {
  const act = fichas.find((x) => x.poligono_id === f.properties.id);
  const p = f.properties;
  return {
    color: act ? "#2E7FB8" : p.dato_inconsistente_2018 ? "#1E2620" : "#FFFFFF",
    weight: act ? 4 : p.dato_inconsistente_2018 ? 2.5 : 1.2, opacity: 1,
    dashArray: !act && p.dato_inconsistente_2018 ? "5 4" : null,
    fillColor: colorRango(p.rango_2018), fillOpacity: act ? 0.85 : 0.68,
  };
}

function popupPoligono(p) {
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

function dibujarLeyenda() {
  $("#leyenda").innerHTML = `<b>Familias declaradas en 2018</b>` +
    TRAMOS.map((t) => `<div class="fila"><span class="caja" style="background:${t.color}"></span>${t.txt}</div>`).join("") +
    `<div class="fila"><span class="caja" style="background:${SIN_DATO}"></span>Sin dato</div>
     <div class="fila"><span class="caja" style="background:transparent;border:2px dashed #1E2620"></span>Dato inconsistente en 2018</div>
     <div class="fila"><span class="caja" style="background:transparent;border:3px solid #2E7FB8"></span>Actualizado con En el Mapa</div>
     <div class="fila"><span class="caja" style="background:#C65D3B;border-radius:50%"></span>Nuevo, no estaba en 2018</div>`;
}

async function cargarPoligonos() {
  poligonos = await (await fetch("data/asentamientos_sjm_2018.geojson")).json();
  capaPoligonos = L.geoJSON(poligonos, {
    style: estiloPoligono,
    onEachFeature: (f, capa) => {
      capasPorId[f.properties.id] = capa;
      capa.bindTooltip(esc(f.properties.nombre), { sticky: true });
      capa.on("click", (e) => {
        if (modoUbicar) { ubicarNuevo(e.latlng); return; }
        capa.bindPopup(popupPoligono(f.properties)).openPopup(e.latlng);
      });
    },
  }).addTo(mapa);
  mapa.fitBounds(capaPoligonos.getBounds(), { padding: [20, 20] });
  dibujarLeyenda();
  llenarSelector();
  dibujarNuevos();
}

function dibujarNuevos() {
  marcadoresNuevos.clearLayers();
  fichas.filter((x) => x.poligono_id == null && x.lat).forEach((x) => {
    L.circleMarker([x.lat, x.lng], { radius: 11, color: "#fff", weight: 2.5, fillColor: "#C65D3B", fillOpacity: 1 })
      .bindPopup(`<span class="pop-nuevo">Nuevo · no estaba en 2018</span><h4>${esc(x.nombre)}</h4>
        <table class="pop-tabla"><tr><td>Familias</td><td>${fmt(x.ficha.familias?.valor)}</td></tr>
        <tr><td>Fundado</td><td>${x.ficha.anio_fundacion?.valor ?? "—"}</td></tr>
        <tr><td>Agua</td><td>${esc(etiqueta("agua", x.ficha.agua?.valor))}</td></tr>
        <tr><td>Tenencia</td><td>${esc(etiqueta("tenencia", x.ficha.tenencia?.valor))}</td></tr></table>`)
      .addTo(marcadoresNuevos);
  });
}

mapa.on("click", (e) => { if (modoUbicar) ubicarNuevo(e.latlng); });

// ---------- Servidor ----------
async function comprobarServidor() {
  const estado = $("#estado-servidor");
  try {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 5000);
    const r = await fetch(`${API}/api/salud`, { signal: ctrl.signal });
    const j = await r.json();
    servidorOk = !!j.ok && j.gemini;
  } catch { servidorOk = false; }
  if (servidorOk) {
    estado.className = "estado-servidor en-vivo";
    estado.textContent = "Servidor conectado: Whisper y Gemini en vivo.";
  } else {
    estado.className = "estado-servidor sin-servidor";
    estado.textContent = "Modo demostración: el servidor no está activo, así que la entrevista de ejemplo muestra un resultado ya procesado. Grabar y subir audio necesitan el servidor.";
    $("#btn-grabar").classList.add("apagado");
    $("#btn-subir").classList.add("apagado");
  }
}

// ---------- Flujo ----------
function paso(n) {
  document.querySelectorAll("#pasos li").forEach((li) => {
    const k = Number(li.dataset.paso);
    li.classList.toggle("activo", k === n);
    li.classList.toggle("hecho", k < n);
  });
  $("#etapa-1").hidden = n !== 1;
  $("#etapa-2").hidden = n === 1;
}

function marcarProgreso(id, estado, detalle = "") {
  const li = $(id);
  li.className = estado;
  li.querySelector("small")?.remove();
  if (detalle) li.insertAdjacentHTML("beforeend", `<small>${esc(detalle)}</small>`);
}

function mostrarError(msg) {
  const e = $("#error");
  e.textContent = msg;
  e.hidden = !msg;
}

async function procesarAudio(blob, nombre) {
  if (!servidorOk) { mostrarError("Para procesar audio hace falta el servidor. Prueba la entrevista de ejemplo."); return; }
  mostrarError("");
  $("#progreso").hidden = false;
  marcarProgreso("#p-whisper", "corriendo");
  marcarProgreso("#p-gemini", "");
  try {
    const fd = new FormData();
    fd.append("audio", blob, nombre);
    const r = await fetch(`${API}/api/transcribir`, { method: "POST", body: fd });
    if (!r.ok) throw new Error((await r.json()).detail || "No se pudo transcribir");
    const t = await r.json();
    marcarProgreso("#p-whisper", "listo", `${t.duracion_audio} s de audio en ${t.segundos_proceso} s`);
    await llenarConGemini(t.texto, false);
  } catch (err) {
    marcarProgreso("#p-whisper", "");
    mostrarError(err.message);
  }
}

async function llenarConGemini(texto, simulado) {
  marcarProgreso("#p-gemini", "corriendo");
  const r = await fetch(`${API}/api/ficha`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ texto }) });
  if (!r.ok) { marcarProgreso("#p-gemini", ""); throw new Error((await r.json()).detail || "Gemini no respondió"); }
  const ficha = await r.json();
  marcarProgreso("#p-gemini", "listo", `${ficha._modelo} · ${ficha._segundos} s`);
  setTimeout(() => mostrarFicha({ texto, ficha, simulado }), 450);
}

async function usarEjemplo() {
  mostrarError("");
  if (!ejemplo) ejemplo = await (await fetch("data/ejemplo.json")).json();
  $("#progreso").hidden = false;
  marcarProgreso("#p-whisper", "listo", "entrevista de ejemplo en texto");
  if (servidorOk) {
    try { await llenarConGemini(ejemplo.texto, true); return; }
    catch { /* si Gemini falla en vivo, se muestra el resultado guardado */ }
  }
  marcarProgreso("#p-gemini", "corriendo");
  setTimeout(() => {
    marcarProgreso("#p-gemini", "listo", "resultado guardado");
    setTimeout(() => mostrarFicha({ texto: ejemplo.texto, ficha: ejemplo.ficha, simulado: true }), 400);
  }, 900);
}

// ---------- Ficha ----------
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

function mostrarFicha(datos) {
  actual = datos;
  const f = datos.ficha;
  $("#ficha-nombre").textContent = f.nombre_asentamiento || "Asentamiento sin nombre";
  $("#ficha-etiqueta").textContent = "Ficha de Catastro · " + new Date().toLocaleDateString("es-PE");
  $("#ficha-sello").textContent = datos.simulado ? "Entrevista simulada" : "Revisar antes de guardar";
  $("#ficha-resumen").textContent = f.resumen || "";
  const ver = f.por_verificar || [];
  $("#ficha-verificar").hidden = !ver.length;
  $("#ficha-verificar").innerHTML = `<b>Para confirmar en campo</b><ul>${ver.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;

  $("#campos").innerHTML = Object.entries(CAMPOS).map(([k, c]) => {
    const d = f[k] || {};
    let chips;
    if (c.tipo === "numero") chips = `<span class="chip ${d.valor == null ? "nada" : ""}">${d.valor == null ? "No se mencionó" : esc(d.valor)}</span>`;
    else if (c.lista) chips = (d.valor?.length ? d.valor : [null]).map((v) =>
      `<span class="chip ${v == null ? "nada" : claseValor(c, v)}">${esc(v == null ? "No se mencionó" : etiqueta(k, v))}</span>`).join("");
    else chips = `<span class="chip ${claseValor(c, d.valor)}">${esc(etiqueta(k, d.valor))}</span>`;
    return `<div class="campo" data-cita="${esc(d.cita || "")}">
      <div class="fila"><span class="etq">${c.etq}</span><span class="chips">${chips}</span></div>
      ${d.cita ? `<p class="cita">${esc(d.cita)}</p>` : ""}</div>`;
  }).join("");

  $("#transcripcion").textContent = datos.texto;
  document.querySelectorAll(".campo").forEach((el) => el.addEventListener("click", () => resaltarCita(el)));
  preseleccionar(f.nombre_asentamiento);
  paso(2);
  $("#listo").hidden = true;
  $(".panel").scrollTop = 0;
}

function resaltarCita(el) {
  document.querySelectorAll(".campo.marcado").forEach((x) => x.classList.remove("marcado"));
  el.classList.add("marcado");
  const cita = el.dataset.cita;
  const cont = $("#transcripcion");
  cont.textContent = actual.texto;
  if (!cita) return;
  const i = actual.texto.toLowerCase().indexOf(cita.toLowerCase().slice(0, 40));
  if (i < 0) return;
  const fin = Math.min(actual.texto.length, i + cita.length);
  cont.innerHTML = esc(actual.texto.slice(0, i)) + "<mark>" + esc(actual.texto.slice(i, fin)) + "</mark>" + esc(actual.texto.slice(fin));
  cont.closest("details").open = true;
  cont.querySelector("mark")?.scrollIntoView({ block: "center", behavior: "smooth" });
}

function llenarSelector() {
  const ops = poligonos.features.map((f) => f.properties).sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  $("#sel-asentamiento").innerHTML = `<option value="nuevo">No, es nuevo: lo ubico con un clic en el mapa</option>` +
    ops.map((p) => `<option value="${p.id}">${esc(p.nombre)}${p.rango_2018 ? ` · ${rangoTxt(p.rango_2018)} familias en 2018` : ""}</option>`).join("");
}

function preseleccionar(nombre) {
  const n = norm(nombre);
  let mejor = null, puntaje = 0;
  const palabras = new Set(n.split(" ").filter((w) => w.length > 2));
  for (const f of poligonos.features) {
    const m = norm(f.properties.nombre);
    if (m === n) { mejor = f; puntaje = 1; break; }
    const pm = m.split(" ").filter((w) => w.length > 2);
    const comunes = pm.filter((w) => palabras.has(w)).length;
    const s = comunes / Math.max(pm.length, palabras.size, 1);
    if (s > puntaje) { puntaje = s; mejor = f; }
  }
  $("#sel-asentamiento").value = mejor && puntaje >= 0.75 ? mejor.properties.id : "nuevo";
}

// ---------- Guardar y ubicar ----------
function guardar() {
  const sel = $("#sel-asentamiento").value;
  if (sel === "nuevo") {
    modoUbicar = true;
    $("#aviso-mapa").hidden = false;
    mapa.getContainer().style.cursor = "crosshair";
    if (window.innerWidth < 900) $(".mapa-caja").scrollIntoView({ behavior: "smooth" });
    return;
  }
  const id = Number(sel);
  const p = poligonos.features.find((f) => f.properties.id === id).properties;
  registrar({ poligono_id: id, nombre: p.nombre });
  const capa = capasPorId[id];
  capaPoligonos.resetStyle(capa);
  mapa.flyToBounds(capa.getBounds(), { maxZoom: 17, duration: 1 });
  setTimeout(() => capa.bindPopup(popupPoligono(p)).openPopup(), 1100);
}

function ubicarNuevo(latlng) {
  modoUbicar = false;
  $("#aviso-mapa").hidden = true;
  mapa.getContainer().style.cursor = "";
  registrar({ poligono_id: null, nombre: actual.ficha.nombre_asentamiento || "Asentamiento nuevo",
    lat: +latlng.lat.toFixed(6), lng: +latlng.lng.toFixed(6) });
  dibujarNuevos();
  marcadoresNuevos.getLayers().at(-1)?.openPopup();
}

function registrar(datos) {
  fichas = fichas.filter((x) => !(datos.poligono_id != null && x.poligono_id === datos.poligono_id));
  fichas.push({ ...datos, fecha: new Date().toISOString().slice(0, 10), simulado: actual.simulado, ficha: actual.ficha });
  escribirGuardadas(fichas);
  paso(3);
  $("#listo").hidden = false;
  dibujarTablero();
}

// ---------- Tablero ----------
function dibujarTablero() {
  const n = fichas.length;
  $("#nota-tablero").hidden = n > 0;
  const fams = fichas.reduce((s, x) => s + (x.ficha.familias?.valor || 0), 0);
  const conDato = (k) => fichas.filter((x) => x.ficha[k]?.valor && x.ficha[k].valor !== "no_mencionado");
  const pct = (lista, pred) => lista.length ? Math.round(100 * lista.filter(pred).length / lista.length) + " %" : "—";
  const nuevos = fichas.filter((x) => x.poligono_id == null).length;
  const riesgo = fichas.filter((x) => (x.ficha.entorno?.valor?.length || 0) + (x.ficha.eventos_12_meses?.valor?.length || 0) > 0);
  $("#tiles").innerHTML = [
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
  $("#barras").innerHTML = n ? grafico("agua", "Acceso al agua") + grafico("tenencia", "Tenencia del terreno") +
    grafico("problemas", "Problemas que prioriza la dirigencia") : "";
  if (capaPoligonos) capaPoligonos.setStyle(estiloPoligono);
}

// ---------- Descargas ----------
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
    fecha: x.fecha, simulado: x.simulado ? "si" : "no" };
  for (const k of Object.keys(CAMPOS)) {
    const v = f[k]?.valor;
    fila[k] = Array.isArray(v) ? v.join("|") : (v ?? "");
    fila[k + "_cita"] = f[k]?.cita || "";
  }
  return fila;
}

$("#btn-csv").addEventListener("click", () => {
  if (!fichas.length) return;
  const filas = fichas.map(filaPlana);
  const cols = Object.keys(filas[0]);
  const csv = [cols.join(","), ...filas.map((r) => cols.map((c) => `"${String(r[c]).replace(/"/g, '""')}"`).join(","))].join("\n");
  descargar("en_el_mapa_fichas.csv", "﻿" + csv, "text/csv");
});

$("#btn-geojson").addEventListener("click", () => {
  if (!fichas.length) return;
  const feats = fichas.map((x) => {
    const geom = x.poligono_id != null
      ? poligonos.features.find((f) => f.properties.id === x.poligono_id).geometry
      : { type: "Point", coordinates: [x.lng, x.lat] };
    return { type: "Feature", geometry: geom, properties: filaPlana(x) };
  });
  descargar("en_el_mapa_fichas.geojson", JSON.stringify({ type: "FeatureCollection", features: feats }), "application/geo+json");
});

// ---------- Grabación ----------
let grabador = null, trozos = [];
$("#btn-grabar").addEventListener("click", async () => {
  if (!servidorOk) { mostrarError("Para grabar hace falta el servidor. Prueba la entrevista de ejemplo."); return; }
  const btn = $("#btn-grabar");
  if (grabador?.state === "recording") { grabador.stop(); return; }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    grabador = new MediaRecorder(stream);
    trozos = [];
    grabador.ondataavailable = (e) => trozos.push(e.data);
    grabador.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      btn.classList.remove("grabando");
      btn.querySelector(".txt").textContent = "Grabar ahora";
      procesarAudio(new Blob(trozos, { type: grabador.mimeType }), "grabacion.webm");
    };
    grabador.start();
    btn.classList.add("grabando");
    btn.querySelector(".txt").textContent = "Grabando… clic para terminar";
  } catch { mostrarError("No se pudo usar el micrófono. Revisa los permisos del navegador."); }
});

$("#archivo").addEventListener("change", (e) => {
  const f = e.target.files[0];
  if (f) procesarAudio(f, f.name);
  e.target.value = "";
});
$("#btn-subir").addEventListener("click", (e) => {
  if (!servidorOk) { e.preventDefault(); mostrarError("Para subir audio hace falta el servidor. Prueba la entrevista de ejemplo."); }
});
$("#btn-ejemplo").addEventListener("click", () => usarEjemplo().catch((e) => mostrarError(e.message)));
$("#btn-guardar").addEventListener("click", guardar);
$("#btn-otra").addEventListener("click", () => {
  paso(1);
  $("#progreso").hidden = true;
  mostrarError("");
});

// ---------- Inicio ----------
cargarPoligonos();
// ?auto=1 corre el ejemplo solo; ?auto=2 además lo guarda en el mapa (capturas y video).
if (params.has("auto")) setTimeout(async () => {
  await usarEjemplo();
  if (params.get("auto") === "2") setTimeout(() => { guardar(); ubicarNuevo(L.latLng(-12.1192, -76.9447)); }, 2500);
}, 1500);
comprobarServidor();
dibujarTablero();
