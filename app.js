(() => {
  'use strict';

  const routes = ['calendar','playroom','scores','profile'];
  const views = [...document.querySelectorAll('[data-view]')];
  const navItems = [...document.querySelectorAll('[data-route]')];

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
    document.title=(route==='calendar'?'Advent Village':route.charAt(0).toUpperCase()+route.slice(1))+' · Advent 2026';
    window.AdventVillage?.setActive(route==='calendar');
  }

  function syncRoute(){
    const route=routeFromHash();
    if(!location.hash)history.replaceState(null,'','#calendar');
    showRoute(route);
  }

  addEventListener('hashchange',syncRoute);
  addEventListener('advent-progress',event=>{
    document.documentElement.dataset.visited=String(event.detail?.visited||0);
  });

  syncRoute();
})();