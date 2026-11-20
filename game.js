import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { AU, initAudio, setUnder, sfxNoise, play, splashSfx, castSfx, reelSfx, duck, silence, coinSfx, bellSfx, groanSfx, whisperSfx, stingerSfx, heartSfx, creakSfx, ringSfx, staticSfx, bubbleSfx,
  thunderSfx, deepCallSfx, rumbleSfx, knockSfx, revealSfx, musicBoxSfx, breathSfx, honkSfx, dripSfx, clankSfx, dripsSfx, footstepSfx } from './audio.js';

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
const LPM = d => 250 * Math.pow(1.08, d);
const PRICE = d => 0.02 * Math.pow(1.03, d);
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
    pumps:PUMPS.map(()=>0), torch:0, lumino:0, story:[], found:[], revealed:[], relics:[], evc:{}, evRecent:[], cycle, ended:false, torchOn:true };
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
const rt = new THREE.WebGLRenderTarget(innerWidth*DPR*qScale, innerHeight*DPR*qScale, { type: RT_TYPE, samples: renderer.capabilities.isWebGL2 ? (MOBILE ? 0 : DPR>1.2?2:4) : 0 });
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
  uniforms:{ tDiffuse:{value:rt.texture}, tBloom:{value:bloomA.texture}, uBloomK:{value:.9}, uTime:{value:0}, uInsane:{value:0}, uFlash:{value:0}, uExposure:{value:1.4}, uRes:{value:new THREE.Vector2(innerWidth,innerHeight)}, uDark:{value:0},
    uOld:{value:0}, uUnder:{value:0}, uTent:{value:0}, uSick:{value:0}, uPulse:{value:0} },
  vertexShader:FS_VS,
  fragmentShader:`
  uniform sampler2D tDiffuse,tBloom; uniform float uTime,uInsane,uFlash,uExposure,uDark,uBloomK,uOld,uUnder,uTent,uSick,uPulse; uniform vec2 uRes; varying vec2 vUv;
  vec3 aces(vec3 x){ return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.); }
  float hh(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
  void main(){
    vec2 uv=vUv; vec2 cc=uv-.5; float fr=floor(uTime*18.);
    uv += uOld*(vec2(hh(vec2(floor(uTime*6.),1.)),hh(vec2(floor(uTime*6.),2.)))-.5)*.0012;
    uv += uInsane*.005*vec2(sin(uv.y*18.+uTime*2.1), cos(uv.x*15.+uTime*1.6));
    uv += uUnder*.0032*vec2(sin(uv.y*26.+uTime*1.7), cos(uv.x*21.+uTime*1.3));
    float ca=.0012+uInsane*.009+uUnder*.002;
    vec3 col; col.r=texture2D(tDiffuse,uv+cc*ca).r; col.g=texture2D(tDiffuse,uv).g; col.b=texture2D(tDiffuse,uv-cc*ca).b;
    vec3 bl=texture2D(tBloom,uv).rgb;
    col+=bl*uBloomK;
    col*=uExposure; col=aces(col);
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
    col*=mix(.1,1.,v)*(1.-uPulse*.22*(1.-v*.6));
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
    col+=uFlash;
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
  if (typeof moteU !== 'undefined') moteU.uPx.value = innerHeight*PR;
}
addEventListener('resize', applySize);
// qualità adattiva: se i fotogrammi rallentano scende la risoluzione interna, quando torna fluido risale
const Q = { t:0, acc:0, n:0, cool:0 };
function adaptQuality(raw){
  if (raw <= 0 || raw > 1.2 || document.hidden) return;
  Q.acc += raw; Q.n++; Q.t += raw; if (Q.t < 1.5) return;
  const avg = Q.acc/Q.n; Q.t = Q.acc = Q.n = 0; if (Q.cool > 0){ Q.cool--; return; }
  let ns = qScale;
  if (avg > 1/40) ns = Math.max(.5, qScale - (avg > 1/20 ? .2 : avg > 1/28 ? .12 : .06)); else if (avg < 1/56) ns = Math.min(1, qScale + .05);
  if (Math.abs(ns - qScale) > .01){ qScale = ns; applySize(); Q.cool = 1; }
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
function H(x,z){
  const r = Math.hypot(x,z); let h;
  if (r < R){
    h = bowl(r);
    const amp = 3.2*smooth(9,24,r)*(1-smooth(84,95,r));
    h += fbm(x*.045,z*.045)*amp + fbm(x*.2,z*.2)*.6*smooth(9,20,r)*(1-smooth(88,95,r));
    const dv = Math.hypot(x-VX, z-VZ); if (dv < 27){ const k = 1-smooth(18,27,dv); h += (VY+fbm(x*.3,z*.3)*.3 - h)*k; }
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
  uWrong:{value:0}, uSkyEye:{value:0}, uLight:{value:0}, uOut:{value:0} };
const sky = new THREE.Mesh(new THREE.SphereGeometry(600, 32, 16), new THREE.ShaderMaterial({
  uniforms: skyU, side:THREE.BackSide, depthWrite:false, fog:false,
  vertexShader:`varying vec3 vD; void main(){ vD=position; vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.); gl_Position=p.xyww; gl_Position.z=p.w*.99995; }`,
  fragmentShader:`uniform vec3 uTop,uHor,uMoon; uniform float uNight,uTime,uRed,uWrong,uSkyEye,uLight,uOut; varying vec3 vD;
  float h(vec3 p){ return fract(sin(dot(p,vec3(12.9898,78.233,45.164)))*43758.5453); }
  float n2(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); float a=h(vec3(i,0)),b=h(vec3(i+vec2(1,0),0)),c=h(vec3(i+vec2(0,1),0)),d=h(vec3(i+1.,0)); return mix(mix(a,b,f.x),mix(c,d,f.x),f.y); }
  void main(){ vec3 d=normalize(vD); float t=clamp(d.y,0.,1.);
    vec3 c=mix(uHor,uTop,pow(t,.55));
    vec2 cp=d.xz/(d.y+.18)*1.5;
    float cl=n2(cp+uTime*.008)*.5+n2(cp*2.1-uTime*.014)*.3+n2(cp*4.6+uTime*.02)*.2;
    float cm=smoothstep(.38,.78,cl)*smoothstep(0.,.22,d.y);
    float m=dot(d,normalize(uMoon));
    vec3 cloudCol=uHor*1.7+vec3(.003,.0035,.003);
    cloudCol+=pow(max(m,0.),7.)*vec3(.06,.065,.07)*uNight*(1.2-cl);
    cloudCol+=uLight*vec3(.7,.75,.95)*(.4+cl);
    c=mix(c,cloudCol,cm*.85);
    vec3 sd=d; float ra=uWrong*uTime*.04; sd.xz=mat2(cos(ra),-sin(ra),sin(ra),cos(ra))*sd.xz;
    float s=step(.9982-uWrong*.001,h(floor(sd*260.)))*uNight*smoothstep(.05,.4,d.y)*(1.-cm)*step(uOut*1.02,h(floor(sd*260.)+7.));
    c+=s*mix(vec3(.5,.55,.6),vec3(.55,.95,.35),uWrong)*(.6+.4*sin(uTime*3.+h(floor(sd*260.))*50.));
    float md=smoothstep(.99935,.9996,m); float cr=n2(d.xy*1800.)*.35+n2(d.zy*700.)*.2;
    c+=md*vec3(.62,.61,.52)*(1.-cr)*mix(.3,1.,uNight)*(1.-cm*.75)*(1.-smoothstep(.6,1.,uOut));
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
  uGlow:{value:0}, uCalm:{value:1}, uShadow:{value:new THREE.Vector4(0,0,1,0)}, uShadowA:{value:0}, uBlood:{value:0}
}]);
const waterMat = new THREE.ShaderMaterial({
  uniforms: waterU, fog:true, transparent:true, depthWrite:true, side:THREE.DoubleSide,
  vertexShader:`#include <fog_pars_vertex>
  varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; vec4 mvPosition=viewMatrix*w; gl_Position=projectionMatrix*mvPosition;
  #include <fog_vertex>
  }`,
  fragmentShader:`#include <fog_pars_fragment>
  uniform float uTime,uFlashI,uLampI,uGlow,uCalm,uShadowA,uBlood; uniform vec3 uSky,uMoonDir,uMoonCol,uFlashPos,uFlashDir,uLampPos; uniform vec4 uRip[6]; uniform vec4 uShadow; varying vec3 vW;
  // gradiente analitico delle onde: una sola valutazione per pixel
  vec2 wgrad(vec2 p){
    vec2 g=vec2(0.);
    g+=vec2(.21,0.)*cos(p.x*.21+uTime*.6)*.05 + vec2(0.,.17)*cos(p.y*.17-uTime*.45)*.05;
    vec2 k1=vec2(.6,.8)*.9, k2=vec2(-.7,.5)*1.7, k3=vec2(.3,-.9)*3.1;
    g+=k1*cos(dot(p,k1)+uTime*1.3)*.02 + k2*cos(dot(p,k2)+uTime*1.9)*.012 + k3*cos(dot(p,k3)+uTime*2.6)*.005;
    g*=uCalm;
    for(int i=0;i<6;i++){ vec4 r=uRip[i]; float t=uTime-r.z; if(t<0.||t>8.) continue; vec2 dv=p-r.xy; float d=max(length(dv),.001); float front=t*3.2;
      g+=dv/d*(2.4*cos(d*2.4-t*7.)*.12*r.w*exp(-abs(d-front)*.6)*exp(-t*.55)/(1.+d*.15)); }
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
    vec3 Ll=uLampPos-vW; float dl=length(Ll); Ll/=dl;
    col+=pow(max(dot(N,normalize(Ll+V)),0.),60.)*uLampI/(dl*dl)*vec3(1.,.65,.35)*.6;
    col+=pow(max(dot(R,uMoonDir),0.),30.)*uMoonCol*.04;
    // qualcosa di enorme passa sotto la superficie
    vec3 eyeAdd=vec3(0.);
    if (uShadow.w > 0.) {
      vec2 sd=vW.xz-uShadow.xy; float c0=cos(uShadowA), s0=sin(uShadowA); sd=mat2(c0,-s0,s0,c0)*sd; sd/=uShadow.z;
      float sa=atan(sd.y,sd.x); float rr=length(sd*vec2(1.,1.5));
      float lob=.72+.28*sin(sa*9.+uTime*.9+sin(sa*4.+uTime*.3)*2.);
      float sh=smoothstep(1.,.25,rr/lob)*uShadow.w;
      col*=1.-.9*sh;
      vec2 ep=sd-vec2(.42,0.); float eyes=smoothstep(.08,.02,length(vec2(ep.x,abs(ep.y)-.14)*vec2(1.,2.2)));
      eyeAdd=vec3(.9,.6,.08)*eyes*uShadow.w*(.6+.4*sin(uTime*2.));
    }
    col=mix(col, col*vec3(2.6,.25,.2)+vec3(.018,0.,0.), uBlood);
    gl_FragColor=vec4(col, mix(.38, 1., clamp(fr*1.6 + uBlood*.5, 0., 1.)));
    #include <fog_fragment>
    float gd=length(vW.xz); float pulse=.75+.25*sin(uTime*1.3);
    gl_FragColor.rgb+=vec3(.25,.35,.08)*uGlow*exp(-gd*gd/260.)*pulse + eyeAdd;
    }
  }`
});
const water = new THREE.Mesh(new THREE.PlaneGeometry(420,420,1,1).rotateX(-Math.PI/2), waterMat);
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
const COL_X = -14, COL_Z = 16;
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
  g.rotation.set(Math.PI/2-.12, 0, .4); at(g, -7.5, 86.5, .16);
  bakeStatic(g); addLore('bike', g, g.position.y+.5);
}
// corpo sotto il pontile
function makeCorpse(x,z,rot){
  const g = new THREE.Group();
  const body = mesh(new THREE.CapsuleGeometry(.22,.95,3,8), M.overall, 0,.2,0); body.rotation.x = Math.PI/2; body.scale.set(1.15,1,1); g.add(body);
  const head = mesh(new THREE.SphereGeometry(.16,10,8), M.pale, 0,.18,-.8); head.scale.set(1.1,.9,1.15); g.add(head);
  g.add(mesh(new THREE.SphereGeometry(.17,8,6,0,Math.PI*2,0,Math.PI/2), M.leather, 0,.2,-.84));
  for (let s of [-1,1]){ const a = mesh(new THREE.CylinderGeometry(.055,.045,.7,6), M.overall, s*.32,.12,-.3); a.rotation.set(Math.PI/2, 0, s*.55); g.add(a);
    const hnd = mesh(new THREE.SphereGeometry(.06,6,5), M.pale, s*.5,.1,-.58); hnd.scale.set(1,.5,1.6); g.add(hnd); }
  for (let s of [-1,1]){ const l = mesh(new THREE.CylinderGeometry(.08,.06,.9,6), M.overall, s*.13,.12,.95); l.rotation.x = Math.PI/2; g.add(l);
    g.add(mesh(new THREE.BoxGeometry(.12,.12,.26), M.leather, s*.13,.1,1.45)); }
  g.add(mesh(new THREE.BoxGeometry(.22,.04,.3), M.paper, .35,.06,-.55));
  g.rotation.y = rot; at(g, x, z, .05); return bakeStatic(g);
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
// statue inginocchiate
{
  const geo = (()=>{ const p=[]; const b = new THREE.CapsuleGeometry(.45,1.1,3,8); b.rotateX(.9); b.translate(0,1.1,.35); p.push(b); const h = new THREE.SphereGeometry(.34,10,8); h.translate(0,1.25,1.05); p.push(h); const l = new THREE.BoxGeometry(.9,.4,1.1); l.translate(0,.2,-.1); p.push(l); for (let s of [-1,1]){ const a = new THREE.CylinderGeometry(.11,.09,1.2,6); a.rotateX(1.2); a.translate(s*.42,.9,.9); p.push(a); } return mergeGeometries(p); })();
  for (let i=0;i<8;i++){
    const a = i/8*Math.PI*2 + .2, r = 32, x = Math.cos(a)*r, z = Math.sin(a)*r; if (Math.hypot(x-COL_X, z-COL_Z) < 15) continue;
    const st = mesh(geo, M.stone); st.scale.setScalar(1.6); st.position.set(x, H(x,z)-.2, z); st.rotation.y = Math.atan2(-x,-z);
    if (i===2) addLore('statue', st, st.position.y + 3); else scene.add(st);
  }
}
// IL COLOSSO: quaranta metri di pietra in piedi sul fondo, davanti a te
const colHead = new THREE.Group();
const colMat = new THREE.MeshStandardMaterial({color:0x4b5046, roughness:.93});
const colOrbMat = new THREE.MeshStandardMaterial({color:0x0c100d, roughness:.2, emissive:0x6aff9a, emissiveIntensity:0});
const colEyeMat = new THREE.MeshBasicMaterial({color:new THREE.Color(4,3.2,.9)});
const COL_Y0 = -68, COL_S = 1.63;
const colossus = (()=>{
  const g = new THREE.Group(); g.position.set(COL_X, COL_Y0, COL_Z); g.scale.setScalar(COL_S); g.rotation.y = Math.atan2(14, 34);
  const parts = [];
  const pl = new THREE.BoxGeometry(12,6,11); pl.translate(0,1,0); parts.push(pl);
  const prof = []; for (let i=0;i<=16;i++){ const t = i/16; prof.push(new THREE.Vector2(lerp(7.8,3.3,Math.pow(t,.8)), 4 + t*24)); }
  const robe = new THREE.LatheGeometry(prof, 44); const rp = robe.attributes.position;
  for (let i=0;i<rp.count;i++){ const x = rp.getX(i), z = rp.getZ(i), y = rp.getY(i), a = Math.atan2(z,x); const k = 1 + .08*Math.sin(a*11)*(1-(y-4)/30) + .03*Math.sin(a*23+y*.3); rp.setXYZ(i, x*k, y, z*k*.78); }
  robe.computeVertexNormals(); parts.push(robe);
  const sh = new THREE.SphereGeometry(1,22,12); sh.scale(5.8,2.6,3.2); sh.translate(0,28,0); parts.push(sh);
  for (const sd of [-1,1]){
    const up = new THREE.CylinderGeometry(1.15,1.0,9,10); up.rotateZ(sd*.22); up.translate(sd*5.5,23.6,.4); parts.push(up);
    const fo = new THREE.CylinderGeometry(1.0,.85,6.2,10); fo.rotateX(Math.PI/2-.25); fo.rotateY(-sd*.62); fo.translate(sd*3.4,19.8,2.7); parts.push(fo);
    const hand = new THREE.SphereGeometry(1.25,10,8); hand.scale(1,1.35,1.05); hand.translate(sd*1.6,20.6,4.5); parts.push(hand);
    for (let f=0;f<4;f++){ const fg = new THREE.CylinderGeometry(.22,.18,2.2,6); fg.rotateX(.6); fg.translate(sd*(1.0+f*.35), 22, 5.2); parts.push(fg); }
  }
  // drappeggio dietro la testa
  const cape = new THREE.ConeGeometry(4.2,14,16,1,true); cape.translate(0,24,-1.6); parts.push(cape);
  g.add(new THREE.Mesh(mergeGeometries(parts.map(q=>q.index ? q.toNonIndexed() : q)), colMat));
  g.add(mesh(new THREE.SphereGeometry(2.3,20,14), colOrbMat, 0,22,5.2));
  // la testa: cappuccio, niente faccia, tentacoli scolpiti
  colHead.position.set(0,28.6,0);
  const hp = [];
  const hood = new THREE.SphereGeometry(1,22,16); hood.scale(3.3,4.0,3.5); hood.translate(0,3.6,-.2); hp.push(hood);
  const brim = new THREE.TorusGeometry(2.3,.55,8,20); brim.scale(1,1.3,1); brim.translate(0,3.4,2.9); hp.push(brim);
  for (let k=0;k<5;k++){ const a = (k-2)*.42; const sp = new THREE.ConeGeometry(.6,4.6+(k===2?1.4:0),6); sp.rotateZ(-a*.6); sp.translate(Math.sin(a)*2.4, 9.1+(k===2?.7:0)-Math.abs(a)*1.2, -.3); hp.push(sp); }
  for (let k=0;k<11;k++){ const x0 = (k-5)*.36, pts = [];
    for (let j=0;j<=6;j++){ const t = j/6; pts.push(new THREE.Vector3(x0*(1+t*1.6) + Math.sin(t*3+k)*.5, 2.6 - t*(7+ (k%3)*1.6), 2.7 + t*2.4 + Math.sin(t*4+k)*.4)); }
    const tg = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 18, .42, 6, false); const tp = tg.attributes.position; const cv = new THREE.CatmullRomCurve3(pts);
    for (let v=0; v<tp.count; v++){ const ring = Math.floor(v/7), t = ring/18, c = cv.getPointAt(Math.min(1,t)), kk = 1 - t*.85; tp.setXYZ(v, c.x+(tp.getX(v)-c.x)*kk, c.y+(tp.getY(v)-c.y)*kk, c.z+(tp.getZ(v)-c.z)*kk); }
    tg.computeVertexNormals(); hp.push(tg.toNonIndexed()); }
  colHead.add(new THREE.Mesh(mergeGeometries(hp.map(q=>q.index ? q.toNonIndexed() : q)), colMat));
  const face = mesh(new THREE.CircleGeometry(1,20), M.black, 0,3.6,3.05); face.scale.set(1.9,2.5,1); colHead.add(face);
  for (const [ex,ey] of [[-.7,4.3],[.7,4.3],[0,5.2]]){ const e = mesh(new THREE.SphereGeometry(.22,8,6), colEyeMat, ex,ey,3.1); e.scale.set(1.4,.6,.5); e.userData.colEye = true; colHead.add(e); }
  g.add(colHead);
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
  yawT = yawT - dx*.0055; pitchT = clamp(pitchT - dy*.0055, -1.45, .45); });
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
LORE.colossus = {t:`Il Guardiano`, x:`Non era uno scoglio.\n\nSono quasi settanta metri di pietra scolpita, in piedi sul fondo del lago, con le mani giunte su una sfera. La zattera, accanto a lui, è grande quanto una sua unghia.\n\nSotto il cappuccio non c'è una faccia. Ci sono tentacoli, scolpiti uno per uno, che pendono sul petto.\n\nLa pietra è più antica della valle. Quando c'era l'acqua, se ne vedeva solo la corona. I vecchi la chiamavano "la Roccia che ascolta".`, diary:`Giorno 9. Stanotte la testa del Guardiano guardava verso il pontile. Stamattina guarda verso di me.\nHo segnato la posizione con un sasso. Domani controllo.`, hint:`davanti a te, a sinistra: in piedi nel lago`, cost:10};
const LORE_ORDER = ['shoes','bike','corpse','colossus','car','bell','house','statue','monolith','ledge','knot','eye'];
function openLore(id){
  const L = LORE[id]; if (!L) return;
  const first = !S.found.includes(id);
  if (first){ S.found.push(id); loseLuc(L.cost, `una scoperta`); whisperSfx(1.8,.18); }
  let x = L.x;
  if (id==='corpse' && S.cycle>1) x = `Due corpi a faccia in giù nel fango, sotto il pontile. Entrambi indossano la tua tuta. Entrambi hanno il tuo nome cucito sul taschino.\n\nUno dei due è ancora tiepido.`;
  $('cardTitle').textContent = L.t; $('cardText').textContent = x;
  const d = $('cardDiary'); if (L.diary){ d.textContent = L.diary; d.classList.remove('hidden'); } else d.classList.add('hidden');
  $('card').classList.remove('hidden');
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
  {d:121, f:()=> { toast(`Il fondo ti guarda.`, 'warn'); groanSfx(.7,6); deepCallSfx(.9); }}
];

/* =====================================================================
   UI
   ===================================================================== */
function toast(msg, cls=''){ const el = document.createElement('div'); el.className = 'toast '+cls; el.textContent = msg; $('toasts').appendChild(el); while ($('toasts').children.length>3) $('toasts').firstChild.remove(); setTimeout(()=>{ el.style.transition='opacity 1s'; el.style.opacity=0; setTimeout(()=>el.remove(),1000); }, 5200); }
/* ---------- lucidità: ogni perdita e ogni recupero ha un motivo, e lo vedi ---------- */
let lucPopN = 0;
function lucPop(txt, good){ const el = document.createElement('div'); el.className = 'lp ' + (good ? 'up' : 'dn'); el.textContent = txt; $('lucPop').appendChild(el);
  while ($('lucPop').children.length > 3) $('lucPop').firstChild.remove(); setTimeout(()=>el.remove(), 3800); }
function loseLuc(x, why=''){ if (!(x > 0)) return; S.luc = Math.max(0, S.luc - x); if (x >= 1) lucPop(`−${Math.round(x)} · ${why}`, false);
  if (!S.tipLuc && S.luc < 85){ S.tipLuc = 1; setTimeout(()=>toast(`La tua LUCIDITÀ è scesa. Le cose che vedi e senti la consumano. Tocca RESPIRA o guarda il DIARIO › MENTE per capire come recuperarla.`, 'lore'), 1500); } }
function gainLuc(x, why=''){ if (!(x > 0)) return; S.luc = Math.min(100, S.luc + x); if (x >= 1) lucPop(`+${Math.round(x)} · ${why}`, true); }
let subT = 0; const LUCWHY = { dn:[], up:[], net:0 }; let breathT = 0, breathCd = 0;
function sub(text, dur=3){ const s = $('subs'); s.textContent = text; s.style.opacity = 1; subT = dur; }
const callQ = []; let inCall = false, callTimer = null;
function call(who, text, radio=false){ callQ.push({who,text,radio}); if (!inCall) nextCall(); }
function nextCall(){
  const c = callQ.shift(); if (!c){ inCall = false; return; }
  inCall = true;
  if (c.radio) staticSfx(1.2); else ringSfx();
  setTimeout(()=>{
    $('callWho').textContent = c.who; $('callState').textContent = c.radio ? 'RADIO · 98.6 FM' : 'IN LINEA';
    $('callText').textContent = ''; $('call').classList.remove('hidden');
    let i = 0; clearInterval(callTimer);
    callTimer = setInterval(()=>{ i += 2; $('callText').textContent = c.text.slice(0,i); if (i >= c.text.length) clearInterval(callTimer); if (c.radio && Math.random()<.04) staticSfx(.2); }, 32);
  }, c.radio ? 900 : 2100);
}
$('callBtn').onclick = ()=>{ clearInterval(callTimer); $('call').classList.add('hidden'); setTimeout(nextCall, 1500); };
let promptCb = null;
function promptAsk(text, a, b, cb){ $('promptText').textContent = text; $('promptA').textContent = a; $('promptB').textContent = b; promptCb = cb; $('prompt').classList.remove('hidden'); }
$('promptA').onclick = ()=>{ $('prompt').classList.add('hidden'); promptCb && promptCb(true); };
$('promptB').onclick = ()=>{ $('prompt').classList.add('hidden'); promptCb && promptCb(false); };
document.querySelectorAll('[data-close]').forEach(b=> b.onclick = ()=> $(b.dataset.close).classList.add('hidden'));

const pumpCost = i => PUMPS[i].c * Math.pow(1.2, S.pumps[i]);
const GLITCH_NAMES = [`Ti vede`,`Scendi`,`Non contare`,`È sveglio`,`Respira`,`Tobia`,`Sotto il pontile`,`Riempi il secchio`];
let glitchT = 0;
function shopItems(){
  const it = [];
  const nb = BUCKETS[S.bucket+1];
  if (nb && (!nb.org || phase>=2)) it.push({id:'bucket', n:nb.n, d: nb.org ? `${nb.s} secchi per calata. Si riempie da solo. Non guardarci dentro. (−lucidità)` : `${nb.s} secchi per calata (${nb.s*10} L)`, c:nb.c, org:nb.org, buy:()=>{ S.bucket++; }});
  const np = PULLS[S.pull+1];
  if (np) it.push({id:'pull', n:np.n, d:`Cali e tiri su il secchio più in fretta`, c:np.c, buy:()=>{ S.pull++; }});
  const nt = TANKS[S.tankLv+1];
  if (nt) it.push({id:'tank', n:`Cisterna da ${fmt(nt.cap)} L`, d:`Più acqua prima di dover vendere`, c:nt.c, buy:()=>{ S.tankLv++; }});
  const nc = CONTRACTS[S.contract+1];
  if (nc && (!nc.org || phase>=2)) it.push({id:'contract', n:nc.n, d: nc.org ? `Il Compratore paga più del valore. Si firma con quello che hai. (−15 lucidità)` : `Il Compratore ritira l'acqua da solo al ${Math.round(nc.p*100)}% del prezzo`, c:nc.c, org:nc.org, buy:()=>{ S.contract++; if (nc.org){ loseLuc(15, `contratto di sangue`); groanSfx(.5,3); } }});
  PUMPS.forEach((p,i)=>{ if ((p.ph||0) <= phase) it.push({id:'pump'+i, n:p.n + (S.pumps[i]?` (${S.pumps[i]})`:''), d:`+${fmt(p.r)} L/s · ${p.d}`, c:pumpCost(i), org:p.org, buy:()=>{ S.pumps[i]++; rebuildPipes(true); creakSfx(); }}); });
  const nto = TORCHES[S.torch+1];
  if (nto) it.push({id:'torch', n:nto.n, d:`Illumina più a fondo. Sei sicuro di voler vedere?`, c:nto.c, buy:()=>{ S.torch++; }});
  if (S.lumino < 3) it.push({id:'lumino', n:`Lumino votivo ${['I','II','III'][S.lumino]}`, d:`Una fiammella per i morti del paese. La lucidità torna più in fretta.`, c:LUMINI[S.lumino+1], buy:()=>{ S.lumino++; }});
  return it;
}
function buildShop(){
  $('shopList').innerHTML = shopItems().map(i=>`<div class="item ${i.org?'org':''}" data-row="${i.id}"><div class="info"><div class="nm">${i.n}</div><div class="ds">${i.d}</div></div><button data-buy="${i.id}">€ ${fmt(i.c)}</button></div>`).join('');
  updateShop();
}
function updateShop(){
  const items = shopItems(); const g = glitchT > 0;
  $('shopList').querySelectorAll('[data-buy]').forEach(b=>{ const i = items.find(x=>x.id===b.dataset.buy); if (!i) return; b.disabled = S.money < i.c; b.textContent = '€ ' + (g ? glitchStr(fmt(i.c)) : fmt(i.c));
    const nm = b.parentElement.querySelector('.nm'); nm.textContent = g && Math.random()<.5 ? pick(GLITCH_NAMES) : i.n; });
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
      <div class="dentry" style="color:#9fc28f">▲ La restituiscono: la luce del giorno · stare vicino alla lanterna accesa · RESPIRA (sotto la lucidità, ogni 45 secondi) · i lumini votivi dell'officina · non rispondere, non bussare · ricacciare giù le cose illuminandole con la torcia.</div>
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
  breathT = 6; breathCd = 45; holdBucket = false; $('breathOv').classList.remove('hidden'); breathSfx(true, 2.6, .25); setTimeout(()=>breathSfx(false, 2.6, .22), 3000);
  const before = S.luc; setTimeout(()=>{ $('breathOv').classList.add('hidden'); lucPop(`+${Math.round(S.luc - before)} · hai respirato`, true); }, 6000); });
$('torchBtn').onclick = ()=>{ S.torchOn = !S.torchOn; $('torchBtn').classList.toggle('off', !S.torchOn); play('click', {vol:.5, rev:.05}); };
$('sellBtn').onclick = ()=>{ if (S.tank < 1) return; const v = S.tank * PRICE(S.d); S.money += v; S.tank = 0; coinSfx(); toast(`Venduti al Compratore: € ${fmt(v)}`); };
let holdBucket = false;
$('bucketBtn').addEventListener('pointerdown', e=>{ e.preventDefault(); holdBucket = true; initAudio(); throwBucket(); });
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
  if (!S.relics.includes(idx)){ S.relics.push(idx); $('diaryDot').classList.remove('hidden'); }
}
$('findCard').addEventListener('pointerdown', e=>{ e.stopPropagation(); $('findCard').classList.add('hidden'); findT = 0; });
function throwBucket(){
  if (!running || B.busy || ending || breathT > 0) return;
  if (S.tank >= tankCap() && !S.contract){ toast(`La cisterna è piena. Vendi.`, 'warn'); return; }
  const sr = shoreR(S.d);
  const rt = Math.max(Math.min(raftPos.z - 3.6, sr - 1.5), 3);
  B.target.set(.4, water.position.y - .05, rt);
  camera.updateMatrixWorld(); handPos.set(.5,-.58,-.85); camera.localToWorld(handPos);
  const dist = handPos.distanceTo(B.target);
  B.dist = dist; B.dur = (.55 + dist*.006) * PULLS[S.pull].m; B.t = 0; B.busy = true; B.splashed = false; B.reeled = false;
  castSfx(B.dur*.42); if (Math.random()<.08) creakSfx();
}
function finishBucket(){
  B.busy = false; clankSfx(); dripsSfx();
  if (B.thing){ B.thing = false; bucketTent.visible = false; bucket.rotation.x = 0; toast(pick([`Il secchio torna su scosso da qualcosa che si dimena. Una punta di tentacolo sporge dal bordo. Poi scivola giù, nel buio.`,`Nel secchio qualcosa si contorce. Ti guarda con un occhio solo, poi si arrotola e sparisce oltre il bordo.`]), 'warn'); loseLuc(6, `qualcosa nel secchio`); heartSfx(.7); }
  const L = BUCKETS[S.bucket].s * 10;
  addLiters(L);
  if (BUCKETS[S.bucket].org) loseLuc(.3, `il secchio che respira`);
  const ch = .05 + phase*.022;
  if (phase >= 0 && Math.random() < ch && S.d > 2){ const unseen = FINDS.map((f,i)=>i).filter(i=>!S.relics.includes(i)); let pool = unseen.filter(i=>FINDS[i][0]<=phase && FINDS[i][0]>=phase-1); if (!pool.length) pool = unseen.filter(i=>FINDS[i][0]<=phase+1); if (pool.length){ const fi = pick(pool); showFind(fi); loseLuc(2+phase, `ciò che era nel secchio`); if (phase>=2) whisperSfx(1.5,.15); } }
  if (holdBucket) setTimeout(throwBucket, 30);
}
function addLiters(L){
  const space = S.contract ? Infinity : Math.max(0, tankCap() - S.tank);
  const take = Math.min(L, space);
  if (take <= 0) return 0;
  S.tank += take; S.total += take;
  let rem = take;
  while (rem > 0 && S.d < MAXD){ const need = LPM(S.d); const step = Math.min(rem, need*.25); S.d += step/need; rem -= step; }
  S.d = Math.min(S.d, MAXD);
  return take;
}
const pumpRate = () => PUMPS.reduce((s,p,i)=> s + p.r*S.pumps[i], 0);

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
  knock:[1.5,null,80,5,1], prints:[1.5,null,130,4,1], music:[1.5,n=>n||phase>=1,140,2,1], silent:[3,null,260,2,.8], tug:[2,null,70,3,.8], fish:[4,null,170,2,1],
  behind:[5,null,95,3,1.2], hand:[8,null,85,3,1.2], torch:[8,n=>n,110,3,1], sublim:[8,null,70,6,.6], green:[8,n=>n,120,2,.8], left:[8,null,240,1,1],
  bodies:[12,null,170,2,1], dg:[12,n=>n,220,2,1.2], fog:[12,null,180,2,1], lost:[12,()=>S.luc<65,320,1,1], car:[12,n=>n&&S.revealed.includes('car'),200,1,1],
  titan:[10,null,150,3,1.3], levx:[18,()=>!LEV.on,110,3,1.2], mouth:[35,null,120,2,1.1], blood:[35,null,160,2,1], breath:[35,null,150,2,1], dock:[35,n=>n,200,2,1],
  bump:[3,null,60,4,1.3], tentRaft:[9,null,110,3,1.3], surfEye:[14,null,120,3,1.2], hands:[20,null,150,2,1.2], rowboat:[6,null,200,2,1.1], selfCorpse:[25,null,400,1,1.3],
  rain:[15,null,220,2,1], starsOut:[30,n=>n,240,1,1.2], swarm:[18,null,160,2,1.1], silence:[6,null,200,2,1], neck:[4,null,140,3,1.1], tide:[10,null,150,2,1],
  scrawl:[5,null,160,3,1], bucketThing:[8,null,120,3,1], bellNear:[22,null,200,2,1.1], reflection:[10,null,180,2,1.2],
  figure:[12,n=>(n||phase>=3)&&!wf.on,60,99,.6], flicker:[12,n=>n,60,99,.5], name:[35,null,160,3,1], ladder:[12,n=>n,220,2,1], scare:[65,()=>S.luc<30,110,99,.8],
  leviathan:[35,()=>!LEV.on,120,99,.7], eyes:[12,n=>n&&SE.t<=0,70,99,.7], chant:[35,null,90,99,.6], lightning:[2,n=>n,50,99,.5]
};
const OLD_EV = new Set(['figure','bubbles','flicker','bell','whisper','name','ladder','radio','glitch','scare','quake','lightning','leviathan','eyes','chant']);
function directorPick(night){
  const now = performance.now()/1000, cand = []; let tot = 0;
  for (const k in EV_DEF){ const [md, cond, cd, mx, w] = EV_DEF[k], c = S.evc[k]||0;
    if (S.d < md || c >= mx || (EV.cool[k]||0) > now || S.evRecent.includes(k) || (cond && !cond(night))) continue;
    const ww = w / (1 + c*1.2); cand.push([k, ww]); tot += ww; }
  if (!cand.length) return null;
  let r = Math.random()*tot; let e = cand[cand.length-1][0]; for (const [k,w] of cand){ r -= w; if (r <= 0){ e = k; break; } }
  EV.cool[e] = now + EV_DEF[e][2]; S.evc[e] = (S.evc[e]||0) + 1; S.evRecent.push(e); while (S.evRecent.length > 7) S.evRecent.shift();
  return e;
}
function runEvent(){
  const night = dayF < .5;
  if (X_.forceHand && !X_.hand){ X_.forceHand = false; startEv('hand'); return; }
  let e = (X_.big <= 0 && Math.random() < .78) ? directorPick(night) : null;
  if (!e){ const f = []; if (phase>=1) f.push('bubbles'); if (S.d > 20) f.push('bell'); if (phase>=1 && S.luc < 70) f.push('whisper'); if (phase>=2) f.push('radio','glitch'); if (phase>=4) f.push('quake'); if (!f.length) return; e = pick(f); }
  if (!OLD_EV.has(e)){ startEv(e); return; }
  if (e==='figure'){
    const sr = shoreR(S.d); let x, z, tries = 0;
    do { const a = rand(0,6.28), r = rand(4, Math.max(5, sr-4)); x = Math.cos(a)*r; z = Math.sin(a)*r; tries++; } while ((Math.hypot(x, z-CAM_BASE.z) < Math.min(22, sr*.8) || Math.abs(x) < 2) && tries < 40);
    waterFigure.position.set(x, water.position.y - .7, z); waterFigure.rotation.y = Math.atan2(CAM_BASE.x-x, CAM_BASE.z-z); waterFigure.visible = true; wf = {on:true, t:0, seen:0};
  }
  if (e==='bubbles'){ const sr = shoreR(S.d); const a = rand(0,6.28), r = rand(3, Math.max(4,sr*.7)); ripple(Math.cos(a)*r, Math.sin(a)*r, 2.2); bubbleSfx(); if (phase>=2) groanSfx(.25, 3); }
  if (e==='flicker'){ lampOverride = 2.5; creakSfx(); if (phase>=2 && Math.random()<.6){ blackT = 2.2; setTimeout(()=>{ paleFigure.position.set(.3, water.position.y - .25, raftPos.z - 2.6); paleFigure.rotation.y = 0; paleFigure.visible = true; paleT = 1.4; loseLuc(6, `era sulla zattera`); heartSfx(.7); }, 2200); } }
  if (e==='bell'){ bellSfx(1.6); loseLuc(2, `la campana`); }
  if (e==='whisper'){ whisperSfx(2.8,.25); sub(zalgo(pick(WHISPERS), S.luc < 40 ? 3 : 0), 3); loseLuc(1.5, `i sussurri`); }
  if (e==='name'){
    whisperSfx(3.5,.3); sub(`...Tobia... sono qui sotto... Tobia, rispondi...`, 4);
    setTimeout(()=> promptAsk(`Dall'acqua, sotto il pontile, qualcuno ti chiama per nome. Ha la voce di tua madre.`, `RISPONDI`, `TACI`, yes=>{
      if (yes){ scare(); loseLuc(25, `hai risposto`); setTimeout(()=>sub(`...ti abbiamo sentito...`, 3), 1500); }
      else { gainLuc(4, `non hai risposto`); setTimeout(()=>{ whisperSfx(1.5,.15); sub(`...la prossima volta...`, 3); }, 2500); }
    }), 2600);
  }
  if (e==='ladder'){
    promptAsk(`Nel fango, a pochi metri dalla zattera, c'è una busta della Ditta Sesti. Di notte non si scende dalla zattera.`, `SCENDI A PRENDERLA`, `RESTA SULLA ZATTERA`, yes=>{
      if (!yes) return;
      if (Math.random()<.55){ const bonus = Math.max(50, S.money*.25); S.money += bonus; loseLuc(15, `sei sceso dalla zattera`); toast(`Nella busta: € ${fmt(bonus)} e un biglietto. "Lo sapevamo che sarebbe sceso."`, 'find'); whisperSfx(2,.25); }
      else { scare(); loseLuc(30, `qualcosa ti ha afferrato`); toast(`Qualcosa ti ha afferrato la caviglia. Sei risalito. Non ricordi come.`, 'warn'); }
    });
  }
  if (e==='radio'){ staticSfx(1.5); toast(pick(RADIO_LINES)); }
  if (e==='glitch'){ glitchT = 1.6; play('glitch', {vol:.25, rev:.1}); }
  if (e==='scare'){ scare(); loseLuc(10, `l'hai visto`); }
  if (e==='quake'){ shakeAmt = 1; groanSfx(.7,4); creakSfx(); setTimeout(creakSfx,400); }
  if (e==='lightning'){ lightning(); }
  if (e==='leviathan'){ startLeviathan(); loseLuc(5, `qualcosa sotto di te`); }
  if (e==='eyes'){ startShoreEyes(); }
  if (e==='chant'){ choirBoost = 7; whisperSfx(5,.2); sub(zalgo(pick(CHANTS), 2+phase), 5); loseLuc(2, `il canto`); }
}
/* ---------- lampi ---------- */
let lightK = 0, lightSeq = [];
function lightning(withThunder=true){ const n = performance.now()/1000; lightSeq = [n, n+.11, n+.32 + Math.random()*.2]; if (withThunder) thunderSfx(rand(1,2.6), .8); }
function lightUpdate(dt){ const n = performance.now()/1000; let k = 0; for (const t0 of lightSeq){ const dtt = n - t0; if (dtt >= 0 && dtt < .5) k = Math.max(k, Math.exp(-dtt*14)*(t0===lightSeq[0]?1:.7)); } lightK = k; }
/* ---------- la cosa sotto l'acqua ---------- */
const LEV = { on:false, t:0, dur:14, a:new THREE.Vector2(), b:new THREE.Vector2(), r:8 };
function startLeviathan(){
  const sr = shoreR(S.d), cz = raftPos.z - Math.min(14, sr*.4);
  const ang = rand(0, Math.PI*2), span = Math.min(sr*.9, 45);
  LEV.a.set(Math.cos(ang)*span, cz + Math.sin(ang)*span*.4); LEV.b.set(-Math.cos(ang)*span, cz - Math.sin(ang)*span*.4);
  LEV.a.y -= sr*.15; LEV.b.y -= sr*.15;
  LEV.r = clamp(sr*.35, 6, 16); LEV.t = 0; LEV.dur = rand(12,17); LEV.on = true;
  deepCallSfx(.55); setTimeout(()=>bubbleSfx(), 3000);
}
function levUpdate(dt){
  if (!LEV.on){ waterU.uShadow.value.w = Math.max(0, waterU.uShadow.value.w - dt); return; }
  LEV.t += dt; const k = LEV.t/LEV.dur;
  const x = lerp(LEV.a.x, LEV.b.x, k), z = lerp(LEV.a.y, LEV.b.y, k);
  waterU.uShadow.value.set(x, z, LEV.r, Math.sin(Math.PI*clamp(k,0,1))*.95);
  waterU.uShadowA.value = -Math.atan2(LEV.b.y-LEV.a.y, LEV.b.x-LEV.a.x);
  if (Math.random() < dt*.8) ripple(x + rand(-LEV.r,LEV.r)*.5, z + rand(-LEV.r,LEV.r)*.3, 1.4);
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
const X_ = { big:0, hand:null, behind:null, prints:0, fish:0, bodies:0, mouth:null, dg:null, fog:0, green:0, torchKill:0, breath:0, breathPh:0, blood:0, dock:0, carL:0, left:null, tugNext:false, tug:0, amb:6, knocked:false };
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
{ const pg = new THREE.CircleGeometry(.07, 10); pg.scale(1,1.9,1); pg.rotateX(-Math.PI/2);
  for (let i=0;i<9;i++){ const z = 1.65 - i*.36, x = (i%2? .11 : -.11) + Math.sin(i*.7)*.15; const m = mesh(pg, printMat, x, .37, z); m.renderOrder = 3; prints.add(m);
    const toes = mesh(new THREE.CircleGeometry(.03,6).rotateX(-Math.PI/2), printMat, x, .371, z-.16); prints.add(toes); } }
// pesci morti
const FISH_N = 60;
const fishGeo = (()=>{ const b = new THREE.SphereGeometry(.16, 10, 6); b.scale(1.9,.55,.7); const t = new THREE.ConeGeometry(.09,.16,4); t.rotateZ(Math.PI/2); t.translate(-.29,0,0); return mergeGeometries([b.toNonIndexed(), t.toNonIndexed()]); })();
const fishMesh = new THREE.InstancedMesh(fishGeo, new THREE.MeshStandardMaterial({color:0x8a8e80, roughness:.35, metalness:.25, emissive:0x0a0b09}), FISH_N); fishMesh.count = 0; fishMesh.frustumCulled = false; scene.add(fishMesh);
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
const wfPos = new THREE.Vector3();

function startEv(name){
  const sr = shoreR(S.d);
  if (name==='hand'){ headObj.position.set(raftPos.x + rand(-1.5,1.5), waterY - .5, raftPos.z - rand(3.5,5)); headObj.visible = true; handObj.position.set(rand(-.9,.9), -.7, -1.66); handObj.rotation.set(0, rand(-.3,.3), 0); handObj.visible = true; X_.hand = {t:0, seen:0, gone:false}; X_.big = 11; setTimeout(()=>{ dripSfx(.2); knockSfx(.3); }, 600); setTimeout(()=>breathSfx(false,1.6,.18), 2500); }
  if (name==='behind'){ behindFig.position.set(rand(-.5,.5), .36, 1.35); behindFig.rotation.y = Math.PI; behindFig.visible = true; X_.behind = {t:0, seen:0}; X_.big = 10;
    [0,.8,1.7,2.4].forEach((d,i)=> setTimeout(()=>{ footstepSfx(); if (i%2) creakSfx(); }, d*1000)); setTimeout(()=>breathSfx(true,2.4,.14), 3000); setTimeout(()=>breathSfx(false,2.4,.12), 5600); }
  if (name==='prints'){ const pv = PRINTS[((S.evc.prints||1)-1) % PRINTS.length]; prints.scale.set(pv.s, 1, pv.s*(pv.rev?-1:1)); X_.prints = 30; dripSfx(.15); setTimeout(()=>dripSfx(.12), 400); setTimeout(()=>toast(pv.t), 2500); }
  if (name==='fish'){ fishData.length = 0; for (let i=0;i<FISH_N;i++){ const a = rand(0,Math.PI*2), r = rand(2.2, Math.min(11, sr*.5)); const x = raftPos.x + Math.cos(a)*r*1.3, z = raftPos.z - 5 + Math.sin(a)*r*.6; if (Math.hypot(x,z) > sr - 1) continue; fishData.push({x, z, ry:rand(0,6.3), ph:rand(0,6)}); }
    X_.fish = 32; bubbleSfx(); setTimeout(()=>toast(`Pesci morti affiorano tutti insieme, a pancia in su. Hanno gli occhi rivolti verso di te.`), 2500); }
  if (name==='bodies'){ floaters.forEach((c,i)=>{ const a = rand(0,Math.PI*2), r = rand(7, Math.min(22, sr*.6)); c.position.set(Math.cos(a)*r, waterY - .5, raftPos.z - 5 + Math.sin(a)*r*.7); c.rotation.set(0, rand(0,6.3), 0); c.userData.v = new THREE.Vector2(-c.position.x, raftPos.z - c.position.z).normalize().multiplyScalar(rand(.15,.3)); c.visible = true; });
    X_.bodies = 26; X_.big = 8; groanSfx(.3,4); setTimeout(()=>sub(`...siamo tornati a cena...`, 3), 3500); }
  if (name==='mouth'){ mouthObj.position.set(rand(-3,3), waterY, raftPos.z - rand(9,12)); mouthObj.scale.setScalar(.01); mouthObj.visible = true; X_.mouth = {t:0}; X_.big = 9; bubbleSfx(); setTimeout(()=>groanSfx(.6,4), 1200); }
  if (name==='dg'){ const a = rand(-.9,.9) - Math.PI/2, r = sr + 3; const far = new THREE.Vector3(Math.cos(a)*r, 0, Math.sin(a)*r); far.y = Math.max(H(far.x,far.z), waterY) ; X_.dg = { step:0, far, seen:false, away:0, t:0 }; dgObj.position.copy(far); dgObj.lookAt(camera.position.x, far.y, camera.position.z); dgObj.visible = true; X_.big = 30; }
  if (name==='fog'){ X_.fog = 18; X_.big = 18; fogFigs.forEach((f,i)=>{ f.userData.a = i/fogFigs.length*Math.PI*2; f.visible = true; }); whisperSfx(4,.2); setTimeout(()=>whisperSfx(4,.25), 5000); setTimeout(()=>sub(zalgo(`...siamo tutti qui... tutti intorno...`, phase>=3?2:0), 4), 6000); }
  if (name==='green'){ X_.green = 7; whisperSfx(3,.2); sub(zalgo(pick(CHANTS), 1), 4); }
  if (name==='torch'){ X_.torchKill = 4.5; play('click', {vol:.5, rev:.05}); setTimeout(()=>breathSfx(true,2,.2), 1200); setTimeout(()=>breathSfx(false,1.8,.22), 3000);
    setTimeout(()=>{ if (!running) return; paleFigure.position.set(rand(-.6,.6), waterY - .25, raftPos.z - 2.4); paleFigure.rotation.y = 0; paleFigure.visible = true; paleT = .9; heartSfx(.8); loseLuc(6, `era davanti a te`); }, 4500); }
  if (name==='knock'){ const pan = rand(-.4,.4), kv = KNOCKS[(S.evc.knock||1) % KNOCKS.length]; kv.p.forEach(d=> setTimeout(()=>{ knockSfx(kv.v, pan); shakeAmt = Math.max(shakeAmt,.25*kv.v); }, d*1000));
    if (kv.ask){ setTimeout(()=> promptAsk(kv.t, `BUSSA ANCHE TU`, `NON FARE NIENTE`, yes=>{
      if (yes){ [0,.4,.8,1.2].forEach(d=> setTimeout(()=>{ knockSfx(1, pan); shakeAmt = .5; }, 900 + d*1000)); setTimeout(()=>{ whisperSfx(2,.3); sub(`...grazie... ora possiamo salire...`, 3.5); loseLuc(8, `hai bussato`); EV.next = 6; X_.forceHand = true; }, 6000); }
      else { gainLuc(2, `non hai bussato`); setTimeout(()=>knockSfx(.4, pan), 5000); }
    }), 2200); } else setTimeout(()=>sub(kv.t, 4.5), 1800); }
  if (name==='lost'){ $('fade').style.transition = 'opacity .15s'; $('fade').style.opacity = 1; holdBucket = false; staticSfx(.6);
    setTimeout(()=>{ S.time += 110; yawT += Math.PI; yaw = yawT; X_.prints = 25; loseLuc(8, `tempo perduto`); $('fade').style.transition = 'opacity 1.5s'; $('fade').style.opacity = 0;
      toast(`Hai perso due ore. Hai i capelli bagnati e le mani piene di fango. Sei girato dall'altra parte.`, 'warn'); heartSfx(.6); }, 1900); }
  if (name==='music'){ musicBoxSfx(.18); setTimeout(()=>sub(`(un carillon suona, da qualche parte sotto l'acqua)`, 4), 1500); }
  if (name==='sublim'){ const el = $('subliminal'); el.textContent = pick(['TI VEDE','SCENDI','È SVEGLIO','NON VOLTARTI','SEI GIÀ QUI','CONTA','TOBIA']); el.classList.remove('hidden'); setTimeout(()=>el.classList.add('hidden'), 70); }
  if (name==='breath'){ X_.breath = 24; X_.big = 20; X_.breathPh = 0; setTimeout(()=>toast(`Il lago si alza e si abbassa. Lentamente. Respira.`, 'cosmic'), 3000); }
  if (name==='blood'){ X_.blood = 22; X_.big = 14; setTimeout(()=>toast(`L'acqua si è fatta scura. È calda, e ha l'odore del ferro.`, 'warn'), 2500); groanSfx(.3,5); }
  if (name==='dock'){ X_.dock = 30; dockFigs.forEach(f=>{ f.visible = true; f.lookAt(camera.position.x, 1.38, camera.position.z); }); bellSfx(1.4); setTimeout(()=>toast(`Lassù, sul pontile, c'è gente. Ti guardano lavorare. Indossano vestiti di settant'anni fa.`), 3000); }
  if (name==='car'){ X_.carL = 9; honkSfx(); setTimeout(()=>toast(`Nel fango, i fari della berlina si sono accesi.`), 1500); }
  if (name==='left'){ call(`DITTA SESTI`, `Signor Ferri. Non guardi alla sua sinistra. Per nessun motivo. Continui a lavorare.`);
    setTimeout(()=>{ if (!running) return; wfPos.set(raftPos.x - 6.5, waterY - .55, raftPos.z - 1.5); waterFigure.position.copy(wfPos); waterFigure.rotation.y = Math.atan2(raftPos.x-wfPos.x, raftPos.z-wfPos.z); waterFigure.visible = true; X_.left = {t:0, seen:0}; }, 9000); }
  if (name==='silent'){ call(`NUMERO SCONOSCIUTO`, `. . . . . . . . . . (qualcuno respira, molto vicino al microfono. Si sente gocciolare.) . . . . . . . . . Tobia.`); }
  if (name==='tug'){ X_.tugNext = true; }
  if (name==='titan'){ startTitan(); }
  if (name==='bump'){ raftJolt = 1; knockSfx(1, 0); groanSfx(.45, 3); setTimeout(()=>bubbleSfx(), 600); loseLuc(4, `qualcosa ha urtato la zattera da sotto`); setTimeout(()=>sub(pick([`(qualcosa di enorme è passato sotto la zattera e l'ha sfiorata)`,`(il legno ha tremato. Sotto, qualcosa si è girato nel sonno)`,`(un urto da sotto. Come una schiena che si inarca)`]), 4), 900); }
  if (name==='tentRaft'){ tentRaft.position.set(rand(-.6,.6), 0, -1.75); tentRaft.rotation.set(0, Math.PI + rand(-.4,.4), 0); tentRaft.visible = true; X_.tentR = {t:0, seen:0, gone:false}; X_.big = 10; dripSfx(.25); setTimeout(()=>creakSfx(), 700); }
  if (name==='surfEye'){ const dx = rand(-2.5,2.5); surfEye.position.set(raftPos.x + dx, waterY + .03, raftPos.z - rand(4,6)); surfEye.rotation.y = rand(-.3,.3); surfEye.scale.set(1,1,.02); surfEye.visible = true; X_.sEye = {t:0}; X_.big = 9; bubbleSfx(); setTimeout(()=>heartSfx(.7), 1500); }
  if (name==='hands'){ handData.length = 0; for (let i=0;i<HANDS_N;i++){ const a = i/HANDS_N*Math.PI*2 + rand(-.15,.15), r = rand(2.6,5.5); handData.push({x:raftPos.x + Math.cos(a)*r, z:raftPos.z + Math.sin(a)*r, ry:rand(0,6.3), d:rand(0,1.2), sp:rand(.8,1.3)}); }
    X_.hands = {t:0}; X_.big = 12; whisperSfx(3,.25); setTimeout(()=>sub(`(mani. Tutto intorno alla zattera. Si aprono verso di te)`, 4), 1500); }
  if (name==='rowboat'){ const sgn = Math.random()<.5?-1:1; X_.boat = {t:0, a:new THREE.Vector3(raftPos.x + sgn*28, waterY, raftPos.z - 13), b:new THREE.Vector3(raftPos.x - sgn*28, waterY, raftPos.z - 11)}; rowboat.visible = true; X_.big = 26; setTimeout(()=>toast(pick([`Una barca a remi scivola sul lago, senza remi. C'è qualcuno seduto. Ha una lanterna.`,`Una barca passa lenta davanti a te. Chi c'è sopra non rema. Gira la testa mentre ti passa davanti.`])), 3000); }
  if (name==='selfCorpse'){ floaters.forEach(f=>f.visible = false); const c = floaters[0]; c.position.set(raftPos.x + rand(-4,4), waterY - .1, raftPos.z - 9); c.rotation.set(0, rand(0,6.3), 0); c.userData.v = new THREE.Vector2(0, .35); c.visible = true; X_.bodies = 22; X_.big = 14; setTimeout(()=>toast(`Un corpo galleggia verso la zattera, a faccia in su. Indossa la tua tuta. Ha la tua faccia, gonfia d'acqua. Sorride.`, 'warn'), 4000); setTimeout(()=>loseLuc(6, `il tuo corpo`), 4200); }
  if (name==='rain'){ X_.rain = 22; X_.big = 20; rain.visible = true; setTimeout(()=>toast(`Piove. Le gocce sono nere e calde. È acqua che cade dal basso verso l'alto, e poi ricade.`, 'cosmic'), 2500); sfxNoise({dur:20, f:1800, q:.4, vol:.08, a:3, rev:.2}); }
  if (name==='starsOut'){ X_.stars = 20; X_.big = 18; setTimeout(()=>toast(`Le stelle si stanno spegnendo. Una alla volta. Come occhi che si chiudono per non guardare.`, 'cosmic'), 2000); deepCallSfx(.4); }
  if (name==='swarm'){ swarmD.length = 0; for (let i=0;i<SWARM_N;i++){ const a = rand(0,Math.PI*2), r = rand(12,26); swarmD.push({s:new THREE.Vector3(raftPos.x+Math.cos(a)*r, waterY-rand(2,5), raftPos.z+Math.sin(a)*r*.6 - 6), ph:rand(0,6), k:i/SWARM_N}); } X_.swarm = {t:0}; X_.big = 18; setTimeout(()=>sub(`(luci, sotto l'acqua. Si radunano sotto di te)`, 4), 2500); }
  if (name==='silence'){ silence(9); X_.big = 12; setTimeout(()=>{ breathSfx(false, 2.2, .35); sub(`...Tobia...`, 2.5); }, 8200); setTimeout(()=>loseLuc(3, `il silenzio`), 8500); }
  if (name==='neck'){ breathSfx(true, 2, .32); setTimeout(()=>breathSfx(false, 2.2, .35), 2200); shakeAmt = .3; X_.neck = {t:0, turned:false}; X_.big = 8; sub(`(qualcosa ti respira sul collo)`, 3.5); }
  if (name==='tide'){ tideK = 0; X_.tide = {t:0}; X_.big = 8; rumbleSfx(5,.5); setTimeout(()=>{ splashSfx(3, 50); splashSfx(6, 30); }, 1700); setTimeout(()=>toast(`L'acqua è salita di colpo. Poi è tornata giù. Come un respiro trattenuto.`), 4500); }
  if (name==='scrawl'){ const w = pick([`TOBIA`,`SCENDI`,`TI ASPETTIAMO`,`NON CONTARE`,`QUASI`,`SVEGLIALO`]); writeName(w); X_.name = 28; dripSfx(.2); setTimeout(()=>toast(`Sulle assi, davanti a te, qualcuno ha scritto con l'acqua: ${w}.`), 1500); }
  if (name==='bucketThing'){ X_.thingNext = true; }
  if (name==='bellNear'){ [0,4,8,12].forEach((d,i)=> setTimeout(()=>{ bellSfx(2.2 - i*.4); ripple(raftPos.x + rand(-6,6), raftPos.z - 12 + i*3, 1 + i*.6); if (i===3){ raftJolt = .7; loseLuc(4, `la campana sotto di te`); } }, d*1000)); X_.big = 15; setTimeout(()=>sub(`(la campana suona sott'acqua. Ogni rintocco è più vicino)`, 4), 1200); }
  if (name==='reflection'){ reflFig.position.set(raftPos.x + rand(-.5,.5), waterY - .04, raftPos.z - 4.2); reflFig.rotation.set(Math.PI, Math.PI, 0); reflFig.visible = true; X_.refl = {t:0}; X_.big = 11; setTimeout(()=>sub(`(nell'acqua, davanti a te, il riflesso di qualcuno in piedi alle tue spalle)`, 4.5), 1200); }
  if (name==='levx'){ startLeviathan(); loseLuc(5, `qualcosa sotto di te`); setTimeout(()=>sub(`(qualcosa di lungo quanto il paese passa sotto la zattera)`, 4), 3000); }
}
function eventsUpdate(dt){
  if (X_.big > 0) X_.big -= dt;
  // mano
  if (X_.hand){ const h = X_.hand; h.t += dt; handObj.getWorldPosition(wfPos);
    if (!h.gone){ handObj.position.y = lerp(-.7, .375, smooth(0, 1.4, h.t)); raft.rotation.x += Math.sin(T*3)*.004*smooth(1,2,h.t);
      headObj.position.y = waterY - .5 + smooth(.5, 3.5, h.t)*.62; headObj.lookAt(camera.position);
      if (h.t > 3.2 && S.torchOn && (lookingAt(wfPos, .96) || lookingAt(headObj.position, .985))) h.seen += dt;
      if (h.seen > 1.3){ h.gone = true; h.tg = h.t; splashSfx(4); ripple(wfPos.x, wfPos.z, 1); gainLuc(1, `l'hai ricacciato giù`); }
      else if (h.t > 10){ h.gone = true; h.tg = h.t; shakeAmt = 1; splashSfx(3); creakSfx(); loseLuc(10, `qualcosa è salito`); toast(`Qualcosa ha provato a salire sulla zattera. Ha lasciato i segni delle unghie nel legno.`, 'warn'); X_.prints = 20; }
    } else { handObj.position.y -= dt*2; headObj.position.y -= dt*1.5; if (h.t - h.tg > .6){ handObj.visible = false; headObj.visible = false; X_.hand = null; } } }
  // figura alle spalle
  if (X_.behind){ const b = X_.behind; b.t += dt; camera.getWorldDirection(fwd);
    if (fwd.z > .45){ b.seen += dt; behindFig.position.z = Math.max(.6, behindFig.position.z - dt*.9); if (b.seen > .75 && behindFig.visible){ behindFig.visible = false; heartSfx(.9); stingerSfx(); loseLuc(7, `era alle tue spalle`); postMat.uniforms.uFlash.value = .15; b.done = true; } }
    if (b.t > 9 || b.done){ if (!b.done){ whisperSfx(1.8,.35); sub(`...non voltarti... non voltarti mai...`, 3); loseLuc(3, `qualcosa alle tue spalle`); } behindFig.visible = false; X_.behind = null; } }
  // impronte
  if (X_.prints > 0){ X_.prints -= dt; printMat.opacity = Math.min(.75, X_.prints/6) * Math.min(1, (30 - X_.prints)*2 + .5); } else printMat.opacity = 0;
  // pesci
  if (X_.fish > 0){ X_.fish -= dt; const sink = X_.fish < 4 ? (4 - X_.fish)*.15 : 0, rise = X_.fish > 28 ? (X_.fish - 28)*.12 : 0;
    fishData.forEach((f,i)=>{ seObj.position.set(f.x, waterY + .02 - sink - rise + Math.sin(T*1.3+f.ph)*.02, f.z); seObj.rotation.set(Math.sin(T+f.ph)*.1, f.ry, Math.PI); seObj.scale.setScalar(1); seObj.updateMatrix(); fishMesh.setMatrixAt(i, seObj.matrix); });
    fishMesh.count = fishData.length; fishMesh.instanceMatrix.needsUpdate = true; } else fishMesh.count = 0;
  // corpi
  if (X_.bodies > 0){ X_.bodies -= dt; floaters.forEach(c=>{ if (!c.visible || !c.userData.v) return; c.position.x += c.userData.v.x*dt; c.position.z += c.userData.v.y*dt; c.position.y = waterY - .12 - (X_.bodies < 4 ? (4-X_.bodies)*.3 : 0) + Math.sin(T+c.position.x)*.03; c.rotation.z = Math.sin(T*.7+c.position.z)*.05; if (Math.hypot(c.position.x - raftPos.x, c.position.z - raftPos.z) < 3) c.userData.v.multiplyScalar(.97); }); if (X_.bodies <= 0) floaters.forEach(c=>c.visible = false); }
  // bocca
  if (X_.mouth){ const m = X_.mouth; m.t += dt; const open = smooth(0,2.5,m.t) * (1 - smooth(6,7.5,m.t)); mouthObj.scale.set(open+.01, 1, open+.01); mouthObj.position.y = waterY + .02 - smooth(6.5,9,m.t)*1.5; mouthObj.rotation.y += dt*.2;
    if (m.t > 3 && m.t < 3.1) { loseLuc(8, `la bocca`); heartSfx(.6); }
    if (m.t > 9){ mouthObj.visible = false; X_.mouth = null; bubbleSfx(); } }
  // il doppio
  if (X_.dg){ const d = X_.dg; d.t += dt; dgObj.getWorldPosition(wfPos); wfPos.y += 1.2; const look = lookingAt(wfPos, .985);
    if (look){ d.seen = true; d.away = 0; } else if (d.seen){ d.away += dt; if (d.away > 1.4){ d.seen = false; d.away = 0; d.step++;
        const k = d.step/4, tx = lerp(d.far.x, raftPos.x + rand(-1,1), k), tz = lerp(d.far.z, raftPos.z - 2.6, k); dgObj.position.set(tx, d.step >= 4 ? waterY - .3 : Math.max(H(tx,tz), waterY - .3), tz); dgObj.lookAt(camera.position.x, dgObj.position.y, camera.position.z); creakSfx(); if (d.step >= 2) heartSfx(.4 + d.step*.1); } }
    if (d.step >= 4 && look){ scare(); loseLuc(12, `la figura con la lanterna`); dgObj.visible = false; X_.dg = null; }
    else if (d.t > 70){ dgObj.visible = false; X_.dg = null; } }
  // nebbia con le figure
  if (X_.fog > 0){ X_.fog -= dt; fogFigs.forEach((f,i)=>{ f.userData.a += dt*.12; const r = 7 + Math.sin(T*.5+i)*1.5; f.position.set(raftPos.x + Math.cos(f.userData.a)*r, waterY - .9, raftPos.z + Math.sin(f.userData.a)*r); f.lookAt(camera.position.x, f.position.y, camera.position.z); }); if (X_.fog <= 0) fogFigs.forEach(f=>f.visible = false); }
  if (X_.green > 0) X_.green -= dt;
  if (X_.torchKill > 0) X_.torchKill -= dt;
  if (X_.carL > 0){ X_.carL -= dt; carLightMat.emissiveIntensity = (Math.random() < .1 ? 0 : 6) * Math.min(1, X_.carL); } else carLightMat.emissiveIntensity = 0;
  if (X_.blood > 0){ X_.blood -= dt; waterU.uBlood.value = smooth(22,18,X_.blood) * smooth(0,4,X_.blood) * .85; } else waterU.uBlood.value = 0;
  if (X_.dock > 0){ X_.dock -= dt; if (X_.dock <= 0 || (dayF > .5 && phase < 3)){ X_.dock = 0; dockFigs.forEach(f=>f.visible = false); } }
  if (X_.breath > 0){ X_.breath -= dt; const ph = (X_.breathPh += dt) / 5.5; const prev = Math.floor((X_.breathPh - dt)/5.5*2); if (Math.floor(ph*2) !== prev) breathSfx(Math.floor(ph*2)%2===0, 2.6, .28); }
  if (X_.left){ const l = X_.left; l.t += dt; if (S.torchOn && lookingAt(waterFigure.position, .96)) l.seen += dt;
    if (l.seen > .4){ waterFigure.visible = false; X_.left = null; heartSfx(.9); whisperSfx(1.5,.3); sub(`...ti aveva detto di non guardare...`, 3); loseLuc(9, `hai guardato`); }
    else if (l.t > 14){ waterFigure.visible = false; X_.left = null; call(`DITTA SESTI`, `Bravo. Non l'ha guardato. Lui però ha guardato lei.`); } }
  // nuovi eventi
  if (X_.tentR){ const e = X_.tentR; e.t += dt; tentRaft.getWorldPosition(wfPos); wfPos.y += .3;
    const up = e.gone ? Math.max(0, 1 - (e.t - e.tg)*1.5) : smooth(0, 2.5, e.t); tentRaft.position.y = -1.4 + up*1.4; tentRaft.scale.set(1, 1, .4 + up*.6);
    if (!e.gone && e.t > 2 && S.torchOn && lookingAt(wfPos, .95)) e.seen += dt;
    if (!e.gone && (e.seen > 1.2 || e.t > 9)){ e.gone = true; e.tg = e.t; splashSfx(3, 8); if (e.seen > 1.2) gainLuc(2, `l'hai ricacciato giù`); else { raftJolt = .6; loseLuc(8, `il tentacolo sulla zattera`); } }
    if (e.gone && e.t - e.tg > .8){ tentRaft.visible = false; X_.tentR = null; } }
  if (X_.sEye){ const e = X_.sEye; e.t += dt; const open = smooth(.5,2.5,e.t) * (1 - smooth(6,7,e.t)) * (Math.abs(Math.sin(e.t*.9)) > .97 ? .1 : 1); surfEye.scale.set(1,1,Math.max(.02,open)); surfEye.material.opacity = Math.min(1, open*1.2); surfEye.position.y = waterY + .03;
    if (e.t > 3 && e.t < 3.05 && lookingAt(surfEye.position, .93)) loseLuc(6, `l'occhio nell'acqua`); if (e.t > 7){ surfEye.visible = false; X_.sEye = null; ripple(surfEye.position.x, surfEye.position.z, 1.2); } }
  if (X_.hands){ const e = X_.hands; e.t += dt; let c = 0; handData.forEach(h=>{ const u = clamp((e.t - h.d)*h.sp, 0, 1), dn = smooth(8,10,e.t); const y = waterY - 1.6 + smooth(0,1,u)*2.4 - dn*2.6 + Math.sin(T*2+h.ry)*.03;
      seObj.position.set(h.x, y, h.z); seObj.rotation.set(Math.sin(T+h.ry)*.15, h.ry, Math.cos(T*.8+h.ry)*.15); seObj.scale.setScalar(1.6); seObj.updateMatrix(); hands.setMatrixAt(c++, seObj.matrix); });
    hands.count = c; hands.instanceMatrix.needsUpdate = true; if (e.t > 3 && e.t < 3.05) loseLuc(5, `le mani nell'acqua`); if (e.t > 10.5){ hands.count = 0; X_.hands = null; } }
  if (X_.boat){ const e = X_.boat; e.t += dt; const k = e.t/24; rowboat.position.lerpVectors(e.a, e.b, k); rowboat.position.y = waterY + .05 + Math.sin(T*.8)*.04; rowboat.rotation.y = Math.atan2(e.b.x-e.a.x, e.b.z-e.a.z); rowboat.rotation.z = Math.sin(T*.6)*.03;
    const f = rowboat.userData.fig; const want = Math.atan2(camera.position.x - rowboat.position.x, camera.position.z - rowboat.position.z) - rowboat.rotation.y; f.rotation.y += (want - f.rotation.y)*Math.min(1, dt*.6);
    if (k > .5 && !e.l){ e.l = 1; loseLuc(4, `la barca`); whisperSfx(2,.2); } if (k >= 1){ rowboat.visible = false; X_.boat = null; } }
  if (X_.rain > 0){ X_.rain -= dt; const a = rainGeo.attributes.position; const fade = Math.min(1, X_.rain/3, (22 - X_.rain)/2);
    rainP.forEach((p,i)=>{ p.y -= dt*14; if (p.y < -2){ p.y = rand(16,22); p.x = rand(-25,25); p.z = rand(-25,25); } const x = camera.position.x + p.x, z = camera.position.z + p.z, y = Math.max(waterY, camera.position.y + p.y - 6); a.setXYZ(i*2, x, y, z); a.setXYZ(i*2+1, x, y + .5, z); });
    a.needsUpdate = true; rain.material.opacity = .7*fade; if (Math.random() < dt*6) ripple(raftPos.x + rand(-10,10), raftPos.z - rand(2,14), .3); if (X_.rain <= 0) rain.visible = false; }
  if (X_.stars > 0){ X_.stars -= dt; skyU.uOut.value = smooth(20,10,X_.stars) * smooth(0,3,X_.stars); } else skyU.uOut.value = 0;
  if (X_.swarm){ const e = X_.swarm; e.t += dt; const gather = smooth(1,8,e.t) * (1 - smooth(12,16,e.t)); let c = 0;
    swarmD.forEach(d=>{ const a = d.k*Math.PI*2 + e.t*.4, ring = new THREE.Vector3(raftPos.x + Math.cos(a)*(5+Math.sin(d.k*12)*1.2), waterY - 1.8, raftPos.z - 6 + Math.sin(a)*(3+Math.cos(d.k*12)*.7));
      tmpV.lerpVectors(d.s, ring, gather); tmpV.y += Math.sin(T*2+d.ph)*.2; seObj.position.copy(tmpV); seObj.rotation.set(0,0,0); seObj.scale.setScalar(.8 + .4*Math.sin(T*3+d.ph)); seObj.updateMatrix(); swarm.setMatrixAt(c++, seObj.matrix); });
    swarm.count = c; swarm.instanceMatrix.needsUpdate = true; if (e.t > 8 && e.t < 8.05){ loseLuc(4, `le luci sotto di te`); raftJolt = .3; } if (e.t > 16){ swarm.count = 0; X_.swarm = null; } }
  if (X_.neck){ const e = X_.neck; e.t += dt; camera.getWorldDirection(fwd); if (fwd.z > .45 && !e.turned){ e.turned = true; whisperSfx(1,.3); sub(`(non c'è nessuno. Ma sul legno, dietro di te, l'acqua sgocciola)`, 3.5); }
    if (e.t > 5){ if (!e.turned) loseLuc(5, `qualcosa ti ha respirato addosso`); X_.neck = null; } }
  if (X_.tide){ const e = X_.tide; e.t += dt; tideK = Math.sin(Math.PI*clamp(e.t/4.5, 0, 1)) * .9; if (e.t > 4.5){ tideK = 0; X_.tide = null; } }
  if (X_.name > 0){ X_.name -= dt; nameMat.opacity = Math.min(.8, X_.name/5) * Math.min(1, (28 - X_.name)*.5); } else nameMat.opacity = 0;
  if (X_.refl){ const e = X_.refl; e.t += dt; reflFig.position.y = waterY - .04; camera.getWorldDirection(fwd);
    if (fwd.z > .45 && !e.turned){ e.turned = true; reflFig.visible = false; behindFig.position.set(0, .36, 1.3); behindFig.rotation.y = Math.PI; behindFig.visible = true; stingerSfx(); loseLuc(8, `era davvero alle tue spalle`); setTimeout(()=>{ behindFig.visible = false; }, 350); }
    if (e.t > 9 || e.turned){ if (!e.turned) whisperSfx(1.5,.2); reflFig.visible = false; X_.refl = null; } }
  if (raftJolt > 0) raftJolt = Math.max(0, raftJolt - dt*1.4);
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
  { s:.62, t:`Impronte piccole, di bambino, girano attorno a dove stai seduto. Tre giri. Poi tornano in acqua.` },
  { s:1.45, t:`Impronte larghe, con la membrana tra le dita. Sono uscite dall'acqua e ci sono tornate. Dove stavi tu.` },
  { s:1, rev:true, t:`Impronte bagnate che partono da dove sei seduto e finiscono in acqua. Sono della tua misura.` } ];
/* ---------- nuovi eventi: la creatura, il lago, il cielo ---------- */
let raftJolt = 0, tideK = 0;
const tentRaft = (()=>{ const pts = []; for (let k=0;k<=10;k++){ const t = k/10; pts.push(new THREE.Vector3(Math.sin(t*2)*.2, -1.6 + t*2.1 - Math.max(0,t-.6)*1.8, t*1.6)); }
  const cv = new THREE.CatmullRomCurve3(pts), g = tube(pts, .17, .015, 40, 8); const m = new THREE.Mesh(g, M.tentacle); m.visible = false; raft.add(m); return m; })();
const surfEye = mesh(new THREE.PlaneGeometry(5,5).rotateX(-Math.PI/2), new THREE.MeshBasicMaterial({map:deepEyeTex0(), color:new THREE.Color(3,3,3), transparent:true, depthWrite:false})); surfEye.visible = false; surfEye.renderOrder = 3; scene.add(surfEye);
function deepEyeTex0(){ const c = document.createElement('canvas'); c.width = c.height = 256; const X = c.getContext('2d');
  const g = X.createRadialGradient(128,128,8,128,128,128); g.addColorStop(0,'rgba(255,230,120,1)'); g.addColorStop(.3,'rgba(210,110,20,.95)'); g.addColorStop(.48,'rgba(70,30,5,.8)'); g.addColorStop(.62,'rgba(150,140,110,.7)'); g.addColorStop(1,'rgba(0,0,0,0)');
  X.fillStyle = g; X.beginPath(); X.ellipse(128,128,128,70,0,0,7); X.fill(); X.strokeStyle='rgba(140,20,20,.6)'; X.lineWidth=2; for (let i=0;i<20;i++){ const a = Math.random()*6.28; X.beginPath(); X.moveTo(128+Math.cos(a)*120, 128+Math.sin(a)*60); X.quadraticCurveTo(128+Math.cos(a+.2)*80, 128+Math.sin(a+.2)*45, 128+Math.cos(a)*50, 128+Math.sin(a)*30); X.stroke(); }
  X.fillStyle = '#000'; X.beginPath(); X.ellipse(128,128,10,58,0,0,7); X.fill(); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
const handGeo = (()=>{ const P = []; const palm = new THREE.BoxGeometry(.13,.16,.04); palm.translate(0,.08,0); P.push(palm);
  for (let f=0; f<4; f++){ const fg = new THREE.CylinderGeometry(.011,.014,.17,5); fg.translate(-.045+f*.03, .24, 0); fg.rotateZ((f-1.5)*.08); P.push(fg); }
  const th = new THREE.CylinderGeometry(.012,.015,.1,5); th.rotateZ(.9); th.translate(-.09,.1,0); P.push(th);
  const arm = new THREE.CylinderGeometry(.04,.05,1.4,6); arm.translate(0,-.7,0); P.push(arm); return mergeGeometries(P.map(q=>q.index?q.toNonIndexed():q)); })();
const HANDS_N = 16, hands = new THREE.InstancedMesh(handGeo, wetMat0(), HANDS_N); hands.count = 0; hands.frustumCulled = false; scene.add(hands); const handData = [];
function wetMat0(){ return new THREE.MeshStandardMaterial({color:0x6b7465, roughness:.3, metalness:.05}); }
const rowboat = (()=>{ const g = new THREE.Group(); const hull = new THREE.Mesh(new THREE.SphereGeometry(1,16,8,0,Math.PI*2,Math.PI/2,Math.PI/2), M.wood); hull.scale.set(.75,.45,2.1); g.add(hull);
  g.add(mesh(new THREE.BoxGeometry(1.3,.06,.3), M.woodDark, 0,-.05,.3)); const f = mesh(figureGeo(1.9, 1.5), ghoulMat, 0,-.25,.3); f.scale.setScalar(.85); g.add(f); g.userData.fig = f;
  g.add(mesh(new THREE.SphereGeometry(.07,8,6), new THREE.MeshBasicMaterial({color:new THREE.Color(5,3,1.2)}), .45,.25,-1.2)); g.visible = false; scene.add(g); return g; })();
const RAIN_N = 700, rainGeo = new THREE.BufferGeometry(); rainGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(RAIN_N*6), 3));
const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({color:0x1a1f1c, transparent:true, opacity:.75})); rain.visible = false; rain.frustumCulled = false; scene.add(rain); const rainP = [];
for (let i=0;i<RAIN_N;i++) rainP.push(new THREE.Vector3(rand(-25,25), rand(0,22), rand(-25,25)));
const SWARM_N = 48, swarm = new THREE.InstancedMesh(new THREE.SphereGeometry(.3,8,6), new THREE.MeshBasicMaterial({color:new THREE.Color(.5,2.6,1.4)}), SWARM_N); swarm.count = 0; swarm.frustumCulled = false; scene.add(swarm); const swarmD = [];
const nameTex = document.createElement('canvas'); nameTex.width = 512; nameTex.height = 128;
const nameMat = new THREE.MeshBasicMaterial({ map:new THREE.CanvasTexture(nameTex), transparent:true, opacity:0, depthWrite:false, color:0x000000 });
const nameDecal = mesh(new THREE.PlaneGeometry(2.4,.6).rotateX(-Math.PI/2), nameMat, 0,.372,-.95); nameDecal.renderOrder = 4; raft.add(nameDecal);
const reflFig = mesh(figureGeo(2.4, 1.2), new THREE.MeshBasicMaterial({color:new THREE.Color(.42,.46,.42)})); reflFig.rotation.x = Math.PI; reflFig.visible = false; scene.add(reflFig); reflFig.add(mesh(eyePairGeo, eyeGlowMat, ...eyeAt(2.4, 1.2)));
const bucketTent = (()=>{ const pts = []; for (let k=0;k<=6;k++){ const t = k/6; pts.push(new THREE.Vector3(Math.sin(t*4)*.06, .15 + t*.35, Math.cos(t*3)*.04)); } const m = new THREE.Mesh(tube(pts, .045, .006, 16, 6), M.tentacle); m.visible = false; bucket.add(m); return m; })();
function writeName(word){ const X = nameTex.getContext('2d'); X.clearRect(0,0,512,128); X.fillStyle = '#fff'; X.font = 'bold 86px serif'; X.textAlign = 'center'; X.textBaseline = 'middle';
  for (let i=0;i<5;i++){ X.globalAlpha = .25; X.fillText(word, 256 + rand(-4,4), 64 + rand(-4,4)); } X.globalAlpha = 1; for (let i=0;i<40;i++){ X.fillRect(rand(40,470), rand(70,124), 2, rand(6,30)); } nameMat.map.needsUpdate = true; }
const EV_CD = {};
const ok = (k, sec) => { EV_CD[k] = sec; return (EV.cool[k]||0) <= performance.now()/1000; };
/* ---------- le cose enormi ---------- */
// un tentacolo alto quanto il campanile
const titan = (()=>{ const pts = []; for (let k=0;k<=12;k++){ const t = k/12; pts.push(new THREE.Vector3(Math.sin(t*2.4)*7*t, t*72, Math.cos(t*1.8)*3.5*t)); }
  const cv = new THREE.CatmullRomCurve3(pts), SEG = 90, RAD = 12, g = new THREE.TubeGeometry(cv, SEG, 3.8, RAD, false), tp = g.attributes.position;
  for (let v=0; v<tp.count; v++){ const ring = Math.floor(v/(RAD+1)), t = ring/SEG, c = cv.getPointAt(t), k = 1 - t*.93; tp.setXYZ(v, c.x+(tp.getX(v)-c.x)*k, c.y+(tp.getY(v)-c.y)*k, c.z+(tp.getZ(v)-c.z)*k); }
  g.computeVertexNormals(); const m = new THREE.Mesh(g, M.tentacle); m.visible = false; m.frustumCulled = false; scene.add(m); return m; })();
// la creatura che nuota sotto la zattera
const creatureMat = new THREE.MeshStandardMaterial({color:0x0d1310, roughness:.35, metalness:.1});
const creature = (()=>{ const g = new THREE.Group();
  const b = mesh(new THREE.SphereGeometry(1,24,16), creatureMat); b.scale.set(6.5,3.2,21); g.add(b);
  const hd = mesh(new THREE.SphereGeometry(1,18,12), creatureMat, 0,.8,19); hd.scale.set(5,3.4,6); g.add(hd);
  const spots = []; for (let i=0;i<46;i++){ const t = i/46, z = lerp(-18, 22, t); const sp = new THREE.SphereGeometry(.35,6,4); sp.translate((i%2?1:-1)*(2+Math.sin(t*9)*1.5), 2.6*Math.cos((z/21)*1.4)+.5, z); spots.push(sp); }
  g.add(new THREE.Mesh(mergeGeometries(spots), new THREE.MeshBasicMaterial({color:new THREE.Color(.6,2.4,1.2)})));
  for (const sx of [-1,1]){ const e = mesh(new THREE.SphereGeometry(1.1,12,8), new THREE.MeshBasicMaterial({color:new THREE.Color(5,3.4,.8)}), sx*3.4,1.6,23); e.scale.set(1,.45,.6); g.add(e); }
  for (let k=0;k<10;k++){ const a = k/10*Math.PI*2, pts = []; for (let j=0;j<=6;j++){ const t = j/6; pts.push(new THREE.Vector3(Math.cos(a)*(3+t*4) + Math.sin(t*5+k)*2, Math.sin(a)*2 - t*3, -18 - t*34)); }
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, .9 - k*.03, 6, false), creatureMat)); }
  g.visible = false; scene.add(g); return g; })();
// l'occhio che si apre nel nero, se guardi giù troppo a lungo
const deepEyeTex = (()=>{ const c = document.createElement('canvas'); c.width = c.height = 256; const X = c.getContext('2d');
  const g = X.createRadialGradient(128,128,10,128,128,128); g.addColorStop(0,'rgba(255,220,90,1)'); g.addColorStop(.32,'rgba(220,120,20,.95)'); g.addColorStop(.5,'rgba(90,40,5,.6)'); g.addColorStop(1,'rgba(0,0,0,0)');
  X.fillStyle = g; X.beginPath(); X.ellipse(128,128,128,62,0,0,7); X.fill(); X.fillStyle = '#000'; X.beginPath(); X.ellipse(128,128,9,56,0,0,7); X.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const deepEye = mesh(new THREE.PlaneGeometry(26,26).rotateX(-Math.PI/2), new THREE.MeshBasicMaterial({map:deepEyeTex, color:new THREE.Color(5,5,5), transparent:true, depthWrite:false}));
deepEye.visible = false; deepEye.userData.noCast = true; scene.add(deepEye);
let fovKick = 0, subBoost = 0, downT = 0;
function startTitan(){
  const sr = shoreR(S.d); let x = raftPos.x + rand(-30,30), z = raftPos.z - rand(35,65); const r = Math.hypot(x,z); if (r > sr - 5){ const k = Math.max(0, sr - 5)/r; x *= k; z *= k; }
  titan.position.set(x, waterY - 75, z); titan.rotation.y = rand(0, Math.PI*2); titan.visible = true; X_.titan = {t:0}; X_.big = 22;
  deepCallSfx(.9); rumbleSfx(14,.6); setTimeout(()=>groanSfx(.8,7), 2500); }
function startDeepEye(){
  const dir = new THREE.Vector2(-raftPos.x, -raftPos.z).normalize(), sr = shoreR(S.d), dist = Math.min(sr*.5, 22);
  const x = raftPos.x + dir.x*dist, z = raftPos.z + dir.y*dist; deepEye.position.set(x, Math.max(H(x,z) + .8, waterY - 22), z); deepEye.rotation.y = Math.atan2(dir.x, dir.y);
  deepEye.scale.set(1, 1, .02); deepEye.visible = true; X_.deepEye = {t:0}; heartSfx(.7); setTimeout(()=>deepCallSfx(.5), 800); }
function bigUpdate(dt){
  if (X_.titan){ const t = (X_.titan.t += dt); const rise = smooth(0,7,t) * (1 - smooth(14,20,t));
    titan.position.y = waterY - 75 + rise*60; shakeAmt = Math.max(shakeAmt, rise*.25); fovKick = Math.max(fovKick, rise*7); subBoost = Math.max(subBoost, rise*.35);
    if (Math.random() < dt*2*rise) ripple(titan.position.x + rand(-6,6), titan.position.z + rand(-6,6), 2.5);
    if (t > 4 && t < 4.05){ loseLuc(7, `il tentacolo`); sub(`(è alto come il campanile. E ce ne sono altri, sotto.)`, 5); }
    if (t > 20){ titan.visible = false; X_.titan = null; } }
  if (LEV.on){ const k = LEV.t/LEV.dur, sc = LEV.r/9; const x = lerp(LEV.a.x, LEV.b.x, k), z = lerp(LEV.a.y, LEV.b.y, k);
    const yb = H(x,z); creature.visible = true; creature.scale.setScalar(sc);
    creature.position.set(x, Math.min(waterY - 4*sc, Math.max(waterY - 11*sc, yb + 3.5*sc)), z); creature.rotation.y = Math.atan2(LEV.b.x-LEV.a.x, LEV.b.y-LEV.a.y);
    creature.rotation.z = Math.sin(T*.6)*.05; subBoost = Math.max(subBoost, Math.sin(Math.PI*clamp(k,0,1))*.4); fovKick = Math.max(fovKick, Math.sin(Math.PI*clamp(k,0,1))*3); }
  else creature.visible = false;
  if (X_.deepEye){ const t = (X_.deepEye.t += dt); const open = smooth(0,2.5,t) * (1 - smooth(5.5,6.5,t)); deepEye.scale.set(1, 1, Math.max(.02, open)); deepEye.material.opacity = open;
    if (t > 6.6){ deepEye.visible = false; X_.deepEye = null; } }
  // guardare giù: la vertigine
  const lookDown = running && !ending && pitch < -.55 && S.d > 12;
  downT = lookDown ? downT + dt : Math.max(0, downT - dt*2);
  if (downT > 2.8 && !X_.deepEye && cool('deepEye', 100)){ startDeepEye(); }
  // il Guardiano gira la testa quando non lo guardi
  colHead.getWorldPosition(wfPos); const seen = lookingAt(wfPos, .9);
  if (!seen){ const lx = camera.position.x - wfPos.x, lz = camera.position.z - wfPos.z; const target = clamp(Math.atan2(lx, lz), -1.1, 1.1) * clamp((S.d-6)/40, 0, 1);
    colHead.rotation.y += (target - colHead.rotation.y) * Math.min(1, dt*.08); }
  const night = dayF < .5;
  colEyeMat.color.setRGB(4,3.2,.9).multiplyScalar(phase>=2 && (night || phase>=3) ? 1 : 0);
  colOrbMat.emissiveIntensity = phase>=2 ? .6 + .4*Math.sin(T*.9) + (phase>=3 ? 1 : 0) : 0;
  fovKick = Math.max(0, fovKick - dt*1.5); subBoost = Math.max(0, subBoost - dt*.2);
  const vert = downT > .5 ? Math.sin(T*.8)*2.5*clamp(downT/3,0,1) : 0;
  const fov = 70 - fovKick + vert; if (Math.abs(camera.fov - fov) > .05){ camera.fov = fov; camera.updateProjectionMatrix(); }
}
function pickExtraEvent(night){
  const o = [];
  if (S.d > 1.5){ if (ok('knock', 80)) o.push('knock'); if (ok('prints', 130)) o.push('prints'); if ((night || phase>=1) && ok('music', 140)) o.push('music'); if (S.d > 3 && ok('silent', 260)) o.push('silent'); if (S.d > 2 && ok('tug', 70)) o.push('tug'); }
  if (S.d > 4 && ok('fish', 170)) o.push('fish');
  if (S.d > 5 && ok('behind', 95)) o.push('behind');
  if (phase >= 1 || S.d > 8){ if (ok('hand', 85)) o.push('hand'); if (night && ok('torch', 110)) o.push('torch'); if (ok('sublim', 70)) o.push('sublim'); if (night && ok('green', 120)) o.push('green'); if (ok('left', 240)) o.push('left'); }
  if (phase >= 1){ if (ok('bodies', 170)) o.push('bodies'); if (night && ok('dg', 220)) o.push('dg'); if (ok('fog', 180)) o.push('fog'); if (S.luc < 65 && ok('lost', 320)) o.push('lost');
    if (S.revealed.includes('car') && night && ok('car', 200)) o.push('car'); }
  if (S.d > 10 && ok('titan', 150)) o.push('titan');
  if (S.d > 18 && !LEV.on && ok('levx', 110)) o.push('levx');
  if (phase >= 2){ if (ok('mouth', 120)) o.push('mouth'); if (ok('blood', 160)) o.push('blood'); if (ok('breath', 150)) o.push('breath'); if (night && ok('dock', 200)) o.push('dock'); }
  return o;
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
  setTimeout(()=>{ scv.style.filter = 'invert(1)'; }, 90); setTimeout(()=>{ scv.style.filter = ''; drawFace(); }, 150);
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
let ending = null, endT = 0;
function startFinale(){
  ending = 'reveal'; endT = 0; holdBucket = false; B.busy = false;
  titan.visible = creature.visible = deepEye.visible = false; X_.titan = X_.deepEye = null;
  [handObj, headObj, behindFig, mouthObj, dgObj, ...fogFigs, ...dockFigs, ...floaters].forEach(o=>o.visible = false); fishMesh.count = 0; X_.dg = X_.hand = X_.behind = X_.mouth = X_.left = null; $('poi').innerHTML = ''; for (const k in poiEls) delete poiEls[k];
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
  [24.6, ()=>{ capOff(); bubbleSfx(); sfxNoise({dur:1.4,f:280,q:.6,type:'lowpass',vol:.7,rev:.7}); }],
  [30.5, ()=>cap(`Non era una diga.`)],
  [33.4, ()=>capOff()],
  [34.2, ()=>{ cap(`Era una ninna nanna.`); heartSfx(.5); }],
  [36.0, ()=>heartSfx(.6)], [37.4, ()=>capOff()],
  [37.6, ()=>heartSfx(.7)],
  [38.0, ()=>{ cap(`<span style="font-style:normal;letter-spacing:.12em">«CHE DORMA. CHE DORMA PER SEMPRE.»</span>`); groanSfx(.6,5); }],
  [39.0, ()=>heartSfx(.8)], [40.0, ()=>heartSfx(.9)], [40.8, ()=>heartSfx(1)],
  [41.4, ()=>{ capOff(); stingerSfx(); shakeAmt = 1.2; }],
  [44.0, ()=>cMid(`<div class="big">SETTANT'ANNI DOPO</div>`)],
  [47.0, ()=>cMid(null)],
  [49.0, ()=>cap(`La Ditta Sesti cerca un uomo che svuoti il lago.`)],
  [52.4, ()=>capOff()],
  [53.0, ()=>cap(`Paga bene. Paga ogni litro.`)],
  [54.5, ()=>deepCallSfx(.6)],
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
  camera.position.x += (Math.random()-.5)*shakeAmt*.12; camera.position.y += (Math.random()-.5)*shakeAmt*.12;
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
function fxUpdate(){
  mistU.uTime.value = T; mistU.uCol.value.copy(scene.fog.color);
  mists.forEach(m=>{ m.position.set(camera.position.x, water.position.y + m.userData.off, camera.position.z); });
  moteU.uTime.value = T; moteU.uCam.value.copy(camera.position); camera.getWorldDirection(moteU.uDir.value);
  terrainU.uTime.value = T; ghoulU.uTime.value = T;
  renderer.shadowMap.needsUpdate = flash.intensity > 0;
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
  if (fresh){ playCine(()=> showLetter()); } else begin();
}
function showLetter(){
  $('cardTitle').textContent = `Ditta Sesti & Figli — Acque`;
  $('cardText').textContent = `Gentile signor Ferri,\n\nLa ringraziamo per aver accettato l'incarico.\n\nIl lavoro è semplice: svuotare il lago di Nàrrena. Lavorerà da una zattera legata al pontile: quando l'acqua scende, la zattera scende con lei. Ogni litro Le sarà pagato, e l'acqua del fondo vale più di quella di superficie.\n\nLa preghiamo di osservare tre regole:\n\nI. Non scenda mai dalla zattera dopo il tramonto.\nII. Se dall'acqua qualcuno La chiama per nome, non risponda.\nIII. Non conti l'acqua.\n\nCon gratitudine,\nA. Sesti`;
  $('cardDiary').classList.add('hidden'); $('cardClose').textContent = 'FIRMA';
  $('card').classList.remove('hidden');
  $('cardClose').onclick = ()=>{ $('card').classList.add('hidden'); $('cardClose').textContent = 'CHIUDI'; $('cardClose').onclick = ()=> $('card').classList.add('hidden'); begin(); setTimeout(()=>toast(`Tieni premuto SECCHIO per calarlo nel lago. Trascina per guardarti intorno: anche dietro di te.`), 1200); };
}
function begin(){
  running = true; buildPlumbMarks(); ['hud','bottom','sideBtns'].forEach(id=>$(id).classList.remove('hidden'));
  $('torchBtn').classList.toggle('off', !S.torchOn);
  corpse2.visible = S.cycle > 1;
  waterY = -S.d; water.position.y = waterY; terrainU.uWater.value = waterY; raftPos.copy(raftTarget(waterY)); raftVel.set(0,0,0); rebuildPipes(true);
}
$('newBtn').onclick = ()=> startGame(true);
$('contBtn').onclick = ()=> startGame(false);
$('proBtn').onclick = ()=>{ goFullLandscape(); playCine(()=>{ $('screen').style.display = 'flex'; }); };

/* ---------- acqua torbida: più guardi in basso, più è nero ---------- */
const MURK = { uWaterY:{value:0}, uMurkK:{value:.12}, uMurkCol:{value:new THREE.Color(.003,.011,.009)} };
function addMurk(mat){
  if (!mat || mat.userData.murk || mat.isShaderMaterial || mat.isLineBasicMaterial || mat.isPointsMaterial) return; mat.userData.murk = true;
  const own = Object.prototype.hasOwnProperty.call(mat, 'onBeforeCompile'), prev = mat.onBeforeCompile, key = own ? prev.toString() : '';
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
  ecgPh += dt*bpm/60;
  for (let k=0;k<3;k++){ const p = ecgPh % 1; let v = 0;
    if (p < .06) v = Math.sin(p/.06*Math.PI)*.15; else if (p > .12 && p < .14) v = -.2; else if (p >= .14 && p < .18) v = 1 - (p-.14)/.04*1.6; else if (p >= .18 && p < .21) v = -.35 + (p-.18)/.03*.35; else if (p > .3 && p < .42) v = Math.sin((p-.3)/.12*Math.PI)*.25;
    if (S.luc < 25) v += (Math.random()-.5)*.25;
    ecgBuf[ecgX] = v; ecgX = (ecgX+1) % 200; ecgPh += dt*bpm/60*.0; }
  if ((ecgSkip = !ecgSkip)){
    ecg.clearRect(0,0,200,40); ecg.strokeStyle = S.luc < 30 ? '#d0584a' : '#a9c19a'; ecg.lineWidth = 2; ecg.beginPath();
    for (let i=0;i<200;i+=2){ const j = (ecgX + i) % 200; const y = 22 - ecgBuf[j]*16; i ? ecg.lineTo(i, y) : ecg.moveTo(i, y); } ecg.stroke(); }
  const lid = Math.round(clamp((100-S.luc)/100,0,1)*40)/40, mad = S.luc < 22 || glitchT > 0, low = S.luc < 30, bob = Math.round(clamp(S.d/MAXD,0,1)*400)/4;
  if (lid !== HC.lid){ HC.lid = lid; EL.lucLid.style.transform = `scaleY(${-1 + 2*lid*.9})`; }
  if (low !== HC.low){ HC.low = low; EL.lucIris.setAttribute('fill', low ? '#b03020' : '#c9a640'); }
  if (bob !== HC.bob){ HC.bob = bob; EL.plumbBob.style.top = bob + '%'; }
  if (mad !== HC.mad){ HC.mad = mad; EL.hud.classList.toggle('mad', mad); }
  const bp = B.busy ? Math.round(clamp(B.t/B.dur,0,1)*50)*2 : 0; if (bp !== HC.bp){ HC.bp = bp; EL.bucketRing.style.setProperty('--p', bp); }
  const di = dayF >= .5 ? '☉' : '☾'; if (di !== HC.di){ HC.di = di; EL.dayIc.textContent = di; }
  if (findT > 0){ findT -= dt; if (findT <= 0) $('findCard').classList.add('hidden'); }
}
function buildPlumbMarks(){
  $('plumbMarks').innerHTML = [0,16,32,48,64,80,96,112,128].map(d=>`<i style="top:${d/MAXD*100}%"></i>`).join('') +
    loreObjs.filter(l=>S.revealed.includes(l.id)).map(l=>`<i class="lo ${S.found.includes(l.id)?'done':''}" style="top:${clamp(-l.topY/MAXD,0,1)*100}%"></i>`).join('');
}

// ombre portate dalla torcia: tutto tranne terreno, acqua, effetti e la zattera (su cui stai)
scene.traverse(o=>{ if (o.isMesh || o.isInstancedMesh) (Array.isArray(o.material) ? o.material : [o.material]).forEach(addMurk); });
addMurk(pipeMatN);
scene.traverse(o=>{ if (!o.isMesh || o.userData.noCast) return; let p = o, skip = false; while (p){ if (p === raft || p === bucket || p.userData.noCast) { skip = true; break; } p = p.parent; } o.castShadow = !skip; o.receiveShadow = !skip; });

/* =====================================================================
   LOOP
   ===================================================================== */
let hudN = 0, hudFrame = 0; let last = performance.now(), T = 0, dayF = 0, waterY = 0, hudT = 0, saveT = 0, beatT = 0, sellT = 0;
const cDay = { top:new THREE.Color(.062,.07,.072), hor:new THREE.Color(.052,.06,.057) };
const cNight = { top:new THREE.Color(.0025,.0035,.006), hor:new THREE.Color(.006,.008,.009) };
const tmpC = new THREE.Color(), tmpV = new THREE.Vector3(), fwd = new THREE.Vector3(), lifeEnd = new THREE.Vector3(), ropeTop = new THREE.Vector3();

function update(dt){
  T += dt;
  if (!ending) S.time += dt;
  const c = S.time % 240;
  dayF = c<90 ? 1 : c<110 ? 1-(c-90)/20 : c<220 ? 0 : (c-220)/20;
  phase = phaseOf(S.d);

  // produzione pompe
  if (!ending){
    const pr = pumpRate();
    if (pr > 0) addLiters(pr*dt);
    if (S.contract && S.tank > 0){ S.money += S.tank * PRICE(S.d) * CONTRACTS[S.contract].p; S.tank = 0; }
    // lucidità
    const night = dayF < .5;
    const nearLamp = lamp.intensity > 2;
    const drain = (night?.035:0) + phase*.012 + (S.torchOn?0:.08) + S.pumps[4]*.004 + S.pumps[5]*.012 + (breathT>0 ? 0 : 0);
    const regen = dayF*.05 + S.lumino*.035 + (nearLamp ? .012 : 0) + (breathT > 0 ? 1.8 : 0);
    LUCWHY.dn = [night && 'notte', !S.torchOn && 'torcia spenta', phase>=1 && 'profondità', (S.pumps[4]||S.pumps[5]) && 'macchine di carne'].filter(Boolean);
    LUCWHY.up = [dayF>.5 && 'luce del giorno', S.lumino && 'lumini votivi', nearLamp && 'la lanterna', breathT>0 && 'respiri'].filter(Boolean);
    LUCWHY.net = regen - drain;
    if (S.luc <= .01 && !blackout) doBlackout();
    else S.luc = clamp(S.luc + (regen - drain)*dt, 0, 100);
    // eventi
    EV.next -= dt;
    if (EV.next <= 0){ EV.next = rand(10,22)/(1+phase*.35); if (!inCall && $('prompt').classList.contains('hidden')) runEvent(); }
    // storia
    STORY.forEach((s,i)=>{ if (S.d >= s.d && !S.story.includes(i)){ S.story.push(i); s.f(); } });
    // lore riaffiorata
    loreObjs.forEach(l=>{ if (!S.revealed.includes(l.id) && -S.d < l.topY - .3){ S.revealed.push(l.id); if (S.d > .5){ toast(`◈ Qualcosa è riaffiorato dal fango: ${LORE[l.id].hint}. Segui il segno e toccalo.`, 'lore'); revealSfx(); $('diaryDot').classList.remove('hidden'); if (phase>=1) whisperSfx(1.2,.12); } } });
    if (S.d >= MAXD && !S.ended) startFinale();
  }

  // livello acqua
  let targetY = -S.d;
  if (ending){ endT += dt;
    if (ending==='reveal'){ targetY = -MAXD - Math.min(endT/6,1)*9; lidOpen = Math.min(1, endT/9); if (endT > 10 && $('prompt').classList.contains('hidden') && !S._asked){ S._asked = true; showEndChoice(); } }
    if (ending==='wake'){ targetY = -137; lidOpen = 1; shakeAmt = Math.max(shakeAmt, .5);
      const k = Math.min(1, endT/5); CAM_BASE.lerpVectors(camWakeStart, new THREE.Vector3(0,-128,3), k*k);
      pitchT = -1.35; postMat.uniforms.uDark.value = smooth(4.5,6.5,endT); if (endT > 7 && !S.ended) showCredits('wake'); }
    if (ending==='fill'){ targetY = lerp(-MAXD-9, 0, smooth(0,12,endT)); lidOpen = Math.max(0, 1-endT/5); postMat.uniforms.uDark.value = smooth(10,14,endT); if (endT > 14.5 && !S.ended) showCredits('fill'); }
  }
  waterY += (targetY - waterY) * Math.min(1, dt*(ending?1.2:1.1));
  const breathOff = X_.breath > 0 ? Math.sin(X_.breathPh/5.5*Math.PI*2)*.32*smooth(0,3,X_.breath)*smooth(24,21,X_.breath) : 0;
  water.position.y = waterY + breathOff + tideK; terrainU.uWater.value = waterY;
  // zattera
  { // molla smorzata: la zattera accelera e frena dolcemente verso dove galleggia
    const tg = raftTarget(waterY), w = 2.2; raftVel.addScaledVector(tmpV.subVectors(tg, raftPos), w*w*dt).multiplyScalar(Math.max(0, 1 - 2*w*dt)); raftPos.addScaledVector(raftVel, dt);
    if (raftPos.y < tg.y - .02 && tg.y <= waterY + .01) raftPos.y = tg.y; }
  const floating = raftPos.y <= waterY + .05;
  raft.position.copy(raftPos); if (floating){ raft.position.y += Math.sin(T*1.1)*.04 + breathOff + tideK + raftJolt*Math.sin(T*24)*.12*raftJolt; raft.rotation.x += raftJolt*Math.sin(T*9)*.05; raft.rotation.set(Math.sin(T*.6)*.012, 0, Math.sin(T*.8)*.016); } else raft.rotation.set(-.08,0,.03);
  raft.updateMatrixWorld();
  lamp.position.set(raft.position.x-1.36, raft.position.y+1.98, raft.position.z-1.3); waterU.uLampPos.value.copy(lamp.position);
  if (raft.userData.lantern) raft.userData.lantern.rotation.z = Math.sin(T*.9)*.025;
  { const a = lifeGeo.attributes.position; const end = lifeEnd.set(raft.position.x+1.05, raft.position.y+1.2, raft.position.z+1.6); const len = DOCK_HOOK.distanceTo(end);
    for (let i=0;i<30;i++){ const t = i/29; tmpV.lerpVectors(DOCK_HOOK, end, t); tmpV.y -= Math.sin(t*Math.PI)*Math.min(len*.03, 3); a.setXYZ(i, tmpV.x, tmpV.y, tmpV.z); } a.needsUpdate = true; }
  if (ending !== 'wake'){ CAM_BASE.set(raft.position.x, raft.position.y + 1.95, raft.position.z - .3); }
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
  waterU.uTime.value = T; waterU.uCalm.value = 1 + phase*.4;
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
    if (wf.seen > .35 || wf.t > 9){ waterFigure.visible = false; wf.on = false; if (wf.seen > .35){ whisperSfx(1.2,.25); loseLuc(4, `la figura sull'acqua`); heartSfx(.5); } }
  }
  if (paleT > 0){ paleT -= dt; if (paleT <= 0){ paleFigure.visible = false; } }
  if (!ending) eventsUpdate(dt);
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
  camera.position.x += (Math.random()-.5)*shakeAmt*.12; camera.position.y += (Math.random()-.5)*shakeAmt*.12;
  camera.rotation.order = 'YXZ'; camera.rotation.y = yaw; camera.rotation.x = pitch + Math.sin(T*.9)*.006; camera.rotation.z = Math.sin(T*.5)*insane*.05;
  camera.updateMatrixWorld();
  postMat.uniforms.uInsane.value = Math.max(insane*insane, ending==='wake'?.8:0); postMat.uniforms.uTime.value = T;
  postMat.uniforms.uFlash.value = Math.max(lightK*.12, postMat.uniforms.uFlash.value - dt*.8);
  postMat.uniforms.uTent.value = 0;
  postMat.uniforms.uPulse.value = clamp((55 - S.luc)/55, 0, 1) * Math.pow(Math.max(0, Math.sin(ecgPh*Math.PI*2)), 6);
  postMat.uniforms.uSick.value = phase>=3 ? .15 + clamp((S.d-65)/63,0,1)*.35 : 0;
  postMat.uniforms.uOld.value = 0;
  applyUnder();

  // secchio
  handPos.set(.5 + Math.sin(T*1.1)*.006, -.58 + Math.sin(T*1.7)*.008, -.85); camera.localToWorld(handPos);
  handRope.set(.38,-.3,-.6); camera.localToWorld(handRope);
  if (B.busy){
    B.t += dt; const u = B.t / B.dur;
    if (u < .42){ const e = u/.42; const ee = e*e; bucket.position.lerpVectors(handPos, B.target, ee); bucket.position.y += Math.sin(e*Math.PI)*1.2*(1-e); bucket.rotation.z = e*.5; }
    else if (u < .58){ if (!B.splashed){ B.splashed = true; ripple(B.target.x, B.target.z, .9); splashSfx(B.dist, BUCKETS[S.bucket].s); doSpray(B.target); if (X_.tugNext){ X_.tugNext = false; X_.tug = 2.6; B.dur += 2.6; } }
      if (X_.tug > 0 && Math.random() < dt*4) ripple(B.target.x + rand(-.5,.5), B.target.z + rand(-.5,.5), .6);
      bucket.position.copy(B.target); bucket.position.y = water.position.y - .2 + Math.sin(T*8)*.03; bucket.rotation.z = .9; }
    else if (u < 1){ if (!B.reeled){ B.reeled = true; reelSfx(B.dur*.42); if (X_.thingNext){ X_.thingNext = false; B.thing = true; bucketTent.visible = true; } } if (B.thing){ bucket.rotation.x = Math.sin(T*30)*.15; } const e = (u-.58)/.42; const ee = 1-(1-e)*(1-e); bucket.position.lerpVectors(B.target, handPos, ee); bucket.rotation.z = (1-e)*.6; }
    else { finishBucket(); }
    rope.visible = true;
  } else { bucket.position.copy(handPos); bucket.rotation.set(0, yaw, Math.sin(T*1.3)*.04); rope.visible = false; }
  if (B.busy){ const a = ropeGeo.attributes.position; const top = ropeTop.copy(bucket.position); top.y += .34; const len = handRope.distanceTo(top);
    for (let i=0;i<20;i++){ const t = i/19; tmpV.lerpVectors(handRope, top, t); tmpV.y -= Math.sin(t*Math.PI)*Math.min(len*.04,2); a.setXYZ(i, tmpV.x, tmpV.y, tmpV.z); } a.needsUpdate = true; }
  bucket.visible = !ending;
  if (sprayLife > 0){ sprayLife -= dt; const a = sprayGeo.attributes.position; for (let i=0;i<sprayN;i++){ sprayV[i].y -= 9.8*dt; a.setXYZ(i, a.getX(i)+sprayV[i].x*dt, Math.max(water.position.y, a.getY(i)+sprayV[i].y*dt), a.getZ(i)+sprayV[i].z*dt); } a.needsUpdate = true; spray.visible = true; } else spray.visible = false;

  // audio
  if (AU.ctx){
    const t = AU.ctx.currentTime, depthK = clamp(S.d/MAXD,0,1);
    AU.droneG.gain.setTargetAtTime(.05 + depthK*.22 + insane*.1, t, 1.5);
    AU.droneF.frequency.setTargetAtTime(120 + depthK*260 + insane*200, t, 2);
    AU.subG.gain.setTargetAtTime((phase>=3 ? .15 + depthK*.25 : depthK*.08) + subBoost, t, 1);
    AU.lapG.gain.setTargetAtTime(Math.max(.01, .06 - depthK*.05), t, 1);
    AU.windG.gain.setTargetAtTime(.04 + (1-dayF)*.04, t, 2);
    AU.pumpG.gain.setTargetAtTime(Math.min(.12, pumpRate()>0 ? .03 + Math.log10(1+pumpRate())*.015 : 0), t, .5);
    AU.choirG.gain.setTargetAtTime(Math.max(0, phase>=2 ? (depthK-.28)*.32 : 0) + (choirBoost>0 ? .3 : 0) + (ending ? .35 : 0), t, 1.5);
    AU.master.gain.setTargetAtTime(.9, t, .5);
    duck(!$('call').classList.contains('hidden') || !$('prompt').classList.contains('hidden') || !$('card').classList.contains('hidden'));
    if (AU.shepG){ AU.shepG.gain.setTargetAtTime(Math.max(0, depthK - .08)*.16 + (downT > .5 ? .06 : 0), t, 2); AU.deepG.gain.setTargetAtTime(depthK*.55 + (phase>=3 ? .15 : 0), t, 2); }
  }

  // HUD
  hudT -= dt;
  if (hudT <= 0 && running){ hudT = .1; if ((hudN = (hudN+1)%10) === 0) buildPlumbMarks();
    const g = glitchT > 0;
    const dTxt = '−' + S.d.toFixed(1).replace('.',',') + ' m';
    $('depth').textContent = g ? glitchStr(dTxt) : dTxt;
    $('money').textContent = '€ ' + (g ? glitchStr(fmt(S.money)) : fmt(S.money));
    const cap = tankCap();
    $('tankBar').firstElementChild.style.width = (S.contract ? 0 : clamp(S.tank/cap,0,1)*100) + '%';
    if (S.contract) $('tankTxt').textContent = `RITIRO AUTOMATICO ${Math.round(CONTRACTS[S.contract].p*100)}%`;
    else if (S.tank >= cap){ $('tankTxt').innerHTML = `<span id="tankWarn">CISTERNA PIENA · VENDI</span>`; }
    else $('tankTxt').textContent = `CISTERNA ${fmt(S.tank)} / ${fmt(cap)} L`;
    $('lucBar').firstElementChild.style.width = S.luc + '%';
    $('lucBar').firstElementChild.style.background = S.luc < 30 ? '#c0584a' : '#b9c7a8';
    $('lucTxt').textContent = `LUCIDITÀ ${Math.round(S.luc)}%`;
    { const up = LUCWHY.net > .002, w = up ? LUCWHY.up : LUCWHY.dn; $('lucWhy').textContent = (up ? '▲ ' : LUCWHY.net < -.002 ? '▼ ' : '■ ') + (w.length ? w.join(' · ') : (up ? 'stai recuperando' : 'stabile')); $('lucWhy').className = 'mini ' + (up ? 'up' : 'dn');
      const bb = $('breathBtn'); bb.disabled = breathCd > 0 || breathT > 0 || S.luc > 96; bb.textContent = breathT > 0 ? 'RESPIRI…' : breathCd > 0 ? `RESPIRA · ${Math.ceil(breathCd)}s` : 'RESPIRA'; bb.classList.toggle('hint', !bb.disabled && S.luc < 60); }
    { const left = Math.max(0, MAXD - S.d); $('belowTxt').textContent = downT > .3 ? `SOTTO DI TE: ${Math.round(left)} m D'ACQUA NERA` : `ACQUA SOTTO: ${Math.round(left)} m`; $('belowTxt').classList.toggle('dn', downT > .3); }
    $('rateTxt').textContent = `${fmt(pumpRate())} L/s · ${PRICE(S.d).toLocaleString('it-IT',{maximumFractionDigits:2})} €/L`;
    $('timeTxt').textContent = (dayF>=.5 ? 'GIORNO ' : 'NOTTE ') + (Math.floor(S.time/240)+1);
    $('bucketSub').textContent = fmt(BUCKETS[S.bucket].s*10) + ' L';
    $('sellBtn').style.opacity = S.contract ? .5 : 1;
    if (!$('shop').classList.contains('hidden')) updateShop();
  }
  saveT -= dt; if (saveT <= 0 && !ending){ saveT = 4; save(); }
}

function frame(now){
  requestAnimationFrame(frame);
  const raw = (now-last)/1000, dt = Math.min(.05, raw); last = now; adaptQuality(raw);
  if (CINE.on) updateCine(dt);
  else if (running) update(dt);
  else { T += dt; yaw = Math.sin(T*.05)*.35; pitch = -.16; camera.position.copy(CAM_BASE); camera.rotation.order='YXZ'; camera.rotation.set(pitch, yaw, 0); camera.updateMatrixWorld();
    envNight(); lightUpdate(dt); skyU.uLight.value = lightK; hemi.intensity += lightK*2.2; skyU.uTime.value = T; waterU.uTime.value = T;
    if (Math.random() < dt/14) lightning(false);
    camera.getWorldPosition(waterU.uFlashPos.value); camera.getWorldDirection(waterU.uFlashDir.value); flash.intensity = 0; waterU.uFlashI.value = 0;
    lamp.intensity = 4 + Math.sin(T*13)*.3; waterU.uLampI.value = lamp.intensity; M.lampGlass.emissiveIntensity = 3;
    postMat.uniforms.uTime.value = T; postMat.uniforms.uFlash.value = lightK*.1; bucket.visible=false; applyUnder(); }
  fxUpdate();
  renderFrame();
}
if (location.search.includes('debug')) window.__IF = { CINE, CINE_EV, get S(){ return S; }, set S(v){ S = v; }, seek(t){ CINE.t = t; CINE.evI = 0; while (CINE.evI < CINE_EV.length && CINE_EV[CINE.evI][0] < t - 2.5) CINE.evI++; }, lightning, startLeviathan, startShoreEyes, scare, drawFace, startEv, showFind, X_, headObj, get raftPos(){return raftPos;}, camera, look(y,p){ yawT = yaw = y; pitchT = pitch = p; }, loreObjs, THREE, runEvent, EV, openLore, directorPick, FINDS, renderer, renderFrame, AU, get qScale(){return qScale;}, Q, get hidden(){return document.hidden;}, update:(dt)=>update(dt) };
$('loading').remove();
requestAnimationFrame(frame);
document.addEventListener('contextmenu', e=>e.preventDefault());
document.addEventListener('visibilitychange', ()=>{ if (document.hidden) save(); });
