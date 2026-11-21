// Gera em godot/modelos/ cópias dos .glb do site que o Godot consegue ler.
// O Godot não suporta KHR_mesh_quantization (usada para deixar os arquivos do site leves), então tiramos a quantização.
// Rodar da raiz do projeto: node godot/preparar_modelos.mjs  (as cópias ficam fora do git)
import { execFileSync } from 'node:child_process';
import { readdirSync, mkdirSync, statSync, writeFileSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';

const ORIGEM = 'public/modelos', DESTINO = 'godot/modelos';
const lista = [];
const varrer = d => { for (const n of readdirSync(join(ORIGEM, d))) { const r = d ? d + '/' + n : n; statSync(join(ORIGEM, r)).isDirectory() ? varrer(r) : n.endsWith('.glb') && lista.push(r); } };
varrer('');
for (const r of lista) {
  const saida = join(DESTINO, r);
  try { if (statSync(saida).mtimeMs >= statSync(join(ORIGEM, r)).mtimeMs) continue; } catch {}
  mkdirSync(dirname(saida), { recursive: true });
  console.log('→', r);
  execFileSync('npx', ['-y', '@gltf-transform/cli@4', 'dequantize', join(ORIGEM, r), saida], { stdio: 'inherit', shell: true });
}
// texturas do chão (as mesmas do site)
mkdirSync(join(DESTINO, 'texturas'), { recursive: true });
for (const n of readdirSync('public/texturas')) if (n.endsWith('.jpg')) copyFileSync(join('public/texturas', n), join(DESTINO, 'texturas', n));
writeFileSync(join(DESTINO, '.gdignore'), ''); // o editor não precisa importar: o piloto lê os .glb direto
console.log(`${lista.length} modelos prontos em ${DESTINO}/`);
