// Estado en vivo de cada zona (pedidos por preparar, stock bajo, reservas de hoy).
// Cada función puede declarar "vivo" en funcionalidades.json; acá se resuelve de qué fuente sale el número.
// Si una fuente no está conectada, la zona muestra "sin datos" en vez de inventar un valor.
// Con demo = true se usan los valores de ejemplo de la fuente, para ver cómo se ven los avisos.

const hoyLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export function severidad(valor, umbrales = { atencion: 1, alerta: 3 }) {
  if (valor >= umbrales.alerta) return "alerta";
  if (valor >= umbrales.atencion) return "atencion";
  return "ok";
}

async function leerJson(url) {
  const res = await fetch(new URL(url, document.baseURI));
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

const sinDatos = (motivo, origen) => ({ valor: null, severidad: "sin-datos", detalle: [motivo], origen, demo: false });

async function medirStock(fuente, vivo, demo) {
  try {
    const datos = await leerJson(demo && fuente.demoUrl ? fuente.demoUrl : fuente.url);
    const umbral = fuente.umbral ?? 5;
    const bajos = Object.entries(datos.stock)
      .filter(([, n]) => n <= umbral)
      .sort((a, b) => a[1] - b[1])
      .map(([id, n]) => `${datos.nombres?.[id] ?? id}: ${n === 0 ? "sin stock" : `quedan ${n}`}`);
    return { valor: bajos.length, severidad: severidad(bajos.length, vivo.umbrales), detalle: bajos, origen: fuente.origen, demo };
  } catch {
    return sinDatos("No se pudo leer el stock.", fuente.origen);
  }
}

function medirPedidos(fuente, vivo, demo) {
  if (!demo) return sinDatos("Sin conexión: falta configurar Firebase.", fuente.origen);
  const total = vivo.estados.reduce((s, e) => s + (fuente.demo[e] ?? 0), 0);
  return { valor: total, severidad: severidad(total, vivo.umbrales), detalle: [], origen: fuente.origen, demo };
}

function medirReservas(fuente, vivo, demo) {
  if (demo) return { valor: fuente.demo, severidad: severidad(fuente.demo, vivo.umbrales), detalle: [], origen: fuente.origen, demo };
  try {
    const crudo = localStorage.getItem(fuente.clave);
    if (crudo === null) return sinDatos("Este navegador no tiene reservas guardadas. El mapa solo las ve si se abre desde el mismo sitio que la página de clientes.", fuente.origen);
    const hoy = hoyLocal();
    const valor = JSON.parse(crudo).filter((r) => r.fecha === hoy).length;
    return { valor, severidad: severidad(valor, vivo.umbrales), detalle: [], origen: fuente.origen, demo: false };
  } catch {
    return sinDatos("No se pudo leer el almacenamiento del navegador.", fuente.origen);
  }
}

// Devuelve Map(idFuncionalidad -> { valor, severidad, detalle[], origen, demo })
export async function calcularEstado(cat, { demo }) {
  const resultado = new Map();
  await Promise.all(
    cat.funcionalidades.filter((f) => f.vivo).map(async (f) => {
      const fuente = cat.fuentes[f.vivo.fuente];
      let medida;
      if (fuente.tipo === "json") medida = await medirStock(fuente, f.vivo, demo);
      else if (fuente.tipo === "firestore") medida = medirPedidos(fuente, f.vivo, demo);
      else if (fuente.tipo === "localStorage") medida = medirReservas(fuente, f.vivo, demo);
      else medida = sinDatos(`Tipo de fuente desconocido: ${fuente.tipo}`, "");
      resultado.set(f.id, medida);
    }),
  );
  return resultado;
}
