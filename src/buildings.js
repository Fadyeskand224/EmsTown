import * as THREE from 'three';
import {
  clapboardTexture, stoneTexture, shingleTexture, plankTexture, cobbleTexture, awningTexture, signTexture, softBlobTexture, rng, corrugatedTexture, rollupTexture,
} from './textures.js';

const std = (o) => new THREE.MeshStandardMaterial(o);
const tiled = (tex, sx, sy) => { const t = tex.clone(); t.needsUpdate = true; t.repeat.set(sx, sy); return t; };

// A box whose UVs are in metres, so textures keep their scale on every face.
function texBox(w, h, d, mat, tile = 2) {
  const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv;
  const faces = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]]; // +x -x +y -y +z -z
  faces.forEach(([fw, fh], f) => { for (let i = 0; i < 4; i++) { const k = f * 4 + i; uv.setXY(k, uv.getX(k) * fw / tile, uv.getY(k) * fh / tile); } });
  const m = new THREE.Mesh(g, mat); m.castShadow = m.receiveShadow = true; return m;
}
const put = (parent, obj, x, y, z, ry = 0) => { obj.position.set(x, y, z); obj.rotation.y = ry; parent.add(obj); return obj; };
const solid = (parent, w, h, d, mat, x, y, z, ry = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.castShadow = m.receiveShadow = true; return put(parent, m, x, y, z, ry); };

// Gabled roof along the x axis. Returns a group with the two slopes and the two gable infills.
function gableRoof(w, d, rise, overhang, roofMat, gableMat, y0) {
  const g = new THREE.Group(), half = d / 2 + overhang, len = Math.hypot(half, rise), ang = Math.atan2(rise, half);
  for (const s of [-1, 1]) {
    const slope = new THREE.Mesh(new THREE.BoxGeometry(w + overhang * 2, 0.16, len), roofMat);
    slope.castShadow = slope.receiveShadow = true;
    slope.position.set(0, y0 + rise / 2 + 0.06, s * half / 2); slope.rotation.x = s * ang; g.add(slope);
  }
  const ridge = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, w + overhang * 2 + 0.1, 8), roofMat); ridge.rotation.z = Math.PI / 2; ridge.position.set(0, y0 + rise + 0.13, 0); ridge.castShadow = true; g.add(ridge);
  const tri = new THREE.Shape(); tri.moveTo(-d / 2, 0); tri.lineTo(d / 2, 0); tri.lineTo(0, rise); tri.closePath();
  for (const s of [-1, 1]) {
    const geo = new THREE.ExtrudeGeometry(tri, { depth: 0.2, bevelEnabled: false }), uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 2, uv.getY(i) / 2);
    const m = new THREE.Mesh(geo, gableMat); m.castShadow = m.receiveShadow = true; m.rotation.y = Math.PI / 2; m.position.set(s * (w / 2 - 0.1) , y0, 0); g.add(m);
  }
  return g;
}

function windowUnit({ w = 1.1, h = 1.5, arch = false, glowMat, frameMat, flowerBox = false }) {
  const g = new THREE.Group();
  if (arch) {
    const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, h - w / 2); s.absarc(0, h - w / 2, w / 2, 0, Math.PI, false); s.lineTo(-w / 2, 0);
    const pane = new THREE.Mesh(new THREE.ShapeGeometry(s), glowMat); pane.position.set(0, 0, 0.02); g.add(pane);
    const outer = new THREE.Shape(), r = w / 2 + 0.14; outer.moveTo(-r, -0.14); outer.lineTo(r, -0.14); outer.lineTo(r, h - w / 2); outer.absarc(0, h - w / 2, r, 0, Math.PI, false); outer.lineTo(-r, -0.14);
    outer.holes.push(new THREE.Path(s.getPoints(24)));
    const frame = new THREE.Mesh(new THREE.ExtrudeGeometry(outer, { depth: 0.1, bevelEnabled: false }), frameMat); frame.castShadow = true; g.add(frame);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.05, h - w / 2, 0.05), frameMat); bar.position.set(0, (h - w / 2) / 2, 0.05); g.add(bar);
    const bar2 = new THREE.Mesh(new THREE.BoxGeometry(w, 0.05, 0.05), frameMat); bar2.position.set(0, h * 0.45, 0.05); g.add(bar2);
  } else {
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), glowMat); pane.position.set(0, h / 2, 0.03); g.add(pane);
    for (const [bw, bh, bx, by] of [[w + 0.2, 0.1, 0, h + 0.05], [w + 0.2, 0.1, 0, -0.05], [0.1, h, -w / 2 - 0.05, h / 2], [0.1, h, w / 2 + 0.05, h / 2], [0.04, h, 0, h / 2], [w, 0.04, 0, h / 2]]) solid(g, bw, bh, 0.1, frameMat, bx, by, 0.05);
    solid(g, w + 0.45, 0.07, 0.3, frameMat, 0, -0.14, 0.12); // sill
  }
  if (flowerBox) {
    solid(g, w + 0.1, 0.22, 0.26, std({ color: 0x6d4a2d, roughness: 0.9 }), 0, -0.3, 0.22);
    const r = rng(5);
    for (let i = 0; i < 12; i++) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.07 + r() * 0.05, 8, 6), std({ color: [0xff5a7a, 0xffd23f, 0xf8f8ff, 0xff9a3c][i % 4], roughness: 0.7 })); f.position.set(-w / 2 + (i / 11) * w, -0.12 + r() * 0.1, 0.22 + (r() - 0.5) * 0.1); g.add(f); }
    for (let i = 0; i < 7; i++) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), std({ color: 0x3f7a2a, roughness: 0.9 })); l.position.set(-w / 2 + (i / 6) * w, -0.15, 0.2); l.scale.y = 0.6; g.add(l); }
  }
  return g;
}

function lantern(glowMat) {
  const g = new THREE.Group(), iron = std({ color: 0x1b1b1d, metalness: 0.7, roughness: 0.5 });
  solid(g, 0.05, 1.3, 0.05, iron, 0, 0.65, 0);
  solid(g, 0.2, 0.05, 0.2, iron, 0, 1.3, 0);
  const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.2, 0.14), glowMat); bulb.position.y = 1.43; g.add(bulb);
  const top = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.1, 4), iron); top.position.y = 1.58; top.rotation.y = Math.PI / 4; g.add(top);
  return g;
}

function chimney(stone, h = 2.6) {
  const g = new THREE.Group();
  solid(g, 0.9, h, 0.9, stone, 0, h / 2, 0);
  solid(g, 1.1, 0.18, 1.1, stone, 0, h + 0.09, 0);
  return g;
}

export function createSmoke(scene) {
  const tex = softBlobTexture('rgba(235,235,235,.5)', 'rgba(235,235,235,0)'), puffs = [];
  return {
    add(x, y, z) { // returns an updater
      const arr = Array.from({ length: 14 }, (_, i) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0 })); scene.add(s); return { s, t: i / 14 }; });
      puffs.push({ arr, x, y, z });
    },
    update(dt, time) { for (const p of puffs) for (const q of p.arr) { q.t = (q.t + dt * 0.12) % 1; q.s.position.set(p.x + Math.sin(time * 0.5 + q.t * 6) * q.t * 1.5 + q.t * 1.8, p.y + q.t * 9, p.z + Math.cos(q.t * 5) * 0.5); q.s.scale.setScalar(1 + q.t * 5); q.s.material.opacity = Math.sin(q.t * Math.PI) * 0.45; } },
  };
}

function propBarrel(parent, x, z) {
  const b = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.36, 0.9, 16), std({ map: plankTexture([110, 76, 46]), roughness: 0.9 }));
  b.castShadow = b.receiveShadow = true; put(parent, b, x, 0.45, z);
  for (const y of [0.2, 0.7]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.02, 6, 20), std({ color: 0x222222, metalness: 0.8, roughness: 0.5 })); ring.rotation.x = Math.PI / 2; put(parent, ring, x, y, z); }
}

function picnicTable(parent, x, z, ry, umbrellaColor) {
  const g = new THREE.Group(), wood = std({ map: plankTexture([150, 110, 70]), roughness: 0.85 });
  solid(g, 1.9, 0.07, 0.9, wood, 0, 0.78, 0);
  for (const s of [-1, 1]) { solid(g, 1.9, 0.06, 0.28, wood, 0, 0.46, s * 0.62); solid(g, 0.08, 0.78, 0.08, wood, s * 0.8, 0.39, 0.3); solid(g, 0.08, 0.78, 0.08, wood, s * 0.8, 0.39, -0.3); }
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.3, 8), std({ color: 0xddd2bd })); pole.position.y = 1.15; g.add(pole);
  const canopy = new THREE.Mesh(new THREE.ConeGeometry(1.3, 0.5, 12, 1, true), std({ color: umbrellaColor, roughness: 0.9, side: THREE.DoubleSide })); canopy.position.y = 2.3; canopy.castShadow = true; g.add(canopy);
  put(parent, g, x, 0, z, ry);
}

// The Ems Garage: a workshop with roll-up doors, a vintage pump, tyre stacks and a neon sign.
function createGarage(stop) {
  const root = new THREE.Group(), colliders = [];
  root.position.set(stop.x, 0, stop.z); root.rotation.y = stop.facing;
  const W = 15, D = 10, H = 4.6, fz = D / 2, blue = 0x2a78c8;
  const glow = std({ color: 0xcfe9ff, emissive: 0x7fc4ff, emissiveIntensity: 0.6, roughness: 0.3 });
  const dark = std({ color: 0x23272d, roughness: 0.6, metalness: 0.4 }), steel = std({ color: 0xb9c0c7, roughness: 0.4, metalness: 0.8 });
  const wallMat = std({ map: corrugatedTexture('#dfe5e8'), roughness: 0.75, metalness: 0.2 });
  const brick = std({ map: stoneTexture([158, 84, 62]), roughness: 0.95 });
  const roofMat = std({ map: corrugatedTexture('#6d7a84', true), roughness: 0.6, metalness: 0.4 });
  solid(root, W + 0.8, 0.4, D + 0.8, std({ color: 0x8c8b86, roughness: 1 }), 0, 0.2, 0);
  const body = texBox(W, H, D, wallMat, 2.4); body.position.set(0, 0.4 + H / 2, 0); root.add(body);
  const base = texBox(W + 0.06, 1.1, D + 0.06, brick, 2.2); base.position.set(0, 0.4 + 0.55, 0); root.add(base);
  root.add(gableRoof(W, D, 1.7, 0.6, roofMat, wallMat, 0.4 + H));
  solid(root, W + 1.4, 0.2, 0.2, dark, 0, 0.4 + H + 0.05, fz + 0.6); // fascia
  // two roll-up doors + a side office door and window
  for (const x of [-3.9, 0.9]) {
    solid(root, 3.9, 3.5, 0.16, dark, x, 0.4 + 1.75, fz + 0.04);
    const slab = new THREE.Mesh(new THREE.BoxGeometry(3.5, 3.2, 0.12), std({ map: tiled(rollupTexture('#e6e0d0'), 1, 1), roughness: 0.6, metalness: 0.2 })); slab.castShadow = true; put(root, slab, x, 0.4 + 1.65, fz + 0.12);
    solid(root, 3.5, 0.08, 0.2, blue ? std({ color: blue, roughness: 0.5 }) : dark, x, 0.4 + 3.32, fz + 0.14);
    for (const k of [-1, 1]) { const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), glow); put(root, lamp, x + k * 1.9, 0.4 + 3.7, fz + 0.4); solid(root, 0.05, 0.05, 0.35, dark, x + k * 1.9, 0.4 + 3.7, fz + 0.22); }
  }
  put(root, windowUnit({ w: 1.3, h: 1.4, glowMat: glow, frameMat: dark }), 5.5, 1.5, fz + 0.02);
  solid(root, 1.1, 2.2, 0.12, std({ map: plankTexture([60, 90, 120]), roughness: 0.6 }), 5.5, 0.4 + 1.1, fz + 0.06);
  // sign board over the doors + a blade sign
  const sign = std({ map: signTexture('Ems Garage', '🔧', '#1c3b66', '#fff6d8'), roughness: 0.6 });
  const board = new THREE.Mesh(new THREE.BoxGeometry(6.2, 1.9, 0.18), sign); board.castShadow = true; put(root, board, -1.5, 0.4 + H - 0.4, fz + 0.55);
  const neon = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.04, 8, 28), std({ color: 0x66ccff, emissive: 0x33aaff, emissiveIntensity: 1.8 })); put(root, neon, 5.5, 3.6, fz + 0.15);
  // props: vintage pump, tyre stacks, drums, tool chest, cones, floodlights
  { const p = new THREE.Group(); const red = std({ color: 0xb3261e, roughness: 0.4, metalness: 0.3 });
    solid(p, 0.7, 0.2, 0.7, std({ color: 0x80807c, roughness: 1 }), 0, 0.1, 0); solid(p, 0.5, 1.5, 0.45, red, 0, 0.95, 0);
    const glass = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), std({ color: 0xf6f0d0, emissive: 0xffe9a0, emissiveIntensity: 0.4, roughness: 0.2, transparent: true, opacity: 0.85 })); glass.position.y = 1.95; p.add(glass);
    solid(p, 0.52, 0.12, 0.5, std({ color: 0xf2eee2, roughness: 0.6 }), 0, 1.62, 0); const hose = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.025, 6, 16, Math.PI * 1.4), dark); hose.position.set(0.3, 0.9, 0); hose.rotation.y = Math.PI / 2; p.add(hose);
    put(root, p, 8.9, 0, fz + 3.2, -0.3); colliders.push({ cx: 8.9, cz: fz + 3.2, hw: 0.5, hd: 0.5 }); }
  for (const [tx, tz, n] of [[-8.6, fz + 1.0, 5], [-9.7, fz + 1.2, 4]]) for (let i = 0; i < n; i++) { const t = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.17, 12, 28), std({ color: 0x131315, roughness: 0.9 })); t.rotation.x = Math.PI / 2; t.castShadow = true; put(root, t, tx + (i % 2) * 0.03, 0.2 + i * 0.34, tz); }
  for (const [dx, dz, col] of [[-7.3, fz + 1.0, 0x2a68b8], [-6.6, fz + 1.5, 0xb83a2a]]) { const d = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.0, 18), std({ color: col, roughness: 0.5, metalness: 0.4 })); d.castShadow = true; put(root, d, dx, 0.5, dz); for (const y of [0.25, 0.75]) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.02, 6, 20), dark); r.rotation.x = Math.PI / 2; put(root, r, dx, y, dz); } }
  { const chest = new THREE.Group(); solid(chest, 1.1, 1.0, 0.55, std({ color: 0xc1352a, roughness: 0.45, metalness: 0.5 }), 0, 0.5, 0);
    for (let i = 0; i < 4; i++) solid(chest, 0.9, 0.012, 0.02, dark, 0, 0.18 + i * 0.2, 0.28), solid(chest, 0.25, 0.03, 0.03, steel, 0, 0.26 + i * 0.2, 0.3); put(root, chest, 3.0, 0, fz + 1.3, 0.1); }
  for (const [cx, cz] of [[-1.0, fz + 3.2], [1.8, fz + 3.6]]) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.6, 14), std({ color: 0xff7a1a, roughness: 0.6 })); c.castShadow = true; put(root, c, cx, 0.3, cz); solid(root, 0.5, 0.04, 0.5, std({ color: 0x222 }), cx, 0.02, cz); }
  for (const lx of [-7.6, 7.6]) { const arm = rod2(root, lx, 0.4 + H - 0.2, fz + 0.1, lx, 0.4 + H + 0.2, fz + 0.9, dark); const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.3), glow); put(root, lamp, lx, 0.4 + H + 0.2, fz + 1.0); void arm; }
  colliders.push({ cx: 0, cz: 0, hw: W / 2 + 0.6, hd: D / 2 + 0.6 }, { cx: -9.1, cz: fz + 1.1, hw: 1.0, hd: 0.7 }, { cx: -7.0, cz: fz + 1.2, hw: 1.0, hd: 0.8 }, { cx: 3.0, cz: fz + 1.3, hw: 0.7, hd: 0.5 });
  const cs = Math.cos(stop.facing), sn = Math.sin(stop.facing);
  return { root, colliders: colliders.map((c) => ({ x: stop.x + c.cx * cs + c.cz * sn, z: stop.z - c.cx * sn + c.cz * cs, hw: c.hw, hd: c.hd, rot: stop.facing })) };
}
function rod2(parent, x1, y1, z1, x2, y2, z2, mat) {
  const a = new THREE.Vector3(x1, y1, z1), b = new THREE.Vector3(x2, y2, z2), d = b.clone().sub(a), len = d.length(), g = new THREE.CylinderGeometry(0.04, 0.04, len, 6);
  g.translate(0, len / 2, 0); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())); g.translate(a.x, a.y, a.z);
  const m = new THREE.Mesh(g, mat); parent.add(m); return m;
}

export function createStopBuilding(stop, accentColor, anim) {
  if (stop.id === 'garage') return createGarage(stop);
  const root = new THREE.Group(), colliders = []; // colliders are oriented boxes in world coordinates
  root.position.set(stop.x, 0, stop.z); root.rotation.y = stop.facing;
  const isMeals = stop.id === 'meals';

  const glow = std({ color: 0xffe2a8, emissive: 0xffb45a, emissiveIntensity: 0.45, roughness: 0.3 });
  const frameWhite = std({ color: 0xf1ece0, roughness: 0.6 }), frameDark = std({ color: 0x2c211b, roughness: 0.7 });
  const wallTex = isMeals ? clapboardTexture('#efe3c8') : stoneTexture([158, 146, 126]);
  const wallMat = std({ map: wallTex, roughness: 0.9 });
  const roofMat = std({ map: shingleTexture(isMeals ? [168, 78, 52] : [78, 86, 98]), roughness: 0.8 });
  const stoneMat = std({ map: stoneTexture([120, 112, 100]), roughness: 0.95 });
  const woodMat = std({ map: plankTexture(), roughness: 0.85 });

  const W = isMeals ? 12 : 11, D = isMeals ? 8.4 : 8, H = isMeals ? 4.1 : 4.2, rise = isMeals ? 2.7 : 3.4;
  // foundation + floor porch
  solid(root, W + 0.6, 0.5, D + 0.6, stoneMat, 0, 0.25, 0);
  const body = texBox(W, H, D, wallMat, isMeals ? 2.6 : 3); body.position.set(0, 0.5 + H / 2, 0); root.add(body);
  root.add(gableRoof(W, D, rise, 0.7, roofMat, wallMat, 0.5 + H));
  // corner posts
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) solid(root, 0.3, H, 0.3, isMeals ? frameWhite : stoneMat, sx * W / 2, 0.5 + H / 2, sz * D / 2);

  const fz = D / 2; // front face z
  // door
  const doorX = 0;
  solid(root, 1.6, 2.5, 0.14, frameDark, doorX, 0.5 + 1.25, fz + 0.05);
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.25, 2.3, 0.1), std({ map: plankTexture([112, 60, 44]), roughness: 0.7 })); door.position.set(doorX, 0.5 + 1.17, fz + 0.12); door.castShadow = true; root.add(door);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), std({ color: 0xd9b45c, metalness: 1, roughness: 0.25 })); knob.position.set(doorX + 0.45, 1.6, fz + 0.2); root.add(knob);
  const doorLight = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.5), glow); doorLight.position.set(doorX, 0.5 + 1.75, fz + 0.18); root.add(doorLight);
  for (let i = 0; i < 3; i++) solid(root, 2.4 - i * 0.2, 0.18, 0.7, stoneMat, doorX, 0.09 + i * 0.18, fz + 0.9 - i * 0.2); // steps

  // windows on the front
  const wy = 0.5 + 1.0;
  for (const x of [-4, -2.4, 2.4, 4]) {
    if (isMeals && Math.abs(x) < 3) continue;
    const win = windowUnit({ w: 1.2, h: 1.7, arch: !isMeals, glowMat: glow, frameMat: isMeals ? frameWhite : frameDark, flowerBox: isMeals && Math.abs(x) > 3 });
    put(root, win, x * (isMeals ? 1.15 : 1.0), wy, fz + 0.02);
  }
  if (isMeals) for (const x of [-2.4, 2.4]) put(root, windowUnit({ w: 1.6, h: 1.5, glowMat: glow, frameMat: frameWhite }), x, wy + 0.2, fz + 0.02);
  // side windows
  for (const sx of [-1, 1]) for (const z of [-1.8, 1.8]) {
    const win = windowUnit({ w: 1.0, h: 1.5, arch: !isMeals, glowMat: glow, frameMat: isMeals ? frameWhite : frameDark }); put(root, win, sx * (W / 2 + 0.02), wy, z, sx * Math.PI / 2);
  }
  // upstairs dormer window glow
  const dormer = windowUnit({ w: 0.9, h: 1.0, arch: !isMeals, glowMat: glow, frameMat: isMeals ? frameWhite : frameDark });
  put(root, dormer, 0, 0.5 + H + 0.35, fz + 0.05);

  // lanterns by the door
  for (const sx of [-1, 1]) put(root, lantern(glow), sx * 1.5, 0.5, fz + 0.45);

  // chimney
  const ch = chimney(stoneMat); put(root, ch, W / 2 - 1.8, 0.5 + H + rise * 0.35, -D / 4);
  const chWorld = new THREE.Vector3(W / 2 - 1.8, 0.5 + H + rise * 0.35 + 2.8, -D / 4).applyAxisAngle(new THREE.Vector3(0, 1, 0), stop.facing).add(new THREE.Vector3(stop.x, 0, stop.z));
  anim.smoke.add(chWorld.x, chWorld.y, chWorld.z);

  // signage: board above the door + a free standing hanging sign
  const signMat = std({ map: signTexture(stop.name, stop.emoji, isMeals ? '#7a4a2a' : '#3b3a46', '#fff3d6'), roughness: 0.7 });
  const board = new THREE.Mesh(new THREE.BoxGeometry(4.0, 1.25, 0.14), signMat); board.castShadow = true; put(root, board, 0, 0.5 + H - (isMeals ? 0.7 : 0.75), fz + 0.1);

  if (isMeals) {
    // striped awning over the door + the front windows
    const awn = new THREE.Mesh(new THREE.BoxGeometry(11, 0.07, 2.4), std({ map: tiled(awningTexture('#d9482e', '#f6efe0'), 5, 1), roughness: 0.85 }));
    awn.castShadow = true; put(root, awn, 0, 0.5 + 2.6, fz + 1.5); awn.rotation.x = 0.28;
    const frill = new THREE.Mesh(new THREE.BoxGeometry(11, 0.28, 0.05), std({ map: tiled(awningTexture('#d9482e', '#f6efe0'), 5, 1), roughness: 0.85 })); put(root, frill, 0, 0.5 + 2.2, fz + 2.5);
    for (const sx of [-1, 1]) solid(root, 0.1, 2.5, 0.1, frameWhite, sx * 5.3, 0.5 + 1.25, fz + 2.45);
    // terrace: tables, barrels, planters, string lights
    picnicTable(root, -4.4, fz + 5.5, 0.15, 0xd9482e); picnicTable(root, 4.6, fz + 5.2, -0.2, 0xf0b43c); picnicTable(root, -8.4, fz + 3.5, 0.5, 0x4f9a6a);
    propBarrel(root, -6.4, fz + 1.2); propBarrel(root, 6.2, fz + 1.0); propBarrel(root, 6.9, fz + 1.7);
    // kitchen garden beside the building
    const dirt = std({ color: 0x4b3a29, roughness: 1 }), r = rng(77);
    for (let b = 0; b < 3; b++) {
      solid(root, 5, 0.25, 1.1, dirt, 9.5, 0.12, -2 + b * 1.8, Math.PI / 2 * 0).rotation.y = 0;
      for (let i = 0; i < 9; i++) { const plant = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22 + r() * 0.08, 1), std({ color: [0x4c9a3a, 0x7ab648, 0xb53a2f][b], roughness: 0.8 })); plant.position.set(7.5 + i * 0.5, 0.45, -2 + b * 1.8); plant.scale.y = 0.8; plant.castShadow = true; root.add(plant); }
    }
    // little chalkboard
    solid(root, 0.9, 1.1, 0.08, std({ color: 0x1d2a26, roughness: 0.9 }), 3.2, 0.95, fz + 2.2);
    solid(root, 0.06, 0.5, 0.06, frameDark, 3.2, 0.25, fz + 2.2);
    colliders.push({ cx: 0, cz: 0, hw: W / 2 + 0.6, hd: D / 2 + 0.6 }, { cx: 9.5, cz: -0.2, hw: 3, hd: 2.7 });
    for (const [tx, tz] of [[-4.4, fz + 5.5], [4.6, fz + 5.2], [-8.4, fz + 3.5]]) colliders.push({ cx: tx, cz: tz, hw: 1.0, hd: 0.8 });
  } else {
    // round stone tower with a slate cone
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.35, H + 4, 24), std({ map: tiled(stoneTexture([158, 146, 126]), 4, 2), roughness: 0.92 }));
    tower.castShadow = tower.receiveShadow = true; put(root, tower, -W / 2 - 0.4, 0.5 + (H + 4) / 2, -1.2);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(2.9, 3.8, 24), std({ map: tiled(shingleTexture([78, 86, 98]), 3, 2), roughness: 0.8 })); cone.castShadow = true; put(root, cone, -W / 2 - 0.4, 0.5 + H + 4 + 1.9, -1.2);
    const finial = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), std({ color: 0xd9b45c, metalness: 1, roughness: 0.25 })); put(root, finial, -W / 2 - 0.4, 0.5 + H + 4 + 3.9, -1.2);
    for (const a of [0.5, 1.3, -0.3]) { // arched slits on the tower
      const win = windowUnit({ w: 0.6, h: 1.3, arch: true, glowMat: glow, frameMat: frameDark }); const ang = a + Math.PI / 2, rr = 2.27;
      put(root, win, -W / 2 - 0.4 + Math.cos(ang) * rr, 0.5 + H * (a > 1 ? 0.35 : a > 0 ? 1.0 : 1.5), -1.2 + Math.sin(ang) * rr, -ang + Math.PI / 2);
    }
    // stacks of books, bench, hedges, book-cart
    const r = rng(91), cols = [0x7a2e2e, 0x2e4a7a, 0x3d6a3a, 0xb08a3a, 0x5a3a6a];
    for (let s = 0; s < 3; s++) { let y = 0.5; for (let i = 0; i < 6; i++) { const w = 0.5 + r() * 0.2, h = 0.07 + r() * 0.05; solid(root, w, h, 0.36, std({ color: cols[(r() * 5) | 0], roughness: 0.7 }), 3.2 + s * 1.4 + (r() - 0.5) * 0.06, 0.4 + y - 0.5 + h / 2 - 0.5 + 0.5, fz + 3 + (r() - 0.5) * 0.1, (r() - 0.5) * 0.3); y += h; } }
    const bench = new THREE.Group(); solid(bench, 1.7, 0.07, 0.5, woodMat, 0, 0.5, 0); solid(bench, 1.7, 0.45, 0.06, woodMat, 0, 0.8, -0.25); solid(bench, 0.07, 0.5, 0.4, frameDark, -0.75, 0.25, 0); solid(bench, 0.07, 0.5, 0.4, frameDark, 0.75, 0.25, 0); put(root, bench, -3.2, 0, fz + 3.1, 0.2);
    for (const hx of [-7.4, 7.2]) { for (const k of [-0.9, 0.9]) { const hedge = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 2), std({ color: 0x2f5d2a, roughness: 1 })); hedge.scale.set(1.1, 0.85, 0.8); hedge.castShadow = true; put(root, hedge, hx + k, 0.7, fz + 0.3); } }
    // lamp-lit reading garden: round stone planter with lavender
    const pl = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.1, 0.5, 20), stoneMat); pl.castShadow = pl.receiveShadow = true; put(root, pl, 6.6, 0.25, fz + 3.8);
    for (let i = 0; i < 26; i++) { const a = r() * 6.28, d = r() * 0.8; const f = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.5, 5), std({ color: i % 3 ? 0x8a6ac8 : 0x5a9a4a, roughness: 0.9 })); f.position.set(6.6 + Math.cos(a) * d, 0.7, fz + 3.8 + Math.sin(a) * d); root.add(f); }
    colliders.push({ cx: 0, cz: 0, hw: W / 2 + 0.6, hd: D / 2 + 0.6 }, { cx: -W / 2 - 0.4, cz: -1.2, hw: 2.6, hd: 2.6 }, { cx: 6.6, cz: fz + 3.8, hw: 1.2, hd: 1.2 });
  }
  // convert local collider boxes to world oriented boxes
  const cs = Math.cos(stop.facing), sn = Math.sin(stop.facing);
  const world = colliders.map((c) => ({ x: stop.x + c.cx * cs + c.cz * sn, z: stop.z - c.cx * sn + c.cz * cs, hw: c.hw, hd: c.hd, rot: stop.facing }));
  return { root, colliders: world };
}

// Parking pad in front of a stop: cobbles, a painted ring and a pulsing beacon.
export function createParkingPad(stop, accent) {
  const g = new THREE.Group(); g.position.set(stop.park.x, 0, stop.park.z);
  const pad = new THREE.Mesh(new THREE.CircleGeometry(9.5, 48), new THREE.MeshStandardMaterial({ map: tiled(cobbleTexture(), 7, 7), roughness: 0.95 }));
  pad.rotation.x = -Math.PI / 2; pad.position.y = 0.05; pad.receiveShadow = true; g.add(pad);
  const edge = new THREE.Mesh(new THREE.RingGeometry(9.5, 10.1, 48), new THREE.MeshStandardMaterial({ color: 0x8c8473, roughness: 1 }));
  edge.rotation.x = -Math.PI / 2; edge.position.y = 0.055; g.add(edge);
  const ringMat = new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.8, depthWrite: false });
  const ring = new THREE.Mesh(new THREE.RingGeometry(4.5, 5.0, 64), ringMat); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.09; g.add(ring);
  const beamMat = new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 4.6, 14, 40, 1, true), beamMat); beam.position.y = 7; g.add(beam);
  return { group: g, update(t) { ringMat.opacity = 0.55 + Math.sin(t * 2.4) * 0.25; beamMat.opacity = 0.12 + Math.sin(t * 2.4) * 0.05; } };
}
