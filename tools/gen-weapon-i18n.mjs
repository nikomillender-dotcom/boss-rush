import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = fs.readFileSync(path.join(root, "BossRush.jsx"), "utf8");
const re =
  /\{ id: "([^"]+)", classKey:[^,]+, name: "([^"]+)", tier: \d+, attackMult: [^,]+, description: "([^"]+)" \}/g;
const weapons = [];
let m;
while ((m = re.exec(src))) {
  weapons.push({ id: m[1], name: m[2], desc: m[3].replace(/—/g, ".") });
}
const en = {};
const esNames = {
  wooden_sword: ["Espada de madera", "Hoja inicial."],
  iron_blade: ["Hoja de hierro", "x1.25 fuerza."],
  steel_cleaver: ["Cuchilla de acero", "x1.5 fuerza."],
  warlord_axe: ["Hacha de señor de guerra", "x2 fuerza."],
  starfall_blade: ["Hoja estrella", "x2.5 fuerza."],
};
for (const w of weapons) {
  en[`weapon.${w.id}.name`] = w.name;
  en[`weapon.${w.id}.desc`] = w.desc.replace(/×/g, "x");
}
console.log(JSON.stringify(en, null, 2).slice(1, -1));
