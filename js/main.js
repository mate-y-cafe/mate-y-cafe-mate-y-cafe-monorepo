import { cargarDatos } from "./datos.js";
import { calcularEstado } from "./estado.js";
import { dibujarPlano } from "./plano.js";
import { pintarLeyenda, pintarLista, pintarPanel, pintarVacio, crearTooltip } from "./ui.js";

const $ = (id) => document.getElementById(id);
const PASOS_ZOOM = [1, 1.5, 2, 3];

const guardar = (k, v) => { try { localStorage.setItem(k, v); } catch { /* sin almacenamiento: no pasa nada */ } };
const leerGuardado = (k) => { try { return localStorage.getItem(k); } catch { return null; } };

async function arrancar() {
  let datos;
  try {
    datos = await cargarDatos();
  } catch (e) {
    $("estado-carga").textContent = `No se pudo cargar el plano. ${e.message}. Si abriste index.html con doble clic, servilo con "python3 -m http.server" y abrí http://localhost:8000.`;
    return;
  }
  const { plano, catalogo, problemas } = datos;
  $("estado-carga").hidden = true;
  $("sub-local").textContent = `${plano.local.nombre} · ${plano.local.direccion}`;

  if (problemas.length) {
    console.warn("Problemas en los datos del plano:", problemas);
    const caja = $("problemas");
    caja.hidden = false;
    caja.innerHTML = `<b>El plano tiene ${problemas.length} ${problemas.length === 1 ? "problema" : "problemas"} para corregir en data/zonas.json:</b><ul>${problemas.map((p) => `<li>${p.replace(/</g, "&lt;")}</li>`).join("")}</ul>`;
  }

  let estado = new Map();
  let demo = leerGuardado("mapa-demo") !== "no";
  let seleccionada = null;
  let zoom = 1;

  const marco = $("plano-marco");
  const panel = $("panel");
  const tooltip = crearTooltip(marco, plano, catalogo, () => estado);

  const dib = dibujarPlano($("plano"), plano, catalogo, { onSelect: elegir });
  document.documentElement.style.setProperty("--ratio", dib.ratio.toFixed(4));

  pintarLeyenda($("leyenda"), plano, catalogo);
  pintarLista($("lista-zonas"), plano, catalogo, elegir);
  pintarVacio(panel, plano, catalogo);

  const zonaPorId = new Map(plano.zonas.map((z) => [z.id, z]));
  const funcPorId = new Map(catalogo.funcionalidades.map((f) => [f.id, f]));

  function repintarPanel() {
    if (!seleccionada) { pintarVacio(panel, plano, catalogo); return; }
    const zona = zonaPorId.get(seleccionada);
    const f = funcPorId.get(zona.funcionalidad);
    pintarPanel(panel, { zona, f, st: estado.get(zona.funcionalidad), plano, catalogo });
    $("panel-cerrar").addEventListener("click", () => elegir(null));
  }

  function elegir(id) {
    seleccionada = id && zonaPorId.has(id) ? id : null;
    dib.seleccionar(seleccionada);
    panel.classList.toggle("abierto", Boolean(seleccionada));
    document.body.classList.toggle("hay-panel", Boolean(seleccionada));
    document.querySelectorAll("#lista-zonas .chip").forEach((c) => c.classList.toggle("sel", c.dataset.id === seleccionada));
    repintarPanel();
    const hash = seleccionada ? `#${seleccionada}` : "";
    if (location.hash !== hash && (hash || location.hash)) location.hash = hash;
  }

  async function refrescarEstado() {
    estado = await calcularEstado(catalogo, { demo });
    dib.aplicarEstado(estado);
    $("aviso-demo").hidden = !demo;
    repintarPanel();
  }

  // Datos de ejemplo
  const interruptor = $("sw-demo");
  interruptor.checked = demo;
  interruptor.addEventListener("change", () => {
    demo = interruptor.checked;
    guardar("mapa-demo", demo ? "si" : "no");
    refrescarEstado();
  });

  // Zoom
  const aplicarZoom = () => {
    document.documentElement.style.setProperty("--zoom", String(zoom));
    marco.dataset.zoom = String(zoom);
    $("zoom-valor").textContent = `×${zoom.toLocaleString("es-AR")}`;
    $("zoom-menos").disabled = zoom === PASOS_ZOOM[0];
    $("zoom-mas").disabled = zoom === PASOS_ZOOM.at(-1);
  };
  const moverZoom = (d) => {
    const i = PASOS_ZOOM.indexOf(zoom) + d;
    if (i >= 0 && i < PASOS_ZOOM.length) { zoom = PASOS_ZOOM[i]; aplicarZoom(); }
  };
  $("zoom-menos").addEventListener("click", () => moverZoom(-1));
  $("zoom-mas").addEventListener("click", () => moverZoom(1));
  aplicarZoom();

  // Tooltip solo con mouse
  if (matchMedia("(hover: hover)").matches) {
    for (const [id, grupo] of dib.zonas) {
      grupo.addEventListener("pointerenter", (e) => tooltip.mostrar(id, e));
      grupo.addEventListener("pointermove", (e) => tooltip.mover(e));
      grupo.addEventListener("pointerleave", () => tooltip.ocultar());
      grupo.addEventListener("blur", () => tooltip.ocultar());
    }
  }

  // Teclado y link directo (#caja)
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && seleccionada) elegir(null); });
  const desdeHash = () => { const id = location.hash.slice(1); if (id !== (seleccionada ?? "")) elegir(id || null); };
  window.addEventListener("hashchange", desdeHash);

  // Punto de enganche para el modo 3D (Fase 4): otro módulo llama a registrarVista("3d", { abrir }).
  const btn3d = $("btn-3d");
  const vistas = {};
  window.MapaLocal = {
    plano, catalogo,
    registrarVista(nombre, vista) {
      vistas[nombre] = vista;
      if (nombre === "3d") { btn3d.disabled = false; btn3d.title = "Ver el local en 3D"; }
    },
  };
  btn3d.addEventListener("click", () => vistas["3d"]?.abrir(plano, catalogo));

  await refrescarEstado();
  desdeHash();
}

arrancar();
