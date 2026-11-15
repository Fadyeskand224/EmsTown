import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { plateTexture, softBlobTexture, leatherTexture, carpetTexture, fabricTexture, woodTexture, gaugeTexture } from './textures.js';
import { DEFAULT_CAR } from './customize.js';

// A 1950s-style two-tone sedan: extrusions, lathes and rods. Length runs along +z (front), width along x (+x = the car's left).
// Everything the garage can change is reachable through apply(cfg).
const WHEEL_R = 0.375, AXLE_F = 1.5, AXLE_R = -1.5, TRACK = 0.77, UP = new THREE.Vector3(0, 1, 0);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const at = (m, p, r) => { m.position.copy(p); m.rotation.copy(r); return m; };
const poly2 = (pts) => pts.map(([z, y]) => new THREE.Vector2(z, y));

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

// ---------- wheels ----------
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
    // 1) chrome hubcap: dome with ribs and a red emblem
    { const h = new THREE.Group();
      h.add(at(new THREE.Mesh(new THREE.TorusGeometry(0.228, 0.011, 8, 56), mats.rim), new THREE.Vector3(0.118, 0, 0), new THREE.Euler(0, Math.PI / 2, 0)));
      const dome = new THREE.Mesh(new THREE.LatheGeometry([[0, 0.178], [0.03, 0.176], [0.06, 0.168], [0.1, 0.152], [0.15, 0.135], [0.2, 0.124], [0.226, 0.118]].map(([r, y]) => new THREE.Vector2(r, y)), 40), mats.rim); dome.rotation.z = -Math.PI / 2; dome.castShadow = true; h.add(dome);
      const emb = new THREE.Mesh(new THREE.CircleGeometry(0.035, 20), mats.redEmblem); emb.position.x = 0.18; emb.rotation.y = Math.PI / 2; h.add(emb);
      const ribs = []; for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2, b = new THREE.BoxGeometry(0.012, 0.012, 0.1); b.rotateX(-a); b.translate(0.15, Math.sin(a) * 0.12, Math.cos(a) * 0.12); ribs.push(b); }
      h.add(new THREE.Mesh(mergeGeometries(ribs), mats.darkChrome)); variants.dome = h; }
    // 2) wire wheel: laced spokes, rim lip and a knock-off spinner
    { const h = new THREE.Group(), sp = [];
      for (let i = 0; i < 40; i++) { const a = (i / 40) * Math.PI * 2, b = a + (i % 2 ? 0.42 : -0.42), ax = i % 2 ? 0.07 : 0.1;
        sp.push(rodGeo(V(ax, Math.sin(a) * 0.045, Math.cos(a) * 0.045), V(0.105, Math.sin(b) * 0.222, Math.cos(b) * 0.222), 0.0045, 4)); }
      h.add(new THREE.Mesh(mergeGeometries(sp), mats.rim));
      h.add(at(new THREE.Mesh(new THREE.TorusGeometry(0.225, 0.02, 10, 56), mats.rim), new THREE.Vector3(0.108, 0, 0), new THREE.Euler(0, Math.PI / 2, 0)));
      const back = new THREE.Mesh(new THREE.CircleGeometry(0.222, 40), mats.dark); back.position.x = 0.085; back.rotation.y = Math.PI / 2; h.add(back);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.045, 24), mats.rim); hub.rotation.z = Math.PI / 2; hub.position.x = 0.115; h.add(hub);
      const spin = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.025, 3), mats.rim); spin.rotation.z = Math.PI / 2; spin.position.x = 0.145; h.add(spin); variants.wire = h; }
    // 3) five-spoke mag
    { const h = new THREE.Group(), st = new THREE.Shape(), N = 5;
      for (let k = 0; k < N; k++) { const a = (k / N) * Math.PI * 2, pts = [[0.07, a - 0.55], [0.208, a - 0.19], [0.208, a + 0.19], [0.07, a + 0.55]]; pts.forEach(([r, t], i) => { const x = Math.cos(t) * r, y = Math.sin(t) * r; if (!k && !i) st.moveTo(x, y); else st.lineTo(x, y); }); }
      st.closePath();
      const geo = new THREE.ExtrudeGeometry(st, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.01, bevelSegments: 2 }); geo.rotateY(Math.PI / 2);
      const face = new THREE.Mesh(geo, mats.rim); face.position.x = 0.085; face.castShadow = true; h.add(face);
      h.add(at(new THREE.Mesh(new THREE.TorusGeometry(0.225, 0.016, 8, 56), mats.rim), new THREE.Vector3(0.112, 0, 0), new THREE.Euler(0, Math.PI / 2, 0)));
      const back = new THREE.Mesh(new THREE.CircleGeometry(0.222, 40), mats.dark); back.position.x = 0.083; back.rotation.y = Math.PI / 2; h.add(back);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.03, 24), mats.rim); cap.rotation.z = Math.PI / 2; cap.position.x = 0.135; h.add(cap);
      for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 + 0.3, lug = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.02, 6), mats.darkChrome); lug.rotation.z = Math.PI / 2; lug.position.set(0.138, Math.sin(a) * 0.038, Math.cos(a) * 0.038); h.add(lug); }
      variants.mag = h; }
    // 4) painted steel disc with a chrome trim ring and dog-dish cap
    { const h = new THREE.Group();
      const disc = new THREE.Mesh(new THREE.LatheGeometry([[0, 0.14], [0.06, 0.138], [0.12, 0.128], [0.18, 0.112], [0.226, 0.105]].map(([r, y]) => new THREE.Vector2(r, y)), 40), mats.steel); disc.rotation.z = -Math.PI / 2; h.add(disc);
      h.add(at(new THREE.Mesh(new THREE.TorusGeometry(0.232, 0.014, 8, 56), mats.rim), new THREE.Vector3(0.112, 0, 0), new THREE.Euler(0, Math.PI / 2, 0)));
      const dish = new THREE.Mesh(new THREE.SphereGeometry(0.075, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), mats.rim); dish.rotation.z = -Math.PI / 2; dish.position.x = 0.135; dish.scale.set(0.5, 1, 1); h.add(dish);
      const slots = []; for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2, b = new THREE.BoxGeometry(0.01, 0.01, 0.05); b.rotateX(-a); b.translate(0.125, Math.sin(a) * 0.15, Math.cos(a) * 0.15); slots.push(b); }
      h.add(new THREE.Mesh(mergeGeometries(slots), mats.dark)); variants.steel = h; }
    for (const [k, h] of Object.entries(variants)) { side.add(h); (parts.hubs[k] ||= []).push(h); }
  }
  return g;
}

export function createCar(cfg0 = DEFAULT_CAR, env = null) {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const parts = { hubs: {}, whiteRings: [], redRings: [], bullets: [], roofGroup: new THREE.Group() };
  const mk = (p) => new THREE.MeshStandardMaterial(p), mkp = (p) => new THREE.MeshPhysicalMaterial(p);
  const mats = {
    paint: mkp({ color: 0xa30d20 }), roofPaint: mkp({ color: 0xeadfc4 }), steel: mkp({ color: 0xa30d20 }),
    trim: mk({ color: 0xf2f3f5, metalness: 1, roughness: 0.1 }), bumper: mk({ color: 0xf2f3f5, metalness: 1, roughness: 0.1 }), rim: mk({ color: 0xf2f3f5, metalness: 1, roughness: 0.1 }),
    darkChrome: mk({ color: 0x777b82, metalness: 1, roughness: 0.3 }), dark: mk({ color: 0x0e0e10, roughness: 0.7, metalness: 0.3 }),
    rubber: mk({ color: 0x151517, roughness: 0.92 }), white: mk({ color: 0xf2eee2, roughness: 0.7 }), redline: mk({ color: 0xc0182c, roughness: 0.6 }),
    redEmblem: mk({ color: 0xc0182c, roughness: 0.4, metalness: 0.5 }),
    glass: mkp({ color: 0x9fb9c4, metalness: 0, roughness: 0.04, transparent: true, opacity: 0.22, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false }),
    leather: mk({ map: leatherTexture(true), color: 0xd9ccaa, roughness: 0.5 }), leatherSmooth: mk({ map: leatherTexture(false), color: 0xd9ccaa, roughness: 0.55 }),
    accent: mk({ color: 0x7a6a4a, roughness: 0.55 }), carpet: mk({ map: carpetTexture(), color: 0x3a2a24, roughness: 1 }), fabric: mk({ map: fabricTexture(), roughness: 0.95 }),
    dash: mk({ map: woodTexture(), color: 0xffffff, roughness: 0.35 }), gauges: mk({ map: gaugeTexture(), roughness: 0.3 }), plastic: mk({ color: 0x17171a, roughness: 0.6 }),
    lamp: mk({ color: 0xfff7e0, emissive: 0xffeeb8, emissiveIntensity: 1.2, roughness: 0.15 }), amber: mk({ color: 0xffb347, emissive: 0xff9a1e, emissiveIntensity: 0.5, roughness: 0.3 }),
    tail: mk({ color: 0x8a0000, emissive: 0xff1010, emissiveIntensity: 0.3, roughness: 0.25 }),
    plate: mk({ map: plateTexture(cfg0.plate), roughness: 0.5 }),
    glow: new THREE.MeshBasicMaterial({ map: softBlobTexture('rgba(255,255,255,1)', 'rgba(255,255,255,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }),
  };
  const T = mats.trim;
  if (env) for (const m of Object.values(mats)) if (m.isMeshStandardMaterial) m.envMap = env; // scene.environment ignores per-material intensity
  const add = (geo, mat, x = 0, y = 0, z = 0, cast = true, to = body) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = cast; to.add(m); return m; };
  const rbox = (w, h, d, r = 0.03) => new RoundedBoxGeometry(w, h, d, 3, r);
  const both = (fn) => { for (const s of [-1, 1]) fn(s); };

  // ---------- main body: front block + rear block + floor, with an open cabin well ----------
  const y0 = 0.36, ar = 0.5, shape = new THREE.Shape();
  shape.moveTo(-2.38, y0);
  shape.lineTo(AXLE_R - ar, y0); shape.absarc(AXLE_R, y0, ar, Math.PI, 0, true);
  shape.lineTo(AXLE_F - ar, y0); shape.absarc(AXLE_F, y0, ar, Math.PI, 0, true);
  shape.lineTo(2.36, y0);
  shape.lineTo(2.4, 0.64); shape.quadraticCurveTo(2.43, 0.93, 2.28, 0.99);
  shape.lineTo(1.3, 1.07); shape.lineTo(0.62, 1.1);
  shape.lineTo(0.62, 0.62); shape.lineTo(-1.02, 0.62); shape.lineTo(-1.02, 1.12);
  shape.lineTo(-1.8, 1.12); shape.quadraticCurveTo(-2.3, 1.12, -2.4, 0.9);
  shape.lineTo(-2.42, 0.6); shape.lineTo(-2.38, y0);
  add(extrudeProfile(shape, 1.66, 0.09), mats.paint);
  const door = new THREE.Shape(); door.moveTo(-1.0, 0.45); door.lineTo(0.6, 0.45); door.lineTo(0.6, 1.12); door.lineTo(-1.0, 1.12); door.lineTo(-1.0, 0.45);
  both((s) => add(extrudeProfile(door, 0.07, 0.025, 3), mats.paint, s * 0.885, 0, 0));
  add(new THREE.BoxGeometry(1.44, 0.34, 4.5), mats.dark, 0, 0.42, 0, false);

  // ---------- cabin top (hidden in the garage's cutaway view): roof, headliner, visors ----------
  body.add(parts.roofGroup); const RG = parts.roofGroup;
  const roofShape = new THREE.Shape(); roofShape.moveTo(-0.8, -0.95); roofShape.lineTo(0.8, -0.95); roofShape.quadraticCurveTo(0.85, 0.4, 0.78, 0.46); roofShape.lineTo(-0.78, 0.46); roofShape.quadraticCurveTo(-0.85, 0.4, -0.8, -0.95);
  const roofGeo = new THREE.ExtrudeGeometry(roofShape, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.045, bevelSegments: 3, curveSegments: 12 });
  roofGeo.rotateX(Math.PI / 2); roofGeo.computeVertexNormals();
  add(roofGeo, mats.roofPaint, 0, 1.69, 0, true, RG);
  const head = new THREE.PlaneGeometry(1.52, 1.34); head.rotateX(Math.PI / 2); add(head, mats.fabric, 0, 1.628, -0.25, false, RG);
  add(new THREE.SphereGeometry(0.05, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mats.white || mats.fabric, 0, 1.628, -0.3, false, RG).rotation.x = Math.PI;
  both((s) => { const v = add(rbox(0.48, 0.022, 0.2, 0.008), mats.fabric, s * 0.4, 1.58, 0.38, false, RG); v.rotation.x = -0.12; add(rod(V(s * 0.62, 1.6, 0.42), V(s * 0.62, 1.6, 0.34), 0.008, mats.darkChrome, 5).geometry, mats.darkChrome, 0, 0, 0, false, RG); });

  // ---------- pillars, glass, exterior trim, lamps ----------
  both((s) => {
    body.add(rod(V(s * 0.79, 1.1, 0.64), V(s * 0.79, 1.64, 0.44), 0.038, mats.roofPaint)); body.add(rod(V(s * 0.79, 1.12, -1.0), V(s * 0.79, 1.64, -0.86), 0.038, mats.roofPaint));
    body.add(rod(V(s * 0.79, 1.1, -0.11), V(s * 0.79, 1.64, -0.11), 0.045, mats.roofPaint));
    const wins = [[[0.56, 1.15], [0.4, 1.6], [-0.06, 1.6], [-0.06, 1.15]], [[-0.16, 1.15], [-0.16, 1.6], [-0.83, 1.6], [-0.99, 1.15]]];
    for (const w of wins) {
      const g = new THREE.ShapeGeometry(new THREE.Shape(poly2(w))); g.rotateY(-Math.PI / 2); g.translate(s * 0.795, 0, 0); body.add(new THREE.Mesh(g, mats.glass));
      for (let i = 0; i < w.length; i++) { const p = w[i], q = w[(i + 1) % w.length]; body.add(rod(V(s * 0.8, p[1], p[0]), V(s * 0.8, q[1], q[0]), 0.012, T, 6)); }
    }
    body.add(rod(V(s * 0.805, 1.15, 0.3), V(s * 0.805, 1.58, 0.36), 0.01, T, 6));
    add(new THREE.BoxGeometry(0.03, 0.03, 0.2), T, s * 0.925, 1.0, 0.28, false); add(new THREE.BoxGeometry(0.03, 0.03, 0.2), T, s * 0.925, 1.0, -0.38, false);
    for (const z of [0.6, -0.11, -1.02]) add(new THREE.BoxGeometry(0.012, 0.66, 0.012), mats.dark, s * 0.93, 0.78, z, false);
    add(new THREE.BoxGeometry(0.01, 0.035, 4.3), T, s * 0.935, 0.8, 0, false);
    body.add(rod(V(s * 0.9, 1.1, 0.6), V(s * 1.07, 1.24, 0.66), 0.012, T, 6));
    const mir = add(new THREE.CylinderGeometry(0.075, 0.075, 0.025, 20), T, s * 1.1, 1.26, 0.68, false); mir.rotation.z = Math.PI / 2; mir.rotation.y = 0.3 * s;
    for (const az of [AXLE_F, AXLE_R]) { const t = new THREE.Mesh(new THREE.TorusGeometry(ar + 0.07, 0.014, 8, 36, Math.PI), T); t.rotation.y = Math.PI / 2; t.position.set(s * 0.93, y0, az); body.add(t); }
    add(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 16), T, s * 0.93, 1.0, -1.7, false).rotation.z = Math.PI / 2;
    const fin = new THREE.Shape(); fin.moveTo(-1.65, 1.1); fin.lineTo(-2.1, 1.3); fin.lineTo(-2.45, 1.5); fin.lineTo(-2.47, 1.1); fin.lineTo(-1.65, 1.1);
    add(extrudeProfile(fin, 0.07, 0.02, 3), mats.paint, s * 0.88, 0, 0);
    add(new THREE.CapsuleGeometry(0.045, 0.16, 6, 12), mats.tail, s * 0.88, 1.27, -2.46, false);
    add(new THREE.TorusGeometry(0.06, 0.012, 8, 16), T, s * 0.88, 1.27, -2.45, false).scale.set(0.9, 2.1, 1);
    add(new THREE.CylinderGeometry(0.075, 0.075, 0.03, 16), mats.tail, s * 0.62, 0.88, -2.43, false).rotation.x = Math.PI / 2;
    add(new THREE.TorusGeometry(0.085, 0.014, 8, 20), T, s * 0.62, 0.88, -2.43, false);
    add(new THREE.TorusGeometry(0.15, 0.024, 10, 32), T, s * 0.66, 0.84, 2.38, false);
    const dome = add(new THREE.SphereGeometry(0.135, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2), mats.lamp, s * 0.66, 0.84, 2.36, false); dome.rotation.x = Math.PI / 2; dome.scale.set(1, 0.55, 1);
    add(new THREE.CylinderGeometry(0.065, 0.075, 0.03, 14), T, s * 0.66, 0.84, 2.36, false).rotation.x = Math.PI / 2;
    const park = add(new THREE.SphereGeometry(0.06, 12, 10), mats.amber, s * 0.95, 0.66, 2.34, false); park.scale.set(0.8, 1, 1.4);
    parts.bullets.push(add(new THREE.SphereGeometry(0.07, 14, 10), mats.bumper, s * 0.5, 0.56, 2.5), add(new THREE.SphereGeometry(0.07, 14, 10), mats.bumper, s * 0.5, 0.56, -2.52));
    body.add(rod(V(s * 0.1, 1.16, 0.6), V(s * 0.62, 1.4, 0.52), 0.008, mats.dark, 5));
  });
  const slopePlane = (a, b, w, outward) => {
    const dz = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dz, dy), nz = outward * dy / len, ny = -outward * dz / len;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, len), mats.glass); m.position.set(0, (a[1] + b[1]) / 2, (a[0] + b[0]) / 2); m.rotation.x = -Math.atan2(ny, nz); body.add(m);
    const pts = [V(-w / 2, a[1], a[0]), V(w / 2, a[1], a[0]), V(w / 2, b[1], b[0]), V(-w / 2, b[1], b[0])];
    for (let i = 0; i < 4; i++) body.add(rod(pts[i], pts[(i + 1) % 4], 0.014, T, 6));
  };
  slopePlane([0.62, 1.12], [0.44, 1.64], 1.56, 1); slopePlane([-1.02, 1.13], [-0.86, 1.64], 1.5, -1);
  add(new THREE.BoxGeometry(0.2, 0.06, 0.03), mats.dark, 0, 1.55, 0.45, false, RG); body.add(rod(V(0, 1.62, 0.43), V(0, 1.56, 0.46), 0.008, T, 5)); // rear-view mirror

  // ---------- interior ----------
  add(new THREE.BoxGeometry(1.5, 0.03, 1.64), mats.dark, 0, 0.7, -0.2, false);
  add(rbox(1.46, 0.03, 1.6, 0.012), mats.carpet, 0, 0.72, -0.2, false);                                // carpet
  add(rbox(0.3, 0.09, 1.3, 0.04), mats.carpet, 0, 0.77, -0.15, false);                                 // transmission tunnel
  for (const [z, bz, bh, by] of [[0.02, -0.3, 0.52, 1.12], [-0.66, -0.94, 0.58, 1.15]]) {             // front + rear bench
    add(rbox(1.38, 0.12, 0.46, 0.03), mats.plastic, 0, 0.78, z, false);
    add(rbox(1.42, 0.17, 0.5, 0.07), mats.leather, 0, 0.88, z, false);
    const back = add(rbox(1.42, bh, 0.15, 0.07), mats.leather, 0, by, bz, false); back.rotation.x = -0.16;
    for (const sx of [-1, 1]) add(rbox(0.06, 0.2, 0.52, 0.025), mats.accent, sx * 0.72, 0.9, z, false);  // side bolsters / piping
    add(rbox(1.3, 0.025, 0.04, 0.01), mats.accent, 0, 0.975, z + 0.23, false);
  }
  add(rbox(0.46, 0.1, 0.2, 0.04), mats.leather, 0, 1.03, -0.84, false).rotation.x = -0.1;               // folded rear armrest
  both((s) => {                                                                                       // door cards
    add(rbox(0.045, 0.44, 1.4, 0.02), mats.leatherSmooth, s * 0.815, 0.84, -0.2, false);
    add(rbox(0.03, 0.2, 1.1, 0.015), mats.accent, s * 0.795, 0.9, -0.2, false);
    add(rbox(0.1, 0.06, 0.55, 0.025), mats.leatherSmooth, s * 0.77, 1.03, -0.22, false);              // armrest
    add(rbox(0.04, 0.022, 0.14, 0.008), T, s * 0.79, 0.98, 0.2, false);                              // door pull
    body.add(rod(V(s * 0.8, 0.86, 0.06), V(s * 0.72, 0.86, 0.06), 0.008, T, 6)); add(new THREE.SphereGeometry(0.02, 10, 8), mats.white || mats.fabric, s * 0.71, 0.86, 0.06, false); // window crank
    add(new THREE.CylinderGeometry(0.006, 0.006, 0.06, 6), T, s * 0.8, 1.08, 0.32, false);            // lock pin
  });
  // dashboard: pad, cluster, radio, glovebox, heater knobs, defrost vents
  add(rbox(1.68, 0.2, 0.32, 0.05), mats.dash, 0, 1.0, 0.47, false);
  add(rbox(1.7, 0.035, 0.34, 0.015), mats.plastic, 0, 1.11, 0.47, false);
  const clu = add(rbox(0.48, 0.17, 0.04, 0.015), T, 0.38, 1.02, 0.325, false); clu.rotation.x = -0.25;
  const gp = new THREE.Mesh(new THREE.PlaneGeometry(0.43, 0.115), mats.gauges); gp.position.set(0.38, 1.02, 0.3); gp.rotation.set(-0.25, Math.PI, 0); body.add(gp);
  add(rbox(0.3, 0.12, 0.03, 0.01), T, -0.02, 0.93, 0.31, false);                                    // radio
  add(new THREE.PlaneGeometry(0.17, 0.045), mats.gauges, -0.02, 0.945, 0.292, false).rotation.y = Math.PI;
  for (const kx of [-0.125, 0.085]) add(new THREE.CylinderGeometry(0.02, 0.02, 0.03, 12), mats.dark, kx, 0.93, 0.29, false).rotation.x = Math.PI / 2;
  add(rbox(0.46, 0.15, 0.02, 0.01), mats.plastic, -0.5, 0.95, 0.31, false); add(new THREE.BoxGeometry(0.07, 0.02, 0.02), T, -0.5, 0.99, 0.296, false); // glovebox
  for (let i = 0; i < 4; i++) add(new THREE.CylinderGeometry(0.014, 0.014, 0.03, 10), T, 0.22 + i * 0.07, 0.88, 0.31, false).rotation.x = Math.PI / 2; // heater knobs
  for (const vx of [-0.3, 0.3]) add(new THREE.BoxGeometry(0.3, 0.008, 0.05), mats.dark, vx, 1.118, 0.52, false); // defrost slots
  // steering wheel
  const sw = new THREE.Group(); sw.position.set(0.38, 1.06, 0.12); body.add(sw);
  sw.add(new THREE.Mesh(new THREE.TorusGeometry(0.205, 0.019, 10, 40), mats.plastic));
  sw.add(new THREE.Mesh(new THREE.TorusGeometry(0.125, 0.007, 6, 28, Math.PI * 1.5), T));
  add(new THREE.CylinderGeometry(0.04, 0.045, 0.04, 16), T, 0, 0, 0, false, sw).rotation.x = Math.PI / 2;
  for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2 + Math.PI / 2; sw.add(rod(V(0, 0, 0), V(Math.cos(a) * 0.2, Math.sin(a) * 0.2, 0), 0.007, T, 5)); }
  sw.lookAt(V(0.38, 1.06 + 0.5, 0.12 - 0.85));
  body.add(rod(V(0.38, 0.93, 0.36), V(0.38, 1.02, 0.18), 0.022, mats.darkChrome, 8));
  body.add(rod(V(0.4, 0.95, 0.33), V(0.54, 0.9, 0.29), 0.007, T, 5)); add(new THREE.SphereGeometry(0.02, 10, 8), mats.plastic, 0.545, 0.9, 0.29, false); // column shifter
  for (const px of [0.26, 0.44]) { add(new THREE.BoxGeometry(0.06, 0.012, 0.13), mats.darkChrome, px, 0.8, 0.5, false).rotation.x = 0.55; add(new THREE.BoxGeometry(0.06, 0.014, 0.1), mats.rubber, px, 0.81, 0.5, false).rotation.x = 0.55; } // pedals

  // ---------- bumpers, grille, ornaments ----------
  const bump = (z, dir) => {
    const pts = [V(-1.0, 0.54, z - dir * 0.12), V(-0.86, 0.54, z), V(-0.4, 0.545, z + dir * 0.07), V(0.4, 0.545, z + dir * 0.07), V(0.86, 0.54, z), V(1.0, 0.54, z - dir * 0.12)];
    const t = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.065, 12), mats.bumper); t.castShadow = true; t.scale.y = 1.25; body.add(t);
    body.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => p.clone().setY(0.4))), 40, 0.03, 8), mats.bumper));
  };
  bump(2.44, 1); bump(-2.46, -1);
  add(new THREE.BoxGeometry(1.0, 0.26, 0.04), T, 0, 0.7, 2.44, false); add(new THREE.BoxGeometry(0.94, 0.2, 0.05), mats.dark, 0, 0.7, 2.455, false);
  for (let i = 0; i < 5; i++) add(new THREE.BoxGeometry(0.96, 0.012, 0.03), T, 0, 0.62 + i * 0.04, 2.47, false);
  add(new THREE.SphereGeometry(0.075, 16, 12), T, 0, 0.7, 2.5, false).scale.set(1, 1, 1.5);
  body.add(rod(V(0, 1.075, 1.0), V(0, 1.045, 2.25), 0.014, T, 6));
  add(new THREE.ConeGeometry(0.035, 0.22, 10), T, 0, 1.09, 2.22, false).rotation.x = Math.PI / 2 + 0.15; add(new THREE.BoxGeometry(0.2, 0.012, 0.07), T, 0, 1.075, 2.2, false);
  body.add(rod(V(-0.78, 1.06, 0.95), V(-0.8, 1.9, 0.82), 0.007, T, 5));
  add(new THREE.BoxGeometry(1.2, 0.012, 0.012), mats.dark, 0, 0.98, -2.43, false); add(new THREE.BoxGeometry(0.22, 0.03, 0.03), T, 0, 1.06, -2.4, false);
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.13), mats.plate); plate.position.set(0, 0.78, -2.47); plate.rotation.y = Math.PI; body.add(plate);
  both((s) => add(new THREE.CylinderGeometry(0.05, 0.055, 0.2, 16), T, s * 0.55, 0.36, -2.42, false).rotation.x = Math.PI / 2);

  // ---------- wheels, shadow, underglow ----------
  const wheels = [];
  for (const [az, steer] of [[AXLE_F, true], [AXLE_R, false]]) for (const sx of [-1, 1]) {
    const pivot = new THREE.Group(); pivot.position.set(sx * TRACK, WHEEL_R, az); const spin = makeWheel(mats, parts); pivot.add(spin); root.add(pivot); wheels.push({ pivot, spin, steer });
  }
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 6.6), new THREE.MeshBasicMaterial({ map: softBlobTexture('rgba(0,0,0,.55)', 'rgba(0,0,0,0)'), transparent: true, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2; blob.position.y = 0.04; root.add(blob);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 6.2), mats.glow); glow.rotation.x = -Math.PI / 2; glow.position.y = 0.07; glow.renderOrder = 5; root.add(glow);
  body.traverse((o) => { if (o.isMesh) o.receiveShadow = true; });

  // ---------- customisation ----------
  let tailBase = 0.3, tailBrake = 2.6, lastPlate = cfg0.plate;
  const setMetal = (m, key) => { const [c, mt, r] = METAL[key] || METAL.chrome; m.color.setHex(c); m.metalness = mt; m.roughness = r; };
  const finish = (m, f, color) => { const p = FINISH[f] || FINISH.gloss; m.color.set(color); m.metalness = p.metalness; m.roughness = p.roughness; m.clearcoat = p.clearcoat; m.clearcoatRoughness = p.clearcoatRoughness; m.iridescence = p.iridescence; m.iridescenceIOR = 1.5; m.iridescenceThicknessRange = [180, 520]; m.envMapIntensity = p.env; m.needsUpdate = true; };
  const api = {
    root, parts,
    apply(cfg) {
      finish(mats.paint, cfg.finish, cfg.paint);
      finish(mats.roofPaint, cfg.finish, cfg.roof === 'body' ? cfg.paint : cfg.roof);
      finish(mats.steel, cfg.finish, cfg.paint);
      setMetal(T, cfg.trim);
      if (cfg.bumpers === 'body') finish(mats.bumper, cfg.finish, cfg.paint); else { mats.bumper.clearcoat = 0; setMetal(mats.bumper, cfg.bumpers); }
      parts.bullets.forEach((b) => (b.visible = !!cfg.bullets));
      if (cfg.rim === 'body') { mats.rim.color.set(cfg.paint); mats.rim.metalness = 0.2; mats.rim.roughness = 0.35; } else setMetal(mats.rim, cfg.rim);
      for (const [k, list] of Object.entries(parts.hubs)) list.forEach((h) => (h.visible = k === cfg.wheel));
      parts.whiteRings.forEach((r) => (r.visible = cfg.tire === 'white')); parts.redRings.forEach((r) => (r.visible = cfg.tire === 'red'));
      const [tc, to] = TINT[cfg.tint] || TINT[1]; mats.glass.color.setHex(tc); mats.glass.opacity = to;
      const [lc, le] = HEAD[cfg.headlights] || HEAD.warm; mats.lamp.color.setHex(lc); mats.lamp.emissive.setHex(le);
      const [tcc, tce, tb] = TAIL[cfg.tail] || TAIL.red; mats.tail.color.setHex(tcc); mats.tail.emissive.setHex(tce); tailBase = 0.3 * tb; tailBrake = 2.6 * tb;
      if (cfg.underglow === 'off') mats.glow.opacity = 0; else { mats.glow.color.set(cfg.underglow); mats.glow.opacity = 0.95; }
      mats.leather.color.set(cfg.seats); mats.leatherSmooth.color.set(cfg.seats);
      mats.accent.color.set(cfg.seats).multiplyScalar(0.55); mats.carpet.color.set(cfg.carpet);
      if (cfg.dash === 'wood') { mats.dash.map = mats.dash.userData.wood ||= mats.dash.map; mats.dash.color.set(0xffffff); } else { mats.dash.userData.wood ||= mats.dash.map; mats.dash.map = null; mats.dash.color.set(cfg.dash === 'body' ? cfg.paint : 0x15151a); }
      mats.dash.needsUpdate = true;
      if (cfg.plate !== lastPlate) { mats.plate.map?.dispose(); mats.plate.map = plateTexture(cfg.plate || ' '); lastPlate = cfg.plate; mats.plate.needsUpdate = true; }
    },
    setCutaway(on) { parts.roofGroup.visible = !on; },
    update({ steer, spin, pitch, roll, braking }) {
      for (const w of wheels) { if (w.steer) w.pivot.rotation.y = steer; w.spin.rotation.x = spin; }
      body.rotation.x = pitch; body.rotation.z = roll;
      mats.tail.emissiveIntensity = braking ? tailBrake : tailBase;
    },
  };
  api.apply({ ...DEFAULT_CAR, ...cfg0 });
  return api;
}
