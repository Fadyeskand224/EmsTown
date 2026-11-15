// Everything you'd want to tweak lives here. To add a stop, add one object to STOPS.
export const WORLD = { w: 2600, h: 1800 };

export const STOPS = [
  {
    id: 'meals',
    name: 'EmsMeals',
    emoji: '🥗',
    blurb: 'Plan your week of meals, macros and groceries.',
    url: 'https://emsmeals.onrender.com',
    x: 650, y: 520,
    color: '#e8793a',
    roof: '#c4552a',
  },
  {
    id: 'nook',
    name: 'EmsNook',
    emoji: '📚',
    blurb: 'Your cozy bookshelf and reading nook.',
    url: 'https://emsnook.onrender.com',
    x: 1950, y: 1250,
    color: '#7a5a3a',
    roof: '#4a3322',
  },
];

export const STOP_TRIGGER_RADIUS = 120; // how close the car must be to open the popup
export const STOP_WAKE_RADIUS = 600;    // start waking the sleeping Render service from this far away
export const START = { x: 1300, y: 900, angle: -Math.PI / 2 };
