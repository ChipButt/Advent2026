(() => {
  if (!document.querySelector('link[data-gamebox-players]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'shared/players.css?v=1';
    link.dataset.gameboxPlayers = '1';
    document.head.appendChild(link);
  }
  if (!document.querySelector('script[data-gamebox-players]')) {
    const script = document.createElement('script');
    script.src = 'shared/players.js?v=1';
    script.dataset.gameboxPlayers = '1';
    document.body.appendChild(script);
  }
})();
