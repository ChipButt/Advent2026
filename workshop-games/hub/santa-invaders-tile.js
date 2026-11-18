/* GameBox Santa Invaders tile art. Uses only installed Christmas game sprites.
   Rendered once on a pixel-accurate canvas; no CSS-cropped sprite fragments. */
(()=>{
  "use strict";
  const canvases=[...document.querySelectorAll(".siCanvas")];
  if(!canvases.length)return;
  // Paths are resolved relative to this script, not whichever GameBox entry page loaded it.
  const scriptBase=new URL(".",document.currentScript.src);
  const urls={
    winter:"../workshop-watch/assets/vendor/gherwit/winter/Winter-Download/Winter-tiles.png",
    snow:"../workshop-watch/assets/vendor/admurin/pack82/Monster%20Pack%2082%20(Event)/Snowmen/Christmas_Snowman_C_Idle.png",
    ginger:"../workshop-watch/assets/vendor/admurin/pack85/Monster%20Pack%2085%20(Event%203)/Spritesheets/Gingerbread/Christmas_Gingerbread_Move.png",
    slime:"../workshop-watch/assets/vendor/admurin/pack85/Monster%20Pack%2085%20(Event%203)/Spritesheets/Slime/Christmas_Slime_Move.png",
    devil:"../workshop-watch/assets/vendor/admurin/pack85/Monster%20Pack%2085%20(Event%203)/Spritesheets/Devil/Christmas_Devil_Idle.png"
  };
  const images={};
  const load=([name,url])=>new Promise((resolve,reject)=>{
    const img=new Image();
    img.onload=()=>{if(img.naturalWidth<128||img.naturalHeight<128){reject(new Error("Invalid "+name));return;}images[name]=img;resolve();};
    img.onerror=()=>reject(new Error("Cannot load "+name));img.src=new URL(url,scriptBase).href;
  });
  Promise.all(Object.entries(urls).map(load)).then(()=>{
    for(const canvas of canvases){
      const g=canvas.getContext("2d");if(!g)continue;
      g.imageSmoothingEnabled=false;
      const w=canvas.width,h=canvas.height;
      for(let y=0;y<h;y+=16)for(let x=0;x<w;x+=16)
        g.drawImage(images.winter,12*16,1*16,16,16,x,y,16,16);
      // Gherwit atlas, 3×3 snowy fir on the left edge.
      for(let y=0;y<3;y++)for(let x=0;x<3;x++)
        g.drawImage(images.winter,(9+x)*16,(6+y)*16,16,16,
          -23+x*16,30+y*16,16,16);
      const character=(name,col,row,x,y,dim)=>{
        g.drawImage(images[name],col*128,row*128,128,128,
          Math.round(x-dim/2),Math.round(y-dim/2),dim,dim);
      };
      character("snow",0,0,34,61,112);
      character("ginger",0,2,37,14,105);
      character("slime",0,2,89,55,108);
      character("devil",0,2,87,13,106);
      g.fillStyle="#276685";g.fillRect(60,33,6,6);
      g.fillStyle="#f4feff";g.fillRect(61,34,4,4);
    }
  }).catch(err=>console.error("Santa Invaders menu artwork unavailable",err));
})();