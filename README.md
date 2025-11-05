# Markdown Previewer

[![DeepWiki](https://img.shields.io/badge/DeepWiki-markdown--previewer-blue.svg?color=teal&logo=data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACwAAAAyCAYAAAAnWDnqAAAAAXNSR0IArs4c6QAAA05JREFUaEPtmUtyEzEQhtWTQyQLHNak2AB7ZnyXZMEjXMGeK/AIi+QuHrMnbChYY7MIh8g01fJoopFb0uhhEqqcbWTp06/uv1saEDv4O3n3dV60RfP947Mm9/SQc0ICFQgzfc4CYZoTPAswgSJCCUJUnAAoRHOAUOcATwbmVLWdGoH//PB8mnKqScAhsD0kYP3j/Yt5LPQe2KvcXmGvRHcDnpxfL2zOYJ1mFwrryWTz0advv1Ut4CJgf5uhDuDj5eUcAUoahrdY/56ebRWeraTjMt/00Sh3UDtjgHtQNHwcRGOC98BJEAEymycmYcWwOprTgcB6VZ5JK5TAJ+fXGLBm3FDAmn6oPPjR4rKCAoJCal2eAiQp2x0vxTPB3ALO2CRkwmDy5WohzBDwSEFKRwPbknEggCPB/imwrycgxX2NzoMCHhPkDwqYMr9tRcP5qNrMZHkVnOjRMWwLCcr8ohBVb1OMjxLwGCvjTikrsBOiA6fNyCrm8V1rP93iVPpwaE+gO0SsWmPiXB+jikdf6SizrT5qKasx5j8ABbHpFTx+vFXp9EnYQmLx02h1QTTrl6eDqxLnGjporxl3NL3agEvXdT0WmEost648sQOYAeJS9Q7bfUVoMGnjo4AZdUMQku50McDcMWcBPvr0SzbTAFDfvJqwLzgxwATnCgnp4wDl6Aa+Ax283gghmj+vj7feE2KBBRMW3FzOpLOADl0Isb5587h/U4gGvkt5v60Z1VLG8BhYjbzRwyQZemwAd6cCR5/XFWLYZRIMpX39AR0tjaGGiGzLVyhse5C9RKC6ai42ppWPKiBagOvaYk8lO7DajerabOZP46Lby5wKjw1HCRx7p9sVMOWGzb/vA1hwiWc6jm3MvQDTogQkiqIhJV0nBQBTU+3okKCFDy9WwferkHjtxib7t3xIUQtHxnIwtx4mpg26/HfwVNVDb4oI9RHmx5WGelRVlrtiw43zboCLaxv46AZeB3IlTkwouebTr1y2NjSpHz68WNFjHvupy3q8TFn3Hos2IAk4Ju5dCo8B3wP7VPr/FGaKiG+T+v+TQqIrOqMTL1VdWV1DdmcbO8KXBz6esmYWYKPwDL5b5FA1a0hwapHiom0r/cKaoqr+27/XcrS5UwSMbQAAAABJRU5ErkJggg==)](https://deepwiki.com/alireza-malek/markdown-previewer)
[![Version](https://img.shields.io/badge/dynamic/regex?url=https://raw.githubusercontent.com/alireza-malek/markdown-previewer/refs/heads/main/sw.js&search=const%20VERSION%20%3D%20%27%28.%2A%3F%29%27%3B&replace=$1&label=version&color=mediumpurple)](https://github.com/alireza-malek/markdown-previewer)
[![Size](https://img.shields.io/github/size/alireza-malek/markdown-previewer/markdown-previewer.html?label=html%20size)](https://github.com/alireza-malek/markdown-previewer)

A minimal, RTL-friendly Markdown previewer you can deploy anywhere. It ships as a single **`markdown-previewer.html`** file with **no build** and **no dependencies** that works even **offline**. Just open it, or publish it on any static host.

## Quick start

- **Open locally:** Download `markdown-previewer.html` and double‑click it; it works without an internet connection.
- **Host on the web:** Upload `markdown-previewer.html`, `sw.js`, and `manifest.webmanifest` together.  
  Visit once online to cache; after that, it also works offline (like “offline Google Docs”). See [Host on the web](#host-on-the-web).

## Features

- **RTL-aware rendering**
- **Vazirmatn font baked in**
- **Autosave to browser**
- **Edit multiple documents**
- **Share by link**
- **Download as .md or PDF**
- **Syntax highlighting**
- **Dark theme**
- **Mobile-friendly**
- **PWA offline** when hosted (via `sw.js` + `manifest.webmanifest`)

## Host on the web

### GitHub Pages

1. **Fork** this repository.

2. Go to **Settings → Pages**.

3. Under **Build and deployment**, set:

   - **Source:** Deploy from a branch
   - **Branch:** main
   - **Folder:** / (root)

4. Save. After a short build, your app will be live at
   `https://<your-github-username>.github.io/markdown-previewer/`

5. Visit it once online → it installs the service worker and will open even when you are offline.

### Other Hosts

Upload these files together to your hosting root:

- `markdown-previewer.html`
- `sw.js` (optional, for offline use)
- `manifest.webmanifest` (optional, for offline use)

**nginx**

```nginx
root /var/www/markdown-previewer;
index markdown-previewer.html index.html;
types { application/manifest+json webmanifest; }
```

**Apache**

```apache
DirectoryIndex markdown-previewer.html index.html
AddType application/manifest+json .webmanifest
```

**cPanel**

Upload files to `public_html/markdown-previewer/`. Rename `markdown-previewer.html` to `index.html` or set it as the directory index.

## Tech

- [marked](https://github.com/markedjs/marked) for Markdown → HTML
- [highlight.js](https://highlightjs.org/) for code highlighting
- [lz-string](https://github.com/pieroxy/lz-string) for hash-based share links
- Minimal vanilla JS + CSS

## Contributing

1. Edit **`src/markdown-previewer.dev.html`**.
2. Preview locally (file:// or a simple static server).
3. Build the offline single file (requires Node 18+):

   ```bash
   node src/scripts/build.mjs
   ```

   This inlines all `<script src="…">` into `<script>…</script>`, fetches the font files, and embeds them as base64 `data:` URLs, so no network requests will be sent for CDN/fonts.

4. Update the semantic `VERSION` variable in `sw.js` to invalidate/refresh the service worker cache.
5. Test `./markdown-previewer.html` by double‑clicking it. It should work with no internet connection.
6. Commit both your `src/` changes and the auto-generated `markdown-previewer.html`.

## License

MIT © 2025
