(() => {
"use strict";

const $ = (id) => document.getElementById(id);
const SAVE_KEY = "tinyBusinessFullV1";
const VERSION = 1;

const businesses = [
  { name:"Lemonade Stand", icon:"🍋", cost:5, income:1, duration:1200, managerCost:250 },
  { name:"News Stand", icon:"📰", cost:75, income:8, duration:1800, managerCost:1200 },
  { name:"Seafood Cart", icon:"🍤", cost:700, income:68, duration:2600, managerCost:9000 },
  { name:"Auto Garage", icon:"🚗", cost:7500, income:560, duration:3900, managerCost:70000 },
  { name:"Pizza Shop", icon:"🍕", cost:65000, income:4300, duration:5600, managerCost:500000 },
  { name:"Donut Shop", icon:"🍩", cost:550000, income:31000, duration:7400, managerCost:3800000 },
  { name:"Movie Studio", icon:"🎬", cost:5200000, income:250000, duration:9600, managerCost:30000000 },
  { name:"Finance Firm", icon:"📈", cost:65000000, income:3200000, duration:11800, managerCost:440000000 },
  { name:"Airline", icon:"✈️", cost:900000000, income:46000000, duration:14200, managerCost:6500000000 },
  { name:"Orbital Labs", icon:"🚀", cost:14000000000, income:760000000, duration:17600, managerCost:85000000000 }
];

const upgrades = [
  { id:"lem2", name:"Fresh Recipe", desc:"Lemonade Stand earns ×2.", business:0, mult:2, cost:500 },
  { id:"news3", name:"Breaking Stories", desc:"News Stand earns ×3.", business:1, mult:3, cost:10000 },
  { id:"sea2", name:"Better Catch", desc:"Seafood Cart earns ×2.", business:2, mult:2, cost:90000 },
  { id:"garage2", name:"Premium Service", desc:"Auto Garage earns ×2.", business:3, mult:2, cost:850000 },
  { id:"pizza3", name:"Famous Sauce", desc:"Pizza Shop earns ×3.", business:4, mult:3, cost:6500000 },
  { id:"donut3", name:"Morning Rush", desc:"Donut Shop earns ×3.", business:5, mult:3, cost:48000000 },
  { id:"movie4", name:"Blockbuster Deal", desc:"Movie Studio earns ×4.", business:6, mult:4, cost:340000000 },
  { id:"finance5", name:"Market Network", desc:"Finance Firm earns ×5.", business:7, mult:5, cost:4800000000 },
  { id:"air5", name:"Global Routes", desc:"Airline earns ×5.", business:8, mult:5, cost:70000000000 },
  { id:"space10", name:"Reusable Launches", desc:"Orbital Labs earns ×10.", business:9, mult:10, cost:900000000000 },
  { id:"global2", name:"National Brand", desc:"All businesses earn ×2.", all:true, mult:2, cost:120000000 }
];

const achievements = [
  { id:"first100", title:"First Hundred", desc:"Earn $100 total.", ticket:1, test:s=>s.totalEarned>=100 },
  { id:"first10k", title:"Five Figures", desc:"Earn $10,000 total.", ticket:1, test:s=>s.totalEarned>=10000 },
  { id:"owner25", title:"Small Empire", desc:"Own 25 businesses total.", ticket:1, test:s=>ownedCount(s)>=25 },
  { id:"owner100", title:"Expansion Mode", desc:"Own 100 businesses total.", ticket:2, test:s=>ownedCount(s)>=100 },
  { id:"manager3", title:"Delegation", desc:"Hire 3 managers.", ticket:1, test:s=>managerCount(s)>=3 },
  { id:"manager10", title:"Hands Off", desc:"Hire all 10 managers.", ticket:3, test:s=>managerCount(s)>=10 },
  { id:"million", title:"Millionaire", desc:"Reach $1M company value.", ticket:2, test:s=>companyValue(s)>=1e6 },
  { id:"billion", title:"Billionaire", desc:"Reach $1B company value.", ticket:3, test:s=>companyValue(s)>=1e9 },
  { id:"investor1", title:"New Backers", desc:"Gain your first investor.", ticket:2, test:s=>s.investors>=1 },
  { id:"investor25", title:"Board Room", desc:"Reach 25 investors.", ticket:5, test:s=>s.investors>=25 }
];

const storeItems = [
  { id:"speed1", name:"Faster Operations", desc:"All business cycles are 10% faster.", cost:3, type:"speed", value:.90 },
  { id:"profit1", name:"Golden Branding", desc:"All businesses earn 15% more.", cost:4, type:"profit", value:1.15 },
  { id:"offline1", name:"Offline Office", desc:"Offline earnings improve from 55% to 80%.", cost:4, type:"offline", value:.80 },
  { id:"event1", name:"Marketing Team", desc:"Random bonus events last 50% longer.", cost:5, type:"event", value:1.5 }
];

const events = [
  { title:"CITY FESTIVAL", text:"All businesses ×2", type:"all", mult:2, duration:20 },
  { title:"FOOD REVIEW", text:"Pizza + Donuts ×4", type:"group", group:[4,5], mult:4, duration:15 },
  { title:"MARKET RALLY", text:"Finance Firm ×5", type:"business", business:7, mult:5, duration:16 },
  { title:"TRAVEL BOOM", text:"Airline ×4", type:"business", business:8, mult:4, duration:16 }
];

function makeState(){
  return {
    version:VERSION,
    money:5,
    totalEarned:0,
    investors:0,
    tickets:0,
    buyMult:1,
    businesses:businesses.map((_,i)=>({count:i===0?1:0,manager:false,running:false,progress:0})),
    upgrades:{},
    achievements:{},
    claimedAchievements:{},
    store:{},
    event:null,
    eventRemaining:0,
    lastSaved:Date.now()
  };
}

let state = makeState();
let lastFrame = performance.now();
let nextEventCheck = 18;

function ownedCount(s=state){ return s.businesses.reduce((n,b)=>n+b.count,0); }
function managerCount(s=state){ return s.businesses.filter(b=>b.manager).length; }

function fmt(n){
  if(!Number.isFinite(n)) return "$0";
  const abs=Math.abs(n);
  const units=[[1e30,"No"],[1e27,"Oc"],[1e24,"Sp"],[1e21,"Sx"],[1e18,"Qi"],[1e15,"Qa"],[1e12,"T"],[1e9,"B"],[1e6,"M"],[1e3,"K"]];
  for(const [v,s] of units){
    if(abs>=v) return "$"+(n/v).toFixed(abs>=v*100?0:abs>=v*10?1:2)+s;
  }
  return "$"+n.toFixed(n<100?2:0);
}

function storeSpeedMult(s=state){ return s.store.speed1 ? storeItems.find(x=>x.id==="speed1").value : 1; }
function storeProfitMult(s=state){ return s.store.profit1 ? storeItems.find(x=>x.id==="profit1").value : 1; }
function offlineRate(s=state){ return s.store.offline1 ? storeItems.find(x=>x.id==="offline1").value : .55; }
function eventDurationMult(s=state){ return s.store.event1 ? storeItems.find(x=>x.id==="event1").value : 1; }

function milestone(count){
  if(count>=100) return 10;
  if(count>=50) return 5;
  if(count>=25) return 3;
  if(count>=10) return 2;
  return 1;
}
function investorMult(s=state){ return 1+s.investors*.05; }
function upgradeMult(i,s=state){
  let m=1;
  upgrades.forEach(u=>{
    if(s.upgrades[u.id] && u.business===i) m*=u.mult;
    if(s.upgrades[u.id] && u.all) m*=u.mult;
  });
  return m;
}
function eventMult(i,s=state){
  const e=s.event;
  if(!e) return 1;
  if(e.type==="all") return e.mult;
  if(e.type==="business" && e.business===i) return e.mult;
  if(e.type==="group" && e.group.includes(i)) return e.mult;
  return 1;
}
function payout(i,s=state){
  const b=s.businesses[i];
  return businesses[i].income*Math.max(1,b.count)*milestone(b.count)*investorMult(s)*upgradeMult(i,s)*eventMult(i,s)*storeProfitMult(s);
}
function cycleSeconds(i,s=state){
  return businesses[i].duration/1000*storeSpeedMult(s);
}
function passivePerSec(s=state){
  let total=0;
  businesses.forEach((biz,i)=>{
    const b=s.businesses[i];
    if(b.manager && b.count>0) total+=payout(i,s)/cycleSeconds(i,s);
  });
  return total;
}
function companyValue(s=state){
  let v=s.money+s.totalEarned*.08;
  businesses.forEach((biz,i)=>{
    const b=s.businesses[i];
    v+=biz.cost*b.count*2.15;
    if(b.manager) v+=biz.managerCost;
  });
  return v;
}
function nextInvestorGain(s=state){
  const v=companyValue(s);
  if(v<1e6) return 0;
  return Math.max(0,Math.floor(Math.sqrt(v/1e6))-s.investors);
}
function costFor(i,n=1,s=state){
  let c=0;
  for(let j=0;j<n;j++) c+=businesses[i].cost*Math.pow(1.15,s.businesses[i].count+j);
  return c;
}
function maxAffordable(i){
  let n=0,c=0;
  while(n<1000){
    const next=businesses[i].cost*Math.pow(1.15,state.businesses[i].count+n);
    if(c+next>state.money) break;
    c+=next;n++;
  }
  return Math.max(1,n);
}
function chosenBuyAmount(i){
  if(state.buyMult==="max") return maxAffordable(i);
  return state.buyMult;
}

function save(){
  state.lastSaved=Date.now();
  localStorage.setItem(SAVE_KEY,JSON.stringify(state));
  $("saveStatus").textContent="Autosaved just now";
}
function load(){
  const raw=localStorage.getItem(SAVE_KEY);
  if(!raw) return;
  try{
    const parsed=JSON.parse(raw);
    const fresh=makeState();
    Object.assign(fresh,parsed);
    fresh.businesses=businesses.map((_,i)=>({...makeState().businesses[i],...(parsed.businesses?.[i]||{})}));
    fresh.upgrades=parsed.upgrades||{};
    fresh.achievements=parsed.achievements||{};
    fresh.claimedAchievements=parsed.claimedAchievements||{};
    fresh.store=parsed.store||{};
    fresh.event=null;fresh.eventRemaining=0;
    state=fresh;

    const seconds=Math.max(0,(Date.now()-(parsed.lastSaved||Date.now()))/1000);
    const offline=passivePerSec(state)*Math.min(seconds,8*3600)*offlineRate(state);
    if(offline>0){
      state.money+=offline;state.totalEarned+=offline;
      toast("Welcome back! Offline earnings: "+fmt(offline));
    }
  }catch(err){
    console.warn("Save load failed",err);
  }
}

function buyBusiness(i){
  const amount=chosenBuyAmount(i);
  const cost=costFor(i,amount);
  if(state.money<cost) return;
  state.money-=cost;
  state.businesses[i].count+=amount;
  renderAll();
  save();
}
function startBusiness(i){
  const b=state.businesses[i];
  if(b.count<=0||b.running) return;
  b.running=true;b.progress=0;
  renderBusinesses();
}
function hireManager(i){
  const b=state.businesses[i],biz=businesses[i];
  if(b.manager||b.count<=0||state.money<biz.managerCost) return;
  state.money-=biz.managerCost;
  b.manager=true;
  if(!b.running){b.running=true;b.progress=0}
  toast(biz.name+" manager hired!");
  renderAll();save();
}
function buyUpgrade(id){
  const u=upgrades.find(x=>x.id===id);
  if(!u||state.upgrades[id]||state.money<u.cost) return;
  state.money-=u.cost;state.upgrades[id]=true;
  toast(u.name+" purchased!");
  renderAll();save();
}
function claimAchievement(id){
  const a=achievements.find(x=>x.id===id);
  if(!a||state.claimedAchievements[id]||!a.test(state)) return;
  state.achievements[id]=true;
  state.claimedAchievements[id]=true;
  state.tickets+=a.ticket;
  toast("Achievement claimed: +"+a.ticket+" ticket"+(a.ticket===1?"":"s"));
  renderAll();save();
}
function buyStoreItem(id){
  const item=storeItems.find(x=>x.id===id);
  if(!item||state.store[id]||state.tickets<item.cost) return;
  state.tickets-=item.cost;state.store[id]=true;
  toast(item.name+" unlocked!");
  renderAll();save();
}
function prestige(){
  const gain=nextInvestorGain();
  if(gain<=0) return;
  if(!confirm("Sell the company and gain "+gain+" Investor Point"+(gain===1?"":"s")+"? Your Store bonuses and claimed achievements will remain.")) return;

  const persistent={
    investors:state.investors+gain,
    tickets:state.tickets,
    store:{...state.store},
    claimedAchievements:{...state.claimedAchievements},
    achievements:{...state.achievements}
  };
  state=makeState();
  Object.assign(state,persistent);
  toast("Company sold! Permanent income bonus: +"+(state.investors*5)+"%");
  renderAll();save();
}
function startRandomEvent(){
  const base=events[Math.floor(Math.random()*events.length)];
  state.event={...base};
  state.eventRemaining=base.duration*eventDurationMult();
  renderEvent();
  toast(base.title+"!");
}
function updateAchievements(){
  let unclaimed=false;
  achievements.forEach(a=>{
    if(a.test(state) && !state.claimedAchievements[a.id]) unclaimed=true;
  });
  $("achievementDot").classList.toggle("hidden",!unclaimed);
}

function renderHeader(){
  $("cash").textContent=fmt(state.money);
  $("perSec").textContent="+"+fmt(passivePerSec())+" / sec";
  $("companyValueTop").textContent=fmt(companyValue());
  $("multBtn").textContent=state.buyMult==="max"?"MAX":"×"+state.buyMult;
}
function renderEvent(){
  const has=!!state.event;
  $("eventStrip").classList.toggle("hidden",!has);
  if(has){
    $("eventTitle").textContent=state.event.title;
    $("eventText").textContent=state.event.text;
    $("eventTimer").textContent=Math.max(0,Math.ceil(state.eventRemaining))+"s";
  }
}
function renderBusinesses(){
  const wrap=$("businessGrid");
  wrap.innerHTML="";
  businesses.forEach((biz,i)=>{
    const b=state.businesses[i];
    const amount=chosenBuyAmount(i);
    const cost=costFor(i,amount);
    const card=document.createElement("article");
    card.className="biz-card";
    card.innerHTML=`
      <div class="icon-col">
        <div class="icon-circle">${biz.icon}</div>
        <div class="count-pill">${b.count.toLocaleString()}</div>
      </div>
      <div class="card-main">
        <div class="biz-title-line">
          <span class="biz-title">${biz.name}</span>
          <span class="milestone">milestone ×${milestone(b.count)}</span>
        </div>
        <div class="income-bar">${fmt(payout(i))} / cycle • ${cycleSeconds(i).toFixed(1)} sec</div>
        <div class="buy-row">
          <button class="buy-btn orange" data-buy="${i}" ${state.money<cost?"disabled":""}>
            <span class="price">${fmt(cost)}</span>
            <span class="buy-meta">buy ${state.buyMult==="max"?"max":amount}</span>
          </button>
          <button class="buy-btn yellow" data-run="${i}" ${b.running||b.count===0?"disabled":""}>
            <span class="price">${fmt(payout(i))}</span>
            <span class="buy-meta">${b.manager?"auto running":"run cycle"}</span>
          </button>
        </div>
        <div class="sub-row">
          <button class="manager-chip" data-manager="${i}" ${b.manager||b.count===0||state.money<biz.managerCost?"disabled":""}>${b.manager?"manager hired":"manager "+fmt(biz.managerCost)}</button>
          <span class="bonus-chip">${b.manager?"AUTO":"MANUAL"}</span>
        </div>
        <div class="progress"><div data-progress="${i}" style="width:${b.progress*100}%"></div></div>
      </div>`;
    wrap.appendChild(card);
  });
  wrap.querySelectorAll("[data-buy]").forEach(b=>b.addEventListener("click",()=>buyBusiness(+b.dataset.buy)));
  wrap.querySelectorAll("[data-run]").forEach(b=>b.addEventListener("click",()=>startBusiness(+b.dataset.run)));
  wrap.querySelectorAll("[data-manager]").forEach(b=>b.addEventListener("click",()=>hireManager(+b.dataset.manager)));
}
function renderUpgrades(){
  const wrap=$("upgradesList");wrap.innerHTML="";
  upgrades.forEach(u=>{
    const owned=!!state.upgrades[u.id];
    const el=document.createElement("div");el.className="simple-item";
    el.innerHTML=`<div><h3>${u.name}</h3><p>${u.desc}</p></div>
      <button class="mini-buy" data-upgrade="${u.id}" ${owned||state.money<u.cost?"disabled":""}>${owned?"Owned":fmt(u.cost)}</button>`;
    wrap.appendChild(el);
  });
  wrap.querySelectorAll("[data-upgrade]").forEach(b=>b.addEventListener("click",()=>buyUpgrade(b.dataset.upgrade)));
}
function renderManagers(){
  const wrap=$("managersList");wrap.innerHTML="";
  businesses.forEach((biz,i)=>{
    const b=state.businesses[i],el=document.createElement("div");el.className="simple-item";
    el.innerHTML=`<div><h3>${biz.name} Manager</h3><p>${b.manager?"Automatically restarts this business.":"Hire to automate every production cycle."}</p></div>
      <button class="mini-buy" data-mgr="${i}" ${b.manager||b.count===0||state.money<biz.managerCost?"disabled":""}>${b.manager?"Hired":fmt(biz.managerCost)}</button>`;
    wrap.appendChild(el);
  });
  wrap.querySelectorAll("[data-mgr]").forEach(b=>b.addEventListener("click",()=>hireManager(+b.dataset.mgr)));
}
function renderAchievements(){
  const wrap=$("achievementsList");wrap.innerHTML="";
  achievements.forEach(a=>{
    const complete=a.test(state),claimed=!!state.claimedAchievements[a.id];
    const el=document.createElement("article");
    el.className="achievement-card "+(!complete?"locked ":"")+(claimed?"claimed":"");
    el.innerHTML=`
      <div class="achievement-icon">${claimed?"✓":complete?"★":"?"}</div>
      <div><h3>${a.title}</h3><p>${a.desc} • Reward: ${a.ticket} 🎟️</p></div>
      <button class="claim-btn" data-ach="${a.id}" ${!complete||claimed?"disabled":""}>${claimed?"Claimed":complete?"Claim":"Locked"}</button>`;
    wrap.appendChild(el);
  });
  wrap.querySelectorAll("[data-ach]").forEach(b=>b.addEventListener("click",()=>claimAchievement(b.dataset.ach)));
}
function renderInvestors(){
  const gain=nextInvestorGain();
  $("investorCount").textContent=state.investors;
  $("investorGain").textContent=gain;
  $("investorBonus").textContent="+"+(state.investors*5)+"%";
  $("prestigeBtn").disabled=gain<=0;
  $("investorNote").textContent=gain>0
    ?"Selling now adds "+gain+" Investor Point"+(gain===1?"":"s")+"."
    :"Reach a company value of $1M to attract investors.";
}
function renderStore(){
  $("ticketCount").textContent=state.tickets;
  const wrap=$("storeList");wrap.innerHTML="";
  storeItems.forEach(item=>{
    const owned=!!state.store[item.id];
    const el=document.createElement("article");el.className="store-card "+(owned?"owned":"");
    el.innerHTML=`<div><h3>${item.name}</h3><p>${item.desc}</p></div>
      <button class="store-buy" data-store="${item.id}" ${owned||state.tickets<item.cost?"disabled":""}>${owned?"Owned":item.cost+" 🎟️"}</button>`;
    wrap.appendChild(el);
  });
  wrap.querySelectorAll("[data-store]").forEach(b=>b.addEventListener("click",()=>buyStoreItem(b.dataset.store)));
}
function renderAll(){
  renderHeader();renderEvent();renderBusinesses();renderUpgrades();renderManagers();
  renderAchievements();renderInvestors();renderStore();updateAchievements();
}

function switchPanel(name){
  const ids={
    businesses:"businessesPanel",achievements:"achievementsPanel",upgrades:"upgradesPanel",
    managers:"managersPanel",investors:"investorsPanel",store:"storePanel"
  };
  Object.entries(ids).forEach(([key,id])=>$(id).classList.toggle("hidden",key!==name));
  document.querySelectorAll(".nav-btn").forEach(btn=>btn.classList.toggle("active",btn.dataset.panel===name));
}
function toast(msg){
  const el=$("toast");el.textContent=msg;el.classList.add("show");
  clearTimeout(toast._timer);toast._timer=setTimeout(()=>el.classList.remove("show"),2300);
}

function openExport(){
  $("dialogTitle").textContent="Export Save";
  $("saveText").value=btoa(unescape(encodeURIComponent(JSON.stringify(state))));
  $("saveText").readOnly=true;
  $("dialogApplyBtn").classList.add("hidden");
  $("saveDialog").showModal();
  $("saveText").select();
}
function openImport(){
  $("dialogTitle").textContent="Import Save";
  $("saveText").value="";
  $("saveText").readOnly=false;
  $("dialogApplyBtn").classList.remove("hidden");
  $("saveDialog").showModal();
}
function applyImport(){
  try{
    const decoded=decodeURIComponent(escape(atob($("saveText").value.trim())));
    const parsed=JSON.parse(decoded);
    if(!parsed||!Array.isArray(parsed.businesses)) throw new Error("invalid");
    localStorage.setItem(SAVE_KEY,JSON.stringify(parsed));
    state=makeState();
    load();
    $("saveDialog").close();
    renderAll();
    toast("Save imported.");
  }catch{
    alert("That save code is not valid.");
  }
}

function loop(now){
  const dt=Math.min(.1,(now-lastFrame)/1000);
  lastFrame=now;

  businesses.forEach((biz,i)=>{
    const b=state.businesses[i];
    if(b.count<=0) return;
    if(b.manager&&!b.running){b.running=true;b.progress=0}
    if(!b.running) return;

    const seconds=cycleSeconds(i);
    b.progress+=dt/seconds;
    if(b.progress>=1){
      const cycles=Math.floor(b.progress);
      const earned=payout(i)*cycles;
      state.money+=earned;state.totalEarned+=earned;
      b.progress-=cycles;
      if(!b.manager){b.running=false;b.progress=0}
    }
  });

  if(state.event){
    state.eventRemaining-=dt;
    if(state.eventRemaining<=0){
      state.event=null;state.eventRemaining=0;renderEvent();toast("Bonus event ended.");
    }else{
      $("eventTimer").textContent=Math.ceil(state.eventRemaining)+"s";
    }
  }else{
    nextEventCheck-=dt;
    if(nextEventCheck<=0){
      nextEventCheck=22+Math.random()*22;
      if(Math.random()<.52) startRandomEvent();
    }
  }

  renderHeader();
  document.querySelectorAll("[data-progress]").forEach(el=>{
    const i=+el.dataset.progress;
    el.style.width=(state.businesses[i].progress*100)+"%";
  });
  updateAchievements();
  requestAnimationFrame(loop);
}

$("multBtn").addEventListener("click",()=>{
  const order=[1,10,100,"max"];
  state.buyMult=order[(order.indexOf(state.buyMult)+1)%order.length];
  renderBusinesses();renderHeader();
});
$("prestigeBtn").addEventListener("click",prestige);
$("exportBtn").addEventListener("click",openExport);
$("importBtn").addEventListener("click",openImport);
$("dialogApplyBtn").addEventListener("click",applyImport);
$("resetBtn").addEventListener("click",()=>{
  if(confirm("Reset ALL Tiny Business progress, including Store bonuses and tickets?")){
    localStorage.removeItem(SAVE_KEY);state=makeState();renderAll();save();toast("Save reset.");
  }
});
document.querySelectorAll(".nav-btn").forEach(btn=>btn.addEventListener("click",()=>switchPanel(btn.dataset.panel)));

load();
renderAll();
switchPanel("businesses");
setInterval(save,10000);
requestAnimationFrame(loop);
})();