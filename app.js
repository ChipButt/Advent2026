(() => {
  'use strict';

  const routes = ['calendar', 'playroom', 'scores', 'profile'];
  const views = [...document.querySelectorAll('[data-view]')];
  const navItems = [...document.querySelectorAll('[data-route]')];

  function routeFromHash() {
    const route = location.hash.replace('#', '').toLowerCase();
    return routes.includes(route) ? route : 'calendar';
  }

  function showRoute(route) {
    views.forEach((view) => {
      view.hidden = view.dataset.view !== route;
    });

    navItems.forEach((item) => {
      if (item.dataset.route === route) {
        item.setAttribute('aria-current', 'page');
      } else {
        item.removeAttribute('aria-current');
      }
    });

    document.title = `${route.charAt(0).toUpperCase() + route.slice(1)} · Advent 2026`;
  }

  function syncRoute() {
    const route = routeFromHash();
    if (!location.hash) {
      history.replaceState(null, '', '#calendar');
    }
    showRoute(route);
  }

  window.addEventListener('hashchange', syncRoute);
  syncRoute();
})();
