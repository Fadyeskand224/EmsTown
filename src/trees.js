import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { rng, barkTexture, leafTexture, needleTexture } from './textures.js';

const UP = new THREE.Vector3(0, 1, 0), FWD = new THREE.Vector3(0, 0, 1);

function trunkGeometry(h, rBot, rTop, seed, bend) {
  const g = new THREE.CylinderGeometry(rTop, rBot, h, 10, 12, true);
  g.translate(0, h / 2, 0);
  const p = g.attributes.position, uv = g.attributes.uv, r = rng(seed), ph = r() * 6;
  for (let i = 0; i < p.count; i++) {
    const t = p.getY(i) / h, flare = 1 + Math.max(0, 0.14 - t) * 5;
    p.setX(i, p.getX(i) * flare + Math.sin(t * 3 + ph) * bend * t * t);
    p.setZ(i, p.getZ(i) * flare + Math.cos(t * 2.3 + ph) * bend * t * t);
    uv.setXY(i, uv.getX(i) * 3, uv.getY(i) * h * 0.5);
  }
  g.computeVertexNormals();
  return g;
}

function branchGeometry(from, to, r0, r1) {
  const dir = new THREE.Vector3().subVectors(to, from), len = dir.length();
  const g = new THREE.CylinderGeometry(r1, r0, len, 6, 1, true);
  g.translate(0, len / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, dir.normalize()));
  g.translate(from.x, from.y, from.z);
  return g;
}

function cardGeometry(w, h, matrix, normal, shade) {
  const g = new THREE.PlaneGeometry(w, h);
  g.applyMatrix4(matrix);
  const n = g.attributes.position.count, nrm = [], col = [];
  for (let i = 0; i < n; i++) { nrm.push(normal.x, normal.y, normal.z); col.push(shade, shade, shade); }
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return g;
}

function broadleaf({ seed, trunkH, rBot, crownY, R, Hc, cards, size, bend = 0.5 }) {
  const r = rng(seed), trunkParts = [trunkGeometry(trunkH, rBot, rBot * 0.45, seed, bend)], leafParts = [];
  const center = new THREE.Vector3(0, crownY, 0);
  // main limbs reaching into the crown
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + r(), from = new THREE.Vector3(0, trunkH * (0.55 + r() * 0.3), 0);
    const to = new THREE.Vector3(Math.cos(a) * R * 0.7, crownY + (r() - 0.3) * Hc * 0.8, Math.sin(a) * R * 0.7);
    trunkParts.push(branchGeometry(from, to, rBot * 0.32, 0.05));
  }
  for (let i = 0; i < cards; i++) {
    const z = r() * 2 - 1, phi = r() * Math.PI * 2, s = Math.sqrt(1 - z * z);
    const d = new THREE.Vector3(Math.cos(phi) * s, z, Math.sin(phi) * s), k = 0.45 + 0.55 * Math.cbrt(r());
    const pos = new THREE.Vector3(center.x + d.x * R * k, center.y + d.y * Hc * k, center.z + d.z * R * k);
    const look = d.clone().add(new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).multiplyScalar(1.4)).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(FWD, look).premultiply(new THREE.Quaternion().setFromAxisAngle(look, r() * Math.PI * 2));
    const sz = size * (0.8 + r() * 0.5), m = new THREE.Matrix4().compose(pos, q, new THREE.Vector3(1, 1, 1));
    const normal = pos.clone().sub(center).multiply(new THREE.Vector3(1 / R, 1 / Hc, 1 / R)).normalize().add(new THREE.Vector3(0, 0.25, 0)).normalize();
    const shade = Math.min(1, (0.5 + 0.5 * ((pos.y - (crownY - Hc)) / (2 * Hc))) * (0.7 + 0.3 * k) * (0.85 + r() * 0.3));
    leafParts.push(cardGeometry(sz, sz, m, normal, shade));
  }
  return { trunk: mergeGeometries(trunkParts), leaves: mergeGeometries(leafParts) };
}

function pine({ seed, h, R, tiers = 9 }) {
  const r = rng(seed), trunk = trunkGeometry(h * 0.97, 0.42, 0.06, seed, 0.25), leafParts = [];
  for (let i = 0; i < tiers; i++) {
    const t = i / (tiers - 1), y = h * 0.16 + t * h * 0.8, reach = R * (0.28 + 0.72 * (1 - t)), n = 13 - Math.floor(t * 6);
    for (let k = 0; k < n; k++) {
      const phi = (k / n) * Math.PI * 2 + r() * 0.5 + i, droop = 0.35 + r() * 0.3 + t * 0.15, len = reach * (0.9 + r() * 0.25) + 0.5, w = 1.5 + (1 - t) * 1.1;
      const dir = new THREE.Vector3(Math.cos(phi) * Math.cos(droop), -Math.sin(droop), Math.sin(phi) * Math.cos(droop));
      const right = new THREE.Vector3(-Math.sin(phi), 0, Math.cos(phi)), X = right.clone().negate(), Y = dir.clone().negate(), Z = new THREE.Vector3().crossVectors(X, Y);
      const m = new THREE.Matrix4().makeBasis(X, Y, Z).setPosition(0, y + r() * 0.5, 0);
      const g = new THREE.PlaneGeometry(w, len); g.translate(0, -len / 2, 0);
      const normal = Z.clone().add(new THREE.Vector3(dir.x, 0, dir.z).multiplyScalar(0.6)).normalize();
      const shade = Math.min(1, 0.55 + 0.45 * t + r() * 0.15);
      g.applyMatrix4(m);
      const cnt = g.attributes.position.count, nrm = [], col = [];
      for (let q = 0; q < cnt; q++) { nrm.push(normal.x, normal.y, normal.z); col.push(shade, shade, shade); }
      g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      leafParts.push(g);
    }
  }
  return { trunk, leaves: mergeGeometries(leafParts) };
}

function leafMaterial(map) {
  const m = new THREE.MeshStandardMaterial({ map, vertexColors: true, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.82, metalness: 0, emissive: 0x0b1706 });
  // our normals are baked outward from the crown, so don't flip them on back faces
  m.onBeforeCompile = (s) => { s.fragmentShader = s.fragmentShader.replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\n normal = normalize( vNormal );'); };
  return m;
}

export function createTreeKit() {
  const barkOak = new THREE.MeshStandardMaterial({ map: barkTexture(), roughness: 0.95 });
  const barkBirch = new THREE.MeshStandardMaterial({ map: barkTexture(0, 0, true), roughness: 0.85 });
  const barkPine = new THREE.MeshStandardMaterial({ map: barkTexture(0x5a3a26, 0x8a5e40), roughness: 0.95 });
  const barkBlossom = new THREE.MeshStandardMaterial({ map: barkTexture(0x3a2c26, 0x62483c), roughness: 0.9 });
  const defs = {
    oak: { geo: broadleaf({ seed: 1, trunkH: 6.5, rBot: 0.58, crownY: 9.2, R: 5.4, Hc: 3.9, cards: 270, size: 2.2 }), bark: barkOak, map: leafTexture([[100, 45, 28], [95, 50, 34], [110, 40, 24], [85, 55, 38]]), r: 0.7, scale: [0.85, 1.25] },
    oak2: { geo: broadleaf({ seed: 7, trunkH: 5.2, rBot: 0.5, crownY: 8, R: 4.6, Hc: 3.4, cards: 240, size: 2.1, bend: 0.9 }), bark: barkOak, map: leafTexture([[105, 50, 32], [90, 55, 38], [120, 40, 26]]), r: 0.6, scale: [0.85, 1.25] },
    birch: { geo: broadleaf({ seed: 2, trunkH: 8.5, rBot: 0.26, crownY: 10.6, R: 2.7, Hc: 4.3, cards: 190, size: 1.7, bend: 0.8 }), bark: barkBirch, map: leafTexture([[85, 55, 42], [75, 60, 48], [95, 50, 38]]), r: 0.3, scale: [0.85, 1.2] },
    autumn: { geo: broadleaf({ seed: 3, trunkH: 4.8, rBot: 0.42, crownY: 7.3, R: 4.2, Hc: 3.2, cards: 230, size: 2.0 }), bark: barkOak, map: leafTexture([[28, 80, 45], [18, 75, 40], [42, 85, 50], [8, 70, 38]]), r: 0.5, scale: [0.9, 1.2] },
    blossom: { geo: broadleaf({ seed: 4, trunkH: 3.2, rBot: 0.3, crownY: 5.3, R: 3.2, Hc: 2.4, cards: 200, size: 1.7, bend: 0.9 }), bark: barkBlossom, map: leafTexture([[330, 60, 82], [340, 55, 75], [105, 40, 40], [335, 45, 88]], { blossom: true }), r: 0.4, scale: [0.9, 1.2] },
    pine: { geo: pine({ seed: 5, h: 13, R: 3.6 }), bark: barkPine, map: needleTexture(), r: 0.5, scale: [0.8, 1.35] },
  };
  for (const d of Object.values(defs)) { d.leafMat = leafMaterial(d.map); d.depthMat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: d.map, alphaTest: 0.5 }); }
  return defs;
}

// placements: [{ kind, x, y, z, s, ry, tint }]; returns colliders [{x,z,r}]
export function plantTrees(scene, kit, placements) {
  const by = {}; placements.forEach((p) => (by[p.kind] ||= []).push(p));
  const colliders = [], m = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color();
  for (const [kind, list] of Object.entries(by)) {
    const d = kit[kind], trunk = new THREE.InstancedMesh(d.geo.trunk, d.bark, list.length), leaves = new THREE.InstancedMesh(d.geo.leaves, d.leafMat, list.length);
    leaves.customDepthMaterial = d.depthMat;
    list.forEach((p, i) => {
      q.setFromAxisAngle(UP, p.ry); m.compose(new THREE.Vector3(p.x, p.y, p.z), q, new THREE.Vector3(p.s, p.s * (0.92 + (p.ry % 1) * 0.16), p.s));
      trunk.setMatrixAt(i, m); leaves.setMatrixAt(i, m);
      const t = p.tint ?? 0.5; leaves.setColorAt(i, c.setRGB(0.88 + 0.22 * t, 0.93 + 0.12 * t, 0.88 + 0.12 * (1 - t)));
      colliders.push({ x: p.x, z: p.z, r: d.r * p.s });
    });
    for (const mesh of [trunk, leaves]) { mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false; scene.add(mesh); }
  }
  return colliders;
}
