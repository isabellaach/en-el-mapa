/* En el Mapa · informe del distrito (informe.html) y ficha para la junta (ficha.html).
   Usan las fichas guardadas en este navegador o, para mostrar cómo se ve, un ejemplo con
   asentamientos ficticios (data/informe_ejemplo.json). */

const COLOR_NIVEL = { alta: "#C65D3B", media: "#E9B949", baja: "#1F3D2B" };

async function fichasDe(ejemplo) {
  if (!ejemplo) return leerGuardadas();
  return (await (await fetch("data/informe_ejemplo.json")).json()).fichas;
}

const sumar = (fichas, campo) => fichas.reduce((s, x) => s + (x.ficha[campo]?.valor || 0), 0);
const conValor = (fichas, campo) => fichas.filter((x) => x.ficha[campo]?.valor != null).length;
const enlaceFicha = (x, i, ejemplo) => `ficha.html?${x.id ? `id=${encodeURIComponent(x.id)}` : `i=${i}`}${ejemplo ? "&ejemplo=1" : ""}`;

// ---------- Informe del distrito ----------
let mapaInforme = null;

async function dibujarInforme(ejemplo) {
  const fichas = await fichasDe(ejemplo);
  $("#ver-ejemplo").classList.toggle("elegido", ejemplo);
  $("#ver-mias").classList.toggle("elegido", !ejemplo);
  const simuladas = fichas.filter((x) => x.simulado).length;
  const aviso = $("#aviso");
  aviso.hidden = !(ejemplo || simuladas || !fichas.length);
  aviso.innerHTML = ejemplo
    ? "<b>Ejemplo:</b> 8 asentamientos <b>ficticios</b> con datos simulados, para mostrar cómo se lee el informe. Los nombres no corresponden a asentamientos reales. Solo Mirador Las Brisas sale de una entrevista simulada con citas; los otros 7 se cargaron directamente, sin citas."
    : !fichas.length ? "<b>Aún no hay fichas en este navegador.</b> Guarda fichas desde la app o la página, o mira el ejemplo."
    : `<b>Incluye ${simuladas} ficha${simuladas > 1 ? "s" : ""} de entrevistas simuladas</b> (de prueba).`;

  const filas = fichas.map((x, i) => {
    const b = brechasDe(x.ficha);
    return { x, i, ...b, prioridad: prioridadDe(b.brechas.length) };
  }).sort((a, b) => b.brechas.length - a.brechas.length ||
    (b.x.ficha.personas?.valor || 0) - (a.x.ficha.personas?.valor || 0));

  const brigadistas = [...new Set(fichas.map((x) => x.brigadista).filter(Boolean))].sort();
  $("#meta").textContent = `${new Date().toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric" })} · ` +
    `${fichas.length} asentamiento${fichas.length === 1 ? "" : "s"} con ficha` +
    (brigadistas.length ? ` · brigadistas ${brigadistas.join(", ")}` : "");

  const conPersonas = conValor(fichas, "personas");
  const altas = filas.filter((f) => f.prioridad.nivel === "alta").length;
  $("#cifras").innerHTML = [
    ["", fichas.length, "asentamientos con ficha"],
    ["", fmt(sumar(fichas, "familias")), "familias declaradas"],
    ["", fmt(sumar(fichas, "personas")), `personas declaradas${conPersonas < fichas.length ? ` (${conPersonas} de ${fichas.length} con dato)` : ""}`],
    ["", fichas.filter((x) => x.poligono_id == null).length, "asentamientos nuevos, no estaban en 2018"],
    ["alerta", altas, "con prioridad alta"],
  ].map(([c, v, q]) => `<div class="cifra ${c}"><span class="num">${v}</span><span class="que">${q}</span></div>`).join("");

  // Brechas: % entre los que tienen dato, de mayor a menor.
  const brechas = BRECHAS.map((b) => {
    const con = fichas.filter((x) => !sinDato(x.ficha[b.campo]?.valor));
    const si = con.filter((x) => b.es(x.ficha[b.campo].valor)).length;
    return { ...b, con: con.length, si, pct: con.length ? Math.round(100 * si / con.length) : null };
  }).sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1));
  $("#tabla-brechas").innerHTML = `<tr><th>Brecha</th><th></th><th class="num">%</th><th class="num">Asentamientos</th></tr>` +
    brechas.map((b) => `<tr><td>${b.txt}</td>
      <td><div class="barra"><span style="width:${b.pct ?? 0}%"></span></div></td>
      <td class="num pct">${b.pct == null ? "—" : b.pct + " %"}</td>
      <td class="num">${b.si} de ${b.con}</td></tr>`).join("");

  $("#tabla-prioridad").innerHTML = `<tr><th>#</th><th>Asentamiento</th><th class="num">Familias</th><th class="num">Personas</th>
      <th class="num">Brechas</th><th>Cuáles</th><th>Prioridad</th></tr>` +
    filas.map((f, k) => `<tr><td class="num">${k + 1}</td>
      <td><a href="${enlaceFicha(f.x, f.i, ejemplo)}">${esc(f.x.nombre)}</a>${f.x.simulado && !ejemplo ? `<span class="simulada">simulada</span>` : ""}</td>
      <td class="num">${fmt(f.x.ficha.familias?.valor)}</td><td class="num">${fmt(f.x.ficha.personas?.valor)}</td>
      <td class="num">${f.brechas.length} / ${f.conDato}</td>
      <td class="chips">${f.cortas.map((t) => `<span>${esc(t)}</span>`).join("")}</td>
      <td><span class="nivel ${f.prioridad.nivel}">${f.prioridad.txt}</span></td></tr>`).join("");

  const ver = fichas.filter((x) => (x.ficha.por_verificar || []).length);
  $("#verificar").innerHTML = ver.length
    ? `<ul class="verificar">${ver.map((x) => x.ficha.por_verificar.map((v) =>
        `<li><b>${esc(x.nombre)}:</b> ${esc(v)}</li>`).join("")).join("")}</ul>`
    : `<p class="vacio">Nada pendiente.</p>`;

  await dibujarMapaInforme(filas);
}

async function dibujarMapaInforme(filas) {
  if (!mapaInforme) {
    mapaInforme = L.map("mapa-informe", { scrollWheelZoom: false });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      { attribution: "&copy; colaboradores de OpenStreetMap", maxZoom: 19 }).addTo(mapaInforme);
    const g = await (await fetch("data/asentamientos_sjm_2018.geojson")).json();
    mapaInforme._poligonos = L.geoJSON(g, { style: { color: "#B9B5A8", weight: 1, fillColor: "#D9D6CC", fillOpacity: .5 },
      interactive: false }).addTo(mapaInforme);
    mapaInforme._puntos = L.layerGroup().addTo(mapaInforme);
  }
  const capa = mapaInforme._puntos;
  capa.clearLayers();
  for (const f of filas) {
    let pos = f.x.lat != null ? [f.x.lat, f.x.lng] : null;
    if (!pos && f.x.poligono_id != null) {
      mapaInforme._poligonos.eachLayer((l) => { if (l.feature.properties.id === f.x.poligono_id) pos = l.getBounds().getCenter(); });
    }
    if (!pos) continue;
    L.circleMarker(pos, { radius: 9, color: "#fff", weight: 2, fillColor: COLOR_NIVEL[f.prioridad.nivel], fillOpacity: 1 })
      .bindTooltip(`${esc(f.x.nombre)} · ${f.brechas.length} brechas`).addTo(capa);
  }
  const limites = capa.getLayers().length ? L.featureGroup(capa.getLayers()).getBounds() : mapaInforme._poligonos.getBounds();
  mapaInforme.fitBounds(limites.extend(mapaInforme._poligonos.getBounds()), { padding: [20, 20] });
}

// ---------- Ficha para la junta ----------
async function dibujarFichaJunta() {
  const ejemplo = params.has("ejemplo");
  const fichas = await fichasDe(ejemplo);
  const x = params.get("id") ? fichas.find((f) => f.id === params.get("id")) : fichas[Number(params.get("i"))];
  const hoja = $("#ficha-hoja");
  if (!x) { hoja.innerHTML = `<p class="vacio">No se encontró la ficha en este navegador.</p>`; return; }
  document.title = `Ficha · ${x.nombre} · En el Mapa`;
  const f = x.ficha;
  const b = brechasDe(f);
  // Una ficha cargada a mano (como los ejemplos ficticios) no tiene citas: se dice, no se promete.
  const conCitas = Object.keys(CAMPOS).some((k) => f[k]?.cita);
  let grupo = "", filas = "";
  for (const [k, c] of Object.entries(CAMPOS)) {
    const d = f[k] || {};
    if (c.grupo !== grupo) {
      filas += `${grupo ? "</table></div>" : ""}<div class="grupo-bloque"><p class="grupo-titulo">${esc((grupo = c.grupo))}</p><table class="ficha-tabla">`;
    }
    filas += `<tr><td>${c.etq}</td><td><span class="valor ${claseCampo(k, d)}">${esc(valorTexto(k, d))}</span>
      ${d.cita ? `<span class="cita">“${esc(d.cita)}”</span>` : ""}</td></tr>`;
  }
  filas += "</table></div>";
  const obs = Object.entries(OBSERVACION).filter(([k]) => x.observacion?.[k])
    .map(([k, etq]) => `${etq}: <b>${ESTADOS[x.observacion[k]].toLowerCase()}</b>`).join(" · ");

  hoja.innerHTML = `
    ${x.simulado ? `<div class="aviso"><b>Ficha de prueba:</b> sale de una entrevista simulada; el asentamiento es ficticio.</div>` : ""}
    <header class="portadilla">
      <p class="antetitulo">Ficha de catastro físico-social del asentamiento</p>
      <h1>${esc(x.nombre)}</h1>
      <p class="meta">San Juan de Miraflores · ${esc(x.fecha)}${x.brigadista ? ` · levantada por ${esc(x.brigadista)}` : ""} ·
        ${x.poligono_id != null ? "actualiza el Relevamiento 2018" : "no estaba en el Relevamiento 2018"}</p>
    </header>
    <div class="cifras">
      ${[["familias", "familias"], ["personas", "personas"], ["lotes", "lotes"], ["anio_fundacion", "año de fundación"]]
        .map(([k, q]) => `<div class="cifra"><span class="num">${f[k]?.valor ?? "—"}</span><span class="que">${q}</span></div>`).join("")}
      <div class="cifra alerta"><span class="num">${b.brechas.length}</span><span class="que">brechas de ${b.conDato} con dato</span></div>
    </div>
    ${f.resumen ? `<p>${esc(f.resumen)}</p>` : ""}
    ${(f.por_verificar || []).length ? `<div class="aviso"><b>Para confirmar en campo:</b><ul class="verificar">${f.por_verificar.map((v) => `<li>${esc(v)}</li>`).join("")}</ul></div>` : ""}
    ${b.brechas.length ? `<h2>Brechas</h2><p class="chips">${b.brechas.map((t) => `<span>${esc(t)}</span>`).join("")}</p>` : ""}
    <h2>${conCitas ? "Lo que dijo la dirigencia" : "Datos de la ficha"}</h2>
    <p class="ayuda">${conCitas ? "Cada dato trae, en cursiva, la frase de la conversación que lo respalda."
      : "Esta ficha se cargó directamente, sin entrevista grabada: no tiene citas de la dirigencia."}</p>
    <div class="grupos">${filas}</div>
    ${obs ? `<h2>Observación en campo</h2><p>${obs}</p>` : ""}
    <p class="pie">Ficha levantada con En el Mapa. Describe al asentamiento, no a las personas: no incluye nombres, DNI ni teléfonos.
      Registrar el asentamiento no es formalizarlo ni otorga derechos sobre el terreno. Basada en la Ficha de Catastro del
      Relevamiento de Asentamientos Informales de TECHO Perú (2018).</p>`;
}

// ---------- Qué página es ----------
if ($("#tabla-brechas")) {
  const conFichas = leerGuardadas().length > 0;
  let ejemplo = params.has("ejemplo") || !conFichas;
  const cambiar = (e) => {
    ejemplo = e;
    history.replaceState(null, "", e ? "?ejemplo=1" : location.pathname);
    dibujarInforme(ejemplo);
  };
  $("#ver-ejemplo").addEventListener("click", () => cambiar(true));
  $("#ver-mias").addEventListener("click", () => cambiar(false));
  dibujarInforme(ejemplo);
}
if ($("#ficha-hoja")) dibujarFichaJunta();
