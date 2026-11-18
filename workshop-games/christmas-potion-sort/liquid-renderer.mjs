// Original high-DPI glossy potion glass, liquid and live animated pours.
// Pure Canvas 2D: no external sprite sheets, no fake transparency and no flat CSS bars.
const TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function roundedBottle(ctx,w,h,inset=0){
 const x=inset+w*.115,rx=w-x,y=h*.085+inset,b=h*.94-inset;
 const neckL=w*.337+inset*.2,neckR=w*.663-inset*.2,shoulder=h*.24;
 ctx.beginPath();ctx.moveTo(neckL,y);ctx.lineTo(neckR,y);
 ctx.lineTo(neckR,h*.17);ctx.bezierCurveTo(neckR+w*.02,h*.20,rx,shoulder-h*.025,rx,shoulder+h*.07);
 ctx.lineTo(rx,b-h*.075);ctx.quadraticCurveTo(rx,b,x+w*.09,b);
 ctx.lineTo(x+w*.09,b);ctx.quadraticCurveTo(x,b,x,b-h*.075);
 ctx.lineTo(x,shoulder+h*.07);ctx.bezierCurveTo(x,shoulder-h*.025,neckL-w*.02,h*.2,neckL,h*.17);
 ctx.closePath();
}
function glassShape(ctx,w,h){
 const left=w*.12,right=w*.88,top=h*.255,bottom=h*.924,rad=w*.115;
 ctx.beginPath();ctx.moveTo(left+rad,top);ctx.lineTo(right-rad,top);
 ctx.quadraticCurveTo(right,top,right,top+rad);
 ctx.lineTo(right,bottom-rad);ctx.quadraticCurveTo(right,bottom,right-rad,bottom);
 ctx.lineTo(left+rad,bottom);ctx.quadraticCurveTo(left,bottom,left,bottom-rad);
 ctx.lineTo(left,top+rad);ctx.quadraticCurveTo(left,top,left+rad,top);ctx.closePath();
}
const grad=(ctx,x,y,stop)=>{const g=ctx.createLinearGradient(x,0,y,0);for(const [p,v] of stop)g.addColorStop(p,v);return g;};
function glassRim(ctx,w,h){
 const x=w*.335,y=h*.075,ww=w*.33,hh=h*.10;
 const metallic=ctx.createLinearGradient(0,y,0,y+hh);
 metallic.addColorStop(0,"#f2ffff");metallic.addColorStop(.26,"#8dc8df");metallic.addColorStop(.56,"#2e5e7a");metallic.addColorStop(.9,"#d9faff");
 ctx.fillStyle=metallic;ctx.fillRect(x,y,ww,hh);
 ctx.strokeStyle="#d7f5ffdd";ctx.lineWidth=Math.max(1.5,w*.024);ctx.strokeRect(x,y,ww,hh);
 ctx.fillStyle="#122c44";ctx.beginPath();ctx.ellipse(w*.5,y,ww*.51,h*.018,0,0,TAU);ctx.fill();
 ctx.strokeStyle="#e8faff";ctx.lineWidth=Math.max(1,w*.012);ctx.stroke();
 ctx.fillStyle="#d3fdff55";ctx.beginPath();ctx.ellipse(w*.5,y+hh,ww*.49,h*.015,0,0,TAU);ctx.fill();
}
export function paintGlass(ctx,w,h,layers,{amount=layers.length,time=0,colors=[],labels=false,completed=false}={}){
 if(w<5||h<5)return;
 ctx.save();
 // Frosted outer silhouette, curved shoulders, double-thickness refraction.
 roundedBottle(ctx,w,h,0);
 const body=grad(ctx,w*.10,w*.9,[[0,"#b7fdff83"],[.12,"#8ad7ff25"],[.24,"#142846a0"],[.51,"#b1f2ff17"],[.8,"#4b8ebf39"],[1,"#d1fbff9b"]]);
 ctx.fillStyle=body;ctx.shadowColor="#020d27b3";ctx.shadowBlur=w*.13;ctx.shadowOffsetY=h*.025;ctx.fill();ctx.shadowBlur=0;ctx.shadowOffsetY=0;
 ctx.save();glassShape(ctx,w,h);ctx.clip();
 // Dark background allows colour to stay saturated, not a series of coloured squares.
 ctx.fillStyle="#071f39e5";ctx.fillRect(0,h*.23,w,h*.72);
 const base=h*.923,top=h*.275,unit=(base-top)/4;
 let visible=clamp(amount,0,layers.length);
 for(let i=0;i<layers.length&&visible>i;i++){
   const p=colors[layers[i]]||{color:"#72caff",light:"#d1f5ff",dark:"#2f6e9c"};
   const volume=clamp(visible-i,0,1);
   const upper=base-(i+volume)*unit,lower=base-i*unit+1.4;
   const isSurface=(i+1>=Math.ceil(visible));
   const wave=isSurface?(Math.sin(time*.009+i*1.2)*h*.015):h*.006;
   ctx.beginPath();ctx.moveTo(w*.07,upper+wave);
   ctx.bezierCurveTo(w*.27,upper-h*.035,w*.69,upper+h*.033,w*.93,upper-wave);
   ctx.lineTo(w*.95,lower);ctx.lineTo(w*.05,lower);ctx.closePath();
   const liquid=grad(ctx,w*.08,w*.92,[[0,p.dark],[.19,p.color],[.39,p.light],[.55,p.color],[.79,p.color],[1,p.dark]]);
   ctx.fillStyle=liquid;ctx.fill();
   // Sinuous free surface with a bright capillary edge.
   ctx.beginPath();ctx.moveTo(w*.09,upper+wave);
   ctx.bezierCurveTo(w*.27,upper-h*.035,w*.69,upper+h*.033,w*.91,upper-wave);
   ctx.strokeStyle=isSurface?"#ffffffb4":"#ffffff34";
   ctx.lineWidth=Math.max(.85,w*(isSurface?.03:.012));ctx.stroke();
   if(isSurface){ctx.save();ctx.globalAlpha=.35;ctx.fillStyle="#ffffff";ctx.beginPath();ctx.ellipse(w*.49,upper+wave+h*.015,w*.18,Math.max(1.2,h*.012),-.08,0,TAU);ctx.fill();ctx.restore();}
   ctx.save();ctx.globalAlpha=isSurface?.58:.31;
   const beadSeed=(i*3+layers[i]*7)%13;
   for(let k=0;k<3;k++){
     const px=w*(.23+((beadSeed+k*5)%11)/18),py=lower-(unit*volume)*(.19+(k*.23)%1);
     const radius=clamp(w*(.013+(k%3)*.008),.8,3.3);
     ctx.beginPath();ctx.arc(px,clamp(py,upper+3,lower-2),radius,0,TAU);
     ctx.fillStyle="#ffffff";ctx.fill();
   }
   ctx.restore();
   if(labels&&volume>.50){
     ctx.font="900 "+Math.max(11,Math.min(w*.19,17))+"px system-ui";
     ctx.textAlign="center";ctx.textBaseline="middle";
     ctx.lineWidth=2.2;ctx.strokeStyle="#122b45";ctx.fillStyle="#ffffff";
     const ly=lower-volume*unit*.55;
     ctx.strokeText((colors[layers[i]]?.symbol||(colors[layers[i]]?.name||"?")[0]).toUpperCase(),w*.5,ly);
     ctx.fillText((colors[layers[i]]?.symbol||(colors[layers[i]]?.name||"?")[0]).toUpperCase(),w*.5,ly);
   }
 }
 // Glass curvature, specular strip, tiny scattered reflections.
 ctx.fillStyle=grad(ctx,w*.10,w*.90,[[0,"#a6faff46"],[.13,"#ffffff1c"],[.2,"#ffffff00"],[.71,"#ffffff00"],[.87,"#a6e4ff12"],[1,"#d1faff50"]]);
 ctx.fillRect(0,h*.23,w,h*.72);
 ctx.restore();
 roundedBottle(ctx,w,h,0);
 ctx.strokeStyle=grad(ctx,w*.10,w*.90,[[0,"#e7faffdc"],[.26,"#a6def2a5"],[.55,"#e9ffffb5"],[1,"#87c9ebd1"]]);
 ctx.lineWidth=Math.max(1.8,w*.032);ctx.stroke();
 ctx.strokeStyle="#ffffff75";ctx.lineWidth=Math.max(1,w*.014);
 ctx.beginPath();ctx.moveTo(w*.21,h*.33);ctx.quadraticCurveTo(w*.19,h*.28,w*.28,h*.25);ctx.moveTo(w*.22,h*.39);ctx.lineTo(w*.22,h*.77);ctx.stroke();
 ctx.strokeStyle="#fcffff68";ctx.lineWidth=Math.max(1,w*.015);
 ctx.beginPath();ctx.moveTo(w*.8,h*.32);ctx.lineTo(w*.8,h*.68);ctx.stroke();
 glassRim(ctx,w,h);
 if(completed){
  ctx.save();ctx.fillStyle="#ffe9a7";ctx.shadowColor="#ffd57e";ctx.shadowBlur=12;
  ctx.font="900 "+Math.min(w*.26,23)+"px system-ui";ctx.textAlign="center";ctx.fillText("✦",w*.5,h*.23);ctx.restore();
 }
 ctx.restore();
}
export function paintCanvas(canvas,layers,options={}){
 const rect=canvas.getBoundingClientRect();
 const w=rect.width,h=rect.height;
 if(w<2||h<2)return;
 const dpi=Math.min(2.5,window.devicePixelRatio||1);
 const px=Math.round(w*dpi),py=Math.round(h*dpi);
 if(canvas.width!==px||canvas.height!==py){canvas.width=px;canvas.height=py;}
 const ctx=canvas.getContext("2d");ctx.setTransform(dpi,0,0,dpi,0,0);ctx.clearRect(0,0,w,h);
 paintGlass(ctx,w,h,layers,options);
}
const smoother=t=>t*t*(3-2*t);
function curve(ctx,p0,p1, bend=0){
 ctx.beginPath();ctx.moveTo(p0.x,p0.y);
 ctx.bezierCurveTo(p0.x+(p1.x-p0.x)*.2,p0.y+14+bend,p1.x-(p1.x-p0.x)*.18,p1.y-19,p1.x,p1.y);
}
export function animatedPour({scene,overlay,source,target,fromLayers,toLayers,moved,color,colors,labels=false,onFinish}){
 const sourceCanvas=source.querySelector("canvas"),targetCanvas=target.querySelector("canvas");
 if(!sourceCanvas||!targetCanvas){onFinish();return;}
 const sceneBox=scene.getBoundingClientRect(),s=source.getBoundingClientRect(),d=target.getBoundingClientRect();
 const w=s.width,h=s.height,sw=sceneBox.width,sh=sceneBox.height;
 const start={x:s.left-sceneBox.left,y:s.top-sceneBox.top},dest={x:d.left-sceneBox.left,y:d.top-sceneBox.top};
 const direction=(dest.x+w*.5)-(start.x+w*.5)>=0?1:-1;
 // Bring the source directly above and just to the side of the receiving neck.
 const end={x:clamp(dest.x-direction*w*.64,2,Math.max(2,sw-w-2)),
            y:clamp(dest.y-h*.79,3,Math.max(3,sh-h-3))};
 const dpi=Math.min(2.5,window.devicePixelRatio||1);
 overlay.width=Math.round(sw*dpi);overlay.height=Math.round(sh*dpi);
 const ctx=overlay.getContext("2d");
 overlay.hidden=false;source.classList.add("in-flight");
 const initial=performance.now(),duration=840;
 const reduce=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
 if(reduce){source.classList.remove("in-flight");overlay.hidden=true;onFinish();return;}
 function tick(now){
  const t=clamp((now-initial)/duration,0,1);
  const approach=smoother(clamp(t/.27,0,1)),retreat=smoother(clamp((t-.73)/.27,0,1));
  const travel=approach*(1-retreat);
  const progress=clamp((t-.3)/.43,0,1),flow=smoother(progress);
  const moveX=start.x+(end.x-start.x)*travel;
  const moveY=start.y+(end.y-start.y)*travel-Math.sin(Math.PI*travel)*12;
  const angle=direction*.92*travel;
  const sourceAmount=fromLayers.length-moved*flow;
  const receiving=toLayers.concat(Array(moved).fill(color));
  ctx.setTransform(dpi,0,0,dpi,0,0);ctx.clearRect(0,0,sw,sh);
  paintCanvas(targetCanvas,receiving,{amount:toLayers.length+moved*flow,colors,labels,time:now});
  // Position mouth after rotating about bottle centre.
  const pivot={x:moveX+w*.5,y:moveY+h*.5};
  const v={x:0,y:-h*.423};
  const mouth={x:pivot.x+v.x*Math.cos(angle)-v.y*Math.sin(angle)+direction*w*.13*Math.cos(angle),
               y:pivot.y+v.x*Math.sin(angle)+v.y*Math.cos(angle)+direction*w*.13*Math.sin(angle)};
  const targetMouth={x:dest.x+d.width*.5,y:dest.y+d.height*.095};
  if(t>.32&&t<.73){
    const a=clamp((t-.32)/.07,0,1)*clamp((.73-t)/.08,0,1);
    ctx.save();ctx.globalAlpha=a;
    curve(ctx,mouth,targetMouth);
    ctx.lineCap="round";
    ctx.strokeStyle=colors[color]?.dark||"#236b9b";ctx.lineWidth=Math.max(6,w*.095);ctx.shadowBlur=9;ctx.shadowColor=colors[color]?.light||"#fff";ctx.stroke();
    curve(ctx,mouth,targetMouth);
    ctx.shadowBlur=0;ctx.strokeStyle=colors[color]?.color||"#49bafe";ctx.lineWidth=Math.max(3,w*.057);ctx.stroke();
    curve(ctx,mouth,targetMouth);
    ctx.strokeStyle="#ffffffa8";ctx.lineWidth=Math.max(1.1,w*.018);ctx.stroke();
    const dx=targetMouth.x-mouth.x,dy=targetMouth.y-mouth.y;
    for(let i=0;i<5;i++){
      const f=(progress*2.3+i*.23)%1;
      const u=1-f,bx=mouth.x*u*u*u+3*(mouth.x+dx*.2)*u*u*f+3*(targetMouth.x-dx*.18)*u*f*f+targetMouth.x*f*f*f;
      const by=mouth.y*u*u*u+3*(mouth.y+14)*u*u*f+3*(targetMouth.y-19)*u*f*f+targetMouth.y*f*f*f;
      ctx.beginPath();ctx.arc(bx+(i%2?3:-3),by,Math.max(1.2,w*.023),0,TAU);ctx.fillStyle=colors[color]?.light||"#dff";ctx.fill();
    }
    ctx.restore();
  }
  ctx.save();ctx.translate(pivot.x,pivot.y);ctx.rotate(angle);ctx.translate(-w*.5,-h*.5);
  paintGlass(ctx,w,h,fromLayers,{amount:sourceAmount,colors,labels,time:now});
  ctx.restore();
  if(t<1){requestAnimationFrame(tick);}
  else{source.classList.remove("in-flight");overlay.hidden=true;onFinish();}
 }
 requestAnimationFrame(tick);
}
