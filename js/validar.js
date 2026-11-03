// Revisa que zonas.json y funcionalidades.json sean coherentes. Devuelve una lista de problemas
// en castellano (vacía si todo está bien). La usan la página (muestra un aviso) y las pruebas.

const ESTADOS = ["activo", "parcial", "proximamente"];
const EPS = 1e-9;

export function validar(plano, cat) {
  const errores = [];
  const L = plano.local;
  const rectOk = (r) => Array.isArray(r) && r.length === 4 && r.every(Number.isFinite) && r[2] > 0 && r[3] > 0;
  const dentro = (r) => r[0] >= -EPS && r[1] >= -EPS && r[0] + r[2] <= L.ancho + EPS && r[1] + r[3] <= L.largo + EPS;

  const unicos = (lista, nombre) => {
    const vistos = new Set();
    for (const x of lista) {
      if (!x.id) errores.push(`${nombre}: hay un elemento sin "id".`);
      else if (vistos.has(x.id)) errores.push(`${nombre}: el id "${x.id}" está repetido.`);
      vistos.add(x.id);
    }
    return vistos;
  };
  const revisarRect = (x, nombre) => {
    if (!rectOk(x.rect)) errores.push(`${nombre} "${x.id}": "rect" debe ser [x, y, ancho, alto] con números positivos.`);
    else if (!dentro(x.rect)) errores.push(`${nombre} "${x.id}": se sale del local (${L.ancho} × ${L.largo} m).`);
  };

  const ambientes = unicos(plano.ambientes, "Ambientes");
  const objetosIds = unicos(plano.objetos, "Objetos");
  const zonasIds = unicos(plano.zonas, "Zonas");
  const funcionalidades = unicos(cat.funcionalidades, "Funcionalidades");
  void objetosIds; void zonasIds;

  for (const a of plano.ambientes) revisarRect(a, "Ambiente");
  for (const o of plano.objetos) {
    revisarRect(o, "Objeto");
    if (!ambientes.has(o.ambiente)) errores.push(`Objeto "${o.id}": el ambiente "${o.ambiente}" no existe.`);
    if (!plano.tipos[o.tipo]) errores.push(`Objeto "${o.id}": el tipo "${o.tipo}" no está en "tipos".`);
    if (!(o.alto > 0)) errores.push(`Objeto "${o.id}": falta "alto" (en metros), el 3D lo necesita.`);
  }
  for (const z of plano.zonas) {
    revisarRect(z, "Zona");
    if (!ambientes.has(z.ambiente)) errores.push(`Zona "${z.id}": el ambiente "${z.ambiente}" no existe.`);
    if (!funcionalidades.has(z.funcionalidad)) errores.push(`Zona "${z.id}": la funcionalidad "${z.funcionalidad}" no existe en funcionalidades.json.`);
    if (z.etiqueta && !(Array.isArray(z.etiqueta) && z.etiqueta.length === 2)) errores.push(`Zona "${z.id}": "etiqueta" debe ser [x, y].`);
  }

  const apps = cat.apps ?? {};
  for (const f of cat.funcionalidades) {
    if (!ESTADOS.includes(f.estado)) errores.push(`Funcionalidad "${f.id}": "estado" debe ser ${ESTADOS.join(", ")}.`);
    if (f.app && !apps[f.app]) errores.push(`Funcionalidad "${f.id}": la app "${f.app}" no existe en "apps".`);
    if (f.vivo && !cat.fuentes?.[f.vivo.fuente]) errores.push(`Funcionalidad "${f.id}": la fuente "${f.vivo.fuente}" no existe en "fuentes".`);
    for (const c of f.codigos ?? []) {
      if (!c.repo || !c.ruta) errores.push(`Funcionalidad "${f.id}": cada código necesita "repo" y "ruta".`);
    }
  }
  for (const a of plano.aperturas ?? []) {
    if (!(a.x >= 0 && a.x + a.ancho <= L.ancho + EPS)) errores.push(`Apertura "${a.id}": se sale del local.`);
  }
  return errores;
}
