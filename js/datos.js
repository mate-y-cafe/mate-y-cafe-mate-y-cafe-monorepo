// Carga los dos archivos de datos y arma los links. No hay ninguna zona ni función escrita en el código.
import { validar } from "./validar.js";

const leer = async (url) => {
  const res = await fetch(new URL(url, document.baseURI));
  if (!res.ok) throw new Error(`No se pudo leer ${url} (${res.status})`);
  return res.json();
};

export async function cargarDatos() {
  const [plano, catalogo] = await Promise.all([leer("data/zonas.json"), leer("data/funcionalidades.json")]);
  return { plano, catalogo, problemas: validar(plano, catalogo) };
}

// Dirección para abrir la funcionalidad. Es null mientras la app no tenga baseUrl (todavía no hay sitio publicado).
export function urlAbrir(cat, f) {
  const app = f.app ? cat.apps[f.app] : null;
  if (!app?.baseUrl || f.ruta == null) return null;
  return `${app.baseUrl.replace(/\/+$/, "")}/${f.ruta}`;
}

// Dirección del archivo en GitHub.
export function urlCodigo(cat, c) {
  const rama = c.rama ?? cat.ramas?.[c.repo] ?? "main";
  const ruta = c.ruta.split("/").map(encodeURIComponent).join("/");
  return `https://github.com/${cat.organizacion}/${c.repo}/blob/${encodeURIComponent(rama)}/${ruta}`;
}
