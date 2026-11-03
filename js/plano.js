// Dibuja el plano en SVG a partir de zonas.json. Las unidades del SVG son metros:
// la misma medida sirve después para levantar las paredes en 3D.

const NS = "http://www.w3.org/2000/svg";

export const NOMBRE_ESTADO = { activo: "Activo", parcial: "Parcial", proximamente: "Próximamente" };

function el(tag, attrs = {}, ...hijos) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v !== undefined && v !== null) e.setAttribute(k, v);
  e.append(...hijos);
  return e;
}
const g = (clase, attrs = {}) => el("g", { class: clase, ...attrs });
const metros = (n) => `${n.toLocaleString("es-AR")} m`;
const limitar = (n, min, max) => Math.min(max, Math.max(min, n));

const PAD = { l: 1.4, t: 2.4, r: 2.0, b: 3.6 }; // margen para cotas, escala y calle

export function dibujarPlano(svg, plano, catalogo, { onSelect }) {
  const { ancho: W, largo: H } = plano.local;
  const funcion = new Map(catalogo.funcionalidades.map((f) => [f.id, f]));
  const vb = [-PAD.l, -PAD.t, W + PAD.l + PAD.r, H + PAD.t + PAD.b];
  svg.setAttribute("viewBox", vb.join(" "));
  svg.replaceChildren();

  // Rayado para lo propuesto
  svg.append(
    el("defs", {},
      el("pattern", { id: "rayas", patternUnits: "userSpaceOnUse", width: 0.45, height: 0.45, patternTransform: "rotate(45)" },
        el("line", { x1: 0, y1: 0, x2: 0, y2: 0.45, class: "rayas-trazo" }))),
  );

  // --- Pisos y grilla de 1 m ---
  const pisos = g("capa-pisos");
  for (const a of plano.ambientes) {
    const [x, y, w, h] = a.rect;
    pisos.append(el("rect", { x, y, width: w, height: h, fill: a.piso }));
    if (a.propuesto) pisos.append(el("rect", { x, y, width: w, height: h, fill: "url(#rayas)" }));
  }
  const grilla = g("grilla");
  for (let x = 1; x < W; x++) grilla.append(el("line", { x1: x, y1: 0, x2: x, y2: H }));
  for (let y = 1; y < H; y++) grilla.append(el("line", { x1: 0, y1: y, x2: W, y2: y }));
  const limites = g("limites");
  for (const a of plano.ambientes) {
    const [x, y, w, h] = a.rect;
    limites.append(el("rect", { x, y, width: w, height: h, class: a.propuesto ? "limite propuesto" : "limite" }));
  }

  // --- Muebles ---
  const objetos = g("capa-objetos");
  const rotulos = g("capa-rotulos-muebles");
  for (const o of plano.objetos) {
    const tipo = plano.tipos[o.tipo];
    const [x, y, w, h] = o.rect;
    const clase = ["obj", tipo.vidrio ? "vidrio" : "", o.propuesto ? "prop" : ""].filter(Boolean).join(" ");
    const forma = tipo.forma === "circulo"
      ? el("circle", { cx: x + w / 2, cy: y + h / 2, r: Math.min(w, h) / 2, fill: tipo.color, class: clase })
      : el("rect", { x, y, width: w, height: h, rx: Math.min(0.12, w / 4, h / 4), fill: tipo.color, class: clase });
    forma.append(el("title", {}, o.etiqueta ?? tipo.nombre));
    objetos.append(forma);
    if (o.rotulo && o.etiqueta) {
      const vertical = h > w * 1.8;
      const cx = x + w / 2, cy = y + h / 2;
      rotulos.append(el("text", { x: cx, y: cy, class: "rotulo-mueble", "text-anchor": "middle", "dominant-baseline": "central", "font-size": 0.36, transform: vertical ? `rotate(-90 ${cx} ${cy})` : null }, o.etiqueta));
    }
  }

  // --- Paredes exteriores con hueco de puerta ---
  const puerta = plano.aperturas?.find((a) => a.orientacion === "norte");
  const paredes = g("paredes");
  const px = puerta?.x ?? W / 2, pa = puerta?.ancho ?? 0;
  paredes.append(el("path", { class: "pared", d: `M${px} 0 H0 V${H} H${W} V0 H${px + pa}` }));
  const calle = g("calle");
  if (puerta) {
    const r = pa / 2, cx = px + r;
    paredes.append(
      el("path", { class: "puerta", d: `M${px} 0 V${r} M${px + pa} 0 V${r}` }),
      el("path", { class: "puerta-arco", d: `M${cx} 0 A${r} ${r} 0 0 1 ${px} ${r} M${cx} 0 A${r} ${r} 0 0 0 ${px + pa} ${r}` }),
    );
    calle.append(
      el("path", { class: "flecha", d: `M${cx - 0.35} -0.95 L${cx + 0.35} -0.95 L${cx} -0.3 Z` }),
      el("text", { x: cx, y: -1.35, class: "calle-texto", "text-anchor": "middle", "font-size": 0.5 }, plano.local.direccion.split(",")[0].toUpperCase()),
    );
  }

  // --- Cotas y escala ---
  const cotas = g("cotas");
  const yb = H + 0.9, xr = W + 0.9;
  cotas.append(
    el("path", { class: "cota", d: `M0 ${yb} H${W} M0 ${yb - 0.25} V${yb + 0.25} M${W} ${yb - 0.25} V${yb + 0.25}` }),
    el("text", { x: W / 2, y: yb + 0.75, class: "cota-texto", "text-anchor": "middle", "font-size": 0.5 }, metros(W)),
    el("path", { class: "cota", d: `M${xr} 0 V${H} M${xr - 0.25} 0 H${xr + 0.25} M${xr - 0.25} ${H} H${xr + 0.25}` }),
    el("text", { x: xr + 0.8, y: H / 2, class: "cota-texto", "text-anchor": "middle", "font-size": 0.5, transform: `rotate(90 ${xr + 0.8} ${H / 2})` }, metros(H)),
  );
  const ys = H + 2.5;
  const escala = g("escala");
  for (let i = 0; i < 5; i++) escala.append(el("rect", { x: i, y: ys, width: 1, height: 0.22, class: i % 2 ? "esc-b" : "esc-a" }));
  escala.append(
    el("text", { x: 0, y: ys + 0.85, class: "cota-texto", "text-anchor": "middle", "font-size": 0.45 }, "0"),
    el("text", { x: 5, y: ys + 0.85, class: "cota-texto", "text-anchor": "middle", "font-size": 0.45 }, "5 m"),
  );

  // Etiquetas de "propuesto" sobre los ambientes nuevos
  const avisos = g("avisos-propuesto");
  for (const a of plano.ambientes.filter((x) => x.propuesto)) {
    avisos.append(el("text", { x: a.rect[0] + 0.3, y: a.rect[1] + a.rect[3] - 0.25, class: "tag-propuesto", "font-size": 0.34 }, "ZONA PROPUESTA"));
  }

  // --- Zonas (lo clickeable) ---
  const capaZonas = g("capa-zonas");
  const zonas = new Map();
  for (const z of plano.zonas) {
    const f = funcion.get(z.funcionalidad);
    const estado = f?.estado ?? "proximamente";
    const [x, y, w, h] = z.rect;
    const grupo = g(`zona est-${estado}`, { "data-id": z.id, tabindex: 0, role: "button", "aria-label": `${z.nombre}. ${NOMBRE_ESTADO[estado]}.` });
    grupo.append(el("rect", { x, y, width: w, height: h, rx: 0.15, class: "zona-area" }));

    // Rótulo: píldora con ícono y nombre; si no entra, nombre corto; si tampoco, solo el ícono.
    const fs = 0.6;
    const anchoPildora = (t) => (t.length * 0.58 + 2.7) * fs;
    let texto = z.nombre;
    let wp = anchoPildora(texto);
    const tope = w * 1.25;
    if (wp > tope && z.nombreCorto) { texto = z.nombreCorto; wp = anchoPildora(texto); }
    const soloIcono = wp > tope;
    if (soloIcono) wp = fs * 1.7;
    const hp = soloIcono ? fs * 1.7 : fs * 1.5;
    const [ex, ey] = z.etiqueta ?? [x + w / 2, y + h / 2];
    const cx = limitar(ex, wp / 2 + 0.1, W - wp / 2 - 0.1);
    const cy = limitar(ey, hp / 2 + 0.1, H - hp / 2 - 0.1);
    const rot = g("zona-rotulo");
    rot.append(
      el("rect", { x: cx - wp / 2, y: cy - hp / 2, width: wp, height: hp, rx: hp / 2, class: "rotulo-fondo" }),
      el("text", { x: cx, y: cy, class: "rotulo-texto", "text-anchor": "middle", "dominant-baseline": "central", "font-size": fs }, soloIcono ? z.icono : `${z.icono} ${texto}`),
    );
    grupo.append(rot);

    // Insignia de estado en vivo (se llena en aplicarEstado)
    if (f?.vivo) {
      const ins = g("insignia sin-datos", { transform: `translate(${x + w} ${y})`, "aria-hidden": "true" });
      ins.append(el("circle", { r: 0.5, class: "insignia-fondo" }), el("text", { class: "insignia-texto", "text-anchor": "middle", "dominant-baseline": "central", "font-size": 0.52 }, "?"));
      grupo.append(ins);
    }
    if (z.propuesto) grupo.classList.add("propuesta");

    grupo.addEventListener("click", () => onSelect(z.id));
    grupo.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(z.id); }
    });
    zonas.set(z.id, grupo);
    capaZonas.append(grupo);
  }

  svg.append(pisos, grilla, limites, objetos, rotulos, paredes, calle, cotas, escala, avisos, capaZonas);

  return {
    ratio: vb[2] / vb[3],
    zonas,
    // Pinta las insignias con el estado en vivo de cada función.
    aplicarEstado(mapa) {
      for (const z of plano.zonas) {
        const f = funcion.get(z.funcionalidad);
        const grupo = zonas.get(z.id);
        const ins = grupo.querySelector(".insignia");
        if (!ins || !f?.vivo) continue;
        const st = mapa.get(f.id);
        const sev = st?.severidad ?? "sin-datos";
        ins.setAttribute("class", `insignia ${sev}`);
        ins.querySelector("text").textContent = st?.valor == null ? "?" : st.valor > 0 ? String(st.valor) : "✓";
        const resumen = st?.valor == null ? "sin datos" : `${f.vivo.etiqueta}: ${st.valor}`;
        grupo.setAttribute("aria-label", `${z.nombre}. ${NOMBRE_ESTADO[f.estado]}. ${resumen}.`);
      }
    },
    seleccionar(id) {
      svg.classList.toggle("hay-seleccion", Boolean(id));
      for (const [zid, grupo] of zonas) {
        grupo.classList.toggle("sel", zid === id);
        grupo.setAttribute("aria-pressed", String(zid === id));
      }
    },
  };
}
