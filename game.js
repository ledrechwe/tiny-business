(() => {
"use strict";

const $ = id => document.getElementById(id);
const SAVE_KEY = "tinyBusinessFullV2";

const businesses = [
  {name:"Lemonade Stand",icon:"🍋",cost:5,income:1,duration:1200,managerCost:250},
  {name:"News Stand",icon:"📰",cost:75,income:8,duration:1800,managerCost:1200},
  {name:"Seafood Cart",icon:"🍤",cost:700,income:68,duration:2600,managerCost:9000},
  {name:"Auto Garage",icon:"🚗",cost:7500,income:560,duration:3900,managerCost:70000},
  {name:"Pizza Shop",icon:"🍕",cost:65000,income:4300,duration:5600,managerCost:500000},
  {name:"Donut Shop",icon:"🍩",cost:550000,income:31000,duration:7400,managerCost:3800000},
  {name:"Movie Studio",icon:"🎬",cost:5200000,income:250000,duration:9600,managerCost:30000000},
  {name:"Finance Firm",icon:"📈",cost:65000000,income:3200000,duration:11800,managerCost:440000000},
  {name:"Airline",icon:"✈️",cost:900000000,income:46000000,duration:14200,managerCost:6500000000},
  {name:"Orbital Labs",icon:"🚀",cost:14000000000,income:760000000,duration:17600,managerCost:85000000000}
];

const upgrades = [
  {id:"u0",name:"Fresh Recipe",desc:"Lemonade Stand earns ×2.",business:0,mult:2,cost:500},
  {id:"u1",name:"Breaking Stories",desc:"News Stand earns ×3.",business:1,mult:3,cost:10000},
  {id:"u2",name:"Better Catch",desc:"Seafood Cart earns ×2.",business:2,mult:2,cost:90000},
  {id:"u3",name:"Premium Service",desc:"Auto Garage earns ×2.",business:3,mult:2,cost:850000},
  {id:"u4",name:"Famous Sauce",desc:"Pizza Shop earns ×3.",business:4,mult:3,cost:6500000},
  {id:"u5",name:"Morning Rush",desc:"Donut Shop earns ×3.",business:5,mult:3,cost:48000000},
  {id:"u6",name:"Blockbuster Deal",desc:"Movie Studio earns ×4.",business:6,mult:4,cost:340000000},
  {id:"u7",name:"Market Network",desc:"Finance Firm earns ×5.",business:7,mult:5,cost:4800000000},
  {id:"u8",name:"Global Routes",desc:"Airline earns ×5.",business:8,mult:5,cost:70000000000},
  {id:"u9",name:"Reusable Launches",desc:"Orbital Labs earns ×10.",business:9,mult:10,cost:900000000000},
  {id:"global",name:"National Brand",desc:"All businesses earn ×2.",all:true,mult:2,cost:120000000}
];

const achievements = [
  {id:"a100",title:"First Hundred",desc:"Earn $100 total.",ticket:1,test:s=>s.totalEarned>=100},
  {id:"a10k",title:"Five Figures",desc:"Earn $10,000 total.",ticket:1,test:s=>s.totalEarned>=10000},
  {id:"a25",title:"Small Empire",desc:"Own 25 businesses total.",ticket:1,test:s=>ownedCount(s)>=25},
  {id:"a100b",title:"Expansion Mode",desc:"Own 100 businesses total.",ticket:2,test:s=>ownedCount(s)>=100},
  {id:"am3",title:"Delegation",desc:"Hire 3 managers.",ticket:1,test:s=>managerCount(s)>=3},
  {id:"am10",title:"Hands Off",desc:"Hire all 10 managers.",ticket:3,test:s=>managerCount(s)>=10},
  {id:"amil",title:"Millionaire",desc:"Reach $1M company value.",ticket:2,test:s=>companyValue(s)>=1e6},
  {id:"abil",title:"Billionaire",desc:"Reach $1B company value.",ticket:3,test:s=>companyValue(s)>=1e9},
  {id:"ai1",title:"New Backers",desc:"Gain your first investor.",ticket:2,test:s=>s.investors>=1}
];

const storeItems = [
  {id:"speed",name:"Faster Operations",desc:"All cycles are 10% faster.",cost:3},
  {id:"profit",name:"Golden Branding",desc:"All businesses earn 15% more.",cost:4},
  {id:"offline",name:"Offline Office",desc:"Offline earnings improve to 80%.",cost:4},
  {id:"event",name:"Marketing Team",desc:"Bonus events last 50% longer.",cost:5}
];

const events = [
  {title:"CITY FESTIVAL",text:"All businesses ×2",type:"all",mult:2,duration:20},
  {title:"FOOD REVIEW",text:"Pizza + Donuts ×4",type:"group",group:[4,5],mult:4,duration:15},
  {title:"MARKET RALLY",text:"Finance Firm ×5",type:"business",business:7,mult:5,duration:16},
  {title:"TRAVEL BOOM",text:"Airline ×4",type:"business",business:8,mult:4,duration:16}
];

function freshState(){
  return {
    money:5,totalEarned:0,investors:0,tickets:0,buyMult:1,
    businesses:businesses.map((_,i)=>({count:i===0?1:0,manager:false,running:false,progress:0})),
    upgrades:{},claimedAchievements:{},store:{},soundOn:true,event:null,eventRemaining:0,lastSaved:Date.now()
  };
}

let state = freshState();
let lastFrame = performance.now();
let nextEventCheck = 18;
let audioCtx = null;

function ownedCount(s=state){return s.businesses.reduce((n,b)=>n+b.count,0)}
function managerCount(s=state){return s.businesses.filter(b=>b.manager).length}
function fmt(n){
  if(!Number.isFinite(n)) return "$0";
  const a=Math.abs(n),u=[[1e15,"Qa"],[1e12,"T"],[1e9,"B"],[1e6,"M"],[1e3,"K"]];
  for(const [v,s] of u) if(a>=v) return "$"+(n/v).toFixed(a>=v*100?0:a>=v*10?1:2)+s;
  return "$"+n.toFixed(n<100?2:0);
}
function milestone(c){return c>=100?10:c>=50?5:c>=25?3:c>=10?2:1}
function investorMult(){return 1+state.investors*.05}
function upgradeMult(i){
  let m=1;
  upgrades.forEach(u=>{
    if(state.upgrades[u.id] && u.business===i)m*=u.mult;
    if(state.upgrades[u.id] && u.all)m*=u.mult;
  });
  return m;
}
function eventMult(i){
  const e=state.event;if(!e)return 1;
  if(e.type==="all")return e.mult;
  if(e.type==="business"&&e.business===i)return e.mult;
  if(e.type==="group"&&e.group.includes(i))return e.mult;
  return 1;
}
function profitStoreMult(){return state.store.profit?1.15:1}
function cycleSeconds(i){return businesses[i].duration/1000*(state.store.speed?.9:1)}
function payout(i){return businesses[i].income*Math.max(1,state.businesses[i].count)*milestone(state.businesses[i].count)*investorMult()*upgradeMult(i)*eventMult(i)*profitStoreMult()}
function passivePerSec(){
  return businesses.reduce((sum,biz,i)=>{
    const b=state.businesses[i];
    return sum+(b.manager&&b.count>0?payout(i)/cycleSeconds(i):0);
  },0);
}
function companyValue(s=state){
  let v=s.money+s.totalEarned*.08;
  businesses.forEach((biz,i)=>{v+=biz.cost*s.businesses[i].count*2.15;if(s.businesses[i].manager)v+=biz.managerCost});
  return v;
}
function investorGain(){const v=companyValue();return v<1e6?0:Math.max(0,Math.floor(Math.sqrt(v/1e6))-state.investors)}
function costFor(i,n=1){
  if(n<=0)return 0;
  let c=0;for(let j=0;j<n;j++)c+=businesses[i].cost*Math.pow(1.15,state.businesses[i].count+j);
  return c;
}
function maxAffordable(i){
  let n=0,c=0;
  while(n<1000){
    const next=businesses[i].cost*Math.pow(1.15,state.businesses[i].count+n);
    if(c+next>state.money)break;
    c+=next;n++;
  }
  return n;
}
function buyAmount(i){return state.buyMult==="max"?maxAffordable(i):state.buyMult}
function buyCost(i){const n=buyAmount(i);return n>0?costFor(i,n):costFor(i,1)}

function ensureAudio(){
  if(!audioCtx){
    const AC=window.AudioContext||window.webkitAudioContext;
    if(AC)audioCtx=new AC();
  }
  if(audioCtx?.state==="suspended")audioCtx.resume();
}
function clickSound(){
  if(!state.soundOn)return;
  ensureAudio();
  if(!audioCtx)return;
  const now=audioCtx.currentTime;
  const gain=audioCtx.createGain();
  gain.gain.setValueAtTime(.0001,now);
  gain.gain.exponentialRampToValueAtTime(.07,now+.004);
  gain.gain.exponentialRampToValueAtTime(.0001,now+.055);
  gain.connect(audioCtx.destination);

  const o1=audioCtx.createOscillator();
  o1.type="triangle";
  o1.frequency.setValueAtTime(680,now);
  o1.frequency.exponentialRampToValueAtTime(410,now+.05);
  o1.connect(gain);o1.start(now);o1.stop(now+.06);

  const o2=audioCtx.createOscillator();
  o2.type="sine";
  o2.frequency.setValueAtTime(1050,now);
  o2.frequency.exponentialRampToValueAtTime(720,now+.035);
  const g2=audioCtx.createGain();
  g2.gain.setValueAtTime(.028,now);
  g2.gain.exponentialRampToValueAtTime(.0001,now+.04);
  o2.connect(g2);g2.connect(audioCtx.destination);o2.start(now);o2.stop(now+.045);
}
function successSound(){
  if(!state.soundOn)return;
  ensureAudio();
  if(!audioCtx)return;
  const now=audioCtx.currentTime;
  [0,0.055].forEach((off,idx)=>{
    const o=audioCtx.createOscillator(),g=audioCtx.createGain();
    o.type="sine";o.frequency.value=idx?900:700;
    g.gain.setValueAtTime(.0001,now+off);
    g.gain.exponentialRampToValueAtTime(.035,now+off+.004);
    g.gain.exponentialRampToValueAtTime(.0001,now+off+.07);
    o.connect(g);g.connect(audioCtx.destination);o.start(now+off);o.stop(now+off+.08);
  });
}

function save(){
  state.lastSaved=Date.now();localStorage.setItem(SAVE_KEY,JSON.stringify(state));$("saveStatus").textContent="Autosaved just now";
}
function load(){
  const raw=localStorage.getItem(SAVE_KEY);if(!raw)return;
  try{
    const p=JSON.parse(raw),f=freshState();Object.assign(f,p);
    f.businesses=businesses.map((_,i)=>({...freshState().businesses[i],...(p.businesses?.[i]||{})}));
    f.upgrades=p.upgrades||{};f.claimedAchievements=p.claimedAchievements||{};f.store=p.store||{};f.event=null;f.eventRemaining=0;
    state=f;
    const secs=Math.max(0,(Date.now()-(p.lastSaved||Date.now()))/1000);
    const rate=state.store.offline?.8:.55;
    const offline=passivePerSec()*Math.min(secs,8*3600)*rate;
    if(offline>0){state.money+=offline;state.totalEarned+=offline;toast("Welcome back! Offline earnings: "+fmt(offline))}
  }catch(e){console.warn(e)}
}

function buyBusiness(i){
  const n=buyAmount(i);if(n<=0)return;
  const c=costFor(i,n);if(state.money<c)return;
  state.money-=c;state.businesses[i].count+=n;successSound();renderAll();save();
}
function startBusiness(i){
  const b=state.businesses[i];if(b.count<=0||b.running)return;
  b.running=true;b.progress=0;
  refreshRunControls();
}
function hireManager(i){
  const b=state.businesses[i],biz=businesses[i];
  if(b.manager||b.count<=0||state.money<biz.managerCost)return;
  state.money-=biz.managerCost;b.manager=true;if(!b.running){b.running=true;b.progress=0}
  successSound();toast(biz.name+" manager hired!");renderAll();save();
}
function buyUpgrade(id){
  const u=upgrades.find(x=>x.id===id);if(!u||state.upgrades[id]||state.money<u.cost)return;
  state.money-=u.cost;state.upgrades[id]=true;successSound();toast(u.name+" purchased!");renderAll();save();
}
function claimAchievement(id){
  const a=achievements.find(x=>x.id===id);if(!a||state.claimedAchievements[id]||!a.test(state))return;
  state.claimedAchievements[id]=true;state.tickets+=a.ticket;successSound();toast("+"+a.ticket+" Business Ticket"+(a.ticket===1?"":"s"));renderAll();save();
}
function buyStore(id){
  const item=storeItems.find(x=>x.id===id);if(!item||state.store[id]||state.tickets<item.cost)return;
  state.tickets-=item.cost;state.store[id]=true;successSound();toast(item.name+" unlocked!");renderAll();save();
}
function prestige(){
  const gain=investorGain();if(gain<=0)return;
  if(!confirm("Sell the company and gain "+gain+" Investor Point"+(gain===1?"":"s")+"? Store bonuses, tickets, and claimed achievements remain."))return;
  const keep={investors:state.investors+gain,tickets:state.tickets,store:{...state.store},claimedAchievements:{...state.claimedAchievements},soundOn:state.soundOn};
  state=freshState();Object.assign(state,keep);successSound();toast("New company! Permanent bonus: +"+(state.investors*5)+"%");renderAll();save();
}
function startEvent(){
  const base=events[Math.floor(Math.random()*events.length)];
  state.event={...base};state.eventRemaining=base.duration*(state.store.event?1.5:1);toast(base.title+"!");renderEvent();
}

function renderHeader(){
  $("cash").textContent=fmt(state.money);$("perSec").textContent="+"+fmt(passivePerSec())+" / sec";
  $("companyValueTop").textContent=fmt(companyValue());$("multBtn").textContent=state.buyMult==="max"?"MAX":"×"+state.buyMult;
  $("soundBtn").textContent="Sound: "+(state.soundOn?"On":"Off");
}
function renderEvent(){
  $("eventStrip").classList.toggle("hidden",!state.event);
  if(state.event){$("eventTitle").textContent=state.event.title;$("eventText").textContent=state.event.text;$("eventTimer").textContent=Math.ceil(state.eventRemaining)+"s"}
}
function renderBusinesses(){
  const wrap=$("businessGrid");wrap.innerHTML="";
  businesses.forEach((biz,i)=>{
    const b=state.businesses[i],n=buyAmount(i),cost=buyCost(i),canBuy=n>0&&state.money>=cost;
    const card=document.createElement("article");card.className="biz-card";
    card.innerHTML=`
      <div class="icon-col"><div class="icon-circle">${biz.icon}</div><div class="count-pill">${b.count.toLocaleString()}</div></div>
      <div class="card-main">
        <div class="biz-title-line"><span class="biz-title">${biz.name}</span><span class="milestone">milestone ×${milestone(b.count)}</span></div>
        <div class="income-bar">${fmt(payout(i))} / cycle • ${cycleSeconds(i).toFixed(1)} sec</div>
        <div class="buy-row">
          <button class="buy-btn orange" data-buy="${i}" ${canBuy?"":"disabled"}>
            <span class="price">${fmt(cost)}</span><span class="buy-meta">${state.buyMult==="max"?(n>0?"buy max ("+n+")":"can't afford"):"buy "+n}</span>
          </button>
          <button class="buy-btn yellow run-cycle-btn${b.running?" running":""}" data-run="${i}" ${b.running||b.count===0?"disabled":""}
            style="${b.running ? `--run-progress:${Math.max(0,Math.min(1,b.progress))}` : "--run-progress:1"}">
            <span class="price">${fmt(payout(i))}</span><span class="buy-meta">${b.manager?"auto running":b.running?"running...":"run cycle"}</span>
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
  wrap.querySelectorAll("[data-buy]").forEach(el=>el.addEventListener("click",()=>buyBusiness(+el.dataset.buy)));
  wrap.querySelectorAll("[data-run]").forEach(el=>el.addEventListener("click",()=>startBusiness(+el.dataset.run)));
  wrap.querySelectorAll("[data-manager]").forEach(el=>el.addEventListener("click",()=>hireManager(+el.dataset.manager)));
}
function refreshRunControls(){
  document.querySelectorAll("[data-run]").forEach(el=>{
    const i=+el.dataset.run,b=state.businesses[i];
    const meta=el.querySelector(".buy-meta");
    const wasRunning=el.classList.contains("running");
    el.disabled=b.running||b.count===0;
    el.classList.toggle("running",b.running);
    el.style.setProperty("--run-progress",b.running?Math.max(0,Math.min(1,b.progress)):1);
    if(meta)meta.textContent=b.manager?"auto running":b.running?"running...":"run cycle";
    if(wasRunning&&!b.running&&!b.manager&&b.count>0){
      el.classList.remove("just-ready");
      void el.offsetWidth;
      el.classList.add("just-ready");
      setTimeout(()=>el.classList.remove("just-ready"),220);
    }
  });
}

function refreshBusinessControls(){
  document.querySelectorAll("[data-buy]").forEach(el=>{
    const i=+el.dataset.buy,n=buyAmount(i),cost=buyCost(i);
    el.disabled=!(n>0&&state.money>=cost);
    const price=el.querySelector(".price"),meta=el.querySelector(".buy-meta");
    if(price)price.textContent=fmt(cost);
    if(meta)meta.textContent=state.buyMult==="max"?(n>0?"buy max ("+n+")":"can't afford"):"buy "+n;
  });
  document.querySelectorAll("[data-manager]").forEach(el=>{
    const i=+el.dataset.manager,b=state.businesses[i];
    el.disabled=b.manager||b.count===0||state.money<businesses[i].managerCost;
  });
}
function renderUpgrades(){
  const wrap=$("upgradesList");wrap.innerHTML="";
  upgrades.forEach(u=>{
    const owned=!!state.upgrades[u.id],el=document.createElement("div");el.className="simple-item";
    el.innerHTML=`<div><h3>${u.name}</h3><p>${u.desc}</p></div><button class="mini-buy" data-upgrade="${u.id}" ${owned||state.money<u.cost?"disabled":""}>${owned?"Owned":fmt(u.cost)}</button>`;
    wrap.appendChild(el);
  });
  wrap.querySelectorAll("[data-upgrade]").forEach(el=>el.addEventListener("click",()=>buyUpgrade(el.dataset.upgrade)));
}
function renderManagers(){
  const wrap=$("managersList");wrap.innerHTML="";
  businesses.forEach((biz,i)=>{
    const b=state.businesses[i],el=document.createElement("div");el.className="simple-item";
    el.innerHTML=`<div><h3>${biz.name} Manager</h3><p>${b.manager?"This business is automated.":"Automatically restarts every cycle."}</p></div><button class="mini-buy" data-mgr="${i}" ${b.manager||b.count===0||state.money<biz.managerCost?"disabled":""}>${b.manager?"Hired":fmt(biz.managerCost)}</button>`;
    wrap.appendChild(el);
  });
  wrap.querySelectorAll("[data-mgr]").forEach(el=>el.addEventListener("click",()=>hireManager(+el.dataset.mgr)));
}
function renderAchievements(){
  const wrap=$("achievementsList");wrap.innerHTML="";let hasUnclaimed=false;
  achievements.forEach(a=>{
    const complete=a.test(state),claimed=!!state.claimedAchievements[a.id];if(complete&&!claimed)hasUnclaimed=true;
    const el=document.createElement("article");el.className="achievement-card "+(!complete?"locked ":"")+(claimed?"claimed":"");
    el.innerHTML=`<div class="achievement-icon">${claimed?"✓":complete?"★":"?"}</div><div><h3>${a.title}</h3><p>${a.desc} • ${a.ticket} 🎟️</p></div><button class="claim-btn" data-ach="${a.id}" ${!complete||claimed?"disabled":""}>${claimed?"Claimed":complete?"Claim":"Locked"}</button>`;
    wrap.appendChild(el);
  });
  $("achievementDot").classList.toggle("hidden",!hasUnclaimed);
  wrap.querySelectorAll("[data-ach]").forEach(el=>el.addEventListener("click",()=>claimAchievement(el.dataset.ach)));
}
function renderInvestors(){
  const g=investorGain();$("investorCount").textContent=state.investors;$("investorGain").textContent=g;$("investorBonus").textContent="+"+(state.investors*5)+"%";
  $("prestigeBtn").disabled=g<=0;$("investorNote").textContent=g>0?"Selling now adds "+g+" Investor Point"+(g===1?"":"s")+".":"Reach a company value of $1M to attract investors.";
}
function renderStore(){
  $("ticketCount").textContent=state.tickets;const wrap=$("storeList");wrap.innerHTML="";
  storeItems.forEach(item=>{
    const owned=!!state.store[item.id],el=document.createElement("article");el.className="store-card "+(owned?"owned":"");
    el.innerHTML=`<div><h3>${item.name}</h3><p>${item.desc}</p></div><button class="store-buy" data-store="${item.id}" ${owned||state.tickets<item.cost?"disabled":""}>${owned?"Owned":item.cost+" 🎟️"}</button>`;
    wrap.appendChild(el);
  });
  wrap.querySelectorAll("[data-store]").forEach(el=>el.addEventListener("click",()=>buyStore(el.dataset.store)));
}
function renderAll(){renderHeader();renderEvent();renderBusinesses();renderUpgrades();renderManagers();renderAchievements();renderInvestors();renderStore()}

function switchPanel(name){
  const map={businesses:"businessesPanel",achievements:"achievementsPanel",upgrades:"upgradesPanel",managers:"managersPanel",investors:"investorsPanel",store:"storePanel"};
  Object.entries(map).forEach(([k,id])=>$(id).classList.toggle("hidden",k!==name));
  document.querySelectorAll(".nav-btn").forEach(b=>b.classList.toggle("active",b.dataset.panel===name));
}
function toast(msg){const el=$("toast");el.textContent=msg;el.classList.add("show");clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove("show"),2300)}

function exportSave(){
  $("dialogTitle").textContent="Export Save";$("saveText").value=btoa(unescape(encodeURIComponent(JSON.stringify(state))));
  $("saveText").readOnly=true;$("dialogApplyBtn").classList.add("hidden");$("saveDialog").showModal();$("saveText").select();
}
function importSave(){
  $("dialogTitle").textContent="Import Save";$("saveText").value="";$("saveText").readOnly=false;$("dialogApplyBtn").classList.remove("hidden");$("saveDialog").showModal();
}
function applyImport(){
  try{
    const p=JSON.parse(decodeURIComponent(escape(atob($("saveText").value.trim()))));
    if(!p||!Array.isArray(p.businesses))throw new Error();
    localStorage.setItem(SAVE_KEY,JSON.stringify(p));state=freshState();load();$("saveDialog").close();renderAll();toast("Save imported.");
  }catch{alert("That save code is not valid.")}
}

function loop(now){
  const dt=Math.min(.1,(now-lastFrame)/1000);lastFrame=now;
  let moneyChanged=false,cycleEnded=false;

  businesses.forEach((biz,i)=>{
    const b=state.businesses[i];if(b.count<=0)return;
    if(b.manager&&!b.running){b.running=true;b.progress=0}
    if(!b.running)return;
    b.progress+=dt/cycleSeconds(i);
    if(b.progress>=1){
      const cycles=Math.floor(b.progress),earned=payout(i)*cycles;
      state.money+=earned;state.totalEarned+=earned;moneyChanged=true;cycleEnded=true;b.progress-=cycles;
      if(!b.manager){
        b.running=false;
        b.progress=0;
      }
    }
  });

  if(cycleEnded){
    refreshRunControls();
  }

  if(state.event){
    state.eventRemaining-=dt;
    if(state.eventRemaining<=0){state.event=null;state.eventRemaining=0;renderAll();toast("Bonus event ended.")}
    else $("eventTimer").textContent=Math.ceil(state.eventRemaining)+"s";
  }else{
    nextEventCheck-=dt;
    if(nextEventCheck<=0){nextEventCheck=22+Math.random()*22;if(Math.random()<.52){startEvent();renderAll()}}
  }

  renderHeader();
  document.querySelectorAll("[data-progress]").forEach(el=>{
    const i=+el.dataset.progress;
    el.style.width=(state.businesses[i].progress*100)+"%";
  });
  document.querySelectorAll("[data-run]").forEach(el=>{
    const i=+el.dataset.run,b=state.businesses[i];
    if(b.running){
      el.style.setProperty("--run-progress",Math.max(0,Math.min(1,b.progress)));
    }
  });

  // Critical progression fix:
  // affordability is refreshed immediately whenever income changes,
  // so a button disabled before a payout becomes clickable as soon as cash arrives.
  if(moneyChanged){
    refreshBusinessControls();
    if(cycleEnded){renderUpgrades();renderManagers();renderAchievements();renderInvestors();renderStore()}
  }

  requestAnimationFrame(loop);
}

document.addEventListener("click",e=>{
  const btn=e.target.closest("button");
  if(btn&&!btn.disabled)clickSound();
},true);

$("multBtn").addEventListener("click",()=>{
  const order=[1,10,100,"max"];state.buyMult=order[(order.indexOf(state.buyMult)+1)%order.length];renderBusinesses();renderHeader();
});
$("soundBtn").addEventListener("click",()=>{state.soundOn=!state.soundOn;$("soundBtn").textContent="Sound: "+(state.soundOn?"On":"Off");save()});
$("prestigeBtn").addEventListener("click",prestige);
$("exportBtn").addEventListener("click",exportSave);
$("importBtn").addEventListener("click",importSave);
$("dialogApplyBtn").addEventListener("click",applyImport);
$("resetBtn").addEventListener("click",()=>{if(confirm("Reset ALL Tiny Business progress?")){localStorage.removeItem(SAVE_KEY);state=freshState();renderAll();save();toast("Save reset.")}});
document.querySelectorAll(".nav-btn").forEach(btn=>btn.addEventListener("click",()=>switchPanel(btn.dataset.panel)));

load();renderAll();switchPanel("businesses");setInterval(save,10000);requestAnimationFrame(loop);
})();