import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { plateTexture, softBlobTexture, leatherTexture, carpetTexture, fabricTexture, woodTexture, gaugeTexture, plankTexture } from './textures.js';
import { DEFAULT_CAR } from './customize.js';

// Four 1950s-60s cars share one parts kit (wheels, lamps, bumpers, dash, seats) and the garage's customisation.
// Length runs along +z (front), width along x (+x = the car's left).
const UP = new THREE.Vector3(0, 1, 0);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const poly2 = (pts) => pts.map(([z, y]) => new THREE.Vector2(z, y));
const at = (m, p, r) => { m.position.copy(p); m.rotation.copy(r); return m; };

function extrudeProfile(shape, depth, bevel = 0.07, segs = 4) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: segs, curveSegments: 20 });
  g.translate(0, 0, -depth / 2);
  g.rotateY(-Math.PI / 2); // profile x (length) -> +z, extrusion -> width
  g.computeVertexNormals();
  return g;
}
function rodGeo(a, b, r, seg = 8) {
  const d = new THREE.Vector3().subVectors(b, a), len = d.length(), g = new THREE.CylinderGeometry(r, r, len, seg);
  g.translate(0, len / 2, 0); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, d.normalize())); g.translate(a.x, a.y, a.z);
  return g;
}
const rod = (a, b, r, mat, seg = 8) => { const m = new THREE.Mesh(rodGeo(a, b, r, seg), mat); m.castShadow = true; return m; };

const METAL = { chrome: [0xcfd2d8, 1, 0.12], gold: [0xe0b04a, 1, 0.2], black: [0x16161a, 0.5, 0.3] };
const FINISH = {
  gloss: { metalness: 0.1, roughness: 0.42, clearcoat: 0.5, clearcoatRoughness: 0.12, env: 0.22, iridescence: 0 },
  metallic: { metalness: 0.75, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.06, env: 0.5, iridescence: 0 },
  pearl: { metalness: 0.3, roughness: 0.26, clearcoat: 1, clearcoatRoughness: 0.05, env: 0.55, iridescence: 0.8 },
  matte: { metalness: 0, roughness: 0.9, clearcoat: 0, clearcoatRoughness: 0.5, env: 0.05, iridescence: 0 },
};
const TINT = [[0x9fb9c4, 0.1], [0x7f9aa6, 0.28], [0x2d3d46, 0.55], [0x070a0c, 0.86]];
const HEAD = { warm: [0xfff7e0, 0xffeeb8], white: [0xf4f8ff, 0xe6f0ff], amber: [0xffd27a, 0xffb347], ice: [0xd2ecff, 0x8fcfff] };
const TAIL = { red: [0x8a0000, 0xff1010, 1], amber: [0x995500, 0xff9a1e, 1], smoked: [0x2a0606, 0xd01010, 0.6] };

// ---------- wheels (built at radius 0.375, scaled per model) ----------
function makeWheel(mats, parts) {
  const g = new THREE.Group();
  const prof = [[0.2, -0.105], [0.27, -0.118], [0.33, -0.11], [0.362, -0.075], [0.372, -0.04], [0.376, -0.025], [0.372, -0.012], [0.376, 0], [0.372, 0.012], [0.376, 0.025], [0.372, 0.04], [0.362, 0.075], [0.33, 0.11], [0.27, 0.118], [0.2, 0.105]].map(([r, y]) => new THREE.Vector2(r, y));
  const tire = new THREE.Mesh(new THREE.LatheGeometry(prof, 56), mats.rubber); tire.rotation.z = Math.PI / 2; tire.castShadow = true; g.add(tire);
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.2, 28), mats.dark); drum.rotation.z = Math.PI / 2; g.add(drum);
  for (const s of [-1, 1]) {
    const side = new THREE.Group(); side.scale.x = s; g.add(side); // built for +x, mirrored for -x
    const ww = new THREE.Mesh(new THREE.RingGeometry(0.235, 0.318, 56), mats.white); ww.position.x = 0.1195; ww.rotation.y = Math.PI / 2; side.add(ww); parts.whiteRings.push(ww);
    const rl = new THREE.Mesh(new THREE.RingGeometry(0.262, 0.282, 56), mats.redline); rl.position.x = 0.1198; rl.rotation.y = Math.PI / 2; side.add(rl); parts.redRings.push(rl);
    const variants = {};
    { const h = new THREE.Group(); // chrome hubcap
      h.add(at(new THREE.Mesh(new THREE.TorusGeometry(0.228, 0.011, 8, 56), mats.rim), V(0.118, 0, 0), new THREE.Euler(0, Math.PI / 2, 0)));
      const dome = new THREE.Mesh(new THREE.LatheGeometry([[0, 0.178], [0.03, 0.176], [0.06, 0.168], [0.1, 0.152], [0.15, 0.135], [0.2, 0.124], [0.226, 0.118]].map(([r, y]) => new THREE.Vector2(r, y)), 40), mats.rim); dome.rotation.z = -Math.PI / 2; dome.castShadow = true; h.add(dome);
      const emb = new THREE.Mesh(new THREE.CircleGeometry(0.035, 20), mats.redEmblem); emb.position.x = 0.18; emb.rotation.y = Math.PI / 2; h.add(emb);
      const ribs = []; for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2, b = new THREE.BoxGeometry(0.012, 0.012, 0.1); b.rotateX(-a); b.translate(0.15, Math.sin(a) * 0.12, Math.cos(a) * 0.12); ribs.push(b); }
      h.add(new THREE.Mesh(mergeGeometries(ribs), mats.darkChrome)); variants.dome = h; }
    { const h = new THREE.Group(), sp = []; // wire wheel
      for (let i = 0; i < 40; i++) { const a = (i / 40) * Math.PI * 2, b = a + (i % 2 ? 0.42 : -0.42), ax = i % 2 ? 0.07 : 0.1; sp.push(rodGeo(V(ax, Math.sin(a) * 0.045, Math.cos(a) * 0.045), V(0.105, Math.sin(b) * 0.222, Math.cos(b) * 0.222), 0.0045, 4)); }
      h.add(new THREE.Mesh(mergeGeometries(sp), mats.rim));
      h.add(at(new THREE.Mesh(new THREE.TorusGeometry(0.225, 0.02, 10, 56), mats.rim), V(0.108, 0, 0), new THREE.Euler(0, Math.PI / 2, 0)));
      const back = new THREE.Mesh(new THREE.CircleGeometry(0.222, 40), mats.dark); back.position.x = 0.085; back.rotation.y = Math.PI / 2; h.add(back);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.045, 24), mats.rim); hub.rotation.z = Math.PI / 2; hub.position.x = 0.115; h.add(hub);
      const spin = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.025, 3), mats.rim); spin.rotation.z = Math.PI / 2; spin.position.x = 0.145; h.add(spin); variants.wire = h; }
    { const h = new THREE.Group(), st = new THREE.Shape(), N = 5; // five-spoke mag
      for (let k = 0; k < N; k++) { const a = (k / N) * Math.PI * 2, pts = [[0.07, a - 0.55], [0.208, a - 0.19], [0.208, a + 0.19], [0.07, a + 0.55]]; pts.forEach(([r, t], i) => { const x = Math.cos(t) * r, y = Math.sin(t) * r; if (!k && !i) st.moveTo(x, y); else st.lineTo(x, y); }); }
      st.closePath();
      const geo = new THREE.ExtrudeGeometry(st, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.01, bevelSegments: 2 }); geo.rotateY(Math.PI / 2);
      const face = new THREE.Mesh(geo, mats.rim); face.position.x = 0.085; face.castShadow = true; h.add(face);
      h.add(at(new THREE.Mesh(new THREE.TorusGeometry(0.225, 0.016, 8, 56), mats.rim), V(0.112, 0, 0), new THREE.Euler(0, Math.PI / 2, 0)));
      const back = new THREE.Mesh(new THREE.CircleGeometry(0.222, 40), mats.dark); back.position.x = 0.083; back.rotation.y = Math.PI / 2; h.add(back);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.03, 24), mats.rim); cap.rotation.z = Math.PI / 2; cap.position.x = 0.135; h.add(cap);
      for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 + 0.3, lug = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.02, 6), mats.darkChrome); lug.rotation.z = Math.PI / 2; lug.position.set(0.138, Math.sin(a) * 0.038, Math.cos(a) * 0.038); h.add(lug); }
      variants.mag = h; }
    { const h = new THREE.Group(); // painted steel disc + dog-dish cap
      const disc = new THREE.Mesh(new THREE.LatheGeometry([[0, 0.14], [0.06, 0.138], [0.12, 0.128], [0.18, 0.112], [0.226, 0.105]].map(([r, y]) => new THREE.Vector2(r, y)), 40), mats.steel); disc.rotation.z = -Math.PI / 2; h.add(disc);
      h.add(at(new THREE.Mesh(new THREE.TorusGeometry(0.232, 0.014, 8, 56), mats.rim), V(0.112, 0, 0), new THREE.Euler(0, Math.PI / 2, 0)));
      const dish = new THREE.Mesh(new THREE.SphereGeometry(0.075, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), mats.rim); dish.rotation.z = -Math.PI / 2; dish.position.x = 0.135; dish.scale.set(0.5, 1, 1); h.add(dish);
      const slots = []; for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2, b = new THREE.BoxGeometry(0.01, 0.01, 0.05); b.rotateX(-a); b.translate(0.125, Math.sin(a) * 0.15, Math.cos(a) * 0.15); slots.push(b); }
      h.add(new THREE.Mesh(mergeGeometries(slots), mats.dark)); variants.steel = h; }
    for (const [k, h] of Object.entries(variants)) { side.add(h); (parts.hubs[k] ||= []).push(h); }
  }
  return g;
}

// ---------- shared parts ----------
function headlamp(c, x, y, z, r = 0.15, pod = false) {
  const { add, T, mats } = c;
  add(new THREE.TorusGeometry(r, r * 0.16, 10, 32), T, x, y, z + 0.02, false);
  const dome = add(new THREE.SphereGeometry(r * 0.9, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2), mats.lamp, x, y, z, false); dome.rotation.x = Math.PI / 2; dome.scale.set(1, 0.55, 1);
  add(new THREE.CylinderGeometry(r * 0.43, r * 0.5, 0.03, 14), T, x, y, z, false).rotation.x = Math.PI / 2;
  if (pod) { const b = add(new THREE.SphereGeometry(1, 20, 14), mats.paint, x, y - 0.01, z - r * 2.25); b.scale.set(r * 1.25, r * 1.2, r * 2.0); b.position.z = z - r * 2.25; }
}
function taillamp(c, x, y, z, r = 0.075) {
  const { add, T, mats } = c;
  add(new THREE.CylinderGeometry(r, r, 0.03, 16), mats.tail, x, y, z, false).rotation.x = Math.PI / 2;
  add(new THREE.TorusGeometry(r * 1.1, r * 0.18, 8, 20), T, x, y, z, false);
}
function bumperTube(c, { z, dir, hw, y = 0.54, bow = 0.07, rad = 0.065, lowerY = 0.4 }) {
  const { body, mats } = c;
  const pts = [V(-hw, y, z - dir * 0.12), V(-hw * 0.86, y, z), V(-hw * 0.4, y + 0.005, z + dir * bow), V(hw * 0.4, y + 0.005, z + dir * bow), V(hw * 0.86, y, z), V(hw, y, z - dir * 0.12)];
  const t = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, rad, 12), mats.bumper); t.castShadow = true; t.scale.y = 1.25; body.add(t);
  body.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => p.clone().setY(lowerY))), 40, rad * 0.46, 8), mats.bumper));
}
function bullets(c, xs, y, zf, zr) { for (const x of xs) for (const s of [-1, 1]) { c.parts.bullets.push(c.add(new THREE.SphereGeometry(0.07, 14, 10), c.mats.bumper, s * x, y, zf), c.add(new THREE.SphereGeometry(0.07, 14, 10), c.mats.bumper, s * x, y, zr)); } }
function grille(c, z, y, w, h, bars = 5) {
  const { add, T, mats } = c;
  add(new THREE.BoxGeometry(w, h, 0.04), T, 0, y, z, false); add(new THREE.BoxGeometry(w - 0.06, h - 0.06, 0.05), mats.dark, 0, y, z + 0.015, false);
  for (let i = 0; i < bars; i++) add(new THREE.BoxGeometry(w - 0.04, 0.012, 0.03), T, 0, y - h / 2 + 0.08 + i * ((h - 0.16) / Math.max(1, bars - 1)), z + 0.03, false);
  add(new THREE.SphereGeometry(0.075, 16, 12), T, 0, y, z + 0.06, false).scale.set(1, 1, 1.5);
}
function plateAt(c, y, z) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.13), c.mats.plate); m.position.set(0, y, z); m.rotation.y = Math.PI; c.body.add(m); }
function mirrorRound(c, s, x, y, z) { const { body, add, T } = c; body.add(rod(V(s * (x - 0.17), y - 0.16, z - 0.08), V(s * x, y, z), 0.012, T, 6)); const m = add(new THREE.CylinderGeometry(0.075, 0.075, 0.025, 20), T, s * (x + 0.03), y + 0.02, z + 0.02, false); m.rotation.z = Math.PI / 2; m.rotation.y = 0.3 * s; }
function sideGlass(c, s, w, x, framed = true) {
  const g = new THREE.ShapeGeometry(new THREE.Shape(poly2(w))); g.rotateY(-Math.PI / 2); g.translate(s * x, 0, 0); c.body.add(new THREE.Mesh(g, c.mats.glass));
  if (framed) for (let i = 0; i < w.length; i++) { const p = w[i], q = w[(i + 1) % w.length]; c.body.add(rod(V(s * (x + 0.005), p[1], p[0]), V(s * (x + 0.005), q[1], q[0]), 0.012, c.T, 6)); }
}
function slopeGlass(c, a, b, w, outward, framed = true) { // a = bottom (z, y), b = top (z, y)
  const dz = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dz, dy), nz = outward * dy / len, ny = -outward * dz / len;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, len), c.mats.glass); m.position.set(0, (a[1] + b[1]) / 2, (a[0] + b[0]) / 2); m.rotation.x = -Math.atan2(ny, nz); c.body.add(m);
  if (!framed) return;
  const pts = [V(-w / 2, a[1], a[0]), V(w / 2, a[1], a[0]), V(w / 2, b[1], b[0]), V(-w / 2, b[1], b[0])];
  for (let i = 0; i < 4; i++) c.body.add(rod(pts[i], pts[(i + 1) % 4], 0.014, c.T, 6));
}
function roofSlab(c, { z0, z1, hw, y, thick = 0.05 }) {
  const sh = new THREE.Shape(); sh.moveTo(-hw, z0); sh.lineTo(hw, z0); sh.quadraticCurveTo(hw + 0.05, (z0 + z1) / 2, hw - 0.02, z1); sh.lineTo(-hw + 0.02, z1); sh.quadraticCurveTo(-hw - 0.05, (z0 + z1) / 2, -hw, z0);
  const g = new THREE.ExtrudeGeometry(sh, { depth: thick, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.045, bevelSegments: 3, curveSegments: 12 }); g.rotateX(Math.PI / 2); g.computeVertexNormals();
  c.add(g, c.mats.roofPaint, 0, y, 0, true, c.RG);
  const head = new THREE.PlaneGeometry(hw * 2 - 0.1, z1 - z0 - 0.1); head.rotateX(Math.PI / 2); c.add(head, c.mats.fabric, 0, y - 0.06, (z0 + z1) / 2, false, c.RG);
  c.add(new THREE.SphereGeometry(0.05, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), c.mats.fabric, 0, y - 0.06, (z0 + z1) / 2, false, c.RG).rotation.x = Math.PI;
}
function bench(c, { x = 0, y, z, w = 1.42, d = 0.5, backH = 0.52, backZ, tilt = 0.16 }) {
  const { add, rbox, mats } = c;
  add(rbox(w - 0.04, 0.12, d - 0.04, 0.03), mats.plastic, x, y - 0.1, z, false);
  add(rbox(w, 0.17, d, 0.07), mats.leather, x, y, z, false);
  add(rbox(w, backH, 0.15, 0.07), mats.leather, x, y + 0.2 + backH / 2 - 0.1, backZ ?? z - 0.32, false).rotation.x = -tilt;
  for (const sx of [-1, 1]) add(rbox(0.06, 0.2, d + 0.02, 0.025), mats.accent, x + sx * (w / 2 + 0.01), y + 0.02, z, false);
}
function bucket(c, { x, y, z }) { bench(c, { x, y, z, w: 0.6, d: 0.5, backH: 0.5, backZ: z - 0.3, tilt: 0.22 }); }
function dashboard(c, { z, y, w, dx }) {
  const { add, rbox, mats, T, body } = c;
  add(rbox(w, 0.2, 0.32, 0.05), mats.dash, 0, y, z, false);
  add(rbox(w + 0.02, 0.035, 0.34, 0.015), mats.plastic, 0, y + 0.11, z, false);
  const clu = add(rbox(0.48, 0.17, 0.04, 0.015), T, dx, y + 0.02, z - 0.145, false); clu.rotation.x = -0.25;
  const gp = new THREE.Mesh(new THREE.PlaneGeometry(0.43, 0.115), mats.gauges); gp.position.set(dx, y + 0.02, z - 0.17); gp.rotation.set(-0.25, Math.PI, 0); body.add(gp);
  if (w > 1.2) {
    add(rbox(0.3, 0.12, 0.03, 0.01), T, -0.02, y - 0.07, z - 0.16, false);
    add(new THREE.PlaneGeometry(0.17, 0.045), mats.gauges, -0.02, y - 0.055, z - 0.178, false).rotation.y = Math.PI;
    for (const kx of [-0.125, 0.085]) add(new THREE.CylinderGeometry(0.02, 0.02, 0.03, 12), mats.dark, kx, y - 0.07, z - 0.18, false).rotation.x = Math.PI / 2;
    add(rbox(0.46, 0.15, 0.02, 0.01), mats.plastic, -w * 0.3, y - 0.05, z - 0.16, false); add(new THREE.BoxGeometry(0.07, 0.02, 0.02), T, -w * 0.3, y - 0.01, z - 0.175, false);
    for (let i = 0; i < 4; i++) add(new THREE.CylinderGeometry(0.014, 0.014, 0.03, 12), T, 0.22 + i * 0.07, y - 0.12, z - 0.16, false).rotation.x = Math.PI / 2;
    for (const vx of [-0.3, 0.3]) add(new THREE.BoxGeometry(0.3, 0.008, 0.05), mats.dark, vx, y + 0.118, z + 0.05, false);
  }
  const sw = new THREE.Group(); sw.position.set(dx, y + 0.06, z - 0.35); body.add(sw);
  sw.add(new THREE.Mesh(new THREE.TorusGeometry(0.205, 0.019, 10, 40), mats.plastic)); sw.add(new THREE.Mesh(new THREE.TorusGeometry(0.125, 0.007, 6, 28, Math.PI * 1.5), T));
  add(new THREE.CylinderGeometry(0.04, 0.045, 0.04, 16), T, 0, 0, 0, false, sw).rotation.x = Math.PI / 2;
  for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2 + Math.PI / 2; sw.add(rod(V(0, 0, 0), V(Math.cos(a) * 0.2, Math.sin(a) * 0.2, 0), 0.007, T, 5)); }
  sw.lookAt(V(dx, y + 0.06 + 0.5, z - 0.35 - 0.85));
  body.add(rod(V(dx, y - 0.07, z - 0.11), V(dx, y + 0.02, z - 0.29), 0.022, mats.darkChrome, 8));
  for (const px of [dx - 0.12, dx + 0.06]) { add(new THREE.BoxGeometry(0.06, 0.012, 0.13), mats.darkChrome, px, y - 0.2, z + 0.03, false).rotation.x = 0.55; add(new THREE.BoxGeometry(0.06, 0.014, 0.1), mats.rubber, px, y - 0.19, z + 0.03, false).rotation.x = 0.55; }
}
function floorAndCards(c, { z0, z1, floorY = 0.72, hw = 0.75, cardX = 0.815, cardZ0, cardZ1 }) {
  const { add, rbox, mats, both, body } = c, len = z1 - z0, zc = (z0 + z1) / 2;
  add(new THREE.BoxGeometry(hw * 2, 0.03, len + 0.04), mats.dark, 0, floorY - 0.02, zc, false);
  add(rbox(hw * 2 - 0.04, 0.03, len, 0.012), mats.carpet, 0, floorY, zc, false);
  add(rbox(0.3, 0.09, len - 0.3, 0.04), mats.carpet, 0, floorY + 0.05, zc, false);
  const cl = (cardZ1 - cardZ0), cz = (cardZ0 + cardZ1) / 2;
  both((s) => {
    add(rbox(0.045, 0.44, cl, 0.02), mats.leatherSmooth, s * cardX, floorY + 0.12, cz, false);
    add(rbox(0.03, 0.2, cl * 0.78, 0.015), mats.accent, s * (cardX - 0.02), floorY + 0.18, cz, false);
    add(rbox(0.1, 0.06, Math.min(0.55, cl * 0.4), 0.025), mats.leatherSmooth, s * (cardX - 0.045), floorY + 0.31, cz - 0.02, false);
    add(rbox(0.04, 0.022, 0.14, 0.008), c.T, s * (cardX - 0.025), floorY + 0.26, cz + cl * 0.3, false);
    body.add(rod(V(s * (cardX - 0.015), floorY + 0.14, cz + cl * 0.1), V(s * (cardX - 0.095), floorY + 0.14, cz + cl * 0.1), 0.008, c.T, 6)); add(new THREE.SphereGeometry(0.02, 10, 8), mats.white, s * (cardX - 0.105), floorY + 0.14, cz + cl * 0.1, false);
  });
}

// ---------- model 1: classic sedan ----------
function buildSedan(c) {
  const { add, both, body, mats, T, RG, rod: R, spec } = c, y0 = 0.36, ar = 0.5, AF = spec.axleF, AR = spec.axleR;
  const shape = new THREE.Shape();
  shape.moveTo(-2.38, y0); shape.lineTo(AR - ar, y0); shape.absarc(AR, y0, ar, Math.PI, 0, true); shape.lineTo(AF - ar, y0); shape.absarc(AF, y0, ar, Math.PI, 0, true); shape.lineTo(2.36, y0);
  shape.lineTo(2.4, 0.64); shape.quadraticCurveTo(2.43, 0.93, 2.28, 0.99); shape.lineTo(1.3, 1.07); shape.lineTo(0.62, 1.1);
  shape.lineTo(0.62, 0.62); shape.lineTo(-1.02, 0.62); shape.lineTo(-1.02, 1.12); shape.lineTo(-1.8, 1.12); shape.quadraticCurveTo(-2.3, 1.12, -2.4, 0.9); shape.lineTo(-2.42, 0.6); shape.lineTo(-2.38, y0);
  add(extrudeProfile(shape, 1.66, 0.09), mats.paint);
  const door = new THREE.Shape(); door.moveTo(-1.0, 0.45); door.lineTo(0.6, 0.45); door.lineTo(0.6, 1.12); door.lineTo(-1.0, 1.12); door.lineTo(-1.0, 0.45);
  both((s) => add(extrudeProfile(door, 0.07, 0.025, 3), mats.paint, s * 0.885, 0, 0));
  add(new THREE.BoxGeometry(1.44, 0.34, 4.5), mats.dark, 0, 0.42, 0, false);
  roofSlab(c, { z0: -0.95, z1: 0.46, hw: 0.8, y: 1.69 });
  both((s) => {
    body.add(R(V(s * 0.79, 1.1, 0.64), V(s * 0.79, 1.64, 0.44), 0.038, mats.roofPaint)); body.add(R(V(s * 0.79, 1.12, -1.0), V(s * 0.79, 1.64, -0.86), 0.038, mats.roofPaint)); body.add(R(V(s * 0.79, 1.1, -0.11), V(s * 0.79, 1.64, -0.11), 0.045, mats.roofPaint));
    sideGlass(c, s, [[0.56, 1.15], [0.4, 1.6], [-0.06, 1.6], [-0.06, 1.15]], 0.795); sideGlass(c, s, [[-0.16, 1.15], [-0.16, 1.6], [-0.83, 1.6], [-0.99, 1.15]], 0.795);
    body.add(R(V(s * 0.805, 1.15, 0.3), V(s * 0.805, 1.58, 0.36), 0.01, T, 6));
    add(new THREE.BoxGeometry(0.03, 0.03, 0.2), T, s * 0.925, 1.0, 0.28, false); add(new THREE.BoxGeometry(0.03, 0.03, 0.2), T, s * 0.925, 1.0, -0.38, false);
    for (const z of [0.6, -0.11, -1.02]) add(new THREE.BoxGeometry(0.012, 0.66, 0.012), mats.dark, s * 0.93, 0.78, z, false);
    add(new THREE.BoxGeometry(0.01, 0.035, 4.3), T, s * 0.935, 0.8, 0, false);
    mirrorRound(c, s, 1.07, 1.24, 0.66);
    for (const az of [AF, AR]) { const t = new THREE.Mesh(new THREE.TorusGeometry(ar + 0.07, 0.014, 8, 36, Math.PI), T); t.rotation.y = Math.PI / 2; t.position.set(s * 0.93, y0, az); body.add(t); }
    add(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 16), T, s * 0.93, 1.0, -1.7, false).rotation.z = Math.PI / 2;
    const fin = new THREE.Shape(); fin.moveTo(-1.65, 1.1); fin.lineTo(-2.1, 1.3); fin.lineTo(-2.45, 1.5); fin.lineTo(-2.47, 1.1); fin.lineTo(-1.65, 1.1);
    add(extrudeProfile(fin, 0.07, 0.02, 3), mats.paint, s * 0.88, 0, 0);
    add(new THREE.CapsuleGeometry(0.045, 0.16, 6, 12), mats.tail, s * 0.88, 1.27, -2.46, false); add(new THREE.TorusGeometry(0.06, 0.012, 8, 16), T, s * 0.88, 1.27, -2.45, false).scale.set(0.9, 2.1, 1);
    taillamp(c, s * 0.62, 0.88, -2.43); headlamp(c, s * 0.66, 0.84, 2.38);
    const park = add(new THREE.SphereGeometry(0.06, 12, 10), mats.amber, s * 0.95, 0.66, 2.34, false); park.scale.set(0.8, 1, 1.4);
    body.add(R(V(s * 0.1, 1.16, 0.6), V(s * 0.62, 1.4, 0.52), 0.008, mats.dark, 5));
    add(new THREE.CylinderGeometry(0.05, 0.055, 0.2, 16), T, s * 0.55, 0.36, -2.42, false).rotation.x = Math.PI / 2;
  });
  slopeGlass(c, [0.62, 1.12], [0.44, 1.64], 1.56, 1); slopeGlass(c, [-1.02, 1.13], [-0.86, 1.64], 1.5, -1);
  add(new THREE.BoxGeometry(0.2, 0.06, 0.03), mats.dark, 0, 1.55, 0.45, false, RG); body.add(R(V(0, 1.62, 0.43), V(0, 1.56, 0.46), 0.008, T, 5));
  both((s) => { const v = add(c.rbox(0.48, 0.022, 0.2, 0.008), mats.fabric, s * 0.4, 1.58, 0.38, false, RG); v.rotation.x = -0.12; });
  floorAndCards(c, { z0: -1.0, z1: 0.6, cardZ0: -0.9, cardZ1: 0.5 });
  bench(c, { y: 0.88, z: 0.02, backZ: -0.3, backH: 0.52 }); bench(c, { y: 0.9, z: -0.66, backZ: -0.94, backH: 0.58, tilt: 0.1 });
  add(c.rbox(0.46, 0.1, 0.2, 0.04), mats.leather, 0, 1.03, -0.84, false).rotation.x = -0.1;
  dashboard(c, { z: 0.47, y: 1.0, w: 1.68, dx: 0.38 });
  bumperTube(c, { z: 2.44, dir: 1, hw: 1.0 }); bumperTube(c, { z: -2.46, dir: -1, hw: 1.0 }); bullets(c, [0.5], 0.56, 2.5, -2.52);
  grille(c, 2.44, 0.7, 1.0, 0.26); body.add(R(V(0, 1.075, 1.0), V(0, 1.045, 2.25), 0.014, T, 6));
  add(new THREE.ConeGeometry(0.035, 0.22, 10), T, 0, 1.09, 2.22, false).rotation.x = Math.PI / 2 + 0.15; add(new THREE.BoxGeometry(0.2, 0.012, 0.07), T, 0, 1.075, 2.2, false);
  body.add(R(V(-0.78, 1.06, 0.95), V(-0.8, 1.9, 0.82), 0.007, T, 5));
  add(new THREE.BoxGeometry(1.2, 0.012, 0.012), mats.dark, 0, 0.98, -2.43, false); add(new THREE.BoxGeometry(0.22, 0.03, 0.03), T, 0, 1.06, -2.4, false); plateAt(c, 0.78, -2.47);
  Object.assign(spec, { camTgt: [0, 0.95, 0.05] });
}

// ---------- model 2: roadster (open two-seater with a long hood) ----------
function buildRoadster(c) {
  const { add, both, body, mats, T, spec, rbox } = c, y0 = 0.34, ar = 0.47, AF = spec.axleF, AR = spec.axleR;
  const shape = new THREE.Shape();
  shape.moveTo(-2.12, y0); shape.lineTo(AR - ar, y0); shape.absarc(AR, y0, ar, Math.PI, 0, true); shape.lineTo(AF - ar, y0); shape.absarc(AF, y0, ar, Math.PI, 0, true); shape.lineTo(2.1, y0);
  shape.lineTo(2.15, 0.6); shape.quadraticCurveTo(2.18, 0.84, 2.0, 0.9); shape.lineTo(1.3, 1.0); shape.lineTo(0.55, 1.04);
  shape.lineTo(0.55, 0.6); shape.lineTo(-0.9, 0.6); shape.lineTo(-0.9, 1.0); shape.lineTo(-1.6, 1.02); shape.quadraticCurveTo(-2.06, 1.0, -2.16, 0.78); shape.lineTo(-2.16, 0.55); shape.lineTo(-2.12, y0);
  add(extrudeProfile(shape, 1.52, 0.09), mats.paint);
  const door = new THREE.Shape(); door.moveTo(-0.88, 0.45); door.lineTo(0.5, 0.45); door.lineTo(0.5, 1.0); door.quadraticCurveTo(-0.15, 0.82, -0.88, 1.0); door.lineTo(-0.88, 0.45);
  both((s) => add(extrudeProfile(door, 0.07, 0.025, 3), mats.paint, s * 0.8, 0, 0));
  add(new THREE.BoxGeometry(1.3, 0.34, 4.0), mats.dark, 0, 0.42, 0, false);
  // low raked windscreen + chrome posts, cockpit rim, folded soft-top boot
  slopeGlass(c, [0.55, 1.04], [0.36, 1.36], 1.3, 1);
  both((s) => { body.add(rod(V(s * 0.65, 1.02, 0.55), V(s * 0.65, 1.36, 0.36), 0.018, T, 8)); sideGlass(c, s, [[0.5, 1.07], [0.38, 1.3], [0.18, 1.07]], 0.66);
    add(rbox(0.06, 0.05, 1.42, 0.02), mats.leatherSmooth, s * 0.7, 1.0, -0.2, false); mirrorRound(c, s, 0.78, 1.24, 0.52);
    add(new THREE.BoxGeometry(0.012, 0.02, 1.1), T, s * 0.8, 0.82, -0.1, false);
    for (const k of [0, 1, 2]) add(new THREE.BoxGeometry(0.014, 0.1, 0.012), T, s * 0.8, 0.84, 1.02 + k * 0.1, false); // fender strakes
    for (const az of [AF, AR]) { const t = new THREE.Mesh(new THREE.TorusGeometry(ar + 0.07, 0.014, 8, 36, Math.PI), T); t.rotation.y = Math.PI / 2; t.position.set(s * 0.83, y0, az); body.add(t); }
    headlamp(c, s * 0.6, 1.02, 1.82, 0.16, true); taillamp(c, s * 0.55, 0.86, -2.27, 0.07);
    add(new THREE.CylinderGeometry(0.045, 0.05, 0.2, 16), T, s * 0.36, 0.36, -2.3, false).rotation.x = Math.PI / 2;
    // headrest fairings behind the seats
    const f = add(new THREE.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), mats.paint, s * 0.4, 1.0, -0.95); f.scale.set(0.3, 0.3, 0.5);
  });
  add(rbox(1.46, 0.14, 0.62, 0.06), mats.roofPaint, 0, 1.02, -1.2, true, c.RG);
  for (const x of [-0.5, 0, 0.5]) add(new THREE.SphereGeometry(0.02, 8, 6), T, x, 1.1, -0.9, false, c.RG);
  floorAndCards(c, { z0: -0.9, z1: 0.55, hw: 0.68, cardX: 0.755, cardZ0: -0.85, cardZ1: 0.45 });
  bucket(c, { x: 0.36, y: 0.88, z: -0.12 }); bucket(c, { x: -0.36, y: 0.88, z: -0.12 });
  dashboard(c, { z: 0.38, y: 0.9, w: 1.42, dx: 0.36 });
  // oval grille mouth, thin bumpers
  const mouth = add(new THREE.TorusGeometry(1, 0.045, 10, 40), T, 0, 0.6, 2.27, false); mouth.scale.set(0.42, 0.2, 1);
  const inner = add(new THREE.CircleGeometry(1, 32), mats.dark, 0, 0.6, 2.265, false); inner.scale.set(0.4, 0.18, 1);
  for (let i = -3; i <= 3; i++) add(new THREE.BoxGeometry(0.012, 0.34, 0.02), T, i * 0.1, 0.6, 2.28, false);
  bumperTube(c, { z: 2.3, dir: 1, hw: 0.82, y: 0.46, rad: 0.05, bow: 0.05, lowerY: 0.34 }); bumperTube(c, { z: -2.32, dir: -1, hw: 0.82, y: 0.46, rad: 0.05, bow: 0.05, lowerY: 0.34 }); bullets(c, [0.4], 0.5, 2.36, -2.38);
  body.add(rod(V(0, 1.045, 0.7), V(0, 1.01, 1.9), 0.012, T, 6)); add(new THREE.CylinderGeometry(0.03, 0.04, 0.14, 10), T, 0, 1.04, 2.0, false).rotation.x = Math.PI / 2;
  add(new THREE.BoxGeometry(0.2, 0.03, 0.03), T, 0, 1.0, -2.2, false); plateAt(c, 0.7, -2.3);
  Object.assign(spec, { camTgt: [0, 0.9, -0.1] });
}

// ---------- model 3: pickup truck ----------
function buildPickup(c) {
  const { add, both, body, mats, T, spec, rbox, RG } = c, y0 = 0.4, ar = 0.56, AF = spec.axleF, AR = spec.axleR;
  const shape = new THREE.Shape(); // front clip + cab floor + bed floor, one extrusion with two open wells
  shape.moveTo(-2.62, y0); shape.lineTo(AR - ar, y0); shape.absarc(AR, y0, ar, Math.PI, 0, true); shape.lineTo(AF - ar, y0); shape.absarc(AF, y0, ar, Math.PI, 0, true); shape.lineTo(2.55, y0);
  shape.lineTo(2.6, 0.78); shape.quadraticCurveTo(2.62, 1.12, 2.44, 1.16); shape.lineTo(1.0, 1.22); shape.lineTo(0.72, 1.22);
  shape.lineTo(0.72, 0.64); shape.lineTo(-0.5, 0.64); shape.lineTo(-0.5, 1.22); shape.lineTo(-0.62, 1.22); shape.lineTo(-0.62, 0.8); shape.lineTo(-2.46, 0.8); shape.lineTo(-2.58, 0.84); shape.lineTo(-2.62, y0);
  add(extrudeProfile(shape, 1.72, 0.08), mats.paint);
  const cab = new THREE.Shape(); cab.moveTo(-0.5, 0.45); cab.lineTo(0.72, 0.45); cab.lineTo(0.72, 1.22); cab.lineTo(-0.5, 1.22); cab.lineTo(-0.5, 0.45);
  both((s) => add(extrudeProfile(cab, 0.07, 0.025, 3), mats.paint, s * 0.93, 0, 0));
  const bedSide = new THREE.Shape(); bedSide.moveTo(-0.6, 0.4); bedSide.lineTo(AR + ar, 0.4); bedSide.absarc(AR, 0.4, ar, 0, Math.PI, false); bedSide.lineTo(-2.58, 0.4); bedSide.lineTo(-2.58, 1.22); bedSide.lineTo(-0.6, 1.22); bedSide.lineTo(-0.6, 0.4);
  both((s) => add(extrudeProfile(bedSide, 0.07, 0.025, 3), mats.paint, s * 0.93, 0, 0));
  add(new THREE.BoxGeometry(1.5, 0.34, 4.9), mats.dark, 0, 0.5, 0, false);
  // hood (raised centre), grille, big round lamps on the fenders, flat chrome bumper
  add(rbox(1.04, 0.1, 1.7, 0.04), mats.paint, 0, 1.22, 1.62); body.add(rod(V(0, 1.28, 0.9), V(0, 1.27, 2.4), 0.014, T, 6));
  grille(c, 2.67, 0.78, 1.05, 0.42, 6);
  both((s) => { headlamp(c, s * 0.78, 0.98, 2.64, 0.17, true); taillamp(c, s * 0.86, 0.95, -2.72, 0.08); mirrorRound(c, s, 1.1, 1.62, 0.62);
    for (const az of [AF, AR]) { const t = new THREE.Mesh(new THREE.TorusGeometry(ar + 0.06, 0.014, 8, 36, Math.PI), T); t.rotation.y = Math.PI / 2; t.position.set(s * 0.97, y0, az); body.add(t); }
    add(new THREE.BoxGeometry(0.28, 0.05, 1.3), mats.dark, s * 1.0, 0.46, 0.05, false); add(new THREE.BoxGeometry(0.25, 0.012, 1.3), T, s * 1.0, 0.485, 0.05, false); // running boards
    add(new THREE.BoxGeometry(0.012, 0.02, 1.0), T, s * 0.97, 0.9, 0.1, false);
    body.add(rod(V(s * 0.95, 1.22, -0.62), V(s * 0.95, 1.22, -2.55), 0.02, T, 6)); // bed rail
    add(new THREE.BoxGeometry(0.03, 0.03, 0.18), T, s * 0.98, 1.05, 0.25, false);
    add(rbox(0.25, 0.28, 0.9, 0.06), mats.paint, s * 0.7, 1.0, AR); }); // wheel housings in the bed
  bumperTube(c, { z: 2.78, dir: 1, hw: 0.98, y: 0.6, rad: 0.07, bow: 0.04, lowerY: 0.45 }); bullets(c, [0.55], 0.62, 2.84, -2.9);
  add(new THREE.BoxGeometry(1.8, 0.14, 0.2), mats.bumper, 0, 0.58, -2.84, true); add(new THREE.BoxGeometry(1.3, 0.05, 0.05), mats.bumper, 0, 0.5, -2.76, false);
  // cab: pillars, glass, roof, seat, dash
  both((s) => { body.add(rod(V(s * 0.9, 1.22, 0.72), V(s * 0.9, 1.82, 0.5), 0.045, mats.roofPaint)); body.add(rod(V(s * 0.9, 1.22, -0.55), V(s * 0.9, 1.82, -0.5), 0.045, mats.roofPaint));
    sideGlass(c, s, [[0.62, 1.27], [0.44, 1.76], [-0.42, 1.76], [-0.46, 1.27]], 0.9); });
  slopeGlass(c, [0.72, 1.22], [0.5, 1.82], 1.8, 1); slopeGlass(c, [-0.55, 1.3], [-0.5, 1.78], 1.1, -1);
  roofSlab(c, { z0: -0.55, z1: 0.52, hw: 0.93, y: 1.86 });
  floorAndCards(c, { z0: -0.5, z1: 0.72, floorY: 0.74, hw: 0.86, cardX: 0.88, cardZ0: -0.45, cardZ1: 0.62 });
  bench(c, { y: 0.98, z: 0.0, w: 1.7, backZ: -0.3, backH: 0.55 });
  dashboard(c, { z: 0.6, y: 1.12, w: 1.86, dx: 0.42 });
  // bed: plank floor, tailgate with chrome handle, a couple of crates
  const floor = add(new THREE.BoxGeometry(1.7, 0.05, 1.9), new THREE.MeshStandardMaterial({ map: plankTexture([120, 88, 54]), roughness: 0.85 }), 0, 0.86, -1.6, false);
  for (let i = 0; i < 7; i++) add(new THREE.BoxGeometry(0.012, 0.012, 1.9), mats.dark, -0.72 + i * 0.24, 0.89, -1.6, false); void floor;
  add(rbox(1.78, 0.42, 0.06, 0.02), mats.paint, 0, 1.0, -2.58); add(new THREE.BoxGeometry(0.26, 0.03, 0.03), T, 0, 1.18, -2.63, false);
  for (const [cx, cz, s] of [[-0.4, -2.0, 0.5], [0.3, -1.85, 0.42]]) { const crate = add(new THREE.BoxGeometry(s, s * 0.8, s), new THREE.MeshStandardMaterial({ map: plankTexture([150, 110, 66]), roughness: 0.9 }), cx, 0.88 + s * 0.4, cz); crate.rotation.y = cx * 0.6; }
  plateAt(c, 0.72, -2.9);
  Object.assign(spec, { camTgt: [0, 1.0, 0.0] });
}

// ---------- model 4: mini hatchback ----------
function buildMini(c) {
  const { add, both, body, mats, T, spec } = c, y0 = 0.3, ar = 0.4, AF = spec.axleF, AR = spec.axleR;
  const shape = new THREE.Shape();
  shape.moveTo(-1.58, y0); shape.lineTo(AR - ar, y0); shape.absarc(AR, y0, ar, Math.PI, 0, true); shape.lineTo(AF - ar, y0); shape.absarc(AF, y0, ar, Math.PI, 0, true); shape.lineTo(1.58, y0);
  shape.lineTo(1.62, 0.55); shape.quadraticCurveTo(1.65, 0.8, 1.48, 0.88); shape.lineTo(0.9, 0.93); shape.lineTo(0.72, 0.94);
  shape.lineTo(0.72, 0.56); shape.lineTo(-1.1, 0.56); shape.lineTo(-1.1, 0.94); shape.lineTo(-1.4, 0.94); shape.quadraticCurveTo(-1.62, 0.9, -1.62, 0.68); shape.lineTo(-1.6, 0.5); shape.lineTo(-1.58, y0);
  add(extrudeProfile(shape, 1.36, 0.09), mats.paint);
  const door = new THREE.Shape(); door.moveTo(-1.05, 0.4); door.lineTo(0.68, 0.4); door.lineTo(0.68, 0.94); door.lineTo(-1.05, 0.94); door.lineTo(-1.05, 0.4);
  both((s) => add(extrudeProfile(door, 0.06, 0.02, 3), mats.paint, s * 0.73, 0, 0));
  add(new THREE.BoxGeometry(1.14, 0.3, 3.0), mats.dark, 0, 0.36, 0, false);
  roofSlab(c, { z0: -1.2, z1: 0.38, hw: 0.68, y: 1.46 });
  both((s) => {
    body.add(rod(V(s * 0.66, 0.94, 0.74), V(s * 0.66, 1.44, 0.4), 0.034, mats.roofPaint)); body.add(rod(V(s * 0.66, 0.94, -1.14), V(s * 0.66, 1.44, -1.22), 0.034, mats.roofPaint));
    sideGlass(c, s, [[0.64, 0.99], [0.36, 1.4], [-1.18, 1.4], [-1.12, 0.99]], 0.665); body.add(rod(V(s * 0.67, 0.99, -0.2), V(s * 0.67, 1.4, -0.2), 0.016, T, 6));
    mirrorRound(c, s, 0.84, 1.1, 0.6); headlamp(c, s * 0.52, 0.76, 1.72, 0.14); taillamp(c, s * 0.5, 0.78, -1.72, 0.06);
    for (const az of [AF, AR]) { const t = new THREE.Mesh(new THREE.TorusGeometry(ar + 0.06, 0.013, 8, 36, Math.PI), T); t.rotation.y = Math.PI / 2; t.position.set(s * 0.74, y0, az); body.add(t); }
    add(new THREE.BoxGeometry(0.02, 0.025, 0.14), T, s * 0.78, 0.8, 0.3, false); add(new THREE.BoxGeometry(0.01, 0.025, 3.0), T, s * 0.755, 0.62, 0, false);
  });
  slopeGlass(c, [0.72, 0.95], [0.4, 1.44], 1.34, 1); slopeGlass(c, [-1.12, 0.96], [-1.22, 1.42], 1.26, -1);
  floorAndCards(c, { z0: -1.1, z1: 0.72, floorY: 0.62, hw: 0.64, cardX: 0.69, cardZ0: -1.0, cardZ1: 0.6 });
  bench(c, { y: 0.74, z: 0.04, w: 1.14, d: 0.46, backZ: -0.26, backH: 0.48 }); bench(c, { y: 0.76, z: -0.7, w: 1.14, d: 0.46, backZ: -0.98, backH: 0.5, tilt: 0.08 });
  dashboard(c, { z: 0.56, y: 0.84, w: 1.2, dx: 0.3 });
  grille(c, 1.73, 0.58, 0.55, 0.18, 3); bumperTube(c, { z: 1.78, dir: 1, hw: 0.7, y: 0.42, rad: 0.045, bow: 0.04, lowerY: 0.34 }); bumperTube(c, { z: -1.8, dir: -1, hw: 0.7, y: 0.42, rad: 0.045, bow: 0.04, lowerY: 0.34 }); bullets(c, [0.3], 0.46, 1.84, -1.86);
  add(new THREE.BoxGeometry(0.16, 0.03, 0.03), T, 0, 0.97, -1.72, false); plateAt(c, 0.62, -1.75);
  add(new THREE.CylinderGeometry(0.04, 0.045, 0.16, 14), T, 0.38, 0.32, -1.76, false).rotation.x = Math.PI / 2;
  Object.assign(spec, { camTgt: [0, 0.8, -0.1] });
}

export const MODELS = {
  sedan: { id: 'sedan', name: 'Classic Sedan', emoji: '🚗', blurb: 'Big, smooth and chrome-heavy. A comfortable cruiser.', build: buildSedan, axleF: 1.5, axleR: -1.5, track: 0.77, wheelR: 0.375, length: 4.9, width: 1.84, wheelbase: 3.0, circles: [-1.5, 0, 1.5], radius: 1.0, stats: { topSpeed: 30, accel: 12.5, steer: 0.62, grip: 9, bars: [3, 3, 3] } },
  roadster: { id: 'roadster', name: 'Roadster', emoji: '🏎️', blurb: 'Open-top two-seater with a long hood. Fast and light.', build: buildRoadster, axleF: 1.3, axleR: -1.2, track: 0.74, wheelR: 0.34, length: 4.4, width: 1.7, wheelbase: 2.5, circles: [-1.2, 0, 1.3], radius: 0.95, stats: { topSpeed: 36, accel: 16, steer: 0.66, grip: 10, bars: [5, 5, 4] } },
  pickup: { id: 'pickup', name: 'Pickup', emoji: '🛻', blurb: 'A tough working truck with a wooden bed. Slow but steady.', build: buildPickup, axleF: 1.6, axleR: -1.4, track: 0.84, wheelR: 0.41, length: 5.4, width: 2.0, wheelbase: 3.0, circles: [-1.9, -0.6, 0.7, 1.9], radius: 1.05, stats: { topSpeed: 24, accel: 9.5, steer: 0.52, grip: 7.5, bars: [2, 2, 2] } },
  mini: { id: 'mini', name: 'Mini', emoji: '🚙', blurb: 'A tiny nimble hatchback that turns on a coin.', build: buildMini, axleF: 1.0, axleR: -0.95, track: 0.66, wheelR: 0.29, length: 3.4, width: 1.55, wheelbase: 1.95, circles: [-0.95, 0.95], radius: 0.85, stats: { topSpeed: 22, accel: 11, steer: 0.85, grip: 9.5, bars: [2, 3, 5] } },
};
export const MODEL_LIST = Object.values(MODELS);

export function createCar(cfg0 = DEFAULT_CAR, env = null) {
  const spec = { ...(MODELS[cfg0.model] || MODELS.sedan) }; // per-instance copy: builders add camTgt
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const parts = { hubs: {}, whiteRings: [], redRings: [], bullets: [], roofGroup: new THREE.Group() }; body.add(parts.roofGroup);
  const mk = (p) => new THREE.MeshStandardMaterial(p), mkp = (p) => new THREE.MeshPhysicalMaterial(p);
  const mats = {
    paint: mkp({ color: 0xa30d20 }), roofPaint: mkp({ color: 0xeadfc4 }), steel: mkp({ color: 0xa30d20 }),
    trim: mk({ color: 0xcfd2d8, metalness: 1, roughness: 0.12 }), bumper: mk({ color: 0xcfd2d8, metalness: 1, roughness: 0.12 }), rim: mk({ color: 0xcfd2d8, metalness: 1, roughness: 0.12 }),
    darkChrome: mk({ color: 0x777b82, metalness: 1, roughness: 0.3 }), dark: mk({ color: 0x0e0e10, roughness: 0.7, metalness: 0.3 }),
    rubber: mk({ color: 0x151517, roughness: 0.92 }), white: mk({ color: 0xf2eee2, roughness: 0.7 }), redline: mk({ color: 0xc0182c, roughness: 0.6 }), redEmblem: mk({ color: 0xc0182c, roughness: 0.4, metalness: 0.5 }),
    glass: mkp({ color: 0x9fb9c4, metalness: 0, roughness: 0.04, transparent: true, opacity: 0.22, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false }),
    leather: mk({ map: leatherTexture(true), color: 0xd9ccaa, roughness: 0.5 }), leatherSmooth: mk({ map: leatherTexture(false), color: 0xd9ccaa, roughness: 0.55 }),
    accent: mk({ color: 0x7a6a4a, roughness: 0.55 }), carpet: mk({ map: carpetTexture(), color: 0x3a2a24, roughness: 1 }), fabric: mk({ map: fabricTexture(), roughness: 0.95 }),
    dash: mk({ map: woodTexture(), color: 0xffffff, roughness: 0.35 }), gauges: mk({ map: gaugeTexture(), roughness: 0.3 }), plastic: mk({ color: 0x17171a, roughness: 0.6 }),
    lamp: mk({ color: 0xfff7e0, emissive: 0xffeeb8, emissiveIntensity: 1.2, roughness: 0.15 }), amber: mk({ color: 0xffb347, emissive: 0xff9a1e, emissiveIntensity: 0.5, roughness: 0.3 }),
    tail: mk({ color: 0x8a0000, emissive: 0xff1010, emissiveIntensity: 0.3, roughness: 0.25 }),
    plate: mk({ map: plateTexture(cfg0.plate), roughness: 0.5 }),
    glow: new THREE.MeshBasicMaterial({ map: softBlobTexture('rgba(255,255,255,1)', 'rgba(255,255,255,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }),
  };
  if (env) for (const m of Object.values(mats)) if (m.isMeshStandardMaterial) m.envMap = env; // scene.environment ignores per-material intensity
  const add = (geo, mat, x = 0, y = 0, z = 0, cast = true, to = body) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = cast; to.add(m); return m; };
  const c = { root, body, parts, mats, T: mats.trim, add, rbox: (w, h, d, r = 0.03) => new RoundedBoxGeometry(w, h, d, 3, r), both: (fn) => { for (const s of [-1, 1]) fn(s); }, rod, RG: parts.roofGroup, spec };
  spec.build(c);

  // wheels
  const wheels = [], ws = spec.wheelR / 0.375;
  for (const [az, steer] of [[spec.axleF, true], [spec.axleR, false]]) for (const sx of [-1, 1]) {
    const pivot = new THREE.Group(); pivot.position.set(sx * spec.track, spec.wheelR, az); pivot.scale.setScalar(ws);
    const spin = makeWheel(mats, parts); pivot.add(spin); root.add(pivot); wheels.push({ pivot, spin, steer });
  }
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(spec.width * 1.95, spec.length * 1.35), new THREE.MeshBasicMaterial({ map: softBlobTexture('rgba(0,0,0,.55)', 'rgba(0,0,0,0)'), transparent: true, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2; blob.position.y = 0.04; root.add(blob);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(spec.width * 1.85, spec.length * 1.27), mats.glow); glow.rotation.x = -Math.PI / 2; glow.position.y = 0.07; glow.renderOrder = 5; root.add(glow);
  body.traverse((o) => { if (o.isMesh) o.receiveShadow = true; });

  // customisation
  let tailBase = 0.3, tailBrake = 2.6, lastPlate = cfg0.plate;
  const setMetal = (m, key) => { const [col, mt, r] = METAL[key] || METAL.chrome; m.color.setHex(col); m.metalness = mt; m.roughness = r; };
  const finish = (m, f, color) => { const p = FINISH[f] || FINISH.gloss; m.color.set(color); m.metalness = p.metalness; m.roughness = p.roughness; m.clearcoat = p.clearcoat; m.clearcoatRoughness = p.clearcoatRoughness; m.iridescence = p.iridescence; m.iridescenceIOR = 1.5; m.iridescenceThicknessRange = [180, 520]; m.envMapIntensity = p.env; m.needsUpdate = true; };
  const api = {
    root, parts, spec,
    apply(cfg) {
      finish(mats.paint, cfg.finish, cfg.paint); finish(mats.roofPaint, cfg.finish, cfg.roof === 'body' ? cfg.paint : cfg.roof); finish(mats.steel, cfg.finish, cfg.paint);
      setMetal(mats.trim, cfg.trim);
      if (cfg.bumpers === 'body') finish(mats.bumper, cfg.finish, cfg.paint); else { mats.bumper.clearcoat = 0; setMetal(mats.bumper, cfg.bumpers); }
      parts.bullets.forEach((b) => (b.visible = !!cfg.bullets));
      if (cfg.rim === 'body') { mats.rim.color.set(cfg.paint); mats.rim.metalness = 0.2; mats.rim.roughness = 0.35; } else setMetal(mats.rim, cfg.rim);
      for (const [k, list] of Object.entries(parts.hubs)) list.forEach((h) => (h.visible = k === cfg.wheel));
      parts.whiteRings.forEach((r) => (r.visible = cfg.tire === 'white')); parts.redRings.forEach((r) => (r.visible = cfg.tire === 'red'));
      const [tc, to] = TINT[cfg.tint] || TINT[1]; mats.glass.color.setHex(tc); mats.glass.opacity = to;
      const [lc, le] = HEAD[cfg.headlights] || HEAD.warm; mats.lamp.color.setHex(lc); mats.lamp.emissive.setHex(le);
      const [tcc, tce, tb] = TAIL[cfg.tail] || TAIL.red; mats.tail.color.setHex(tcc); mats.tail.emissive.setHex(tce); tailBase = 0.3 * tb; tailBrake = 2.6 * tb;
      if (cfg.underglow === 'off') mats.glow.opacity = 0; else { mats.glow.color.set(cfg.underglow); mats.glow.opacity = 0.95; }
      mats.leather.color.set(cfg.seats); mats.leatherSmooth.color.set(cfg.seats); mats.accent.color.set(cfg.seats).multiplyScalar(0.55); mats.carpet.color.set(cfg.carpet);
      mats.dash.userData.wood ||= mats.dash.map;
      if (cfg.dash === 'wood') { mats.dash.map = mats.dash.userData.wood; mats.dash.color.set(0xffffff); } else { mats.dash.map = null; mats.dash.color.set(cfg.dash === 'body' ? cfg.paint : 0x15151a); }
      mats.dash.needsUpdate = true;
      if (cfg.plate !== lastPlate) { mats.plate.map?.dispose(); mats.plate.map = plateTexture(cfg.plate || ' '); lastPlate = cfg.plate; mats.plate.needsUpdate = true; }
    },
    setCutaway(on) { parts.roofGroup.visible = !on; },
    update({ steer, spin, pitch, roll, braking }) {
      for (const w of wheels) { if (w.steer) w.pivot.rotation.y = steer; w.spin.rotation.x = spin; }
      body.rotation.x = pitch; body.rotation.z = roll;
      mats.tail.emissiveIntensity = braking ? tailBrake : tailBase;
    },
    dispose() { root.traverse((o) => { if (o.isMesh) o.geometry.dispose(); }); },
  };
  api.apply({ ...DEFAULT_CAR, ...cfg0 });
  return api;
}
