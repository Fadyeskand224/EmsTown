import * as THREE from 'three';

// All textures are painted on canvases at start-up, so the game ships no image files.

export function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
const mix = (a, b, t) => a + (b - a) * t;

// tileable value noise
function noiseTable(seed, n = 128) { const r = rng(seed); return Float32Array.from({ length: n * n }, r); }
function tnoise(tab, x, y, per) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const g = (i, j) => tab[(((j % per) + per) % per) * 128 + (((i % per) + per) % per)];
  return mix(mix(g(xi, yi), g(xi + 1, yi), u), mix(g(xi, yi + 1), g(xi + 1, yi + 1), u), v);
}
function fbm(tab, x, y, per, oct = 4) { let a = 0.5, s = 0, f = 1, p = per; for (let i = 0; i < oct; i++) { s += a * tnoise(tab, x * f, y * f, p); f *= 2; p *= 2; a *= 0.5; } return s; }

function toTex(c, { repeat = [1, 1], srgb = true, aniso = 8 } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = aniso; t.needsUpdate = true; return t;
}
const hex = (h) => [(h >> 16) & 255, (h >> 8) & 255, h & 255];

function noisePaint(c, ctx, tab, scale, c1, c2, { oct = 4, grain = 0.06, seed = 3 } = {}) {
  const w = c.width, h = c.height, img = ctx.createImageData(w, h), a = hex(c1), b = hex(c2), r = rng(seed);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const n = fbm(tab, (x / w) * scale, (y / h) * scale, scale, oct), g = 1 + (r() - 0.5) * grain * 2, i = (y * w + x) * 4;
    img.data[i] = mix(a[0], b[0], n) * g; img.data[i + 1] = mix(a[1], b[1], n) * g; img.data[i + 2] = mix(a[2], b[2], n) * g; img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}

export function grassTexture() {
  const [c, x] = mk(512, 512), r = rng(11);
  noisePaint(c, x, noiseTable(5), 6, 0x35601f, 0x86b04a, { oct: 5, grain: 0.07 });
  for (let i = 0; i < 5000; i++) { // blade flecks
    const px = r() * 512, py = r() * 512, l = 4 + r() * 8, a = (r() - 0.5) * 0.8 - Math.PI / 2;
    x.strokeStyle = `hsla(${70 + r() * 40}, ${40 + r() * 30}%, ${22 + r() * 30}%, .45)`; x.lineWidth = 1 + r();
    x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke();
  }
  for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(190,170,90,${0.04 + r() * 0.05})`; x.beginPath(); x.arc(r() * 512, r() * 512, 10 + r() * 30, 0, 7); x.fill(); }
  return toTex(c, { repeat: [220, 220] });
}

// One tile = 8 m long, 7.4 m wide (u across, v along).
export function asphaltTexture() {
  const [c, x] = mk(256, 512), r = rng(21);
  noisePaint(c, x, noiseTable(9), 4, 0x35363a, 0x4a4b50, { oct: 4, grain: 0.1 });
  for (let i = 0; i < 2600; i++) { const v = 70 + r() * 110 | 0; x.fillStyle = `rgba(${v},${v},${v},.35)`; x.fillRect(r() * 256, r() * 512, 1 + r() * 1.5, 1 + r() * 1.5); }
  x.fillStyle = 'rgba(15,15,18,.18)'; x.fillRect(70, 0, 26, 512); x.fillRect(160, 0, 26, 512); // tyre tracks
  x.fillStyle = 'rgba(225,222,205,.88)'; x.fillRect(14, 0, 4, 512); x.fillRect(238, 0, 4, 512); // edge lines
  x.fillStyle = 'rgba(235,230,200,.9)'; x.fillRect(126, 20, 4, 150); // centre dash
  for (let i = 0; i < 6; i++) { x.strokeStyle = 'rgba(10,10,12,.35)'; x.lineWidth = 1; x.beginPath(); let px = r() * 256, py = r() * 512; x.moveTo(px, py); for (let k = 0; k < 6; k++) { px += (r() - 0.5) * 18; py += r() * 14; x.lineTo(px, py); } x.stroke(); } // cracks
  return toTex(c, { aniso: 16 });
}

export function shoulderTexture() { // soft gravel verge with alpha edges
  const [c, x] = mk(128, 128), r = rng(23);
  const g = x.createLinearGradient(0, 0, 128, 0);
  g.addColorStop(0, 'rgba(120,104,78,0)'); g.addColorStop(0.25, 'rgba(120,104,78,.95)'); g.addColorStop(0.75, 'rgba(120,104,78,.95)'); g.addColorStop(1, 'rgba(120,104,78,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(${150 + r() * 60},${130 + r() * 50},${100 + r() * 40},.5)`; x.fillRect(20 + r() * 88, r() * 128, 2, 2); }
  return toTex(c, { aniso: 8 });
}

export function barkTexture(base = 0x4a3a2b, light = 0x7a6650, birch = false) {
  const [c, x] = mk(128, 256), r = rng(31), tab = noiseTable(13);
  noisePaint(c, x, tab, 4, birch ? 0xd8d4c8 : base, birch ? 0xf2efe6 : light, { oct: 4, grain: 0.05 });
  for (let i = 0; i < (birch ? 70 : 220); i++) {
    const px = r() * 128, py = r() * 256, l = birch ? 4 + r() * 12 : 20 + r() * 60;
    x.strokeStyle = birch ? `rgba(30,28,26,${0.35 + r() * 0.5})` : `rgba(20,14,8,${0.25 + r() * 0.35})`; x.lineWidth = birch ? 1 + r() * 3 : 1 + r() * 2.5;
    x.beginPath(); x.moveTo(px, py); x.lineTo(px + (r() - 0.5) * 3, py + l); x.stroke();
  }
  return toTex(c, { aniso: 8 });
}

export function leafTexture(palette, { size = 256, leaves = 240, blossom = false } = {}) {
  const [c, x] = mk(size, size), r = rng(41);
  for (let i = 0; i < leaves; i++) {
    const px = r() * size, py = r() * size, L = size * (0.07 + r() * 0.05), W = L * 0.55, a = r() * Math.PI * 2;
    const col = palette[(r() * palette.length) | 0];
    x.save(); x.translate(px, py); x.rotate(a);
    const g = x.createLinearGradient(0, -W, 0, W); g.addColorStop(0, `hsl(${col[0]}, ${col[1]}%, ${col[2] + 10}%)`); g.addColorStop(1, `hsl(${col[0]}, ${col[1]}%, ${col[2] - 8}%)`);
    x.fillStyle = g; x.strokeStyle = 'rgba(0,0,0,.25)'; x.lineWidth = 1;
    x.beginPath(); x.moveTo(-L, 0); x.quadraticCurveTo(0, -W * 1.3, L, 0); x.quadraticCurveTo(0, W * 1.3, -L, 0); x.fill(); x.stroke();
    x.strokeStyle = 'rgba(255,255,255,.18)'; x.beginPath(); x.moveTo(-L * 0.9, 0); x.lineTo(L * 0.9, 0); x.stroke();
    x.restore();
  }
  if (blossom) for (let i = 0; i < 90; i++) { x.fillStyle = `hsla(${335 + r() * 15}, ${70 + r() * 20}%, ${80 + r() * 12}%, .95)`; x.beginPath(); x.arc(r() * size, r() * size, 3 + r() * 4, 0, 7); x.fill(); }
  return toTex(c, { aniso: 8 });
}

export function needleTexture() {
  const [c, x] = mk(128, 256), r = rng(43);
  x.lineCap = 'round';
  for (let side = -1; side <= 1; side += 2) for (let i = 0; i < 70; i++) {
    const t = i / 70, y = 10 + t * 236, len = 50 * (1 - t * 0.55) * (0.75 + r() * 0.5), ang = side * (0.9 - t * 0.15 + (r() - 0.5) * 0.3);
    x.strokeStyle = `hsl(${120 + r() * 20}, ${35 + r() * 20}%, ${14 + r() * 16}%)`; x.lineWidth = 2.2;
    x.beginPath(); x.moveTo(64, y); x.lineTo(64 + Math.sin(ang) * len, y + Math.cos(ang) * len * 0.5 + 4); x.stroke();
  }
  x.strokeStyle = '#2d2418'; x.lineWidth = 3; x.beginPath(); x.moveTo(64, 0); x.lineTo(64, 256); x.stroke();
  return toTex(c, { aniso: 8 });
}

export function clapboardTexture(color = '#efe6d2') {
  const [c, x] = mk(256, 256), r = rng(51);
  x.fillStyle = color; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 16; i++) {
    const y = i * 16, g = x.createLinearGradient(0, y, 0, y + 16);
    g.addColorStop(0, 'rgba(0,0,0,.0)'); g.addColorStop(0.85, 'rgba(0,0,0,.06)'); g.addColorStop(1, 'rgba(0,0,0,.35)');
    x.fillStyle = g; x.fillRect(0, y, 256, 16);
    x.fillStyle = `rgba(0,0,0,${r() * 0.05})`; x.fillRect(0, y, 256, 16);
  }
  for (let i = 0; i < 600; i++) { x.fillStyle = `rgba(90,70,40,${r() * 0.07})`; x.fillRect(r() * 256, r() * 256, 12 + r() * 30, 1); }
  return toTex(c, { aniso: 8 });
}

export function stoneTexture(base = [150, 140, 125]) {
  const [c, x] = mk(512, 512), r = rng(53);
  x.fillStyle = '#3d3a35'; x.fillRect(0, 0, 512, 512);
  let y = 0;
  while (y < 512) {
    const h = 34 + r() * 22; let px = -r() * 40;
    while (px < 512) {
      const w = 50 + r() * 50, v = (r() - 0.5) * 36;
      x.fillStyle = `rgb(${base[0] + v | 0},${base[1] + v | 0},${base[2] + v * 0.8 | 0})`;
      x.beginPath(); x.roundRect(px + 2, y + 2, w - 4, h - 4, 6); x.fill();
      for (let k = 0; k < 40; k++) { x.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,255,255'},${r() * 0.07})`; x.fillRect(px + r() * w, y + r() * h, 3, 3); }
      px += w;
    }
    y += h;
  }
  return toTex(c, { aniso: 8 });
}

export function shingleTexture(color = [96, 62, 52]) {
  const [c, x] = mk(256, 256), r = rng(57);
  for (let row = 0; row < 12; row++) for (let i = -1; i < 9; i++) {
    const w = 32, px = i * w + (row % 2 ? w / 2 : 0), py = row * 21.4, v = (r() - 0.5) * 34;
    x.fillStyle = `rgb(${color[0] + v | 0},${color[1] + v * 0.7 | 0},${color[2] + v * 0.6 | 0})`;
    x.beginPath(); x.roundRect(px + 1, py, w - 2, 26, [0, 0, 8, 8]); x.fill();
    x.fillStyle = 'rgba(0,0,0,.28)'; x.fillRect(px + 1, py + 22, w - 2, 4);
  }
  return toTex(c, { aniso: 8 });
}

export function plankTexture(base = [128, 92, 58]) {
  const [c, x] = mk(256, 256), r = rng(59);
  for (let i = 0; i < 8; i++) {
    const v = (r() - 0.5) * 26; x.fillStyle = `rgb(${base[0] + v | 0},${base[1] + v | 0},${base[2] + v | 0})`; x.fillRect(i * 32, 0, 32, 256);
    for (let k = 0; k < 24; k++) { x.strokeStyle = `rgba(40,25,10,${r() * 0.25})`; x.beginPath(); const px = i * 32 + r() * 32; x.moveTo(px, 0); x.lineTo(px + (r() - 0.5) * 6, 256); x.stroke(); }
    x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(i * 32, 0, 1.5, 256);
  }
  return toTex(c, { aniso: 8 });
}

export function cobbleTexture() {
  const [c, x] = mk(256, 256), r = rng(61);
  x.fillStyle = '#4a4741'; x.fillRect(0, 0, 256, 256);
  for (let j = 0; j < 12; j++) for (let i = 0; i < 12; i++) {
    const px = i * 21.5 + (j % 2 ? 10 : 0) + (r() - 0.5) * 3, py = j * 21.5 + (r() - 0.5) * 3, v = (r() - 0.5) * 40;
    x.fillStyle = `rgb(${138 + v | 0},${130 + v | 0},${118 + v | 0})`; x.beginPath(); x.roundRect(px, py, 19, 19, 6); x.fill();
  }
  return toTex(c, { aniso: 8 });
}

export function awningTexture(a = '#d9482e', b = '#f6efe0') {
  const [c, x] = mk(256, 64);
  for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? b : a; x.fillRect(i * 32, 0, 32, 64); }
  const g = x.createLinearGradient(0, 0, 0, 64); g.addColorStop(0, 'rgba(0,0,0,.18)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 256, 64);
  return toTex(c, { aniso: 8 });
}

export function signTexture(text, emoji, bg = '#5a3d24', fg = '#fff3d6') {
  const [c, x] = mk(1024, 320);
  const g = x.createLinearGradient(0, 0, 0, 320); g.addColorStop(0, bg); g.addColorStop(1, '#3a2514'); x.fillStyle = g; x.fillRect(0, 0, 1024, 320);
  const r = rng(71); for (let i = 0; i < 260; i++) { x.strokeStyle = `rgba(0,0,0,${r() * 0.18})`; x.beginPath(); const y = r() * 320; x.moveTo(0, y); x.lineTo(1024, y + (r() - 0.5) * 6); x.stroke(); }
  x.strokeStyle = 'rgba(255,230,180,.55)'; x.lineWidth = 8; x.strokeRect(18, 18, 988, 284);
  x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = '700 150px Georgia, "Times New Roman", serif';
  x.shadowColor = 'rgba(0,0,0,.6)'; x.shadowBlur = 8; x.shadowOffsetY = 4;
  x.fillText(text, 590, 172); x.font = '150px "Apple Color Emoji","Segoe UI Emoji",sans-serif'; x.fillText(emoji, 170, 176);
  return toTex(c, { aniso: 8 });
}

export function plateTexture(text) {
  const [c, x] = mk(256, 64);
  x.fillStyle = '#f4f0e0'; x.fillRect(0, 0, 256, 64); x.strokeStyle = '#223'; x.lineWidth = 4; x.strokeRect(3, 3, 250, 58);
  x.fillStyle = '#16213a'; x.font = '700 40px system-ui, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, 128, 34);
  return toTex(c);
}

export function waterNormal() {
  const [c, x] = mk(256, 256), tab = noiseTable(17), n = 256, h = new Float32Array(n * n);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) h[j * n + i] = fbm(tab, (i / n) * 8, (j / n) * 8, 8, 4);
  const img = x.createImageData(n, n);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const hl = h[j * n + ((i + n - 1) % n)], hr = h[j * n + ((i + 1) % n)], hu = h[((j + n - 1) % n) * n + i], hd = h[((j + 1) % n) * n + i];
    const nx = (hl - hr) * 3, ny = (hu - hd) * 3, nz = 1, len = Math.hypot(nx, ny, nz), o = (j * n + i) * 4;
    img.data[o] = (nx / len * 0.5 + 0.5) * 255; img.data[o + 1] = (ny / len * 0.5 + 0.5) * 255; img.data[o + 2] = (nz / len * 0.5 + 0.5) * 255; img.data[o + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  return toTex(c, { srgb: false, repeat: [10, 10] });
}

export function softBlobTexture(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)') {
  const [c, x] = mk(128, 128), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, inner); g.addColorStop(1, outer); x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  return toTex(c, { repeat: [1, 1] });
}

export function cloudTexture() {
  const [c, x] = mk(256, 128), r = rng(81);
  for (let i = 0; i < 28; i++) {
    const px = 40 + r() * 176, py = 50 + r() * 28, rad = 18 + r() * 26, g = x.createRadialGradient(px, py, 0, px, py, rad);
    g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.beginPath(); x.arc(px, py, rad, 0, 7); x.fill();
  }
  return toTex(c, { repeat: [1, 1] });
}

// ---------- garage + interior textures ----------
export function leatherTexture(tufted = true) { // grey-scale so material.color can tint it
  const [c, x] = mk(256, 256), r = rng(101);
  x.fillStyle = '#d6d6d6'; x.fillRect(0, 0, 256, 256);
  if (tufted) {
    const S = 64, H = S / 2;
    for (let j = -1; j <= 9; j++) for (let i = -1; i <= 9; i++) { // pillowed diamonds (centres where i+j is odd)
      if (((i + j) % 2 + 2) % 2 === 0) continue;
      const cx = i * H, cy = j * H, g = x.createRadialGradient(cx, cy, 2, cx, cy, H * 1.05);
      g.addColorStop(0, 'rgba(255,255,255,.22)'); g.addColorStop(0.65, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.42)');
      x.fillStyle = g; x.beginPath(); x.moveTo(cx, cy - H); x.lineTo(cx + H, cy); x.lineTo(cx, cy + H); x.lineTo(cx - H, cy); x.closePath(); x.fill();
    }
    x.lineCap = 'round'; x.strokeStyle = 'rgba(0,0,0,.55)'; x.lineWidth = 2.2;
    for (let k = -8; k < 12; k++) { x.beginPath(); x.moveTo(k * S, 0); x.lineTo(k * S + 256, 256); x.stroke(); x.beginPath(); x.moveTo(k * S, 256); x.lineTo(k * S + 256, 0); x.stroke(); }
    x.strokeStyle = 'rgba(255,255,255,.35)'; x.lineWidth = 1; x.setLineDash([4, 4]);
    for (let k = -8; k < 12; k++) { x.beginPath(); x.moveTo(k * S + 2, 0); x.lineTo(k * S + 258, 256); x.stroke(); x.beginPath(); x.moveTo(k * S + 2, 256); x.lineTo(k * S + 258, 0); x.stroke(); }
    x.setLineDash([]);
    for (let j = 0; j <= 8; j++) for (let i = 0; i <= 8; i++) { // buttons where creases cross
      if ((i + j) % 2) continue;
      const bx = i * H, by = j * H;
      x.fillStyle = 'rgba(0,0,0,.6)'; x.beginPath(); x.arc(bx, by, 4.5, 0, 7); x.fill(); x.fillStyle = 'rgba(255,255,255,.5)'; x.beginPath(); x.arc(bx - 1, by - 1, 1.6, 0, 7); x.fill();
    }
  }
  for (let i = 0; i < 5000; i++) { x.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,255,255'},${r() * 0.06})`; x.fillRect(r() * 256, r() * 256, 1.5, 1.5); } // grain
  return toTex(c, { aniso: 8 });
}
export function carpetTexture() {
  const [c, x] = mk(128, 128), r = rng(103);
  x.fillStyle = '#bdbdbd'; x.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 4500; i++) { const v = 90 + r() * 140 | 0; x.fillStyle = `rgba(${v},${v},${v},.7)`; x.fillRect(r() * 128, r() * 128, 1.5, 1.5); }
  return toTex(c, { repeat: [3, 3] });
}
export function fabricTexture() {
  const [c, x] = mk(128, 128);
  x.fillStyle = '#e6e0cf'; x.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 128; i += 3) { x.fillStyle = 'rgba(0,0,0,.05)'; x.fillRect(i, 0, 1, 128); x.fillRect(0, i, 128, 1); }
  return toTex(c, { repeat: [3, 3] });
}
export function woodTexture() {
  const [c, x] = mk(256, 128), r = rng(107), tab = noiseTable(23);
  noisePaint(c, x, tab, 4, 0x5c3418, 0x9a6a3a, { oct: 4, grain: 0.03 });
  for (let i = 0; i < 90; i++) { x.strokeStyle = `rgba(30,15,5,${0.1 + r() * 0.2})`; x.lineWidth = 1 + r() * 1.5; const y = r() * 128; x.beginPath(); x.moveTo(0, y); for (let px = 0; px <= 256; px += 32) x.lineTo(px, y + Math.sin(px * 0.03 + y) * 3 + (r() - 0.5) * 1.5); x.stroke(); }
  const g = x.createLinearGradient(0, 0, 0, 128); g.addColorStop(0, 'rgba(255,230,190,.18)'); g.addColorStop(0.5, 'rgba(255,230,190,0)'); g.addColorStop(1, 'rgba(0,0,0,.2)'); x.fillStyle = g; x.fillRect(0, 0, 256, 128);
  return toTex(c, { aniso: 8 });
}
export function gaugeTexture() {
  const [c, x] = mk(512, 192);
  x.fillStyle = '#0d0e10'; x.fillRect(0, 0, 512, 192);
  const dial = (cx, cy, R, from, to, labels, label, needle) => {
    const g = x.createRadialGradient(cx, cy, 2, cx, cy, R); g.addColorStop(0, '#f1ead2'); g.addColorStop(1, '#cfc6a6'); x.fillStyle = g; x.beginPath(); x.arc(cx, cy, R, 0, 7); x.fill();
    x.strokeStyle = '#222'; x.fillStyle = '#222'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = `600 ${R * 0.16}px Georgia, serif`;
    labels.forEach((t, i) => { const a = from + (to - from) * (i / (labels.length - 1)); x.lineWidth = 2; x.beginPath(); x.moveTo(cx + Math.cos(a) * R * 0.84, cy + Math.sin(a) * R * 0.84); x.lineTo(cx + Math.cos(a) * R * 0.94, cy + Math.sin(a) * R * 0.94); x.stroke(); x.fillText(t, cx + Math.cos(a) * R * 0.66, cy + Math.sin(a) * R * 0.66); });
    x.font = `${R * 0.13}px sans-serif`; x.fillText(label, cx, cy + R * 0.42);
    const a = from + (to - from) * needle; x.strokeStyle = '#b3162a'; x.lineWidth = 3; x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(a) * R * 0.78, cy + Math.sin(a) * R * 0.78); x.stroke(); x.fillStyle = '#222'; x.beginPath(); x.arc(cx, cy, R * 0.07, 0, 7); x.fill();
  };
  dial(256, 96, 86, Math.PI * 0.75, Math.PI * 2.25, ['0', '20', '40', '60', '80', '100'], 'MPH', 0.28);
  dial(96, 96, 56, Math.PI * 1.15, Math.PI * 1.85, ['E', '½', 'F'], 'FUEL', 0.7);
  dial(416, 96, 56, Math.PI * 1.15, Math.PI * 1.85, ['C', '', 'H'], 'TEMP', 0.45);
  return toTex(c, { aniso: 8 });
}
export function corrugatedTexture(color = '#cfd8dc', horizontal = false) {
  const [c, x] = mk(128, 128);
  x.fillStyle = color; x.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 16; i++) { const g = horizontal ? x.createLinearGradient(0, i * 8, 0, i * 8 + 8) : x.createLinearGradient(i * 8, 0, i * 8 + 8, 0); g.addColorStop(0, 'rgba(255,255,255,.22)'); g.addColorStop(0.5, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.28)'); x.fillStyle = g; if (horizontal) x.fillRect(0, i * 8, 128, 8); else x.fillRect(i * 8, 0, 8, 128); }
  const r = rng(113); for (let i = 0; i < 200; i++) { x.fillStyle = `rgba(80,60,40,${r() * 0.06})`; x.fillRect(r() * 128, r() * 128, 2, 12); }
  return toTex(c, { aniso: 8 });
}
export function rollupTexture(color = '#e9e4d6') {
  const [c, x] = mk(256, 256);
  x.fillStyle = color; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 12; i++) { const y = i * 21.3, g = x.createLinearGradient(0, y, 0, y + 21.3); g.addColorStop(0, 'rgba(255,255,255,.25)'); g.addColorStop(0.8, 'rgba(0,0,0,.05)'); g.addColorStop(1, 'rgba(0,0,0,.45)'); x.fillStyle = g; x.fillRect(0, y, 256, 21.3); }
  x.fillStyle = 'rgba(20,30,40,.85)'; for (let i = 0; i < 4; i++) x.fillRect(16 + i * 60, 40, 44, 22); // little windows
  return toTex(c, { aniso: 8 });
}
