(() => {
  'use strict';

  const routes = ['calendar','playroom','scores','profile'];
  const views = [...document.querySelectorAll('[data-view]')];
  const navItems = [...document.querySelectorAll('[data-route]')];
  const calendar = window.AdventCalendar;
  const gameShelf = document.getElementById('gameShelf');
  const playroomMessage = document.getElementById('playroomMessage');
  const testTools = document.getElementById('testTools');
  const testModeBadge = document.getElementById('testModeBadge');
  const thumbnails={
    'tiny-ski-run':'https://chipbutt.github.io/ToolBox/assets/gamebox/kenney/2d/Tiny%20Ski/Tiles/tile_0070.png',
    'jigsaw':'games/jigsaw/assets/test-christmas-scene.svg',
    'workshop-watch':'https://chipbutt.github.io/GameBox/workshop-watch/assets/vendor/admurin/pack82/Monster%20Pack%2082%20(Event)/Snowmen/Christmas_Snowman_C_Idle.png',
    'block-breaker':'https://chipbutt.github.io/GameBox/assets/gamebox/kenney/2d/Physics%20Assets/Glass%20elements/elementGlass013.png',
    'santa-invaders':'https://chipbutt.github.io/GameBox/workshop-watch/assets/vendor/admurin/pack85/Monster%20Pack%2085%20(Event%203)/Spritesheets/Gingerbread/Christmas_Gingerbread_Move.png',
    'festive-blocks':'https://chipbutt.github.io/GameBox/assets/gamebox/kenney/2d/Puzzle%20Pack%201/element_red_square_glossy.png'
  };


  if(testTools)testTools.hidden=!calendar.testMode;
  if(testModeBadge)testModeBadge.hidden=!calendar.testMode;
  document.getElementById('exitTestMode')?.addEventListener('click',calendar.testModeOff);

  function renderPlayroom(){
    if(!gameShelf)return;
    gameShelf.replaceChildren();
    const assigned = Array.from({length:24},(_,n)=>{
      const day=n+1;
      return {day,game:calendar.gameForDay(day),unlocked:calendar.isUnlocked(day)};
    }).filter(entry=>entry.game&&entry.unlocked);
    const entries=calendar.testMode
      ? calendar.games.map(game=>({game,day:null}))
      : assigned;
    for(const entry of entries){
      const link=document.createElement('a');
      link.href=entry.game.url;
      link.className='gameCard';
      const ornament=document.createElement('img');
      ornament.className='gameCardOrnament';
      ornament.src=thumbnails[entry.game.id];
      ornament.alt='';
      ornament.loading='lazy';
      ornament.decoding='async';
      const textGroup=document.createElement('span');
      textGroup.className='gameCardText';
      const eyebrow=document.createElement('small');
      eyebrow.textContent=entry.day?'DAY '+entry.day:'APPROVED GAME · TEST COPY';
      const title=document.createElement('strong');
      title.textContent=entry.game.title;
      const detail=document.createElement('span');
      detail.textContent=entry.game.description;
      textGroup.append(eyebrow,title,detail);
      const arrow=document.createElement('span');
      arrow.className='gameCardArrow';
      arrow.textContent='›';
      arrow.setAttribute('aria-hidden','true');
      link.append(ornament,textGroup,arrow);
      gameShelf.append(link);
    }
    if(playroomMessage){
      playroomMessage.hidden=entries.length>0;
      playroomMessage.textContent='No unlocked games yet. Return to the calendar as December progresses.';
    }
  }


  function routeFromHash(){
    const route=location.hash.replace('#','').toLowerCase();
    return routes.includes(route)?route:'calendar';
  }

  function showRoute(route){
    for(const view of views)view.hidden=view.dataset.view!==route;
    for(const item of navItems){
      if(item.dataset.route===route)item.setAttribute('aria-current','page');
      else item.removeAttribute('aria-current');
    }
    document.title=(route==='calendar'?'Advent 2026':route.charAt(0).toUpperCase()+route.slice(1))+' · Advent 2026';
    window.AdventVillage?.setActive(route==='calendar');
    if(route==='playroom')renderPlayroom();
  }

  function syncRoute(){
    const route=routeFromHash();
    if(!location.hash)history.replaceState(null,'','#calendar');
    showRoute(route);
  }

  addEventListener('hashchange',syncRoute);
  addEventListener('advent-progress',event=>{
    document.documentElement.dataset.visited=String(event.detail?.visited||0);
    renderPlayroom();
  });

  renderPlayroom();
  syncRoute();
})();