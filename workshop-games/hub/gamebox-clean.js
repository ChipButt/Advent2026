(() => {
  const $ = id => document.getElementById(id);

  function detailsBlock(label, nodes, className='') {
    const details = document.createElement('details');
    details.className = `optionalDetails ${className}`.trim();
    const summary = document.createElement('summary');
    summary.textContent = label;
    const body = document.createElement('div');
    body.className = 'optionalDetailsBody';
    details.append(summary, body);
    nodes.filter(Boolean).forEach(node => body.appendChild(node));
    return details;
  }

  function compactCardSetup() {
    const setup = $('cardSetup');
    if (!setup || setup.dataset.compacted) return;
    setup.dataset.compacted = '1';
    const main = setup.querySelector('.panel:first-child');
    const rulesPanel = setup.querySelector('.panel:nth-child(2)');
    if (!main) return;

    const nameField = $('cardGameName')?.closest('.field');
    const saveButton = $('cardSave');
    const savedWrap = $('cardSaved')?.closest('.savedWrap');
    const settings = detailsBlock('⚙ Settings & saved games', [nameField, saveButton, savedWrap], 'cardOptional');
    main.appendChild(settings);

    if (rulesPanel) {
      const children = [...rulesPanel.childNodes];
      const rulesDetails = detailsBlock('🃏 Card rules', children, 'cardRulesOptional');
      rulesPanel.replaceWith(rulesDetails);
    }
  }

  function compactCoinSetup() {
    const setup = $('coinSetup');
    if (!setup || setup.dataset.compacted) return;
    setup.dataset.compacted = '1';
    const main = setup.querySelector('.panel:first-child');
    if (!main) return;

    const nameField = $('coinGameName')?.closest('.field');
    const saveButton = $('coinSave');
    const savedWrap = $('coinSaved')?.closest('.savedWrap');
    const settings = detailsBlock('⚙ Settings & saved games', [nameField, saveButton, savedWrap], 'coinOptional');
    main.appendChild(settings);
  }

  compactCardSetup();
  compactCoinSetup();

  const loader=document.createElement('script');
  loader.src='shared/players-loader.js?v=1';
  loader.async=false;
  document.body.appendChild(loader);

  const simpleStyle=document.createElement('link');
  simpleStyle.rel='stylesheet';
  simpleStyle.href='hub/simple-games.css?v=1';
  document.head.appendChild(simpleStyle);

  const simpleScript=document.createElement('script');
  simpleScript.src='hub/simple-games.js?v=1';
  simpleScript.async=false;
  document.body.appendChild(simpleScript);
})();
