/* En el Mapa: conversación -> ficha de catastro -> mapa y tablero. */

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

const estiloPoligono = (f) => estiloPoligonoCon(fichas, f);
const popupPoligono = (p) => popupPoligonoCon(fichas, p);
const dibujarLeyenda = () => { $("#leyenda").innerHTML = leyendaHTML(); };

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
  fichas.filter((x) => x.poligono_id == null && x.lat).forEach((x) => marcadorNuevo(x).addTo(marcadoresNuevos));
}

mapa.on("click", (e) => { if (modoUbicar) ubicarNuevo(e.latlng); });

// ---------- Servidor ----------
async function comprobarServidor() {
  const estado = $("#estado-servidor");
  servidorOk = await apiSalud();
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

// Muestra el error y, si se puede reintentar, un botón para hacerlo sin empezar de cero.
function mostrarError(msg, reintentar = null) {
  const e = $("#error");
  e.textContent = msg;
  e.hidden = !msg;
  if (msg && reintentar) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "btn suave reintentar";
    b.textContent = "Reintentar";
    b.addEventListener("click", () => { mostrarError(""); reintentar(); });
    e.append(" ", b);
  }
}

let ocupado = false;
async function procesarAudio(blob, nombre) {
  if (!servidorOk) { mostrarError("Para procesar audio hace falta el servidor. Prueba la entrevista de ejemplo."); return; }
  if (ocupado) return;
  if (blob.size < 2000) {
    mostrarError("La grabación está vacía o es muy corta. Graba al menos 5 segundos de conversación.");
    return;
  }
  ocupado = true;
  mostrarError("");
  $("#progreso").hidden = false;
  marcarProgreso("#p-whisper", "corriendo");
  marcarProgreso("#p-gemini", "");
  let texto = null;
  try {
    const t = await apiTranscribir(blob, nombre);
    texto = t.texto;
    marcarProgreso("#p-whisper", "listo", `${t.duracion_audio} s de audio en ${t.segundos_proceso} s`);
    await llenarConGemini(texto, false);
  } catch (err) {
    if (texto === null) {  // falló Whisper: se reintenta con el mismo audio
      marcarProgreso("#p-whisper", "");
      mostrarError(err.message, () => procesarAudio(blob, nombre));
    } else {               // falló Gemini: se reintenta solo la ficha, sin volver a transcribir
      mostrarError(err.message, () => reintentarFicha(texto));
    }
  } finally { ocupado = false; }
}

async function reintentarFicha(texto) {
  ocupado = true;
  try { await llenarConGemini(texto, false); }
  catch (err) { mostrarError(err.message, () => reintentarFicha(texto)); }
  finally { ocupado = false; }
}

async function llenarConGemini(texto, simulado) {
  marcarProgreso("#p-gemini", "corriendo");
  let ficha;
  try { ficha = await apiFicha(texto); }
  catch (err) { marcarProgreso("#p-gemini", ""); throw err; }
  marcarProgreso("#p-gemini", "listo", `${ficha._modelo} · ${ficha._segundos} s`);
  setTimeout(() => mostrarFicha({ texto, ficha, simulado }), 450);
}

async function usarEjemplo() {
  mostrarError("");
  ejemplo = await cargarEjemplo();
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

  let grupo = "";
  $("#campos").innerHTML = Object.entries(CAMPOS).map(([k, c]) => {
    const d = f[k] || {};
    const titulo = c.grupo !== grupo ? `<p class="grupo-campos">${esc((grupo = c.grupo))}</p>` : "";
    let chips;
    if (c.tipo === "numero") chips = `<span class="chip ${d.valor == null ? "nada" : ""}">${d.valor == null ? "No se mencionó" : esc(d.valor)}</span>`;
    else if (c.lista) chips = (d.valor?.length ? d.valor : [null]).map((v) =>
      `<span class="chip ${v == null ? "nada" : claseValor(c, v)}">${esc(v == null ? "No se mencionó" : etiqueta(k, v))}</span>`).join("");
    else chips = `<span class="chip ${claseValor(c, d.valor)}">${esc(etiqueta(k, d.valor))}</span>`;
    return titulo + `<div class="campo" data-cita="${esc(d.cita || "")}">
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
  const f = poligonoPorNombre(nombre, poligonos.features);
  $("#sel-asentamiento").value = f ? f.properties.id : "nuevo";
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
  fichas.push({ ...datos, fecha: hoy(), simulado: actual.simulado, ficha: actual.ficha });
  escribirGuardadas(fichas);
  paso(3);
  $("#listo").hidden = false;
  dibujarTablero();
}

// ---------- Tablero ----------
function dibujarTablero() {
  $("#nota-tablero").hidden = fichas.length > 0;
  const t = tableroHTML(fichas);
  $("#tiles").innerHTML = t.tiles;
  $("#barras").innerHTML = t.barras;
  if (capaPoligonos) capaPoligonos.setStyle(estiloPoligono);
}

// ---------- Descargas ----------
$("#btn-csv").addEventListener("click", () => {
  if (fichas.length) descargar("en_el_mapa_fichas.csv", csvDeFichas(fichas), "text/csv");
});

$("#btn-geojson").addEventListener("click", () => {
  if (fichas.length) descargar("en_el_mapa_fichas.geojson", geojsonDeFichas(fichas, poligonos), "application/geo+json");
});

// ---------- Grabación ----------
const btnGrabar = $("#btn-grabar");
const txtGrabar = btnGrabar.querySelector(".txt");
const pararBoton = () => { btnGrabar.classList.remove("grabando"); txtGrabar.textContent = "Grabar ahora"; };
const grabadora = crearGrabadora({
  alTic: (s) => { txtGrabar.textContent = `Grabando ${minutos(s)} · clic para terminar`; },
  alTerminar: (blob, nombre) => { pararBoton(); procesarAudio(blob, nombre); },
  alError: (msg) => { pararBoton(); mostrarError(msg); },
});

btnGrabar.addEventListener("click", async () => {
  if (!servidorOk) { mostrarError("Para grabar hace falta el servidor. Prueba la entrevista de ejemplo."); return; }
  if (grabadora.activa) { grabadora.detener(); return; }
  if (ocupado) return;
  mostrarError("");
  btnGrabar.classList.add("grabando");
  await grabadora.iniciar();
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
