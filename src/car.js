import * as THREE from 'three';
import { plateTexture, softBlobTexture } from './textures.js';

// A 1950s-style two-tone sedan, built from extrusions, lathes and rods. Length runs along +z (front), width along x.
const WHEEL_R = 0.375, AXLE_F = 1.5, AXLE_R = -1.5, TRACK = 0.77, UP = new THREE.Vector3(0, 1, 0);
const V = (x, y, z) => new THREE.Vector3(x, y, z);

function extrudeProfile(shape, depth, bevel = 0.07, segs = 4) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: segs, curveSegments: 20 });
  g.translate(0, 0, -depth / 2);
  g.rotateY(-Math.PI / 2); // profile x (length) -> +z, extrusion -> width
  g.computeVertexNormals();
  return g;
}
function rod(a, b, r, mat, seg = 8) {
  const d = new THREE.Vector3().subVectors(b, a), len = d.length(), g = new THREE.CylinderGeometry(r, r, len, seg);
  g.translate(0, len / 2, 0); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, d.normalize())); g.translate(a.x, a.y, a.z);
  const m = new THREE.Mesh(g, mat); m.castShadow = true; return m;
}
const poly2 = (pts) => pts.map(([z, y]) => new THREE.Vector2(z, y));

// ---------- wheel: whitewall tyre + chrome hubcap ----------
function makeWheel(mats) {
  const g = new THREE.Group();
  const prof = [[0.2, -0.105], [0.27, -0.118], [0.33, -0.11], [0.362, -0.075], [0.372, -0.04], [0.376, -0.025], [0.372, -0.012], [0.376, 0], [0.372, 0.012], [0.376, 0.025], [0.372, 0.04], [0.362, 0.075], [0.33, 0.11], [0.27, 0.118], [0.2, 0.105]].map(([r, y]) => new THREE.Vector2(r, y));
  const tire = new THREE.Mesh(new THREE.LatheGeometry(prof, 56), mats.rubber); tire.rotation.z = Math.PI / 2; tire.castShadow = true; g.add(tire);
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.2, 28), mats.dark); drum.rotation.z = Math.PI / 2; g.add(drum);
  for (const s of [-1, 1]) {
    const ww = new THREE.Mesh(new THREE.RingGeometry(0.235, 0.318, 56), mats.white); ww.position.x = s * 0.1195; ww.rotation.y = s * Math.PI / 2; g.add(ww); // whitewall
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.228, 0.011, 8, 56), mats.chrome); ring.position.x = s * 0.118; ring.rotation.y = Math.PI / 2; g.add(ring);
    const dome = new THREE.LatheGeometry([[0, 0.178], [0.03, 0.176], [0.06, 0.168], [0.1, 0.152], [0.15, 0.135], [0.2, 0.124], [0.226, 0.118]].map(([r, y]) => new THREE.Vector2(r, y)), 40);
    const cap = new THREE.Mesh(dome, mats.chrome); cap.rotation.z = -s * Math.PI / 2; if (s < 0) cap.scale.y = -1; cap.castShadow = true; g.add(cap);
    const emb = new THREE.Mesh(new THREE.CircleGeometry(0.035, 20), mats.redEmblem); emb.position.x = s * 0.18; emb.rotation.y = s * Math.PI / 2; g.add(emb);
    for (let i = 0; i < 12; i++) { // radial ribs on the cap
      const a = (i / 12) * Math.PI * 2, rib = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.012, 0.1), mats.darkChrome);
      rib.position.set(s * 0.15, Math.sin(a) * 0.12, Math.cos(a) * 0.12); rib.rotation.x = -a; g.add(rib);
    }
  }
  return g;
}

export function createCar(paint = 0xa30d20, env = null) {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const mats = {
    paint: new THREE.MeshPhysicalMaterial({ color: paint, metalness: 0.1, roughness: 0.42, clearcoat: 0.5, clearcoatRoughness: 0.12, envMapIntensity: 0.22 }),
    cream: new THREE.MeshPhysicalMaterial({ color: 0xeadfc4, metalness: 0.05, roughness: 0.38, clearcoat: 1, clearcoatRoughness: 0.12, envMapIntensity: 0.25 }),
    chrome: new THREE.MeshStandardMaterial({ color: 0xf2f3f5, metalness: 1, roughness: 0.1, envMapIntensity: 1.5 }),
    darkChrome: new THREE.MeshStandardMaterial({ color: 0x777b82, metalness: 1, roughness: 0.3 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x0e0e10, roughness: 0.7, metalness: 0.3 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x151517, roughness: 0.92 }),
    white: new THREE.MeshStandardMaterial({ color: 0xf2eee2, roughness: 0.7 }),
    redEmblem: new THREE.MeshStandardMaterial({ color: 0xc0182c, roughness: 0.4, metalness: 0.5 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0x9fb9c4, metalness: 0, roughness: 0.04, transparent: true, opacity: 0.22, clearcoat: 1, envMapIntensity: 1.2, side: THREE.DoubleSide, depthWrite: false }),
    leather: new THREE.MeshStandardMaterial({ color: 0xd9ccaa, roughness: 0.55 }),
    redLeather: new THREE.MeshStandardMaterial({ color: 0x6d1220, roughness: 0.55 }),
    lamp: new THREE.MeshStandardMaterial({ color: 0xfff7e0, emissive: 0xffeeb8, emissiveIntensity: 1.2, roughness: 0.15 }),
    amber: new THREE.MeshStandardMaterial({ color: 0xffb347, emissive: 0xff9a1e, emissiveIntensity: 0.5, roughness: 0.3 }),
    tail: new THREE.MeshStandardMaterial({ color: 0x8a0000, emissive: 0xff1010, emissiveIntensity: 0.3, roughness: 0.25 }),
  };
  if (env) for (const m of Object.values(mats)) m.envMap = env; // scene.environment ignores per-material intensity, so bind it explicitly
  const add = (geo, mat, x = 0, y = 0, z = 0, cast = true) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = cast; body.add(m); return m; };
  const both = (fn) => { for (const s of [-1, 1]) fn(s); };

  // ---------- main body: front block + rear block + floor, with an open cabin well ----------
  const y0 = 0.36, ar = 0.5, shape = new THREE.Shape();
  shape.moveTo(-2.38, y0);
  shape.lineTo(AXLE_R - ar, y0); shape.absarc(AXLE_R, y0, ar, Math.PI, 0, true);
  shape.lineTo(AXLE_F - ar, y0); shape.absarc(AXLE_F, y0, ar, Math.PI, 0, true);
  shape.lineTo(2.36, y0);
  shape.lineTo(2.4, 0.64); shape.quadraticCurveTo(2.43, 0.93, 2.28, 0.99);   // rounded nose
  shape.lineTo(1.3, 1.07); shape.lineTo(0.62, 1.1);                         // hood
  shape.lineTo(0.62, 0.62); shape.lineTo(-1.02, 0.62); shape.lineTo(-1.02, 1.12); // open cabin well
  shape.lineTo(-1.8, 1.12); shape.quadraticCurveTo(-2.3, 1.12, -2.4, 0.9);   // deck + rounded tail
  shape.lineTo(-2.42, 0.6); shape.lineTo(-2.38, y0);
  add(extrudeProfile(shape, 1.66, 0.09), mats.paint);

  // doors: slim slabs closing the sides of the cabin well
  const door = new THREE.Shape(); door.moveTo(-1.0, 0.45); door.lineTo(0.6, 0.45); door.lineTo(0.6, 1.12); door.lineTo(-1.0, 1.12); door.lineTo(-1.0, 0.45);
  both((s) => add(extrudeProfile(door, 0.07, 0.025, 3), mats.paint, s * 0.885, 0, 0));
  add(new THREE.BoxGeometry(1.44, 0.34, 4.5), mats.dark, 0, 0.42, 0, false); // underbody: arches don't look hollow

  // ---------- cabin: cream roof, pillars, glass, chrome frames ----------
  const roofShape = new THREE.Shape(); roofShape.moveTo(-0.8, -0.95); roofShape.lineTo(0.8, -0.95); roofShape.quadraticCurveTo(0.85, 0.4, 0.78, 0.46); roofShape.lineTo(-0.78, 0.46); roofShape.quadraticCurveTo(-0.85, 0.4, -0.8, -0.95);
  const roofGeo = new THREE.ExtrudeGeometry(roofShape, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.045, bevelSegments: 3, curveSegments: 12 });
  roofGeo.rotateX(Math.PI / 2); roofGeo.computeVertexNormals(); // shape y -> world z, thickness downwards
  add(roofGeo, mats.cream, 0, 1.69, 0);

  both((s) => {
    body.add(rod(V(s * 0.79, 1.1, 0.64), V(s * 0.79, 1.64, 0.44), 0.038, mats.cream));       // A pillar
    body.add(rod(V(s * 0.79, 1.12, -1.0), V(s * 0.79, 1.64, -0.86), 0.038, mats.cream));    // C pillar
    body.add(rod(V(s * 0.79, 1.1, -0.11), V(s * 0.79, 1.64, -0.11), 0.045, mats.cream));    // B pillar
    // side glass + chrome frames (front door, rear door)
    const wins = [[[0.56, 1.15], [0.4, 1.6], [-0.06, 1.6], [-0.06, 1.15]], [[-0.16, 1.15], [-0.16, 1.6], [-0.83, 1.6], [-0.99, 1.15]]];
    for (const w of wins) {
      const g = new THREE.ShapeGeometry(new THREE.Shape(poly2(w))); g.rotateY(-Math.PI / 2); g.translate(s * 0.795, 0, 0); body.add(new THREE.Mesh(g, mats.glass));
      for (let i = 0; i < w.length; i++) { const p = w[i], q = w[(i + 1) % w.length]; body.add(rod(V(s * 0.8, p[1], p[0]), V(s * 0.8, q[1], q[0]), 0.012, mats.chrome, 6)); }
    }
    body.add(rod(V(s * 0.805, 1.15, 0.3), V(s * 0.805, 1.58, 0.36), 0.01, mats.chrome, 6)); // vent-window divider
    // door handles, seams, chrome spear
    add(new THREE.BoxGeometry(0.03, 0.03, 0.2), mats.chrome, s * 0.925, 1.0, 0.28, false); add(new THREE.BoxGeometry(0.03, 0.03, 0.2), mats.chrome, s * 0.925, 1.0, -0.38, false);
    for (const z of [0.6, -0.11, -1.02]) add(new THREE.BoxGeometry(0.012, 0.66, 0.012), mats.dark, s * 0.93, 0.78, z, false);
    add(new THREE.BoxGeometry(0.01, 0.035, 4.3), mats.chrome, s * 0.935, 0.8, 0, false);
    // side mirror: round chrome head on a stalk
    body.add(rod(V(s * 0.9, 1.1, 0.6), V(s * 1.07, 1.24, 0.66), 0.012, mats.chrome, 6));
    const mir = add(new THREE.CylinderGeometry(0.075, 0.075, 0.025, 20), mats.chrome, s * 1.1, 1.26, 0.68, false); mir.rotation.z = Math.PI / 2; mir.rotation.y = 0.3 * s;
    // wheel-arch chrome rims
    for (const az of [AXLE_F, AXLE_R]) { const t = new THREE.Mesh(new THREE.TorusGeometry(ar + 0.07, 0.014, 8, 36, Math.PI), mats.chrome); t.rotation.y = Math.PI / 2; t.position.set(s * 0.93, y0, az); body.add(t); }
    // fuel cap, tail fins, tail lamps
    add(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 16), mats.chrome, s * 0.93, 1.0, -1.7, false).rotation.z = Math.PI / 2;
    const fin = new THREE.Shape(); fin.moveTo(-1.65, 1.1); fin.lineTo(-2.1, 1.3); fin.lineTo(-2.45, 1.5); fin.lineTo(-2.47, 1.1); fin.lineTo(-1.65, 1.1);
    add(extrudeProfile(fin, 0.07, 0.02, 3), mats.paint, s * 0.88, 0, 0);
    add(new THREE.CapsuleGeometry(0.045, 0.16, 6, 12), mats.tail, s * 0.88, 1.27, -2.46, false);
    add(new THREE.TorusGeometry(0.06, 0.012, 8, 16), mats.chrome, s * 0.88, 1.27, -2.45, false).scale.set(0.9, 2.1, 1);
    add(new THREE.CylinderGeometry(0.075, 0.075, 0.03, 16), mats.tail, s * 0.62, 0.88, -2.43, false).rotation.x = Math.PI / 2;
    add(new THREE.TorusGeometry(0.085, 0.014, 8, 20), mats.chrome, s * 0.62, 0.88, -2.43, false);
    // headlamps: chrome bezel, glass dome, reflector; amber parking lamps
    add(new THREE.TorusGeometry(0.15, 0.024, 10, 32), mats.chrome, s * 0.66, 0.84, 2.38, false);
    const dome = add(new THREE.SphereGeometry(0.135, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2), mats.lamp, s * 0.66, 0.84, 2.36, false); dome.rotation.x = Math.PI / 2; dome.scale.set(1, 0.55, 1);
    add(new THREE.CylinderGeometry(0.065, 0.075, 0.03, 14), mats.chrome, s * 0.66, 0.84, 2.36, false).rotation.x = Math.PI / 2;
    const park = add(new THREE.SphereGeometry(0.06, 12, 10), mats.amber, s * 0.95, 0.66, 2.34, false); park.scale.set(0.8, 1, 1.4);
    // bumper overriders
    add(new THREE.SphereGeometry(0.07, 14, 10), mats.chrome, s * 0.5, 0.56, 2.5); add(new THREE.SphereGeometry(0.07, 14, 10), mats.chrome, s * 0.5, 0.56, -2.52);
    // wipers
    body.add(rod(V(s * 0.1, 1.16, 0.6), V(s * 0.62, 1.4, 0.52), 0.008, mats.dark, 5));
  });

  // windscreen + rear glass: planes on the slopes, chrome-framed
  const slopePlane = (a, b, w, outward) => { // a = bottom (z, y), b = top (z, y)
    const dz = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dz, dy), nz = outward * dy / len, ny = -outward * dz / len;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, len), mats.glass); m.position.set(0, (a[1] + b[1]) / 2, (a[0] + b[0]) / 2); m.rotation.x = -Math.atan2(ny, nz); body.add(m);
    const pts = [V(-w / 2, a[1], a[0]), V(w / 2, a[1], a[0]), V(w / 2, b[1], b[0]), V(-w / 2, b[1], b[0])];
    for (let i = 0; i < 4; i++) body.add(rod(pts[i], pts[(i + 1) % 4], 0.014, mats.chrome, 6));
  };
  slopePlane([0.62, 1.12], [0.44, 1.64], 1.56, 1);
  slopePlane([-1.02, 1.13], [-0.86, 1.64], 1.5, -1);
  add(new THREE.BoxGeometry(0.2, 0.06, 0.03), mats.dark, 0, 1.55, 0.45, false); // rear-view mirror

  // ---------- interior ----------
  add(new THREE.BoxGeometry(1.5, 0.03, 1.5), mats.redLeather, 0, 0.72, -0.2, false);
  for (const [z, h] of [[0.0, 0.5], [-0.62, 0.55]]) {
    add(new THREE.BoxGeometry(1.45, 0.2, 0.5), mats.leather, 0, 0.84, z, false);
    add(new THREE.BoxGeometry(1.45, h, 0.12), mats.leather, 0, 1.1, z - 0.3, false).rotation.x = -0.18;
    add(new THREE.BoxGeometry(1.46, 0.03, 0.52), mats.redLeather, 0, 0.74, z, false);
  }
  add(new THREE.BoxGeometry(1.7, 0.16, 0.26), mats.paint, 0, 1.02, 0.5, false); // dash
  add(new THREE.BoxGeometry(1.5, 0.02, 0.02), mats.chrome, 0, 0.95, 0.38, false);
  for (const gx of [0.3, 0.55]) { add(new THREE.CylinderGeometry(0.07, 0.07, 0.02, 18), mats.dark, gx, 1.0, 0.37, false).rotation.x = Math.PI / 2 - 0.5; add(new THREE.TorusGeometry(0.07, 0.008, 6, 20), mats.chrome, gx, 1.0, 0.365, false).rotation.x = -0.5; }
  add(new THREE.TorusGeometry(0.2, 0.019, 10, 36), mats.cream, 0.4, 1.08, 0.2, false).rotation.x = Math.PI / 2 - 0.55;
  add(new THREE.CylinderGeometry(0.04, 0.04, 0.03, 14), mats.chrome, 0.4, 1.08, 0.2, false).rotation.x = Math.PI / 2 - 0.55;
  body.add(rod(V(0.4, 1.0, 0.3), V(0.4, 0.82, 0.55), 0.02, mats.dark, 8));
  both((s) => add(new THREE.BoxGeometry(0.05, 0.4, 1.4), mats.leather, s * 0.78, 0.86, -0.3, false));

  // ---------- front & rear ends ----------
  const bump = (z, dir) => {
    const pts = [V(-1.0, 0.54, z - dir * 0.12), V(-0.86, 0.54, z), V(-0.4, 0.545, z + dir * 0.07), V(0.4, 0.545, z + dir * 0.07), V(0.86, 0.54, z), V(1.0, 0.54, z - dir * 0.12)];
    const t = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.065, 12), mats.chrome); t.castShadow = true; t.scale.y = 1.25; body.add(t);
    body.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => p.clone().setY(0.4))), 40, 0.03, 8), mats.chrome));
  };
  bump(2.44, 1); bump(-2.46, -1);
  add(new THREE.BoxGeometry(1.0, 0.26, 0.04), mats.chrome, 0, 0.7, 2.44, false);       // grille shell
  add(new THREE.BoxGeometry(0.94, 0.2, 0.05), mats.dark, 0, 0.7, 2.455, false);
  for (let i = 0; i < 5; i++) add(new THREE.BoxGeometry(0.96, 0.012, 0.03), mats.chrome, 0, 0.62 + i * 0.04, 2.47, false);
  add(new THREE.SphereGeometry(0.075, 16, 12), mats.chrome, 0, 0.7, 2.5, false).scale.set(1, 1, 1.5);
  body.add(rod(V(0, 1.075, 1.0), V(0, 1.045, 2.25), 0.014, mats.chrome, 6));        // hood strip
  add(new THREE.ConeGeometry(0.035, 0.22, 10), mats.chrome, 0, 1.09, 2.22, false).rotation.x = Math.PI / 2 + 0.15; // hood ornament
  add(new THREE.BoxGeometry(0.2, 0.012, 0.07), mats.chrome, 0, 1.075, 2.2, false);
  body.add(rod(V(-0.78, 1.06, 0.95), V(-0.8, 1.9, 0.82), 0.007, mats.chrome, 5));   // antenna
  add(new THREE.BoxGeometry(1.2, 0.012, 0.012), mats.dark, 0, 0.98, -2.43, false);  // trunk seam
  add(new THREE.BoxGeometry(0.22, 0.03, 0.03), mats.chrome, 0, 1.06, -2.4, false);
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.13), new THREE.MeshStandardMaterial({ map: plateTexture('EMS TOWN'), roughness: 0.5 })); plate.position.set(0, 0.78, -2.47); plate.rotation.y = Math.PI; body.add(plate);
  both((s) => { add(new THREE.CylinderGeometry(0.05, 0.055, 0.2, 16), mats.chrome, s * 0.55, 0.36, -2.42, false).rotation.x = Math.PI / 2; });

  // ---------- wheels ----------
  const wheels = [];
  for (const [az, steer] of [[AXLE_F, true], [AXLE_R, false]]) for (const sx of [-1, 1]) {
    const pivot = new THREE.Group(); pivot.position.set(sx * TRACK, WHEEL_R, az);
    const spin = makeWheel(mats); pivot.add(spin); root.add(pivot); wheels.push({ pivot, spin, steer });
  }

  // soft contact shadow
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 6.6), new THREE.MeshBasicMaterial({ map: softBlobTexture('rgba(0,0,0,.55)', 'rgba(0,0,0,0)'), transparent: true, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2; blob.position.y = 0.04; root.add(blob);

  body.traverse((o) => { if (o.isMesh) o.receiveShadow = true; });
  return {
    root,
    update({ steer, spin, pitch, roll, braking }) {
      for (const w of wheels) { if (w.steer) w.pivot.rotation.y = steer; w.spin.rotation.x = spin; }
      body.rotation.x = pitch; body.rotation.z = roll;
      mats.tail.emissiveIntensity = braking ? 2.6 : 0.3;
    },
  };
}
