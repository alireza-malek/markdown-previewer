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
  // Match url(...) with optional quotes, handling whitespace and protocol-relative URLs
  const urlRe = /url\((['"]?)([^)'"]+?)\1\)/g;
  const seen = new Set();
  const replacements = [];

  let m;
  const matches = [];
  while ((m = urlRe.exec(cssText))) {
    matches.push(m);
  }

  for (const m of matches) {
    const raw = m[2].trim();
    if (raw.startsWith('data:')) continue;
    const key = raw;
    if (seen.has(key)) continue;
    seen.add(key);

    // Resolve relative URLs against the CSS base URL
    let absUrl = raw;
    if (base) {
      // Handle protocol-relative URLs (//fonts.gstatic.com/...)
      if (raw.startsWith('//')) {
        absUrl = new URL(base).protocol + raw;
      } else {
        absUrl = toAbs(raw, base);
      }
    }

    replacements.push((async () => {
      try {
        if (!absUrl.startsWith('http')) {
          throw new Error(`Not an HTTP(S) URL: ${absUrl}`);
        }
        const bin = await fetchBin(absUrl);
        const b64 = bin.toString('base64');
        const mime = guessMime(absUrl);
        const replacement = `url(data:${mime};base64,${b64})`;
        console.log('  ✓ inlined asset', raw, '→', mime, `${(bin.length / 1024).toFixed(1)}KB`);
        // Create a regex to match all occurrences of this URL pattern (with or without quotes)
        const urlPattern = raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escape special regex chars
        const urlRegex = new RegExp(`url\\((['"]?)${urlPattern}\\1\\)`, 'g');
        return { urlRegex, replacement, raw };
      } catch (e) {
        console.warn('  ! warn: failed to inline', raw, '→', absUrl, e.message);
        return null;
      }
    })());
  }

  const results = await Promise.all(replacements);
  // Apply replacements in reverse order to preserve indices
  for (const r of results.reverse()) {
    if (r) {
      // Replace all occurrences of this URL pattern
      cssText = cssText.replace(r.urlRegex, r.replacement);
    }
  }
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
  // Match <link> tags with rel="stylesheet" and href, handling multi-line and attributes in any order
  const linkRe = /<link\s+([\s\S]*?)(\/?)>/gi;
  html = await replaceAsync(html, linkRe, async (full, attrs, selfClose) => {
    // Check if this is a stylesheet link
    const relMatch = attrs.match(/\brel\s*=\s*["']([^"']+)["']/i);
    if (!relMatch || relMatch[1].toLowerCase() !== 'stylesheet') {
      return full; // Not a stylesheet, skip
    }

    const hrefMatch = attrs.match(/\bhref\s*=\s*["']([^"']+)["']/i);
    if (!hrefMatch) {
      return full; // No href, skip
    }

    const href = hrefMatch[1];

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
    const cleanAttrs = attrs
      .replace(/\s*(?:integrity|crossorigin)\s*=\s*["'][^"']*["']/gi, '')
      .replace(/\s*rel\s*=\s*["']stylesheet["']/gi, '')
      .replace(/\s*href\s*=\s*["'][^"']*["']/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    console.log('✓ inlined <link rel="stylesheet" href="...">', href, `(${css.length} chars)`);
    return `<!-- inlined from ${href} -->\n<link rel="stylesheet"${cleanAttrs ? ' ' + cleanAttrs : ''} href="${dataHref}">`;
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
