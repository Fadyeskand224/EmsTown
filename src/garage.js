import * as THREE from 'three';
import {
  DEFAULT_CAR, PAINTS, ROOFS, FINISHES, METALS, BUMPERS, WHEELS, RIMS, TIRES, TINTS, HEADLIGHTS, TAILS, GLOWS, SEATS, CARPETS, DASHES, saveCar,
} from './customize.js';
import { MODEL_LIST } from './car.js';

const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

// Camera presets are relative to the car: az = angle around it (0 = behind, PI = front), tgt = look-at point (right, up, forward).
const VIEWS = {
  angle: { az: Math.PI - 0.8, el: 0.17, dist: 9.6, tgt: [0, 0.95, 0], label: '3/4' },
  front: { az: Math.PI, el: 0.1, dist: 8.6, tgt: [0, 0.9, 0], label: 'Front' },
  side: { az: Math.PI / 2, el: 0.06, dist: 10.5, tgt: [0, 0.85, 0], label: 'Side' },
  rear: { az: 0.3, el: 0.12, dist: 9, tgt: [0, 0.95, 0], label: 'Rear' },
  wheel: { az: Math.PI / 2 - 0.35, el: 0.08, dist: 3.8, tgt: [0.85, 0.42, 1.5], label: 'Wheels' },
  interior: { az: 0.45, el: 0.78, dist: 5.0, tgt: [0, 0.95, 0.05], label: 'Interior', cutaway: true },
};

export function createGarage({ camera, canvas, car, carModel: initialCar, cfg, onModel, onClose }) {
  let carModel = initialCar;
  const root = document.getElementById('garage');
  const state = { active: false, auto: true, view: 'angle' };
  const cam = { az: VIEWS.angle.az, el: VIEWS.angle.el, dist: VIEWS.angle.dist, tgt: [...VIEWS.angle.tgt] };
  const want = { ...cam, tgt: [...cam.tgt] };
  const apply = () => { carModel.apply(cfg); saveCar(cfg); };
  // camera views adapt to the chosen car's size and wheel positions
  const viewParams = (name) => {
    const v = VIEWS[name], sp = carModel.spec, k = Math.max(0.7, sp.length / 4.9); let tgt = [...v.tgt], dist = v.dist * k;
    if (name === 'wheel') { tgt = [sp.track + 0.1, sp.wheelR + 0.05, sp.axleF]; dist = 3.8 * Math.max(0.8, sp.wheelR / 0.375); }
    if (name === 'interior') { tgt = [...sp.camTgt]; dist = 5.0 * k; }
    return { ...v, tgt, dist };
  };

  // ---------- panel ----------
  root.innerHTML = '';
  const views = el('div', 'g-views'), panel = el('aside', 'g-panel');
  const head = el('div', 'g-head', '<div><b>🔧 Ems Garage</b><small>Changes save automatically</small></div>');
  const close = el('button', 'g-done', 'Drive out'); close.type = 'button'; close.addEventListener('click', () => api.close()); head.appendChild(close);
  const tabs = el('div', 'g-tabs'), body = el('div', 'g-body');
  panel.append(head, tabs, body);
  root.append(views, panel);

  const swatchRow = (label, list, key, { custom = false } = {}) => {
    const box = el('div', 'g-group'); box.appendChild(el('h4', null, label));
    const row = el('div', 'g-swatches'); box.appendChild(row);
    const nameEl = el('small', 'g-name', ''); box.appendChild(nameEl);
    const refresh = () => { [...row.children].forEach((b) => b.classList.toggle('on', b.dataset.v === String(cfg[key]).toLowerCase())); const hit = list.find(([, v]) => String(v).toLowerCase() === String(cfg[key]).toLowerCase()); nameEl.textContent = hit ? hit[0] : 'Custom'; };
    for (const [name, v] of list) {
      const b = el('button', 'g-sw' + (v === 'body' ? ' sw-body' : v === 'off' ? ' sw-off' : ''), ''); b.type = 'button'; b.title = name; b.dataset.v = String(v).toLowerCase();
      if (v !== 'body' && v !== 'off') b.style.background = v; b.addEventListener('click', () => { cfg[key] = v; apply(); refresh(); }); row.appendChild(b);
    }
    if (custom) { const c = el('label', 'g-sw sw-custom', '<span>+</span>'); const inp = el('input'); inp.type = 'color'; inp.value = cfg[key] && cfg[key][0] === '#' ? cfg[key] : '#a30d20'; inp.addEventListener('input', () => { cfg[key] = inp.value; apply(); refresh(); }); c.appendChild(inp); c.title = 'Pick any colour'; row.appendChild(c); }
    box._refresh = refresh; refresh(); return box;
  };
  const segRow = (label, list, key, note) => {
    const box = el('div', 'g-group'); box.appendChild(el('h4', null, label));
    const row = el('div', 'g-seg'); box.appendChild(row);
    const refresh = () => [...row.children].forEach((b) => b.classList.toggle('on', b.dataset.v === String(cfg[key])));
    for (const [name, v] of list) { const b = el('button', null, name); b.type = 'button'; b.dataset.v = String(v); b.addEventListener('click', () => { cfg[key] = typeof v === 'number' ? v : v; apply(); refresh(); if (key === 'wheel') setView('wheel'); }); row.appendChild(b); }
    if (note) box.appendChild(el('small', 'g-note', note));
    refresh(); return box;
  };
  const toggleRow = (label, key) => {
    const box = el('div', 'g-group g-toggle'); const b = el('button', 'g-switch'); b.type = 'button'; box.append(el('h4', null, label), b);
    const refresh = () => b.classList.toggle('on', !!cfg[key]); b.addEventListener('click', () => { cfg[key] = !cfg[key]; apply(); refresh(); }); refresh(); return box;
  };
  const textRow = (label, key, max) => {
    const box = el('div', 'g-group'); box.appendChild(el('h4', null, label)); const inp = el('input', 'g-text'); inp.maxLength = max; inp.value = cfg[key]; inp.spellcheck = false;
    inp.addEventListener('input', () => { inp.value = inp.value.toUpperCase().replace(/[^A-Z0-9 \-]/g, ''); cfg[key] = inp.value; apply(); });
    inp.addEventListener('focus', () => setView('rear')); box.appendChild(inp); box.appendChild(el('small', 'g-note', 'Up to 8 letters or numbers. Shown on the rear bumper.')); return box;
  };
  const carPicker = () => {
    const box = el('div', 'g-cars'), bar = (n) => '<i>' + '●'.repeat(n) + '<s>' + '●'.repeat(5 - n) + '</s></i>';
    for (const m of MODEL_LIST) {
      const [sp, ac, ha] = m.stats.bars, b = el('button', 'g-car' + (cfg.model === m.id ? ' on' : ''), `<span class="gc-ico">${m.emoji}</span><span class="gc-txt"><b>${m.name}</b><small>${m.blurb}</small><span class="gc-stats"><em>Speed</em>${bar(sp)}<em>Accel</em>${bar(ac)}<em>Handling</em>${bar(ha)}</span></span>`);
      b.type = 'button'; b.addEventListener('click', () => { if (cfg.model === m.id) return; cfg.model = m.id; carModel = onModel(m.id); apply(); showTab('Car'); });
      box.appendChild(b);
    }
    return box;
  };
  const sections = {
    Car: () => [carPicker()],
    Paint: () => [swatchRow('Body colour', PAINTS, 'paint', { custom: true }), segRow('Finish', FINISHES, 'finish', 'Metallic and pearl catch the sky; matte is flat and dull.'), swatchRow('Roof & accent', ROOFS, 'roof', { custom: true })],
    Wheels: () => [segRow('Wheel style', WHEELS, 'wheel'), segRow('Rim finish', RIMS, 'rim'), segRow('Tyres', TIRES, 'tire')],
    Glass: () => [segRow('Window tint', TINTS, 'tint', 'Darker glass hides the interior from outside.')],
    Bumpers: () => [segRow('Bumpers', BUMPERS, 'bumpers'), toggleRow('Bumper bullets', 'bullets'), segRow('Chrome trim', METALS, 'trim', 'Grille, window frames, handles and mirrors.')],
    Lights: () => [segRow('Headlights', HEADLIGHTS, 'headlights'), segRow('Tail lamps', TAILS, 'tail'), swatchRow('Underglow', GLOWS, 'underglow')],
    Interior: () => { const v = el('button', 'g-link', 'Show the interior (roof off)'); v.type = 'button'; v.addEventListener('click', () => setView('interior')); return [v, swatchRow('Seats & door cards', SEATS, 'seats', { custom: true }), swatchRow('Carpet', CARPETS, 'carpet', { custom: true }), segRow('Dashboard', DASHES, 'dash')]; },
    Plate: () => [textRow('Licence plate', 'plate', 8)],
  };
  const tabNames = Object.keys(sections), tabEls = {};
  const showTab = (name) => {
    tabNames.forEach((n) => tabEls[n].classList.toggle('on', n === name)); body.innerHTML = ''; sections[name]().forEach((n) => body.appendChild(n));
    if (name === 'Wheels') setView('wheel'); else if (name === 'Interior') setView('interior'); else if (name === 'Plate') setView('rear'); else if (name === 'Lights') setView('front'); else if (name === 'Bumpers') setView('front'); else setView('angle');
  };
  for (const n of tabNames) { const t = el('button', null, n); t.type = 'button'; t.addEventListener('click', () => showTab(n)); tabs.appendChild(t); tabEls[n] = t; }
  const reset = el('button', 'g-reset', 'Reset to stock'); reset.type = 'button'; reset.addEventListener('click', () => { Object.assign(cfg, DEFAULT_CAR); apply(); showTab(tabNames.find((n) => tabEls[n].classList.contains('on')) || 'Paint'); });
  panel.appendChild(reset);

  // ---------- camera ----------
  const viewBtns = {};
  const setView = (name) => {
    if (!VIEWS[name]) return; const v = viewParams(name); state.view = name;
    want.az = v.az; want.el = v.el; want.dist = v.dist; want.tgt = [...v.tgt]; state.auto = name === 'angle'; carModel.setCutaway(!!v.cutaway);
    Object.entries(viewBtns).forEach(([k, b]) => b.classList.toggle('on', k === name));
  };
  for (const [k, v] of Object.entries(VIEWS)) { const b = el('button', null, v.label); b.type = 'button'; b.addEventListener('click', () => setView(k)); views.appendChild(b); viewBtns[k] = b; }
  const spin = el('button', 'g-spin', '⟳'); spin.type = 'button'; spin.title = 'Spin'; spin.addEventListener('click', () => { state.auto = !state.auto; if (state.auto) setView('angle'); }); views.appendChild(spin);

  let drag = null;
  canvas.addEventListener('pointerdown', (e) => { if (!state.active) return; drag = { x: e.clientX, y: e.clientY, id: e.pointerId }; state.auto = false; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', (e) => { if (!drag || e.pointerId !== drag.id) return; want.az -= (e.clientX - drag.x) * 0.008; want.el = THREE.MathUtils.clamp(want.el + (e.clientY - drag.y) * 0.006, -0.02, 1.2); drag.x = e.clientX; drag.y = e.clientY; });
  const endDrag = (e) => { if (drag && e.pointerId === drag.id) drag = null; };
  canvas.addEventListener('pointerup', endDrag); canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('wheel', (e) => { if (!state.active) return; e.preventDefault(); want.dist = THREE.MathUtils.clamp(want.dist * (1 + Math.sign(e.deltaY) * 0.08), 2.4, 16); }, { passive: false });
  addEventListener('keydown', (e) => { if (state.active && e.key === 'Escape' && document.activeElement?.tagName !== 'INPUT') api.close(); });

  const api = {
    get active() { return state.active; },
    open() {
      state.active = true; root.classList.remove('hidden'); document.body.classList.add('in-garage');
      const h = car.h; cam.az = want.az = VIEWS.angle.az + 0.9; cam.el = 0.3; cam.dist = 13; // swing in from further out
      showTab('Car');
    },
    close() { if (!state.active) return; state.active = false; root.classList.add('hidden'); document.body.classList.remove('in-garage'); carModel.setCutaway(false); camera.clearViewOffset(); onClose(); },
    updateCamera(dt) {
      if (state.auto) want.az += dt * 0.22;
      const k = 1 - Math.exp(-5 * dt);
      cam.az += wrap(want.az - cam.az) * k; cam.el += (want.el - cam.el) * k; cam.dist += (want.dist - cam.dist) * k;
      for (let i = 0; i < 3; i++) cam.tgt[i] += (want.tgt[i] - cam.tgt[i]) * k;
      const h = car.h, fx = Math.sin(h), fz = Math.cos(h), rx = -fz, rz = fx, [tr, tu, tf] = cam.tgt;
      const tx = car.x + rx * tr + fx * tf, ty = tu, tz = car.z + rz * tr + fz * tf, a = h + cam.az, ce = Math.cos(cam.el);
      camera.position.set(tx - Math.sin(a) * ce * cam.dist, Math.max(0.35, ty + Math.sin(cam.el) * cam.dist), tz - Math.cos(a) * ce * cam.dist);
      camera.lookAt(tx, ty, tz);
      const W = innerWidth, Hh = innerHeight, mobile = W <= 720, dx = mobile ? 0 : Math.min(372, W) / 2, dy = mobile ? Hh * 0.23 : 0; // keep the car clear of the panel
      camera.setViewOffset(W, Hh, dx, dy, W, Hh);
      const fov = state.view === 'wheel' || state.view === 'interior' ? 48 : 40; camera.fov += (fov - camera.fov) * k; camera.updateProjectionMatrix();
    },
  };
  return api;
}
