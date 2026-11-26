/* MaymunKapak — simple studio.
 *  ✏️ Kendi Başlığın: type a title (+ optional photo) -> 6 covers -> click to download.
 *  🔗 Kanaldan Otomatik: connect YouTube -> each video gets an auto cover.
 * Pure canvas 2D. */

const FORMATS = { landscape:{W:1280,H:720}, vertical:{W:1080,H:1920} };
const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');
const $ = id => document.getElementById(id);
const IS_EXT = !!(window.chrome && chrome.runtime && chrome.runtime.id);

/* Free plan: small watermark on every thumbnail. Pro: clean. */
function stamp(c,W,H){
  if(isPro()||!MK_CONFIG.watermark)return;
  const fs=Math.round(Math.min(W,H)*.032),txt='🐵 '+MK_CONFIG.watermark;
  c.save();c.font=`700 ${fs}px Arial`;c.textAlign='right';c.textBaseline='bottom';
  const tw=c.measureText(txt).width,pad=fs*.45,x=W-fs*.6,y=H-fs*.6;
  c.globalAlpha=.78;roundRect(c,x-tw-pad,y-fs-pad*.9,tw+pad*2,fs+pad*1.6,fs*.35);c.fillStyle='#000';c.fill();
  c.globalAlpha=1;c.fillStyle='#fff';c.fillText(txt,x+pad*.0,y);c.restore();
}

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
  text=(text||'').toLocaleUpperCase(LOCALE()).trim();if(!text)return{lines:[],px:startPx};
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
    if(o.subtitle){c.font=`800 ${U*.06}px Arial`;drawStrokedLines(c,[o.subtitle.toLocaleUpperCase(LOCALE())],W/2,H-U*.08,U*.06,U*.06,'#fff','#000',U*.012,'center');}},

  boldLeft(c,o){const{W,H}=o,U=H,isV=H>W;
    c.fillStyle=linGrad(c,0,0,W,H,o.pal.bg);c.fillRect(0,0,W,H);
    if(o.img){if(isV){drawCover(c,o.img,0,H*.5,W,H*.5);const g=c.createLinearGradient(0,H*.35,0,H*.6);g.addColorStop(0,o.pal.bg[0]);g.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=g;c.fillRect(0,H*.35,W,H*.25);}
      else{drawCover(c,o.img,W*.5,0,W*.5,H);const g=c.createLinearGradient(W*.35,0,W*.65,0);g.addColorStop(0,o.pal.bg[0]);g.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=g;c.fillRect(W*.35,0,W*.3,H);}}
    c.fillStyle=o.pal.accent;c.fillRect(W*.055,0,U*.022,isV?H*.55:H);
    const box=W*(o.img&&!isV?.44:.86),t=fitLines(c,o.title,box,3,U*.22,U*.08,'900',o.font),lh=t.px*1.04;
    const cy=isV?H*.3:H*.5,sy=cy-((t.lines.length-1)*lh)/2-(o.subtitle?U*.04:0);
    drawStrokedLines(c,t.lines,W*.095,sy+t.px*.35,t.px,lh,o.pal.text,'#000',t.px*.13,'left');
    if(o.subtitle){c.font=`700 ${U*.06}px Arial`;drawStrokedLines(c,[o.subtitle.toLocaleUpperCase(LOCALE())],W*.095,sy+t.lines.length*lh+U*.05,U*.06,U*.06,o.pal.accent,'#000',U*.012,'left');}},

  bottomBar(c,o){const{W,H}=o,U=H;
    if(o.img)drawCover(c,o.img,0,0,W,H);else{c.fillStyle=linGrad(c,0,0,W,H,o.pal.bg);c.fillRect(0,0,W,H);}
    const bh=H*.5,g=c.createLinearGradient(0,H-bh,0,H);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(.4,'rgba(0,0,0,.7)');g.addColorStop(1,'rgba(0,0,0,.92)');c.fillStyle=g;c.fillRect(0,H-bh,W,bh);
    const t=fitLines(c,o.title,W*.9,3,U*.2,U*.08,'900',o.font),lh=t.px*1.02,baseY=H-U*.1-((t.lines.length-1)*lh);
    drawStrokedLines(c,t.lines,W*.05,baseY,t.px,lh,o.pal.text,'#000',t.px*.1,'left');
    c.fillStyle=o.pal.accent;c.fillRect(W*.05,H-U*.065,W*.16,U*.016);
    if(o.subtitle){c.font=`700 ${U*.055}px Arial`;drawStrokedLines(c,[o.subtitle.toLocaleUpperCase(LOCALE())],W*.05,baseY-t.px,U*.055,U*.055,o.pal.accent,'#000',U*.01,'left');}},

  centerStack(c,o){const{W,H}=o,U=H,isV=H>W;
    c.fillStyle=linGrad(c,0,H,W,0,o.pal.bg);c.fillRect(0,0,W,H);
    c.globalAlpha=.15;c.fillStyle=o.pal.accent;c.beginPath();c.arc(W*.85,H*.18,U*.25,0,7);c.fill();c.beginPath();c.arc(W*.12,H*.85,U*.2,0,7);c.fill();c.globalAlpha=1;
    if(o.img){const r=Math.min(W,H)*.28,cx=isV?W*.5:W*.8,cy=isV?H*.72:H*.5;c.save();c.beginPath();c.arc(cx,cy,r,0,7);c.clip();drawCover(c,o.img,cx-r,cy-r,r*2,r*2);c.restore();c.lineWidth=U*.014;c.strokeStyle=o.pal.accent;c.beginPath();c.arc(cx,cy,r,0,7);c.stroke();}
    const box=o.img&&!isV?W*.55:W*.85,t=fitLines(c,o.title,box,3,U*.22,U*.08,'900',o.font),lh=t.px*1.02;
    const cy=isV?H*.28:H*.5,sy=cy-((t.lines.length-1)*lh)/2,aL=o.img&&!isV;
    drawStrokedLines(c,t.lines,aL?W*.08:W/2,sy+t.px*.32,t.px,lh,o.pal.text,'#000',t.px*.13,aL?'left':'center');
    if(o.subtitle){c.font=`700 ${U*.05}px Arial`;drawStrokedLines(c,[o.subtitle.toLocaleUpperCase(LOCALE())],aL?W*.08:W/2,sy+t.lines.length*lh+U*.03,U*.05,U*.05,o.pal.accent,'#000',U*.008,aL?'left':'center');}},

  megaText(c,o){const{W,H}=o,U=H;
    c.fillStyle=linGrad(c,0,0,W,H,o.pal.bg);c.fillRect(0,0,W,H);
    if(o.img){c.globalAlpha=.35;drawCover(c,o.img,0,0,W,H);c.globalAlpha=1;c.fillStyle='rgba(0,0,0,.35)';c.fillRect(0,0,W,H);}
    const t=fitLines(c,o.title,W*.92,3,U*.34,U*.1,'900',o.font),lh=t.px*.98,sy=H*.5-((t.lines.length-1)*lh)/2-(o.subtitle?U*.05:0);
    drawStrokedLines(c,t.lines,W/2,sy+t.px*.32,t.px,lh,o.pal.accent,'#000',t.px*.14,'center');
    if(o.subtitle){const fs=U*.06;c.font=`800 ${fs}px Arial`;c.textAlign='center';const sub=o.subtitle.toLocaleUpperCase(LOCALE()),sw=c.measureText(sub).width,sy2=sy+t.lines.length*lh+U*.03;
      roundRect(c,W/2-sw/2-fs*.4,sy2-fs*.95,sw+fs*.8,fs*1.45,fs*.25);c.fillStyle=o.pal.badge;c.fill();c.fillStyle='#111';c.fillText(sub,W/2,sy2);}},
};
function render(templateId, pal, format, opts){
  const {W,H}=FORMATS[format];canvas.width=W;canvas.height=H;ctx.clearRect(0,0,W,H);
  const P=typeof pal==='number'?PALETTES[pal]:pal;
  (TEMPLATES[templateId]||TEMPLATES.beast)(ctx,{title:opts.title,subtitle:opts.subtitle||'',pal:P,
    img:opts.img||null,font:opts.font||'"Anton", Impact, Arial Black',W,H});
  stamp(ctx,W,H);
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
  d.innerHTML=`<img src="${url}" alt=""><button class="dl">${t('download')}</button>`;
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
  if(IS_EXT)throw new Error('cutout is web-only');   // extension may not load remote code
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
    const fs=isV?U*.05:U*.07,sub=o.subtitle.toLocaleUpperCase(LOCALE());
    c.font=`800 ${fs}px Arial`;const sw2=c.measureText(sub).width,by=sy0+t.lines.length*lh+fs*.5;
    const bx=isV?W/2:(side==='right'?boxX+sw2/2+fs*.4:boxX-sw2/2-fs*.4);
    roundRect(c,bx-sw2/2-fs*.4,by-fs*.95,sw2+fs*.8,fs*1.5,fs*.28);c.fillStyle=P.badge;c.fill();
    c.fillStyle='#fff';c.textAlign='center';c.textBaseline='alphabetic';c.fillText(sub,bx,by+fs*.1);
  }
  stamp(c,W,H);
  return canvas.toDataURL('image/png');
}
const SUBJECT_COMBOS=[[7,'"Anton", Impact','right'],[1,'"Archivo Black", Arial Black','left'],[4,'"Anton", Impact','right'],
  [2,'"Lilita One", Impact','left'],[0,'"Bebas Neue", Impact','right'],[3,'"Lilita One", Impact','left']];

/* ================= KENDİ BAŞLIĞIN ================= */
const COMBOS=[['beast',7,'"Anton", Impact'],['boldLeft',3,'"Archivo Black", Arial Black'],['megaText',4,'"Anton", Impact'],
  ['centerStack',2,'"Lilita One", Impact'],['bottomBar',0,'"Bebas Neue", Impact'],['beast',1,'"Lilita One", Impact']];
let FMT='landscape', userImage=null, userCutout=null;
function generate(){
  const title=$('title').value.trim()||t('defaultTitle'), sub=$('subtitle').value.trim(), grid=$('covers');grid.innerHTML='';
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
  if(b.dataset.fmt==='vertical'&&!isPro()){openPro(true);return;}
  document.querySelectorAll('.fmt-btn').forEach(x=>x.classList.remove('active'));b.classList.add('active');FMT=b.dataset.fmt;generate();});
$('photo').addEventListener('change',async e=>{
  const f=e.target.files[0];if(!f)return;
  const url=URL.createObjectURL(f);const img=await loadImg(url);
  userImage=img;userCutout=null;
  $('photoDrop').classList.add('hide');$('photoPreview').classList.add('show');$('photoThumb').src=url;
  generate();                                                  // instant: photo as background
  if(IS_EXT)return;
  setCutStatus(t('cutting'));
  try{
    const cut=await cutoutPerson(f);
    if(cut&&userImage===img){userCutout=cut;generate();setCutStatus(t('cutDone'),true);}
  }catch(err){console.warn('cutout failed',err);setCutStatus(t('cutFail'));}
});
$('photoClear').onclick=()=>{userImage=null;userCutout=null;$('photo').value='';
  $('photoDrop').classList.remove('hide');$('photoPreview').classList.remove('show');setCutStatus('');generate();};

/* ================= VIEW ROUTER ================= */
const VIEWS={home:'viewHome',manual:'viewManual',channel:'viewChannel'};
function showView(v){for(const k in VIEWS)$(VIEWS[k]).hidden=(k!==v);window.scrollTo(0,0);}
$('goManual').onclick=()=>{showView('manual');generate();};
$('goChannel').onclick=()=>{if(!isPro()){openPro(true);return;}showView('channel');};
$('homeLink').addEventListener('click',e=>{e.preventDefault();showView('home');});
document.querySelectorAll('[data-home]').forEach(b=>b.onclick=()=>showView('home'));

/* ================= YOUTUBE — tarayıcı-içi OAuth (Google Identity Services) ================= */
const CLIENT_ID=MK_CONFIG.youtubeClientId;
const YT_SCOPE='https://www.googleapis.com/auth/youtube.force-ssl';
let ytToken=null, tokenClient=null, VIDEOS=[];
const ytReady=()=>window.google&&google.accounts&&google.accounts.oauth2;
function initToken(){ if(tokenClient||!ytReady())return;
  tokenClient=google.accounts.oauth2.initTokenClient({client_id:CLIENT_ID,scope:YT_SCOPE,
    callback:r=>{ $('connectBtn').textContent=t('connectBtn');
      if(r&&r.access_token){ytToken=r.access_token;loadChannel();} }}); }
/* Extension: no remote Google script allowed, so use chrome.identity's OAuth window instead. */
async function extAuth(){
  const redirect=chrome.identity.getRedirectURL();
  const url='https://accounts.google.com/o/oauth2/v2/auth?'+new URLSearchParams({client_id:CLIENT_ID,response_type:'token',
    redirect_uri:redirect,scope:YT_SCOPE,include_granted_scopes:'true',prompt:'select_account'});
  const back=await chrome.identity.launchWebAuthFlow({url,interactive:true});
  const tok=new URLSearchParams(new URL(back).hash.slice(1)).get('access_token');
  if(!tok)throw new Error('no token');return tok;
}
$('connectBtn').onclick=async()=>{
  if(!isPro()){openPro(true);return;}
  if(IS_EXT){
    $('connectBtn').textContent=t('googleOpening');
    try{ytToken=await extAuth();loadChannel();}catch(e){console.warn(e);}
    finally{$('connectBtn').textContent=t('connectBtn');}
    return;
  }
  initToken();
  if(!tokenClient){alert(t('googleLoading'));return;}
  $('connectBtn').textContent=t('googleOpening');
  tokenClient.requestAccessToken();
};
async function ytFetch(u){const r=await fetch(u,{headers:{Authorization:'Bearer '+ytToken}});if(!r.ok)throw new Error('YouTube '+r.status);return r.json();}
async function loadChannel(){
  $('connectHero').hidden=true;$('autoResults').hidden=false;$('chanHead').textContent=t('loadingChannel');
  try{
    const ch=await ytFetch('https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails&mine=true');
    const c=ch.items&&ch.items[0];if(!c)throw new Error(t('noChannel'));
    const uploads=c.contentDetails.relatedPlaylists.uploads, logo=(c.snippet.thumbnails&&c.snippet.thumbnails.default||{}).url||'';
    const pl=await ytFetch('https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=12&playlistId='+uploads);
    VIDEOS=(pl.items||[]).map(it=>({id:it.snippet.resourceId.videoId,title:it.snippet.title}));
    $('chanHead').innerHTML=(logo?`<img src="${logo}" alt="">`:'')+`<span><b></b> · ${t('chanInfo',VIDEOS.length)}</span>`;
    $('chanHead').querySelector('b').textContent=c.snippet.title;
    renderChannel();
  }catch(e){console.warn(e);$('chanHead').textContent=t('videosFail')+e.message;}
}
function renderChannel(){
  if(!VIDEOS.length)return;
  const grid=$('autoCovers');grid.innerHTML='';
  VIDEOS.forEach(v=>{
    const cls=classify(v),font=FONT_BY_TYPE[cls.label]||'"Anton", Impact';
    const url=render(cls.templateId,cls.paletteIdx,'landscape',{title:v.title,font});
    const d=document.createElement('div');d.className='cover landscape';
    d.innerHTML=`<img src="${url}" alt=""><button class="dl">${t('download')}</button><button class="up">${t('uploadToChannel')}</button>`;
    d.querySelector('.dl').onclick=e=>{e.stopPropagation();download(url);};
    d.querySelector('.up').onclick=e=>{e.stopPropagation();uploadThumb(v.id,url,e.currentTarget);};
    grid.appendChild(d);
  });
  $('autoHint').innerHTML=t('autoHint');
}
async function uploadThumb(videoId,dataUrl,btn){
  if(!ytToken){alert(t('connectFirst'));return;}
  if(!isPro()){openPro(true);return;}
  btn.disabled=true;btn.textContent=t('uploading');
  try{
    const blob=await(await fetch(dataUrl)).blob();
    const r=await fetch('https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId='+videoId+'&uploadType=media',
      {method:'POST',headers:{Authorization:'Bearer '+ytToken,'Content-Type':'image/png'},body:blob});
    if(!r.ok)throw new Error((await r.text()).slice(0,140)||('HTTP '+r.status));
    btn.textContent=t('uploaded');btn.classList.add('done');
  }catch(e){console.warn(e);btn.disabled=false;btn.textContent=t('retry');alert(t('uploadFail')+e.message);}
}

/* ================= PRO ================= */
function refreshPlan(){
  const pro=isPro();document.body.classList.toggle('is-pro',pro);
  $('planBadge').textContent=pro?t('proBadge'):t('freeBadge');$('planBadge').classList.toggle('pro',pro);
  $('proBtn').textContent=pro?'✓ '+t('proBadge'):t('goPro');$('proBtn').classList.toggle('is-pro',pro);
  $('proKeyArea').hidden=pro;$('proBuyRow').hidden=pro||!MK_CONFIG.buyUrl;$('proDeactivate').hidden=!pro;
  if(pro){$('proMsg').textContent=t('proActive');$('proMsg').className='pro-msg ok';}
  if(!pro&&FMT==='vertical'){FMT='landscape';document.querySelectorAll('.fmt-btn').forEach(x=>x.classList.toggle('active',x.dataset.fmt==='landscape'));}
}
function openPro(locked){
  $('proLocked').hidden=!locked||isPro();
  if(!isPro()){$('proMsg').textContent='';$('proMsg').className='pro-msg';}
  if(MK_CONFIG.buyUrl)$('proBuy').href=MK_CONFIG.buyUrl;
  $('proDlg').showModal();
}
$('proBtn').onclick=()=>openPro(false);
$('proActivate').onclick=async()=>{
  const b=$('proActivate'),m=$('proMsg');b.disabled=true;b.textContent=t('proChecking');m.textContent='';m.className='pro-msg';
  const r=await activateLicense($('proKey').value);
  b.disabled=false;b.textContent=t('proActivate');
  if(r.ok){$('proKey').value='';$('proLocked').hidden=true;refreshPlan();regenerateAll();}
  else{m.textContent=t(r.reason==='network'?'proNetErr':'proInvalid');m.className='pro-msg err';}
};
$('proDeactivate').onclick=async()=>{await deactivateLicense();$('proMsg').textContent='';refreshPlan();regenerateAll();};

/* ================= LANGUAGE ================= */
function regenerateAll(){ if(!$('viewManual').hidden||!$('covers').children.length)generate(); renderChannel(); }
function fillDefaults(prev){
  // Swap the sample title only if the user hasn't typed their own.
  [['title','titleDefault'],['subtitle','subDefault']].forEach(([id,k])=>{
    const el=$(id); if(!el.value||(prev&&el.value===STRINGS[prev][k]))el.value=t(k);});
}
$('langSel').value=LANG;
$('langSel').onchange=e=>{const prev=LANG;setLang(e.target.value);fillDefaults(prev);afterI18n();refreshPlan();regenerateAll();};
function afterI18n(){ if(IS_EXT)$('photoSub').textContent=t('photoSubExt'); }

/* ================= boot ================= */
if(IS_EXT){ document.querySelectorAll('.ext-only').forEach(e=>e.hidden=new URLSearchParams(location.search).has('full')); $('openFull').href='index.html?full'; }
applyI18n();afterI18n();fillDefaults();refreshPlan();
loadFonts().finally(()=>{ if(!IS_EXT)initToken(); generate(); });
if(!IS_EXT)window.addEventListener('load',initToken);
revalidateLicense(false).then(()=>{refreshPlan();});
