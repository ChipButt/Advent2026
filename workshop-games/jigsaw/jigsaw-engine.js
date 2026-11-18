(function(global){
  'use strict';

  const defaults = {
    rows: 6,
    columns: 6,
    guideOpacity: 0,
    snapTolerance: 0.24,
    snapDuration: 125,
    pieceScaleOnHold: 1.025,
    seed: 'gamebox-jigsaw',
    sound: true,
    vibration: true,
    onProgress: null,
    onComplete: null
  };

  function clamp(v,min,max){ return Math.max(min,Math.min(max,v)); }
  function easeOutCubic(t){ return 1-Math.pow(1-t,3); }

  function hashSeed(value){
    let h=2166136261>>>0;
    const s=String(value);
    for(let i=0;i<s.length;i++){
      h^=s.charCodeAt(i);
      h=Math.imul(h,16777619);
    }
    return h>>>0;
  }

  function mulberry32(seed){
    let a=seed>>>0;
    return function(){
      a|=0; a=(a+0x6D2B79F5)|0;
      let t=Math.imul(a^(a>>>15),1|a);
      t=(t+Math.imul(t^(t>>>7),61|t))^t;
      return ((t^(t>>>14))>>>0)/4294967296;
    };
  }

  function point(x0,y0,x1,y1,t,nx,ny,n){
    return {x:x0+(x1-x0)*t+nx*n,y:y0+(y1-y0)*t+ny*n};
  }

  function addEdge(path,x0,y0,x1,y1,nx,ny,shape,depth){
    if(!shape){ path.lineTo(x1,y1); return; }
    const d=depth*shape;

    // Traditional cardboard-jigsaw profile:
    // long straight shoulder, narrow neck, round bulb, narrow neck, straight shoulder.
    const shoulderIn=point(x0,y0,x1,y1,.30,nx,ny,0);
    const neckIn=point(x0,y0,x1,y1,.35,nx,ny,d*.22);
    const headLeft=point(x0,y0,x1,y1,.46,nx,ny,d);
    const headRight=point(x0,y0,x1,y1,.54,nx,ny,d);
    const neckOut=point(x0,y0,x1,y1,.65,nx,ny,d*.22);
    const shoulderOut=point(x0,y0,x1,y1,.70,nx,ny,0);

    path.lineTo(shoulderIn.x,shoulderIn.y);

    // Turn sharply into the narrow neck.
    let c1=point(x0,y0,x1,y1,.335,nx,ny,0);
    let c2=point(x0,y0,x1,y1,.35,nx,ny,d*.08);
    path.bezierCurveTo(c1.x,c1.y,c2.x,c2.y,neckIn.x,neckIn.y);

    // Flare outward into the rounded head.
    c1=point(x0,y0,x1,y1,.35,nx,ny,d*.62);
    c2=point(x0,y0,x1,y1,.395,nx,ny,d*.98);
    path.bezierCurveTo(c1.x,c1.y,c2.x,c2.y,headLeft.x,headLeft.y);

    // Rounded crown of the tab/socket.
    c1=point(x0,y0,x1,y1,.485,nx,ny,d*1.05);
    c2=point(x0,y0,x1,y1,.515,nx,ny,d*1.05);
    path.bezierCurveTo(c1.x,c1.y,c2.x,c2.y,headRight.x,headRight.y);

    // Mirror the flare back into the neck.
    c1=point(x0,y0,x1,y1,.605,nx,ny,d*.98);
    c2=point(x0,y0,x1,y1,.65,nx,ny,d*.62);
    path.bezierCurveTo(c1.x,c1.y,c2.x,c2.y,neckOut.x,neckOut.y);

    // Return cleanly to the straight edge.
    c1=point(x0,y0,x1,y1,.65,nx,ny,d*.08);
    c2=point(x0,y0,x1,y1,.665,nx,ny,0);
    path.bezierCurveTo(c1.x,c1.y,c2.x,c2.y,shoulderOut.x,shoulderOut.y);

    path.lineTo(x1,y1);
  }

  function piecePath(w,h,pad,edges){
    const p=new Path2D();
    const depth=Math.min(w,h)*.21;
    p.moveTo(pad,pad);
    addEdge(p,pad,pad,pad+w,pad,0,-1,edges.top,depth);
    addEdge(p,pad+w,pad,pad+w,pad+h,1,0,edges.right,depth);
    addEdge(p,pad+w,pad+h,pad,pad+h,0,1,edges.bottom,depth);
    addEdge(p,pad,pad+h,pad,pad,-1,0,edges.left,depth);
    p.closePath();
    return p;
  }

  class GameBoxJigsaw {
    constructor(options){
      this.options=Object.assign({},defaults,options||{});
      this.canvas=this.options.canvas;
      if(!this.canvas) throw new Error('GameBoxJigsaw requires a canvas.');
      this.ctx=this.canvas.getContext('2d');
      this.hitCanvas=document.createElement('canvas');
      this.hitCtx=this.hitCanvas.getContext('2d');
      this.dragCache=document.createElement('canvas');
      this.dragCacheCtx=this.dragCache.getContext('2d');
      this.dragCacheReady=false;
      this.dragFrame=0;
      this.skipHeldRender=null;
      this.image=new Image();
      this.image.decoding='async';
      this.image.crossOrigin='anonymous';
      this.frameImage=new Image();
      this.frameImage.decoding='async';
      this.frameImage.onload=()=>this.render();
      this.frameImage.src='../assets/gamebox/kenney/ui/UI Pack - Adventure/Double/panel_border_grey_detail.png';
      this.pieces=[];
      this.edges=[];
      this.dragging=null;
      this.completed=false;
      this.completionStart=0;
      this.restartCount=0;
      this.frame=0;
      this.oldCssW=0;
      this.oldCssH=0;
      this.audioCtx=null;
      if(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches){
        this.options.snapDuration=1;
      }
      this.boundResize=()=>this.resize();
      this.boundDown=e=>this.pointerDown(e);
      this.boundMove=e=>this.pointerMove(e);
      this.boundUp=e=>this.pointerUp(e);
      this.canvas.addEventListener('pointerdown',this.boundDown);
      this.canvas.addEventListener('pointermove',this.boundMove);
      this.canvas.addEventListener('pointerup',this.boundUp);
      this.canvas.addEventListener('pointercancel',this.boundUp);
      window.addEventListener('resize',this.boundResize,{passive:true});
      this.ready=this.loadImage(this.options.image);
    }

    async loadImage(src){
      if(!src) throw new Error('GameBoxJigsaw requires an image.');
      this.image.src=src;
      if(this.image.decode){
        try{ await this.image.decode(); }
        catch(_){ await new Promise((resolve,reject)=>{this.image.onload=resolve;this.image.onerror=reject;}); }
      }else{
        await new Promise((resolve,reject)=>{this.image.onload=resolve;this.image.onerror=reject;});
      }
      this.makeEdges();
      this.resize(true);
      this.restart(false);
      return this;
    }

    setImage(src){
      this.completed=false;
      this.completionStart=0;
      this.image=new Image();
      this.image.decoding='async';
      this.image.crossOrigin='anonymous';
      this.ready=this.loadImage(src);
      return this.ready;
    }

    setGuideOpacity(value){
      this.options.guideOpacity=clamp(Number(value)||0,0,1);
      this.render();
    }

    setSound(enabled){ this.options.sound=!!enabled; }

    setGrid(rows,columns=rows){
      const nextRows=clamp(Math.round(Number(rows)||this.options.rows),2,13);
      const nextColumns=clamp(Math.round(Number(columns)||nextRows),2,13);
      if(this.frame){ cancelAnimationFrame(this.frame); this.frame=0; }
      this.options.rows=nextRows;
      this.options.columns=nextColumns;
      this.completed=false;
      this.completionStart=0;
      this.dragging=null;
      this.dragCacheReady=false;
      if(this.dragFrame){ cancelAnimationFrame(this.dragFrame); this.dragFrame=0; }
      this.pieces=[];
      this.makeEdges();
      if(this.image.complete&&this.image.naturalWidth){
        this.buildPieces();
        this.restart(false);
      }else{
        this.progressChanged();
        this.render();
      }
      return {rows:nextRows,columns:nextColumns,total:nextRows*nextColumns};
    }

    makeEdges(){
      const rows=this.options.rows, cols=this.options.columns;
      const rnd=mulberry32(hashSeed(this.options.seed));
      const grid=Array.from({length:rows},()=>Array.from({length:cols},()=>({top:0,right:0,bottom:0,left:0})));
      for(let r=0;r<rows;r++){
        for(let c=0;c<cols;c++){
          if(c<cols-1){
            const s=rnd()<.5?-1:1;
            grid[r][c].right=s;
            grid[r][c+1].left=-s;
          }
          if(r<rows-1){
            const s=rnd()<.5?-1:1;
            grid[r][c].bottom=s;
            grid[r+1][c].top=-s;
          }
        }
      }
      this.edges=grid;
    }

    computeLayout(cssW,cssH){
      const frameClearance=22;
      const frameOutset=18;
      const trayGap=26;
      const boardShare=cssH<560?.48:.56;
      const side=Math.floor(Math.min(cssW-frameClearance*2, Math.max(220,cssH*boardShare), 430));
      const boardX=Math.round((cssW-side)/2);
      const boardY=frameClearance;
      const trayTop=boardY+side+trayGap;
      return {
        width:cssW,
        height:cssH,
        boardX,
        boardY,
        boardSize:side,
        frameOutset,
        trayTop,
        trayPiecesTop:trayTop+44,
        trayHeight:Math.max(90,cssH-trayTop-10)
      };
    }

    resize(first){
      const rect=this.canvas.getBoundingClientRect();
      const cssW=Math.max(280,Math.round(rect.width||this.canvas.parentElement.clientWidth||window.innerWidth));
      const cssH=Math.max(430,Math.round(rect.height||this.canvas.parentElement.clientHeight||window.innerHeight-64));
      const dpr=Math.min(2,window.devicePixelRatio||1);
      const previous=this.layout;
      const oldW=this.oldCssW||cssW, oldH=this.oldCssH||cssH;
      const loose=this.pieces.map(p=>({nx:p.x/oldW,ny:p.y/oldH,locked:p.locked}));
      this.canvas.width=Math.round(cssW*dpr);
      this.canvas.height=Math.round(cssH*dpr);
      this.dragCache.width=this.canvas.width;
      this.dragCache.height=this.canvas.height;
      this.dragCacheReady=false;
      this.ctx.setTransform(dpr,0,0,dpr,0,0);
      this.dpr=dpr;
      this.layout=this.computeLayout(cssW,cssH);
      this.oldCssW=cssW; this.oldCssH=cssH;
      if(this.image.complete&&this.image.naturalWidth){
        this.buildPieces();
        if(previous&&!first&&loose.length===this.pieces.length){
          loose.forEach((saved,i)=>{
            const p=this.pieces[i];
            if(saved.locked){ p.locked=true;p.x=p.targetX;p.y=p.targetY; }
            else{
              p.x=clamp(saved.nx*cssW,8-p.pad,cssW-p.w-8+p.pad);
              p.y=clamp(saved.ny*cssH,this.layout.trayPiecesTop-p.pad,cssH-p.h-8+p.pad);
            }
          });
        }
      }
      if(this.dragging){ this.dragging=null; }
      this.render();
    }

    buildPieces(){
      const rows=this.options.rows, cols=this.options.columns;
      const w=this.layout.boardSize/cols, h=this.layout.boardSize/rows;
      const pad=Math.ceil(Math.min(w,h)*.26);
      const old=this.pieces;
      const next=[];
      for(let r=0;r<rows;r++){
        for(let c=0;c<cols;c++){
          const id=r*cols+c;
          const pCanvas=document.createElement('canvas');
          pCanvas.width=Math.ceil((w+pad*2)*this.dpr);
          pCanvas.height=Math.ceil((h+pad*2)*this.dpr);
          const pc=pCanvas.getContext('2d');
          pc.setTransform(this.dpr,0,0,this.dpr,0,0);
          const path=piecePath(w,h,pad,this.edges[r][c]);
          pc.save();
          pc.clip(path);
          pc.drawImage(this.image,-c*w+pad,-r*h+pad,this.layout.boardSize,this.layout.boardSize);
          pc.restore();
          pc.lineJoin='round';
          pc.strokeStyle='rgba(255,255,255,.48)';
          pc.lineWidth=1.1;
          pc.stroke(path);
          pc.strokeStyle='rgba(7,25,43,.28)';
          pc.lineWidth=.7;
          pc.stroke(path);
          const prev=old[id];
          next.push({
            id,row:r,col:c,w,h,pad,canvas:pCanvas,path,
            targetX:this.layout.boardX+c*w,
            targetY:this.layout.boardY+r*h,
            x:prev?prev.x:0,y:prev?prev.y:0,
            locked:prev?prev.locked:false,
            z:prev?prev.z:id,
            anim:null
          });
        }
      }
      this.pieces=next;
    }

    scatter(){
      const rnd=mulberry32(hashSeed(this.options.seed+'-scatter-'+this.restartCount));
      const trayTop=this.layout.trayPiecesTop;
      const maxY=Math.max(trayTop+4,this.layout.height-this.pieces[0].h-10);
      this.pieces.forEach((p,i)=>{
        p.locked=false; p.anim=null; p.z=i;
        p.x=clamp(10+rnd()*(this.layout.width-p.w-20),8-p.pad,this.layout.width-p.w-8+p.pad);
        p.y=clamp(trayTop+rnd()*Math.max(1,maxY-trayTop),trayTop-p.pad,maxY);
      });
    }

    restart(increment=true){
      if(increment) this.restartCount++;
      this.completed=false;
      this.completionStart=0;
      this.dragging=null;
      this.dragCacheReady=false;
      if(this.dragFrame){ cancelAnimationFrame(this.dragFrame); this.dragFrame=0; }
      if(!this.pieces.length&&this.image.complete&&this.image.naturalWidth) this.buildPieces();
      if(this.pieces.length) this.scatter();
      this.progressChanged();
      this.render();
    }

    progressChanged(){
      const placed=this.pieces.filter(p=>p.locked).length;
      if(typeof this.options.onProgress==='function') this.options.onProgress({placed,total:this.pieces.length});
    }

    pointerPos(e){
      const r=this.canvas.getBoundingClientRect();
      return {x:e.clientX-r.left,y:e.clientY-r.top};
    }

    pointerDown(e){
      if(this.completed||!this.pieces.length) return;
      const pt=this.pointerPos(e);
      const candidates=this.pieces.filter(p=>!p.locked&&!p.anim).sort((a,b)=>b.z-a.z);
      const p=candidates.find(piece=>{
        const localX=pt.x-(piece.x-piece.pad), localY=pt.y-(piece.y-piece.pad);
        return this.hitCtx.isPointInPath(piece.path,localX,localY) ||
          (e.pointerType==='touch' && pt.x>=piece.x-5 && pt.x<=piece.x+piece.w+5 && pt.y>=piece.y-5 && pt.y<=piece.y+piece.h+5);
      });
      if(!p) return;
      e.preventDefault();
      this.canvas.setPointerCapture(e.pointerId);
      const maxZ=Math.max(0,...this.pieces.map(q=>q.z));
      p.z=maxZ+1;
      this.dragging={piece:p,pointerId:e.pointerId,grabX:pt.x-p.x,grabY:pt.y-p.y};
      this.buildDragCache(p);
    }

    pointerMove(e){
      if(!this.dragging||e.pointerId!==this.dragging.pointerId) return;
      e.preventDefault();
      const pt=this.pointerPos(e), p=this.dragging.piece;
      p.x=clamp(pt.x-this.dragging.grabX,-p.pad+4,this.layout.width-p.w+p.pad-4);
      p.y=clamp(pt.y-this.dragging.grabY,-p.pad+4,this.layout.height-p.h+p.pad-4);
      if(!this.dragFrame){
        this.dragFrame=requestAnimationFrame(()=>{
          this.dragFrame=0;
          this.renderDragFrame();
        });
      }
    }

    pointerUp(e){
      if(!this.dragging||e.pointerId!==this.dragging.pointerId) return;
      e.preventDefault();
      const p=this.dragging.piece;
      try{ this.canvas.releasePointerCapture(e.pointerId); }catch(_){ }
      if(this.dragFrame){ cancelAnimationFrame(this.dragFrame); this.dragFrame=0; }
      this.dragging=null;
      this.dragCacheReady=false;
      const distance=Math.hypot(p.x-p.targetX,p.y-p.targetY);
      const threshold=Math.min(p.w,p.h)*this.options.snapTolerance;
      if(distance<=threshold) this.snapPiece(p);
      else this.render();
    }

    snapPiece(p){
      p.anim={fromX:p.x,fromY:p.y,start:performance.now(),duration:this.options.snapDuration};
      this.startLoop();
    }

    buildDragCache(piece){
      if(!this.layout) return;
      this.skipHeldRender=piece;
      this.render();
      this.skipHeldRender=null;
      const dc=this.dragCacheCtx;
      dc.setTransform(1,0,0,1,0,0);
      dc.clearRect(0,0,this.dragCache.width,this.dragCache.height);
      dc.drawImage(this.canvas,0,0);
      this.dragCacheReady=true;
      this.renderDragFrame();
    }

    renderDragFrame(){
      if(!this.dragging||!this.dragCacheReady) return;
      const c=this.ctx;
      c.save();
      c.setTransform(1,0,0,1,0,0);
      c.clearRect(0,0,this.canvas.width,this.canvas.height);
      c.drawImage(this.dragCache,0,0);
      c.restore();
      c.setTransform(this.dpr,0,0,this.dpr,0,0);
      this.drawPiece(this.dragging.piece,true);
    }

    startLoop(){
      if(this.frame) return;
      const tick=(now)=>{
        this.frame=0;
        let active=false;
        this.pieces.forEach(p=>{
          if(!p.anim) return;
          const t=clamp((now-p.anim.start)/p.anim.duration,0,1);
          const k=easeOutCubic(t);
          p.x=p.anim.fromX+(p.targetX-p.anim.fromX)*k;
          p.y=p.anim.fromY+(p.targetY-p.anim.fromY)*k;
          if(t>=1){
            p.x=p.targetX;p.y=p.targetY;p.anim=null;p.locked=true;
            this.placementFeedback();
            this.progressChanged();
            if(this.pieces.every(q=>q.locked)) this.finishPuzzle();
          }else active=true;
        });
        if(this.completed&&this.completionStart){
          const elapsed=now-this.completionStart;
          if(elapsed<1200) active=true;
        }
        this.render(now);
        if(active) this.frame=requestAnimationFrame(tick);
      };
      this.frame=requestAnimationFrame(tick);
    }

    placementFeedback(){
      if(this.options.vibration&&navigator.vibrate) navigator.vibrate(7);
      if(!this.options.sound) return;
      try{
        this.audioCtx=this.audioCtx||new (window.AudioContext||window.webkitAudioContext)();
        const ctx=this.audioCtx;
        const osc=ctx.createOscillator(), gain=ctx.createGain();
        osc.type='sine';osc.frequency.setValueAtTime(680,ctx.currentTime);osc.frequency.exponentialRampToValueAtTime(470,ctx.currentTime+.055);
        gain.gain.setValueAtTime(.0001,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.06,ctx.currentTime+.006);gain.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+.075);
        osc.connect(gain);gain.connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+.08);
      }catch(_){ }
    }

    finishPuzzle(){
      this.completed=true;
      this.completionStart=performance.now()+220;
      if(this.options.vibration&&navigator.vibrate) navigator.vibrate([18,40,28]);
      if(typeof this.options.onComplete==='function') setTimeout(()=>this.options.onComplete(),760);
      this.startLoop();
    }

    render(now=performance.now()){
      if(!this.layout) return;
      const c=this.ctx,l=this.layout;
      c.clearRect(0,0,l.width,l.height);

      // Draw the physical frame first. Puzzle artwork and pieces must always sit
      // above the inner lip so edge pieces never look tucked underneath it.
      if(this.frameImage.complete&&this.frameImage.naturalWidth){
        const img=this.frameImage;
        const sw=img.naturalWidth;
        const sh=img.naturalHeight;

        // The 2x frame has transparent centre padding inside the old 25% slice.
        // Cropping closer to the painted border makes the inner frame edge land
        // exactly on the puzzle boundary instead of leaving a visible inset.
        const src=Math.max(8,Math.round(Math.min(sw,sh)*.1875));
        const dst=l.frameOutset||16;
        const x=l.boardX-dst;
        const y=l.boardY-dst;
        const w=l.boardSize+dst*2;
        const h=l.boardSize+dst*2;
        const midSW=sw-src*2;
        const midSH=sh-src*2;
        const midDW=w-dst*2;
        const midDH=h-dst*2;

        c.save();
        c.imageSmoothingEnabled=false;

        // Corners stay crisp; only edge strips stretch along one axis.
        c.drawImage(img,0,0,src,src,x,y,dst,dst);
        c.drawImage(img,sw-src,0,src,src,x+w-dst,y,dst,dst);
        c.drawImage(img,0,sh-src,src,src,x,y+h-dst,dst,dst);
        c.drawImage(img,sw-src,sh-src,src,src,x+w-dst,y+h-dst,dst,dst);

        c.drawImage(img,src,0,midSW,src,x+dst,y,midDW,dst);
        c.drawImage(img,src,sh-src,midSW,src,x+dst,y+h-dst,midDW,dst);
        c.drawImage(img,0,src,src,midSH,x,y+dst,dst,midDH);
        c.drawImage(img,sw-src,src,src,midSH,x+w-dst,y+dst,dst,midDH);

        c.restore();
      }

      // The guide sits inside the exact puzzle opening, above the frame but
      // below every draggable/placed piece.
      if(this.image.complete&&this.image.naturalWidth&&this.options.guideOpacity>0){
        c.save();c.globalAlpha=this.options.guideOpacity;c.drawImage(this.image,l.boardX,l.boardY,l.boardSize,l.boardSize);c.restore();
      }

      const ordered=this.pieces.slice().sort((a,b)=>a.z-b.z);
      const held=this.dragging&&this.dragging.piece;
      ordered.forEach(p=>{ if(p!==held) this.drawPiece(p,false); });
      if(held&&held!==this.skipHeldRender) this.drawPiece(held,true);

      if(this.completed&&this.completionStart&&now>=this.completionStart){
        const alpha=clamp((now-this.completionStart)/520,0,1);
        c.save();c.globalAlpha=alpha;c.drawImage(this.image,l.boardX,l.boardY,l.boardSize,l.boardSize);c.restore();
      }
    }

    drawPiece(p,held){
      const c=this.ctx;
      c.save();
      c.shadowColor=held?'rgba(0,0,0,.48)':'rgba(0,0,0,.28)';
      c.shadowBlur=held?13:(p.locked?0:5);
      c.shadowOffsetY=held?7:(p.locked?0:3);
      const scale=held?this.options.pieceScaleOnHold:1;
      const cx=p.x+p.w/2,cy=p.y+p.h/2;
      c.translate(cx,cy);c.scale(scale,scale);c.translate(-cx,-cy);
      c.drawImage(p.canvas,p.x-p.pad,p.y-p.pad,(p.w+p.pad*2),(p.h+p.pad*2));
      c.restore();
    }

    destroy(){
      if(this.frame) cancelAnimationFrame(this.frame);
      if(this.dragFrame) cancelAnimationFrame(this.dragFrame);
      this.canvas.removeEventListener('pointerdown',this.boundDown);
      this.canvas.removeEventListener('pointermove',this.boundMove);
      this.canvas.removeEventListener('pointerup',this.boundUp);
      this.canvas.removeEventListener('pointercancel',this.boundUp);
      window.removeEventListener('resize',this.boundResize);
    }
  }

  global.GameBoxJigsaw={
    create(options){ return new GameBoxJigsaw(options); },
    Engine:GameBoxJigsaw
  };
})(window);
