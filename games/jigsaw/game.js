(function(){
  'use strict';
  const canvas=document.getElementById('puzzleCanvas'),stage=document.getElementById('puzzleStage'),menu=document.getElementById('menuSheet'),howTo=document.getElementById('howToSheet'),win=document.getElementById('winOverlay'),guideBtn=document.getElementById('guideButton'),guideState=document.getElementById('guideState'),guideChoices=[...document.querySelectorAll('[data-guide-label]')],soundBtn=document.getElementById('soundButton'),soundState=document.getElementById('soundState'),soundIcon=document.getElementById('soundIcon'),soundCheck=document.getElementById('soundCheck'),pieceButtons=[...document.querySelectorAll('[data-piece-grid]')],winPieceCount=document.getElementById('winPieceCount'),fileInput=document.getElementById('imageFile'),titleEl=document.getElementById('puzzleTitle');
  let guideIndex=0;
  const guideValues=[0,.10,.28],guideLabels=['Off','Faint','Strong'],guideKeys=['off','faint','strong'];
  let sound=true,objectUrl='';
  const ICON_BASE='../assets/gamebox/kenney/icons/Game Icons/White/2x/',CHECK_EMPTY='../assets/gamebox/kenney/ui/UI Pack/Grey/Double/check_square_grey.png',CHECK_ON='../assets/gamebox/kenney/ui/UI Pack/Green/Double/check_square_color_checkmark.png';
  const puzzle=GameBoxJigsaw.create({canvas,image:'assets/test-christmas-scene.svg',rows:6,columns:6,guideOpacity:guideValues[guideIndex],snapTolerance:.24,snapDuration:125,seed:'gamebox-jigsaw-christmas-test-v1',sound:true,vibration:true,onProgress({total}){if(winPieceCount)winPieceCount.textContent=total;},onComplete(){win.classList.add('show');}});
  function syncStageArt(){const l=puzzle.layout;if(!l||!stage)return;stage.style.setProperty('--board-x',l.boardX+'px');stage.style.setProperty('--board-y',l.boardY+'px');stage.style.setProperty('--board-size',l.boardSize+'px');}
  function closeMenu(){menu.classList.remove('show')} function openMenu(){menu.classList.add('show')}
  function closeHowTo(){howTo.classList.remove('show')} function openHowTo(){closeMenu();howTo.classList.add('show')}
  function updateGuideVisual(){const label=guideLabels[guideIndex],key=guideKeys[guideIndex];guideState.textContent=label;guideBtn.dataset.guide=key;guideBtn.setAttribute('aria-label','Picture guide: '+label);guideChoices.forEach(item=>item.classList.toggle('active',item.dataset.guideLabel===key));}
  function updateSoundVisual(){soundState.textContent=sound?'On':'Off';soundIcon.src=ICON_BASE+(sound?'audioOn.png':'audioOff.png');soundCheck.src=sound?CHECK_ON:CHECK_EMPTY;soundBtn.dataset.enabled=sound?'true':'false';soundBtn.setAttribute('aria-label','Sound: '+(sound?'On':'Off'));}
  function chooseImage(){fileInput.value='';fileInput.click();}
  document.getElementById('menuButton').addEventListener('click',openMenu);document.getElementById('closeMenu').addEventListener('click',closeMenu);menu.addEventListener('click',e=>{if(e.target===menu)closeMenu();});
  document.getElementById('howToButton').addEventListener('click',openHowTo);document.getElementById('closeHowTo').addEventListener('click',closeHowTo);document.getElementById('startPuzzleButton').addEventListener('click',closeHowTo);howTo.addEventListener('click',e=>{if(e.target===howTo)closeHowTo();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(howTo.classList.contains('show'))closeHowTo();else if(menu.classList.contains('show'))closeMenu();else if(win.classList.contains('show'))win.classList.remove('show');}});
  document.getElementById('restartButton').addEventListener('click',()=>{closeMenu();win.classList.remove('show');puzzle.restart();});
  document.getElementById('winRestart').addEventListener('click',()=>{win.classList.remove('show');puzzle.restart();});
  document.getElementById('winChooseImage').addEventListener('click',()=>{win.classList.remove('show');chooseImage();});
  document.getElementById('winHome').addEventListener('click',()=>{location.href='../';});
  guideBtn.addEventListener('click',()=>{guideIndex=(guideIndex+1)%guideValues.length;puzzle.setGuideOpacity(guideValues[guideIndex]);updateGuideVisual();});
  pieceButtons.forEach(button=>button.addEventListener('click',()=>{const grid=Number(button.dataset.pieceGrid);if(!Number.isFinite(grid))return;win.classList.remove('show');puzzle.setGrid(grid,grid);pieceButtons.forEach(item=>{const selected=item===button;item.classList.toggle('selected',selected);item.setAttribute('aria-pressed',selected?'true':'false');});closeMenu();requestAnimationFrame(syncStageArt);}));
  soundBtn.addEventListener('click',()=>{sound=!sound;puzzle.setSound(sound);updateSoundVisual();});
  document.getElementById('chooseImage').addEventListener('click',chooseImage);
  fileInput.addEventListener('change',async()=>{const file=fileInput.files&&fileInput.files[0];if(!file||!file.type.startsWith('image/'))return;if(objectUrl)URL.revokeObjectURL(objectUrl);objectUrl=URL.createObjectURL(file);win.classList.remove('show');titleEl.textContent=file.name.replace(/\.[^.]+$/,'').slice(0,28)||'Custom Puzzle';closeMenu();try{await puzzle.setImage(objectUrl);syncStageArt();}catch(err){console.error(err);}});
  updateGuideVisual();updateSoundVisual();Promise.resolve(puzzle.ready).then(syncStageArt).catch(err=>console.error(err));window.addEventListener('resize',()=>requestAnimationFrame(syncStageArt),{passive:true});
})();