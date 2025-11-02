# Markdown Previewer

A minimal, RTL-friendly Markdown previewer you can deploy anywhere. It ships as a single **`markdown-previewer.html`** file with **no build** and **no dependencies** that works even **offline**. Just open it, or publish it on any static host.

## Quick start

- **Open locally:** download `markdown-previewer.html` and double‑click, it works without internet.
- **Host on the web:** upload `markdown-previewer.html`, `sw.js`, `manifest.webmanifest` together.  
  Visit once online to cache; after that it also works offline (like “offline Google Docs”). See [Host on the web](#host-on-the-web)

## Features

- **RTL-aware rendering**
- **Vazirmatn font baked in**
- **Autosave to browser**
- **Edit multiple documents**
- **Share by link**
- **Download as .md or PDF**
- **Syntax highlighting**
- **Dark theme**
- **Mobile friendly**
- **PWA offline** when hosted (via `sw.js` + `manifest.webmanifest`)

## Tech

- [marked](https://github.com/markedjs/marked) for Markdown → HTML
- [highlight.js](https://highlightjs.org/) for code highlighting
- [lz-string](https://pieroxy.net/blog/pages/lz-string/) for hash-based share links
- Minimal vanilla JS + CSS, no build tools

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

## Contributing

1. Edit **`src/markdown-previewer.dev.html`**.
2. Preview locally (file:// or a simple static server).
3. Build the offline single file (requires Node 18+):

   ```bash
   node src/scripts/make-offline.mjs
   ```

   This inlines all `<script src="…">` into `<script>…</script>` and fetches the font files and embeds them as base64 `data:` URLs, so no network requests will be sent for CDNs.

4. Test `./markdown-previewer.html` by double‑clicking it.
5. Commit both `src/` changes and the auto-generated `markdown-previewer.html`:

## License

MIT © 2025
