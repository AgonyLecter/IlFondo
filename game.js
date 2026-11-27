import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { AU, initAudio, setUnder, sfxNoise, play, splashSfx, castSfx, reelSfx, duck, silence, coinSfx, bellSfx, groanSfx, whisperSfx, stingerSfx, heartSfx, creakSfx, ringSfx, staticSfx, bubbleSfx,
  thunderSfx, deepCallSfx, creatureSfx, pingSfx, slitherSfx, surfaceSfx, voiceSfx, riserSfx, pageSfx, rumbleSfx, knockSfx, revealSfx, musicBoxSfx, breathSfx, honkSfx, dripSfx, clankSfx, dripsSfx, footstepSfx } from './audio.js';

const $ = id => document.getElementById(id);
const rand = (a,b) => a + Math.random()*(b-a);
const clamp = (x,a,b) => Math.max(a, Math.min(b, x));
const lerp = (a,b,t) => a + (b-a)*t;
const smooth = (a,b,x) => { const t = clamp((x-a)/(b-a),0,1); return t*t*(3-2*t); };
const pick = arr => arr[Math.floor(Math.random()*arr.length)];

/* =====================================================================
   ECONOMIA
   ===================================================================== */
const MAXD = 128;
// oltre i 95 m ogni metro costa meno in proporzione: l'ultima discesa deve precipitare, non trascinarsi
const LPM = d => 250 * Math.pow(1.08, Math.min(d, 95)) * Math.pow(1.05, Math.max(0, d - 95));
const PRICE = d => 0.02 * Math.pow(1.03, d);
const priceNow = () => PRICE(S.d) * FILTERS[S.filter||0].m;
const CATASTO = 150000;
const BUCKETS = [
  {n:`Secchio di latta`, s:1, c:0},
  {n:`Secchio doppio`, s:3, c:12},
  {n:`Tinozza`, s:6, c:90},
  {n:`Botte`, s:12, c:700},
  {n:`Benna`, s:25, c:6000},
  {n:`Benna a strascico`, s:50, c:60000},
  {n:`Gran benna`, s:100, c:700000},
  {n:`Secchio che respira`, s:250, c:9e6, org:true}
];
const PULLS = [
  {n:`Corda marcia`, m:1, c:0},
  {n:`Carrucola`, m:.8, c:25},
  {n:`Verricello`, m:.65, c:250},
  {n:`Argano elettrico`, m:.5, c:3000},
  {n:`Argano a motore`, m:.4, c:40000}
];
const TANKS = [
  {cap:200, c:0},{cap:800, c:20},{cap:4000, c:200},{cap:30000, c:2500},{cap:250000, c:30000},{cap:3e6,c:4e5}
];
const CONTRACTS = [
  {n:`Nessun contratto`, p:0, c:0},
  {n:`Contratto Sesti`, p:.75, c:350},
  {n:`Contratto esclusivo`, p:.9, c:25000},
  {n:`Contratto di sangue`, p:1.15, c:1.5e6, org:true}
];
const PUMPS = [
  {n:`Pompa a mano`, r:3, c:50, d:`Un vecchio pistone arrugginito. Cigola come un lamento.`},
  {n:`Motopompa`, r:25, c:500, d:`Due tempi, fumo nero. Copre i rumori. Meglio così.`},
  {n:`Idrovora`, r:200, c:6000, d:`Beve senza sosta. Di notte vibra anche da spenta.`},
  {n:`Draga`, r:1800, c:80000, d:`Raschia il fondo. Qualche volta tira su cose che si muovono.`},
  {n:`Pompa di carne`, r:18000, c:1.2e6, ph:2, org:true, d:`Calda al tatto. Pulsa quando beve. (−lucidità)`},
  {n:`La Gola`, r:200000, c:25e6, ph:3, org:true, d:`Non è una macchina. Beve per te. (−lucidità)`}
];
const TORCHES = [
  {n:`Torcia a pile`, i:150, c:0},
  {n:`Torcia alogena`, i:420, c:300},
  {n:`Faro da cantiere`, i:1200, c:9000},
  {n:`Faro marino`, i:3500, c:250000}
];
const LUMINI = [0,150,6000,250000];
// filtri: l'acqua pulita vale di più
const FILTERS = [{n:``, m:1, c:0}, {n:`Telo di juta`, m:1.2, c:90}, {n:`Filtro a sabbia`, m:1.45, c:1400}, {n:`Distillatore`, m:1.8, c:18000}, {n:`Alambicco di rame`, m:2.3, c:260000}, {n:`Filtro di capelli`, m:3.2, c:5e6, org:true}];
// amuleti: si perde meno lucidità
const CHARMS = [{n:``, k:1, c:0}, {n:`Sale grosso sulle assi`, k:.85, c:220}, {n:`Ferro di cavallo inchiodato`, k:.72, c:3500}, {n:`Medaglietta di San Cristoforo`, k:.6, c:45000}, {n:`L'occhio chiuso del campanile`, k:.45, c:700000}];
// reti: più reperti nel secchio (e il Compratore li paga)
const NETS = [{n:``, f:1, c:0}, {n:`Retina sul secchio`, f:1.7, c:160}, {n:`Rete a strascico`, f:2.4, c:2800}, {n:`Rete del pescatore annegato`, f:3.3, c:60000}];
// garzoni: calano secchi da soli, anche quando non tocchi niente
const HELPERS = [{n:``, iv:0, k:0, c:0}, {n:`Il garzone muto`, iv:5, k:1, c:110}, {n:`Il garzone, più svelto`, iv:3, k:1, c:1300}, {n:`Due garzoni`, iv:2.6, k:2, c:16000}, {n:`Tre garzoni`, iv:2.2, k:3, c:240000}, {n:`I garzoni senza ombra`, iv:1.2, k:3, c:6e6, org:true}];
// furgone: vende da solo quando la cisterna è piena
const VANS = [{n:``, p:0, c:0}, {n:`Il furgone del Compratore`, p:.85, c:600}, {n:`Due viaggi al giorno`, p:.95, c:9000}];

function fmt(n){
  n = Math.floor(n);
  if (n < 10000) return n.toLocaleString('it-IT');
  const u = [[1e12,' T'],[1e9,' Mld'],[1e6,' M'],[1e3,' k']];
  for (const [v,s] of u) if (n >= v) return (n/v).toLocaleString('it-IT',{maximumFractionDigits: n/v<100?1:0}) + s;
  return String(n);
}
function glitchStr(s){ return s.replace(/[0-9]/g, ()=> Math.random()<.5 ? String(Math.floor(Math.random()*10)) : pick(['6','6','6','?','∞'])); }

/* =====================================================================
   STATO
   ===================================================================== */
const SAVE_KEY = 'ilfondo_v1';
function freshState(cycle=1){
  return { d:0, money:0, tank:0, total:0, luc:100, time:70, bucket:0, pull:0, tankLv:0, contract:0,
    pumps:PUMPS.map(()=>0), torch:0, lumino:0, filter:0, noria:0, crane:0, flood:0, floodOn:true, hull:100, sonar:0, charm:0, net:0, helper:0, van:0, order:null, orderN:0, veins:0, story:[], found:[], revealed:[], relics:[], evc:{}, evRecent:[], cycle, ended:false, torchOn:true };
}
let S = freshState();
function save(){ try{ localStorage.setItem(SAVE_KEY, JSON.stringify(S)); }catch(e){} }
function load(){ try{ const t = localStorage.getItem(SAVE_KEY); if(!t) return null; const o = JSON.parse(t); return Object.assign(freshState(), o); }catch(e){ return null; } }
const phaseOf = d => d<12?0 : d<35?1 : d<65?2 : d<105?3 : 4;
let phase = 0;

const ZC = '\u0300\u0301\u0302\u0303\u0304\u0305\u0306\u0307\u0308\u030A\u030B\u030C\u030D\u030E\u030F\u0310\u0311\u0312\u0313\u0314\u0315\u031A\u031B\u0316\u0317\u0318\u0319\u031C\u031D\u031E\u031F\u0320\u0324\u0325\u0326\u0329\u032A\u032B\u032C\u032D\u032E\u032F\u0330\u0331\u0332\u0333\u0339\u033A\u033B\u033C\u0345\u0347\u0348\u0349\u034D\u034E\u0353\u0354\u0355\u0356\u0359\u035A\u0323';
function zalgo(s, k=3){ if (k <= 0) return s; return [...s].map(ch=> ch===' ' || ch==='\n' ? ch : ch + Array.from({length: Math.floor(Math.random()*k)}, ()=>ZC[Math.floor(Math.random()*ZC.length)]).join('')).join(''); }


/* =====================================================================
   RENDERER / SCENA
   ===================================================================== */
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias:false, powerPreference:'high-performance' });
const MOBILE = matchMedia('(pointer:coarse)').matches;
// impostazioni del giocatore (volume, visuale, luminosità, qualità, effetti forti): salvate a parte dalla partita
const SET_KEY = 'ilfondo_set';
const SET = Object.assign({ vol:1, sens:1, bright:1, q:'auto', inv:false, calm:false }, (()=>{ try { return JSON.parse(localStorage.getItem(SET_KEY)) || {}; } catch(e){ return {}; } })());
const saveSet = ()=>{ try { localStorage.setItem(SET_KEY, JSON.stringify(SET)); } catch(e){} };
const shk = ()=> SET.calm ? .3 : 1;
const DPR = Math.min(window.devicePixelRatio||1, MOBILE ? 1.25 : 1.5);
let qScale = MOBILE ? .85 : 1;
renderer.setPixelRatio(DPR*qScale);
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap; renderer.shadowMap.autoUpdate = false;

/* rumore precalcolato: 4 ottave periodiche nei canali RGBA, letto dagli shader invece di ricalcolarlo */
const NOISE_TEX = (()=>{ const N = 256, data = new Uint8Array(N*N*4);
  const oct = [8,16,32,64].map(P=>{ const g = new Float32Array(P*P); for (let i=0;i<P*P;i++) g[i] = Math.random(); return {P,g}; });
  for (let y=0;y<N;y++) for (let x=0;x<N;x++) oct.forEach(({P,g},c)=>{ const fx = x/N*P, fy = y/N*P, ix = Math.floor(fx), iy = Math.floor(fy), tx = fx-ix, ty = fy-iy, sx = tx*tx*(3-2*tx), sy = ty*ty*(3-2*ty);
    const a = g[(iy%P)*P + ix%P], b = g[(iy%P)*P + (ix+1)%P], cc = g[((iy+1)%P)*P + ix%P], d = g[((iy+1)%P)*P + (ix+1)%P];
    data[(y*N+x)*4+c] = Math.round(((a+(b-a)*sx)*(1-sy) + (cc+(d-cc)*sx)*sy)*255); });
  const t = new THREE.DataTexture(data, N, N, THREE.RGBAFormat); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.needsUpdate = true; return t; })();
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x030405, 0.011);
const camera = new THREE.PerspectiveCamera(70, innerWidth/innerHeight, 0.05, 900);
scene.add(camera);

const HDR_OK = renderer.capabilities.isWebGL2 && (renderer.extensions.has('EXT_color_buffer_float') || renderer.extensions.has('EXT_color_buffer_half_float'));
const RT_TYPE = HDR_OK ? THREE.HalfFloatType : THREE.UnsignedByteType;
const rt = new THREE.WebGLRenderTarget(innerWidth*DPR*qScale, innerHeight*DPR*qScale, { type: RT_TYPE, samples: renderer.capabilities.isWebGL2 && !MOBILE ? 2 : 0 });
// bloom a un quarto di risoluzione
const bloomA = new THREE.WebGLRenderTarget(4,4,{type:RT_TYPE}), bloomB = new THREE.WebGLRenderTarget(4,4,{type:RT_TYPE});
const FS_VS = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }`;
const brightMat = new THREE.ShaderMaterial({ uniforms:{ tDiffuse:{value:rt.texture}, uTexel:{value:new THREE.Vector2()}, uThr:{value:.55} }, vertexShader:FS_VS, depthTest:false, depthWrite:false,
  fragmentShader:`uniform sampler2D tDiffuse; uniform vec2 uTexel; uniform float uThr; varying vec2 vUv;
  void main(){ vec3 c=(texture2D(tDiffuse,vUv+uTexel*vec2(-1.,-1.)).rgb+texture2D(tDiffuse,vUv+uTexel*vec2(1.,-1.)).rgb+texture2D(tDiffuse,vUv+uTexel*vec2(-1.,1.)).rgb+texture2D(tDiffuse,vUv+uTexel*vec2(1.,1.)).rgb)*.25;
    float l=max(c.r,max(c.g,c.b)); gl_FragColor=vec4(min(c*smoothstep(uThr,uThr*2.5+.2,l),vec3(8.)),1.); }` });
const blurMat = new THREE.ShaderMaterial({ uniforms:{ tDiffuse:{value:null}, uDir:{value:new THREE.Vector2()} }, vertexShader:FS_VS, depthTest:false, depthWrite:false,
  fragmentShader:`uniform sampler2D tDiffuse; uniform vec2 uDir; varying vec2 vUv;
  void main(){ vec3 c=texture2D(tDiffuse,vUv).rgb*.227;
    c+=(texture2D(tDiffuse,vUv+uDir*1.385).rgb+texture2D(tDiffuse,vUv-uDir*1.385).rgb)*.316;
    c+=(texture2D(tDiffuse,vUv+uDir*3.231).rgb+texture2D(tDiffuse,vUv-uDir*3.231).rgb)*.07;
    gl_FragColor=vec4(c,1.); }` });
const postMat = new THREE.ShaderMaterial({
  uniforms:{ tDiffuse:{value:rt.texture}, tBloom:{value:bloomA.texture}, uBloomK:{value:.9}, uBright:{value:SET.bright}, uFlashK:{value:SET.calm ? .25 : 1}, uTime:{value:0}, uInsane:{value:0}, uFlash:{value:0}, uExposure:{value:1.4}, uRes:{value:new THREE.Vector2(innerWidth,innerHeight)}, uDark:{value:0},
    uOld:{value:0}, uUnder:{value:0}, uTent:{value:0}, uSick:{value:0}, uPulse:{value:0}, uWet:{value:0} },
  vertexShader:FS_VS,
  fragmentShader:`
  uniform sampler2D tDiffuse,tBloom; uniform float uBright,uFlashK; uniform float uTime,uInsane,uFlash,uExposure,uDark,uBloomK,uOld,uUnder,uTent,uSick,uPulse,uWet; uniform vec2 uRes; varying vec2 vUv;
  vec3 aces(vec3 x){ return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.); }
  float hh(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
  void main(){
    vec2 uv=vUv; vec2 cc=uv-.5; float fr=floor(uTime*18.);
    uv += uOld*(vec2(hh(vec2(floor(uTime*6.),1.)),hh(vec2(floor(uTime*6.),2.)))-.5)*.0012;
    uv += uInsane*.005*vec2(sin(uv.y*18.+uTime*2.1), cos(uv.x*15.+uTime*1.6));
    uv += uUnder*.0032*vec2(sin(uv.y*26.+uTime*1.7), cos(uv.x*21.+uTime*1.3));
    // gocce d'acqua sull'obiettivo: rifrangono e scivolano giù
    float wetM=0.;
    if(uWet>0.){ vec2 wo=vec2(0.);
      for(int L=0;L<2;L++){ float sc=L==0?5.:10.; vec2 q=vUv*vec2(uRes.x/uRes.y,1.)*sc; float cl=floor(q.x); q.y+=uTime*(.12+hh(vec2(cl,float(L)))*.4)/(1.+float(L));
        vec2 id=floor(q); vec2 f=fract(q)-.5; float r=hh(id+float(L)*13.1); if(r>.25+uWet*.6) continue;
        vec2 o=(vec2(hh(id+3.1),hh(id+7.7))-.5)*.5; vec2 dp=(f-o)*vec2(1.,1.3); float rad=.1+.2*hh(id+5.3); float m=smoothstep(rad,rad*.55,length(dp));
        wo+=dp*m*.5/sc; wetM=max(wetM,m*smoothstep(rad*.4,rad,length(dp))); }
      uv-=wo*min(1.,uWet*1.5); }
    float ca=.0012+uInsane*.009+uUnder*.002;
    vec3 col; col.r=texture2D(tDiffuse,uv+cc*ca).r; col.g=texture2D(tDiffuse,uv).g; col.b=texture2D(tDiffuse,uv-cc*ca).b;
    vec3 bl=texture2D(tBloom,uv).rgb;
    col+=bl*uBloomK;
    col*=uExposure*uBright; col=aces(col); col*=1.-wetM*uWet*.35;
    float l=dot(col,vec3(.299,.587,.114));
    col=mix(vec3(l),col,.6);
    col*=mix(vec3(.80,.98,.96), vec3(1.06,1.0,.86), smoothstep(.02,.45,l));
    col=mix(col, col*vec3(.85,1.12,.7), uSick);
    col=pow(col,vec3(1./2.2));
    col=mix(col, col*vec3(.42,.92,.82)+vec3(0.,.014,.012), uUnder);
    if(uOld>0.){
      float L=dot(col,vec3(.3,.59,.11)); vec3 sep=vec3(L)*vec3(1.1,.96,.74); sep=(sep-.45)*1.2+.45;
      float scr=step(.72,hh(vec2(fr,3.)))*smoothstep(.0016,0.,abs(vUv.x-hh(vec2(fr,4.))));
      float scr2=step(.85,hh(vec2(fr,6.)))*smoothstep(.001,0.,abs(vUv.x-hh(vec2(fr,7.))));
      float dust=step(.9986,hh(floor(vUv*uRes/3.)+fr*1.7));
      sep=mix(sep,vec3(.9,.85,.7),(scr+scr2)*.45); sep=mix(sep,vec3(.03),dust);
      sep*=.86+.14*hh(vec2(fr,5.));
      col=mix(col,sep,uOld);
    }
    float v=smoothstep(1.05,.2,length(cc*vec2(1.,1.2)));
    col*=mix(.1,1.,v)*(1.-uPulse*uFlashK*.22*(1.-v*.6));
    col=mix(col,col*vec3(1.15,.7,.68),uInsane*.35*(1.-v));
    col=mix(col, vec3(dot(col,vec3(.3,.59,.11))), uInsane*.45);
    if(uTent>0.){
      vec2 q=cc*vec2(uRes.x/uRes.y,1.); float r=length(q), a=atan(q.y,q.x);
      float reach=1.08-uTent*.6+.11*sin(a*6.+uTime*.22+sin(a*11.+uTime*.37)*1.6)+.05*sin(a*19.-uTime*.6)+.03*sin(a*37.+uTime);
      float m=smoothstep(reach,reach+.035,r);
      col=mix(col,vec3(.012,.004,.014),m*min(1.,uTent*1.6));
      col+=vec3(.05,.09,.04)*smoothstep(.025,0.,abs(r-reach))*uTent;
    }
    float g=hh(floor(vUv*uRes)+fract(uTime)*91.);
    col+=(g-.5)*(.05+uInsane*.07+uOld*.06);
    col=mix(col,vec3(0.),uDark);
    col+=uFlash*uFlashK;
    gl_FragColor=vec4(col,1.);
  }`, depthTest:false, depthWrite:false });
const postScene = new THREE.Scene();
const postCam = new THREE.OrthographicCamera(-1,1,1,-1,0,1);
const postQuad = new THREE.Mesh(new THREE.PlaneGeometry(2,2), postMat); postQuad.frustumCulled = false;
postScene.add(postQuad);
function sizeTargets(){
  const PR = DPR*qScale, w = Math.max(4, Math.floor(innerWidth*PR/4)), h = Math.max(4, Math.floor(innerHeight*PR/4));
  bloomA.setSize(w,h); bloomB.setSize(w,h); brightMat.uniforms.uTexel.value.set(1/(innerWidth*PR), 1/(innerHeight*PR));
  bloomTexel.set(1/w, 1/h);
}
const bloomTexel = new THREE.Vector2();
sizeTargets();
function renderFrame(){
  renderer.setRenderTarget(rt); renderer.render(scene, camera);
  postQuad.material = brightMat; renderer.setRenderTarget(bloomA); renderer.render(postScene, postCam);
  postQuad.material = blurMat;
  for (const k of [1, 2.2]){
    blurMat.uniforms.tDiffuse.value = bloomA.texture; blurMat.uniforms.uDir.value.set(bloomTexel.x*k, 0); renderer.setRenderTarget(bloomB); renderer.render(postScene, postCam);
    blurMat.uniforms.tDiffuse.value = bloomB.texture; blurMat.uniforms.uDir.value.set(0, bloomTexel.y*k); renderer.setRenderTarget(bloomA); renderer.render(postScene, postCam);
  }
  postQuad.material = postMat; renderer.setRenderTarget(null); renderer.render(postScene, postCam);
}

function applySize(){
  const PR = DPR*qScale; renderer.setPixelRatio(PR); renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth/innerHeight; camera.updateProjectionMatrix();
  rt.setSize(Math.floor(innerWidth*PR), Math.floor(innerHeight*PR)); sizeTargets();
  postMat.uniforms.uRes.value.set(innerWidth, innerHeight);
  if (typeof moteU !== 'undefined') moteU.uPx.value = innerHeight*PR; if (typeof dropU !== 'undefined') dropU.uPx.value = innerHeight*PR;
}
addEventListener('resize', applySize);
// qualità adattiva: se i fotogrammi rallentano scende la qualità interna, quando torna fluido risale.
// - prima di toccare la risoluzione toglie l'antialiasing del buffer HDR (si nota meno di un'immagine più sfocata)
// - ogni cambio rialloca i buffer (= uno scatto): servono più finestre lente di fila per scendere e più finestre fluide per risalire
// - se dopo un calo non va più veloce, il collo di bottiglia non è la GPU (schermo a 30 Hz, risparmio energetico): la grafica torna com'era
// - non risale subito al livello da cui è appena scesa, così non oscilla
const MSAA = renderer.capabilities.isWebGL2 && !MOBILE ? 2 : 0;
const Q = { t:0, acc:0, n:0, cool:0, bad:0, good:0, prev:null, hold:0, ceil:9, ceilT:0 };
function setQ(scale, samples){
  if (samples !== rt.samples){ rt.samples = samples; rt.dispose(); }
  if (Math.abs(scale - qScale) > .001){ qScale = scale; applySize(); }
  Q.cool = 1;
}
function adaptQuality(raw){
  if (SET.q !== 'auto') return;
  if (raw <= 0 || raw > 1.2 || document.hidden) return;
  Q.acc += raw; Q.n++; Q.t += raw; if (Q.t < 1.5) return;
  const avg = Q.acc/Q.n, win = Q.t; Q.t = Q.acc = Q.n = 0;
  if (Q.hold > 0) Q.hold -= win; if (Q.ceilT > 0 && (Q.ceilT -= win) <= 0) Q.ceil = 9;
  if (Q.cool > 0){ Q.cool--; return; }
  if (Q.prev){ const p = Q.prev; Q.prev = null;
    if (avg > p.avg*.93){ setQ(p.q, p.s); Q.ceil = 9; Q.hold = 60; return; } }
  if (avg > 1/40){ Q.good = 0; if (Q.hold > 0) return;
    const sev = avg > 1/20; if (++Q.bad < (sev ? 1 : 2)) return; Q.bad = 0;
    const from = { q:qScale, s:rt.samples, avg };
    if (rt.samples && !sev) setQ(qScale, 0);
    else { const ns = Math.max(.5, qScale - (sev ? .2 : avg > 1/28 ? .12 : .06)); if (ns > qScale - .01 && !rt.samples) return; setQ(ns, sev ? 0 : rt.samples); }
    Q.prev = from; Q.ceil = from.q + (from.s ? .001 : 0); Q.ceilT = 30;
  } else if (avg < 1/56){ Q.bad = 0; if (++Q.good < 3) return; Q.good = 0;
    if (qScale < 1){ const ns = Math.min(1, qScale + .05); if (ns + (rt.samples ? .001 : 0) >= Q.ceil - .0005) return; setQ(ns, rt.samples); }
    else if (MSAA && !rt.samples && Q.ceil > 1.5) setQ(1, MSAA);
  } else { Q.bad = 0; Q.good = 0; }
}

/* ---------- luci ---------- */
const hemi = new THREE.HemisphereLight(0x5a6670, 0x0b0a08, .1); scene.add(hemi);
const moon = new THREE.DirectionalLight(0x7e8ca8, .15); moon.position.set(-60,120,-80); scene.add(moon);
const lamp = new THREE.PointLight(0xffaa66, 4, 30, 2); lamp.position.set(.95, 2.15, 80.3); scene.add(lamp);
const LAMP_COL = new THREE.Color(0xffaa66);
const flash = new THREE.SpotLight(0xdfe7ff, 60, 0, .42, .55, 1.2);
flash.position.set(-.18,.12,.1); camera.add(flash);
flash.castShadow = true; flash.shadow.mapSize.set(MOBILE?512:1024, MOBILE?512:1024); flash.shadow.camera.near = .4; flash.shadow.camera.far = 70; flash.shadow.bias = -.0015; flash.shadow.normalBias = .09;
const flashTarget = new THREE.Object3D(); flashTarget.position.set(0,-.05,-10); camera.add(flashTarget); flash.target = flashTarget;

/* =====================================================================
   TERRENO
   ===================================================================== */
function hash2(x,y){ let h = Math.imul(x|0,374761393) ^ Math.imul(y|0,668265263); h = Math.imul(h^(h>>>13),1274126177); h ^= h>>>16; return (h>>>0)/4294967295; }
function vnoise(x,y){ const xi=Math.floor(x), yi=Math.floor(y), xf=x-xi, yf=y-yi; const u=xf*xf*(3-2*xf), v=yf*yf*(3-2*yf);
  const a=hash2(xi,yi), b=hash2(xi+1,yi), c=hash2(xi,yi+1), d=hash2(xi+1,yi+1); return (a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v)*2-1; }
function fbm(x,y){ let s=0,a=.5,f=1; for(let i=0;i<4;i++){ s+=a*vnoise(x*f,y*f); f*=2.03; a*=.5; } return s; }
const R = 95;
function bowl(r){ if (r>=R) return 0; let h = -100*(1-Math.pow(r/R,.75)); const t = smooth(9,18,r); return -136 + (h+136)*t; }
const VX=-32, VZ=38, VY = bowl(Math.hypot(VX,VZ));
// il Guardiano: a destra del percorso della zattera, seduto su un ripiano scavato nel pendio
const COL_X = 22, COL_Z = 10, COL_Y0 = -67.5, COL_S = 1.63;
function H(x,z){
  const r = Math.hypot(x,z); let h;
  if (r < R){
    h = bowl(r);
    const amp = 3.2*smooth(9,24,r)*(1-smooth(84,95,r));
    h += fbm(x*.045,z*.045)*amp + fbm(x*.2,z*.2)*.6*smooth(9,20,r)*(1-smooth(88,95,r));
    const dv = Math.hypot(x-VX, z-VZ); if (dv < 27){ const k = 1-smooth(18,27,dv); h += (VY+fbm(x*.3,z*.3)*.3 - h)*k; }
    { const dc = Math.hypot(x-COL_X, z-COL_Z); if (dc < 25){ const k = 1-smooth(15,25,dc); h += (COL_Y0 + .6 + fbm(x*.22,z*.22)*.7 - h)*k*k*(3-2*k); } }
    if (r < 9) h = -136 + fbm(x*.3,z*.3)*.8;
  } else {
    h = Math.min((r-R)*.35, 3.5) + fbm(x*.03,z*.03)*2.2*smooth(R,R+10,r) + fbm(x*.15,z*.15)*.3*smooth(R,R+3,r);
  }
  if (Math.abs(x)<4.5 && z>93 && z<108){ const k = 1-smooth(2.5,4.5,Math.abs(x)); h += (Math.min(h,.6)-h)*k; }
  return h;
}
const shoreTable = [];
for (let i=0;i<=1400;i++){ const r = i/1400*R; shoreTable.push([r, bowl(r)]); }
function shoreR(d){ const y = -d; for (let i=0;i<shoreTable.length;i++) if (shoreTable[i][1] >= y) return shoreTable[i][0]; return R; }

const terrainMat = new THREE.MeshStandardMaterial({ vertexColors:true, roughness:.93, metalness:0 });
const terrainU = { uWater:{value:0}, uTime:{value:0}, uEyes:{value:0}, uNoise:{value:NOISE_TEX} };
terrainMat.onBeforeCompile = sh => {
  sh.uniforms.uWater = terrainU.uWater; sh.uniforms.uTime = terrainU.uTime; sh.uniforms.uEyes = terrainU.uEyes; sh.uniforms.uNoise = terrainU.uNoise;
  sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP; varying vec3 vWN;')
    .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWP = (modelMatrix*vec4(transformed,1.)).xyz; vWN = normalize(mat3(modelMatrix)*objectNormal);');
  sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vWP; varying vec3 vWN; uniform float uWater, uTime, uEyes; uniform sampler2D uNoise; float tdn, tfine;
float th(vec3 p){ p=fract(p*.3183099+.1); p*=17.; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float tn(vec3 x){ vec3 i=floor(x),f=fract(x); f=f*f*(3.-2.*f);
  return mix(mix(mix(th(i),th(i+vec3(1,0,0)),f.x),mix(th(i+vec3(0,1,0)),th(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(th(i+vec3(0,0,1)),th(i+vec3(1,0,1)),f.x),mix(th(i+vec3(0,1,1)),th(i+vec3(1,1,1)),f.x),f.y),f.z); }
float h2t(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
vec3 pNArb(vec3 sp, vec3 sn, vec2 dH, float fd){ vec3 sx=dFdx(sp), sy=dFdy(sp); vec3 r1=cross(sy,sn), r2=cross(sn,sx); float det=dot(sx,r1)*fd; vec3 gr=sign(det)*(dH.x*r1+dH.y*r2); return normalize(abs(det)*sn-gr); }`)
    .replace('#include <color_fragment>', `#include <color_fragment>
{ vec3 q=vWP*vec3(.8,1.5,.8);
  float wv = smoothstep(.35,.85,1.-abs(vWN.y));
  vec4 nA = texture2D(uNoise, vWP.xz*.012), nB = texture2D(uNoise, vWP.xz*.085 + .37), nV = texture2D(uNoise, vec2(vWP.x+vWP.z, vWP.y*1.6)*.06);
  tdn = mix(nA.g*.32 + nA.b*.22 + nB.r*.26 + nB.g*.2, nV.r*.35 + nV.g*.35 + nV.b*.3, wv);
  float fine = mix(nB.b, nV.a, wv); tfine = mix(nB.a, nV.b, wv);
  diffuseColor.rgb *= .55 + .9*tdn*(.75+.5*fine);
  float strata = smoothstep(.55,.9,sin(vWP.y*3.1+tdn*4.)*.5+.5)*step(vWP.y,-.6);
  diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb*vec3(1.25,1.15,.9), strata*.5);
  float wet = (1.-smoothstep(0.,6.,vWP.y-uWater))*step(vWP.y,.3);
  diffuseColor.rgb *= mix(1.,.45,wet);
  float slime = smoothstep(.55,.75,texture2D(uNoise, vWP.xz*.02 + vec2(uTime*.002,0.)).g)*step(vWP.y,-60.);
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.03,.06,.025), slime*.7); }`)
    .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
{ float wet = (1.-smoothstep(0.,6.,vWP.y-uWater))*step(vWP.y,.3); roughnessFactor = max(.38, mix(roughnessFactor,.3,wet) - .2*smoothstep(.6,.8,tdn)); }`)
    .replace('#include <normal_fragment_begin>', `#include <normal_fragment_begin>
{ float bh = tdn*.7 + tfine*.08; vec2 dH = vec2(dFdx(bh), dFdy(bh)); normal = pNArb(-vViewPosition, normal, dH, faceDirection); }`)
    .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
if (uEyes > 0. && vWP.y < -42.) {
  float ang = atan(vWP.z, vWP.x);
  vec2 cu = vec2(ang*18., vWP.y*.8);
  vec2 ci = floor(cu); vec2 cf = fract(cu)-.5;
  float hr = h2t(ci);
  float wall = smoothstep(.2,.55,1.-abs(vWN.y));
  float lim = .02 + .055*uEyes;
  if (hr < lim) {
    float bl = clamp(sin(uTime*(.2+hr*2.)+hr*91.)*4.+3.4, 0., 1.);
    vec2 o = (vec2(h2t(ci+3.1), h2t(ci+7.7))-.5)*.25;
    vec2 q = (cf-o)*vec2(2.7, 2.7);
    float lidm = abs(q.y) - (1.-q.x*q.x)*.48*bl;
    float e = smoothstep(.05,-.05,lidm)*step(abs(q.x),1.);
    float ir = length(q*vec2(1.,1.15));
    vec3 iris = mix(vec3(1.,.55,.08), vec3(.6,.12,.02), smoothstep(.1,.5,ir));
    float pup = smoothstep(.13,.07,abs(q.x + sin(uTime*.3+hr*20.)*.12))*step(ir,.55);
    vec3 ec = mix(vec3(.55,.5,.38), iris, smoothstep(.62,.5,ir));
    ec = mix(ec, vec3(0.), pup);
    float depthK = smoothstep(-42.,-70.,vWP.y);
    totalEmissiveRadiance += ec*e*wall*depthK*uEyes*2.2;
  }
}`);
};
{
  const SEG = 190, SIZE = 330;
  const g = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG); g.rotateX(-Math.PI/2);
  const p = g.attributes.position;
  for (let i=0;i<p.count;i++){ p.setY(i, H(p.getX(i), p.getZ(i))); }
  g.computeVertexNormals();
  const n = g.attributes.normal, cols = new Float32Array(p.count*3);
  for (let i=0;i<p.count;i++){
    const x=p.getX(i), y=p.getY(i), z=p.getZ(i), slope = 1-n.getY(i), nz = fbm(x*.08,z*.08);
    let c;
    if (y > .6){ c = [.028+nz*.008, .034+nz*.01, .022]; }
    else if (y > -.6){ c = [.06,.05,.035]; }
    else if (y > -72){
      const band = smooth(.82,1,Math.sin(y*1.15+nz)*.5+.5)*.6;
      const k = clamp(-y/72,0,1);
      c = [lerp(.075,.035,k)+band*.03, lerp(.06,.033,k)+band*.028, lerp(.04,.028,k)+band*.02];
      c[0]+=nz*.01; c[1]+=nz*.012;
    } else {
      const slime = smooth(.1,.6,fbm(x*.15,z*.15));
      c = [.022+slime*.004, .026+slime*.02, .022+slime*.008];
      if (y < -112){ const v = smooth(.35,.7,fbm(x*.5+y*.1, z*.5)); c[0]+=v*.09; c[1]+=v*.01; c[2]+=v*.012; }
    }
    if (slope > .45 && y < -.6){ c = c.map(v=>v*.75); }
    cols[i*3]=c[0]; cols[i*3+1]=c[1]; cols[i*3+2]=c[2];
  }
  g.setAttribute('color', new THREE.BufferAttribute(cols,3));
  const tm = new THREE.Mesh(g, terrainMat); tm.receiveShadow = true; tm.userData.noCast = true; scene.add(tm);
}

/* =====================================================================
   CIELO
   ===================================================================== */
const skyU = { uTop:{value:new THREE.Color()}, uHor:{value:new THREE.Color()}, uMoon:{value:new THREE.Vector3(-.4,.55,-.7).normalize()}, uNight:{value:1}, uTime:{value:0}, uRed:{value:0},
  uWrong:{value:0}, uSkyEye:{value:0}, uLight:{value:0}, uOut:{value:0}, uMoonEye:{value:0} };
const sky = new THREE.Mesh(new THREE.SphereGeometry(600, 32, 16), new THREE.ShaderMaterial({
  uniforms: skyU, side:THREE.BackSide, depthWrite:false, fog:false,
  vertexShader:`varying vec3 vD; void main(){ vD=position; vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.); gl_Position=p.xyww; gl_Position.z=p.w*.99995; }`,
  fragmentShader:`uniform vec3 uTop,uHor,uMoon; uniform float uNight,uTime,uRed,uWrong,uSkyEye,uLight,uOut,uMoonEye; varying vec3 vD;
  float h(vec3 p){ return fract(sin(dot(p,vec3(12.9898,78.233,45.164)))*43758.5453); }
  float n2(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); float a=h(vec3(i,0)),b=h(vec3(i+vec2(1,0),0)),c=h(vec3(i+vec2(0,1),0)),d=h(vec3(i+1.,0)); return mix(mix(a,b,f.x),mix(c,d,f.x),f.y); }
  void main(){ vec3 d=normalize(vD); float t=clamp(d.y,0.,1.);
    vec3 c=mix(uHor,uTop,pow(t,.55));
    vec2 cp=d.xz/(d.y+.18)*1.5;
    float cl=n2(cp+uTime*.008)*.5+n2(cp*2.1-uTime*.014)*.3+n2(cp*4.6+uTime*.02)*.2;
    float m=dot(d,normalize(uMoon)); float mAng=acos(clamp(m,-1.,1.)), mR=mix(.032,.17,uMoonEye);
    float cm=smoothstep(.38,.78,cl)*smoothstep(0.,.22,d.y)*(1.-uMoonEye*smoothstep(mR*3.,mR*1.1,mAng));
    vec3 cloudCol=uHor*1.7+vec3(.003,.0035,.003);
    cloudCol+=pow(max(m,0.),7.)*vec3(.06,.065,.07)*uNight*(1.2-cl);
    cloudCol+=uLight*vec3(.7,.75,.95)*(.4+cl);
    c=mix(c,cloudCol,cm*.85);
    vec3 sd=d; float ra=uWrong*uTime*.04; sd.xz=mat2(cos(ra),-sin(ra),sin(ra),cos(ra))*sd.xz;
    float s=step(.9982-uWrong*.001,h(floor(sd*260.)))*uNight*smoothstep(.05,.4,d.y)*(1.-cm)*step(uOut*1.02,h(floor(sd*260.)+7.));
    c+=s*mix(vec3(.5,.55,.6),vec3(.55,.95,.35),uWrong)*(.6+.4*sin(uTime*3.+h(floor(sd*260.))*50.));
    float md=smoothstep(mR,mR*.92,mAng); float cr=n2(d.xy*1800./(1.+uMoonEye*5.))*.35+n2(d.zy*700./(1.+uMoonEye*5.))*.2;
    vec3 mc=vec3(.62,.61,.52)*(1.-cr);
    if(uMoonEye>0.){ vec3 Mn=normalize(uMoon); vec3 rt=normalize(cross(Mn,vec3(0.,1.,0.))); vec3 up=cross(rt,Mn); vec2 q=vec2(dot(d,rt),dot(d,up))/sin(mR);
      float open=smoothstep(.25,.9,uMoonEye); float lid=abs(q.y)-(1.-q.x*q.x)*.62*open; float ein=smoothstep(.02,-.02,lid)*step(abs(q.x),1.);
      float ir=length(q); vec3 irc=mix(vec3(.95,.62,.12),vec3(.25,.4,.05),smoothstep(0.,.5,ir))*(.6+.4*n2(vec2(atan(q.y,q.x)*10.,ir*14.)));
      float pup=smoothstep(.08,.04,abs(q.x))*step(ir,.5); vec3 ec=mix(vec3(.85,.8,.66),irc,smoothstep(.55,.48,ir)); ec=mix(ec,vec3(0.),pup);
      mc=mix(mc, mc*vec3(.75,.68,.6), smoothstep(.0,.05,lid)*open*step(abs(q.x),1.)*.8); mc=mix(mc, ec*1.3, ein); mc+=vec3(.15,.05,.01)*smoothstep(.06,0.,abs(lid))*open; }
    c+=md*mc*mix(.3,1.,uNight)*(1.-cm*.75)*(1.-smoothstep(.6,1.,uOut));
    c+=pow(max(m,0.),70.)*.07*vec3(.55,.6,.62)+pow(max(m,0.),8.)*.012*vec3(.45,.5,.5)*uNight;
    if(uSkyEye>0.){ vec3 E=normalize(vec3(0.,.42,-1.)); float me=dot(d,E);
      if(me>0.){ vec3 rt=normalize(cross(E,vec3(0.,1.,0.))); vec3 up=cross(rt,E); vec2 p=vec2(dot(d,rt),dot(d,up))/.34;
        float lid=abs(p.y)-(1.-p.x*p.x)*.5*uSkyEye; float em=smoothstep(.03,-.03,lid)*step(abs(p.x),1.);
        float ir=length(p); vec3 irc=mix(vec3(.85,.5,.08),vec3(.2,.35,.04),smoothstep(0.,.42,ir))*(.55+.45*n2(vec2(atan(p.y,p.x)*9.,ir*12.)));
        float pup=smoothstep(.07,.035,abs(p.x))*step(ir,.44);
        vec3 ec=mix(vec3(.03,.02,.015),irc,smoothstep(.46,.4,ir)); ec=mix(ec,vec3(0.),pup);
        c=mix(c,ec*1.3,em*.92);
        c+=vec3(.12,.04,.015)*smoothstep(.15,0.,abs(lid))*uSkyEye*step(abs(p.x),1.1)*(1.-em); } }
    c=mix(c,c*vec3(2.5,.5,.4)+vec3(.02,0,0),uRed);
    c+=uLight*vec3(.12,.13,.16)*smoothstep(-.1,.5,d.y);
    gl_FragColor=vec4(c,1.); }`
}));
sky.userData.noCast = true;
scene.add(sky);

/* =====================================================================
   ACQUA
   ===================================================================== */
const waterU = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
  uTime:{value:0}, uSky:{value:new THREE.Color(0x0a0c0d)}, uMoonDir:{value:new THREE.Vector3(-.4,.55,-.7).normalize()}, uMoonCol:{value:new THREE.Color(.6,.62,.6)},
  uFlashPos:{value:new THREE.Vector3()}, uFlashDir:{value:new THREE.Vector3()}, uFlashI:{value:150}, uLampPos:{value:lamp.position.clone()}, uLampI:{value:4},
  uRip:{value:[new THREE.Vector4(0,0,-99,0),new THREE.Vector4(0,0,-99,0),new THREE.Vector4(0,0,-99,0),new THREE.Vector4(0,0,-99,0),new THREE.Vector4(0,0,-99,0),new THREE.Vector4(0,0,-99,0)]},
  uGlow:{value:0}, uCalm:{value:1}, uClear:{value:0}, uDeep:{value:0}, uDeepD:{value:10}, uNoise:{value:NOISE_TEX}, uShadow:{value:new THREE.Vector4(0,0,1,0)}, uShadowA:{value:0}, uBlood:{value:0}, uBig:{value:[new THREE.Vector4(0,0,-99,0),new THREE.Vector4(0,0,-99,0),new THREE.Vector4(0,0,-99,0)]}
}]);
const waterMat = new THREE.ShaderMaterial({
  uniforms: waterU, fog:true, transparent:true, depthWrite:true, side:THREE.DoubleSide,
  vertexShader:`#include <fog_pars_vertex>
  uniform float uTime; uniform vec4 uBig[3];
  // le onde grandi spostano davvero l'acqua (la stessa formula che fa ballare la zattera)
  float bigH(vec2 p){ float h=0.; for(int i=0;i<3;i++){ vec4 b=uBig[i]; float t=uTime-b.z; if(t<0.||t>14.) continue; float d=max(length(p-b.xy),.001); float u=t*7.5-d; if(u<0.||u>26.) continue; h+=b.w*sin(u*.55)*exp(-u*.11)*exp(-t*.06)/(1.+d*.011); } return h; }
  varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.); w.y+=bigH(w.xz); vW=w.xyz; vec4 mvPosition=viewMatrix*w; gl_Position=projectionMatrix*mvPosition;
  #include <fog_vertex>
  }`,
  fragmentShader:`#include <fog_pars_fragment>
  uniform float uTime,uFlashI,uLampI,uGlow,uCalm,uShadowA,uBlood,uClear,uDeep,uDeepD; uniform sampler2D uNoise; uniform vec3 uSky,uMoonDir,uMoonCol,uFlashPos,uFlashDir,uLampPos; uniform vec4 uRip[6]; uniform vec4 uBig[3]; uniform vec4 uShadow; varying vec3 vW;
  // gradiente analitico delle onde: una sola valutazione per pixel
  vec2 wgrad(vec2 p){
    vec2 g=vec2(0.);
    g+=vec2(.21,0.)*cos(p.x*.21+uTime*.6)*.05 + vec2(0.,.17)*cos(p.y*.17-uTime*.45)*.05;
    vec2 k1=vec2(.6,.8)*.9, k2=vec2(-.7,.5)*1.7, k3=vec2(.3,-.9)*3.1;
    g+=k1*cos(dot(p,k1)+uTime*1.3)*.02 + k2*cos(dot(p,k2)+uTime*1.9)*.012 + k3*cos(dot(p,k3)+uTime*2.6)*.005;
    g*=uCalm;
    for(int i=0;i<6;i++){ vec4 r=uRip[i]; float t=uTime-r.z; if(t<0.||t>8.) continue; vec2 dv=p-r.xy; float d=max(length(dv),.001); float front=t*3.2;
      g+=dv/d*(2.4*cos(d*2.4-t*7.)*.12*r.w*exp(-abs(d-front)*.6)*exp(-t*.55)/(1.+d*.15)); }
    // onde grandi: un fronte che parte da ciò che è emerso e attraversa il lago
    for(int i=0;i<3;i++){ vec4 b=uBig[i]; float t=uTime-b.z; if(t<0.||t>14.) continue; vec2 dv=p-b.xy; float d=max(length(dv),.001); float u=t*7.5-d;
      if(u<0.||u>26.) continue; float k=.55; g+=dv/d*(-k*cos(u*k)*b.w*exp(-u*.11)*exp(-t*.06)/(1.+d*.011)); }
    return g; }
  void main(){
    if (cameraPosition.y < vW.y) {
      vec3 Vu=normalize(cameraPosition-vW); float up=clamp(-Vu.y,0.,1.);
      float caus=sin(vW.x*.7+uTime*.8+sin(vW.z*.5+uTime*.6)*2.)*sin(vW.z*.8-uTime*.7)*.5+.5;
      vec3 cu=mix(vec3(.003,.01,.008), uSky*2.5+vec3(.01,.03,.024)*(.6+.6*caus), pow(up,2.5));
      gl_FragColor=vec4(cu,1.);
      #include <fog_fragment>
    } else {
    vec2 p=vW.xz; vec2 gw=wgrad(p);
    vec3 N=normalize(vec3(-gw.x,1.,-gw.y));
    vec3 V=normalize(cameraPosition-vW);
    float fr=.03+.97*pow(1.-max(dot(N,V),0.),5.);
    vec3 R=reflect(-V,N);
    vec3 refl=uSky*(.6+.8*clamp(R.y,0.,1.));
    refl+=pow(max(dot(R,uMoonDir),0.),180.)*uMoonCol*1.2;
    vec3 deep=vec3(.004,.007,.006);
    vec3 col=mix(deep,refl,fr);
    vec3 Lf=uFlashPos-vW; float df=length(Lf); Lf/=df;
    float spot=smoothstep(.86,.95,dot(-Lf,normalize(uFlashDir)));
    float att=uFlashI/pow(df,1.5);
    col+=pow(max(dot(N,normalize(Lf+V)),0.),90.)*spot*att*.9*vec3(.9,.95,1.);
    col+=vec3(.012,.018,.014)*spot*att*.25;
    // guardando giù con la torcia: l'acqua si apre per qualche metro, e sotto non c'è il fondo. Ci sono masse nere, lente, che passano
    if (uDeep>0. && spot>.01){ float look=smoothstep(.15,.6,V.y); vec2 par=vW.xz-V.xz/max(V.y,.2)*uDeepD;
      float n1=texture2D(uNoise,par*.011+vec2(uTime*.006,-uTime*.004)).g, n2=texture2D(uNoise,par*.04+vec2(-uTime*.012,uTime*.004)).b, n3=texture2D(uNoise,par*.008-uTime*.002).r;
      float mass=smoothstep(.5,.72,n1*.6+n3*.5+n2*.08-.07); vec3 murk=vec3(.05,.12,.095)*(.6+.8*n2);
      float k=spot*look*uDeep*min(1.,att*.06); col=mix(col, murk*(1.-mass*.97), k*.95);
      vec2 ec=floor(par*.07); float eh=fract(sin(dot(ec,vec2(41.3,289.1)))*43758.5); vec2 ef=fract(par*.07)-.5;
      if (eh>.985){ float blink=step(.2,fract(uTime*.13+eh*7.)); col+=vec3(.9,.7,.2)*smoothstep(.06,.02,length(vec2(abs(ef.x)-.09,ef.y*2.)))*k*mass*blink*2.; } }
    vec3 Ll=uLampPos-vW; float dl=length(Ll); Ll/=dl;
    col+=pow(max(dot(N,normalize(Ll+V)),0.),60.)*uLampI/(dl*dl)*vec3(1.,.65,.35)*.6;
    col+=pow(max(dot(R,uMoonDir),0.),30.)*uMoonCol*.04;
    // qualcosa di enorme passa sotto la superficie
    if (uShadow.w > 0.) {
      // la massa sta a qualche metro sotto: si sposta con la parallasse, non è dipinta sulla superficie
      float c0=cos(uShadowA), s0=sin(uShadowA); mat2 rot=mat2(c0,-s0,s0,c0);
      vec2 sd=rot*(vW.xz-uShadow.xy) + rot*(-V.xz/max(V.y,.22))*uShadow.z*.22; sd/=uShadow.z;
      float tx=clamp((sd.x+1.75)/2.65,0.,1.);
      float wid=mix(.04,.36,smoothstep(0.,.6,tx))*(1.-smoothstep(.84,1.,tx)*.75);
      float nz=texture2D(uNoise,vW.xz*.022+vec2(uTime*.008,-uTime*.006)).r-.5, nz2=texture2D(uNoise,vW.xz*.06-uTime*.01).g-.5;
      float body=smoothstep(.16,-.1,abs(sd.y)-wid-nz*.16-nz2*.05)*smoothstep(-1.8,-1.35,sd.x)*smoothstep(1.02,.78,sd.x);
      float finW=.22+.06*sin(uTime*.6+sd.x*1.7);
      float fin=smoothstep(.12,-.04,abs(abs(sd.y)-wid-finW*.5)-finW*.5*(1.-smoothstep(0.,.6,abs(sd.x-.1))))*step(abs(sd.x-.1),.6);
      float sh=clamp(max(body,fin*.55),0.,1.)*uShadow.w;
      col*=1.-.8*sh; col=mix(col,col*vec3(.55,.75,.7),sh*.35);
    }
    col=mix(col, col*vec3(2.6,.25,.2)+vec3(.018,0.,0.), uBlood);
    gl_FragColor=vec4(col, mix(.38, 1., clamp(fr*1.6 + uBlood*.5, 0., 1.))*(1.-uClear*.8));
    #include <fog_fragment>
    float gd=length(vW.xz); float pulse=.75+.25*sin(uTime*1.3);
    gl_FragColor.rgb+=vec3(.25,.35,.08)*uGlow*exp(-gd*gd/260.)*pulse;
    }
  }`
});
const water = new THREE.Mesh(new THREE.PlaneGeometry(420,420,MOBILE?150:220,MOBILE?150:220).rotateX(-Math.PI/2), waterMat);
water.userData.noCast = true; water.renderOrder = 1; scene.add(water);
/* ---------- nebbia bassa sull'acqua ---------- */
const mistU = { uNoise:{value:NOISE_TEX}, uTime:{value:0}, uCol:{value:new THREE.Color()}, uDen:{value:1}, uLampPos:waterU.uLampPos, uLampI:waterU.uLampI, uFlashPos:waterU.uFlashPos, uFlashDir:waterU.uFlashDir, uFlashI:waterU.uFlashI };
const mistMat = new THREE.ShaderMaterial({ uniforms: mistU, transparent:true, depthWrite:false, fog:false,
  vertexShader:`varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
  fragmentShader:`uniform float uTime,uDen,uLampI,uFlashI; uniform vec3 uCol,uLampPos,uFlashPos,uFlashDir; uniform sampler2D uNoise; varying vec3 vW;
  void main(){ vec2 p=vW.xz*.0055+vec2(uTime*.0015,uTime*.0009)+vW.y*.21;
    vec4 a4=texture2D(uNoise,p), b4=texture2D(uNoise,p*2.3-uTime*.0025);
    float d=a4.r*.42+a4.g*.25+b4.g*.2+b4.b*.13;
    float a=smoothstep(.4,.82,d)*.4*uDen;
    float dc=length(cameraPosition-vW); a*=smoothstep(1.5,9.,dc)*(1.-smoothstep(70.,150.,dc));
    vec3 Ll=uLampPos-vW; float dl=length(Ll);
    vec3 c=uCol*2.2+vec3(1.,.62,.3)*uLampI*.35/(1.+dl*dl*.08);
    vec3 Lf=vW-uFlashPos; float df=length(Lf); float sp=smoothstep(.88,.97,dot(Lf/df,normalize(uFlashDir)));
    c+=vec3(.75,.8,.85)*sp*uFlashI*.0018/(1.+df*.15);
    gl_FragColor=vec4(c,a); }` });
const mists = [0.3, 1.2].map((o,i)=>{ const m = new THREE.Mesh(new THREE.PlaneGeometry(360,360,1,1).rotateX(-Math.PI/2), mistMat); m.userData.off = o; m.userData.noCast = true; m.renderOrder = 2; scene.add(m); return m; });
/* ---------- pulviscolo / spore che fluttuano ---------- */
const MOTES = 420;
const moteGeo = new THREE.BufferGeometry(); { const a = new Float32Array(MOTES*3), r = new Float32Array(MOTES); for (let i=0;i<MOTES;i++){ a[i*3]=rand(-18,18); a[i*3+1]=rand(-6,8); a[i*3+2]=rand(-18,18); r[i]=Math.random(); } moteGeo.setAttribute('position', new THREE.BufferAttribute(a,3)); moteGeo.setAttribute('rnd', new THREE.BufferAttribute(r,1)); }
const moteU = { uTime:{value:0}, uCam:{value:new THREE.Vector3()}, uDir:{value:new THREE.Vector3()}, uFlashI:waterU.uFlashI, uTint:{value:new THREE.Color(.7,.75,.65)}, uPx:{value:innerHeight*DPR} };
const motes = new THREE.Points(moteGeo, new THREE.ShaderMaterial({ uniforms: moteU, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, fog:false,
  vertexShader:`attribute float rnd; uniform float uTime,uFlashI,uPx; uniform vec3 uCam,uDir; varying float vA;
  void main(){ vec3 p=position+vec3(sin(uTime*.3+rnd*40.)*1.2, -uTime*(.15+rnd*.25), cos(uTime*.23+rnd*30.)*1.2);
    vec3 box=vec3(36.,14.,36.); vec3 w=uCam+mod(p-uCam+box*.5, box)-box*.5;
    vec3 tc=w-uCam; float d=length(tc); float lit=smoothstep(.86,.97,dot(tc/d,uDir))*min(uFlashI/150.,3.);
    vA=(.06+lit*.9)*smoothstep(.4,1.5,d)*(1.-smoothstep(10.,18.,d))*(.6+.4*sin(uTime*2.+rnd*60.));
    vec4 mv=viewMatrix*vec4(w,1.); gl_Position=projectionMatrix*mv; gl_PointSize=(1.5+rnd*2.5)*uPx*.0016*(6./max(.5,-mv.z)); }`,
  fragmentShader:`uniform vec3 uTint; varying float vA; void main(){ vec2 c=gl_PointCoord-.5; float m=smoothstep(.5,.0,length(c)); gl_FragColor=vec4(uTint*m*vA,1.); }` }));
motes.frustumCulled = false; motes.userData.noCast = true; scene.add(motes);
let ripI = 0;
function ripple(x,z,str=1){ const r = waterU.uRip.value[ripI++ % 6]; r.set(x,z,waterU.uTime.value,str); }

/* =====================================================================
   MATERIALI E OGGETTI
   ===================================================================== */
const M = {
  wood: new THREE.MeshStandardMaterial({color:0x3a2c20, roughness:.92}),
  woodDark: new THREE.MeshStandardMaterial({color:0x17120e, roughness:.8}),
  stone: new THREE.MeshStandardMaterial({color:0x3e3f3a, roughness:.95}),
  stoneDark: new THREE.MeshStandardMaterial({color:0x1d1f1c, roughness:.9}),
  rust: new THREE.MeshStandardMaterial({color:0x4a2416, roughness:.8, metalness:.3}),
  metal: new THREE.MeshStandardMaterial({color:0x55534d, roughness:.5, metalness:.6}),
  black: new THREE.MeshBasicMaterial({color:0x000000}),
  pale: new THREE.MeshStandardMaterial({color:0x7d847a, roughness:.55}),
  overall: new THREE.MeshStandardMaterial({color:0x24313a, roughness:.85}),
  bone: new THREE.MeshStandardMaterial({color:0x8a8272, roughness:.7}),
  leather: new THREE.MeshStandardMaterial({color:0x1c140e, roughness:.6}),
  flesh: new THREE.MeshStandardMaterial({color:0x5a2522, roughness:.35, metalness:.05, emissive:0x200404}),
  lid: new THREE.MeshStandardMaterial({color:0x150c0b, roughness:.32}),
  paper: new THREE.MeshStandardMaterial({color:0xb8b09a, roughness:.9}),
  bronze: new THREE.MeshStandardMaterial({color:0x3a4a3a, roughness:.5, metalness:.7}),
  win: new THREE.MeshStandardMaterial({color:0x000000, emissive:0xffb35a, emissiveIntensity:0}),
  lampGlass: new THREE.MeshStandardMaterial({color:0x000000, emissive:0xffaa55, emissiveIntensity:3}),
  cabinWin: new THREE.MeshStandardMaterial({color:0x000000, emissive:0xff9a40, emissiveIntensity:1.6}),
  tentacle: new THREE.MeshStandardMaterial({color:0x18201b, roughness:.3, metalness:.15, emissive:0x020604})
};
function at(obj, x, z, yOff=0){ obj.position.set(x, H(x,z)+yOff, z); return obj; }
function mesh(geo, mat, x=0,y=0,z=0){ const m = new THREE.Mesh(geo, mat); m.position.set(x,y,z); return m; }
// unisce i pezzi fermi di un gruppo in una mesh per materiale: molte meno chiamate di disegno
function bakeStatic(group, skip){
  group.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(group.matrixWorld).invert(), byMat = new Map(), remove = [], m4 = new THREE.Matrix4();
  group.traverse(o=>{
    if (!o.isMesh || o.isInstancedMesh) return;
    for (let p = o; p && p !== group; p = p.parent) if (skip && skip(p)) return;
    let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    g.applyMatrix4(m4.multiplyMatrices(inv, o.matrixWorld));
    if (m4.determinant() < 0){ const pa = g.attributes.position.array, na = g.attributes.normal ? g.attributes.normal.array : null, ua = g.attributes.uv ? g.attributes.uv.array : null;
      for (let i=0;i<pa.length;i+=9) for (let k=0;k<3;k++){ const t = pa[i+3+k]; pa[i+3+k] = pa[i+6+k]; pa[i+6+k] = t; if (na){ const u = na[i+3+k]; na[i+3+k] = na[i+6+k]; na[i+6+k] = u; } }
      if (ua) for (let i=0;i<ua.length;i+=6) for (let k=0;k<2;k++){ const t = ua[i+2+k]; ua[i+2+k] = ua[i+4+k]; ua[i+4+k] = t; } }
    for (const k of Object.keys(g.attributes)) if (!['position','normal','uv'].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count*2), 2));
    if (!g.attributes.normal) g.computeVertexNormals();
    const key = o.material.uuid; if (!byMat.has(key)) byMat.set(key, { m:o.material, gs:[] }); byMat.get(key).gs.push(g); remove.push(o);
  });
  remove.forEach(o=>o.parent.remove(o));
  byMat.forEach(({m, gs})=> group.add(new THREE.Mesh(mergeGeometries(gs), m)));
  return group;
}

/* ---------- pontile ---------- */
const DOCK_END = 82;
{
  const dock = new THREE.Group();
  const plankG = new THREE.BoxGeometry(3.2,.12,.62);
  for (let z = DOCK_END+.3, i=0; z < 101; z += .72, i++){
    if (i===4 || i===11) continue;
    const pl = mesh(plankG, Math.random()<.2?M.woodDark:M.wood, rand(-.04,.04), 1.32+rand(-.02,.02), z);
    pl.rotation.set(rand(-.02,.02), rand(-.03,.03), rand(-.025,.025)); dock.add(pl);
  }
  const beamG = new THREE.BoxGeometry(.24,.3,19.2);
  dock.add(mesh(beamG, M.woodDark, -1.45, 1.12, 91.6)); dock.add(mesh(beamG, M.woodDark, 1.45, 1.12, 91.6));
  for (let z of [82.4, 85.9, 89.4, 92.9, 96.4, 99.9]) for (let x of [-1.45, 1.45]){
    const bottom = H(x,z) - 1.5, top = 1.1, hgt = top-bottom;
    const pile = mesh(new THREE.CylinderGeometry(.15,.19,hgt,7), M.woodDark, x, bottom+hgt/2, z);
    pile.rotation.z = rand(-.03,.03); dock.add(pile);
  }
  for (let z of [85.9, 89.4, 92.9, 96.4, 99.9]){ const post = mesh(new THREE.BoxGeometry(.1,1.1,.1), M.wood, -1.5, 1.9, z); dock.add(post); }
  const rail = mesh(new THREE.BoxGeometry(.07,.07,14.4), M.wood, -1.5, 2.42, 93.1); rail.rotation.x = .02; dock.add(rail);
  // scala che scende nell'acqua
  const ladderBottom = H(.6, DOCK_END-.2) - 1;
  const lh = 1.3 - ladderBottom;
  for (let x of [.2, 1.0]) dock.add(mesh(new THREE.BoxGeometry(.07,lh,.07), M.metal, x, ladderBottom+lh/2, DOCK_END-.15));
  for (let y = 1.1; y > ladderBottom; y -= .4) dock.add(mesh(new THREE.CylinderGeometry(.025,.025,.8,5).rotateZ(Math.PI/2), M.metal, .6, y, DOCK_END-.15));
  // lampione
  dock.add(mesh(new THREE.CylinderGeometry(.05,.07,3,6), M.metal, 1.55, 2.8, 82.7));
  dock.add(mesh(new THREE.BoxGeometry(.28,.36,.28), M.lampGlass, 1.55, 4.15, 82.7));
  dock.add(mesh(new THREE.ConeGeometry(.26,.2,4).rotateY(Math.PI/4), M.metal, 1.55, 4.42, 82.7));
  bakeStatic(dock); scene.add(dock);
}
/* ---------- capanno + cisterna ---------- */
{
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(5,3,4), M.wood, 0,1.5,0));
  const roof = mesh(new THREE.ConeGeometry(4.1,1.8,4), M.woodDark, 0,3.9,0); roof.rotation.y = Math.PI/4; roof.scale.set(1,1,.8); g.add(roof);
  g.add(mesh(new THREE.PlaneGeometry(.9,.7), M.cabinWin, -1.2,1.7,-2.01).rotateY(Math.PI));
  g.add(mesh(new THREE.BoxGeometry(.9,1.9,.05), M.woodDark, .9,.95,-2.02));
  at(g, 9.5, 106.5, -.2); g.rotation.y = .25; scene.add(g);
  const tank = new THREE.Group();
  tank.add(mesh(new THREE.CylinderGeometry(1.3,1.3,4.2,16).rotateZ(Math.PI/2), M.rust, 0,1.6,0));
  for (let x of [-1.4,1.4]) tank.add(mesh(new THREE.BoxGeometry(.2,1.2,1.8), M.woodDark, x,.6,0));
  at(tank, -7, 101.5, 0); tank.rotation.y = .3; scene.add(tank);
}
/* ---------- alberi morti ---------- */
{
  const geos = [];
  const tmp = new THREE.Object3D();
  for (let i=0;i<70;i++){
    const a = rand(0, Math.PI*2); if (Math.abs(Math.atan2(Math.sin(a), Math.cos(a)) - Math.PI/2) < .28) continue;
    const r = rand(100, 165), x = Math.cos(a)*r, z = Math.sin(a)*r, y = H(x,z);
    const hgt = rand(6,13);
    const tr = new THREE.CylinderGeometry(.08,.32,hgt,6); tr.translate(0,hgt/2,0);
    tmp.position.set(x,y-.3,z); tmp.rotation.set(rand(-.12,.12), rand(0,6), rand(-.12,.12)); tmp.updateMatrix(); tr.applyMatrix4(tmp.matrix); geos.push(tr);
    for (let b=0;b<4;b++){
      const bl = rand(1.5,4); const br = new THREE.CylinderGeometry(.02,.09,bl,4); br.translate(0,bl/2,0);
      const m = new THREE.Matrix4().makeRotationZ(rand(.5,1.3)); m.premultiply(new THREE.Matrix4().makeRotationY(rand(0,6.28))); m.premultiply(new THREE.Matrix4().makeTranslation(0, hgt*rand(.45,.9), 0)); m.premultiply(tmp.matrix);
      br.applyMatrix4(m); geos.push(br);
    }
  }
  scene.add(new THREE.Mesh(mergeGeometries(geos), M.woodDark));
}

/* ---------- figure umanoidi ---------- */
// figure: corpi scheletrici, curvi, bagnati. Niente manichini.
function tube(pts, r0, r1, seg=10, rad=6){ const cv = new THREE.CatmullRomCurve3(pts), g = new THREE.TubeGeometry(cv, seg, 1, rad, false), p = g.attributes.position;
  for (let v=0; v<p.count; v++){ const ring = Math.floor(v/(rad+1)), t = ring/seg, c = cv.getPointAt(t), r = r0 + (r1-r0)*t; p.setXYZ(v, c.x+(p.getX(v)-c.x)*r, c.y+(p.getY(v)-c.y)*r, c.z+(p.getZ(v)-c.z)*r); }
  g.computeVertexNormals(); return g; }
function figureGeo(tall=2.2, hunch=1){
  const t = tall, P = [], V = (x,y,z)=>new THREE.Vector3(x*t, y*t, z*t);
  // busto: bacino stretto, costole, spalle cadenti
  const prof = [[.0,.43],[.068,.44],[.074,.48],[.058,.54],[.066,.6],[.078,.67],[.086,.72],[.07,.755],[.03,.77],[0,.775]].map(([r,y])=>new THREE.Vector2(r*t, y*t));
  const torso = new THREE.LatheGeometry(prof, 14); torso.scale(1,1,.62); P.push(torso);
  P.push(tube([V(.0,.76,0), V(.008,.8,.012), V(.012,.83,.03)], .022*t, .018*t, 4, 6));
  const head = new THREE.SphereGeometry(.052*t, 12, 10); head.scale(.82,1.22,.95); head.translate(.012*t, .868*t, .045*t); P.push(head);
  const jaw = new THREE.SphereGeometry(.036*t, 10, 6, 0, Math.PI*2, Math.PI*.5, Math.PI*.5); jaw.scale(.9,1.5,1); jaw.rotateX(.35); jaw.translate(.012*t, .838*t, .058*t); P.push(jaw);
  for (const s of [-1,1]){
    // braccia lunghe fino alle ginocchia, gomiti piegati, dita sottili
    const sh = V(s*.088,.735,0), el = V(s*.104,.53,.03), wr = V(s*.098,.34,.06+(hunch-1)*.08);
    P.push(tube([sh, V(s*.1,.64,.01), el], .02*t, .015*t, 8, 6), tube([el, V(s*.102,.44,.05), wr], .015*t, .011*t, 8, 6));
    for (let f=0; f<4; f++){ const a = (f-1.5)*.012; P.push(tube([wr, V(s*.099+a,.3,.07), V(s*.1+a*1.4,.255,.075+f*.004)], .0045*t, .002*t, 4, 4)); }
    // gambe magre, ginocchia sporgenti
    const hp = V(s*.042,.44,0), kn = V(s*.048,.24,.022), an = V(s*.05,.04,0);
    P.push(tube([hp, V(s*.046,.34,.01), kn], .03*t, .02*t, 8, 6), tube([kn, V(s*.05,.14,.0), an], .02*t, .014*t, 8, 6));
    const foot = new THREE.BoxGeometry(.04*t, .018*t, .1*t); foot.translate(s*.05*t, .012*t, .03*t); P.push(foot);
  }
  // sudario stracciato
  const sp = []; for (let i=0;i<=6;i++){ const u = i/6; sp.push(new THREE.Vector2((.07 + u*.06)*t, (.62 - u*.4)*t)); }
  const shroud = new THREE.LatheGeometry(sp, 18); { const p = shroud.attributes.position; for (let v=0; v<p.count; v++){ const y = p.getY(v); if (y < .3*t){ const a = Math.atan2(p.getZ(v), p.getX(v)); p.setY(v, y + (Math.sin(a*7)*.5+.5)*Math.random()*.09*t); } p.setZ(v, p.getZ(v)*.75); } shroud.computeVertexNormals(); }
  P.push(shroud);
  // capelli fradici che pendono sul viso
  for (let k=0;k<12;k++){ const a = rand(-1.4,1.4), x0 = Math.sin(a)*.045, z0 = Math.cos(a)*.03; P.push(tube([V(.012+x0,.9,.04+z0*.4), V(.012+x0*1.3,.84,.05+z0*1.1), V(.012+x0*1.1,rand(.7,.78),.06+z0)], .006*t, .002*t, 5, 3)); }
  const g = mergeGeometries(P.map(q=>q.index ? q.toNonIndexed() : q));
  // postura: schiena curva in avanti, testa piegata; superficie irregolare
  const p = g.attributes.position;
  for (let v=0; v<p.count; v++){ let x = p.getX(v), y = p.getY(v), z = p.getZ(v); const hy = Math.max(0, y/t - .5);
    z += hy*hy*.55*t*hunch; if (y/t > .8){ x += (y/t-.8)*.25*t; }
    const n = Math.sin(x*41.3+y*17.1)*Math.sin(z*37.7-y*23.3)*.004*t; p.setXYZ(v, x+n, y, z+n); }
  g.deleteAttribute('normal'); g.deleteAttribute('uv'); const gm = mergeVertices(g, 1e-4); gm.computeVertexNormals(); return gm;
}
const eyeAt = (t, h=1) => [ .03*t, .876*t, (.096 + .0752*h)*t + .004 ];
const ghoulU = { uTime:{value:0} };
const ghoulMat = new THREE.MeshStandardMaterial({ color:0x0a0c0b, roughness:.55, metalness:.05, side:THREE.DoubleSide });
ghoulMat.onBeforeCompile = sh => { sh.uniforms.uTime = ghoulU.uTime;
  sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime;').replace('#include <begin_vertex>', `#include <begin_vertex>
    float gph = 0.;
    #ifdef USE_INSTANCING
    gph = instanceMatrix[3].x*.7 + instanceMatrix[3].z*.31;
    #else
    gph = modelMatrix[3].x*.7 + modelMatrix[3].z*.31;
    #endif
    float gh = clamp(position.y/2.3, 0., 1.2);
    transformed.x += sin(uTime*.55 + gph)*.05*gh*gh;
    transformed.z += sin(uTime*.41 + gph*1.3)*.04*gh*gh;
    float tw = step(.93, fract(sin(floor(uTime*2.3 + gph)*12.9898)*43758.5453));
    transformed.x += smoothstep(1.7,1.95,position.y)*tw*.07;`); };
const FIG = figureGeo(2.3);
// sonnambuli sulla riva
const WALKERS = 70;
const walkers = new THREE.InstancedMesh(FIG, ghoulMat, WALKERS);
walkers.count = 0; walkers.frustumCulled = false; scene.add(walkers);
const walkerPos = [];
{
  const tmp = new THREE.Object3D();
  for (let i=0;i<WALKERS;i++){
    let a; do { a = rand(0,Math.PI*2); } while (Math.abs(a - Math.PI/2) < .16);
    const r = rand(96.5, 104), x = Math.cos(a)*r, z = Math.sin(a)*r;
    tmp.position.set(x, H(x,z)-.05, z); tmp.rotation.set(0, Math.atan2(-x,-z), 0); tmp.scale.setScalar(rand(.85,1.08)); tmp.updateMatrix();
    walkers.setMatrixAt(i, tmp.matrix); walkerPos.push(tmp.matrix.clone());
  }
  // ordina dal più lontano al più vicino al pontile: i primi a comparire sono lontani
  walkerPos.sort((A,B)=>{ const pa=new THREE.Vector3().setFromMatrixPosition(A), pb=new THREE.Vector3().setFromMatrixPosition(B); return pa.distanceTo(new THREE.Vector3(0,0,90)) < pb.distanceTo(new THREE.Vector3(0,0,90)) ? 1 : -1; });
  walkerPos.forEach((m,i)=>walkers.setMatrixAt(i,m)); walkers.instanceMatrix.needsUpdate = true;
}
const eyeGlowMat = new THREE.MeshBasicMaterial({ color:new THREE.Color(2.4,2.2,1.3) });
const eyePairGeo = (()=>{ const p=[]; for (const s of [-1,1]){ const e = new THREE.SphereGeometry(.035,6,4); e.scale(1.3,.6,.4); e.translate(s*.06,0,0); p.push(e); } return mergeGeometries(p); })();
const walkerEyes = new THREE.InstancedMesh(eyePairGeo, eyeGlowMat, WALKERS); walkerEyes.count = 0; walkerEyes.frustumCulled = false; walkerEyes.userData.noCast = true; scene.add(walkerEyes);
{ const off = new THREE.Matrix4().makeTranslation(...eyeAt(2.3)); walkerPos.forEach((m,i)=> walkerEyes.setMatrixAt(i, m.clone().multiply(off))); walkerEyes.instanceMatrix.needsUpdate = true; }
// occhi nel buio sulla riva (allucinazioni)
const SE_N = 26;
const shoreEyeMat = new THREE.MeshBasicMaterial({ color:new THREE.Color(3,2.4,.7) });
const shoreEyes = new THREE.InstancedMesh(eyePairGeo, shoreEyeMat, SE_N); shoreEyes.count = 0; shoreEyes.frustumCulled = false; shoreEyes.userData.noCast = true; scene.add(shoreEyes);
const SE = { t:0, list:[] };
const waterFigure = mesh(FIG, ghoulMat); waterFigure.visible = false; scene.add(waterFigure);
const paleFigure = mesh(figureGeo(2.0), M.pale); paleFigure.visible = false; scene.add(paleFigure);

/* ---------- oggetti di lore ---------- */
const loreObjs = [];
function addLore(id, obj, topY){ obj.traverse(o=>{ o.userData.lore = id; }); scene.add(obj); loreObjs.push({id, obj, topY}); return obj; }

function rod(a, b, r, mat){ const d = new THREE.Vector3().subVectors(b,a); const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), 6), mat);
  m.position.copy(a).addScaledVector(d,.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), d.normalize()); return m; }
const V3 = (x,y,z) => new THREE.Vector3(x,y,z);
// scarpe: decine di paia allineate, punte verso il lago
const shoeGeo = (()=>{ const sh = new THREE.Shape(); sh.moveTo(0,0); sh.lineTo(.27,0); sh.quadraticCurveTo(.31,.0,.3,.05); sh.quadraticCurveTo(.28,.08,.2,.085); sh.lineTo(.11,.1); sh.lineTo(.085,.15); sh.lineTo(.01,.15); sh.quadraticCurveTo(-.01,.08,0,0);
  const g = new THREE.ExtrudeGeometry(sh, {depth:.085, bevelEnabled:true, bevelSize:.012, bevelThickness:.012, bevelSegments:1, curveSegments:6}); g.translate(-.15,0,-.042); g.rotateY(-Math.PI/2); return g; })();
const SHOE_MATS = [M.leather, new THREE.MeshStandardMaterial({color:0x4a3324, roughness:.6}), new THREE.MeshStandardMaterial({color:0xb8b2a2, roughness:.7}), new THREE.MeshStandardMaterial({color:0x6a1c18, roughness:.5}), new THREE.MeshStandardMaterial({color:0x1a1a1c, roughness:.35})];
{
  const g = new THREE.Group();
  for (let row=0; row<3; row++) for (let k=0;k<9;k++){
    const kid = Math.random() < .25, sc = kid ? .75 : 1.25, mat = kid ? SHOE_MATS[2] : pick(SHOE_MATS);
    for (let s of [-.1,.1]){ const sh = mesh(shoeGeo, mat, k*.62+s*sc, .02, row*.85); sh.scale.setScalar(sc); sh.rotation.y = rand(-.1,.1); g.add(sh); }
  }
  // l'ultimo paio: il tuo numero, asciutto
  for (let s of [-.1,.1]){ const sh = mesh(shoeGeo, SHOE_MATS[1], 9*.62+s*1.25, .02, 2*.85); sh.scale.setScalar(1.25); g.add(sh); }
  const x=4.2, z=89.8; g.position.set(x, H(x+2,z+.7)+.02, z); g.rotation.y = Math.PI + .06;
  g.children.forEach(c=>{ const wp = c.getWorldPosition(new THREE.Vector3()); c.position.y = H(wp.x, wp.z) - g.position.y + .03; });
  bakeStatic(g); addLore('shoes', g, g.position.y+.3);
}
// bicicletta da donna, con il cestino del pane
{
  const g = new THREE.Group();
  const frameM = new THREE.MeshStandardMaterial({color:0x5c2a1c, roughness:.55, metalness:.4});
  const wheel = ()=>{ const w = new THREE.Group(); w.add(mesh(new THREE.TorusGeometry(.33,.022,6,24), M.stoneDark)); w.add(mesh(new THREE.TorusGeometry(.31,.008,4,24), M.metal));
    for (let k=0;k<8;k++){ const a = k/8*Math.PI; const sp = mesh(new THREE.CylinderGeometry(.004,.004,.62,3), M.metal); sp.rotation.z = a; w.add(sp); } return w; };
  const rw = wheel(); rw.position.set(-.55,.33,0); g.add(rw); const fw = wheel(); fw.position.set(.55,.33,0); g.add(fw);
  const P = { rh:V3(-.55,.33,0), bb:V3(-.08,.3,0), st:V3(-.22,.82,0), ht:V3(.38,.88,0), hb:V3(.43,.7,0), fh:V3(.55,.33,0) };
  [[P.rh,P.bb],[P.bb,P.st],[P.rh,P.st],[P.bb,P.hb],[P.ht,P.hb],[P.hb,P.fh],[P.bb,V3(.3,.62,0)]].forEach(([a,b])=>g.add(rod(a,b,.018,frameM)));
  g.add(rod(V3(-.22,.82,0), V3(-.24,.92,0), .012, M.metal)); g.add(mesh(new THREE.BoxGeometry(.22,.05,.1), M.leather, -.26,.95,0));
  g.add(rod(V3(.38,.88,-.25), V3(.38,.88,.25), .012, M.metal)); g.add(rod(V3(.36,.88,0), V3(.38,.95,0), .012, M.metal));
  const basket = new THREE.Group(); basket.position.set(.58,.82,0);
  basket.add(mesh(new THREE.BoxGeometry(.32,.2,.28), new THREE.MeshStandardMaterial({color:0x6b5434, roughness:.95, wireframe:false}), 0,0,0));
  for (let k=0;k<3;k++) basket.add(mesh(new THREE.CapsuleGeometry(.05,.14,3,6).rotateZ(Math.PI/2), new THREE.MeshStandardMaterial({color:0xc9a26a, roughness:.8}), rand(-.06,.06), .1, -.08+k*.08));
  g.add(basket);
  g.rotation.set(Math.PI/2-.12, 0, .4); g.position.set(0, .14, 0); bakeStatic(g);
  const ob = new THREE.Group(); ob.add(g); seat(ob, -7.5, 86.5, 0, .7, .5, .02);
  addLore('bike', ob, ob.position.y+.5);
}
// corpo sotto il pontile
// adagia un oggetto sul terreno: altezza media dell'impronta e inclinazione secondo la pendenza
function seat(g, x, z, yaw, rx, rz, lift=.05){
  const c = Math.cos(yaw), s_ = Math.sin(yaw), pts = [[0,0],[rx,0],[-rx,0],[0,rz],[0,-rz]].map(([a,b])=>[x + a*c + b*s_, z - a*s_ + b*c]);
  const hs = pts.map(([px,pz])=>H(px,pz)), y = hs.reduce((q,w)=>q+w,0)/hs.length;
  const n = new THREE.Vector3(H(x-rx,z) - H(x+rx,z), 2*rx, H(x,z-rz) - H(x,z+rz)).normalize(); if (n.y < .9){ n.y = 0; n.setLength(Math.sqrt(1-.81)); n.y = .9; }
  g.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), n).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), yaw));
  g.position.set(x, Math.max(y, ...hs.map(h=>h-.08)) + lift, z); return g; }
const corpseMat = new THREE.MeshStandardMaterial({ color:0x26323b, roughness:.82, side:THREE.DoubleSide });
const CORPSE_GEO = (()=>{ const g = figureGeo(1.8, .25).clone(); g.rotateX(Math.PI/2); g.translate(0, .13, -.88); return g; })();
function makeCorpse(x,z,rot){
  const g = new THREE.Group(); g.add(new THREE.Mesh(CORPSE_GEO, corpseMat));
  g.add(mesh(new THREE.BoxGeometry(.22,.035,.3), M.paper, .32,.03,.45));
  if (x || z) seat(g, x, z, rot, .4, .95, .03); else g.rotation.y = rot;
  return g;
}
addLore('corpse', makeCorpse(-3.6, 81.3, .5), H(-3.6,81.3)+.6);
let corpse2 = makeCorpse(-5.4, 82.6, 2.4); corpse2.visible = false; scene.add(corpse2);
// automobile: una berlina degli anni '50, muso nel fango
const carLightMat = new THREE.MeshStandardMaterial({color:0x222018, emissive:0xfff0b0, emissiveIntensity:0, roughness:.2});
{
  const g = new THREE.Group();
  const sh = new THREE.Shape();
  sh.moveTo(-2.3,.35); sh.lineTo(-2.32,.72); sh.quadraticCurveTo(-2.25,.95,-1.85,.98); sh.lineTo(-1.15,1.0); sh.lineTo(-.82,1.42); sh.quadraticCurveTo(-.7,1.55,-.5,1.55);
  sh.lineTo(.42,1.55); sh.quadraticCurveTo(.6,1.55,.7,1.42); sh.lineTo(1.0,1.04); sh.lineTo(1.95,.98); sh.quadraticCurveTo(2.32,.95,2.34,.68); sh.lineTo(2.3,.35);
  sh.lineTo(1.8,.35); sh.absarc(1.42,.35,.38,0,Math.PI,false); sh.lineTo(-1.04,.35); sh.absarc(-1.42,.35,.38,0,Math.PI,false); sh.lineTo(-2.3,.35);
  const bodyGeo = new THREE.ExtrudeGeometry(sh, {depth:1.5, bevelEnabled:true, bevelSize:.09, bevelThickness:.09, bevelSegments:2, curveSegments:10}); bodyGeo.translate(0,0,-.75);
  const paint = new THREE.MeshStandardMaterial({color:0x56654f, roughness:.75, metalness:.15});
  g.add(new THREE.Mesh(bodyGeo, paint));
  const glass = new THREE.MeshStandardMaterial({color:0x050606, roughness:.1, metalness:.5, side:THREE.DoubleSide});
  const win = new THREE.Shape(); win.moveTo(-1.08,1.06); win.lineTo(-.78,1.44); win.lineTo(.4,1.44); win.lineTo(.66,1.08); win.lineTo(-1.08,1.06);
  for (const z of [.85,-.85]){ const w = new THREE.Mesh(new THREE.ShapeGeometry(win), glass); w.position.z = z + (z>0?.001:-.001); if (z<0) w.rotation.y = Math.PI, w.scale.x = -1; g.add(w); }
  const ws = mesh(new THREE.PlaneGeometry(1.45,.5), glass, .86,1.25,0); ws.rotation.y = Math.PI/2; ws.rotation.x = 0; ws.rotateX(-.75); g.add(ws);
  const wg = new THREE.CylinderGeometry(.34,.34,.24,14).rotateX(Math.PI/2);
  for (const x of [-1.42,1.42]) for (const z of [-.72,.72]){ g.add(mesh(wg, M.stoneDark, x,.35,z)); g.add(mesh(new THREE.CylinderGeometry(.16,.16,.26,10).rotateX(Math.PI/2), M.metal, x,.35,z)); }
  for (const x of [-2.42,2.44]) g.add(mesh(new THREE.BoxGeometry(.1,.12,1.7), M.metal, x,.48,0));
  for (const z of [-.5,.5]){ const hl = mesh(new THREE.SphereGeometry(.12,10,8), carLightMat, 2.38,.78,z); hl.scale.set(.5,1,1); g.add(hl); }
  g.add(mesh(new THREE.BoxGeometry(.06,.25,.6), M.metal, 2.4,.66,0));
  // lo scheletro al volante
  g.add(mesh(new THREE.SphereGeometry(.12,10,8), M.bone, .05,1.3,.35)); g.add(mesh(new THREE.BoxGeometry(.18,.3,.22), M.bone, -.05,1.02,.35));
  g.add(mesh(new THREE.TorusGeometry(.17,.015,5,14), M.leather, .4,1.12,.35).rotateY(Math.PI/2).rotateX(.4));
  g.add(mesh(new THREE.CylinderGeometry(.13,.16,.28,10), new THREE.MeshStandardMaterial({color:0x6a665c, roughness:.5, metalness:.6}), -.05,1.0,-.38));
  g.rotation.order = 'YXZ'; g.rotation.set(0, -.5 + Math.PI/2, 0); g.rotateZ(-.2); g.rotateX(.08);
  g.scale.setScalar(1.15); at(g, 16, 74.5, -.35);
  bakeStatic(g); addLore('car', g, g.position.y+1.3);
}
// paese sommerso
let bellMesh;
{
  const v = new THREE.Group();
  const towerH = 14;
  const tower = new THREE.Group();
  tower.add(mesh(new THREE.BoxGeometry(4,towerH,4), M.stone, 0,towerH/2,0));
  tower.add(mesh(new THREE.BoxGeometry(4.3,3,4.3), M.stoneDark, 0,towerH+1.5,0));
  for (let s of [[0,2.16,0],[0,-2.16,Math.PI],[2.16,0,Math.PI/2],[-2.16,0,-Math.PI/2]]){ const o = mesh(new THREE.PlaneGeometry(1.4,2.2), M.black, s[0], towerH+1.4, s[1]); o.rotation.y = s[2]; tower.add(o); }
  bellMesh = mesh(new THREE.CylinderGeometry(.55,1.0,1.3,14,1,true), M.bronze, 0,towerH+1.2,0); bellMesh.material.side = THREE.DoubleSide; tower.add(bellMesh);
  const spire = mesh(new THREE.ConeGeometry(3.2,6,4), M.stoneDark, 0,towerH+6,0); spire.rotation.y = Math.PI/4; tower.add(spire);
  tower.add(mesh(new THREE.BoxGeometry(.12,1.6,.12), M.rust, 0,towerH+9.6,0)); tower.add(mesh(new THREE.BoxGeometry(.9,.12,.12), M.rust, 0,towerH+9.8,0));
  tower.position.set(VX, VY-.5, VZ); tower.rotation.set(.05, .3, -.07);
  bakeStatic(tower, o=>o===bellMesh); addLore('bell', tower, VY - .5 + towerH + 10);
  // chiesa
  // la chiesa: enorme, gotica, con le finestre che di notte si accendono
  const ch = new THREE.Group(); ch.position.set(VX+7, VY-.5, VZ+4.5); ch.rotation.y = .3;
  const CW = 9, CH = 13, CL = 20;
  ch.add(mesh(new THREE.BoxGeometry(CW,CH,CL), M.stone, 0,CH/2,0)); ch.add(mesh(new THREE.BoxGeometry(CW+2,3,CL+3), M.stoneDark, 0,-1.2,.5));
  const roof = mesh(new THREE.CylinderGeometry(0, CW*.75, 6.5, 4, 1), M.stoneDark, 0,CH+3.2,0); roof.rotation.y = Math.PI/4; roof.scale.set(1,1,CL/CW*.95); ch.add(roof);
  for (const sx of [-1,1]) for (let k=0;k<5;k++){ const z = -CL/2+2+k*4;
    const bt = mesh(new THREE.BoxGeometry(1.4,CH*.85,1.1), M.stoneDark, sx*(CW/2+.6), CH*.42, z); ch.add(bt);
    const pin = mesh(new THREE.ConeGeometry(.6,2.6,4), M.stoneDark, sx*(CW/2+.6), CH*.85+1.3, z); ch.add(pin);
    if (k<4){ const w = mesh(new THREE.PlaneGeometry(1.3,5.2), M.win, sx*(CW/2+.03), CH*.55, z+2); w.rotation.y = sx*Math.PI/2; ch.add(w);
      const wt = mesh(new THREE.CircleGeometry(.65,10,0,Math.PI), M.win, sx*(CW/2+.03), CH*.55+2.6, z+2); wt.rotation.y = sx*Math.PI/2; ch.add(wt); } }
  const fac = mesh(new THREE.BoxGeometry(CW+1.6, CH+4, 1.4), M.stone, 0,(CH+4)/2, CL/2+.5); ch.add(fac);
  ch.add(mesh(new THREE.ConeGeometry(2.2,4.5,4), M.stoneDark, 0, CH+4+2.2, CL/2+.5));
  const rose = mesh(new THREE.CircleGeometry(2.3,24), M.win, 0, CH*.72, CL/2+1.22); ch.add(rose);
  ch.add(mesh(new THREE.TorusGeometry(2.4,.25,6,24), M.stoneDark, 0, CH*.72, CL/2+1.25));
  for (let k=0;k<8;k++){ const sp = mesh(new THREE.BoxGeometry(.16,4.6,.1), M.stoneDark, 0, CH*.72, CL/2+1.28); sp.rotation.z = k/8*Math.PI; ch.add(sp); }
  const door = mesh(new THREE.PlaneGeometry(2.6,5), M.black, 0, 2.5, CL/2+1.22); ch.add(door);
  ch.add(mesh(new THREE.CircleGeometry(1.3,12,0,Math.PI), M.black, 0, 5, CL/2+1.22));
  bakeStatic(ch); v.add(ch);
  scene.add(v);
  // case
  const houses = new THREE.Group(); let first = null;
  const spots = [[-9,-4],[-11,5],[-6,10],[2,-12],[-2,-11],[-14,1],[-4,14],[-13,-8]];
  spots.forEach(([dx,dz],i)=>{
    const w = rand(4,5.5), d = rand(4,6), h = rand(3,4.2), x = VX+dx, z = VZ+dz;
    const y = Math.min(H(x,z), H(x+w/2,z+d/2), H(x-w/2,z-d/2), H(x+w/2,z-d/2), H(x-w/2,z+d/2)) + .3;
    const hg = new THREE.Group();
    hg.add(mesh(new THREE.BoxGeometry(w+.4, 3, d+.4), M.stoneDark, 0, -1.4, 0));
    hg.add(mesh(new THREE.BoxGeometry(w,h,d), M.stone, 0,h/2,0));
    const rf = mesh(new THREE.ConeGeometry(Math.max(w,d)*.75,2,4), M.stoneDark, 0,h+1,0); rf.rotation.y = Math.PI/4; rf.scale.set(w/Math.max(w,d), 1, d/Math.max(w,d)); hg.add(rf);
    for (let k=0;k<2;k++){ const wn = mesh(new THREE.PlaneGeometry(.6,.7), M.win, (k?.9:-.9), h*.55, d/2+.02); hg.add(wn); }
    hg.add(mesh(new THREE.PlaneGeometry(.9,1.7), M.black, 0, .85, -d/2-.02).rotateY(Math.PI));
    for (let k=0;k<2;k++){ const wn = mesh(new THREE.PlaneGeometry(.55,.65), M.win, (k?1.3:-1.3), h*.55, -d/2-.02); wn.rotation.y = Math.PI; hg.add(wn); }
    hg.position.set(x, y-.3, z); hg.rotation.y = rand(-.5,.5)+Math.atan2(dx,dz);
    if (i===0) first = hg; else houses.add(hg);
  });
  bakeStatic(houses); bakeStatic(first); scene.add(houses);
  addLore('house', first, first.position.y + 4.5);
}
// ossa sparse
{
  const geos = []; const tmp = new THREE.Object3D();
  for (let i=0;i<140;i++){
    const a = rand(0,6.28), r = rand(24, 78), x = Math.cos(a)*r, z = Math.sin(a)*r;
    const isSkull = Math.random()<.25;
    const g = isSkull ? new THREE.SphereGeometry(.13,7,6) : new THREE.CylinderGeometry(.025,.035,rand(.3,.5),5);
    tmp.position.set(x, H(x,z)+.05, z); tmp.rotation.set(Math.PI/2+rand(-.3,.3), rand(0,6), rand(-.3,.3)); tmp.updateMatrix(); g.applyMatrix4(tmp.matrix);
    geos.push(g.index ? g : g);
  }
  scene.add(new THREE.Mesh(mergeGeometries(geos), M.bone));
}
/* ---------- scalpello: rumore 3D, arti scolpiti, ellissoidi ---------- */
  // rumore 3D per scolpire la pietra
const h3 = (x,y,z)=>{ let h = Math.imul(x|0,374761393) ^ Math.imul(y|0,668265263) ^ Math.imul(z|0,1440662683); h = Math.imul(h^(h>>>13),1274126177); h ^= h>>>16; return (h>>>0)/4294967295; };
const vn3 = (x,y,z)=>{ const xi=Math.floor(x), yi=Math.floor(y), zi=Math.floor(z), xf=x-xi, yf=y-yi, zf=z-zi, u=xf*xf*(3-2*xf), v=yf*yf*(3-2*yf), w=zf*zf*(3-2*zf);
  const L = (a,b,t)=>a+(b-a)*t;
  return L(L(L(h3(xi,yi,zi),h3(xi+1,yi,zi),u), L(h3(xi,yi+1,zi),h3(xi+1,yi+1,zi),u), v), L(L(h3(xi,yi,zi+1),h3(xi+1,yi,zi+1),u), L(h3(xi,yi+1,zi+1),h3(xi+1,yi+1,zi+1),u), v), w); };
const fbm3 = (x,y,z)=>{ let s=0,a=.5,f=1; for (let i=0;i<4;i++){ s += a*vn3(x*f+i*7.1,y*f,z*f); f *= 2.1; a *= .5; } return s; };
const V = (x,y,z)=>new THREE.Vector3(x,y,z);
// scolpisce un pezzo: spostamento lungo la normale + colore (cavità scure, incrostazioni chiare)
const sculpt = (g, amp=.35, freq=.55, tone=1)=>{
  if (g.index) g = g.toNonIndexed(); g.deleteAttribute('uv'); g.deleteAttribute('normal'); g = mergeVertices(g, 1e-3); g.computeVertexNormals();
  const p = g.attributes.position, n = g.attributes.normal, col = new Float32Array(p.count*3);
  for (let i=0;i<p.count;i++){ const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const f = fbm3(x*freq, y*freq, z*freq) - .5, ridge = Math.abs(fbm3(x*freq*2.3+9, y*freq*2.3, z*freq*2.3) - .5);
    const d = f*amp*2 - ridge*amp*.9; p.setXYZ(i, x + n.getX(i)*d, y + n.getY(i)*d, z + n.getZ(i)*d);
    const c = clamp(.5 + f*1.4 - ridge*.7, .15, 1)*tone; col[i*3] = .36*c + .03; col[i*3+1] = .38*c + .035; col[i*3+2] = .33*c + .03; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(p.count*2), 2)); return g; };
// arto: tubo con profilo di raggi (muscoli, nocche, ossa che sporgono), estremità chiuse
const sampleR = (rs, t)=>{ const f = clamp(t,0,1)*(rs.length-1), i = Math.min(rs.length-2, Math.floor(f)), k = f - i, s = k*k*(3-2*k); return rs[i] + (rs[i+1]-rs[i])*s; };
const limb = (pts, rs, seg=28, rad=16, flat=1)=>{ const cv = new THREE.CatmullRomCurve3(pts), g = new THREE.TubeGeometry(cv, seg, 1, rad, false), p = g.attributes.position;
  const fr = cv.computeFrenetFrames(seg, false);
  for (let v=0; v<p.count; v++){ const ring = Math.floor(v/(rad+1)), t = ring/seg, c = cv.getPointAt(t), r = sampleR(rs, t);
    let dx = p.getX(v)-c.x, dy = p.getY(v)-c.y, dz = p.getZ(v)-c.z;
    if (flat !== 1){ const b = fr.binormals[ring], db = dx*b.x + dy*b.y + dz*b.z; dx -= b.x*db*(1-flat); dy -= b.y*db*(1-flat); dz -= b.z*db*(1-flat); }
    p.setXYZ(v, c.x + dx*r, c.y + dy*r, c.z + dz*r); }
  const parts = [g];
  for (const [t, r] of [[0, rs[0]], [1, rs[rs.length-1]]]){ const s = new THREE.SphereGeometry(r, rad, Math.max(6, rad/2)); const c = cv.getPointAt(t); s.translate(c.x, c.y, c.z); parts.push(s); }
  return mergeGeometries(parts.map(q=>{ const n = q.index ? q.toNonIndexed() : q; n.deleteAttribute('uv'); return n; })); };
const ell = (x,y,z, sx,sy,sz, rx=0, ry=0, rz=0, seg=28)=>{ const s = new THREE.SphereGeometry(1, seg, Math.round(seg*.7)); s.scale(sx,sy,sz); s.rotateX(rx); s.rotateY(ry); s.rotateZ(rz); s.translate(x,y,z); return s; };
const claw = (base, dir, len, r)=>{ const d = dir.clone().normalize(), pts = []; for (let k=0;k<=4;k++){ const t = k/4; pts.push(base.clone().addScaledVector(d, len*t).add(V3(0, -Math.pow(t,2)*len*.35, 0))); } return limb(pts, [r, r*.7, r*.35, .02], 10, 8); };
// IL GUARDIANO: settanta metri di pietra accovacciata sul fondo, ali chiuse, tentacoli sul petto, una sfera tra gli artigli
const colHead = new THREE.Group();
const COLU = { uSway:{value:0}, uTime:{value:0}, tNz:{value:NOISE_TEX} };
// pietra: crepe, pori, alghe e righe delle vecchie rive, tutto calcolato sulla superficie (niente facce piatte)
function stoneMat(o={}){ return stonify(new THREE.MeshStandardMaterial({ color:0xffffff, vertexColors:true, roughness:.86, metalness:0, side:o.side||THREE.FrontSide }), o); }
function stonify(m, o={}){ const sc = o.sc || 1;
  m.onBeforeCompile = sh => {
    sh.uniforms.tNz = COLU.tNz; sh.uniforms.uSway = COLU.uSway; sh.uniforms.uTime = COLU.uTime;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uSway, uTime; varying vec3 vCW; varying vec3 vCN;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
      ${o.sway ? `{ float hang = max(0., -position.y); float ph = position.x*.9 + position.z*.4;
        transformed.x += sin(uTime*.45 + ph + hang*.35)*uSway*hang*hang*.018;
        transformed.z += sin(uTime*.37 + ph*1.3 + hang*.3)*uSway*hang*hang*.022; }` : ''}
      vCW = (modelMatrix*vec4(transformed,1.)).xyz; vCN = normalize(mat3(modelMatrix)*objectNormal);`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      uniform sampler2D tNz; varying vec3 vCW; varying vec3 vCN;
      float triN(vec3 p, vec3 w, float s, vec4 m){ return dot(texture2D(tNz, p.zy*s), m)*w.x + dot(texture2D(tNz, p.xz*s), m)*w.y + dot(texture2D(tNz, p.xy*s), m)*w.z; }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
      vec3 cw = pow(abs(normalize(vCN)), vec3(4.)); cw /= (cw.x+cw.y+cw.z);
      float big = triN(vCW, cw, .021*${sc.toFixed(2)}, vec4(.6,.4,0.,0.));
      float fine = triN(vCW, cw, .11*${sc.toFixed(2)}, vec4(0.,.35,.4,.25));
      float crv = abs(triN(vCW, cw, .03*${sc.toFixed(2)}, vec4(0.,0.,1.,0.)) - .5), crw = fwidth(crv);
      float crk = (1. - smoothstep(.0, max(.022, crw*1.5), crv)) * smoothstep(.45, .62, big) * (1. - smoothstep(.01, .04, crw));
      float cH = big*.9 + fine*.22 - crk*.4;
      float alg = smoothstep(.25, .8, vCN.y + (big-.5)*1.4) * smoothstep(.35,.65, fine);
      float streak = smoothstep(.5, .85, texture2D(tNz, vec2(vCW.x*.06 + vCW.z*.04, vCW.y*.004)).g) * (1. - abs(vCN.y));
      float tide = smoothstep(.86, 1., sin(vCW.y*1.7 + big*3.))*.35;
      diffuseColor.rgb *= (.62 + big*.55) * (1. - crk*.5) * (1. - streak*.45) * (1. - tide);
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.07,.1,.055), alg*.75);`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = clamp(roughnessFactor - alg*.45 - streak*.3, .2, 1.);')
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      { vec3 sp = -vViewPosition, sx = dFdx(sp), sy = dFdy(sp), r1 = cross(sy, normal), r2 = cross(normal, sx); float det = dot(sx, r1);
        float hh = cH*.3; vec3 grad = sign(det)*(dFdx(hh)*r1 + dFdy(hh)*r2); normal = normalize(abs(det)*normal - grad); }`);
  };
  m.customProgramCacheKey = ()=> 'stone' + (o.sway?1:0) + (o.side||0) + sc;
  return m;
}
const colMat = stoneMat(), colTentMat = stoneMat({sway:true}), colWingMat = stoneMat({side:THREE.DoubleSide});
// la pietra del paese: stessa grana del Guardiano, più fitta (case, chiesa, campanile, monoliti)
stonify(M.stone, {sc:4.5}); stonify(M.stoneDark, {sc:4.5});
// LE STATUE: otto penitenti prostrati, la fronte a terra verso la voragine. Da vicino hanno i pori, e le unghie.
const prostrateGeo = (()=>{ const P = [], V = V3, sk = (g, a=.006, f=9)=>P.push(sculpt(g, a, f, .62));
  for (const s of [-1,1]){
    sk(limb([V(s*.16,.1,.12), V(s*.15,.085,-.18), V(s*.13,.075,-.44)], [.072,.068,.055,.042], 14, 10));
    sk(ell(s*.13,.075,-.54, .042,.038,.11, .3, 0, 0, 14));
    for (let f=0;f<5;f++) sk(ell(s*(.098+f*.016), .045, -.63+f*.008, .011,.012,.02, 0,0,0, 8), .002, 20);
    sk(limb([V(s*.12,.38,-.36), V(s*.15,.25,-.13), V(s*.16,.13,.1)], [.105,.098,.085,.072], 14, 12));
    sk(ell(s*.16,.12,.14, .068,.062,.058, 0,0,0, 14));
    // braccia tese in avanti, le mani aperte a terra
    sk(limb([V(s*.2,.47,.3), V(s*.29,.3,.4), V(s*.3,.17,.48)], [.062,.055,.048], 12, 10));
    sk(limb([V(s*.3,.17,.48), V(s*.28,.08,.62), V(s*.25,.04,.74)], [.048,.042,.034], 12, 10));
    sk(ell(s*.25,.03,.8, .052,.017,.065, 0, s*.15, 0, 14), .003, 14);
    for (let f=0;f<4;f++){ const x0 = s*(.218 + f*.022), z0 = .85 - Math.abs(f-1.5)*.012, len = .085 + (f===1||f===2 ? .015 : 0);
      sk(limb([V(x0,.03,z0), V(x0 + s*f*.004,.026,z0+len*.6), V(x0 + s*f*.008,.012,z0+len)], [.009,.008,.006], 8, 6), .001, 25);
      // le unghie: troppo lunghe, ricurve nel fango
      sk(limb([V(x0 + s*f*.008,.014,z0+len), V(x0 + s*f*.01,.008,z0+len+.035), V(x0 + s*f*.011,.0,z0+len+.06)], [.006,.004,.001], 6, 5), 0, 1); }
    sk(limb([V(s*.2,.035,.78), V(s*.17,.028,.84), V(s*.155,.016,.88)], [.012,.01,.007], 8, 6), .001, 25);
    sk(ell(s*.11,.55,.17, .085,.03,.1, .2, 0, s*.3, 14));   // scapole
    sk(ell(s*.09,.27,.53, .016,.03,.022, 0,0,0, 8), .001, 20); // orecchie
  }
  sk(ell(0,.42,-.34, .19,.15,.16, 0,0,0, 20));
  const spine = [V(0,.44,-.3), V(0,.53,-.08), V(0,.49,.17), V(0,.39,.34)];
  sk(limb(spine, [.165,.185,.195,.18,.15], 22, 18, .74));
  { const cv = new THREE.CatmullRomCurve3(spine); for (let k=1;k<11;k++){ const c = cv.getPointAt(k/11); sk(ell(0, c.y + .155 - Math.abs(k/11-.45)*.07, c.z, .022,.02,.024, 0,0,0, 8), .002, 20); } }
  for (const s of [-1,1]) for (let k=0;k<4;k++){ const z = .02 + k*.075, y = .47 - k*.012; sk(limb([V(s*.06,y+.06,z), V(s*.17,y-.02,z+.01), V(s*.19,y-.12,z+.02)], [.016,.014,.01], 8, 6), .002, 15); }
  sk(limb([V(0,.39,.34), V(0,.33,.43)], [.058,.052], 8, 10));
  sk(ell(0,.19,.52, .088,.112,.1, .9, 0, 0, 20), .004, 10);
  sk(ell(0,.23,.48, .092,.07,.09, .9, 0, 0, 14));   // la nuca, i capelli rasati
  const g = mergeGeometries(P.map(q=>{ const n = q.index ? q.toNonIndexed() : q; for (const k of Object.keys(n.attributes)) if (!['position','normal','color'].includes(k)) n.deleteAttribute(k); return n; }));
  g.scale(2.2,2.2,2.2); return g; })();
const statueMat = stoneMat({sc:2.5});
for (let i=0;i<8;i++){
  const a = i/8*Math.PI*2 + .2, r = 32, x = Math.cos(a)*r, z = Math.sin(a)*r; if (Math.hypot(x-COL_X, z-COL_Z) < 17) continue;
  const yaw = Math.atan2(-x,-z) + rand(-.06,.06), st = new THREE.Group(); st.add(new THREE.Mesh(prostrateGeo, statueMat)); seat(st, x, z, yaw, .9, 1.6, -.04);
  if (i===2) addLore('statue', st, st.position.y + 2); else scene.add(st);
}
const colOrbMat = new THREE.MeshStandardMaterial({color:0x0c100d, roughness:.15, emissive:0x6aff9a, emissiveIntensity:0});
const colEyeMat = new THREE.MeshBasicMaterial({color:new THREE.Color(4,3.2,.9)}), COL_EYES = [];
const colOrbLight = new THREE.PointLight(0x5cff9a, 0, 60, 1.6);
const COL_ORB = new THREE.Vector3(0, 15.6, 7.9), COL_ORB_R = 2.3;
const colossus = (()=>{
  const V = V3;
  const body = [], tents = [], wings = [], crust = [];
  const g = new THREE.Group(); g.position.set(COL_X, COL_Y0, COL_Z); g.scale.setScalar(COL_S); g.rotation.y = Math.atan2(-COL_X, 62-COL_Z);

  // basamento: due blocchi sbozzati, con gli scalini consumati
  { const b = new THREE.BoxGeometry(13,6,12.5,14,8,14); b.translate(0,1,-.4); body.push(sculpt(b, .7, .3, .85));
    const b2 = new THREE.BoxGeometry(10.5,1.4,10,10,3,10); b2.translate(0,4.5,-.6); body.push(sculpt(b2, .45, .4, .9)); }
  // bacino, ventre incavato, gabbia toracica, spalle curve in avanti
  body.push(sculpt(ell(0,9.6,-1.6, 4.4,2.9,3.6), .3));
  body.push(sculpt(ell(0,13.2,-1.3, 2.9,3.4,2.4, .1), .25));
  body.push(sculpt(ell(0,18.6,-.7, 5.0,4.6,3.9, -.18), .25));
  body.push(sculpt(ell(0,22.4,.1, 6.6,2.5,3.5, -.2, 0, 0, 32), .3));
  // costole: sporgono dalla pelle di pietra
  for (const s of [-1,1]) for (let k=0;k<6;k++){ const y0 = 16.2 + k*1.05, ky = (y0-18.6)/4.6, kk = Math.sqrt(Math.max(.15, 1 - ky*ky)), pts = [];
    for (let j=0;j<=8;j++){ const th = lerp(2.55, .32, j/8); pts.push(V(s*Math.sin(th)*5.15*kk, y0 - (j/8)*1.4 + (k>3 ? (j/8)*.5 : 0), -.7 + Math.cos(th)*4.05*kk + (j/8)*.25)); }
    body.push(sculpt(limb(pts, [.34,.4,.36,.22], 18, 8), .06, 1.2)); }
  // spina dorsale con creste
  for (let k=0;k<8;k++){ const y = 10.5 + k*1.75, z = -4.3 + Math.sin(k*.45)*.6 + k*.12; const sp = limb([V(0,y,z), V(0,y+.9,z-1.3), V(0,y+1.9,z-2.2)], [.75,.4,.05], 8, 8); body.push(sculpt(sp, .08, 1)); }
  // collo
  body.push(sculpt(limb([V(0,22.6,.2), V(0,24.6,.9), V(0,26.4,1.5)], [2.1,1.7,1.55], 12, 18), .2));
  // gambe accovacciate, ginocchia alte, piedi che stringono il bordo
  for (const s of [-1,1]){
    body.push(sculpt(limb([V(s*3.3,9.4,-1.4), V(s*4.6,12.3,1.6), V(s*5.3,14.6,4.4)], [2.4,2.6,2.0,1.6], 26, 18), .3));
    body.push(sculpt(ell(s*5.35,14.5,4.75, 1.55,1.35,1.4), .25));
    body.push(sculpt(limb([V(s*5.4,14.2,4.9), V(s*5.1,10.2,5.2), V(s*4.8,6.3,4.6)], [1.5,1.25,1.0,.95], 22, 16), .25));
    body.push(sculpt(ell(s*4.7,5.2,5.3, 1.5,.95,2.0, .1), .2));
    for (let f=0; f<3; f++){ const fx = s*(4.0 + f*.75), b0 = V(fx, 5.0, 6.6), pts = [b0, V(fx + s*(f-1)*.15, 4.95, 7.5), V(fx + s*(f-1)*.25, 4.4, 8.3)];
      body.push(sculpt(limb(pts, [.5,.42,.34], 10, 10), .08, 1)); body.push(sculpt(claw(V(fx + s*(f-1)*.25, 4.2, 8.35), V(0,-1,.25), 1.6, .3), .03, 2)); }
    // braccia lunghissime: spalla, gomito che sporge in fuori, avambraccio verso la sfera
    body.push(sculpt(ell(s*6.4,22.7,.1, 2.1,2.0,2.2), .25));
    body.push(sculpt(limb([V(s*6.6,22.4,.3), V(s*8.2,19.6,1.0), V(s*9.0,16.9,2.1)], [1.6,1.45,1.25,1.0], 24, 16), .28));
    body.push(sculpt(ell(s*9.0,16.7,2.3, 1.05,1.15,1.1), .2));
    body.push(sculpt(limb([V(s*8.9,16.6,2.6), V(s*7.2,15.6,4.7), V(s*4.4,15.2,6.4)], [1.1,1.2,.95,.72], 24, 16, .8), .2));
    // mano: dorso, quattro dita che avvolgono la sfera, artigli
    const O = COL_ORB, R = COL_ORB_R + .38;
    body.push(sculpt(ell(s*3.2,15.3,7.0, .75,1.35,1.2, 0, s*.5, s*.25, 20), .12, 1));
    for (let f=0; f<4; f++){ const a = V(s*.92, -.45 + f*.3, -.1 - f*.05).normalize(), b = V(s*.12, -.35 + f*.27, .98).normalize(), pts = [];
      pts.push(V(s*3.6, 14.4 + f*.62, 6.6 + f*.15));
      for (let k=0;k<=4;k++){ const q = new THREE.Vector3().copy(a).lerp(b, k/4).normalize().multiplyScalar(R + (k===0 ? .2 : 0)); pts.push(q.add(O)); }
      body.push(sculpt(limb(pts, [.36,.33,.3,.27,.22], 24, 10), .05, 1.5));
      const tip = pts[pts.length-1], dir = pts[pts.length-1].clone().sub(pts[pts.length-2]); body.push(sculpt(claw(tip, dir, 1.4, .2), .02, 2)); }
    { const pts = [V(s*3.4,16.3,6.4), V(s*2.6,17.6,6.9)]; const a = V(s*.45,.85,.2).normalize(); pts.push(a.multiplyScalar(R).add(O)); body.push(sculpt(limb(pts, [.42,.35,.3], 14, 10), .05, 1.5)); }
    // ali chiuse: osso del braccio, quattro dita, membrana strappata che pende tra le dita
    const root = V(s*3.0,21.2,-3.0), wrist = V(s*6.2,30.6,-6.6);
    wings.push(sculpt(limb([root, V(s*4.9,26.4,-5.4), wrist], [1.05,.85,.7], 20, 12), .12, .8));
    const tips = [V(s*4.0,41.2,-5.2), V(s*7.6,39.0,-8.6), V(s*9.6,32.6,-9.6), V(s*9.9,23.8,-8.4)];
    const fing = tips.map((tp,i)=>{ const mid = wrist.clone().lerp(tp, .5).add(V(s*.6, i===0 ? .6 : 0, -.8)); const cv = new THREE.CatmullRomCurve3([wrist, mid, tp]); wings.push(sculpt(limb([wrist, mid, tp], [.55,.4,.08], 22, 10), .06, 1.2)); return cv; });
    fing.push(new THREE.CatmullRomCurve3([wrist, V(s*6.4,22.6,-6.4), V(s*3.9,12.6,-3.9)]));
    const mp = [], mi = [], NU = 16, NV = 8;
    for (let f=0; f<fing.length-1; f++){ const A = fing[f], B = fing[f+1], base = mp.length/3;
      for (let i=0;i<=NU;i++) for (let j=0;j<=NV;j++){ const v = j/NV, umax = 1 - .32*Math.sin(Math.PI*v), u = i/NU*umax;
        const pa = A.getPointAt(u), pb = B.getPointAt(u), q = pa.lerp(pb, v); const sag = Math.sin(Math.PI*v)*u*1.4; q.x -= s*sag*.35; q.z += sag*.55;
        mp.push(q.x, q.y, q.z); }
      for (let i=0;i<NU;i++) for (let j=0;j<NV;j++){ if (i > NU*.55 && Math.random() < .09) continue; const a = base + i*(NV+1) + j, b = a + NV + 1; mi.push(a, b, a+1, b, b+1, a+1); } }
    const mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.Float32BufferAttribute(mp, 3)); mg.setIndex(mi); wings.push(sculpt(mg, .12, .5, .8));
    // catene arrugginite alle caviglie, spezzate
    const ch = []; for (let k=0;k<13;k++){ const t = k/12, lk = new THREE.TorusGeometry(.42, .12, 6, 12); lk.scale(1, 1.5, 1); lk.rotateY(k%2 ? Math.PI/2 : 0); lk.rotateX(-.3 - t*.9);
      lk.translate(s*(4.9 + t*1.8), 5.6 - t*3.3 + Math.sin(t*Math.PI)*.4, 5.6 + t*1.4 - t*t*1.2); ch.push(lk.toNonIndexed()); }
    const cuff = new THREE.TorusGeometry(1.15, .3, 8, 20); cuff.rotateX(Math.PI/2); cuff.translate(s*4.8,6.6,4.6); ch.push(cuff.toNonIndexed());
    g.add(new THREE.Mesh(mergeGeometries(ch), M.rust));
  }
  // la sfera tra gli artigli, e la sua luce verde sul petto e sui tentacoli
  g.add(mesh(new THREE.SphereGeometry(COL_ORB_R, 32, 24), colOrbMat, COL_ORB.x, COL_ORB.y, COL_ORB.z));
  colOrbLight.position.copy(COL_ORB).add(V(0,1.5,1.2)); g.add(colOrbLight);
  // incrostazioni: grappoli di conchiglie e denti di pietra sulle superfici in alto
  { const src = body.filter((q,i)=>i>1); for (let k=0;k<420;k++){ const q = src[Math.floor(Math.random()*src.length)], p = q.attributes.position, n = q.attributes.normal, i = Math.floor(Math.random()*p.count);
      if (n.getY(i) < .15) continue; const r = rand(.08,.3), b = new THREE.SphereGeometry(r, 6, 4); b.scale(1, rand(.4,.9), 1); b.translate(p.getX(i)+n.getX(i)*r*.3, p.getY(i)+n.getY(i)*r*.3, p.getZ(i)+n.getZ(i)*r*.3); crust.push(b.toNonIndexed()); } }
  // la testa: cranio a bulbo piegato all'indietro, corna, grappolo di occhi, tentacoli che pendono sulla sfera
  colHead.position.set(0, 26.2, 1.4);
  const hp = [];
  hp.push(sculpt(ell(0,3.6,-1.4, 3.1,4.7,3.4, -.62, 0, 0, 36), .35, .45));
  hp.push(sculpt(ell(0,2.4,1.3, 2.7,2.1,2.3, .1), .25, .6));
  hp.push(sculpt(ell(0,3.15,2.55, 2.5,.75,1.1, -.15), .15, .9));
  for (const s of [-1,1]) for (let k=0;k<3;k++){ const b = V(s*(1.3+k*.55), 5.6 - k*.9, -2.6 - k*.3); hp.push(sculpt(limb([b, b.clone().add(V(s*(.9+k*.3), 1.8-k*.3, -1.6)), b.clone().add(V(s*(1.2+k*.5), 2.4-k*.9, -3.9+k*.4))], [.7-k*.12,.42,.04], 16, 10), .06, 1)); }
  const sockets = [[-.85,2.75,.45],[.85,2.75,.45],[-1.55,2.25,.32],[1.55,2.25,.28],[0,3.35,.5],[-.35,2.05,.45],[.4,2.0,.42]];
  sockets.forEach(([x,y,r])=>{ const sk = new THREE.SphereGeometry(r*1.3, 10, 8); sk.scale(1.3,.8,.6); sk.translate(x, y, 3.25 - Math.abs(x)*.28); hp.push(sculpt(sk, .02, 2, .25));
    const em = colEyeMat.clone(); COL_EYES.push(em); const e = mesh(new THREE.SphereGeometry(r*.75, 12, 8), em, x, y + .05, 3.5 - Math.abs(x)*.28); e.scale.set(1.25,.7,.7); e.userData.colEye = true; colHead.add(e); });
  colHead.add(new THREE.Mesh(mergeGeometries(hp), colMat));
  for (let k=0;k<15;k++){ const u = (k-7)/7, x0 = u*1.9, len = 7.5 + (1-Math.abs(u))*5 + rand(-1,1), pts = [];
    for (let j=0;j<=10;j++){ const t = j/10, curl = Math.max(0, t-.72)/.28;
      pts.push(V(x0*(1 + t*.5) + Math.sin(t*3 + k)*.45 + Math.sin(curl*4)*u*.6, .8 - t*len + curl*curl*1.6, 2.4 + t*1.9 + Math.sin(t*4.5+k*1.7)*.35 + Math.sin(curl*3.5)*1.1)); }
    tents.push(sculpt(limb(pts, [.62 - Math.abs(u)*.1, .5, .38, .22, .06], 40, 12), .07, 1.4)); }
  { const tm = new THREE.Mesh(mergeGeometries(tents), colTentMat); colHead.add(tm); }
  g.add(colHead);
  g.add(new THREE.Mesh(mergeGeometries(body), colMat));
  g.add(new THREE.Mesh(mergeGeometries(wings), colWingMat));
  g.add(new THREE.Mesh(mergeGeometries(crust), new THREE.MeshStandardMaterial({color:0x5c5a4c, roughness:.7})));
  return g;
})();
addLore('colossus', colossus, COL_Y0 + 32*COL_S);
// monoliti con glifi
const glyphTex = (()=>{
  const c = document.createElement('canvas'); c.width = 128; c.height = 256; const x = c.getContext('2d');
  x.fillStyle='#000'; x.fillRect(0,0,128,256); x.strokeStyle='#fff'; x.lineWidth = 3; x.lineCap='round';
  for (let i=0;i<34;i++){ const cx = rand(14,114), cy = rand(14,242); x.beginPath(); x.moveTo(cx,cy);
    for (let k=0;k<4;k++){ if (Math.random()<.4) x.arc(cx+rand(-8,8), cy+rand(-8,8), rand(3,8), rand(0,6), rand(0,6)); else x.lineTo(cx+rand(-12,12), cy+rand(-12,12)); } x.stroke(); }
  x.beginPath(); x.ellipse(64,128,22,9,0,0,Math.PI*2); x.stroke(); x.beginPath(); x.moveTo(42,128); x.lineTo(86,128); x.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
})();
const monoMat = new THREE.MeshStandardMaterial({ color:0x111312, roughness:.6, emissive:0x5cff9a, emissiveMap:glyphTex, emissiveIntensity:0 });
for (let i=0;i<7;i++){
  const a = i/7*Math.PI*2 + .35, r = 22, x = Math.cos(a)*r, z = Math.sin(a)*r; if (Math.hypot(x-COL_X, z-COL_Z) < 13 && i!==1) continue;
  const m = mesh(new THREE.BoxGeometry(1.8,10,.8), monoMat); m.position.set(x, H(x,z)+3.8, z);
  m.rotation.y = Math.atan2(x,z); m.rotation.x = rand(-.25,.1); m.rotation.z = rand(-.15,.15);
  if (i===1) addLore('monolith', m, m.position.y + 4.5); else scene.add(m);
}
// sporgenza con lanterna e ultima pagina
{
  const g = new THREE.Group(); const dx = -.6, dz = -.8; let rr = 9; while (rr < 40 && H(dx*rr, dz*rr) < -95) rr += .25; rr -= 1.6; const x = dx*rr, z = dz*rr;
  g.add(mesh(new THREE.CylinderGeometry(2.4,2,.6,8), M.stoneDark, 0,-.3,0));
  g.add(mesh(new THREE.BoxGeometry(.25,.35,.25), M.lampGlass, .4,.17,.2));
  g.add(mesh(new THREE.BoxGeometry(.22,.04,.3), M.paper, -.3,.02,-.1));
  const rope = mesh(new THREE.CylinderGeometry(.02,.02,6,4), M.woodDark, -.8,2.9,.4); rope.rotation.z = .1; g.add(rope);
  g.position.set(x, -95.3, z); g.rotation.y = Math.atan2(-x,-z);
  addLore('ledge', g, -94.6);
}
// forma impossibile sospesa
const knot = mesh(new THREE.TorusKnotGeometry(4.5,1.1,140,14,2,3), M.stone, 0, -104, 0);
addLore('knot', knot, -98);
// L'OCCHIO
const eye = new THREE.Group(); eye.position.set(0,-139,0); scene.add(eye);
const eyeU = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTime:{value:0}, uGlow:{value:0}, uDilate:{value:0} }]);
const eyeBall = new THREE.Mesh(new THREE.SphereGeometry(9.5, 48, 32), new THREE.ShaderMaterial({
  uniforms: eyeU, fog:true,
  vertexShader:`#include <fog_pars_vertex>
  varying vec3 vP; void main(){ vP=position; vec4 mvPosition=modelViewMatrix*vec4(position,1.); gl_Position=projectionMatrix*mvPosition;
  #include <fog_vertex>
  }`,
  fragmentShader:`#include <fog_pars_fragment>
  uniform float uTime,uGlow,uDilate; varying vec3 vP;
  float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
  float n(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+1.),f.x),f.y); }
  void main(){
    vec3 p=normalize(vP); float a=acos(clamp(p.z,-1.,1.)); float ang=atan(p.y,p.x);
    vec3 col=vec3(.42,.38,.27);
    float vein=smoothstep(.62,.95,n(vec2(ang*7.,a*9.))+n(vec2(ang*19.,a*21.))*.4)*smoothstep(.35,1.3,a);
    col=mix(col,vec3(.35,.03,.02),vein);
    float ir=.62; vec3 glowC=vec3(0.);
    if(a<ir){ float t=a/ir; vec3 iris=mix(vec3(.85,.62,.1),vec3(.12,.25,.06),t); iris*=.55+.45*n(vec2(ang*24.,t*5.+uTime*.05));
      float slit=abs(p.x)/(.05+uDilate*.22)+abs(p.y)*1.5;
      float pup=smoothstep(1.1,.95,slit);
      col=mix(iris,vec3(0.),pup); glowC=iris*(1.-pup)*(1.2-t); }
    col*=1.-.75*smoothstep(.06,0.,abs(a-ir));
    gl_FragColor=vec4(col*(.08+uGlow*.25),1.);
    #include <fog_fragment>
    gl_FragColor.rgb+=glowC*uGlow*.9;
  }`
}));
eye.add(eyeBall);
const lidGeo = new THREE.SphereGeometry(9.85, 40, 20, 0, Math.PI*2, 0, Math.PI/2);
const lidU = mesh(lidGeo, M.lid), lidD = mesh(lidGeo, M.lid); lidD.rotation.x = Math.PI;
lidU.material = M.lid; lidU.material.side = THREE.DoubleSide;
eye.add(lidU); eye.add(lidD);
let lidOpen = 0;
addLore('eye', eye, -129);
// tentacoli
const tentU = { uTime:{value:0} };
M.tentacle.onBeforeCompile = sh => {
  sh.uniforms.uTime = tentU.uTime;
  sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uTime; varying vec2 vTU;')
   .replace('#include <color_fragment>', `#include <color_fragment>
     float ring = smoothstep(.4,1.,sin(vTU.x*520.)); diffuseColor.rgb *= 1.-ring*.22;
     diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.12,.06,.07), smoothstep(.3,.0,abs(fract(vTU.y)-.5))*.5);`)
   .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = .25 + ring*.4;')
   .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
     { vec2 sp = vec2(fract(vTU.x*150.)-.5, (fract(vTU.y*2.)-.5)*1.8); float dots = smoothstep(.22,.05,length(sp))*smoothstep(.35,.1,abs(fract(vTU.y)-.5));
       totalEmissiveRadiance += vec3(.25,1.,.55)*dots*(.4+.6*pow(.5+.5*sin(vTU.x*30.-uTime*2.6),4.))*1.6; }`);
  sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime; varying vec2 vTU;')
   .replace('#include <begin_vertex>', `#include <begin_vertex>
     vTU = uv;
     float u = uv.x;
     transformed.x += sin(uTime*.7 + u*7. + position.y*.02)*u*u*7.;
     transformed.z += cos(uTime*.55 + u*6. + position.x*.03)*u*u*7.;`);
};
const tentacles = new THREE.Group(); tentacles.position.set(0,-136,0); scene.add(tentacles);
for (let i=0;i<9;i++){
  const a = i/9*Math.PI*2 + rand(-.2,.2), pts = [];
  for (let k=0;k<=8;k++){ const t = k/8; const rr = 4 + t*rand(14,26); const yy = t*rand(70,110); const aa = a + Math.sin(t*3+i)*.5; pts.push(new THREE.Vector3(Math.cos(aa)*rr, yy, Math.sin(aa)*rr)); }
  const curve = new THREE.CatmullRomCurve3(pts);
  const SEGS = 70, RAD = 7;
  const g = new THREE.TubeGeometry(curve, SEGS, rand(1.6,2.6), RAD, false);
  const pos = g.attributes.position;
  for (let v=0; v<pos.count; v++){ const ring = Math.floor(v/(RAD+1)); const t = ring/SEGS; const c = curve.getPointAt(t); const k = 1 - t*.92;
    pos.setXYZ(v, c.x + (pos.getX(v)-c.x)*k, c.y + (pos.getY(v)-c.y)*k, c.z + (pos.getZ(v)-c.z)*k); }
  g.computeVertexNormals();
  tentacles.add(new THREE.Mesh(g, M.tentacle));
}
tentacles.scale.setScalar(.01); tentacles.visible = false;

/* ---------- pompe e tubi ---------- */
const pumpSlots = PUMPS.map((p,i)=>{ const x = 6 + i*3.7; const z = Math.sqrt(99.8*99.8 - x*x); return {x, z}; });
const pumpObjs = PUMPS.map(()=>null);
const pipeObjs = PUMPS.map(()=>null);
let pipeDepth = -1;
const pipeMatN = new THREE.MeshStandardMaterial({color:0x1c1f1e, roughness:.5, metalness:.4});
function buildPumpModel(i){
  const g = new THREE.Group();
  if (i===0){ g.add(mesh(new THREE.CylinderGeometry(.18,.22,1.2,8), M.rust, 0,.6,0)); const lv = mesh(new THREE.BoxGeometry(.06,.06,1), M.metal, 0,1.2,.3); lv.rotation.x = .4; g.add(lv); }
  if (i===1){ g.add(mesh(new THREE.BoxGeometry(1.2,.8,.9), M.rust, 0,.4,0)); g.add(mesh(new THREE.CylinderGeometry(.35,.35,.9,12).rotateZ(Math.PI/2), M.metal, .2,.95,0)); g.add(mesh(new THREE.CylinderGeometry(.05,.05,.8,5), M.metal, -.4,1.2,.2)); }
  if (i===2){ g.add(mesh(new THREE.BoxGeometry(2,1.4,1.6), M.metal, 0,.7,0)); g.add(mesh(new THREE.TorusGeometry(.6,.08,6,16), M.rust, 1.05,.9,0).rotateY(Math.PI/2)); g.add(mesh(new THREE.CylinderGeometry(.25,.25,1.5,8), M.rust, -.6,2,0)); }
  if (i===3){ for (let s of [-1,1]) for (let t of [-1,1]) g.add(mesh(new THREE.BoxGeometry(.18,4,.18), M.rust, s*.9,2,t*.9)); g.add(mesh(new THREE.BoxGeometry(2.2,1.2,2.2), M.metal, 0,4.2,0)); const arm = mesh(new THREE.BoxGeometry(.3,.3,5), M.rust, 0,4.6,-2.4); arm.rotation.x = -.35; g.add(arm); }
  if (i===4){ const b = mesh(new THREE.SphereGeometry(1.3,18,14), M.flesh, 0,1.2,0); b.scale.set(1,.8,1.1); b.userData.pulse = true; g.add(b); for (let k=0;k<5;k++){ const v = mesh(new THREE.TorusGeometry(1.25,.07,5,14,2), M.flesh, 0,1.2,0); v.rotation.set(rand(0,3),rand(0,3),0); g.add(v); } }
  if (i===5){ const ring = mesh(new THREE.TorusGeometry(2.4,.9,12,28), M.flesh, 0,3,0); ring.userData.pulse = true; g.add(ring); g.add(mesh(new THREE.CircleGeometry(2.2,24), M.black, 0,3,.05)); for (let k=0;k<14;k++){ const a=k/14*Math.PI*2; const t = mesh(new THREE.ConeGeometry(.15,.7,5), M.bone, Math.cos(a)*1.9,3+Math.sin(a)*1.9,.3); t.rotation.z = a+Math.PI/2; g.add(t); } }
  const s = pumpSlots[i]; at(g, s.x, s.z, 0); g.rotation.y = Math.atan2(-s.x, -s.z) + (i===5?Math.PI:0);
  g.traverse(o=>{ if (o.isMesh){ o.castShadow = true; o.receiveShadow = true; } });
  scene.add(g); pumpObjs[i] = g;
}
function rebuildPipes(force){
  if (!force && Math.abs(S.d - pipeDepth) < .4) return; pipeDepth = S.d;
  const wy = water.position.y; const sr = Math.max(shoreR(S.d) - 1.5, 9.5);
  PUMPS.forEach((p,i)=>{
    if (!S.pumps[i]) return;
    if (!pumpObjs[i]) buildPumpModel(i);
    if (pipeObjs[i]){ scene.remove(pipeObjs[i]); pipeObjs[i].geometry.dispose(); }
    const s = pumpSlots[i], r0 = Math.hypot(s.x, s.z), dx = -s.x/r0, dz = -s.z/r0, pts = [];
    const lat = (i%2? .6 : -.6);
    pts.push(new THREE.Vector3(s.x - dz*lat*0, H(s.x,s.z)+ (i===5?1.5:.6), s.z));
    const steps = 18;
    for (let k=1;k<=steps;k++){ const r = lerp(r0-1.5, sr, k/steps); const x = dx*r - dz*lat, z = dz*r + dx*lat; let y = H(x,z) + .35; if (k===steps) y = Math.min(y, wy - .8); pts.push(new THREE.Vector3(x,y,z)); }
    const curve = new THREE.CatmullRomCurve3(pts);
    const rad = [.08,.14,.25,.4,.55,.9][i];
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 90, rad, 7, false), i>=4 ? M.flesh : pipeMatN);
    tube.castShadow = true; scene.add(tube); pipeObjs[i] = tube;
  });
}

/* ---------- secchio + corda ---------- */
const bucket = new THREE.Group();
{
  const prof = [[0,0],[.15,0],[.16,.015],[.2,.32],[.215,.335],[.2,.34]].map(([x,y])=>new THREE.Vector2(x,y));
  const bm = new THREE.MeshStandardMaterial({color:0x3a3731, roughness:.8, metalness:.35, side:THREE.DoubleSide});
  bucket.add(new THREE.Mesh(new THREE.LatheGeometry(prof, 20), bm));
  const hd = mesh(new THREE.TorusGeometry(.2,.008,5,16,Math.PI), M.metal, 0,.34,0); bucket.add(hd);
  bucket.add(mesh(new THREE.CircleGeometry(.19,16).rotateX(-Math.PI/2), new THREE.MeshStandardMaterial({color:0x050807, roughness:.1}), 0,.27,0));
}
bucket.scale.setScalar(.8); scene.add(bucket);
const ropeGeo = new THREE.BufferGeometry(); ropeGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(20*3),3));
const rope = new THREE.Line(ropeGeo, new THREE.LineBasicMaterial({color:0x5c4d3b})); rope.frustumCulled = false; scene.add(rope);
const B = { busy:false, t:0, dur:1, target:new THREE.Vector3(), splashed:false };
/* ---------- gocce: schizzi con peso, gocciolii, cerchi dove ricadono ---------- */
const DROP_N = 2600, dropPos = new Float32Array(DROP_N*3), dropLife = new Float32Array(DROP_N), dropSize = new Float32Array(DROP_N), dropVel = new Float32Array(DROP_N*3); let dropNext = 0, dropActive = 0;
const dropGeo = new THREE.BufferGeometry(); dropGeo.setAttribute('position', new THREE.BufferAttribute(dropPos,3)); dropGeo.setAttribute('life', new THREE.BufferAttribute(dropLife,1)); dropGeo.setAttribute('size', new THREE.BufferAttribute(dropSize,1));
const dropU = { uPx:{value:innerHeight}, uLight:{value:1} };
const drops = new THREE.Points(dropGeo, new THREE.ShaderMaterial({ uniforms:dropU, transparent:true, depthWrite:false,
  vertexShader:`attribute float life; attribute float size; uniform float uPx; varying float vL; void main(){ vL = life; vec4 mv = modelViewMatrix*vec4(position,1.); gl_Position = projectionMatrix*mv; gl_PointSize = life > 0. ? size*uPx*.0022/max(.3,-mv.z) : 0.; }`,
  fragmentShader:`uniform float uLight; varying float vL; void main(){ vec2 c = gl_PointCoord-.5; float d = length(c); if (d > .5) discard; float a = smoothstep(.5,.15,d)*clamp(vL*2.,0.,1.); gl_FragColor = vec4(vec3(.62,.7,.68)*uLight*(1.-d*.6), a*.75); }` }));
drops.frustumCulled = false; drops.userData.noCast = true; drops.renderOrder = 5; scene.add(drops);
function emitDrop(x,y,z, vx,vy,vz, life, size){ const i = dropNext; dropNext = (dropNext+1) % DROP_N; dropPos[i*3]=x; dropPos[i*3+1]=y; dropPos[i*3+2]=z; dropVel[i*3]=vx; dropVel[i*3+1]=vy; dropVel[i*3+2]=vz; dropLife[i]=life; dropSize[i]=size; dropActive = DROP_N; }
// schizzo: una corona di gocce che sale e ricade, più una nuvola di spruzzi fini
function splashFX(x, y, z, strength=1, spread=1){
  const n = Math.min(160, Math.round(26 + strength*40));
  for (let k=0;k<n;k++){ const a = Math.random()*Math.PI*2, r = Math.random()*spread*.35, sp = (1.2 + Math.random()*2.2)*Math.sqrt(strength)*spread;
    emitDrop(x + Math.cos(a)*r, y, z + Math.sin(a)*r, Math.cos(a)*sp*.55, (1.6 + Math.random()*3.2)*Math.sqrt(strength), Math.sin(a)*sp*.55, 1.6, rand(.7,1.6)*(.8+strength*.25)); }
  for (let k=0;k<Math.round(10*strength);k++) emitDrop(x+rand(-.3,.3)*spread, y, z+rand(-.3,.3)*spread, rand(-.6,.6), rand(.5,1.4), rand(-.6,.6), .9, rand(2.4,4)*(.8+strength*.3));
  ripple(x, z, .6 + strength*.5);
}
// gocciolio: acqua che cola da un oggetto appena uscito
function dripFX(x, y, z, n=3, spread=.2){ for (let k=0;k<n;k++) emitDrop(x+rand(-spread,spread), y+rand(-.05,.05), z+rand(-spread,spread), rand(-.1,.1), rand(-.6,0), rand(-.1,.1), 3, rand(.5,1)); }
function dropsUpdate(dt){
  if (!dropActive) return; let alive = 0; const wy = water.position.y;
  for (let i=0;i<DROP_N;i++){ if (dropLife[i] <= 0) continue; alive++;
    dropVel[i*3+1] -= 9.8*dt; dropPos[i*3] += dropVel[i*3]*dt; dropPos[i*3+1] += dropVel[i*3+1]*dt; dropPos[i*3+2] += dropVel[i*3+2]*dt; dropLife[i] -= dt*.6;
    if (dropPos[i*3+1] < wy && dropVel[i*3+1] < 0){ dropLife[i] = 0; if (Math.random() < .015) ripple(dropPos[i*3], dropPos[i*3+2], .15); } }
  dropGeo.attributes.position.needsUpdate = true; dropGeo.attributes.life.needsUpdate = true; dropGeo.attributes.size.needsUpdate = true; if (!alive) dropActive = 0;
  dropU.uLight.value = .35 + dayF*.65;
}
const sprayN = 40;
const sprayGeo = new THREE.BufferGeometry(); sprayGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(sprayN*3),3));
const spray = new THREE.Points(sprayGeo, new THREE.PointsMaterial({color:0x8a9590, size:.09, transparent:true, opacity:.7, depthWrite:false}));
spray.frustumCulled = false; scene.add(spray);
const sprayV = []; for (let i=0;i<sprayN;i++) sprayV.push(new THREE.Vector3()); let sprayLife = 0;
/* ---------- zattera (il posto di lavoro) ---------- */
const raft = new THREE.Group();
{
  const pg = new THREE.BoxGeometry(.48,.12,3.4);
  for (let i=0;i<6;i++){ const pl = mesh(pg, i%2?M.wood:M.woodDark, -1.25+i*.5, .3, rand(-.06,.06)); pl.rotation.y = rand(-.02,.02); raft.add(pl); }
  for (let z of [-1.3,0,1.3]) raft.add(mesh(new THREE.BoxGeometry(3,.1,.14), M.woodDark, 0,.2,z));
  for (let x of [-1.05,1.05]) for (let z of [-1.15,1.15]) raft.add(mesh(new THREE.CylinderGeometry(.33,.33,.85,10).rotateX(Math.PI/2), M.rust, x, .05, z));
  raft.add(mesh(new THREE.CylinderGeometry(.04,.05,1.9,6), M.woodDark, -1.05, 1.3, -1.3));
  raft.add(mesh(new THREE.BoxGeometry(.4,.04,.04), M.woodDark, -1.2, 2.25, -1.3));
  const lan = new THREE.Group(); lan.position.set(-1.36, 2.0, -1.3);
  lan.add(mesh(new THREE.CylinderGeometry(.075,.075,.2,8,1,true), new THREE.MeshStandardMaterial({color:0x000000, emissive:0xffa050, emissiveIntensity:.35, transparent:true, opacity:.55, side:THREE.DoubleSide}), 0,0,0));
  lan.add(mesh(new THREE.SphereGeometry(.028,8,6), M.lampGlass, 0,-.02,0));
  for (let k=0;k<4;k++){ const a=k/4*Math.PI*2; lan.add(mesh(new THREE.BoxGeometry(.012,.22,.012), M.rust, Math.cos(a)*.08,0,Math.sin(a)*.08)); }
  lan.add(mesh(new THREE.ConeGeometry(.1,.08,8), M.rust, 0,.14,0)); lan.add(mesh(new THREE.CylinderGeometry(.09,.09,.02,8), M.rust, 0,-.11,0));
  lan.add(mesh(new THREE.TorusGeometry(.03,.006,4,10), M.rust, 0,.2,0));
  lan.add(mesh(new THREE.CylinderGeometry(.004,.004,.08,3), M.rust, 0,.21+.02,0)); raft.add(lan); raft.userData.lantern = lan;
}
bakeStatic(raft, o=>o===raft.userData.lantern); scene.add(raft); raft.position.set(0,0,79.4);
const RAFT_MAX = 79.4, RAFT_MIN = 12.5;
const raftPos = new THREE.Vector3(0,0,RAFT_MAX), raftTmp = new THREE.Vector3();
// profilo del fondale lungo il percorso della zattera, reso monotono: la zattera galleggia sempre e scivola senza scatti
const RAFT_PROF = (()=>{ const N = 700, zs = [], gs = []; let gm = Infinity;
  for (let i=0;i<=N;i++){ const z = RAFT_MAX - (RAFT_MAX-RAFT_MIN)*i/N; let g = -Infinity; for (const x of [-1.6,0,1.6]) for (const dz of [-1.9,0,1.9]) g = Math.max(g, H(x, z+dz)); gm = Math.min(gm, g); zs.push(z); gs.push(gm - i*1e-4); }
  return {zs, gs}; })();
function raftTarget(wy){
  const {zs, gs} = RAFT_PROF, need = wy - .85;
  let z = RAFT_MIN; for (let i=0;i<gs.length;i++){ if (gs[i] <= need){ if (i === 0){ z = zs[0]; } else { const k = (need - gs[i-1])/(gs[i]-gs[i-1]); z = zs[i-1] + (zs[i]-zs[i-1])*clamp(k,0,1); } break; } }
  const y = Math.max(wy, (z <= RAFT_MIN + .01) ? H(0, RAFT_MIN) + .12 : wy);
  return raftTmp.set(0, y, z); }
const raftVel = new THREE.Vector3();
const lifeGeo = new THREE.BufferGeometry(); lifeGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(30*3),3));
const lifeline = new THREE.Line(lifeGeo, new THREE.LineBasicMaterial({color:0x4a3e30})); lifeline.frustumCulled = false; scene.add(lifeline);
const DOCK_HOOK = new THREE.Vector3(.6, 1.4, 82.05);
function doSpray(p){ const a = sprayGeo.attributes.position; for (let i=0;i<sprayN;i++){ a.setXYZ(i, p.x, p.y, p.z); sprayV[i].set(rand(-1.2,1.2), rand(1.5,3.8), rand(-1.2,1.2)); } sprayLife = 1.2; }

/* =====================================================================
   CAMERA / CONTROLLI
   ===================================================================== */
const CAM_BASE = new THREE.Vector3(0, 1.95, RAFT_MAX - .3); const camWakeStart = new THREE.Vector3();
let yaw = 0, pitch = -.18, yawT = 0, pitchT = -.18, shakeAmt = 0;
let drag = null;
canvas.addEventListener('pointerdown', e=>{ drag = {x:e.clientX, y:e.clientY, sx:e.clientX, sy:e.clientY, t:performance.now()}; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointermove', e=>{ if (!drag) return; const dx = e.clientX-drag.x, dy = e.clientY-drag.y; drag.x = e.clientX; drag.y = e.clientY;
  yawT = yawT - dx*.0055*SET.sens; pitchT = clamp(pitchT - dy*.0055*SET.sens*(SET.inv ? -1 : 1), -1.45, .45); });
canvas.addEventListener('pointerup', e=>{ if (!drag) return; const moved = Math.hypot(e.clientX-drag.sx, e.clientY-drag.sy); const dt = performance.now()-drag.t; drag = null;
  if (moved < 9 && dt < 400) tapWorld(e.clientX, e.clientY); });
const ray = new THREE.Raycaster(); const ndc = new THREE.Vector2();
function tapWorld(x,y){
  if (!running) return;
  ndc.set(x/innerWidth*2-1, -(y/innerHeight)*2+1); ray.setFromCamera(ndc, camera);
  const vis = loreObjs.filter(l => water.position.y < l.topY - .2 && l.obj.visible).map(l=>l.obj);
  const hits = ray.intersectObjects(vis, true);
  if (hits.length){ const id = hits[0].object.userData.lore; if (id) openLore(id); }
}

/* =====================================================================
   LORE / STORIA
   ===================================================================== */
const LORE = {
  shoes:{t:`Le scarpe`, x:`Decine di paia, allineate in file ordinate, con le punte rivolte verso il centro del lago. Come se qualcuno se le fosse tolte, con calma, prima di entrare in acqua.\n\nIn fondo alla fila c'è un paio della tua misura. Sono asciutte.`, hint:`dietro di te, a destra, sulla riva`, cost:3},
  bike:{t:`La bicicletta`, x:`Una bici da donna, il cestino ancora pieno di pane.\n\nIl pane è morbido. Settant'anni sott'acqua, e il pane è ancora morbido. E caldo.`, hint:`dietro di te, a sinistra`, cost:3},
  corpse:{t:`Il corpo`, x:`Un uomo a faccia in giù nel fango, sotto il pontile. Indossa una tuta da lavoro identica alla tua. Sul taschino è cucito un nome: T. FERRI.\n\nÈ il tuo nome.\n\nStringe un quaderno. La calligrafia è la tua.`, diary:`Giorno 1. La paga è buona. Troppo buona. Sesti mi ha dato tre regole e una sola spiegazione: "L'acqua di sotto vale di più perché è più vecchia."\nStanotte qualcosa ha bussato sotto il pontile. Tre colpi. Come chi chiede permesso.`, hint:`dietro di te, sotto il pontile`, cost:8},
  car:{t:`L'automobile`, x:`Una vecchia berlina col muso piantato nel fango. Al volante, uno scheletro con la cintura allacciata e le mani ancora sul volante.\n\nSul sedile del passeggero c'è un secchio. Identico al tuo.`, diary:`Giorno 6. Ho chiesto in paese del lago. La signora del bar ha smesso di asciugare il bicchiere e mi ha detto: "Il lago non c'era. Una notte del '53 è arrivato."\nPoi ha sorriso. Aveva i denti grigi come il fondo.`, hint:`a destra, nel fango`, cost:6},
  bell:{t:`Il campanile di Nàrrena`, x:`La punta del campanile buca l'acqua dopo settant'anni. Le pietre sono coperte di segni incisi a mano, migliaia, tutti uguali: un occhio chiuso.\n\nSull'architrave qualcuno ha scolpito:\n"CHE DORMA. CHE DORMA PER SEMPRE.\n— Don A. Sesti, 1953"`, diary:`Giorno 11. Le campane suonano di notte. Non c'è nessuno lassù, e le campane sono sott'acqua. Suonano lo stesso.\nCredo che suonino quando Lui sogna. E nel sogno, Nàrrena è ancora viva.`, hint:`a sinistra, in mezzo al lago`, cost:6},
  house:{t:`Le case`, x:`Le case del paese sommerso. Le porte sono sbarrate dall'interno.\n\nSui tavoli, piatti apparecchiati pieni di fango, posate allineate. Nessuno se n'è andato. Hanno chiuso le porte e hanno aspettato l'acqua seduti a cena.`, diary:`Giorno 19. Ho visto finestre accese laggiù. Gente a tavola, sott'acqua, che mangiava.\nMi hanno salutato con la mano, tutti insieme, nello stesso istante. Avevano gli occhi bianchi come l'interno dei secchi.`, hint:`a sinistra, attorno al campanile`, cost:8},
  statue:{t:`Le statue`, x:`Otto figure inginocchiate in cerchio, la fronte rivolta verso la voragine. Sembrano scolpite nella pietra.\n\nDa vicino, la pietra ha i pori. E le unghie.`, diary:`Giorno 24. Mi sono svegliato in piedi in fondo al pontile, un piede nel vuoto. Non ricordo di essermi alzato.\nNel secchio c'era una mia foto da bambino. Una foto che nessuno mi ha mai scattato.`, hint:`giù, verso il centro`, cost:10},
  monolith:{t:`I monoliti`, x:`Lastre di una pietra che non esiste in questa valle, più antiche della valle stessa.\n\nI segni incisi brillano quando non li guardi. Quando li guardi, si spostano.`, diary:`Giorno ?. Ho capito. Don Aurelio non ha allagato la valle per fare una diga. L'ha allagata per farLo dormire. L'acqua è una ninna nanna.\nIl catasto dice che il lago conteneva 150.000 litri. Io ne ho tolti di più. Non è acqua quella che vendiamo. È sonno. E noi glielo stiamo togliendo un secchio alla volta.`, hint:`giù, attorno alla voragine`, cost:10},
  ledge:{t:`La lanterna`, x:`Su una sporgenza della voragine: una lanterna ancora calda, una corda tagliata di netto e l'ultima pagina del quaderno.`, diary:`Se stai leggendo, hai i miei vestiti. E la mia faccia.\nNon so quante volte l'abbiamo già fatto. Il Compratore ci riassume sempre, perché solo chi ha già svuotato il lago sa come si fa.\nFermati prima del fondo. Io non ci sono riuscito. Tu, l'altra volta, nemmeno.`, hint:`nella voragine, sulla parete`, cost:12},
  knot:{t:`La forma`, x:`Una forma di pietra sospesa sopra la voragine, che ruota senza toccare niente.\n\nHa un dentro e un fuori, ma sono lo stesso lato. Guardarla troppo a lungo ti fa sanguinare il naso.`, hint:`sospesa sopra la voragine`, cost:12},
  eye:{t:`Il Dormiente`, x:`Non è il fondo del lago.\n\nÈ una palpebra.\n\nSotto, qualcosa si muove al ritmo del tuo respiro.`, hint:`il fondo`, cost:15}
};
LORE.colossus = {t:`Il Guardiano`, x:`Non era uno scoglio.\n\nSono quasi settanta metri di pietra scolpita, accovacciati sul fondo del lago, le ali chiuse sulla schiena, gli artigli stretti attorno a una sfera. La zattera, accanto a lui, è grande quanto una sua unghia.\n\nNon ha una faccia. Ha sette occhi, e sotto gli occhi tentacoli scolpiti uno per uno, che pendono sul petto. Alle caviglie, catene. Spezzate.\n\nLa pietra è più antica della valle. Quando c'era l'acqua, se ne vedeva solo la corona. I vecchi la chiamavano "la Roccia che ascolta".`, diary:`Giorno 9. Stanotte la testa del Guardiano guardava verso il pontile. Stamattina guarda verso di me.\nHo segnato la posizione con un sasso. Domani controllo.`, hint:`davanti a te, a destra: accovacciato nel lago`, cost:10};
const LORE_ORDER = ['shoes','bike','corpse','colossus','car','bell','house','statue','monolith','ledge','knot','eye'];
function openLore(id){
  const L = LORE[id]; if (!L) return;
  const first = !S.found.includes(id);
  if (first){ S.found.push(id); loseLuc(L.cost, `una scoperta`); whisperSfx(1.8,.18); }
  let x = L.x;
  if (id==='corpse' && S.cycle>1) x = `Due corpi a faccia in giù nel fango, sotto il pontile. Entrambi indossano la tua tuta. Entrambi hanno il tuo nome cucito sul taschino.\n\nUno dei due è ancora tiepido.`;
  $('cardTitle').textContent = L.t; $('cardText').textContent = x;
  const d = $('cardDiary'); if (L.diary){ d.textContent = L.diary; d.classList.remove('hidden'); } else d.classList.add('hidden');
  $('card').classList.remove('hidden'); $('card').classList.remove('cardIn'); void $('card').offsetWidth; $('card').classList.add('cardIn'); pageSfx();
}
$('cardClose').onclick = ()=> $('card').classList.add('hidden');

const STORY = [
  {d:1.2, f:()=> S.cycle>1 ? call(`DITTA SESTI`, `Bentornato, signor Ferri. Non si ricorda di noi. Va bene così, succede sempre. Cominci pure. Il secchio è dove l'ha lasciato.`) : call(`DITTA SESTI`, `Signor Ferri. Ottimo inizio. L'acqua di superficie vale poco, lo sa. Quella di sotto, invece... Scenda. Ci faccia scendere.`)},
  {d:2.2, f:()=> toast(`In mezzo al lago, davanti a te, sono spuntate cinque punte di roccia. Ieri non c'erano.`)},
  {d:9.5, f:()=> call(`RADIO VALLE NÀRRENA`, `...i pescatori anziani non hanno mai portato la barca al centro del lago. Dicono che lì sotto c'è uno scoglio che ha le spalle. E che se ti fermi sopra, ti ascolta respirare.`, true)},
  {d:16, f:()=> { toast(`La roccia in mezzo al lago ha un cappuccio. Sotto, al posto della faccia, pendono dei tentacoli di pietra.`, 'cosmic'); deepCallSfx(.4); }},
  {d:37, f:()=> { toast(`Il Guardiano ha delle mani. Ogni dito è lungo quanto la tua zattera. Tengono una sfera, e la sfera è calda.`, 'cosmic'); groanSfx(.3,4); }},
  {d:42, f:()=> call(`DITTA SESTI`, `L'ha visto bene, il Guardiano? Non è una statua di Lui, signor Ferri. Mio nonno diceva che è una statua di uno di noi. Di come saremo quando Lui si sveglierà.`)},
  {d:7, f:()=> call(`RADIO VALLE NÀRRENA`, `...ed è già esaurita in paese la nuova "Acqua Nàrrena, pura dal profondo" della Ditta Sesti. I clienti la descrivono dolce, con un retrogusto di ricordi. Molti dicono di averla sognata, la notte prima di comprarla.`, true)},
  {d:13, f:()=> call(`DITTA SESTI`, `Ha visto le scarpe, vero? Non le tocchi. Erano lì prima di lei. Saranno lì dopo di lei.`)},
  {d:16, f:()=> { bellSfx(); call(`RADIO VALLE NÀRRENA`, `Notizia straordinaria: dopo settant'anni riaffiora il campanile di Nàrrena, il paese sommerso nella notte del 12 novembre 1953. Gli abitanti, ufficialmente, furono evacuati. Ufficialmente.`, true); }},
  {d:27, f:()=> call(`RADIO VALLE NÀRRENA`, `Terza notte di sonnambulismo collettivo. Decine di residenti ritrovati all'alba sulle rive del lago, scalzi, rivolti verso l'acqua. Nessuno ricorda niente. Tutti dicono di aver sognato una campana.`, true)},
  {d:40, f:()=> call(`DITTA SESTI`, `La sente anche lei, la musica? Sotto l'acqua. Noi la sentiamo da quando siamo nati. Mio nonno diceva che è una ninna nanna. Diceva che qualcuno, prima o poi, avrebbe smesso di cantarla.`)},
  {d:48, f:()=> { toast(`Hai estratto più acqua di quanta il lago ne abbia mai contenuta.`, 'warn'); groanSfx(.35,5); }},
  {d:56, f:()=> call(`RADIO VALLE NÀRRENA`, `...un professore dell'Università di Padova ha scritto al sindaco. Sostiene che "Nàrrena" non sia un toponimo: non compare in nessun catasto prima del 1700. Era una parola che i bambini della valle ripetevano nel sonno, tutti uguale, tutti nella stessa notte. I grandi la scrissero sulle mappe, perché smettessero.`, true)},
  {d:63, f:()=> call(`RADIO VALLE NÀRRENA`, `...il sindaco invita la popolazione a non consumare... (interferenza) ...dorme. Dorme. Dorme. Si sta girando nel letto. Dorme.`, true)},
  {d:72, f:()=> call(`IL TUO NUMERO`, `(È la tua voce.) Non arrivare in fondo. L'altra volta sono arrivato in fondo. Ascoltami, ti prego. Sono sotto il pontile. Sono sempre stato sotto il pontile.`)},
  {d:80, f:()=> { deepCallSfx(.7); toast(zalgo(`Le stelle stanotte non sono al loro posto.`, 2), 'cosmic'); }},
  {d:88, f:()=> call(`DITTA SESTI`, `Le statue non sono statue, signor Ferri. Sono la prima squadra. Mio nonno li ha pagati bene. Lei sarà pagato meglio.`)},
  {d:102, f:()=> call(`RADIO VALLE NÀRRENA`, `(Nessuno parla. Si sente acqua che gocciola, e tante persone che respirano insieme, vicinissime al microfono.) Il paese è vuoto. Sono tutti al lago. Ti guardano lavorare.`, true)},
  {d:113, f:()=> call(`DITTA SESTI`, `Ancora poco. Si sta svegliando per lei, lo sa? La riconosce. Respira quando lei respira. Non si fermi proprio adesso.`)},
  {d:96, f:()=> call(`QUADERNO DI DON AURELIO`, `(Una pagina fradicia, incollata al fondo del secchio.) «Non è morto ciò che dorme sotto l'acqua. Dorme, e nel sonno ci pensa. Noi esistiamo finché Lui ci sogna. Ho dato da bere al suo sonno un paese intero, perché non si svegliasse. Che Dio mi perdoni: non era il nostro Dio a guardarmi, mentre aprivo le chiuse.»`)},
  {d:121, f:()=> { toast(`Il fondo ti guarda.`, 'warn'); groanSfx(.7,6); creatureSfx({ kind:'call', far:.05, vol:1 }); }},
  {d:6.5, f:()=> farCall(.9)},
  {d:6, f:()=> { S.sonar = 1; call(`DITTA SESTI`, `Signor Ferri, le abbiamo montato un ecoscandaglio sulla zattera. Guardi lo schermo verde. Se vede qualcosa che risale dal fondo, spenga la torcia. Spenga i fari. Tutto. E aspetti al buio che sia passato.`); }},
  {d:.6, f:()=> startDrift('hat')},
  {d:9, f:()=> startEv('grip')},
  {d:26, f:()=> setTimeout(()=>{ if (running && !ending && gazeOK()) startEv('gaze'); }, 4000)}
];

/* =====================================================================
   UI
   ===================================================================== */
// macchina da scrivere con ritmo parlato: pause su virgole e punti
function typeText(el, text, done, o={}){ const speed = o.speed || 34; let i = 0, tm = null, fin = false; el.textContent = '';
  const end = ()=>{ if (fin) return; fin = true; clearTimeout(tm); el.textContent = text; done && done(); };
  const step = ()=>{ if (fin) return; const ch = text[i++]; el.textContent += ch; if (i >= text.length){ end(); return; }
    let d = speed; if (/[,;:]/.test(ch)) d = speed*6; else if (/[.?!]/.test(ch) && text[i] !== '.') d = speed*14; else if (ch === '\n') d = speed*10; else if (ch === '…') d = speed*16;
    if (o.onSentence && /[.?!]/.test(ch) && text[i] === ' ') setTimeout(o.onSentence, d*.6);
    tm = setTimeout(step, d); };
  o.onSentence && o.onSentence(); tm = setTimeout(step, o.delay || 0); return end; }
// i messaggi di soldi ('money') non scacciano mai quelli che raccontano: se la colonna è piena se ne vanno prima loro, o non entrano
function toast(msg, cls=''){ const box = $('toasts'), money = cls === 'money';
  if (box.children.length >= 3){ const m = box.querySelector('.toast.money'); if (m) m.remove(); else if (money) return; }
  const el = document.createElement('div'); el.className = 'toast '+cls; box.appendChild(el); typeText(el, msg, null, {speed:16}); while (box.children.length>3) box.firstChild.remove(); setTimeout(()=>{ el.style.transition='opacity 1s'; el.style.opacity=0; setTimeout(()=>el.remove(),1000); }, 5200 + msg.length*24); }
/* ---------- lucidità: ogni perdita e ogni recupero ha un motivo, e lo vedi ---------- */
let lucPopN = 0;
function lucPop(txt, good){ const el = document.createElement('div'); el.className = 'lp ' + (good ? 'up' : 'dn'); el.textContent = txt; $('lucPop').appendChild(el);
  while ($('lucPop').children.length > 3) $('lucPop').firstChild.remove(); setTimeout(()=>el.remove(), 3800); }
// calibrata: le perdite pesano la metà, e meno ancora quando sei già al limite
function loseLuc(x, why='', raw=false){ if (!(x > 0)) return; if (!raw) x *= CHARMS[S.charm||0].k * .62 * (.45 + .55*S.luc/100) * (phase < 1 ? .7 : 1); S.luc = Math.max(0, S.luc - x); if (x >= 1) lucPop(`−${Math.round(x)} · ${why}`, false);
  if (!S.tipLuc && S.luc < 85){ S.tipLuc = 1; setTimeout(()=>toast(`La tua LUCIDITÀ è scesa. Le cose che vedi e senti la consumano. Tocca RESPIRA o guarda il DIARIO › MENTE per capire come recuperarla.`, 'lore'), 1500); } }
// più scendi, meno puoi tornare lucido: amuleti e lumini rallentano la caduta ma il fondo pesa comunque (100% fino a 8 m, 38% a 128 m)
const lucCap = ()=> 100 - 62*Math.pow(clamp((S.d - 8)/120, 0, 1), 1.1);
function gainLuc(x, why=''){ if (!(x > 0)) return; S.luc = Math.min(Math.max(S.luc, lucCap()), S.luc + x); if (x >= 1) lucPop(`+${Math.round(x)} · ${why}`, true); }
let subT = 0; const LUCWHY = { dn:[], up:[], net:0 }; let breathT = 0, breathCd = 0;
function sub(text, dur=3, cls=''){ const s = $('subs'); s.className = cls; s.textContent = text; s.style.opacity = 1; subT = Math.max(dur, 1.8 + text.length*.055); }
const callQ = []; let inCall = false, callTimer = null;
// telefonate e radio con tempi da cinema: squilli veri, linea vuota, voce con pause, riattacca
let callSt = null;
function call(who, text, radio=false){ callQ.push({who,text,radio}); if (!inCall){ inCall = true; setTimeout(nextCall, 600); } }
function callBtnText(t){ $('callBtn').textContent = t; }
function nextCall(){
  const c = callQ.shift(); if (!c){ inCall = false; callSt = null; return; } inCall = true;
  $('callWho').textContent = c.who; $('callText').textContent = ''; $('call').classList.remove('hidden'); $('call').classList.add('ringing');
  if (c.radio){ callSt = { c, phase:'tune' }; $('callState').textContent = 'LA RADIO SI È ACCESA DA SOLA'; callBtnText('SPEGNI'); staticSfx(1.8); setTimeout(()=>{ if (callSt && callSt.c === c) speak(c); }, 1900); return; }
  callSt = { c, phase:'ring', n:0 }; $('callState').textContent = 'IL TELEFONO DEL CAPANNO SQUILLA'; callBtnText('RISPONDI');
  const ring = ()=>{ if (!callSt || callSt.c !== c || callSt.phase !== 'ring') return; ringSfx(); callSt.n++; if (callSt.n >= 3){ callSt.tm = setTimeout(()=>answer(c, true), 3200); } else callSt.tm = setTimeout(ring, 4200); };
  ring();
}
function answer(c, auto){ if (!callSt || callSt.c !== c || callSt.phase !== 'ring') return; clearTimeout(callSt.tm); callSt.phase = 'line'; play('click', {vol:.5, rev:.05});
  $('call').classList.remove('ringing'); $('callState').textContent = auto ? 'LA CORNETTA SI È ALZATA DA SOLA' : 'IN LINEA'; callBtnText('…'); staticSfx(1.2); setTimeout(()=>{ if (callSt && callSt.c === c) speak(c); }, 1500); }
function speak(c){ callSt.phase = 'speak'; $('call').classList.remove('ringing'); if (c.radio) $('callState').textContent = 'RADIO · 98.6 FM'; callBtnText('▸▸');
  const r = /SESTI/.test(c.who) ? .82 : /NUMERO/.test(c.who) ? 1.12 : 1;
  callSt.end = typeText($('callText'), c.text, ()=>{ if (callSt && callSt.c === c){ callSt.phase = 'done'; callBtnText(c.radio ? 'SPEGNI' : 'RIATTACCA'); } },
    { speed: c.radio ? 30 : 36, delay:300, onSentence: ()=>{ if (c.radio){ if (Math.random()<.5) staticSfx(.3); voiceSfx(1.05); } else if (!/^\(/.test(c.text)) voiceSfx(r); } }); }
function hangUp(){ const c = callSt && callSt.c; play('click', {vol:.45, rev:.05}); if (c && c.radio) staticSfx(.25); $('call').classList.add('hidden'); callSt = null; setTimeout(nextCall, 2600); }
$('callBtn').onclick = ()=>{ if (!callSt) return; if (callSt.phase === 'ring') answer(callSt.c, false); else if (callSt.phase === 'speak'){ callSt.end && callSt.end(); } else if (callSt.phase === 'done' || callSt.phase === 'tune') hangUp(); };
let promptCb = null;
function promptAsk(text, a, b, cb){ promptCb = cb; $('promptA').textContent = a; $('promptB').textContent = b; $('promptText').textContent = ''; $('prompt').classList.add('waiting');
  setTimeout(()=>{ heartSfx(.5); $('prompt').classList.remove('hidden'); typeText($('promptText'), text, ()=>{ setTimeout(()=>$('prompt').classList.remove('waiting'), 350); }, {speed:26, delay:250}); }, 700); }
$('promptA').onclick = ()=>{ $('prompt').classList.add('hidden'); promptCb && promptCb(true); };
$('promptB').onclick = ()=>{ $('prompt').classList.add('hidden'); promptCb && promptCb(false); };
document.querySelectorAll('[data-close]').forEach(b=> b.onclick = ()=>{ $(b.dataset.close).classList.add('hidden');
  if (b.dataset.close === 'shop' && machineShow){ const m = machineShow; machineShow = null; const p = new THREE.Vector3(); m.o.getWorldPosition(p); p.y += m.y || 1; setTimeout(()=>{ attend(p, .9, 2.4); creakSfx(); setTimeout(()=>{ clankSfx(); toast(`Montata: ${m.t}. Lavora da sola.`); }, 700); }, 200); } });

const pumpCost = i => PUMPS[i].c * Math.pow(1.2, S.pumps[i]);
const GLITCH_NAMES = [`Ti vede`,`Scendi`,`Non contare`,`È sveglio`,`Respira`,`Tobia`,`Sotto il pontile`,`Riempi il secchio`];
let glitchT = 0;
function shopItems(){
  const it = [];
  const nb = BUCKETS[S.bucket+1];
  if (nb && (!nb.org || phase>=2)) it.push({id:'bucket', cat:0, n:nb.n, d: nb.org ? `${nb.s} secchi per calata. Si riempie da solo. Non guardarci dentro. (−lucidità)` : `${nb.s} secchi per calata (${nb.s*10} L)`, c:nb.c, org:nb.org, buy:()=>{ S.bucket++; }});
  const np = PULLS[S.pull+1];
  if (np) it.push({id:'pull', cat:0, n:np.n, d:`Cali e tiri su il secchio più in fretta`, c:np.c, buy:()=>{ S.pull++; }});
  const nt = TANKS[S.tankLv+1];
  if (nt) it.push({id:'tank', cat:2, n:`Cisterna da ${fmt(nt.cap)} L`, d:`Più acqua prima di dover vendere`, c:nt.c, buy:()=>{ S.tankLv++; }});
  const nc = CONTRACTS[S.contract+1];
  if (nc && (!nc.org || phase>=2)) it.push({id:'contract', cat:2, n:nc.n, d: nc.org ? `Il Compratore paga più del valore. Si firma con quello che hai. (−15 lucidità)` : `Il Compratore ritira l'acqua da solo al ${Math.round(nc.p*100)}% del prezzo`, c:nc.c, org:nc.org, buy:()=>{ S.contract++; if (nc.org){ loseLuc(15, `contratto di sangue`, true); groanSfx(.5,3); } }});
  PUMPS.forEach((p,i)=>{ if ((p.ph||0) <= phase) it.push({id:'pump'+i, cat:3, n:p.n + (S.pumps[i]?` (${S.pumps[i]})`:''), d:`+${fmt(p.r)} L/s · ${p.d}`, c:pumpCost(i), org:p.org, buy:()=>{ S.pumps[i]++; rebuildPipes(true); creakSfx(); }}); });
  const nto = TORCHES[S.torch+1];
  if (nto) it.push({id:'torch', cat:4, n:nto.n, d:`Illumina più a fondo. Sei sicuro di voler vedere?`, c:nto.c, buy:()=>{ S.torch++; }});
  if (S.lumino < 3) it.push({id:'lumino', cat:4, n:`Lumino votivo ${['I','II','III'][S.lumino]}`, d:`Una fiammella per i morti del paese. La lucidità torna più in fretta.`, c:LUMINI[S.lumino+1], buy:()=>{ S.lumino++; }});
  const nf = FILTERS[S.filter+1]; if (nf && (!nf.org || phase>=2)) it.push({id:'filter', cat:2, n:nf.n, d: nf.org ? `L'acqua esce limpida come un occhio. Il Compratore paga ×${nf.m}. (−lucidità)` : `L'acqua vale ×${nf.m} al litro`, c:nf.c, org:nf.org, buy:()=>{ S.filter++; }});
  const nv = VANS[S.van+1]; if (nv && !S.contract) it.push({id:'van', cat:2, n:nv.n, d:`Quando la cisterna è piena, vende da solo al ${Math.round(nv.p*100)}% del prezzo`, c:nv.c, buy:()=>{ S.van++; }});
  const nh = HELPERS[S.helper+1]; if (nh && (!nh.org || phase>=2)) it.push({id:'helper', cat:1, n:nh.n, d: nh.org ? `Non mangiano, non dormono, non parlano. Calano secchi pieni tutta la notte. (−lucidità)` : `${nh.k > 1 ? nh.k + ' secchi' : 'Un secchio'} ogni ${nh.iv} s, da soli, anche mentre fai altro. ${S.helper ? '' : 'Non dice da dove viene.'}`, c:nh.c, org:nh.org, buy:()=>{ S.helper++; layoutHelpers(); }});
  const nn = NETS[S.net+1]; if (nn) it.push({id:'net', cat:0, n:nn.n, d:`Il secchio trattiene più cose del fondo (×${nn.f}). Il Compratore paga anche quelle.`, c:nn.c, buy:()=>{ S.net++; }});
  const nno = NORIA[(S.noria||0)+1]; if (nno && (!nno.org || phase>=2)) it.push({id:'noria', cat:5, n:nno.n, d: nno.org ? `Gira anche quando nessuno la spinge. +${fmt(nno.r)} L/s. (−lucidità)` : `Sul fianco della zattera, mezza nell'acqua. Gira da sola: +${fmt(nno.r)} L/s`, c:nno.c, org:nno.org, buy:()=>{ S.noria = (S.noria||0) + 1; layoutMachines(); machineShow = {o:noria, t:nno.n}; }});
  const ncr = CRANES[(S.crane||0)+1]; if (ncr) it.push({id:'crane', cat:5, n:ncr.n, d:`Ogni ${ncr.iv} s cala la benna nel lago e la svuota in cisterna: ${fmt(ncr.L)} L a calata`, c:ncr.c, buy:()=>{ S.crane = (S.crane||0) + 1; layoutMachines(); machineShow = {o:crane, t:ncr.n}; }});
  const nfl = FLOODS[(S.flood||0)+1]; if (nfl) it.push({id:'flood', cat:5, n:nfl.n, d:`Luce fredda sulla prua: di notte perdi meno lucidità, e vedi cosa si avvicina`, c:nfl.c, buy:()=>{ S.flood = (S.flood||0) + 1; layoutMachines(); machineShow = {o:flood, t:nfl.n, y:2.6}; }});
  if ((S.hull ?? 100) < 99){ const dmg = 100 - S.hull, c = Math.ceil(dmg*(6 + S.d*S.d*.5)); it.push({id:'repair', cat:4, n:`Riparare la zattera (${Math.round(S.hull)}%)`, d:`Assi nuove, chiodi e catrame. La zattera torna a galla e smette di imbarcare acqua.`, c, buy:()=>{ S.hull = 100; clankSfx(); }}); }
  if (!S.sonar && S.d >= 3) it.push({id:'sonar', cat:4, n:`Ecoscandaglio`, d:`Uno schermo verde che vede sotto la zattera. Ti avvisa quando qualcosa risale.`, c:120, buy:()=>{ S.sonar = 1; }});
  const nk = CHARMS[S.charm+1]; if (nk) it.push({id:'charm', cat:4, n:nk.n, d:`Perdi il ${Math.round((1-nk.k)*100)}% di lucidità in meno`, c:nk.c, buy:()=>{ S.charm++; }});
  return it;
}
function buildShop(){
  const CATS = ['IL SECCHIO','AIUTANTI','ACQUA E VENDITA','POMPE','PROTEZIONE','MACCHINE'], its = shopItems().map((x,k)=>({...x, k})).sort((a,b)=>(a.cat-b.cat) || (a.k-b.k)); let lastC = -1;
  $('shopList').innerHTML = its.map(i=>(i.cat !== lastC ? `<div class="shcat">${CATS[lastC = i.cat]}</div>` : '') + `<div class="item ${i.org?'org':''}" data-row="${i.id}"><div class="info"><div class="nm">${i.n}</div><div class="ds">${i.d}</div></div><button data-buy="${i.id}">€ ${fmt(i.c)}</button></div>`).join('');
  updateShop();
}
function updateShop(){
  const items = shopItems(); const g = glitchT > 0;
  $('shopList').querySelectorAll('[data-buy]').forEach(b=>{ const i = items.find(x=>x.id===b.dataset.buy); if (!i) return; const dis = S.money < i.c, t = '€ ' + (g ? glitchStr(fmt(i.c)) : fmt(i.c)); if (b.disabled !== dis) b.disabled = dis; if (b.textContent !== t) b.textContent = t;
    const nm = b.parentElement.querySelector('.nm'), n = g && Math.random()<.5 ? pick(GLITCH_NAMES) : i.n; if (nm.textContent !== n) nm.textContent = n; });
}
$('shopList').addEventListener('click', e=>{ const b = e.target.closest('[data-buy]'); if (!b) return; const i = shopItems().find(x=>x.id===b.dataset.buy); if (!i || S.money < i.c) return; S.money -= i.c; i.buy(); coinSfx(); buildShop(); });
$('shopBtn').onclick = ()=>{ $('diary').classList.add('hidden'); buildShop(); $('shop').classList.remove('hidden'); };
let diaryTab = 'lore';
function renderDiary(){
  const over = S.total > CATASTO;
  $('diaryCount').textContent = over && Math.random()<.5 ? `NON CONTARE L'ACQUA` : `Litri estratti: ${fmt(S.total)} · Volume del lago a catasto: ${fmt(CATASTO)}`;
  document.querySelectorAll('.tabs button').forEach(b=>b.classList.toggle('on', b.dataset.tab===diaryTab));
  const L = $('diaryList');
  if (diaryTab==='lore'){
    const list = LORE_ORDER.filter(id=>S.found.includes(id));
    const pend = LORE_ORDER.filter(id=>S.revealed.includes(id) && !S.found.includes(id));
    L.innerHTML = (list.length ? list.map(id=>`<div class="dentry" data-lore="${id}">› ${LORE[id].t}</div>`).join('') : `<div class="dentry" style="opacity:.6">Niente, per ora. Quando l'acqua scende, qualcosa riaffiora. Tocca quello che vedi nel fango.</div>`)
      + pend.map(id=>`<div class="dentry" style="opacity:.55">? Qualcosa è riaffiorato: ${LORE[id].hint}. Segui il segno ◈.</div>`).join('')
      + `<div class="dentry" style="opacity:.35">${S.found.length} / ${LORE_ORDER.length}</div>`;
  } else if (diaryTab==='relic'){
    L.innerHTML = S.relics.length ? `<div class="relics">${S.relics.map(i=>`<div data-relic="${i}"><canvas width="120" height="120"></canvas>${FINDS[i][1].split('.')[0]}.</div>`).join('')}</div>` : `<div class="dentry" style="opacity:.6">Il secchio a volte non torna su solo con l'acqua.</div>`;
    L.querySelectorAll('[data-relic]').forEach(d=> drawRelic(d.querySelector('canvas'), FINDS[+d.dataset.relic][2], +d.dataset.relic+1));
  } else if (diaryTab==='mind'){
    L.innerHTML = `<div class="dentry" style="font-family:'Cormorant Garamond',serif;font-size:16px">La LUCIDITÀ è quanto riesci a restare te stesso. Se arriva a zero perdi i sensi: ti svegli all'alba, con meno soldi, e il lago è risalito.</div>
      <div class="dentry" style="color:#c98a7a">▼ La consumano: la notte · la torcia spenta · scendere più a fondo · le scoperte e le cose trovate nel secchio · guardare le apparizioni troppo a lungo · rispondere a chi ti chiama · scendere dalla zattera · le macchine di carne e il secchio che respira.</div>
      <div class="dentry" style="color:#9fc28f">▲ La restituiscono: la luce del giorno · stare vicino alla lanterna accesa · RESPIRA (sotto la lucidità, ogni 35 secondi) · i lumini votivi e i fari dell'officina · non rispondere, non bussare · ricacciare giù le cose illuminandole con la torcia.</div>
      <div class="dentry" style="opacity:.7">Adesso: ${LUCWHY.net >= 0 ? '▲ ' + (LUCWHY.up.join(' · ') || 'stabile') : '▼ ' + (LUCWHY.dn.join(' · ') || '')}</div>`;
  } else {
    L.innerHTML = `<div class="dentry">I. Non scendere mai dalla zattera dopo il tramonto.</div><div class="dentry">II. Se dall'acqua qualcuno ti chiama per nome, non rispondere.</div><div class="dentry">III. Non contare l'acqua.</div>`
      + (S.found.includes('ledge') ? `<div class="dentry" style="color:#c98a7a">IV. Fermati prima del fondo.</div>` : '')
      + (phase>=3 ? `<div class="dentry" style="color:#8fb27a">${zalgo('V. Non guardarLo mentre dorme.',2)}</div>` : '');
  }
}
document.querySelectorAll('.tabs button').forEach(b=> b.onclick = ()=>{ diaryTab = b.dataset.tab; renderDiary(); });
$('diaryBtn').onclick = ()=>{
  $('shop').classList.add('hidden'); $('diaryDot').classList.add('hidden');
  if (S.total > CATASTO){ loseLuc(2, `hai contato l'acqua`); }
  renderDiary(); $('diary').classList.remove('hidden');
};
$('diaryList').addEventListener('click', e=>{ const d = e.target.closest('[data-lore]'); if (d) openLore(d.dataset.lore); });
$('breathBtn').addEventListener('pointerdown', e=>{ e.stopPropagation(); if (breathCd > 0 || breathT > 0 || !running || ending) return; initAudio();
  breathT = 6; breathCd = 35; holdBucket = false; $('breathOv').classList.remove('hidden'); breathSfx(true, 2.6, .25); setTimeout(()=>breathSfx(false, 2.6, .22), 3000);
  const before = S.luc; setTimeout(()=>{ $('breathOv').classList.add('hidden'); lucPop(`+${Math.round(S.luc - before)} · hai respirato`, true); }, 6000); });
$('floodBtn').onclick = ()=>{ S.floodOn = S.floodOn === false; $('floodBtn').classList.toggle('off', S.floodOn === false); play('click', {vol:.55, rev:.05}); clankSfx(); };
$('torchBtn').onclick = ()=>{ S.torchOn = !S.torchOn; $('torchBtn').classList.toggle('off', !S.torchOn); play('click', {vol:.5, rev:.05}); };
$('sellBtn').onclick = ()=>{ if (S.tank < 1) return; const v = S.tank * priceNow(); S.money += v; S.tank = 0; coinSfx(); toast(`Venduti al Compratore: € ${fmt(v)}`, 'money'); };
let holdBucket = false;
$('bucketBtn').addEventListener('pointerdown', e=>{ e.preventDefault(); initAudio(); if (gripTap()) return; holdBucket = true; throwBucket(); });
['pointerup','pointerleave','pointercancel'].forEach(ev=> $('bucketBtn').addEventListener(ev, ()=> holdBucket = false));

/* =====================================================================
   MECCANICHE
   ===================================================================== */
const tankCap = () => TANKS[S.tankLv].cap;
const handPos = new THREE.Vector3(), handRope = new THREE.Vector3();
const FINDS = [
  // fase 0: il paese, la vita di prima
  [0,`Un sasso liscio, caldo come una mano.`,'stone'],[0,`Una scarpa da bambino. Ha i lacci annodati.`,'shoe'],[0,`Capelli. Lunghi, aggrovigliati attorno al manico.`,'hair'],
  [0,`Un bottone d'osso, con ancora attaccato un filo rosso.`,'button'],[0,`Un cucchiaio d'argento. Sul manico: "Albergo Nàrrena".`,'spoon'],[0,`Un pettine di tartaruga. Tra i denti, capelli grigi.`,'comb'],
  [0,`Cento lire del 1953. Sul retro qualcuno ha scritto a matita: "per la barca".`,'lire'],[0,`Una forcina per capelli, piegata a forma di occhio.`,'hairpin'],[0,`Un soldatino di latta senza testa.`,'soldier'],
  [0,`Un biglietto della corriera Nàrrena–Valle, 12 novembre 1953. Mai obliterato.`,'ticket'],[0,`Una candela di cera nera. Lo stoppino è bagnato, ma odora di bruciato.`,'candle'],[0,`Un amo da pesca enorme, grande come una mano.`,'hook'],
  // fase 1: il lutto, le cose dei morti
  [1,`Un dente umano. Un molare, con un'otturazione d'oro.`,'tooth'],[1,`Una fede. Dentro c'è inciso "per sempre — 1953".`,'ring'],[1,`Una pagina di messale, fradicia. Le parole sono cancellate tranne una: DORMI.`,'page'],
  [1,`L'acqua è tiepida. Troppo tiepida. Come se qualcuno ci avesse respirato dentro.`,'warm'],[1,`Una conchiglia a spirale. Gira nel verso sbagliato, e continua a girare.`,'shell'],
  [1,`Un rosario. I grani non sono di legno: sono denti di latte.`,'rosary'],[1,`Un paio di occhiali tondi. Le lenti sono graffiate dall'interno.`,'glasses'],[1,`La testa di una bambola di porcellana. Ha gli occhi chiusi. Quando la giri, li apre.`,'doll'],
  [1,`Una lettera chiusa, indirizzata a "chi verrà a svuotare". La busta è asciutta.`,'letter'],[1,`Un orologio da taschino fermo alle 3:07. Ticchetta, ma le lancette non si muovono.`,'watch'],
  [1,`Una medaglietta di San Cristoforo. Il santo, invece del bambino, porta sulle spalle qualcosa con troppe braccia.`,'medal'],[1,`Un'armonica a bocca. Quando ci soffia il vento, suona la ninna nanna.`,'harmonica'],
  [1,`Una dentiera completa. Si apre e si chiude da sola, piano, come chi mastica nel sonno.`,'dentures'],[1,`Un nastro rosso legato attorno a una ciocca di capelli bianchi.`,'ribbon'],
  // fase 2: il corpo, l'impossibile che comincia
  [2,`Un occhio. Ha sbattuto la palpebra.`,'eye'],[2,`Una tua foto da bambino. Non te l'hanno mai scattata.`,'photo'],[2,`Un'unghia lunga quattro dita.`,'nail'],[2,`Il secchio torna più pesante. Dentro c'è solo acqua. L'acqua respira.`,'breath'],
  [2,`L'acqua riflette un cielo pieno di stelle che non conosci. Sopra di te è tutto coperto.`,'stars'],[2,`Un dito. Indossa il tuo anello.`,'finger'],[2,`Una biglia di vetro. Dentro, una pupilla ti segue.`,'marble'],
  [2,`Un crocifisso di ferro piegato a spirale, come se l'avessero torto con le mani.`,'crucifix'],[2,`Una barchetta di carta. È fatta con una pagina del tuo quaderno. La calligrafia è la tua.`,'boat'],
  [2,`Una scaglia grande come un piatto. È calda, e sotto c'è un battito.`,'scale'],[2,`Un campanello d'ottone, di quelli da porta. Ha suonato una volta, nel secchio, mentre saliva.`,'bellsmall'],
  [2,`Un frammento di specchio. Riflette la zattera, ma tu non ci sei.`,'mirror'],[2,`Un uovo nero, liscio come il vetro. Qualcosa dentro si è girato.`,'egg'],
  [2,`Denti. Decine di denti, tutti con la stessa otturazione d'oro.`,'teeth'],
  // fase 3: il sogno di Lui
  [3,`Una mano stringeva il bordo del secchio. L'hai vista lasciare la presa.`,'hand'],[3,`Acqua nera, densa, che scivola verso l'alto invece che verso il basso.`,'black'],[3,`Le tue chiavi di casa. Le hai in tasca. Anche queste sono tue.`,'keys'],
  [3,`Un frammento di pietra verde. Ha più spigoli di quanti riesci a contarne. Ogni volta che li conti, sono di più.`,'crystal'],[3,`Un pesce senza occhi. Ha una faccia. È quella della signora del bar.`,'fish'],
  [3,`La punta di un tentacolo, recisa. Si attorciglia attorno al tuo dito e non vuole lasciarlo.`,'tentacle'],[3,`Un'altra lettera per "chi verrà a svuotare". Questa volta è scritta da te, domani.`,'letter'],
  [3,`Un occhio grande come un pugno. La pupilla è a forma di serratura.`,'eye'],[3,`Una conchiglia che, all'orecchio, non fa il rumore del mare. Fa il rumore del tuo respiro.`,'shell'],
  [3,`Un sasso con inciso il simbolo del campanile: un occhio chiuso. Mentre lo guardi, si apre.`,'stone'],[3,`Una medaglietta da militare con il tuo nome. Data di morte: domani.`,'medal'],
  [3,`Un cuore di pietra verde. Batte, lentissimo, una volta al minuto.`,'crystal'],
  // fase 4: il risveglio
  [4,`Niente acqua. Solo il rumore di qualcuno che respira dal fondo del secchio.`,'none'],[4,`Sul fondo c'è scritto, con le unghie: QUASI.`,'quasi'],[4,`Il secchio torna vuoto, ma pesa come un uomo. È caldo. Batte.`,'heart'],
  [4,`Una ciglia lunga come un remo. È caduta da un occhio che si sta aprendo.`,'nail'],[4,`Il secchio è pieno di occhi piccoli come chicchi. Si chiudono tutti insieme quando li guardi.`,'marble'],
  [4,`Una pagina con un solo disegno: la zattera, vista dal basso. C'è qualcuno seduto. Sei tu.`,'page'],[4,`Un dente grande come il secchio. Non è umano. Non è di nessun animale che conosci.`,'tooth'],
  [4,`Dentro il secchio c'è il cielo notturno. E le stelle si muovono.`,'stars'],[4,`La tua scarpa. Quella che hai ai piedi. Abbassi lo sguardo: sei scalzo.`,'shoe']
];
/* ---------- illustrazioni dei reperti (disegnate al volo) ---------- */
function drawRelic(cv, icon, seed=1){
  const X = cv.getContext('2d'), W = cv.width, c = W/2; let sd = seed*9301+49297; const rr = ()=> (sd = (sd*9301+49297)%233280)/233280;
  X.clearRect(0,0,W,W);
  // il secchio visto dall'alto
  let g = X.createRadialGradient(c,c,W*.3,c,c,W*.5); g.addColorStop(0,'#2a2924'); g.addColorStop(.85,'#6a665a'); g.addColorStop(1,'#1a1916');
  X.fillStyle = g; X.beginPath(); X.arc(c,c,W*.5,0,7); X.fill();
  g = X.createRadialGradient(c*.85,c*.8,0,c,c,W*.42); g.addColorStop(0, icon==='black'?'#020202':'#16201c'); g.addColorStop(1, icon==='black'?'#000':'#050807');
  X.fillStyle = g; X.beginPath(); X.arc(c,c,W*.42,0,7); X.fill();
  X.strokeStyle = 'rgba(160,190,175,.12)'; X.lineWidth = 1.5; for (let i=0;i<3;i++){ X.beginPath(); X.ellipse(c+(rr()-.5)*30, c+(rr()-.5)*30, W*(.1+rr()*.2), W*(.05+rr()*.1), rr()*3, 0, 7); X.stroke(); }
  X.save(); X.translate(c,c); X.lineCap = 'round'; X.lineJoin = 'round';
  const s = W/220;  X.scale(s,s);
  const pale = '#c9c4b0', bone = '#ddd6c0';
  const F = {
    stone(){ g = X.createRadialGradient(-12,-12,4,0,0,40); g.addColorStop(0,'#8c8a80'); g.addColorStop(1,'#33322d'); X.fillStyle=g; X.beginPath(); X.ellipse(0,0,42,30,.4,0,7); X.fill(); X.fillStyle='rgba(255,140,60,.15)'; X.beginPath(); X.ellipse(0,0,46,34,.4,0,7); X.fill(); },
    shoe(){ X.rotate(-.4); X.fillStyle='#6a1c18'; X.beginPath(); X.moveTo(-45,15); X.quadraticCurveTo(-48,-15,-25,-18); X.lineTo(20,-14); X.quadraticCurveTo(50,-10,48,10); X.quadraticCurveTo(45,22,-40,22); X.fill(); X.fillStyle='#e8e0cc'; X.fillRect(-48,18,96,6); X.strokeStyle='#e8e0cc'; X.lineWidth=2; for(let i=0;i<4;i++){ X.beginPath(); X.moveTo(-15+i*8,-16); X.lineTo(-9+i*8,-4); X.stroke(); } },
    hair(){ X.strokeStyle='#1a120c'; X.lineWidth=1.4; for(let i=0;i<70;i++){ X.beginPath(); let x=(rr()-.5)*80, y=(rr()-.5)*80; X.moveTo(x,y); for(let k=0;k<4;k++){ x+=(rr()-.5)*50; y+=(rr()-.5)*50; X.quadraticCurveTo(x+(rr()-.5)*30,y+(rr()-.5)*30,x,y); } X.stroke(); } },
    tooth(){ X.fillStyle=bone; X.beginPath(); X.moveTo(-26,-30); X.quadraticCurveTo(0,-42,26,-30); X.quadraticCurveTo(32,-5,22,4); X.quadraticCurveTo(18,40,8,44); X.quadraticCurveTo(4,20,0,10); X.quadraticCurveTo(-4,20,-8,44); X.quadraticCurveTo(-18,40,-22,4); X.quadraticCurveTo(-32,-5,-26,-30); X.fill(); X.fillStyle='#c9a640'; X.beginPath(); X.ellipse(4,-22,10,6,0,0,7); X.fill(); X.strokeStyle='rgba(90,40,30,.6)'; X.lineWidth=2; X.beginPath(); X.moveTo(-8,44); X.lineTo(-8,52); X.moveTo(8,44); X.lineTo(9,52); X.stroke(); },
    ring(){ X.strokeStyle='#d8b450'; X.lineWidth=11; X.beginPath(); X.ellipse(0,0,34,26,.3,0,7); X.stroke(); X.strokeStyle='#fff3c0'; X.lineWidth=2; X.beginPath(); X.ellipse(-4,-4,34,26,.3,3.6,4.8); X.stroke(); },
    page(){ X.rotate(.2); X.fillStyle='#b9b09a'; X.fillRect(-40,-52,80,104); X.fillStyle='rgba(60,50,30,.25)'; for(let i=0;i<12;i++) X.fillRect(-32,-42+i*8,64*rr()+10,2); X.fillStyle='#2a1c14'; X.font='bold 20px serif'; X.textAlign='center'; X.fillText('DORMI',0,8); X.fillStyle='rgba(20,30,25,.4)'; X.beginPath(); X.arc(20,30,26,0,7); X.fill(); },
    warm(){ X.strokeStyle='rgba(220,220,210,.35)'; X.lineWidth=4; for(let i=0;i<5;i++){ X.beginPath(); X.moveTo(-40+i*20,40); X.bezierCurveTo(-50+i*20,10,-30+i*20,-10,-40+i*20,-45); X.stroke(); } },
    shell(){ X.strokeStyle='#d9c9a8'; X.lineWidth=5; X.beginPath(); for(let a=0;a<18;a+=.1){ const r=2+a*2.4; X.lineTo(-Math.cos(a)*r, Math.sin(a)*r); } X.stroke(); },
    eye(){ X.fillStyle='#d8d0b8'; X.beginPath(); X.arc(0,0,36,0,7); X.fill(); X.strokeStyle='rgba(150,20,20,.7)'; X.lineWidth=1.2; for(let i=0;i<14;i++){ const a=rr()*7; X.beginPath(); X.moveTo(Math.cos(a)*36,Math.sin(a)*36); X.quadraticCurveTo(Math.cos(a+.3)*24,Math.sin(a+.3)*24,Math.cos(a)*16,Math.sin(a)*16); X.stroke(); }
      g=X.createRadialGradient(4,0,2,4,0,17); g.addColorStop(0,'#d9a62a'); g.addColorStop(1,'#3e4a12'); X.fillStyle=g; X.beginPath(); X.arc(4,0,17,0,7); X.fill(); X.fillStyle='#000'; X.beginPath(); X.ellipse(4,0,3.5,14,0,0,7); X.fill(); X.fillStyle='#fff'; X.beginPath(); X.arc(-2,-6,3,0,7); X.fill(); X.strokeStyle='#5a1a14'; X.lineWidth=3; X.beginPath(); X.moveTo(-36,6); X.quadraticCurveTo(-55,20,-48,38); X.stroke(); },
    photo(){ X.rotate(-.15); X.fillStyle='#e8e2d0'; X.fillRect(-42,-50,84,100); X.fillStyle='#4a4436'; X.fillRect(-34,-42,68,72); X.fillStyle='#8c8470'; X.beginPath(); X.arc(0,-14,11,0,7); X.fill(); X.fillRect(-9,-4,18,30); X.fillStyle='#000'; X.beginPath(); X.arc(-4,-15,2,0,7); X.arc(4,-15,2,0,7); X.fill(); X.fillStyle='rgba(0,0,0,.9)'; X.beginPath(); X.arc(26,-30,7,0,7); X.fill(); X.fillStyle='#222'; X.font='9px serif'; X.textAlign='center'; X.fillText('T. — 1953',0,44); },
    nail(){ X.rotate(.5); X.fillStyle='#b8ac8c'; X.beginPath(); X.moveTo(-9,-55); X.quadraticCurveTo(12,-55,10,-40); X.lineTo(5,48); X.quadraticCurveTo(0,62,-4,48); X.lineTo(-11,-40); X.quadraticCurveTo(-12,-55,-9,-55); X.fill(); X.fillStyle='rgba(80,30,20,.6)'; X.fillRect(-11,-50,22,8); },
    breath(){ for(let i=0;i<9;i++){ X.strokeStyle='rgba(190,210,200,.5)'; X.lineWidth=2; X.beginPath(); X.arc((rr()-.5)*70,(rr()-.5)*70,3+rr()*9,0,7); X.stroke(); } },
    stars(){ for(let i=0;i<60;i++){ X.fillStyle=`rgba(200,255,170,${rr()})`; X.fillRect((rr()-.5)*150,(rr()-.5)*150,1.6,1.6); } X.strokeStyle='rgba(200,255,170,.4)'; X.lineWidth=1; X.beginPath(); X.ellipse(0,0,28,12,0,0,7); X.stroke(); X.beginPath(); X.arc(0,0,6,0,7); X.stroke(); },
    hand(){ X.fillStyle=pale; X.strokeStyle='#4a4a40'; X.lineWidth=2; X.beginPath(); X.ellipse(10,30,26,22,0,0,7); X.fill(); for(let i=0;i<4;i++){ X.save(); X.translate(-8+i*12,12); X.rotate(-.3+i*.2); X.beginPath(); X.roundRect(-4,-70,9,72,4); X.fill(); X.stroke(); X.fillStyle='#3a3a30'; X.fillRect(-3,-70,7,9); X.fillStyle=pale; X.restore(); } X.save(); X.translate(36,22); X.rotate(.9); X.beginPath(); X.roundRect(-4,-40,9,42,4); X.fill(); X.restore(); },
    black(){ X.fillStyle='rgba(30,40,30,.5)'; for(let i=0;i<6;i++){ X.beginPath(); X.arc((rr()-.5)*60,(rr()-.5)*60,rr()*14,0,7); X.fill(); } },
    keys(){ X.strokeStyle='#a89870'; X.lineWidth=5; X.beginPath(); X.arc(-20,-20,14,0,7); X.stroke(); X.fillStyle='#a89870'; for(let k=0;k<2;k++){ X.save(); X.translate(-14,-12); X.rotate(.5+k*.7); X.fillRect(0,-3,56,6); X.fillRect(44,0,5,12); X.fillRect(36,0,5,9); X.beginPath(); X.arc(0,0,8,0,7); X.fill(); X.restore(); } },
    crystal(){ X.fillStyle='#3e7a4a'; X.strokeStyle='#a8f0b0'; X.lineWidth=1.5; X.beginPath(); const n=11; for(let i=0;i<n;i++){ const a=i/n*6.28, r=24+rr()*24; X.lineTo(Math.cos(a)*r,Math.sin(a)*r); } X.closePath(); X.fill(); X.stroke(); for(let i=0;i<8;i++){ X.beginPath(); X.moveTo(0,0); const a=rr()*7, r=20+rr()*26; X.lineTo(Math.cos(a)*r,Math.sin(a)*r); X.stroke(); } },
    fish(){ X.fillStyle='#9a9c8c'; X.beginPath(); X.ellipse(0,0,48,20,0,0,7); X.fill(); X.beginPath(); X.moveTo(42,0); X.lineTo(66,-18); X.lineTo(66,18); X.fill(); X.fillStyle='#c9b8a0'; X.beginPath(); X.ellipse(-30,-2,14,15,0,0,7); X.fill(); X.fillStyle='#2a1a14'; X.beginPath(); X.arc(-34,-6,2.2,0,7); X.arc(-26,-6,2.2,0,7); X.fill(); X.strokeStyle='#2a1a14'; X.lineWidth=1.5; X.beginPath(); X.arc(-30,4,4,.2,2.9); X.stroke(); },
    none(){ X.fillStyle='rgba(0,0,0,.8)'; X.beginPath(); X.arc(0,0,40,0,7); X.fill(); },
    quasi(){ X.strokeStyle='rgba(200,190,170,.8)'; X.lineWidth=2.5; X.font='bold 38px serif'; X.textAlign='center'; X.strokeText('QUASI',0,14); X.lineWidth=1; for(let i=0;i<8;i++){ X.beginPath(); X.moveTo(-50+rr()*100,-40); X.lineTo(-50+rr()*100,40); X.stroke(); } },
    heart(){ X.fillStyle='#6a1a18'; X.beginPath(); X.moveTo(0,40); X.bezierCurveTo(-60,0,-34,-48,0,-18); X.bezierCurveTo(34,-48,60,0,0,40); X.fill(); X.strokeStyle='#2a3a8a'; X.lineWidth=4; X.beginPath(); X.moveTo(-8,-26); X.lineTo(-12,-50); X.moveTo(8,-24); X.lineTo(14,-52); X.stroke(); X.fillStyle='rgba(255,200,180,.2)'; X.beginPath(); X.ellipse(-14,-6,8,14,.4,0,7); X.fill(); },
    button(){ X.fillStyle='#d9d0b8'; X.beginPath(); X.arc(0,0,30,0,7); X.fill(); X.strokeStyle='#a89c80'; X.lineWidth=3; X.beginPath(); X.arc(0,0,24,0,7); X.stroke(); X.fillStyle='#3a3020'; for (const [x,y] of [[-7,-7],[7,-7],[-7,7],[7,7]]){ X.beginPath(); X.arc(x,y,4,0,7); X.fill(); } X.strokeStyle='#a01a14'; X.lineWidth=2; X.beginPath(); X.moveTo(-7,-7); X.lineTo(7,7); X.moveTo(7,-7); X.quadraticCurveTo(30,20,50,10); X.stroke(); },
    spoon(){ X.rotate(.6); X.fillStyle='#c8ccd0'; X.beginPath(); X.ellipse(0,-30,18,26,0,0,7); X.fill(); X.fillRect(-4,-6,8,62); X.fillStyle='rgba(255,255,255,.4)'; X.beginPath(); X.ellipse(-5,-36,5,10,0,0,7); X.fill(); },
    comb(){ X.rotate(-.3); X.fillStyle='#7a4a22'; X.fillRect(-55,-22,110,16); for (let i=0;i<22;i++) X.fillRect(-52+i*5,-6,3,32); X.strokeStyle='#bbb'; X.lineWidth=1; for (let i=0;i<10;i++){ X.beginPath(); X.moveTo(-40+i*8,10); X.quadraticCurveTo(-30+i*9,40,-20+i*7,60); X.stroke(); } },
    lire(){ X.fillStyle='#b7b2a0'; X.beginPath(); X.arc(0,0,40,0,7); X.fill(); X.strokeStyle='#7c776a'; X.lineWidth=3; X.beginPath(); X.arc(0,0,34,0,7); X.stroke(); X.fillStyle='#5d594f'; X.font='bold 22px serif'; X.textAlign='center'; X.fillText('100',0,4); X.font='9px serif'; X.fillText('LIRE · 1953',0,20); },
    hairpin(){ X.strokeStyle='#2a2420'; X.lineWidth=4; X.beginPath(); X.moveTo(-50,20); X.quadraticCurveTo(0,-40,50,20); X.quadraticCurveTo(0,60,-50,20); X.stroke(); X.fillStyle='#2a2420'; X.beginPath(); X.arc(0,20,8,0,7); X.fill(); },
    soldier(){ X.fillStyle='#4a5a3a'; X.fillRect(-14,-30,28,40); X.fillRect(-14,10,11,36); X.fillRect(3,10,11,36); X.fillStyle='#8a2a1a'; X.fillRect(-14,-30,28,8); X.fillStyle='#777'; X.fillRect(14,-40,4,60); X.fillStyle='rgba(120,100,60,.8)'; X.beginPath(); X.ellipse(0,-34,9,3,0,0,7); X.fill(); },
    ticket(){ X.rotate(.1); X.fillStyle='#d8c890'; X.fillRect(-48,-28,96,56); X.strokeStyle='#6a5a30'; X.setLineDash([3,3]); X.strokeRect(-42,-22,84,44); X.setLineDash([]); X.fillStyle='#3a2a10'; X.font='bold 11px serif'; X.textAlign='center'; X.fillText('CORRIERA',0,-6); X.font='9px serif'; X.fillText('NÀRRENA – VALLE',0,8); X.fillText('12·XI·1953',0,20); },
    candle(){ X.fillStyle='#141210'; X.fillRect(-14,-30,28,74); X.beginPath(); X.ellipse(0,-30,14,5,0,0,7); X.fill(); X.strokeStyle='#666'; X.lineWidth=2; X.beginPath(); X.moveTo(0,-34); X.lineTo(2,-44); X.stroke(); X.fillStyle='rgba(30,25,20,.8)'; X.beginPath(); X.moveTo(-14,-10); X.quadraticCurveTo(-20,10,-16,20); X.lineTo(-14,20); X.fill(); },
    hook(){ X.strokeStyle='#8a8a86'; X.lineWidth=7; X.lineCap='round'; X.beginPath(); X.moveTo(10,-55); X.lineTo(10,20); X.arc(-12,20,22,0,Math.PI*.95); X.stroke(); X.fillStyle='#8a8a86'; X.beginPath(); X.moveTo(-34,22); X.lineTo(-42,6); X.lineTo(-28,14); X.fill(); X.beginPath(); X.arc(10,-58,6,0,7); X.lineWidth=3; X.stroke(); },
    rosary(){ X.fillStyle='#e8e0cc'; for (let i=0;i<26;i++){ const a=i/26*Math.PI*2; X.beginPath(); X.ellipse(Math.cos(a)*36, Math.sin(a)*30-6, 4.5, 6, a, 0, 7); X.fill(); } X.strokeStyle='#e8e0cc'; X.lineWidth=2; X.beginPath(); X.moveTo(0,24); X.lineTo(0,58); X.moveTo(-9,40); X.lineTo(9,40); X.stroke(); },
    glasses(){ X.strokeStyle='#2a2620'; X.lineWidth=4; for (const x of [-24,24]){ X.beginPath(); X.arc(x,0,19,0,7); X.stroke(); } X.beginPath(); X.moveTo(-6,0); X.quadraticCurveTo(0,-8,6,0); X.stroke(); X.strokeStyle='rgba(200,210,200,.5)'; X.lineWidth=1; for (let i=0;i<9;i++){ const x=(i<5?-24:24); X.beginPath(); X.moveTo(x+R2()*20-10, R2()*20-10); X.lineTo(x+R2()*20-10, R2()*20-10); X.stroke(); } },
    doll(){ X.fillStyle='#e6dccc'; X.beginPath(); X.ellipse(0,0,34,40,0,0,7); X.fill(); X.fillStyle='#3a2a1a'; X.beginPath(); X.arc(0,-26,34,Math.PI,0); X.fill(); X.strokeStyle='#2a1a10'; X.lineWidth=2.5; X.beginPath(); X.moveTo(-18,0); X.quadraticCurveTo(-12,5,-6,0); X.moveTo(6,0); X.quadraticCurveTo(12,5,18,0); X.stroke(); X.fillStyle='#a8323a'; X.beginPath(); X.ellipse(0,20,5,3,0,0,7); X.fill(); X.strokeStyle='rgba(60,40,30,.6)'; X.lineWidth=1; X.beginPath(); X.moveTo(20,-30); X.lineTo(8,4); X.lineTo(14,24); X.stroke(); },
    letter(){ X.rotate(-.12); X.fillStyle='#e2d8bc'; X.fillRect(-46,-30,92,60); X.strokeStyle='#9a8a64'; X.lineWidth=1.5; X.beginPath(); X.moveTo(-46,-30); X.lineTo(0,6); X.lineTo(46,-30); X.stroke(); X.fillStyle='#7a1a14'; X.beginPath(); X.arc(0,6,8,0,7); X.fill(); X.fillStyle='#3a3020'; X.font='italic 8px serif'; X.textAlign='center'; X.fillText('a chi verrà a svuotare',0,24); },
    watch(){ X.fillStyle='#b89a4a'; X.beginPath(); X.arc(0,6,38,0,7); X.fill(); X.fillStyle='#ece4cc'; X.beginPath(); X.arc(0,6,31,0,7); X.fill(); X.strokeStyle='#b89a4a'; X.lineWidth=5; X.beginPath(); X.arc(0,-38,8,0,7); X.stroke(); X.strokeStyle='#222'; X.lineWidth=3; X.beginPath(); X.moveTo(0,6); X.lineTo(14,6); X.moveTo(0,6); X.lineTo(4,30); X.stroke(); for (let i=0;i<12;i++){ const a=i/12*6.283; X.fillStyle='#222'; X.fillRect(Math.cos(a)*25-1, 6+Math.sin(a)*25-1, 2, 2); } },
    medal(){ X.fillStyle='#9a9690'; X.beginPath(); X.ellipse(0,8,30,36,0,0,7); X.fill(); X.strokeStyle='#5a5650'; X.lineWidth=2; X.beginPath(); X.ellipse(0,8,24,30,0,0,7); X.stroke(); X.fillStyle='#5a5650'; X.fillRect(-4,-10,8,30); X.beginPath(); X.arc(0,-14,7,0,7); X.fill(); for (let i=0;i<5;i++){ X.beginPath(); X.moveTo(0,-8); X.quadraticCurveTo(-20+i*10,-30,-24+i*12,-20); X.stroke(); } X.strokeStyle='#9a9690'; X.lineWidth=2; X.beginPath(); X.arc(0,-34,6,0,7); X.stroke(); },
    harmonica(){ X.rotate(-.2); X.fillStyle='#a8acb0'; X.fillRect(-52,-14,104,28); X.fillStyle='#4a3a2a'; X.fillRect(-48,-4,96,8); X.fillStyle='#1a1410'; for (let i=0;i<10;i++) X.fillRect(-46+i*9.4,-2,6,4); },
    dentures(){ X.fillStyle='#b4505a'; X.beginPath(); X.ellipse(0,-8,46,22,0,Math.PI,0); X.fill(); X.beginPath(); X.ellipse(0,14,46,20,0,0,Math.PI); X.fill(); X.fillStyle='#eae2cc'; for (let i=0;i<10;i++){ X.fillRect(-40+i*8,-12,7,12); X.fillRect(-40+i*8,8,7,12); } },
    ribbon(){ X.strokeStyle='#ddd8cc'; X.lineWidth=1.2; for (let i=0;i<40;i++){ X.beginPath(); X.moveTo(R2()*20-10,-50); X.quadraticCurveTo(R2()*40-20,0,R2()*30-15,50); X.stroke(); } X.fillStyle='#a01a1a'; X.beginPath(); X.ellipse(-14,0,16,8,-.4,0,7); X.ellipse(14,0,16,8,.4,0,7); X.fill(); X.fillRect(-5,-6,10,12); },
    finger(){ X.rotate(.5); X.fillStyle='#b8b0a0'; X.beginPath(); X.roundRect(-10,-50,20,96,9); X.fill(); X.fillStyle='#8a8070'; X.fillRect(-9,-50,18,14); X.strokeStyle='#d8b450'; X.lineWidth=6; X.beginPath(); X.moveTo(-12,10); X.lineTo(12,10); X.stroke(); X.fillStyle='#6a1a14'; X.fillRect(-10,40,20,6); },
    marble(){ g=X.createRadialGradient(-10,-10,4,0,0,36); g.addColorStop(0,'#cfe8e0'); g.addColorStop(1,'#2a4a46'); X.fillStyle=g; X.beginPath(); X.arc(0,0,36,0,7); X.fill(); X.fillStyle='#d9a62a'; X.beginPath(); X.arc(6,4,12,0,7); X.fill(); X.fillStyle='#000'; X.beginPath(); X.ellipse(6,4,3,10,0,0,7); X.fill(); X.fillStyle='rgba(255,255,255,.6)'; X.beginPath(); X.arc(-14,-14,6,0,7); X.fill(); },
    crucifix(){ X.strokeStyle='#4a4038'; X.lineWidth=8; X.lineCap='round'; X.beginPath(); for (let a=0;a<11;a+=.1){ const r=4+a*4; X.lineTo(Math.cos(a)*r, Math.sin(a)*r); } X.stroke(); X.beginPath(); X.moveTo(36,-30); X.lineTo(50,-44); X.moveTo(40,-48); X.lineTo(48,-26); X.stroke(); },
    boat(){ X.fillStyle='#e6e0d0'; X.beginPath(); X.moveTo(-50,0); X.lineTo(50,0); X.lineTo(30,20); X.lineTo(-30,20); X.fill(); X.beginPath(); X.moveTo(0,0); X.lineTo(0,-46); X.lineTo(28,0); X.fill(); X.strokeStyle='rgba(40,40,60,.5)'; X.lineWidth=1; for (let i=0;i<4;i++){ X.beginPath(); X.moveTo(-26,6+i*3); X.lineTo(26,6+i*3); X.stroke(); } },
    scale(){ g=X.createRadialGradient(-8,-10,4,0,0,48); g.addColorStop(0,'#5a7a6a'); g.addColorStop(1,'#14201a'); X.fillStyle=g; X.beginPath(); X.moveTo(0,-48); X.quadraticCurveTo(50,-20,36,30); X.quadraticCurveTo(0,52,-36,30); X.quadraticCurveTo(-50,-20,0,-48); X.fill(); X.strokeStyle='rgba(160,220,190,.35)'; X.lineWidth=1.5; for (let i=1;i<6;i++){ X.beginPath(); X.arc(0,40,i*14,3.6,5.8); X.stroke(); } },
    bellsmall(){ X.fillStyle='#b89a4a'; X.beginPath(); X.moveTo(-34,26); X.quadraticCurveTo(-30,-36,0,-38); X.quadraticCurveTo(30,-36,34,26); X.closePath(); X.fill(); X.fillRect(-40,24,80,7); X.fillStyle='#6a5420'; X.beginPath(); X.arc(0,38,8,0,7); X.fill(); X.fillStyle='rgba(255,240,200,.4)'; X.fillRect(-18,-20,6,36); },
    mirror(){ X.fillStyle='#9aa8ac'; X.beginPath(); X.moveTo(-40,-30); X.lineTo(30,-44); X.lineTo(44,20); X.lineTo(-10,46); X.lineTo(-46,10); X.closePath(); X.fill(); X.fillStyle='#3a4a4e'; X.beginPath(); X.moveTo(-30,0); X.lineTo(20,-10); X.lineTo(30,12); X.lineTo(-20,20); X.fill(); X.strokeStyle='rgba(255,255,255,.6)'; X.lineWidth=2; X.beginPath(); X.moveTo(-30,-26); X.lineTo(26,-38); X.stroke(); },
    egg(){ g=X.createRadialGradient(-12,-16,4,0,0,44); g.addColorStop(0,'#4a4a52'); g.addColorStop(1,'#020204'); X.fillStyle=g; X.beginPath(); X.ellipse(0,4,32,42,0,0,7); X.fill(); X.fillStyle='rgba(200,210,255,.35)'; X.beginPath(); X.ellipse(-12,-18,7,12,-.4,0,7); X.fill(); X.strokeStyle='rgba(140,255,170,.35)'; X.lineWidth=1.2; X.beginPath(); X.moveTo(6,-20); X.quadraticCurveTo(14,0,4,24); X.stroke(); },
    teeth(){ X.fillStyle='#e2dac2'; for (let i=0;i<28;i++){ const a=R2()*6.283, r=R2()*40; X.save(); X.translate(Math.cos(a)*r, Math.sin(a)*r); X.rotate(R2()*6.28); X.beginPath(); X.moveTo(-6,-7); X.quadraticCurveTo(0,-10,6,-7); X.lineTo(4,8); X.lineTo(-4,8); X.fill(); X.fillStyle='#c9a640'; X.fillRect(-3,-7,5,3); X.fillStyle='#e2dac2'; X.restore(); } },
    tentacle(){ X.strokeStyle='#2a3a30'; X.lineCap='round'; for (let w=16; w>2; w-=2){ X.lineWidth=w; X.beginPath(); X.moveTo(-50,40); X.bezierCurveTo(-10,40,30,10,10,-10); X.bezierCurveTo(-6,-26,20,-40,34,-30); X.stroke(); X.strokeStyle = w>10 ? '#2a3a30' : '#3e5a48'; } X.fillStyle='#c9b8a0'; for (let i=0;i<9;i++){ X.beginPath(); X.arc(-40+i*8, 38-i*4, 3, 0, 7); X.fill(); } }
  };
  const R2 = rr;
  (F[icon]||F.stone)();
  X.restore();
  // riflesso sull'acqua
  X.fillStyle='rgba(200,220,210,.06)'; X.beginPath(); X.ellipse(c*.75,c*.65,W*.18,W*.06,-.6,0,7); X.fill();
}
let findT = 0;
function showFind(idx){
  const f = FINDS[idx]; drawRelic($('findCv'), f[2], idx+1); $('findTxt').textContent = f[1];
  const fc = $('findCard'); fc.classList.remove('hidden'); fc.style.animation = 'none'; void fc.offsetWidth; fc.style.animation = ''; findT = 6;
  think(S.relics.length >= 3 ? 'relic2' : 'relic', 3.5);
  if (!S.relics.includes(idx)){ S.relics.push(idx); $('diaryDot').classList.remove('hidden'); }
}
$('findCard').addEventListener('pointerdown', e=>{ e.stopPropagation(); $('findCard').classList.add('hidden'); findT = 0; });
function throwBucket(){
  if (!running || B.busy || ending || breathT > 0) return;
  if (S.tank >= tankCap() && !S.contract){ toast(`La cisterna è piena. Vendi.`, 'warn'); return; }
  const sr = shoreR(S.d);
  const rt = Math.max(Math.min(raftPos.z - 3.6, sr - 1.5), 3);
  B.vein = false; if (!aimTarget(B.target)) B.target.set(.4, water.position.y - .05, rt);
  if (VEIN.on && VEIN.t > 1 && Math.hypot(B.target.x - VEIN.x, B.target.z - VEIN.z) < 2.2){ B.vein = VEIN.trap ? 'trap' : true; VEIN.on = false; veinObj.visible = false; }
  camera.updateMatrixWorld(); handPos.set(.5,-.58,-.85); camera.localToWorld(handPos);
  const dist = handPos.distanceTo(B.target);
  B.dist = dist; B.dur = (.55 + dist*.006) * PULLS[S.pull].m; B.t = 0; B.busy = true; B.splashed = false; B.reeled = false;
  castSfx(B.dur*.42); if (Math.random()<.08) creakSfx();
}
function finishBucket(){
  B.busy = false; clankSfx(); dripsSfx();
  if (B.thing){ B.thing = false; bucketTent.visible = false; bucket.rotation.x = 0; toast(pick([`Il secchio torna su scosso da qualcosa che si dimena. Una punta di tentacolo sporge dal bordo. Poi scivola giù, nel buio.`,`Nel secchio qualcosa si contorce. Ti guarda con un occhio solo, poi si arrotola e sparisce oltre il bordo.`]), 'warn'); loseLuc(6, `qualcosa nel secchio`); heartSfx(.7); }
  let L = BUCKETS[S.bucket].s * 10; if (B.lost){ L = 0; B.lost = false; }
  if (B.vein === 'trap'){ L = 0; B.vein = false; scare(); loseLuc(7, `la vena era una bocca`); toast(`Il secchio torna su vuoto e morso. Sul bordo, il segno di denti. Non era una vena.`, 'warn'); }
  else if (B.vein){ L *= 5; S.veins = (S.veins||0) + 1; revealSfx(); toast(`Acqua antica: secchio ×5.`, 'find'); }
  addLiters(L);
  if (BUCKETS[S.bucket].org) loseLuc(.3, `il secchio che respira`);
  const ch = B.relic ? 1 : (.05 + phase*.022) * NETS[S.net||0].f * (B.vein ? 3 : 1); B.vein = false; B.relic = false;
  if (phase >= 0 && Math.random() < ch && S.d > 2){ const unseen = FINDS.map((f,i)=>i).filter(i=>!S.relics.includes(i)); let pool = unseen.filter(i=>FINDS[i][0]<=phase && FINDS[i][0]>=phase-1); if (!pool.length) pool = unseen.filter(i=>FINDS[i][0]<=phase+1); if (pool.length){ const fi = pick(pool); showFind(fi); loseLuc(2+phase, `ciò che era nel secchio`); if (phase>=2) whisperSfx(1.5,.15); }
    const val = Math.round(35*Math.pow(3, phase)*(1 + (S.net||0)*.35)); S.money += val; if (pool.length) setTimeout(()=>{ coinSfx(); toast(`Il Compratore vuole anche questo: +€ ${fmt(val)}`, 'money'); }, 1800); else cash(val, `cianfrusaglie dal fondo`); }
  if (holdBucket) setTimeout(throwBucket, 30);
}
// incassi minori: niente messaggio a ogni secchio, al massimo un riepilogo discreto ogni mezzo minuto
const CASH = { v:0, why:new Set(), t:0 };
function cash(v, why){ CASH.v += v; CASH.why.add(why); if (CASH.t <= 0) CASH.t = 30; }
function cashUpdate(dt){ if (CASH.t <= 0 || (CASH.t -= dt) > 0) return; if (CASH.v >= 1){ coinSfx(); toast(`+€ ${fmt(CASH.v)} · ${[...CASH.why].join(', ')}`, 'money'); } CASH.v = 0; CASH.why.clear(); }
function addLiters(L){ L *= hullK();
  const space = S.contract ? Infinity : Math.max(0, tankCap() - S.tank);
  const take = Math.min(L, space);
  if (take <= 0) return 0;
  S.tank += take; S.total += take; if (S.order) S.order.got += take;
  let rem = take;
  while (rem > 0 && S.d < MAXD){ const need = LPM(S.d); const step = Math.min(rem, need*.25); S.d += step/need; rem -= step; }
  S.d = Math.min(S.d, MAXD);
  return take;
}
const pumpRate = () => PUMPS.reduce((s,p,i)=> s + p.r*S.pumps[i], 0);

/* ---------- i garzoni: lavorano da soli, ai lati della zattera ---------- */
const helperFigs = [[-1.2,.95,-1],[1.25,.9,1],[-1.25,-.3,-1]].map(([x,z,side])=>{ const g = new THREE.Group(); g.position.set(x, .36, z); g.rotation.y = side*Math.PI/2;
  const f = mesh(figureGeo(1.45, 1.5), ghoulMat); g.add(f); const b = mesh(new THREE.CylinderGeometry(.11,.085,.2,10,1,true), M.rust, .25, .55, .25); g.add(b);
  g.userData = { side, b, t:0, f }; g.visible = false; raft.add(g); return g; });
function layoutHelpers(){ const k = HELPERS[S.helper||0].k; helperFigs.forEach((g,i)=> g.visible = i < k); if (typeof stoolsLayout === 'function') try { stoolsLayout(); } catch(e){} }
let helperT = 2;
function helpersUpdate(dt){
  const h = HELPERS[S.helper||0]; if (!h.k || ending) return;
  helperFigs.forEach(g=>{ if (!g.visible) return; const u = g.userData; if (u.t > 0){ u.t = Math.max(0, u.t - dt); const k = Math.sin(Math.PI*(1 - u.t/1.4)); g.rotation.z = -u.side*k*.35; u.b.position.y = .55 - k*.5; } else { g.rotation.z = 0; u.f.rotation.y = Math.sin(T*.3 + u.side)*.15; } });
  helperT -= dt; if (helperT > 0) return; helperT = h.iv * rand(.85, 1.15);
  if (!S.contract && S.tank >= tankCap()) return;
  const who = helperFigs.filter(g=>g.visible), g = pick(who); g.userData.t = 1.4;
  const L = BUCKETS[S.bucket].s * 10 * .75 * h.k; setTimeout(()=>{ if (!running || ending) return; g.getWorldPosition(tmpV); const x = raft.position.x + g.userData.side*2.3, z = tmpV.z;
    splashFX(x, waterY, z, .45, .5); ripple(x, z, .6); if (Math.random() < .5) splashSfx(6, BUCKETS[S.bucket].s); addLiters(L);
    if (S.helper >= 5 && Math.random() < .3) loseLuc(.4, `i garzoni senza ombra`); }, 700);
}
/* ---------- vene d'acqua antica: bolle sul lago, cala il secchio lì ---------- */
const veinMat = new THREE.MeshBasicMaterial({ map:deepGlowTex(), color:new THREE.Color(1.1,1.5,1.05), blending:THREE.AdditiveBlending, transparent:true, depthWrite:false, opacity:0 }); veinMat.userData.murk = true;
const veinObj = mesh(new THREE.CircleGeometry(1.9, 24).rotateX(-Math.PI/2), veinMat); veinObj.renderOrder = 3; veinObj.userData.noCast = true; veinObj.visible = false; scene.add(veinObj);
const VEIN = { on:false, t:0, life:0, next:35, trap:false, x:0, z:0 };
function startVein(){ for (let k=0;k<30;k++){ const a = rand(-.75,.75), r = rand(5, 13), x = raftPos.x + Math.sin(a)*r, z = raftPos.z - 2 - Math.cos(a)*r; if (!wetSpot(x, z, 1.5)) continue;
    Object.assign(VEIN, { on:true, t:0, life:rand(18,26), x, z, trap: dayF < .5 && phase >= 1 && Math.random() < .25 }); veinObj.position.set(x, waterY + .03, z); veinObj.visible = true; bubbleSfx();
    if (!S.veins && (S.veinTip = (S.veinTip||0) + 1) <= 3){ toast(`Bolle sul lago, e una luce sotto: una vena d'acqua antica. Guardala e cala il secchio lì dentro: vale molto di più.`, 'lore'); } return true; } return false; }
function veinUpdate(dt){
  if (!VEIN.on){ VEIN.next -= dt; if (VEIN.next <= 0 && running && !ending && S.d > .5){ VEIN.next = rand(30, 55); startVein(); } return; }
  VEIN.t += dt; const a = smooth(0, 2, VEIN.t) * smooth(VEIN.life, VEIN.life - 3, VEIN.t);
  veinObj.position.y = water.position.y + .03; veinMat.opacity = a*(.55 + .25*Math.sin(T*3)); veinObj.scale.setScalar(.9 + .1*Math.sin(T*1.7));
  if (VEIN.trap) veinMat.color.setRGB(1.6, .9 + .3*Math.sin(T*9), .6); else veinMat.color.setRGB(1.1, 1.5, 1.05);
  if (Math.random() < dt*14*a) emitDrop(VEIN.x + rand(-1,1), waterY, VEIN.z + rand(-1,1), 0, rand(.3,.9), 0, .8, .5);
  if (Math.random() < dt*2*a) ripple(VEIN.x + rand(-.6,.6), VEIN.z + rand(-.6,.6), .5);
  if (VEIN.t > VEIN.life){ VEIN.on = false; veinObj.visible = false; }
}
// dove va il secchio: dove guardi, se è acqua a portata; altrimenti davanti alla zattera
function aimTarget(out){ camera.getWorldDirection(fwd); const cy = camera.position.y;
  if (fwd.y < -.04){ const t = (waterY - cy)/fwd.y, x = camera.position.x + fwd.x*t, z = camera.position.z + fwd.z*t, d = Math.hypot(x - raftPos.x, z - raftPos.z);
    if (d > 2.8 && d < 16 && wetSpot(x, z, .6)){ out.set(x, water.position.y - .05, z); return true; } }
  return false; }
// il segno di mira: un cerchio sull'acqua dove cadrà il secchio
const aimMat = new THREE.MeshBasicMaterial({ color:new THREE.Color(.9,.85,.6), transparent:true, opacity:0, depthWrite:false }); aimMat.userData.murk = true;
const aimRing = mesh(new THREE.RingGeometry(.42,.5,32).rotateX(-Math.PI/2), aimMat); aimRing.renderOrder = 4; aimRing.userData.noCast = true; scene.add(aimRing);
const aimV = new THREE.Vector3();
function aimUpdate(){ const ok = running && !ending && !B.busy && aimTarget(aimV); const inV = ok && VEIN.on && Math.hypot(aimV.x - VEIN.x, aimV.z - VEIN.z) < 2.2;
  aimMat.opacity += ((ok ? (inV ? .8 : .35) : 0) - aimMat.opacity)*.15; aimRing.visible = aimMat.opacity > .02;
  if (ok){ aimRing.position.set(aimV.x, water.position.y + .04, aimV.z); aimMat.color.setRGB(inV ? 1.6 : .9, inV ? 1.5 : .85, inV ? .7 : .6); aimRing.scale.setScalar(inV ? 1.3 + .1*Math.sin(T*6) : 1); } }
/* ---------- commesse della Ditta Sesti ---------- */
let orderNext = 90;
function ordersUpdate(dt){
  if (ending || !running) return;
  const o = S.order;
  if (!o){ orderNext -= dt; if (orderNext > 0 || inCall || S.d < 1 || X_.big > 0 || X_.pass) return; orderNext = rand(140, 220);
    const sec = Math.round(rand(2, 4))*60, perSec = pumpRate() + noriaRate() + (S.crane ? CRANES[S.crane].L/CRANES[S.crane].iv : 0) + HELPERS[S.helper||0].k*BUCKETS[S.bucket].s*7.5/Math.max(1, HELPERS[S.helper||0].iv) + BUCKETS[S.bucket].s*10/(2 + PULLS[S.pull].m*1.5);
    const need = Math.max(150, Math.round(perSec*sec*rand(.55,.8)/50)*50), reward = Math.round(need*priceNow()*rand(.9,1.3) + 30*Math.pow(1.6, phase) + S.orderN*15);
    const night = dayF < .5, lines = night ? [`Signor Ferri. Stanotte ci servono ${fmt(need)} litri. Li vogliamo entro ${sec/60} minuti. Le pagheremo € ${fmt(reward)} in più. Non chieda per chi sono.`,`Ci scusi l'ora. Il Compratore ha sete. ${fmt(need)} litri in ${sec/60} minuti, premio € ${fmt(reward)}. Lavori al buio, se serve.`]
      : [`Signor Ferri, buongiorno. Commessa urgente: ${fmt(need)} litri in ${sec/60} minuti. Premio di € ${fmt(reward)}, oltre al prezzo.`,`Una commessa per Lei: ${fmt(need)} litri entro ${sec/60} minuti. Se ce la fa, € ${fmt(reward)}. Se non ce la fa, non si preoccupi. Ce ne ricorderemo.`];
    S.order = { need, got:0, left:sec, reward }; call(`DITTA SESTI`, pick(lines)); return; }
  o.left -= dt;
  if (o.got >= o.need){ S.money += o.reward; S.orderN++; coinSfx(); setTimeout(coinSfx, 250); toast(`Commessa consegnata: +€ ${fmt(o.reward)}. "Bravo, signor Ferri. Il Compratore è contento."`, 'find'); gainLuc(3, `lavoro fatto`); S.order = null; }
  else if (o.left <= 0){ toast(`Commessa scaduta. ${pick([`Al telefono nessuno dice niente. Si sente solo respirare.`,`"Peccato." Poi la linea cade.`,`Più tardi, sul pontile, qualcuno ha lasciato un secchio vuoto. Per lei.`])}`, 'warn'); loseLuc(2, `commessa persa`); S.order = null; }
}
/* ---------- eventi ---------- */
const EV = { next: 14, cool:{} };
let choirBoost = 0;
const cool = (k,s) => { const n = performance.now()/1000; if ((EV.cool[k]||0) > n) return false; EV.cool[k] = n + s; return true; };
let wf = { on:false, t:0, seen:0 };
let lampOverride = 0, blackT = 0, paleT = 0;
const WHISPERS = [`...più giù...`,`...non contare...`,`...ci hai svegliati...`,`...Tobia...`,`...siamo ancora a tavola...`,`...riempi il secchio... riempi...`,`...sotto il pontile...`,`...ti abbiamo visto nascere...`,`...scendi a salutarci...`];
const CHANTS = [`Nàrr'ghena ul-thoom... sha'ath dormh'a...`,`Ia... ia... Ghren-na ul'loth, phaa-gnar...`,`Ubh'nàrr ka-sleth... ka-sleth... ka-sleth...`,`Dormh'a, dormh'a... ye-nàrr ophuu...`,`(sono le voci del paese, tutte insieme) ...UL-THOOM...`];
const RADIO_LINES = [`(radio, da sola) ...previsioni: nebbia densa sul lago. Nebbia densa nelle case. Nebbia nei letti...`,`(radio, da sola) ...si raccomanda di non rispondere a chi chiama dall'acqua. Ripeto: non rispondete...`,`(radio, da sola) ...e ora un vecchio successo del 1953... (si sente solo una campana)`];
/* ---------- il regista: varia, non ripete, sceglie ciò che hai visto meno ---------- */
// nome: [profondità minima, condizione, attesa minima (s), massimo per partita, peso]
const EV_DEF = {
  knock:[.8,null,80,5,1], prints:[1,null,130,4,1], music:[1,null,140,2,1], silent:[2,null,260,2,.8], tug:[1,null,70,3,.8], fish:[2,null,170,2,1],
  behind:[10,null,95,3,1.2], hand:[8,null,85,3,1.2], torch:[3,n=>n,110,3,1], sublim:[4,null,70,6,.6], green:[5,n=>n,120,2,.8], left:[4,null,240,1,1],
  bodies:[12,null,170,2,1], dg:[8,n=>n,220,2,1.2], fog:[6,null,180,2,1], lost:[12,()=>S.luc<65,320,1,1], car:[12,n=>n&&S.revealed.includes('car'),200,1,1],
  titan:[5,()=>underRaft()>=3,150,3,1.4], levx:[18,()=>!LEV.on,110,3,1.2], mouth:[35,null,120,2,1.1], blood:[35,null,160,2,1], breath:[35,null,150,2,1], dock:[14,n=>n,170,3,1.2],
  bump:[1,null,60,4,1.3], tentRaft:[3,null,110,3,1.3], surfEye:[5,null,120,3,1.2], hands:[10,null,150,2,1.2], rowboat:[3,null,200,2,1.1], selfCorpse:[25,null,400,1,1.3],
  rain:[15,null,220,2,1], starsOut:[30,n=>n,240,1,1.2], swarm:[18,null,160,2,1.1], silence:[3,null,200,2,1], neck:[1.5,null,140,3,1.1], tide:[4,null,150,2,1],
  scrawl:[5,null,160,3,1], bucketThing:[8,null,120,3,1], bellNear:[22,null,200,2,1.1], reflection:[10,null,180,2,1.2],
  figure:[12,n=>(n||phase>=3)&&!wf.on,60,99,.6], flicker:[12,n=>n,60,99,.5], name:[35,null,160,3,1], ladder:[12,n=>n,220,2,1], scare:[65,()=>S.luc<30,110,99,.8],
  endless:[8,()=>underRaft()>=5 && !X_.endlessNext,200,2,1.4], vanish:[6,n=>n && HELPERS[S.helper||0].k>0,300,1,1.1], abyss:[12,()=>underRaft()>=12 && !LEV.on,160,2,1.4], horizon:[3,n=>n||phase>=2,220,1,1.5], gaze:[24,()=>gazeOK(),200,2,1.7], moon:[4,n=>n,240,1,1.4], reach:[8,null,260,1,1.5], grip:[2,()=>!X_.gripNext,100,3,1.4], pupil:[20,()=>underRaft()>=15 && !X_.deepEye,200,1,1.2], darkness:[2,n=>n||phase>=2,170,2,1.3],
  dinner:[8,null,230,1,1.5], priest:[5,null,260,1,1.5], heads:[3,null,150,2,1.3], whaleback:[18,()=>whaleOK(),220,1,1.3], dunk:[6,()=>underRaft()>=6,260,1,1.1],
  leviathan:[35,()=>!LEV.on,120,99,.7], eyes:[12,n=>n&&SE.t<=0,70,99,.7], chant:[35,null,90,99,.6], lightning:[2,n=>n,50,99,.5]
};
const OLD_EV = new Set(['figure','bubbles','flicker','bell','whisper','name','ladder','radio','glitch','scare','quake','lightning','leviathan','eyes','chant']);
const TENSE = new Set(['gaze','reach','dinner','heads','pupil','whaleback','priest','titan','levx','hands','rowboat','selfCorpse','tentRaft','surfEye','mouth','dg','fog','bellNear','reflection','behind','hand','swarm','rain','starsOut','dock','bodies','blood','breath','scrawl']);
let tensionT = 0, tensionD = 1;
function tension(sec, fire){ tensionT = tensionD = sec; X_.big = sec + 2; riserSfx(); duck(true); setTimeout(()=>heartSfx(.45), sec*400); const go = ()=>{ if (uiBusy() && running) return setTimeout(go, 400); duck(false); if (running && !ending) fire(); }; setTimeout(go, sec*1000); }
function directorPick(night){
  // i limiti valgono per fase: scendendo, tutto può tornare (ma ciò che hai visto meno ha la precedenza)
  if (S.evPh !== phase){ S.evPh = phase; S.evc = {}; }
  const now = performance.now()/1000, cand = []; let tot = 0;
  for (const k in EV_DEF){ const [md, cond, cd, mx, w] = EV_DEF[k], c = S.evc[k]||0;
    if (S.d < md || (EV_ACT[k] ?? 0) > actOf(S.d) || c >= mx || (EV.cool[k]||0) > now || S.evRecent.includes(k) || (cond && !cond(night))) continue;
    const seenAll = (S.evAll||{})[k]||0, ww = w / (1 + c*1.2) / (1 + seenAll*.25); cand.push([k, ww]); tot += ww; }
  if (!cand.length) return null;
  let r = Math.random()*tot; let e = cand[cand.length-1][0]; for (const [k,w] of cand){ r -= w; if (r <= 0){ e = k; break; } }
  EV.cool[e] = now + EV_DEF[e][2]; S.evc[e] = (S.evc[e]||0) + 1; S.evAll = S.evAll || {}; S.evAll[e] = (S.evAll[e]||0) + 1; S.evRecent.push(e); while (S.evRecent.length > 7) S.evRecent.shift();
  return e;
}
function runEvent(){
  const night = dayF < .5;
  if (X_.forceHand && !X_.hand){ X_.forceHand = false; startEv('hand'); return; }
  let e = X_.big <= 0 ? directorPick(night) : null;
  if (!e && X_.big <= 0 && startVignette()) return;
  if (!e){ const f = []; if (phase>=1) f.push('bubbles'); if (S.d > 20) f.push('bell'); if (phase>=1 && S.luc < 70) f.push('whisper'); if (phase>=2) f.push('radio','glitch'); if (phase>=4) f.push('quake'); if (!f.length) return; e = pick(f); }
  if (!OLD_EV.has(e)){ if (TENSE.has(e) && Math.random() < .75) tension(rand(2.4,3.4), ()=>startEv(e)); else startEv(e); return; }
  if (e==='figure'){
    const sr = shoreR(S.d); let x, z, tries = 0;
    do { const a = rand(0,6.28), r = rand(4, Math.max(5, sr-4)); x = Math.cos(a)*r; z = Math.sin(a)*r; tries++; } while ((Math.hypot(x, z-CAM_BASE.z) < Math.min(22, sr*.8) || Math.abs(x) < 2) && tries < 40);
    waterFigure.position.set(x, water.position.y - .7, z); waterFigure.rotation.y = Math.atan2(CAM_BASE.x-x, CAM_BASE.z-z); waterFigure.visible = true; wf = {on:true, t:0, seen:0};
  }
  if (e==='bubbles'){ const sr = shoreR(S.d); const a = rand(0,6.28), r = rand(3, Math.max(4,sr*.7)); ripple(Math.cos(a)*r, Math.sin(a)*r, 2.2); bubbleSfx(); if (phase>=2) groanSfx(.25, 3); }
  if (e==='flicker'){ lampOverride = 2.5; creakSfx(); if (phase>=2 && Math.random()<.6){ blackT = 2.2; setTimeout(()=>{ paleFigure.position.set(.3, water.position.y - .25, raftPos.z - 2.6); paleFigure.rotation.y = 0; paleFigure.visible = true; paleT = 1.4; loseLuc(6, `era sulla zattera`); heartSfx(.7); }, 2200); } }
  if (e==='bell'){ bellSfx(1.6); loseLuc(2, `la campana`); for (let k=0;k<4;k++) setTimeout(()=>{ const p = spotAhead(8, 16, 1, .5); if (p) ripple(p.x, p.z, 1.6); }, k*700); sub(`(una campana, sott'acqua. Davanti a te l'acqua trema a cerchi)`, 3.5); }
  if (e==='whisper'){ whisperSfx(2.8,.25); sub(zalgo(pick(WHISPERS), S.luc < 40 ? 3 : 0), 3); loseLuc(1.5, `i sussurri`); }
  if (e==='name'){
    whisperSfx(3.5,.3); sub(`...Tobia... sono qui sotto... Tobia, rispondi...`, 4);
    setTimeout(()=> promptAsk(`Dall'acqua, sotto il pontile, qualcuno ti chiama per nome. Ha la voce di tua madre.`, `RISPONDI`, `TACI`, yes=>{
      if (yes){ scare(); loseLuc(25, `hai risposto`); setTimeout(()=>sub(`...ti abbiamo sentito...`, 3), 1500); }
      else { gainLuc(4, `non hai risposto`); setTimeout(()=>{ whisperSfx(1.5,.15); sub(`...la prossima volta...`, 3); }, 2500); }
    }), 2600);
  }
  if (e==='ladder'){
    { let zz = raftPos.z + 2.5, xx = raftPos.x + rand(-2.5,2.5); for (let k=0;k<40 && H(xx, zz) < waterY + .05; k++) zz += .5; envelope.position.set(xx, H(xx, zz) + .02, zz); envelope.rotation.y = rand(0,6.3); envelope.visible = true; setTimeout(()=>{ envelope.visible = false; }, 26000); attend(envelope.position, .7, 1.8); }
    promptAsk(`Nel fango, a pochi metri dalla zattera, c'è una busta della Ditta Sesti. Di notte non si scende dalla zattera.`, `SCENDI A PRENDERLA`, `RESTA SULLA ZATTERA`, yes=>{
      envelope.visible = false; if (!yes) return;
      if (Math.random()<.55){ const bonus = Math.max(50, S.money*.25); S.money += bonus; loseLuc(15, `sei sceso dalla zattera`); toast(`Nella busta: € ${fmt(bonus)} e un biglietto. "Lo sapevamo che sarebbe sceso."`, 'find'); whisperSfx(2,.25); }
      else { scare(); loseLuc(30, `qualcosa ti ha afferrato`); toast(`Qualcosa ti ha afferrato la caviglia. Sei risalito. Non ricordi come.`, 'warn'); }
    });
  }
  if (e==='radio'){ staticSfx(1.5); toast(pick(RADIO_LINES)); }
  if (e==='glitch'){ glitchT = 1.6; play('glitch', {vol:.25, rev:.1}); }
  if (e==='scare'){ scare(); loseLuc(10, `l'hai visto`); }
  if (e==='quake'){ shakeAmt = 1; groanSfx(.7,4); creakSfx(); setTimeout(creakSfx,400); makeWave(0, 0, 1.6); for (let k=0;k<8;k++) setTimeout(()=>{ const a = rand(0,6.3), r = shoreR(S.d) - 1; splashFX(Math.cos(a)*r, waterY, Math.sin(a)*r, 1.5, 1.5); }, k*350); }
  if (e==='lightning'){ lightning(); }
  if (e==='leviathan'){ if (startLeviathan()) loseLuc(5, `qualcosa sotto di te`); }
  if (e==='eyes'){ startShoreEyes(); }
  if (e==='chant'){ choirBoost = 7; whisperSfx(5,.2); sub(zalgo(pick(CHANTS), 2+phase), 5); loseLuc(2, `il canto`); }
}
/* ---------- lampi ---------- */
let lightK = 0, lightSeq = [];
function lightning(withThunder=true){ const n = performance.now()/1000; lightSeq = [n, n+.11, n+.32 + Math.random()*.2]; if (withThunder) thunderSfx(rand(1,2.6), .8); }
function lightUpdate(dt){ const n = performance.now()/1000; let k = 0; for (const t0 of lightSeq){ const dtt = n - t0; if (dtt >= 0 && dtt < .5) k = Math.max(k, Math.exp(-dtt*14)*(t0===lightSeq[0]?1:.7)); } lightK = k; }
/* ---------- la cosa sotto l'acqua ---------- */
const LEV = { on:false, t:0, dur:14, a:new THREE.Vector2(), b:new THREE.Vector2(), r:8, c:new THREE.Vector2(), sc:1, y:null };
function levPath(k, out){ const u = 1-k; out.set(u*u*LEV.a.x + 2*u*k*LEV.c.x + k*k*LEV.b.x, 0, u*u*LEV.a.y + 2*u*k*LEV.c.y + k*k*LEV.b.y); return out; }
function startLeviathan(){
  // arriva dal nero verso il centro del lago, ti passa sotto, torna nel nero: tutto il tragitto è in acqua profonda
  const sr = shoreR(S.d), under = waterY - H(raftPos.x, raftPos.z - 6), centerDepth = waterY - H(0,0);
  if (centerDepth < 16 || under < 6){ LEV.on = false; return false; }
  // gli estremi del tragitto: i punti più profondi verso il centro, uno per lato
  const toC = Math.atan2(-raftPos.z, -raftPos.x), sgn = Math.random()<.5 ? 1 : -1;
  const deepest = side => { let best = null, bd = -1e9; for (let i=0;i<40;i++){ const a = toC + side*rand(.25, 1.2), r = rand(18, Math.max(20, Math.min(sr*1.6, 70))), x = raftPos.x + Math.cos(a)*r, z = raftPos.z + Math.sin(a)*r;
      if (Math.hypot(x,z) > sr - 3) continue; const dd = waterY - H(x,z) - Math.max(0, 30 - r)*.3; if (dd > bd){ bd = dd; best = new THREE.Vector2(x, z); } } return best || new THREE.Vector2(raftPos.x*.3 + side*4, raftPos.z*.3); };
  LEV.a = deepest(sgn); LEV.b = deepest(-sgn);
  const P = new THREE.Vector2(raftPos.x + rand(-3,3), raftPos.z - rand(5,10));
  LEV.c = new THREE.Vector2(2*P.x - (LEV.a.x+LEV.b.x)/2, 2*P.y - (LEV.a.y+LEV.b.y)/2);
  LEV.sc = clamp(Math.min(under/9.5, centerDepth/14, sr*.035), .35, 1.6); LEV.r = LEV.sc*9;
  LEV.t = 0; LEV.waved = 0; LEV.dur = rand(16,21); LEV.on = true; LEV.y = null;
  creatureSfx({ kind:'call', far:.45, vol:.95 }); setTimeout(()=>bubbleSfx(), 3000); return true;
}
const levP = new THREE.Vector3(), levQ = new THREE.Vector3();
function levUpdate(dt){
  if (!LEV.on){ waterU.uShadow.value.w = Math.max(0, waterU.uShadow.value.w - dt); return; }
  LEV.t += dt; const k = clamp(LEV.t/LEV.dur, 0, 1), up = smooth(0,.38,k)*(1 - smooth(.62,1,k));
  levPath(k, levP); levPath(Math.min(1, k+.01), levQ); const x = levP.x, z = levP.z;
  waterU.uShadow.value.set(x, z, LEV.r, up*.95);
  waterU.uShadowA.value = -Math.atan2(levQ.z-z, levQ.x-x);
  if (up > .5){ if (Math.random() < dt*.8) ripple(x + rand(-LEV.r,LEV.r)*.5, z + rand(-LEV.r,LEV.r)*.3, 1.4);
    if (Math.random() < dt*.35) splashFX(x + rand(-LEV.r,LEV.r)*.4, waterY, z + rand(-LEV.r,LEV.r)*.3, .35, 1); }
  if (k > .45 && !LEV.waved){ LEV.waved = 1; makeWave(x, z, LEV.r*.12); }
  if (k >= 1){ LEV.on = false; waterU.uShadow.value.w = 0; }
}
/* ---------- occhi nel buio ---------- */
const seObj = new THREE.Object3D();
function startShoreEyes(){
  const sr = shoreR(S.d); SE.list = []; SE.t = rand(10,16);
  const n = Math.min(SE_N, 6 + phase*5 + Math.floor((100-S.luc)/10));
  for (let i=0;i<n;i++){ const a = Math.PI/2 + rand(.5, Math.PI*2-.5), r = sr + rand(1.5, 9), x = Math.cos(a)*r, z = Math.sin(a)*r;
    SE.list.push({ p:new THREE.Vector3(x, Math.max(H(x,z), waterY) + rand(.4,2.2), z), ph:rand(0,50), rate:rand(.4,1.4), alive:true, s:rand(.8,1.6) }); }
  whisperSfx(2.5,.18); heartSfx(.4);
}
function shoreEyesUpdate(dt){
  if (SE.t <= 0){ shoreEyes.count = 0; return; }
  SE.t -= dt; camera.getWorldDirection(fwd); let c = 0;
  for (const e of SE.list){ if (!e.alive) continue;
    tmpV.copy(e.p).sub(camera.position).normalize();
    if (fwd.dot(tmpV) > .992 && S.torchOn){ e.alive = false; if (Math.random()<.4) whisperSfx(.8,.12); continue; }
    const open = clamp(Math.sin(T*e.rate + e.ph)*5 + 4, 0, 1) * clamp(SE.t, 0, 1);
    seObj.position.copy(e.p); seObj.lookAt(camera.position); seObj.scale.set(e.s*1.6, e.s*1.6*Math.max(.02,open), e.s*1.6); seObj.updateMatrix();
    shoreEyes.setMatrixAt(c++, seObj.matrix); }
  shoreEyes.count = c; shoreEyes.instanceMatrix.needsUpdate = true;
}
/* =====================================================================
   NUOVI EVENTI: cose che succedono mentre lavori
   ===================================================================== */
const X_ = { big:0, hand:null, behind:null, prints:0, fish:0, bodies:0, mouth:null, dg:null, fog:0, green:0, torchKill:0, breath:0, breathPh:0, blood:0, dock:null, carL:0, left:null, tugNext:false, tug:0, amb:6, knocked:false };
const wetMat = new THREE.MeshStandardMaterial({color:0x56604f, roughness:.25, metalness:.05});
const lookingAt = (p, thr=.975) => { camera.getWorldDirection(fwd); tmpV.copy(p).sub(camera.position).normalize(); return fwd.dot(tmpV) > thr; };
// la mano che si aggrappa alla zattera
const handObj = (()=>{ const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(.14,.045,.16), wetMat, 0,0,0));
  for (let i=0;i<4;i++){ const f = new THREE.Group(); f.position.set(-.052+i*.035, 0, .075); f.rotation.y = (i-1.5)*.06; let parent = f;
    for (let k=0;k<3;k++){ const seg = new THREE.Group(); seg.position.z = k ? .085 : 0; seg.rotation.x = k ? .55 : -.15; seg.add(mesh(new THREE.CylinderGeometry(.01,.013,.09,5).rotateX(Math.PI/2).translate(0,0,.045), wetMat)); parent.add(seg); parent = seg; }
    const nail = mesh(new THREE.BoxGeometry(.016,.006,.03), M.leather, 0,.008,.07); parent.add(nail); g.add(f); }
  const th = mesh(new THREE.CylinderGeometry(.012,.015,.1,5).rotateX(Math.PI/2).translate(0,0,.05), wetMat, -.075,-.01,0); th.rotation.y = -.9; g.add(th);
  const arm = mesh(new THREE.CylinderGeometry(.035,.05,1.6,7).translate(0,-.8,0), wetMat, 0,-.01,-.07); arm.rotation.x = .55; g.add(arm);
  g.visible = false; raft.add(g); return g; })();
const headObj = (()=>{ const g = new THREE.Group(); const hd = mesh(new THREE.SphereGeometry(.17,12,10), wetMat); hd.scale.set(.92,1.18,1); g.add(hd);
  for (const sx of [-1,1]){ g.add(mesh(new THREE.SphereGeometry(.045,8,6), M.black, sx*.06,.04,.14)); g.add(mesh(new THREE.SphereGeometry(.012,6,4), eyeGlowMat, sx*.06,.04,.18)); }
  const hair = mesh(new THREE.SphereGeometry(.18,10,8,0,Math.PI*2,0,Math.PI*.6), M.black, 0,.03,-.01); g.add(hair);
  for (let k=0;k<14;k++){ const st = mesh(new THREE.CylinderGeometry(.006,.002,rand(.2,.4),3), M.black, rand(-.15,.15), -.1, rand(-.15,.05)); g.add(st); }
  g.visible = false; scene.add(g); return g; })();
// la figura dietro di te
const behindFig = mesh(figureGeo(2.55, 1.3), ghoulMat); behindFig.visible = false; raft.add(behindFig);
{ const e = mesh(eyePairGeo, eyeGlowMat, ...eyeAt(2.55, 1.3)); behindFig.add(e); }
// impronte bagnate sulla zattera
const printMat = new THREE.MeshBasicMaterial({color:0x000000, transparent:true, opacity:0, depthWrite:false, side:THREE.DoubleSide});
const prints = new THREE.Group(); raft.add(prints);
function layoutPrints(circle){ const ch = prints.children; for (let i=0;i<ch.length;i+=2){ const k = i/2, m = ch[i], toe = ch[i+1];
    let x, z, rot; if (circle){ const a = k/9*Math.PI*2*1.6 + .3, r = 1.05 + (k%2 ? .1 : -.1); x = Math.cos(a)*r*.9; z = -.3 + Math.sin(a)*r; rot = -a; }
    else { z = 1.65 - k*.36; x = (k%2? .11 : -.11) + Math.sin(k*.7)*.15; rot = 0; }
    m.position.set(x, .37, z); m.rotation.y = rot; toe.position.set(x + Math.sin(rot)*.16, .371, z - Math.cos(rot)*.16); } }
{ const pg = new THREE.CircleGeometry(.07, 10); pg.scale(1,1.9,1); pg.rotateX(-Math.PI/2);
  for (let i=0;i<9;i++){ const z = 1.65 - i*.36, x = (i%2? .11 : -.11) + Math.sin(i*.7)*.15; const m = mesh(pg, printMat, x, .37, z); m.renderOrder = 3; prints.add(m);
    const toes = mesh(new THREE.CircleGeometry(.03,6).rotateX(-Math.PI/2), printMat, x, .371, z-.16); prints.add(toes); } }
// pesci morti
const FISH_N = 60;
const fishGeo = (()=>{ const P = [];
  const prof = [[0,0],[.022,.03],[.05,.1],[.062,.19],[.058,.28],[.04,.36],[.016,.42],[.006,.45]].map(([r,y])=>new THREE.Vector2(r,y));
  const body = new THREE.LatheGeometry(prof, 14); body.rotateZ(-Math.PI/2); body.scale(1,1.15,.5); body.translate(-.22,0,0); P.push(body);
  const tail = new THREE.Shape(); tail.moveTo(0,0); tail.lineTo(-.13,.09); tail.lineTo(-.1,0); tail.lineTo(-.13,-.09); tail.lineTo(0,0);
  const tg = new THREE.ShapeGeometry(tail); tg.translate(-.2,0,0); P.push(tg);
  const dor = new THREE.Shape(); dor.moveTo(-.08,.055); dor.lineTo(0,.11); dor.lineTo(.06,.06); const dg = new THREE.ShapeGeometry(dor); P.push(dg);
  const fin = new THREE.Shape(); fin.moveTo(.06,-.04); fin.lineTo(.0,-.075); fin.lineTo(-.03,-.045); const fg = new THREE.ShapeGeometry(fin); P.push(fg);
  for (const sz of [-1,1]){ const e = new THREE.SphereGeometry(.013,6,4); e.translate(.17,.015,sz*.026); e.userData.eye = true; P.push(e); }
  const parts = P.map(q=>{ const g = q.index ? q.toNonIndexed() : q; const n = g.attributes.position.count, col = new Float32Array(n*3), p = g.attributes.position;
    for (let i=0;i<n;i++){ const y = p.getY(i), eye = q.userData.eye; const back = eye ? 0 : clamp(.5 + y*9, 0, 1); col[i*3] = eye ? .02 : lerp(.78,.2,back); col[i*3+1] = eye ? .02 : lerp(.8,.25,back); col[i*3+2] = eye ? .02 : lerp(.76,.24,back); }
    g.setAttribute('color', new THREE.BufferAttribute(col,3)); if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n*2),2)); return g; });
  const m = mergeGeometries(parts); m.scale(1.7,1.7,1.7); return m; })();
const fishObj = new THREE.Object3D(); fishObj.rotation.order = 'YXZ';
const fishMesh = new THREE.InstancedMesh(fishGeo, new THREE.MeshStandardMaterial({color:0xffffff, vertexColors:true, roughness:.3, metalness:.35, side:THREE.DoubleSide}), FISH_N); fishMesh.count = 0; fishMesh.frustumCulled = false; scene.add(fishMesh);
const fishData = [];
// corpi che galleggiano
const floaters = [0,1,2,3].map(()=>{ const c = makeCorpse(0,0,0); c.visible = false; scene.add(c); return c; });
// la bocca nell'acqua
const mouthObj = (()=>{ const g = new THREE.Group();
  g.add(mesh(new THREE.TorusGeometry(2.1,.55,10,32).rotateX(Math.PI/2), M.flesh));
  g.add(mesh(new THREE.CircleGeometry(1.9,32).rotateX(-Math.PI/2), new THREE.MeshBasicMaterial({color:new THREE.Color(.35,.02,.015)}), 0,.05,0));
  g.add(mesh(new THREE.CircleGeometry(1.0,24).rotateX(-Math.PI/2), M.black, 0,.06,0));
  for (let r of [1.75, 1.35]) for (let k=0;k<22;k++){ const a = k/22*Math.PI*2 + r; const t = mesh(new THREE.ConeGeometry(.09,.55,5), M.bone, Math.cos(a)*r,.25,Math.sin(a)*r); t.rotation.z = Math.cos(a)*.9; t.rotation.x = -Math.sin(a)*.9; g.add(t); }
  g.visible = false; scene.add(g); return g; })();
// il doppio con la lanterna
const dgObj = (()=>{ const g = new THREE.Group(); g.add(mesh(figureGeo(2.2), ghoulMat)); g.add(mesh(new THREE.SphereGeometry(.09,8,6), new THREE.MeshBasicMaterial({color:new THREE.Color(5,3.2,1.4)}), .32,1.15,.12)); g.visible = false; scene.add(g); return g; })();
// figure nella nebbia
const fogFigs = [0,1,2,3,4,5,6].map(()=>{ const f = mesh(FIG, ghoulMat); f.visible = false; scene.add(f); return f; });
// il paese sul pontile
const dockFigs = [];
for (let i=0;i<10;i++){ const ft = rand(1.9,2.3), fh = rand(.8,1.4); const f = mesh(figureGeo(ft, fh), ghoulMat); f.add(mesh(eyePairGeo, eyeGlowMat, ...eyeAt(ft, fh))); f.position.set((i%2? 1.2 : -1.2)+rand(-.2,.2), 1.38, 83.5 + i*1.4); f.visible = false; scene.add(f); dockFigs.push(f); }
// le fiaccole: chi guarda dal pontile e dalla riva porta il fuoco, così lo vedi anche da laggiù, al buio
const flameTex = (()=>{ const c = document.createElement('canvas'); c.width = 64; c.height = 128; const X = c.getContext('2d');
  const g = X.createRadialGradient(32,84,2,32,80,34); g.addColorStop(0,'rgba(255,250,220,1)'); g.addColorStop(.25,'rgba(255,190,90,.95)'); g.addColorStop(.6,'rgba(230,90,20,.45)'); g.addColorStop(1,'rgba(120,20,0,0)');
  X.fillStyle = g; X.beginPath(); X.moveTo(32,4); X.bezierCurveTo(52,50,62,80,52,104); X.quadraticCurveTo(32,126,12,104); X.bezierCurveTo(2,80,12,50,32,4); X.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const flameMat = new THREE.SpriteMaterial({ map:flameTex, color:new THREE.Color(6,3.8,2), blending:THREE.AdditiveBlending, depthWrite:false, transparent:true }); flameMat.userData.murk = true;
const haloMat = new THREE.SpriteMaterial({ map:deepGlowTex(), color:new THREE.Color(1.5,.62,.2), blending:THREE.AdditiveBlending, depthWrite:false, transparent:true }); haloMat.userData.murk = true;
function deepGlowTex(){ const c = document.createElement('canvas'); c.width = c.height = 64; const X = c.getContext('2d'); const g = X.createRadialGradient(32,32,0,32,32,32); g.addColorStop(0,'rgba(255,255,255,.9)'); g.addColorStop(.35,'rgba(255,255,255,.25)'); g.addColorStop(1,'rgba(255,255,255,0)'); X.fillStyle = g; X.fillRect(0,0,64,64); const t = new THREE.CanvasTexture(c); return t; }
const torches = [];
function addTorch(f){ const tg = new THREE.Group(); tg.position.set(.26, 0, .16);
  const st = mesh(new THREE.CylinderGeometry(.025,.035,1.3,5), M.woodDark, 0, 1.55, 0); st.rotation.z = -.12; tg.add(st);
  tg.add(mesh(new THREE.CylinderGeometry(.06,.045,.18,6), M.rust, -.08, 2.22, 0));
  const fl = new THREE.Sprite(flameMat); fl.position.set(-.09, 2.5, 0); fl.scale.set(.32,.62,1); tg.add(fl);
  const ha = new THREE.Sprite(haloMat); ha.position.set(-.09, 2.42, 0); ha.scale.setScalar(2.4); tg.add(ha);
  f.add(tg); torches.push({ f, fl, ha, k:0, ph:rand(0,50) }); }
dockFigs.forEach((f,i)=>{ if (i%3 !== 2) addTorch(f); });
// altri, più indietro, sulla riva ai due lati del pontile
for (let i=0;i<9;i++){ const a = Math.PI/2 + (i%2 ? 1 : -1)*rand(.05,.2), r = rand(97,104), x = Math.cos(a)*r, z = Math.sin(a)*r; const ft = rand(1.9,2.3), fh = rand(.8,1.3);
  const f = mesh(figureGeo(ft, fh), ghoulMat); f.add(mesh(eyePairGeo, eyeGlowMat, ...eyeAt(ft, fh))); f.position.set(x, H(x,z) - .05, z); f.visible = false; scene.add(f); dockFigs.push(f); if (i%4 !== 3) addTorch(f); }
const dockLight = new THREE.PointLight(0xff8a3a, 0, 34, 1.4); dockLight.position.set(0, 4.5, 91); scene.add(dockLight);
const DOCK_C = new THREE.Vector3(0, 3, 92);
const wfPos = new THREE.Vector3();
// un oggetto sparisce davvero solo quando non lo stai guardando, o quando l'acqua nera l'ha coperto
const _fr = new THREE.Frustum(), _pm = new THREE.Matrix4(), _sph = new THREE.Sphere();
function inView(obj, r=2){ _pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); _fr.setFromProjectionMatrix(_pm); obj.getWorldPosition(_sph.center); _sph.radius = r; return _fr.intersectsSphere(_sph); }
const gone = (obj, r=2) => obj.position.y < waterY - 22 || obj.position.y < H(obj.position.x, obj.position.z) - 1 || (!inView(obj, r) && obj.position.y < waterY - 3);
// punto sull'acqua con almeno 'need' metri di fondale
function wetSpot(x, z, need=1.5){ return H(x,z) < waterY - need && Math.hypot(x,z) < shoreR(S.d) - 1; }

function startEv(name){
  think(name, 7);
  if (NEWEV[name]){ NEWEV[name](); return; }
  const sr = shoreR(S.d);
  if (name==='hand'){ headObj.position.set(raftPos.x + rand(-1.5,1.5), waterY - .5, raftPos.z - rand(3.5,5)); headObj.visible = true; setTimeout(()=>{ splashFX(headObj.position.x, waterY, headObj.position.z, .5, .6); surfaceSfx(.5); }, 500); setTimeout(()=>{ handObj.getWorldPosition(wfPos); splashFX(wfPos.x, waterY, wfPos.z, .35, .4); slitherSfx(.25); }, 900); handObj.position.set(rand(-.9,.9), -.7, -1.66); handObj.rotation.set(0, rand(-.3,.3), 0); handObj.visible = true; X_.hand = {t:0, seen:0, gone:false}; X_.big = 11; setTimeout(()=>{ dripSfx(.2); knockSfx(.3); }, 600); setTimeout(()=>breathSfx(false,1.6,.18), 2500); }
  if (name==='behind'){ behindFig.position.set(rand(-.5,.5), .36, 1.35); behindFig.rotation.y = Math.PI; behindFig.visible = true; X_.behind = {t:0, seen:0}; X_.big = 10;
    [0,.8,1.7,2.4].forEach((d,i)=> setTimeout(()=>{ footstepSfx(); if (i%2) creakSfx(); }, d*1000)); setTimeout(()=>breathSfx(true,2.4,.14), 3000); setTimeout(()=>breathSfx(false,2.4,.12), 5600); }
  if (name==='prints'){ const pv = PRINTS[((S.evc.prints||1)-1) % PRINTS.length]; prints.scale.set(pv.s, 1, pv.s*(pv.rev?-1:1)); layoutPrints(pv.circle); X_.prints = 30; dripSfx(.15); setTimeout(()=>dripSfx(.12), 400); setTimeout(()=>toast(pv.t), 2500); }
  if (name==='fish'){ fishData.length = 0; for (let i=0;i<FISH_N;i++){ const a = rand(0,Math.PI*2), r = rand(2.2, Math.min(11, sr*.5)); const x = raftPos.x + Math.cos(a)*r*1.3, z = raftPos.z - 5 + Math.sin(a)*r*.6; if (Math.hypot(x,z) > sr - 1) continue; fishData.push({x, z, ry:rand(0,6.3), ph:rand(0,6), sc:rand(.75,1.3)}); }
    X_.fish = 32; bubbleSfx(); fishData.forEach((f,i)=>{ if (i%3===0) setTimeout(()=>splashFX(f.x, waterY, f.z, .2, .3), 1500 + Math.random()*2500); }); setTimeout(()=>toast(`Pesci morti affiorano tutti insieme, a pancia in su. Hanno gli occhi rivolti verso di te.`), 2500); }
  if (name==='bodies'){ floaters.forEach((c,i)=>{ let x, z, k = 0; do { const a = rand(0,Math.PI*2), r = rand(7, Math.min(22, sr*.6)); x = raftPos.x + Math.cos(a)*r; z = raftPos.z - 5 + Math.sin(a)*r*.7; } while (!wetSpot(x, z, 3) && ++k < 30);
      c.position.set(x, waterY - 3.5, z); c.rotation.set(0, rand(0,6.3), 0); c.userData = { v:new THREE.Vector2(raftPos.x - x, raftPos.z - z).normalize().multiplyScalar(rand(.15,.3)), st:'rise', d:i*.5 + rand(0,.4), ph:rand(0,6) }; c.visible = true; });
    X_.bodies = 26; X_.big = 8; groanSfx(.3,4); floaters.forEach((c,i)=> setTimeout(()=>{ splashFX(c.position.x, waterY, c.position.z, .45, .7); if (i===0) surfaceSfx(.7); }, 300 + i*500)); setTimeout(()=>sub(`...siamo tornati a cena...`, 3), 3500); }
  if (name==='mouth'){ mouthObj.position.set(rand(-3,3), waterY, raftPos.z - rand(9,12)); mouthObj.scale.setScalar(.01); mouthObj.visible = true; X_.mouth = {t:0}; X_.big = 9; bubbleSfx(); setTimeout(()=>{ surfaceSfx(1.6); for (let k=0;k<8;k++){ const a = k/8*Math.PI*2; splashFX(mouthObj.position.x + Math.cos(a)*2.2, waterY, mouthObj.position.z + Math.sin(a)*2.2, .7, .6); } }, 600); setTimeout(()=>groanSfx(.6,4), 1200); attend(mouthObj.position, .6, 2); }
  if (name==='dg'){ const a = rand(-.9,.9) - Math.PI/2, r = sr + 3; const far = new THREE.Vector3(Math.cos(a)*r, 0, Math.sin(a)*r); far.y = Math.max(H(far.x,far.z), waterY) ; X_.dg = { step:0, far, seen:false, away:0, t:0 }; dgObj.position.copy(far); dgObj.lookAt(camera.position.x, far.y, camera.position.z); dgObj.visible = true; X_.big = 30; }
  if (name==='fog'){ X_.fog = 18; X_.big = 18; fogFigs.forEach((f,i)=>{ f.userData.a = i/fogFigs.length*Math.PI*2; f.visible = true; }); whisperSfx(4,.2); setTimeout(()=>whisperSfx(4,.25), 5000); setTimeout(()=>sub(zalgo(`...siamo tutti qui... tutti intorno...`, phase>=3?2:0), 4), 6000); }
  if (name==='green'){ X_.green = 7; whisperSfx(3,.2); sub(zalgo(pick(CHANTS), 1), 4); }
  if (name==='torch'){ X_.torchKill = 4.5; play('click', {vol:.5, rev:.05}); setTimeout(()=>breathSfx(true,2,.2), 1200); setTimeout(()=>breathSfx(false,1.8,.22), 3000);
    setTimeout(()=>{ if (!running) return; paleFigure.position.set(rand(-.6,.6), waterY - .25, raftPos.z - 2.4); paleFigure.rotation.y = 0; paleFigure.visible = true; paleT = .9; heartSfx(.8); loseLuc(6, `era davanti a te`); }, 4500); }
  if (name==='knock'){ const pan = rand(-.4,.4), kv = KNOCKS[(S.evc.knock||1) % KNOCKS.length]; kv.p.forEach(d=> setTimeout(()=>{ knockSfx(kv.v, pan); knockFX(kv.v); shakeAmt = Math.max(shakeAmt,.25*kv.v); }, d*1000));
    if (kv.ask){ setTimeout(()=> promptAsk(kv.t, `BUSSA ANCHE TU`, `NON FARE NIENTE`, yes=>{
      if (yes){ [0,.4,.8,1.2].forEach(d=> setTimeout(()=>{ knockSfx(1, pan); knockFX(1.3); shakeAmt = .5; }, 900 + d*1000)); setTimeout(()=>{ whisperSfx(2,.3); sub(`...grazie... ora possiamo salire...`, 3.5); loseLuc(8, `hai bussato`); EV.next = 6; X_.forceHand = true; }, 6000); }
      else { gainLuc(2, `non hai bussato`); setTimeout(()=>knockSfx(.4, pan), 5000); }
    }), 2200); } else setTimeout(()=>sub(kv.t, 4.5), 1800); }
  if (name==='lost'){ $('fade').style.transition = 'opacity .15s'; $('fade').style.opacity = 1; holdBucket = false; staticSfx(.6);
    setTimeout(()=>{ S.time += 110; yawT += Math.PI; yaw = yawT; X_.prints = 25; loseLuc(8, `tempo perduto`); $('fade').style.transition = 'opacity 1.5s'; $('fade').style.opacity = 0;
      toast(`Hai perso due ore. Hai i capelli bagnati e le mani piene di fango. Sei girato dall'altra parte.`, 'warn'); heartSfx(.6); }, 1900); }
  if (name==='music'){ if (!startDrift('musicbox', true)) musicBoxSfx(.18); setTimeout(()=>sub(`(un carillon suona. Galleggia vicino alla zattera, aperto)`, 4), 1500); }
  if (name==='sublim'){ const el = $('subliminal'); el.textContent = pick(['TI VEDE','SCENDI','È SVEGLIO','NON VOLTARTI','SEI GIÀ QUI','CONTA','TOBIA']); el.classList.remove('hidden'); setTimeout(()=>el.classList.add('hidden'), 70); }
  if (name==='breath'){ X_.breath = 24; X_.big = 20; X_.breathPh = 0; setTimeout(()=>toast(`Il lago si alza e si abbassa. Lentamente. Respira.`, 'cosmic'), 3000); }
  if (name==='blood'){ X_.blood = 22; X_.big = 14; setTimeout(()=>toast(`L'acqua si è fatta scura. È calda, e ha l'odore del ferro.`, 'warn'), 2500); groanSfx(.3,5); }
  if (name==='dock'){ X_.dock = {t:0, seen:0, out:false, outT:0}; X_.big = 6; dockFigs.forEach(f=>{ f.visible = true; f.lookAt(camera.position.x, f.position.y, camera.position.z); }); torches.forEach(t=>{ t.k = 0; t.on = true; });
    bellSfx(1.4); setTimeout(()=>sfxNoise({dur:6, f:700, q:.6, vol:.035, a:2, rev:.4}), 600);
    setTimeout(()=>toast(pick([`Alle tue spalle, lassù sul pontile, si sono accese delle fiaccole. C'è gente. Ti guardano lavorare. Indossano vestiti di settant'anni fa.`,`Dietro di te, in alto: fiaccole sul pontile e sulla riva. Un paese intero, in silenzio, che ti guarda lavorare.`])), 3000); }
  if (name==='car'){ X_.carL = 9; honkSfx(); setTimeout(()=>toast(`Nel fango, i fari della berlina si sono accesi.`), 1500); }
  if (name==='left'){ call(`DITTA SESTI`, `Signor Ferri. Non guardi alla sua sinistra. Per nessun motivo. Continui a lavorare.`);
    setTimeout(()=>{ if (!running) return; wfPos.set(raftPos.x - 6.5, waterY - .55, raftPos.z - 1.5); waterFigure.position.copy(wfPos); waterFigure.rotation.y = Math.atan2(raftPos.x-wfPos.x, raftPos.z-wfPos.z); waterFigure.visible = true; X_.left = {t:0, seen:0}; }, 9000); }
  if (name==='silent'){ call(`NUMERO SCONOSCIUTO`, `. . . . . . . . . . (qualcuno respira, molto vicino al microfono. Si sente gocciolare.) . . . . . . . . . Tobia.`); }
  if (name==='tug'){ X_.tugNext = true; }
  if (name==='titan'){ startTitan(); }
  if (name==='bump'){ hullDamage(6); raftJolt = 1; knockSfx(1, 0); [[-1.6,-1.8],[1.6,-1.8],[-1.6,1.8],[1.6,1.8]].forEach(([dx,dz])=> splashFX(raftPos.x+dx, waterY, raftPos.z+dz, .55, .5)); surfaceSfx(.8); groanSfx(.45, 3); setTimeout(()=>bubbleSfx(), 600); loseLuc(4, `qualcosa ha urtato la zattera da sotto`); setTimeout(()=>sub(pick([`(qualcosa di enorme è passato sotto la zattera e l'ha sfiorata)`,`(il legno ha tremato. Sotto, qualcosa si è girato nel sonno)`,`(un urto da sotto. Come una schiena che si inarca)`]), 4), 900); }
  if (name==='tentRaft'){ tentRaft.position.set(rand(-.6,.6), 0, -1.75); tentRaft.rotation.set(0, Math.PI + rand(-.4,.4), 0); tentRaft.visible = true; X_.tentR = {t:0, seen:0, gone:false}; X_.big = 10; tentRaft.getWorldPosition(wfPos); splashFX(wfPos.x, waterY, wfPos.z, .9, .6); surfaceSfx(.7); setTimeout(()=>slitherSfx(.6, .1), 300); setTimeout(()=>{ creakSfx(); slitherSfx(.45, -.1); }, 1600); attend(wfPos.setY(waterY+.4), .8, 1.4); }
  if (name==='surfEye'){ const dx = rand(-2.5,2.5); surfEye.position.set(raftPos.x + dx, waterY + .03, raftPos.z - rand(4,6)); surfEye.rotation.y = rand(-.3,.3); surfEye.scale.set(1,1,.02); surfEye.visible = true; X_.sEye = {t:0}; X_.big = 9; bubbleSfx(); setTimeout(()=>{ surfaceSfx(.8); splashFX(surfEye.position.x, waterY, surfEye.position.z, .6, 1.6); }, 400); setTimeout(()=>heartSfx(.7), 1500); attend(surfEye.position, .7, 2); }
  if (name==='hands'){ handData.length = 0; for (let i=0;i<HANDS_N;i++){ const a = i/HANDS_N*Math.PI*2 + rand(-.15,.15), r = rand(2.6,5.5); const hx = raftPos.x + Math.cos(a)*r, hz = raftPos.z + Math.sin(a)*r; handData.push({x:hx, z:hz, ry:Math.atan2(raftPos.x - hx, raftPos.z - hz) + rand(-.3,.3), d:rand(0,1.2), sp:rand(.8,1.3)}); }
    X_.hands = {t:0}; X_.big = 12; whisperSfx(3,.25); setTimeout(()=>surfaceSfx(1.2), 300); setTimeout(()=>sub(`(mani. Tutto intorno alla zattera. Si aprono verso di te)`, 4), 1500); }
  if (name==='rowboat'){ const sgn = Math.random()<.5?-1:1, z0 = raftPos.z - rand(11,15); let ax = 0; while (ax < 34 && wetSpot(raftPos.x + sgn*(ax+2), z0 - 2, 1.6)) ax += 1;
    if (ax < 10){ startEv('bodies'); return; }
    X_.boat = {t:0, st:'row', a:new THREE.Vector3(raftPos.x + sgn*ax, waterY, z0 - 2), b:new THREE.Vector3(raftPos.x + sgn*rand(-1.5,1.5), waterY, z0)}; rowboat.position.copy(X_.boat.a); rowboat.rotation.set(0,0,0); rowboat.userData.lan.material.color.setRGB(5,3,1.2); rowboat.visible = true; X_.big = 30; setTimeout(()=>toast(pick([`Una barca a remi scivola sul lago, senza remi. C'è qualcuno seduto. Ha una lanterna.`,`Una barca passa lenta davanti a te. Chi c'è sopra non rema. Gira la testa mentre ti passa davanti.`])), 3000); }
  if (name==='selfCorpse'){ floaters.forEach(f=>{ if (f.visible && f.userData.st !== 'sink'){ f.userData.st = 'sink'; f.userData.sk = 0; } }); const c = floaters[0]; c.position.set(raftPos.x + rand(-4,4), waterY - 3.5, raftPos.z - 9); c.rotation.set(0, rand(0,6.3), Math.PI); c.userData = { v:new THREE.Vector2(0, .35), st:'rise', d:.5, ph:0 }; c.visible = true; X_.bodies = 22; X_.big = 14; setTimeout(()=>toast(`Un corpo galleggia verso la zattera, a faccia in su. Indossa la tua tuta. Ha la tua faccia, gonfia d'acqua. Sorride.`, 'warn'), 4000); setTimeout(()=>loseLuc(6, `il tuo corpo`), 4200); }
  if (name==='rain'){ X_.rain = 22; X_.big = 20; rain.visible = true; rainP.forEach(p=>{ p.y = rand(-1,8); }); setTimeout(()=>toast(`Piove. Le gocce sono nere e calde. È acqua che cade dal basso verso l'alto, e poi ricade.`, 'cosmic'), 2500); sfxNoise({dur:20, f:1800, q:.4, vol:.08, a:3, rev:.2}); }
  if (name==='starsOut'){ X_.stars = 20; X_.big = 18; setTimeout(()=>toast(`Le stelle si stanno spegnendo. Una alla volta. Come occhi che si chiudono per non guardare.`, 'cosmic'), 2000); deepCallSfx(.4); }
  if (name==='swarm'){ swarmD.length = 0; for (let i=0;i<SWARM_N;i++){ const a = rand(0,Math.PI*2), r = rand(12,26); swarmD.push({s:new THREE.Vector3(raftPos.x+Math.cos(a)*r, waterY-rand(2,5), raftPos.z+Math.sin(a)*r*.6 - 6), ph:rand(0,6), k:i/SWARM_N}); } X_.swarm = {t:0}; X_.big = 18; setTimeout(()=>sub(`(luci, sotto l'acqua. Si radunano sotto di te)`, 4), 2500); }
  if (name==='silence'){ silence(9); R2.still = 8.5; X_.big = 12; setTimeout(()=>sub(`(il lago si è fermato. Non si muove una goccia. Nemmeno la nebbia.)`, 4), 1500); setTimeout(()=>{ breathSfx(false, 2.2, .35); sub(`...Tobia...`, 2.5); }, 8200); setTimeout(()=>loseLuc(3, `il silenzio`), 8500); }
  if (name==='neck'){ breathSfx(true, 2, .32); setTimeout(()=>breathSfx(false, 2.2, .35), 2200); shakeAmt = .3; X_.neck = {t:0, turned:false}; X_.big = 8; sub(`(qualcosa ti respira sul collo)`, 3.5); }
  if (name==='tide'){ tideK = 0; X_.tide = {t:0}; X_.big = 8; rumbleSfx(5,.5); setTimeout(()=>{ for (let k=0;k<6;k++) splashFX(raftPos.x + rand(-1.6,1.6), waterY + .9, raftPos.z - 1.8, .8, .5); }, 1600); setTimeout(()=>{ splashSfx(3, 50); splashSfx(6, 30); }, 1700); setTimeout(()=>toast(`L'acqua è salita di colpo. Poi è tornata giù. Come un respiro trattenuto.`), 4500); }
  if (name==='scrawl'){ const w = pick([`TOBIA`,`SCENDI`,`TI ASPETTIAMO`,`NON CONTARE`,`QUASI`,`SVEGLIALO`]); writeName(w); X_.name = 28; dripSfx(.2); setTimeout(()=>toast(`Sulle assi, davanti a te, qualcuno ha scritto con l'acqua: ${w}.`), 1500); }
  if (name==='bucketThing'){ X_.thingNext = true; }
  if (name==='bellNear'){ [0,4,8,12].forEach((d,i)=> setTimeout(()=>{ bellSfx(2.2 - i*.4); ripple(raftPos.x + rand(-6,6), raftPos.z - 12 + i*3, 1 + i*.6); if (i===3){ raftJolt = .7; loseLuc(4, `la campana sotto di te`); } }, d*1000)); X_.big = 15; setTimeout(()=>sub(`(la campana suona sott'acqua. Ogni rintocco è più vicino)`, 4), 1200); }
  if (name==='reflection'){ reflFig.position.set(raftPos.x + rand(-.5,.5), waterY - .04, raftPos.z - 4.2); reflFig.rotation.set(Math.PI, Math.PI, 0); reflFig.visible = true; X_.refl = {t:0}; X_.big = 11; setTimeout(()=>sub(`(nell'acqua, davanti a te, il riflesso di qualcuno in piedi alle tue spalle)`, 4.5), 1200); }
  if (name==='levx'){ if (!startLeviathan()) { startEv('bump'); return; } loseLuc(5, `qualcosa sotto di te`); setTimeout(()=>sub(`(qualcosa di lungo quanto il paese passa sotto la zattera)`, 4), 6000); }
}
function eventsUpdate(dt){
  if (X_.big > 0) X_.big -= dt;
  // mano
  if (X_.hand){ const h = X_.hand; h.t += dt; handObj.getWorldPosition(wfPos);
    if (!h.gone){ handObj.position.y = lerp(-.7, .375, smooth(0, 1.4, h.t)); raft.rotation.x += Math.sin(T*3)*.004*smooth(1,2,h.t);
      headObj.position.y = waterY - .5 + smooth(.5, 3.5, h.t)*.62; headObj.lookAt(camera.position); if (h.t > 1 && Math.random() < dt*6) dripFX(headObj.position.x, headObj.position.y - .05, headObj.position.z, 1, .12);
      if (h.t > 3.2 && S.torchOn && (lookingAt(wfPos, .96) || lookingAt(headObj.position, .985))) h.seen += dt;
      if (h.seen > 1.3){ h.gone = true; h.tg = h.t; splashSfx(4); splashFX(headObj.position.x, waterY, headObj.position.z, .8, .7); ripple(wfPos.x, wfPos.z, 1); gainLuc(1, `l'hai ricacciato giù`); }
      else if (h.t > 10){ h.gone = true; h.tg = h.t; shakeAmt = 1; splashSfx(3); creakSfx(); loseLuc(10, `qualcosa è salito`); X_.scratch = 90; handObj.getWorldPosition(wfPos); scratches.position.x = clamp(handObj.position.x, -.8, .8); toast(`Qualcosa ha provato a salire sulla zattera. Ha lasciato i segni delle unghie nel legno.`, 'warn'); X_.prints = 20; }
    } else { handObj.position.y -= dt*2.5; headObj.position.y -= dt*3; if (h.t - h.tg > .7) handObj.visible = false; if (h.t - h.tg > 1.6){ headObj.visible = false; X_.hand = null; } } }
  // figura alle spalle
  if (X_.behind){ const b = X_.behind; b.t += dt; camera.getWorldDirection(fwd);
    if (fwd.z > .45){ b.seen += dt; behindFig.position.z = Math.max(.6, behindFig.position.z - dt*.9); if (b.seen > .75 && behindFig.visible){ behindFig.visible = false; heartSfx(.9); stingerSfx(); loseLuc(7, `era alle tue spalle`); postMat.uniforms.uFlash.value = .15; b.done = true; } }
    if (b.t > 9 || b.done){ if (!b.done){ whisperSfx(1.8,.35); sub(`...non voltarti... non voltarti mai...`, 3); loseLuc(3, `qualcosa alle tue spalle`); } behindFig.visible = false; X_.behind = null; } }
  // impronte
  if (X_.prints > 0){ X_.prints -= dt; printMat.opacity = Math.min(.75, X_.prints/6) * Math.min(1, (30 - X_.prints)*2 + .5); } else printMat.opacity = 0;
  // pesci
  if (X_.fish > 0){ X_.fish -= dt; const sink = X_.fish < 7 ? Math.pow((7 - X_.fish)/7, 1.5)*6 : 0, rise = X_.fish > 28 ? (X_.fish - 28)*.6 : 0;
    fishData.forEach((f,i)=>{ fishObj.position.set(f.x, waterY + .01 - sink - rise + Math.sin(T*1.3+f.ph)*.015, f.z); fishObj.rotation.set(Math.PI/2 + .35 + Math.sin(T*.9+f.ph)*.08, f.ry, Math.sin(T*.7+f.ph)*.04); fishObj.scale.setScalar(f.sc||1); fishObj.updateMatrix(); fishMesh.setMatrixAt(i, fishObj.matrix); });
    fishMesh.count = fishData.length; fishMesh.instanceMatrix.needsUpdate = true; } else fishMesh.count = 0;
  // corpi
  if (X_.bodies > 0 || floaters.some(c=>c.visible)){ X_.bodies = Math.max(0, X_.bodies - dt); let any = false;
    floaters.forEach(c=>{ const u = c.userData; if (!c.visible || !u.v) return; any = true; const p = c.position, bob = Math.sin(T*.9 + u.ph)*.035;
      if (u.st === 'rise'){ u.d -= dt; if (u.d < 0){ p.y += (waterY - .12 - p.y)*Math.min(1, dt*.7); if (Math.random() < dt*5) emitDrop(p.x + rand(-.5,.5), waterY, p.z + rand(-.9,.9), 0, rand(.4,1), 0, 1, .6); if (p.y > waterY - .3){ u.st = 'float'; splashFX(p.x, waterY, p.z, .35, .6); } } }
      else if (u.st === 'float'){ const nx = p.x + u.v.x*dt, nz = p.z + u.v.y*dt;
        if (wetSpot(nx + u.v.x*4, nz + u.v.y*4, .5)){ p.x = nx; p.z = nz; } else u.v.multiplyScalar(.9);
        if (Math.hypot(p.x - raftPos.x, p.z - raftPos.z) < 3.2){ u.v.multiplyScalar(.95); c.rotation.y += dt*.05; }
        p.y = Math.max(waterY - .12 + bob + raftHeave*.3, H(p.x,p.z) + .12); c.rotation.z = Math.sin(T*.7 + u.ph)*.05; c.rotation.x = Math.sin(T*.5 + u.ph)*.03;
        if (X_.bodies <= 0){ u.st = 'sink'; u.sk = 0; bubbleSfx(); } }
      else { // affonda: prima le gambe, la testa per ultima, con le bolle
        u.sk += dt; p.y -= dt*Math.min(1.6, .15 + u.sk*.18); c.rotation.x = Math.min(.9, c.rotation.x + dt*.12);
        if (Math.random() < dt*6*Math.max(0, 1 - u.sk/6)) emitDrop(p.x + rand(-.4,.4), waterY, p.z + rand(-.6,.6), 0, rand(.6,1.2), 0, 1, .7);
        if (u.sk < .05) ripple(p.x, p.z, .8);
        if (gone(c, 2)){ c.visible = false; } } });
    if (!any && X_.bodies <= 0) X_.bodies = 0; }
  // bocca
  if (X_.mouth){ const m = X_.mouth; m.t += dt; const open = smooth(0,2.5,m.t) * (1 - smooth(6,7.5,m.t)); mouthObj.scale.set(open+.01, 1, open+.01); mouthObj.position.y = waterY + .02 - smooth(6.5,9,m.t)*1.5; mouthObj.rotation.y += dt*.2;
    if (m.t > 3 && m.t < 3.1) { loseLuc(8, `la bocca`); heartSfx(.6); }
    if (m.t > 6.6 && !m.cl){ m.cl = 1; surfaceSfx(1.2); makeWave(mouthObj.position.x, mouthObj.position.z, 1.4); splashFX(mouthObj.position.x, waterY, mouthObj.position.z, 1.4, 2.2); }
    if (m.t > 9){ mouthObj.visible = false; X_.mouth = null; bubbleSfx(); } }
  // il doppio
  if (X_.dg){ const d = X_.dg; d.t += dt; dgObj.getWorldPosition(wfPos); wfPos.y += 1.2; const look = lookingAt(wfPos, .985);
    if (look){ d.seen = true; d.away = 0; } else if (d.seen){ d.away += dt; if (d.away > 1.4){ d.seen = false; d.away = 0; d.step++;
        const k = d.step/4, tx = lerp(d.far.x, raftPos.x + rand(-1,1), k), tz = lerp(d.far.z, raftPos.z - 2.6, k); dgObj.position.set(tx, d.step >= 4 ? waterY - .3 : Math.max(H(tx,tz), waterY - .3), tz); dgObj.lookAt(camera.position.x, dgObj.position.y, camera.position.z); creakSfx(); if (d.step >= 2) heartSfx(.4 + d.step*.1); } }
    if (d.step >= 4 && look){ scare(); loseLuc(12, `la figura con la lanterna`); dgObj.visible = false; X_.dg = null; }
    else if (d.t > 70 && !inView(dgObj, 1.5)){ dgObj.visible = false; X_.dg = null; } }
  // nebbia con le figure
  if (X_.fog > 0){ X_.fog -= dt; fogFigs.forEach((f,i)=>{ f.userData.a += dt*.12; const r = 7 + Math.sin(T*.5+i)*1.5; f.position.set(raftPos.x + Math.cos(f.userData.a)*r, waterY - .9 - smooth(7, 1.5, X_.fog)*9 - smooth(16, 18, X_.fog)*6, raftPos.z + Math.sin(f.userData.a)*r); f.lookAt(camera.position.x, f.position.y, camera.position.z); }); if (X_.fog <= 0) fogFigs.forEach(f=>f.visible = false); }
  if (X_.green > 0) X_.green -= dt;
  if (X_.torchKill > 0) X_.torchKill -= dt;
  if (X_.carL > 0){ X_.carL -= dt; carLightMat.emissiveIntensity = (Math.random() < .1 ? 0 : 6) * Math.min(1, X_.carL); } else carLightMat.emissiveIntensity = 0;
  if (X_.blood > 0){ X_.blood -= dt; waterU.uBlood.value = smooth(22,18,X_.blood) * smooth(0,4,X_.blood) * .85; } else waterU.uBlood.value = 0;
  if (X_.dock){ const e = X_.dock; e.t += dt; let lit = 0;
    if (!e.out && lookingAt(DOCK_C, .9)){ e.seen += dt; if (e.seen > .6 && !e.saw){ e.saw = true; heartSfx(.5); whisperSfx(2,.12); } }
    if (!e.out && (e.seen > 4.5 || e.t > 34 || (dayF > .5 && phase < 3))){ e.out = true; e.outT = 0; if (e.seen > 4.5){ setTimeout(()=>sub(`(si spengono una alla volta, da quella più vicina. L'ultima resta accesa un po' di più)`, 4), 1200); loseLuc(3, `ti guardavano`); } }
    if (e.out) e.outT += dt;
    torches.forEach((t,i)=>{ if (e.out && t.on && e.outT > i*.45 + (i === torches.length-1 ? 2.5 : 0)){ t.on = false; if (i%4 === 0) sfxNoise({dur:.6, f:2400, q:.5, vol:.03, a:.02, rev:.3}); }
      t.k += ((t.on ? 1 : 0) - t.k)*Math.min(1, dt*(t.on ? 1.2 : 6)); const fk = t.k*(.85 + .15*Math.sin(T*17 + t.ph) + .1*Math.sin(T*7.3 + t.ph*2));
      t.fl.scale.set(.5*fk, .95*fk*(1 + .12*Math.sin(T*11 + t.ph)), 1); t.ha.scale.setScalar(3.6*fk); t.fl.visible = t.ha.visible = fk > .02; lit += fk; });
    dockLight.color.setHex(0xff8a3a); dockLight.distance = 34; dockLight.position.set(0, 4.5 + Math.sin(T*9)*.05, 91); dockLight.intensity = lit*9;
    // chi resta senza fuoco sparisce nel buio, non davanti ai tuoi occhi
    if (e.out && e.outT > torches.length*.45 + 4){ dockFigs.forEach(f=>f.visible = false); dockLight.intensity = 0; X_.dock = null; } }
  if (X_.breath > 0){ X_.breath -= dt; const ph = (X_.breathPh += dt) / 5.5; const prev = Math.floor((X_.breathPh - dt)/5.5*2); if (Math.floor(ph*2) !== prev) breathSfx(Math.floor(ph*2)%2===0, 2.6, .28); }
  if (X_.left){ const l = X_.left; l.t += dt; if (S.torchOn && lookingAt(waterFigure.position, .96)) l.seen += dt;
    if (l.seen > .4){ X_.left = null; wf.sink = 1.2; splashFX(waterFigure.position.x, waterY, waterFigure.position.z, .7, .6); heartSfx(.9); whisperSfx(1.5,.3); sub(`...ti aveva detto di non guardare...`, 3); loseLuc(9, `hai guardato`); }
    else if (l.t > 14){ X_.left = null; wf.sink = 1.2; call(`DITTA SESTI`, `Bravo. Non l'ha guardato. Lui però ha guardato lei.`); } }
  // nuovi eventi
  if (X_.tentR){ const e = X_.tentR; e.t += dt; tentRaft.getWorldPosition(wfPos); wfPos.y += .3;
    const up = e.gone ? Math.max(0, 1 - (e.t - e.tg)*1.5) : smooth(0, 2.5, e.t); tentRaft.position.y = -1.4 + up*1.4; tentRaft.scale.set(1, 1, .4 + up*.6);
    if (!e.gone && e.t > 2 && S.torchOn && lookingAt(wfPos, .95)) e.seen += dt; if (up > .2 && Math.random() < dt*10) dripFX(wfPos.x + rand(-.4,.4), wfPos.y, wfPos.z + rand(-.3,.3), 1, .1);
    if (!e.gone && (e.seen > 1.2 || e.t > 9)){ e.gone = true; e.tg = e.t; splashSfx(3, 8); slitherSfx(.5); splashFX(wfPos.x, waterY, wfPos.z, 1, .7); makeWave(wfPos.x, wfPos.z, .9); if (e.seen > 1.2) gainLuc(2, `l'hai ricacciato giù`); else { raftJolt = .6; loseLuc(8, `il tentacolo sulla zattera`); hullDamage(10, `Il tentacolo ha spaccato due assi della zattera.`); } }
    if (e.gone && e.t - e.tg > .8){ tentRaft.visible = false; X_.tentR = null; } }
  if (X_.sEye){ const e = X_.sEye; e.t += dt; const open = smooth(.5,2.5,e.t) * (1 - smooth(6,7,e.t)) * (Math.abs(Math.sin(e.t*.9)) > .97 ? .1 : 1); surfEye.scale.set(1,1,Math.max(.02,open)); surfEye.material.opacity = Math.min(1, open*1.2); surfEye.position.y = waterY + .03;
    if (e.t > 3 && e.t < 3.05 && lookingAt(surfEye.position, .93)) loseLuc(6, `l'occhio nell'acqua`); if (e.t > 7){ surfEye.visible = false; X_.sEye = null; splashFX(surfEye.position.x, waterY, surfEye.position.z, .7, 1.4); surfaceSfx(.5); makeWave(surfEye.position.x, surfEye.position.z, .6); } }
  if (X_.hands){ const e = X_.hands; e.t += dt; let c = 0; handData.forEach(h=>{ const u = clamp((e.t - h.d)*h.sp, 0, 1), dn = smooth(8,10,e.t); if (u > .25 && !h.sp1){ h.sp1 = 1; splashFX(h.x, waterY, h.z, .45, .5); } if (dn > .3 && !h.sp2){ h.sp2 = 1; splashFX(h.x, waterY, h.z, .3, .4); } if (u > .4 && dn < .1 && Math.random() < dt*3) dripFX(h.x, waterY + 1, h.z, 1, .1); const y = waterY - 1.3 + smooth(0,1,u)*1.75 - dn*7 + Math.sin(T*2+h.ry)*.03;
      seObj.position.set(h.x, y, h.z); seObj.rotation.set(-.25 + Math.sin(T*1.3+h.ry)*.12, h.ry, Math.cos(T*.9+h.ry)*.12); seObj.scale.setScalar(1.9); seObj.updateMatrix(); hands.setMatrixAt(c++, seObj.matrix); });
    hands.count = c; hands.instanceMatrix.needsUpdate = true; if (e.t > 3 && e.t < 3.05) loseLuc(5, `le mani nell'acqua`); if (e.t > 10.5){ hands.count = 0; X_.hands = null; } }
  if (X_.boat){ const e = X_.boat; e.t += dt; const P = rowboat.position, f = rowboat.userData.fig, lan = rowboat.userData.lan;
    if (e.st === 'row'){ const k = smooth(0, 1, e.t/20); P.lerpVectors(e.a, e.b, k); rowboat.rotation.y = Math.atan2(e.b.x-e.a.x, e.b.z-e.a.z); if (Math.random() < dt*1.5) ripple(P.x, P.z, .4); if (e.t >= 20){ e.st = 'stare'; e.t = 0; loseLuc(4, `la barca`); whisperSfx(2,.2); } }
    else if (e.st === 'stare'){ if (e.t > 4.5 && !e.off){ e.off = 1; lan.material.color.setRGB(0,0,0); play('click', {vol:.2, rev:.3}); } if (e.t > 6.5){ e.st = 'sink'; e.t = 0; surfaceSfx(.8); bubbleSfx(); makeWave(P.x, P.z, .7); } }
    else { // affonda di poppa, piano; la figura resta seduta e continua a guardarti
      rowboat.rotation.x = Math.min(.55, e.t*.06); if (Math.random() < dt*8*Math.max(0, 1 - e.t/9)) emitDrop(P.x + rand(-.6,.6), waterY, P.z + rand(-1.5,1.5), 0, rand(.5,1.2), 0, 1, .7);
      if (gone(rowboat, 3)){ rowboat.visible = false; X_.boat = null; } }
    if (X_.boat){ if (e.st === 'sink'){ e.v = Math.min(1.3, (e.v||0) + dt*.09); e.sk = (e.sk||0) + e.v*dt; } const sinkY = e.sk || 0; P.y = waterY + .05 + Math.sin(T*.8)*.04 + raftHeave*.4 - sinkY; rowboat.rotation.z = Math.sin(T*.6)*.03;
      const want = Math.atan2(camera.position.x - P.x, camera.position.z - P.z) - rowboat.rotation.y; f.rotation.y += (Math.atan2(Math.sin(want - f.rotation.y), Math.cos(want - f.rotation.y)))*Math.min(1, dt*.6); } }
  if (X_.rain > 0){ X_.rain -= dt; const a = rainGeo.attributes.position; const fade = Math.min(1, X_.rain/3, (22 - X_.rain)/2);
    const upward = X_.rain > 11, el = 22 - X_.rain;
    if (Math.abs(X_.rain - 11) < dt){ rainP.forEach(p=>{ p.y = rand(14,22); }); thunderSfx(.2, .5); }
    rainP.forEach((p,i)=>{ if (upward){ p.y += dt*13; if (p.y > 22){ p.y = rand(-1,1); p.x = rand(-25,25); p.z = rand(-25,25); } }
      else { p.y -= dt*15; if (p.y < -2){ p.y = rand(16,22); p.x = rand(-25,25); p.z = rand(-25,25); } }
      const x = camera.position.x + p.x, z = camera.position.z + p.z, y = Math.max(waterY, waterY + p.y); a.setXYZ(i*2, x, y, z); a.setXYZ(i*2+1, x, y + (upward ? -.6 : .6), z);
      if (upward && p.y < .3 && Math.random() < .02) emitDrop(x, waterY, z, 0, rand(1.5,3), 0, 1, .8); });
    a.needsUpdate = true; rain.material.opacity = .7*fade; if (Math.random() < dt*6) ripple(raftPos.x + rand(-10,10), raftPos.z - rand(2,14), .3); if (X_.rain <= 0) rain.visible = false; }
  if (X_.stars > 0){ X_.stars -= dt; skyU.uOut.value = smooth(20,10,X_.stars) * smooth(0,3,X_.stars); } else skyU.uOut.value = 0;
  if (X_.swarm){ const e = X_.swarm; e.t += dt; const gather = smooth(1,8,e.t) * (1 - smooth(12,16,e.t)); let c = 0;
    swarmD.forEach(d=>{ const a = d.k*Math.PI*2 + e.t*.4, ring = new THREE.Vector3(raftPos.x + Math.cos(a)*(5+Math.sin(d.k*12)*1.2), waterY - 1.8, raftPos.z - 6 + Math.sin(a)*(3+Math.cos(d.k*12)*.7));
      tmpV.lerpVectors(d.s, ring, gather); tmpV.y += Math.sin(T*2+d.ph)*.2; seObj.position.copy(tmpV); seObj.rotation.set(0,0,0); seObj.scale.setScalar(.8 + .4*Math.sin(T*3+d.ph)); seObj.updateMatrix(); swarm.setMatrixAt(c++, seObj.matrix); });
    swarm.count = c; swarm.instanceMatrix.needsUpdate = true; if (e.t > 8 && e.t < 8.05){ loseLuc(4, `le luci sotto di te`); raftJolt = .3; } if (e.t > 16){ swarm.count = 0; X_.swarm = null; } }
  if (X_.neck){ const e = X_.neck; e.t += dt; camera.getWorldDirection(fwd); if (fwd.z > .45 && !e.turned){ e.turned = true; whisperSfx(1,.3); sub(`(non c'è nessuno. Ma sul legno, dietro di te, ci sono due impronte bagnate)`, 3.5); prints.scale.set(1,1,-1); layoutPrints(false); X_.prints = 14; for (let k=0;k<6;k++) dripFX(raftPos.x + rand(-.3,.3), raftPos.y + 1.6, raftPos.z + 1.2, 1, .1); }
    if (e.t > 5){ if (!e.turned) loseLuc(5, `qualcosa ti ha respirato addosso`); X_.neck = null; } }
  if (X_.tide){ const e = X_.tide; e.t += dt; tideK = Math.sin(Math.PI*clamp(e.t/4.5, 0, 1)) * .9; if (e.t > 4.5){ tideK = 0; X_.tide = null; } }
  if (X_.name > 0){ X_.name -= dt; nameMat.opacity = Math.min(.8, X_.name/5) * Math.min(1, (28 - X_.name)*.5); } else nameMat.opacity = 0;
  if (X_.refl){ const e = X_.refl; e.t += dt; reflFig.position.y = waterY - .04; camera.getWorldDirection(fwd);
    if (fwd.z > .45 && !e.turned){ e.turned = true; reflFig.visible = false; behindFig.position.set(0, .36, 1.3); behindFig.rotation.y = Math.PI; behindFig.visible = true; stingerSfx(); loseLuc(8, `era davvero alle tue spalle`); setTimeout(()=>{ behindFig.visible = false; }, 350); }
    if (e.t > 9 || e.turned){ if (!e.turned) whisperSfx(1.5,.2); reflFig.visible = false; X_.refl = null; } }
  if (raftJolt > 0) raftJolt = Math.max(0, raftJolt - dt*1.4);
  if (X_.scratch > 0){ X_.scratch -= dt; scratchMat.opacity = Math.min(.9, X_.scratch/15) * Math.min(1, (90 - X_.scratch)*2); } else scratchMat.opacity = 0;
  // tirata sulla corda
  if (X_.tug > 0){ X_.tug -= dt; shakeAmt = Math.max(shakeAmt, .35); if (Math.random() < dt*3) creakSfx(); if (X_.tug <= 0){ toast(`Qualcosa, laggiù, ha tirato la corda dall'altra parte. Poi ha lasciato andare.`, 'warn'); loseLuc(4, `qualcosa ha tirato`); } }
  // suoni d'ambiente: non è mai del tutto silenzio
  X_.amb -= dt;
  if (X_.amb <= 0){ X_.amb = rand(4, 11) / (1 + phase*.3);
    const r = Math.random();
    if (r < .2) splashSfx(rand(35, 90)); else if (r < .35) creakSfx(); else if (r < .5) dripSfx(rand(.05,.12)); else if (r < .6) knockSfx(.12, rand(-1,1));
    else if (r < .7 && phase >= 1) whisperSfx(1.2, .06); else if (r < .78) bubbleSfx(); else if (r < .85 && dayF < .5) sfxNoise({dur:1.5, f:rand(200,500), q:6, vol:.04, a:.5, rev:.9, rate:.3}); }
}
/* ---------- varianti ---------- */
const KNOCKS = [
  { p:[0,.55,1.1], v:.8, ask:true, t:`Tre colpi, sotto le assi della zattera. Lenti. Come chi chiede permesso.` },
  { p:[0,.18,.36,.54,.72,.9,1.08], v:.6, t:`(colpi rapidi, tutti insieme, da ogni lato della zattera: come tante mani)` },
  { p:[0,1.6,3.2], v:1, t:`(un colpo. Poi un altro, più forte. Viene da molto più in basso del fondo.)` },
  { p:[0,.3,.6,2.2,2.5,2.8], v:.7, ask:true, t:`Tre colpi. Pausa. Tre colpi. È il segnale che usavi da bambino per farti aprire la porta.` },
  { p:[0,.12], v:.5, t:`(due colpetti leggeri, proprio sotto i tuoi piedi. Poi qualcosa gratta il legno.)` } ];
const PRINTS = [
  { s:1, t:`Sulle assi della zattera ci sono impronte bagnate. Piedi nudi. Arrivano dall'acqua.` },
  { s:.62, circle:true, t:`Impronte piccole, di bambino, girano attorno a dove stai seduto. Poi tornano in acqua.` },
  { s:1.45, t:`Impronte larghe, con la membrana tra le dita. Sono uscite dall'acqua e ci sono tornate. Dove stavi tu.` },
  { s:1, rev:true, t:`Impronte bagnate che partono da dove sei seduto e finiscono in acqua. Sono della tua misura.` } ];
/* ---------- nuovi eventi: la creatura, il lago, il cielo ---------- */
let raftJolt = 0, tideK = 0;
// onde: partono da ciò che è pesante, viaggiano, raggiungono la zattera e la fanno ballare
const WAVES = []; let bigI = 0; const raftTilt = new THREE.Vector2(); let raftHeave = 0;
function makeWave(x, z, amp=1){ const t0 = waterU.uTime.value; WAVES.push({x, z, t0, amp, hit:false}); waterU.uBig.value[bigI++ % 3].set(x, z, t0, amp*.5); ripple(x, z, Math.min(3, amp*1.5)); if (amp > .8) foamRing(x, z, amp*.6); }
function bigWaveH(x, z){ const now = waterU.uTime.value; let h = 0;
  for (const b of waterU.uBig.value){ const t = now - b.z; if (t < 0 || t > 14) continue; const d = Math.max(Math.hypot(x-b.x, z-b.y), .001), u = t*7.5 - d; if (u < 0 || u > 26) continue;
    h += b.w*Math.sin(u*.55)*Math.exp(-u*.11)*Math.exp(-t*.06)/(1 + d*.011); } return h; }
const raftOff = new THREE.Vector2(), raftOffV = new THREE.Vector2();
function wavesUpdate(dt=.016){ const now = waterU.uTime.value, x = raftPos.x, z = raftPos.z;
  raftHeave = bigWaveH(x, z); raftTilt.set((bigWaveH(x, z+1.6) - bigWaveH(x, z-1.6))/3.2, (bigWaveH(x+1.6, z) - bigWaveH(x-1.6, z))/3.2);
  for (let i=WAVES.length-1; i>=0; i--){ const w = WAVES[i], t = now - w.t0, dx = x - w.x, dz = z - w.z, d = Math.hypot(dx,dz) || 1, u = t*7.5 - d;
    if (u > 30 || t > 16){ WAVES.splice(i,1); continue; } if (u < .5 || w.hit) continue;
    w.hit = true; const fall = w.amp/(1 + d*.011); splashSfx(4, 20); creakSfx(); setTimeout(creakSfx, 500);
    // l'onda spinge la zattera, che tira la corda e poi torna
    raftOffV.x += dx/d*Math.min(1.5, fall*.55); raftOffV.y += dz/d*Math.min(1.5, fall*.55);
    if (fall > .6){ shakeAmt = Math.max(shakeAmt, Math.min(.7, fall*.25)); postMat.uniforms.uWet.value = Math.max(postMat.uniforms.uWet.value, Math.min(1, fall*.45));
      for (let q=0;q<Math.round(4 + fall*4);q++) splashFX(x + rand(-1.6,1.6), waterY + .3 + raftHeave, z + (dz > 0 ? -1.8 : 1.8), .5*Math.min(2.5,fall), .6); } }
  raftOffV.x += (-raftOff.x*1.4 - raftOffV.x*1.1)*dt; raftOffV.y += (-raftOff.y*1.4 - raftOffV.y*1.1)*dt; raftOff.x += raftOffV.x*dt; raftOff.y += raftOffV.y*dt; raftOff.clampLength(0, 2.2);
  raftTilt.clampLength(0, .32); raftHeave = clamp(raftHeave, -1.6, 1.6); }
// schiuma: un anello che si allarga con il fronte dell'onda
const foamTex = (()=>{ const c = document.createElement('canvas'); c.width = c.height = 256; const X = c.getContext('2d'); const g = X.createRadialGradient(128,128,70,128,128,128);
  g.addColorStop(0,'rgba(255,255,255,0)'); g.addColorStop(.55,'rgba(255,255,255,.05)'); g.addColorStop(.86,'rgba(255,255,255,.9)'); g.addColorStop(.93,'rgba(255,255,255,.35)'); g.addColorStop(1,'rgba(255,255,255,0)'); X.fillStyle = g; X.fillRect(0,0,256,256);
  X.globalCompositeOperation = 'destination-out'; for (let i=0;i<900;i++){ X.fillStyle = `rgba(0,0,0,${Math.random()*.8})`; X.beginPath(); X.arc(Math.random()*256, Math.random()*256, Math.random()*5+1, 0, 7); X.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const FOAM = [0,1,2,3,4].map(()=>{ const mt = new THREE.MeshBasicMaterial({map:foamTex, transparent:true, depthWrite:false, opacity:0, color:new THREE.Color(.5,.56,.54)}); mt.userData.murk = true;
  const m = mesh(new THREE.PlaneGeometry(2,2).rotateX(-Math.PI/2), mt); m.renderOrder = 3; m.userData = {t:-1}; m.userData.noCast = true; m.visible = false; scene.add(m); return m; });
function foamRing(x, z, amp){ const f = FOAM.reduce((a,b)=> (a.userData.t < 0 ? a : b.userData.t < 0 ? b : (a.userData.t > b.userData.t ? a : b))); f.userData = {t:0, amp, x, z, noCast:true}; f.visible = true; }
function foamUpdate(dt){ FOAM.forEach(f=>{ const u = f.userData; if (u.t < 0) return; u.t += dt; f.scale.setScalar(1.5 + u.t*7.5); f.position.set(u.x, water.position.y + .06, u.z);
    f.material.opacity = Math.min(1, u.amp*.5)*.75*Math.exp(-u.t*.3)*smooth(0,.25,u.t); if (u.t > 11){ u.t = -1; f.visible = false; } }); }
// nuvole d'acqua: spruzzi grandi in scala reale, leggibili anche da lontano
const sprayTex = (()=>{ const c = document.createElement('canvas'); c.width = c.height = 128; const X = c.getContext('2d');
  for (let i=0;i<60;i++){ const x = 64 + (Math.random()-.5)*70, y = 64 + (Math.random()-.5)*70, r = 6 + Math.random()*22, g = X.createRadialGradient(x,y,0,x,y,r); g.addColorStop(0,'rgba(255,255,255,.35)'); g.addColorStop(1,'rgba(255,255,255,0)'); X.fillStyle = g; X.fillRect(0,0,128,128); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const CLUMPS = Array.from({length:70}, ()=>{ const m = new THREE.SpriteMaterial({ map:sprayTex, color:new THREE.Color(.62,.68,.66), transparent:true, depthWrite:false, opacity:0 }); m.userData.murk = true;
  const sp = new THREE.Sprite(m); sp.visible = false; sp.renderOrder = 6; scene.add(sp); return { sp, v:new THREE.Vector3(), life:0, max:1, s0:1, s1:1 }; });
let clumpI = 0;
function clump(x, y, z, vx, vy, vz, size, life){ const c = CLUMPS[clumpI++ % CLUMPS.length]; c.sp.position.set(x,y,z); c.v.set(vx,vy,vz); c.life = c.max = life; c.s0 = size*.5; c.s1 = size*1.6; c.sp.visible = true; c.sp.material.rotation = Math.random()*6.28; }
function clumpsUpdate(dt){ const wy = water.position.y, lit = .35 + dayF*.5 + lightK*2;
  for (const c of CLUMPS){ if (c.life <= 0) continue; c.life -= dt; c.v.y -= 9.8*dt*.8; c.v.multiplyScalar(1 - dt*.35); c.sp.position.addScaledVector(c.v, dt);
    if (c.sp.position.y < wy - .5 || c.life <= 0){ c.life = 0; c.sp.visible = false; if (c.v.y < -3 && Math.random() < .5) ripple(c.sp.position.x, c.sp.position.z, .8); continue; }
    const k = 1 - c.life/c.max; c.sp.scale.setScalar(lerp(c.s0, c.s1, Math.sqrt(k))); c.sp.material.opacity = Math.min(1, k*6)*(1 - k)*.85; c.sp.material.color.setRGB(.5*lit, .56*lit, .55*lit); } }
// il grande tonfo: corona d'acqua, colonna al centro, schiuma, onde
function bigSplash(x, z, str=1){ const y = water.position.y, n = Math.round(150*str);
  for (let k=0;k<n;k++){ const a = Math.random()*Math.PI*2, r = (1.2 + Math.random()*1.2)*Math.sqrt(str), out = rand(1.5,4.5)*Math.sqrt(str);
    emitDrop(x + Math.cos(a)*r, y, z + Math.sin(a)*r, Math.cos(a)*out, rand(5,11)*Math.sqrt(str), Math.sin(a)*out, 2.6, rand(2,4.5)*(.7+str*.25)); }
  for (let k=0;k<Math.round(70*str);k++) emitDrop(x + rand(-.8,.8)*str, y, z + rand(-.8,.8)*str, rand(-.8,.8), rand(9,17)*Math.sqrt(str), rand(-.8,.8), 3, rand(3,6)*(.7+str*.2));
  for (let k=0;k<Math.round(30*str);k++){ const a = Math.random()*Math.PI*2, r = rand(2,4)*str; emitDrop(x + Math.cos(a)*r, y, z + Math.sin(a)*r, Math.cos(a)*rand(.5,1.5), rand(.5,2), Math.sin(a)*rand(.5,1.5), 1.4, rand(5,9)); }
  for (let k=0;k<Math.round(14*str);k++){ const a = Math.random()*Math.PI*2, r = rand(1,3)*str; clump(x + Math.cos(a)*r, y + rand(0,1), z + Math.sin(a)*r, Math.cos(a)*rand(2,6), rand(5,13)*Math.sqrt(str), Math.sin(a)*rand(2,6), rand(3,6)*Math.sqrt(str), rand(2,3.4)); }
  for (let k=0;k<Math.round(6*str);k++) clump(x + rand(-1,1), y + rand(0,3), z + rand(-1,1), rand(-1,1), rand(12,19)*Math.sqrt(str), rand(-1,1), rand(4,7)*Math.sqrt(str), rand(2.6,3.6));
  ripple(x, z, 3); ripple(x + 2, z - 1, 2); foamRing(x, z, str); splashSfx(2, 250); surfaceSfx(Math.min(3.5, 1 + str));
  const dr = Math.hypot(x - raftPos.x, z - raftPos.z); if (dr < 25) postMat.uniforms.uWet.value = Math.max(postMat.uniforms.uWet.value, 1 - dr/25); }
const tentRaft = (()=>{ const pts = []; for (let k=0;k<=10;k++){ const t = k/10; pts.push(new THREE.Vector3(Math.sin(t*2)*.2, -1.6 + t*2.1 - Math.max(0,t-.6)*1.8, t*1.6)); }
  const cv = new THREE.CatmullRomCurve3(pts), g = tube(pts, .17, .015, 40, 8); const m = new THREE.Mesh(g, M.tentacle); m.visible = false; raft.add(m); return m; })();
const surfEye = mesh(new THREE.PlaneGeometry(5,5).rotateX(-Math.PI/2), new THREE.MeshBasicMaterial({map:deepEyeTex0(), color:new THREE.Color(3,3,3), transparent:true, depthWrite:false})); surfEye.visible = false; surfEye.renderOrder = 3; scene.add(surfEye);
function deepEyeTex0(){ const c = document.createElement('canvas'); c.width = c.height = 256; const X = c.getContext('2d');
  const g = X.createRadialGradient(128,128,8,128,128,128); g.addColorStop(0,'rgba(255,230,120,1)'); g.addColorStop(.3,'rgba(210,110,20,.95)'); g.addColorStop(.48,'rgba(70,30,5,.8)'); g.addColorStop(.62,'rgba(150,140,110,.7)'); g.addColorStop(1,'rgba(0,0,0,0)');
  X.fillStyle = g; X.beginPath(); X.ellipse(128,128,128,70,0,0,7); X.fill(); X.strokeStyle='rgba(140,20,20,.6)'; X.lineWidth=2; for (let i=0;i<20;i++){ const a = Math.random()*6.28; X.beginPath(); X.moveTo(128+Math.cos(a)*120, 128+Math.sin(a)*60); X.quadraticCurveTo(128+Math.cos(a+.2)*80, 128+Math.sin(a+.2)*45, 128+Math.cos(a)*50, 128+Math.sin(a)*30); X.stroke(); }
  X.fillStyle = '#000'; X.beginPath(); X.ellipse(128,128,10,58,0,0,7); X.fill(); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
// mani vere: palmo, cinque dita lunghe a ventaglio piegate ad artiglio verso di te, polso e avambraccio
const handGeo = (()=>{ const P = [], V = (x,y,z)=>new THREE.Vector3(x,y,z);
  const palm = new THREE.SphereGeometry(1, 14, 10); palm.scale(.068,.085,.026); palm.translate(0,.075,0); P.push(palm);
  [[-.046,-.32,.9],[-.016,-.1,1.05],[.016,.1,1],[.044,.3,.82]].forEach(([x0,fan,len])=>{
    const L = .2*len, pts = [V(x0, .14, 0)]; let ang = fan*.6, cur = 0, px = x0, py = .14, pz = 0;
    for (let k=1;k<=4;k++){ cur += .32; const seg = L/4; px += Math.sin(ang)*seg*.55; py += Math.cos(cur)*seg; pz += Math.sin(cur)*seg; ang += fan*.12; pts.push(V(px, py, pz)); }
    P.push(tube(pts, .0125, .006, 12, 6)); });
  P.push(tube([V(-.06,.06,.01), V(-.1,.1,.03), V(-.125,.15,.06), V(-.13,.19,.09)], .013, .007, 8, 6));
  P.push(tube([V(0,.01,0), V(.005,-.08,-.01)], .034, .03, 4, 8));
  P.push(tube([V(.005,-.08,-.01), V(.02,-.45,-.05), V(.03,-.95,-.12)], .03, .042, 10, 8));
  const g = mergeGeometries(P.map(q=>{ const n = q.index ? q.toNonIndexed() : q; if (!n.attributes.uv) n.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n.attributes.position.count*2),2)); return n; }));
  g.deleteAttribute('normal'); g.deleteAttribute('uv'); const m = mergeVertices(g, 1e-4); m.computeVertexNormals(); return m; })();
const HANDS_N = 16, hands = new THREE.InstancedMesh(handGeo, wetMat0(), HANDS_N); hands.count = 0; hands.frustumCulled = false; scene.add(hands); const handData = [];
function wetMat0(){ return new THREE.MeshStandardMaterial({color:0x6b7465, roughness:.3, metalness:.05}); }
const rowboat = (()=>{ const g = new THREE.Group(); const hull = new THREE.Mesh(new THREE.SphereGeometry(1,16,8,0,Math.PI*2,Math.PI/2,Math.PI/2), M.wood); hull.scale.set(.75,.45,2.1); g.add(hull);
  g.add(mesh(new THREE.BoxGeometry(1.3,.06,.3), M.woodDark, 0,-.05,.3)); const f = mesh(figureGeo(1.9, 1.5), ghoulMat, 0,-.25,.3); f.scale.setScalar(.85); g.add(f); g.userData.fig = f;
  const lan = mesh(new THREE.SphereGeometry(.07,8,6), new THREE.MeshBasicMaterial({color:new THREE.Color(5,3,1.2)}), .45,.25,-1.2); g.add(lan); g.userData.lan = lan; g.visible = false; scene.add(g); return g; })();
const RAIN_N = 700, rainGeo = new THREE.BufferGeometry(); rainGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(RAIN_N*6), 3));
const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({color:0x1a1f1c, transparent:true, opacity:.75})); rain.visible = false; rain.frustumCulled = false; scene.add(rain); const rainP = [];
for (let i=0;i<RAIN_N;i++) rainP.push(new THREE.Vector3(rand(-25,25), rand(0,22), rand(-25,25)));
const SWARM_N = 48, swarm = new THREE.InstancedMesh(new THREE.SphereGeometry(.3,8,6), new THREE.MeshBasicMaterial({color:new THREE.Color(.5,2.6,1.4)}), SWARM_N); swarm.count = 0; swarm.frustumCulled = false; scene.add(swarm); const swarmD = [];
const scratchTex = (()=>{ const c = document.createElement('canvas'); c.width = 512; c.height = 256; const X = c.getContext('2d'); X.lineCap = 'round';
  for (const [cx, ang] of [[120,-.25],[260,.1],[400,-.05]]){ for (let f=0; f<4; f++){ X.strokeStyle = `rgba(0,0,0,${.75 - f*.08})`; X.lineWidth = 7 - f; X.beginPath(); let x = cx + f*22, y = 20;
      X.moveTo(x, y); for (let k=0;k<10;k++){ x += Math.sin(ang)*20 + rand(-3,3); y += 22; X.lineTo(x, y); } X.stroke();
      X.strokeStyle = 'rgba(190,160,120,.35)'; X.lineWidth = 1.5; X.stroke(); } }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const scratchMat = new THREE.MeshBasicMaterial({ map:scratchTex, transparent:true, opacity:0, depthWrite:false });
const scratches = mesh(new THREE.PlaneGeometry(1.6,.8).rotateX(-Math.PI/2), scratchMat, 0, .373, -1.35); scratches.renderOrder = 4; raft.add(scratches);
// la busta della Ditta Sesti, nel fango della riva
const envelope = (()=>{ const g = new THREE.Group(); g.add(mesh(new THREE.BoxGeometry(.32,.02,.22), new THREE.MeshStandardMaterial({color:0xd8cfb4, roughness:.9}))); g.add(mesh(new THREE.CircleGeometry(.03,10).rotateX(-Math.PI/2), new THREE.MeshBasicMaterial({color:0x7a1010}), 0,.012,0)); g.visible = false; scene.add(g); return g; })();
const nameTex = document.createElement('canvas'); nameTex.width = 512; nameTex.height = 128;
const nameMat = new THREE.MeshBasicMaterial({ map:new THREE.CanvasTexture(nameTex), transparent:true, opacity:0, depthWrite:false, color:0x000000 });
const nameDecal = mesh(new THREE.PlaneGeometry(2.4,.6).rotateX(-Math.PI/2), nameMat, 0,.372,-.95); nameDecal.renderOrder = 4; raft.add(nameDecal);
const reflFig = mesh(figureGeo(2.4, 1.2), new THREE.MeshBasicMaterial({color:new THREE.Color(.42,.46,.42)})); reflFig.rotation.x = Math.PI; reflFig.visible = false; scene.add(reflFig); reflFig.add(mesh(eyePairGeo, eyeGlowMat, ...eyeAt(2.4, 1.2)));
const bucketTent = (()=>{ const pts = []; for (let k=0;k<=6;k++){ const t = k/6; pts.push(new THREE.Vector3(Math.sin(t*4)*.06, .15 + t*.35, Math.cos(t*3)*.04)); } const m = new THREE.Mesh(tube(pts, .045, .006, 16, 6), M.tentacle); m.visible = false; bucket.add(m); return m; })();
function writeName(word){ const X = nameTex.getContext('2d'); X.clearRect(0,0,512,128); X.fillStyle = '#fff'; X.font = 'bold 86px serif'; X.textAlign = 'center'; X.textBaseline = 'middle';
  for (let i=0;i<5;i++){ X.globalAlpha = .25; X.fillText(word, 256 + rand(-4,4), 64 + rand(-4,4)); } X.globalAlpha = 1; for (let i=0;i<40;i++){ X.fillRect(rand(40,470), rand(70,124), 2, rand(6,30)); } nameMat.map.needsUpdate = true; }
// la visuale viene attirata, con dolcezza, verso ciò che succede (se non stai trascinando)
let attn = null;
function attend(pos, k=.6, dur=1.6){ attn = { p:pos.clone ? pos.clone() : new THREE.Vector3(pos.x,pos.y,pos.z), k, t:dur }; }
function attnUpdate(dt){ if (!attn || drag) { if (attn) attn.t -= dt; if (attn && attn.t <= 0) attn = null; return; } attn.t -= dt; if (attn.t <= 0){ attn = null; return; }
  const dx = attn.p.x - camera.position.x, dz = attn.p.z - camera.position.z, dy = attn.p.y - camera.position.y;
  const ty = Math.atan2(-dx, -dz), tp = clamp(Math.atan2(dy, Math.hypot(dx,dz)), -1.2, .4);
  let d = ty - yawT; d = Math.atan2(Math.sin(d), Math.cos(d)); yawT += d*Math.min(1, dt*attn.k); pitchT += (tp - pitchT)*Math.min(1, dt*attn.k*.7); }
/* ---------- le cose enormi ---------- */
// un tentacolo alto quanto il campanile
const titan = (()=>{ const pts = []; for (let k=0;k<=12;k++){ const t = k/12; pts.push(new THREE.Vector3(Math.sin(t*2.4)*7*t, t*72, Math.cos(t*1.8)*3.5*t)); }
  const cv = new THREE.CatmullRomCurve3(pts), SEG = 90, RAD = 12, g = new THREE.TubeGeometry(cv, SEG, 3.8, RAD, false), tp = g.attributes.position;
  for (let v=0; v<tp.count; v++){ const ring = Math.floor(v/(RAD+1)), t = ring/SEG, c = cv.getPointAt(t), k = 1 - t*.93; tp.setXYZ(v, c.x+(tp.getX(v)-c.x)*k, c.y+(tp.getY(v)-c.y)*k, c.z+(tp.getZ(v)-c.z)*k); }
  g.computeVertexNormals(); const m = new THREE.Mesh(g, M.tentacle); m.visible = false; m.frustumCulled = false; scene.add(m); return m; })();
// la creatura che nuota sotto la zattera
const creatureMat = new THREE.MeshStandardMaterial({color:0x0d1310, roughness:.35, metalness:.1});
const creature = (()=>{ const g = new THREE.Group();
  const bg = new THREE.SphereGeometry(1, 48, 32); { const p = bg.attributes.position; for (let i=0;i<p.count;i++){ const z = p.getZ(i); const k = 1 - .25*Math.max(0,-z); p.setXYZ(i, p.getX(i)*k, p.getY(i)*k*(p.getY(i) < 0 ? .8 : 1), z); } bg.computeVertexNormals(); }
  const b = mesh(bg, creatureMat); b.scale.set(6.5,3.2,21); g.add(b);
  const hd = mesh(new THREE.SphereGeometry(1,36,24), creatureMat, 0,.8,19); hd.scale.set(5,3.4,6); g.add(hd);
  const spots = []; for (let i=0;i<60;i++){ const t = i/60, z = lerp(-18, 22, t); const sp = new THREE.SphereGeometry(.32,8,6); sp.translate((i%2?1:-1)*(2+Math.sin(t*9)*1.5), 2.6*Math.cos((z/21)*1.4)+.5, z); spots.push(sp); }
  for (const sx of [-1,1]){ const e = mesh(new THREE.SphereGeometry(1.1,20,14), new THREE.MeshBasicMaterial({color:new THREE.Color(1.1,.75,.2)}), sx*3.4,1.6,23); e.scale.set(.6,.25,.4); g.add(e); }
  for (let k=0;k<10;k++){ const a = k/10*Math.PI*2, pts = []; for (let j=0;j<=10;j++){ const t = j/10; pts.push(new THREE.Vector3(Math.cos(a)*(3+t*4) + Math.sin(t*5+k)*2, Math.sin(a)*2 - t*3, -15 - t*36)); }
    g.add(new THREE.Mesh(tube(pts, 1.1 - k*.04, .08, 60, 12), M.tentacle)); }
  g.visible = false; scene.add(g); return g; })();
// l'occhio che si apre nel nero, se guardi giù troppo a lungo
const deepEyeTex = (()=>{ const c = document.createElement('canvas'); c.width = c.height = 256; const X = c.getContext('2d');
  const g = X.createRadialGradient(128,128,10,128,128,128); g.addColorStop(0,'rgba(255,220,90,1)'); g.addColorStop(.32,'rgba(220,120,20,.95)'); g.addColorStop(.5,'rgba(90,40,5,.6)'); g.addColorStop(1,'rgba(0,0,0,0)');
  X.fillStyle = g; X.beginPath(); X.ellipse(128,128,128,62,0,0,7); X.fill(); X.fillStyle = '#000'; X.beginPath(); X.ellipse(128,128,9,56,0,0,7); X.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const deepEye = mesh(new THREE.PlaneGeometry(26,26).rotateX(-Math.PI/2), new THREE.MeshBasicMaterial({map:deepEyeTex, color:new THREE.Color(5,5,5), transparent:true, depthWrite:false}));
deepEye.visible = false; deepEye.userData.noCast = true; scene.add(deepEye);
let fovKick = 0, subBoost = 0, downT = 0;
const Y_UP = new THREE.Vector3(0,1,0), titanW = new THREE.Vector3();
// il punto del tentacolo all'altezza dell'acqua, e quanto è grosso lì
function titanWaterline(out){ const h = waterY - titan.position.y, t = clamp(h/72, 0, 1); out.set(Math.sin(t*2.4)*7*t, 0, Math.cos(t*1.8)*3.5*t).applyAxisAngle(Y_UP, titan.rotation.y); out.x += titan.position.x; out.z += titan.position.z; out.y = waterY; return 3.8*(1 - t*.93); }
function startTitan(){
  const sr = shoreR(S.d); let x = 0, z = 0, best = -1e9;
  // in acqua aperta, davanti alla zattera, mai nascosto dietro il Guardiano
  for (let k=0;k<40;k++){ const cx = raftPos.x + rand(-28,28), cz = raftPos.z - rand(28,60), r = Math.hypot(cx,cz); if (r > sr - 6) continue;
    const sc = Math.min(Math.hypot(cx-COL_X, cz-COL_Z) - 24, 12) + (waterY - H(cx,cz))*.05 - Math.abs(cx - raftPos.x)*.1; if (sc > best){ best = sc; x = cx; z = cz; } }
  if (best === -1e9){ const r = Math.max(.1, Math.hypot(raftPos.x, raftPos.z - 40)), k = Math.max(0, sr - 6)/r; x = raftPos.x*k*.5; z = (raftPos.z - 40)*k*.5; }
  titan.position.set(x, waterY - 75, z); titan.rotation.y = rand(0, Math.PI*2); titan.visible = true; X_.titan = {t:0, py:titan.position.y, out:false}; X_.big = 22; attend(new THREE.Vector3(x, waterY + 25, z), .45, 6);
  bubbleSfx(); setTimeout(bubbleSfx, 900); for (let k=0;k<6;k++) setTimeout(()=>ripple(x + rand(-4,4), z + rand(-4,4), 1.6), k*300);
  creatureSfx({ kind:'roar', far:.4, vol:1, delay:1.2 }); rumbleSfx(14,.6); setTimeout(()=>groanSfx(.8,7), 2500); }
function startDeepEye(){
  const dir = new THREE.Vector2(-raftPos.x, -raftPos.z).normalize(), sr = shoreR(S.d), dist = Math.min(sr*.5, 22);
  const x = raftPos.x + dir.x*dist, z = raftPos.z + dir.y*dist; deepEye.position.set(x, Math.max(H(x,z) + .8, waterY - 22), z); deepEye.rotation.y = Math.atan2(dir.x, dir.y);
  deepEye.scale.set(1, 1, .02); deepEye.visible = true; X_.deepEye = {t:0}; heartSfx(.7); setTimeout(()=>deepCallSfx(.5), 800); }
function bigUpdate(dt){
  if (X_.titan){ const e = X_.titan, t = (e.t += dt); const rise = smooth(1.2,7,t) * (1 - smooth(14,19,t));
    titan.position.y = waterY - 75 + rise*60; shakeAmt = Math.max(shakeAmt, rise*.25); fovKick = Math.max(fovKick, rise*7); subBoost = Math.max(subBoost, rise*.35);
    const vy = (titan.position.y - e.py)/Math.max(dt, 1e-3); e.py = titan.position.y; const top = titan.position.y + 72*.98, sp = Math.abs(vy);
    // dove il tentacolo buca la superficie: un anello d'acqua che sale con lui o viene risucchiato giù
    const rW = titanWaterline(titanW);
    if (top > waterY - .5 && rW > .2){ const n = Math.min(60, sp*dt*50); for (let k=0;k<n;k++){ const a = rand(0, 6.283), up = vy > 0;
        emitDrop(titanW.x + Math.cos(a)*rW, waterY + raftHeave*0, titanW.z + Math.sin(a)*rW, Math.cos(a)*rand(.5,2.5)*Math.min(2,sp/6), (up ? rand(3,9) : rand(1,4))*Math.min(1.8, sp/5), Math.sin(a)*rand(.5,2.5)*Math.min(2,sp/6), 2, rand(1.6,3.6)); }
      if (Math.random() < dt*4) ripple(titanW.x + rand(-rW,rW), titanW.z + rand(-rW,rW), 2.2);
      if (Math.random() < dt*sp*.9){ const a = rand(0,6.283); clump(titanW.x + Math.cos(a)*rW, waterY, titanW.z + Math.sin(a)*rW, Math.cos(a)*rand(1,3), (vy > 0 ? rand(4,9) : rand(1,4))*Math.min(1.5, sp/6), Math.sin(a)*rand(1,3), rand(2.5,4.5), rand(1.5,2.5)); } }
    // l'acqua che cola giù lungo tutta la parte emersa
    if (rise > .2 && Math.random() < dt*40*rise){ const hh = rand(0, Math.max(0, top - waterY)), tt = clamp((hh + waterY - titan.position.y)/72, 0, 1);
      tmpV.set(Math.sin(tt*2.4)*7*tt, hh + waterY - titan.position.y, Math.cos(tt*1.8)*3.5*tt).applyAxisAngle(Y_UP, titan.rotation.y).add(titan.position); dripFX(tmpV.x + rand(-1,1)*3.8*(1-tt*.93), tmpV.y, tmpV.z + rand(-1,1)*3.8*(1-tt*.93), 2, .3); }
    // emersione: la prima onda e la colonna d'acqua sollevata
    if (!e.out && top > waterY){ e.out = true; bigSplash(titanW.x, titanW.z, 2.6); makeWave(titanW.x, titanW.z, 3.2); }
    if (t > 14 && !e.sink){ e.sink = 1; surfaceSfx(3); groanSfx(.6, 5); }
    // affondamento: quando la punta sparisce sotto, l'acqua le crolla addosso
    if (e.sink && !e.gulp && top < waterY + .4){ e.gulp = 1; const gx = titanW.x, gz = titanW.z; bigSplash(gx, gz, 3.2); makeWave(gx, gz, 3.6); shakeAmt = Math.max(shakeAmt, .6);
      setTimeout(()=>{ makeWave(gx, gz, 2.2); splashFX(gx, waterY, gz, 2.5, 3); bubbleSfx(); }, 1500); setTimeout(()=>{ makeWave(gx, gz, 1.3); for (let k=0;k<10;k++) setTimeout(()=>ripple(gx + rand(-6,6), gz + rand(-6,6), 1.8), k*250); }, 3200); }
    if (t > 4 && t < 4.05){ loseLuc(7, `il tentacolo`); sub(`(è alto come il campanile. E ce ne sono altri, sotto.)`, 5); }
    if (t > 22){ titan.visible = false; X_.titan = null; } }
  if (LEV.on){ const k = clamp(LEV.t/LEV.dur, 0, 1), sc = LEV.sc, up = smooth(0,.38,k)*(1 - smooth(.62,1,k));
    levPath(k, levP); levPath(Math.min(1, k+.004), levQ); const x = levP.x, z = levP.z, yb = H(x,z);
    creature.visible = true; creature.scale.setScalar(sc);
    // profondo = abbastanza giù perché l'acqua torbida lo nasconda del tutto; vicino = la schiena a qualche metro sotto la superficie
    const top = waterY - 4.6*sc - 1.6, deep = Math.max(yb + 2.5*sc, waterY - 38), want = Math.min(top, lerp(deep, Math.max(top - 3*sc, yb + 3.2*sc), up));
    if (LEV.y === null) LEV.y = Math.min(want, deep); const prevY = LEV.y; LEV.y += (want - LEV.y)*Math.min(1, dt*.8); LEV.y = Math.min(LEV.y, top);
    const ds = Math.max(.001, levP.distanceTo(levQ));
    const tilt = clamp((LEV.y - prevY)/Math.max(dt, 1e-3)/(ds/.004/LEV.dur + .5), -.18, .18), lift = Math.abs(Math.sin(tilt))*21*sc;
    creature.position.set(x, Math.min(LEV.y, top - lift), z); creature.rotation.order = 'YXZ'; creature.rotation.set(-tilt, Math.atan2(levQ.x - x, levQ.z - z), Math.sin(T*.6)*.05);
    subBoost = Math.max(subBoost, up*.4); fovKick = Math.max(fovKick, up*3); }
  else if (creature.visible && !X_.abyss){ // finito il passaggio: continua a scendere nel nero finché l'acqua non lo copre del tutto
    creature.position.y -= dt*3; creature.rotation.x = Math.min(.15, creature.rotation.x + dt*.05);
    if (creature.position.y < Math.max(waterY - 34, H(creature.position.x, creature.position.z) - 6*LEV.sc)) creature.visible = false; }
  if (X_.deepEye){ const t = (X_.deepEye.t += dt); const open = smooth(0,2.5,t) * (1 - smooth(5.5,6.5,t)); deepEye.scale.set(1, 1, Math.max(.02, open)); deepEye.material.opacity = open;
    if (t > 6.6){ deepEye.visible = false; X_.deepEye = null; } }
  // guardare giù: la vertigine
  const lookDown = running && !ending && pitch < -.55 && S.d > 12;
  downT = lookDown ? downT + dt : Math.max(0, downT - dt*2);
  if (downT > 2.8 && !X_.deepEye && !X_.pupil && cool('deepEye', 100)){ startDeepEye(); }
  // il Guardiano gira la testa quando non lo guardi
  colHead.getWorldPosition(wfPos); const seen = lookingAt(wfPos, .9);
  if (!seen){ const lx = camera.position.x - wfPos.x, lz = camera.position.z - wfPos.z; const target = clamp(Math.atan2(lx, lz), -1.1, 1.1) * clamp((S.d-6)/40, 0, 1);
    colHead.rotation.y += (target - colHead.rotation.y) * Math.min(1, dt*.08); }
  const night = dayF < .5;
  { const base = phase>=2 && (night || phase>=3) ? 1 : 0; COL_EYES.forEach((m,i)=> m.color.setRGB(4,3.2,.9).multiplyScalar(Math.max(base, i < R2.gazeEyes ? 2.4 + Math.sin(T*6 + i)*.3 : 0))); }
  colOrbMat.emissiveIntensity = phase>=2 ? .6 + .4*Math.sin(T*.9) + (phase>=3 ? 1 : 0) : .08 + .05*Math.sin(T*.5);
  { if (!COL_ORB_P.lengthSq()) COL_ORB_P.copy(colOrbLight.position); const fk = X_.gaze ? R2.faceK : 0; colOrbLight.position.lerpVectors(COL_ORB_P, COL_FACE_P, fk); colOrbLight.color.setRGB(lerp(.36,1,fk), lerp(1,.78,fk), lerp(.6,.44,fk)); colOrbLight.distance = lerp(60, 75, fk);
    colOrbLight.intensity = Math.max(colOrbMat.emissiveIntensity * 55 * (night ? 1 : .5), fk*(120 + Math.sin(T*7)*15)); }
  // la pietra non è del tutto pietra: dalla terza fase i tentacoli del volto si muovono, piano, quando non lo guardi
  COLU.uTime.value = T; COLU.uSway.value += ((phase>=3 ? (seen ? .15 : 1) * (.4 + clamp((S.d-65)/40,0,1)*.8) : phase>=2 && !seen ? .12 : 0) - COLU.uSway.value)*Math.min(1, dt*.4);
  fovKick = Math.max(0, fovKick - dt*1.5); subBoost = Math.max(0, subBoost - dt*.2);
  const vert = downT > .5 ? Math.sin(T*.8)*2.5*clamp(downT/3,0,1) : 0;
  const fov = lerp(70 - fovKick + vert, 24, R2.zoom); if (Math.abs(camera.fov - fov) > .05){ camera.fov = fov; camera.updateProjectionMatrix(); }
}
/* ---------- jumpscare ---------- */
const scv = $('scare'), sctx = scv.getContext('2d');
function drawFace(){
  const w = scv.width = innerWidth, h = scv.height = innerHeight; const cx = w/2 + rand(-w*.05,w*.05), cy = h*.54, s = Math.min(w,h)*rand(.62,.78);
  const X = sctx; X.fillStyle = '#000'; X.fillRect(0,0,w,h);
  // testa gonfia, annegata
  let g = X.createRadialGradient(cx, cy-s*.15, s*.05, cx, cy, s*.8); g.addColorStop(0,'#b7bfa6'); g.addColorStop(.45,'#6b7560'); g.addColorStop(.8,'#262c22'); g.addColorStop(1,'rgba(0,0,0,0)');
  X.fillStyle = g; X.beginPath(); X.ellipse(cx, cy, s*.44, s*.64, rand(-.08,.08), 0, Math.PI*2); X.fill();
  // macchie e vene
  for (let i=0;i<40;i++){ X.fillStyle = `rgba(${rand(20,60)|0},${rand(30,50)|0},${rand(20,40)|0},${rand(.1,.35)})`; X.beginPath(); X.arc(cx+rand(-s*.35,s*.35), cy+rand(-s*.5,s*.5), rand(s*.01,s*.07), 0, Math.PI*2); X.fill(); }
  X.strokeStyle = 'rgba(70,10,20,.5)'; X.lineWidth = 1.2;
  for (let i=0;i<50;i++){ let x = cx+rand(-s*.35,s*.35), y = cy+rand(-s*.5,s*.4); X.beginPath(); X.moveTo(x,y); for (let k=0;k<5;k++){ x += rand(-s*.04,s*.04); y += rand(-s*.04,s*.04); X.lineTo(x,y); } X.stroke(); }
  // troppi occhi
  const eyes = [[-.16,-.14,1],[.16,-.14,1]]; const extra = 3 + Math.floor(Math.random()*6);
  for (let i=0;i<extra;i++) eyes.push([rand(-.3,.3), rand(-.48,.05), rand(.35,.8)]);
  for (const [ex,ey,es] of eyes){
    const x = cx+ex*s, y = cy+ey*s, r = s*.085*es;
    X.fillStyle = '#050403'; X.beginPath(); X.ellipse(x, y, r*1.35, r, rand(-.3,.3), 0, Math.PI*2); X.fill();
    const ig = X.createRadialGradient(x,y,0,x,y,r*.85); ig.addColorStop(0,'#fff2a0'); ig.addColorStop(.35,'#e0a520'); ig.addColorStop(1,'#3c2a05');
    X.fillStyle = ig; X.beginPath(); X.arc(x, y, r*.8, 0, Math.PI*2); X.fill();
    X.fillStyle = '#000'; X.beginPath(); X.ellipse(x+rand(-r*.1,r*.1), y, r*.12, r*.72, 0, 0, Math.PI*2); X.fill();
    X.fillStyle = 'rgba(255,255,240,.9)'; X.beginPath(); X.arc(x-r*.3, y-r*.3, r*.1, 0, Math.PI*2); X.fill();
  }
  // bocca verticale con denti
  const mt = cy+s*.02, mb = cy+s*.58, mw = s*.11;
  X.fillStyle = '#080000'; X.beginPath(); X.moveTo(cx, mt); X.quadraticCurveTo(cx+mw*1.4, (mt+mb)/2, cx, mb); X.quadraticCurveTo(cx-mw*1.4, (mt+mb)/2, cx, mt); X.fill();
  X.fillStyle = '#c9c2a4';
  for (let k=0;k<14;k++){ const t = (k+.5)/14, y = lerp(mt, mb, t), half = Math.sin(t*Math.PI)*mw*1.05;
    for (const sd of [-1,1]){ X.beginPath(); X.moveTo(cx+sd*half, y-s*.012); X.lineTo(cx+sd*half, y+s*.012); X.lineTo(cx+sd*(half-s*rand(.03,.06)), y+rand(-s*.01,s*.01)); X.fill(); } }
  // capelli fradici
  X.strokeStyle = 'rgba(0,0,0,.88)'; X.lineWidth = 2.5;
  for (let i=0;i<80;i++){ const x0 = cx + rand(-s*.5, s*.5); X.beginPath(); X.moveTo(x0, cy-s*.8); X.bezierCurveTo(x0+rand(-30,30), cy-s*.3, x0+rand(-40,40), cy+s*.1, x0+rand(-20,20), cy+rand(-s*.1,s*.75)); X.stroke(); }
  // sbavatura cromatica e righe
  X.globalCompositeOperation = 'lighter'; X.globalAlpha = .25; X.drawImage(scv, rand(4,12), 0); X.globalAlpha = 1; X.globalCompositeOperation = 'source-over';
  X.fillStyle = 'rgba(0,0,0,.25)'; for (let y=0;y<h;y+=3) X.fillRect(0,y,w,1);
  X.fillStyle = 'rgba(110,0,0,.22)'; X.fillRect(0,0,w,h);
}
function scare(){ drawFace(); scv.classList.remove('hidden'); scv.classList.add('shake'); stingerSfx(); shakeAmt = 1.2; postMat.uniforms.uFlash.value = .25;
  if (!SET.calm) setTimeout(()=>{ scv.style.filter = 'invert(1)'; }, 90); setTimeout(()=>{ scv.style.filter = ''; drawFace(); }, 150);
  setTimeout(()=>{ scv.classList.add('hidden'); scv.classList.remove('shake'); scv.style.filter = ''; }, 620); }

/* ---------- blackout a lucidità zero ---------- */
let blackout = false;
function doBlackout(){
  blackout = true; $('fade').style.opacity = 1; stingerSfx();
  setTimeout(()=>{ whisperSfx(4,.35); sub(`...ti abbiamo chiamato e sei venuto...`, 4); }, 1200);
  setTimeout(()=>{
    const lost = S.money*.25; S.money -= lost; const rise = Math.max(1, S.d*.04); S.d = Math.max(0, S.d - rise);
    S.luc = 50; S.time = Math.ceil(S.time/240)*240 + 2;
    $('fade').style.opacity = 0; blackout = false;
    toast(`Ti svegli all'alba sul pontile, i piedi bagnati fino alle ginocchia. Mancano € ${fmt(lost)}. Il lago è risalito di ${rise.toFixed(1).replace('.',',')} m.`, 'warn');
    rebuildPipes(true);
  }, 6000);
}

/* ---------- finale ---------- */
let ending = null, endT = 0, endAsked = false;
function startFinale(){
  ending = 'reveal'; endT = 0; holdBucket = false; B.busy = false;
  titan.visible = creature.visible = deepEye.visible = false; X_.titan = X_.deepEye = null;
  [handObj, headObj, behindFig, mouthObj, dgObj, ...fogFigs, ...dockFigs, ...floaters].forEach(o=>o.visible = false); X_.dock = null; dockLight.intensity = 0; fishMesh.count = 0; hideRegia(); X_.dg = X_.hand = X_.behind = X_.mouth = X_.left = null; $('poi').innerHTML = ''; for (const k in poiEls) delete poiEls[k];
  ['shop','diary','call','prompt','card'].forEach(id=>$(id).classList.add('hidden'));
  $('bottom').classList.add('hidden'); $('sideBtns').classList.add('hidden');
  groanSfx(.9, 8); setTimeout(()=>heartSfx(.8), 2000);
  yawT = Math.round(yaw/(Math.PI*2))*Math.PI*2; pitchT = -.5;
}
function showEndChoice(){
  promptAsk(`Il lago è vuoto.\n\nSotto l'ultimo velo d'acqua c'è un occhio più grande del paese. Ti guarda da prima che esistesse la valle. Respira quando tu respiri.\n\nIl Compratore ha lasciato una leva in fondo al pontile: l'ultima chiusa. Oppure puoi spendere tutto quello che hai guadagnato per ridargli l'acqua.`,
    `APRI L'ULTIMA CHIUSA`, `RIEMPI IL LAGO`, yes=>{ if (yes){ ending = 'wake'; endT = 0; camWakeStart.copy(CAM_BASE); stingerSfx(); groanSfx(1,7); } else { ending = 'fill'; endT = 0; S.money = 0; bellSfx(); } });
}
function showCredits(kind){
  const scr = $('screen');
  scr.innerHTML = `<h1 style="font-size:min(14vw,80px)">${kind==='wake'?'IL RISVEGLIO':'IL GUARDIANO'}</h1>
  <div id="endText">${kind==='wake'
    ? `Sei caduto per centoventotto metri e non hai sentito l'impatto.\n\nNàrrena si è svegliata. Le campane suonano in tutta la valle, e poi in tutte le valli. Ora è Lui che sogna il mondo, e il mondo non se ne accorge.\n\nDomani mattina, la Ditta Sesti assumerà un nuovo operaio.\nAvrà la tua faccia.`
    : `L'acqua è tornata in una notte, come nel 1953.\n\nLe campane tacciono. In paese la gente ha ricominciato a dormire. Nessuno ricorda il lago vuoto.\n\nTu sei rimasto sul pontile. Qualcuno deve guardare l'acqua.\nOgni notte ti chiamano per nome.\nNon rispondi. Quasi mai.`}</div>
  <div class="btns"><button class="btn" id="againBtn">RICOMINCIA · CICLO ${S.cycle+1}</button></div>
  <div class="by">IL FONDO · GIOCO BY AGONYAPP</div>`;
  scr.style.display = 'flex'; scr.style.opacity = 0; scr.style.transition = 'opacity 3s'; requestAnimationFrame(()=> scr.style.opacity = 1);
  S.ended = true; save();
  $('againBtn').onclick = ()=>{ const c = S.cycle + 1; S = freshState(c); save(); location.reload(); };
}

/* =====================================================================
   FILMATO INIZIALE
   ===================================================================== */
const CINE = { on:false, t:0, evI:0, done:null };
const camLookV = new THREE.Vector3();
function cap(html){ const c = $('cineCap'); c.innerHTML = html; c.style.opacity = 1; }
function capOff(){ $('cineCap').style.opacity = 0; }
function cMid(html){ const m = $('cineMid'); if (!html){ m.style.opacity = 0; return; } m.innerHTML = html; m.style.opacity = 1; }
const CINE_EV = [
  [.6, ()=>cMid(`<div class="big">VALLE DI NÀRRENA</div><div class="small">12 NOVEMBRE 1953</div>`)],
  [1.0, ()=>bellSfx(1.3)], [3.8, ()=>bellSfx(1.7)],
  [5.0, ()=>cMid(null)],
  [7.0, ()=>cap(`Quella notte, a Nàrrena, si cenò presto.`)],
  [8.6, ()=>lightning()],
  [10.8, ()=>capOff()],
  [11.5, ()=>{ cap(`Don Aurelio Sesti sbarrò le porte della chiesa.<br>Poi aprì le chiuse.`); creakSfx(); setTimeout(creakSfx,500); rumbleSfx(17,.55); }],
  [13.8, ()=>lightning()],
  [16.2, ()=>capOff()],
  [17.6, ()=>cap(`Nessuno uscì di casa.`)],
  [19.0, ()=>bellSfx(1.2)],
  [20.6, ()=>capOff()],
  [21.2, ()=>{ cap(`Restarono seduti a tavola, a lume di candela,<br>ad aspettare l'acqua.`); lightning(); }],
  [23.0, ()=>whisperSfx(3,.22)],
  [24.6, ()=>{ capOff(); bubbleSfx(); sfxNoise({dur:1.4,f:280,q:.6,type:'lowpass',vol:.7,rev:.7}); creatureSfx({ kind:'breath', far:.35, vol:.75, delay:1.2 }); }],
  [30.5, ()=>cap(`Non era una diga.`)],
  [33.4, ()=>capOff()],
  [34.2, ()=>{ cap(`Era una ninna nanna.`); heartSfx(.5); }],
  [36.0, ()=>heartSfx(.6)], [37.4, ()=>capOff()],
  [37.6, ()=>{ heartSfx(.7); creatureSfx({ kind:'call', far:.25, vol:.9 }); }],
  [38.0, ()=>{ cap(`<span style="font-style:normal;letter-spacing:.12em">«CHE DORMA. CHE DORMA PER SEMPRE.»</span>`); groanSfx(.6,5); }],
  [39.0, ()=>heartSfx(.8)], [40.0, ()=>heartSfx(.9)], [40.8, ()=>heartSfx(1)],
  [41.4, ()=>{ capOff(); stingerSfx(); creatureSfx({ kind:'roar', far:.05, vol:1 }); shakeAmt = 1.2; }],
  [44.0, ()=>cMid(`<div class="big">SETTANT'ANNI DOPO</div>`)],
  [47.0, ()=>cMid(null)],
  [49.0, ()=>cap(`La Ditta Sesti cerca un uomo che svuoti il lago.`)],
  [52.4, ()=>capOff()],
  [53.0, ()=>cap(`Paga bene. Paga ogni litro.`)],
  [54.5, ()=>{ creatureSfx({ kind:'call', far:.9, vol:.9 }); pingSfx(.04); }], [57.5, ()=>{ makeWave(-6, 64, 1.1); }],
  [56.0, ()=>capOff()],
  [56.8, ()=>cap(`Nessuno ha mai visto il fondo.`)],
  [60.2, ()=>capOff()],
  [61.2, ()=>cMid(`<div class="huge">IL FONDO</div>`)],
  [64.6, ()=>cMid(null)],
];
const CINE_END = 66.2;
const CINE_HIDE = ['car','bike','shoes','corpse'];
function playCine(done){
  initAudio();
  CINE.on = true; CINE.t = 0; CINE.evI = 0; CINE.done = done;
  $('screen').style.display = 'none'; ['hud','bottom','sideBtns'].forEach(id=>$(id).classList.add('hidden'));
  $('cine').classList.remove('hidden'); capOff(); cMid(null);
  loreObjs.forEach(l=>{ if (CINE_HIDE.includes(l.id)) l.obj.visible = false; }); corpse2.visible = false;
  walkers.count = 0; walkerEyes.count = 0; shoreEyes.count = 0;
}
function endCine(){
  if (!CINE.on) return;
  try { localStorage.setItem('ilfondo_cine', '1'); } catch(e){}
  CINE.on = false; $('cine').classList.add('hidden'); capOff(); cMid(null);
  const P = postMat.uniforms; P.uOld.value = 0; P.uUnder.value = 0; P.uDark.value = 0; P.uInsane.value = 0;
  lamp.color.copy(LAMP_COL); lamp.distance = 30; terrainU.uEyes.value = 0; waterU.uShadow.value.w = 0; skyU.uLight.value = 0;
  waterFigure.visible = false; raft.visible = true; lifeline.visible = true; tentacles.visible = false; tentacles.scale.setScalar(.01); lidOpen = 0;
  loreObjs.forEach(l=>{ l.obj.visible = true; }); corpse2.visible = S.cycle > 1;
  mists.forEach(m=>m.visible = true); M.win.emissiveIntensity = 0;
  if (AU.ctx){ const t = AU.ctx.currentTime; AU.choirG.gain.setTargetAtTime(0, t, .8); }
  const d = CINE.done; CINE.done = null; d && d();
}
$('skipBtn').onclick = (e)=>{ e.stopPropagation(); endCine(); };
const dip = (t, c, w) => 1 - smooth(0, w, Math.abs(t-c));
function updateCine(dt){
  CINE.t += dt; T += dt; const t = CINE.t;
  while (CINE.evI < CINE_EV.length && CINE_EV[CINE.evI][0] <= t){ CINE_EV[CINE.evI][1](); CINE.evI++; }
  lightUpdate(dt);
  const P = postMat.uniforms, ease = x => { x = clamp(x,0,1); return x*x*(3-2*x); };
  let dark = t < 6 ? 1 : 1 - smooth(6, 7.4, t);
  dark = Math.max(dark, dip(t,17,.5), dip(t,29,.6));
  if (t >= 41.6 && t < 48) dark = 1; else if (t >= 48 && t < 49.8) dark = 1 - smooth(48, 49.8, t);
  if (t >= 60.4) dark = smooth(60.4, 61.4, t);
  let wy = 0, old = 0, eyesK = 0, tentS = 0, glow = 0, choir = 0, drone = .05, wind = .06, lap = .05, sub = 0;
  raft.visible = t >= 42; lifeline.visible = raft.visible; waterFigure.visible = false;
  lamp.color.copy(LAMP_COL); lamp.distance = 30; lamp.intensity = 0; waterU.uShadow.value.w = 0;
  M.win.emissiveIntensity = 0; tentacles.visible = false; lidOpen = 0;
  if (t < 17){ // il paese, dall'alto
    const k = ease((t-5)/12);
    camera.position.set(lerp(2,-14,k), lerp(-16,-27,k), lerp(60,54,k)); camLookV.set(VX, VY+lerp(5,6,k), VZ);
    wy = -95; old = 1; wind = .1;
    lamp.position.set(VX+2, VY+3, VZ+7); lamp.intensity = 9; lamp.distance = 40;
    M.win.emissiveIntensity = 1.7 + Math.sin(t*9)*.2 + Math.sin(t*23)*.15;
  } else if (t < 29){ // tra le case, l'acqua sale
    const k = ease((t-17)/12); const x = VX + lerp(-1,-2.2,k), z = VZ + lerp(8.5,5.5,k);
    camera.position.set(x, H(x,z) + 1.7, z); camLookV.set(VX-8, VY + lerp(3.5,2.2,k), VZ+lerp(4,1,k));
    wy = VY - 4 + 9*smooth(17.5, 28, t); old = 1; wind = .1; drone = .1;
    lamp.position.set(VX-4, VY+2.4, VZ+6); lamp.intensity = 7; lamp.distance = 26;
    M.win.emissiveIntensity = 1.7 + Math.sin(t*9)*.2 + Math.sin(t*23)*.15;
    
  } else if (t < 42){ // giù, nella voragine
    const k = ease((t-29)/12.6);
    camera.position.set(lerp(-14,5,k), lerp(-50,-116,k), lerp(26,9,k)); camLookV.set(0, lerp(-90,-136,k), 0);
    wy = VY + 5; old = .4; eyesK = smooth(30.5, 38, t);
    lidOpen = smooth(36, 41, t)*.5; glow = .25 + smooth(34, 41, t)*2.4;
    tentacles.visible = true; tentS = .35 + .2*k;
    lamp.position.set(6, -108, 10); lamp.color.setRGB(.5,.9,.35); lamp.intensity = lerp(3, 14, smooth(33,41,t)); lamp.distance = 60;
    M.win.emissiveIntensity = .9;
    choir = .1 + smooth(32, 41, t)*.45; drone = .2; sub = .2; wind = 0; lap = 0;
    shakeAmt = Math.max(shakeAmt, smooth(38, 41.4, t)*.25);
  } else { // oggi
    const k = ease((t-48)/13);
    camera.position.set(lerp(16,9,k), lerp(3.4,2.3,k), lerp(56,63,k)); camLookV.set(lerp(0,3,k), lerp(1.8,.2,k), lerp(80,72,k));
    wy = 0;
    raftPos.copy(raftTarget(0)); raft.position.copy(raftPos); raft.position.y += Math.sin(T*1.1)*.04; raft.rotation.set(Math.sin(T*.6)*.012, 0, Math.sin(T*.8)*.016); raft.updateMatrixWorld();
    lamp.position.set(raft.position.x-1.36, raft.position.y+1.98, raft.position.z-1.3); lamp.intensity = 4 + Math.sin(T*13)*.3;
    if (raft.userData.lantern) raft.userData.lantern.rotation.z = Math.sin(T*.9)*.025;
    { const a = lifeGeo.attributes.position; const end = new THREE.Vector3(raft.position.x+1.05, raft.position.y+1.2, raft.position.z+1.6);
      for (let i=0;i<30;i++){ const u = i/29; const pp = new THREE.Vector3().lerpVectors(DOCK_HOOK, end, u); pp.y -= Math.sin(u*Math.PI)*.4; a.setXYZ(i, pp.x, pp.y, pp.z); } a.needsUpdate = true; }
    waterFigure.visible = true; waterFigure.position.set(.2, 1.36, 84.5); waterFigure.rotation.y = Math.PI;
    if (t > 52 && t < 61.5){ const kk = (t-52)/9.5; waterU.uShadow.value.set(lerp(26,-22,kk), lerp(58,70,kk), 9, Math.sin(Math.PI*clamp(kk,0,1))*.95); waterU.uShadowA.value = -Math.atan2(12, -48); }
    wind = .07; lap = .06; drone = .06 + smooth(52,58,t)*.08;
  }
  // camera
  shakeAmt = Math.max(0, shakeAmt - dt*1.2);
  camera.position.x += (Math.random()-.5)*shakeAmt*shk()*.12; camera.position.y += (Math.random()-.5)*shakeAmt*shk()*.12;
  camera.up.set(0,1,0); camera.lookAt(camLookV); camera.updateMatrixWorld();
  // mondo
  waterY = wy; water.position.y = wy; terrainU.uWater.value = wy;
  envNight(); skyU.uTime.value = T; skyU.uLight.value = lightK; skyU.uRed.value = 0; skyU.uWrong.value = 0; skyU.uSkyEye.value = 0;
  hemi.intensity = .07 + lightK*2.2; moon.intensity = .16 + lightK*1.5;
  if (t < 29){ hemi.intensity += .32; moon.intensity += .9; moon.color.setRGB(.55,.6,.75); P.uExposure.value = 1.9; }
  flash.intensity = 0; waterU.uFlashI.value = 0; waterU.uLampI.value = lamp.intensity; waterU.uLampPos.value.copy(lamp.position);
  camera.getWorldPosition(waterU.uFlashPos.value); camera.getWorldDirection(waterU.uFlashDir.value);
  waterU.uTime.value = T; waterU.uCalm.value = t < 29 ? 1.8 : 1; waterU.uGlow.value = 0;
  M.lampGlass.emissiveIntensity = lamp.intensity > 0 ? 3 : 0;
  terrainU.uEyes.value = eyesK;
  eyeU.uGlow.value = glow*(.85+.15*Math.sin(T*1.1)); eyeU.uTime.value = T; eyeU.uDilate.value = .2 + smooth(39,41.4,t)*1.2;
  lidU.rotation.x = -lidOpen*1.15; lidD.rotation.x = Math.PI + lidOpen*1.15; eye.lookAt(camera.position);
  tentacles.scale.setScalar(Math.max(.01, tentS)); tentU.uTime.value = T; tentacles.rotation.y += dt*.03;
  knot.rotation.x += dt*.13; knot.rotation.y += dt*.07;
  bucket.visible = false; rope.visible = false; spray.visible = false;
  walkers.count = 0; walkerEyes.count = 0; shoreEyes.count = 0;
  const under = applyUnder();
  mistU.uDen.value = t < 29 ? .5 : 1;
  P.uOld.value = old; P.uDark.value = dark; P.uTime.value = T; P.uInsane.value = t > 29 && t < 42 ? smooth(36,41.4,t)*.5 : 0; P.uTent.value = 0; P.uSick.value = t > 29 && t < 42 ? .3 : 0;
  P.uFlash.value = Math.max(lightK*.15, P.uFlash.value - dt*.8);
  if (AU.ctx){ const at = AU.ctx.currentTime;
    AU.droneG.gain.setTargetAtTime(drone, at, 1); AU.droneF.frequency.setTargetAtTime(under ? 120 : 180, at, 1);
    AU.choirG.gain.setTargetAtTime(choir, at, 1.2); AU.subG.gain.setTargetAtTime(sub, at, 1.5);
    AU.lapG.gain.setTargetAtTime(under ? 0 : lap, at, .5); AU.windG.gain.setTargetAtTime(under ? 0 : wind, at, 1); AU.pumpG.gain.setTargetAtTime(0, at, .3);
    AU.master.gain.setTargetAtTime(under ? .75 : .9, at, .4);
    if (AU.shepG){ AU.shepG.gain.setTargetAtTime(t > 29 && t < 42 ? .12 : 0, at, 1.5); AU.deepG.gain.setTargetAtTime(under ? .6 : 0, at, 1); } }
  if (t >= CINE_END) endCine();
}
function envNight(){
  skyU.uTop.value.copy(cNight.top); skyU.uHor.value.copy(cNight.hor); skyU.uNight.value = 1;
  scene.fog.color.copy(cNight.hor); scene.fog.density = .0105; waterU.uSky.value.copy(cNight.hor).multiplyScalar(1.3);
  hemi.intensity = .07; moon.intensity = .16; moon.color.setRGB(.45,.52,.66); postMat.uniforms.uExposure.value = 1.55;
}
function applyUnder(){
  const u = camera.position.y < water.position.y - .02;
  postMat.uniforms.uUnder.value = u ? 1 : 0; setUnder(u);
  MURK.uWaterY.value = u ? -1e4 : water.position.y;
  if (u){ scene.fog.color.setRGB(.004,.02,.016); scene.fog.density = .03; moteU.uTint.value.setRGB(.18,.3,.22); }
  else moteU.uTint.value.setRGB(.7,.75,.65);
  mists.forEach(m=>m.visible = !u);
  return u;
}
let shadowTick = false;
function fxUpdate(dt=.016){
  dropsUpdate(dt);
  mistU.uTime.value = T; mistU.uCol.value.copy(scene.fog.color);
  mists.forEach(m=>{ m.position.set(camera.position.x, water.position.y + m.userData.off, camera.position.z); });
  moteU.uTime.value = T; moteU.uCam.value.copy(camera.position); camera.getWorldDirection(moteU.uDir.value);
  terrainU.uTime.value = T; ghoulU.uTime.value = T;
  renderer.shadowMap.needsUpdate = flash.intensity > 0 && (shadowTick = !shadowTick);
}

/* =====================================================================
   AVVIO
   ===================================================================== */
let running = false;
function goFullLandscape(){
  const el = document.documentElement;
  const lock = ()=>{ try { screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(()=>{}); } catch(e){} };
  try {
    if (!document.fullscreenElement && !document.webkitFullscreenElement){
      const r = el.requestFullscreen ? el.requestFullscreen({navigationUI:'hide'}) : (el.webkitRequestFullscreen ? el.webkitRequestFullscreen() : null);
      if (r && r.then) r.then(lock).catch(lock); else lock();
    } else lock();
  } catch(e){ lock(); }
}
document.addEventListener('pointerdown', ()=>{ initAudio(); goFullLandscape(); }, true);
const saved = load();
if (saved && !saved.ended && saved.d > 0) $('contBtn').classList.remove('hidden');
if (saved && saved.ended) S = freshState(saved.cycle+1);
function startGame(fresh){
  initAudio();
  goFullLandscape();
  if (!fresh && saved) S = saved; else if (fresh){ const c = S.cycle || (saved? saved.cycle : 1); S = freshState(c); }
  $('screen').style.display = 'none';
  if (fresh){ let seen = false; try { seen = !!localStorage.getItem('ilfondo_cine'); } catch(e){} if (seen) showLetter(); else playCine(()=> showLetter()); } else begin();
}
function showLetter(){
  $('cardTitle').textContent = `Ditta Sesti & Figli — Acque`;
  $('cardText').textContent = `Gentile signor Ferri,\n\nLa ringraziamo per aver accettato l'incarico.\n\nIl lavoro è semplice: svuotare il lago di Nàrrena. Lavorerà da una zattera legata al pontile: quando l'acqua scende, la zattera scende con lei. Ogni litro Le sarà pagato, e l'acqua del fondo vale più di quella di superficie.\n\nLa preghiamo di osservare tre regole:\n\nI. Non scenda mai dalla zattera dopo il tramonto.\nII. Se dall'acqua qualcuno La chiama per nome, non risponda.\nIII. Non conti l'acqua.\n\nCon gratitudine,\nA. Sesti`;
  $('cardDiary').classList.add('hidden'); $('cardClose').textContent = 'FIRMA';
  $('card').classList.remove('hidden');
  $('cardClose').onclick = ()=>{ $('card').classList.add('hidden'); $('cardClose').textContent = 'CHIUDI'; $('cardClose').onclick = ()=> $('card').classList.add('hidden'); begin(); setTimeout(()=>toast(MOBILE ? `Tieni premuto SECCHIO per calarlo nel lago. Trascina per guardarti intorno: anche dietro di te.` : `Tieni premuto SECCHIO (o SPAZIO) per calarlo nel lago. Trascina col mouse o usa W A S D per guardarti intorno: anche dietro di te. ESC: impostazioni e comandi.`), 1200); };
}
function begin(){
  running = true; if (S.d < .5){ EV.next = 55; VIG.next = 22; } buildPlumbMarks(); ['hud','bottom','sideBtns'].forEach(id=>$(id).classList.remove('hidden'));
  $('torchBtn').classList.toggle('off', !S.torchOn);
  corpse2.visible = S.cycle > 1; layoutHelpers(); layoutMachines();
  waterY = -S.d; waterVel = 0; water.position.y = waterY; terrainU.uWater.value = waterY; raftPos.copy(raftTarget(waterY)); raftVel.set(0,0,0); rebuildPipes(true);
}
$('newBtn').onclick = ()=> startGame(true);
$('contBtn').onclick = ()=> startGame(false);
$('proBtn').onclick = ()=>{ goFullLandscape(); playCine(()=>{ $('screen').style.display = 'flex'; }); };

/* ---------- acqua torbida: più guardi in basso, più è nero ---------- */
const MURK = { uWaterY:{value:0}, uMurkK:{value:.12}, uMurkCol:{value:new THREE.Color(.003,.011,.009)} };
function addMurk(mat){
  if (!mat || mat.userData.murk || mat.isShaderMaterial || mat.isLineBasicMaterial || mat.isPointsMaterial) return; mat.userData.murk = true;
  const own = Object.prototype.hasOwnProperty.call(mat, 'onBeforeCompile'), prev = mat.onBeforeCompile, key = own ? mat.customProgramCacheKey() : '';
  mat.onBeforeCompile = (sh, r)=>{ if (own) prev.call(mat, sh, r);
    sh.uniforms.uWaterY = MURK.uWaterY; sh.uniforms.uMurkK = MURK.uMurkK; sh.uniforms.uMurkCol = MURK.uMurkCol;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vMurkY;').replace('#include <project_vertex>', `#include <project_vertex>
    { vec4 mw = vec4(transformed,1.);
      #ifdef USE_INSTANCING
      mw = instanceMatrix*mw;
      #endif
      vMurkY = (modelMatrix*mw).y; }`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vMurkY; uniform float uWaterY, uMurkK; uniform vec3 uMurkCol;').replace('#include <fog_fragment>', `{ float mb = max(uWaterY - vMurkY, 0.); float mk = 1. - exp(-mb*uMurkK); gl_FragColor.rgb = mix(gl_FragColor.rgb, uMurkCol, mk*.985); }
    #include <fog_fragment>`);
  };
  mat.customProgramCacheKey = ()=> 'murk|' + key;
  mat.needsUpdate = true;
}

/* ---------- segnalini: dove sono le cose riaffiorate ---------- */
const poiEls = {}; const poiV = new THREE.Vector3(), poiBox = new THREE.Box3();
const LORE_SHORT = { colossus:'IL GUARDIANO', shoes:'LE SCARPE', bike:'LA BICICLETTA', corpse:'IL CORPO', car:"L'AUTOMOBILE", bell:'IL CAMPANILE', house:'LE CASE', statue:'LE STATUE', monolith:'I MONOLITI', ledge:'LA LANTERNA', knot:'LA FORMA', eye:'IL FONDO' };
const loreCenter = {};
const poiVV = new THREE.Vector3();
function poiUpdate(){
  const show = running && !ending && !CINE.on;
  const cand = [];
  loreObjs.forEach(l=>{
    const want = show && S.revealed.includes(l.id) && !S.found.includes(l.id) && l.obj.visible && water.position.y < l.topY - .2;
    if (want){ if (!loreCenter[l.id]){ poiBox.setFromObject(l.obj); loreCenter[l.id] = poiBox.getCenter(new THREE.Vector3()); loreCenter[l.id].y = Math.min(poiBox.max.y, l.topY); } cand.push(l); }
  });
  cand.sort((A,B)=> loreCenter[A.id].distanceTo(camera.position) - loreCenter[B.id].distanceTo(camera.position));
  const vis = new Set(cand.slice(0,3).map(l=>l.id));
  loreObjs.forEach(l=>{
    let el = poiEls[l.id];
    if (!vis.has(l.id)){ if (el){ el.m.style.display = 'none'; el.a.style.display = 'none'; } return; }
    if (!el){ const m = document.createElement('div'); m.className = 'poiM'; m.textContent = '?'; m.dataset.l = LORE_SHORT[l.id]; m.onpointerdown = e=>{ e.stopPropagation(); initAudio(); openLore(l.id); };
      const a = document.createElement('div'); a.className = 'poiA'; a.innerHTML = `<b></b><span>${LORE_SHORT[l.id]}</span>`; $('poi').append(m, a); el = poiEls[l.id] = {m, a}; }
    poiV.copy(loreCenter[l.id]); if (l.id==='eye') poiV.y = Math.max(poiV.y, water.position.y + 1);
    poiVV.copy(poiV).applyMatrix4(camera.matrixWorldInverse);
    poiV.project(camera);
    const behind = poiVV.z > 0; const x = (poiV.x*.5+.5)*innerWidth, y = (-poiV.y*.5+.5)*innerHeight;
    const inside = !behind && x > 60 && x < innerWidth-60 && y > 70 && y < innerHeight-90;
    if (inside){ el.m.style.display = 'flex'; el.a.style.display = 'none'; el.m.style.left = x+'px'; el.m.style.top = y+'px'; }
    else { el.m.style.display = 'none'; el.a.style.display = 'block';
      let dx = poiVV.x, dy = -poiVV.y; if (behind){ dy *= .25; if (Math.abs(dx) < .2) dx = dx < 0 ? -.2 : .2; dx *= 4; }
      const hw = innerWidth/2 - 80, hh = innerHeight/2 - 110;
      const k = Math.min(hw/Math.max(1e-3,Math.abs(dx)), hh/Math.max(1e-3,Math.abs(dy)));
      el.a.style.left = (innerWidth/2 + dx*k)+'px'; el.a.style.top = (innerHeight/2 - 15 + dy*k)+'px';
      el.a.style.setProperty('--r', (Math.atan2(dy, dx)*180/Math.PI + 45)+'deg'); }
  });
}
/* ---------- HUD: battito, piombino, occhio ---------- */
const ecg = $('ecg').getContext('2d'); let ecgSkip = false; const HC = {}; const EL = { lucLid:$('lucLid'), lucIris:$('lucIris'), plumbBob:$('plumbBob'), hud:$('hud'), bucketRing:$('bucketRing'), dayIc:$('dayIc') }; let ecgX = 0, ecgPh = 0; const ecgBuf = new Float32Array(200);
function hudFx(dt){
  const fear = clamp((100 - S.luc)/100, 0, 1), bpm = 62 + fear*90 + (phase>=4?20:0);
  for (let k=0;k<3;k++){ ecgPh += dt*bpm/60/3; const p = ecgPh % 1; let v = 0;
    if (p < .06) v = Math.sin(p/.06*Math.PI)*.15; else if (p > .12 && p < .14) v = -.2; else if (p >= .14 && p < .18) v = 1 - (p-.14)/.04*1.6; else if (p >= .18 && p < .21) v = -.35 + (p-.18)/.03*.35; else if (p > .3 && p < .42) v = Math.sin((p-.3)/.12*Math.PI)*.25;
    if (S.luc < 25) v += (Math.random()-.5)*.25;
    ecgBuf[ecgX] = v; ecgX = (ecgX+1) % 200; }
  if ((ecgSkip = !ecgSkip)){
    ecg.clearRect(0,0,200,40); ecg.strokeStyle = S.luc < 30 ? '#d0584a' : '#a9c19a'; ecg.lineWidth = 2; ecg.beginPath();
    for (let i=0;i<200;i+=2){ const j = (ecgX + i) % 200; const y = 22 - ecgBuf[j]*16; i ? ecg.lineTo(i, y) : ecg.moveTo(i, y); } ecg.stroke(); }
  const lid = Math.round(clamp((100-S.luc)/100,0,1)*40)/40, mad = S.luc < 22 || glitchT > 0, low = S.luc < 30, bob = Math.round(clamp(S.d/MAXD,0,1)*400)/4;
  if (lid !== HC.lid){ HC.lid = lid; EL.lucLid.style.transform = `scaleY(${-1 + 2*lid*.9})`; }
  if (low !== HC.low){ HC.low = low; EL.lucIris.setAttribute('fill', low ? '#b03020' : '#c9a640'); }
  if (bob !== HC.bob){ HC.bob = bob; EL.plumbBob.style.top = bob + '%'; }
  if (mad !== HC.mad){ HC.mad = mad; EL.hud.classList.toggle('mad', mad); }
  const bp = B.busy ? Math.round(clamp(B.t/B.dur,0,1)*50)*2 : 0; if (!X_.grip && bp !== HC.bp){ HC.bp = bp; EL.bucketRing.style.setProperty('--p', bp); }
  const di = dayF >= .5 ? '☉' : '☾'; if (di !== HC.di){ HC.di = di; EL.dayIc.textContent = di; }
  if (findT > 0){ findT -= dt; if (findT <= 0) $('findCard').classList.add('hidden'); }
}
function buildPlumbMarks(){
  $('plumbMarks').innerHTML = [0,16,32,48,64,80,96,112,128].map(d=>`<i style="top:${d/MAXD*100}%"></i>`).join('') +
    loreObjs.filter(l=>S.revealed.includes(l.id)).map(l=>`<i class="lo ${S.found.includes(l.id)?'done':''}" style="top:${clamp(-l.topY/MAXD,0,1)*100}%"></i>`).join('');
}

/* =====================================================================
   REGIA 2: niente vuoti. Piccole scene sempre visibili tra un evento e l'altro,
   e i grandi momenti: l'abisso, il gigante all'orizzonte, gli annegati che sanno.
   ===================================================================== */
const uiBusy = () => ['shop','diary','card','call','prompt'].some(id => !$(id).classList.contains('hidden'));
const underRaft = () => waterY - H(raftPos.x, raftPos.z - 6);
const R2 = { still:0, darkK:0, dunk:0, dunkR:0 };
const flameSprite = (s=1)=>{ const g = new THREE.Group(); const fl = new THREE.Sprite(flameMat); fl.scale.set(.16*s,.32*s,1); fl.position.y = .16*s; g.add(fl); const ha = new THREE.Sprite(haloMat); ha.scale.setScalar(1.1*s); ha.position.y = .12*s; g.add(ha); g.userData = {fl, ha, s}; return g; };
function flicker(g, k=1){ const u = g.userData, f = k*(.85 + .15*Math.sin(T*17 + g.id) + .08*Math.sin(T*7.3 + g.id*2)); u.fl.scale.set(.16*u.s*f, .32*u.s*f*(1 + .1*Math.sin(T*11 + g.id)), 1); u.ha.scale.setScalar(1.1*u.s*f); g.visible = k > .02; }
const lookAtCam = (o, k=1, dt=.016)=>{ const want = Math.atan2(camera.position.x - o.position.x, camera.position.z - o.position.z); let d = want - o.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); o.rotation.y += d*Math.min(1, dt*k); };
// un punto d'acqua davanti alla zattera, verso dove guardi se possibile
function spotAhead(dMin, dMax, need=1.5, spread=.9){ camera.getWorldDirection(fwd); const base = Math.atan2(fwd.x, fwd.z);
  for (let k=0;k<40;k++){ const a = (k < 20 ? base : Math.atan2(-raftPos.x, -raftPos.z)) + rand(-spread, spread), r = rand(dMin, dMax), x = raftPos.x + Math.sin(a)*r, z = raftPos.z + Math.cos(a)*r; if (wetSpot(x, z, need)) return new THREE.Vector3(x, waterY, z); }
  return null; }

/* ---------- oggetti alla deriva: il paese che torna a galla un pezzo alla volta ---------- */
const DRIFT = (()=>{ const L = {};
  const chair = new THREE.Group(); chair.add(mesh(new THREE.BoxGeometry(.46,.05,.44), M.wood, 0,.45,0)); chair.add(mesh(new THREE.BoxGeometry(.46,.55,.05), M.wood, 0,.75,-.2));
  for (const [x,z] of [[-.2,-.19],[.2,-.19],[-.2,.19],[.2,.19]]) chair.add(mesh(new THREE.BoxGeometry(.04,.45,.04), M.woodDark, x,.22,z)); chair.rotation.x = 1.4; L.chair = chair;
  const cradle = new THREE.Group(); cradle.add(mesh(new THREE.CylinderGeometry(.32,.32,.85,14,1,true,0,Math.PI).rotateZ(Math.PI/2).rotateX(Math.PI/2), new THREE.MeshStandardMaterial({color:0x3a2c20, roughness:.9, side:THREE.DoubleSide}), 0,.32,0));
  for (const z of [-.35,.35]) cradle.add(mesh(new THREE.TorusGeometry(.38,.025,5,14,Math.PI).rotateZ(Math.PI), M.woodDark, 0,.1,z).rotateY(Math.PI/2));
  cradle.add(mesh(new THREE.SphereGeometry(.07,10,8), M.pale, .0,.26,.25)); L.cradle = cradle;
  const hat = new THREE.Group(); hat.add(mesh(new THREE.CylinderGeometry(.11,.12,.13,14), M.leather, 0,.07,0)); hat.add(mesh(new THREE.CylinderGeometry(.22,.22,.012,18), M.leather, 0,.01,0)); L.hat = hat;
  const candle = new THREE.Group(); candle.add(mesh(new THREE.CylinderGeometry(.16,.13,.03,16), M.paper, 0,.015,0)); candle.add(mesh(new THREE.CylinderGeometry(.025,.025,.18,8), new THREE.MeshStandardMaterial({color:0xd8cfb8, roughness:.6}), 0,.12,0));
  const cf = flameSprite(.55); cf.position.y = .2; candle.add(cf); candle.userData.flame = cf; L.candle = candle;
  const coffin = (()=>{ const sh = new THREE.Shape(); sh.moveTo(-.22,-.95); sh.lineTo(.22,-.95); sh.lineTo(.32,.45); sh.lineTo(.2,.95); sh.lineTo(-.2,.95); sh.lineTo(-.32,.45); sh.lineTo(-.22,-.95);
    const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.ExtrudeGeometry(sh, {depth:.06, bevelEnabled:false}).rotateX(-Math.PI/2), M.woodDark)); g.add(mesh(new THREE.BoxGeometry(.05,.02,.7), M.bone, 0,.07,-.1)); g.add(mesh(new THREE.BoxGeometry(.36,.02,.05), M.bone, 0,.07,-.25)); return g; })(); L.coffin = coffin;
  const doll = new THREE.Group(); doll.add(mesh(new THREE.ConeGeometry(.12,.28,10), M.paper, 0,.0,0).rotateX(Math.PI/2)); const dh = mesh(new THREE.SphereGeometry(.07,12,10), new THREE.MeshStandardMaterial({color:0xd8d0c0, roughness:.3}), 0,.03,-.18); doll.add(dh);
  for (const s of [-1,1]) dh.add(mesh(new THREE.SphereGeometry(.012,6,4), M.black, s*.025,.06,-.01)); doll.userData.head = dh; L.doll = doll;
  const mbox = new THREE.Group(); mbox.add(mesh(new THREE.BoxGeometry(.22,.1,.16), M.woodDark, 0,.05,0)); const lid = mesh(new THREE.BoxGeometry(.22,.02,.16).translate(0,0,.08), M.woodDark, 0,.1,-.08); lid.rotation.x = -1.1; mbox.add(lid);
  mbox.add(mesh(new THREE.BoxGeometry(.18,.01,.12), M.lampGlass, 0,.095,0)); const bal = mesh(new THREE.ConeGeometry(.02,.09,6), M.pale, 0,.15,0); mbox.add(bal); mbox.userData.bal = bal; L.musicbox = mbox;
  const frame = new THREE.Group(); frame.add(mesh(new THREE.BoxGeometry(.34,.025,.44), M.woodDark)); const ph = mesh(new THREE.PlaneGeometry(.26,.36).rotateX(-Math.PI/2), new THREE.MeshStandardMaterial({color:0x8a826e, roughness:.8}), 0,.014,0); frame.add(ph);
  frame.add(mesh(new THREE.CircleGeometry(.05,10).rotateX(-Math.PI/2), M.black, 0,.016,-.06)); L.frame = frame;
  for (const k in L){ L[k].visible = false; scene.add(L[k]); } return L; })();
const DRIFT_TXT = { chair:`Una sedia galleggia davanti alla zattera. È ancora apparecchiata per qualcuno: c'è un tovagliolo piegato sul sedile.`, cradle:`Una culla passa davanti alla zattera. Dondola da sola, piano, come se qualcuno la spingesse da sotto.`,
  hat:`Un cappello da uomo galleggia verso di te. Nel nastro c'è un biglietto della corriera del '53.`, candle:`Un piatto con una candela accesa scivola sull'acqua. La fiamma non trema. Non c'è vento, laggiù.`,
  coffin:`Il coperchio di una bara passa davanti alla zattera. È graffiato dall'interno.`, doll:`Una bambola galleggia a pancia in giù. Quando le passi davanti, la testa si gira.`,
  musicbox:`Un carillon aperto galleggia vicino alla zattera. Suona da solo. La ballerina gira al contrario.`, frame:`Una cornice galleggia con la foto rivolta in su. È una famiglia a tavola. C'è una sedia vuota. È la tua.` };
const DR = { o:null };
function startDrift(kind, near=false){ if (DR.o) return false; const k = kind || pick(DRIFT_BY_ACT[actOf(S.d)].filter(k=>k !== S.lastDrift));
  const p = spotAhead(near ? 3.5 : 6, near ? 5.5 : 10, 1.2, .5); if (!p) return false; camera.getWorldDirection(fwd);
  const side = new THREE.Vector3(fwd.z, 0, -fwd.x).normalize(), sg = Math.random()<.5 ? -1 : 1, a = p.clone().addScaledVector(side, sg*9), b = p.clone().addScaledVector(side, -sg*9);
  const o = DRIFT[k]; o.visible = true; o.position.copy(a); o.rotation.y = rand(0,6.3); DR.o = { k, o, a, b, t:0, dur:rand(22,30), sink:0, seen:0, out:false }; S.lastDrift = k;
  if (k === 'candle') o.userData.flame.visible = true; if (k === 'musicbox') musicBoxSfx(.2);
  think(['cradle','doll','candle','coffin','musicbox'].includes(k) ? 'drift2' : 'drift', 7);
  S.vigSeen = S.vigSeen || {}; if (!S.vigSeen[k]){ S.vigSeen[k] = 1; setTimeout(()=>toast(DRIFT_TXT[k]), 2500); } return true; }
function driftUpdate(dt){ const e = DR.o; if (!e) return; e.t += dt; const o = e.o, k = clamp(e.t/e.dur, 0, 1);
  // a metà strada rallenta, proprio davanti a te
  const u = k < .5 ? smooth(0,.5,k)*.5 : .5 + smooth(.5,1,k)*.5; o.position.x = lerp(e.a.x, e.b.x, u); o.position.z = lerp(e.a.z, e.b.z, u);
  o.position.y = water.position.y + bigWaveH(o.position.x, o.position.z) + Math.sin(T*1.2 + e.t)*.03 - e.sink; o.rotation.y += dt*.05; o.rotation.z = Math.sin(T*.9)*.06;
  if (Math.random() < dt*.8) ripple(o.position.x, o.position.z, .25);
  const seen = lookingAt(o.position, .97); if (seen) e.seen += dt;
  if (e.k === 'candle'){ const f = o.userData.flame; if (e.seen > 1.2 && f.visible){ f.visible = false; dripFX(o.position.x, o.position.y + .2, o.position.z, 3, .02); whisperSfx(.8,.12); } else if (f.visible) flicker(f, 1); }
  if (e.k === 'doll' && e.seen > .6){ const hd = o.userData.head; hd.rotation.y += (Math.atan2(camera.position.x - o.position.x, camera.position.z - o.position.z) - o.rotation.y - hd.rotation.y)*Math.min(1, dt*.8); if (!e.dl){ e.dl = 1; creakSfx(); } }
  if (e.k === 'cradle') o.rotation.z = Math.sin(T*1.6)*.22;
  if (e.k === 'musicbox') o.userData.bal.rotation.y -= dt*2;
  if (k >= 1 || e.out){ if (!e.out){ e.out = true; } e.sink += dt*.25; if (e.sink > 1.5 || (!inView(o, 1) && e.sink > .1)){ o.visible = false; DR.o = null; } } }

/* ---------- piccole scene ---------- */
const shoreLamp = flameSprite(1.4); shoreLamp.visible = false; scene.add(shoreLamp);
const jumper = new THREE.Mesh(fishGeo, fishMesh.material); jumper.visible = false; scene.add(jumper);
const armJ = new THREE.Mesh(handGeo, wetMat0()); armJ.visible = false; scene.add(armJ);
const hairMass = (()=>{ const g = new THREE.Group(), P = []; for (let k=0;k<34;k++){ const a = rand(0,6.3), l = rand(.6,1.5), pts = []; for (let j=0;j<=5;j++){ const t = j/5; pts.push(new THREE.Vector3(Math.cos(a + Math.sin(t*3+k)*.4)*l*t, 0, Math.sin(a + Math.sin(t*3+k)*.4)*l*t)); } P.push(tube(pts, .012, .004, 10, 3)); }
  g.add(new THREE.Mesh(mergeGeometries(P), new THREE.MeshStandardMaterial({color:0x050404, roughness:.35}))); g.visible = false; scene.add(g); return g; })();
const ridge = (()=>{ const g = new THREE.Group(); g.add(new THREE.Mesh(limb([V3(-9,0,0), V3(-3,.4,0), V3(3,.4,0), V3(9,0,0)], [1.2,2.2,2.4,2.1,1.1], 24, 14), creatureMat));
  for (let k=0;k<7;k++){ const c = mesh(new THREE.ConeGeometry(.35,1.6,6), creatureMat, -7.5 + k*2.5, 2.3 + Math.sin(k)*.2, 0); c.rotation.z = -.5; g.add(c); } g.visible = false; scene.add(g); return g; })();
const VIG = { next:9, cur:null, last:[] };
const VIG_DEF = {
  drift:{ ok:()=>!DR.o, w:2.4, go:()=>startDrift() },
  shoreLight:{ ok:()=>dayF < .6 || phase >= 2, w:1, go:()=>{ camera.getWorldDirection(fwd); const a = Math.atan2(fwd.z, fwd.x) + rand(-.45,.45), r = shoreR(S.d) + rand(2,6), x = Math.cos(a)*r, z = Math.sin(a)*r;
      shoreLamp.position.set(x, H(x,z) + 1.3, z); shoreLamp.visible = true; VIG.cur = { k:'shoreLight', t:0, a, r, dir:Math.random()<.5?-1:1 }; return true; } },
  jump:{ ok:()=>underRaft() > 2, w:1.3, go:()=>{ const p = spotAhead(6, 13, 1.5, .7); if (!p) return false; const arm = actOf(S.d) >= 2 && Math.random() < .55, o = arm ? armJ : jumper;
      o.position.copy(p); o.visible = true; o.rotation.set(0, rand(0,6.3), 0); VIG.cur = { k:'jump', t:0, p, o, arm, sp:0 }; return true; } },
  bubbles:{ ok:()=>true, w:1.2, go:()=>{ const p = spotAhead(4, 9, 1, .6); if (!p) return false; VIG.cur = { k:'bubbles', t:0, p }; bubbleSfx(); return true; } },
  lurch:{ ok:()=>true, w:.8, go:()=>{ raftOffV.x += rand(-.8,.8); raftOffV.y += rand(.5,1); raftJolt = Math.max(raftJolt, .35); creakSfx(); setTimeout(creakSfx, 350); splashFX(raftPos.x + rand(-1.5,1.5), waterY, raftPos.z - 1.8, .4, .5);
      sub(pick([`(la zattera dà uno strattone, come se qualcuno tirasse la corda dal pontile)`,`(la zattera scivola di lato. Sotto, qualcosa l'ha spinta)`]), 3.5); return true; } },
  hair:{ ok:()=>phase >= 1, w:.9, go:()=>{ const p = spotAhead(2.8, 4.5, .8, .5); if (!p) return false; hairMass.position.copy(p); hairMass.visible = true; hairMass.rotation.y = rand(0,6.3); VIG.cur = { k:'hair', t:0, p };
      setTimeout(()=>sub(`(capelli. Tanti, lunghi, aperti sull'acqua come una mano)`, 3.5), 900); return true; } },
  face:{ ok:()=>phase >= 1 && !X_.hand, w:.9, go:()=>{ const p = spotAhead(3, 4.5, 1.2, .35); if (!p) return false; headObj.position.set(p.x, waterY - .45, p.z); headObj.visible = true; headObj.lookAt(camera.position); VIG.cur = { k:'face', t:0, p }; return true; } },
  ridge:{ ok:()=>S.d > 10 && underRaft() > 8, w:.8, go:()=>{ const p = spotAhead(24, 40, 7, .6); if (!p) return false; ridge.position.set(p.x, waterY - 3, p.z); ridge.rotation.y = rand(0,6.3); ridge.visible = true; VIG.cur = { k:'ridge', t:0, p }; return true; } }
};
function startVignette(){ if (VIG.cur || ending) return false; const c = []; let tot = 0;
  for (const k in VIG_DEF){ const d = VIG_DEF[k]; if (VIG.last.includes(k) || (VIG_ACT[k] ?? 0) > actOf(S.d) || !d.ok()) continue; c.push([k, d.w]); tot += d.w; }
  let r = Math.random()*tot; for (const [k,w] of c){ r -= w; if (r <= 0){ if (VIG_DEF[k].go()){ think(k, 3); VIG.last.push(k); if (VIG.last.length > 3) VIG.last.shift(); return true; } return false; } } return false; }
function vignetteUpdate(dt){ const v = VIG.cur; if (!v) return; v.t += dt;
  if (v.k === 'shoreLight'){ v.a += v.dir*dt*.012; const x = Math.cos(v.a)*v.r, z = Math.sin(v.a)*v.r; shoreLamp.position.set(x, H(x,z) + 1.3 + Math.abs(Math.sin(T*3.2))*.08, z);
    const k = smooth(0,1.5,v.t)*(1 - smooth(10,10.4,v.t)); flicker(shoreLamp, k*1.3); if (v.t > 10.5){ shoreLamp.visible = false; VIG.cur = null; } }
  else if (v.k === 'jump'){ const o = v.o, y0 = water.position.y;
    if (v.arm){ const u = clamp(v.t/2.6, 0, 1), up = Math.sin(Math.PI*u); o.position.y = y0 - 1 + up*1.7; o.rotation.x = -.3 + u*1.6; if (!v.sp && v.t > .2){ v.sp = 1; splashFX(v.p.x, y0, v.p.z, .5, .5); } if (u >= 1){ splashFX(v.p.x, y0, v.p.z, 1, .8); makeWave(v.p.x, v.p.z, .5); o.visible = false; VIG.cur = null; } }
    else { const u = clamp(v.t/1.1, 0, 1); v.ry = v.ry ?? o.rotation.y; o.rotation.order = 'YZX'; o.position.y = y0 + Math.sin(Math.PI*u)*1.3; o.position.x = v.p.x + u*2*Math.cos(v.ry); o.position.z = v.p.z - u*2*Math.sin(v.ry); o.rotation.z = (.5 - u)*2.2; o.rotation.y = v.ry + Math.sin(v.t*34)*.22*(1 - u*.5); o.rotation.x = Math.sin(v.t*9)*.15;
      if (!v.sp){ v.sp = 1; splashFX(v.p.x, y0, v.p.z, .35, .4); splashSfx(10, 3); } if (u >= 1){ splashFX(o.position.x, y0, o.position.z, .45, .4); splashSfx(10, 4); o.visible = false; VIG.cur = null; } } }
  else if (v.k === 'bubbles'){ if (Math.random() < dt*30) emitDrop(v.p.x + rand(-.5,.5), water.position.y, v.p.z + rand(-.5,.5), 0, rand(.4,1.1), 0, .7, rand(.6,1.4)); if (Math.random() < dt*3) ripple(v.p.x + rand(-.4,.4), v.p.z + rand(-.4,.4), .5);
    if (v.t > 4 && !v.end){ v.end = 1; if (phase >= 2){ splashFX(v.p.x, water.position.y, v.p.z, .5, .4); groanSfx(.25, 2); } } if (v.t > 5) VIG.cur = null; }
  else if (v.k === 'hair'){ hairMass.position.y = water.position.y + .01 + bigWaveH(v.p.x, v.p.z); hairMass.rotation.y += dt*.1; if (v.t > 6){ hairMass.position.y -= (v.t - 6)*1.4; if (!v.pull){ v.pull = 1; ripple(v.p.x, v.p.z, 1); slitherSfx(.3); } } if (v.t > 7.2){ hairMass.visible = false; VIG.cur = null; } }
  else if (v.k === 'face'){ headObj.position.y = water.position.y - .45 + Math.sin(T)*.02 - Math.max(0, v.t - 3.5)*1.2; if (lookingAt(headObj.position, .97) && v.t > .8 && !v.saw){ v.saw = 1; heartSfx(.5); } if (v.t > 4.6){ headObj.visible = false; VIG.cur = null; ripple(v.p.x, v.p.z, .5); } }
  else if (v.k === 'ridge'){ const up = smooth(0,2,v.t)*(1 - smooth(4,6,v.t)); ridge.position.y = water.position.y - 3 + up*2.6; ridge.position.x += Math.sin(ridge.rotation.y)*dt*2; ridge.position.z += Math.cos(ridge.rotation.y)*dt*2;
    if (Math.random() < dt*3*up) ripple(ridge.position.x + rand(-6,6), ridge.position.z + rand(-2,2), 1.2); if (v.t > 1.5 && !v.w){ v.w = 1; makeWave(ridge.position.x, ridge.position.z, 1); surfaceSfx(1.2); }
    if (v.t > 6.5){ ridge.visible = false; VIG.cur = null; } } }

/* ---------- l'abisso: nei lampi l'acqua diventa trasparente, e sotto c'è Lui ---------- */
function evAbyss(){ const sc = clamp(underRaft()/9, .9, 2.4); creature.visible = true; creature.scale.setScalar(sc); const a = rand(0, 6.3);
  creature.position.set(raftPos.x + Math.sin(a)*4, H(raftPos.x, raftPos.z - 6) + 3*sc, raftPos.z - 6 + Math.cos(a)*4); creature.rotation.set(0, a, 0);
  X_.abyss = { t:0, sc, y0:creature.position.y, flashes:[1.2, 3.8, 6.3], i:0 }; X_.big = 14; }
function abyssUpdate(dt){ const e = X_.abyss; if (!e) return; e.t += dt;
  if (e.i < e.flashes.length && e.t > e.flashes[e.i]){ lightning(true); e.i++; creature.position.y = Math.min(waterY - 5*e.sc, e.y0 + e.i*2.2*e.sc); if (e.i === 2) heartSfx(.8); if (e.i === 3){ creatureSfx({ kind:'call', far:.1, vol:1 }); loseLuc(8, `quello che c'è sotto`); } }
  const clear = clamp(lightK*1.6, 0, 1); waterU.uClear.value = clear; MURK.uMurkK.value = lerp(.12, .006, clear);
  if (e.t > 8.2 && !e.txt){ e.txt = 1; toast(`Nei lampi l'acqua è diventata trasparente come vetro. Sotto la zattera, sul fondo, era disteso qualcosa. Era più lungo del lago.`, 'cosmic'); }
  if (e.t > 9){ creature.visible = false; X_.abyss = null; waterU.uClear.value = 0; MURK.uMurkK.value = .12; } }

/* ---------- all'orizzonte: più alto delle montagne, e a ogni lampo più vicino ---------- */
const giant = (()=>{ const g = new THREE.Group(), blk = new THREE.MeshBasicMaterial({color:0x000000, fog:false}); blk.userData.murk = true;
  const prof = [[0,0],[95,0],[90,70],[78,140],[62,190],[50,215],[30,232],[0,240]].map(([r,y])=>new THREE.Vector2(r,y)); g.add(new THREE.Mesh(new THREE.LatheGeometry(prof, 24), blk));
  const hd = new THREE.Mesh(new THREE.SphereGeometry(38, 20, 14), blk); hd.scale.set(1,1.25,1); hd.position.set(0, 262, 18); g.add(hd);
  for (let k=0;k<11;k++){ const u = (k-5)/5, pts = []; for (let j=0;j<=8;j++){ const t = j/8; pts.push(new THREE.Vector3(u*26*(1+t*.3) + Math.sin(t*3+k)*8, 240 - t*(110 + (1-Math.abs(u))*60), 46 + t*20 + Math.sin(t*4+k)*6)); } g.add(new THREE.Mesh(tube(pts, 7, 1, 16, 6), blk)); }
  for (const s of [-1,1]){ const w = new THREE.Mesh(new THREE.ConeGeometry(16, 170, 6), blk); w.position.set(s*70, 250, -20); w.rotation.z = -s*.45; g.add(w); }
  const eyes = []; for (const [x,y] of [[-14,270],[14,270],[0,290],[-24,252],[24,252]]){ const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map:deepGlowTex(), color:new THREE.Color(4,2.4,.5), blending:THREE.AdditiveBlending, depthWrite:false, transparent:true, fog:false, opacity:0 })); sp.material.userData.murk = true; sp.position.set(x, y, 56); sp.scale.setScalar(16); g.add(sp); eyes.push(sp); }
  g.userData.eyes = eyes; g.visible = false; scene.add(g); return g; })();
function evHorizon(){ camera.getWorldDirection(fwd); const a = Math.atan2(fwd.x, fwd.z) + rand(-.35,.35); X_.giant = { t:0, a, fl:[1.2, 5.2, 9.4, 13.6], i:0 }; X_.big = 18; giant.visible = true; giant.userData.eyes.forEach(e=>e.material.opacity = 0); }
function giantUpdate(dt){ const e = X_.giant; if (!e) return; e.t += dt; const dist = [620, 470, 340, 340][Math.min(3, Math.max(0, e.i - 1))];
  giant.position.set(raftPos.x + Math.sin(e.a)*dist, -70, raftPos.z + Math.cos(e.a)*dist); giant.rotation.y = e.a + Math.PI + (e.i >= 3 ? 0 : .5); giant.visible = e.i < 4;
  if (e.i < e.fl.length && e.t > e.fl[e.i]){ e.i++; lightning(true); if (e.i === 1) setTimeout(()=>attend(new THREE.Vector3(giant.position.x, 120, giant.position.z), .5, 2.5), 100);
    if (e.i === 2){ creatureSfx({ kind:'call', far:1, vol:1 }); toast(`All'orizzonte, oltre le montagne, nel lampo c'era qualcosa. Più alto delle montagne.`, 'cosmic'); deepCallSfx(.5); }
    if (e.i === 3){ giant.userData.eyes.forEach(s=>s.material.opacity = 1); heartSfx(.9); setTimeout(()=>toast(`Al lampo dopo era più vicino. E aveva girato la testa verso di te.`, 'warn'), 900); loseLuc(9, `il gigante all'orizzonte`); }
    if (e.i === 4){ setTimeout(()=>sub(`(all'ultimo lampo l'orizzonte era vuoto. Non è andato via. Si è abbassato.)`, 5), 900); } }
  if (e.i === 3) giant.userData.eyes.forEach(s=>{ s.material.opacity = .6 + .4*Math.sin(T*2); });
  if (e.t > 16){ giant.visible = false; X_.giant = null; } }

/* ---------- la pupilla: la zattera galleggia sopra un occhio ---------- */
function evPupil(){ const x = raftPos.x, z = raftPos.z - 9; deepEye.position.set(x, Math.min(waterY - 5, Math.max(H(x,z) + 1, waterY - 9)), z); deepEye.rotation.y = rand(-.3,.3); deepEye.scale.set(3.2, 1, .02); deepEye.visible = true;
  X_.pupil = { t:0 }; X_.big = 14; heartSfx(.6); creatureSfx({ kind:'breath', far:.15, vol:1, delay:.6 }); setTimeout(()=>attend(new THREE.Vector3(x, waterY - 6, z - 2), .7, 2.5), 900); }
function pupilUpdate(dt){ const e = X_.pupil; if (!e) return; e.t += dt; const open = smooth(.5,5,e.t)*(1 - smooth(10,12,e.t)); deepEye.scale.set(3.2, 1, Math.max(.02, open)); deepEye.material.opacity = Math.min(1, open*1.2);
  if (e.t > 5 && !e.txt){ e.txt = 1; raftJolt = .5; toast(`Sotto la zattera l'acqua è diventata un occhio. La zattera galleggia sulla pupilla.`, 'cosmic'); loseLuc(7, `l'occhio sotto la zattera`); }
  if (e.t > 12.5){ deepEye.visible = false; X_.pupil = null; } }

/* ---------- il buio ---------- */
function evDarkness(){ blackT = 10; R2.darkK = 0; X_.dark = { t:0 }; X_.big = 14; creakSfx(); play('click', {vol:.5, rev:.05});
  SE.list = []; SE.t = 9.5; for (let i=0;i<14;i++){ const a = rand(0, Math.PI*2), r = rand(2.6, 6), x = raftPos.x + Math.cos(a)*r, z = raftPos.z + Math.sin(a)*r; SE.list.push({ p:new THREE.Vector3(x, waterY + rand(.15,.6), z), ph:rand(0,50), rate:rand(.5,1.2), alive:true, s:rand(.7,1) }); }
  [1.5, 3.2, 4.4, 6.1, 7.7].forEach((d,i)=> setTimeout(()=>{ if (!running) return; const a = rand(0,6.3); splashSfx(rand(3,7), 6); if (i%2) footstepSfx(); else slitherSfx(.3, Math.cos(a)); }, d*1000));
  setTimeout(()=>breathSfx(true, 2.2, .3), 3000); setTimeout(()=>breathSfx(false, 2.4, .3), 5600); setTimeout(()=>sub(`(nel buio, l'acqua si muove tutto intorno. Qualcuno sale sulla zattera)`, 4), 2500); }
function darkUpdate(dt){ const e = X_.dark; if (!e) return; e.t += dt; R2.darkK = smooth(0,.6,e.t)*(1 - smooth(9.4,10,e.t))*.6;
  if (e.t > 10 && !e.end){ e.end = 1; const pv = PRINTS[1]; prints.scale.set(1.15, 1, 1.15); layoutPrints(true); X_.prints = 28; X_.scratch = 70; scratches.position.x = rand(-.5,.5); writeName(pick([`ERAVAMO QUI`,`TUTTI`,`TOBIA`])); X_.name = 26;
    toast(`Quando la luce torna, la zattera è fradicia. Impronte dappertutto, piedi nudi, tanti. Qualcuno ha scritto sulle assi.`, 'warn'); loseLuc(7, `nel buio, sulla zattera`); heartSfx(.8); }
  if (e.t > 10.5){ X_.dark = null; R2.darkK = 0; } }

/* ---------- la cena: gli annegati sanno, e ti aspettano a tavola ---------- */
const dinner = (()=>{ const g = new THREE.Group(), cloth = new THREE.MeshStandardMaterial({color:0x8e877a, roughness:.95, side:THREE.DoubleSide});
  g.add(mesh(new THREE.BoxGeometry(2.2,.06,1.1), M.woodDark, 0,.82,0)); const tc = mesh(new THREE.BoxGeometry(2.36,.02,1.26), cloth, 0,.86,0); g.add(tc);
  for (const [x,z] of [[-1,-.45],[1,-.45],[-1,.45],[1,.45]]) g.add(mesh(new THREE.BoxGeometry(.07,.82,.07), M.woodDark, x,.41,z));
  for (const [x,z] of [[-.6,-.35],[.6,-.35],[-.6,.35],[.6,.35],[0,.35]]){ g.add(mesh(new THREE.CylinderGeometry(.14,.11,.025,14), M.paper, x,.885,z)); g.add(mesh(new THREE.SphereGeometry(.05,8,6), new THREE.MeshStandardMaterial({color:0x1a1e14, roughness:.3}), x,.9,z)); }
  const flames = []; for (const x of [-.35,0,.35]){ g.add(mesh(new THREE.CylinderGeometry(.025,.025,.22,8), M.paper, x,.98,0)); const f = flameSprite(1.3); f.position.set(x, 1.06, 0); f.visible = false; g.add(f); flames.push(f); }
  const figs = []; for (const [x,z,ry] of [[-.6,-.95,0],[.6,-.95,0],[-.6,.95,Math.PI],[.6,.95,Math.PI],[-1.5,0,Math.PI/2]]){ const ft = rand(1.9,2.15), fh = rand(.5,.9); const f = mesh(figureGeo(ft, fh), ghoulMat, x, .86 - ft*.42, z);
    f.rotation.y = ry; f.add(mesh(eyePairGeo, eyeGlowMat, ...eyeAt(ft, fh))); g.add(f); figs.push({ f, ry, d:rand(.5,3.5) }); }
  g.userData = { flames, figs }; g.visible = false; scene.add(g); return g; })();
function evDinner(){ const p = spotAhead(7, 10, 2.4, .45); if (!p){ startEv('heads'); return; } dinner.position.set(p.x, waterY - 4, p.z); dinner.rotation.y = Math.atan2(camera.position.x - p.x, camera.position.z - p.z) + Math.PI/2;
  dinner.userData.figs.forEach(o=>o.f.rotation.y = o.ry); dinner.userData.flames.forEach(f=>f.visible = false); dinner.visible = true; X_.dinner = { t:0, seen:0 }; X_.big = 22; bubbleSfx(); attend(p.clone().setY(waterY + 1), .6, 2.5); }
function dinnerUpdate(dt){ const e = X_.dinner; if (!e) return; e.t += dt; const up = smooth(0,4,e.t), dn = smooth(17,24,e.t), P = dinner.position;
  const prevY = P.y; P.y = water.position.y - 4 + up*3.3 - dn*5 + bigWaveH(P.x, P.z)*.8; dinner.rotation.z = Math.sin(T*.7)*.02;
  if (prevY < water.position.y - .1 && P.y >= water.position.y - .1){ splashFX(P.x, water.position.y, P.z, 1.3, 1.6); surfaceSfx(1.3); makeWave(P.x, P.z, .6); }
  if (up > .5 && dn < .1 && Math.random() < dt*8) dripFX(P.x + rand(-1.1,1.1), water.position.y + .9, P.z + rand(-.6,.6), 1, .1);
  // girano la testa verso di te, uno alla volta
  dinner.userData.figs.forEach(o=>{ if (e.t > 4 + o.d){ const loc = new THREE.Vector3(); o.f.getWorldPosition(loc); let want = Math.atan2(camera.position.x - loc.x, camera.position.z - loc.z) - dinner.rotation.y; let d = want - o.f.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); o.f.rotation.y += d*Math.min(1, dt*.9); } });
  dinner.userData.flames.forEach((f,i)=>{ if (e.t > 5.5 + i*.7 && !f.visible && dn < .5){ f.visible = true; if (i === 0) whisperSfx(1.2,.15); } if (f.visible) flicker(f, 1 - dn*.6); });
  if (lookingAt(P, .95)) e.seen += dt;
  if (e.t > 7 && !e.s1){ e.s1 = 1; sub(`...si accomodi, signor Ferri. Le abbiamo tenuto il posto...`, 4.5); voiceSfx(.82); }
  if (e.t > 12 && !e.s2){ e.s2 = 1; sub(`...non abbiamo fretta. Abbiamo aspettato settant'anni. Aspettiamo anche lei...`, 5); voiceSfx(.82); }
  if (e.seen > 4 && !e.l){ e.l = 1; loseLuc(6, `la cena degli annegati`); }
  if (e.t > 17 && !e.txt){ e.txt = 1; toast(`Tornano giù senza alzarsi da tavola. Le candele restano accese, e le vedi scendere, sempre più piccole, nel nero.`, 'lore'); }
  if (e.t > 26){ dinner.visible = false; X_.dinner = null; } }

/* ---------- Don Aurelio ---------- */
const priest = (()=>{ const g = new THREE.Group(), t = 2.25; const cass = new THREE.MeshStandardMaterial({color:0x050506, roughness:.75, side:THREE.DoubleSide});
  g.add(mesh(figureGeo(t, .55), cass)); const robe = mesh(new THREE.CylinderGeometry(.13*t, .3*t, .62*t, 16, 1, true), cass, .01*t, .3*t, .02*t); g.add(robe);
  g.add(mesh(new THREE.TorusGeometry(.03*t, .006*t, 5, 14).rotateX(Math.PI/2), new THREE.MeshStandardMaterial({color:0xd8d4c8, roughness:.6}), .012*t, .785*t, .025*t));
  g.add(mesh(new THREE.BoxGeometry(.09*t,.025*t,.12*t), M.leather, -.1*t, .4*t, .1*t)); const lan = flameSprite(2.2); lan.position.set(.11*t, .26*t, .12*t); g.add(lan); g.userData.lan = lan;
  g.add(mesh(eyePairGeo, new THREE.MeshBasicMaterial({color:new THREE.Color(1.4,1.5,1.4)}), ...eyeAt(t, .55))); g.visible = false; scene.add(g); return g; })();
function evPriest(){ const p = spotAhead(9, 13, 2, .45); if (!p){ startEv('heads'); return; } priest.position.copy(p); priest.rotation.y = Math.atan2(camera.position.x - p.x, camera.position.z - p.z) + Math.PI*.6; priest.visible = true;
  X_.priest = { t:0, seen:0, turned:false, sink:0 }; X_.big = 24; bellSfx(2); setTimeout(()=>sub(`«...requiem aeternam dona Ei, Domine. Ma che dorma. Che dorma ancora...»`, 5), 1800); }
function priestUpdate(dt){ const e = X_.priest; if (!e) return; e.t += dt; const P = priest.position; P.y = water.position.y + bigWaveH(P.x, P.z) - e.sink; flicker(priest.userData.lan, clamp(1 - e.sink/14, 0, 1));
  if (Math.random() < dt*1.5) ripple(P.x, P.z, .3);
  if (lookingAt(new THREE.Vector3(P.x, P.y + 1.5, P.z), .975)) e.seen += dt;
  if (!e.turned && (e.seen > 2.2 || e.t > 9)){ e.turned = true; e.tt = e.t; heartSfx(.6); setTimeout(()=>{ sub(`«Figliolo. Rimettila. Rimetti l'acqua dove l'ho messa io.»`, 5); voiceSfx(.9); }, 1500); }
  if (e.turned) lookAtCam(priest, 1.2, dt);
  if (e.turned && e.t - e.tt > 7){ if (!e.down){ e.down = 1; surfaceSfx(.6); toast(`Don Aurelio Sesti. Annegato nel 1953, nella sua chiesa. Scende dritto, come in un ascensore, e la lanterna resta accesa mentre sparisce nel nero.`, 'lore'); loseLuc(5, `il prete`); } e.sink += dt*.9; }
  if (e.sink > 16 || e.t > 40){ priest.visible = false; X_.priest = null; } }

/* ---------- le teste: il paese affiora tutto intorno e ti parla ---------- */
const HEADS_N = 16;
const headGeoD = (()=>{ const h = new THREE.SphereGeometry(.16,14,10); h.scale(.9,1.15,1); const j = new THREE.SphereGeometry(.11,10,6); j.scale(1,.8,1); j.translate(0,-.1,.04); const n = new THREE.ConeGeometry(.025,.06,5); n.rotateX(Math.PI/2); n.translate(0,0,.16);
  const hair = new THREE.SphereGeometry(.172,12,8,0,Math.PI*2,0,Math.PI*.55); hair.translate(0,.02,-.015); return mergeGeometries([h,j,n,hair].map(q=>q.index ? q.toNonIndexed() : q)); })();
const drownedMat = new THREE.MeshStandardMaterial({color:0x7d8a80, roughness:.32, metalness:.02});
const headsM = new THREE.InstancedMesh(headGeoD, drownedMat, HEADS_N); headsM.count = 0; headsM.frustumCulled = false; scene.add(headsM);
const headEyes = new THREE.InstancedMesh(eyePairGeo, new THREE.MeshBasicMaterial({color:new THREE.Color(1.5,1.6,1.5)}), HEADS_N); headEyes.count = 0; headEyes.frustumCulled = false; scene.add(headEyes);
const HEAD_LINES = [`...abbiamo freddo...`,`...ci state svegliando, signor Ferri...`,`...eravamo a tavola. Siamo ancora a tavola...`,`...lasciaci l'acqua, Tobia...`,`...lo sentiamo respirare sotto di noi...`,`...mia figlia aveva sei anni. Ha ancora sei anni...`];
function evHeads(){ const L = []; for (let i=0;i<HEADS_N;i++){ const a = i/HEADS_N*Math.PI*2 + rand(-.12,.12), r = rand(3.2, 7.5), x = raftPos.x + Math.cos(a)*r, z = raftPos.z + Math.sin(a)*r; if (!wetSpot(x, z, .8)) continue; L.push({ x, z, d:rand(0,2.5), sink:0, gone:false }); }
  X_.heads = { t:0, L, li:0 }; X_.big = 16; whisperSfx(3,.22); }
const headO = new THREE.Object3D(), eyeOff = new THREE.Matrix4().makeTranslation(0,.02,.15);
function headsUpdate(dt){ const e = X_.heads; if (!e) return; e.t += dt; let c = 0; const wy = water.position.y;
  for (const h of e.L){ const up = smooth(h.d, h.d + 2, e.t), end = smooth(11, 13, e.t); if (h.gone) h.sink += dt*1.5;
    const y = wy - .75 + up*.62 - end*1.5 - h.sink + bigWaveH(h.x, h.z) + Math.sin(T*1.3 + h.d*5)*.02; if (y < wy - 1.2 && (h.gone || end > .5)) continue;
    if (up > .3 && !h.sp){ h.sp = 1; ripple(h.x, h.z, .6); emitDrop(h.x, wy, h.z, 0, 1, 0, .6, .8); }
    headO.position.set(h.x, y, h.z); headO.lookAt(camera.position.x, y + .1, camera.position.z); headO.updateMatrix();
    if (!h.gone && up > .8 && lookingAt(headO.position, .992)){ h.gone = true; ripple(h.x, h.z, .8); whisperSfx(.8,.1); }
    headsM.setMatrixAt(c, headO.matrix); headEyes.setMatrixAt(c, headO.matrix.clone().multiply(eyeOff)); c++; }
  headsM.count = headEyes.count = c; headsM.instanceMatrix.needsUpdate = headEyes.instanceMatrix.needsUpdate = true;
  if (e.t > 2.5 + e.li*2.6 && e.li < 4 && e.t < 11){ sub(HEAD_LINES[(S.headLine = ((S.headLine||0) + 1)) % HEAD_LINES.length], 2.8); voiceSfx(rand(.8,1.05)); e.li++; }
  if (e.t > 4 && !e.l){ e.l = 1; loseLuc(5, `le teste nell'acqua`); }
  if (e.t > 14){ headsM.count = headEyes.count = 0; X_.heads = null; } }

/* ---------- la schiena che non finisce ---------- */
const whale = (()=>{ const g = new THREE.Group(), N = 14, pts = []; for (let k=0;k<=N;k++) pts.push(V3(-85 + k*170/N, Math.sin(k*.7)*.6, Math.sin(k*.45)*3));
  const rs = []; for (let k=0;k<=8;k++){ const t = k/8; rs.push(1.5 + 4.2*Math.sin(Math.PI*Math.min(1, t*1.15))); } g.add(new THREE.Mesh(limb(pts, rs, 90, 16), creatureMat));
  for (let k=0;k<26;k++){ const x = -78 + k*6.2, c = mesh(new THREE.ConeGeometry(.6, 2.6 + Math.sin(k*.5)*1.2, 6), creatureMat, x, 4.6 + Math.sin(k*.35)*1.4, Math.sin((x+85)/170*N*.45)*3); c.rotation.z = -.55; g.add(c); }
  const spots = []; for (let k=0;k<50;k++){ const s = new THREE.SphereGeometry(.25,6,4); s.translate(-80 + k*3.2, 3.6 + Math.sin(k)*.5, (k%2 ? 1.6 : -1.6) + Math.sin((k*3.2+5)/170*N*.45)*3); spots.push(s); }
  g.visible = false; scene.add(g); return g; })();
function whaleOK(){ return shoreR(S.d) > 34 && waterY - H(0, raftPos.z - 40) > 12; }
function evWhale(){ camera.getWorldDirection(fwd); const a = Math.atan2(fwd.x, fwd.z), dist = Math.min(48, shoreR(S.d)*.55), P = new THREE.Vector3(raftPos.x + Math.sin(a)*dist, 0, raftPos.z + Math.cos(a)*dist);
  const dir = new THREE.Vector3(Math.cos(a), 0, -Math.sin(a)); X_.whale = { t:0, P, dir, start:P.clone().addScaledVector(dir, -95), wv:0 }; whale.rotation.y = Math.atan2(-dir.z, dir.x); whale.visible = true; X_.big = 26; }
function whaleUpdate(dt){ const e = X_.whale; if (!e) return; e.t += dt; const pos = e.start.clone().addScaledVector(e.dir, e.t*9); whale.position.set(pos.x, water.position.y - 3.9, pos.z);
  const head = pos.clone().addScaledVector(e.dir, 80); if (e.t > e.wv){ e.wv = e.t + 2.6; if (Math.hypot(head.x, head.z) < shoreR(S.d) - 4) makeWave(head.x, head.z, .9); }
  if (Math.random() < dt*10){ const s = rand(-80, 80), q = pos.clone().addScaledVector(e.dir, s); if (Math.hypot(q.x,q.z) < shoreR(S.d) - 2){ ripple(q.x, q.z, .9); if (Math.random() < .3) splashFX(q.x, water.position.y, q.z, .5, 1); } }
  if (e.t > 5 && !e.txt){ e.txt = 1; toast(`Una schiena passa davanti alla zattera. Continua a passare. Non finisce.`, 'cosmic'); creatureSfx({ kind:'call', far:.5, vol:.9 }); loseLuc(6, `la schiena che non finisce`); rumbleSfx(10,.5); }
  if (e.t > 22){ whale.visible = false; X_.whale = null; } }

/* ---------- sott'acqua: un'onda ti porta giù per tre secondi ---------- */
const dunkFigs = [0,1,2,3,4,5].map(()=>{ const f = mesh(FIG, ghoulMat); f.add(mesh(eyePairGeo, eyeGlowMat, ...eyeAt(2.3))); f.visible = false; scene.add(f); return f; });
function evDunk(){ makeWave(raftPos.x + rand(-6,6), raftPos.z - 14, 2.4); X_.dunk = { t:0 }; X_.big = 14; holdBucket = false;
  dunkFigs.forEach((f,i)=>{ const a = i/6*Math.PI*2 + rand(-.3,.3), r = rand(4, 8), x = raftPos.x + Math.cos(a)*r, z = raftPos.z + Math.sin(a)*r; f.position.set(x, Math.max(H(x,z), waterY - 9), z); f.rotation.set(-.5, Math.atan2(raftPos.x - x, raftPos.z - z), 0); f.visible = true; }); }
function dunkUpdate(dt){ const e = X_.dunk; if (!e){ R2.dunk = Math.max(0, R2.dunk - dt); return; } e.t += dt;
  R2.dunk = smooth(1.6, 2.1, e.t)*(1 - smooth(5.2, 6, e.t)); R2.dunkR = Math.sin(Math.min(1, e.t/2)*Math.PI)*.35*(1 - smooth(5,6,e.t));
  if (e.t > 1.9 && !e.in){ e.in = 1; splashSfx(1, 60); splashFX(camera.position.x, waterY, camera.position.z, 1.2, 1); pitchT = -.15; }
  if (e.in && R2.dunk > .5 && Math.random() < dt*30) emitDrop(camera.position.x + rand(-1,1), camera.position.y - rand(0,1.5), camera.position.z + rand(-1.5,0), 0, rand(.8,2), 0, .6, rand(.8,1.6));
  if (e.t > 5.6 && !e.out){ e.out = 1; breathSfx(true, 1.2, .5); postMat.uniforms.uWet.value = 1; dunkFigs.forEach(f=>f.visible = false); loseLuc(8, `sei finito sott'acqua`);
    setTimeout(()=>toast(`Sei finito sotto, per tre secondi. Laggiù, sul fondo, erano in piedi. Tutti. Guardavano in su.`, 'warn'), 800); }
  if (e.t > 6.5) X_.dunk = null; }

const NEWEV = { abyss:evAbyss, horizon:evHorizon, pupil:evPupil, darkness:evDarkness, dinner:evDinner, priest:evPriest, heads:evHeads, whaleback:evWhale, dunk:evDunk };
function regiaUpdate(dt){
  if (!uiBusy() && !VIG.cur) VIG.next -= dt*PACE.vig;
  if (VIG.next <= 0 && (X_.big <= 0 || VIG.next < -7) && tensionT <= 0 && !uiBusy()){ VIG.next = [rand(12,18), rand(9,14), rand(8,13), rand(7,12), rand(6,11)][actOf(S.d)]; startVignette(); }
  vignetteUpdate(dt); driftUpdate(dt); abyssUpdate(dt); giantUpdate(dt); pupilUpdate(dt); darkUpdate(dt); dinnerUpdate(dt); priestUpdate(dt); headsUpdate(dt); whaleUpdate(dt); dunkUpdate(dt);
  if (R2.still > 0){ R2.still -= dt; waterU.uCalm.value = 0; if (R2.still <= 0){ splashFX(raftPos.x + rand(-1,1), waterY, raftPos.z - 2.2, .5, .4); ripple(raftPos.x, raftPos.z - 2.2, 1.5); } } }
// i colpi sotto la zattera si vedono: il legno sobbalza, l'acqua schizza tra le assi
function knockFX(v=1){ raftJolt = Math.max(raftJolt, .25*v); for (let k=0;k<5;k++) emitDrop(raftPos.x + rand(-1.3,1.3), waterY + .3 + raftHeave, raftPos.z + rand(-1.5,1.5), 0, rand(.8,1.8)*v, 0, .8, .7); ripple(raftPos.x + rand(-1.8,1.8), raftPos.z + rand(-2,2), .4*v); }
function hideRegia(){ X_.pass = null; X_.endless = null; R2.drag = null; R2.yank = null; deckWater.visible = false; reach.visible = false; armJ.visible = false; X_.reach = X_.moon = X_.gaze = X_.grip = null; R2.zoom = 0; R2.trem = 0; [whale, giant, priest, dinner, ridge, hairMass, shoreLamp, jumper, armJ, ...dunkFigs, ...Object.values(DRIFT)].forEach(o=>o.visible = false); headsM.count = headEyes.count = 0;
  X_.whale = X_.giant = X_.priest = X_.dinner = X_.heads = X_.dunk = X_.pupil = X_.abyss = X_.dark = null; DR.o = null; VIG.cur = null; R2.darkK = 0; R2.dunk = 0; waterU.uClear.value = 0; MURK.uMurkK.value = .12; }

/* =====================================================================
   REGIA 3: la voce di Lui, lo sguardo del Guardiano, la luna, la mano, la presa
   ===================================================================== */
// il richiamo dal fondo: arriva da lontano, e il lago intero vibra come la pelle di un tamburo
R2.callT = 95; R2.trem = 0; R2.zoom = 0; R2.gazeEyes = 0;
function farCall(far=.8){ think('call', 7); const pan = rand(-.7,.7); creatureSfx({ kind:'call', far, vol:.9, pan }); R2.trem = 8; R2.tremK = 1 - far*.5;
  setTimeout(()=>{ shakeAmt = Math.max(shakeAmt, .22*R2.tremK); creakSfx(); }, 1800);
  if (!S.tipCall){ S.tipCall = 1; setTimeout(()=>toast(`Dal fondo è salito un suono. Non era un animale. Il lago ha vibrato tutto insieme, come la pelle di un tamburo.`, 'cosmic'), 3500); }
  else if (Math.random() < .5) setTimeout(()=>sub(pick([`(Lui, dal fondo. Più forte dell'ultima volta)`,`(il suono arriva dai piedi prima che dalle orecchie)`,`(l'acqua si increspa a cerchi, dappertutto, nello stesso istante)`]), 4), 2500); }
function tremUpdate(dt){ if (R2.trem <= 0) return; R2.trem -= dt; const k = Math.sin(Math.PI*clamp(1 - R2.trem/8, 0, 1))*R2.tremK;
  camera.getWorldDirection(fwd); for (let i=0;i<Math.round(dt*26*k);i++){ const a = Math.atan2(fwd.x, fwd.z) + rand(-1,1), r = rand(2, 28), x = raftPos.x + Math.sin(a)*r, z = raftPos.z + Math.cos(a)*r; if (wetSpot(x, z, .3)) ripple(x, z, .25 + k*.3); }
  for (let i=0;i<Math.round(dt*70*k);i++) emitDrop(raftPos.x + rand(-5,5), water.position.y, raftPos.z - rand(1,8), 0, rand(.4,1.1)*k, 0, .5, rand(.4,.8));
  if (raft.userData.lantern) raft.userData.lantern.rotation.z += Math.sin(T*9)*.02*k; }

/* ---------- lo sguardo del Guardiano: i sette occhi si accendono, e la visuale gli va addosso ---------- */
const gazeP = new THREE.Vector3();
R2.faceK = 0; const COL_FACE_P = new THREE.Vector3(0, 24.7, 10.4), COL_ORB_P = new THREE.Vector3();
function gazeOK(){ colHead.getWorldPosition(gazeP); return gazeP.y > waterY + 4 && gazeP.distanceTo(camera.position) < 140; }
function evGaze(){ colHead.getWorldPosition(gazeP); gazeP.y += 2.5*COL_S; X_.gaze = { t:0 }; X_.big = 16; attend(gazeP, 1.2, 5.5); rumbleSfx(9,.55); heartSfx(.6);
  creatureSfx({ kind:'roar', far:.3, vol:1, delay:2.4 }); setTimeout(()=>heartSfx(.8), 1800); }
function gazeUpdate(dt){ const e = X_.gaze; if (!e){ R2.zoom = Math.max(0, R2.zoom - dt*.5); R2.gazeEyes = 0; return; } e.t += dt; const t = e.t;
  R2.zoom = smooth(.6, 3.8, t)*(1 - smooth(9.5, 12, t))*.74; R2.gazeEyes = t < 10 ? clamp(Math.floor((t - 1.3)/.32), 0, 7) : clamp(7 - Math.floor((t - 10)/.25), 0, 7);
  R2.faceK = smooth(1.3, 3.5, t)*(1 - smooth(9.5, 12, t));
  if (t < 11){ colHead.getWorldPosition(gazeP); const want = clamp(Math.atan2(camera.position.x - gazeP.x, camera.position.z - gazeP.z) - colossus.rotation.y, -1.1, 1.1); colHead.rotation.y += (want - colHead.rotation.y)*Math.min(1, dt*.9); }
  if (t > 2.4 && !e.s){ e.s = 1; shakeAmt = Math.max(shakeAmt, .55); makeWave(COL_X, COL_Z, 1.2); for (let k=0;k<6;k++) setTimeout(()=>{ const a = rand(0,6.3); splashFX(COL_X + Math.cos(a)*14, waterY, COL_Z + Math.sin(a)*14, 1.4, 1.4); }, k*260); }
  if (t > 4.2 && !e.txt){ e.txt = 1; toast(`Il Guardiano ha aperto gli occhi. Tutti e sette. Non guardano la zattera: guardano te.`, 'warn'); loseLuc(8, `lo sguardo del Guardiano`); }
  if (t > 12.5){ X_.gaze = null; } }

/* ---------- la luna si apre ---------- */
function evMoon(){ X_.moon = { t:0 }; X_.big = 16; const M = skyU.uMoon.value; attend(camera.position.clone().addScaledVector(M, 200), .8, 4); creatureSfx({ kind:'breath', far:.6, vol:.8, delay:1 }); }
function moonUpdate(dt){ const e = X_.moon; if (!e){ skyU.uMoonEye.value = Math.max(0, skyU.uMoonEye.value - dt*.3); return; } e.t += dt;
  skyU.uMoonEye.value = smooth(.5, 5, e.t)*(1 - smooth(11, 14, e.t));
  if (e.t > 5.2 && !e.txt){ e.txt = 1; toast(`La luna è diventata più grande. Poi si è aperta. Non è mai stata la luna.`, 'cosmic'); loseLuc(6, `la luna`); heartSfx(.8); }
  if (e.t > 14.5) X_.moon = null; }

/* ---------- la mano: oltre la nebbia, qualcosa si aggrappa al bordo della valle ---------- */
const reach = (()=>{ const m = new THREE.MeshBasicMaterial({ color:0x020303, transparent:true, opacity:.9, fog:false, depthWrite:true }); m.userData.murk = true;
  // una mano vera: dorso largo, nocche, quattro dita grosse a tre falangi che si piegano ad artiglio, il pollice di lato, l'avambraccio che sparisce nella nebbia
  const P = [], fing = (x0, len, r, spread)=>{ const pts = [V3(x0, .14, 0)]; let y = .14, z = 0, a = 0; for (let k=1;k<=3;k++){ a += .55; const L = len*(k===1 ? .45 : k===2 ? .32 : .23); y += Math.cos(a)*L; z += Math.sin(a)*L; pts.push(V3(x0 + spread*k*.012, y, z)); }
    P.push(limb(pts, [r*1.15, r*1.05, r*.95, r*.8, r*.55], 24, 10)); for (let k=1;k<3;k++) P.push(ell(pts[k].x, pts[k].y, pts[k].z, r*1.2, r*1.1, r*1.2, 0,0,0, 10)); };
  P.push(ell(0,.075,0, .085,.085,.03, 0,0,0, 20)); P.push(ell(0,.13,.0, .08,.03,.026, 0,0,0, 16));
  fing(-.058, .2, .015, -1); fing(-.02, .24, .017, -.3); fing(.02, .23, .017, .3); fing(.057, .18, .014, 1);
  P.push(limb([V3(-.08,.05,.01), V3(-.12,.1,.04), V3(-.13,.15,.08), V3(-.115,.19,.11)], [.02,.018,.015,.011], 14, 8));
  P.push(limb([V3(0,.02,0), V3(.005,-.3,-.02), V3(.02,-.9,-.08)], [.05,.055,.065], 16, 12));
  const hg = mergeGeometries(P.map(q=>{ const n = q.index ? q.toNonIndexed() : q; for (const k of Object.keys(n.attributes)) if (k !== 'position' && k !== 'normal') n.deleteAttribute(k); return n; }));
  const h = new THREE.Mesh(hg, m); h.scale.setScalar(270); h.visible = false; scene.add(h); return h; })();
function evReach(){ camera.getWorldDirection(fwd); const a = Math.atan2(fwd.z, fwd.x) + rand(-.35,.35), r = 150, x = Math.cos(a)*r, z = Math.sin(a)*r;
  X_.reach = { t:0, x, z, y0:H(x,z) }; reach.position.set(x, X_.reach.y0 - 280, z); reach.rotation.set(0, Math.atan2(-x, -z), 0); reach.visible = true; X_.big = 20;
  rumbleSfx(11,.65); creatureSfx({ kind:'call', far:.85, vol:.9, delay:1.5 }); const y0 = X_.reach.y0; setTimeout(()=>{ if (X_.reach) attend(new THREE.Vector3(x, y0 + 60, z), .6, 3); }, 2500); }
function reachUpdate(dt){ const e = X_.reach; if (!e) return; e.t += dt; const up = smooth(1, 8, e.t)*(1 - smooth(14, 19, e.t)); const grab = smooth(5, 9, e.t)*(1 - smooth(13, 16, e.t)); reach.position.y = e.y0 - 280 + up*262; reach.rotation.x = .05 + grab*1.05;
  shakeAmt = Math.max(shakeAmt, up*.18); scene.fog.density += .012*up;
  if (up > .5 && Math.random() < dt*3){ const a = Math.atan2(e.z, e.x) + rand(-.12,.12), r = shoreR(S.d) - .5; splashFX(Math.cos(a)*r, waterY, Math.sin(a)*r, 1.6, 1.6); if (Math.random() < .3) bigSplash(Math.cos(a)*r, Math.sin(a)*r, .8); }
  if (e.t > 6.5 && !e.fl){ e.fl = 1; lightning(true); }
  if (e.t > 8 && !e.txt){ e.txt = 1; toast(`Oltre la nebbia, una mano si è aggrappata al bordo della valle. Le dita da sole erano più alte del campanile. Poi ha lasciato la presa.`, 'cosmic'); loseLuc(8, `la mano oltre la nebbia`); }
  if (e.t > 19.5){ reach.visible = false; X_.reach = null; } }

/* ---------- la presa: qualcosa afferra il secchio, e devi strapparglielo ---------- */
function startGrip(){ X_.grip = { t:0, p:.45 }; armJ.visible = true; $('bucketBtn').classList.add('grip'); $('bucketSub').textContent = 'TIRA!'; heartSfx(.7); slitherSfx(.4); shakeAmt = Math.max(shakeAmt, .3);
  if (!S.tipGrip){ S.tipGrip = 1; toast(`Qualcosa ha afferrato il secchio sott'acqua. Tocca SECCHIO più in fretta che puoi per strapparglielo.`, 'warn'); } }
function gripTap(){ const g = X_.grip; if (!g) return false; g.p += .12; g.tap = 1; creakSfx(); shakeAmt = Math.max(shakeAmt, .18); pitchT += .02; return true; }
const gripDir = new THREE.Vector3(), gripTo = new THREE.Vector3();
function gripPose(){ const g = X_.grip, wy = water.position.y, pull = clamp(1 - g.p, 0, 1);
  gripDir.set(B.target.x - raftPos.x, 0, B.target.z - raftPos.z).normalize();
  // più la cosa vince, più il secchio è lontano e sotto; ogni tuo tocco lo strappa indietro
  bucket.position.copy(B.target).addScaledVector(gripDir, pull*1.4 - g.tap*.35); bucket.position.y = wy - .1 - pull*.42 - g.yank*.4 + g.tap*.25 + Math.sin(T*9)*.03;
  bucket.rotation.set(-.35 - pull*.5 - g.yank*.35 + g.tap*.3, Math.atan2(gripDir.x, gripDir.z), Math.sin(T*13)*.18*(.4 + pull));
  // la mano: dal lato lontano, le dita piegate sul bordo verso di te
  gripTo.copy(bucket.position).addScaledVector(gripDir, .2); armJ.position.set(gripTo.x, Math.max(gripTo.y - .3, wy - .42), gripTo.z); armJ.scale.setScalar(1.35);
  armJ.rotation.set(.55 + g.yank*.3, Math.atan2(-gripDir.x, -gripDir.z), Math.sin(T*7)*.06);
  // l'acqua ribolle dove lottate
  if (Math.random() < .5) emitDrop(bucket.position.x + rand(-.4,.4), wy, bucket.position.z + rand(-.4,.4), rand(-.4,.4), rand(.6,1.6)*(.5 + g.yank), rand(-.4,.4), .8, rand(.7,1.4));
  if (Math.random() < .12) ripple(bucket.position.x + rand(-.3,.3), bucket.position.z + rand(-.3,.3), .5 + g.yank*.6);
  if (g.yank > .95) splashFX(bucket.position.x, wy, bucket.position.z, .7, .6); if (g.tap > .95) splashFX(bucket.position.x, wy, bucket.position.z, .45, .4); }
function gripUpdate(dt){ const g = X_.grip; if (!g) return; g.t += dt; g.p -= dt*(.13 + phase*.02);
  // la cosa tira a strattoni: ogni strattone ruba un po' di corda e trascina il secchio più giù
  g.yank = Math.max(0, (g.yank || 0) - dt*2.2); g.tap = Math.max(0, (g.tap || 0) - dt*4);
  if (Math.random() < dt*1.3 && g.t > .4){ g.yank = 1; g.p -= .05; shakeAmt = Math.max(shakeAmt, .4); pitchT -= .05; slitherSfx(.35); knockSfx(.4, 0); }
  $('bucketRing').style.setProperty('--p', Math.round(clamp(g.p,0,1)*100));
  const end = (win)=>{ X_.grip = null; $('bucketBtn').classList.remove('grip'); bucket.rotation.x = 0; splashFX(armJ.position.x, water.position.y, armJ.position.z, win ? .8 : 1.3, .7); ripple(armJ.position.x, armJ.position.z, 1.2);
    setTimeout(()=>{ armJ.visible = false; }, win ? 200 : 500);
    if (win){ B.relic = true; bucket.rotation.set(0,0,0); gainLuc(3, `gliel'hai strappato`); toast(`Hai strappato il secchio a qualcosa. Sul bordo restano tre unghie conficcate nel metallo.`, 'find'); }
    else { B.lost = true; stingerSfx(); loseLuc(6, `ti ha preso il secchio`); shakeAmt = .8; toast(`La corda ti scorre tra le mani. Quando il secchio torna su è vuoto, piegato, con l'impronta di una mano tutto intorno.`, 'warn'); } };
  if (g.p >= 1) end(true); else if (g.p <= 0 || g.t > 7) end(false); }

function regia3Update(dt){ if (!uiBusy() && S.d >= 6 && !ending){ R2.callT -= dt*PACE.call; if (R2.callT <= 0 && X_.big <= 0 && tensionT <= 0){ R2.callT = rand(60, 110)/(1 + phase*.15); farCall(clamp(1 - S.d/MAXD, .25, .95)); } }
  tremUpdate(dt); gazeUpdate(dt); moonUpdate(dt); reachUpdate(dt); }
Object.assign(NEWEV, { gaze:evGaze, moon:evMoon, reach:evReach, grip:()=>{ X_.gripNext = true; }, call:()=>farCall(.5) });

/* =====================================================================
   MACCHINE: lavorano da sole, e si vedono lavorare
   ===================================================================== */
const NORIA = [{n:``, r:0, c:0}, {n:`Ruota a secchi`, r:6, c:450}, {n:`Ruota a secchi grande`, r:45, c:6000}, {n:`Noria a vapore`, r:380, c:80000}, {n:`La ruota che gira da sola`, r:3200, c:1.1e6, org:true}];
const CRANES = [{n:``, L:0, iv:0, c:0}, {n:`Gru a benna sulla zattera`, L:400, iv:10, c:3500}, {n:`Gru a doppia benna`, L:3500, iv:8, c:45000}, {n:`Gru a vapore`, L:30000, iv:6, c:600000}];
const FLOODS = [{n:``, c:0}, {n:`Fari da cantiere`, c:1500}, {n:`Fari al carburo`, c:22000}];
const noriaRate = () => NORIA[S.noria||0].r;
let machineShow = null;
// la ruota: sul fianco sinistro, mezza nell'acqua, otto secchi che salgono pieni e si svuotano in una canaletta
const noriaBk = new THREE.MeshStandardMaterial({color:0x4a2416, roughness:.8, metalness:.3, side:THREE.DoubleSide});
const noria = (()=>{ const g = new THREE.Group(), w = new THREE.Group(); g.position.set(-1.95, .42, -.2); g.add(w);
  w.add(mesh(new THREE.TorusGeometry(.95,.035,6,32).rotateY(Math.PI/2), M.woodDark)); w.add(mesh(new THREE.TorusGeometry(.6,.03,6,24).rotateY(Math.PI/2), M.woodDark));
  for (let k=0;k<8;k++){ const a = k/8*Math.PI*2; const sp = mesh(new THREE.BoxGeometry(.04,1.9,.05), M.wood); sp.rotation.x = a; w.add(sp);
    w.add(mesh(new THREE.CylinderGeometry(.11,.08,.2,8,1,true), noriaBk, 0, Math.cos(a)*1.0, Math.sin(a)*1.0)); }
  g.add(mesh(new THREE.CylinderGeometry(.06,.06,.55,8).rotateZ(Math.PI/2), M.metal, .2,0,0)); g.add(mesh(new THREE.BoxGeometry(.08,1.1,.08), M.woodDark, .3,.2,.5)); g.add(mesh(new THREE.BoxGeometry(.08,1.1,.08), M.woodDark, .3,.2,-.5));
  const tr = mesh(new THREE.BoxGeometry(.7,.06,.22), M.wood, .45,.95,.35); tr.rotation.z = -.25; g.add(tr); g.userData.w = w; g.visible = false; raft.add(g); return g; })();
// la gru: un albero di carico nell'angolo, il braccio esce sull'acqua e cala la benna
const crane = (()=>{ const g = new THREE.Group(); g.position.set(1.3, .36, .35); g.add(mesh(new THREE.CylinderGeometry(.07,.1,3.1,8), M.rust, 0,1.55,0));
  for (const a of [0, 2.1, 4.2]){ const st = mesh(new THREE.CylinderGeometry(.025,.03,1.7,5), M.rust, Math.cos(a)*.35, .75, Math.sin(a)*.35); st.rotation.set(Math.sin(a)*.22, 0, -Math.cos(a)*.22); g.add(st); }
  const boom = new THREE.Group(); boom.position.y = 2.9; g.add(boom); const arm = mesh(new THREE.BoxGeometry(.09,.09,3.4), M.rust, 0,0,-1.7); arm.rotation.x = -.18; boom.add(arm);
  const tip = new THREE.Object3D(); tip.position.set(0,.6,-3.35); boom.add(tip);
  const grab = new THREE.Group(); grab.add(mesh(new THREE.CylinderGeometry(.32,.18,.4,10,1,true), M.rust)); grab.children[0].material = grab.children[0].material.clone(); grab.children[0].material.side = THREE.DoubleSide;
  grab.add(mesh(new THREE.TorusGeometry(.32,.03,5,16).rotateX(Math.PI/2), M.metal, 0,.2,0)); grab.add(mesh(new THREE.CircleGeometry(.29,12).rotateX(-Math.PI/2), new THREE.MeshStandardMaterial({color:0x050807, roughness:.1}), 0,.12,0)); scene.add(grab);
  const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6),3)); const cable = new THREE.Line(cg, new THREE.LineBasicMaterial({color:0x2a2622})); cable.frustumCulled = false; scene.add(cable);
  g.userData = { boom, tip, grab, cable, t:-1, cd:4 }; g.visible = false; grab.visible = cable.visible = false; raft.add(g); return g; })();
// i fari: due pali sulla prua, luce fredda che taglia la nebbia
const flood = (()=>{ const g = new THREE.Group(), beamMat = new THREE.MeshBasicMaterial({color:new THREE.Color(.5,.55,.58), transparent:true, opacity:.07, blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.DoubleSide}); beamMat.userData.murk = true;
  const headMat = new THREE.MeshStandardMaterial({color:0x111111, emissive:0xdfe8ff, emissiveIntensity:0}); const heads = [];
  for (const x of [-1.3, 1.3]){ g.add(mesh(new THREE.CylinderGeometry(.03,.04,2.4,6), M.metal, x,1.5,-1.55)); const h = mesh(new THREE.CylinderGeometry(.12,.09,.18,10).rotateX(Math.PI/2), headMat, x,2.7,-1.6); h.rotation.x = .5; g.add(h);
    const b = mesh(new THREE.ConeGeometry(2.2, 9, 16, 1, true).translate(0,-4.5,0).rotateX(Math.PI/2 + .5), beamMat, x, 2.7, -1.6); b.rotation.y = -x*.06; g.add(b); heads.push(h); }
  const L = new THREE.Object3D(); L.position.set(0, 2.4, -4.5); g.add(L); g.userData = { L, headMat, beamMat }; g.visible = false; raft.add(g); return g; })();
function layoutMachines(){ $('floodBtn').classList.toggle('hidden', !S.flood); $('floodBtn').classList.toggle('off', S.floodOn === false); noria.visible = (S.noria||0) > 0; noria.scale.setScalar(1 + Math.max(0,(S.noria||0)-1)*.12); crane.visible = (S.crane||0) > 0; flood.visible = (S.flood||0) > 0;
  noriaBk.color.setHex(S.noria >= 4 ? 0x5a2522 : 0x4a2416); noriaBk.emissive.setHex(S.noria >= 4 ? 0x200404 : 0x000000); }
const cTip = new THREE.Vector3(), cTmp = new THREE.Vector3();
function machinesUpdate(dt){
  const nl = S.noria||0; if (nl){ const w = noria.userData.w; w.rotation.x -= dt*(.5 + nl*.25); noria.getWorldPosition(cTmp); if (Math.random() < dt*(6 + nl*4)) emitDrop(cTmp.x + rand(-.05,.05), cTmp.y + rand(.4,.9), cTmp.z + rand(-.6,.6), rand(-.2,.2), rand(-.5,0), 0, 1.2, rand(.6,1.1));
    if (Math.random() < dt*2) ripple(cTmp.x, cTmp.z, .3); }
  const cl = S.crane||0, u = crane.userData; if (cl && !ending){ const C = CRANES[cl];
    if (u.t < 0){ u.cd -= dt; if (u.cd <= 0 && (S.contract || S.tank < tankCap())){ u.t = 0; } }
    const P = C.iv*.8, t = u.t < 0 ? 0 : u.t/P; if (u.t >= 0) u.t += dt;
    const swing = smooth(0,.2,t)*(1 - smooth(.75,.95,t)); u.boom.rotation.y = swing*-1.25; u.tip.getWorldPosition(cTip);
    const drop = smooth(.22,.4,t)*(1 - smooth(.5,.72,t)), wy = water.position.y + bigWaveH(cTip.x, cTip.z); const low = Math.max(.6, cTip.y - wy + .15);
    u.grab.position.set(cTip.x, cTip.y - lerp(.6, low, drop), cTip.z); u.grab.visible = u.cable.visible = true;
    if (t > .38 && !u.sp){ u.sp = 1; splashFX(cTip.x, wy, cTip.z, .9, .7); splashSfx(5, 25); }
    if (t > .5 && t < .72 && Math.random() < dt*25) emitDrop(u.grab.position.x + rand(-.25,.25), u.grab.position.y - .2, u.grab.position.z + rand(-.25,.25), 0, -.5, 0, 1.4, rand(.8,1.4));
    if (t > .97 && !u.dump){ u.dump = 1; crane.getWorldPosition(cTmp); splashFX(cTmp.x - .3, cTmp.y + .3, cTmp.z - .4, .5, .4); addLiters(C.L*(BUCKETS[S.bucket].s >= 25 ? 1.5 : 1)); creakSfx(); }
    if (t >= 1){ u.t = -1; u.cd = C.iv*.2; u.sp = u.dump = 0; }
    const a = u.cable.geometry.attributes.position; a.setXYZ(0, cTip.x, cTip.y, cTip.z); a.setXYZ(1, u.grab.position.x, u.grab.position.y + .25, u.grab.position.z); a.needsUpdate = true; }
  else { u.grab.visible = u.cable.visible = false; }
  const fl = S.flood||0; if (fl){ const on = S.floodOn === false ? 0 : blackT <= 0 && !X_.dark && lampOverride <= 0 ? 1 : (Math.random() < .1 ? .4 : 0), k = on*(.85 + .15*Math.sin(T*31)*(phase >= 3 ? 1 : .1));
    if (!X_.dock){ flood.userData.L.getWorldPosition(dockLight.position); dockLight.color.setHex(0xdfe8ff); dockLight.distance = 28; dockLight.intensity = k*(14 + fl*10); } flood.userData.headMat.emissiveIntensity = k*4*(1 - dayF*.7); flood.userData.beamMat.opacity = k*.05*(1 - dayF*.7); } else if (!X_.dock) dockLight.intensity = 0; }

/* =====================================================================
   IL PROFONDO: l'ecoscandaglio, le luci da spegnere, le perdite che restano
   ===================================================================== */
const lit = () => !!S.torchOn || (!!S.flood && S.floodOn !== false);
const hullK = () => .55 + .45*clamp(S.hull ?? 100, 0, 100)/100;
// ---------- lo scafo: quando è rotto la zattera sta più bassa e l'acqua entra tra le assi ----------
const deckWater = (()=>{ const m = new THREE.MeshStandardMaterial({ color:0x0b1512, roughness:.06, metalness:.1, transparent:true, opacity:0, depthWrite:false }); m.userData.murk = true;
  const p = mesh(new THREE.PlaneGeometry(2.9, 3.3, 1, 1).rotateX(-Math.PI/2), m, 0, .365, 0); p.renderOrder = 3; p.visible = false; raft.add(p); return p; })();
function hullDamage(n, why){ const before = S.hull ?? 100; S.hull = clamp(before - n, 5, 100); raftJolt = Math.max(raftJolt, .6); creakSfx(); setTimeout(creakSfx, 300);
  for (let k=0;k<14;k++) emitDrop(raftPos.x + rand(-1.3,1.3), waterY + .35, raftPos.z + rand(-1.6,1.6), rand(-.3,.3), rand(1.5,3), rand(-.3,.3), 1, rand(.8,1.5));
  if (before >= 70 && S.hull < 70) setTimeout(()=>toast(`La zattera imbarca acqua. Le assi sono spaccate, l'acqua ti arriva alle caviglie. Rendi meno finché non la ripari in officina.`, 'warn'), 1200);
  else if (why) setTimeout(()=>toast(why, 'warn'), 800); }
function hullUpdate(dt){ const h = S.hull ?? 100, k = 1 - h/100; deckWater.visible = k > .02; deckWater.material.opacity = Math.min(.85, k*1.4); deckWater.position.y = .36 + k*.05 + Math.sin(T*1.7)*.008;
  if (k > .25 && Math.random() < dt*k*12) emitDrop(raftPos.x + rand(-1.3,1.3), raft.position.y + .37, raftPos.z + rand(-1.5,1.5), 0, rand(.3,.9), 0, .6, rand(.5,.9));
  if (k > .3 && Math.random() < dt*.15) dripSfx(.1); }

// ---------- i garzoni: le sedie restano ----------
const stoolMat = new THREE.MeshStandardMaterial({ color:0x2c2118, roughness:.85 });
const stools = helperFigs.map(g=>{ const s = new THREE.Group(); s.add(mesh(new THREE.CylinderGeometry(.17,.17,.04,10), stoolMat, 0,.42,0)); for (let k=0;k<3;k++){ const a = k/3*Math.PI*2; s.add(mesh(new THREE.CylinderGeometry(.018,.022,.42,5), stoolMat, Math.cos(a)*.12,.21,Math.sin(a)*.12)); }
  s.position.set(g.position.x*.82, .36, g.position.z); s.visible = false; raft.add(s); return s; });
const wetStoolMat = new THREE.MeshStandardMaterial({ color:0x15110d, roughness:.08, metalness:.15 });
function stoolsLayout(){ const k = HELPERS[S.helper||0].k; stools.forEach((s,i)=>{ const wet = R2.wetStool === i; s.visible = i < k || wet; s.traverse(o=>{ if (o.isMesh) o.material = wet ? wetStoolMat : stoolMat; }); }); }
function helperLost(i, seen){ const k = HELPERS[S.helper||0].k; if (!k) return; const g = helperFigs[Math.min(i, k-1)]; const idx = helperFigs.indexOf(g);
  if (seen){ R2.yank = { g, t:0, idx }; slitherSfx(.6); stingerSfx(); }
  else { g.visible = false; S.helper = k >= 3 ? 3 : k === 2 ? 2 : 0; S.wetChair = idx; layoutHelpers(); } }
function yankUpdate(dt){ const y = R2.yank; if (!y) return; y.t += dt; const g = y.g, side = g.userData.side;
  g.rotation.z = -side*Math.min(1.5, y.t*2.2); g.position.x += side*dt*1.6; g.position.y -= dt*Math.max(0, y.t - .3)*3;
  if (y.t > .35 && !y.sp){ y.sp = 1; g.getWorldPosition(tmpV); bigSplash(tmpV.x, tmpV.z, .7); }
  if (y.t > 1.4){ R2.yank = null; g.position.set(g.position.x - side*1.6*1.4, .36, g.position.z); g.rotation.z = 0; const k = HELPERS[S.helper||0].k; S.helper = k >= 3 ? 3 : k === 2 ? 2 : 0; S.wetChair = y.idx; layoutHelpers(); stoolsLayout();
    toast(`Il garzone è stato tirato giù. Non ha gridato. Lo sgabello è rimasto al suo posto.`, 'warn'); } }
function dawnCheck(){ const day = dayF >= .5; if (day && R2.wasNight && S.wetChair !== undefined && S.wetChair !== null && S.wetChair !== false){ R2.wetStool = S.wetChair; S.wetChair = null; R2.wetT = 200; stoolsLayout();
    for (let k=0;k<6;k++) setTimeout(()=>{ const s = stools[R2.wetStool]; if (!s) return; s.getWorldPosition(tmpV); dripFX(tmpV.x, tmpV.y + .4, tmpV.z, 3, .12); }, k*500);
    setTimeout(()=>toast(`All'alba manca un garzone. Nessuno l'ha visto andare via. Il suo sgabello è fradicio, come se ci fosse rimasto seduto qualcuno uscito dal lago.`, 'warn'), 1500); }
  R2.wasNight = !day; if (R2.wetT > 0){ R2.wetT -= .1; if (R2.wetT <= 0){ R2.wetStool = null; stoolsLayout(); } } }

// ---------- le macchine trascinate sotto ----------
const MACH_OBJ = { noria:()=>noria, crane:()=>crane, flood:()=>flood };
const MACH_TXT = { noria:`La ruota a secchi è stata strappata via dal fianco della zattera. Sott'acqua, per un po', l'hai vista continuare a girare.`,
  crane:`Qualcosa ha preso la benna e ha tirato. La gru si è piegata ed è finita in acqua, con tutto il braccio.`, flood:`I fari si sono piegati verso l'acqua, uno dopo l'altro, come se qualcuno li tirasse per la luce. Li hai visti scendere ancora accesi.` };
function dragMachine(kind){ const o = MACH_OBJ[kind](); R2.drag = { kind, o, t:0, p0:o.position.clone(), r0:o.rotation.clone() }; slitherSfx(.7); creatureSfx({ kind:'roar', far:.15, vol:.9 }); shakeAmt = Math.max(shakeAmt, .7); }
function dragUpdate(dt){ const d = R2.drag; if (!d) return; d.t += dt; const o = d.o, k = smooth(.2, 3, d.t);
  o.rotation.z = d.r0.z + (d.kind === 'noria' ? -1 : 1)*k*1.2; o.position.y = d.p0.y - k*k*5; o.position.x = d.p0.x + (d.kind === 'noria' ? -1 : 1)*k*1.5;
  if (d.kind === 'crane'){ crane.userData.grab.visible = crane.userData.cable.visible = false; }
  if (d.t > .5 && !d.sp){ d.sp = 1; o.getWorldPosition(tmpV); bigSplash(tmpV.x, tmpV.z, 1.1); raftJolt = 1; }
  if (Math.random() < dt*10) { o.getWorldPosition(tmpV); emitDrop(tmpV.x + rand(-1,1), waterY, tmpV.z + rand(-1,1), 0, rand(.5,1.5), 0, .8, 1); }
  if (d.t > 4){ R2.drag = null; o.position.copy(d.p0); o.rotation.copy(d.r0); S[d.kind] = 0; layoutMachines(); toast(MACH_TXT[d.kind], 'warn'); if ($('floodBtn')) $('floodBtn').classList.toggle('hidden', !S.flood); } }
// quando lasci una luce accesa: qualcosa si prende una cosa tua
function consequence(){ const o = []; if (HELPERS[S.helper||0].k > 0 && !R2.yank) o.push('helper','helper'); if (S.noria) o.push('noria'); if (S.crane) o.push('crane'); if (S.flood) o.push('flood'); o.push('hull');
  const c = pick(o); if (c === 'helper') helperLost(Math.floor(Math.random()*HELPERS[S.helper].k), true); else if (c === 'hull') hullDamage(28, `Qualcosa ha morso la zattera da sotto. Le assi sono spaccate a metà.`); else dragMachine(c); loseLuc(10, `hai lasciato la luce accesa`); }

// ---------- l'ecoscandaglio ----------
const sonarCv = $('sonar'), sonX = sonarCv.getContext('2d'); let sonarN = 0, pingT = 0;
function sonarDraw(dt){ if (!S.sonar || !running){ sonarCv.classList.add('hidden'); $('sonarTxt').classList.add('hidden'); return; } sonarCv.classList.remove('hidden'); $('sonarTxt').classList.remove('hidden');
  const W = sonarCv.width, Hh = sonarCv.height, under = Math.max(.3, waterY - H(raftPos.x, raftPos.z - 9)), endless = X_.endless, pass = X_.pass;
  const scale = Math.max(20, under*1.35), yOf = m => 4 + m/scale*(Hh - 8);
  pingT -= dt; const k = pass ? clamp(pass.t/14, 0, 1) : 0; if (pingT <= 0){ pingT = pass && pass.t < 24 ? lerp(2.2, .3, k) : 2.4; pingSfx(pass ? .06 + k*.1 : .045, pass && k > .6); }
  if ((sonarN = (sonarN + 1) % 2)) return;
  sonX.drawImage(sonarCv, -1, 0); sonX.fillStyle = '#02100a'; sonX.fillRect(W-1, 0, 1, Hh);
  for (let i=0;i<3;i++){ sonX.fillStyle = `rgba(90,200,130,${Math.random()*.25})`; sonX.fillRect(W-1, Math.random()*Hh, 1, 1); }
  const noFloor = endless && endless.len > under;
  if (!noFloor){ const y = yOf(under); sonX.fillStyle = 'rgba(150,240,170,.95)'; sonX.fillRect(W-1, y, 1, 2); sonX.fillStyle = 'rgba(60,150,95,.45)'; sonX.fillRect(W-1, y+2, 1, Hh - y); }
  if (Math.random() < .05){ sonX.fillStyle = 'rgba(160,230,180,.6)'; sonX.fillRect(W-1, yOf(rand(1, under*.8)), 1, 2); }
  if (endless){ sonX.fillStyle = 'rgba(230,220,160,.9)'; sonX.fillRect(W-1, 4, 1, Math.min(Hh, yOf(endless.len)) - 4); }
  if (pass){ const t = pass.t, d = t < 14 ? lerp(scale*1.15, 2, Math.pow(k, 1.6)) : t < 24 ? 2 : lerp(2, scale*1.2, clamp((t-24)/6,0,1)), sz = lerp(3, Hh*.55, k)*(t < 24 ? 1 : 1 - clamp((t-24)/6,0,1));
    const y = yOf(d); sonX.fillStyle = `rgba(235,245,190,${.5 + k*.5})`; sonX.fillRect(W-1, y - sz*.15, 1, sz); }
  $('sonarTxt').textContent = noFloor ? `ECO · FONDO NON RILEVATO` : pass && pass.t < 24 ? `ECO · QUALCOSA RISALE · ${Math.max(0, Math.round(lerp(scale*1.15, 2, Math.pow(k,1.6))))} m` : `ECO · FONDO ${Math.round(under)} m`;
  $('sonarTxt').classList.toggle('dn', !!(noFloor || pass)); }

// ---------- il passaggio: qualcosa risale. Spegni tutto ----------
R2.passT = 150;
function startPassage(){ X_.pass = { t:0, failed:false }; X_.big = 32;
  if (!S.tipPass){ S.tipPass = 1; setTimeout(()=>toast(`Sull'ecoscandaglio qualcosa risale dal fondo, dritto verso la zattera. Spegni la TORCIA e i FARI, subito. Resta al buio finché non è passato.`, 'warn'), 600); }
  else setTimeout(()=>sub(pick([`(l'ecoscandaglio fa bip sempre più in fretta. Qualcosa risale)`,`(sul piccolo schermo verde una macchia sale verso di te)`,`(spegni le luci)`]), 4), 800); }
function passageUpdate(dt){
  if (!X_.pass){ if (S.sonar && !uiBusy() && X_.big <= 0 && tensionT <= 0 && S.d >= 6 && !ending){ R2.passT -= dt; if (R2.passT <= 0){ R2.passT = rand(160, 250)/(1 + phase*.15); startPassage(); } } return; }
  const e = X_.pass; e.t += dt; const t = e.t;
  if (t > 3 && t < 14 && Math.random() < dt*.8) lampOverride = Math.max(lampOverride, .25);
  if (t > 9 && !e.w2){ e.w2 = 1; if (lit()) sub(`(è quasi sotto di te. La luce è ancora accesa)`, 3); heartSfx(.7); }
  if (t > 13.5 && !e.br){ e.br = 1; creatureSfx({ kind:'breath', far:.02, vol:1 }); bubbleSfx(); }
  // sotto la zattera: un'ombra più grande del lago, l'acqua che si gonfia
  const up = smooth(13, 16, t)*(1 - smooth(22, 25, t)); if (up > 0){ const ax = lerp(-30, 30, clamp((t-13)/12, 0, 1)); waterU.uShadow.value.set(raftPos.x + ax, raftPos.z - 4, 22, up*.95); waterU.uShadowA.value = .4;
    tideK = up*.3; if (Math.random() < dt*8*up) emitDrop(raftPos.x + rand(-6,6), waterY, raftPos.z + rand(-8,4), 0, rand(.4,1), 0, .6, rand(.6,1.2)); if (Math.random() < dt*2*up) ripple(raftPos.x + rand(-8,8), raftPos.z + rand(-8,8), 1); }
  if (t > 14.5 && t < 22 && !e.failed && lit()){ e.failed = true; postMat.uniforms.uFlash.value = .2; bigSplash(raftPos.x + rand(-2,2), raftPos.z - 3, 1.4); consequence(); }
  if (t > 25.5){ X_.pass = null; tideK = 0; waterU.uShadow.value.w = 0; if (!e.failed){ gainLuc(5, `sei rimasto al buio`); toast(pick([`È passato. Per dieci secondi l'acqua sotto la zattera era calda.`,`È passato sotto di te, al buio. Non ti ha visto. Questa volta.`,`L'ecoscandaglio torna a segnare il fondo. Puoi riaccendere.`]), 'lore'); } } }

// ---------- la corda che non trova il fondo ----------
function endlessUpdate(dt){ const e = X_.endless; e.t += dt; const under = Math.max(1, waterY - H(raftPos.x, raftPos.z - 9));
  if (e.t < 13){ e.len += (2 + e.t*e.t*.3)*dt; if (Math.random() < dt*3) reelSfx(.5); shakeAmt = Math.max(shakeAmt, .06); if (e.t < 1) pitchT = Math.min(pitchT, -.7); }
  $('bucketSub').textContent = `−${Math.round(e.len)} m`;
  if (e.len > under + 3 && !e.pastFloor){ e.pastFloor = 1; toast(`La corda ha passato il fondo del lago. Continua a scendere.`, 'cosmic'); heartSfx(.6); }
  if (e.len > 200 && !e.far){ e.far = 1; sub(`(ti scorrono tra le dita più metri di corda di quanti ne hai mai avuti)`, 4); }
  if (e.t > 13 && !e.tug){ e.tug = 1; shakeAmt = .7; knockSfx(1, 0); creatureSfx({ kind:'breath', far:.3, vol:.8 }); sub(`(laggiù, qualcosa ha tenuto la corda. Poi l'ha lasciata)`, 4); }
  if (e.t > 15.5){ X_.endless = null; B.relic = true; loseLuc(6, `la corda senza fondo`); setTimeout(()=>toast(`La corda torna su bagnata per tutta la sua lunghezza. Anche la parte che non è mai stata in acqua.`, 'lore'), 1500); } }

// ---------- la torcia verso il basso: sotto non c'è il fondo, c'è nero che si muove ----------
function deepLookUpdate(){ const under = Math.max(0, waterY - H(raftPos.x, raftPos.z - 8)); waterU.uDeep.value = clamp((under - 3)/12, 0, 1)*(S.torchOn ? 1 : 0); waterU.uDeepD.value = Math.min(under, 30); }

function regia4Update(dt){ passageUpdate(dt); hullUpdate(dt); yankUpdate(dt); dragUpdate(dt); deepLookUpdate(); sonarDraw(dt);
  if (!ending && (R2.vanT = (R2.vanT ?? 0) + dt) > .1){ R2.vanT = 0; dawnCheck(); }
  // di notte un garzone sparisce quando non lo stai guardando
  if (X_.vanish){ const k = HELPERS[S.helper||0].k; if (!k || dayF >= .5){ X_.vanish = null; } else { const g = helperFigs[k-1]; if (!inView(g, 1)){ X_.vanish = null; helperLost(k-1, false); splashSfx(30, 6); } } } }
Object.assign(NEWEV, { passage:()=>{ if (!X_.pass) startPassage(); }, endless:()=>{ X_.endlessNext = true; }, vanish:()=>{ X_.vanish = true; } });

/* =====================================================================
   IL COPIONE: cinque atti. Ogni cosa arriva quando è il suo momento, e la prima volta Tobia ci pensa su.
   I · Il lavoro (0–6 m): un lago, un secchio, troppa calma. Cose che galleggiano. Da dove vengono?
   II · Il paese (6–20 m): le cose del paese tornano su. Qualcuno è stato qui. Qualcuno è ancora qui.
   III · Loro (20–45 m): gli annegati sanno. Ti guardano lavorare.
   IV · Lui (45–90 m): la scala delle cose cambia. Il lago è una coperta.
   V · Il risveglio (90 m e oltre)
   ===================================================================== */
const actOf = d => d < 6 ? 0 : d < 20 ? 1 : d < 45 ? 2 : d < 90 ? 3 : 4;
const EV_ACT = { knock:0, tug:0, prints:0, bump:0, lightning:0,
  music:1, silent:1, fish:1, behind:1, hand:1, torch:1, left:1, bodies:1, fog:1, car:1, rowboat:1, silence:1, neck:1, tide:1, scrawl:1, bellNear:4, figure:1, flicker:1, ladder:1, priest:1, grip:1, passage:1, call:1,
  sublim:2, green:2, dg:2, lost:2, titan:2, mouth:2, dock:2, tentRaft:2, hands:2, selfCorpse:2, bucketThing:2, reflection:2, name:2, eyes:2, darkness:2, dinner:2, heads:4, gaze:2, endless:2, vanish:2,
  levx:3, blood:3, breath:4, surfEye:3, rain:3, starsOut:3, swarm:3, scare:3, leviathan:3, chant:3, abyss:3, horizon:4, pupil:4, whaleback:3, dunk:4, moon:3, reach:4 };
const VIG_ACT = { drift:0, bubbles:0, lurch:0, jump:0, shoreLight:1, hair:1, face:2, ridge:3 };
const DRIFT_BY_ACT = [['hat','chair','frame'], ['hat','chair','frame','cradle','doll','candle'], ['cradle','doll','candle','frame','coffin','chair'], ['coffin','cradle','doll','candle'], ['coffin','doll','candle']];
// i pensieri di Tobia: una volta sola, quando qualcosa accade per la prima volta
const THINK = {
  drift:`Da dove vengono queste cose? Dal fondo del lago... o qualcuno le butta in acqua, di notte?`,
  drift2:`Sono le cose del paese. Come se qualcuno, laggiù, stesse svuotando le case. O come se le case si svuotassero da sole.`,
  relic:`Era nel secchio. Settant'anni sott'acqua, e sembra perso ieri. Chi l'ha perso?`,
  relic2:`Non può essere stato sott'acqua tutto questo tempo. Qualcuno l'ha messo lì. Per me.`,
  knock:`Un tronco. Sarà un tronco sotto la zattera. I tronchi non bussano tre volte.`,
  prints:`Impronte. Le mie? Non mi sono mai tolto gli stivali.`,
  shoreLight:`Una lanterna sulla riva. Qualcuno del paese, a quest'ora? Qui non viene nessuno.`,
  jump:`Un pesce. Almeno qualcosa, qui dentro, è vivo.`,
  bubbles:`Bolle. Il fondo che si assesta, dicono. Il fondo che respira, dico io.`,
  call:`Non era un animale. Non c'è niente, in un lago, che faccia quel suono.`,
  hair:`Capelli. Lunghi. Di chi sono?`,
  face:`C'era un volto. Sott'acqua, a due metri da me. Aveva gli occhi aperti.`,
  heads:`Sono loro. Il paese. Sanno che sono qui. Sanno cosa sto facendo.`,
  priest:`Il prete. Quello dell'architrave. Don Aurelio. Mi guarda come si guarda un figlio.`,
  dinner:`Hanno aspettato l'acqua seduti a tavola. E aspettano ancora. Me.`,
  gaze:`Non è una statua. Le statue non aprono gli occhi.`,
  horizon:`Non era una montagna. Le montagne non si avvicinano.`,
  ridge:`Quanto è grande il lago? Quanto è grande quello che c'è dentro?`,
  abyss:`Non c'è un fondo. C'è Lui, disteso. E il lago è la sua coperta.`,
  endless:`Il lago è profondo centoventotto metri. Ho calato più corda di quanta ne abbia mai avuta.`,
  passage:`Non mi ha visto. Finché resto al buio, non mi vede.`,
  bodies:`Corpi. Vestiti della domenica. Non sono annegati scappando: sono annegati aspettando.`,
  rowboat:`Una barca senza remi. Chi c'è sopra non rema. Non ne ha bisogno.`,
  titan:`Quella cosa era alta come il campanile. E sotto ce n'erano altre.`,
  darkness:`Erano sulla zattera. Con me. Nel buio li sentivo respirare.`,
  grip:`Qualcosa, laggiù, voleva il secchio. O voleva me.`,
  moon:`La luna non è la luna. Non lo è mai stata.`,
  reach:`Il bordo della valle. Qualcosa si è aggrappato al bordo della valle.`,
  whaleback:`Non finiva. Continuava a passare, e non finiva.`,
  dunk:`Laggiù erano in piedi. Tutti. E guardavano in su, verso di me.`
};
function think(key, delay=4){ if (!THINK[key]) return; S.thought = S.thought || {}; if (S.thought[key]) return; S.thought[key] = 1;
  const show = (n=0)=>{ if (!running || ending) return; if ((subT > .3 || uiBusy()) && n < 12) return setTimeout(()=>show(n+1), 900); sub(`(${THINK[key]})`, 5.5, 'think'); };
  setTimeout(show, delay*1000); }

// ombre portate dalla torcia: tutto tranne terreno, acqua, effetti e la zattera (su cui stai)
scene.traverse(o=>{ if (o.isMesh || o.isInstancedMesh) (Array.isArray(o.material) ? o.material : [o.material]).forEach(addMurk); });
addMurk(pipeMatN);
scene.traverse(o=>{ if (!o.isMesh || o.userData.noCast) return; let p = o, skip = false; while (p){ if (p === raft || p === bucket || p.userData.noCast) { skip = true; break; } p = p.parent; } o.castShadow = !skip; o.receiveShadow = !skip; });
// le cose enormi non proiettano l'ombra della torcia: il cono arriva a 70 m e da lì non la vedresti, ma costano un'intera passata in più
{ const sph = new THREE.Sphere(); scene.traverse(o=>{ if (!o.isMesh || !o.castShadow) return; if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere(); sph.copy(o.geometry.boundingSphere).applyMatrix4(o.matrixWorld);
    let p = o; while (p){ if (p === colossus || p === giant || p === whale || p === reach || p === titan) break; p = p.parent; }
    if (p || sph.radius > 9) o.castShadow = false; }); }

/* =====================================================================
   LOOP
   ===================================================================== */
let hudN = 0, hudFrame = 0, waterVel = 0; let last = performance.now(), T = 0, dayF = 0, waterY = 0, hudT = 0, saveT = 0, beatT = 0, sellT = 0;
const cDay = { top:new THREE.Color(.062,.07,.072), hor:new THREE.Color(.052,.06,.057) };
const cNight = { top:new THREE.Color(.0025,.0035,.006), hor:new THREE.Color(.006,.008,.009) };
const tmpC = new THREE.Color(), tmpV = new THREE.Vector3(), fwd = new THREE.Vector3(), lifeEnd = new THREE.Vector3(), ropeTop = new THREE.Vector3();

// RITMO. La paura vive di contrasto: tregua, attesa, colpo, silenzio.
// PACE.ev / PACE.vig / PACE.call moltiplicano la velocità con cui scorrono i timer del regista.
// - giorno: tregua (il lavoro, piccole stranezze); tramonto: si prepara; notte: i colpi; alba: si respira
// - finita una scena grande, 14-26 s in cui non succede niente e anche il fondo sonoro si abbassa
const PACE = { ev:1, vig:1, call:1, calm:0, wasBig:false, amb:1 };
function paceUpdate(dt){
  const c = S.time % 240, part = c < 90 ? 'day' : c < 110 ? 'dusk' : c < 220 ? 'night' : 'dawn';
  const K = { day:[.6,.7,.35], dusk:[.9,.9,1.2], night:[1.5,1.25,1.15], dawn:[.45,.55,.25] }[part];
  const big = X_.big > 0 || tensionT > 0 || CINE.on;
  if (PACE.wasBig && !big) PACE.calm = rand(14, 26);
  PACE.wasBig = big;
  if (PACE.calm > 0) PACE.calm -= dt;
  const hush = PACE.calm > 0 ? 0 : 1;
  PACE.ev = K[0]*hush; PACE.vig = K[1]*(PACE.calm > 0 ? .15 : 1); PACE.call = K[2]*hush;
  PACE.amb += ((PACE.calm > 0 ? .55 : 1) - PACE.amb)*Math.min(1, dt*.5);
}
function update(dt){
  T += dt;
  if (!ending) S.time += dt;
  const c = S.time % 240;
  dayF = c<90 ? 1 : c<110 ? 1-(c-90)/20 : c<220 ? 0 : (c-220)/20;
  phase = phaseOf(S.d);

  // produzione pompe
  if (!ending){
    const pr = pumpRate();
    if (pr + noriaRate() > 0) addLiters((pr + noriaRate())*dt);
    if (S.contract && S.tank > 0){ S.money += S.tank * priceNow() * CONTRACTS[S.contract].p; S.tank = 0; }
    else if (S.van && S.tank >= tankCap()){ const v = S.tank * priceNow() * VANS[S.van].p; S.money += v; S.tank = 0; cash(v, `il furgone ha svuotato la cisterna`); }
    // lucidità
    const night = dayF < .5;
    const nearLamp = lamp.intensity > 2;
    const drain = (night ? Math.max(.008, .028 - (S.floodOn === false ? 0 : (S.flood||0))*.009) : 0) + phase*.006 + (S.torchOn?0:.06) + S.pumps[4]*.004 + S.pumps[5]*.012 + (S.filter>=5 ? .006 : 0);
    const regen = dayF*.075 + S.lumino*.04 + (nearLamp ? .018 : 0) + (breathT > 0 ? 2.2 : 0);
    LUCWHY.dn = [night && 'notte', !S.torchOn && 'torcia spenta', phase>=1 && 'profondità', (S.pumps[4]||S.pumps[5]) && 'macchine di carne'].filter(Boolean);
    LUCWHY.up = [dayF>.5 && 'luce del giorno', night && S.flood && S.floodOn !== false && 'i fari', S.lumino && 'lumini votivi', nearLamp && 'la lanterna', breathT>0 && 'respiri'].filter(Boolean);
    LUCWHY.net = regen - drain;
    if (S.luc <= .01 && !blackout) doBlackout();
    else { const cap = lucCap(); if (S.luc > cap) S.luc = Math.max(cap, S.luc - (.35 + Math.max(0, drain - regen))*dt); else S.luc = Math.min(cap, Math.max(0, S.luc + (regen - drain)*dt)); }
    if (S.luc >= lucCap() - .5 && lucCap() < 99 && LUCWHY.net > 0){ LUCWHY.dn = ['il fondo non ti lascia tornare lucido']; LUCWHY.net = 0; }
    // eventi
    paceUpdate(dt); cashUpdate(dt);
    if (!uiBusy()) EV.next -= dt*PACE.ev;
    if (EV.next <= 0 && !inCall && !uiBusy()){ EV.next = rand(16,28)/(1+phase*.2)*(S.d < 6 ? 2 : S.d < 14 ? 1.5 : 1); runEvent(); }
    // storia
    STORY.forEach((s,i)=>{ if (S.d >= s.d && !S.story.includes(i)){ S.story.push(i); s.f(); } });
    // lore riaffiorata
    loreObjs.forEach(l=>{ if (!S.revealed.includes(l.id) && -S.d < l.topY - .3){ S.revealed.push(l.id); if (S.d > .5){ toast(`◈ Qualcosa è riaffiorato dal fango: ${LORE[l.id].hint}. Segui il segno e toccalo.`, 'lore'); revealSfx(); $('diaryDot').classList.remove('hidden'); if (phase>=1) whisperSfx(1.2,.12); } } });
    if (S.d >= MAXD && !S.ended) startFinale();
  }

  // livello acqua
  let targetY = -S.d;
  if (ending){ endT += dt;
    if (ending==='reveal'){ targetY = -MAXD - Math.min(endT/6,1)*9; lidOpen = Math.min(1, endT/9); if (endT > 10 && $('prompt').classList.contains('hidden') && !endAsked){ endAsked = true; showEndChoice(); } }
    if (ending==='wake'){ targetY = -137; lidOpen = 1; shakeAmt = Math.max(shakeAmt, .5);
      const k = Math.min(1, endT/5); CAM_BASE.lerpVectors(camWakeStart, new THREE.Vector3(0,-128,3), k*k);
      pitchT = -1.35; postMat.uniforms.uDark.value = smooth(4.5,6.5,endT); if (endT > 7 && !S.ended) showCredits('wake'); }
    if (ending==='fill'){ targetY = lerp(-MAXD-9, 0, smooth(0,12,endT)); lidOpen = Math.max(0, 1-endT/5); postMat.uniforms.uDark.value = smooth(10,14,endT); if (endT > 14.5 && !S.ended) showCredits('fill'); }
  }
  { // l'acqua scende come una massa: accelera e frena in modo continuo (niente scatti a ogni secchiata)
    const w = ending ? 1.3 : .9; waterVel += ((targetY - waterY)*w*w - 2*w*waterVel)*dt; waterY += waterVel*dt; }
  const breathOff = X_.breath > 0 ? Math.sin(X_.breathPh/5.5*Math.PI*2)*.32*smooth(0,3,X_.breath)*smooth(24,21,X_.breath) : 0;
  water.position.y = waterY + breathOff + tideK; terrainU.uWater.value = waterY;
  // zattera
  { // la zattera segue l'acqua senza scatti: in altezza va con l'acqua, in avanti scivola piano, a velocità limitata
    const tg = raftTarget(waterY), want = clamp((tg.z - raftPos.z)*.6, -.38, .38);
    raftVel.z += (want - raftVel.z)*Math.min(1, dt*1.2); raftPos.z += raftVel.z*dt; raftPos.x = 0;
    raftPos.y = Math.max(waterY, raftPos.z <= RAFT_MIN + .05 ? H(0, raftPos.z) + .12 : -1e9); }
  const floating = raftPos.y <= waterY + .05;
  wavesUpdate(dt); foamUpdate(dt); clumpsUpdate(dt); raft.position.copy(raftPos); raft.position.y -= (1 - (S.hull ?? 100)/100)*.28; raft.position.x += raftOff.x; raft.position.z += raftOff.y; if (floating){ raft.position.y += Math.sin(T*1.1)*.04 + breathOff + tideK + raftHeave + raftJolt*Math.sin(T*24)*.12*raftJolt; raft.rotation.set(Math.sin(T*.6)*.012 - raftTilt.x + raftJolt*Math.sin(T*9)*.05, raftOff.x*.06, Math.sin(T*.8)*.016 + raftTilt.y); } else raft.rotation.set(-.08,0,.03);
  raft.updateMatrixWorld();
  lamp.position.set(raft.position.x-1.36, raft.position.y+1.98, raft.position.z-1.3); waterU.uLampPos.value.copy(lamp.position);
  if (raft.userData.lantern) raft.userData.lantern.rotation.z = Math.sin(T*.9)*.025;
  { const a = lifeGeo.attributes.position; const end = lifeEnd.set(raft.position.x+1.05, raft.position.y+1.2, raft.position.z+1.6); const len = DOCK_HOOK.distanceTo(end);
    for (let i=0;i<30;i++){ const t = i/29; tmpV.lerpVectors(DOCK_HOOK, end, t); tmpV.y -= Math.sin(t*Math.PI)*Math.min(len*.03, 3); a.setXYZ(i, tmpV.x, tmpV.y, tmpV.z); } a.needsUpdate = true; }
  if (ending !== 'wake'){ CAM_BASE.set(raft.position.x, raft.position.y + 1.95 - R2.dunk*3.1, raft.position.z - .3 - R2.dunk*.8); }
  rebuildPipes(false);

  // cielo e luci
  tmpC.copy(cNight.top).lerp(cDay.top, dayF); skyU.uTop.value.copy(tmpC);
  tmpC.copy(cNight.hor).lerp(cDay.hor, dayF); skyU.uHor.value.copy(tmpC); scene.fog.color.copy(tmpC); waterU.uSky.value.copy(tmpC).multiplyScalar(1.3);
  skyU.uNight.value = 1-dayF; skyU.uTime.value = T; skyU.uRed.value = ending==='wake' ? smooth(0,3,endT) : (phase>=4 ? .15 : 0);
  scene.fog.density = lerp(.0105, .0085, dayF) + (phase>=3?.0012:0) + (X_.fog > 0 ? .065*smooth(0,3,X_.fog)*smooth(18,15,X_.fog) : 0);
  lightUpdate(dt); skyU.uLight.value = lightK;
  hemi.intensity = lerp(.1, .42, dayF) + lightK*2.2; moon.intensity = lerp(.16, .55, dayF) + lightK*1.5; moon.color.setRGB(lerp(.45,.7,dayF), lerp(.52,.72,dayF), lerp(.66,.68,dayF));
  postMat.uniforms.uExposure.value = lerp(1.55, 1.15, dayF);
  skyU.uWrong.value = phase>=3 ? clamp((S.d-60)/40,0,1) : 0;
  skyU.uSkyEye.value = ending==='reveal' ? lidOpen : (ending ? 1 : (phase>=4 ? clamp((S.d-105)/23,0,1)*.7 : 0));
  terrainU.uEyes.value = ending ? 1 : (phase>=3 ? .35 + clamp((S.d-65)/40,0,1)*.65 : (phase>=2 && S.luc < 35 ? .3 : 0));
  mistU.uDen.value = lerp(1.15, .75, dayF);
  levUpdate(dt);
  // lampione
  let li = 4 + Math.sin(T*13)*.3 + (Math.random()<.02 ? -3 : 0);
  if (lampOverride > 0){ lampOverride -= dt; li = Math.random()<.5 ? 0 : 4; }
  if (blackT > 0){ blackT -= dt; li = 0; }
  if (phase >= 3 && Math.random() < .004) li = 0;
  if (X_.green > 0){ lamp.color.setRGB(.35,1,.4); M.lampGlass.emissive.setRGB(.3,1,.4); li *= 1.6; } else { lamp.color.copy(LAMP_COL); M.lampGlass.emissive.setHex(0xffaa55); }
  lamp.intensity = Math.max(0, li); M.lampGlass.emissiveIntensity = li*.8;
  const fi = TORCHES[S.torch].i * (S.torchOn && blackT<=0 && X_.torchKill<=0 ? 1 : 0) * (phase>=3 && Math.random()<.01 ? .1 : 1);
  flash.intensity = fi*.3; waterU.uFlashI.value = fi; waterU.uLampI.value = lamp.intensity;
  camera.getWorldPosition(waterU.uFlashPos.value); camera.getWorldDirection(waterU.uFlashDir.value);
  waterU.uTime.value = T; waterU.uCalm.value = R2.still > 0 ? 0 : 1 + phase*.4;
  // finestre del paese
  M.win.emissiveIntensity = (phase>=2 && dayF<.5) ? (1.4 + Math.sin(T*3)*.3) * (Math.random()<.03?0:1) : 0;
  monoMat.emissiveIntensity = phase>=2 ? .4 + .3*Math.sin(T*.8) + (phase>=3?.6:0) : 0;
  // occhio, tentacoli, forma
  const glow = phase>=3 ? .15 + clamp((S.d-65)/63,0,1)*.85 : (phase>=2 ? .06 : 0);
  eyeU.uGlow.value = glow * (.8+.2*Math.sin(T*1.1)) + (ending?1:0); eyeU.uTime.value = T; eyeU.uDilate.value = .3 + .3*Math.sin(T*.4) + (ending==='wake'?1.5:0);
  waterU.uGlow.value = glow * (S.d > 70 ? 1 : .5);
  if (!ending) lidOpen = phase>=4 ? clamp((S.d-105)/23,0,1)*.45 : 0;
  lidU.rotation.x = -lidOpen*1.15; lidD.rotation.x = Math.PI + lidOpen*1.15;
  eye.lookAt(camera.position);
  let ts = 0; if (phase>=3) ts = .3 + clamp((S.d-65)/63,0,1)*.45; if (ending==='wake') ts = lerp(.75, 1.55, smooth(0,4,endT)); if (ending==='fill') ts = Math.max(.01, .75 - endT*.1);
  tentacles.visible = ts > .02; tentacles.scale.lerp(tmpV.set(ts||.01, ts||.01, ts||.01), dt*.5); tentU.uTime.value = T; tentacles.rotation.y += dt*.02;
  knot.rotation.x += dt*.13; knot.rotation.y += dt*.07;
  pumpObjs.forEach(p=>{ if (p) p.traverse(o=>{ if (o.userData.pulse){ const s = 1 + Math.sin(T*3.2)*.06; o.scale.set(s, s*.85, s*1.05); } }); });
  if (bellMesh) bellMesh.rotation.z = Math.sin(T*.7)*.05;
  // sonnambuli
  const wc = phase>=1 ? Math.min(WALKERS, Math.floor((S.d-12)*.75)+2) : 0;
  walkers.count = ((dayF < .5) || phase>=3 || lightK > .15) ? clamp(wc,0,WALKERS) : 0;
  if (ending==='fill' && endT>6) walkers.count = 0;
  walkerEyes.count = (phase>=2 && (dayF < .5 || phase>=3)) ? walkers.count : 0;
  shoreEyesUpdate(dt);
  if (choirBoost > 0) choirBoost -= dt;
  // figura sull'acqua
  if (wf.on){ wf.t += dt; waterFigure.position.y = water.position.y - .7 + Math.sin(T*.8)*.05;
    camera.getWorldDirection(fwd); tmpV.copy(waterFigure.position).sub(camera.position).normalize();
    if (fwd.dot(tmpV) > .975 && S.torchOn) wf.seen += dt;
    if (wf.seen > .35 || wf.t > 9){ wf.on = false; wf.sink = 1.2; splashFX(waterFigure.position.x, waterY, waterFigure.position.z, .7, .6); ripple(waterFigure.position.x, waterFigure.position.z, 1.2); if (wf.seen > .35){ whisperSfx(1.2,.25); loseLuc(4, `la figura sull'acqua`); heartSfx(.5); } }
  }
  if (wf.sink > 0){ wf.sink -= dt; waterFigure.position.y -= dt*3.2; if (wf.sink <= 0 && !X_.left) waterFigure.visible = false; }
  if (paleT > 0){ paleT -= dt; if (paleT <= 0){ paleFigure.visible = false; } }
  machinesUpdate(dt);
  if (!ending){ eventsUpdate(dt); regiaUpdate(dt); regia3Update(dt); regia4Update(dt); helpersUpdate(dt); ordersUpdate(dt); } veinUpdate(dt); aimUpdate();
  attnUpdate(dt);
  if (tensionT > 0) tensionT -= dt; if (!ending) postMat.uniforms.uDark.value = Math.max(R2.darkK, tensionT > 0 ? Math.sin(Math.PI*clamp(1 - tensionT/tensionD, 0, 1))*.22 : 0);
  bigUpdate(dt);
  if ((hudFrame = (hudFrame+1) % 2) === 0) poiUpdate(); hudFx(dt);
  // battito
  if (S.luc < 30 || phase>=4){ beatT -= dt; if (beatT <= 0){ heartSfx(.35 + (30-Math.min(S.luc,30))/60); beatT = lerp(.6, 1.3, Math.min(S.luc,30)/30); } }
  if (glitchT > 0) glitchT -= dt;
  if (breathT > 0) breathT -= dt; if (breathCd > 0) breathCd -= dt;
  if (subT > 0){ subT -= dt; if (subT <= 0) $('subs').style.opacity = 0; }

  // camera
  yaw += (yawT - yaw)*Math.min(1, dt*8); pitch += (pitchT - pitch)*Math.min(1, dt*8);
  const insane = clamp((60 - S.luc)/60, 0, 1);
  shakeAmt = Math.max(0, shakeAmt - dt*1.2);
  camera.position.copy(CAM_BASE); camera.position.y += Math.sin(T*1.3)*.018;
  camera.position.x += (Math.random()-.5)*shakeAmt*shk()*.12; camera.position.y += (Math.random()-.5)*shakeAmt*shk()*.12;
  camera.rotation.order = 'YXZ'; camera.rotation.y = yaw; camera.rotation.x = pitch + Math.sin(T*.9)*.006 + raft.rotation.x*.8*Math.cos(yaw) - raft.rotation.z*.8*Math.sin(yaw); camera.rotation.z = R2.dunkR + Math.sin(T*.5)*insane*.05 + raft.rotation.z*.8*Math.cos(yaw) + raft.rotation.x*.8*Math.sin(yaw);
  camera.updateMatrixWorld();
  postMat.uniforms.uInsane.value = Math.max(insane*insane, ending==='wake'?.8:0); postMat.uniforms.uTime.value = T;
  postMat.uniforms.uFlash.value = Math.max(lightK*.12, postMat.uniforms.uFlash.value - dt*.8);
  postMat.uniforms.uTent.value = 0; postMat.uniforms.uWet.value = Math.max(0, postMat.uniforms.uWet.value - dt*.09);
  postMat.uniforms.uPulse.value = clamp((55 - S.luc)/55, 0, 1) * Math.pow(Math.max(0, Math.sin(ecgPh*Math.PI*2)), 6);
  postMat.uniforms.uSick.value = phase>=3 ? .15 + clamp((S.d-65)/63,0,1)*.35 : 0;
  postMat.uniforms.uOld.value = 0;
  applyUnder();

  // secchio
  handPos.set(.5 + Math.sin(T*1.1)*.006, -.58 + Math.sin(T*1.7)*.008, -.85); camera.localToWorld(handPos);
  handRope.set(.38,-.3,-.6); camera.localToWorld(handRope);
  if (B.busy){
    if (X_.grip) gripUpdate(dt); else if (X_.endless) endlessUpdate(dt); else B.t += dt; const u = B.t / B.dur;
    if (u < .42){ const e = u/.42; const ee = e*e; bucket.position.lerpVectors(handPos, B.target, ee); bucket.position.y += Math.sin(e*Math.PI)*1.2*(1-e); bucket.rotation.z = e*.5; }
    else if (u < .58){ if (!B.splashed){ B.splashed = true; ripple(B.target.x, B.target.z, .9); splashSfx(B.dist, BUCKETS[S.bucket].s); splashFX(B.target.x, water.position.y, B.target.z, .7 + Math.log2(BUCKETS[S.bucket].s+1)*.25, 1); if (X_.gripNext){ X_.gripNext = false; startGrip(); } else if (X_.endlessNext){ X_.endlessNext = false; X_.endless = { t:0, len:0 }; } if (X_.tugNext){ X_.tugNext = false; X_.tug = 2.6; B.dur += 2.6; } }
      if (X_.tug > 0 && Math.random() < dt*4) ripple(B.target.x + rand(-.5,.5), B.target.z + rand(-.5,.5), .6);
      bucket.position.copy(B.target); bucket.position.y = water.position.y - .2 + Math.sin(T*8)*.03; bucket.rotation.z = .9; }
    else if (u < 1){ if (Math.random() < dt*14) dripFX(bucket.position.x, bucket.position.y, bucket.position.z, 1, .12); if (!B.reeled){ B.reeled = true; reelSfx(B.dur*.42); if (X_.thingNext){ X_.thingNext = false; B.thing = true; bucketTent.visible = true; slitherSfx(.35, .4); } } if (B.thing){ bucket.rotation.x = Math.sin(T*30)*.15; } const e = (u-.58)/.42; const ee = 1-(1-e)*(1-e); bucket.position.lerpVectors(B.target, handPos, ee); bucket.rotation.z = (1-e)*.6; }
    else { finishBucket(); }
    rope.visible = true;
  } else { bucket.position.copy(handPos); bucket.rotation.set(0, yaw, Math.sin(T*1.3)*.04); rope.visible = false; }
  if (B.busy){ const a = ropeGeo.attributes.position; const top = ropeTop.copy(bucket.position); top.y += .34; const len = handRope.distanceTo(top);
    for (let i=0;i<20;i++){ const t = i/19; tmpV.lerpVectors(handRope, top, t); const taut = X_.grip || X_.tug > 0 || X_.endless; tmpV.y -= taut ? 0 : Math.sin(t*Math.PI)*Math.min(len*.04,2); if (taut){ const vb = Math.sin(t*Math.PI)*Math.sin(T*70 + t*9)*.025; tmpV.x += vb; tmpV.y += vb; } a.setXYZ(i, tmpV.x, tmpV.y, tmpV.z); } a.needsUpdate = true; }
  if (X_.endless){ bucket.position.y = water.position.y - .2 - Math.min(X_.endless.len, 18); bucket.rotation.z = .2; }
  if (X_.grip) gripPose();
  else if (X_.tug > 0 && B.busy){ const k = Math.min(1, X_.tug); bucket.position.y = water.position.y - .25 - (.35 + Math.abs(Math.sin(T*6))*.5)*k; bucket.rotation.x = -.5*k + Math.sin(T*11)*.15*k; if (Math.random() < .3) emitDrop(bucket.position.x + rand(-.3,.3), water.position.y, bucket.position.z + rand(-.3,.3), 0, rand(.8,1.8), 0, .7, rand(.8,1.4)); }
  bucket.visible = !ending;
  if (sprayLife > 0){ sprayLife -= dt; const a = sprayGeo.attributes.position; for (let i=0;i<sprayN;i++){ sprayV[i].y -= 9.8*dt; a.setXYZ(i, a.getX(i)+sprayV[i].x*dt, Math.max(water.position.y, a.getY(i)+sprayV[i].y*dt), a.getZ(i)+sprayV[i].z*dt); } a.needsUpdate = true; spray.visible = true; } else spray.visible = false;

  // audio
  if (AU.ctx){
    const t = AU.ctx.currentTime, depthK = clamp(S.d/MAXD,0,1);
    AU.droneG.gain.setTargetAtTime((.05 + depthK*.22 + insane*.1)*PACE.amb, t, 1.5);
    AU.droneF.frequency.setTargetAtTime(120 + depthK*260 + insane*200, t, 2);
    AU.subG.gain.setTargetAtTime((phase>=3 ? .15 + depthK*.25 : depthK*.08) + subBoost, t, 1);
    AU.lapG.gain.setTargetAtTime(Math.max(.01, .06 - depthK*.05), t, 1);
    AU.windG.gain.setTargetAtTime(.04 + (1-dayF)*.04, t, 2);
    AU.pumpG.gain.setTargetAtTime(Math.min(.12, pumpRate()>0 ? .03 + Math.log10(1+pumpRate())*.015 : 0), t, .5);
    AU.choirG.gain.setTargetAtTime(Math.max(0, phase>=2 ? (depthK-.28)*.32 : 0)*PACE.amb + (choirBoost>0 ? .3 : 0) + (ending ? .35 : 0), t, 1.5);
    AU.master.gain.setTargetAtTime(.9, t, .5);
    duck(!$('call').classList.contains('hidden') || !$('prompt').classList.contains('hidden') || !$('card').classList.contains('hidden'));
    if (AU.shepG){ AU.shepG.gain.setTargetAtTime(Math.max(0, depthK - .08)*.16 + (downT > .5 ? .06 : 0), t, 2); AU.deepG.gain.setTargetAtTime(depthK*.55 + (phase>=3 ? .15 : 0), t, 2); }
  }

  // HUD
  hudT -= dt;
  if (hudT <= 0 && running){ hudT = .1; if ((hudN = (hudN+1)%10) === 0) buildPlumbMarks();
    const g = glitchT > 0;
    const dTxt = '−' + S.d.toFixed(1).replace('.',',') + ' m';
    txt('depth', g ? glitchStr(dTxt) : dTxt);
    txt('money', '€ ' + (g ? glitchStr(fmt(S.money)) : fmt(S.money)));
    const cap = tankCap();
    sty('tankBar', 'width', (S.contract ? 0 : clamp(S.tank/cap,0,1)*100).toFixed(1) + '%');
    if (S.contract) txt('tankTxt', `RITIRO AUTOMATICO ${Math.round(CONTRACTS[S.contract].p*100)}%`);
    else if (S.tank >= cap){ { const e = $('tankTxt'); if (!e.firstElementChild){ e.innerHTML = `<span id="tankWarn">CISTERNA PIENA · VENDI</span>`; } } }
    else txt('tankTxt', `CISTERNA ${fmt(S.tank)} / ${fmt(cap)} L`);
    sty('lucBar', 'width', S.luc.toFixed(1) + '%');
    sty('lucBar', 'background', S.luc < 30 ? '#c0584a' : '#b9c7a8');
    txt('lucTxt', `LUCIDITÀ ${Math.round(S.luc)}%`);
    { const up = LUCWHY.net > .002, w = up ? LUCWHY.up : LUCWHY.dn; txt('lucWhy', (up ? '▲ ' : LUCWHY.net < -.002 ? '▼ ' : '■ ') + (w.length ? w.join(' · ') : (up ? 'stai recuperando' : 'stabile'))); { const e = $('lucWhy'), c = 'mini ' + (up ? 'up' : 'dn'); if (e.className !== c) e.className = c; }
      const bb = $('breathBtn'), dis = breathCd > 0 || breathT > 0 || S.luc > lucCap() - 4; if (bb.disabled !== dis) bb.disabled = dis; txt('breathBtn', breathT > 0 ? 'RESPIRI…' : breathCd > 0 ? `RESPIRA · ${Math.ceil(breathCd)}s` : 'RESPIRA'); bb.classList.toggle('hint', !bb.disabled && S.luc < Math.min(60, lucCap() - 15)); }
    { const left = Math.max(0, MAXD - S.d); txt('belowTxt', downT > .3 ? `SOTTO DI TE: ${Math.round(left)} m D'ACQUA NERA` : `ACQUA SOTTO: ${Math.round(left)} m`); $('belowTxt').classList.toggle('dn', downT > .3); }
    txt('rateTxt', `${fmt(pumpRate() + noriaRate())} L/s · ${priceNow().toLocaleString('it-IT',{maximumFractionDigits:2})} €/L`);
    txt('timeTxt', (dayF>=.5 ? 'GIORNO ' : 'NOTTE ') + (Math.floor(S.time/240)+1));
    { const o = S.order, el = $('orderTxt'); if (o){ const m = Math.max(0, Math.ceil(o.left)); txt('orderTxt', `COMMESSA ${fmt(Math.min(o.got,o.need))} / ${fmt(o.need)} L · ${Math.floor(m/60)}:${String(m%60).padStart(2,'0')}`); el.classList.toggle('dn', o.left < 30); } else txt('orderTxt', ''); }
    if (!X_.grip && !X_.endless) txt('bucketSub', fmt(BUCKETS[S.bucket].s*10) + ' L');
    { const o = S.contract ? '0.5' : '1', e = $('sellBtn'); if (e.style.opacity !== o) e.style.opacity = o; }
    if (!$('shop').classList.contains('hidden')) updateShop();
  }
  saveT -= dt; if (saveT <= 0 && !ending){ saveT = 4; save(); }
}

// l'HUD scrive nel DOM solo ciò che è cambiato: riscrivere lo stesso testo dieci volte al secondo costringe comunque il browser a rifare il layout
function txt(id, v){ const e = $(id); if (e.textContent !== v) e.textContent = v; }
function sty(id, k, v){ const e = $(id).firstElementChild; if (e['_' + k] !== v){ e['_' + k] = v; e.style[k] = v; } }
function frame(now){
  requestAnimationFrame(frame);
  if (window.__PAUSE) return;
  const raw = (now-last)/1000, dt = Math.min(.05, raw); last = now; adaptQuality(raw);
  if (CINE.on) updateCine(dt);
  else if (running){ keyLook(dt); update(dt); }
  else { T += dt; yaw = Math.sin(T*.05)*.35; pitch = -.16; camera.position.copy(CAM_BASE); camera.rotation.order='YXZ'; camera.rotation.set(pitch, yaw, 0); camera.updateMatrixWorld();
    envNight(); lightUpdate(dt); skyU.uLight.value = lightK; hemi.intensity += lightK*2.2; skyU.uTime.value = T; waterU.uTime.value = T;
    if (Math.random() < dt/14) lightning(false);
    camera.getWorldPosition(waterU.uFlashPos.value); camera.getWorldDirection(waterU.uFlashDir.value); flash.intensity = 0; waterU.uFlashI.value = 0;
    lamp.intensity = 4 + Math.sin(T*13)*.3; waterU.uLampI.value = lamp.intensity; M.lampGlass.emissiveIntensity = 3;
    postMat.uniforms.uTime.value = T; postMat.uniforms.uFlash.value = lightK*.1; bucket.visible=false; applyUnder(); }
  fxUpdate(dt);
  renderFrame();
}
if (location.search.includes('debug')) window.__IF = { CINE, CINE_EV, get S(){ return S; }, set S(v){ S = v; }, seek(t){ CINE.t = t; CINE.evI = 0; while (CINE.evI < CINE_EV.length && CINE_EV[CINE.evI][0] < t - 2.5) CINE.evI++; }, lightning, startLeviathan, startShoreEyes, scare, drawFace, startEv, showFind, X_, headObj, get raftPos(){return raftPos;}, camera, look(y,p){ yawT = yaw = y; pitchT = pitch = p; }, loreObjs, THREE, runEvent, EV, openLore, makeWave, raft, directorPick, FINDS, renderer, renderFrame, AU, get qScale(){return qScale;}, Q, get hidden(){return document.hidden;}, update:(dt)=>update(dt), startVein, VEIN, layoutHelpers, ordersUpdate, B, aimTarget, begin, startTitan, titan, mists, water, scene, consequence, hullDamage, helperLost, dragMachine, get DRo(){ return DR.o; }, farCall, evGaze, R2get: ()=>R2, layoutMachines, NEWEV, startVignette, VIG_DEF, VIG, startDrift, R2, bigSplash, bigWaveH, get raftHeave(){return raftHeave;}, colossus, creature, LEV, rowboat, floaters, dockFigs, get running(){return running;}, set running(v){running=v;}, set yawT(v){yawT=yaw=v;}, set pitchT(v){pitchT=pitch=v;} };
/* =====================================================================
   IMPOSTAZIONI E TASTIERA
   ===================================================================== */
if (MOBILE) document.body.classList.add('touch');
const QSET = { high:[1, MSAA], mid:[.8, 0], low:[.6, 0] };
function applySet(){
  postMat.uniforms.uBright.value = SET.bright; postMat.uniforms.uFlashK.value = SET.calm ? .25 : 1;
  if (AU.vol) AU.vol.gain.setTargetAtTime(SET.vol, AU.ctx.currentTime, .05);
  if (SET.q !== 'auto'){ const [q, m] = QSET[SET.q]; setQ(q, m); Q.prev = null; }
  $('setVolV').textContent = Math.round(SET.vol*100) + '%'; $('setSensV').textContent = Math.round(SET.sens*100) + '%'; $('setBrightV').textContent = Math.round(SET.bright*100) + '%';
}
{ const bind = (id, get, set, ev='input')=>{ const el = $(id); get(el); el.addEventListener(ev, ()=>{ set(el); applySet(); saveSet(); }); };
  bind('setVol', el=> el.value = Math.round(SET.vol*100), el=> SET.vol = el.value/100);
  bind('setSens', el=> el.value = Math.round(SET.sens*100), el=> SET.sens = el.value/100);
  bind('setBright', el=> el.value = Math.round(SET.bright*100), el=> SET.bright = el.value/100);
  bind('setQ', el=> el.value = SET.q, el=>{ SET.q = el.value; if (SET.q === 'auto'){ Q.hold = 0; Q.ceil = 9; } }, 'change');
  bind('setInv', el=> el.checked = SET.inv, el=> SET.inv = el.checked, 'change');
  bind('setCalm', el=> el.checked = SET.calm, el=> SET.calm = el.checked, 'change');
  applySet(); }
// il volume si applica anche quando l'audio parte dopo (al primo tocco)
document.addEventListener('pointerdown', ()=> setTimeout(applySet, 50));
const openSettings = ()=>{ ['shop','diary'].forEach(id=>$(id).classList.add('hidden')); $('settings').classList.remove('hidden'); };
$('setBtn').onclick = openSettings; $('setTitleBtn').onclick = openSettings;

const KEYS = {};
function keyLook(dt){ const x = (KEYS.ArrowLeft||KEYS.KeyA ? 1 : 0) - (KEYS.ArrowRight||KEYS.KeyD ? 1 : 0), y = (KEYS.ArrowUp||KEYS.KeyW ? 1 : 0) - (KEYS.ArrowDown||KEYS.KeyS ? 1 : 0);
  if (!x && !y) return; yawT += x*dt*1.7*SET.sens; pitchT = clamp(pitchT + y*dt*1.2*SET.sens*(SET.inv ? -1 : 1), -1.45, .45); }
const visible = id => !$(id).classList.contains('hidden');
addEventListener('keydown', e=>{
  if (e.target && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName) && e.code !== 'Escape') return;
  const c = e.code; KEYS[c] = true; initAudio(); applySet();
  if (CINE.on){ if (c === 'Escape' || c === 'Enter') endCine(); return; }
  if (c === 'Escape'){ e.preventDefault(); const open = ['settings','shop','diary'].find(visible); if (open) $(open).classList.add('hidden'); else if (visible('card')) $('cardClose').click(); else openSettings(); return; }
  // finestre: telefono, scelte, lettere
  if (visible('call')){ if ((c === 'Enter' || c === 'Space') && !e.repeat){ e.preventDefault(); $('callBtn').click(); } return; }
  if (visible('prompt')){ if (!$('prompt').classList.contains('waiting') && !e.repeat){ if (c === 'Digit1' || c === 'Numpad1') $('promptA').click(); if (c === 'Digit2' || c === 'Numpad2') $('promptB').click(); } return; }
  if (visible('card')){ if ((c === 'Enter' || c === 'Space') && !e.repeat){ e.preventDefault(); $('cardClose').click(); } return; }
  if (!running || ending) return;
  if (c === 'KeyO' || c === 'KeyJ'){ if (e.repeat) return; const id = c === 'KeyO' ? 'shop' : 'diary'; if (visible(id)) $(id).classList.add('hidden'); else $(c === 'KeyO' ? 'shopBtn' : 'diaryBtn').click(); return; }
  if (['settings','shop','diary'].some(visible)) return;
  if (c === 'Space'){ e.preventDefault(); if (e.repeat) return; if (gripTap()) return; holdBucket = true; throwBucket(); return; }
  if (e.repeat) return;
  if (c === 'KeyT') $('torchBtn').click();
  else if (c === 'KeyF' && visible('floodBtn')) $('floodBtn').click();
  else if (c === 'KeyR') $('breathBtn').dispatchEvent(new PointerEvent('pointerdown', { bubbles:true }));
  else if (c === 'KeyV') $('sellBtn').click();
});
addEventListener('keyup', e=>{ KEYS[e.code] = false; if (e.code === 'Space') holdBucket = false; });
addEventListener('blur', ()=>{ for (const k in KEYS) KEYS[k] = false; holdBucket = false; });

// riscaldamento: ogni shader del gioco viene compilato adesso, dietro il caricamento, e non nel momento in cui l'evento ti salta addosso
// e ogni geometria e texture viene caricata sulla GPU adesso: niente culling durante il riscaldamento, così anche ciò che sta alle spalle
// o fuori campo (la bocca, le mani, gli occhi sull'acqua...) non fa scattare il primo fotogramma in cui compare
function warmUp(){ const hidden = [], counts = [], culled = [], texs = new Set();
  const addTex = v=>{ if (v && v.isTexture) texs.add(v); };
  scene.traverse(o=>{ if (!o.visible){ hidden.push(o); o.visible = true; } if (o.isInstancedMesh && o.count === 0){ counts.push(o); o.count = 1; } if (o.frustumCulled){ culled.push(o); o.frustumCulled = false; }
    if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m=>{ for (const k in m) addTex(m[k]); if (m.uniforms) for (const k in m.uniforms){ const v = m.uniforms[k] && m.uniforms[k].value; Array.isArray(v) ? v.forEach(addTex) : addTex(v); } }); });
  const fl = flash.intensity, sh = renderer.shadowMap.needsUpdate; flash.intensity = 1;
  try { texs.forEach(t=> renderer.initTexture(t)); renderer.compile(scene, camera); renderer.shadowMap.needsUpdate = true; renderer.setRenderTarget(rt); renderer.render(scene, camera); renderer.setRenderTarget(null); renderFrame(); } catch(e){ console.warn(e); }
  hidden.forEach(o=> o.visible = false); counts.forEach(o=> o.count = 0); culled.forEach(o=> o.frustumCulled = true); flash.intensity = fl; renderer.shadowMap.needsUpdate = sh; }
warmUp();
$('loading').remove();
requestAnimationFrame(frame);
document.addEventListener('contextmenu', e=>e.preventDefault());
document.addEventListener('visibilitychange', ()=>{ if (document.hidden && !ending) save(); });
