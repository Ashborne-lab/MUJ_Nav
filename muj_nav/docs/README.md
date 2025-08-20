# MUJ Campus Navigator

A lightweight, fully client-side 3D navigation app for the MUJ campus.

## How it works
- Three.js renders a Blender-exported campus model (`assets/muj_campus.glb`).
- A graph of nodes (`data/nodes.json`) and edges (`data/edges.json`) defines walkable paths across campus. Each node can have a `qrId` printed on a physical QR code.
- Scanning a QR (or entering the code manually) sets your current node. Choose a destination via dropdown or ask the chatbot to navigate.
- A* computes the shortest path and highlights it in the 3D view.

## Quick start
1. Serve the folder as static files (you can use Python):
   ```bash
   cd muj_nav
   python3 -m http.server 8080
   ```
   Then open `http://localhost:8080/` in your browser.

2. Place your Blender export at `assets/muj_campus.glb`. The app will still run if the file is missing, but without the model.

3. Edit data:
   - `data/nodes.json`: nodes with `id`, `label`, `position {x,y,z}`, and optional `qrId`.
   - `data/edges.json`: undirected edges `{ from, to, weight? }`. If `weight` is missing, straight-line distance is used.
   - `data/keywords.json`: destinations and keyword aliases used by the chatbot and dropdown.

4. QR scanning
   - A minimal shim is bundled at `libs/qr-scanner.min.js`. Replace it with the real library if you want camera scanning: https://github.com/nimiq/qr-scanner

## Notes
- No external map APIs required; everything runs locally. Three.js and loaders are fetched from an ESM CDN.
- The 3D path is drawn slightly above the ground to avoid z-fighting with the model or grid.