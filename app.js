/* MaymunKapak — simple studio.
 *  ✏️ Kendi Başlığın: type a title (+ optional photo) -> 6 covers -> click to download.
 *  🔗 Kanaldan Otomatik: connect YouTube -> each video gets an auto cover.
 * Pure canvas 2D. */

const FORMATS = { landscape:{W:1280,H:720}, vertical:{W:1080,H:1920} };
const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');
const $ = id => document.getElementById(id);

const PALETTES = [
  { bg:['#2b1055','#7597de'], accent:'#ffd23f', text:'#fff', badge:'#ff3b5c' },
  { bg:['#0f0c29','#302b63'], accent:'#00f5d4', text:'#fff', badge:'#ff006e' },
  { bg:['#200122','#6f0000'], accent:'#ffcc00', text:'#fff', badge:'#ff3b3b' },
  { bg:['#000428','#004e92'], accent:'#4dd0e1', text:'#fff', badge:'#ff5252' },
  { bg:['#134e5e','#0a3d1e'], accent:'#b2ff59', text:'#fff', badge:'#ffea00' },
  { bg:['#111111','#2c2c2c'], accent:'#ffffff', text:'#fff', badge:'#ff3b5c' },
  { bg:['#41295a','#2f0743'], accent:'#f6c945', text:'#fff', badge:'#00e5ff' },
  { bg:['#005c97','#363795'], accent:'#ffe600', text:'#fff', badge:'#ff1744' },
];
const FONT_BY_TYPE = {
  'Oyun':'"Lilita One", Impact','Eğlence':'"Lilita One", Impact','Komedi':'"Lilita One", Impact',
  'Fitness':'"Anton", Impact','Para':'"Anton", Impact','Müzik':'"Anton", Impact','Yemek':'"Anton", Impact',
  'Seyahat':'"Anton", Impact','Vlog':'"Anton", Impact','İnceleme':'"Archivo Black", Arial Black',
  'Teknoloji':'"Archivo Black", Arial Black','Video':'"Archivo Black", Arial Black','Haber':'"Archivo Black", Arial Black',
  'Eğitim':'"Bebas Neue", Impact','Nasıl Yapılır':'"Bebas Neue", Impact',
};
const LABEL_STYLE = { 'Oyun':['beast',1],'İnceleme':['boldLeft',3],'Teknoloji':['boldLeft',3],'Yemek':['centerStack',2],
  'Para':['megaText',4],'Fitness':['beast',7],'Eğitim':['centerStack',6],'Müzik':['megaText',6],'Vlog':['bottomBar',0],
  'Haber':['bottomBar',3],'Seyahat':['bottomBar',0],'Komedi':['megaText',0],'Eğlence':['centerStack',0],
  'Nasıl Yapılır':['centerStack',2],'Video':['boldLeft',0] };

const FONT_FAMILIES=['Anton','Archivo Black','Bebas Neue','Lilita One'];
async function loadFonts(){ if(!('fonts' in document))return;
  await Promise.all(FONT_FAMILIES.map(f=>document.fonts.load(`400 40px "${f}"`).catch(()=>{}))); }

/* ---------- canvas helpers ---------- */
function roundRect(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);
  c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();}
function linGrad(c,x0,y0,x1,y1,cols){const g=c.createLinearGradient(x0,y0,x1,y1);
  cols.forEach((col,i)=>g.addColorStop(i/(cols.length-1),col));return g;}
function drawCover(c,img,x,y,w,h){const ir=img.width/img.height,br=w/h;let dw,dh,dx,dy;
  if(ir>br){dh=h;dw=h*ir;dx=x-(dw-w)/2;dy=y;}else{dw=w;dh=w/ir;dx=x;dy=y-(dh-h)/2;}
  c.save();roundRect(c,x,y,w,h,0);c.clip();c.drawImage(img,dx,dy,dw,dh);c.restore();}
function fitLines(c,text,maxW,maxL,startPx,minPx,weight,fam){
  text=(text||'').toLocaleUpperCase('tr-TR').trim();if(!text)return{lines:[],px:startPx};
  const words=text.split(/\s+/);
  for(let px=startPx;px>=minPx;px-=Math.max(2,startPx*0.03)){
    c.font=`${weight} ${px}px ${fam}`;const lines=[];let cur='';
    for(const w of words){const t=cur?cur+' '+w:w;if(c.measureText(t).width<=maxW)cur=t;else{if(cur)lines.push(cur);cur=w;}}
    if(cur)lines.push(cur);
    if(lines.length<=maxL && lines.every(l=>c.measureText(l).width<=maxW))return{lines,px};}
  c.font=`${weight} ${minPx}px ${fam}`;return{lines:text.split(/\s+/).slice(0,maxL),px:minPx};}
function drawStrokedLines(c,lines,x,y,px,lh,fill,stroke,sw,align){
  c.textAlign=align||'left';c.textBaseline='alphabetic';c.lineJoin='round';c.miterLimit=2;
  lines.forEach((ln,i)=>{const yy=y+i*lh;if(sw>0){c.lineWidth=sw;c.strokeStyle=stroke;c.strokeText(ln,x,yy);}c.fillStyle=fill;c.fillText(ln,x,yy);});}
function vignette(c,W,H){const g=c.createRadialGradient(W/2,H/2,Math.min(W,H)*.3,W/2,H/2,Math.max(W,H)*.75);
  g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,.55)');c.fillStyle=g;c.fillRect(0,0,W,H);}

/* ---------- templates (use o.img as reference when a photo is given) ---------- */
const TEMPLATES = {
  beast(c,o){const{W,H}=o,U=H;
    if(o.img){drawCover(c,o.img,0,0,W,H);vignette(c,W,H);c.fillStyle='rgba(0,0,0,.28)';c.fillRect(0,0,W,H);}
    else{c.fillStyle=linGrad(c,0,0,W,H,o.pal.bg);c.fillRect(0,0,W,H);vignette(c,W,H);}
    const t=fitLines(c,o.title,W*.9,3,U*.3,U*.09,'900',o.font),lh=t.px;
    const sy=H*.5-((t.lines.length-1)*lh)/2;
    drawStrokedLines(c,t.lines,W/2,sy+t.px*.34,t.px,lh,o.pal.accent,'#000',t.px*.16,'center');
    if(o.subtitle){c.font=`800 ${U*.06}px Arial`;drawStrokedLines(c,[o.subtitle.toLocaleUpperCase('tr-TR')],W/2,H-U*.08,U*.06,U*.06,'#fff','#000',U*.012,'center');}},

  boldLeft(c,o){const{W,H}=o,U=H,isV=H>W;
    c.fillStyle=linGrad(c,0,0,W,H,o.pal.bg);c.fillRect(0,0,W,H);
    if(o.img){if(isV){drawCover(c,o.img,0,H*.5,W,H*.5);const g=c.createLinearGradient(0,H*.35,0,H*.6);g.addColorStop(0,o.pal.bg[0]);g.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=g;c.fillRect(0,H*.35,W,H*.25);}
      else{drawCover(c,o.img,W*.5,0,W*.5,H);const g=c.createLinearGradient(W*.35,0,W*.65,0);g.addColorStop(0,o.pal.bg[0]);g.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=g;c.fillRect(W*.35,0,W*.3,H);}}
    c.fillStyle=o.pal.accent;c.fillRect(W*.055,0,U*.022,isV?H*.55:H);
    const box=W*(o.img&&!isV?.44:.86),t=fitLines(c,o.title,box,3,U*.22,U*.08,'900',o.font),lh=t.px*1.04;
    const cy=isV?H*.3:H*.5,sy=cy-((t.lines.length-1)*lh)/2-(o.subtitle?U*.04:0);
    drawStrokedLines(c,t.lines,W*.095,sy+t.px*.35,t.px,lh,o.pal.text,'#000',t.px*.13,'left');
    if(o.subtitle){c.font=`700 ${U*.06}px Arial`;drawStrokedLines(c,[o.subtitle.toLocaleUpperCase('tr-TR')],W*.095,sy+t.lines.length*lh+U*.05,U*.06,U*.06,o.pal.accent,'#000',U*.012,'left');}},

  bottomBar(c,o){const{W,H}=o,U=H;
    if(o.img)drawCover(c,o.img,0,0,W,H);else{c.fillStyle=linGrad(c,0,0,W,H,o.pal.bg);c.fillRect(0,0,W,H);}
    const bh=H*.5,g=c.createLinearGradient(0,H-bh,0,H);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(.4,'rgba(0,0,0,.7)');g.addColorStop(1,'rgba(0,0,0,.92)');c.fillStyle=g;c.fillRect(0,H-bh,W,bh);
    const t=fitLines(c,o.title,W*.9,3,U*.2,U*.08,'900',o.font),lh=t.px*1.02,baseY=H-U*.1-((t.lines.length-1)*lh);
    drawStrokedLines(c,t.lines,W*.05,baseY,t.px,lh,o.pal.text,'#000',t.px*.1,'left');
    c.fillStyle=o.pal.accent;c.fillRect(W*.05,H-U*.065,W*.16,U*.016);
    if(o.subtitle){c.font=`700 ${U*.055}px Arial`;drawStrokedLines(c,[o.subtitle.toLocaleUpperCase('tr-TR')],W*.05,baseY-t.px,U*.055,U*.055,o.pal.accent,'#000',U*.01,'left');}},

  centerStack(c,o){const{W,H}=o,U=H,isV=H>W;
    c.fillStyle=linGrad(c,0,H,W,0,o.pal.bg);c.fillRect(0,0,W,H);
    c.globalAlpha=.15;c.fillStyle=o.pal.accent;c.beginPath();c.arc(W*.85,H*.18,U*.25,0,7);c.fill();c.beginPath();c.arc(W*.12,H*.85,U*.2,0,7);c.fill();c.globalAlpha=1;
    if(o.img){const r=Math.min(W,H)*.28,cx=isV?W*.5:W*.8,cy=isV?H*.72:H*.5;c.save();c.beginPath();c.arc(cx,cy,r,0,7);c.clip();drawCover(c,o.img,cx-r,cy-r,r*2,r*2);c.restore();c.lineWidth=U*.014;c.strokeStyle=o.pal.accent;c.beginPath();c.arc(cx,cy,r,0,7);c.stroke();}
    const box=o.img&&!isV?W*.55:W*.85,t=fitLines(c,o.title,box,3,U*.22,U*.08,'900',o.font),lh=t.px*1.02;
    const cy=isV?H*.28:H*.5,sy=cy-((t.lines.length-1)*lh)/2,aL=o.img&&!isV;
    drawStrokedLines(c,t.lines,aL?W*.08:W/2,sy+t.px*.32,t.px,lh,o.pal.text,'#000',t.px*.13,aL?'left':'center');
    if(o.subtitle){c.font=`700 ${U*.05}px Arial`;drawStrokedLines(c,[o.subtitle.toLocaleUpperCase('tr-TR')],aL?W*.08:W/2,sy+t.lines.length*lh+U*.03,U*.05,U*.05,o.pal.accent,'#000',U*.008,aL?'left':'center');}},

  megaText(c,o){const{W,H}=o,U=H;
    c.fillStyle=linGrad(c,0,0,W,H,o.pal.bg);c.fillRect(0,0,W,H);
    if(o.img){c.globalAlpha=.35;drawCover(c,o.img,0,0,W,H);c.globalAlpha=1;c.fillStyle='rgba(0,0,0,.35)';c.fillRect(0,0,W,H);}
    const t=fitLines(c,o.title,W*.92,3,U*.34,U*.1,'900',o.font),lh=t.px*.98,sy=H*.5-((t.lines.length-1)*lh)/2-(o.subtitle?U*.05:0);
    drawStrokedLines(c,t.lines,W/2,sy+t.px*.32,t.px,lh,o.pal.accent,'#000',t.px*.14,'center');
    if(o.subtitle){const fs=U*.06;c.font=`800 ${fs}px Arial`;c.textAlign='center';const sub=o.subtitle.toLocaleUpperCase('tr-TR'),sw=c.measureText(sub).width,sy2=sy+t.lines.length*lh+U*.03;
      roundRect(c,W/2-sw/2-fs*.4,sy2-fs*.95,sw+fs*.8,fs*1.45,fs*.25);c.fillStyle=o.pal.badge;c.fill();c.fillStyle='#111';c.fillText(sub,W/2,sy2);}},
};
function render(templateId, pal, format, opts){
  const {W,H}=FORMATS[format];canvas.width=W;canvas.height=H;ctx.clearRect(0,0,W,H);
  const P=typeof pal==='number'?PALETTES[pal]:pal;
  (TEMPLATES[templateId]||TEMPLATES.beast)(ctx,{title:opts.title,subtitle:opts.subtitle||'',pal:P,
    img:opts.img||null,font:opts.font||'"Anton", Impact, Arial Black',W,H});
  return canvas.toDataURL('image/png');
}
function classify(v){
  const text=((v.title||'')+' '+(v.tags||[]).join(' ')).toLowerCase(),has=a=>a.some(k=>text.includes(k)),pick=(l,t,p)=>({label:l,templateId:t,paletteIdx:p});
  if(has(['recipe','tarif','yemek','food','mutfak']))return pick('Yemek','centerStack',2);
  if(has(['money','para','kazan','invest','business','dolar','$']))return pick('Para','megaText',4);
  if(has(['workout','fitness','spor','antren','kas']))return pick('Fitness','beast',7);
  if(has(['review','inceleme','unboxing','iphone','samsung']))return pick('İnceleme','boldLeft',3);
  if(has(['tutorial','learn','öğren','nasıl','eğitim','python','kod']))return pick('Eğitim','centerStack',6);
  if(has(['oyun','gaming','game','minecraft']))return pick('Oyun','beast',1);
  if(has(['music','şarkı','müzik']))return pick('Müzik','megaText',6);
  const byCat={'20':['Oyun','beast',1],'28':['Teknoloji','boldLeft',3],'26':['Nasıl Yapılır','centerStack',2],'27':['Eğitim','centerStack',6],'10':['Müzik','megaText',6],'17':['Fitness','beast',7],'22':['Vlog','bottomBar',0]};
  return byCat[v.categoryId]?pick(...byCat[v.categoryId]):pick('Video','boldLeft',0);
}
function download(url){const a=document.createElement('a');a.href=url;a.download=`maymunkapak_${Date.now()}.png`;a.click();}
function coverEl(url,cls){const d=document.createElement('div');d.className='cover '+cls;
  d.innerHTML=`<img src="${url}" alt="kapak"><button class="dl">⬇ İndir</button>`;
  d.querySelector('.dl').onclick=e=>{e.stopPropagation();download(url);};d.onclick=()=>download(url);return d;}

/* ---------- AI person cutout (fully client-side, works on Vercel too) ---------- */
function hexA(h,a){const n=parseInt(h.slice(1),16);return`rgba(${n>>16&255},${n>>8&255},${n&255},${a})`;}
function loadImg(src){return new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=src;});}
function trimToContent(img){
  const t=document.createElement('canvas');t.width=img.width;t.height=img.height;
  const x=t.getContext('2d');x.drawImage(img,0,0);
  const d=x.getImageData(0,0,t.width,t.height).data;
  let top=t.height,left=t.width,right=0,bot=0,found=false;
  for(let y=0;y<t.height;y++)for(let xx=0;xx<t.width;xx++){if(d[(y*t.width+xx)*4+3]>18){found=true;if(y<top)top=y;if(y>bot)bot=y;if(xx<left)left=xx;if(xx>right)right=xx;}}
  if(!found)return img;
  const w=right-left+1,h=bot-top+1,o=document.createElement('canvas');o.width=w;o.height=h;
  o.getContext('2d').drawImage(t,left,top,w,h,0,0,w,h);return o;
}
let _bgrMod=null;
async function cutoutPerson(file){
  if(!_bgrMod)_bgrMod=import('https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.5.5/+esm');
  const mod=await _bgrMod;
  const blob=await (mod.removeBackground||mod.default)(file);
  const im=await loadImg(URL.createObjectURL(blob));
  return trimToContent(im);
}
function setCutStatus(msg,done){const e=$('cutStatus');if(!e)return;e.textContent=msg||'';e.classList.toggle('done',!!done);}

/* ---------- subject-forward cover (person cut out + big text beside) ---------- */
function renderSubject(pal,font,side,format,o){
  const {W,H}=FORMATS[format];canvas.width=W;canvas.height=H;const c=ctx;c.clearRect(0,0,W,H);
  const P=PALETTES[pal],U=H,isV=H>W,cut=o.cut;
  c.fillStyle=linGrad(c,0,0,W,H,P.bg);c.fillRect(0,0,W,H);
  const gx=isV?W/2:(side==='right'?W*.7:W*.3),gy=isV?H*.6:H*.55;
  const rg=c.createRadialGradient(gx,gy,U*.05,gx,gy,Math.max(W,H)*.6);
  rg.addColorStop(0,hexA(P.accent,.45));rg.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=rg;c.fillRect(0,0,W,H);
  if(cut){
    let sw,sh,sx,sy;
    if(isV){sh=H*.72;sw=sh*cut.width/cut.height;if(sw>W){sw=W;sh=sw*cut.height/cut.width;}sx=W/2-sw/2;sy=H-sh;}
    else{sh=H;sw=sh*cut.width/cut.height;if(sw>W*.54){sw=W*.54;sh=sw*cut.height/cut.width;}sx=side==='right'?W-sw:0;sy=H-sh;}
    c.save();c.shadowColor='rgba(0,0,0,.45)';c.shadowBlur=U*.035;c.shadowOffsetX=side==='right'?-U*.006:U*.006;c.drawImage(cut,sx,sy,sw,sh);c.restore();
  }
  const tAlign=isV?'center':(side==='right'?'left':'right');
  const boxX=isV?W/2:(side==='right'?W*.05:W*.95),boxW=isV?W*.9:W*.42;
  const t=fitLines(c,o.title,boxW,3,isV?U*.12:U*.185,U*.075,'900',font),lh=t.px*1.03;
  const cy=isV?H*.17:H*.46,sy0=cy-((t.lines.length-1)*lh)/2;
  drawStrokedLines(c,t.lines,boxX,sy0+t.px*.34,t.px,lh,P.accent,'#000',t.px*.14,tAlign);
  if(o.subtitle){
    const fs=isV?U*.05:U*.07,sub=o.subtitle.toLocaleUpperCase('tr-TR');
    c.font=`800 ${fs}px Arial`;const sw2=c.measureText(sub).width,by=sy0+t.lines.length*lh+fs*.5;
    const bx=isV?W/2:(side==='right'?boxX+sw2/2+fs*.4:boxX-sw2/2-fs*.4);
    roundRect(c,bx-sw2/2-fs*.4,by-fs*.95,sw2+fs*.8,fs*1.5,fs*.28);c.fillStyle=P.badge;c.fill();
    c.fillStyle='#fff';c.textAlign='center';c.textBaseline='alphabetic';c.fillText(sub,bx,by+fs*.1);
  }
  return canvas.toDataURL('image/png');
}
const SUBJECT_COMBOS=[[7,'"Anton", Impact','right'],[1,'"Archivo Black", Arial Black','left'],[4,'"Anton", Impact','right'],
  [2,'"Lilita One", Impact','left'],[0,'"Bebas Neue", Impact','right'],[3,'"Lilita One", Impact','left']];

/* ================= KENDİ BAŞLIĞIN ================= */
const COMBOS=[['beast',7,'"Anton", Impact'],['boldLeft',3,'"Archivo Black", Arial Black'],['megaText',4,'"Anton", Impact'],
  ['centerStack',2,'"Lilita One", Impact'],['bottomBar',0,'"Bebas Neue", Impact'],['beast',1,'"Lilita One", Impact']];
let FMT='landscape', userImage=null, userCutout=null;
function generate(){
  const title=$('title').value.trim()||'BAŞLIĞINI YAZ', sub=$('subtitle').value.trim(), grid=$('covers');grid.innerHTML='';
  if(userCutout){
    SUBJECT_COMBOS.forEach(([pi,font,side])=>grid.appendChild(coverEl(renderSubject(pi,font,side,FMT,{title,subtitle:sub,cut:userCutout}),FMT)));
  }else{
    COMBOS.forEach(([tpl,pi,font])=>grid.appendChild(coverEl(render(tpl,pi,FMT,{title,subtitle:sub,font,img:userImage}),FMT)));
  }
}
let timer;const scheduleGen=()=>{clearTimeout(timer);timer=setTimeout(generate,250);};
$('title').addEventListener('input',scheduleGen);
$('subtitle').addEventListener('input',scheduleGen);
document.querySelectorAll('.fmt-btn').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('.fmt-btn').forEach(x=>x.classList.remove('active'));b.classList.add('active');FMT=b.dataset.fmt;generate();});
$('photo').addEventListener('change',async e=>{
  const f=e.target.files[0];if(!f)return;
  const url=URL.createObjectURL(f);const img=await loadImg(url);
  userImage=img;userCutout=null;
  $('photoBox').classList.add('has');$('photoPreview').classList.add('show');$('photoThumb').src=url;
  generate();if(VIDEOS.length)renderAuto();                    // instant: photo as background
  setCutStatus('✂️ Kişi otomatik kesiliyor… (ilk seferde biraz sürebilir)');
  try{
    const cut=await cutoutPerson(f);
    if(cut&&userImage===img){userCutout=cut;generate();if(VIDEOS.length)renderAuto();
      setCutStatus('✨ Kişi kesildi, kapakların önüne yerleşti',true);}
  }catch(err){console.warn('cutout failed',err);setCutStatus('Arka plan silinemedi — foto arka plan olarak kullanıldı');}
});
$('photoClear').onclick=()=>{userImage=null;userCutout=null;$('photo').value='';$('photoBox').classList.remove('has');
  $('photoPreview').classList.remove('show');setCutStatus('');generate();if(VIDEOS.length)renderAuto();};

/* ================= KANALDAN OTOMATİK ================= */
const DEMO_VIDEOS=[
  {id:'d1',title:'100 GÜN HAYATTA KALDIM',categoryId:'20'},
  {id:'d2',title:'iPHONE 17 PRO DÜRÜST İNCELEME',categoryId:'28'},
  {id:'d3',title:'15 DAKİKADA MÜKEMMEL MAKARNA',categoryId:'26'},
  {id:'d4',title:'BİR AYDA 300.000 TL KAZANDIM',categoryId:'22'},
  {id:'d5',title:'EKİPMANSIZ TAM VÜCUT ANTRENMANI',categoryId:'17'},
  {id:'d6',title:'1 SAATTE PYTHON ÖĞREN',categoryId:'27'},
];
let CONFIG={hosted:false,connected:false}, VIDEOS=[];
function connect(){ if(CONFIG.hosted){loadVideos();return;} location.href='/auth/google'; }
$('connectBtn').onclick=connect;
async function loadVideos(){
  $('connectHero').hidden=true;$('autoResults').hidden=false;$('autoCount').textContent='videolar yükleniyor…';
  let data=null;try{data=await(await fetch('/api/videos')).json();}catch(e){}
  VIDEOS=(data&&data.videos&&data.videos.length)?data.videos:DEMO_VIDEOS;   // static demo fallback
  $('autoCount').textContent=`${(data&&data.channelTitle)||'Örnek Kanal'} · ${VIDEOS.length} video · her birine otomatik kapak`;
  // punchy slogans if a free AI key exists on the server, else use titles
  try{ if(CONFIG.groqServerKey){ const r=await fetch('/api/slogan-free',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({videos:VIDEOS.map(v=>({id:v.id,title:v.title}))})}); const d=await r.json(); if(d.results)d.results.forEach(x=>{const v=VIDEOS.find(v=>String(v.id)===x.id);if(v){v.slogan=x.slogan;v.topic=x.topic;}}); } }catch(e){}
  renderAuto();
}
function renderAuto(){
  const grid=$('autoCovers');grid.innerHTML='';
  VIDEOS.forEach((v,i)=>{
    const title=v.slogan||v.title;
    if(userCutout){
      const [pi,font,side]=SUBJECT_COMBOS[i%SUBJECT_COMBOS.length];
      grid.appendChild(coverEl(renderSubject(pi,font,side,'landscape',{title,cut:userCutout}),'landscape'));
    }else{
      const cls=v.topic?{label:v.topic,templateId:(LABEL_STYLE[v.topic]||LABEL_STYLE.Video)[0],paletteIdx:(LABEL_STYLE[v.topic]||LABEL_STYLE.Video)[1]}:classify(v);
      const font=FONT_BY_TYPE[cls.label]||'"Anton", Impact';
      grid.appendChild(coverEl(render(cls.templateId,cls.paletteIdx,'landscape',{title,font,img:userImage}),'landscape'));
    }
  });
}

/* ================= TABS ================= */
document.querySelectorAll('.tab').forEach(t=>t.onclick=()=>{
  document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));t.classList.add('active');
  const m=t.dataset.tab;$('panelManual').hidden=m!=='manual';$('panelAuto').hidden=m!=='auto';});

/* ================= boot ================= */
loadFonts().finally(async ()=>{
  try{CONFIG=await(await fetch('/api/config')).json();}catch(e){CONFIG={hosted:true};}  // no backend = static demo
  if(CONFIG.hosted){ $('connectBtn').textContent='🎬 Örnek Kapakları Gör';
    $('connectNote').innerHTML='Demo\'da örnek videolarla gösterilir. Gerçek kanal bağlama tam sürümde.'; }
  const p=new URLSearchParams(location.search);
  if(CONFIG.connected||p.get('connected')){ document.querySelector('.tab[data-tab="auto"]').click(); loadVideos(); }
  generate();
});
