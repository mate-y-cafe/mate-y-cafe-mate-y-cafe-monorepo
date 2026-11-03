// Partes de la interfaz que no son el plano: ficha de la zona, aviso al pasar el mouse, leyenda y lista de zonas.
import { urlAbrir, urlCodigo } from "./datos.js";
import { NOMBRE_ESTADO } from "./plano.js";

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const SIGNIFICADO = {
  activo: "Funciona hoy.",
  parcial: "Funciona, pero falta conectar algo.",
  proximamente: "Todavía no existe.",
};
const TEXTO_SEVERIDAD = { ok: "Todo en orden", atencion: "Para revisar", alerta: "Urgente", "sin-datos": "Sin datos" };

export function pintarLeyenda(contenedor, plano, catalogo) {
  const porEstado = { activo: 0, parcial: 0, proximamente: 0 };
  const funcion = new Map(catalogo.funcionalidades.map((f) => [f.id, f]));
  for (const z of plano.zonas) porEstado[funcion.get(z.funcionalidad)?.estado ?? "proximamente"]++;
  contenedor.innerHTML = Object.entries(NOMBRE_ESTADO).map(([k, nombre]) => `
    <li class="ley est-${k}">
      <span class="ley-muestra" aria-hidden="true"></span>
      <span><b>${nombre}</b> <span class="ley-n">${porEstado[k]} ${porEstado[k] === 1 ? "zona" : "zonas"}</span><br><small>${SIGNIFICADO[k]}</small></span>
    </li>`).join("");
}

export function pintarLista(contenedor, plano, catalogo, onSelect) {
  const funcion = new Map(catalogo.funcionalidades.map((f) => [f.id, f]));
  contenedor.innerHTML = plano.zonas.map((z) => {
    const f = funcion.get(z.funcionalidad);
    return `<li><button type="button" class="chip est-${f?.estado ?? "proximamente"}" data-id="${esc(z.id)}">
      <span class="chip-ico" aria-hidden="true">${esc(z.icono)}</span>
      <span class="chip-txt">${esc(z.nombre)}<small>${esc(f?.nombre ?? "")}</small></span>
      <span class="chip-punto" aria-hidden="true"></span></button></li>`;
  }).join("");
  contenedor.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-id]");
    if (b) onSelect(b.dataset.id);
  });
}

function bloqueVivo(f, st) {
  if (!f.vivo) return "";
  if (!st) return "";
  const etiqueta = esc(f.vivo.etiqueta);
  const numero = st.valor == null ? "–" : st.valor;
  const lista = st.detalle?.length
    ? `<ul class="vivo-lista">${st.detalle.map((d) => `<li>${esc(d)}</li>`).join("")}</ul>` : "";
  return `
    <section class="vivo sev-${st.severidad}" aria-label="Estado en vivo">
      <div class="vivo-cab">
        <span class="vivo-num">${numero}</span>
        <span class="vivo-txt"><b>${etiqueta}</b><br><span class="vivo-sev">${TEXTO_SEVERIDAD[st.severidad]}</span>${st.demo ? ' <span class="tag-demo">Ejemplo</span>' : ""}</span>
      </div>
      ${lista}
      <p class="vivo-origen">Fuente: ${esc(st.origen)}</p>
    </section>`;
}

export function pintarPanel(panel, { zona, f, st, plano, catalogo }) {
  const ambiente = plano.ambientes.find((a) => a.id === zona.ambiente);
  const estado = f?.estado ?? "proximamente";
  const abrir = f ? urlAbrir(catalogo, f) : null;
  const codigos = (f?.codigos ?? []).map((c) =>
    `<li><a href="${esc(urlCodigo(catalogo, c))}" target="_blank" rel="noopener noreferrer">${esc(c.etiqueta)}<span class="repo"> · ${esc(c.repo)}</span> <span aria-hidden="true">↗</span></a></li>`).join("");

  panel.innerHTML = `
    <div class="panel-cab">
      <p class="eyebrow">${esc(ambiente?.nombre ?? "")}${zona.propuesto ? ' <span class="tag-prop">Zona propuesta</span>' : ""}</p>
      <button type="button" class="cerrar" id="panel-cerrar" aria-label="Cerrar ficha">✕</button>
    </div>
    <h2 class="panel-titulo"><span class="panel-ico" aria-hidden="true">${esc(zona.icono)}</span>${esc(zona.nombre)}</h2>
    <p class="panel-desc">${esc(zona.descripcion)}</p>

    <section class="func est-${estado}">
      <p class="func-cab"><span class="estado-pill"><span class="punto" aria-hidden="true"></span>${NOMBRE_ESTADO[estado]}</span></p>
      <h3>${esc(f?.nombre ?? "Sin funcionalidad")}</h3>
      <p>${esc(f?.descripcion ?? "")}</p>
      ${f?.nota ? `<p class="nota"><b>Para completar:</b> ${esc(f.nota)}</p>` : ""}
    </section>

    ${bloqueVivo(f ?? {}, st)}

    <div class="acciones">
      ${abrir
        ? `<a class="btn primario" href="${esc(abrir)}" target="_blank" rel="noopener noreferrer">Abrir ${esc(f.nombre)} <span aria-hidden="true">↗</span></a>`
        : `<button class="btn primario" type="button" disabled>${f && f.estado !== "proximamente" ? "Todavía no hay sitio publicado" : "Todavía no existe"}</button>`}
    </div>
    ${codigos ? `<h4 class="sub">Dónde está el código</h4><ul class="codigos">${codigos}</ul>` : ""}
  `;
}

export function pintarVacio(panel, plano, catalogo) {
  panel.innerHTML = `
    <p class="eyebrow">${esc(plano.local.nombre)}</p>
    <h2 class="panel-titulo">Elegí una zona</h2>
    <p class="panel-desc">Tocá cualquier zona del plano para ver qué función del sistema vive ahí, en qué estado está y dónde está el código.</p>
    <p class="panel-desc dato">${plano.zonas.length} zonas · ${catalogo.funcionalidades.length} funcionalidades · ${plano.objetos.length} muebles</p>`;
}

// Aviso flotante (solo donde hay mouse)
export function crearTooltip(marco, plano, catalogo, estadoActual) {
  const tip = document.createElement("div");
  tip.className = "tip";
  tip.hidden = true;
  tip.setAttribute("role", "tooltip");
  marco.append(tip);
  const funcion = new Map(catalogo.funcionalidades.map((f) => [f.id, f]));
  const zonaPorId = new Map(plano.zonas.map((z) => [z.id, z]));
  return {
    mostrar(id, evento) {
      const z = zonaPorId.get(id);
      const f = funcion.get(z.funcionalidad);
      const st = estadoActual().get(z.funcionalidad);
      const vivo = f?.vivo && st ? `<br><span class="tip-vivo sev-${st.severidad}">${st.valor == null ? "Sin datos" : `${esc(f.vivo.etiqueta)}: ${st.valor}`}</span>` : "";
      tip.innerHTML = `<b>${esc(z.icono)} ${esc(z.nombre)}</b><br><span class="tip-f">${esc(f?.nombre ?? "")} · ${NOMBRE_ESTADO[f?.estado ?? "proximamente"]}</span>${vivo}`;
      tip.hidden = false;
      this.mover(evento);
    },
    mover(evento) {
      const r = marco.getBoundingClientRect();
      const x = evento.clientX - r.left + marco.scrollLeft;
      const y = evento.clientY - r.top + marco.scrollTop;
      const ancho = tip.offsetWidth;
      const izq = Math.min(Math.max(8, x + 14), marco.scrollLeft + r.width - ancho - 8);
      tip.style.left = `${izq}px`;
      tip.style.top = `${y + 16}px`;
    },
    ocultar() { tip.hidden = true; },
  };
}
