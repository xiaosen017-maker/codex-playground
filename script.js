const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const startScreen = document.getElementById('start-screen');
const overScreen = document.getElementById('game-over-screen');
const levelupScreen = document.getElementById('levelup-screen');
const upgradeBox = document.getElementById('upgrade-options');

const ui = {
  hpBar: document.getElementById('hp-bar'), hpText: document.getElementById('hp-text'), xpBar: document.getElementById('xp-bar'),
  xpText: document.getElementById('xp-text'), level: document.getElementById('level'), kills: document.getElementById('kills'), time: document.getElementById('time')
};

const W = canvas.width, H = canvas.height;
const keys = new Set();
const drops = [], enemies = [], bullets = [], effects = [], hachiShots = [], enemyShots = [];
let running = false, paused = false, leveling = false;
let last = 0, enemyTimer = 0, scoreTime = 0, killCount = 0;

const player = {
  x: W/2, y: H/2, r: 18, speed: 180, hp: 100, maxHp: 100, xp: 0, lv: 1, xpNeed: 20,
  atk: 16, range: 120, atkCd: 0.6, atkTimer: 0, proj: 1, crit: 0.08, flash: 0, dashCd: 8, dashTimer: 2, hasHachi: false
};

const upgrades = [
  ['攻击速度+', ()=> player.atkCd=Math.max(0.18,player.atkCd*0.86)],
  ['攻击范围+', ()=> player.range+=20],
  ['子弹数量+', ()=> player.proj+=1],
  ['移动速度+', ()=> player.speed+=20],
  ['最大生命+', ()=> {player.maxHp+=20; player.hp+=20;}],
  ['回复生命', ()=> player.hp=Math.min(player.maxHp, player.hp+45)],
  ['暴击率+', ()=> player.crit=Math.min(0.55, player.crit+0.08)],
  ['召唤 Hachiware', ()=> player.hasHachi=true],
  ['Usagi 冲刺', ()=> player.dashCd=Math.max(4.5, player.dashCd-1.2)]
];

function spawnEnemy() {
  const edge = Math.random()*4|0;
  const p = [ [Math.random()*W,-20], [W+20,Math.random()*H], [Math.random()*W,H+20], [-20,Math.random()*H] ][edge];
  const t = Math.random();
  let e = {x:p[0],y:p[1],dead:false,hit:0};
  if (t<0.5) Object.assign(e,{type:'normal',hp:20+scoreTime*0.3,speed:62+scoreTime*0.45,r:14,color:'#ffafc9'});
  else if (t<0.82) Object.assign(e,{type:'swift',hp:12+scoreTime*0.2,speed:125+scoreTime*0.55,r:11,color:'#ffd56f'});
  else Object.assign(e,{type:'tank',hp:50+scoreTime*0.6,speed:45+scoreTime*0.3,r:18,color:'#b69bff',shoot:2.2,timer:1});
  enemies.push(e);
}

function autoAttack() {
  if (player.atkTimer>0 || enemies.length===0) return;
  const target = enemies.reduce((a,b)=> distP(b,player)<distP(a,player)?b:a, enemies[0]);
  for (let i=0;i<player.proj;i++) {
    const ang = Math.atan2(target.y-player.y,target.x-player.x)+(i-(player.proj-1)/2)*0.18;
    bullets.push({x:player.x,y:player.y,vx:Math.cos(ang)*340,vy:Math.sin(ang)*340,life:0.9,aoe: i===0 ? 28:0});
  }
  player.atkTimer = player.atkCd;
}
function distP(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
function hitEnemy(e,dmg){
  const crit = Math.random()<player.crit; e.hp -= crit?dmg*1.8:dmg; e.hit=0.12;
  if (e.hp<=0 && !e.dead){ e.dead=true; killCount++; drops.push({x:e.x,y:e.y,v:8}); effects.push({x:e.x,y:e.y,t:0.25}); }
}

function chooseUpgrades() {
  leveling = true; paused = true; levelupScreen.classList.add('active'); upgradeBox.innerHTML='';
  [...upgrades].sort(()=>Math.random()-0.5).slice(0,3).forEach(([name,fn])=>{
    const b=document.createElement('button'); b.className='upgrade-btn'; b.textContent=name;
    b.onclick=()=>{ fn(); levelupScreen.classList.remove('active'); paused=false; leveling=false;}; upgradeBox.appendChild(b);
  });
}

function damagePlayer(v){ player.hp-=v; player.flash=0.18; if(player.hp<=0){ running=false; overScreen.classList.add('active'); document.getElementById('final-stats').textContent=`生存 ${scoreTime.toFixed(1)} 秒 · 击败 ${killCount}`; }}

function update(dt){
  if (!running || paused) return;
  scoreTime += dt; enemyTimer += dt; player.atkTimer -= dt; player.flash -= dt; player.dashTimer -= dt;
  const spawnGap = Math.max(0.18, 1.2-scoreTime*0.012);
  while(enemyTimer>spawnGap){ enemyTimer-=spawnGap; spawnEnemy(); }

  let dx=(keys.has('d')||keys.has('arrowright'))-(keys.has('a')||keys.has('arrowleft'));
  let dy=(keys.has('s')||keys.has('arrowdown'))-(keys.has('w')||keys.has('arrowup'));
  const l=Math.hypot(dx,dy)||1; player.x += dx/l*player.speed*dt; player.y += dy/l*player.speed*dt;
  player.x=Math.max(16,Math.min(W-16,player.x)); player.y=Math.max(16,Math.min(H-16,player.y));

  if (player.hasHachi && Math.random()<dt*2) {
    const t=enemies[0]; if(t) hachiShots.push({x:player.x+24,y:player.y-24,target:t,life:0.7});
  }
  if (player.dashTimer<=0){ const t=enemies[0]; if(t){ t.hp-=24; effects.push({x:t.x,y:t.y,t:0.2,c:'#ffe47d'});} player.dashTimer=player.dashCd; }

  autoAttack();
  bullets.forEach(b=>{b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt; enemies.forEach(e=>{ if(!e.dead&&distP(b,e)<e.r+5){ hitEnemy(e,player.atk); if(b.aoe>0) enemies.forEach(o=>!o.dead&&distP(o,e)<b.aoe&&hitEnemy(o,player.atk*0.45)); b.life=0; }});});
  hachiShots.forEach(s=>{ s.life-=dt; if(s.target&&!s.target.dead){ const a=Math.atan2(s.target.y-s.y,s.target.x-s.x); s.x+=Math.cos(a)*320*dt; s.y+=Math.sin(a)*320*dt; if(distP(s,s.target)<14){ hitEnemy(s.target,12); s.life=0; }} });

  enemies.forEach(e=>{
    const a=Math.atan2(player.y-e.y,player.x-e.x); e.x+=Math.cos(a)*e.speed*dt; e.y+=Math.sin(a)*e.speed*dt; e.hit-=dt;
    if(e.type==='tank'){ e.timer-=dt; if(e.timer<=0){ e.timer=e.shoot; enemyShots.push({x:e.x,y:e.y,vx:Math.cos(a)*170,vy:Math.sin(a)*170,life:4}); }}
    if(distP(e,player)<e.r+player.r-2){ damagePlayer((e.type==='tank'?16:8)*dt); }
  });
  enemyShots.forEach(s=>{ s.x+=s.vx*dt; s.y+=s.vy*dt; s.life-=dt; if(distP(s,player)<14) {damagePlayer(8); s.life=0;} });

  drops.forEach(d=>{ if(distP(d,player)<18){ player.xp+=d.v; d.v=0; } });
  if(player.xp>=player.xpNeed){ player.xp-=player.xpNeed; player.lv++; player.xpNeed=Math.round(player.xpNeed*1.35); chooseUpgrades(); }

  [bullets,hachiShots,enemyShots,drops,effects,enemies].forEach(arr=>{ for(let i=arr.length-1;i>=0;i--) if(arr[i].life!==undefined?arr[i].life<=0:arr[i].dead||arr[i].v===0) arr.splice(i,1); });
}

function drawChar(x,y,color,face='•ᴗ•'){ ctx.fillStyle=color; ctx.beginPath(); ctx.arc(x,y,18,0,7); ctx.fill(); ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(x-8,y-10,6,0,7); ctx.arc(x+8,y-10,6,0,7); ctx.fill(); ctx.fillStyle='#333'; ctx.font='11px sans-serif'; ctx.fillText(face,x-12,y+4); }

function render(){
  ctx.clearRect(0,0,W,H);
  for(let i=0;i<28;i++){ ctx.fillStyle=i%2?'#e4ecff':'#dce7ff'; ctx.fillRect((i*53)%W,((i*29)+40)%H,24,14); }
  drops.forEach(d=>{ctx.fillStyle='#7cc8ff';ctx.beginPath();ctx.arc(d.x,d.y,6,0,7);ctx.fill();});
  enemies.forEach(e=>drawChar(e.x,e.y,e.hit>0?'#ff6c8f':e.color,e.type==='tank'?'ಠ_ಠ':'•.•'));
  bullets.forEach(b=>{ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(b.x,b.y,4,0,7);ctx.fill();});
  hachiShots.forEach(s=>{ctx.fillStyle='#8ad5ff';ctx.fillRect(s.x-3,s.y-3,6,6);});
  enemyShots.forEach(s=>{ctx.fillStyle='#a25bff';ctx.beginPath();ctx.arc(s.x,s.y,5,0,7);ctx.fill();});
  effects.forEach(e=>{ctx.strokeStyle=e.c||'#ffd7e8';ctx.globalAlpha=Math.max(0,e.t*4);ctx.beginPath();ctx.arc(e.x,e.y,30*(1-e.t*3),0,7);ctx.stroke();ctx.globalAlpha=1; e.t-=0.016;});
  if(player.flash>0) ctx.globalAlpha=0.45; drawChar(player.x,player.y,'#fff5f8','•ω•'); ctx.globalAlpha=1;
}
function uiSync(){
  ui.hpBar.style.width=`${Math.max(0,player.hp/player.maxHp*100)}%`; ui.hpText.textContent=`${Math.ceil(player.hp)} / ${player.maxHp}`;
  ui.xpBar.style.width=`${player.xp/player.xpNeed*100}%`; ui.xpText.textContent=`${player.xp} / ${player.xpNeed}`;
  ui.level.textContent=player.lv; ui.kills.textContent=killCount; ui.time.textContent=`${scoreTime.toFixed(1)}s`;
}
function loop(ts){ const dt=Math.min(0.033,(ts-last)/1000||0); last=ts; update(dt); render(); uiSync(); requestAnimationFrame(loop); }

addEventListener('keydown',e=>{ const k=e.key.toLowerCase(); keys.add(k); if(k===' ') autoAttack(); if(k==='p'){paused=!paused;} });
addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
document.getElementById('pause-btn').onclick=()=>paused=!paused;
document.getElementById('start-btn').onclick=()=>{startScreen.classList.remove('active'); running=true;};
document.getElementById('restart-btn').onclick=()=>location.reload();
document.getElementById('attack-btn').ontouchstart=()=>autoAttack();

const zone=document.getElementById('joystick-zone'), knob=document.getElementById('joystick-knob');
let touchId=null;
zone.addEventListener('touchstart',e=>{touchId=e.changedTouches[0].identifier;});
zone.addEventListener('touchmove',e=>{ for (const t of e.changedTouches) if(t.identifier===touchId){ const r=zone.getBoundingClientRect(); let x=t.clientX-(r.left+r.width/2), y=t.clientY-(r.top+r.height/2); const m=Math.hypot(x,y), lim=38; if(m>lim){x=x/m*lim;y=y/m*lim;} knob.style.left=`${31+x}px`; knob.style.top=`${31+y}px`; keys.delete('a');keys.delete('d');keys.delete('w');keys.delete('s'); if(x>8)keys.add('d'); if(x<-8)keys.add('a'); if(y>8)keys.add('s'); if(y<-8)keys.add('w'); }});
zone.addEventListener('touchend',()=>{touchId=null;knob.style.left='31px';knob.style.top='31px';['a','s','d','w'].forEach(k=>keys.delete(k));});

requestAnimationFrame(loop);
