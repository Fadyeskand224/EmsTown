import * as THREE from 'three';
import { STOPS, WORLD, PLAZA, POND, STOP_TRIGGER_RADIUS, STOP_WAKE_RADIUS } from './config.js';
import { createWorld, inPond } from './world.js';
import { createCar } from './car.js';
import { loadCar } from './customize.js';
import { createGarage } from './garage.js';

const touch = matchMedia('(pointer: coarse)').matches;
const $ = (id) => document.getElementById(id);
const canvas = $('game');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, touch ? 1.5 : 2));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.66;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(58, 1, 0.3, 6000);

// ---------- input ----------
const keys = new Set();
addEventListener('keydown', (e) => {
  if (e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return; // typing in the garage's plate box
  const k = e.key.toLowerCase(); keys.add(k);
  if (k === 'escape') closePopup();
  if (k === 'r') respawn();
  if (k.startsWith('arrow') || k === ' ') e.preventDefault();
});
addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
addEventListener('blur', () => keys.clear());

const stick = { x: 0, y: 0 }, stickEl = $('stick'), knob = $('knob');
let stickId = null;
function setStick(e) {
  const r = stickEl.getBoundingClientRect(), R = r.width / 2;
  let dx = e.clientX - (r.left + R), dy = e.clientY - (r.top + R); const d = Math.hypot(dx, dy);
  if (d > R) { dx = (dx / d) * R; dy = (dy / d) * R; }
  stick.x = dx / R; stick.y = dy / R; knob.style.transform = `translate(${dx}px, ${dy}px)`;
}
stickEl.addEventListener('pointerdown', (e) => { stickId = e.pointerId; stickEl.setPointerCapture(stickId); setStick(e); });
stickEl.addEventListener('pointermove', (e) => { if (e.pointerId === stickId) setStick(e); });
const endStick = (e) => { if (e.pointerId === stickId) { stickId = null; stick.x = stick.y = 0; knob.style.transform = ''; } };
stickEl.addEventListener('pointerup', endStick); stickEl.addEventListener('pointercancel', endStick);
if (touch) { stickEl.classList.remove('hidden'); $('hud').textContent = 'Drive to a stop with the joystick'; }
setTimeout(() => ($('hud').style.opacity = 0), 9000);

// ---------- popup + wake pings ----------
const popup = $('popup');
let activeStop = null;
const dismissed = new Set();
const SAVE = 'emstown.state';
function openPopup(s) {
  activeStop = s;
  $('popup-emoji').textContent = s.emoji; $('popup-title').textContent = `Welcome to ${s.name}`; $('popup-text').textContent = s.blurb;
  const a = $('popup-open'); a.href = s.internal ? '#' : s.url; a.textContent = s.internal ? `Enter ${s.name}` : `Open ${s.name}`;
  popup.style.setProperty('--accent', s.accent); popup.classList.remove('hidden');
}
function closePopup() { if (!activeStop) return; dismissed.add(activeStop.id); activeStop = null; popup.classList.add('hidden'); }
$('popup-close').addEventListener('click', closePopup);
popup.addEventListener('pointerdown', (e) => { if (e.target === popup) closePopup(); });
$('popup-open').addEventListener('click', (e) => {
  if (activeStop?.internal) { e.preventDefault(); closePopup(); garage.open(); inGarage = true; return; } // the garage opens in-game, no page change
  saveState(); setTimeout(closePopup, 0); // car stays parked here
});

// Free Render services sleep; poke /api/health as the car gets close so the app is awake by arrival.
const lastWake = {};
function wake(s) {
  if (!s.url) return;
  const now = Date.now();
  if (lastWake[s.id] && now - lastWake[s.id] < 5 * 60 * 1000) return;
  lastWake[s.id] = now;
  fetch(new URL('/api/health', s.url), { mode: 'no-cors', cache: 'no-store' }).catch(() => {});
}

// ---------- car state ----------
const car = { x: 0, z: 10, h: Math.PI, vx: 0, vz: 0, steer: 0, spin: 0, pitch: 0, roll: 0, ax: 0 };
function saveState() { try { localStorage.setItem(SAVE, JSON.stringify({ x: car.x, z: car.z, h: car.h })); } catch { /* private mode */ } }

function placeCar(x, z, h) { car.x = x; car.z = z; car.h = h; car.vx = car.vz = 0; car.steer = 0; }
function spawnAtStop(s) { // parked on the pad, angled so the building is in view
  placeCar(s.park.x, s.park.z, s.facing + Math.PI - 0.75);
  dismissed.add(s.id); // already here: don't pop the dialog until they drive away and come back
}
function respawn() { closePopup(); placeCar(0, 10, Math.PI); dismissed.clear(); }

// Where do we start? ?from=<stop id> (the "Ems Town" link in each app) wins; otherwise wherever you last parked.
function initialSpawn() {
  const from = new URLSearchParams(location.search).get('from'), stop = STOPS.find((s) => s.id === from);
  if (stop) { spawnAtStop(stop); saveState(); return; }
  try { const s = JSON.parse(localStorage.getItem(SAVE) || 'null'); if (s && Number.isFinite(s.x)) { placeCar(s.x, s.z, s.h); STOPS.forEach((st) => Math.hypot(s.x - st.park.x, s.z - st.park.z) < STOP_TRIGGER_RADIUS * 2.5 && dismissed.add(st.id)); } } catch { /* ignore */ }
}

// ---------- physics ----------
const CAR_CIRCLES = [-1.5, 0, 1.5], CAR_R = 1.0, WHEELBASE = 3.0;
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
let world, carModel, garage, inGarage = false;

const cgrid = new Map(), CELL = 12;
function indexCircles(list) { for (const c of list) { const k = `${Math.floor(c.x / CELL)},${Math.floor(c.z / CELL)}`; if (!cgrid.has(k)) cgrid.set(k, []); cgrid.get(k).push(c); } }

// Pushes the point (x,z) out of any obstacle; returns the strongest contact normal (or null).
function resolve(x, z, rad) {
  let nx = 0, nz = 0, hit = false, px = 0, pz = 0;
  const cx = Math.floor(x / CELL), cz = Math.floor(z / CELL);
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (const c of cgrid.get(`${cx + i},${cz + j}`) || []) {
    const dx = x - c.x, dz = z - c.z, d = Math.hypot(dx, dz), m = c.r + rad;
    if (d < m && d > 1e-4) { const p = m - d; px += (dx / d) * p; pz += (dz / d) * p; nx += dx / d; nz += dz / d; hit = true; }
  }
  for (const b of world.boxes) {
    const dx = x - b.x, dz = z - b.z; if (Math.abs(dx) > 25 || Math.abs(dz) > 25) continue;
    const co = Math.cos(b.rot), si = Math.sin(b.rot), lx = dx * co - dz * si, lz = dx * si + dz * co;
    const qx = Math.max(-b.hw, Math.min(b.hw, lx)), qz = Math.max(-b.hd, Math.min(b.hd, lz)), ex = lx - qx, ez = lz - qz, d = Math.hypot(ex, ez);
    let lnx, lnz, pen;
    if (d > 1e-4) { if (d >= rad) continue; lnx = ex / d; lnz = ez / d; pen = rad - d; }
    else { const ox = b.hw - Math.abs(lx), oz = b.hd - Math.abs(lz); if (ox < oz) { lnx = Math.sign(lx) || 1; lnz = 0; pen = ox + rad; } else { lnx = 0; lnz = Math.sign(lz) || 1; pen = oz + rad; } }
    const wx = lnx * co + lnz * si, wz = -lnx * si + lnz * co; px += wx * pen; pz += wz * pen; nx += wx; nz += wz; hit = true;
  }
  if (inPond(x, z, rad)) { // water: nudge back out radially
    const dx = x - POND.x, dz = z - POND.z, d = Math.hypot(dx, dz) || 1, rb = world.pondRadius(Math.atan2(dz, dx)) * 0.96 + rad, p = rb - d;
    if (p > 0) { px += (dx / d) * p; pz += (dz / d) * p; nx += dx / d; nz += dz / d; hit = true; }
  }
  return hit ? { px, pz, nx, nz } : null;
}

let camH = Math.PI, orbit = 0, braking = false, orbitLock = false;
const keyDown = (...k) => k.some((x) => keys.has(x));

function stepCar(dt) {
  const locked = !!activeStop || inGarage;
  let throttle = 0, steerIn = 0, hand = false;
  if (!locked) {
    if (keyDown('arrowup', 'w')) throttle += 1; if (keyDown('arrowdown', 's')) throttle -= 1;
    if (keyDown('arrowleft', 'a')) steerIn += 1; if (keyDown('arrowright', 'd')) steerIn -= 1;
    hand = keyDown(' ');
    if (Math.abs(stick.x) > 0.1 || Math.abs(stick.y) > 0.1) { steerIn = -stick.x; throttle = -stick.y; }
  }
  const fx = Math.sin(car.h), fz = Math.cos(car.h), rx = -fz, rz = fx;
  let vF = car.vx * fx + car.vz * fz, vL = car.vx * rx + car.vz * rz;
  const onHard = world.roadDist(car.x, car.z) < world.roadWidth / 2 + 0.6 || Math.hypot(car.x - PLAZA.x, car.z - PLAZA.z) < PLAZA.r || STOPS.some((s) => Math.hypot(car.x - s.park.x, car.z - s.park.z) < 10);
  const maxF = onHard ? 30 : 15;

  braking = false;
  if (throttle > 0.05) { vF += (vF < 0 ? 30 : 12.5 * Math.max(0.1, 1 - Math.max(0, vF) / maxF)) * throttle * dt; }
  else if (throttle < -0.05) { if (vF > 0.5) { vF -= 28 * -throttle * dt; braking = true; } else vF = Math.max(-9, vF + 8 * throttle * dt); }
  else { const c = (1.4 + (onHard ? 0 : 3.5)) * dt; vF = Math.abs(vF) <= c ? 0 : vF - Math.sign(vF) * c; }
  if (locked) { vF *= Math.exp(-3.5 * dt); vL *= Math.exp(-3.5 * dt); braking = Math.abs(vF) > 1; }
  if (hand && Math.abs(vF) > 0.5) { vF -= Math.sign(vF) * 14 * dt; braking = true; }
  if (vF > maxF) vF -= (vF - maxF) * Math.min(1, 2.2 * dt);
  vF *= Math.exp(-0.035 * dt);
  vL *= Math.exp(-(hand ? 1.3 : onHard ? 9 : 6) * dt);

  const maxSteer = 0.62 / (1 + Math.abs(vF) * 0.075);
  car.steer += (steerIn * maxSteer - car.steer) * Math.min(1, dt * 7);
  const yaw = (vF / WHEELBASE) * Math.tan(car.steer) * (hand ? 1.35 : 1);
  car.h += yaw * dt;

  const nfx = Math.sin(car.h), nfz = Math.cos(car.h), nrx = -nfz, nrz = nfx; // keep the velocity direction consistent with the new heading
  const ovx = car.vx, ovz = car.vz;
  car.vx = nfx * vF + nrx * vL; car.vz = nfz * vF + nrz * vL;
  car.ax += ((car.vx - ovx) * nfx + (car.vz - ovz) * nfz) / Math.max(dt, 1e-3) * 0.2; car.ax *= Math.exp(-6 * dt);
  car.x += car.vx * dt; car.z += car.vz * dt;

  // collisions with trees, rocks, bushes, buildings, the pond (three circles along the car's length)
  for (let it = 0; it < 2; it++) for (const off of CAR_CIRCLES) {
    const hit = resolve(car.x + nfx * off, car.z + nfz * off, CAR_R); if (!hit) continue;
    car.x += hit.px; car.z += hit.pz;
    const l = Math.hypot(hit.nx, hit.nz) || 1, nx = hit.nx / l, nz = hit.nz / l, vn = car.vx * nx + car.vz * nz;
    if (vn < 0) { car.vx -= vn * nx * 1.25; car.vz -= vn * nz * 1.25; car.vx *= 0.97; car.vz *= 0.97; }
  }
  const bx = WORLD.hx - 3, bz = WORLD.hz - 3;
  if (Math.abs(car.x) > bx) { car.x = Math.sign(car.x) * bx; car.vx *= -0.2; }
  if (Math.abs(car.z) > bz) { car.z = Math.sign(car.z) * bz; car.vz *= -0.2; }

  // body motion + wheels
  const speed = Math.hypot(car.vx, car.vz);
  car.spin -= (car.vx * nfx + car.vz * nfz) * dt / 0.375;
  car.pitch += (THREE.MathUtils.clamp(-car.ax * 0.006, -0.05, 0.05) - car.pitch) * Math.min(1, dt * 6);
  car.roll += (THREE.MathUtils.clamp(-yaw * speed * 0.0045, -0.07, 0.07) - car.roll) * Math.min(1, dt * 6);
  return speed;
}

// ---------- minimap, labels, speedometer ----------
const mini = $('minimap'), mctx = mini.getContext('2d');
let miniBg = null;
function buildMinimap() {
  miniBg = document.createElement('canvas'); miniBg.width = mini.width; miniBg.height = mini.height;
  const g = miniBg.getContext('2d'), W = mini.width, H = mini.height, mx = (x) => ((x + WORLD.hx) / (2 * WORLD.hx)) * W, mz = (z) => ((z + WORLD.hz) / (2 * WORLD.hz)) * H;
  g.fillStyle = '#5f9a47'; g.fillRect(0, 0, W, H);
  g.lineCap = g.lineJoin = 'round';
  for (const [w, c] of [[7, '#c9bb97'], [4.6, '#55565b']]) { g.strokeStyle = c; g.lineWidth = w; for (const l of world.roadLines) { g.beginPath(); l.forEach(([x, z], i) => (i ? g.lineTo(mx(x), mz(z)) : g.moveTo(mx(x), mz(z)))); g.stroke(); } }
  g.fillStyle = '#3d8fb4'; g.beginPath(); for (let i = 0; i <= 40; i++) { const a = (i / 40) * Math.PI * 2, r = world.pondRadius(a); const px = mx(POND.x + Math.cos(a) * r), pz = mz(POND.z + Math.sin(a) * r); i ? g.lineTo(px, pz) : g.moveTo(px, pz); } g.fill();
  g.fillStyle = '#b9ae95'; g.beginPath(); g.arc(mx(PLAZA.x), mz(PLAZA.z), 7, 0, 7); g.fill();
  g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1; g.strokeRect(0.5, 0.5, W - 1, H - 1);
}
function drawMinimap() {
  const W = mini.width, H = mini.height, mx = (x) => ((x + WORLD.hx) / (2 * WORLD.hx)) * W, mz = (z) => ((z + WORLD.hz) / (2 * WORLD.hz)) * H;
  mctx.drawImage(miniBg, 0, 0);
  mctx.font = '17px system-ui'; mctx.textAlign = 'center'; mctx.textBaseline = 'middle';
  for (const s of STOPS) { mctx.fillStyle = s.accent; mctx.strokeStyle = '#fff'; mctx.lineWidth = 2.5; mctx.beginPath(); mctx.arc(mx(s.x), mz(s.z), 13, 0, 7); mctx.fill(); mctx.stroke(); mctx.fillText(s.emoji, mx(s.x), mz(s.z) + 1); }
  mctx.save(); mctx.translate(mx(car.x), mz(car.z)); mctx.rotate(Math.PI / 2 - car.h);
  mctx.fillStyle = '#ff3b3b'; mctx.strokeStyle = '#fff'; mctx.lineWidth = 2; mctx.beginPath(); mctx.moveTo(9, 0); mctx.lineTo(-6, -6); mctx.lineTo(-3, 0); mctx.lineTo(-6, 6); mctx.closePath(); mctx.fill(); mctx.stroke(); mctx.restore();
}

const labelEls = STOPS.map((s) => { const el = document.createElement('div'); el.className = 'tag'; el.style.setProperty('--accent', s.accent); el.innerHTML = `<span class="arrow"></span><span>${s.emoji} ${s.name}</span><small></small>`; $('labels').appendChild(el); return el; });
const tmp = new THREE.Vector3();
function updateLabels() {
  const w = innerWidth, h = innerHeight, m = 56;
  STOPS.forEach((s, i) => {
    const el = labelEls[i], dist = Math.hypot(car.x - s.x, car.z - s.z);
    el.querySelector('small').textContent = dist > 25 ? `${Math.round(dist)} m` : '';
    tmp.set(s.x, 9, s.z).project(camera);
    const behind = tmp.z > 1; let sx = (tmp.x * 0.5 + 0.5) * w, sy = (-tmp.y * 0.5 + 0.5) * h;
    if (behind) { sx = w - sx; sy = h - sy; }
    const dx = sx - w / 2, dy = sy - h / 2, inside = !behind && sx > m && sx < w - m && sy > m + 20 && sy < h - m;
    if (inside) { el.classList.remove('edge'); el.style.opacity = dist < 22 ? 0 : 1; el.style.transform = `translate(${sx}px, ${sy}px) translate(-50%, -50%)`; el.querySelector('.arrow').style.transform = ''; return; }
    el.style.opacity = 1; el.classList.add('edge');
    const k = Math.min((w / 2 - m) / (Math.abs(dx) || 1e-6), (h / 2 - m - 40) / (Math.abs(dy) || 1e-6)), ex = w / 2 + dx * k, ey = h / 2 + dy * k;
    el.style.transform = `translate(${ex}px, ${ey}px) translate(-50%, -50%)`;
    el.querySelector('.arrow').style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
  });
}

// ---------- main loop ----------
let t = 0, saveT = 0, lastNow = performance.now();
function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
addEventListener('resize', resize);

function frame() {
  const now = performance.now(), dt = Math.min(0.05, (now - lastNow) / 1000); lastNow = now; t += dt;
  const speed = stepCar(dt);

  carModel.root.position.set(car.x, 0, car.z); carModel.root.rotation.y = car.h;
  carModel.update({ steer: car.steer, spin: car.spin, pitch: car.pitch, roll: car.roll, braking });

  // chase camera
  if (window.__town && window.__town.freeCam) { world.update(dt, t, { x: car.x, z: car.z }); renderer.render(scene, camera); requestAnimationFrame(frame); return; }
  if (inGarage) garage.updateCamera(dt);
  else {
    camH += wrap(car.h - camH) * (1 - Math.exp(-3 * dt));
    if (!orbitLock) { if (activeStop) orbit += dt * 0.3; else orbit -= orbit * Math.min(1, dt * 2); }
    const dist = 8.6 + Math.min(speed, 30) * 0.07, hgt = 3.5 + Math.min(speed, 30) * 0.03, a = camH + orbit;
    const want = new THREE.Vector3(car.x - Math.sin(a) * dist, hgt, car.z - Math.cos(a) * dist);
    camera.position.lerp(want, 1 - Math.exp(-9 * dt));
    camera.lookAt(car.x + Math.sin(a) * 5, 1.4, car.z + Math.cos(a) * 5);
    camera.fov += ((57 + Math.min(speed, 30) * 0.35) - camera.fov) * Math.min(1, dt * 3); camera.updateProjectionMatrix();
  }

  world.update(dt, t, { x: car.x, z: car.z });

  // stops: wake the app, open the dialog on arrival, re-arm once you drive away
  for (const s of STOPS) {
    const d = Math.hypot(car.x - s.park.x, car.z - s.park.z);
    if (d < STOP_WAKE_RADIUS) wake(s);
    if (d > 16) dismissed.delete(s.id);
    if (!activeStop && d < STOP_TRIGGER_RADIUS && !dismissed.has(s.id)) { openPopup(s); saveState(); }
  }
  saveT += dt; if (saveT > 1.5) { saveT = 0; saveState(); }

  $('speed-val').textContent = Math.round(speed * 3.6);
  drawMinimap(); updateLabels();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

function init() {
  resize();
  world = createWorld(scene, renderer, camera, { touch });
  indexCircles(world.circles);
  const carCfg = loadCar();
  carModel = createCar(carCfg, scene.environment); scene.add(carModel.root);
  garage = createGarage({ camera, canvas, car, carModel, cfg: carCfg, onClose: () => { inGarage = false; dismissed.add('garage'); saveState(); } });
  buildMinimap();
  initialSpawn();
  camH = car.h; camera.position.set(car.x - Math.sin(camH) * 9, 3.5, car.z - Math.cos(camH) * 9);
  $('loading').classList.add('done'); setTimeout(() => $('loading').remove(), 700);
  window.__town = { car, stops: STOPS, scene, camera, renderer, teleport: (x, z, h = car.h) => placeCar(x, z, h), setOrbit: (v) => { orbit = v; orbitLock = true; }, state: () => ({ ...car, active: activeStop?.id }) };
  frame();
}
requestAnimationFrame(() => setTimeout(init, 40));
