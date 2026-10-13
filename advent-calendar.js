(() => {
  'use strict';
  const games = Object.freeze([
    {id:'tiny-ski-run',title:'Tiny Ski Run',description:'Ski downhill, pass the gates and beat your best run.'},
    {id:'jigsaw',title:'Jigsaw',description:'Put the festive picture back together.'},
    {id:'workshop-watch',title:'Workshop Watch',description:'Defend the Christmas workshop across 12 levels.'},
    {id:'block-breaker',title:'Block Breaker',description:'Break Christmas ice blocks with bouncing snowballs.'},
    {id:'santa-invaders',title:'Santa Invaders',description:'Defend the ice path against Christmas invaders.'},
    {id:'festive-blocks',title:'Festive Blocks',description:'Place colourful festive pieces and clear rows.'}
  ].map(item => Object.freeze({...item,url:'games/'+item.id+'/'})));

  // No dates assigned without explicit approval. Fill these with game IDs once confirmed.
  const days = Object.freeze(Object.fromEntries(Array.from({length:24},(_,i)=>[i+1,null])));
  const validIds = new Set(games.map(g=>g.id));
  for(const id of Object.values(days))if(id!==null&&!validIds.has(id))throw new Error('Unknown Advent game ID: '+id);
  const query = new URL(location.href);
  if(query.searchParams.has('test')){
    try{sessionStorage.setItem('advent2026-test-mode', query.searchParams.get('test')==='1'?'1':'0');}catch(_){}
    query.searchParams.delete('test');
    history.replaceState(null,'',query.pathname+(query.search||'')+query.hash);
  }
  let testMode=false;
  try{testMode=sessionStorage.getItem('advent2026-test-mode')==='1';}catch(_){}

  function londonDate(){
    const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
    const data=Object.fromEntries(parts.filter(x=>x.type!=='literal').map(x=>[x.type,Number(x.value)]));
    return data.year*10000+data.month*100+data.day;
  }
  function isUnlocked(day){
    if(!Number.isInteger(day)||day<1||day>24)return false;
    return testMode||londonDate()>=20261200+day;
  }
  function gameForDay(day){
    const id=days[day];return id?games.find(g=>g.id===id)||null:null;
  }
  function testModeOff(){
    try{sessionStorage.setItem('advent2026-test-mode','0');}catch(_){}
    location.assign(location.pathname+'#calendar');
    location.reload();
  }
  window.AdventCalendar=Object.freeze({games,days,isUnlocked,gameForDay,testMode,testModeOff,londonDate});
})();