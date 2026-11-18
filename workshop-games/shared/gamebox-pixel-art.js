/*
 * GameBox Pixel Art Toolkit v1
 * Code-only pixel-art rendering helpers for GameBox games.
 * Inspired by the architectural principles used by open-source procedural
 * pixel-art games: low internal resolution, integer upscaling, limited palettes,
 * cached code-generated sprites, deterministic texture, outlines and authored
 * animation frames. This implementation is original to GameBox.
 */
(function (global) {
  'use strict';

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const hx = n => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0');
  const rgbaCache = new Map();

  function rgba(hex) {
    if (rgbaCache.has(hex)) return rgbaCache.get(hex);
    let h = String(hex).replace('#', '');
    if (h.length === 3) h = h.replace(/(.)/g, '$1$1');
    const n = parseInt(h.slice(0, 6), 16);
    const a = h.length >= 8 ? parseInt(h.slice(6, 8), 16) : 255;
    const v = [(n >> 16) & 255, (n >> 8) & 255, n & 255, a];
    rgbaCache.set(hex, v);
    return v;
  }

  function mix(a, b, t) {
    const A = rgba(a), B = rgba(b);
    return '#' + hx(A[0] + (B[0] - A[0]) * t) + hx(A[1] + (B[1] - A[1]) * t) + hx(A[2] + (B[2] - A[2]) * t);
  }

  function alpha(c, a) {
    const q = rgba(c);
    return '#' + hx(q[0]) + hx(q[1]) + hx(q[2]) + hx(a * 255);
  }

  function hash2(x, y, seed = 0) {
    let n = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 1442695041)) | 0;
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  }

  const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
  const bayer = (x, y) => BAYER4[(y & 3) * 4 + (x & 3)];

  function ramp(cols, t, x, y, dither = 0.32) {
    const v = clamp(t, 0, 0.9999) * (cols.length - 1);
    const i = Math.floor(v), f = v - i;
    const threshold = 0.5 + (bayer(x, y) - 0.5) * dither;
    return cols[Math.min(cols.length - 1, f > threshold ? i + 1 : i)];
  }

  class Grid {
    constructor(w, h) {
      this.w = w;
      this.h = h;
      this.d = new Array(w * h).fill(null);
    }
    inb(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
    get(x, y) {
      x = Math.floor(x); y = Math.floor(y);
      return this.inb(x, y) ? this.d[y * this.w + x] : null;
    }
    set(x, y, c) {
      x = Math.floor(x); y = Math.floor(y);
      if (this.inb(x, y)) this.d[y * this.w + x] = c;
      return this;
    }
    has(x, y) { return this.get(x, y) !== null; }
    rect(x, y, w, h, c) {
      for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
        const px = x + xx, py = y + yy;
        this.set(px, py, typeof c === 'function' ? c(px, py, xx, yy, w, h) : c);
      }
      return this;
    }
    hline(x0, x1, y, c) {
      for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) this.set(x, y, c);
      return this;
    }
    vline(x, y0, y1, c) {
      for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) this.set(x, y, c);
      return this;
    }
    line(x0, y0, x1, y1, c, thick = 1) {
      x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
      const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
      const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
      let err = dx + dy;
      const o = Math.floor((thick - 1) / 2);
      for (;;) {
        if (thick <= 1) this.set(x0, y0, c);
        else this.rect(x0 - o, y0 - o, thick, thick, c);
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * err;
        if (e2 >= dy) { err += dy; x0 += sx; }
        if (e2 <= dx) { err += dx; y0 += sy; }
      }
      return this;
    }
    ellipse(cx, cy, rx, ry, c) {
      if (rx <= 0 || ry <= 0) return this;
      for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++) {
        for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
          const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry;
          if (nx * nx + ny * ny <= 1) this.set(x, y, typeof c === 'function' ? c(x, y, nx, ny) : c);
        }
      }
      return this;
    }
    poly(pts, c) {
      if (!pts || pts.length < 3) return this;
      let minY = Infinity, maxY = -Infinity, minX = Infinity, maxX = -Infinity;
      pts.forEach(([x, y]) => { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); });
      for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
        const sy = y + 0.5, xs = [];
        for (let i = 0; i < pts.length; i++) {
          const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
          if ((ay <= sy && by > sy) || (by <= sy && ay > sy)) xs.push(ax + ((sy - ay) / (by - ay)) * (bx - ax));
        }
        xs.sort((a, b) => a - b);
        for (let k = 0; k + 1 < xs.length; k += 2) {
          for (let x = Math.ceil(xs[k] - 0.5); x <= Math.floor(xs[k + 1] - 0.5); x++) {
            const nx = maxX > minX ? ((x + 0.5 - minX) / (maxX - minX)) * 2 - 1 : 0;
            const ny = maxY > minY ? ((y + 0.5 - minY) / (maxY - minY)) * 2 - 1 : 0;
            this.set(x, y, typeof c === 'function' ? c(x, y, nx, ny) : c);
          }
        }
      }
      return this;
    }
    stamp(rows, pal, ox = 0, oy = 0, flip = false) {
      const w = rows.reduce((m, r) => Math.max(m, r.length), 0);
      rows.forEach((row, y) => {
        for (let x = 0; x < row.length; x++) {
          const ch = row[x];
          if (ch === '.' || ch === ' ') continue;
          const col = pal[ch];
          if (col !== undefined) this.set(ox + (flip ? w - 1 - x : x), oy + y, col);
        }
      });
      return this;
    }
    blit(src, ox = 0, oy = 0, flip = false) {
      for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) {
        const c = src.d[y * src.w + (flip ? src.w - 1 - x : x)];
        if (c !== null) this.set(ox + x, oy + y, c);
      }
      return this;
    }
    map(fn) {
      for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
        const i = y * this.w + x, c = this.d[i];
        if (c === null) continue;
        const r = fn(c, x, y);
        if (r !== undefined) this.d[i] = r;
      }
      return this;
    }
    outline(c, diag = false) {
      const src = this.d.slice();
      const at = (x, y) => this.inb(x, y) ? src[y * this.w + x] : null;
      const n4 = [[0,-1],[1,0],[0,1],[-1,0]];
      const ns = diag ? n4.concat([[-1,-1],[1,-1],[1,1],[-1,1]]) : n4;
      for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
        if (at(x, y) !== null) continue;
        for (const [dx, dy] of ns) {
          const inner = at(x + dx, y + dy);
          if (inner !== null) {
            const oc = typeof c === 'function' ? c(inner, x, y) : c;
            if (oc) this.d[y * this.w + x] = oc;
            break;
          }
        }
      }
      return this;
    }
    rim(fn) {
      const src = this.d.slice();
      const at = (x, y) => this.inb(x, y) ? src[y * this.w + x] : null;
      for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
        const c = at(x, y); if (c === null) continue;
        const side = { n: at(x,y-1)===null, e: at(x+1,y)===null, s: at(x,y+1)===null, w: at(x-1,y)===null };
        if (side.n || side.e || side.s || side.w) {
          const r = fn(c, x, y, side); if (r !== undefined) this.set(x, y, r);
        }
      }
      return this;
    }
    clone() { const g = new Grid(this.w, this.h); g.d = this.d.slice(); return g; }
    toCanvas() {
      const c = document.createElement('canvas'); c.width = this.w; c.height = this.h;
      const ctx = c.getContext('2d'); ctx.imageSmoothingEnabled = false;
      const img = ctx.createImageData(this.w, this.h), out = img.data;
      for (let i = 0; i < this.d.length; i++) {
        const col = this.d[i]; if (col === null) continue;
        const [r,g,b,a] = rgba(col);
        out[i*4]=r; out[i*4+1]=g; out[i*4+2]=b; out[i*4+3]=a;
      }
      ctx.putImageData(img, 0, 0); return c;
    }
  }

  class PixelStage {
    constructor(canvas, w, h, fitElement) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d', { alpha: false });
      this.w = w; this.h = h;
      this.fitElement = fitElement || canvas.parentElement;
      canvas.width = w; canvas.height = h;
      this.ctx.imageSmoothingEnabled = false;
      this.resize = this.resize.bind(this);
      this.ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(this.resize) : null;
      this.ro?.observe(this.fitElement);
      addEventListener('resize', this.resize, { passive: true });
      visualViewport?.addEventListener('resize', this.resize, { passive: true });
      this.resize();
    }
    resize() {
      const r = this.fitElement.getBoundingClientRect();
      const dpr = devicePixelRatio || 1;
      const maxPhysW = Math.max(this.w, Math.floor(r.width * dpr));
      const maxPhysH = Math.max(this.h, Math.floor(r.height * dpr));
      const s = Math.max(1, Math.floor(Math.min(maxPhysW / this.w, maxPhysH / this.h)));
      this.scale = s;
      this.canvas.style.width = `${this.w * s / dpr}px`;
      this.canvas.style.height = `${this.h * s / dpr}px`;
      this.ctx.imageSmoothingEnabled = false;
    }
    destroy() {
      this.ro?.disconnect();
      removeEventListener('resize', this.resize);
      visualViewport?.removeEventListener('resize', this.resize);
    }
  }

  function memo(build) {
    const cache = new Map();
    return function (key, ...args) {
      if (!cache.has(key)) cache.set(key, build(key, ...args));
      return cache.get(key);
    };
  }

  const PAL = Object.freeze({
    ink:'#171426', deepest:'#242039', navy:'#303653', slate:'#52617a', mist:'#91a0b5',
    paper:'#f7f2df', white:'#fffdf2', cream:'#ead8b6', sand:'#d2ad7f', tan:'#ba7c5c',
    brown:'#7a493d', wood:'#965c40', woodDark:'#593743', gold:'#f2bd4f', yellow:'#ffe37a',
    rust:'#c65348', coral:'#e67672', rose:'#d26a86', plum:'#6f446f', lavender:'#9a86b8',
    blue:'#4676a9', sky:'#71b5c9', cyan:'#86d9d4', teal:'#3e847e', forest:'#346451',
    green:'#5f9564', leaf:'#79ad72', sage:'#9cb78e', grass:'#6f9f60', skin:'#d99c7b',
    skinShade:'#ad735f', hair:'#59403d', shadow:'#2a2436'
  });

  global.GBPixel = Object.freeze({ Grid, PixelStage, PAL, rgba, mix, alpha, hash2, bayer, ramp, memo, clamp });
})(window);
