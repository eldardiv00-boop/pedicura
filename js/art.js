/* GRAVEYARD SHIFT — procedural art. Every visual is drawn in code; no image assets.
   All characters and scenes are original designs. */
window.Art = (function () {
  const W = 960, H = 540;

  // ---------- low-level helpers ----------
  function rr(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function poly(ctx, pts) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
  }

  function glowDot(ctx, x, y, r, color, alpha) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 3);
    g.addColorStop(0, color);
    g.addColorStop(0.35, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save();
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r * 3, 0, 7); ctx.fill();
    ctx.restore();
  }

  function text(ctx, str, x, y, size, color, align, font, spacing) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.font = (size | 0) + 'px ' + (font || '"Courier New", monospace');
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'middle';
    if (spacing) {
      let total = 0;
      for (const ch of str) total += ctx.measureText(ch).width + spacing;
      let cx = x;
      if (align === 'center') cx = x - total / 2;
      if (align === 'right') cx = x - total;
      ctx.textAlign = 'left';
      for (const ch of str) {
        ctx.fillText(ch, cx, y);
        cx += ctx.measureText(ch).width + spacing;
      }
    } else {
      ctx.fillText(str, x, y);
    }
    ctx.restore();
  }

  // ---------- noise / CRT overlays (pre-rendered, cheap) ----------
  const noiseCanvases = [];
  (function buildNoise() {
    for (let k = 0; k < 6; k++) {
      const c = document.createElement('canvas');
      c.width = 240; c.height = 135;
      const cc = c.getContext('2d');
      const img = cc.createImageData(240, 135);
      for (let i = 0; i < img.data.length; i += 4) {
        const v = (Math.random() * 255) | 0;
        img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
      cc.putImageData(img, 0, 0);
      noiseCanvases.push(c);
    }
  })();

  let scanCanvas = null;
  function getScanlines() {
    if (!scanCanvas) {
      scanCanvas = document.createElement('canvas');
      scanCanvas.width = W; scanCanvas.height = H;
      const cc = scanCanvas.getContext('2d');
      cc.fillStyle = 'rgba(0,0,0,0.22)';
      for (let y = 0; y < H; y += 3) cc.fillRect(0, y, W, 1);
    }
    return scanCanvas;
  }

  let noiseFrame = 0;
  function noiseOverlay(ctx, amount) {
    noiseFrame = (noiseFrame + 1) % 6;
    ctx.save();
    ctx.globalAlpha = amount;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(noiseCanvases[noiseFrame], 0, 0, W, H);
    ctx.restore();
  }

  function scanlines(ctx, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha == null ? 0.5 : alpha;
    ctx.drawImage(getScanlines(), 0, 0);
    ctx.restore();
  }

  function vignette(ctx, strength) {
    const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,' + (strength == null ? 0.65 : strength) + ')');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  // ---------- character palettes ----------
  const BOTS = {
    howler: { body: '#343b43', body2: '#49525d', eye: '#ffd24a', name: 'HOWLER' },
    strix:  { body: '#3d3526', body2: '#564b36', eye: '#e6f3ff', name: 'STRIX' },
    wart:   { body: '#27392b', body2: '#3a523f', eye: '#8dff5e', name: 'WART' },
    rust:   { body: '#46291a', body2: '#5f3a24', eye: '#ff4242', name: 'RUST' }
  };

  // ---------- character heads (local coords, ~100 units wide, centered 0,0) ----------
  function headHowler(ctx, p, jaw) {
    // angular wolf head, one torn ear
    ctx.fillStyle = p.body;
    poly(ctx, [[-42, -10], [-30, -42], [30, -42], [42, -10], [30, 22], [-30, 22]]);
    ctx.fill();
    // ears
    poly(ctx, [[-34, -38], [-44, -70], [-16, -44]]); ctx.fill();
    poly(ctx, [[34, -38], [40, -62], [44, -52], [38, -56], [16, -44]]); ctx.fill(); // torn
    // snout + jaw
    ctx.fillStyle = p.body2;
    poly(ctx, [[-20, 4], [20, 4], [14, 30 + jaw * 4], [-14, 30 + jaw * 4]]);
    ctx.fill();
    // open jaw
    ctx.fillStyle = '#0a0a0c';
    poly(ctx, [[-13, 22], [13, 22], [10, 24 + jaw * 26], [-10, 24 + jaw * 26]]);
    ctx.fill();
    // teeth
    ctx.fillStyle = '#cfd6d2';
    for (let i = -10; i <= 8; i += 6) {
      poly(ctx, [[i, 22], [i + 4, 22], [i + 2, 28]]); ctx.fill();
      if (jaw > 0.25) { poly(ctx, [[i, 23 + jaw * 26], [i + 4, 23 + jaw * 26], [i + 2, 17 + jaw * 26]]); ctx.fill(); }
    }
    // eyes (one dimmer = damaged)
    glowDot(ctx, -17, -18, 5, p.eye);
    glowDot(ctx, 17, -18, 5, p.eye, 0.35);
    // seams
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, -42); ctx.lineTo(0, 2); ctx.stroke();
  }

  function headStrix(ctx, p, jaw) {
    // round owl head, two huge lamp eyes
    ctx.fillStyle = p.body;
    ctx.beginPath(); ctx.arc(0, -8, 44, 0, 7); ctx.fill();
    // feather tufts
    poly(ctx, [[-30, -38], [-40, -62], [-14, -44]]); ctx.fill();
    poly(ctx, [[30, -38], [40, -62], [14, -44]]); ctx.fill();
    // facial disk
    ctx.fillStyle = p.body2;
    ctx.beginPath(); ctx.ellipse(-18, -12, 17, 20, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(18, -12, 17, 20, 0, 0, 7); ctx.fill();
    // eye sockets
    ctx.fillStyle = '#08080a';
    ctx.beginPath(); ctx.arc(-18, -12, 12, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(18, -12, 12, 0, 7); ctx.fill();
    glowDot(ctx, -18, -12, 7, p.eye);
    glowDot(ctx, 18, -12, 7, p.eye);
    // beak (opens)
    ctx.fillStyle = '#1c1812';
    poly(ctx, [[-8, 8], [8, 8], [0, 24 + jaw * 18]]);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, -8, 44, 0.3, 2.8); ctx.stroke();
  }

  function headWart(ctx, p, jaw) {
    // wide flat toad head, eye bumps on top
    ctx.fillStyle = p.body;
    ctx.beginPath(); ctx.ellipse(0, 0, 48, 30, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(-24, -24, 13, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(24, -24, 13, 0, 7); ctx.fill();
    glowDot(ctx, -24, -26, 5.5, p.eye);
    glowDot(ctx, 24, -26, 5.5, p.eye);
    // huge mouth
    ctx.fillStyle = '#070809';
    ctx.beginPath();
    ctx.moveTo(-42, 6);
    ctx.quadraticCurveTo(0, 14 + jaw * 30, 42, 6);
    ctx.quadraticCurveTo(0, 26 + jaw * 34, -42, 6);
    ctx.fill();
    // sparse teeth
    ctx.fillStyle = '#c9d0c5';
    [-30, -12, 8, 26].forEach(tx => {
      poly(ctx, [[tx, 8], [tx + 5, 8], [tx + 2.5, 15 + jaw * 6]]); ctx.fill();
    });
    // warts
    ctx.fillStyle = p.body2;
    [[-38, -10], [-10, -16], [34, -8], [12, -18]].forEach(q => {
      ctx.beginPath(); ctx.arc(q[0], q[1], 3, 0, 7); ctx.fill();
    });
  }

  function headRust(ctx, p, jaw) {
    // cat head, half the casing missing -> bare metal jaw
    ctx.fillStyle = p.body;
    ctx.beginPath(); ctx.arc(0, -8, 42, 0, 7); ctx.fill();
    // ears, one torn
    poly(ctx, [[-32, -34], [-42, -66], [-10, -42]]); ctx.fill();
    poly(ctx, [[32, -34], [38, -52], [30, -48], [34, -58], [10, -42]]); ctx.fill();
    // missing casing: dark patch right side
    ctx.fillStyle = '#101113';
    poly(ctx, [[4, -34], [42, -22], [40, 18], [6, 26]]);
    ctx.fill();
    // endoskeleton jaw + teeth in the gap
    ctx.strokeStyle = '#aab2ba'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(38, -4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(8, 14); ctx.lineTo(36, 10); ctx.stroke();
    ctx.fillStyle = '#cfd6dd';
    for (let i = 0; i < 5; i++) {
      const tx = 10 + i * 6;
      poly(ctx, [[tx, 0], [tx + 4, 0], [tx + 2, 6]]); ctx.fill();
    }
    // intact eye left, bare red LED right
    ctx.fillStyle = '#0a0a0c';
    ctx.beginPath(); ctx.arc(-16, -14, 9, 0, 7); ctx.fill();
    glowDot(ctx, -16, -14, 4.5, '#ffb65e', 0.8);
    glowDot(ctx, 20, -14, 5.5, p.eye);
    // muzzle + jaw (left intact side)
    ctx.fillStyle = p.body2;
    ctx.beginPath(); ctx.ellipse(-12, 10, 16, 11, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#0a0a0c';
    ctx.beginPath(); ctx.ellipse(-12, 16 + jaw * 10, 12, 4 + jaw * 12, 0, 0, 7); ctx.fill();
    // whisker bolts
    ctx.fillStyle = '#777f87';
    ctx.beginPath(); ctx.arc(-26, 8, 2, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(-4, 6, 2, 0, 7); ctx.fill();
  }

  const HEADS = { howler: headHowler, strix: headStrix, wart: headWart, rust: headRust };

  // ---------- full character ----------
  // pose: 'stand' | 'stare' | 'door' | 'peek' | 'sprint' | 'scare'
  function drawBot(ctx, who, x, y, s, pose, jaw) {
    const p = BOTS[who];
    if (!p) return;
    jaw = jaw || 0;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);

    if (pose === 'peek') {
      glowDot(ctx, -14, 0, 5, p.eye);
      glowDot(ctx, 14, 0, 5, p.eye, who === 'howler' ? 0.35 : 1);
      ctx.restore();
      return;
    }

    if (pose === 'scare') {
      HEADS[who](ctx, p, jaw);
      ctx.restore();
      return;
    }

    if (pose === 'sprint') {
      ctx.transform(1, 0, -0.35, 1, 0, 0); // lean forward
    }

    // body (head sits at local 0,0; torso below)
    const bodyTop = 38;
    ctx.fillStyle = p.body;
    rr(ctx, -34, bodyTop, 68, 88, 14); ctx.fill();
    // belly plate
    ctx.fillStyle = p.body2;
    rr(ctx, -20, bodyTop + 16, 40, 56, 10); ctx.fill();
    // seam + rivets
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, bodyTop + 16); ctx.lineTo(0, bodyTop + 72); ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath(); ctx.arc(-26, bodyTop + 10, 2.5, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(26, bodyTop + 10, 2.5, 0, 7); ctx.fill();
    // arms
    ctx.strokeStyle = p.body; ctx.lineWidth = 13; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-34, bodyTop + 14); ctx.lineTo(-46, bodyTop + 70); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(34, bodyTop + 14); ctx.lineTo(46, bodyTop + 70); ctx.stroke();
    // exposed wire on one shoulder
    ctx.strokeStyle = '#2c3438'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(30, bodyTop + 2);
    ctx.quadraticCurveTo(44, bodyTop - 8, 40, bodyTop + 8); ctx.stroke();
    // legs (skip for door closeup)
    if (pose !== 'door') {
      ctx.strokeStyle = p.body; ctx.lineWidth = 15;
      ctx.beginPath(); ctx.moveTo(-16, bodyTop + 88); ctx.lineTo(-16, bodyTop + 132); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(16, bodyTop + 88); ctx.lineTo(16, bodyTop + 132); ctx.stroke();
      ctx.fillStyle = p.body2;
      rr(ctx, -28, bodyTop + 126, 24, 12, 4); ctx.fill();
      rr(ctx, 4, bodyTop + 126, 24, 12, 4); ctx.fill();
    }
    // head
    const tilt = pose === 'stare' ? 0.08 : (pose === 'sprint' ? -0.1 : 0);
    ctx.save();
    ctx.rotate(tilt);
    HEADS[who](ctx, p, pose === 'door' ? Math.max(jaw, 0.15) : jaw);
    ctx.restore();

    if (pose === 'sprint') {
      ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 3;
      for (let i = 0; i < 4; i++) {
        const ly = -30 + i * 45;
        ctx.beginPath(); ctx.moveTo(50, ly); ctx.lineTo(110, ly + 6); ctx.stroke();
      }
    }
    ctx.restore();
  }

  // =====================================================================
  // OFFICE  (virtual width 1600, viewport 960; caller pans via view.pan)
  // =====================================================================
  const OW = 1600;

  function drawOffice(ctx, v) {
    // v: {pan, doorL, doorR (0..1 closed), lightL, lightR, atL, atR (who|null),
    //     fanA, blackout, eyesFlicker, flicker, t}
    ctx.save();
    ctx.translate(-v.pan, 0);

    const dark = v.blackout;
    const base = dark ? 0.12 : 1;

    // back wall
    let g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, dark ? '#020203' : '#101216');
    g.addColorStop(0.62, dark ? '#040405' : '#1a1d24');
    g.addColorStop(0.63, dark ? '#050506' : '#22262e');
    g.addColorStop(1, dark ? '#020202' : '#0c0d10');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, OW, H);

    // floor
    ctx.fillStyle = dark ? '#050505' : '#15161a';
    ctx.fillRect(0, 340, OW, H - 340);
    if (!dark) {
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 16; i++) {
        const fx = i * 100;
        ctx.beginPath();
        ctx.moveTo(fx, 340);
        ctx.lineTo(800 + (fx - 800) * 1.7, H);
        ctx.stroke();
      }
      for (let yy = 360; yy < H; yy += 36) {
        ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(OW, yy); ctx.stroke();
      }
    }

    // ceiling lamp + light cone (flickers)
    const lampOn = !dark && (v.flicker > 0.18);
    ctx.fillStyle = '#0a0b0d';
    ctx.fillRect(770, 0, 60, 26);
    ctx.fillStyle = lampOn ? '#ffe9b0' : '#26241c';
    rr(ctx, 760, 22, 80, 12, 4); ctx.fill();
    if (lampOn) {
      const cg = ctx.createLinearGradient(0, 30, 0, 420);
      cg.addColorStop(0, 'rgba(255,234,170,0.13)');
      cg.addColorStop(1, 'rgba(255,234,170,0)');
      ctx.fillStyle = cg;
      poly(ctx, [[760, 34], [840, 34], [1010, 420], [590, 420]]);
      ctx.fill();
    }

    // window into the workshop (center back)
    ctx.fillStyle = dark ? '#010102' : '#05070c';
    rr(ctx, 660, 110, 280, 130, 6); ctx.fill();
    ctx.strokeStyle = dark ? '#0c0d10' : '#2c313b';
    ctx.lineWidth = 6;
    rr(ctx, 660, 110, 280, 130, 6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(800, 110); ctx.lineTo(800, 240); ctx.stroke();
    if (!dark) {
      // faint machine silhouettes beyond the glass
      ctx.fillStyle = 'rgba(70,80,95,0.25)';
      rr(ctx, 690, 180, 40, 60, 3); ctx.fill();
      rr(ctx, 850, 170, 50, 70, 3); ctx.fill();
      ctx.strokeStyle = 'rgba(70,80,95,0.25)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(740, 240); ctx.lineTo(760, 190); ctx.lineTo(790, 240); ctx.stroke();
    }

    // posters (original props)
    if (!dark) {
      ctx.save();
      ctx.translate(495, 150); ctx.rotate(-0.03);
      ctx.fillStyle = '#cfc6ae';
      ctx.fillRect(0, 0, 86, 110);
      ctx.fillStyle = '#7a2f25';
      text(ctx, 'SAFETY', 43, 22, 14, '#7a2f25', 'center');
      text(ctx, 'FIRST', 43, 40, 14, '#7a2f25', 'center');
      ctx.strokeStyle = '#444'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(43, 74, 20, 0, 7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(30, 60); ctx.lineTo(56, 88); ctx.stroke();
      ctx.restore();

      // kids' crayon drawing of the four bots
      ctx.save();
      ctx.translate(1030, 145); ctx.rotate(0.04);
      ctx.fillStyle = '#ded7c2';
      ctx.fillRect(0, 0, 120, 92);
      const crayons = ['#777f87', '#8a7a4d', '#5d7a52', '#9c5a33'];
      crayons.forEach((cc, i) => {
        const bx = 18 + i * 28;
        ctx.strokeStyle = cc; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(bx, 34, 9, 0, 7); ctx.stroke();
        ctx.strokeRect(bx - 7, 46, 14, 22);
      });
      text(ctx, 'my friends!', 60, 84, 11, '#5a4a6e', 'center', 'cursive');
      ctx.restore();
    }

    // ---- side doorways ----
    drawDoorway(ctx, v, 'L', 120, dark);
    drawDoorway(ctx, v, 'R', OW - 120 - 150, dark);

    // ---- control panels ----
    drawPanel(ctx, v, 'L', 330, dark);
    drawPanel(ctx, v, 'R', OW - 330 - 64, dark);

    // ---- desk ----
    drawDesk(ctx, v, dark);

    // blackout: roaming eyes at left doorway
    if (dark && v.eyesFlicker) {
      const ex = 195, ey = 250;
      glowDot(ctx, ex - 14, ey, 5, '#e6f3ff', v.eyesFlicker);
      glowDot(ctx, ex + 14, ey, 5, '#e6f3ff', v.eyesFlicker);
    }

    ctx.restore();

    // ambient grade
    ctx.fillStyle = 'rgba(2,3,8,' + (dark ? 0.25 : 0.12) + ')';
    ctx.fillRect(0, 0, W, H);
  }

  function drawDoorway(ctx, v, side, x, dark) {
    const w = 150, top = 96, bottom = 430;
    const closed = side === 'L' ? v.doorL : v.doorR;
    const lit = !dark && (side === 'L' ? v.lightL : v.lightR);
    const who = side === 'L' ? v.atL : v.atR;

    // hallway behind
    ctx.fillStyle = '#000002';
    ctx.fillRect(x, top, w, bottom - top);

    if (lit) {
      const lg = ctx.createLinearGradient(x, top, x, bottom);
      lg.addColorStop(0, 'rgba(225,235,255,0.55)');
      lg.addColorStop(1, 'rgba(225,235,255,0.18)');
      ctx.fillStyle = lg;
      ctx.fillRect(x, top, w, bottom - top);
      // hall floor hint
      ctx.fillStyle = 'rgba(180,195,220,0.12)';
      poly(ctx, [[x, bottom], [x + w, bottom], [x + w + 24, H], [x - 24, H]]);
      ctx.fill();
      if (who) drawBot(ctx, who, x + w / 2, 250, 1.05, 'door', 0.25);
      else {
        // empty lit hallway: far wall line
        ctx.strokeStyle = 'rgba(190,205,230,0.18)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x + 18, top + 50); ctx.lineTo(x + 18, bottom - 10); ctx.stroke();
      }
    }

    // sliding metal door (slides down; closed = 1)
    if (closed > 0.01) {
      const dh = (bottom - top) * Math.min(closed, 1);
      const dg = ctx.createLinearGradient(x, top, x + w, top);
      dg.addColorStop(0, dark ? '#0d0f12' : '#2a2f37');
      dg.addColorStop(0.5, dark ? '#14171c' : '#3b424d');
      dg.addColorStop(1, dark ? '#0d0f12' : '#262b33');
      ctx.fillStyle = dg;
      ctx.fillRect(x, top, w, dh);
      ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 2;
      for (let yy = top + 26; yy < top + dh; yy += 30) {
        ctx.beginPath(); ctx.moveTo(x + 4, yy); ctx.lineTo(x + w - 4, yy); ctx.stroke();
      }
      // hazard stripe at door base edge
      ctx.fillStyle = dark ? '#3a3208' : '#b3a018';
      ctx.fillRect(x, top + dh - 8, w, 8);
    }

    // frame
    ctx.fillStyle = dark ? '#0a0b0d' : '#3c424c';
    ctx.fillRect(x - 18, top - 18, 18, bottom - top + 36);
    ctx.fillRect(x + w, top - 18, 18, bottom - top + 36);
    ctx.fillRect(x - 18, top - 18, w + 36, 18);
    ctx.fillStyle = dark ? '#08090b' : '#2c3138';
    ctx.fillRect(x - 24, bottom, w + 48, 14);
  }

  function drawPanel(ctx, v, side, x, dark) {
    const y = 220, w = 64, h = 150;
    const doorOn = side === 'L' ? v.doorL > 0.5 : v.doorR > 0.5;
    const lightOn = side === 'L' ? v.lightL : v.lightR;
    ctx.fillStyle = dark ? '#0a0b0c' : '#23262c';
    rr(ctx, x, y, w, h, 8); ctx.fill();
    ctx.strokeStyle = dark ? '#101113' : '#3a3f48';
    ctx.lineWidth = 3;
    rr(ctx, x, y, w, h, 8); ctx.stroke();
    // DOOR button
    ctx.fillStyle = dark ? '#1c0d0d' : (doorOn ? '#37e05e' : '#d8403c');
    rr(ctx, x + 10, y + 14, w - 20, 48, 6); ctx.fill();
    text(ctx, 'DOOR', x + w / 2, y + 38, 12, dark ? '#3a2a2a' : '#10131a', 'center');
    // LIGHT button
    ctx.fillStyle = dark ? '#16161c' : (lightOn ? '#ffe9a0' : '#5a6170');
    rr(ctx, x + 10, y + 78, w - 20, 48, 6); ctx.fill();
    text(ctx, 'LIGHT', x + w / 2, y + 102, 12, '#10131a', 'center');
    // conduit
    ctx.strokeStyle = dark ? '#0c0d0f' : '#30353d'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(x + w / 2, y + h); ctx.lineTo(x + w / 2, y + h + 60); ctx.stroke();
  }

  function drawDesk(ctx, v, dark) {
    const cx = 800;
    // desk top
    ctx.fillStyle = dark ? '#0b0c0e' : '#242931';
    poly(ctx, [[cx - 290, 400], [cx + 290, 400], [cx + 340, 540], [cx - 340, 540]]);
    ctx.fill();
    ctx.fillStyle = dark ? '#08090a' : '#1a1e24';
    poly(ctx, [[cx - 290, 400], [cx + 290, 400], [cx + 296, 412], [cx - 296, 412]]);
    ctx.fill();
    if (dark) return;

    // CRT monitor with static
    ctx.fillStyle = '#15171b';
    rr(ctx, cx - 80, 290, 160, 118, 8); ctx.fill();
    ctx.fillStyle = '#06080a';
    rr(ctx, cx - 68, 300, 136, 90, 4); ctx.fill();
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(noiseCanvases[(noiseFrame + 2) % 6], cx - 68, 300, 136, 90);
    ctx.restore();
    ctx.fillStyle = '#15171b';
    rr(ctx, cx - 26, 406, 52, 10, 3); ctx.fill();

    // desk fan (animated blades)
    const fx = cx - 190, fy = 352;
    ctx.strokeStyle = '#3a4049'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(fx, fy + 28); ctx.lineTo(fx, fy + 50); ctx.stroke();
    ctx.fillStyle = '#2e333b';
    rr(ctx, fx - 22, fy + 46, 44, 10, 4); ctx.fill();
    ctx.save();
    ctx.translate(fx, fy);
    ctx.strokeStyle = '#454c57'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(0, 0, 30, 0, 7); ctx.stroke();
    ctx.fillStyle = 'rgba(160,170,185,0.6)';
    for (let b = 0; b < 3; b++) {
      ctx.save();
      ctx.rotate(v.fanA + b * (Math.PI * 2 / 3));
      ctx.beginPath(); ctx.ellipse(0, -15, 7, 15, 0, 0, 7); ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = '#20242a';
    ctx.beginPath(); ctx.arc(0, 0, 6, 0, 7); ctx.fill();
    ctx.restore();

    // papers + mug
    ctx.save();
    ctx.translate(cx + 150, 420); ctx.rotate(0.06);
    ctx.fillStyle = '#cfc9b8'; ctx.fillRect(0, 0, 70, 46);
    ctx.strokeStyle = '#8b8675'; ctx.lineWidth = 1;
    for (let i = 8; i < 42; i += 8) { ctx.beginPath(); ctx.moveTo(6, i); ctx.lineTo(64, i); ctx.stroke(); }
    ctx.restore();
    ctx.fillStyle = '#6e3340';
    rr(ctx, cx + 92, 408, 26, 30, 4); ctx.fill();
    ctx.strokeStyle = '#6e3340'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(cx + 122, 422, 9, -1.2, 1.2); ctx.stroke();
  }

  // =====================================================================
  // CAMERA ROOM VIEWS
  // =====================================================================
  function roomShell(ctx, tint, floorY) {
    floorY = floorY || 330;
    let g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#05070a');
    g.addColorStop(0.6, tint);
    g.addColorStop(1, '#030405');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, floorY, W, H - floorY);
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 12; i++) {
      const fx = i * 80;
      ctx.beginPath();
      ctx.moveTo(fx, floorY);
      ctx.lineTo(480 + (fx - 480) * 2.0, H);
      ctx.stroke();
    }
  }

  function hallShell(ctx, tint) {
    // one-point-perspective corridor
    ctx.fillStyle = '#030405';
    ctx.fillRect(0, 0, W, H);
    const vx = W / 2, vy = 250;
    ctx.fillStyle = tint;
    poly(ctx, [[0, 0], [W, 0], [vx + 110, vy - 90], [vx - 110, vy - 90]]); ctx.fill();   // ceiling
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    poly(ctx, [[0, H], [W, H], [vx + 110, vy + 70], [vx - 110, vy + 70]]); ctx.fill();   // floor
    ctx.fillStyle = 'rgba(120,135,150,0.10)';
    poly(ctx, [[0, 0], [vx - 110, vy - 90], [vx - 110, vy + 70], [0, H]]); ctx.fill();   // left wall
    poly(ctx, [[W, 0], [vx + 110, vy - 90], [vx + 110, vy + 70], [W, H]]); ctx.fill();   // right wall
    // far end
    ctx.fillStyle = '#020203';
    ctx.fillRect(vx - 110, vy - 90, 220, 160);
    // perspective wall lines
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 2;
    [[0, 120], [0, 320], [W, 120], [W, 320]].forEach(q => {
      ctx.beginPath(); ctx.moveTo(q[0], q[1]);
      ctx.lineTo(q[0] < vx ? vx - 110 : vx + 110, vy - 20); ctx.stroke();
    });
  }

  // slots: standing positions per room for up to 3 visitors
  const ROOM_SLOTS = [
    [{ x: 330, y: 250, s: 0.78 }, { x: 520, y: 262, s: 0.84 }, { x: 690, y: 246, s: 0.74 }], // 0 workshop floor
    [{ x: 300, y: 268, s: 0.85 }, { x: 600, y: 250, s: 0.78 }, { x: 760, y: 270, s: 0.85 }], // 1 assembly
    [{ x: 480, y: 270, s: 0.95 }, { x: 300, y: 262, s: 0.85 }, { x: 660, y: 262, s: 0.85 }], // 2 paint booth
    [{ x: 430, y: 268, s: 0.9 }, { x: 620, y: 258, s: 0.8 }, { x: 250, y: 258, s: 0.8 }],    // 3 storage
    [{ x: 480, y: 280, s: 1.0 }],                                                            // 4 maintenance bay
    [{ x: 480, y: 290, s: 0.62 }, { x: 480, y: 360, s: 1.0 }],                               // 5 west hall
    [{ x: 500, y: 330, s: 1.5 }],                                                            // 6 west corner
    [{ x: 480, y: 290, s: 0.62 }, { x: 480, y: 360, s: 1.0 }],                               // 7 east hall
    [{ x: 460, y: 330, s: 1.5 }],                                                            // 8 east corner
  ];

  function drawCamView(ctx, cam, occ, extra) {
    // extra: {t, rustStage, sprintFlash, lightFlicker}
    const t = extra.t || 0;
    switch (cam) {
      case 0: { // WORKSHOP FLOOR
        roomShell(ctx, '#13202a');
        // repair tables
        [-40, 220, 480, 740].forEach(bx => {
          ctx.fillStyle = '#1b242c';
          poly(ctx, [[bx + 60, 300], [bx + 220, 300], [bx + 240, 360], [bx + 40, 360]]); ctx.fill();
          ctx.fillStyle = '#10151a';
          ctx.fillRect(bx + 70, 360, 14, 60); ctx.fillRect(bx + 196, 360, 14, 60);
        });
        // hanging cables
        ctx.strokeStyle = 'rgba(140,150,160,0.25)'; ctx.lineWidth = 3;
        [150, 420, 700, 860].forEach(cx2 => {
          ctx.beginPath(); ctx.moveTo(cx2, 0);
          ctx.quadraticCurveTo(cx2 + 18, 90, cx2 - 6, 150); ctx.stroke();
        });
        text(ctx, 'BAY 1   BAY 2   BAY 3', 480, 60, 18, 'rgba(190,200,210,0.18)', 'center', null, 6);
        break;
      }
      case 1: { // ASSEMBLY LINE
        roomShell(ctx, '#1a1a26');
        ctx.fillStyle = '#181d26';
        poly(ctx, [[40, 320], [920, 270], [920, 310], [40, 372]]); ctx.fill(); // belt
        ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.lineWidth = 2;
        for (let i = 0; i < 12; i++) {
          const bx = 60 + i * 76;
          ctx.beginPath(); ctx.moveTo(bx, 322 - i * 4); ctx.lineTo(bx - 6, 370 - i * 4.6); ctx.stroke();
        }
        // robot arms
        ctx.strokeStyle = '#252c36'; ctx.lineWidth = 12; ctx.lineCap = 'round';
        [[180, 150], [560, 130]].forEach(q => {
          ctx.beginPath(); ctx.moveTo(q[0], q[1]);
          ctx.lineTo(q[0] + 60, q[1] + 70); ctx.lineTo(q[0] + 40, q[1] + 150); ctx.stroke();
        });
        break;
      }
      case 2: { // PAINT BOOTH
        roomShell(ctx, '#241a20');
        // plastic curtain strips
        for (let i = 0; i < 14; i++) {
          const bx = 80 + i * 60;
          ctx.fillStyle = 'rgba(170,180,200,' + (0.05 + (i % 3) * 0.025) + ')';
          poly(ctx, [[bx, 40], [bx + 44, 40], [bx + 40, 330], [bx - 4, 330]]); ctx.fill();
        }
        // paint cans
        ['#5d3a3a', '#3a4a5d', '#3f5d3a'].forEach((cc, i) => {
          ctx.fillStyle = cc;
          rr(ctx, 130 + i * 52, 348, 40, 52, 4); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.12)';
          ctx.fillRect(134 + i * 52, 352, 32, 6);
        });
        break;
      }
      case 3: { // STORAGE RACKS
        roomShell(ctx, '#131c16');
        for (let r = 0; r < 3; r++) {
          const rx = 90 + r * 300;
          ctx.fillStyle = '#161b18';
          ctx.fillRect(rx, 90, 200, 320);
          ctx.fillStyle = '#0c0f0d';
          for (let s = 0; s < 4; s++) ctx.fillRect(rx, 110 + s * 80, 200, 10);
          ctx.fillStyle = '#23291f';
          for (let s = 0; s < 4; s++)
            for (let b2 = 0; b2 < 3; b2++)
              if ((r + s + b2) % 3 !== 0) ctx.fillRect(rx + 14 + b2 * 62, 126 + s * 80, 48, 40);
        }
        break;
      }
      case 4: { // MAINTENANCE BAY (RUST's den)
        roomShell(ctx, '#1f150e');
        // roller door, gap grows with stage
        const stage = extra.rustStage || 0;
        const gap = [16, 60, 130, 170][Math.min(stage, 3)];
        ctx.fillStyle = '#241c14';
        ctx.fillRect(280, 70, 400, 340);
        ctx.fillStyle = '#170f0a';
        ctx.fillRect(300, 90, 360, 300);
        // slats above the gap
        ctx.fillStyle = '#2d241a';
        const downTo = 390 - gap;
        for (let yy = 90; yy < downTo; yy += 24) ctx.fillRect(300, yy, 360, 20);
        // dark gap
        ctx.fillStyle = '#020202';
        ctx.fillRect(300, downTo, 360, 390 - downTo);
        if (stage === 1) drawBot(ctx, 'rust', 480, downTo + 40, 1.0, 'peek');
        if (stage === 2) drawBot(ctx, 'rust', 480, downTo + 62, 0.95, 'stare', 0.2);
        if (stage >= 3) {
          text(ctx, 'BAY EMPTY', 480, 250, 26, 'rgba(255,80,80,0.5)', 'center', null, 4);
        }
        // warning sign
        ctx.fillStyle = '#8a7618';
        poly(ctx, [[160, 200], [200, 200], [180, 166]]); ctx.fill();
        text(ctx, 'KEEP CLEAR', 180, 224, 11, 'rgba(220,200,120,0.5)', 'center');
        break;
      }
      case 5: case 7: { // WEST / EAST HALL
        hallShell(ctx, cam === 5 ? '#10161d' : '#181216');
        if (cam === 5) {
          // flickering ceiling tube
          const on = extra.lightFlicker;
          ctx.fillStyle = on ? 'rgba(220,230,255,0.8)' : 'rgba(60,65,80,0.4)';
          ctx.fillRect(W / 2 - 60, 60, 120, 8);
          if (on) {
            ctx.fillStyle = 'rgba(200,215,255,0.06)';
            poly(ctx, [[W / 2 - 70, 68], [W / 2 + 70, 68], [W / 2 + 150, 420], [W / 2 - 150, 420]]);
            ctx.fill();
          }
          if (extra.sprintFlash) drawBot(ctx, 'rust', W / 2, 330, 1.25, 'sprint', 0.6);
        } else {
          // wall pipes
          ctx.strokeStyle = 'rgba(150,130,120,0.2)'; ctx.lineWidth = 8;
          ctx.beginPath(); ctx.moveTo(30, 120); ctx.lineTo(W / 2 - 105, 200); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(30, 150); ctx.lineTo(W / 2 - 105, 222); ctx.stroke();
        }
        break;
      }
      case 6: { // WEST CORNER
        roomShell(ctx, '#101720');
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        poly(ctx, [[0, 0], [340, 0], [180, H], [0, H]]); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(340, 0); ctx.lineTo(180, H); ctx.stroke();
        text(ctx, 'OFFICE →', 760, 90, 20, 'rgba(190,200,215,0.25)', 'center', null, 3);
        break;
      }
      case 8: { // EAST CORNER
        roomShell(ctx, '#141019');
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        poly(ctx, [[W, 0], [W - 340, 0], [W - 180, H], [W, H]]); ctx.fill();
        // humming vending machine
        ctx.fillStyle = '#101820';
        rr(ctx, 120, 170, 110, 230, 6); ctx.fill();
        ctx.fillStyle = 'rgba(120,200,255,' + (0.10 + 0.05 * Math.sin(t * 3)) + ')';
        rr(ctx, 132, 186, 60, 160, 4); ctx.fill();
        text(ctx, '← OFFICE', 300, 90, 20, 'rgba(190,200,215,0.25)', 'center', null, 3);
        break;
      }
    }

    // occupants
    (occ || []).forEach((o, i) => {
      const slots = ROOM_SLOTS[cam];
      const sl = slots[Math.min(i, slots.length - 1)];
      const pose = (cam === 6 || cam === 8) ? 'stare' : (o.pose || 'stand');
      drawBot(ctx, o.who, sl.x + (i - 1) * 8, sl.y, sl.s, pose, 0);
    });
  }

  // =====================================================================
  // JUMPSCARE / MENU
  // =====================================================================
  function drawJumpscare(ctx, who, k) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    const s = 1.2 + k * 3.4;
    const shx = (Math.random() - 0.5) * 46 * k;
    const shy = (Math.random() - 0.5) * 34 * k;
    drawBot(ctx, who, W / 2 + shx, H / 2 + 40 + shy, s, 'scare', Math.min(1, k * 1.6));
    if (k < 0.12) { ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(0, 0, W, H); }
    noiseOverlay(ctx, 0.18 + k * 0.2);
  }

  function drawMenuBg(ctx, t) {
    ctx.fillStyle = '#030304';
    ctx.fillRect(0, 0, W, H);
    // slow drifting silhouette + eyes
    const ph = (t * 0.07) % 4;
    const who = ['howler', 'strix', 'wart', 'rust'][ph | 0];
    ctx.save();
    ctx.globalAlpha = 0.16 + 0.05 * Math.sin(t * 0.9);
    drawBot(ctx, who, 700 + 30 * Math.sin(t * 0.23), 300, 2.1, 'stare', 0.1 + 0.1 * Math.sin(t * 1.7));
    ctx.restore();
    noiseOverlay(ctx, 0.10 + (Math.random() < 0.02 ? 0.25 : 0));
    scanlines(ctx, 0.35);
    vignette(ctx, 0.8);
  }

  return { W, H, rr, poly, text, glowDot, drawBot, drawOffice, drawCamView, drawJumpscare, drawMenuBg, noiseOverlay, scanlines, vignette, BOTS };
})();
