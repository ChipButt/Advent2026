(() => {
  const $ = id => document.getElementById(id);
  const COIN_GOAL_KEY = 'gamebox.coinGoal.v1';

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[char]));

  function makeDetails(label, className) {
    const details = document.createElement('details');
    details.className = `sgSettings ${className || ''}`.trim();
    const summary = document.createElement('summary');
    summary.textContent = label;
    const body = document.createElement('div');
    body.className = 'sgSettingsBody';
    details.append(summary, body);
    return { details, body };
  }

  function section(title) {
    const wrap = document.createElement('section');
    wrap.className = 'sgSettingsSection';
    if (title) {
      const h = document.createElement('h3');
      h.textContent = title;
      wrap.appendChild(h);
    }
    return wrap;
  }

  function flattenCardSettings() {
    const setup = $('cardSetup');
    if (!setup || setup.dataset.simpleSettings === '1') return;
    setup.dataset.simpleSettings = '1';
    const main = setup.querySelector('.panel:first-child');
    if (!main) return;

    const { details, body } = makeDetails('⚙ Game settings', 'sgCardSettings');
    const oldSaved = setup.querySelector('.cardOptional');
    const oldRules = setup.querySelector('.cardRulesOptional');

    if (oldRules) {
      const rules = section('Card penalties & rules');
      const oldBody = oldRules.querySelector('.optionalDetailsBody');
      if (oldBody) while (oldBody.firstChild) rules.appendChild(oldBody.firstChild);
      body.appendChild(rules);
      oldRules.remove();
    }

    if (oldSaved) {
      const saved = section('Saved setup');
      const oldBody = oldSaved.querySelector('.optionalDetailsBody');
      if (oldBody) while (oldBody.firstChild) saved.appendChild(oldBody.firstChild);
      body.appendChild(saved);
      oldSaved.remove();
    }

    const actions = main.querySelector('.actions');
    if (actions) actions.insertAdjacentElement('afterend', details);
    else main.appendChild(details);
  }

  function readCoinGoalSetting() {
    try {
      const saved = JSON.parse(localStorage.getItem(COIN_GOAL_KEY));
      const allowed = ['free','total-heads','total-tails','streak-heads','streak-tails','streak-either'];
      return {
        mode: allowed.includes(saved?.mode) ? saved.mode : 'free',
        target: Math.max(2, Math.min(20, Number(saved?.target) || 3))
      };
    } catch {
      return { mode:'free', target:3 };
    }
  }

  function saveCoinGoalSetting(mode, target) {
    localStorage.setItem(COIN_GOAL_KEY, JSON.stringify({ mode, target }));
  }

  function coinGoalLabel(mode, target) {
    if (mode === 'total-heads') return `First to ${target} Heads`;
    if (mode === 'total-tails') return `First to ${target} Tails`;
    if (mode === 'streak-heads') return `First to ${target} Heads in a row`;
    if (mode === 'streak-tails') return `First to ${target} Tails in a row`;
    if (mode === 'streak-either') return `First to ${target} matching flips in a row`;
    return 'Free play';
  }

  function buildCoinGoalControls(container) {
    const current = readCoinGoalSetting();
    const grid = document.createElement('div');
    grid.className = 'sgGoalGrid';
    grid.innerHTML = `
      <label>
        <span>Win condition</span>
        <select id="coinGoalMode" class="textInput">
          <option value="free">Free play</option>
          <option value="total-heads">First to a number of Heads</option>
          <option value="total-tails">First to a number of Tails</option>
          <option value="streak-heads">Consecutive Heads</option>
          <option value="streak-tails">Consecutive Tails</option>
          <option value="streak-either">Consecutive same side (either)</option>
        </select>
      </label>
      <label id="coinGoalTargetWrap">
        <span>Target</span>
        <input id="coinGoalTarget" class="numberInput" type="number" inputmode="numeric" min="2" max="20" value="${current.target}">
      </label>`;
    container.appendChild(grid);
    const mode = $('coinGoalMode');
    const target = $('coinGoalTarget');
    const targetWrap = $('coinGoalTargetWrap');
    mode.value = current.mode;

    const persist = () => {
      const n = Math.max(2, Math.min(20, Number(target.value) || 3));
      target.value = String(n);
      targetWrap.classList.toggle('hidden', mode.value === 'free');
      saveCoinGoalSetting(mode.value, n);
    };
    mode.addEventListener('change', persist);
    target.addEventListener('change', persist);
    persist();
  }

  function flattenCoinSettings() {
    const setup = $('coinSetup');
    if (!setup || setup.dataset.simpleSettings === '1') return;
    setup.dataset.simpleSettings = '1';
    const main = setup.querySelector('.panel:first-child');
    const second = setup.querySelector('.panel:nth-child(2)');
    if (!main) return;

    const { details, body } = makeDetails('⚙ Game settings', 'sgCoinSettings');
    const goal = section('Goal');
    buildCoinGoalControls(goal);
    body.appendChild(goal);

    if (second) {
      const coins = section('Coins per turn');
      const rows = $('coinPlayersSetup');
      if (rows) coins.appendChild(rows);
      body.appendChild(coins);
      second.remove();
    }

    const oldSaved = setup.querySelector('.coinOptional');
    if (oldSaved) {
      const saved = section('Saved setup');
      const oldBody = oldSaved.querySelector('.optionalDetailsBody');
      if (oldBody) while (oldBody.firstChild) saved.appendChild(oldBody.firstChild);
      body.appendChild(saved);
      oldSaved.remove();
    }

    const actions = main.querySelector('.actions');
    if (actions) actions.insertAdjacentElement('afterend', details);
    else main.appendChild(details);
  }

  function nextNameFromTurn(text) {
    const raw = String(text || '').trim();
    if (!raw || /finished/i.test(raw)) return '';
    return raw.replace(/['’]s turn$/i, '').trim();
  }

  function mountSimpleCardPlay() {
    const play = $('cardPlay');
    if (!play || $('sgCardPlay')) return;

    const shell = document.createElement('div');
    shell.id = 'sgCardPlay';
    shell.className = 'sgPlayShell sgCardPlay';
    shell.innerHTML = `
      <div class="sgLastEvent sgCardLast hidden" id="sgCardLast">
        <span class="sgEyebrow">JUST TURNED</span>
        <strong id="sgCardLastPlayer">—</strong>
      </div>
      <div class="sgCardStage" id="sgCardStage"></div>
      <div class="sgPenalty" id="sgPenalty">
        <span class="sgEyebrow">PENALTY / RULE</span>
        <strong id="sgPenaltyText">Turn the first card to begin.</strong>
      </div>
      <div class="sgNextTurn">
        <span class="sgEyebrow">NEXT</span>
        <strong id="sgCardNextPlayer">—</strong>
      </div>
      <div class="sgPrimaryAction" id="sgCardPrimary"></div>
      <details class="sgPlayMore"><summary>⚙ Game controls</summary><div class="sgPlayMoreBody" id="sgCardControls"></div></details>`;
    play.appendChild(shell);

    const slot = $('drawnSlot');
    const ruleDisplay = $('cardRuleDisplay');
    const draw = $('cardDraw');
    const restart = $('cardRestart');
    const back = $('cardBackSetup');
    if (slot) $('sgCardStage').appendChild(slot);
    if (ruleDisplay) ruleDisplay.classList.add('sgSourceRule');
    if (draw) $('sgCardPrimary').appendChild(draw);
    if (restart) $('sgCardControls').appendChild(restart);
    if (back) $('sgCardControls').appendChild(back);

    const update = () => {
      const first = $('cardHistory')?.querySelector('.historyItem strong');
      const lastPlayer = first?.textContent?.split(' — ')[0]?.trim() || '';
      const nextPlayer = nextNameFromTurn($('cardTurnText')?.textContent);
      const penalty = $('cardRuleText')?.textContent?.trim() || '';
      const hasCard = !!lastPlayer;

      $('sgCardLast')?.classList.toggle('hidden', !hasCard);
      if ($('sgCardLastPlayer')) $('sgCardLastPlayer').textContent = lastPlayer || '';
      if ($('sgCardNextPlayer')) $('sgCardNextPlayer').textContent = nextPlayer || 'Deck finished';
      if ($('sgPenaltyText')) {
        $('sgPenaltyText').textContent = !hasCard ? 'Turn the first card to begin.' :
          (/No rule was assigned/i.test(penalty) ? 'No penalty' : penalty || 'No penalty');
      }
      if (draw) draw.textContent = nextPlayer ? `Turn card for ${nextPlayer}` : 'Deck finished';
      shell.classList.toggle('hasCard', hasCard);
    };

    ['cardHistory','cardTurnText','cardRuleText'].forEach(id => {
      const el = $(id);
      if (el) new MutationObserver(update).observe(el, { childList:true, subtree:true, characterData:true });
    });
    $('cardStart')?.addEventListener('click', () => setTimeout(update, 0));
    $('cardRestartYes')?.addEventListener('click', () => setTimeout(update, 0));
    draw?.addEventListener('click', () => setTimeout(update, 0));
    update();
  }

  const coinState = {
    goal: readCoinGoalSetting(),
    players: new Map(),
    winner: null,
    active: false
  };

  function coinPlayersFromDom() {
    return [...document.querySelectorAll('#coinScores .coinScore')]
      .map(row => row.querySelector('strong')?.textContent?.trim())
      .filter(Boolean);
  }

  function resetCoinRace() {
    coinState.goal = readCoinGoalSetting();
    coinState.players = new Map();
    coinState.winner = null;
    coinState.active = true;
    coinPlayersFromDom().forEach(name => coinState.players.set(name, {
      heads:0, tails:0, headsStreak:0, tailsStreak:0, eitherStreak:0, eitherSide:null
    }));
    const winner = $('sgCoinWinner');
    if (winner) winner.classList.add('hidden');
    [$('coinFlip'), $('coinFlipMobile')].forEach(button => { if (button) button.disabled = false; });
    renderCoinRace();
  }

  function ensureCoinPlayer(name) {
    if (!coinState.players.has(name)) coinState.players.set(name, {
      heads:0, tails:0, headsStreak:0, tailsStreak:0, eitherStreak:0, eitherSide:null
    });
    return coinState.players.get(name);
  }

  function goalProgressText(score, goal) {
    const t = goal.target;
    if (goal.mode === 'total-heads') return `${score.heads} / ${t} Heads`;
    if (goal.mode === 'total-tails') return `${score.tails} / ${t} Tails`;
    if (goal.mode === 'streak-heads') return `${score.headsStreak} / ${t} Heads in a row`;
    if (goal.mode === 'streak-tails') return `${score.tailsStreak} / ${t} Tails in a row`;
    if (goal.mode === 'streak-either') return score.eitherStreak ? `${score.eitherStreak} / ${t} ${score.eitherSide === 'H' ? 'Heads' : 'Tails'} in a row` : `0 / ${t} in a row`;
    return `${score.heads} Heads · ${score.tails} Tails`;
  }

  function processCoinResults(name, results) {
    if (!coinState.active || coinState.winner || !name || !results.length) return;
    const score = ensureCoinPlayer(name);
    let won = false;

    for (const result of results) {
      if (result === 'H') score.heads += 1;
      else score.tails += 1;

      score.headsStreak = result === 'H' ? score.headsStreak + 1 : 0;
      score.tailsStreak = result === 'T' ? score.tailsStreak + 1 : 0;
      if (score.eitherSide === result) score.eitherStreak += 1;
      else { score.eitherSide = result; score.eitherStreak = 1; }

      const { mode, target } = coinState.goal;
      if (mode === 'total-heads' && score.heads >= target) won = true;
      if (mode === 'total-tails' && score.tails >= target) won = true;
      if (mode === 'streak-heads' && score.headsStreak >= target) won = true;
      if (mode === 'streak-tails' && score.tailsStreak >= target) won = true;
      if (mode === 'streak-either' && score.eitherStreak >= target) won = true;
      if (won) break;
    }

    if (won) {
      coinState.winner = name;
      coinState.active = false;
      [$('coinFlip'), $('coinFlipMobile')].forEach(button => { if (button) button.disabled = true; });
      const panel = $('sgCoinWinner');
      if (panel) {
        panel.classList.remove('hidden');
        panel.innerHTML = `<span>🏆 WINNER</span><strong>${escapeHtml(name)}</strong><small>${escapeHtml(coinGoalLabel(coinState.goal.mode, coinState.goal.target))}</small>`;
      }
    }
    renderCoinRace();
  }

  function renderCoinRace() {
    const board = $('sgCoinProgress');
    if (!board) return;
    board.innerHTML = '';
    const players = coinPlayersFromDom();
    players.forEach(name => ensureCoinPlayer(name));
    players.forEach(name => {
      const score = coinState.players.get(name);
      const row = document.createElement('div');
      row.className = `sgProgressRow${coinState.winner === name ? ' winner' : ''}`;
      row.innerHTML = `<strong>${escapeHtml(name)}</strong><span>${escapeHtml(goalProgressText(score, coinState.goal))}</span>`;
      board.appendChild(row);
    });
    const goalLabel = $('sgCoinGoalLabel');
    if (goalLabel) goalLabel.textContent = coinGoalLabel(coinState.goal.mode, coinState.goal.target);
  }

  function latestCoinEvent() {
    const history = $('coinHistory')?.querySelector('.historyItem strong');
    const text = history?.textContent || '';
    const marker = ' · Round ';
    const player = text.includes(marker) ? text.split(marker)[0].trim() : '';
    const results = [...document.querySelectorAll('#coinGrid .coin')].map(coin => coin.textContent.trim()).filter(v => v === 'H' || v === 'T');
    return { player, results };
  }

  function mountSimpleCoinPlay() {
    const play = $('coinPlay');
    if (!play || $('sgCoinPlay')) return;

    const shell = document.createElement('div');
    shell.id = 'sgCoinPlay';
    shell.className = 'sgPlayShell sgCoinPlay';
    shell.innerHTML = `
      <div class="sgGoalBanner"><span class="sgEyebrow">GOAL</span><strong id="sgCoinGoalLabel">Free play</strong></div>
      <div class="sgLastEvent sgCoinLast hidden" id="sgCoinLast"><span class="sgEyebrow">JUST FLIPPED</span><strong id="sgCoinLastPlayer">—</strong></div>
      <div class="sgCoinStage" id="sgCoinStage"></div>
      <div class="sgCoinWinner hidden" id="sgCoinWinner"></div>
      <div class="sgCoinProgress" id="sgCoinProgress"></div>
      <div class="sgNextTurn"><span class="sgEyebrow">NEXT</span><strong id="sgCoinNextPlayer">—</strong></div>
      <div class="sgPrimaryAction" id="sgCoinPrimary"></div>
      <details class="sgPlayMore"><summary>⚙ Game controls</summary><div class="sgPlayMoreBody" id="sgCoinControls"></div></details>`;
    play.appendChild(shell);

    const grid = $('coinGrid');
    const flip = $('coinFlip');
    const restart = $('coinRestart');
    const back = $('coinBackSetup');
    if (grid) $('sgCoinStage').appendChild(grid);
    if (flip) $('sgCoinPrimary').appendChild(flip);
    if (restart) $('sgCoinControls').appendChild(restart);
    if (back) $('sgCoinControls').appendChild(back);

    const updateView = () => {
      const { player, results } = latestCoinEvent();
      const next = nextNameFromTurn($('coinTurnText')?.textContent);
      $('sgCoinLast')?.classList.toggle('hidden', !player);
      if ($('sgCoinLastPlayer')) $('sgCoinLastPlayer').textContent = player || '';
      if ($('sgCoinNextPlayer')) $('sgCoinNextPlayer').textContent = coinState.winner ? 'Game over' : (next || '—');
      if (flip && !coinState.winner) flip.textContent = next ? `Flip for ${next}` : 'Flip coin';
      shell.classList.toggle('hasResult', results.length > 0);
      renderCoinRace();
    };

    flip?.addEventListener('click', () => {
      const event = latestCoinEvent();
      if (event.player && event.results.length) processCoinResults(event.player, event.results);
      updateView();
    });

    $('coinStart')?.addEventListener('click', () => setTimeout(() => { resetCoinRace(); updateView(); }, 0));
    $('coinRestartYes')?.addEventListener('click', () => setTimeout(() => { resetCoinRace(); updateView(); }, 0));
    const hist = $('coinHistory');
    if (hist) new MutationObserver(updateView).observe(hist, { childList:true, subtree:true });
    const turn = $('coinTurnText');
    if (turn) new MutationObserver(updateView).observe(turn, { childList:true, subtree:true, characterData:true });
    updateView();
  }

  function simplifySetupLabels() {
    const cardMain = $('cardSetup')?.querySelector('.panel:first-child');
    const coinMain = $('coinSetup')?.querySelector('.panel:first-child');
    cardMain?.classList.add('sgSetupMain');
    coinMain?.classList.add('sgSetupMain');
    const cardHeading = cardMain?.querySelector(':scope > h3');
    const coinHeading = coinMain?.querySelector(':scope > h3');
    if (cardHeading) cardHeading.textContent = 'Who’s playing?';
    if (coinHeading) coinHeading.textContent = 'Who’s playing?';
  }

  function init() {
    flattenCardSettings();
    flattenCoinSettings();
    simplifySetupLabels();
    mountSimpleCardPlay();
    mountSimpleCoinPlay();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(init, 0), { once:true });
  else setTimeout(init, 0);
})();
