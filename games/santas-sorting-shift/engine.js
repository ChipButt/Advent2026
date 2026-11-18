/* Santa's Sorting Shift — deterministic, DOM-independent arcade rules. */
(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  else root.SortingShiftEngine=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  const MAX_SHIFT=12;
  const TYPES=["gift","coal","express"];
  const BINS=["gift","coal","express"];
  const config=level=>({
    quota:11+(level-1)*2,
    duration:47,
    speed:100+(level-1)*8,
    interval:Math.max(.90,1.38-(level-1)*0.043),
    express:true
  });
  class SortingShift {
    constructor(rng=Math.random){
      this.random=rng;
      this.status="ready"; this.level=1; this.score=0; this.bestStreak=0;
      this.items=[]; this.nextId=1; this.events=[];
    }
    start(level=1){
      this.level=Math.max(1,Math.min(MAX_SHIFT,Math.floor(level)||1));
      this.rule=config(this.level);this.score=0;this.streak=0;this.bestStreak=0;
      this.lives=3;this.sorted=0;this.missed=0;this.errors=0;
      this.timeLeft=this.rule.duration;this.elapsed=0;this.spawnClock=.42;
      this.items=[];this.nextId=1;this.events=[];this.status="playing";
      return this;
    }
    pause(){if(this.status==="playing")this.status="paused";}
    resume(){if(this.status==="paused")this.status="playing";}
    choose(){
      const n=this.random();
      if(this.rule.express&&n<.21)return "express";
      return n<.60?"gift":"coal";
    }
    spawn(type){
      const id=this.nextId++;
      const item={id,type:type||(id===3?"express":this.choose()),x:-31,y:261,held:false,variant:Math.floor(this.random()*6),phase:this.random()*6.28};
      this.items.push(item);this.events.push({type:"spawn",id:item.id,itemType:item.type});return item;
    }
    step(seconds){
      if(this.status!=="playing")return [];
      const dt=Math.max(0,Math.min(.05,Number(seconds)||0));
      this.elapsed+=dt;this.timeLeft=Math.max(0,this.timeLeft-dt);
      this.spawnClock-=dt;
      if(this.spawnClock<=0){
        this.spawnClock+=this.rule.interval;
        // Avoid visual overlap even when a piece is being held.
        const first=this.items.find(x=>!x.held&&x.x<40);
        if(!first)this.spawn();
      }
      for(const item of this.items){
        if(!item.held)item.x+=this.rule.speed*dt;
      }
      const missing=this.items.filter(x=>!x.held&&x.x>378);
      if(missing.length){
        this.items=this.items.filter(x=>!missing.includes(x));
        for(const item of missing)this.damage("miss",item);
      }
      if(this.status==="playing"&&this.timeLeft<=0){
        if(this.sorted>=this.rule.quota)this.clear();
        else this.fail("time");
      }
      return this.consume();
    }
    hold(id){
      if(this.status!=="playing")return null;
      const item=this.items.find(x=>x.id===id);
      if(item)item.held=true;
      return item||null;
    }
    release(id){const item=this.items.find(x=>x.id===id);if(item)item.held=false;}
    sort(id,bin){
      if(this.status!=="playing")return {type:"ignored"};
      const index=this.items.findIndex(x=>x.id===id);
      if(index<0)return {type:"ignored"};
      if(!BINS.includes(bin))return {type:"ignored"};
      const item=this.items.splice(index,1)[0], correct=item.type===bin;
      if(correct){
        this.streak++;this.bestStreak=Math.max(this.bestStreak,this.streak);
        this.sorted++;
        const points=100+Math.min(this.streak-1,12)*15+(item.type==="express"?60:0);
        this.score+=points;
        const event={type:"correct",points,streak:this.streak,itemType:item.type,sorted:this.sorted};
        this.events.push(event);
        if(this.sorted>=this.rule.quota)this.clear();
        return event;
      }
      this.damage("wrong",item);
      return {type:"wrong",itemType:item.type};
    }
    damage(reason,item){
      if(this.status!=="playing")return;
      this.lives--;this.errors++;this.streak=0;this.score=Math.max(0,this.score-75);
      this.events.push({type:reason,lives:this.lives,itemType:item?.type});
      if(this.lives<=0)this.fail("lives");
    }
    clear(){
      if(this.status!=="playing")return;
      this.status="cleared";
      const bonus=this.lives*250+Math.floor(this.timeLeft)*15;
      this.score+=bonus;
      this.events.push({type:"cleared",bonus,level:this.level});
    }
    fail(reason){
      if(this.status!=="playing")return;
      this.status="failed";this.items.forEach(item=>item.held=false);
      this.events.push({type:"failed",reason});
    }
    consume(){const events=this.events;this.events=[];return events;}
  }
  return {SortingShift,MAX_SHIFT,TYPES,BINS,config};
});