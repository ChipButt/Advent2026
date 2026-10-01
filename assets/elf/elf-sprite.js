(() => {
  'use strict';

  const encoded = (window.__CUTE_ELF_PACKED || []).join('');
  const api = { data: null, cache: new Map(), ready: null };

  const DEFAULT_THEME = Object.freeze({
    hat: '#548343',
    skin: '#f2bba0',
    hair: '#b56531',
    jacket: '#548343',
    trousers: '#2d2a37',
    shoes: '#4f4238'
  });
  let theme = { ...DEFAULT_THEME };
  const boundsCache = new WeakMap();
  const openEyeCache = new Map();

  const clamp = (v, a=0, b=1) => Math.max(a, Math.min(b, v));

  function hexToRgb(hex) {
    const h = String(hex || '').replace('#','');
    if (!/^[0-9a-f]{6}$/i.test(h)) return [128,128,128];
    return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
  }

  function rgbToHsl(r,g,b) {
    r/=255; g/=255; b/=255;
    const max=Math.max(r,g,b), min=Math.min(r,g,b);
    let h=0, s=0, l=(max+min)/2;
    if (max!==min) {
      const d=max-min;
      s=l>.5 ? d/(2-max-min) : d/(max+min);
      if (max===r) h=(g-b)/d+(g<b?6:0);
      else if (max===g) h=(b-r)/d+2;
      else h=(r-g)/d+4;
      h/=6;
    }
    return [h,s,l];
  }

  function hslToRgb(h,s,l) {
    let r,g,b;
    if (!s) r=g=b=l;
    else {
      const hue2rgb=(p,q,t)=>{
        if(t<0)t+=1;if(t>1)t-=1;
        if(t<1/6)return p+(q-p)*6*t;
        if(t<1/2)return q;
        if(t<2/3)return p+(q-p)*(2/3-t)*6;
        return p;
      };
      const q=l<.5?l*(1+s):l+s-l*s, p=2*l-q;
      r=hue2rgb(p,q,h+1/3); g=hue2rgb(p,q,h); b=hue2rgb(p,q,h-1/3);
    }
    return [Math.round(r*255),Math.round(g*255),Math.round(b*255)];
  }

  const BASE_HSL = Object.fromEntries(Object.entries(DEFAULT_THEME).map(([k,v]) => [k, rgbToHsl(...hexToRgb(v))]));

  function isSkin(r,g,b) {
    return r >= 175 && g >= 105 && b >= 82 && r > g * 1.08 && g >= b * 0.78;
  }

  function isGreen(r,g,b) {
    return g >= 62 && g > r * 1.12 && g > b * 1.05 && r < 120 && b < 110;
  }

  function isHair(x,y,r,g,b) {
    if (y < 23 || y > 39) return false;
    return r >= 55 && r <= 200 && g >= 35 && g <= 125 && b <= 105 &&
      r > g * 1.10 && g > b * 1.02 && !(r - g > 95);
  }

  function isTrousers(x,y,r,g,b) {
    if (y < 47 || y > 63) return false;
    const max=Math.max(r,g,b), min=Math.min(r,g,b);
    if (max < 24 || max > 125) return false;
    if (isGreen(r,g,b)) return false;
    if (r > g * 1.45 && r > b * 1.30) return false;
    return max-min <= 45;
  }

  function isShoes(x,y,r,g,b) {
    if (y < 58) return false;
    const max=Math.max(r,g,b);
    if (max < 24 || max > 125) return false;
    if (r > g * 1.45 && r > b * 1.30) return false;
    if (isGreen(r,g,b)) return false;
    return true;
  }

  function classifyGreenComponents(image, width, height) {
    const data=image.data;
    const labels=new Int8Array(width*height);
    const seen=new Uint8Array(width*height);
    const stack=new Int32Array(width*height);
    const component=new Int32Array(width*height);

    const greenAt=(index)=>{
      const q=index*4;
      return data[q+3] && isGreen(data[q],data[q+1],data[q+2]);
    };

    for(let start=0;start<width*height;start+=1){
      if(seen[start] || !greenAt(start)) continue;
      let stackSize=0, componentSize=0, sumY=0, minY=height, maxY=0;
      stack[stackSize++]=start; seen[start]=1;

      while(stackSize){
        const index=stack[--stackSize];
        component[componentSize++]=index;
        const x=index%width, y=(index/width)|0;
        sumY+=y; if(y<minY)minY=y; if(y>maxY)maxY=y;

        if(x>0){
          const n=index-1;
          if(!seen[n] && greenAt(n)){seen[n]=1;stack[stackSize++]=n}
        }
        if(x+1<width){
          const n=index+1;
          if(!seen[n] && greenAt(n)){seen[n]=1;stack[stackSize++]=n}
        }
        if(y>0){
          const n=index-width;
          if(!seen[n] && greenAt(n)){seen[n]=1;stack[stackSize++]=n}
        }
        if(y+1<height){
          const n=index+width;
          if(!seen[n] && greenAt(n)){seen[n]=1;stack[stackSize++]=n}
        }
      }

      // The sheet's hat green islands all live in the upper head area;
      // jacket islands (including the lower tail below the belt) begin below it.
      const centreY=sumY/Math.max(1,componentSize);
      const label=(maxY<=38 || centreY<34) ? 1 : 2; // 1 hat, 2 jacket
      for(let i=0;i<componentSize;i+=1) labels[component[i]]=label;
    }
    return labels;
  }

  function componentAt(x,y,r,g,b,a,greenLabel) {
    if (!a) return null;
    if (isSkin(r,g,b)) return 'skin';
    if (greenLabel===1) return 'hat';
    if (greenLabel===2) return 'jacket';
    if (isHair(x,y,r,g,b)) return 'hair';
    if (isShoes(x,y,r,g,b)) return 'shoes';
    if (isTrousers(x,y,r,g,b)) return 'trousers';
    return null;
  }

  function recolourPixel(r,g,b,component) {
    const target = rgbToHsl(...hexToRgb(theme[component] || DEFAULT_THEME[component]));
    const source = rgbToHsl(r,g,b);
    const base = BASE_HSL[component];
    const lightDelta = source[2] - base[2];
    const l = clamp(target[2] + lightDelta, .025, .965);
    const s = clamp(target[1] * .82 + source[1] * .18, 0, 1);
    return hslToRgb(target[0], s, l);
  }

  function applyTheme(image, width, height) {
    const data=image.data;
    const greenLabels=classifyGreenComponents(image,width,height);
    for (let y=0;y<height;y++) for (let x=0;x<width;x++) {
      const index=y*width+x, q=index*4, a=data[q+3];
      if(!a) continue;
      const component=componentAt(x,y,data[q],data[q+1],data[q+2],a,greenLabels[index]);
      if(!component) continue;
      const [r,g,b]=recolourPixel(data[q],data[q+1],data[q+2],component);
      data[q]=r;data[q+1]=g;data[q+2]=b;
    }
  }

  async function inflate() {
    if (!encoded) throw new Error('Christmas elf sprite data is missing.');
    if (typeof DecompressionStream === 'undefined') {
      throw new Error('This browser does not support the built-in gzip decoder.');
    }
    const raw = atob(encoded);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  function u16(bytes, offset) {
    return bytes[offset] | (bytes[offset + 1] << 8);
  }

  function isBackgroundCandidate(r, g, b, a) {
    if (!a) return false;
    const spread = Math.max(r, g, b) - Math.min(r, g, b);
    // Flat mid-greys used by the unwanted baked background.
    if (spread <= 6 && r >= 90 && r <= 160 && g >= 90 && g <= 160 && b >= 90 && b <= 160) return true;
    // Pale blue-grey blocks that occur in the same bad walking-set backgrounds.
    if (r >= 140 && r <= 190 && g >= 160 && g <= 210 && b >= 190 && b <= 235) return true;
    return false;
  }

  function removeBakedBackground(image, width, height) {
    const data = image.data;
    const seen = new Uint8Array(width * height);
    const stack = new Int32Array(width * height);
    const component = new Int32Array(width * height);

    const candidateAt = (index) => {
      const q = index * 4;
      return isBackgroundCandidate(data[q], data[q + 1], data[q + 2], data[q + 3]);
    };

    for (let start = 0; start < width * height; start += 1) {
      if (seen[start] || !candidateAt(start)) continue;

      let stackSize = 0;
      let componentSize = 0;
      stack[stackSize++] = start;
      seen[start] = 1;

      while (stackSize) {
        const index = stack[--stackSize];
        component[componentSize++] = index;
        const x = index % width;
        const y = (index / width) | 0;

        if (x > 0) {
          const n = index - 1;
          if (!seen[n] && candidateAt(n)) { seen[n] = 1; stack[stackSize++] = n; }
        }
        if (x + 1 < width) {
          const n = index + 1;
          if (!seen[n] && candidateAt(n)) { seen[n] = 1; stack[stackSize++] = n; }
        }
        if (y > 0) {
          const n = index - width;
          if (!seen[n] && candidateAt(n)) { seen[n] = 1; stack[stackSize++] = n; }
        }
        if (y + 1 < height) {
          const n = index + width;
          if (!seen[n] && candidateAt(n)) { seen[n] = 1; stack[stackSize++] = n; }
        }
      }

      // Only remove large connected regions. Small greys/blues in the elf itself stay untouched.
      if (componentSize >= 180) {
        for (let i = 0; i < componentSize; i += 1) {
          data[component[i] * 4 + 3] = 0;
        }
      }
    }
  }

  function reopenIdleSouthEyes(frameIndex) {
    const safeIndex = ((frameIndex % 8) + 8) % 8;
    if (safeIndex !== 4 && safeIndex !== 5) return buildFrame(40 + safeIndex);
    if (openEyeCache.has(safeIndex)) return openEyeCache.get(safeIndex);

    const target = buildFrame(40 + safeIndex);
    // Frame 4 follows open frame 3; frame 5 precedes open frame 6.
    // Both blink frames sit one source pixel lower than their open-eye donor.
    const donor = safeIndex === 4 ? buildFrame(43) : buildFrame(46);
    const canvas = document.createElement('canvas');
    canvas.width = target.width;
    canvas.height = target.height;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(target, 0, 0);

    if (safeIndex === 4) {
      // Frame 3 open eyes: left/right x 34–37 / 45–48, y 35–36.
      // Copy a tiny surrounding skin patch down by one pixel into blink frame 4.
      ctx.drawImage(donor, 23, 24, 6, 4, 23, 25, 6, 4);
      ctx.drawImage(donor, 34, 24, 6, 4, 34, 25, 6, 4);
    } else {
      // Frame 6 open eyes occupy y 34–36. Align them one pixel lower in frame 5.
      ctx.drawImage(donor, 23, 23, 6, 5, 23, 24, 6, 5);
      ctx.drawImage(donor, 34, 23, 6, 5, 34, 24, 6, 5);
    }

    openEyeCache.set(safeIndex, canvas);
    return canvas;
  }

  function buildFrame(frameIndex) {
    if (api.cache.has(frameIndex)) return api.cache.get(frameIndex);

    const { width: cellWidth, height: cellHeight, palette, indicesOffset, bytes } = api.data;
    const frameCount = 56;
    const safeIndex = ((frameIndex % frameCount) + frameCount) % frameCount;

    // The packed source uses 84×84 sheet cells, but the character itself was
    // authored as 64×64 inside a 10px border on each side.
    const sourceCanvas = document.createElement('canvas');
    sourceCanvas.width = cellWidth;
    sourceCanvas.height = cellHeight;
    const sourceCtx = sourceCanvas.getContext('2d');
    sourceCtx.imageSmoothingEnabled = false;
    const image = sourceCtx.createImageData(cellWidth, cellHeight);
    const out = image.data;

    const pixels = cellWidth * cellHeight;
    let p = indicesOffset + safeIndex * pixels * 2;

    for (let i = 0; i < pixels; i += 1, p += 2) {
      const paletteIndex = u16(bytes, p);
      if (paletteIndex === 65535) continue;
      const [r, g, b] = palette[paletteIndex];
      const q = i * 4;
      out[q] = r;
      out[q + 1] = g;
      out[q + 2] = b;
      out[q + 3] = 255;
    }

    // Clean and recolour while coordinates still match the original 84×84 cells.
    removeBakedBackground(image, cellWidth, cellHeight);
    applyTheme(image, cellWidth, cellHeight);
    sourceCtx.putImageData(image, 0, 0);

    // Runtime frames are the intended 64×64 character asset.
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, 64, 64);
    ctx.drawImage(sourceCanvas, 10, 10, 64, 64, 0, 0, 64, 64);

    api.cache.set(safeIndex, canvas);
    return canvas;
  }


  api.frameWidth = 64;
  api.frameHeight = 64;
  api.cellWidth = 84;
  api.cellHeight = 84;
  api.defaults = { ...DEFAULT_THEME };
  api.getTheme = () => ({ ...theme });
  api.setTheme = (next = {}) => {
    theme = { ...DEFAULT_THEME, ...next };
    api.cache.clear();
    openEyeCache.clear();
    return api.getTheme();
  };
  api.bounds = (canvas) => {
    if (!canvas) return { minX:0,minY:0,maxX:63,maxY:63,width:64,height:64 };
    if (boundsCache.has(canvas)) return boundsCache.get(canvas);
    const x=canvas.getContext('2d',{willReadFrequently:true});
    const d=x.getImageData(0,0,canvas.width,canvas.height).data;
    let minX=canvas.width,minY=canvas.height,maxX=-1,maxY=-1;
    for(let yy=0;yy<canvas.height;yy++)for(let xx=0;xx<canvas.width;xx++){
      if(d[(yy*canvas.width+xx)*4+3]){
        if(xx<minX)minX=xx;if(xx>maxX)maxX=xx;if(yy<minY)minY=yy;if(yy>maxY)maxY=yy;
      }
    }
    const b=maxX<0?{minX:0,minY:0,maxX:canvas.width-1,maxY:canvas.height-1,width:canvas.width,height:canvas.height}:
      {minX,minY,maxX,maxY,width:maxX-minX+1,height:maxY-minY+1};
    boundsCache.set(canvas,b); return b;
  };

  const directions = ['south','south-east','east','north-east','north','north-west','west','south-west'];

  api.rotation = (direction) => {
    const index = directions.indexOf(direction);
    return buildFrame(index < 0 ? 0 : index);
  };

  api.walk = (direction, frame = 0) => {
    const row = { south: 1, east: 2, north: 3, west: 4 }[direction];
    return row == null ? api.rotation(direction) : buildFrame(row * 8 + (((frame % 8) + 8) % 8));
  };

  api.idle = (direction, frame = 0, blinkEnabled = true) => {
    const safeFrame = ((frame % 8) + 8) % 8;
    const row = { south: 5, north: 6 }[direction];
    if (row == null) return api.rotation(direction);
    if (direction === 'south' && !blinkEnabled && (safeFrame === 4 || safeFrame === 5)) {
      return reopenIdleSouthEyes(safeFrame);
    }
    return buildFrame(row * 8 + safeFrame);
  };

  api.ready = inflate().then((bytes) => {
    const width = u16(bytes, 0);
    const height = u16(bytes, 2);
    const paletteCount = u16(bytes, 4);
    const palette = [];
    let offset = 6;
    for (let i = 0; i < paletteCount; i += 1, offset += 3) {
      palette.push([bytes[offset], bytes[offset + 1], bytes[offset + 2]]);
    }
    const expected = offset + 56 * width * height * 2;
    if (bytes.length !== expected) throw new Error('Coded elf sprite data failed its integrity check.');
    api.data = { width, height, palette, indicesOffset: offset, bytes, frameCount: 56 };
    window.__CUTE_ELF_PACKED = null;
    return api;
  });

  window.CuteElfSprite = api;
})();