// What the player can change in the Ems Garage, the choices offered, and saving.
export const DEFAULT_CAR = {
  paint: '#a30d20', finish: 'gloss', roof: '#eadfc4',
  trim: 'chrome', bumpers: 'chrome', bullets: true,
  wheel: 'dome', rim: 'chrome', tire: 'white',
  tint: 1, headlights: 'warm', tail: 'red', underglow: 'off',
  seats: '#d9ccaa', carpet: '#3a2a24', dash: 'wood',
  plate: 'EMS TOWN',
};

export const PAINTS = [
  ['Cherry', '#a30d20'], ['Midnight', '#14284f'], ['British green', '#1f4d2e'], ['Turquoise', '#168a90'], ['Sunburst', '#e0a21b'],
  ['Flamingo', '#e58aa5'], ['Burnt orange', '#d9611e'], ['Plum', '#4b2a6b'], ['Silver', '#b8bcc2'], ['Ivory', '#f0ecdf'], ['Onyx', '#101012'], ['Sky', '#6fa8d6'],
];
export const ROOFS = [['Match body', 'body'], ['Cream', '#eadfc4'], ['White', '#f6f4ee'], ['Black', '#141416'], ['Silver', '#b8bcc2'], ['Cherry', '#a30d20'], ['Midnight', '#14284f']];
export const FINISHES = [['Gloss', 'gloss'], ['Metallic', 'metallic'], ['Pearl', 'pearl'], ['Matte', 'matte']];
export const METALS = [['Chrome', 'chrome'], ['Gold', 'gold'], ['Black', 'black']];
export const BUMPERS = [['Chrome', 'chrome'], ['Gold', 'gold'], ['Black', 'black'], ['Body colour', 'body']];
export const WHEELS = [['Hubcaps', 'dome'], ['Wire', 'wire'], ['Mag', 'mag'], ['Steel', 'steel']];
export const RIMS = [['Chrome', 'chrome'], ['Gold', 'gold'], ['Black', 'black'], ['Body colour', 'body']];
export const TIRES = [['Whitewall', 'white'], ['Blackwall', 'black'], ['Redline', 'red']];
export const TINTS = [['None', 0], ['Light', 1], ['Dark', 2], ['Limo', 3]];
export const HEADLIGHTS = [['Warm', 'warm'], ['White', 'white'], ['Amber', 'amber'], ['Ice blue', 'ice']];
export const TAILS = [['Red', 'red'], ['Amber', 'amber'], ['Smoked', 'smoked']];
export const GLOWS = [['Off', 'off'], ['Blue', '#2f8bff'], ['Green', '#2dff88'], ['Pink', '#ff3fa8'], ['Amber', '#ffb020'], ['White', '#ffffff']];
export const SEATS = [['Cream', '#d9ccaa'], ['Tan', '#a8764a'], ['Black', '#1b1b1d'], ['Oxblood', '#6b1424'], ['Navy', '#1e2f4f'], ['Forest', '#28402f'], ['Grey', '#8b8d91'], ['Red', '#a8182c']];
export const CARPETS = [['Black', '#1c1a19'], ['Oxblood', '#4a1420'], ['Navy', '#1b2742'], ['Tan', '#7a5a3a'], ['Grey', '#5b5d61']];
export const DASHES = [['Wood grain', 'wood'], ['Body colour', 'body'], ['Black', 'black']];

const KEY = 'emstown.car.v1';
export function loadCar() {
  try { return { ...DEFAULT_CAR, ...(JSON.parse(localStorage.getItem(KEY) || 'null') || {}) }; } catch { return { ...DEFAULT_CAR }; }
}
export function saveCar(cfg) { try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch { /* private mode */ } }
