# AerialSplat Interactive Results Platform

Standalone static results viewer for the MSc thesis website.

## Contents

- `index.html` - interactive result cards, metric charts, checkpoint tables, and swipe comparisons.
- `splat_viewer.html` - fullscreen 3D Gaussian Splatting viewer.
- `assets/results/` - lightweight result manifest data and preview images.
- `css/` and `js/` - page styling and client-side logic.
- `logos/` - footer institution and funding logos.

## Large 3D Assets

The `.rad` splat files are not stored in this folder. The 3D viewer loads them from:

`https://raw.githubusercontent.com/geomatupen/AerialSplat_research_outputs/main/splats_test`

This keeps the submitted thesis website smaller while still allowing the interactive viewer to load selected 3D results.

## Local Preview

Run a local static server from this folder:

```powershell
cd D:\AerialSplat\Thesis-Results-Platform
python -m http.server 5502
```

Then open:

`http://127.0.0.1:5502/`

## Deployment

This folder can be deployed directly with GitHub Pages or another static hosting service. No backend is required.

Recommended GitHub Pages URL:

`https://geomatupen.github.io/Thesis-Results-Platform/`
