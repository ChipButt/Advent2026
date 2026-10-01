/*
Exact code-only reconstruction of all 34 PNGs in the user-supplied Christmas Village asset pack.
No PNG or sidecar JSON files are required at runtime.
The payload is a custom binary palette/RLE pack compressed with gzip and embedded in this JavaScript file.
*/
(() => {
  'use strict';
  const PACK = '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';
  const CELLS = {"character.png":[16,16],"christmas-lights.png":[16,16],"fireplace.png":[16,16],"floor-tileset.png":[16,16],"hot-chocolate.png":[8,8],"house1.png":[80,64],"path-tilemap.png":[16,16],"wall-tileset.png":[16,16]};
  const assets = new Map();
  const canvases = new Map();

  function base64Bytes(value) {
    const raw=atob(value), out=new Uint8Array(raw.length);
    for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);
    return out;
  }

  async function gunzip(value) {
    const bytes=base64Bytes(value);
    if(typeof DecompressionStream!=='function')throw new Error('This browser does not support DecompressionStream.');
    const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  function readU16(b,p) { return b[p] | (b[p+1]<<8); }
  function readU32(b,p) { return (b[p] | (b[p+1]<<8) | (b[p+2]<<16) | (b[p+3]<<24)) >>> 0; }

  function parse(b) {
    let p=0;
    const count=b[p++];
    const decoder=new TextDecoder();
    for(let a=0;a<count;a++){
      const nameLen=b[p++];
      const name=decoder.decode(b.slice(p,p+nameLen));p+=nameLen;
      const width=readU16(b,p);p+=2;
      const height=readU16(b,p);p+=2;
      const paletteCount=b[p++];
      const palette=b.slice(p,p+paletteCount*4);p+=paletteCount*4;
      const runCount=readU32(b,p);p+=4;
      const rgba=new Uint8ClampedArray(width*height*4);
      let pixel=0;
      for(let r=0;r<runCount;r++){
        const len=readU16(b,p);p+=2;
        const colourIndex=b[p++]*4;
        for(let n=0;n<len;n++,pixel++){
          const q=pixel*4;
          rgba[q]=palette[colourIndex];
          rgba[q+1]=palette[colourIndex+1];
          rgba[q+2]=palette[colourIndex+2];
          rgba[q+3]=palette[colourIndex+3];
        }
      }
      if(pixel!==width*height)throw new Error('Corrupt coded asset: '+name);
      assets.set(name,{name,width,height,rgba,cell:CELLS[name]||null});
    }
    return api;
  }

  function requireAsset(name) {
    const asset=assets.get(name);
    if(!asset)throw new Error('Unknown Christmas Village asset: '+name);
    return asset;
  }

  function canvas(name) {
    if(canvases.has(name))return canvases.get(name);
    const a=requireAsset(name);
    const c=document.createElement('canvas');c.width=a.width;c.height=a.height;
    const x=c.getContext('2d');x.imageSmoothingEnabled=false;
    x.putImageData(new ImageData(new Uint8ClampedArray(a.rgba),a.width,a.height),0,0);
    canvases.set(name,c);return c;
  }

  function frame(name,index=0,cellWidth=null,cellHeight=null) {
    const a=requireAsset(name),cell=a.cell;
    const cw=cellWidth||cell?.[0]||a.width,ch=cellHeight||cell?.[1]||a.height;
    const cols=Math.max(1,Math.floor(a.width/cw)),rows=Math.max(1,Math.floor(a.height/ch)),count=cols*rows;
    const safe=((index%count)+count)%count,sx=(safe%cols)*cw,sy=Math.floor(safe/cols)*ch;
    const out=document.createElement('canvas');out.width=cw;out.height=ch;
    const x=out.getContext('2d');x.imageSmoothingEnabled=false;
    x.drawImage(canvas(name),sx,sy,cw,ch,0,0,cw,ch);return out;
  }

  function draw(ctx,name,x,y,options={}) {
    const src=options.frame==null?canvas(name):frame(name,options.frame,options.cellWidth,options.cellHeight);
    const w=options.width??src.width,h=options.height??src.height;
    ctx.save();ctx.imageSmoothingEnabled=false;ctx.globalAlpha=options.alpha??1;
    if(options.flipX||options.flipY){
      ctx.translate(x+(options.flipX?w:0),y+(options.flipY?h:0));ctx.scale(options.flipX?-1:1,options.flipY?-1:1);ctx.drawImage(src,0,0,w,h);
    } else ctx.drawImage(src,x,y,w,h);
    ctx.restore();
  }

  function metadata(name) {
    const a=requireAsset(name);
    return {name:a.name,width:a.width,height:a.height,cell:a.cell?{width:a.cell[0],height:a.cell[1]}:null};
  }

  const api={
    ready:null,
    names:[],
    canvas,frame,draw,metadata,
    get(name){return requireAsset(name);}
  };
  api.ready=gunzip(PACK).then(parse).then(()=>{api.names=Object.freeze([...assets.keys()]);return api;});
  window.VillagePixelAssets=api;
})();