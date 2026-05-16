# VinylViz

**See what your album looks like before it's pressed.**

A 3D vinyl record visualizer for independent artists. Upload your artwork, enter your track listing, and get an interactive 3D model of your album — cover, sleeve, and vinyl record — that you can rotate, zoom, and spin.

---

## Features

- Upload front cover, back cover, inner sleeve, and record label sticker
- Auto-generates a styled back cover with your track listing if you don't upload one
- Auto-generates a vinyl label sticker with your artist/album name if you don't upload one
- Interactive 3D model — rotate, pan, zoom, spin the record
- Multiple camera presets: 3D view, front cover, back cover, vinyl close-up, top-down
- Drag & drop image uploads
- CD, Cassette, and Audio playback support coming soon

---

## Local Development

```bash
# Install dependencies
npm install

# Start dev server (http://localhost:5173)
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview
```

---

## Deploy to Vercel

### Option A — Vercel CLI (fastest)

```bash
npm i -g vercel
vercel
```

Follow the prompts. Vercel auto-detects Vite and sets everything up.

### Option B — GitHub + Vercel Dashboard

1. Push this repo to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/vinylviz.git
   git push -u origin main
   ```

2. Go to [vercel.com](https://vercel.com) → **Add New Project**
3. Import your GitHub repo
4. Vercel auto-detects Vite — no config needed
5. Click **Deploy**

Every push to `main` triggers an automatic redeploy.

---

## Project Structure

```
vinylviz/
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── Sidebar.jsx          # Upload panel + metadata fields
│   │   ├── Sidebar.module.css
│   │   ├── UploadZone.jsx       # Reusable image upload slot
│   │   ├── UploadZone.module.css
│   │   ├── Viewport.jsx         # Three.js canvas + view controls
│   │   └── Viewport.module.css
│   ├── hooks/
│   │   └── useThreeRenderer.js  # Three.js setup, camera orbit, mouse/touch
│   ├── utils/
│   │   ├── scene.js             # 3D scene builder (sleeve, vinyl, lighting)
│   │   └── textures.js          # Canvas texture generators
│   ├── App.jsx
│   ├── App.module.css
│   ├── index.css                # Global CSS variables + resets
│   └── main.jsx
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

---

## Roadmap

- [ ] CD jewel case with tray insert and disc
- [ ] Cassette tape with J-card and shell
- [ ] Audio playback — upload a track, it plays as the record spins
- [ ] Screenshot / export render
- [ ] Shareable link (e.g. `vinylviz.app/preview/abc123`)
- [ ] Custom vinyl colour options (coloured vinyl, splatter)
- [ ] Gatefold sleeve support

---

## Tech Stack

- [React 18](https://react.dev) + [Vite](https://vitejs.dev)
- [Three.js r160](https://threejs.org)
- CSS Modules
- No UI framework dependencies — intentionally lean for fast loads
