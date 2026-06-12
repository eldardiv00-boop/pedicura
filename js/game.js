/* GRAVEYARD SHIFT — main game logic.
   Survive 12 AM – 6 AM in the workshop office. Doors, lights, cameras, power. */
(function () {
  const A = window.Art, S = window.AudioSys;
  const W = A.W, H = A.H;
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  // ---------- constants ----------
  const HOUR_LEN = 55;            // seconds per in-game hour
  const NIGHT_LEN = HOUR_LEN * 6;
  const OW = 1600;                // office virtual width (matches art.js)
  const PAN_MAX = OW - W;

  const ROOMS = [
    'WORKSHOP FLOOR', 'ASSEMBLY LINE', 'PAINT BOOTH', 'STORAGE RACKS',
    'MAINTENANCE BAY', 'WEST HALL', 'WEST CORNER', 'EAST HALL', 'EAST CORNER'
  ];

  const PATHS = {
    strix:  [0, 1, 3, 5, 6],   // -> LEFT door
    howler: [0, 2, 7, 8],      // -> RIGHT door
    wart:   [0, 1, 7, 8]       // -> RIGHT door (freezes on camera)
  };
  const SIDE = { strix: 'L', howler: 'R', wart: 'R' };
  // AI level per night (index 1..6)
  const LEVELS = {
    strix:  [0, 2, 4, 6, 8, 10, 14],
    howler: [0, 1, 3, 5, 7, 9, 13],
    wart:   [0, 0, 2, 4, 6, 8, 12],
    rust:   [0, 0, 2, 4, 6, 8, 12]
  };
  const INTERVALS = { strix: 4.8, howler: 5.2, wart: 6.0, rust: 5.5 };

  const MEMOS = {
    1: "NIGHT 1 — Welcome aboard. The bots on the floor still run their old\ncrowd-pleaser routines after midnight. Corporate says ignore it.\nI say: keep the doors shut when they wander close.\nPower is on a budget. Spend it like it's yours.   — R.",
    2: "NIGHT 2 — Heads up: the owl gets restless after 2 AM.\nIf the door light shows feathers, shut it fast.\nAnd glance at the MAINTENANCE BAY now and then.\nRUST gets bold when nobody's watching.",
    3: "NIGHT 3 — The toad is awake. WART stops cold while you watch\nhim on camera. Use that. And stop wasting power on\nlights you don't need. The dark is fine. Mostly.",
    4: "NIGHT 4 — Keep the cameras moving. If the bay door is open and\nthe cat is GONE — close the WEST door and count to ten.\nIf you hear sprinting, it's already close.",
    5: "NIGHT 5 — Last one. They're all walking tonight.\nDoors win fights. Power wins nights.\nMake it to 6 AM.   — R.",
    6: "OVERTIME — You shouldn't be here. Nobody signs up twice.\nWhatever winds them up, it's worse tonight.\nGood luck. You'll need all of it."
  };

  const TIPS = [
    'TIP: door lights reveal visitors before it is too late.',
    'TIP: WART freezes while his camera is on screen.',
    'TIP: if the maintenance bay is empty, close the WEST door.',
    'TIP: closed doors and lights drain power. Open up when it is safe.',
    'TIP: listen. Footsteps and breathing give them away.'
  ];

  // ---------- persistence ----------
  const SAVE_KEY = 'graveyard_shift_save_v1';
  function loadSave() {
    try {
      const s = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (s && s.next) return s;
    } catch (e) {}
    return { next: 1, beat5: false, beat6: false };
  }
  function writeSave(s) {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch (e) {}
  }
  let save = loadSave();

  // ---------- state ----------
  let state = 'menu';      // menu|howto|intro|night|jumpscare|gameover|nightdone|win
  let stateT = 0;          // seconds in current state
  let night = 1;
  let G = null;            // per-night game data
  let jumpWho = 'strix';
  let tipLine = TIPS[0];
  let mouse = { x: W / 2, y: H / 2 };
  let uiButtons = [];      // rebuilt each frame on menu-ish screens
  let hoverUI = false;
  let memoChars = 0;       // typed intro progress
  let winOvertime = false;

  function rnd(n) { return Math.random() * n; }
  function irnd(n) { return (Math.random() * n) | 0; }

  function newNight(n) {
    night = n;
    G = {
      t: 0,
      power: 100,
      pan: PAN_MAX / 2,
      doors: { L: { closed: false, anim: 0 }, R: { closed: false, anim: 0 } },
      lights: { L: false, R: false },
      monitor: { up: false, anim: 0, cam: 0, burst: 0 },
      fanA: 0,
      flicker: 1,
      hallFlick: true,
      chars: {
        strix:  { idx: 0, state: 'path', timer: INTERVALS.strix * (1 + rnd(0.5)), killT: 0, defendT: 0 },
        howler: { idx: 0, state: 'path', timer: INTERVALS.howler * (1 + rnd(0.5)), killT: 0, defendT: 0 },
        wart:   { idx: 0, state: 'path', timer: INTERVALS.wart * (1 + rnd(0.5)), killT: 0, defendT: 0 }
      },
      rust: { stage: 0, timer: INTERVALS.rust, sprinting: false, sprintT: 0 },
      blackout: false,
      bo: { t: 0, eyesAt: 0, killAt: 0, eyes: 0, stepsPlayed: false },
      shake: 0,
      toastT: 0,
      lastHour: 0,
      lowBeepT: 0,
      nextCreak: 12 + rnd(20),
      camSeen: {}
    };
    S.ambience(true);
  }

  function addShake(n) { if (G) G.shake = Math.min(16, G.shake + n); }

  // ---------- door/light/monitor actions ----------
  function doorClosed(side) { return G.doors[side].closed; }

  function toggleDoor(side) {
    if (state !== 'night' || G.blackout) return;
    const d = G.doors[side];
    d.closed = !d.closed;
    S.doorSlam(side);
    addShake(3);
  }

  function toggleLight(side) {
    if (state !== 'night' || G.blackout || G.monitor.up) return;
    G.lights[side] = !G.lights[side];
    S.buzz(side, G.lights[side]);
    if (G.lights[side]) S.blip(300, 0.05, 0.04);
  }

  function lightsOff() {
    if (G.lights.L) { G.lights.L = false; S.buzz('L', false); }
    if (G.lights.R) { G.lights.R = false; S.buzz('R', false); }
  }

  function toggleMonitor() {
    if (state !== 'night' || G.blackout) return;
    G.monitor.up = !G.monitor.up;
    G.monitor.burst = 0.4;
    S.camFlip(G.monitor.up);
    if (G.monitor.up) lightsOff();
  }

  // what's visible on a feed right now (for motion detection)
  function camSig(i) {
    let sig = '';
    for (const who of ['strix', 'howler', 'wart']) {
      const c = G.chars[who];
      if (c.state === 'path' && PATHS[who][c.idx] === i) sig += who;
    }
    if (i === 4) sig += 'r' + G.rust.stage;
    return sig;
  }

  function switchCam(i) {
    if (!G.monitor.up || i === G.monitor.cam) return;
    G.monitor.cam = i;
    // bigger interference burst if the room changed since you last looked
    const moved = G.camSeen[i] !== undefined && G.camSeen[i] !== camSig(i);
    G.monitor.burst = moved ? 0.75 : 0.45;
    S.camSwitch();
  }

  // ---------- jumpscare / endings ----------
  function triggerJumpscare(who) {
    if (state !== 'night') return;
    jumpWho = who;
    state = 'jumpscare';
    stateT = 0;
    tipLine = TIPS[irnd(TIPS.length)];
    S.stopAllLoops();
    S.scream();
  }

  function nightComplete() {
    state = 'nightdone';
    stateT = 0;
    S.chime();
    if (night >= 5) save.beat5 = true;
    if (night >= 6) save.beat6 = true;
    save.next = Math.max(save.next, Math.min(night + 1, 6));
    writeSave(save);
  }

  // ---------- character AI ----------
  function charAtDoor(side) {
    for (const who of ['strix', 'howler', 'wart']) {
      if (SIDE[who] === side && G.chars[who].state === 'door') return who;
    }
    return null;
  }

  function effLevel(who) {
    const hour = Math.floor(G.t / HOUR_LEN);
    let lv = LEVELS[who][night] + (hour >= 2 ? 1 : 0) + (hour >= 4 ? 1 : 0);
    return Math.min(lv, 20);
  }

  function retreat(who) {
    const c = G.chars[who];
    const path = PATHS[who];
    c.state = 'path';
    c.idx = Math.max(0, path.length - 3 - irnd(2));
    c.defendT = 0;
    c.timer = INTERVALS[who] * 1.3;
  }

  function updateChar(who, dt) {
    const c = G.chars[who];
    const path = PATHS[who];
    const side = SIDE[who];

    if (c.state === 'door') {
      if (doorClosed(side)) {
        c.defendT += dt;
        if (c.defendT > 0.8) { S.knock(side, false); addShake(5); retreat(who); }
      } else {
        c.defendT = 0;
        c.killT -= dt;
        if (c.killT <= 0) triggerJumpscare(who);
      }
      return;
    }

    c.timer -= dt;
    if (c.timer > 0) return;
    c.timer += INTERVALS[who] * (0.85 + rnd(0.3));

    // WART freezes while his room is on the monitor
    if (who === 'wart' && G.monitor.up && PATHS.wart[c.idx] === G.monitor.cam) return;

    if (irnd(20) >= effLevel(who)) return; // failed move roll

    if (c.idx < path.length - 1) {
      c.idx++;
      if (c.idx >= path.length - 2) S.steps(1, side === 'L' ? -0.4 : 0.4);
    } else {
      // step from the corner to the door
      if (doorClosed(side)) {
        S.knock(side, false);
        addShake(5);
        retreat(who);
      } else {
        c.state = 'door';
        c.killT = Math.max(2.4, 4.8 - night * 0.35);
        c.defendT = 0;
        S.breath(side);
        addShake(1.5);
      }
    }
  }

  function updateRust(dt) {
    const r = G.rust;
    if (r.sprinting) {
      r.sprintT -= dt;
      if (r.sprintT <= 0) {
        r.sprinting = false;
        if (doorClosed('L')) {
          S.knock('L', true);
          addShake(12);
          G.power = Math.max(0, G.power - (1 + irnd(5)));
          r.stage = 0;
          r.timer = INTERVALS.rust * 2;
        } else {
          triggerJumpscare('rust');
        }
      }
      return;
    }
    r.timer -= dt;
    if (r.timer > 0) return;
    r.timer += INTERVALS.rust * (0.85 + rnd(0.3));
    // watching the bay holds him in place
    if (G.monitor.up && G.monitor.cam === 4) return;
    if (irnd(20) >= effLevel('rust')) return;
    r.stage++;
    if (r.stage >= 3) {
      r.stage = 3;
      r.sprinting = true;
      r.sprintT = 2.1;
      S.sprint();
    }
  }

  // ---------- blackout ----------
  function startBlackout() {
    G.blackout = true;
    G.doors.L.closed = false;
    G.doors.R.closed = false;
    lightsOff();
    G.monitor.up = false;
    G.bo.t = 0;
    G.bo.eyesAt = 5 + rnd(6);
    G.bo.killAt = G.bo.eyesAt + 4 + rnd(7);
    G.bo.stepsPlayed = false;
    S.powerDown();
  }

  function updateBlackout(dt) {
    G.bo.t += dt;
    if (G.bo.t > G.bo.eyesAt) {
      if (!G.bo.stepsPlayed) { G.bo.stepsPlayed = true; S.steps(4, -0.6); }
      G.bo.eyes = (Math.sin(G.t * 11) > -0.2 ? 0.8 : 0.1) + rnd(0.1);
    }
    if (G.bo.t > G.bo.killAt) triggerJumpscare('strix');
  }

  // ---------- night update ----------
  function updateNight(dt) {
    G.t += dt;
    G.fanA += dt * (G.blackout ? 1 : 16);
    G.flicker = Math.random() < 0.05 ? rnd(1) : 1;
    if (Math.random() < 0.04) G.hallFlick = !G.hallFlick;
    G.shake = Math.max(0, G.shake - dt * 26);
    G.toastT = Math.max(0, G.toastT - dt);

    // hour rollover toast
    const hr = Math.floor(G.t / HOUR_LEN);
    if (hr !== G.lastHour && hr < 6) {
      G.lastHour = hr;
      G.toastT = 2.4;
      S.blip(520, 0.05, 0.3);
    }

    // distant workshop creaks
    G.nextCreak -= dt;
    if (G.nextCreak <= 0) { G.nextCreak = 14 + rnd(26); S.creak(); }

    // heartbeat when something is breathing down your neck
    const danger = !G.blackout && (!!charAtDoor('L') || !!charAtDoor('R') || G.rust.sprinting);
    S.heart(danger);

    // low-power warning chirp
    if (!G.blackout && G.power < 20) {
      G.lowBeepT -= dt;
      if (G.lowBeepT <= 0) { G.lowBeepT = 5; S.blip(190, 0.05, 0.25); }
    }

    // pan toward mouse
    const target = (mouse.x / W) * PAN_MAX;
    G.pan += (target - G.pan) * Math.min(1, dt * 3.2);

    // door/monitor animation
    for (const s2 of ['L', 'R']) {
      const d = G.doors[s2];
      const goal = d.closed ? 1 : 0;
      d.anim += Math.sign(goal - d.anim) * dt * 5;
      d.anim = Math.max(0, Math.min(1, d.anim));
    }
    const m = G.monitor;
    m.anim += (m.up ? 1 : -1) * dt * 6;
    m.anim = Math.max(0, Math.min(1, m.anim));
    m.burst = Math.max(0, m.burst - dt);

    // 6 AM?
    if (G.t >= NIGHT_LEN) { nightComplete(); return; }

    if (G.blackout) { updateBlackout(dt); return; }

    // power drain
    const usage = 1 + (G.doors.L.closed ? 1 : 0) + (G.doors.R.closed ? 1 : 0) +
      (G.lights.L ? 1 : 0) + (G.lights.R ? 1 : 0) + (G.monitor.up ? 1 : 0);
    G.usage = usage;
    const rate = 0.092 + night * 0.0075;
    G.power -= usage * rate * dt;
    if (G.power <= 0) { G.power = 0; startBlackout(); return; }

    updateChar('strix', dt);
    if (state !== 'night') return;
    updateChar('howler', dt);
    if (state !== 'night') return;
    updateChar('wart', dt);
    if (state !== 'night') return;
    updateRust(dt);
  }

  // ---------- drawing: HUD ----------
  function hourLabel() {
    const h = Math.floor(G.t / HOUR_LEN);
    return (h === 0 ? 12 : h) + ' AM';
  }

  function drawHUD() {
    // power
    const pw = Math.ceil(G.power);
    A.text(ctx, 'POWER LEFT: ' + pw + '%', 18, H - 46, 18, pw < 20 ? '#ff5a5a' : '#cfd6d2', 'left');
    A.text(ctx, 'USAGE:', 18, H - 22, 14, '#8a948e', 'left');
    const u = G.usage || 1;
    for (let i = 0; i < u; i++) {
      ctx.fillStyle = i < 2 ? '#37e05e' : (i < 4 ? '#ffd24a' : '#ff5a5a');
      ctx.fillRect(86 + i * 16, H - 30, 12, 16);
    }
    // time / night
    A.text(ctx, hourLabel(), W - 18, 28, 26, '#e8e8e0', 'right');
    A.text(ctx, 'NIGHT ' + night, W - 18, 52, 14, '#8a948e', 'right');
  }

  function drawMonitorStrip(up) {
    const hov = mouse.y > 500 && mouse.x > 290 && mouse.x < 670;
    ctx.fillStyle = hov ? 'rgba(180,195,215,0.22)' : 'rgba(120,130,145,0.12)';
    A.rr(ctx, 300, 506, 360, 26, 6); ctx.fill();
    A.text(ctx, up ? '▼  CLOSE  ▼' : '▲  CAMERAS  ▲', 480, 519, 13, '#aeb8c4', 'center', null, 3);
  }

  // camera map panel; returns hit rects
  const MAP_RECTS = [
    { i: 0, x: 144, y: 8,  w: 78, h: 44 },
    { i: 1, x: 76,  y: 8,  w: 62, h: 36 },
    { i: 2, x: 228, y: 8,  w: 54, h: 36 },
    { i: 3, x: 8,   y: 8,  w: 62, h: 36 },
    { i: 4, x: 8,   y: 70, w: 56, h: 32 },
    { i: 5, x: 98,  y: 58, w: 34, h: 64 },
    { i: 6, x: 98,  y: 130, w: 34, h: 26 },
    { i: 7, x: 196, y: 58, w: 34, h: 64 },
    { i: 8, x: 196, y: 130, w: 34, h: 26 }
  ];
  const MAP_X = 650, MAP_Y = 332;

  function drawCamUI() {
    const camIdx = G.monitor.cam;
    // room view
    const occ = [];
    for (const who of ['strix', 'howler', 'wart']) {
      const c = G.chars[who];
      if (c.state === 'path' && PATHS[who][c.idx] === camIdx) occ.push({ who });
    }
    A.drawCamView(ctx, camIdx, occ, {
      t: G.t,
      rustStage: G.rust.stage,
      sprintFlash: G.rust.sprinting,
      lightFlicker: G.hallFlick
    });
    G.camSeen[camIdx] = camSig(camIdx); // mark this feed as "seen like this"

    // CRT dressing
    A.glitch(ctx, G.t, 1);
    A.noiseOverlay(ctx, 0.10 + G.monitor.burst * 0.8);
    A.scanlines(ctx, 0.4);
    A.vignette(ctx, 0.55);

    // label + REC + timestamp
    A.text(ctx, 'CAM 0' + (camIdx + 1) + ' — ' + ROOMS[camIdx], 22, 30, 18, '#cfe6cf', 'left', null, 2);
    const mins = Math.floor((G.t % HOUR_LEN) / HOUR_LEN * 60);
    A.text(ctx, 'NIGHT ' + night + '  ' + hourLabel().replace(' ', ':' + (mins < 10 ? '0' : '') + mins + ' '),
      22, H - 24, 13, 'rgba(180,220,180,0.55)', 'left', null, 1);
    if (Math.floor(G.t * 2) % 2 === 0) {
      ctx.fillStyle = '#ff4040';
      ctx.beginPath(); ctx.arc(28, 58, 6, 0, 7); ctx.fill();
    }
    A.text(ctx, 'REC', 42, 58, 14, '#ff8a8a', 'left');

    // map panel
    ctx.fillStyle = 'rgba(8,10,12,0.82)';
    A.rr(ctx, MAP_X, MAP_Y, 292, 192, 8); ctx.fill();
    ctx.strokeStyle = 'rgba(160,175,190,0.35)'; ctx.lineWidth = 1.5;
    A.rr(ctx, MAP_X, MAP_Y, 292, 192, 8); ctx.stroke();
    // office block (not clickable)
    ctx.fillStyle = 'rgba(110,120,135,0.25)';
    A.rr(ctx, MAP_X + 136, MAP_Y + 134, 56, 44, 4); ctx.fill();
    A.text(ctx, 'YOU', MAP_X + 164, MAP_Y + 156, 11, '#cfd6d2', 'center');
    MAP_RECTS.forEach(r => {
      const hov = mouse.x > MAP_X + r.x && mouse.x < MAP_X + r.x + r.w &&
                  mouse.y > MAP_Y + r.y && mouse.y < MAP_Y + r.y + r.h;
      const act = r.i === camIdx;
      ctx.fillStyle = act ? 'rgba(90,200,120,0.30)' : (hov ? 'rgba(160,175,190,0.25)' : 'rgba(70,80,92,0.30)');
      A.rr(ctx, MAP_X + r.x, MAP_Y + r.y, r.w, r.h, 4); ctx.fill();
      if (act) {
        ctx.strokeStyle = '#67d98a'; ctx.lineWidth = 1.5;
        A.rr(ctx, MAP_X + r.x, MAP_Y + r.y, r.w, r.h, 4); ctx.stroke();
      }
      A.text(ctx, String(r.i + 1), MAP_X + r.x + r.w / 2, MAP_Y + r.y + r.h / 2, 13, '#dfe8df', 'center');
    });
  }

  // ---------- drawing: night ----------
  function drawNight() {
    // screen shake
    ctx.save();
    if (G.shake > 0.1) {
      ctx.translate((Math.random() - 0.5) * G.shake, (Math.random() - 0.5) * G.shake);
    }
    const atL = charAtDoor('L'), atR = charAtDoor('R');
    if (G.monitor.anim > 0.6) {
      drawCamUI();
    } else {
      A.drawOffice(ctx, {
        pan: G.pan,
        doorL: G.doors.L.anim, doorR: G.doors.R.anim,
        lightL: G.lights.L, lightR: G.lights.R,
        atL: atL, atR: atR,
        fanA: G.fanA,
        blackout: G.blackout,
        eyesFlicker: G.blackout ? G.bo.eyes : 0,
        flicker: G.flicker,
        t: G.t,
        prog: G.t / NIGHT_LEN,
        powerLow: G.power < 20
      });
      A.vignette(ctx, 0.5);
      A.noiseOverlay(ctx, 0.05);
    }
    // danger: pulsing edge darkness while something waits at a door
    if (!G.blackout && (atL || atR || G.rust.sprinting)) {
      A.vignette(ctx, 0.22 + 0.13 * Math.sin(G.t * 5.2));
    }
    // monitor flip wipe
    if (G.monitor.anim > 0.05 && G.monitor.anim < 0.95) {
      ctx.fillStyle = 'rgba(0,0,0,' + (0.85 - Math.abs(G.monitor.anim - 0.5)) + ')';
      ctx.fillRect(0, 0, W, H);
      A.noiseOverlay(ctx, 0.3);
    }
    if (!G.blackout) drawMonitorStrip(G.monitor.up);
    drawHUD();
    // hour rollover toast
    if (G.toastT > 0) {
      const a = Math.min(1, G.toastT / 0.6) * Math.min(1, (2.4 - G.toastT) / 0.4);
      A.text(ctx, hourLabel(), W / 2, 90, 40, 'rgba(232,232,224,' + a * 0.85 + ')', 'center', null, 8);
    }
    ctx.restore();
  }

  // ---------- menu-ish screens ----------
  function button(x, y, w, h, label, cb, size) {
    uiButtons.push({ x, y, w, h, cb });
    const hov = mouse.x > x && mouse.x < x + w && mouse.y > y && mouse.y < y + h;
    if (hov) hoverUI = true;
    ctx.fillStyle = hov ? 'rgba(190,205,225,0.16)' : 'rgba(120,130,145,0.08)';
    A.rr(ctx, x, y, w, h, 6); ctx.fill();
    ctx.strokeStyle = hov ? '#cfd6d2' : 'rgba(160,170,180,0.4)'; ctx.lineWidth = 1.5;
    A.rr(ctx, x, y, w, h, 6); ctx.stroke();
    A.text(ctx, (hov ? '> ' : '') + label, x + 18, y + h / 2, size || 18, hov ? '#eef2ee' : '#aeb8b4', 'left', null, 2);
  }

  function drawMenu(t) {
    A.drawMenuBg(ctx, t);
    // faulty-sign title: occasional brightness drops and a rare full blink
    const flick = Math.random() < 0.05 ? 0.3 + rnd(0.45) : 1;
    ctx.save();
    ctx.globalAlpha = flick;
    A.text(ctx, 'GRAVEYARD', 80, 120, 64, '#dfe3df', 'left', null, 10);
    A.text(ctx, 'SHIFT', 80, 185, 64, '#dfe3df', 'left', null, 10);
    ctx.restore();
    A.text(ctx, 'at Bergmann\'s Workshop', 84, 232, 18, '#8a948e', 'left', null, 3);

    let y = 290;
    if (save.next > 1) {
      button(80, y, 320, 44, 'CONTINUE — NIGHT ' + Math.min(save.next, 6), () => {
        startIntro(Math.min(save.next, 5 + (save.beat5 ? 1 : 0)));
      });
      y += 56;
    }
    button(80, y, 320, 44, 'NEW GAME', () => startIntro(1)); y += 56;
    if (save.beat5) {
      button(80, y, 320, 44, 'OVERTIME ' + (save.beat6 ? '★' : '— NIGHT 6'), () => startIntro(6));
      y += 56;
    }
    button(80, y, 320, 44, 'HOW TO PLAY', () => { state = 'howto'; stateT = 0; });

    A.text(ctx, 'An original night-watch survival game. All graphics and audio are generated by code.',
      W / 2, H - 16, 12, '#5a635e', 'center');
  }

  function drawHowto() {
    ctx.fillStyle = '#040405'; ctx.fillRect(0, 0, W, H);
    A.text(ctx, 'HOW TO PLAY', 60, 50, 30, '#dfe3df', 'left', null, 6);
    const lines = [
      'Survive 12 AM – 6 AM. Do not run out of power.',
      '',
      'MOUSE moves your view. Panels beside each doorway:',
      '   DOOR seals it · LIGHT checks the hallway outside.',
      'Bottom strip (or M / SPACE) opens the CAMERAS. Keys 1–9 switch feeds.',
      'Shortcuts: Q / E toggle doors · A / D toggle lights.',
      '',
      'Everything you switch on drains power faster. At 0%, the dark decides.',
      '',
      'STRIX hunts the LEFT door. HOWLER and WART hunt the RIGHT.',
      'WART freezes while his camera is on your screen.',
      'RUST leaves the MAINTENANCE BAY (CAM 5) if you stop checking it.',
      'If the bay is empty — west door. Now.'
    ];
    lines.forEach((ln, i) => A.text(ctx, ln, 60, 92 + i * 24, 15, '#aeb8b4', 'left'));
    // portraits
    const who = ['howler', 'strix', 'wart', 'rust'];
    who.forEach((w2, i) => {
      const px = 150 + i * 180;
      A.drawBot(ctx, w2, px, 460, 0.55, 'scare', 0.05);
      A.text(ctx, A.BOTS[w2].name, px, 512, 13, '#8a948e', 'center', null, 2);
    });
    button(W - 200, 30, 140, 40, 'BACK', () => { state = 'menu'; stateT = 0; });
    A.scanlines(ctx, 0.25);
  }

  function startIntro(n) {
    night = n;
    memoChars = 0;
    state = 'intro';
    stateT = 0;
    S.menuStatic(false);
  }

  function drawIntro(dt) {
    ctx.fillStyle = '#040405'; ctx.fillRect(0, 0, W, H);
    A.text(ctx, '11:58 PM', W / 2, 70, 20, '#5a635e', 'center', null, 4);
    A.text(ctx, night === 6 ? 'OVERTIME' : 'NIGHT ' + night, W / 2, 110, 40, '#dfe3df', 'center', null, 8);

    // memo paper
    ctx.save();
    ctx.translate(W / 2 - 290, 160); ctx.rotate(-0.01);
    ctx.fillStyle = '#d6cfba';
    ctx.fillRect(0, 0, 580, 240);
    ctx.fillStyle = '#b9b29c';
    ctx.fillRect(0, 0, 580, 26);
    A.text(ctx, 'BERGMANN\'S WORKSHOP — SHIFT MEMO', 290, 13, 13, '#4a4536', 'center', null, 2);
    const memo = MEMOS[night] || '';
    const shown = memo.slice(0, memoChars | 0);
    shown.split('\n').forEach((ln, i) => A.text(ctx, ln, 30, 56 + i * 30, 15, '#3a3527', 'left'));
    ctx.restore();

    const prev = memoChars;
    memoChars = Math.min(memo.length, memoChars + dt * 38);
    if (((memoChars | 0) - (prev | 0)) > 0 && (memoChars | 0) % 3 === 0) S.typeTick();

    if (memoChars >= memo.length && Math.floor(stateT * 2) % 2 === 0) {
      A.text(ctx, '— CLICK TO CLOCK IN —', W / 2, 450, 16, '#cfd6d2', 'center', null, 3);
    }
    A.scanlines(ctx, 0.2);
    A.vignette(ctx, 0.6);
  }

  function drawNightDone() {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    const k = Math.min(1, stateT / 0.8);
    A.text(ctx, '6:00 AM', W / 2, H / 2 - 30, 64, 'rgba(232,232,224,' + k + ')', 'center', null, 8);
    A.text(ctx, (night === 6 ? 'OVERTIME' : 'NIGHT ' + night) + ' COMPLETE', W / 2, H / 2 + 36, 20,
      'rgba(138,148,142,' + k + ')', 'center', null, 4);
    if (stateT > 3.6) {
      if (night === 5 || night === 6) { winOvertime = night === 6; state = 'win'; stateT = 0; }
      else startIntro(night + 1);
    }
  }

  function drawWin() {
    ctx.fillStyle = '#050506'; ctx.fillRect(0, 0, W, H);
    A.text(ctx, winOvertime ? 'OVERTIME SURVIVED' : 'WEEK COMPLETE', W / 2, 90, 40, '#dfe3df', 'center', null, 8);
    // pay stub
    ctx.save();
    ctx.translate(W / 2 - 230, 150); ctx.rotate(0.012);
    ctx.fillStyle = '#e3decb';
    ctx.fillRect(0, 0, 460, 210);
    ctx.strokeStyle = '#9a9480'; ctx.lineWidth = 2;
    ctx.strokeRect(8, 8, 444, 194);
    A.text(ctx, 'BERGMANN\'S WORKSHOP', 230, 40, 18, '#4a4536', 'center', null, 3);
    A.text(ctx, 'PAY TO: NIGHT TECHNICIAN', 40, 84, 14, '#3a3527', 'left');
    A.text(ctx, winOvertime ? 'OVERTIME BONUS' : 'WEEK OF JUNE 8 – 12', 40, 114, 14, '#3a3527', 'left');
    A.text(ctx, winOvertime ? '$187.90' : '$142.50', 230, 158, 34, '#2f4a35', 'center', null, 3);
    A.text(ctx, winOvertime ? 'NOW GO HOME.' : 'SEE YOU MONDAY.', 230, 190, 12, '#6a6452', 'center', null, 2);
    ctx.restore();

    let bx = W / 2 - 230;
    if (!winOvertime) {
      button(bx, 400, 220, 44, 'OVERTIME — NIGHT 6', () => startIntro(6));
      bx += 240;
    }
    button(bx, 400, 220, 44, 'MAIN MENU', () => { state = 'menu'; stateT = 0; S.menuStatic(true); });
    A.scanlines(ctx, 0.2);
  }

  function drawGameover() {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    A.noiseOverlay(ctx, 0.22);
    A.text(ctx, 'SIGNAL LOST', W / 2, 150, 52, '#dfe3df', 'center', null, 10);
    A.text(ctx, 'the workshop found you  —  ' + (night === 6 ? 'overtime' : 'night ' + night) +
      ', ' + hourLabel().toLowerCase(), W / 2, 210, 16, '#8a948e', 'center', null, 2);
    A.text(ctx, tipLine, W / 2, 260, 14, '#6a746e', 'center');
    button(W / 2 - 240, 330, 220, 46, 'RETRY NIGHT', () => startIntro(night));
    button(W / 2 + 20, 330, 220, 46, 'MAIN MENU', () => { state = 'menu'; stateT = 0; S.menuStatic(true); });
    A.scanlines(ctx, 0.3);
  }

  // ---------- input ----------
  function canvasPos(e) {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (W / r.width), y: (e.clientY - r.top) * (H / r.height) };
  }

  canvas.addEventListener('mousemove', e => {
    mouse = canvasPos(e);
    let cur = hoverUI ? 'pointer' : 'default';
    if (state === 'night') {
      cur = nightHotspot(mouse) ? 'pointer' : 'default';
    }
    canvas.style.cursor = cur;
  });

  // returns a hotspot action for night clicks, or null
  function nightHotspot(p) {
    if (G.blackout) return null;
    // monitor strip (both views)
    if (p.y > 500 && p.x > 290 && p.x < 670) return () => toggleMonitor();
    if (G.monitor.up) {
      for (const r of MAP_RECTS) {
        if (p.x > MAP_X + r.x && p.x < MAP_X + r.x + r.w &&
            p.y > MAP_Y + r.y && p.y < MAP_Y + r.y + r.h) {
          return () => switchCam(r.i);
        }
      }
      return null;
    }
    // office panels (virtual coords)
    const vx = p.x + G.pan, vy = p.y;
    const panels = [
      { x: 330, side: 'L' }, { x: OW - 330 - 64, side: 'R' }
    ];
    for (const pn of panels) {
      if (vx > pn.x + 10 && vx < pn.x + 54) {
        if (vy > 234 && vy < 282) return () => toggleDoor(pn.side);
        if (vy > 298 && vy < 346) return () => toggleLight(pn.side);
      }
    }
    return null;
  }

  canvas.addEventListener('mousedown', e => {
    S.ensure();
    const p = canvasPos(e);
    mouse = p;
    if (state === 'menu' || state === 'howto' || state === 'gameover' || state === 'win') {
      for (const b of uiButtons) {
        if (p.x > b.x && p.x < b.x + b.w && p.y > b.y && p.y < b.y + b.h) {
          S.blip(700, 0.08, 0.05);
          b.cb();
          return;
        }
      }
      return;
    }
    if (state === 'intro') {
      const memo = MEMOS[night] || '';
      if (memoChars < memo.length) { memoChars = memo.length; return; }
      newNight(night);
      state = 'night';
      stateT = 0;
      return;
    }
    if (state === 'night') {
      const act = nightHotspot(p);
      if (act) act();
    }
  });

  window.addEventListener('keydown', e => {
    if (state !== 'night') return;
    const k = e.key.toLowerCase();
    if (k === 'm' || k === ' ') { e.preventDefault(); toggleMonitor(); }
    else if (k === 'q') toggleDoor('L');
    else if (k === 'e') toggleDoor('R');
    else if (k === 'a') toggleLight('L');
    else if (k === 'd') toggleLight('R');
    else if (k >= '1' && k <= '9' && G.monitor.up) switchCam(+k - 1);
    else if (k === 'escape') { S.stopAllLoops(); state = 'menu'; stateT = 0; S.menuStatic(true); }
  });

  // ---------- main loop ----------
  // dev hook: load with ?debug to poke live state from the console
  if (location.search.indexOf('debug') !== -1) {
    window.__gs = {
      G: () => G,
      scare: who => triggerJumpscare(who),
      setChar: (who, st) => Object.assign(G.chars[who], st)
    };
  }

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    stateT += dt;
    uiButtons = [];
    hoverUI = false;

    switch (state) {
      case 'menu':
        drawMenu(stateT);
        break;
      case 'howto':
        drawHowto();
        break;
      case 'intro':
        drawIntro(dt);
        break;
      case 'night':
        updateNight(dt);
        if (state === 'night' || state === 'nightdone') drawNight();
        if (state === 'nightdone') drawNightDone();
        break;
      case 'jumpscare':
        A.drawJumpscare(ctx, jumpWho, Math.min(1, stateT / 1.05));
        if (stateT > 1.25) { state = 'gameover'; stateT = 0; }
        break;
      case 'gameover':
        drawGameover();
        break;
      case 'nightdone':
        drawNightDone();
        break;
      case 'win':
        drawWin();
        break;
    }
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
})();
