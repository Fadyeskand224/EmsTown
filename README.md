# Ems Town

A small driving game that links the Ems apps. Drive a car around a park; pull up at a stop and a popup lets you open that app.

- **EmsMeals**: https://emsmeals.onrender.com
- **EmsNook**: https://emsnook.onrender.com

Both apps link back here from their menus.

## Run
```bash
npm install
npm run dev     # http://localhost:5173
npm run build   # static site in dist/
```

Controls: arrow keys / WASD, or the on-screen joystick on touch devices.

## Add a stop
Add an entry to `STOPS` in `src/config.js` (name, emoji, url, x, y, colors).

## Deploy
Render > New > Blueprint > pick this repo (it reads `render.yaml`). No environment variables are needed.
