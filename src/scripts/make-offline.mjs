#!/usr/bin/env node
// src/scripts/make-offline.mjs
// Build a fully-offline single HTML: inline <script src>, convert CSS <link> to data URLs,
// and embed Google Fonts as base64 inside the CSS. Always verbose logs. Node 18+ only.

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INPUT = path.join(__dirname, '..', 'markdown-previewer.dev.html');
const OUTPUT = path.join(__dirname, '..', '..', 'markdown-previewer.html');

const abs = (p, baseDir) => path.isAbsolute(p) ? p : path.join(baseDir, p);
const isHttp = (u) => /^https?:\/\//i.test(u);
const guessMime = (u) => {
  const ext = (u.split('?')[0].split('#')[0].split('.').pop() || '').toLowerCase();
  if (ext === 'woff2') return 'font/woff2';
  if (ext === 'woff') return 'font/woff';
  if (ext === 'ttf') return 'font/ttf';
  if (ext === 'otf') return 'font/otf';
  if (ext === 'svg') return 'image/svg+xml';
  if (ext === 'css') return 'text/css';
  if (ext === 'js') return 'text/javascript';
  return 'application/octet-stream';
};
const toAbs = (u, base) => new URL(u, base).toString();

async function fetchText(url) {
  console.log('→ fetch', url);
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status} ${url}`);
  return await r.text();
}
async function fetchBin(url) {
  console.log('→ fetch(bin)', url);
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status} ${url}`);
  return Buffer.from(await r.arrayBuffer());
}
async function readLocalText(rel, baseDir) {
  const p = abs(rel, baseDir);
  console.log('→ read', p);
  return await readFile(p, 'utf8');
}

async function inlineCssAssets(cssText, cssUrlOrPath) {
  const base = cssUrlOrPath ? (cssUrlOrPath.startsWith('http') ? cssUrlOrPath : 'file://' + path.resolve(cssUrlOrPath)) : null;
  const urlRe = /url\((['"]?)([^)'"]+)\1\)/g;
  const seen = new Set();
  const tasks = [];

  let m;
  while ((m = urlRe.exec(cssText))) {
    const raw = m[2];
    if (raw.startsWith('data:')) continue;
    const key = m.index + '|' + raw;
    if (seen.has(key)) continue;
    seen.add(key);

    const absUrl = base ? toAbs(raw, base) : raw;
    tasks.push((async () => {
      try {
        const bin = absUrl.startsWith('http') ? await fetchBin(absUrl) : await fetchBin(absUrl); // allow http(s) only
        const b64 = bin.toString('base64');
        const mime = guessMime(absUrl);
        const replacement = `url(data:${mime};base64,${b64})`;
        cssText = cssText.replace(m[0], replacement);
        console.log('  ✓ inlined asset', raw, '→', mime, `${(bin.length / 1024).toFixed(1)}KB`);
      } catch (e) {
        console.warn('  ! warn: failed to inline', raw, e.message);
      }
    })());
  }
  await Promise.all(tasks);
  return cssText;
}

async function processHtml(html, baseDir) {
  // 1) scripts: <script ... src="..."></script> → inline <script>...</script>
  const scriptRe = /<script([^>]*?)\ssrc=["']([^"']+)["']([^>]*)>\s*<\/script>/gi;
  html = await replaceAsync(html, scriptRe, async (full, pre, src, post) => {
    const keepAttrs = (pre + ' ' + post)
      .replace(/\s(?:integrity|crossorigin)=["'][^"']*["']/gi, '')
      .trim();
    const js = isHttp(src) ? await fetchText(src) : await readLocalText(src, baseDir);
    console.log('✓ inlined <script src="...">', src, `(${js.length} chars)`);
    return `<!-- inlined from ${src} -->\n<script${keepAttrs ? ' ' + keepAttrs : ''}>\n${js}\n</script>`;
  });

  // 2) stylesheets: keep <link> but convert href → data:text/css;base64,...
  const linkRe = /<link([^>]*?)rel=["']stylesheet["']([^>]*?)href=["']([^"']+)["']([^>]*)>/gi;
  html = await replaceAsync(html, linkRe, async (full, pre1, pre2, href, post) => {
    let css = isHttp(href) ? await fetchText(href) : await readLocalText(href, baseDir);

    // If this is Google Fonts CSS, embed font files referenced by url(...)
    const isGFonts = /fonts\.googleapis\.com/i.test(href);
    if (isGFonts) {
      css = await inlineCssAssets(css, href);
    } else {
      // Also inline url(...) assets for any CSS we pulled (best-effort)
      css = await inlineCssAssets(css, isHttp(href) ? href : abs(href, baseDir));
    }

    const b64 = Buffer.from(css, 'utf8').toString('base64');
    const dataHref = `data:text/css;base64,${b64}`;

    // Preserve attributes except integrity/crossorigin/href value
    const attrs = (pre1 + ' ' + pre2 + ' ' + post)
      .replace(/\s(?:integrity|crossorigin)=["'][^"']*["']/gi, '')
      .replace(/\shref=["'][^"']*["']/i, '')
      .trim();

    console.log('✓ inlined <link rel="stylesheet" href="...">', href, `(${css.length} chars)`);
    return `<!-- inlined from ${href} -->\n<link rel="stylesheet"${attrs ? ' ' + attrs : ''} href="${dataHref}">`;
  });

  // 3) remove preconnect/dns-prefetch (not useful offline)
  html = html.replace(/<link[^>]+rel=["'](?:preconnect|dns-prefetch)["'][^>]*>/gi, '');

  // 4) remove integrity/crossorigin anywhere else
  html = html.replace(/\s(?:integrity|crossorigin)=["'][^"']*["']/gi, '');

  return html;
}

async function build() {
  const inputPath = INPUT;
  const baseDir = path.dirname(inputPath);
  const html = await readFile(inputPath, 'utf8');
  console.log('== Building offline HTML ==');
  console.log('Input :', inputPath);
  console.log('Output:', OUTPUT);

  const banner = '<!-- AUTO-GENERATED by src/scripts/make-offline.mjs — edit src/markdown-previewer.dev.html instead. -->\n';
  const out = await processHtml(html, baseDir);
  await writeFile(OUTPUT, banner + out, 'utf8');

  console.log('✅ Generated:', OUTPUT);
}

build().catch(e => {
  console.error('❌ Build failed:', e);
  process.exit(1);
});

async function replaceAsync(str, regex, fn) {
  const out = [];
  let last = 0;
  for (const m of str.matchAll(regex)) {
    out.push(str.slice(last, m.index));
    out.push(await fn(...m));
    last = m.index + m[0].length;
  }
  out.push(str.slice(last));
  return out.join('');
}
