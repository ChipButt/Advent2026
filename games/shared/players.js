(() => {
  const ROSTER_KEY='gamebox.players.v1';
  const KEYS={cards:'gamebox.players.cards.v1',coins:'gamebox.players.coins.v1',heads:'gamebox.players.heads.v1'};
  const $=id=>document.getElementById(id);
  const uid=()=>globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const read=(key,fallback=[])=>{try{const v=JSON.parse(localStorage.getItem(key));return Array.isArray(v)?v:fallback}catch{return fallback}};
  const write=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
  const roster=()=>read(ROSTER_KEY).filter(p=>p&&p.id&&String(p.name||'').trim()).map(p=>({id:String(p.id),name:String(p.name).trim()}));
  const selected=(key)=>{const valid=new Set(roster().map(p=>p.id));return read(key).map(String).filter(id=>valid.has(id))};
  const namesFor=key=>{const map=new Map(roster().map(p=>[p.id,p.name]));return selected(key).map(id=>map.get(id)).filter(Boolean)};
  const cleanSelections=()=>Object.values(KEYS).forEach(key=>write(key,selected(key)));

  const pickerRegistry=[];
  function makePicker({mount,key,max=Infinity,label='Playing',onChange}){
    if(!mount)return null;
    const root=document.createElement('div');root.className='gameRosterPicker';
    const labelRow=document.createElement('div');labelRow.className='gameRosterLabel';
    const strong=document.createElement('strong');strong.textContent=label;
    const meta=document.createElement('span');
    labelRow.append(strong,meta);
    const choices=document.createElement('div');choices.className='gameRosterChoices';
    const notice=document.createElement('div');notice.className='gameRosterNotice';
    root.append(labelRow,choices,notice);mount.appendChild(root);

    const entry={root,key,max,onChange,render:null};
    entry.render=()=>{
      const people=roster();let ids=selected(key);
      if(ids.length>max){ids=ids.slice(0,max);write(key,ids)}
      choices.innerHTML='';notice.textContent='';notice.classList.remove('error');
      meta.textContent=Number.isFinite(max)?`${ids.length}/${max} selected`:`${ids.length} selected`;
      if(!people.length){notice.innerHTML='No players yet. <a href="index.html">Add players on Home</a>.';if(onChange)onChange([]);return}
      people.forEach(person=>{
        const button=document.createElement('button');button.type='button';button.className='gameRosterChoice'+(ids.includes(person.id)?' selected':'');button.textContent=person.name;
        button.addEventListener('click',()=>{
          let current=selected(key);
          if(current.includes(person.id)) current=current.filter(id=>id!==person.id);
          else if(current.length<max) current=[...current,person.id];
          else{notice.textContent=`Choose up to ${max} players.`;notice.classList.add('error');return}
          write(key,current);renderAllPickers();
        });
        choices.appendChild(button);
      });
      if(!ids.length) notice.textContent='Select who is playing.';
      if(onChange)onChange(namesFor(key));
    };
    pickerRegistry.push(entry);entry.render();return entry;
  }
  function renderAllPickers(){pickerRegistry.forEach(p=>p.render())}

  function mountHomeRoster(){
    const home=$('homeScreen');if(!home)return;
    const header=home.querySelector('.topbar');
    const panel=document.createElement('section');panel.className='rosterHome';panel.innerHTML=`<div class="rosterHomeTop"><h2>Players</h2><span>Add people once, then select them inside any game.</span></div><div class="rosterAdd"><input id="rosterName" class="textInput" maxlength="24" placeholder="Add player name"><button id="rosterAdd" class="btn">Add</button></div><div id="rosterList" class="rosterList"></div>`;
    header?.insertAdjacentElement('afterend',panel);
    const input=$('rosterName'),add=$('rosterAdd'),list=$('rosterList');
    const render=()=>{
      const people=roster();list.innerHTML='';
      if(!people.length){list.innerHTML='<div class="rosterEmpty">No players added yet.</div>';return}
      people.forEach(person=>{const pill=document.createElement('div');pill.className='rosterPerson';const name=document.createElement('span');name.textContent=person.name;const remove=document.createElement('button');remove.type='button';remove.setAttribute('aria-label',`Remove ${person.name}`);remove.textContent='×';remove.addEventListener('click',()=>{write(ROSTER_KEY,roster().filter(p=>p.id!==person.id));cleanSelections();render();renderAllPickers()});pill.append(name,remove);list.appendChild(pill)});
    };
    const addPlayer=()=>{const name=input.value.trim();if(!name)return;const people=roster();if(people.some(p=>p.name.toLowerCase()===name.toLowerCase())){input.select();return}people.push({id:uid(),name});write(ROSTER_KEY,people);input.value='';render();renderAllPickers();input.focus()};
    add.addEventListener('click',addPlayer);input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();addPlayer()}});render();
  }

  function syncCard(names){
    const count=$('cardPlayerCount');if(!count||!names.length)return;
    const n=Math.min(4,names.length);const b=[...count.querySelectorAll('button')].find(x=>x.textContent.trim()===String(n));b?.click();
    names.slice(0,n).forEach((name,i)=>{const input=document.querySelector(`[data-card-player="${i}"]`);if(input)input.value=name});
  }
  function mountCardPicker(){
    const setup=$('cardSetup');if(!setup)return;
    $('cardPlayerCount')?.closest('.field')?.classList.add('rosterLegacyField');$('cardPlayerNames')?.closest('.field')?.classList.add('rosterLegacyField');
    const main=setup.querySelector('.panel:first-child');const actions=main?.querySelector('.actions');if(!main||!actions)return;
    const mount=document.createElement('div');actions.before(mount);
    makePicker({mount,key:KEYS.cards,max:4,onChange:names=>{syncCard(names);const start=$('cardStart');if(start)start.disabled=!names.length}});
    const validate=e=>{const names=namesFor(KEYS.cards);if(!names.length){e.preventDefault();e.stopImmediatePropagation();const status=$('cardStatus');if(status)status.textContent='Select at least one Home player.';return false}syncCard(names);return true};
    $('cardStart')?.addEventListener('click',validate,true);$('cardSave')?.addEventListener('click',validate,true);
  }

  function annotateCoinRows(names){
    document.querySelectorAll('#coinPlayersSetup .coinPlayerRow').forEach((row,i)=>{
      const nameInput=row.querySelector('[data-coin-name]');if(nameInput?.parentElement)nameInput.parentElement.classList.add('coinLegacyName');
      const countBox=row.querySelector('[data-coin-count]')?.parentElement;if(countBox){let title=countBox.querySelector('.coinRosterName');if(!title){title=document.createElement('strong');title.className='coinRosterName';countBox.prepend(title)}title.textContent=names[i]||`Player ${i+1}`}
    });
  }
  function syncCoin(names){
    const count=$('coinPlayerCount');if(!count||!names.length)return;
    const n=Math.min(4,names.length);const b=[...count.querySelectorAll('button')].find(x=>x.textContent.trim()===String(n));b?.click();
    names.slice(0,n).forEach((name,i)=>{const input=document.querySelector(`[data-coin-name="${i}"]`);if(input)input.value=name});
    const first=document.querySelector('[data-coin-name="0"]');if(first)first.dispatchEvent(new Event('input',{bubbles:true}));annotateCoinRows(names.slice(0,n));
  }
  function mountCoinPicker(){
    const setup=$('coinSetup');if(!setup)return;
    $('coinPlayerCount')?.closest('.field')?.classList.add('rosterLegacyField');
    const main=setup.querySelector('.panel:first-child');const total=main?.querySelector('.coinTotal');if(!main||!total)return;
    const mount=document.createElement('div');total.before(mount);
    makePicker({mount,key:KEYS.coins,max:4,onChange:names=>{syncCoin(names);const start=$('coinStart');if(start)start.disabled=!names.length}});
    const validate=e=>{const names=namesFor(KEYS.coins);if(!names.length){e.preventDefault();e.stopImmediatePropagation();const status=$('coinStatus');if(status)status.textContent='Select at least one Home player.';return false}syncCoin(names);return true};
    $('coinStart')?.addEventListener('click',validate,true);$('coinSave')?.addEventListener('click',validate,true);
    const rows=$('coinPlayersSetup');if(rows)new MutationObserver(()=>annotateCoinRows(namesFor(KEYS.coins))).observe(rows,{childList:true,subtree:true});
  }

  function mountHeadsPicker(){
    const setup=$('headsSetup');if(!setup)return;
    const playerInput=$('headsPlayerName');playerInput?.classList.add('rosterControlled');playerInput?.closest('.field')?.classList.add('rosterLegacyField');
    const play=$('headsStart'),main=setup.querySelector('.headsSetupMain');if(!play||!main)return;
    const mount=document.createElement('div');play.before(mount);let currentIndex=0;
    const setCurrent=()=>{const names=namesFor(KEYS.heads);if(!names.length)return null;currentIndex=Math.max(0,Math.min(currentIndex,names.length-1));if(playerInput)playerInput.value=names[currentIndex];return names};
    makePicker({mount,key:KEYS.heads,label:'Playing',onChange:names=>{if(currentIndex>=names.length)currentIndex=0;if(names.length&&playerInput)playerInput.value=names[currentIndex];play.disabled=!names.length}});
    play.addEventListener('click',e=>{const names=namesFor(KEYS.heads);if(!names.length){e.preventDefault();e.stopImmediatePropagation();const status=$('headsStatus');if(status)status.textContent='Select at least one Home player.';return}currentIndex=0;if(playerInput)playerInput.value=names[0]},true);
    const again=$('headsAgain');if(again)again.addEventListener('click',()=>{const names=namesFor(KEYS.heads);if(names.length>1)currentIndex=(currentIndex+1)%names.length;if(playerInput&&names.length)playerInput.value=names[currentIndex]},true);
    const results=$('headsResults');if(results&&again)new MutationObserver(()=>{if(results.classList.contains('hidden'))return;const names=namesFor(KEYS.heads);again.textContent=names.length>1?`Next: ${names[(currentIndex+1)%names.length]}`:'Play Again'}).observe(results,{attributes:true,attributeFilter:['class']});
    setCurrent();
  }

  mountHomeRoster();mountCardPicker();mountCoinPicker();mountHeadsPicker();
})();
