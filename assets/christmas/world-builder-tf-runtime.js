/* Exact code-only conversion of 21 unique native-resolution assets from the uploaded Time Fantasy Christmas pack.
   2x/3x scale duplicates and duplicate xmas_reindeer copies are intentionally omitted. */
(() => {
  'use strict';
  const PACK = window.__WB_TF_PACK || '';
  try { delete window.__WB_TF_PACK; } catch (_) {}
  const CELLS = {"TF Igloo Tiles.png":[16,16],"TF Christmas Presents.png":[16,16],"TF Christmas Trees & Gifts.png":[16,16],"TF Christmas Decorations.png":[16,16],"TF Gnome A.png":[26,36],"TF Gnome B.png":[26,36],"TF Reindeer.png":[52,53],"TF Reindeer Child.png":[52,53],"TF Reindeer B.png":[52,53],"TF Rudolph Adult.png":[52,53],"TF Rudolph Adult B.png":[52,53],"TF Rudolph Child.png":[52,53],"TF Jesus.png":[26,36],"TF Mrs Claus.png":[26,36],"TF Santa.png":[26,36],"TF Elf A.png":[26,36],"TF Elf B.png":[26,36],"TF Polar Bear.png":[42,36],"TF Polar Bear Cub.png":[42,36],"TF Snowmen Tiles.png":[16,16],"TF Toy Tiles.png":[16,16]};
  const assets = new Map();
  const canvases = new Map();
  function base64Bytes(value) { const raw=atob(value),out=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);return out; }
  async function gunzip(value) {
    const bytes=base64Bytes(value);
    if(typeof DecompressionStream!=='function')throw new Error('This browser does not support DecompressionStream.');
    const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }
  function readU16(b,p){return b[p]|(b[p+1]<<8)}
  function readU32(b,p){return (b[p]|(b[p+1]<<8)|(b[p+2]<<16)|(b[p+3]<<24))>>>0}
  function parse(b){
    let p=0,count=b[p++];const decoder=new TextDecoder();
    for(let a=0;a<count;a++){
      const nl=b[p++],name=decoder.decode(b.slice(p,p+nl));p+=nl;
      const width=readU16(b,p);p+=2;const height=readU16(b,p);p+=2;const pc=b[p++];
      const palette=b.slice(p,p+pc*4);p+=pc*4;const rc=readU32(b,p);p+=4;
      const rgba=new Uint8ClampedArray(width*height*4);let pixel=0;
      for(let r=0;r<rc;r++){const len=readU16(b,p);p+=2;const ci=b[p++]*4;for(let n=0;n<len;n++,pixel++){const q=pixel*4;rgba[q]=palette[ci];rgba[q+1]=palette[ci+1];rgba[q+2]=palette[ci+2];rgba[q+3]=palette[ci+3];}}
      if(pixel!==width*height)throw new Error('Corrupt Time Fantasy coded asset: '+name);
      assets.set(name,{name,width,height,rgba,cell:CELLS[name]||null,pack:'time-fantasy-christmas'});
    }
    return api;
  }
  function requireAsset(name){const a=assets.get(name);if(!a)throw new Error('Unknown Time Fantasy Christmas asset: '+name);return a}
  function canvas(name){if(canvases.has(name))return canvases.get(name);const a=requireAsset(name),c=document.createElement('canvas');c.width=a.width;c.height=a.height;const x=c.getContext('2d');x.imageSmoothingEnabled=false;x.putImageData(new ImageData(new Uint8ClampedArray(a.rgba),a.width,a.height),0,0);canvases.set(name,c);return c}
  function frame(name,index=0,cellWidth=null,cellHeight=null){const a=requireAsset(name),cell=a.cell,cw=cellWidth||cell?.[0]||a.width,ch=cellHeight||cell?.[1]||a.height,cols=Math.max(1,Math.floor(a.width/cw)),rows=Math.max(1,Math.floor(a.height/ch)),count=cols*rows,safe=((index%count)+count)%count,sx=(safe%cols)*cw,sy=Math.floor(safe/cols)*ch,out=document.createElement('canvas');out.width=cw;out.height=ch;const x=out.getContext('2d');x.imageSmoothingEnabled=false;x.drawImage(canvas(name),sx,sy,cw,ch,0,0,cw,ch);return out}
  function draw(ctx,name,x,y,options={}){const src=options.frame==null?canvas(name):frame(name,options.frame,options.cellWidth,options.cellHeight),w=options.width??src.width,h=options.height??src.height;ctx.save();ctx.imageSmoothingEnabled=false;ctx.globalAlpha=options.alpha??1;if(options.flipX||options.flipY){ctx.translate(x+(options.flipX?w:0),y+(options.flipY?h:0));ctx.scale(options.flipX?-1:1,options.flipY?-1:1);ctx.drawImage(src,0,0,w,h)}else ctx.drawImage(src,x,y,w,h);ctx.restore()}
  function metadata(name){const a=requireAsset(name);return {name:a.name,width:a.width,height:a.height,cell:a.cell?{width:a.cell[0],height:a.cell[1]}:null,pack:a.pack}}
  const api={ready:null,names:[],canvas,frame,draw,metadata,get(name){return requireAsset(name)}};
  api.ready=gunzip(PACK).then(parse).then(()=>{api.names=Object.freeze([...assets.keys()]);return api});
  window.WorldBuilderExtraAssets=api;
})();