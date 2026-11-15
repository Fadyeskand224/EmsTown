// Everything you'd want to tweak lives here. Units are metres; y is up, the ground is x/z.
export const WORLD = { hx: 220, hz: 170 }; // half-size of the drivable valley

export const PLAZA = { x: 0, z: 0, r: 13 };
export const POND = { x: 62, z: -58, r: 24 };

// Each stop is a building. Its front faces local +z; the parking pad sits PARK_DIST metres in front of it.
// `facing` is the world heading (radians) of that +z axis. Both buildings look back toward the plaza.
export const PARK_DIST = 21;
export const STOPS = [
  {
    id: 'meals',
    name: 'EmsMeals',
    emoji: '🥗',
    blurb: 'Plan your week of meals, macros and groceries.',
    url: 'https://emsmeals.onrender.com',
    x: -128, z: -88,
    accent: '#e8793a',
  },
  {
    id: 'nook',
    name: 'EmsNook',
    emoji: '📚',
    blurb: 'Your cozy bookshelf and reading nook.',
    url: 'https://emsnook.onrender.com',
    x: 132, z: 84,
    accent: '#8a6a45',
  },
  {
    id: 'garage',
    name: 'Ems Garage',
    emoji: '🔧',
    blurb: 'Customize your car: paint, wheels, glass, lights and interior.',
    internal: true, // opens inside the game instead of linking out
    x: -82, z: 76,
    accent: '#2a78c8',
  },
];
for (const s of STOPS) {
  s.facing = Math.atan2(PLAZA.x - s.x, PLAZA.z - s.z);
  s.park = { x: s.x + Math.sin(s.facing) * PARK_DIST, z: s.z + Math.cos(s.facing) * PARK_DIST };
}

export const STOP_TRIGGER_RADIUS = 5.5; // metres from the pad centre that open the popup
export const STOP_WAKE_RADIUS = 160;    // start waking the sleeping Render service from this far away
