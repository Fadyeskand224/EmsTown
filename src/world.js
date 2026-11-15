import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { WORLD, PLAZA, POND, STOPS } from './config.js';
import {
  rng, grassTexture, asphaltTexture, shoulderTexture, waterNormal, cloudTexture, cobbleTexture, signTexture, plankTexture, softBlobTexture,
} from './textures.js';
import { createTreeKit, plantTrees } from './trees.js';
import { createStopBuilding, createParkingPad, createSmoke } from './buildings.js';

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const fbm2 = (x, y) => vnoise(x, y) * 0.55 + vnoise(x * 2.1, y * 2.1) * 0.3 + vnoise(x * 4.3, y * 4.3) * 0.15;

export const heightAt = (x, z) => {
  const d = Math.hypot(Math.max(Math.abs(x) - (WORLD.hx + 8), 0), Math.max(Math.abs(z) - (WORLD.hz + 8), 0));
  const t = smooth(0, 150, d);
  return t * (14 + 70 * fbm2(x * 0.0055 + 7, z * 0.0055 + 3));
};

const pondRadius = (a) => POND.r * (1 + 0.16 * Math.sin(3 * a + 0.6) + 0.09 * Math.sin(5 * a + 2) + 0.05 * Math.sin(8 * a));
export const inPond = (x, z, pad = 0) => Math.hypot(x - POND.x, z - POND.z) < pondRadius(Math.atan2(z - POND.z, x - POND.x)) * 0.96 + pad;

const ROAD_W = 7.4;
function roadPaths() {
  const [m, n] = STOPS.map((s) => [s.park.x, s.park.z]);
  return [
    [[0, 0], [-30, -8], [-62, -30], [-90, -56], m],
    [[0, 0], [30, 12], [62, 26], [92, 52], n],
    [m, [-95, -105], [-50, -128], [10, -135], [70, -128], [125, -105], [170, -60], [175, 0], [160, 45], n],
    [n, [95, 100], [45, 125], [-30, 130], [-90, 105], [-135, 55], [-142, 0], [-130, -40], m],
    [[0, 0], [2, -35], [5, -70], [8, -105], [10, -135]],
    [[0, 0], [-5, 40], [-12, 80], [-20, 110], [-30, 130]],
    [[-5, 40], [-26, 50], [-46, 58], [STOPS[2].park.x, STOPS[2].park.z]],
  ];
}

function ribbon(samples, width, v0 = 8) {
  const pos = [], uv = [], idx = [];
  let dist = 0;
  samples.forEach((p, i) => {
    const a = samples[Math.max(0, i - 1)], b = samples[Math.min(samples.length - 1, i + 1)];
    const tx = b.x - a.x, tz = b.z - a.z, l = Math.hypot(tx, tz) || 1, nx = -tz / l, nz = tx / l;
    if (i) dist += Math.hypot(p.x - samples[i - 1].x, p.z - samples[i - 1].z);
    pos.push(p.x + nx * width / 2, 0, p.z + nz * width / 2, p.x - nx * width / 2, 0, p.z - nz * width / 2);
    uv.push(0, dist / v0, 1, dist / v0);
    if (i) { const k = i * 2; idx.push(k - 2, k - 1, k, k - 1, k + 1, k); }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  for (let i = 0; i < g.attributes.normal.count; i++) g.attributes.normal.setXYZ(i, 0, 1, 0);
  return g;
}

function clumpGeometry() {
  const r = rng(99), pos = [], col = [], nor = [], idx = [];
  for (let b = 0; b < 9; b++) {
    const a = r() * Math.PI * 2, ox = (r() - 0.5) * 0.35, oz = (r() - 0.5) * 0.35, h = 0.4 + r() * 0.6, w = 0.04 + r() * 0.03, bend = 0.15 + r() * 0.3;
    const dx = Math.cos(a), dz = Math.sin(a), px = -dz, pz = dx, base = pos.length / 3;
    for (let s = 0; s <= 3; s++) {
      const t = s / 3, y = h * t, ww = w * (1 - t * 0.92), off = bend * t * t * h;
      for (const sgn of [-1, 1]) {
        pos.push(ox + dx * off + px * ww * sgn, y, oz + dz * off + pz * ww * sgn);
        const c = 0.5 + t * 0.65; col.push(0.3 * c, 0.5 * c, 0.2 * c); nor.push(0, 1, 0);
      }
    }
    for (let s = 0; s < 3; s++) { const k = base + s * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setIndex(idx); return g;
}

export function createWorld(scene, renderer, camera, { touch = false } = {}) {
  const anim = { smoke: createSmoke(scene), tickers: [] };
  const r = rng(2026);
  const circles = [], boxes = [];

  // ---------- sky, light, fog ----------
  const sky = new Sky(); sky.scale.setScalar(4500);
  const su = sky.material.uniforms; su.turbidity.value = 3.2; su.rayleigh.value = 1.3; su.mieCoefficient.value = 0.0025; su.mieDirectionalG.value = 0.7;
  const elev = 46, azim = 150, sunDir = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - elev), THREE.MathUtils.degToRad(azim));
  su.sunPosition.value.copy(sunDir);
  const envScene = new THREE.Scene(); envScene.add(sky);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(envScene).texture; scene.environmentIntensity = 0.4;
  scene.add(sky);
  scene.fog = new THREE.Fog(0xbcd3e6, 160, 1150);

  const sun = new THREE.DirectionalLight(0xfff0d8, 2.7);
  sun.castShadow = true; sun.shadow.mapSize.set(touch ? 2048 : 4096, touch ? 2048 : 4096);
  const sc = sun.shadow.camera; sc.left = -62; sc.right = 62; sc.top = 62; sc.bottom = -62; sc.near = 10; sc.far = 360;
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.05; sun.shadow.radius = 3;
  scene.add(sun, sun.target);
  scene.add(new THREE.HemisphereLight(0xcfe4ff, 0x4a5a2a, 0.4));

  // ---------- terrain ----------
  const SIZE = 1900, SEG = 190;
  const tg = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG); tg.rotateX(-Math.PI / 2);
  const tp = tg.attributes.position, tc = [];
  for (let i = 0; i < tp.count; i++) {
    const x = tp.getX(i), z = tp.getZ(i), h = heightAt(x, z); tp.setY(i, h);
    const n = fbm2(x * 0.02, z * 0.02), rock = smooth(48, 80, h), k = 0.72 + n * 0.5;
    tc.push(k * (1 - rock * 0.25) + rock * 0.2, k * (1 - rock * 0.15) + rock * 0.2, k * (1 - rock * 0.35) + rock * 0.2);
  }
  tg.setAttribute('color', new THREE.Float32BufferAttribute(tc, 3)); tg.computeVertexNormals();
  const ground = new THREE.Mesh(tg, new THREE.MeshStandardMaterial({ map: grassTexture(), vertexColors: true, roughness: 1 }));
  ground.receiveShadow = true; scene.add(ground);

  // ---------- roads ----------
  const roadTex = asphaltTexture(), shoulderTex = shoulderTexture();
  const roadMat = new THREE.MeshStandardMaterial({ map: roadTex, roughness: 0.9, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const shoulderMat = new THREE.MeshStandardMaterial({ map: shoulderTex, transparent: true, side: THREE.DoubleSide, roughness: 1, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  const roadSamples = [], roadLines = [];
  roadPaths().forEach((pts, i) => {
    const curve = new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'centripetal');
    const samples = curve.getSpacedPoints(Math.max(8, Math.ceil(curve.getLength() / 1.5)));
    const nearPad = (p) => STOPS.some((s) => Math.hypot(p.x - s.park.x, p.z - s.park.z) < 9.2);
    while (samples.length > 4 && nearPad(samples[0])) samples.shift();
    while (samples.length > 4 && nearPad(samples[samples.length - 1])) samples.pop();
    roadLines.push(samples.map((p) => [p.x, p.z]));
    samples.forEach((p) => roadSamples.push(p.x, p.z));
    const sh = new THREE.Mesh(ribbon(samples, ROAD_W + 4.6, 8), shoulderMat); sh.position.y = 0.025 + i * 0.002; sh.receiveShadow = true; sh.renderOrder = 1; scene.add(sh);
    const rd = new THREE.Mesh(ribbon(samples, ROAD_W, 8), roadMat); rd.position.y = 0.04 + i * 0.004; rd.receiveShadow = true; rd.renderOrder = 2; scene.add(rd);
  });
  const RS = new Float32Array(roadSamples);
  const roadDist = (x, z) => { let d = 1e9; for (let i = 0; i < RS.length; i += 2) { const dx = RS[i] - x, dz = RS[i + 1] - z, q = dx * dx + dz * dz; if (q < d) d = q; } return Math.sqrt(d); };

  // ---------- plaza ----------
  const plaza = new THREE.Mesh(new THREE.CircleGeometry(PLAZA.r, 64), new THREE.MeshStandardMaterial({ map: (() => { const t = cobbleTexture(); t.repeat.set(7, 7); return t; })(), roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
  plaza.rotation.x = -Math.PI / 2; plaza.position.y = 0.07; plaza.receiveShadow = true; plaza.renderOrder = 3; scene.add(plaza);
  const rim = new THREE.Mesh(new THREE.RingGeometry(PLAZA.r, PLAZA.r + 0.6, 64), new THREE.MeshStandardMaterial({ color: 0x8c8473, roughness: 1 })); rim.rotation.x = -Math.PI / 2; rim.position.y = 0.075; scene.add(rim);
  const planter = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.4, 0.7, 32), new THREE.MeshStandardMaterial({ color: 0x9a9283, roughness: 0.95 })); planter.position.set(PLAZA.x, 0.35, PLAZA.z); planter.castShadow = planter.receiveShadow = true; scene.add(planter);
  const soil = new THREE.Mesh(new THREE.CircleGeometry(3.0, 32), new THREE.MeshStandardMaterial({ color: 0x3f6a2a, roughness: 1 })); soil.rotation.x = -Math.PI / 2; soil.position.set(PLAZA.x, 0.72, PLAZA.z); scene.add(soil);
  circles.push({ x: PLAZA.x, z: PLAZA.z, r: 3.5 });
  // signpost pointing at each stop
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 4.6, 10), new THREE.MeshStandardMaterial({ map: plankTexture([90, 62, 38]), roughness: 0.9 })); post.position.set(PLAZA.x, 2.6, PLAZA.z); post.castShadow = true; scene.add(post);
  STOPS.forEach((s, i) => {
    const a = Math.atan2(s.x - PLAZA.x, s.z - PLAZA.z), mat = new THREE.MeshStandardMaterial({ map: signTexture(s.name, s.emoji, i ? '#3b3a46' : '#7a4a2a'), roughness: 0.7 });
    const plank = new THREE.Group(), body = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.9, 0.1), mat); body.castShadow = true; body.position.x = 1.9; plank.add(body);
    const back = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 0.9), mat); back.rotation.y = Math.PI; back.position.set(1.9, 0, -0.051); plank.add(back);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.5, 3), new THREE.MeshStandardMaterial({ color: 0x5a3d24, roughness: 0.9 })); tip.rotation.z = -Math.PI / 2; tip.scale.set(1, 1, 0.2); tip.position.x = 3.95; plank.add(tip);
    plank.position.set(PLAZA.x, 4.2 - i * 1.15, PLAZA.z); plank.rotation.y = a - Math.PI / 2; scene.add(plank);
  });

  // ---------- stops ----------
  const pads = [];
  for (const s of STOPS) {
    const b = createStopBuilding(s, s.accent, anim); scene.add(b.root); boxes.push(...b.colliders);
    const pad = createParkingPad(s, new THREE.Color(s.accent)); scene.add(pad.group); pads.push(pad);
  }

  // ---------- pond ----------
  const SEGS = 96, wpos = [0, 0, 0], widx = [], spos = [], suv = [], sidx = [];
  for (let i = 0; i <= SEGS; i++) {
    const a = (i / SEGS) * Math.PI * 2, rr = pondRadius(a), c = Math.cos(a), s = Math.sin(a);
    wpos.push(c * rr * 0.97, 0, s * rr * 0.97);
    if (i) widx.push(0, i, i + 1);
    spos.push(c * rr * 0.9, 0, s * rr * 0.9, c * rr * 1.28, 0, s * rr * 1.28); suv.push(0, i / 4, 1, i / 4);
    if (i) { const k = i * 2; sidx.push(k - 2, k - 1, k, k - 1, k + 1, k); }
  }
  const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(wpos, 3)); wg.setIndex(widx);
  const wuv = []; for (let i = 0; i < wpos.length / 3; i++) wuv.push(wpos[i * 3] * 0.05, wpos[i * 3 + 2] * 0.05);
  wg.setAttribute('uv', new THREE.Float32BufferAttribute(wuv, 2)); wg.computeVertexNormals();
  const wn = waterNormal();
  const water = new THREE.Mesh(wg, new THREE.MeshStandardMaterial({ color: 0x24708c, roughness: 0.04, metalness: 0.15, normalMap: wn, normalScale: new THREE.Vector2(0.4, 0.4), side: THREE.DoubleSide, transparent: true, opacity: 0.93, envMapIntensity: 1.8 }));
  water.position.set(POND.x, 0.1, POND.z); water.receiveShadow = true; scene.add(water);
  const shoreCanvas = document.createElement('canvas'); shoreCanvas.width = 64; shoreCanvas.height = 4;
  { const x = shoreCanvas.getContext('2d'), g = x.createLinearGradient(0, 0, 64, 0); g.addColorStop(0, 'rgba(58,44,30,1)'); g.addColorStop(0.35, 'rgba(110,92,64,.95)'); g.addColorStop(0.7, 'rgba(150,132,92,.55)'); g.addColorStop(1, 'rgba(150,132,92,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 4); }
  const shoreTex = new THREE.CanvasTexture(shoreCanvas); shoreTex.colorSpace = THREE.SRGBColorSpace; shoreTex.wrapT = THREE.RepeatWrapping;
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(spos, 3)); sg.setAttribute('uv', new THREE.Float32BufferAttribute(suv, 2)); sg.setIndex(sidx); sg.computeVertexNormals();
  const shore = new THREE.Mesh(sg, new THREE.MeshStandardMaterial({ map: shoreTex, side: THREE.DoubleSide, transparent: true, roughness: 1, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
  shore.position.set(POND.x, 0.06, POND.z); shore.renderOrder = 1; scene.add(shore);
  anim.tickers.push((dt) => { wn.offset.x += dt * 0.012; wn.offset.y += dt * 0.007; });

  // ---------- helpers for placing scenery ----------
  const stopsFar = (x, z, m) => STOPS.every((s) => Math.hypot(x - s.x, z - s.z) > 17 + m && Math.hypot(x - s.park.x, z - s.park.z) > 12 + m) && Math.hypot(x - PLAZA.x, z - PLAZA.z) > PLAZA.r + 2 + m;
  const free = (x, z, m = 0) => roadDist(x, z) > ROAD_W / 2 + 2.4 + m && !inPond(x, z, 6 + m) && stopsFar(x, z, m);
  const grid = new Map(), cell = 6;
  const takeSpot = (x, z, rad) => { // keep trees from overlapping
    const cx = Math.floor(x / cell), cz = Math.floor(z / cell);
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (const o of grid.get(`${cx + i},${cz + j}`) || []) if (Math.hypot(o.x - x, o.z - z) < o.r + rad) return false;
    const k = `${cx},${cz}`; if (!grid.has(k)) grid.set(k, []); grid.get(k).push({ x, z, r: rad }); return true;
  };

  // ---------- trees ----------
  const kit = createTreeKit(), placements = [];
  const kinds = ['oak', 'oak2', 'birch', 'autumn', 'blossom', 'pine'], weights = [0.22, 0.18, 0.18, 0.08, 0.06, 0.28];
  const pick = () => { let u = r(), i = 0; while (u > weights[i] && i < weights.length - 1) { u -= weights[i]; i++; } return kinds[i]; };
  const addTree = (x, z, y = 0) => {
    const kind = pick(), d = kit[kind], s = d.scale[0] + r() * (d.scale[1] - d.scale[0]);
    if (!takeSpot(x, z, 3.2 * s)) return false;
    placements.push({ kind, x, y, z, s, ry: r() * 6.28, tint: r() }); return true;
  };
  for (let n = 0, tries = 0; n < 175 && tries < 4000; tries++) {
    const x = (r() * 2 - 1) * (WORLD.hx - 6), z = (r() * 2 - 1) * (WORLD.hz - 6);
    if (!free(x, z, 3)) continue;
    // clustered groves + scattered singles
    if (r() < 0.55 && hash(Math.floor(x / 45), Math.floor(z / 45)) < 0.45) continue;
    if (addTree(x, z)) n++;
  }
  for (let n = 0, tries = 0; n < 420 && tries < 9000; tries++) { // forested hills beyond the fence
    const x = (r() * 2 - 1) * (WORLD.hx + 170), z = (r() * 2 - 1) * (WORLD.hz + 170);
    if (Math.abs(x) < WORLD.hx + 8 && Math.abs(z) < WORLD.hz + 8) continue;
    if (addTree(x, z, heightAt(x, z) - 0.2)) n++;
  }
  circles.push(...plantTrees(scene, kit, placements).filter((c) => Math.abs(c.x) < WORLD.hx + 4 && Math.abs(c.z) < WORLD.hz + 4));

  // ---------- grass clumps + wildflowers ----------
  const grassMat = new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.95 });
  const windU = { value: 0 };
  grassMat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = windU;
    sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      float sw = sin(uTime * 1.6 + instanceMatrix[3].x * 0.33 + instanceMatrix[3].z * 0.21) + 0.5 * sin(uTime * 2.7 + instanceMatrix[3].z * 0.6);
      transformed.x += sw * 0.07 * position.y; transformed.z += sw * 0.05 * position.y;`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\n normal = normalize( vNormal );');
  };
  const GRASS = touch ? 12000 : 26000, grass = new THREE.InstancedMesh(clumpGeometry(), grassMat, GRASS), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), col = new THREE.Color();
  for (let i = 0, tries = 0; i < GRASS && tries < GRASS * 6; tries++) {
    const x = (r() * 2 - 1) * (WORLD.hx + 10), z = (r() * 2 - 1) * (WORLD.hz + 10);
    if (roadDist(x, z) < ROAD_W / 2 + 1.6 || inPond(x, z, 3) || !stopsFar(x, z, -6)) continue;
    const s = 0.8 + r() * 0.9; q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * 6.28);
    m4.compose(new THREE.Vector3(x, 0, z), q, new THREE.Vector3(s, s * (0.7 + r() * 0.8), s)); grass.setMatrixAt(i, m4);
    grass.setColorAt(i, col.setHSL(0.25 + (r() - 0.5) * 0.07, 0.5 + r() * 0.25, 0.26 + r() * 0.18)); i++;
  }
  grass.receiveShadow = true; grass.frustumCulled = false; scene.add(grass);

  const flowerCols = [0xffffff, 0xffd84a, 0xff6f91, 0xb59cff, 0xff9a3c, 0xfff0f0];
  const FL = touch ? 1200 : 3200, flowers = new THREE.InstancedMesh(new THREE.CircleGeometry(0.11, 8), new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.7, emissive: 0x111111 }), FL);
  for (let i = 0; i < FL;) {
    const pcx = (r() * 2 - 1) * WORLD.hx, pcz = (r() * 2 - 1) * WORLD.hz;
    for (let k = 0; k < 40 && i < FL; k++) {
      const x = pcx + (r() - 0.5) * 12, z = pcz + (r() - 0.5) * 12;
      if (!free(x, z, -1)) continue;
      q.setFromEuler(new THREE.Euler(-Math.PI / 2 + (r() - 0.5) * 0.7, 0, r() * 6)); m4.compose(new THREE.Vector3(x, 0.38 + r() * 0.2, z), q, new THREE.Vector3(1, 1, 1));
      flowers.setMatrixAt(i, m4); flowers.setColorAt(i, col.setHex(flowerCols[Math.floor(r() * flowerCols.length)])); i++;
    }
  }
  flowers.frustumCulled = false; scene.add(flowers);
  anim.tickers.push((dt, t) => { windU.value = t; });

  // ---------- bushes & rocks ----------
  const bushGeo = new THREE.IcosahedronGeometry(1, 3), bp = bushGeo.attributes.position;
  for (let i = 0; i < bp.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(bp, i), n = 0.78 + 0.35 * vnoise(v.x * 3 + 5, v.z * 3 + v.y * 2); bp.setXYZ(i, v.x * n, v.y * n * 0.8, v.z * n); }
  bushGeo.computeVertexNormals();
  const bushes = new THREE.InstancedMesh(bushGeo, new THREE.MeshStandardMaterial({ color: 0x3d6e2c, roughness: 1 }), 150);
  for (let i = 0, t = 0; i < 150 && t < 3000; t++) {
    const x = (r() * 2 - 1) * (WORLD.hx - 8), z = (r() * 2 - 1) * (WORLD.hz - 8);
    if (!free(x, z, 1) || !takeSpot(x, z, 1.4)) continue;
    const s = 0.7 + r() * 0.9; q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * 6);
    m4.compose(new THREE.Vector3(x, s * 0.5, z), q, new THREE.Vector3(s * 1.2, s, s * 1.2)); bushes.setMatrixAt(i, m4); bushes.setColorAt(i, col.setHSL(0.26 + (r() - 0.5) * 0.08, 0.5, 0.2 + r() * 0.18));
    circles.push({ x, z, r: s * 0.95 }); i++;
  }
  bushes.castShadow = bushes.receiveShadow = true; scene.add(bushes);

  const rockGeo = new THREE.IcosahedronGeometry(1, 3), rp = rockGeo.attributes.position;
  for (let i = 0; i < rp.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(rp, i), n = 0.7 + 0.5 * vnoise(v.x * 2.2 + 9, v.y * 2.2 + v.z * 2.2); rp.setXYZ(i, v.x * n, v.y * n * 0.75, v.z * n); }
  rockGeo.computeVertexNormals();
  const ROCKS = 90, rocks = new THREE.InstancedMesh(rockGeo, new THREE.MeshStandardMaterial({ color: 0x8b8b86, roughness: 0.95, flatShading: false }), ROCKS);
  for (let i = 0, t = 0; i < ROCKS && t < 4000; t++) {
    const nearPond = i < 28, a = r() * 6.28, rad = POND.r * (1.15 + r() * 0.35);
    const x = nearPond ? POND.x + Math.cos(a) * rad : (r() * 2 - 1) * (WORLD.hx - 6), z = nearPond ? POND.z + Math.sin(a) * rad : (r() * 2 - 1) * (WORLD.hz - 6);
    if (roadDist(x, z) < ROAD_W / 2 + 3 || !stopsFar(x, z, 0) || (inPond(x, z, 0) && !nearPond)) continue;
    const s = 0.35 + Math.pow(r(), 2) * 1.5; q.setFromEuler(new THREE.Euler(r() * 0.4, r() * 6, r() * 0.4));
    m4.compose(new THREE.Vector3(x, s * 0.25, z), q, new THREE.Vector3(s * 1.3, s, s)); rocks.setMatrixAt(i, m4); rocks.setColorAt(i, col.setHSL(0.1, 0.05, 0.38 + r() * 0.2));
    if (s > 0.6) circles.push({ x, z, r: s * 1.0 }); i++;
  }
  rocks.castShadow = rocks.receiveShadow = true; scene.add(rocks);

  // reeds + lily pads at the pond
  const reeds = new THREE.InstancedMesh(new THREE.ConeGeometry(0.04, 1.8, 4), new THREE.MeshStandardMaterial({ color: 0x8a9a4a, roughness: 0.9 }), 360);
  for (let i = 0; i < 360; i++) { const a = r() * 6.28, rr = pondRadius(a) * (0.93 + r() * 0.12); q.setFromEuler(new THREE.Euler((r() - 0.5) * 0.3, 0, (r() - 0.5) * 0.3)); m4.compose(new THREE.Vector3(POND.x + Math.cos(a) * rr, 0.8, POND.z + Math.sin(a) * rr), q, new THREE.Vector3(1, 0.6 + r() * 0.8, 1)); reeds.setMatrixAt(i, m4); reeds.setColorAt(i, col.setHSL(0.18 + r() * 0.08, 0.4, 0.3 + r() * 0.15)); }
  reeds.castShadow = true; scene.add(reeds);
  const pads2 = new THREE.InstancedMesh(new THREE.CircleGeometry(0.55, 14), new THREE.MeshStandardMaterial({ color: 0x3f7f35, roughness: 0.7, side: THREE.DoubleSide }), 34);
  for (let i = 0; i < 34; i++) { const a = r() * 6.28, rr = pondRadius(a) * r() * 0.8; q.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, r() * 6)); const s = 0.6 + r() * 0.8; m4.compose(new THREE.Vector3(POND.x + Math.cos(a) * rr, 0.12, POND.z + Math.sin(a) * rr), q, new THREE.Vector3(s, s, s)); pads2.setMatrixAt(i, m4); }
  scene.add(pads2);

  // ---------- fence ----------
  const wood = new THREE.MeshStandardMaterial({ map: plankTexture([120, 88, 56]), roughness: 0.9 });
  const fx = WORLD.hx, fz = WORLD.hz, step = 4, posts = [], rails = [];
  for (let x = -fx; x <= fx; x += step) { posts.push([x, -fz], [x, fz]); rails.push([x + step / 2, -fz, 0], [x + step / 2, fz, 0]); }
  for (let z = -fz + step; z < fz; z += step) { posts.push([-fx, z], [fx, z]); rails.push([-fx, z + step / 2, 1], [fx, z + step / 2, 1]); }
  const postM = new THREE.InstancedMesh(new THREE.BoxGeometry(0.16, 1.3, 0.16), wood, posts.length);
  posts.forEach(([x, z], i) => { m4.makeTranslation(x, 0.65, z); postM.setMatrixAt(i, m4); });
  const railM = new THREE.InstancedMesh(new THREE.BoxGeometry(step, 0.1, 0.07), wood, rails.length * 2);
  rails.forEach(([x, z, rot], i) => { for (let k = 0; k < 2; k++) { q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rot ? Math.PI / 2 : 0); m4.compose(new THREE.Vector3(x, 0.55 + k * 0.4, z), q, new THREE.Vector3(1, 1, 1)); railM.setMatrixAt(i * 2 + k, m4); } });
  for (const m of [postM, railM]) { m.castShadow = m.receiveShadow = true; m.frustumCulled = false; scene.add(m); }

  // ---------- lamp posts along the roads ----------
  const iron = new THREE.MeshStandardMaterial({ color: 0x1c1c20, metalness: 0.6, roughness: 0.5 }), lampGlow = new THREE.MeshStandardMaterial({ color: 0xfff1c8, emissive: 0xffd58a, emissiveIntensity: 1.1 });
  let lampN = 0;
  for (const line of roadLines) for (let i = 30; i < line.length - 20; i += 38) {
    const [x, z] = line[i], [x2, z2] = line[i + 1], tx = x2 - x, tz = z2 - z, l = Math.hypot(tx, tz) || 1, side = lampN++ % 2 ? 1 : -1, px = x + (-tz / l) * side * 5.2, pz = z + (tx / l) * side * 5.2;
    if (!free(px, pz, -2.5) && roadDist(px, pz) < 3.9) continue;
    if (!stopsFar(px, pz, 2)) continue;
    const lamp = new THREE.Group(), pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 4.2, 8), iron); pole.position.y = 2.1; pole.castShadow = true; lamp.add(pole);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 14, 10), lampGlow); head.position.y = 4.35; lamp.add(head);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.28, 12), iron); cap.position.y = 4.68; lamp.add(cap);
    lamp.position.set(px, 0, pz); scene.add(lamp); circles.push({ x: px, z: pz, r: 0.3 });
  }

  // ---------- clouds ----------
  const cloudTex = cloudTexture(), clouds = [];
  for (let i = 0; i < 16; i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, transparent: true, depthWrite: false, fog: false, opacity: 0.55 + r() * 0.3 }));
    const s = 260 + r() * 260; sp.scale.set(s, s * 0.5, 1); sp.position.set((r() * 2 - 1) * 900, 240 + r() * 120, (r() * 2 - 1) * 900); scene.add(sp); clouds.push(sp);
  }
  anim.tickers.push((dt) => { for (const c of clouds) { c.position.x += dt * 3; if (c.position.x > 1000) c.position.x = -1000; } });

  return {
    anim, pads, circles, boxes, roadDist, roadLines, roadWidth: ROAD_W, pondRadius,
    update(dt, t, focus) {
      for (const f of anim.tickers) f(dt, t);
      anim.smoke.update(dt, t); pads.forEach((p) => p.update(t));
      const sx = Math.round(focus.x / 4) * 4, sz = Math.round(focus.z / 4) * 4;
      sun.target.position.set(sx, 0, sz); sun.position.set(sx + sunDir.x * 160, sunDir.y * 160, sz + sunDir.z * 160); sun.target.updateMatrixWorld();
      sky.position.set(focus.x, 0, focus.z);
    },
  };
}
