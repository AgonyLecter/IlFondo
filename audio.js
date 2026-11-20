/* =====================================================================
   IL FONDO — motore audio
   Ogni suono è progettato a strati e "cotto" una volta sola con
   OfflineAudioContext appena l'audio parte: durante il gioco si suonano
   solo campioni già pronti (pochi nodi, niente picchi di CPU).
   ===================================================================== */
export const AU = { ctx:null, ready:false };
const BANK = {}; AU.BANK = BANK;
const R = (a,b) => a + Math.random()*(b-a);
const clamp = (x,a,b) => Math.max(a, Math.min(b, x));
const SR = 32000;

/* ---------- strumenti per la cottura ---------- */
function noiseData(n, kind){
  const d = new Float32Array(n);
  if (kind === 'brown'){ let l = 0; for (let i=0;i<n;i++){ l = (l + .02*(Math.random()*2-1)) / 1.02; d[i] = l*3.5; } }
  else if (kind === 'pink'){ let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0; for (let i=0;i<n;i++){ const w = Math.random()*2-1;
    b0=.99886*b0+w*.0555179; b1=.99332*b1+w*.0750759; b2=.969*b2+w*.153852; b3=.8665*b3+w*.3104856; b4=.55*b4+w*.5329522; b5=-.7616*b5-w*.016898;
    d[i]=(b0+b1+b2+b3+b4+b5+b6+w*.5362)*.11; b6=w*.115926; } }
  else for (let i=0;i<n;i++) d[i] = Math.random()*2-1;
  return d;
}
function kit(ctx){
  const k = {
    t:0,
    buf(sec, fill, ch=1){ const n = Math.max(1, Math.floor(sec*ctx.sampleRate)); const b = ctx.createBuffer(ch, n, ctx.sampleRate); for (let c=0;c<ch;c++) fill(b.getChannelData(c), ctx.sampleRate, c); return b; },
    src(b){ const s = ctx.createBufferSource(); s.buffer = b; return s; },
    noise(sec, kind='white'){ const b = ctx.createBuffer(1, Math.max(1,Math.floor(sec*ctx.sampleRate)), ctx.sampleRate); b.getChannelData(0).set(noiseData(b.length, kind)); return k.src(b); },
    osc(type, f){ const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; return o; },
    g(v=1){ const g = ctx.createGain(); g.gain.value = v; return g; },
    f(type, freq, q=1){ const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = freq; b.Q.value = q; return b; },
    pan(p){ const s = ctx.createStereoPanner(); s.pan.value = p; return s; },
    shaper(drive){ const ws = ctx.createWaveShaper(), c = new Float32Array(1024); for (let i=0;i<1024;i++){ const x = i/512-1; c[i] = Math.tanh(x*drive); } ws.curve = c; return ws; },
    chain(...n){ for (let i=0;i<n.length-1;i++) n[i].connect(n[i+1]); return n[n.length-1]; },
    perc(p, t, peak, d, a=.002){ p.setValueAtTime(0, t); p.linearRampToValueAtTime(peak, t+a); p.exponentialRampToValueAtTime(.0001, t+a+d); },
    adsr(p, t, a, peak, hold, d){ p.setValueAtTime(.0001, t); p.exponentialRampToValueAtTime(peak, t+a); p.setValueAtTime(peak, t+a+hold); p.exponentialRampToValueAtTime(.0001, t+a+hold+d); },
    // corpo modale: parziali sinusoidali con decadimenti propri (metallo, legno, campane)
    modal(out, t, f0, ratios, decays, amps, beat=0){
      ratios.forEach((r,i)=>{ if (f0*r > ctx.sampleRate*.45) return; for (const dt of beat ? [-beat*R(.3,1), beat*R(.3,1)] : [0]){ const o = k.osc('sine', f0*r + dt), g = k.g(0); k.perc(g.gain, t, amps[i]*(beat?.6:1), decays[i]); o.connect(g); g.connect(out); o.start(t); o.stop(t + decays[i]*1.6 + .05); } });
    },
    // bolla d'aria (risonanza di Minnaert): sale di frequenza mentre si chiude
    blip(out, t, f, dur, amp, rise=1.7){ const o = k.osc('sine', f), g = k.g(0); o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f*rise, t+dur); k.perc(g.gain, t, amp, dur, .0015); o.connect(g); g.connect(out); o.start(t); o.stop(t+dur+.05); },
    burst(out, t, dur, type, freq, q, amp, kind){ const n = k.noise(dur+.05, kind), fl = k.f(type, freq, q), g = k.g(0); k.perc(g.gain, t, amp, dur); k.chain(n, fl, g, out); n.start(t); return fl; },
    // attrito "stick-slip": treno di micro-impulsi irregolari (legno che geme, corda nella carrucola)
    stick(sec, i0, i1, ampEnv){ return k.buf(sec, (d, sr)=>{ let t = .01; while (t < sec-.01){ const u = t/sec, iv = i0 + (i1-i0)*u; const a = (ampEnv ? ampEnv(u) : 1) * R(.4,1); const s0 = Math.floor(t*sr), L = Math.floor(sr*.004);
      for (let j=0;j<L && s0+j<d.length;j++) d[s0+j] += a*(Math.random()*2-1)*Math.exp(-j/(L*.25)); t += iv*R(.6,1.4); } }); },
  };
  return k;
}
async function bake(sec, build, opts={}){
  const ctx = new OfflineAudioContext(2, Math.ceil(SR*sec), SR);
  const out = ctx.createGain(); out.connect(ctx.destination);
  build(ctx, out, kit(ctx));
  let buf = await ctx.startRendering();
  if (opts.loop) buf = loopify(buf, opts.loop);
  if (opts.norm !== false){ let pk = 0; for (let c=0;c<buf.numberOfChannels;c++){ const d = buf.getChannelData(c); for (let i=0;i<d.length;i++){ const a = Math.abs(d[i]); if (a > pk) pk = a; } }
    if (pk > 0){ const s = (opts.norm || .9)/pk; for (let c=0;c<buf.numberOfChannels;c++){ const d = buf.getChannelData(c); for (let i=0;i<d.length;i++) d[i] *= s; } } }
  return buf;
}
function loopify(buf, xf){
  const n = buf.length, x = Math.floor(xf*buf.sampleRate);
  const out = new AudioBuffer({ length:n-x, numberOfChannels:buf.numberOfChannels, sampleRate:buf.sampleRate });
  for (let c=0;c<buf.numberOfChannels;c++){ const d = buf.getChannelData(c), o = out.getChannelData(c);
    for (let i=0;i<n-x;i++) o[i] = d[i];
    for (let i=0;i<x;i++){ const q = i/x; o[i] = d[i]*Math.sqrt(q) + d[n-x+i]*Math.sqrt(1-q); } }
  return out;
}

/* ---------- il catalogo dei suoni ---------- */
const VOWELS = [[300,870,2240],[530,1840,2480],[660,1720,2410],[730,1090,2440],[570,840,2410],[440,1020,2240]];
const DEFS = {
  // l'impatto del secchio: schiaffo, corpo d'acqua, colpo sordo, bolle, gocce che ricadono
  splash:{ n:3, sec:1.9, build(ctx, out, k){
    k.burst(out, 0, .06, 'bandpass', 1500, .6, .5);
    const body = k.burst(out, .004, .75, 'bandpass', R(420,680), .8, .55); body.frequency.exponentialRampToValueAtTime(260, .6);
    const th = k.osc('sine', 95), tg = k.g(0); th.frequency.exponentialRampToValueAtTime(42, .16); k.perc(tg.gain, 0, .6, .2); th.connect(tg); tg.connect(out); th.start(0); th.stop(.3);
    for (let i=0;i<16;i++){ const t = R(.02,.75); k.blip(out, t, R(260,1100)*(1-t*.35), R(.03,.08), R(.06,.22)*(1-t*.8)); }
    for (let i=0;i<9;i++){ const t = R(.28,1.5), p = k.pan(R(-.6,.6)); p.connect(out); k.blip(p, t, R(800,1900), R(.02,.04), R(.03,.07), 1.35); }
  }},
  // il lancio: fruscio della corda nell'aria e cricchetto del mulinello che rallenta (nessun suono tonale)
  cast:{ n:3, sec:1.1, build(ctx, out, k){
    const sw = k.noise(.7, 'pink'), sb = k.f('bandpass', 1100, .8), sl = k.f('lowpass', 2600, .7), sg = k.g(0);
    sb.frequency.setValueAtTime(1100, 0); sb.frequency.exponentialRampToValueAtTime(320, .6); sg.gain.setValueAtTime(.0001, 0); sg.gain.exponentialRampToValueAtTime(.7, .07); sg.gain.exponentialRampToValueAtTime(.0001, .62);
    k.chain(sw, sb, sl, sg, out); sw.start(0);
    const tk = k.src(k.buf(1.05, (d, sr)=>{ let t = .03, iv = R(.009,.012); while (t < 1){ const s0 = Math.floor(t*sr), a = (1 - t)*R(.6,1), L = Math.floor(sr*.0025);
      for (let j=0;j<L && s0+j<d.length;j++) d[s0+j] += a*(Math.random()*2-1)*Math.exp(-j/(L*.2)); t += iv; iv *= R(1.06,1.1); } }));
    const tb = k.f('bandpass', R(1500,2100), 2.5), tl = k.f('lowpass', 3200, .7), tg = k.g(.55); k.chain(tk, tb, tl, tg, out); tk.start(0);
  }},
  // il recupero: il mulinello che ticchetta regolare e la corda bagnata che scorre
  reel:{ n:3, sec:1.4, build(ctx, out, k){
    const tk = k.src(k.buf(1.35, (d, sr)=>{ let t = .02; const iv = R(.034,.045); while (t < 1.3){ const s0 = Math.floor(t*sr), a = R(.5,1)*Math.min(1, t*8, (1.32-t)*8), L = Math.floor(sr*.003);
      for (let j=0;j<L && s0+j<d.length;j++) d[s0+j] += a*(Math.random()*2-1)*Math.exp(-j/(L*.22)); t += iv*R(.85,1.15); } }));
    const tb = k.f('bandpass', R(1100,1500), 3), tl = k.f('lowpass', 2800, .7), tg = k.g(.6); k.chain(tk, tb, tl, tg, out); tk.start(0);
    const rp = k.noise(1.4, 'brown'), rb = k.f('bandpass', 420, 1.2), rg = k.g(0); k.adsr(rg.gain, 0, .15, .35, .9, .3); k.chain(rp, rb, rg, out); rp.start(0);
  }},
  // il secchio di latta che sbatte: metallo sottile, manico che tintinna
  clank:{ n:3, sec:1.4, build(ctx, out, k){
    const f0 = R(380,520);
    k.burst(out, 0, .02, 'highpass', 2200, .7, .5);
    k.modal(out, 0, f0, [1,2.32,4.25,6.63,9.38,12.1], [.9,.6,.4,.25,.15,.1], [.5,.4,.3,.2,.12,.08]);
    k.modal(out, .07, f0*1.43, [1,2.6,5.1], [.3,.2,.1], [.15,.1,.06]);
  }},
  drip:{ n:4, sec:.3, build(ctx, out, k){ k.blip(out, 0, R(900,1700), R(.04,.07), .8, 1.9); k.burst(out, 0, .005, 'highpass', 4000, .7, .15); }},
  // monete nella cassa del Compratore
  coin:{ n:2, sec:1.1, build(ctx, out, k){
    k.burst(out, 0, .08, 'lowpass', 300, .7, .35);
    [0,.06,.13].forEach((t,i)=> k.modal(out, t, R(2200,2900), [1,2.76,5.4,8.93], [.5,.35,.2,.12], [.4,.25,.15,.08].map(a=>a*(1-i*.2))));
  }},
  // legno che geme: attrito irregolare attraverso le risonanze di una tavola
  creak:{ n:4, sec:1.2, build(ctx, out, k){
    const s = k.src(k.stick(1.1, R(.018,.03), R(.04,.075), u=>Math.pow(Math.sin(Math.PI*Math.min(1,u*1.2)),1.5)));
    const g = k.g(1); [[R(150,250),4,.7],[R(400,650),5,.5],[R(900,1300),6,.3]].forEach(([f,q,a])=>{ const b = k.f('bandpass', f, q), bg = k.g(a); s.connect(b); b.connect(bg); bg.connect(g); });
    g.connect(out); s.start(0);
  }},
  // colpi sordi sotto le assi
  knock:{ n:3, sec:.6, build(ctx, out, k){
    const lp = k.f('lowpass', 900, .7); lp.connect(out);
    k.modal(lp, 0, R(130,190), [1,2.45,3.9,5.6], [.18,.1,.06,.04], [.9,.4,.25,.1]);
    k.burst(lp, 0, .12, 'lowpass', 250, .7, .7);
  }},
  footstep:{ n:3, sec:.7, build(ctx, out, k){
    const lp = k.f('lowpass', 1400, .7); lp.connect(out);
    k.modal(lp, 0, R(95,130), [1,2.3,3.7], [.12,.07,.04], [.6,.3,.15]); k.burst(lp, 0, .06, 'bandpass', 600, .8, .4);
    const s = k.src(k.stick(.4, .02, .05, u=>1-u)), b = k.f('bandpass', R(300,500), 5), g = k.g(.25); k.chain(s, b, g, out); s.start(.05);
  }},
  // campana di bronzo: parziali da campana vera (hum, prime, terza minore, quinta, nominale…) con battimenti
  bell:{ n:1, sec:9, build(ctx, out, k){
    const p = R(185,200);
    k.burst(out, 0, .04, 'bandpass', 2600, 1, .35); k.burst(out, 0, .1, 'lowpass', 200, .7, .4);
    k.modal(out, 0, p, [.5,1,1.19,1.5,2.0,2.52,2.66,3.01,4.07], [9,7,6,3,5,2.6,2.2,2,1.4], [.45,.55,.42,.18,.5,.14,.11,.1,.07], .7);
  }},
  heart:{ n:2, sec:.9, build(ctx, out, k){
    const lp = k.f('lowpass', 220, .7); lp.connect(out);
    [[0,58,40,.9],[.24,64,45,.6]].forEach(([t,f1,f2,a])=>{ const o = k.osc('sine', f1), g = k.g(0); o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(f2, t+.12); k.perc(g.gain, t, a, .17, .006); o.connect(g); g.connect(lp); o.start(t); o.stop(t+.3); k.burst(lp, t, .1, 'lowpass', 90, .7, a*.6, 'brown'); });
  }},
  // il gemito del fondo: ringhio, scafo di metallo che cede, vocale cupa
  groan:{ n:1, sec:7, build(ctx, out, k){
    const o = k.osc('sawtooth', 36), lp = k.f('lowpass', 260, 7), sh = k.shaper(2.5), g = k.g(0);
    const walk = new Float32Array(64); let v = 36; for (let i=0;i<64;i++){ v = clamp(v + R(-2,2), 26, 44); walk[i] = v; } o.frequency.setValueCurveAtTime(walk, 0, 7);
    k.adsr(g.gain, 0, 2, .6, 2.5, 2.4); k.chain(o, lp, sh, g, out); o.start(0); o.stop(7);
    const n = k.noise(7, 'brown'), bp = k.f('bandpass', 320, 2), dl = ctx.createDelay(.05), fb = k.g(.93), mg = k.g(0);
    dl.delayTime.value = R(.006,.011); bp.frequency.setValueAtTime(320, 0); bp.frequency.exponentialRampToValueAtTime(170, 6.5);
    n.connect(bp); bp.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(mg); k.adsr(mg.gain, .5, 2, .25, 2, 2.4); mg.connect(out); n.start(0);
    const vo = k.osc('sawtooth', 55), f1 = k.f('bandpass', 360, 7), f2 = k.f('bandpass', 720, 8), vg = k.g(0); vo.frequency.linearRampToValueAtTime(48, 7);
    vo.connect(f1); vo.connect(f2); f1.connect(vg); f2.connect(vg); k.adsr(vg.gain, .8, 2.2, .35, 1.8, 2); vg.connect(out); vo.start(0); vo.stop(7);
  }},
  // il richiamo dal profondo: un canto lunghissimo, da balena, dentro l'abisso
  deepcall:{ n:1, sec:8.5, build(ctx, out, k){
    const lp = k.f('lowpass', 420, .8), master = k.g(0); k.adsr(master.gain, 0, 1.8, 1, 3.2, 3.4); k.chain(lp, master, out);
    for (let h=1; h<=5; h++){ const o = k.osc('sine', 42*h), g = k.g(.5/h); o.frequency.setValueAtTime(42*h, 0); o.frequency.linearRampToValueAtTime(76*h, 2.5); o.frequency.linearRampToValueAtTime(62*h, 4.6); o.frequency.exponentialRampToValueAtTime(33*h, 8.4); o.connect(g); g.connect(lp); o.start(0); o.stop(8.5); }
    const s = k.osc('sawtooth', 84), fb = k.f('bandpass', 280, 3), sg = k.g(.12); s.frequency.linearRampToValueAtTime(150, 2.5); s.frequency.exponentialRampToValueAtTime(66, 8.4); k.chain(s, fb, sg, lp); s.start(0); s.stop(8.5);
    const tr = k.osc('sine', 5.2), tg = k.g(.15); tr.connect(tg); tg.connect(master.gain); tr.start(0); tr.stop(8.5);
  }},
  // sussurri: rumore modellato da formanti vocali che cambiano a ogni sillaba, più voci insieme
  whisper:{ n:3, sec:3.4, build(ctx, out, k){
    for (const [vp, delay, amp] of [[-.35,0,1],[.4,.07,.55],[0,.15,.35]]){
      const src = k.noise(3.4, 'pink'), fs = VOWELS[0].map((f,i)=>k.f('bandpass', f, 9)), env = k.g(0), p = k.pan(vp); fs.forEach(b=>{ src.connect(b); b.connect(env); }); k.chain(env, p, out);
      let t = .1 + delay; while (t < 3.0){ const v = VOWELS[Math.floor(Math.random()*VOWELS.length)], d = R(.12,.24);
        fs.forEach((b,i)=> b.frequency.setValueAtTime(v[i]*R(.9,1.12), t)); env.gain.setValueAtTime(.0001, t); env.gain.exponentialRampToValueAtTime(amp*R(.5,1), t+.03); env.gain.exponentialRampToValueAtTime(.0001, t+d);
        if (Math.random() < .3){ const sib = k.burst(p, t, R(.05,.11), 'highpass', R(4200,6000), .7, amp*.35); }
        t += d + R(0,.06); }
      src.start(0);
    }
  }},
  // l'urto: soffio al contrario, poi un cluster di archi stonati, un colpo nel petto, uno stridio di metallo
  stinger:{ n:2, sec:3.2, build(ctx, out, k){
    const sw = k.noise(.62), sb = k.f('bandpass', 3000, .5), sg = k.g(0); sg.gain.setValueAtTime(.001, 0); sg.gain.exponentialRampToValueAtTime(.7, .58); sg.gain.setValueAtTime(0, .6); k.chain(sw, sb, sg, out); sw.start(0);
    const hit = .6, lp = k.f('lowpass', 2600, .8), cg = k.g(0); lp.frequency.setValueAtTime(2600, hit); lp.frequency.exponentialRampToValueAtTime(500, hit+2.2); k.perc(cg.gain, hit, .55, 2.3, .01); k.chain(lp, cg, out);
    [110,116.5,155.6,164.8,233,246.9,311,329.6].forEach(f=>{ for (const d of [-1.2,1.3]){ const o = k.osc('sawtooth', f+d); o.connect(lp); o.start(hit); o.stop(hit+2.6); } });
    k.burst(out, hit, .5, 'bandpass', 1200, 1, .35);
    const b = k.osc('sine', 70), bg = k.g(0); b.frequency.setValueAtTime(70, hit); b.frequency.exponentialRampToValueAtTime(30, hit+.7); k.perc(bg.gain, hit, 1, 1.4); b.connect(bg); bg.connect(out); b.start(hit); b.stop(hit+1.6);
    const m = k.osc('sawtooth', 1900), mb = k.f('bandpass', 2100, 10), mg = k.g(0); m.frequency.linearRampToValueAtTime(1450, hit+1); k.perc(mg.gain, hit, .25, .9); k.chain(m, mb, mg, out); m.start(0); m.stop(hit+1.2);
  }},
  // il telefono del capanno: due campanelli battuti da un martelletto
  ring:{ n:1, sec:1.3, build(ctx, out, k){
    const body = k.f('bandpass', 1500, .9), bg = k.g(1); k.chain(body, bg, out);
    for (let i=0;i<22;i++){ const t = i/22, f0 = i%2 ? 1010 : 1070; k.modal(body, t, f0, [1,2.4,3.9,5.6], [.12,.08,.05,.03], [.5,.3,.2,.1]); }
  }},
  // la radio: fruscio, scariche, il fischio della sintonia
  static:{ n:1, sec:3.2, build(ctx, out, k){
    const h = k.noise(3.2), hb = k.f('bandpass', 2600, .5), hg = k.g(.22); k.chain(h, hb, hg, out); h.start(0);
    const cr = k.src(k.buf(3.2, (d,sr)=>{ for (let i=0;i<260;i++){ const s0 = Math.floor(Math.random()*d.length), a = Math.pow(Math.random(),3); for (let j=0;j<12 && s0+j<d.length;j++) d[s0+j] += a*(Math.random()*2-1)*(1-j/12); } })), ch = k.f('highpass', 700, .7); k.chain(cr, ch, out); cr.start(0);
    const w = k.osc('sine', 1200), wg = k.g(.05); w.frequency.linearRampToValueAtTime(2600, 1.3); w.frequency.linearRampToValueAtTime(900, 3); k.chain(w, wg, out); w.start(0); w.stop(3.2);
  }},
  // grosse bolle che salgono dal fondo
  bubble:{ n:3, sec:1.7, build(ctx, out, k){
    let t = .02; for (let i=0;i<11;i++){ k.blip(out, t, R(120,460), R(.06,.14), R(.25,.6), R(1.5,2.1)); t += R(.04,.16); }
    k.blip(out, t+.05, 90, .22, .8, 2.3);
  }},
  // tuono: lo schiocco, poi il rotolare tra le montagne
  thunder:{ n:2, sec:7.5, build(ctx, out, k){
    k.burst(out, 0, .2, 'highpass', 900, .6, .8); for (let i=0;i<5;i++) k.burst(out, R(.02,.35), R(.04,.1), 'highpass', R(600,1500), .6, R(.2,.5));
    for (const [cut, amp, slow] of [[140,1,1],[60,.8,1.8]]){ const n = k.noise(7.5, 'brown'), lp = k.f('lowpass', cut, .6), g = k.g(0);
      const c = new Float32Array(120); let a = 0; for (let i=0;i<120;i++){ const u = i/119; a = a*.85 + Math.random()*.3; c[i] = Math.max(.0001, amp*a*Math.pow(1-u, slow)*Math.min(1, u*12)); } g.gain.setValueCurveAtTime(c, .05, 7.3);
      k.chain(n, lp, g, out); n.start(0); }
  }},
  rumble:{ n:1, sec:12, build(ctx, out, k){
    const n = k.noise(12, 'brown'), lp = k.f('lowpass', 120, .6), g = k.g(0); g.gain.setValueAtTime(.0001, 0); g.gain.exponentialRampToValueAtTime(1, 4.5); g.gain.setValueAtTime(1, 9); g.gain.exponentialRampToValueAtTime(.0001, 12); k.chain(n, lp, g, out); n.start(0);
    const m = k.noise(12, 'pink'), bp = k.f('bandpass', 480, .8), mg = k.g(0); mg.gain.setValueAtTime(.0001, 0); mg.gain.exponentialRampToValueAtTime(.25, 5); mg.gain.exponentialRampToValueAtTime(.0001, 11.5); k.chain(m, bp, mg, out); m.start(0);
  }},
  // un gong di bronzo enorme, lontano: qualcosa è riaffiorato
  reveal:{ n:1, sec:6.5, build(ctx, out, k){
    const lp = k.f('lowpass', 1800, .7), mg = k.g(0); mg.gain.setValueAtTime(.0001, 0); mg.gain.exponentialRampToValueAtTime(1, 1.2); mg.gain.exponentialRampToValueAtTime(.0001, 6.4); k.chain(lp, mg, out);
    for (let i=0;i<26;i++){ const f = R(70,620), o = k.osc('sine', f), g = k.g(R(.2,1)*70/f); o.connect(g); g.connect(lp); o.start(0); o.stop(6.5); }
    k.burst(out, .4, 4, 'bandpass', 6000, 4, .05);
  }},
  // un carillon stonato: lamelle di metallo, il meccanismo che ticchetta, rallenta e cala
  musicbox:{ n:1, sec:14, build(ctx, out, k){
    const box = k.f('peaking', 1200, .8); box.gain.value = 5; box.connect(out);
    const N = [76,79,83,81,79,78,76,74,76,79,78,74,71,0,76,79,83,84,83,79,81,78,76];
    let t = .1; N.forEach((n,i)=>{ const step = .42 + i*i*.0013; if (n){ const f = 440*Math.pow(2,(n-69)/12)*(1 - i*.0045);
        k.modal(box, t, f, [1,5.95,12.7], [1.6,.25,.08], [.5,.12,.05]); k.burst(box, t-.004, .006, 'bandpass', 4200, 2, .08); }
      t += step; });
  }},
  breathIn:{ n:2, sec:2.7, build(ctx, out, k){
    const n = k.noise(2.7, 'pink'), bp = k.f('bandpass', 600, 1.2), hp = k.f('highpass', 300, .7), g = k.g(0);
    bp.frequency.setValueAtTime(600, 0); bp.frequency.exponentialRampToValueAtTime(1400, 2.4); k.adsr(g.gain, 0, 1.2, 1, .2, 1.2); k.chain(n, bp, hp, g, out); n.start(0);
  }},
  breathOut:{ n:2, sec:2.7, build(ctx, out, k){
    const n = k.noise(2.7, 'pink'), bp = k.f('bandpass', 1100, 1), g = k.g(0); bp.frequency.setValueAtTime(1100, 0); bp.frequency.exponentialRampToValueAtTime(480, 2.4); k.adsr(g.gain, 0, .3, 1, .5, 1.8); k.chain(n, bp, g, out); n.start(0);
    const v = k.osc('sawtooth', 86), vb = k.f('bandpass', 450, 3), vg = k.g(0); v.frequency.linearRampToValueAtTime(72, 2.5); k.adsr(vg.gain, .1, .4, .18, .4, 1.6); k.chain(v, vb, vg, out); v.start(0); v.stop(2.7);
  }},
  // il clacson della berlina, sott'acqua da settant'anni
  honk:{ n:1, sec:2.6, build(ctx, out, k){
    const bp = k.f('bandpass', 900, 2), sh = k.shaper(3), g = k.g(0); k.chain(sh, bp, g, out);
    g.gain.setValueAtTime(0, 0); g.gain.linearRampToValueAtTime(.6, .03); g.gain.setValueAtTime(.6, .85); g.gain.linearRampToValueAtTime(0, .95); g.gain.linearRampToValueAtTime(.5, 1.25); g.gain.setValueAtTime(.5, 2.2); g.gain.linearRampToValueAtTime(0, 2.5);
    [340, 428].forEach(f=>{ const o = k.osc('square', f); o.frequency.setValueAtTime(f, 1.2); o.frequency.linearRampToValueAtTime(f*.78, 2.4); const w = k.osc('sine', 7), wg = k.g(f*.02); w.connect(wg); wg.connect(o.frequency); o.connect(sh); o.start(0); w.start(1.2); o.stop(2.6); w.stop(2.6); });
  }},
  click:{ n:2, sec:.12, build(ctx, out, k){ k.burst(out, 0, .008, 'bandpass', 3500, 2, .9); k.blip(out, .002, 5200, .01, .3, 1); k.burst(out, .03, .006, 'bandpass', 2400, 2, .4); }},
  glitch:{ n:2, sec:.45, build(ctx, out, k){
    const o = k.osc('square', 400), sh = k.shaper(8), g = k.g(.3); for (let t=0;t<.4;t+=.02) o.frequency.setValueAtTime(R(60,3000), t); k.chain(o, sh, g, out); o.start(0); o.stop(.4);
    for (let i=0;i<5;i++) k.burst(out, R(0,.35), .02, 'highpass', 2000, .7, .4);
  }},
  /* ---------- ambienti in loop ---------- */
  // l'acqua che sciaborda contro i fusti della zattera
  lap:{ n:1, sec:11, loop:1, build(ctx, out, k){
    const n = k.noise(11, 'brown'), lp = k.f('lowpass', 420, .7), g = k.g(.5); k.chain(n, lp, g, out); n.start(0);
    const a1 = k.osc('sine', .13), a1g = k.g(.2); a1.connect(a1g); a1g.connect(g.gain); a1.start(0);
    for (let t=.2; t<10.8; t+=R(.5,1.6)){ const p = k.pan(R(-.7,.7)); p.connect(out); k.burst(p, t, R(.08,.18), 'bandpass', R(280,750), 1.4, R(.25,.6), 'pink'); if (Math.random()<.4) k.blip(p, t+R(.05,.2), R(500,1200), .04, .12); }
  }},
  // vento tra gli alberi morti
  wind:{ n:1, sec:15, loop:1.5, build(ctx, out, k){
    const n = k.noise(15, 'pink'), bp = k.f('bandpass', 350, .6), g = k.g(.8);
    const c = new Float32Array(40), a = new Float32Array(40); for (let i=0;i<40;i++){ c[i] = R(220,620); a[i] = R(.4,1); } bp.frequency.setValueCurveAtTime(c, 0, 15); g.gain.setValueCurveAtTime(a, 0, 15); k.chain(n, bp, g, out); n.start(0);
    const w = k.noise(15), wb = k.f('bandpass', 900, 28), wg = k.g(.35), wc = new Float32Array(20); for (let i=0;i<20;i++) wc[i] = R(700,1400); wb.frequency.setValueCurveAtTime(wc, 0, 15); k.chain(w, wb, wg, out); w.start(0);
    const lo = k.noise(15, 'brown'), lb = k.f('lowpass', 80, .6), lg = k.g(.5); k.chain(lo, lb, lg, out); lo.start(0);
  }},
  // il profondo: gocce in una cattedrale d'acqua, lamiere che cedono, un ronzio sotto i piedi
  deep:{ n:1, sec:16, loop:2, build(ctx, out, k){
    const cv = ctx.createConvolver(); cv.buffer = k.buf(5, (d, sr)=>{ for (let i=0;i<d.length;i++) d[i] = (Math.random()*2-1)*Math.pow(1-i/d.length, 3); }, 2); const wet = k.g(.8); cv.connect(wet); wet.connect(out);
    for (let i=0;i<14;i++){ const t = R(.2,13.5), p = k.pan(R(-1,1)); p.connect(cv); p.connect(out); k.blip(p, t, R(500,1500), R(.03,.06), R(.1,.3), 1.8); }
    for (let i=0;i<3;i++){ const t = R(.5,11), s = k.src(k.stick(2.5, .03, .09, u=>Math.sin(Math.PI*u))), b = k.f('bandpass', R(90,200), 6), g = k.g(.8); k.chain(s, b, g, cv); s.start(t); }
    const h = k.osc('sine', 48), hg = k.g(.08); k.chain(h, hg, out); h.start(0); h.stop(16);
  }},
};
const ORDER = ['bell','creak','splash','cast','reel','whisper','heart','stinger','thunder','rumble','groan','bubble','lap','wind','clank','drip','knock','click','coin','deepcall','breathIn','breathOut','footstep','ring','static','reveal','musicbox','honk','glitch','deep'];

// cottura a lotti: più suoni nella stessa passata, ognuno spostato nel tempo da un ritardo, poi ritagliati
function finish(buf, opts){
  if (opts.loop) buf = loopify(buf, opts.loop);
  let pk = 0; for (let c=0;c<buf.numberOfChannels;c++){ const d = buf.getChannelData(c); for (let i=0;i<d.length;i++){ const a = Math.abs(d[i]); if (a > pk) pk = a; } }
  if (pk > 0){ const sc = .9/pk; for (let c=0;c<buf.numberOfChannels;c++){ const d = buf.getChannelData(c); for (let i=0;i<d.length;i++) d[i] *= sc; } }
  return buf;
}
async function bakeBatch(jobs){
  const GAP = .05; let total = 0; jobs.forEach(j=>{ j.off = total; total += j.sec + GAP; });
  const ctx = new OfflineAudioContext(2, Math.ceil(SR*total), SR);
  for (const j of jobs){ const out = ctx.createGain(); if (j.off > 0){ const d = ctx.createDelay(Math.min(179, j.off + 1)); d.delayTime.value = j.off; out.connect(d); d.connect(ctx.destination); } else out.connect(ctx.destination);
    try { j.build(ctx, out, kit(ctx)); } catch(e){ console.warn('audio', j.name, e); } }
  const all = await ctx.startRendering();
  for (const j of jobs){ const n = Math.floor(j.sec*SR), s0 = Math.floor(j.off*SR); const b = new AudioBuffer({ length:n, numberOfChannels:2, sampleRate:SR });
    for (let c=0;c<2;c++) b.getChannelData(c).set(all.getChannelData(c).subarray(s0, s0+n));
    (BANK[j.name] = BANK[j.name] || []).push(finish(b, { loop:j.loop })); }
}
async function bakeAll(){
  const t0 = performance.now(); let batch = [], len = 0;
  const flush = async ()=>{ if (!batch.length) return; await bakeBatch(batch); batch.forEach(j=>{ if (j.name === 'lap') startLoop('lap', AU.lapG); if (j.name === 'wind') startLoop('wind', AU.windG); if (j.name === 'deep') startLoop('deep', AU.deepG); }); batch = []; len = 0; };
  for (const name of ORDER){ const d = DEFS[name];
    for (let i=0;i<d.n;i++){ batch.push({ name, sec:d.sec, build:d.build, loop:d.loop }); len += d.sec; }
    if (len > (Object.keys(BANK).length ? 40 : 22)) await flush();
  }
  await flush(); AU.ready = true; AU.bakeMs = Math.round(performance.now() - t0);
}
function startLoop(name, dest){ const ctx = AU.ctx, b = BANK[name]; if (!b || !dest) return; const s = ctx.createBufferSource(); s.buffer = b[0]; s.loop = true; s.connect(dest); s.start(); }

/* ---------- riverbero generato: un lago di notte, freddo, ampio ---------- */
async function makeIR(){
  return bake(4.2, (ctx, out, k)=>{
    for (let c=0;c<2;c++){ const n = k.noise(4.2), lp = k.f('lowpass', 9000, .5), g = k.g(0), p = k.pan(c ? .8 : -.8);
      lp.frequency.setValueAtTime(9000, 0); lp.frequency.exponentialRampToValueAtTime(500, 4); g.gain.setValueAtTime(.8, 0); g.gain.exponentialRampToValueAtTime(.0001, 4.1); k.chain(n, lp, g, p, out); n.start(0); }
    const er = k.src(k.buf(.12, (d, sr, c)=>{ [.011,.019,.027,.041,.058,.083].forEach((t,i)=>{ d[Math.floor((t + c*.003)*sr)] = (i%2?-1:1)*(1-i*.12); }); }, 2)); er.connect(out); er.start(0);
  }, { norm:.5 });
}

/* ---------- avvio: catena master, letti sonori vivi, cottura ---------- */
export function initAudio(){
  if (AU.ctx){ AU.ctx.resume(); return; }
  try {
    const ctx = new (window.AudioContext||window.webkitAudioContext)(); AU.ctx = ctx;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 3.5; comp.attack.value = .01; comp.release.value = .25; comp.connect(ctx.destination);
    AU.underF = ctx.createBiquadFilter(); AU.underF.type = 'lowpass'; AU.underF.frequency.value = 20000; AU.underF.Q.value = .5; AU.underF.connect(comp);
    AU.master = ctx.createGain(); AU.master.gain.value = .9; AU.master.connect(AU.underF);
    AU.dry = ctx.createGain(); AU.dry.gain.value = 1; AU.dry.connect(AU.master);
    AU.amb = ctx.createGain(); AU.amb.gain.value = 1; AU.amb.connect(AU.master);
    AU.rev = ctx.createConvolver(); AU.revG = ctx.createGain(); AU.revG.gain.value = .6; AU.rev.connect(AU.revG); AU.revG.connect(AU.master);
    makeIR().then(b=>{ AU.rev.buffer = b; }).catch(()=>{});
    AU.noise = ctx.createBuffer(1, ctx.sampleRate*3, ctx.sampleRate); AU.noise.getChannelData(0).set(noiseData(ctx.sampleRate*3));
    // drone: triangoli scordati, un filo di FM, filtro che respira
    AU.droneG = ctx.createGain(); AU.droneG.gain.value = 0;
    AU.droneF = ctx.createBiquadFilter(); AU.droneF.type = 'lowpass'; AU.droneF.frequency.value = 160; AU.droneF.Q.value = 3;
    [[41.2,'triangle',.4],[41.6,'triangle',.4],[61.7,'triangle',.18],[82.6,'sine',.12],[20.6,'sine',.3]].forEach(([f,t,v])=>{ const o = ctx.createOscillator(); o.type = t; o.frequency.value = f;
      const m = ctx.createOscillator(); m.frequency.value = f*1.5; const mg = ctx.createGain(); mg.gain.value = f*.04; m.connect(mg); mg.connect(o.frequency); m.start();
      const g = ctx.createGain(); g.gain.value = v; o.connect(g); g.connect(AU.droneF); o.start(); });
    const lfo = ctx.createOscillator(); lfo.frequency.value = .06; const lg = ctx.createGain(); lg.gain.value = 60; lfo.connect(lg); lg.connect(AU.droneF.frequency); lfo.start();
    AU.droneF.connect(AU.droneG); AU.droneG.connect(AU.amb); const ds = ctx.createGain(); ds.gain.value = .4; AU.droneG.connect(ds); ds.connect(AU.rev);
    // il tono che scende per sempre (Shepard): più vai giù, più lo senti
    AU.shepG = ctx.createGain(); AU.shepG.gain.value = 0; const shF = ctx.createBiquadFilter(); shF.type = 'lowpass'; shF.frequency.value = 700; shF.connect(AU.shepG); AU.shepG.connect(AU.amb); AU.shepG.connect(AU.rev);
    AU.shep = []; for (let i=0;i<7;i++){ const o = ctx.createOscillator(); o.type = 'sine'; const g = ctx.createGain(); g.gain.value = 0; o.connect(g); g.connect(shF); o.start(); AU.shep.push({o,g}); }
    let shPh = 0; setInterval(()=>{ if (!AU.ctx || AU.shepG.gain.value < .001) return; shPh = (shPh + .1/45) % 1; const t = ctx.currentTime;
      AU.shep.forEach((s,i)=>{ const oct = (i + 1 - shPh) % 7; s.o.frequency.setTargetAtTime(28*Math.pow(2, oct), t, .05); const w = Math.exp(-Math.pow((oct-3)/1.4, 2)); s.g.gain.setTargetAtTime(w*.25, t, .05); }); }, 100);
    // sub
    AU.sub = ctx.createOscillator(); AU.sub.frequency.value = 27.5; AU.subG = ctx.createGain(); AU.subG.gain.value = 0; AU.sub.connect(AU.subG); AU.subG.connect(AU.master); AU.sub.start();
    // letti in loop (partono quando sono cotti)
    AU.lapG = ctx.createGain(); AU.lapG.gain.value = .05; AU.lapG.connect(AU.amb);
    AU.windG = ctx.createGain(); AU.windG.gain.value = .06; AU.windG.connect(AU.amb);
    AU.deepG = ctx.createGain(); AU.deepG.gain.value = 0; AU.deepG.connect(AU.amb);
    // pompe
    AU.pumpG = ctx.createGain(); AU.pumpG.gain.value = 0;
    const po = ctx.createOscillator(); po.type = 'sawtooth'; po.frequency.value = 48; const pf = ctx.createBiquadFilter(); pf.type = 'lowpass'; pf.frequency.value = 220;
    const pl = ctx.createOscillator(); pl.type = 'square'; pl.frequency.value = 3; const plg = ctx.createGain(); plg.gain.value = .3; pl.connect(plg); plg.connect(AU.pumpG.gain); pl.start();
    po.connect(pf); pf.connect(AU.pumpG); AU.pumpG.connect(AU.amb); po.start();
    // coro dal profondo
    AU.choirG = ctx.createGain(); AU.choirG.gain.value = 0;
    const vow = ctx.createGain(); const forms = [];
    [[650,.9],[1080,.45],[2650,.15]].forEach(([f,g])=>{ const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = 9; const gg = ctx.createGain(); gg.gain.value = g*3; vow.connect(bp); bp.connect(gg); gg.connect(AU.choirG); forms.push(bp); });
    const vl = ctx.createOscillator(); vl.frequency.value = .045; const vlg = ctx.createGain(); vlg.gain.value = 210; vl.connect(vlg); forms.slice(0,2).forEach(b=>vlg.connect(b.frequency)); vl.start();
    [73.4, 77.8, 110, 116.5, 146.8, 155.6].forEach((f,i)=>{ for (const dt of [-.35,.35]){ const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f + dt + i*.07; const g = ctx.createGain(); g.gain.value = .07;
      const vib = ctx.createOscillator(); vib.frequency.value = 4.5 + Math.random(); const vg = ctx.createGain(); vg.gain.value = f*.006; vib.connect(vg); vg.connect(o.frequency); vib.start(); o.connect(g); g.connect(vow); o.start(); } });
    AU.choirG.connect(AU.amb); AU.choirG.connect(AU.rev);
    bakeAll();
  } catch(e){ console.warn(e); AU.ctx = null; }
}
export function setUnder(u){ if (!AU.ctx || AU._under === u) return; AU._under = u; AU.underF.frequency.setTargetAtTime(u ? 520 : 20000, AU.ctx.currentTime, .15); AU.revG.gain.setTargetAtTime(u ? 1.1 : .6, AU.ctx.currentTime, .2); }

/* ---------- riproduzione ---------- */
const LAST = {}, RECENT = {};
export function play(name, o={}){
  const ctx = AU.ctx, v = BANK[name]; if (!ctx || !v) return null;
  const { vol=1, rate=1, pan=0, panTo=null, rev=.3, delay=0, dur=0, fade=.3, offset=0, lp=0 } = o;
  // mai la stessa variante due volte di fila; se lo stesso suono si accavalla, il nuovo è più piano
  let vi = Math.floor(Math.random()*v.length); if (v.length > 1 && vi === LAST[name]) vi = (vi + 1 + Math.floor(Math.random()*(v.length-1))) % v.length; LAST[name] = vi;
  const buf = v[vi], now = ctx.currentTime, recent = (RECENT[name] || []).filter(t=>now - t < .35); RECENT[name] = recent.concat(now);
  if (o.max && recent.length >= o.max) return null;
  const stackK = 1/(1 + recent.length*.6);
  const s = ctx.createBufferSource(); s.buffer = buf; s.playbackRate.value = rate;
  const g = ctx.createGain(); g.gain.value = vol*stackK; let node = s;
  if (lp){ const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; node.connect(f); node = f; }
  node.connect(g); node = g;
  const t = ctx.currentTime + delay;
  if (pan || panTo !== null){ const p = ctx.createStereoPanner(); p.pan.setValueAtTime(pan, t); if (panTo !== null) p.pan.linearRampToValueAtTime(panTo, t + (dur || buf.duration/rate)); node.connect(p); node = p; }
  node.connect(AU.dry); if (rev){ const r = ctx.createGain(); r.gain.value = rev; node.connect(r); r.connect(AU.rev); }
  const len = Math.max(.01, buf.duration - offset);
  if (dur && dur < len/rate){ s.start(t, offset, (dur + fade)*rate); g.gain.setValueAtTime(vol*stackK, t + dur); g.gain.linearRampToValueAtTime(0, t + dur + fade); }
  else s.start(t, offset);
  return s;
}
// rumore filtrato al volo, per i pochi casi che non hanno un campione
export function sfxNoise({t=0, dur=.5, f=800, q=1, type='bandpass', vol=.5, a=.01, rev=.3, rate=1}){
  if (!AU.ctx) return; const ctx = AU.ctx, now = ctx.currentTime + t;
  const s = ctx.createBufferSource(); s.buffer = AU.noise; s.playbackRate.value = rate;
  const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
  const g = ctx.createGain(); g.gain.setValueAtTime(.0001, now); g.gain.exponentialRampToValueAtTime(vol, now+a); g.gain.exponentialRampToValueAtTime(.0001, now+a+dur);
  s.connect(fl); fl.connect(g); g.connect(AU.dry);
  if (rev){ const rg = ctx.createGain(); rg.gain.value = rev; g.connect(rg); rg.connect(AU.rev); }
  s.start(now, Math.random()*2); s.stop(now + a + dur + .1);
}

/* ---------- i suoni del gioco ---------- */
// suoni "intelligenti": cambiano con la distanza, la grandezza del secchio e quanto spesso li senti
let lastClank = 0, lastDrips = 0, castN = 0;
export function splashSfx(dist, size=1){
  const v = clamp(1.4 - dist/110, .15, 1), big = clamp(Math.log2(size+1)/8, 0, 1);
  play('splash', { vol:.8*v*(1+big*.5), rate:R(.93,1.07)*(1 - big*.35), delay:dist/340, rev:.35 + clamp(dist/60,0,.4), pan:R(-.15,.15), lp:clamp(9000 - dist*90, 1500, 9000), max:3 });
}
export function castSfx(flight=.6){ castN++; play('cast', { vol:.42, rate:clamp(.55/Math.max(.2,flight), .85, 1.25)*R(.96,1.04), rev:.1, pan:.25, max:2 }); }
export function reelSfx(dur=.6){ play('reel', { vol:.36, dur:Math.min(dur, 1.3), fade:.12, rate:R(.95,1.05), rev:.08, pan:.3, max:2 }); }
export function pullSfx(){ castSfx(.6); }
export function clankSfx(){ const n = AU.ctx ? AU.ctx.currentTime : 0; if (n - lastClank < 2.2 && Math.random() < .7) return; lastClank = n; play('clank', { vol:.24, rate:R(.95,1.06), rev:.22, pan:.35 }); }
export function dripsSfx(){ const now = AU.ctx ? AU.ctx.currentTime : 0, busy = now - lastDrips < 3; lastDrips = now;
  const n = busy ? 1 + Math.floor(Math.random()*2) : 3 + Math.floor(Math.random()*3); for (let i=0;i<n;i++) play('drip', { vol:R(.06,.14)*(busy?.7:1), rate:R(.85,1.2), delay:R(.05,1.4), pan:R(.1,.6), rev:.3 }); }
// durante telefonate e scelte i rumori di fondo si abbassano
export function duck(on){ if (!AU.ctx || AU._duck === on) return; AU._duck = on; AU.amb.gain.setTargetAtTime(on ? .45 : 1, AU.ctx.currentTime, on ? .3 : 1.2); }
export function coinSfx(){ play('coin', { vol:.32, rev:.2 }); }
export function bellSfx(far=1){ play('bell', { vol:.75/far, rate:far>1 ? .94 : 1, rev:.55 + (far-1)*.5, lp:far>1 ? 1100 : 0 }); }
export function groanSfx(vol=.6, dur=4){ play('groan', { vol:vol*1.1, dur:Math.min(dur,7), fade:.9, rate:R(.85,1.05), rev:.55 }); }
export function whisperSfx(dur=2.5, vol=.25){ const p = R(-.9,.9); play('whisper', { vol:vol*2.1, dur:Math.min(dur,3.3), fade:.4, pan:p, panTo:clamp(p + R(-1,1), -1, 1), rev:.4, rate:R(.92,1.08) }); }
export function stingerSfx(){ play('stinger', { vol:.85, rev:.45, offset:.56 }); }
export function heartSfx(vol=.5){ play('heart', { vol:vol*1.25, rev:.04, rate:R(.97,1.03) }); }
export function creakSfx(){ play('creak', { vol:.32, rate:R(.85,1.15), pan:R(-.6,.6), rev:.3 }); }
export function footstepSfx(){ play('footstep', { vol:.45, pan:R(-.25,.25), rev:.18, rate:R(.92,1.08) }); }
export function ringSfx(){ play('ring', { vol:.32, rev:.15 }); play('ring', { vol:.32, rev:.15, delay:1.5 }); }
export function staticSfx(dur=1){ play('static', { vol:.22, dur:Math.min(dur,3), fade:.08, offset:R(0,.2) }); }
export function bubbleSfx(){ play('bubble', { vol:.4, rate:R(.85,1.15), pan:R(-.5,.5), rev:.5 }); }
export function thunderSfx(delay=1.5, vol=.7){ play('thunder', { vol:vol*1.15, delay, rev:.65, rate:R(.85,1.1), pan:R(-.4,.4) }); }
export function deepCallSfx(vol=.6){ play('deepcall', { vol:vol*1.25, rev:.8, rate:R(.9,1.05) }); }
export function rumbleSfx(dur=10, vol=.5){ play('rumble', { vol, dur:Math.min(dur,11), fade:1.2, rev:.35 }); }
export function knockSfx(vol=.7, pan=0){ play('knock', { vol, pan, rev:.22, rate:R(.92,1.08) }); }
export function revealSfx(){ play('reveal', { vol:.55, rev:.7 }); }
export function musicBoxSfx(vol=.16){ const p = R(-.8,.8); play('musicbox', { vol:vol*2.4, pan:p, panTo:-p, rev:.75, lp:2600 }); }
export function breathSfx(inhale=true, dur=2.2, vol=.2){ play(inhale ? 'breathIn' : 'breathOut', { vol:vol*2, dur:Math.min(dur,2.6), fade:.3, rev:.12, pan:R(-.2,.2) }); }
export function honkSfx(){ play('honk', { vol:.32, rev:.7, lp:1700 }); }
export function dripSfx(vol=.12){ play('drip', { vol:vol*2, rate:R(.8,1.25), pan:R(-.7,.7), rev:.55 }); }
