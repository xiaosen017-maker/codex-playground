const cvs = document.getElementById('game'), ctx = cvs.getContext('2d');
const mini = document.getElementById('minimap'), mctx = mini.getContext('2d');
const ui = Object.fromEntries(['hp-bar','hp-text','xp-bar','xp-text','lv','gold','room','kills','time','best-kills'].map(id=>[id,document.getElementById(id)]));
const over = {start:document.getElementById('start'),pause:document.getElementById('pause'),level:document.getElementById('levelup'),end:document.getElementById('end')};
const keys = new Set(); let tPrev=0, state='start';

// --- 游戏状态 ---
const G={rooms:[],roomId:0,time:0,kills:0,screenShake:0,high:JSON.parse(localStorage.getItem('chiikawaRecords')||'{"kills":0,"bestTime":99999}')};
const P={x:550,y:350,r:20,hp:80,maxHp:80,atk:14,atkCd:0.5,atkT:0,speed:220,lv:1,xp:0,xpNeed:25,proj:1,crit:0.1,inv:0,gold:0,melee:42,magnet:110,chestBonus:0,shield:0,hachi:false,hachiRate:1.2,usagi:false,usagiCd:14,usagiT:8};
const E=[],B=[],EB=[],FX=[],Drops=[],Poison=[];

// --- 角色绘制 ---
function drawChiikawa(x,y,s=1,face='w'){ctx.save();ctx.translate(x,y);ctx.scale(s,s);blob('#fff');ear(-10,-18,'#fff');ear(10,-18,'#fff');eyes();blush();mouth(face);limbs('#fff');ctx.restore();}
function drawHachiware(x,y,s=1){ctx.save();ctx.translate(x,y);ctx.scale(s,s);blob('#fff');ctx.fillStyle='#6ab6ff';ctx.beginPath();ctx.moveTo(-16,-15);ctx.lineTo(0,-30);ctx.lineTo(16,-15);ctx.fill();ear(-10,-18,'#6ab6ff');ear(10,-18,'#6ab6ff');eyes();blush();mouth('u');limbs('#fff');ctx.fillStyle='#6ab6ff';ctx.fillRect(16,4,14,6);ctx.restore();}
function drawUsagi(x,y,s=1){ctx.save();ctx.translate(x,y);ctx.scale(s,s);blob('#fff0b0');longEar(-8,-34);longEar(8,-34);eyes();blush();mouth('w');limbs('#fff0b0');ctx.restore();}
function blob(c){ctx.fillStyle=c;ctx.strokeStyle='#23232f';ctx.lineWidth=4;ctx.beginPath();ctx.roundRect(-18,-18,36,34,16);ctx.fill();ctx.stroke();}
function ear(x,y,c){ctx.fillStyle=c;ctx.strokeStyle='#23232f';ctx.beginPath();ctx.arc(x,y,6,0,Math.PI*2);ctx.fill();ctx.stroke();}
function longEar(x,y){ctx.fillStyle='#fff0b0';ctx.strokeStyle='#23232f';ctx.beginPath();ctx.roundRect(x-5,y,10,24,8);ctx.fill();ctx.stroke();ctx.fillStyle='#ffbfd2';ctx.fillRect(x-2,y+6,4,12)}
function eyes(){ctx.fillStyle='#222';ctx.beginPath();ctx.arc(-6,-4,2.6,0,7);ctx.arc(6,-4,2.6,0,7);ctx.fill()} function blush(){ctx.fillStyle='#ffb6c8';ctx.beginPath();ctx.arc(-11,2,4,0,7);ctx.arc(11,2,4,0,7);ctx.fill()}
function mouth(t){ctx.fillStyle='#222';ctx.font='bold 10px sans-serif';ctx.fillText(t,-4,7)} function limbs(c){ctx.fillStyle=c;ctx.fillRect(-20,6,6,8);ctx.fillRect(14,6,6,8);ctx.fillRect(-9,16,6,8);ctx.fillRect(3,16,6,8)}

// --- 地图生成 ---
function mkRooms(){G.rooms=[];for(let i=0;i<8;i++)G.rooms.push({i,cleared:false,seen:i===0,color:['#fff2de','#ffeaf3','#eaf5ff','#f2ecff'][i%4],doors:[i+1].filter(v=>v<8),boss:i===7});}
function enterRoom(i){G.roomId=i;P.x=550;P.y=350;E.length=EB.length=Poison.length=0;spawnRoom();}
function spawnRoom(){const r=G.rooms[G.roomId],n=r.boss?1:3+Math.min(7,G.roomId);for(let i=0;i<n;i++)spawnEnemy(r.boss?'boss':pickType());}

// --- 敌人逻辑 ---
function pickType(){const pool=['chaser','swift','mush','rock','ranged'];return pool[Math.min(pool.length-1,Math.floor(Math.random()*(2+G.roomId/2)))];}
function spawnEnemy(type){const e={type,x:90+Math.random()*920,y:90+Math.random()*520,hit:0};const S={chaser:[38,80,16],swift:[24,130,12],mush:[42,52,17],rock:[90,45,22],ranged:[34,58,15],boss:[420,64,38]};[e.hp,e.speed,e.r]=S[type];e.max=e.hp;e.cd=2;e.phase=0;E.push(e)}

// --- 道具逻辑 ---
function drop(x,y){Drops.push({x,y,t:'xp',v:8});if(Math.random()<.3)Drops.push({x:x+8,y,t:'gold',v:2});if(Math.random()<.12)Drops.push({x:x-8,y,t:'heart',v:10});if(Math.random()<.1)Drops.push({x:x+12,y,t:'chest',v:1});}

// --- 战斗逻辑 ---
function attack(){if(P.atkT>0)return;for(let i=0;i<P.proj;i++){const ang=Math.atan2(mouseY-P.y,mouseX-P.x)+(i-(P.proj-1)/2)*0.2;B.push({x:P.x,y:P.y,vx:Math.cos(ang)*360,vy:Math.sin(ang)*360,t:1});}P.atkT=P.atkCd;beep(620,.05)}
let mouseX=600,mouseY=350; cvs.addEventListener('mousemove',e=>{const r=cvs.getBoundingClientRect();mouseX=(e.clientX-r.left)*(cvs.width/r.width);mouseY=(e.clientY-r.top)*(cvs.height/r.height);});
function hurt(v){if(P.inv>0)return;if(P.shield>0){P.shield--;FX.push({x:P.x,y:P.y,t:.4,c:'#9cf'});return;}P.hp-=v;P.inv=.7;beep(180,.08);if(P.hp<=0)finish(false)}

// --- UI 更新 ---
function uiSync(){ui['hp-bar'].style.width=`${Math.max(0,P.hp/P.maxHp*100)}%`;ui['hp-text'].textContent=`${Math.ceil(P.hp)}/${P.maxHp}`;ui['xp-bar'].style.width=`${P.xp/P.xpNeed*100}%`;ui['xp-text'].textContent=`${P.xp}/${P.xpNeed}`;ui.lv.textContent=P.lv;ui.gold.textContent=P.gold;ui.room.textContent=`${G.roomId+1}/8`;ui.kills.textContent=G.kills;ui.time.textContent=`${G.time.toFixed(1)}s`;ui['best-kills'].textContent=G.high.kills;document.getElementById('skill-icons').textContent=['⭐x'+P.proj,'🥢'+P.melee,'🛡️'+P.shield,P.hachi?'🐱':'',P.usagi?'🐰':''].join(' ')}
function drawMap(){mctx.clearRect(0,0,180,140);G.rooms.forEach((r,i)=>{const x=14+i*20,y=70; mctx.fillStyle=r.seen?'#bfe0ff':'#eceaf8';if(i===G.roomId)mctx.fillStyle='#ffb8d2';mctx.fillRect(x,y,16,16);if(i<7){mctx.strokeStyle='#aab3d4';mctx.beginPath();mctx.moveTo(x+16,y+8);mctx.lineTo(x+20,y+8);mctx.stroke();}})}

// --- 手机触控控制 ---
for(const b of document.querySelectorAll('#pad button')){b.ontouchstart=()=>keys.add(b.dataset.k);b.ontouchend=()=>keys.delete(b.dataset.k)}
document.getElementById('atk-btn').ontouchstart=attack;

const upgrades=[
['⭐ 弹幕+1','增加小星星数量',()=>P.proj++],['🥢 讨伐棒范围','近战范围增加',()=>P.melee+=14],['👟 移速+','移动速度提升',()=>P.speed+=20],['❤️ 最大生命','上限+20',()=>{P.maxHp+=20;P.hp+=20}],['💗 即时治疗','恢复 24 HP',()=>P.hp=Math.min(P.maxHp,P.hp+24)],['⚡ 攻速+','攻击更快',()=>P.atkCd=Math.max(.22,P.atkCd*.88)],['💥 暴击率+','暴击率+8%',()=>P.crit=Math.min(.6,P.crit+.08)],['🐱 Hachiware','伙伴自动攻击',()=>P.hachi=true],['🐰 Usagi 冲刺','周期支援',()=>P.usagi=true],['🛡️ 护盾','抵消一次伤害',()=>P.shield++],['🧲 吸附范围','拾取更轻松',()=>P.magnet+=40],['🎁 宝箱奖励','宝箱额外金币',()=>P.chestBonus+=2]
];
function levelUp(){state='level';over.level.classList.add('active');const box=document.getElementById('upgrade-list');box.innerHTML='';[...upgrades].sort(()=>Math.random()-.5).slice(0,3).forEach(u=>{const b=document.createElement('button');b.className='up';b.innerHTML=`<b>${u[0]}</b><br><small>${u[1]}</small>`;b.onclick=()=>{u[2]();over.level.classList.remove('active');state='play'};box.appendChild(b)})}

function tick(dt){if(state!=='play')return;G.time+=dt;P.atkT-=dt;P.inv-=dt;if(P.usagi){P.usagiT-=dt;if(P.usagiT<0){P.usagiT=P.usagiCd;FX.push({x:P.x,y:P.y,t:.8,c:'#ffe17e',txt:'Yaha!'});for(const e of E)e.hp-=36;G.screenShake=.4;}}
let dx=(keys.has('d')||keys.has('arrowright'))-(keys.has('a')||keys.has('arrowleft')),dy=(keys.has('s')||keys.has('arrowdown'))-(keys.has('w')||keys.has('arrowup'));let l=Math.hypot(dx,dy)||1;P.x=Math.max(30,Math.min(1070,P.x+dx/l*P.speed*dt));P.y=Math.max(30,Math.min(670,P.y+dy/l*P.speed*dt));
for(const e of E){const a=Math.atan2(P.y-e.y,P.x-e.x);e.hit-=dt;if(e.type==='ranged'||e.type==='boss'){e.cd-=dt;if(e.cd<0){e.cd=e.type==='boss'?1.2:2.3;for(let k=0;k<(e.type==='boss'?12:1);k++){const ang=e.type==='boss'?k*Math.PI/6:a;EB.push({x:e.x,y:e.y,vx:Math.cos(ang)*120,vy:Math.sin(ang)*120,t:5});}}}
if(e.type==='mush'&&Math.random()<dt*1.5)Poison.push({x:e.x,y:e.y,r:24,t:2.6}); if(e.type==='swift'&&Math.random()<dt*1.6){e.x+=Math.cos(a)*35;e.y+=Math.sin(a)*35}
if(e.type!=='ranged') {e.x+=Math.cos(a)*e.speed*dt;e.y+=Math.sin(a)*e.speed*dt;} if(Math.hypot(e.x-P.x,e.y-P.y)<e.r+P.r-4)hurt((e.type==='rock'||e.type==='boss')?18*dt:10*dt)}
for(const p of Poison){p.t-=dt;if(Math.hypot(p.x-P.x,p.y-P.y)<p.r)hurt(8*dt)}
for(const b of B){b.x+=b.vx*dt;b.y+=b.vy*dt;b.t-=dt;for(const e of E){if(e.hp>0&&Math.hypot(b.x-e.x,b.y-e.y)<e.r+5){e.hp-=Math.random()<P.crit?P.atk*2:P.atk;e.hit=.12;b.t=0;FX.push({x:e.x,y:e.y,t:.2,c:'#fff3a0'});}}}
for(const b of EB){b.x+=b.vx*dt;b.y+=b.vy*dt;b.t-=dt;if(Math.hypot(b.x-P.x,b.y-P.y)<16){hurt(11);b.t=0;}}
if(P.hachi&&Math.random()<dt*P.hachiRate&&E[0]){const t=E.reduce((a,b)=>Math.hypot(b.x-P.x,b.y-P.y)<Math.hypot(a.x-P.x,a.y-P.y)?b:a,E[0]);t.hp-=8;FX.push({x:t.x,y:t.y,t:.16,c:'#9fd5ff'})}
for(const d of Drops){const dist=Math.hypot(d.x-P.x,d.y-P.y);if(dist<P.magnet){d.x+=(P.x-d.x)*dt*6;d.y+=(P.y-d.y)*dt*6}if(dist<18){if(d.t==='xp')P.xp+=d.v;if(d.t==='gold')P.gold+=d.v;if(d.t==='heart')P.hp=Math.min(P.maxHp,P.hp+d.v);if(d.t==='chest'){P.gold+=6+P.chestBonus;P.xp+=10;FX.push({x:P.x,y:P.y,t:.5,c:'#ffd6ff',txt:'宝箱!'});}d.dead=true;}}
for(const e of E)if(e.hp<=0&&!e.dead){e.dead=true;drop(e.x,e.y);G.kills++;if(e.type==='boss')finish(true)}
clean(B,'t');clean(EB,'t');clean(FX,'t');clean(Poison,'t');clean(Drops,'dead');clean(E,'dead');
if(P.xp>=P.xpNeed){P.xp-=P.xpNeed;P.lv++;P.xpNeed=Math.round(P.xpNeed*1.35);levelUp()}
if(E.length===0){G.rooms[G.roomId].cleared=true;if(P.x>1060&&G.roomId<7) {G.rooms[G.roomId+1].seen=true;enterRoom(G.roomId+1);}}
}
function clean(arr,k){for(let i=arr.length-1;i>=0;i--)if(arr[i][k]<=0||arr[i][k])arr.splice(i,1)}

function render(){ctx.save();if(G.screenShake>0){G.screenShake-=0.016;ctx.translate((Math.random()-.5)*8,(Math.random()-.5)*8)};ctx.fillStyle=G.rooms[G.roomId]?.color||'#fff';ctx.fillRect(0,0,1100,700);ctx.fillStyle='#d4b48a';ctx.fillRect(1082,280,18,140);ctx.fillStyle='#bfe68e';for(let i=0;i<15;i++)ctx.fillRect((i*73)%1060+12,(i*131)%660+14,10,10);
for(const p of Poison){ctx.fillStyle='#b8f1ad88';ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,7);ctx.fill()} for(const d of Drops){ctx.fillStyle=d.t==='xp'?'#91d9ff':d.t==='gold'?'#ffd76a':d.t==='heart'?'#ff9eb4':'#d6a8ff';ctx.beginPath();ctx.arc(d.x,d.y,6,0,7);ctx.fill()}
for(const e of E){ctx.globalAlpha=e.hit>0?0.5:1;ctx.fillStyle=e.type==='boss'?'#d4a6ff':e.type==='mush'?'#ffd5de':'#ffe7a9';ctx.beginPath();ctx.arc(e.x,e.y,e.r,0,7);ctx.fill();ctx.strokeStyle='#333';ctx.lineWidth=3;ctx.stroke();ctx.globalAlpha=1}
for(const b of B){ctx.fillStyle='#fff59e';ctx.beginPath();ctx.arc(b.x,b.y,5,0,7);ctx.fill()}for(const b of EB){ctx.fillStyle='#9f7bff';ctx.beginPath();ctx.arc(b.x,b.y,5,0,7);ctx.fill()}
if(P.hachi)drawHachiware(P.x+36,P.y-24,.75);drawChiikawa(P.x,P.y,1,P.inv>0?'~w~':'w');
for(const f of FX){ctx.strokeStyle=f.c;ctx.globalAlpha=f.t*2;ctx.beginPath();ctx.arc(f.x,f.y,34*(1-f.t),0,7);ctx.stroke();if(f.txt){ctx.fillStyle='#6e4e91';ctx.fillText(f.txt,f.x+12,f.y-18)}ctx.globalAlpha=1;f.t-=0.016}
if(G.rooms[G.roomId]?.boss){const b=E.find(x=>x.type==='boss');if(b){ctx.fillStyle='#fff';ctx.fillRect(250,16,600,16);ctx.fillStyle='#d47aff';ctx.fillRect(250,16,600*(b.hp/b.max),16);ctx.strokeRect(250,16,600,16)}}ctx.restore();drawMap();uiSync();}

function beep(freq,d){const a=new(window.AudioContext||window.webkitAudioContext)(),o=a.createOscillator(),g=a.createGain();o.connect(g);g.connect(a.destination);o.frequency.value=freq;g.gain.value=.02;o.start();o.stop(a.currentTime+d)}
function finish(win){state='end';over.end.classList.add('active');document.getElementById('end-title').textContent=win?'胜利！':'冒险失败';document.getElementById('end-text').textContent=`击败 ${G.kills}，生存 ${G.time.toFixed(1)} 秒，金币 ${P.gold}`;G.high.kills=Math.max(G.high.kills,G.kills);if(win)G.high.bestTime=Math.min(G.high.bestTime,G.time);localStorage.setItem('chiikawaRecords',JSON.stringify(G.high));}

function loop(t){const dt=Math.min(0.033,(t-tPrev)/1000||0);tPrev=t;tick(dt);render();requestAnimationFrame(loop)}
addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(k))keys.add(k);if(k===' '||k==='j')attack();if(k==='p'&&state==='play'){state='pause';over.pause.classList.add('active')}});
addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
document.getElementById('start-btn').onclick=()=>{over.start.classList.remove('active');state='play';mkRooms();enterRoom(0)};document.getElementById('resume-btn').onclick=()=>{over.pause.classList.remove('active');state='play'};document.getElementById('restart-btn').onclick=()=>location.reload();

const pctx=document.getElementById('preview').getContext('2d');
pctx.lineWidth=4;pctx.strokeStyle='#23232f';
function previewFace(x,y,c){pctx.fillStyle=c;pctx.beginPath();pctx.arc(x,y,22,0,7);pctx.fill();pctx.stroke();pctx.fillStyle='#222';pctx.beginPath();pctx.arc(x-7,y-3,2.5,0,7);pctx.arc(x+7,y-3,2.5,0,7);pctx.fill();pctx.fillStyle='#ffb6c8';pctx.beginPath();pctx.arc(x-12,y+4,4,0,7);pctx.arc(x+12,y+4,4,0,7);pctx.fill();}
previewFace(70,70,'#fff');previewFace(180,70,'#fff');pctx.fillStyle='#6ab6ff';pctx.fillRect(160,42,40,10);previewFace(290,70,'#fff0b0');
ui['best-kills'].textContent=G.high.kills;requestAnimationFrame(loop);
