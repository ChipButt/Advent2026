(function(){
"use strict";
const $=id=>document.getElementById(id);
const games=[
 {key:"tiny-ski-run",name:"Tiny Ski Run",short:"Downhill arcade race",mark:"↘",measure:"points",higher:true,desc:"Race down the course, clear gates and build your score."},
 {key:"workshop-watch",name:"Workshop Watch",short:"Workshop defence",mark:"✦",measure:"points",higher:true,desc:"Protect the workshop from waves of Christmas invaders."},
 {key:"block-breaker",name:"Block Breaker",short:"Precision challenge",mark:"◆",measure:"points",higher:true,desc:"Keep the ball alive and clear the winter blocks."},
 {key:"santa-invaders",name:"Santa Invaders",short:"Arcade survival",mark:"✧",measure:"points",higher:true,desc:"Hold the line against the North Pole invasion."},
 {key:"festive-blocks",name:"Festive Blocks",short:"Puzzle competition",mark:"▦",measure:"points",higher:true,desc:"Arrange blocks to clear lines and set your score."},
 {key:"jigsaw",name:"Jigsaw",short:"Puzzle training",mark:"◇",measure:"seconds",higher:false,desc:"Complete the festive puzzle. Official rules need a standardised image and grid."},
 {key:"ice-links",name:"Ice Links",short:"Elflympics ice-bridge logic",mark:"❄",measure:"points",higher:true,desc:"Choose a difficulty and complete five consecutive ice-bridge puzzles. Fast, clean solves earn more points; the final total is ranked against other competitors."}
];
const conf=window.ELFLYMPICS_CONFIG||{};
const ready=!!(conf.supabaseUrl&&conf.publishableKey);
const base=String(conf.supabaseUrl||"").replace(/\/$/,"");
const state={session:null,profile:null,events:[],attempts:[],standings:[],selected:null,boardDay:null,race:null,view:"home",authMode:"login"};
const UK_FORMATTER=new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/London",year:"numeric",month:"2-digit",day:"2-digit"});
let cachedUkDate=null,cachedUkAt=0,calendarRevision="";
let toastTimer=null;
function toast(s){const t=$("toast");t.textContent=s;t.classList.add("on");clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove("on"),3600);}
const today=()=>{const p=ukParts();return String(p.year)+"-"+String(p.month).padStart(2,"0")+"-"+String(p.day).padStart(2,"0");};
function ukParts(){const now=Date.now();if(cachedUkDate&&now-cachedUkAt<10000)return cachedUkDate;const p=UK_FORMATTER.formatToParts(new Date(now));cachedUkDate=Object.fromEntries(p.filter(x=>x.type!=="literal").map(x=>[x.type,Number(x.value)]));cachedUkAt=now;return cachedUkDate;}
function isOpen(day){const p=ukParts();return p.year>2026||(p.year===2026&&(p.month>12||(p.month===12&&p.day>=day)));}
function isFinal(){return today()>"2026-12-24";}
function getGame(key){return games.find(g=>g.key===key);}
function clean(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}

function icon(name,extra=""){return '<span class="elf-icon elf-icon--'+name+' '+extra+'" aria-hidden="true"></span>';}
function rankCell(rank,tied){const n=Number(rank),medal=n===1?"medal-gold":n===2?"medal-silver":n===3?"medal-bronze":"";return '<span class="rank-cell">'+(medal?icon(medal):"")+'<span>'+clean(rank)+'</span>'+(tied?icon("tie","tie-mark"):"")+'</span>';}
function storageGet(){try{return JSON.parse(localStorage.getItem("elflympics-session")||"null");}catch(_){return null;}}
function storageSet(s){try{if(s)localStorage.setItem("elflympics-session",JSON.stringify(s));else localStorage.removeItem("elflympics-session");}catch(_){}}
async function authRequest(path,body){
 const r=await fetch(base+"/auth/v1/"+path,{method:"POST",headers:{"apikey":conf.publishableKey,"Content-Type":"application/json"},body:JSON.stringify(body)});
 const data=await r.json().catch(()=>({}));if(!r.ok)throw Error(data.msg||data.error_description||data.message||"Authentication failed");return data;
}
function acceptSession(s){if(!s?.access_token)return;state.session={access_token:s.access_token,refresh_token:s.refresh_token,expires_at:s.expires_at||Math.floor(Date.now()/1000)+(s.expires_in||3600),user:s.user||state.session?.user};storageSet(state.session);}
async function ensureSession(){
 if(!state.session)throw Error("Sign in to enter an official race.");
 if((state.session.expires_at||0)<Date.now()/1000+90){
  const r=await authRequest("token?grant_type=refresh_token",{refresh_token:state.session.refresh_token});acceptSession(r);
 }
}
async function api(path,options={}){
 if(!ready)throw Error("The Elflympics account service is not connected yet.");
 const authenticated=options.auth!==false;
 if(authenticated)await ensureSession();
 const headers={"apikey":conf.publishableKey,"Content-Type":"application/json"};
 if(authenticated)headers.Authorization="Bearer "+state.session.access_token;
 if(options.prefer)headers.Prefer=options.prefer;
 const response=await fetch(base+"/rest/v1/"+path,{method:options.method||"GET",headers,body:options.body?JSON.stringify(options.body):undefined});
 if(!response.ok){const err=await response.json().catch(()=>({}));throw Error(err.message||err.details||"The score service could not be reached.");}
 if(response.status===204)return null;
 return response.json();
}
const rpc=(name,data)=>api("rpc/"+name,{method:"POST",body:data});
async function signIn(email,password){const s=await authRequest("token?grant_type=password",{email,password});acceptSession(s);updateAuthUI();void loadPlayer().then(()=>{updateAuthUI();renderStandings();}).catch(e=>toast(e.message));}
async function signUp(email,password,displayName){const r=await authRequest("signup?redirect_to="+encodeURIComponent(location.origin+location.pathname),{email,password,data:{display_name:displayName}});if(r.access_token){acceptSession(r);updateAuthUI();void loadPlayer().then(()=>{updateAuthUI();renderStandings();}).catch(e=>toast(e.message));return "Account created and signed in.";}return "Check your email to confirm your Elflympics account, then sign in.";}
async function loadPlayer(){
 if(!state.session)return;
 try{
  await ensureSession();
  const id=encodeURIComponent(state.session.user?.id||"");
  const [profile,attempts,standings]=await Promise.all([
   api("profiles?select=id,display_name&id=eq."+id),
   api("race_attempts?select=id,event_day,race_day,result,status,begun_at&player_id=eq."+id+"&order=begun_at.desc&limit=200"),
   api("overall_standings?select=*&order=position.asc")
  ]);
  if(!state.session)return;
  state.profile=profile?.[0]||null;
  state.attempts=attempts||[];
  state.standings=standings||[];
  renderProfile();renderStandings();
 }catch(e){toast(e.message);}
}
async function loadEvents(){
 if(!ready)return;
 try{state.events=await api("events?select=day,game_key,is_published,opens_on,higher_is_better&order=day.asc",{auth:false});}catch(e){toast("Event schedule temporarily unavailable.");}
}
function eventFor(day){return state.events.find(e=>Number(e.day)===Number(day));}
function gameForEvent(day){const e=eventFor(day);return e?.is_published?getGame(e.game_key):null;}
function latest(day){return (state.attempts||[]).filter(a=>a.event_day===day).sort((a,b)=>new Date(b.begun_at)-new Date(a.begun_at))[0]||null;}
function usedToday(day){return (state.attempts||[]).some(a=>a.event_day===day&&a.race_day===today());}
function show(view){
 if(!["home","events","standings","profile"].includes(view))return;
 state.view=view;document.querySelectorAll(".view").forEach(x=>x.hidden=x.id!==view+"View");
 document.querySelectorAll("[data-nav]").forEach(b=>b.classList.toggle("active",b.dataset.nav===view));
 window.scrollTo(0,0);
}
function makeGameCard(game,day,training=false){
 const active=Number.isInteger(day)&&isOpen(day)&&eventFor(day)?.is_published&&eventFor(day)?.game_key===game.key;
 const label=(training?"TRAINING · ":"EVENT ")+String(day).padStart(2,"0");
 const status=training?"Practice available":isFinal()?"Event completed":"Event open";
 const badge="";
 const button=document.createElement("button");button.type="button";button.className="event-card";
 button.innerHTML='<div class="event-art"><span class="event-num">'+clean(label)+'</span>'+icon(training?"practice":"official-race")+'</div><div class="event-body"><h3>'+clean(game.name)+'</h3><p>'+clean(game.desc)+'</p><span class="status'+badge+'">'+icon(training?"practice":"unlocked")+clean(status)+'</span></div>';
 button.disabled=!active;
 if(active)button.addEventListener("click",()=>openEvent(game,day));return button;
}
function renderCalendar(){
 const p=ukParts();
 const revision=today()+"|"+state.events.map(e=>[e.day,e.is_published,e.game_key].join(":")).join("|");
 if(calendarRevision===revision)return;
 calendarRevision=revision;
 const dateStrip=$("dateStrip");dateStrip.replaceChildren();
 let released=0;
 for(let day=1;day<=24;day++){
  const open=isOpen(day)||isFinal();if(open)released++;
  const b=document.createElement("button");b.className="date "+(open?"live":"locked")+(p.month===12&&p.day===day?" current":"");
  b.type="button";b.innerHTML="<strong>"+day+"</strong>"+icon(open?"unlocked":"locked")+"<small>"+(open?"RELEASED":"LOCKED")+"</small>";
  b.addEventListener("click",()=>{show("events");document.getElementById("day-"+day)?.scrollIntoView({block:"center",behavior:"smooth"});});dateStrip.append(b);
 }
 $("unlockCount").textContent=released+" of 24 released";
 if(p.year===2026&&p.month===12){document.querySelector(".hero h1").innerHTML="The games <em>are on.</em>";document.querySelector(".hero-content p").textContent="Compete, climb the rankings, and race for the Christmas Eve crown.";}
 const home=$("homeEvents");home.replaceChildren();
 const active=state.events.filter(e=>e.is_published&&getGame(e.game_key)&&isOpen(e.day)).reverse().slice(0,3);
 if(active.length){active.forEach(e=>home.append(makeGameCard(getGame(e.game_key),e.day)));}
 else{home.innerHTML='<div class="empty unlock-message">No events are available yet. Games can only be practised after their December event has unlocked.</div>';}
 const all=$("allEvents");all.replaceChildren();
 for(let day=1;day<=24;day++){
  const open=isOpen(day),g=gameForEvent(day),published=!!g;
  const b=document.createElement("button");b.id="day-"+day;b.type="button";b.disabled=!(published&&open);if(open&&published)b.className="active-day";
  b.innerHTML='<div class="tile-header"><span class="kicker dark">DECEMBER '+String(day).padStart(2,"0")+'</span>'+icon(open&&published?"unlocked":"locked")+'</div><strong>'+(published?clean(g.name):"Event "+day)+'</strong><small>'+(open?(published?"Enter event":"Programme pending"):"Unlocks "+day+" Dec")+"</small>";
  if(open&&published)b.onclick=()=>openEvent(g,day);all.append(b);
 }
 const training=$("trainingGames");training.replaceChildren();
 const unlocked=state.events.filter(e=>e.is_published&&isOpen(e.day)&&getGame(e.game_key));
 if(unlocked.length)unlocked.forEach(e=>training.append(makeGameCard(getGame(e.game_key),e.day,true)));
 else training.innerHTML='<div class="empty unlock-message">Training is locked. Each game becomes available for practice only when its event unlocks in December.</div>';
 const linked=$("leaderboardEvents");linked.replaceChildren();state.events.filter(e=>e.is_published&&isOpen(e.day)&&getGame(e.game_key)).forEach(e=>linked.append(makeGameCard(getGame(e.game_key),e.day)));
 if(!linked.children.length)linked.innerHTML='<div class="empty">Event leaderboards appear as official events are released.</div>';
}
function table(headers,rows){return "<table><thead><tr>"+headers.map(h=>"<th>"+clean(h)+"</th>").join("")+"</tr></thead><tbody>"+rows.join("")+"</tbody></table>";}
function renderStandings(){
 const info=$("standingsInfo"),board=$("overallTable");
 if(!ready){info.textContent="Online accounts and competition standings will become available once the dedicated Supabase project is connected.";board.innerHTML='<div class="empty">No results are displayed until the real competition is connected.</div>';return;}
 info.textContent=isFinal()?"Final championship standings.":"Standings are provisional and may change whenever a competitor completes another official race.";
 if(!state.standings?.length){board.innerHTML='<div class="empty">No official results yet. The championship begins on 1 December.</div>';return;}
 const posCounts=new Map();state.standings.forEach(r=>posCounts.set(r.position,(posCounts.get(r.position)||0)+1));
 board.innerHTML=table(["Position","Competitor","Championship points","Completed events"],state.standings.map(r=>'<tr class="'+(r.player_id===state.session?.user?.id?"me":"")+'"><td class="num">'+rankCell(r.position,(posCounts.get(r.position)||0)>1)+'</td><td>'+clean(r.display_name)+'</td><td><strong>'+clean(r.total_points)+'</strong></td><td>'+clean(r.events_finished)+'</td></tr>'));
}
function renderProfile(){
 const el=$("profileContent");if(!state.session){el.innerHTML='<div class="profile-card"><h2 class="profile-heading">'+icon("profile")+'Your competitor account</h2><p>Create an account to enter official races, retain your results across devices and appear in the championship standings.</p><button class="primary" id="profileSignIn">'+icon("sign-in")+'Create account / sign in</button></div>';el.querySelector("button").onclick=()=>openAuth("register");return;}
 const current=state.attempts?.length||0;
 el.innerHTML='<div class="profile-card"><span class="kicker dark">REGISTERED COMPETITOR</span><h2 class="profile-heading">'+icon("profile")+clean(state.profile?.display_name||state.session.user?.user_metadata?.display_name||"Elflympian")+'</h2><p>Signed in as '+clean(state.session.user?.email||"")+'</p><p>Official attempts recorded: <strong>'+current+'</strong></p><button class="secondary" id="signOut">Sign out</button></div>';
 $("signOut").onclick=async()=>{try{await fetch(base+"/auth/v1/logout",{method:"POST",headers:{"apikey":conf.publishableKey,"Authorization":"Bearer "+state.session.access_token}});}catch(_){}state.session=null;state.profile=null;state.attempts=[];state.standings=[];storageSet(null);updateAuthUI();show("profile");};
}
function render(){renderCalendar();renderStandings();renderProfile();}
function updateAuthUI(){$("accountButton").innerHTML=icon(state.session?"profile":"sign-in")+"<span>"+clean(state.profile?.display_name||state.session?.user?.user_metadata?.display_name||(ready?"Sign in":"Accounts pending"))+"</span>";renderProfile();}
function openAuth(mode="login"){
 if(!ready){toast("Player accounts need the dedicated Supabase project connected first.");return;}
 state.authMode=mode;$("authStatus").textContent="";$("authForm").reset();
 const reg=mode==="register";$("nameField").hidden=!reg;$('nameField').querySelector("input").required=reg;
 $("authTitle").textContent=reg?"Create your account":"Welcome back";$("authIntro").textContent=reg?"Choose your Elflympics competitor name. Your email stays private.":"Sign in to enter official races and see your results.";
 $("authSubmit").innerHTML=icon("sign-in")+(reg?"Create account":"Sign in");$("authSwitch").textContent=reg?"Already registered? Sign in":"New competitor? Create account";
 if(!$("authDialog").open)$("authDialog").showModal();
}
function openEvent(game,day){
 if(!Number.isInteger(day)||!isOpen(day)||!eventFor(day)?.is_published||eventFor(day)?.game_key!==game.key){toast("This event has not unlocked yet.");return;}
 state.selected={game,day};$("eventEyebrow").textContent=day?"OFFICIAL EVENT "+String(day).padStart(2,"0"):"TRAINING CENTRE";$("eventName").textContent=game.name;$("eventDescription").textContent=game.desc;
 const result=day?latest(day):null;
 $("personalResult").innerHTML=icon(result?(result.status==="finished"?"result-recorded":"attempt-used"):"official-race")+"<span>"+clean(result?(result.status==="finished"?"Latest official result: "+Number(result.result).toLocaleString()+" "+game.measure:"Latest official attempt: DNF / unfinished"):"No official result yet")+"</span>";
 const avail=day&&isOpen(day)&&!!eventFor(day)?.is_published;
 const used=day&&usedToday(day);
 let message="Practice races do not affect the leaderboard.";
 if(!avail)message="This event is not currently open.";
 else if(isFinal())message="The Elflympics has finished; results are final.";
 else if(!state.session)message="Create an account or sign in before entering an official race.";
 else if(used)message="Your official attempt for this event has already been used today. Try again tomorrow.";
 else message="Starting an official race uses today's attempt. A later attempt replaces your earlier result, even if worse.";
 $("eventStatus").textContent=message;
 $("practiceButton").disabled=false;
 $("officialButton").disabled=!(avail&&!used&&state.session&&!isFinal());
 $("officialButton").innerHTML=icon(used?"attempt-used":"official-race")+(used?"Attempt used today":"Official race");
 $("eventBoard").hidden=!day;$("eventBoard").onclick=()=>{const d=day;$("eventDialog").close();showBoard(d,game.name);};
 $("eventDialog").showModal();
}
function openFrame(game,mode,day=null,attemptId=null){
 const eventDay=day??state.selected?.day;
 if(!Number.isInteger(eventDay)||!isOpen(eventDay)||!eventFor(eventDay)?.is_published||eventFor(eventDay)?.game_key!==game.key){toast("This event is locked.");return;}
 state.race={game,mode,day:eventDay,attemptId,done:false};
 $("raceTitle").textContent=game.name;$("raceType").textContent=mode==="official"?"OFFICIAL RACE · ATTEMPT RESERVED":"UNLIMITED PRACTICE";
 $("raceMessage").hidden=true;$("raceMessage").textContent="";
 $("raceFrame").style.pointerEvents="auto";$("raceFrame").src="./games/"+encodeURIComponent(game.key)+"/?elfMode="+encodeURIComponent(mode)+(attemptId?"&elfAttempt="+encodeURIComponent(attemptId):"");
 $("eventDialog").close();$("raceDialog").showModal();
}
async function startOfficial(){
 const s=state.selected;if(!s?.day||!state.session)return;
 if(!confirm("Start your official race now? This uses today's only attempt in this event, even if you exit before finishing."))return;
 $("officialButton").disabled=true;
 try{const r=await rpc("begin_elf_race",{p_day:s.day});await loadPlayer();openFrame(s.game,"official",s.day,r.attempt_id);}catch(e){toast(e.message);if($("eventDialog").open)openEventAgain();}
}
function openEventAgain(){const s=state.selected;if(s){$("eventDialog").close();openEvent(s.game,s.day);}}
function exitRace(){
 const r=state.race;if(!r)return;
 if(r.mode==="official"&&!r.done&&!confirm("Leave this official race? The daily attempt remains used and will count as an unfinished result."))return;
 $("raceFrame").src="about:blank";$("raceDialog").close();state.race=null;
 if(r.mode==="official")loadPlayer().then(()=>{toast(r.done?"Official result recorded.":"Official attempt used. You can practise or retry tomorrow.");});
}
async function finishedGame(event){
 const r=state.race;
 if(!r||r.done||event.origin!==location.origin||event.source!==$("raceFrame").contentWindow)return;
 const payload=event.data;if(!payload||payload.type!=="elflympics-finish"||payload.game!==r.game.key)return;
 const score=Number(payload.score);if(!Number.isFinite(score)||score<0||score>1000000000)return;
 r.done=true;
 let note="Practice finished · "+score.toLocaleString()+" "+r.game.measure+". Practice scores do not enter the leaderboard.";
 if(r.mode==="official"){
  try{await rpc("complete_elf_race",{p_attempt_id:r.attemptId,p_score:score});note="Official result saved: "+score.toLocaleString()+" "+r.game.measure+". Your standings will update.";await loadPlayer();}
  catch(e){note="Official result could not be saved: "+e.message+" Contact the organiser with your race details.";r.done=false;}
 }
 $("raceMessage").textContent=note;$("raceMessage").hidden=false;if(r.mode==="official"&&r.done){$("raceFrame").style.pointerEvents="none";$("quitRace").focus();}
}
async function showBoard(day,name){
 $("boardTitle").textContent=name;$("eventTable").innerHTML='<div class="empty">Loading official standings…</div>';$("boardDialog").showModal();
 if(!ready){$("eventTable").innerHTML='<div class="empty">Official standings are not connected yet.</div>';return;}
 try{
  const data=await api("event_standings?select=position,display_name,result,event_points,player_id&day=eq."+day+"&order=position.asc");
  const posCounts=new Map();data.forEach(x=>posCounts.set(x.position,(posCounts.get(x.position)||0)+1));
  $("eventTable").innerHTML=data.length?table(["Place","Competitor","Result","Points"],data.map(x=>'<tr class="'+(x.player_id===state.session?.user?.id?"me":"")+'"><td class="num">'+rankCell(x.position,(posCounts.get(x.position)||0)>1)+'</td><td>'+clean(x.display_name)+'</td><td>'+clean(Number(x.result).toLocaleString())+'</td><td>'+clean(x.event_points)+'</td></tr>')):'<div class="empty">Nobody has completed an official race in this event yet.</div>';
 }catch(e){$("eventTable").innerHTML='<div class="empty">'+clean(e.message)+'</div>';}
}
document.querySelectorAll("[data-nav]").forEach(b=>b.addEventListener("click",()=>show(b.dataset.nav)));
document.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click",()=>{const d=$(b.dataset.close);if(d?.open)d.close();}));
$("accountButton").onclick=()=>state.session?show("profile"):openAuth();
$("heroEvents").onclick=()=>show("events");$("heroHow").onclick=()=>$("howDialog").showModal();
$("authSwitch").onclick=()=>openAuth(state.authMode==="register"?"login":"register");
$("authForm").addEventListener("submit",async e=>{
 e.preventDefault();const button=$("authSubmit"),form=e.currentTarget,vals=new FormData(form);button.disabled=true;$("authStatus").textContent="Connecting…";
 try{
  const msg=state.authMode==="register"?await signUp(String(vals.get("email")).trim(),String(vals.get("password")),String(vals.get("display_name")).trim()):await signIn(String(vals.get("email")).trim(),String(vals.get("password"))).then(()=>"Signed in successfully.");
  $("authStatus").textContent=msg;if(state.session){setTimeout(()=>{$("authDialog").close();show("profile");},600);}
 }catch(err){$("authStatus").textContent=err.message;}
 finally{button.disabled=false;}
});
$("resetPassword").onclick=async()=>{
 if(!ready){toast("Accounts are not connected.");return;}
 const email=$("authForm").querySelector('[name="email"]').value.trim();if(!email){$("authStatus").textContent="Enter your email address first.";return;}
 try{await authRequest("recover",{email});$("authStatus").textContent="If this email is registered, you'll receive password recovery instructions.";}catch(e){$("authStatus").textContent=e.message;}
};
$("practiceButton").onclick=()=>{const s=state.selected;if(s)openFrame(s.game,"practice");};
$("officialButton").onclick=startOfficial;$("quitRace").onclick=exitRace;
$("raceDialog").addEventListener("cancel",e=>{e.preventDefault();exitRace();});
window.addEventListener("message",finishedGame);
window.addEventListener("pageshow",e=>{if(e.persisted&&ready&&state.session)void loadPlayer();});
// Update the day and unlocks if the page remains open across UK midnight.
setInterval(()=>{const previous=calendarRevision.split("|",1)[0];if(previous!==today()){calendarRevision="";void loadEvents().then(renderCalendar);}},30000);
async function boot(){
 state.session=storageGet();
 const hash=new URLSearchParams(location.hash.replace(/^#/,""));
 if(hash.has("access_token")&&hash.has("refresh_token")){
  acceptSession({access_token:hash.get("access_token"),refresh_token:hash.get("refresh_token"),expires_in:Number(hash.get("expires_in"))||3600});history.replaceState(null,"",location.pathname+location.search);toast("Email confirmed. Welcome to Elflympics.");
 }
 // Render and make navigation interactive immediately. Network setup runs in parallel.
 updateAuthUI();render();
 const eventsPromise=loadEvents().then(()=>renderCalendar());
 if(ready&&state.session){
  void (async()=>{try{
   await ensureSession();
   const response=await fetch(base+"/auth/v1/user",{headers:{"apikey":conf.publishableKey,"Authorization":"Bearer "+state.session.access_token}});
   if(!response.ok)throw Error("Session expired");
   const user=await response.json();
   if(user?.id){state.session.user=user;storageSet(state.session);await loadPlayer();updateAuthUI();}
   else throw Error("Session expired");
  }catch(_){state.session=null;state.profile=null;state.attempts=[];state.standings=[];storageSet(null);updateAuthUI();renderStandings();}
  })();
 }
 void eventsPromise;
}
boot().catch(e=>toast(e.message));
})();