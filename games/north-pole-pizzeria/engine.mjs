// North Pole Pizzeria — original, deterministic shift / order / economy rules.
export const TOPPINGS={
  pepperoni:{label:'Pepperoni',day:1,cost:.22,colour:'#bd4b47'},
  mushroom:{label:'Mushroom',day:2,cost:.18,colour:'#d3b48a'},
  pepper:{label:'Green pepper',day:3,cost:.16,colour:'#3c9e66'},
  basil:{label:'Basil',day:4,cost:.14,colour:'#378c48'}
};
export const UPGRADES={
  oven:{name:'Turbo oven',cost:34,detail:'Bakes 30% faster'},
  patience:{name:'Cosy waiting area',cost:42,detail:'Customers wait 35% longer'},
  tips:{name:'Festive tip jar',cost:55,detail:'Earn 40% more tips'}
};
export const ORDERS_PER_DAY=4;
const rnd=n=>{let x=n>>>0||1;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296}};
const pick=(r,a)=>a[Math.floor(r()*a.length)];
export function availableToppings(day){return Object.keys(TOPPINGS).filter(t=>TOPPINGS[t].day<=day);}
export function requiredCuts(slices){return slices/2;}
export function makeOrder(day,index){
  const d=Math.max(1,Math.floor(day)),i=Math.max(0,Math.floor(index));
  const r=rnd(d*50923+i*9173+619);
  const available=availableToppings(d);
  const customer=pick(r,['Holly','Noel','Rudy','Juniper','Pip','Clementine','Ivy','Blizzard','Robin','Merry']);
  const portraits=['elf','santa','reindeer','snow','elf','santa'];
  const portrait=portraits[(d*3+i*5+Math.floor(r()*5))%portraits.length];
  let sauce=true,cheese=true,side='all',slices=6,wellDone=false,toppings=[];
  if(d===1&&i===0){toppings=[];}
  else {
    const complex=Math.min(4,1+Math.floor((d-1)/2));
    const pool=available.slice();
    const toppingCount=Math.min(pool.length,Math.max(0,Math.floor(r()*(complex+1))));
    for(let k=0;k<toppingCount;k++){const j=Math.floor(r()*pool.length);toppings.push(pool.splice(j,1)[0]);}
    if(d>=2&&r()<.26)sauce=false;
    if(d>=3&&r()<.15)cheese=false;
    if(d>=3&&toppings.length&&r()<.35)side=r()<.5?'left':'right';
    if(d>=2&&r()<.4)slices=pick(r,[4,8]);
    if(d>=4&&r()<.32)wellDone=true;
  }
  const needed={sauce,cheese,toppings,side,slices,wellDone};
  const ingredients=toppings.map(x=>TOPPINGS[x].label.toLowerCase());
  let description;
  if(!toppings.length)description='A classic cheese pizza, please!';
  else description='Could I have '+ingredients.join(' and ')+' on my pizza?';
  if(!sauce)description+=' No tomato sauce.';
  if(!cheese)description+=' Leave off the cheese.';
  if(side!=='all')description+=' Toppings on the '+side+' half only.';
  if(slices!==6)description+=' Cut it into '+slices+' slices.';
  if(wellDone)description+=' Extra crispy, please!';
  const price=8+2.1*toppings.length+(wellDone?1.5:0)+(side!=='all'?.5:0);
  return {id:d+'-'+i,day:d,index:i,customer,portrait,needed,description,price:+price.toFixed(2)};
}
// Sauce and mozzarella are hand-applied brush marks, never full-pizza toggles.
// Restrict painting to the edible centre, leaving the hand-formed crust bare.
export const BASE_RADIUS=.345;
export const BRUSH_RADII={sauce:.109,cheese:.114};
const grid=[];
for(let gy=-10;gy<=10;gy++)for(let gx=-10;gx<=10;gx++){
  const x=.5+gx*.032,y=.5+gy*.032;
  if(Math.hypot(x-.5,y-.5)<=BASE_RADIUS-.012)grid.push([x,y]);
}
export function layerCoverage(pizza,ingredient){
  if(ingredient!=='sauce'&&ingredient!=='cheese')return 0;
  const marks=pizza[ingredient]||[];
  if(!marks.length)return 0;
  const radius=BRUSH_RADII[ingredient]**2;
  let covered=0;
  for(const [x,y] of grid)if(marks.some(p=>(p.x-x)**2+(p.y-y)**2<=radius))covered++;
  return covered/grid.length;
}
export function newPizza(){return {sauce:[],cheese:[],toppings:[],bake:0,cuts:0,spend:1.20};}
export function applyIngredient(pizza,ingredient,x=.5,y=.5){
  if(!Number.isFinite(x)||!Number.isFinite(y))return false;
  const px=Math.max(0,Math.min(1,x)),py=Math.max(0,Math.min(1,y));
  if(Math.hypot(px-.5,py-.5)>BASE_RADIUS)return false;
  if(ingredient==='sauce'||ingredient==='cheese'){
    const marks=pizza[ingredient];
    if(marks.length>=160||marks.some(p=>(p.x-px)**2+(p.y-py)**2<.018**2))return false;
    marks.push({x:px,y:py});
    // Every stroke uses ingredients; overworking a layer costs more.
    pizza.spend=+(pizza.spend+(ingredient==='sauce'?.011:.017)).toFixed(3);
    return true;
  }
  if(!(ingredient in TOPPINGS)||pizza.toppings.length>=48)return false;
  pizza.toppings.push({kind:ingredient,x:px,y:py});
  pizza.spend+=TOPPINGS[ingredient].cost;
  return true;
}
export function evaluate(order,pizza,patience=1,upgrades={}){
  const recipe=order.needed;
  let points=0,possible=0;
  for(const field of ['sauce','cheese']){
    possible+=16;
    const coverage=layerCoverage(pizza,field);
    const target=field==='sauce'?.74:.74;
    // A few dabs do not qualify as a fully dressed pizza.
    if(recipe[field])points+=16*Math.min(1,coverage/target);
    else points+=16*Math.max(0,1-coverage/.2);
  }
  const expected=new Set(recipe.toppings);
  const used=new Set(pizza.toppings.map(t=>t.kind));
  for(const ingredient of Object.keys(TOPPINGS)){
    if(!expected.has(ingredient)&&!used.has(ingredient))continue;
    possible+=26;
    if(!expected.has(ingredient)||!used.has(ingredient))continue;
    const placed=pizza.toppings.filter(t=>t.kind===ingredient);
    const correctSide=placed.filter(t=>recipe.side==='all'||(recipe.side==='left'?t.x<.48:t.x>.52));
    const desired=recipe.side==='all'?6:3;
    const quantity=Math.min(1,correctSide.length/desired);
    const excess=Math.max(0,(placed.length-desired)/desired);
    const wrongSide=(placed.length-correctSide.length)/Math.max(1,placed.length);
    points+=26*Math.max(0,quantity-excess*.25-wrongSide*.7);
  }
  possible+=18;
  const baked=pizza.bake>= (recipe.wellDone?1.04:.72) && pizza.bake<=(recipe.wellDone?1.48:1.10);
  points+=baked?18:Math.max(0,18-Math.abs(pizza.bake-(recipe.wellDone?1.24:.90))*30);
  possible+=10;
  points+=pizza.cuts===requiredCuts(recipe.slices)?10:Math.max(0,10-Math.abs(pizza.cuts-requiredCuts(recipe.slices))*4);
  const accuracy=Math.max(0,Math.min(1,points/possible));
  const happiness=Math.max(.15,Math.min(1,patience));
  const tip=+(Math.max(0,accuracy-.4)*5*happiness*(upgrades.tips?1.4:1)).toFixed(2);
  const refund=accuracy<.45?order.price*.65:accuracy<.7?order.price*.25:0;
  const earned=+(order.price+tip-refund-pizza.spend).toFixed(2);
  return {accuracy:Math.round(accuracy*100),tip,refund:+refund.toFixed(2),earned,stars:accuracy>=.92?3:accuracy>=.74?2:accuracy>=.52?1:0,baked};
}
export function buyUpgrade(cash,upgrades,key){
  const item=UPGRADES[key];
  if(!item||upgrades[key]||cash<item.cost)return null;
  return {cash:+(cash-item.cost).toFixed(2),upgrades:{...upgrades,[key]:true}};
}
export function ovenDuration(upgrades){return upgrades.oven?5100:7300;}
export function customerSeconds(upgrades){return upgrades.patience?115:85;}
