import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validar } from "../js/validar.js";

const leer = (p) => JSON.parse(readFileSync(new URL(`../data/${p}`, import.meta.url), "utf8"));
const plano = leer("zonas.json");
const cat = leer("funcionalidades.json");

test("los datos del plano son coherentes", () => {
  assert.deepEqual(validar(plano, cat), []);
});

test("detecta una zona que se sale del local", () => {
  const roto = structuredClone(plano);
  roto.zonas[0].rect = [15, 0, 10, 3];
  assert.match(validar(roto, cat).join("\n"), /se sale del local/);
});

test("detecta una funcionalidad inexistente", () => {
  const roto = structuredClone(plano);
  roto.zonas[0].funcionalidad = "no-existe";
  assert.match(validar(roto, cat).join("\n"), /no existe en funcionalidades/);
});

test("detecta ids repetidos y muebles sin alto", () => {
  const roto = structuredClone(plano);
  roto.zonas[1].id = roto.zonas[0].id;
  delete roto.objetos[0].alto;
  const msg = validar(roto, cat).join("\n");
  assert.match(msg, /repetido/);
  assert.match(msg, /falta "alto"/);
});

test("cada zona tiene una funcionalidad y viceversa (salvo las sin zona)", () => {
  const usadas = new Set(plano.zonas.map((z) => z.funcionalidad));
  const sinZona = cat.funcionalidades.filter((f) => !usadas.has(f.id)).map((f) => f.id);
  assert.deepEqual(sinZona, []);
});
