# Mapa del local · Mate & Café

Plano 2D interactivo (vista desde arriba). Cada zona del local es una funcionalidad del sistema:
se pasa el mouse o se toca para ver nombre, descripción, estado y dónde está el código.

No copia ni mezcla los repos de la organización: solo los **apunta** (repo + archivo) desde `data/funcionalidades.json`.

## Probarlo

```bash
python3 -m http.server 8000      # o: npm start
```

Abrir http://localhost:8000. No usa `file://` (los módulos y los JSON necesitan un servidor). Sin dependencias ni build.

```bash
npm test                         # valida que el plano y las funciones sean coherentes
```

## Por qué SVG

El plano tiene ~75 formas y cada zona necesita hover, foco de teclado, clic y lectura por lector de pantalla:
el SVG da todo eso con eventos nativos del DOM, se ve nítido a cualquier zoom, se estiliza con CSS (modo oscuro incluido)
y escala solo al ancho del celular con el `viewBox`. Canvas, Konva o PixiJS sirven cuando hay miles de objetos o
animación pesada; acá sumarían una librería y habría que reimplementar la accesibilidad.

## Dónde se edita (nada de esto está en el código)

| Archivo | Qué define |
|---|---|
| `data/zonas.json` | Medidas del local, ambientes, muebles y zonas (posición, tamaño, función asociada) |
| `data/funcionalidades.json` | Catálogo de funciones: estado, repo y archivo donde viven, fuentes de datos en vivo |
| `data/ejemplo/` | Datos de ejemplo (stock) para ver las insignias de estado |

Unidades en **metros**. `rect` = `[x, y, ancho, alto]`. `x` va de izquierda a derecha; `y` va de la entrada (arriba) hacia el fondo.

### Agregar una zona

1. En `zonas.json`, dentro de `zonas`, agregá:

```json
{ "id": "terraza", "nombre": "Terraza", "ambiente": "salon", "rect": [14, 20, 5, 3],
  "icono": "🌿", "funcionalidad": "musica", "descripcion": "Mesas al aire libre." }
```

2. `funcionalidad` es el `id` de una función de `funcionalidades.json`. Si es nueva, agregala ahí.
3. `npm test` te avisa si algo se sale del local o apunta a algo que no existe. La página también muestra el aviso.

Las zonas se dibujan en el orden de la lista: las últimas quedan encima y ganan el clic. Opcionales: `etiqueta: [x, y]` mueve el rótulo, `nombreCorto` es el nombre si no entra, `propuesto: true` la marca como "zona propuesta".

### Publicar el sitio y activar los botones "Abrir"

En `funcionalidades.json` → `apps`, completá `baseUrl` (sin barra final). Mientras sea `null` la ficha muestra "Todavía no hay sitio publicado" y solo ofrece el link al código en GitHub.

### Estados en vivo (las insignias con número)

Cada función puede declarar `vivo` con una `fuente`. Hoy:

- **stock**: lee `data/ejemplo/stock.json` (copia de ejemplo de `pagina-clientes/data/stock.json`). Cambiá `url` por el stock real cuando exista.
- **pedidos**: pensada para Firestore (`dise-atumate/pedidos.html`). Sin conectar muestra "?".
- **reservas**: lee `mc_reservas` del navegador; solo ve datos si el mapa se sirve desde el mismo sitio que `pagina-clientes`.

El interruptor "Datos de ejemplo" usa valores inventados para mostrar cómo se ven los avisos. Apagado, una fuente sin conexión muestra "?" y nunca un número inventado.

## Qué es real y qué es propuesto

- **Real**: los 4 ambientes (Boutique, Armá Tu Mate, Cafetería, Salón & Coworking), sus medidas y los 40+ muebles salen de `recorrido3d.html` (repo `gestion-de-personal`), con su altura.
- **Propuesto** (marcado `propuesto: true`, con rayado en el plano): Depósito y Oficina al fondo, y el Rincón de música. No estaban en el plano original; se agregaron para ubicar stock, personal y música. Borralos o movelos en `zonas.json`.
- Zonas sin código todavía: **Barra** (pedidos de barra) y **Rincón de música**. Figuran como "Próximamente".

## Preparado para el modo 3D (Fase 4, sin implementar)

- Todos los muebles tienen `alto`, y cada ambiente `altoPared`: el 3D solo tiene que extruirlos.
- Ejes: `y` del plano = `z` de Three.js; `alto` = eje vertical.
- El botón **Ver en 3D** está en la cabecera, deshabilitado. Un módulo 3D futuro lo activa con:

```js
window.MapaLocal.registrarVista("3d", { abrir(plano, catalogo) { /* levantar la escena */ } });
```

- Antecedente: `recorrido3d.html` y `RecorridoMateyCafe3D.html` (repo `gestion-de-personal`) ya levantan este mismo local en 3D, cada uno con sus propias coordenadas; este `zonas.json` queda como fuente única.
