(() => {
  const $ = (id) => document.getElementById(id);
  const ROSTER_KEY = 'gamebox.players.v1';
  const CARD_SAVE_KEY = 'gamebox.cardGames.v3';
  const COIN_SAVE_KEY = 'gamebox.coinGames.v2';
  const CARD_SELECTION_KEY = 'gamebox.players.cards.v1';
  const COIN_SELECTION_KEY = 'gamebox.players.coins.v1';

  const ranks = ['A','K','Q','J','10','9','8','7','6','5','4','3','2'];
  const suits = [
    { symbol:'♠', red:false }, { symbol:'♥', red:true },
    { symbol:'♦', red:true }, { symbol:'♣', red:false }
  ];
  const ruleKeys = [...ranks, 'JOKER_RED', 'JOKER_BLACK'];
  const exampleRules = {
    A:'Make a new rule.', K:'Everyone takes part.', Q:'Ask another player a question.',
    J:'Choose another player.', '10':'Pick a category and take turns naming answers.',
    '9':'Pick a word and take turns rhyming.', '8':'Choose a mate.',
    '7':'Hands up — last player loses.', '6':'Choose a player.',
    '5':'Everyone joins in.', '4':'Touch the floor — last player loses.',
    '3':'You take the action.', '2':'Choose two people.',
    JOKER_RED:'Wild card — invent a temporary rule.',
    JOKER_BLACK:'Reverse the turn order.'
  };

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  }[c]));
  const uid = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const read = (key, fallback=[]) => {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return value ?? fallback;
    } catch { return fallback; }
  };
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const shuffle = (input) => {
    const out = [...input];
    for (let i=out.length-1;i>0;i--) {
      const j = Math.floor(Math.random()*(i+1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };
  const coinResult = () => {
    try {
      const a = new Uint32Array(1);
      globalThis.crypto.getRandomValues(a);
      return (a[0] & 1) ? 'H' : 'T';
    } catch { return Math.random() >= .5 ? 'H' : 'T'; }
  };

  function roster() {
    const items = read(ROSTER_KEY, []);
    return Array.isArray(items) ? items.filter(p => p?.id && String(p.name||'').trim()).map(p => ({id:String(p.id),name:String(p.name).trim()})) : [];
  }
  function selection(key, max=4) {
    const valid = new Set(roster().map(p => p.id));
    const ids = read(key, []);
    return Array.isArray(ids) ? ids.map(String).filter(id => valid.has(id)).slice(0,max) : [];
  }
  function selectedPeople(key, max=4) {
    const map = new Map(roster().map(p => [p.id,p]));
    return selection(key,max).map(id => map.get(id)).filter(Boolean);
  }

  function renderHomeRoster() {
    const list = $('homePlayers');
    if (!list) return;
    const people = roster();
    list.innerHTML = '';
    if (!people.length) {
      list.innerHTML = '<div class="emptyNote">Add players here once. Every game will use this list.</div>';
      return;
    }
    people.forEach(person => {
      const row = document.createElement('div');
      row.className = 'homePlayerPill';
      row.innerHTML = `<span>${escapeHtml(person.name)}</span><button type="button" aria-label="Remove ${escapeHtml(person.name)}">×</button>`;
      row.querySelector('button').addEventListener('click', () => {
        write(ROSTER_KEY, roster().filter(p => p.id !== person.id));
        write(CARD_SELECTION_KEY, selection(CARD_SELECTION_KEY).filter(id => id !== person.id));
        write(COIN_SELECTION_KEY, selection(COIN_SELECTION_KEY).filter(id => id !== person.id));
        renderHomeRoster();
        renderAllPlayerPickers();
      });
      list.appendChild(row);
    });
  }

  function addHomePlayer() {
    const input = $('newPlayerName');
    const name = input.value.trim();
    if (!name) return;
    const people = roster();
    if (people.some(p => p.name.toLowerCase() === name.toLowerCase())) {
      input.select();
      return;
    }
    people.push({id:uid(), name});
    write(ROSTER_KEY, people);
    input.value = '';
    renderHomeRoster();
    renderAllPlayerPickers();
    input.focus();
  }

  const pickerDefs = [];
  function setupPicker(containerId, storageKey, max, onChange) {
    const container = $(containerId);
    const def = {container,storageKey,max,onChange};
    pickerDefs.push(def);
    renderPicker(def);
  }
  function renderPicker(def) {
    if (!def.container) return;
    const people = roster();
    const ids = selection(def.storageKey, def.max);
    def.container.innerHTML = '';
    if (!people.length) {
      def.container.innerHTML = '<div class="emptyNote">Add players on the Home screen first.</div>';
      def.onChange?.([]);
      return;
    }
    people.forEach(person => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `playerChoice${ids.includes(person.id)?' selected':''}`;
      button.textContent = person.name;
      button.addEventListener('click', () => {
        let current = selection(def.storageKey, def.max);
        if (current.includes(person.id)) current = current.filter(id => id !== person.id);
        else if (current.length < def.max) current.push(person.id);
        write(def.storageKey, current);
        renderAllPlayerPickers();
      });
      def.container.appendChild(button);
    });
    def.onChange?.(selectedPeople(def.storageKey, def.max));
  }
  function renderAllPlayerPickers() { pickerDefs.forEach(renderPicker); }

  const card = {
    rules:Object.fromEntries(ruleKeys.map(k => [k,''])),
    name:'', players:[], deck:[], current:0, last:null, history:[], playing:false
  };
  function buildDeck() {
    const deck = [];
    for (const rank of ranks) for (const suit of suits) deck.push({
      rank, suit:suit.symbol, red:suit.red, ruleKey:rank, label:`${rank}${suit.symbol}`
    });
    deck.push({rank:'JOKER',joker:true,red:true,ruleKey:'JOKER_RED',label:'Red Joker'});
    deck.push({rank:'JOKER',joker:true,red:false,ruleKey:'JOKER_BLACK',label:'Black Joker'});
    return shuffle(deck);
  }
  function renderCardRules() {
    const wrap = $('cardRules');
    wrap.innerHTML = '';
    ranks.forEach(rank => {
      const row = document.createElement('label');
      row.className = 'ruleLine';
      row.innerHTML = `<strong>${rank}</strong><input maxlength="100" value="${escapeHtml(card.rules[rank])}" placeholder="Penalty / rule">`;
      row.querySelector('input').addEventListener('input', e => card.rules[rank] = e.target.value.trim());
      wrap.appendChild(row);
    });
    [['JOKER_RED','Red Joker'],['JOKER_BLACK','Black Joker']].forEach(([key,label]) => {
      const row = document.createElement('label');
      row.className = 'ruleLine';
      row.innerHTML = `<strong>${label}</strong><input maxlength="100" value="${escapeHtml(card.rules[key])}" placeholder="Penalty / rule">`;
      row.querySelector('input').addEventListener('input', e => card.rules[key] = e.target.value.trim());
      wrap.appendChild(row);
    });
  }
  function startCardGame() {
    const players = selectedPeople(CARD_SELECTION_KEY,4);
    if (!players.length) return setText('cardStatus','Select at least one player.');
    card.players = players;
    card.name = $('cardGameName').value.trim();
    card.deck = buildDeck(); card.current = 0; card.last = null; card.history = []; card.playing = true;
    renderCardPlay(); showView('cards-play');
  }
  function drawCard() {
    if (!card.playing || !card.deck.length) return;
    const person = card.players[card.current];
    const drawn = card.deck.pop();
    card.last = {...drawn, playerId:person.id, playerName:person.name};
    card.history.unshift(card.last);
    card.current = (card.current + 1) % card.players.length;
    renderCardPlay();
  }
  function renderCardFace(target, c) {
    if (!c) {
      target.className = 'playingCard emptyPlayingCard';
      target.innerHTML = '<span>TURN<br>A CARD</span>';
      return;
    }
    target.className = `playingCard${c.red?' red':''}`;
    if (c.joker) {
      target.innerHTML = `<div class="jokerWord">★<br>${c.red?'RED':'BLACK'}<br>JOKER</div>`;
    } else {
      target.innerHTML = `<div class="cardCorner top">${escapeHtml(c.rank)}<span>${c.suit}</span></div><div class="cardSuit">${c.suit}</div><div class="cardCorner bottom">${escapeHtml(c.rank)}<span>${c.suit}</span></div>`;
    }
  }
  function renderCardPlay() {
    const next = card.players[card.current];
    const last = card.last;
    $('cardJustTurned').classList.toggle('hidden', !last);
    $('cardJustTurnedName').textContent = last ? `${last.playerName} turned` : '';
    renderCardFace($('cardFace'), last);
    const penalty = last ? (card.rules[last.ruleKey] || 'No penalty') : 'Turn the first card to begin.';
    $('cardPenalty').textContent = penalty;
    $('cardNextName').textContent = card.deck.length ? next.name : 'Deck finished';
    $('cardDrawButton').disabled = !card.deck.length;
    $('cardDrawButton').textContent = card.deck.length ? `Turn card for ${next.name}` : 'Deck finished';
    $('cardDeckCount').textContent = `${card.deck.length} cards left`;
    const hist = $('cardRecent'); hist.innerHTML='';
    card.history.slice(0,8).forEach(h => {
      const row = document.createElement('div'); row.className='miniHistory';
      row.innerHTML = `<strong>${escapeHtml(h.playerName)}</strong><span>${escapeHtml(h.label)} · ${escapeHtml(card.rules[h.ruleKey]||'No penalty')}</span>`;
      hist.appendChild(row);
    });
  }
  function restartCardGame() {
    if (!card.players.length) return;
    card.deck=buildDeck(); card.current=0; card.last=null; card.history=[]; card.playing=true; renderCardPlay();
  }
  function saveCardSetup() {
    const name = $('cardGameName').value.trim();
    if (!name) return setText('cardStatus','Give this setup a name first.');
    const items = read(CARD_SAVE_KEY, []);
    const selectedIds = selection(CARD_SELECTION_KEY,4);
    const item = {id:uid(),name,players:selectedIds,rules:{...card.rules}};
    const existing = items.findIndex(x => String(x.name).toLowerCase()===name.toLowerCase());
    if (existing>=0) { item.id=items[existing].id; items[existing]=item; } else items.unshift(item);
    write(CARD_SAVE_KEY,items); renderCardSaves(); setText('cardStatus',`Saved “${name}”.`);
  }
  function renderCardSaves() {
    const wrap=$('cardSaved'); const items=read(CARD_SAVE_KEY,[]); wrap.innerHTML='';
    if (!items.length) return wrap.innerHTML='<div class="emptyNote">No saved setups.</div>';
    items.forEach(item=>{
      const row=document.createElement('div'); row.className='savedRow';
      row.innerHTML=`<div><strong>${escapeHtml(item.name)}</strong><span>${Object.values(item.rules||{}).filter(Boolean).length} rules</span></div><div><button type="button" data-load>Load</button><button type="button" data-delete>Delete</button></div>`;
      row.querySelector('[data-load]').onclick=()=>{
        $('cardGameName').value=item.name; card.rules={...Object.fromEntries(ruleKeys.map(k=>[k,''])),...(item.rules||{})};
        const valid=new Set(roster().map(p=>p.id)); write(CARD_SELECTION_KEY,(item.players||[]).filter(id=>valid.has(id)).slice(0,4));
        renderCardRules(); renderAllPlayerPickers(); setText('cardStatus',`Loaded “${item.name}”.`);
      };
      row.querySelector('[data-delete]').onclick=()=>{write(CARD_SAVE_KEY,items.filter(x=>x.id!==item.id));renderCardSaves();};
      wrap.appendChild(row);
    });
  }

  const coin = {
    players:[], current:0, round:1, playing:false, winner:null, last:null,
    totals:new Map(), streaks:new Map(), goal:{mode:'free',target:3}, coinsPerPlayer:new Map()
  };
  function readCoinGoal() {
    const mode=$('coinGoalMode').value;
    const target=Math.max(2,Math.min(20,parseInt($('coinGoalTarget').value,10)||3));
    $('coinGoalTarget').value=String(target);
    return {mode,target};
  }
  function goalLabel(goal) {
    const n=goal.target;
    return ({
      'free':'Free play','total-heads':`First to ${n} Heads`,'total-tails':`First to ${n} Tails`,
      'streak-heads':`First to ${n} Heads in a row`,'streak-tails':`First to ${n} Tails in a row`,
      'streak-either':`First to ${n} matching flips in a row`
    })[goal.mode] || 'Free play';
  }
  function renderCoinPlayerSettings() {
    const wrap=$('coinPlayerSettings'); wrap.innerHTML='';
    selectedPeople(COIN_SELECTION_KEY,4).forEach(person=>{
      const current=coin.coinsPerPlayer.get(person.id)||1;
      const row=document.createElement('label'); row.className='coinPlayerSetting';
      row.innerHTML=`<strong>${escapeHtml(person.name)}</strong><span>Coins per turn</span><input type="number" min="1" max="20" inputmode="numeric" value="${current}">`;
      row.querySelector('input').addEventListener('change',e=>{
        const n=Math.max(1,Math.min(20,parseInt(e.target.value,10)||1)); e.target.value=String(n); coin.coinsPerPlayer.set(person.id,n);
      });
      wrap.appendChild(row);
    });
  }
  function startCoinGame() {
    const players=selectedPeople(COIN_SELECTION_KEY,4);
    if(!players.length) return setText('coinStatus','Select at least one player.');
    coin.players=players; coin.current=0; coin.round=1; coin.playing=true; coin.winner=null; coin.last=null; coin.goal=readCoinGoal();
    coin.totals=new Map(); coin.streaks=new Map();
    players.forEach(p=>{
      coin.totals.set(p.id,{H:0,T:0}); coin.streaks.set(p.id,{H:0,T:0,eitherSide:null,either:0});
      if(!coin.coinsPerPlayer.has(p.id)) coin.coinsPerPlayer.set(p.id,1);
    });
    renderCoinPlay(); showView('coins-play');
  }
  function checkCoinWin(person) {
    if(coin.goal.mode==='free') return false;
    const total=coin.totals.get(person.id), streak=coin.streaks.get(person.id), n=coin.goal.target;
    if(coin.goal.mode==='total-heads') return total.H>=n;
    if(coin.goal.mode==='total-tails') return total.T>=n;
    if(coin.goal.mode==='streak-heads') return streak.H>=n;
    if(coin.goal.mode==='streak-tails') return streak.T>=n;
    if(coin.goal.mode==='streak-either') return streak.either>=n;
    return false;
  }
  function flipCoins() {
    if(!coin.playing || coin.winner) return;
    const person=coin.players[coin.current]; const count=coin.coinsPerPlayer.get(person.id)||1;
    const results=Array.from({length:count},coinResult);
    const total=coin.totals.get(person.id), streak=coin.streaks.get(person.id);
    for(const result of results){
      total[result]++;
      streak.H=result==='H'?streak.H+1:0; streak.T=result==='T'?streak.T+1:0;
      if(streak.eitherSide===result) streak.either++; else {streak.eitherSide=result;streak.either=1;}
    }
    coin.last={person,results};
    if(checkCoinWin(person)) { coin.winner=person; coin.playing=false; }
    else { coin.current++; if(coin.current>=coin.players.length){coin.current=0;coin.round++;} }
    renderCoinPlay();
  }
  function coinProgress(person){
    const total=coin.totals.get(person.id)||{H:0,T:0}; const streak=coin.streaks.get(person.id)||{H:0,T:0,either:0,eitherSide:null}; const n=coin.goal.target;
    if(coin.goal.mode==='total-heads') return `${total.H} / ${n} Heads`;
    if(coin.goal.mode==='total-tails') return `${total.T} / ${n} Tails`;
    if(coin.goal.mode==='streak-heads') return `${streak.H} / ${n} Heads in a row`;
    if(coin.goal.mode==='streak-tails') return `${streak.T} / ${n} Tails in a row`;
    if(coin.goal.mode==='streak-either') return `${streak.either} / ${n} ${streak.eitherSide==='H'?'Heads':streak.eitherSide==='T'?'Tails':'matching'} in a row`;
    return `${total.H} Heads · ${total.T} Tails`;
  }
  function renderCoinPlay(){
    $('coinGoalBanner').textContent=goalLabel(coin.goal);
    const last=coin.last; $('coinJustFlipped').classList.toggle('hidden',!last);
    $('coinJustFlippedName').textContent=last?`${last.person.name} flipped`:'';
    const grid=$('coinResults'); grid.innerHTML='';
    if(!last) grid.innerHTML='<div class="coinPlaceholder">Flip to begin</div>';
    else last.results.forEach(r=>{const el=document.createElement('div');el.className=`bigCoin ${r==='T'?'tails':''}`;el.textContent=r==='H'?'H':'T';grid.appendChild(el);});
    const progress=$('coinProgress');progress.innerHTML='';
    coin.players.forEach(p=>{const row=document.createElement('div');row.className=`progressRow${coin.winner?.id===p.id?' winner':''}`;row.innerHTML=`<strong>${escapeHtml(p.name)}</strong><span>${escapeHtml(coinProgress(p))}</span>`;progress.appendChild(row);});
    $('coinWinner').classList.toggle('hidden',!coin.winner);
    if(coin.winner) $('coinWinner').innerHTML=`<span>🏆 WINNER</span><strong>${escapeHtml(coin.winner.name)}</strong><small>${escapeHtml(goalLabel(coin.goal))}</small>`;
    const next=coin.winner?null:coin.players[coin.current]; $('coinNextName').textContent=coin.winner?'Game over':next.name;
    $('coinFlipButton').disabled=!!coin.winner; $('coinFlipButton').textContent=coin.winner?'Game over':`Flip for ${next.name}`;
  }
  function restartCoinGame(){ if(coin.players.length){ write(COIN_SELECTION_KEY,coin.players.map(p=>p.id)); startCoinGame(); } }
  function saveCoinSetup(){
    const name=$('coinGameName').value.trim(); if(!name)return setText('coinStatus','Give this setup a name first.');
    const items=read(COIN_SAVE_KEY,[]);const item={id:uid(),name,players:selection(COIN_SELECTION_KEY,4),goal:readCoinGoal(),coins:Object.fromEntries(coin.coinsPerPlayer)};
    const ix=items.findIndex(x=>String(x.name).toLowerCase()===name.toLowerCase());if(ix>=0){item.id=items[ix].id;items[ix]=item;}else items.unshift(item);write(COIN_SAVE_KEY,items);renderCoinSaves();setText('coinStatus',`Saved “${name}”.`);
  }
  function renderCoinSaves(){
    const wrap=$('coinSaved');const items=read(COIN_SAVE_KEY,[]);wrap.innerHTML='';if(!items.length)return wrap.innerHTML='<div class="emptyNote">No saved setups.</div>';
    items.forEach(item=>{const row=document.createElement('div');row.className='savedRow';row.innerHTML=`<div><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(goalLabel(item.goal||{mode:'free',target:3}))}</span></div><div><button data-load>Load</button><button data-delete>Delete</button></div>`;
      row.querySelector('[data-load]').onclick=()=>{const valid=new Set(roster().map(p=>p.id));write(COIN_SELECTION_KEY,(item.players||[]).filter(id=>valid.has(id)).slice(0,4));$('coinGameName').value=item.name;const goal=item.goal||{mode:'free',target:3};$('coinGoalMode').value=goal.mode;$('coinGoalTarget').value=goal.target;coin.coinsPerPlayer=new Map(Object.entries(item.coins||{}));renderAllPlayerPickers();renderCoinPlayerSettings();setText('coinStatus',`Loaded “${item.name}”.`);};
      row.querySelector('[data-delete]').onclick=()=>{write(COIN_SAVE_KEY,items.filter(x=>x.id!==item.id));renderCoinSaves();};wrap.appendChild(row);});
  }

  function setText(id,text){const el=$(id);if(el)el.textContent=text;}
  function showView(name){
    document.querySelectorAll('[data-view]').forEach(v=>v.classList.toggle('hidden',v.dataset.view!==name));
    window.scrollTo({top:0,behavior:'smooth'});
  }

  function init(){
    renderHomeRoster(); renderCardRules(); renderCardSaves(); renderCoinSaves();
    setupPicker('cardPlayerPicker',CARD_SELECTION_KEY,4,()=>{});
    setupPicker('coinPlayerPicker',COIN_SELECTION_KEY,4,()=>renderCoinPlayerSettings());

    $('addPlayer').addEventListener('click',addHomePlayer);
    $('newPlayerName').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();addHomePlayer();}});
    document.querySelectorAll('[data-go]').forEach(btn=>btn.addEventListener('click',()=>showView(btn.dataset.go)));

    $('cardExamples').addEventListener('click',()=>{card.rules={...card.rules,...exampleRules};renderCardRules();});
    $('cardClearRules').addEventListener('click',()=>{card.rules=Object.fromEntries(ruleKeys.map(k=>[k,'']));renderCardRules();});
    $('cardStart').addEventListener('click',startCardGame); $('cardDrawButton').addEventListener('click',drawCard); $('cardRestart').addEventListener('click',restartCardGame); $('cardSave').addEventListener('click',saveCardSetup);

    $('coinGoalMode').addEventListener('change',()=>{$('coinGoalTargetWrap').classList.toggle('hidden',$('coinGoalMode').value==='free');});
    $('coinGoalTargetWrap').classList.toggle('hidden',$('coinGoalMode').value==='free');
    $('coinStart').addEventListener('click',startCoinGame); $('coinFlipButton').addEventListener('click',flipCoins); $('coinRestart').addEventListener('click',restartCoinGame); $('coinSave').addEventListener('click',saveCoinSetup);
  }
  init();
})();