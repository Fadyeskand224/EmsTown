import * as THREE from 'three';
import { plateTexture, softBlobTexture } from './textures.js';

const WHEEL_R = 0.34, AXLE_F = 1.3, AXLE_R = -1.3, TRACK = 0.8;

function extrudeProfile(shape, depth, bevel = 0.07) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4, curveSegments: 18 });
  g.translate(0, 0, -depth / 2);
  g.rotateY(-Math.PI / 2); // profile x (length) -> +z (forward), extrusion -> width
  g.computeVertexNormals();
  return g;
}

function bodyShape() {
  const s = new THREE.Shape(), y0 = 0.33, ar = 0.47;
  s.moveTo(-2.15, y0);
  s.lineTo(AXLE_R - ar, y0); s.absarc(AXLE_R, y0, ar, Math.PI, 0, true);
  s.lineTo(AXLE_F - ar, y0); s.absarc(AXLE_F, y0, ar, Math.PI, 0, true);
  s.lineTo(2.15, y0);
  s.lineTo(2.2, 0.6); s.quadraticCurveTo(2.22, 0.82, 2.05, 0.88);
  s.lineTo(1.15, 1.0); s.lineTo(-1.55, 1.03); s.lineTo(-2.06, 0.99);
  s.quadraticCurveTo(-2.22, 0.9, -2.2, 0.6); s.lineTo(-2.15, y0);
  return s;
}
const cabinShape = (inset = 0) => {
  const s = new THREE.Shape(), i = inset;
  s.moveTo(-1.28 + i * 1.2, 1.0); s.lineTo(-0.76 + i * 0.5, 1.47 - i); s.quadraticCurveTo(-0.7, 1.52 - i, -0.55, 1.52 - i); s.lineTo(0.42, 1.52 - i);
  s.quadraticCurveTo(0.62 - i * 0.5, 1.52 - i, 0.7 - i * 0.6, 1.46 - i); s.lineTo(1.15 - i * 1.2, 1.0); s.lineTo(-1.28 + i * 1.2, 1.0);
  return s;
};

function makeWheel() {
  const g = new THREE.Group();
  const tire = new THREE.Mesh(new THREE.CylinderGeometry(WHEEL_R, WHEEL_R, 0.23, 40), new THREE.MeshStandardMaterial({ color: 0x111113, roughness: 0.92 }));
  tire.rotation.z = Math.PI / 2; tire.castShadow = true;
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xd8dade, metalness: 1, roughness: 0.22 });
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.235, 0.235, 0.235, 32), rimMat); rim.rotation.z = Math.PI / 2;
  const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.245, 24), new THREE.MeshStandardMaterial({ color: 0x2a2c30, metalness: 0.6, roughness: 0.5 })); dish.rotation.z = Math.PI / 2;
  g.add(tire, rim, dish);
  for (let i = 0; i < 5; i++) { // spokes
    const sp = new THREE.Mesh(new THREE.BoxGeometry(0.255, 0.04, 0.2), rimMat); const a = (i / 5) * Math.PI * 2;
    sp.position.set(0, Math.sin(a) * 0.1, Math.cos(a) * 0.1); sp.rotation.x = -a + Math.PI / 2; g.add(sp);
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.27, 12), rimMat); hub.rotation.z = Math.PI / 2; g.add(hub);
  return g;
}

export function createCar(paint = 0x7d0f1f) {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const paintMat = new THREE.MeshPhysicalMaterial({ color: paint, metalness: 0.25, roughness: 0.38, clearcoat: 0.6, clearcoatRoughness: 0.18, envMapIntensity: 0.3 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x0f0f11, roughness: 0.6, metalness: 0.3 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x0c1319, metalness: 0.4, roughness: 0.06, clearcoat: 1, envMapIntensity: 0.7 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xe6e8ec, metalness: 1, roughness: 0.15 });
  const add = (geo, mat, x = 0, y = 0, z = 0, cast = true) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = true; body.add(m); return m; };

  add(extrudeProfile(bodyShape(), 1.6), paintMat);
  add(extrudeProfile(cabinShape(), 1.36, 0.05), paintMat);
  add(extrudeProfile(cabinShape(0.1), 1.52, 0.0), glass); // side glass, wider than the cabin so it shows through
  // windscreen + rear glass planes on the slopes
  const ws = new THREE.Mesh(new THREE.PlaneGeometry(1.36, 0.66), glass); ws.position.set(0, 1.265, 0.935); ws.rotation.x = -(Math.PI / 2 - Math.atan2(0.47, 0.45)) ; body.add(ws);
  const rw = new THREE.Mesh(new THREE.PlaneGeometry(1.34, 0.66), glass); rw.position.set(0, 1.25, -1.0); rw.rotation.set(-(Math.PI - (Math.PI / 2 - Math.atan2(0.47, 0.52))), 0, 0); body.add(rw);

  add(new THREE.BoxGeometry(1.5, 0.3, 3.9), dark, 0, 0.36, 0, false);            // underbody (hides the arches' see-through)
  add(new THREE.BoxGeometry(1.74, 0.17, 0.2), dark, 0, 0.42, 2.17);                // front bumper lip
  add(new THREE.BoxGeometry(1.74, 0.17, 0.2), dark, 0, 0.42, -2.17);
  add(new THREE.BoxGeometry(1.0, 0.2, 0.06), dark, 0, 0.68, 2.2);                  // grille
  for (let i = 0; i < 4; i++) add(new THREE.BoxGeometry(0.9, 0.012, 0.075), chrome, 0, 0.62 + i * 0.045, 2.205, false);
  const lampMat = new THREE.MeshStandardMaterial({ color: 0xfff6dd, emissive: 0xfff0c0, emissiveIntensity: 1.4, roughness: 0.2 });
  const tailMat = new THREE.MeshStandardMaterial({ color: 0x7a0000, emissive: 0xff1010, emissiveIntensity: 0.35, roughness: 0.3 });
  for (const sx of [-1, 1]) {
    const h = add(new THREE.SphereGeometry(0.15, 20, 14), lampMat, sx * 0.62, 0.8, 2.1, false); h.scale.set(1.25, 0.8, 0.7);
    add(new THREE.TorusGeometry(0.15, 0.015, 8, 24), chrome, sx * 0.62, 0.8, 2.17, false).scale.set(1.25, 0.8, 1);
    add(new THREE.BoxGeometry(0.42, 0.13, 0.06), tailMat, sx * 0.62, 0.86, -2.2, false);
    // mirrors
    add(new THREE.BoxGeometry(0.12, 0.09, 0.2), paintMat, sx * 0.9, 1.08, 0.78);
    add(new THREE.BoxGeometry(0.03, 0.03, 0.16), dark, sx * 0.9, 1.04, 0.78, false);
    // door lines + handles
    for (const z of [-0.12, 0.62]) add(new THREE.BoxGeometry(0.012, 0.52, 0.01), dark, sx * 0.865, 0.72, z, false);
    add(new THREE.BoxGeometry(0.02, 0.025, 0.16), chrome, sx * 0.87, 0.9, 0.28, false);
  }
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.125), new THREE.MeshStandardMaterial({ map: plateTexture('EMS TOWN'), roughness: 0.5 }));
  plate.position.set(0, 0.62, -2.235); plate.rotation.y = Math.PI; body.add(plate);
  const exhaust = add(new THREE.CylinderGeometry(0.045, 0.045, 0.16, 12), chrome, 0.55, 0.38, -2.2, false); exhaust.rotation.x = Math.PI / 2;

  // wheels
  const wheels = [];
  for (const [ax, steer] of [[AXLE_F, true], [AXLE_R, false]]) for (const sx of [-1, 1]) {
    const pivot = new THREE.Group(); pivot.position.set(sx * TRACK, WHEEL_R, ax);
    const spin = makeWheel(); pivot.add(spin); root.add(pivot);
    wheels.push({ pivot, spin, steer });
  }

  // soft contact shadow on the ground
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 6), new THREE.MeshBasicMaterial({ map: softBlobTexture('rgba(0,0,0,.55)', 'rgba(0,0,0,0)'), transparent: true, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2; blob.position.y = 0.04; root.add(blob);

  return {
    root,
    // steer in radians, spin = accumulated wheel rotation, pitch/roll in radians, braking toggles the tail lamps
    update({ steer, spin, pitch, roll, braking }) {
      for (const w of wheels) { if (w.steer) w.pivot.rotation.y = steer; w.spin.rotation.x = spin; }
      body.rotation.x = pitch; body.rotation.z = roll;
      tailMat.emissiveIntensity = braking ? 2.4 : 0.35;
    },
  };
}
