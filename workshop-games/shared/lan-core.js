(() => {
  'use strict';
  const enc = obj => btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
  const dec = code => JSON.parse(decodeURIComponent(escape(atob(String(code||'').trim()))));
  const waitIce = pc => {
    if (pc.iceGatheringState === 'complete') return Promise.resolve();
    return new Promise(resolve => {
      let done = false;
      const finish = () => { if(done) return; done=true; pc.removeEventListener('icegatheringstatechange',check); resolve(); };
      const check = () => { if(pc.iceGatheringState==='complete') finish(); };
      pc.addEventListener('icegatheringstatechange',check);
      setTimeout(finish,4500);
    });
  };
  const makePeer = () => new RTCPeerConnection({iceServers:[]});
  const id = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  class GameBoxLANSession {
    constructor(options={}){
      this.game = options.game || 'gamebox';
      this.onMessage = options.onMessage || (()=>{});
      this.onPeersChanged = options.onPeersChanged || (()=>{});
      this.onStatus = options.onStatus || (()=>{});
      this.role = null;
      this.hostPending = null;
      this.hostPeers = [];
      this.clientPeer = null;
      this.clientChannel = null;
      this.clientId = id();
    }
    status(text){ this.onStatus(text); }
    async createHostOffer(){
      this.role='host';
      const pc=makePeer(), channel=pc.createDataChannel(`gamebox-${this.game}`), peer={id:id(),pc,channel,meta:{}};
      this._wireHostPeer(peer);
      const offer=await pc.createOffer();
      await pc.setLocalDescription(offer);
      await waitIce(pc);
      this.hostPending=peer;
      this.status('Invite ready');
      return enc({v:1,game:this.game,description:pc.localDescription});
    }
    async acceptHostAnswer(code){
      if(!this.hostPending) throw new Error('No pending invite');
      const payload=dec(code);
      if(payload.game!==this.game) throw new Error('Invite is for a different game');
      await this.hostPending.pc.setRemoteDescription(payload.description);
      this.hostPeers.push(this.hostPending);
      this.hostPending=null;
      this.status('Connecting');
    }
    async createClientAnswer(code){
      this.role='client';
      const payload=dec(code);
      if(payload.game!==this.game) throw new Error('Invite is for a different game');
      const pc=makePeer(); this.clientPeer=pc;
      pc.ondatachannel=e=>{this.clientChannel=e.channel;this._wireClientChannel(this.clientChannel);};
      await pc.setRemoteDescription(payload.description);
      const answer=await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await waitIce(pc);
      this.status('Answer ready');
      return enc({v:1,game:this.game,description:pc.localDescription});
    }
    _wireHostPeer(peer){
      peer.channel.onopen=()=>{this.status('Connected');this.onPeersChanged(this.peers());};
      peer.channel.onclose=()=>{this.onPeersChanged(this.peers());};
      peer.channel.onerror=()=>this.status('Connection error');
      peer.channel.onmessage=e=>this._receive(e.data,{role:'host',peer});
    }
    _wireClientChannel(channel){
      channel.onopen=()=>{this.status('Connected');this.onPeersChanged(this.peers());};
      channel.onclose=()=>{this.status('Disconnected');this.onPeersChanged(this.peers());};
      channel.onerror=()=>this.status('Connection error');
      channel.onmessage=e=>this._receive(e.data,{role:'client'});
    }
    _receive(raw,source){
      try{const msg=JSON.parse(raw);this.onMessage(msg,source);}catch(err){console.warn('GameBox LAN message error',err);}
    }
    peers(){
      if(this.role==='host') return this.hostPeers.filter(p=>p.channel?.readyState==='open');
      return this.clientChannel?.readyState==='open'?[{id:'host',channel:this.clientChannel}]:[];
    }
    sendToHost(message){if(this.clientChannel?.readyState==='open')this.clientChannel.send(JSON.stringify(message));}
    sendToPeer(peer,message){if(peer?.channel?.readyState==='open')peer.channel.send(JSON.stringify(message));}
    broadcast(message){if(this.role==='host')this.peers().forEach(p=>this.sendToPeer(p,message));else this.sendToHost(message);}
    close(){
      try{this.hostPending?.pc?.close();}catch{}
      this.hostPeers.forEach(p=>{try{p.pc?.close();}catch{}});
      try{this.clientPeer?.close();}catch{}
      this.hostPending=null;this.hostPeers=[];this.clientPeer=null;this.clientChannel=null;this.role=null;
      this.onPeersChanged([]);
    }
  }

  let trysteroModulePromise=null;
  const loadTrystero=()=>trysteroModulePromise||(trysteroModulePromise=import('https://esm.run/trystero'));

  const shortHash=value=>{
    let h=2166136261;
    for(const ch of String(value||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}
    return (h>>>0).toString(36);
  };

  const normaliseNetworkAddress=address=>{
    const value=String(address||'').trim().toLowerCase();
    if(!value)return '';
    if(value.includes(':')){
      const parts=value.split(':').filter(Boolean);
      return parts.slice(0,4).join(':');
    }
    return value;
  };

  const discoverNetworkKey=()=>new Promise(resolve=>{
    if(!globalThis.RTCPeerConnection){resolve('fallback');return;}
    let settled=false;
    let pc=null;
    let timer=null;
    const finish=value=>{
      if(settled)return;
      settled=true;
      try{pc?.close();}catch{}
      if(timer)clearTimeout(timer);
      resolve(shortHash(value||'fallback'));
    };
    try{
      pc=new RTCPeerConnection({iceServers:[{urls:'stun:stun.cloudflare.com:3478'}]});
      pc.createDataChannel('gamebox-network-probe');
      pc.onicecandidate=e=>{
        const raw=e.candidate?.candidate||'';
        if(!raw)return;
        const bits=raw.split(/\s+/);
        const typeAt=bits.indexOf('typ');
        if(typeAt<0||bits[typeAt+1]!=='srflx')return;
        finish(normaliseNetworkAddress(bits[4]));
      };
      pc.createOffer().then(offer=>pc.setLocalDescription(offer)).catch(()=>finish('fallback'));
    }catch{
      finish('fallback');
      return;
    }
    timer=setTimeout(()=>finish('fallback'),2800);
  });

  class GameBoxDiscoverySession {
    constructor(options={}){
      this.game=options.game||'gamebox-auto';
      this.onMessage=options.onMessage||(()=>{});
      this.onPeersChanged=options.onPeersChanged||(()=>{});
      this.onStatus=options.onStatus||(()=>{});
      this.onHostsChanged=options.onHostsChanged||(()=>{});
      this.role=null;
      this.room=null;
      this.selfId='';
      this.hostMeta=null;
      this.hostPeers=[];
      this.hostPeerId='';
      this.hosts=new Map();
      this.actions={};
      this.adTimer=null;
      this.pruneTimer=null;
      this.joinWaiter=null;
      this.closed=false;
      this.maxPlayers=4;
    }

    status(text){this.onStatus(text);}

    async _ensureRoom(){
      if(this.room)return;
      this.status('Finding games');
      const {joinRoom,selfId}=await loadTrystero();
      if(this.closed)throw new Error('Session closed');
      this.selfId=selfId;
      const roomId='gridline-public-lobby-v2';
      this.room=joinRoom({appId:'chip-in-gamebox-gridline-auto-v2'},roomId);
      this.actions.ad=this.room.makeAction(`${this.game}-host-ad`);
      this.actions.join=this.room.makeAction(`${this.game}-join`);
      this.actions.accept=this.room.makeAction(`${this.game}-accept`);
      this.actions.message=this.room.makeAction(`${this.game}-message`);

      this.actions.ad.onMessage=(data,{peerId})=>{
        if(this.role!=='client'||!data||data.game!==this.game)return;
        if(data.closed){
          if(this.hosts.delete(peerId))this._notifyHosts();
          if(peerId===this.hostPeerId){
            this.hostPeerId='';
            this.status('Host closed');
            this.onPeersChanged([]);
          }
          return;
        }
        this.hosts.set(peerId,{...data,peerId,lastSeen:Date.now()});
        this._notifyHosts();
      };

      this.actions.join.onMessage=(data,{peerId})=>{
        if(this.role!=='host'||!data||data.game!==this.game)return;
        if(this.hostMeta?.started){
          this.actions.accept.send({game:this.game,ok:false,reason:'Race already started'},{target:peerId});
          return;
        }
        if(this.hostPeers.length>=this.maxPlayers-1){
          this.actions.accept.send({game:this.game,ok:false,reason:'Lobby full'},{target:peerId});
          return;
        }
        let peer=this.hostPeers.find(p=>p.id===peerId);
        if(!peer){
          peer={id:peerId,meta:{}};
          this.hostPeers.push(peer);
        }
        peer.meta.player=data.player||null;
        peer.meta.profile=data.profile||null;
        this.actions.accept.send({
          game:this.game,
          ok:true,
          hostName:this.hostMeta?.hostName||'Gridline Host'
        },{target:peerId});
        this.status('Player connected');
        this.onPeersChanged(this.peers());
        this._advertise();
      };

      this.actions.accept.onMessage=(data,{peerId})=>{
        if(this.role!=='client'||!this.joinWaiter||peerId!==this.joinWaiter.peerId)return;
        if(!data?.ok){
          this.joinWaiter.reject(new Error(data?.reason||'Could not join'));
          this.joinWaiter=null;
          return;
        }
        this.hostPeerId=peerId;
        this.status('Connected');
        const resolve=this.joinWaiter.resolve;
        this.joinWaiter=null;
        this.onPeersChanged(this.peers());
        resolve(data);
      };

      this.actions.message.onMessage=(data,{peerId})=>{
        if(this.role==='host'){
          const peer=this.hostPeers.find(p=>p.id===peerId);
          if(!peer)return;
          this.onMessage(data,{role:'host',peer});
        }else if(this.role==='client'&&peerId===this.hostPeerId){
          this.onMessage(data,{role:'client'});
        }
      };

      this.room.onPeerJoin=peerId=>{
        if(this.role==='host'){
          this.status('Host visible');
          this._advertise(peerId);
        }else if(this.role==='client'){
          this.status('Scanning');
        }
      };

      this.room.onPeerLeave=peerId=>{
        if(this.role==='host'){
          const before=this.hostPeers.length;
          this.hostPeers=this.hostPeers.filter(p=>p.id!==peerId);
          if(this.hostPeers.length!==before){
            this.onPeersChanged(this.peers());
            this._advertise();
          }
        }else if(this.role==='client'){
          if(this.hosts.delete(peerId))this._notifyHosts();
          if(peerId===this.hostPeerId){
            this.hostPeerId='';
            this.status('Host disconnected');
            this.onPeersChanged([]);
          }
        }
      };

      this.pruneTimer=setInterval(()=>{
        if(this.role!=='client')return;
        const cutoff=Date.now()-20000;
        let changed=false;
        for(const [peerId,host] of this.hosts){
          if(host.lastSeen<cutoff){this.hosts.delete(peerId);changed=true;}
        }
        if(changed)this._notifyHosts();
      },2000);
    }

    _notifyHosts(){
      const hosts=Array.from(this.hosts.values())
        .sort((a,b)=>String(a.hostName||'').localeCompare(String(b.hostName||'')));
      this.onHostsChanged(hosts);
    }

    _advertise(target=null){
      if(this.role!=='host'||!this.room||!this.actions.ad||!this.hostMeta)return;
      const payload={
        game:this.game,
        hostName:this.hostMeta.hostName||'Gridline Host',
        playerName:this.hostMeta.player?.name||'Host',
        playerCount:1+this.hostPeers.length,
        maxPlayers:this.maxPlayers,
        started:!!this.hostMeta.started,
        raceMode:this.hostMeta.raceMode||'quick',
        trackName:this.hostMeta.trackName||'Harbour Sprint',
        totalRaces:Number(this.hostMeta.totalRaces)||1
      };
      this.actions.ad.send(payload,target?{target}:undefined);
    }

    async startHost(meta={}){
      if(this.closed)this.closed=false;
      clearInterval(this.adTimer);
      this.adTimer=null;
      if(this.joinWaiter){
        this.joinWaiter.reject(new Error('Role changed'));
        this.joinWaiter=null;
      }
      this.hosts.clear();
      this.hostPeerId='';
      this.hostPeers=[];
      this.role='host';
      this.hostMeta={...meta,started:false};
      await this._ensureRoom();
      this.status('Host visible');
      this._advertise();
      this.adTimer=setInterval(()=>this._advertise(),2200);
      this.onPeersChanged(this.peers());
    }

    async startScanner(){
      if(this.closed)this.closed=false;
      clearInterval(this.adTimer);
      this.adTimer=null;
      if(this.joinWaiter){
        this.joinWaiter.reject(new Error('Role changed'));
        this.joinWaiter=null;
      }
      this.hostMeta=null;
      this.hostPeers=[];
      this.hosts.clear();
      this.hostPeerId='';
      this.role='client';
      await this._ensureRoom();
      this.status('Scanning for hosts');
      this._notifyHosts();
    }

    updateHost(meta={}){
      this.hostMeta={...(this.hostMeta||{}),...meta};
      this._advertise();
    }

    availableHosts(){return Array.from(this.hosts.values());}

    async joinHost(peerId,meta={}){
      if(this.role!=='client')throw new Error('Not scanning for hosts');
      if(!peerId)throw new Error('Host not selected');
      if(this.joinWaiter)throw new Error('Already joining a host');
      this.status('Joining');
      return new Promise((resolve,reject)=>{
        const timer=setTimeout(()=>{
          if(this.joinWaiter?.peerId===peerId){
            this.joinWaiter=null;
            this.status('Join timed out');
            reject(new Error('Join timed out'));
          }
        },7000);
        this.joinWaiter={
          peerId,
          resolve:value=>{clearTimeout(timer);resolve(value);},
          reject:error=>{clearTimeout(timer);reject(error);}
        };
        this.actions.join.send({
          game:this.game,
          player:meta.player||null,
          profile:meta.profile||null
        },{target:peerId}).catch(err=>{
          if(this.joinWaiter?.peerId===peerId){
            const rejectNow=this.joinWaiter.reject;
            this.joinWaiter=null;
            rejectNow(err);
          }
        });
      });
    }

    peers(){
      if(this.role==='host')return [...this.hostPeers];
      return this.hostPeerId?[{id:this.hostPeerId,meta:{}}]:[];
    }

    sendToHost(message){
      if(this.role==='client'&&this.hostPeerId)this.actions.message?.send(message,{target:this.hostPeerId});
    }

    sendToPeer(peer,message){
      if(peer?.id)this.actions.message?.send(message,{target:peer.id});
    }

    broadcast(message){
      if(this.role==='host'){
        const targets=this.hostPeers.map(p=>p.id);
        if(targets.length)this.actions.message?.send(message,{target:targets});
      }else{
        this.sendToHost(message);
      }
    }

    suspend(){
      if(this.role==='host'&&this.room&&this.actions.ad){
        try{this.actions.ad.send({game:this.game,closed:true});}catch{}
      }
      clearInterval(this.adTimer);
      this.adTimer=null;
      if(this.joinWaiter){
        this.joinWaiter.reject(new Error('Session suspended'));
        this.joinWaiter=null;
      }
      this.hostMeta=null;
      this.hostPeers=[];
      this.hostPeerId='';
      this.hosts.clear();
      this.role=null;
      this.onPeersChanged([]);
      this.onHostsChanged([]);
      this.status('Idle');
    }

    close(){
      this.closed=true;
      clearInterval(this.adTimer);
      clearInterval(this.pruneTimer);
      this.adTimer=null;
      this.pruneTimer=null;
      if(this.joinWaiter){
        this.joinWaiter.reject(new Error('Session closed'));
        this.joinWaiter=null;
      }
      try{
        const peers=this.room?.getPeers?.()||{};
        Object.values(peers).forEach(pc=>{try{pc?.close?.()}catch{}});
      }catch{}
      try{this.room?.leave();}catch{}
      this.room=null;
      this.hostMeta=null;
      this.actions={};
      this.hostPeers=[];
      this.hosts.clear();
      this.hostPeerId='';
      this.role=null;
      this.onPeersChanged([]);
      this.onHostsChanged([]);
    }
  }

  window.GameBoxLAN={Session:GameBoxLANSession,DiscoverySession:GameBoxDiscoverySession,encode:enc,decode:dec};
})();