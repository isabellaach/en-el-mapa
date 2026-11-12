/* En el Mapa · app del celular: conversación → ficha → mapa, en pantallas separadas.
   Usa comun.js (API, ficha, mapa y tablero), igual que la página. */

// ---------- Estado ----------
let servidorOk = false;
let fichas = leerGuardadas();
let actual = null;            // { texto, ficha, simulado }
let poligonos = null;         // GeoJSON 2018
let capaPoligonos = null;
const capasPorId = {};
let modoUbicar = false;
let mapaAjustado = false;
let ocupado = false;
const marcadoresNuevos = L.layerGroup();

// ---------- Navegación ----------
function irA(vista) {
  document.querySelectorAll(".vista").forEach((v) => v.classList.toggle("activa", v.id === vista));
  document.querySelectorAll(".tabs button").forEach((b) => b.classList.toggle("activa", b.dataset.vista === vista));
  if (vista === "v-mapa") setTimeout(() => {
    mapa.invalidateSize();
    // La primera vez que se ve, se encuadra el distrito (oculto no se puede medir).
    if (!mapaAjustado && capaPoligonos) { mapa.fitBounds(capaPoligonos.getBounds(), { padding: [16, 16] }); mapaAjustado = true; }
  }, 50);
  if (vista === "v-fichas") dibujarLista();
  if (vista === "v-tablero") dibujarTablero();
}

function etapa(id) {
  document.querySelectorAll("#v-nueva .etapa").forEach((e) => { e.hidden = e.id !== id; });
  $("#v-nueva").scrollTop = 0;
}

document.querySelectorAll(".tabs button").forEach((b) => b.addEventListener("click", () => {
  if (modoUbicar) cancelarUbicar();
  irA(b.dataset.vista);
}));

function avisoBreve(txt) {
  const a = $("#aviso-breve");
  a.textContent = txt;
  a.hidden = false;
  clearTimeout(avisoBreve.t);
  avisoBreve.t = setTimeout(() => { a.hidden = true; }, 2200);
}

// ---------- Hoja inferior ----------
function abrirHoja(html) {
  $("#hoja-contenido").innerHTML = html;
  $("#hoja").hidden = false;
  $("#velo").hidden = false;
  $("#hoja").scrollTop = 0;
}
function cerrarHoja() { $("#hoja").hidden = true; $("#velo").hidden = true; }
$("#hoja-cerrar").addEventListener("click", cerrarHoja);
$("#velo").addEventListener("click", cerrarHoja);

// ---------- Mapa ----------
const mapa = L.map("mapa-app", { zoomControl: false, attributionControl: true });
const satelite = L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  { attribution: "Esri, Maxar", maxZoom: 19 }).addTo(mapa);
const calles = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  { attribution: "&copy; OpenStreetMap", maxZoom: 19 });
L.control.layers({ "Satélite": satelite, "Calles": calles }, null, { position: "topright" }).addTo(mapa);
marcadoresNuevos.addTo(mapa);
mapa.setView([-12.127, -76.951], 15);

const estiloPoligono = (f) => estiloPoligonoCon(fichas, f);

async function cargarPoligonos() {
  poligonos = await (await fetch("data/asentamientos_sjm_2018.geojson")).json();
  capaPoligonos = L.geoJSON(poligonos, {
    style: estiloPoligono,
    onEachFeature: (f, capa) => {
      capasPorId[f.properties.id] = capa;
      capa.on("click", (e) => {
        if (modoUbicar) { ubicarNuevo(e.latlng); return; }
        capa.bindPopup(popupPoligonoCon(fichas, f.properties)).openPopup(e.latlng);
      });
    },
  }).addTo(mapa);
  if ($("#v-mapa").classList.contains("activa")) {
    mapa.invalidateSize();
    mapa.fitBounds(capaPoligonos.getBounds(), { padding: [16, 16] });
    mapaAjustado = true;
  }
  $("#leyenda").innerHTML = leyendaHTML();
  dibujarNuevos();
}

function dibujarNuevos() {
  marcadoresNuevos.clearLayers();
  fichas.filter((x) => x.poligono_id == null && x.lat).forEach((x) => marcadorNuevo(x).addTo(marcadoresNuevos));
  if (capaPoligonos) capaPoligonos.setStyle(estiloPoligono);
}

mapa.on("click", (e) => { if (modoUbicar) ubicarNuevo(e.latlng); });
$("#btn-leyenda").addEventListener("click", () => { $("#leyenda").hidden = !$("#leyenda").hidden; });

// ---------- Servidor ----------
async function comprobarServidor() {
  servidorOk = await apiSalud();
  const chip = $("#chip-estado");
  chip.classList.toggle("en-vivo", servidorOk);
  chip.textContent = servidorOk ? "En vivo" : "Demo";
  $("#btn-grabar").classList.toggle("apagado", !servidorOk);
  $("#btn-subir").classList.toggle("apagado", !servidorOk);
  if (!servidorOk) $("#grabar-txt").textContent = "Grabar necesita el servidor · prueba el ejemplo";
}

// ---------- Paso 1: conversación ----------
function mostrarError(id, msg, reintentar = null) {
  const e = $(id);
  e.textContent = msg;
  e.hidden = !msg;
  if (msg && reintentar) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "btn suave";
    b.textContent = "Reintentar";
    b.addEventListener("click", () => { e.hidden = true; reintentar(); });
    e.append(b);
  }
}

function marcarProgreso(id, estado, detalle = "") {
  const li = $(id);
  li.className = estado;
  li.querySelector("small")?.remove();
  if (detalle) li.insertAdjacentHTML("beforeend", `<small>${esc(detalle)}</small>`);
}

function empezarProceso() {
  etapa("e-proceso");
  mostrarError("#error-proceso", "");
  $("#btn-cancelar").hidden = true;
  marcarProgreso("#p-whisper", "corriendo");
  marcarProgreso("#p-gemini", "");
}

function falloProceso(msg, reintentar) {
  mostrarError("#error-proceso", msg, reintentar);
  $("#btn-cancelar").hidden = false;
}

async function procesarAudio(blob, nombre) {
  if (!servidorOk) { mostrarError("#error", "Para procesar audio hace falta el servidor. Prueba la entrevista de ejemplo."); return; }
  if (ocupado) return;
  if (blob.size < 2000) { mostrarError("#error", "La grabación está vacía o es muy corta. Graba al menos 5 segundos de conversación."); return; }
  ocupado = true;
  empezarProceso();
  let texto = null;
  try {
    const t = await apiTranscribir(blob, nombre);
    texto = t.texto;
    marcarProgreso("#p-whisper", "listo", `${t.duracion_audio} s de audio en ${t.segundos_proceso} s`);
    await llenarFicha(texto, false);
  } catch (err) {
    if (texto === null) { marcarProgreso("#p-whisper", ""); falloProceso(err.message, () => { ocupado = false; procesarAudio(blob, nombre); }); }
    else falloProceso(err.message, () => reintentarFicha(texto));
  } finally { ocupado = false; }
}

async function reintentarFicha(texto) {
  ocupado = true;
  $("#btn-cancelar").hidden = true;
  try { await llenarFicha(texto, false); }
  catch (err) { falloProceso(err.message, () => reintentarFicha(texto)); }
  finally { ocupado = false; }
}

async function llenarFicha(texto, simulado) {
  marcarProgreso("#p-gemini", "corriendo");
  let ficha;
  try { ficha = await apiFicha(texto); }
  catch (err) { marcarProgreso("#p-gemini", ""); throw err; }
  marcarProgreso("#p-gemini", "listo", `${ficha._modelo} · ${ficha._segundos} s`);
  setTimeout(() => mostrarFicha({ texto, ficha, simulado }), 400);
}

async function usarEjemplo() {
  if (ocupado) return;
  const ej = await cargarEjemplo();
  empezarProceso();
  marcarProgreso("#p-whisper", "listo", "entrevista de ejemplo, ya en texto");
  if (servidorOk) {
    try { await llenarFicha(ej.texto, true); return; }
    catch { /* si Gemini falla en vivo, se muestra el resultado guardado */ }
  }
  marcarProgreso("#p-gemini", "corriendo");
  setTimeout(() => {
    marcarProgreso("#p-gemini", "listo", "resultado guardado");
    setTimeout(() => mostrarFicha({ texto: ej.texto, ficha: ej.ficha, simulado: true }), 350);
  }, 800);
}

const btnGrabar = $("#btn-grabar");
const pararGrabar = () => { btnGrabar.classList.remove("grabando"); $("#grabar-txt").textContent = "Toca para grabar"; };
const grabadora = crearGrabadora({
  alTic: (s) => { $("#grabar-txt").textContent = `Grabando ${minutos(s)} · toca para terminar`; },
  alTerminar: (blob, nombre) => { pararGrabar(); procesarAudio(blob, nombre); },
  alError: (msg) => { pararGrabar(); mostrarError("#error", msg); },
});

btnGrabar.addEventListener("click", async () => {
  if (!servidorOk) { mostrarError("#error", "Grabar necesita el servidor de En el Mapa. Prueba la entrevista de ejemplo."); return; }
  if (grabadora.activa) { grabadora.detener(); return; }
  if (ocupado) return;
  mostrarError("#error", "");
  btnGrabar.classList.add("grabando");
  await grabadora.iniciar();
});

$("#btn-subir").addEventListener("click", (e) => {
  if (!servidorOk) { e.preventDefault(); mostrarError("#error", "Subir audio necesita el servidor de En el Mapa. Prueba la entrevista de ejemplo."); }
});
$("#archivo").addEventListener("change", (e) => {
  const f = e.target.files[0];
  if (f) procesarAudio(f, f.name);
  e.target.value = "";
});
$("#btn-ejemplo").addEventListener("click", () => usarEjemplo().catch((e) => falloProceso(e.message)));
$("#btn-cancelar").addEventListener("click", () => etapa("e-inicio"));

$("#btn-guia").addEventListener("click", () => abrirHoja(`
  <h2>Guía de preguntas</h2>
  <p class="contexto">Unos 15 minutos con la dirigencia. No pidas nombres, DNI ni teléfonos.</p>
  <ol>
    <li><b>Origen:</b> ¿en qué año llegaron? ¿Cómo se formó el asentamiento? ¿Cuántas familias viven hoy?</li>
    <li><b>Terreno:</b> ¿qué documento tienen sobre el terreno?</li>
    <li><b>Servicios:</b> ¿de dónde sacan el agua? ¿Qué usan como desagüe? ¿Cómo tienen la luz?</li>
    <li><b>Viviendas:</b> ¿de qué son la mayoría de paredes y techos?</li>
    <li><b>Riesgo:</b> ¿hay pendiente, quebrada, pircas, torres o basural? ¿Qué pasó en los últimos 12 meses?</li>
    <li><b>Organización:</b> ¿tienen junta directiva? ¿Cada cuánto se reúnen? ¿Cuáles son sus tres problemas principales?</li>
  </ol>
  <p class="contexto"><b>Sin señal:</b> graba con la grabadora del celular y súbelo después con “Subir un audio”.</p>`));

// ---------- Paso 2: revisar la ficha ----------
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

function tarjetasHTML(f) {
  return Object.entries(CAMPOS).map(([k, c]) => {
    const d = f[k] || {};
    const ancha = c.lista ? " ancha" : "";
    return `<button type="button" class="tarjeta${ancha}" data-campo="${k}">
      ${d.cita ? `<span class="tiene-cita">“ ”</span>` : ""}
      <span class="etq">${c.etq}</span><span class="val ${claseCampo(k, d)}">${esc(valorTexto(k, d))}</span></button>`;
  }).join("");
}

function verificarHTML(f) {
  const ver = f.por_verificar || [];
  return ver.length ? `<b>Para confirmar en campo</b><ul>${ver.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : "";
}

function mostrarFicha(datos) {
  actual = datos;
  const f = datos.ficha;
  $("#ficha-nombre").textContent = f.nombre_asentamiento || "Asentamiento sin nombre";
  $("#ficha-sello").textContent = datos.simulado ? "Entrevista simulada" : "Revísala antes de guardar";
  $("#ficha-resumen").textContent = f.resumen || "";
  $("#ficha-verificar").innerHTML = verificarHTML(f);
  $("#ficha-verificar").hidden = !(f.por_verificar || []).length;
  $("#campos").innerHTML = tarjetasHTML(f);
  conectarCitas($("#campos"), datos);
  etapa("e-ficha");
}

// Al tocar un dato: la frase que lo respalda, resaltada dentro de la conversación.
function conectarCitas(cont, datos) {
  cont.querySelectorAll(".tarjeta").forEach((t) => t.addEventListener("click", () => {
    const k = t.dataset.campo;
    const d = datos.ficha[k] || {};
    let contexto = "";
    if (d.cita && datos.texto) {
      const i = datos.texto.toLowerCase().indexOf(d.cita.toLowerCase().slice(0, 40));
      if (i >= 0) {
        const ini = Math.max(0, i - 160), fin = Math.min(datos.texto.length, i + d.cita.length);
        contexto = `<p class="contexto">${ini > 0 ? "…" : ""}${esc(datos.texto.slice(ini, i))}<mark>${esc(datos.texto.slice(i, fin))}</mark>${esc(datos.texto.slice(fin, fin + 160))}…</p>`;
      }
    }
    abrirHoja(`<h2>${CAMPOS[k].etq}: ${esc(valorTexto(k, d))}</h2>
      ${d.cita ? `<p class="cita">“${esc(d.cita)}”</p>${contexto}` :
        `<p class="contexto">La dirigencia no lo mencionó en la conversación: queda en blanco hasta confirmarlo en campo.</p>`}`);
  }));
}

$("#btn-a-mapa").addEventListener("click", () => {
  const sel = $("#sel-asentamiento");
  const ops = poligonos.features.map((f) => f.properties).sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  sel.innerHTML = `<option value="nuevo">No, es nuevo: lo ubico en el mapa</option>` +
    ops.map((p) => `<option value="${p.id}">${esc(p.nombre)}</option>`).join("");
  const encontrado = poligonoPorNombre(actual.ficha.nombre_asentamiento, poligonos.features);
  sel.value = encontrado ? encontrado.properties.id : "nuevo";
  actualizarAyudaUbicar();
  etapa("e-ubicar");
});

function actualizarAyudaUbicar() {
  const nuevo = $("#sel-asentamiento").value === "nuevo";
  $("#ayuda-ubicar").textContent = nuevo
    ? "No coincide con ninguno de 2018. Al guardar, toca el mapa donde está."
    : "Coincide con un asentamiento de 2018: la ficha actualiza su polígono.";
  $("#btn-guardar").textContent = nuevo ? "Ubicar en el mapa" : "Guardar";
}
$("#sel-asentamiento").addEventListener("change", actualizarAyudaUbicar);
$("#btn-volver-ficha").addEventListener("click", () => etapa("e-ficha"));

// ---------- Paso 3: guardar en el mapa ----------
$("#btn-guardar").addEventListener("click", () => {
  const sel = $("#sel-asentamiento").value;
  if (sel === "nuevo") {
    modoUbicar = true;
    $("#aviso-mapa").hidden = false;
    irA("v-mapa");
    return;
  }
  const id = Number(sel);
  const p = poligonos.features.find((f) => f.properties.id === id).properties;
  registrar({ poligono_id: id, nombre: p.nombre });
});

function cancelarUbicar() {
  modoUbicar = false;
  $("#aviso-mapa").hidden = true;
}
$("#btn-cancelar-ubicar").addEventListener("click", () => { cancelarUbicar(); irA("v-nueva"); });

function ubicarNuevo(latlng) {
  cancelarUbicar();
  registrar({ poligono_id: null, nombre: actual.ficha.nombre_asentamiento || "Asentamiento nuevo",
    lat: +latlng.lat.toFixed(6), lng: +latlng.lng.toFixed(6) });
}

function registrar(datos) {
  fichas = leerGuardadas().filter((x) => !(datos.poligono_id != null && x.poligono_id === datos.poligono_id));
  fichas.push({ ...datos, fecha: hoy(), simulado: actual.simulado, ficha: actual.ficha });
  escribirGuardadas(fichas);
  dibujarNuevos();
  $("#listo-txt").textContent = `${datos.nombre} ya está en el mapa del distrito y en el tablero de la municipalidad.`;
  irA("v-nueva");
  etapa("e-listo");
}

function verEnMapa(x) {
  irA("v-mapa");
  setTimeout(() => {
    if (x.poligono_id != null) {
      const capa = capasPorId[x.poligono_id];
      mapa.flyToBounds(capa.getBounds(), { maxZoom: 17, duration: .8 });
      setTimeout(() => capa.bindPopup(popupPoligonoCon(fichas, capa.feature.properties)).openPopup(), 900);
    } else {
      mapa.flyTo([x.lat, x.lng], 17, { duration: .8 });
      const m = marcadoresNuevos.getLayers().find((l) => l.getLatLng().lat === x.lat && l.getLatLng().lng === x.lng);
      setTimeout(() => m?.openPopup(), 900);
    }
  }, 120);
}

$("#btn-ver-mapa").addEventListener("click", () => verEnMapa(fichas.at(-1)));
$("#btn-otra").addEventListener("click", () => { mostrarError("#error", ""); etapa("e-inicio"); });

// ---------- Compartir la ficha con la junta ----------
function resumenTexto(x) {
  const f = x.ficha;
  const filas = Object.keys(CAMPOS).filter((k) => f[k]?.valor != null && f[k].valor !== "no_mencionado" &&
    !(Array.isArray(f[k].valor) && !f[k].valor.length)).map((k) => `• ${CAMPOS[k].etq}: ${valorTexto(k, f[k])}`);
  const ver = (f.por_verificar || []).map((v) => `• ${v}`);
  return [`Ficha de catastro · ${x.nombre} (${x.fecha})`, "", ...filas,
    ...(ver.length ? ["", "Por confirmar en campo:", ...ver] : []), "", "Levantada con En el Mapa"].join("\n");
}

async function compartir(x) {
  const texto = resumenTexto(x);
  try {
    if (navigator.share) { await navigator.share({ title: `Ficha · ${x.nombre}`, text: texto }); return; }
    await navigator.clipboard.writeText(texto);
    avisoBreve("Ficha copiada: pégala en WhatsApp");
  } catch (e) {
    if (e?.name !== "AbortError") avisoBreve("No se pudo compartir");
  }
}
$("#btn-compartir").addEventListener("click", () => compartir(fichas.at(-1)));

// ---------- Fichas guardadas ----------
function dibujarLista() {
  fichas = leerGuardadas();
  $("#sin-fichas").hidden = fichas.length > 0;
  $("#lista-fichas").hidden = !fichas.length;
  $("#lista-fichas").innerHTML = fichas.map((x, i) => ({ x, i })).reverse().map(({ x, i }) => `
    <li><button type="button" class="fila-lista ficha-fila ${x.poligono_id != null ? "de-2018" : ""}" data-i="${i}">
      <span class="ic">${x.poligono_id != null ? "↻" : "＋"}</span>
      <span>${esc(x.nombre)}${x.simulado ? `<span class="insignia">simulada</span>` : ""}
        <small>${x.fecha} · ${fmt(x.ficha.familias?.valor)} familias · ${x.poligono_id != null ? "actualiza 2018" : "nuevo"}</small></span>
      <em>›</em></button></li>`).join("");
  $("#lista-fichas").querySelectorAll("button").forEach((b) => b.addEventListener("click", () => abrirFicha(Number(b.dataset.i))));
}

function abrirFicha(i) {
  const x = fichas[i];
  abrirHoja(`<h2>${esc(x.nombre)}</h2>
    <p class="contexto">${x.fecha}${x.simulado ? " · entrevista simulada" : ""}</p>
    ${(x.ficha.por_verificar || []).length ? `<div class="verificar">${verificarHTML(x.ficha)}</div>` : ""}
    <div class="tarjetas">${tarjetasHTML(x.ficha)}</div>
    <button class="btn primario" id="h-mapa" type="button">Ver en el mapa</button>
    <button class="btn suave" id="h-compartir" type="button">Compartir con la junta</button>
    <button class="btn suave" id="h-borrar" type="button">Borrar esta ficha</button>`);
  // En el detalle, tocar un dato muestra su cita (sin la transcripción completa, que no se guarda).
  $("#hoja-contenido").querySelectorAll(".tarjeta").forEach((t) => t.addEventListener("click", () => {
    const d = x.ficha[t.dataset.campo] || {};
    avisoBreve(d.cita ? `“${d.cita.slice(0, 60)}${d.cita.length > 60 ? "…" : ""}”` : "No se mencionó");
  }));
  $("#h-mapa").addEventListener("click", () => { cerrarHoja(); verEnMapa(x); });
  $("#h-compartir").addEventListener("click", () => compartir(x));
  $("#h-borrar").addEventListener("click", () => {
    if (!confirm(`¿Borrar la ficha de ${x.nombre}?`)) return;
    fichas.splice(i, 1);
    escribirGuardadas(fichas);
    dibujarNuevos();
    cerrarHoja();
    dibujarLista();
  });
}

// ---------- Tablero ----------
function dibujarTablero() {
  fichas = leerGuardadas();
  const t = tableroHTML(fichas);
  $("#tiles").innerHTML = t.tiles;
  $("#barras").innerHTML = t.barras || `<p class="sub">Aún no hay fichas guardadas.</p>`;
}
$("#btn-csv").addEventListener("click", () => {
  if (fichas.length) descargar("en_el_mapa_fichas.csv", csvDeFichas(fichas), "text/csv");
  else avisoBreve("Aún no hay fichas");
});
$("#btn-geojson").addEventListener("click", () => {
  if (fichas.length) descargar("en_el_mapa_fichas.geojson", geojsonDeFichas(fichas, poligonos), "application/geo+json");
  else avisoBreve("Aún no hay fichas");
});

// ---------- Inicio ----------
cargarPoligonos();
comprobarServidor();
// ?vista=v-mapa abre otra pestaña (para capturas); ?auto=1 corre el ejemplo.
if (params.get("vista")) irA(params.get("vista"));
if (params.has("auto")) setTimeout(() => usarEjemplo(), 1200);
