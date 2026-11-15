import { WORLD, STOPS, STOP_TRIGGER_RADIUS, STOP_WAKE_RADIUS, START } from './config.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// ---------- deterministic random so the town looks the same every visit ----------
let seed = 20261115;
const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

// ---------- map ----------
const stops = STOPS;
const pond = { x: 1950, y: 520, rx: 230, ry: 130 };

// Road waypoints (polylines). They all join at the start plaza.
const roads = [
  [{ x: START.x, y: START.y }, { x: 1000, y: 800 }, { x: 800, y: 600 }, { x: stops[0].x, y: stops[0].y + 70 }],
  [{ x: START.x, y: START.y }, { x: 1600, y: 1000 }, { x: 1800, y: 1200 }, { x: stops[1].x, y: stops[1].y + 70 }],
  [{ x: START.x, y: START.y }, { x: 1300, y: 1350 }, { x: 1000, y: 1500 }, { x: 600, y: 1450 }, { x: 400, y: 1200 }, { x: 500, y: 900 }, { x: 800, y: 600 }],
  [{ x: 1800, y: 1200 }, { x: 2150, y: 1000 }, { x: 2250, y: 700 }, { x: 2000, y: 760 }, { x: 1700, y: 800 }, { x: START.x, y: START.y }],
];
const ROAD_W = 90;

function distToSeg(px, py, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(px - (a.x + t * dx), py - (a.y + t * dy));
}
function distToRoads(px, py) {
  let d = Infinity;
  for (const r of roads) for (let i = 0; i < r.length - 1; i++) d = Math.min(d, distToSeg(px, py, r[i], r[i + 1]));
  return d;
}
const inPond = (px, py, pad = 0) => ((px - pond.x) / (pond.rx + pad)) ** 2 + ((py - pond.y) / (pond.ry + pad)) ** 2 < 1;

// Trees (solid) — kept off roads, stops, the start and the pond.
const trees = [];
for (let i = 0; i < 700 && trees.length < 230; i++) {
  const x = 40 + rand() * (WORLD.w - 80), y = 40 + rand() * (WORLD.h - 80);
  if (distToRoads(x, y) < ROAD_W / 2 + 40) continue;
  if (inPond(x, y, 50)) continue;
  if (stops.some((s) => Math.hypot(x - s.x, y - s.y) < 190)) continue;
  if (trees.some((t) => Math.hypot(x - t.x, y - t.y) < 55)) continue;
  trees.push({ x, y, r: 34 + rand() * 20, hue: 108 + rand() * 30, kind: rand() < 0.2 ? 'pine' : 'round' });
}
trees.sort((a, b) => a.y - b.y);

// ---------- pre-rendered ground ----------
const ground = document.createElement('canvas');
ground.width = WORLD.w; ground.height = WORLD.h;
(function paintGround() {
  const g = ground.getContext('2d');
  g.fillStyle = '#58a84f';
  g.fillRect(0, 0, WORLD.w, WORLD.h);
  // mowed stripes
  for (let x = 0; x < WORLD.w; x += 160) { g.fillStyle = (x / 160) % 2 ? 'rgba(255,255,255,.035)' : 'rgba(0,0,0,.03)'; g.fillRect(x, 0, 160, WORLD.h); }
  // grass tufts + flowers
  const cols = ['#fff3a8', '#ffd1e6', '#ffffff', '#ffb38a', '#d5c2ff'];
  for (let i = 0; i < 1500; i++) {
    const x = rand() * WORLD.w, y = rand() * WORLD.h;
    if (distToRoads(x, y) < ROAD_W / 2 + 6 || inPond(x, y, 10)) continue;
    if (rand() < 0.65) { g.strokeStyle = 'rgba(30,90,35,.45)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 3, y - 9); g.moveTo(x, y); g.lineTo(x + 3, y - 8); g.stroke(); }
    else { g.fillStyle = cols[(rand() * cols.length) | 0]; g.beginPath(); g.arc(x, y, 3.5, 0, 7); g.fill(); g.fillStyle = '#f2b705'; g.beginPath(); g.arc(x, y, 1.3, 0, 7); g.fill(); }
  }
  // roads: edge, surface, dashed centre
  const stroke = (w, color, dash) => {
    g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = color; g.lineWidth = w; g.setLineDash(dash || []);
    for (const r of roads) { g.beginPath(); g.moveTo(r[0].x, r[0].y); for (const p of r.slice(1)) g.lineTo(p.x, p.y); g.stroke(); }
  };
  stroke(ROAD_W + 12, '#c9b98f');
  stroke(ROAD_W, '#d9cba4');
  stroke(3, 'rgba(255,255,255,.7)', [18, 22]);
  g.setLineDash([]);
  // start plaza
  g.fillStyle = '#d9cba4'; g.beginPath(); g.arc(START.x, START.y, 90, 0, 7); g.fill();
  g.strokeStyle = '#c9b98f'; g.lineWidth = 6; g.stroke();
  // pond
  g.fillStyle = '#e2d8a8'; g.beginPath(); g.ellipse(pond.x, pond.y, pond.rx + 16, pond.ry + 14, 0, 0, 7); g.fill();
  const grad = g.createRadialGradient(pond.x - 40, pond.y - 20, 20, pond.x, pond.y, pond.rx);
  grad.addColorStop(0, '#7fd0ee'); grad.addColorStop(1, '#3a97c4');
  g.fillStyle = grad; g.beginPath(); g.ellipse(pond.x, pond.y, pond.rx, pond.ry, 0, 0, 7); g.fill();
  g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 3;
  for (let i = 0; i < 4; i++) { g.beginPath(); g.ellipse(pond.x - 60 + i * 40, pond.y - 20 + (i % 2) * 40, 24, 7, 0, 0, Math.PI); g.stroke(); }
})();

// ---------- drawing helpers ----------
function drawTree(t) {
  ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(t.x + 6, t.y + 10, t.r * 0.9, t.r * 0.5, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#6b4a2b'; ctx.fillRect(t.x - 5, t.y - 4, 10, 22);
  if (t.kind === 'pine') {
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = `hsl(${t.hue + 10}, 45%, ${24 + i * 5}%)`;
      ctx.beginPath(); ctx.moveTo(t.x, t.y - t.r * 1.6 + i * 18); ctx.lineTo(t.x + t.r * (0.7 + i * 0.12), t.y - 6 + i * 14); ctx.lineTo(t.x - t.r * (0.7 + i * 0.12), t.y - 6 + i * 14); ctx.fill();
    }
  } else {
    ctx.fillStyle = `hsl(${t.hue}, 45%, 28%)`; ctx.beginPath(); ctx.arc(t.x, t.y - t.r * 0.7, t.r, 0, 7); ctx.fill();
    ctx.fillStyle = `hsl(${t.hue}, 50%, 38%)`; ctx.beginPath(); ctx.arc(t.x - t.r * 0.25, t.y - t.r * 0.95, t.r * 0.7, 0, 7); ctx.fill();
  }
}

function drawStop(s, t) {
  const w = 150, h = 110, x = s.x - w / 2, y = s.y - h / 2;
  ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(s.x + 10, s.y + h / 2, w * 0.65, 22, 0, 0, 7); ctx.fill();
  ctx.fillStyle = s.color; ctx.fillRect(x, y, w, h);               // walls
  ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fillRect(x, y + h - 14, w, 14);
  ctx.fillStyle = s.roof;                                          // roof
  ctx.beginPath(); ctx.moveTo(x - 14, y + 6); ctx.lineTo(s.x, y - 56); ctx.lineTo(x + w + 14, y + 6); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#fff6dc'; [x + 24, x + w - 54].forEach((wx) => ctx.fillRect(wx, y + 26, 30, 30)); // windows
  ctx.strokeStyle = s.roof; ctx.lineWidth = 3; [x + 24, x + w - 54].forEach((wx) => ctx.strokeRect(wx, y + 26, 30, 30));
  ctx.fillStyle = '#3b2a1a'; ctx.fillRect(s.x - 14, y + h - 46, 28, 46); // door
  // sign
  const bob = Math.sin(t / 400) * 3;
  ctx.fillStyle = '#fffaf0'; roundRect(s.x - 84, y - 96 + bob, 168, 34, 10); ctx.fill();
  ctx.fillStyle = '#2b2b2b'; ctx.font = '700 18px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(`${s.emoji} ${s.name}`, s.x, y - 79 + bob);
  // parking ring
  ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 4; ctx.setLineDash([10, 10]); ctx.lineDashOffset = -t / 50;
  ctx.beginPath(); ctx.arc(s.x, s.y + 70, 52, 0, 7); ctx.stroke(); ctx.setLineDash([]);
}

function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

function drawCar(c) {
  ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.angle);
  ctx.fillStyle = 'rgba(0,0,0,.25)'; roundRect(-24, -13, 52, 30, 8); ctx.fill();
  ctx.fillStyle = '#d93b3b'; roundRect(-26, -15, 52, 30, 8); ctx.fill();           // body
  ctx.fillStyle = '#a82a2a'; ctx.fillRect(-26, -2, 52, 4);                       // stripe
  ctx.fillStyle = '#bfe6f5'; roundRect(-4, -11, 14, 22, 4); ctx.fill();            // windscreen
  ctx.fillStyle = '#8fb8c9'; roundRect(-16, -10, 9, 20, 3); ctx.fill();            // rear window
  ctx.fillStyle = '#fff3a8'; ctx.fillRect(22, -12, 4, 6); ctx.fillRect(22, 6, 4, 6); // headlights
  ctx.fillStyle = '#222'; [[-17, -17], [13, -17], [-17, 12], [13, 12]].forEach(([wx, wy]) => ctx.fillRect(wx, wy, 11, 5)); // wheels
  ctx.restore();
}

function drawPointers(cam, vw, vh) {
  for (const s of stops) {
    const sx = (s.x - cam.x) * cam.z, sy = (s.y - cam.y) * cam.z;
    if (sx > 60 && sx < vw - 60 && sy > 60 && sy < vh - 60) continue;
    const a = Math.atan2(sy - vh / 2, sx - vw / 2);
    const m = 46, ex = vw / 2 + Math.cos(a) * 9999, ey = vh / 2 + Math.sin(a) * 9999;
    const px = Math.max(m, Math.min(vw - m, ex)), py = Math.max(m, Math.min(vh - m, ey));
    // clamp along the ray
    const k = Math.min((px - vw / 2) / (Math.cos(a) || 1e-9), (py - vh / 2) / (Math.sin(a) || 1e-9));
    const bx = vw / 2 + Math.cos(a) * Math.abs(k), by = vh / 2 + Math.sin(a) * Math.abs(k);
    ctx.save(); ctx.translate(bx, by); ctx.fillStyle = s.color; ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, 20, 0, 7); ctx.fill(); ctx.stroke();
    ctx.font = '20px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(s.emoji, 0, 1);
    ctx.rotate(a); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(28, 0); ctx.lineTo(20, -6); ctx.lineTo(20, 6); ctx.fill();
    ctx.restore();
  }
}

// ---------- input ----------
const keys = new Set();
addEventListener('keydown', (e) => { keys.add(e.key.toLowerCase()); if (e.key === 'Escape') closePopup(); if (e.key.startsWith('Arrow') || e.key === ' ') e.preventDefault(); });
addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
addEventListener('blur', () => keys.clear());

const stick = { x: 0, y: 0 };
const stickEl = document.getElementById('stick'), knob = document.getElementById('knob');
let stickId = null;
function setStick(e) {
  const r = stickEl.getBoundingClientRect(), R = r.width / 2;
  let dx = e.clientX - (r.left + R), dy = e.clientY - (r.top + R);
  const d = Math.hypot(dx, dy); if (d > R) { dx = (dx / d) * R; dy = (dy / d) * R; }
  stick.x = dx / R; stick.y = dy / R;
  knob.style.transform = `translate(${dx}px, ${dy}px)`;
}
stickEl.addEventListener('pointerdown', (e) => { stickId = e.pointerId; stickEl.setPointerCapture(stickId); setStick(e); });
stickEl.addEventListener('pointermove', (e) => { if (e.pointerId === stickId) setStick(e); });
const endStick = (e) => { if (e.pointerId === stickId) { stickId = null; stick.x = stick.y = 0; knob.style.transform = ''; } };
stickEl.addEventListener('pointerup', endStick); stickEl.addEventListener('pointercancel', endStick);
if (matchMedia('(pointer: coarse)').matches) { stickEl.classList.remove('hidden'); document.getElementById('hud').textContent = 'Drive to a stop with the joystick'; }

// ---------- popup + wake pings ----------
const popup = document.getElementById('popup');
let activeStop = null;
const dismissed = new Set();
function openPopup(s) {
  activeStop = s;
  document.getElementById('popup-emoji').textContent = s.emoji;
  document.getElementById('popup-title').textContent = `Welcome to ${s.name}`;
  document.getElementById('popup-text').textContent = s.blurb;
  const a = document.getElementById('popup-open'); a.href = s.url; a.textContent = `Open ${s.name}`;
  popup.style.setProperty('--accent', s.color);
  popup.classList.remove('hidden');
}
function closePopup() { if (!activeStop) return; dismissed.add(activeStop.id); activeStop = null; popup.classList.add('hidden'); }
document.getElementById('popup-close').addEventListener('click', closePopup);
popup.addEventListener('pointerdown', (e) => { if (e.target === popup) closePopup(); });
document.getElementById('popup-open').addEventListener('click', () => setTimeout(closePopup, 0));

// Free Render services sleep; poke /api/health as the car gets close so the app is awake by arrival.
const lastWake = {};
function wake(s) {
  const now = Date.now();
  if (lastWake[s.id] && now - lastWake[s.id] < 5 * 60 * 1000) return;
  lastWake[s.id] = now;
  fetch(new URL('/api/health', s.url), { mode: 'no-cors', cache: 'no-store' }).catch(() => {});
}

// ---------- car ----------
const car = { x: START.x, y: START.y, angle: START.angle, speed: 0 };
const MAX = 430, ACC = 520, BRAKE = 760, FRICTION = 300, TURN = 2.7;

function update(dt) {
  const frozen = !!activeStop;
  let throttle = 0, steer = 0;
  if (!frozen) {
    if (keys.has('arrowup') || keys.has('w')) throttle += 1;
    if (keys.has('arrowdown') || keys.has('s')) throttle -= 1;
    if (keys.has('arrowleft') || keys.has('a')) steer -= 1;
    if (keys.has('arrowright') || keys.has('d')) steer += 1;
    if (Math.abs(stick.x) > 0.12 || Math.abs(stick.y) > 0.12) { steer = stick.x; throttle = -stick.y; }
  }
  if (throttle > 0) car.speed = Math.min(MAX * throttle, car.speed + ACC * dt);
  else if (throttle < 0) car.speed = car.speed > 0 ? Math.max(0, car.speed - BRAKE * dt) : Math.max(-MAX * 0.4, car.speed - ACC * 0.6 * dt);
  else { const f = FRICTION * dt; car.speed = Math.abs(car.speed) <= f ? 0 : car.speed - Math.sign(car.speed) * f; }
  // slower on grass than road
  const onRoad = distToRoads(car.x, car.y) < ROAD_W / 2 + 6 || Math.hypot(car.x - START.x, car.y - START.y) < 90;
  const cap = onRoad ? 1 : 0.62;
  if (Math.abs(car.speed) > MAX * cap) car.speed -= Math.sign(car.speed) * 900 * dt * (onRoad ? 0.3 : 1);

  const grip = Math.min(1, Math.abs(car.speed) / 120);
  car.angle += steer * TURN * grip * dt * Math.sign(car.speed || 1);
  const nx = car.x + Math.cos(car.angle) * car.speed * dt, ny = car.y + Math.sin(car.angle) * car.speed * dt;

  // collisions: trees (circles at trunk), pond, world edge
  let hit = false;
  for (const t of trees) { if (Math.abs(t.x - nx) < 60 && Math.hypot(nx - t.x, ny - (t.y + 4)) < t.r * 0.45 + 18) { hit = true; break; } }
  if (!hit && inPond(nx, ny, 14)) hit = true;
  if (hit) { car.speed *= -0.25; } else { car.x = nx; car.y = ny; }
  car.x = Math.max(30, Math.min(WORLD.w - 30, car.x)); car.y = Math.max(30, Math.min(WORLD.h - 30, car.y));

  // stops
  for (const s of stops) {
    const d = Math.hypot(car.x - s.x, car.y - (s.y + 70));
    if (d < STOP_WAKE_RADIUS) wake(s);
    if (d > STOP_TRIGGER_RADIUS * 1.6) dismissed.delete(s.id);
    if (!activeStop && d < STOP_TRIGGER_RADIUS && !dismissed.has(s.id)) { openPopup(s); car.speed = 0; }
  }
}

// ---------- render loop ----------
const cam = { x: 0, y: 0, z: 1 };
let vw = 0, vh = 0, dpr = 1;
function resize() {
  dpr = Math.min(devicePixelRatio || 1, 2); vw = innerWidth; vh = innerHeight;
  canvas.width = vw * dpr; canvas.height = vh * dpr;
  cam.z = Math.max(0.55, Math.min(1.1, Math.min(vw, vh) / 700));
}
addEventListener('resize', resize); resize();
cam.x = car.x - vw / cam.z / 2; cam.y = car.y - vh / cam.z / 2;

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  update(dt);
  const lead = 0.25; // look slightly ahead of the car
  const tx = car.x + Math.cos(car.angle) * car.speed * lead - vw / cam.z / 2;
  const ty = car.y + Math.sin(car.angle) * car.speed * lead - vh / cam.z / 2;
  const k = 1 - Math.exp(-6 * dt);
  cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * k;
  cam.x = Math.max(0, Math.min(WORLD.w - vw / cam.z, cam.x)); cam.y = Math.max(0, Math.min(WORLD.h - vh / cam.z, cam.y));

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#3f8a41'; ctx.fillRect(0, 0, vw, vh);
  ctx.save(); ctx.scale(cam.z, cam.z); ctx.translate(-cam.x, -cam.y);
  ctx.drawImage(ground, 0, 0);
  // depth-sort trees, stops and car by y
  const items = trees.map((t) => ({ y: t.y, f: () => drawTree(t) }));
  stops.forEach((s) => items.push({ y: s.y + 55, f: () => drawStop(s, now) }));
  items.push({ y: car.y, f: () => drawCar(car) });
  items.sort((a, b) => a.y - b.y).forEach((i) => i.f());
  ctx.restore();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawPointers(cam, vw, vh);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Debug/testing hook
window.__town = { car, stops, teleport: (x, y) => { car.x = x; car.y = y; } };
