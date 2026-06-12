/* GRAVEYARD SHIFT — procedural audio engine (WebAudio, no external files) */
window.AudioSys = (function () {
  let ctx = null, master = null, noiseBuf = null;
  const loops = {}; // named looping sound handles

  function ensure() {
    try {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return false;
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = 0.55;
        master.connect(ctx.destination);
      }
      if (ctx.state === 'suspended') ctx.resume();
      return true;
    } catch (e) { return false; }
  }

  function getNoiseBuf() {
    if (!noiseBuf) {
      const len = ctx.sampleRate * 2;
      noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    return noiseBuf;
  }

  function noiseSrc(loop) {
    const src = ctx.createBufferSource();
    src.buffer = getNoiseBuf();
    src.loop = !!loop;
    return src;
  }

  function env(gainNode, t0, a, peak, d, sustain) {
    const g = gainNode.gain;
    g.setValueAtTime(0.0001, t0);
    g.exponentialRampToValueAtTime(Math.max(peak, 0.0001), t0 + a);
    g.exponentialRampToValueAtTime(Math.max(sustain || 0.0001, 0.0001), t0 + a + d);
  }

  function stopLoop(name, fade) {
    const h = loops[name];
    if (!h) return;
    delete loops[name];
    try {
      const t = ctx.currentTime;
      h.gain.gain.cancelScheduledValues(t);
      h.gain.gain.setValueAtTime(h.gain.gain.value, t);
      h.gain.gain.exponentialRampToValueAtTime(0.0001, t + (fade || 0.2));
      (h.nodes || []).forEach(n => { try { n.stop(t + (fade || 0.2) + 0.05); } catch (e) {} });
    } catch (e) {}
  }

  function stopAllLoops() { Object.keys(loops).forEach(k => stopLoop(k, 0.15)); }

  // ---- ambient office hum + fan ----
  function ambience(on) {
    if (!ensure()) return;
    if (!on) { stopLoop('hum'); stopLoop('fan'); return; }
    if (loops.hum) return;
    const t = ctx.currentTime;
    // mains hum
    const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = 58;
    const og = ctx.createGain(); og.gain.value = 0.018;
    osc.connect(og);
    // brown-ish noise rumble
    const n = noiseSrc(true);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 110;
    const ng = ctx.createGain(); ng.gain.value = 0.05;
    n.connect(lp); lp.connect(ng);
    const sum = ctx.createGain(); sum.gain.value = 0.0001;
    og.connect(sum); ng.connect(sum); sum.connect(master);
    sum.gain.exponentialRampToValueAtTime(1.0, t + 1.2);
    osc.start(); n.start();
    loops.hum = { gain: sum, nodes: [osc, n] };
    // desk fan: filtered noise with flutter
    const fn = noiseSrc(true);
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 320; bp.Q.value = 1.2;
    const fg = ctx.createGain(); fg.gain.value = 0.0001;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 14;
    const lg = ctx.createGain(); lg.gain.value = 0.008;
    lfo.connect(lg); lg.connect(fg.gain);
    fn.connect(bp); bp.connect(fg); fg.connect(master);
    fg.gain.setValueAtTime(0.0001, t);
    fg.gain.exponentialRampToValueAtTime(0.030, t + 1.5);
    fn.start(); lfo.start();
    loops.fan = { gain: fg, nodes: [fn, lfo] };
  }

  // ---- door light buzz, per side ----
  function buzz(side, on) {
    if (!ensure()) return;
    const name = 'buzz' + side;
    if (!on) { stopLoop(name, 0.05); return; }
    if (loops[name]) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator(); osc.type = 'square'; osc.frequency.value = 122;
    const g = ctx.createGain(); g.gain.value = 0.0001;
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    osc.connect(g);
    if (pan) { pan.pan.value = side === 'L' ? -0.7 : 0.7; g.connect(pan); pan.connect(master); }
    else g.connect(master);
    g.gain.exponentialRampToValueAtTime(0.022, t + 0.03);
    osc.start();
    loops[name] = { gain: g, nodes: [osc] };
  }

  // ---- one-shots ----
  function blip(freq, vol, dur) {
    if (!ensure()) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = freq || 880;
    const g = ctx.createGain(); o.connect(g); g.connect(master);
    env(g, t, 0.005, vol || 0.12, dur || 0.09);
    o.start(t); o.stop(t + 0.3);
  }

  function camFlip(up) {
    if (!ensure()) return;
    const t = ctx.currentTime;
    const n = noiseSrc(false);
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 0.7;
    f.frequency.setValueAtTime(up ? 400 : 1600, t);
    f.frequency.exponentialRampToValueAtTime(up ? 1800 : 300, t + 0.12);
    const g = ctx.createGain(); n.connect(f); f.connect(g); g.connect(master);
    env(g, t, 0.01, 0.18, 0.14);
    n.start(t); n.stop(t + 0.3);
  }

  function camSwitch() {
    if (!ensure()) return;
    const t = ctx.currentTime;
    const n = noiseSrc(false);
    const g = ctx.createGain(); n.connect(g); g.connect(master);
    env(g, t, 0.004, 0.10, 0.05);
    n.start(t); n.stop(t + 0.1);
    blip(1200, 0.05, 0.04);
  }

  function thud(freq, vol, dur, panV, when) {
    const t = (when || ctx.currentTime);
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(28, freq * 0.4), t + dur);
    const g = ctx.createGain(); o.connect(g);
    let out = g;
    if (ctx.createStereoPanner && panV) { const p = ctx.createStereoPanner(); p.pan.value = panV; g.connect(p); out = p; }
    out.connect(master);
    env(g, t, 0.004, vol, dur);
    o.start(t); o.stop(t + dur + 0.2);
  }

  function doorSlam(side) {
    if (!ensure()) return;
    const t = ctx.currentTime;
    const pan = side === 'L' ? -0.6 : 0.6;
    thud(95, 0.5, 0.22, pan, t);
    const n = noiseSrc(false);
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900;
    const g = ctx.createGain(); n.connect(f); f.connect(g); g.connect(master);
    env(g, t, 0.005, 0.30, 0.18);
    n.start(t); n.stop(t + 0.4);
  }

  function knock(side, loud) {
    if (!ensure()) return;
    const t = ctx.currentTime;
    const pan = side === 'L' ? -0.7 : 0.7;
    const v = loud ? 0.65 : 0.35;
    thud(70, v, 0.16, pan, t);
    thud(64, v * 0.8, 0.16, pan, t + 0.18);
    if (loud) thud(55, v, 0.3, pan, t + 0.34);
  }

  function breath(side) {
    if (!ensure()) return;
    const t = ctx.currentTime;
    const n = noiseSrc(false);
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 500; f.Q.value = 0.6;
    const g = ctx.createGain();
    let out = g;
    if (ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = side === 'L' ? -0.8 : 0.8; g.connect(p); out = p; n.connect(f); f.connect(g); }
    else { n.connect(f); f.connect(g); }
    out.connect(master);
    const gg = g.gain;
    gg.setValueAtTime(0.0001, t);
    gg.linearRampToValueAtTime(0.07, t + 0.5);
    gg.linearRampToValueAtTime(0.0001, t + 1.1);
    n.start(t); n.stop(t + 1.2);
  }

  function steps(count, panV) {
    if (!ensure()) return;
    const t = ctx.currentTime;
    for (let i = 0; i < count; i++) thud(60 + Math.random() * 12, 0.18, 0.12, panV || 0, t + i * 0.42);
  }

  function sprint() {
    if (!ensure()) return;
    const t = ctx.currentTime;
    for (let i = 0; i < 7; i++) thud(75 + Math.random() * 20, 0.26, 0.09, -0.5, t + i * 0.16);
  }

  function scream() {
    if (!ensure()) return;
    const t = ctx.currentTime;
    // distorted vocal-ish saw glide
    const o = ctx.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(640, t);
    o.frequency.exponentialRampToValueAtTime(110, t + 0.85);
    const o2 = ctx.createOscillator(); o2.type = 'square';
    o2.frequency.setValueAtTime(310, t);
    o2.frequency.exponentialRampToValueAtTime(70, t + 0.85);
    const sh = ctx.createWaveShaper();
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) { const x = i / 128 - 1; curve[i] = Math.tanh(3.2 * x); }
    sh.curve = curve;
    const og = ctx.createGain(); og.gain.value = 0.5;
    o.connect(og); o2.connect(og); og.connect(sh);
    const g = ctx.createGain(); sh.connect(g); g.connect(master);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.85, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.05);
    // harsh noise layer
    const n = noiseSrc(false);
    const bf = ctx.createBiquadFilter(); bf.type = 'bandpass'; bf.frequency.value = 1500; bf.Q.value = 0.8;
    const ng = ctx.createGain(); n.connect(bf); bf.connect(ng); ng.connect(master);
    ng.gain.setValueAtTime(0.0001, t);
    ng.gain.exponentialRampToValueAtTime(0.5, t + 0.03);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    o.start(t); o.stop(t + 1.1); o2.start(t); o2.stop(t + 1.1);
    n.start(t); n.stop(t + 1.0);
  }

  function powerDown() {
    if (!ensure()) return;
    stopAllLoops();
    const t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(160, t);
    o.frequency.exponentialRampToValueAtTime(34, t + 1.6);
    const g = ctx.createGain(); o.connect(g); g.connect(master);
    g.gain.setValueAtTime(0.2, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
    o.start(t); o.stop(t + 2.0);
  }

  function chime() {
    if (!ensure()) return;
    stopAllLoops();
    const t = ctx.currentTime;
    const notes = [880, 1108.7, 1318.5, 1760, 1318.5, 1760];
    notes.forEach((f, i) => {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
      const g = ctx.createGain(); o.connect(g); g.connect(master);
      const t0 = t + i * 0.28;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.14, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.9);
      o.start(t0); o.stop(t0 + 1.0);
    });
  }

  function menuStatic(on) {
    if (!ensure()) return;
    if (!on) { stopLoop('mstatic'); return; }
    if (loops.mstatic) return;
    const n = noiseSrc(true);
    const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 900;
    const g = ctx.createGain(); g.gain.value = 0.012;
    n.connect(f); f.connect(g); g.connect(master);
    n.start();
    loops.mstatic = { gain: g, nodes: [n] };
  }

  function typeTick() { blip(2400 + Math.random() * 400, 0.025, 0.02); }

  return {
    ensure, ambience, buzz, blip, camFlip, camSwitch, doorSlam, knock, breath,
    steps, sprint, scream, powerDown, chime, menuStatic, typeTick, stopAllLoops
  };
})();
