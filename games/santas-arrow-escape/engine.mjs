// Santa's Arrow Escape — deterministic, dependency-free puzzle engine.
// Cells in a path are ordered tail -> arrowhead; the head points outwards.
export const DIRECTIONS=[[1,0],[0,1],[-1,0],[0,-1]];
const key=(x,y)=>x+","+y;
function random(seed){let s=seed>>>0||1;return ()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return(s>>>0)/4294967296;};}
const integer=(rng,max)=>Math.floor(rng()*max);
export function dimensions(level){
  const tier=Math.min(6,Math.floor((Math.max(1,level)-1)/6));
  return {cols:9+tier,rows:12+tier,target:19+tier*5+Math.min(3,(level-1)%6)};
}
function generateCandidate(level,salt=0){
  const n=Math.max(1,Math.floor(level));
  const {cols,rows,target}=dimensions(n);
  const rng=random((n*2654435761+982451653+salt*1013904223)>>>0);
  const occupied=new Set(),paths=[];
  // Reverse-construct: every added arrow is guaranteed a route off the board,
  // irrespective of arrows already present. Removing in reverse always wins.
  for(let attempt=0;attempt<Math.max(3400,target*195)&&paths.length<target;attempt++){
    const d=integer(rng,4),[dx,dy]=DIRECTIONS[d];
    const hx=integer(rng,cols),hy=integer(rng,rows);
    if(occupied.has(key(hx,hy)))continue;
    const exit=new Set();let clear=true;
    for(let x=hx+dx,y=hy+dy;x>=0&&x<cols&&y>=0&&y<rows;x+=dx,y+=dy){
      const k=key(x,y);exit.add(k);
      if(occupied.has(k)){clear=false;break;}
    }
    if(!clear)continue;
    let x=hx,y=hy,dir=(d+2)%4,forward=0;
    const nodes=[[x,y]],seen=new Set([key(x,y)]);
    const maxLength=4+integer(rng,4)+Math.min(2,Math.floor(n/12));
    const minLength=3+integer(rng,2);
    for(let z=1;z<maxLength;z++){
      const choices=[dir];
      if(forward>0){choices.push((dir+1)%4,(dir+3)%4);}
      // Portable seeded shuffle: random sort comparators produce different
      // layouts between Node and Chrome, breaking replayable levels.
      for(let j=choices.length-1;j>0;j--){
        const k=integer(rng,j+1);
        [choices[j],choices[k]]=[choices[k],choices[j]];
      }
      const dirs=choices;
      let found=false;
      for(const choice of dirs){
        const [sx,sy]=DIRECTIONS[choice],nx=x+sx,ny=y+sy,k=key(nx,ny);
        if(nx<0||nx>=cols||ny<0||ny>=rows||seen.has(k)||occupied.has(k)||exit.has(k))continue;
        x=nx;y=ny;dir=choice;forward++;nodes.push([x,y]);seen.add(k);found=true;break;
      }
      if(!found)break;
      if(nodes.length>=minLength&&rng()<(n<7?.24:.16))break;
    }
    if(nodes.length<minLength)continue;
    // Prefer paths which actually block currently open exit lanes.
    // This makes extraction order matter more as the campaign progresses.
    const candidateCells=new Set(nodes.map(([px,py])=>key(px,py)));
    let blocks=0;
    for(const existing of paths){
      if(!isFree({cols,rows,paths},existing))continue;
      const [ex,ey]=direction(existing),[ehx,ehy]=existing.points.at(-1);
      for(let qx=ehx+ex,qy=ehy+ey;qx>=0&&qx<cols&&qy>=0&&qy<rows;qx+=ex,qy+=ey){
        if(candidateCells.has(key(qx,qy))){blocks++;break;}
      }
    }
    if(blocks===0&&paths.length>1&&attempt<Math.max(3400,target*195)*.7&&rng()<(n<=4?.78:.91))continue;
    nodes.reverse();
    const id=paths.length;
    paths.push({id,points:nodes,color:id%5});
    for(const [px,py] of nodes)occupied.add(key(px,py));
  }
  return {level:n,cols,rows,paths};
}
// Select a tightly packed, interlocked board deterministically from five
// reverse-solvable candidates. Prefer filled space and fewer initially open
// exits so clearing the first obvious arrows is no longer enough.
export function generateLevel(level){
  const n=Math.max(1,Math.floor(level));
  let best=null,bestScore=-Infinity;
  for(let salt=0;salt<5;salt++){
    const candidate=generateCandidate(n,salt);
    const used=candidate.paths.reduce((sum,path)=>sum+path.points.length,0);
    const open=freePaths(candidate).length;
    const fill=used/(candidate.cols*candidate.rows);
    const freeRatio=open/Math.max(1,candidate.paths.length);
    const score=fill*100-freeRatio*80+candidate.paths.length*.22;
    if(score>bestScore){bestScore=score;best=candidate;}
  }
  return best;
}
export function direction(path){
  const a=path.points.at(-2),b=path.points.at(-1);
  if(!a||!b)return [0,0];
  return [Math.sign(b[0]-a[0]),Math.sign(b[1]-a[1])];
}
export function blockerIds(board,path){
  const [dx,dy]=direction(path),[hx,hy]=path.points.at(-1);
  if(!dx&&!dy)return [];
  const cells=new Map();
  for(const other of board.paths){
    if(other.id===path.id)continue;
    for(const [x,y] of other.points)cells.set(key(x,y),other.id);
  }
  const blocking=new Set();
  for(let x=hx+dx,y=hy+dy;x>=0&&x<board.cols&&y>=0&&y<board.rows;x+=dx,y+=dy){
    if(cells.has(key(x,y)))blocking.add(cells.get(key(x,y)));
  }
  return [...blocking];
}
export const isFree=(board,path)=>blockerIds(board,path).length===0;
export const freePaths=board=>board.paths.filter(path=>isFree(board,path));
export function removeArrow(board,id){
  const path=board.paths.find(p=>p.id===id);
  if(!path)return {ok:false,reason:"missing",board};
  if(!isFree(board,path))return {ok:false,reason:"blocked",board};
  return {ok:true,removed:path,board:{...board,paths:board.paths.filter(p=>p.id!==id)}};
}
export function verifyBoard(board){
  const cells=new Set();
  for(const path of board.paths){
    for(let i=0;i<path.points.length;i++){
      const [x,y]=path.points[i],k=key(x,y);
      if(x<0||y<0||x>=board.cols||y>=board.rows||cells.has(k))return false;
      cells.add(k);
      if(i){const [px,py]=path.points[i-1];if(Math.abs(x-px)+Math.abs(y-py)!==1)return false;}
    }
  }
  const copy={...board,paths:board.paths.slice()};
  while(copy.paths.length){
    const free=freePaths(copy);
    if(!free.length)return false;
    copy.paths=copy.paths.filter(p=>p.id!==free[0].id);
  }
  return true;
}
