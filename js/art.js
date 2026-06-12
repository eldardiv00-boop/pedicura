/* GRAVEYARD SHIFT — procedural art, v2 ("council" art pass).
   Every visual is drawn in code; no image assets. All characters and
   scenes are original designs. */
window.Art = (function () {
  const W = 960, H = 540;
  const TAU = Math.PI * 2;

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
    ctx.beginPath(); ctx.arc(x, y, r * 3, 0, TAU); ctx.fill();
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

  // VHS-style horizontal tear + rolling band
  function glitch(ctx, t, intensity) {
    const k = intensity == null ? 1 : intensity;
    // rolling brightness band
    const by = ((t * 46) % (H + 160)) - 80;
    const bg = ctx.createLinearGradient(0, by, 0, by + 80);
    bg.addColorStop(0, 'rgba(255,255,255,0)');
    bg.addColorStop(0.5, 'rgba(255,255,255,' + 0.045 * k + ')');
    bg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, by, W, 80);
    // occasional slice tear
    if (Math.random() < 0.06 * k) {
      const y = Math.random() * H, h = 4 + Math.random() * 14;
      const dx = (Math.random() - 0.5) * 38 * k;
      ctx.drawImage(ctx.canvas, 0, y, W, h, dx, y, W, h);
    }
  }

  // ---------- character palettes ----------
  const BOTS = {
    howler: { body: '#343b43', body2: '#49525d', dark: '#23282e', eye: '#ffd24a', name: 'HOWLER' },
    strix:  { body: '#3d3526', body2: '#564b36', dark: '#28221a', eye: '#e6f3ff', name: 'STRIX' },
    wart:   { body: '#27392b', body2: '#3a523f', dark: '#1a2a1e', eye: '#8dff5e', name: 'WART' },
    rust:   { body: '#46291a', body2: '#5f3a24', dark: '#2e1a10', eye: '#ff4242', name: 'RUST' }
  };

  function eyeR(t) { return 1 + 0.15 * Math.sin(t * 3.1); } // breathing glow

  // ---------- character heads (local coords, ~100 units wide) ----------
  function headHowler(ctx, p, jaw, t) {
    ctx.fillStyle = p.body;
    poly(ctx, [[-42, -10], [-30, -42], [30, -42], [42, -10], [30, 22], [-30, 22]]);
    ctx.fill();
    // ears (one torn)
    poly(ctx, [[-34, -38], [-44, -70], [-16, -44]]); ctx.fill();
    ctx.fillStyle = p.dark;
    poly(ctx, [[-32, -42], [-39, -60], [-22, -45]]); ctx.fill(); // inner ear
    ctx.fillStyle = p.body;
    poly(ctx, [[34, -38], [40, -62], [44, -52], [38, -56], [16, -44]]); ctx.fill();
    // brow ridges
    ctx.fillStyle = p.dark;
    poly(ctx, [[-28, -26], [-6, -24], [-8, -18], [-28, -21]]); ctx.fill();
    poly(ctx, [[28, -26], [6, -24], [8, -18], [28, -21]]); ctx.fill();
    // cracked casing
    ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, -42); ctx.lineTo(0, 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(24, -36); ctx.lineTo(33, -20); ctx.lineTo(27, -8); ctx.stroke();
    // snout + jaw
    ctx.fillStyle = p.body2;
    poly(ctx, [[-20, 4], [20, 4], [14, 30 + jaw * 4], [-14, 30 + jaw * 4]]);
    ctx.fill();
    ctx.fillStyle = '#0a0a0c';
    poly(ctx, [[-13, 22], [13, 22], [10, 24 + jaw * 26], [-10, 24 + jaw * 26]]);
    ctx.fill();
    ctx.fillStyle = '#cfd6d2';
    for (let i = -10; i <= 8; i += 6) {
      poly(ctx, [[i, 22], [i + 4, 22], [i + 2, 28]]); ctx.fill();
      if (jaw > 0.25) { poly(ctx, [[i, 23 + jaw * 26], [i + 4, 23 + jaw * 26], [i + 2, 17 + jaw * 26]]); ctx.fill(); }
    }
    // nose
    ctx.fillStyle = '#0e0f11';
    ctx.beginPath(); ctx.ellipse(0, 6, 6, 4, 0, 0, TAU); ctx.fill();
    // eyes (one dim = damaged)
    const er = 5 * eyeR(t || 0);
    glowDot(ctx, -17, -18, er, p.eye);
    glowDot(ctx, 17, -18, er, p.eye, 0.35);
    // neck joint
    ctx.fillStyle = p.dark;
    rr(ctx, -10, 30 + jaw * 4, 20, 10, 3); ctx.fill();
  }

  function headStrix(ctx, p, jaw, t) {
    ctx.fillStyle = p.body;
    ctx.beginPath(); ctx.arc(0, -8, 44, 0, TAU); ctx.fill();
    // feather ruff
    ctx.fillStyle = p.dark;
    for (let i = -3; i <= 3; i++) {
      poly(ctx, [[i * 12 - 5, 30], [i * 12 + 5, 30], [i * 12, 44]]); ctx.fill();
    }
    ctx.fillStyle = p.body;
    poly(ctx, [[-30, -38], [-40, -62], [-14, -44]]); ctx.fill();
    poly(ctx, [[30, -38], [40, -62], [14, -44]]); ctx.fill();
    // facial disks with radial streaks
    ctx.fillStyle = p.body2;
    ctx.beginPath(); ctx.ellipse(-18, -12, 17, 20, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(18, -12, 17, 20, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1;
    for (let a = 0; a < TAU; a += TAU / 8) {
      ctx.beginPath(); ctx.moveTo(-18 + Math.cos(a) * 11, -12 + Math.sin(a) * 13);
      ctx.lineTo(-18 + Math.cos(a) * 16, -12 + Math.sin(a) * 19); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(18 + Math.cos(a) * 11, -12 + Math.sin(a) * 13);
      ctx.lineTo(18 + Math.cos(a) * 16, -12 + Math.sin(a) * 19); ctx.stroke();
    }
    // huge lamp eyes
    ctx.fillStyle = '#08080a';
    ctx.beginPath(); ctx.arc(-18, -12, 12, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(18, -12, 12, 0, TAU); ctx.fill();
    const er = 7 * eyeR(t || 0);
    glowDot(ctx, -18, -12, er, p.eye);
    glowDot(ctx, 18, -12, er, p.eye);
    // hooked beak
    ctx.fillStyle = '#1c1812';
    poly(ctx, [[-8, 8], [8, 8], [2, 22 + jaw * 18], [-2, 26 + jaw * 18]]);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, -8, 44, 0.3, 2.8); ctx.stroke();
  }

  function headWart(ctx, p, jaw, t) {
    ctx.fillStyle = p.body;
    ctx.beginPath(); ctx.ellipse(0, 0, 48, 30, 0, 0, TAU); ctx.fill();
    // breathing throat sac
    ctx.fillStyle = p.body2;
    const sac = 1 + 0.12 * Math.sin((t || 0) * 2.2);
    ctx.beginPath(); ctx.ellipse(0, 24, 22 * sac, 10 * sac, 0, 0, TAU); ctx.fill();
    // eye bumps
    ctx.fillStyle = p.body;
    ctx.beginPath(); ctx.arc(-24, -24, 13, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(24, -24, 13, 0, TAU); ctx.fill();
    const er = 5.5 * eyeR(t || 0);
    glowDot(ctx, -24, -26, er, p.eye);
    glowDot(ctx, 24, -26, er, p.eye);
    // nostrils
    ctx.fillStyle = '#10160f';
    ctx.beginPath(); ctx.arc(-7, -6, 2, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(7, -6, 2, 0, TAU); ctx.fill();
    // huge mouth
    ctx.fillStyle = '#070809';
    ctx.beginPath();
    ctx.moveTo(-42, 6);
    ctx.quadraticCurveTo(0, 14 + jaw * 30, 42, 6);
    ctx.quadraticCurveTo(0, 26 + jaw * 34, -42, 6);
    ctx.fill();
    ctx.fillStyle = '#c9d0c5';
    [-30, -12, 8, 26].forEach(tx => {
      poly(ctx, [[tx, 8], [tx + 5, 8], [tx + 2.5, 15 + jaw * 6]]); ctx.fill();
    });
    // warts
    ctx.fillStyle = p.body2;
    [[-38, -10], [-10, -16], [34, -8], [12, -18]].forEach(q => {
      ctx.beginPath(); ctx.arc(q[0], q[1], 3, 0, TAU); ctx.fill();
    });
  }

  function headRust(ctx, p, jaw, t) {
    ctx.fillStyle = p.body;
    ctx.beginPath(); ctx.arc(0, -8, 42, 0, TAU); ctx.fill();
    poly(ctx, [[-32, -34], [-42, -66], [-10, -42]]); ctx.fill();
    ctx.fillStyle = p.dark;
    poly(ctx, [[-30, -38], [-37, -56], [-18, -42]]); ctx.fill();
    ctx.fillStyle = p.body;
    poly(ctx, [[32, -34], [38, -52], [30, -48], [34, -58], [10, -42]]); ctx.fill();
    // antenna wire from torn ear
    ctx.strokeStyle = '#6a727a'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(34, -52);
    ctx.quadraticCurveTo(46, -66, 40, -74); ctx.stroke();
    // missing casing: dark patch right side
    ctx.fillStyle = '#101113';
    poly(ctx, [[4, -34], [42, -22], [40, 18], [6, 26]]);
    ctx.fill();
    // endoskeleton in the gap
    ctx.strokeStyle = '#aab2ba'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(38, -4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(8, 14); ctx.lineTo(36, 10); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(14, -30); ctx.lineTo(12, -6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(26, -28); ctx.lineTo(24, -6); ctx.stroke();
    ctx.fillStyle = '#cfd6dd';
    for (let i = 0; i < 5; i++) {
      const tx = 10 + i * 6;
      poly(ctx, [[tx, 0], [tx + 4, 0], [tx + 2, 6]]); ctx.fill();
    }
    // intact eye left, bare LED right
    ctx.fillStyle = '#0a0a0c';
    ctx.beginPath(); ctx.arc(-16, -14, 9, 0, TAU); ctx.fill();
    glowDot(ctx, -16, -14, 4.5 * eyeR(t || 0), '#ffb65e', 0.8);
    glowDot(ctx, 20, -14, 5.5 * eyeR((t || 0) + 1), p.eye);
    // intact muzzle side
    ctx.fillStyle = p.body2;
    ctx.beginPath(); ctx.ellipse(-12, 10, 16, 11, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#0a0a0c';
    ctx.beginPath(); ctx.ellipse(-12, 16 + jaw * 10, 12, 4 + jaw * 12, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#777f87';
    ctx.beginPath(); ctx.arc(-26, 8, 2, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(-4, 6, 2, 0, TAU); ctx.fill();
    // oil streak
    ctx.strokeStyle = 'rgba(10,8,6,0.6)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-30, 4); ctx.quadraticCurveTo(-32, 18, -28, 30); ctx.stroke();
  }

  const HEADS = { howler: headHowler, strix: headStrix, wart: headWart, rust: headRust };

  function claw(ctx, x, y, ang, s, color) {
    ctx.save();
    ctx.translate(x, y); ctx.rotate(ang); ctx.scale(s, s);
    ctx.fillStyle = color;
    for (let i = -1; i <= 1; i++) {
      poly(ctx, [[i * 7 - 3, 0], [i * 7 + 3, 0], [i * 7 + i * 2, 16]]);
      ctx.fill();
    }
    ctx.restore();
  }

  // ---------- full character ----------
  // pose: 'stand' | 'stare' | 'door' | 'peek' | 'sprint' | 'scare'
  function drawBot(ctx, who, x, y, s, pose, jaw, t) {
    const p = BOTS[who];
    if (!p) return;
    jaw = jaw || 0;
    t = t || 0;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);

    if (pose === 'peek') {
      const er = 5 * eyeR(t);
      glowDot(ctx, -14, 0, er, p.eye);
      glowDot(ctx, 14, 0, er, p.eye, who === 'howler' ? 0.35 : 1);
      ctx.restore();
      return;
    }

    if (pose === 'scare') {
      HEADS[who](ctx, p, jaw, t);
      ctx.restore();
      return;
    }

    if (pose === 'sprint') {
      ctx.transform(1, 0, -0.35, 1, 0, 0); // lean forward
    }
    if (pose === 'door') {
      ctx.rotate(0.07); // leaning in through the doorway
    }

    // body (head sits at local 0,0; torso below)
    const bodyTop = 38;
    ctx.fillStyle = p.body;
    rr(ctx, -34, bodyTop, 68, 88, 14); ctx.fill();
    // belly plate
    ctx.fillStyle = p.body2;
    rr(ctx, -20, bodyTop + 16, 40, 56, 10); ctx.fill();
    // torn chest opening with rib wires
    ctx.fillStyle = '#0c0d0f';
    ctx.beginPath(); ctx.ellipse(14, bodyTop + 34, 13, 18, 0.3, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#7d858d'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(14, bodyTop + 22 + i * 11, 9, 0.4, Math.PI - 0.4);
      ctx.stroke();
    }
    // seam + rivets
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, bodyTop + 16); ctx.lineTo(0, bodyTop + 72); ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath(); ctx.arc(-26, bodyTop + 10, 2.5, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(26, bodyTop + 10, 2.5, 0, TAU); ctx.fill();
    // arms with claws
    ctx.strokeStyle = p.body; ctx.lineWidth = 13; ctx.lineCap = 'round';
    if (pose === 'door') {
      // one arm reaching forward into the room
      ctx.beginPath(); ctx.moveTo(-34, bodyTop + 14); ctx.lineTo(-58, bodyTop + 40); ctx.stroke();
      claw(ctx, -60, bodyTop + 46, 0.5, 1, p.body2);
      ctx.beginPath(); ctx.moveTo(34, bodyTop + 14); ctx.lineTo(46, bodyTop + 70); ctx.stroke();
      claw(ctx, 47, bodyTop + 74, 0, 0.9, p.body2);
    } else {
      ctx.beginPath(); ctx.moveTo(-34, bodyTop + 14); ctx.lineTo(-46, bodyTop + 70); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(34, bodyTop + 14); ctx.lineTo(46, bodyTop + 70); ctx.stroke();
      claw(ctx, -47, bodyTop + 74, 0, 0.9, p.body2);
      claw(ctx, 47, bodyTop + 74, 0, 0.9, p.body2);
    }
    // exposed shoulder wire
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
    // head with idle sway
    const sway = (pose === 'stand' || pose === 'stare') ? Math.sin(t * 0.8 + x) * 0.04 : 0;
    const tilt = pose === 'stare' ? 0.08 : (pose === 'sprint' ? -0.1 : (pose === 'door' ? 0.12 : 0));
    ctx.save();
    ctx.rotate(tilt + sway);
    HEADS[who](ctx, p, pose === 'door' ? Math.max(jaw, 0.2) : jaw, t);
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

  // pre-rendered wall texture: gradient, speckle, seams, stains, baseboard
  let wallTex = null;
  function getWallTex() {
    if (wallTex) return wallTex;
    wallTex = document.createElement('canvas');
    wallTex.width = OW; wallTex.height = H;
    const c = wallTex.getContext('2d');
    let g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0d0f13');
    g.addColorStop(0.55, '#191c23');
    g.addColorStop(0.62, '#22262e');
    g.addColorStop(0.63, '#15171c');
    g.addColorStop(1, '#0b0c0f');
    c.fillStyle = g;
    c.fillRect(0, 0, OW, H);
    // wall panel seams
    c.strokeStyle = 'rgba(0,0,0,0.35)';
    c.lineWidth = 2;
    for (let x = 0; x <= OW; x += 200) {
      c.beginPath(); c.moveTo(x, 40); c.lineTo(x, 336); c.stroke();
    }
    c.beginPath(); c.moveTo(0, 90); c.lineTo(OW, 90); c.stroke();
    // speckle grime
    for (let i = 0; i < 2600; i++) {
      const x = Math.random() * OW, y = Math.random() * H;
      c.fillStyle = 'rgba(' + (Math.random() < 0.5 ? '0,0,0' : '255,255,255') + ',' + (Math.random() * 0.05) + ')';
      c.fillRect(x, y, 2, 2);
    }
    // damp stains
    for (let i = 0; i < 7; i++) {
      const x = Math.random() * OW, y = 40 + Math.random() * 240, r = 30 + Math.random() * 70;
      const sg = c.createRadialGradient(x, y, 2, x, y, r);
      sg.addColorStop(0, 'rgba(8,10,8,0.30)');
      sg.addColorStop(1, 'rgba(8,10,8,0)');
      c.fillStyle = sg;
      c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
    }
    // baseboard
    c.fillStyle = '#0a0b0d';
    c.fillRect(0, 330, OW, 12);
    // floor: tiles
    c.fillStyle = '#141519';
    c.fillRect(0, 342, OW, H - 342);
    c.strokeStyle = 'rgba(255,255,255,0.045)';
    c.lineWidth = 1;
    for (let i = 0; i <= 16; i++) {
      const fx = i * 100;
      c.beginPath();
      c.moveTo(fx, 342);
      c.lineTo(800 + (fx - 800) * 1.7, H);
      c.stroke();
    }
    for (let yy = 360; yy < H; yy += 36) {
      c.beginPath(); c.moveTo(0, yy); c.lineTo(OW, yy); c.stroke();
    }
    // floor scuffs
    for (let i = 0; i < 14; i++) {
      c.strokeStyle = 'rgba(0,0,0,' + (0.1 + Math.random() * 0.15) + ')';
      c.lineWidth = 2 + Math.random() * 2;
      const x = Math.random() * OW, y = 360 + Math.random() * 160;
      c.beginPath(); c.moveTo(x, y);
      c.quadraticCurveTo(x + 20, y + 6, x + 40 + Math.random() * 30, y + 2);
      c.stroke();
    }
    // ceiling pipes
    c.strokeStyle = '#1b1e24'; c.lineWidth = 10;
    c.beginPath(); c.moveTo(0, 18); c.lineTo(OW, 18); c.stroke();
    c.strokeStyle = '#15171c'; c.lineWidth = 7;
    c.beginPath(); c.moveTo(0, 34); c.lineTo(OW, 34); c.stroke();
    c.fillStyle = '#23262d';
    for (let x = 90; x < OW; x += 220) c.fillRect(x, 10, 12, 16);
    return wallTex;
  }

  function drawOffice(ctx, v) {
    // v: {pan, doorL, doorR (0..1 closed), lightL, lightR, atL, atR (who|null),
    //     fanA, blackout, eyesFlicker, flicker, t, prog, powerLow}
    ctx.save();
    ctx.translate(-v.pan, 0);

    const dark = v.blackout;
    const t = v.t || 0;

    if (dark) {
      ctx.fillStyle = '#020203';
      ctx.fillRect(0, 0, OW, H);
    } else {
      ctx.drawImage(getWallTex(), 0, 0);
    }

    // ceiling lamp + light cone (flickers; dies harder when power is low)
    const flickGate = v.powerLow ? 0.4 : 0.18;
    const lampOn = !dark && (v.flicker > flickGate);
    ctx.fillStyle = '#0a0b0d';
    ctx.fillRect(770, 0, 60, 26);
    ctx.fillStyle = lampOn ? '#ffe9b0' : '#26241c';
    rr(ctx, 760, 22, 80, 12, 4); ctx.fill();
    if (lampOn) {
      const cg = ctx.createLinearGradient(0, 30, 0, 430);
      cg.addColorStop(0, 'rgba(255,234,170,0.15)');
      cg.addColorStop(1, 'rgba(255,234,170,0)');
      ctx.fillStyle = cg;
      poly(ctx, [[760, 34], [840, 34], [1020, 430], [580, 430]]);
      ctx.fill();
      // pool of light on the floor
      const pg = ctx.createRadialGradient(800, 470, 10, 800, 470, 260);
      pg.addColorStop(0, 'rgba(255,234,170,0.10)');
      pg.addColorStop(1, 'rgba(255,234,170,0)');
      ctx.fillStyle = pg;
      ctx.beginPath(); ctx.ellipse(800, 470, 280, 90, 0, 0, TAU); ctx.fill();
    }

    // window into the workshop (center back)
    ctx.fillStyle = dark ? '#010102' : '#05070c';
    rr(ctx, 660, 110, 280, 130, 6); ctx.fill();
    if (!dark) {
      // machines beyond the glass + blinking standby LED
      ctx.fillStyle = 'rgba(70,80,95,0.25)';
      rr(ctx, 690, 180, 40, 60, 3); ctx.fill();
      rr(ctx, 850, 170, 50, 70, 3); ctx.fill();
      ctx.strokeStyle = 'rgba(70,80,95,0.25)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(740, 240); ctx.lineTo(760, 190); ctx.lineTo(790, 240); ctx.stroke();
      if (Math.sin(t * 1.4) > 0.92) glowDot(ctx, 868, 182, 2.5, '#ff4040', 0.8);
      // glass sheen
      ctx.fillStyle = 'rgba(160,180,210,0.05)';
      poly(ctx, [[675, 110], [730, 110], [690, 240], [660, 240]]); ctx.fill();
    }
    ctx.strokeStyle = dark ? '#0c0d10' : '#2c313b';
    ctx.lineWidth = 6;
    rr(ctx, 660, 110, 280, 130, 6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(800, 110); ctx.lineTo(800, 240); ctx.stroke();

    if (!dark) {
      // wall clock: hands sweep 12:00 -> 6:00 across the night
      const prog = v.prog || 0;
      ctx.fillStyle = '#1c1f25';
      ctx.beginPath(); ctx.arc(580, 150, 26, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#3a4049'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(580, 150, 26, 0, TAU); ctx.stroke();
      ctx.strokeStyle = '#aeb6c0'; ctx.lineWidth = 2;
      const ha = -Math.PI / 2 + prog * Math.PI;
      ctx.beginPath(); ctx.moveTo(580, 150);
      ctx.lineTo(580 + Math.cos(ha) * 13, 150 + Math.sin(ha) * 13); ctx.stroke();
      const ma = -Math.PI / 2 + prog * 6 * TAU;
      ctx.strokeStyle = '#7d858d'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(580, 150);
      ctx.lineTo(580 + Math.cos(ma) * 19, 150 + Math.sin(ma) * 19); ctx.stroke();

      // posters (original props)
      ctx.save();
      ctx.translate(495, 190); ctx.rotate(-0.03);
      ctx.fillStyle = '#cfc6ae';
      ctx.fillRect(0, 0, 86, 110);
      text(ctx, 'SAFETY', 43, 22, 14, '#7a2f25', 'center');
      text(ctx, 'FIRST', 43, 40, 14, '#7a2f25', 'center');
      ctx.strokeStyle = '#444'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(43, 74, 20, 0, TAU); ctx.stroke();
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
        ctx.beginPath(); ctx.arc(bx, 34, 9, 0, TAU); ctx.stroke();
        ctx.strokeRect(bx - 7, 46, 14, 22);
      });
      text(ctx, 'my friends!', 60, 84, 11, '#5a4a6e', 'center', 'cursive');
      ctx.restore();

      // parts shelf
      ctx.fillStyle = '#23262d';
      ctx.fillRect(1080, 252, 150, 8);
      poly(ctx, [[1090, 260], [1100, 282], [1086, 282]]); ctx.fillStyle = '#1a1d22'; ctx.fill();
      poly(ctx, [[1215, 260], [1225, 282], [1201, 282]]); ctx.fill();
      // spare mascot head on the shelf, eyes dead
      ctx.fillStyle = '#2c3036';
      ctx.beginPath(); ctx.arc(1115, 236, 15, 0, TAU); ctx.fill();
      poly(ctx, [[1104, 226], [1100, 212], [1112, 222]]); ctx.fill();
      poly(ctx, [[1126, 226], [1130, 212], [1118, 222]]); ctx.fill();
      ctx.fillStyle = '#0d0e10';
      ctx.beginPath(); ctx.arc(1109, 234, 3, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(1121, 234, 3, 0, TAU); ctx.fill();
      // oil can + box
      ctx.fillStyle = '#3a3f48';
      rr(ctx, 1150, 234, 18, 26, 2); ctx.fill();
      ctx.fillStyle = '#33291c';
      rr(ctx, 1178, 240, 34, 20, 2); ctx.fill();

      // vent grille
      ctx.fillStyle = '#15181d';
      rr(ctx, 430, 288, 56, 36, 3); ctx.fill();
      ctx.strokeStyle = '#272b32'; ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath(); ctx.moveTo(436, 296 + i * 7); ctx.lineTo(480, 296 + i * 7); ctx.stroke();
      }

      // floor cables to the panels
      ctx.strokeStyle = '#0e1013'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(362, 430);
      ctx.quadraticCurveTo(500, 480, 620, 470); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(1238, 430);
      ctx.quadraticCurveTo(1100, 484, 990, 472); ctx.stroke();
    }

    // ---- side doorways ----
    drawDoorway(ctx, v, 'L', 120, dark, t);
    drawDoorway(ctx, v, 'R', OW - 120 - 150, dark, t);

    // ---- control panels ----
    drawPanel(ctx, v, 'L', 330, dark);
    drawPanel(ctx, v, 'R', OW - 330 - 64, dark);

    // ---- desk ----
    drawDesk(ctx, v, dark, t);

    // blackout: roaming eyes at left doorway
    if (dark && v.eyesFlicker) {
      const ex = 195, ey = 250;
      glowDot(ctx, ex - 14, ey, 5, '#e6f3ff', v.eyesFlicker);
      glowDot(ctx, ex + 14, ey, 5, '#e6f3ff', v.eyesFlicker);
    }

    ctx.restore();

    // ambient grade
    ctx.fillStyle = 'rgba(2,3,8,' + (dark ? 0.25 : 0.10) + ')';
    ctx.fillRect(0, 0, W, H);
  }

  function drawDoorway(ctx, v, side, x, dark, t) {
    const w = 150, top = 96, bottom = 430;
    const closed = side === 'L' ? v.doorL : v.doorR;
    const lit = !dark && (side === 'L' ? v.lightL : v.lightR);
    const who = side === 'L' ? v.atL : v.atR;

    // hallway behind
    ctx.fillStyle = '#000002';
    ctx.fillRect(x, top, w, bottom - top);

    if (lit) {
      const fl = 0.85 + 0.15 * Math.sin(t * 37) * Math.random(); // fluorescent jitter
      ctx.save();
      ctx.globalAlpha = fl;
      const lg = ctx.createLinearGradient(x, top, x, bottom);
      lg.addColorStop(0, 'rgba(225,235,255,0.55)');
      lg.addColorStop(1, 'rgba(225,235,255,0.18)');
      ctx.fillStyle = lg;
      ctx.fillRect(x, top, w, bottom - top);
      // hall floor + far wall
      ctx.fillStyle = 'rgba(180,195,220,0.13)';
      poly(ctx, [[x, bottom], [x + w, bottom], [x + w + 24, H], [x - 24, H]]);
      ctx.fill();
      ctx.strokeStyle = 'rgba(190,205,230,0.20)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x + 18, top + 50); ctx.lineTo(x + 18, bottom - 10); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + w - 18, top + 60); ctx.lineTo(x + w - 18, bottom - 16); ctx.stroke();
      // exit sign far in the hall
      ctx.fillStyle = 'rgba(90,220,140,0.5)';
      rr(ctx, x + w / 2 - 16, top + 28, 32, 10, 2); ctx.fill();
      if (who) drawBot(ctx, who, x + w / 2, 250, 1.05, 'door', 0.25, t);
      ctx.restore();
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
      // brushed slats
      ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 2;
      for (let yy = top + 26; yy < top + dh; yy += 30) {
        ctx.beginPath(); ctx.moveTo(x + 4, yy); ctx.lineTo(x + w - 4, yy); ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      for (let yy = top + 12; yy < top + dh; yy += 30) {
        ctx.beginPath(); ctx.moveTo(x + 4, yy); ctx.lineTo(x + w - 4, yy); ctx.stroke();
      }
      // hazard stripe at door base edge
      ctx.fillStyle = dark ? '#3a3208' : '#b3a018';
      ctx.fillRect(x, top + dh - 8, w, 8);
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      for (let sx = x; sx < x + w; sx += 24) {
        poly(ctx, [[sx, top + dh], [sx + 12, top + dh], [sx + 24, top + dh - 8], [sx + 12, top + dh - 8]]);
        ctx.fill();
      }
    }

    // frame with depth
    ctx.fillStyle = dark ? '#0a0b0d' : '#3c424c';
    ctx.fillRect(x - 18, top - 18, 18, bottom - top + 36);
    ctx.fillRect(x + w, top - 18, 18, bottom - top + 36);
    ctx.fillRect(x - 18, top - 18, w + 36, 18);
    ctx.fillStyle = dark ? '#08090b' : '#272c34';
    ctx.fillRect(x - 10, top - 10, 10, bottom - top + 20);
    ctx.fillRect(x + w, top - 10, 10, bottom - top + 20);
    ctx.fillStyle = dark ? '#08090b' : '#2c3138';
    ctx.fillRect(x - 24, bottom, w + 48, 14);
    // doorway plate
    if (!dark) {
      ctx.fillStyle = '#1c2026';
      rr(ctx, x + w / 2 - 22, top - 14, 44, 12, 2); ctx.fill();
      text(ctx, side === 'L' ? 'W-1' : 'E-1', x + w / 2, top - 8, 9, '#8a948e', 'center');
      // caution strip on the threshold
      ctx.fillStyle = 'rgba(179,160,24,0.25)';
      ctx.fillRect(x - 6, bottom + 2, w + 12, 4);
    }
  }

  function drawPanel(ctx, v, side, x, dark) {
    const y = 220, w = 64, h = 150;
    const doorOn = side === 'L' ? v.doorL > 0.5 : v.doorR > 0.5;
    const lightOn = side === 'L' ? v.lightL : v.lightR;
    // plate
    ctx.fillStyle = dark ? '#0a0b0c' : '#23262c';
    rr(ctx, x, y, w, h, 8); ctx.fill();
    ctx.strokeStyle = dark ? '#101113' : '#3a3f48';
    ctx.lineWidth = 3;
    rr(ctx, x, y, w, h, 8); ctx.stroke();
    // corner screws
    if (!dark) {
      ctx.fillStyle = '#4a515b';
      [[x + 7, y + 7], [x + w - 7, y + 7], [x + 7, y + h - 7], [x + w - 7, y + h - 7]].forEach(q => {
        ctx.beginPath(); ctx.arc(q[0], q[1], 2.2, 0, TAU); ctx.fill();
      });
      // status LED
      glowDot(ctx, x + w / 2, y + 8, 2, doorOn ? '#37e05e' : '#d8403c', 0.9);
    }
    // DOOR button (bevel)
    ctx.fillStyle = dark ? '#1c0d0d' : (doorOn ? '#37e05e' : '#d8403c');
    rr(ctx, x + 10, y + 14, w - 20, 48, 6); ctx.fill();
    if (!dark) {
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      rr(ctx, x + 12, y + 16, w - 24, 10, 4); ctx.fill();
    }
    text(ctx, 'DOOR', x + w / 2, y + 41, 12, dark ? '#3a2a2a' : '#10131a', 'center');
    // LIGHT button
    ctx.fillStyle = dark ? '#16161c' : (lightOn ? '#ffe9a0' : '#5a6170');
    rr(ctx, x + 10, y + 78, w - 20, 48, 6); ctx.fill();
    if (!dark) {
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      rr(ctx, x + 12, y + 80, w - 24, 10, 4); ctx.fill();
    }
    text(ctx, 'LIGHT', x + w / 2, y + 105, 12, '#10131a', 'center');
    // conduit
    ctx.strokeStyle = dark ? '#0c0d0f' : '#30353d'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(x + w / 2, y + h); ctx.lineTo(x + w / 2, y + h + 60); ctx.stroke();
  }

  function drawDesk(ctx, v, dark, t) {
    const cx = 800;
    // desk top
    ctx.fillStyle = dark ? '#0b0c0e' : '#242931';
    poly(ctx, [[cx - 290, 400], [cx + 290, 400], [cx + 340, 540], [cx - 340, 540]]);
    ctx.fill();
    ctx.fillStyle = dark ? '#08090a' : '#1a1e24';
    poly(ctx, [[cx - 290, 400], [cx + 290, 400], [cx + 296, 412], [cx - 296, 412]]);
    ctx.fill();
    if (dark) return;

    // trash can beside the desk
    ctx.fillStyle = '#1b1f25';
    poly(ctx, [[cx - 360, 450], [cx - 318, 450], [cx - 324, 530], [cx - 354, 530]]);
    ctx.fill();
    ctx.fillStyle = '#cfc9b8';
    ctx.beginPath(); ctx.arc(cx - 339, 452, 8, 0, TAU); ctx.fill(); // crumpled paper

    // CRT monitor with static + glow
    const mg = ctx.createRadialGradient(cx, 345, 10, cx, 345, 130);
    mg.addColorStop(0, 'rgba(150,170,200,' + (0.08 + (noiseFrame % 3) * 0.012) + ')');
    mg.addColorStop(1, 'rgba(150,170,200,0)');
    ctx.fillStyle = mg;
    ctx.fillRect(cx - 140, 250, 280, 170);
    ctx.fillStyle = '#15171b';
    rr(ctx, cx - 80, 290, 160, 118, 8); ctx.fill();
    ctx.fillStyle = '#06080a';
    rr(ctx, cx - 68, 300, 136, 90, 4); ctx.fill();
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(noiseCanvases[(noiseFrame + 2) % 6], cx - 68, 300, 136, 90);
    ctx.restore();
    // moving scanline on the little screen
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    ctx.fillRect(cx - 68, 300 + ((t * 60) % 90), 136, 3);
    glowDot(ctx, cx + 70, 398, 2, '#37e05e', 0.9); // power LED
    ctx.fillStyle = '#15171b';
    rr(ctx, cx - 26, 406, 52, 10, 3); ctx.fill();
    // sticky notes on the bezel
    ctx.fillStyle = '#cfc06a';
    ctx.fillRect(cx - 96, 308, 22, 22);
    ctx.fillStyle = '#9ec98f';
    ctx.fillRect(cx + 78, 330, 20, 20);
    ctx.strokeStyle = 'rgba(60,55,30,0.5)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx - 93, 315); ctx.lineTo(cx - 78, 315); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - 93, 321); ctx.lineTo(cx - 80, 321); ctx.stroke();

    // keyboard
    ctx.fillStyle = '#1d2127';
    rr(ctx, cx - 70, 424, 140, 30, 4); ctx.fill();
    ctx.fillStyle = '#2c313a';
    for (let r = 0; r < 2; r++)
      for (let k = 0; k < 10; k++)
        ctx.fillRect(cx - 62 + k * 13, 430 + r * 10, 9, 7);

    // desk fan (animated blades in a cage)
    const fx = cx - 190, fy = 352;
    ctx.strokeStyle = '#3a4049'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(fx, fy + 28); ctx.lineTo(fx, fy + 50); ctx.stroke();
    ctx.fillStyle = '#2e333b';
    rr(ctx, fx - 22, fy + 46, 44, 10, 4); ctx.fill();
    ctx.save();
    ctx.translate(fx, fy);
    ctx.fillStyle = 'rgba(160,170,185,0.6)';
    for (let b = 0; b < 3; b++) {
      ctx.save();
      ctx.rotate(v.fanA + b * (TAU / 3));
      ctx.beginPath(); ctx.ellipse(0, -15, 7, 15, 0, 0, TAU); ctx.fill();
      ctx.restore();
    }
    // motion blur ring
    ctx.strokeStyle = 'rgba(160,170,185,0.10)'; ctx.lineWidth = 12;
    ctx.beginPath(); ctx.arc(0, 0, 18, 0, TAU); ctx.stroke();
    // cage
    ctx.strokeStyle = '#454c57'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(0, 0, 30, 0, TAU); ctx.stroke();
    ctx.lineWidth = 1.2;
    for (let a = 0; a < TAU; a += TAU / 6) {
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 30, Math.sin(a) * 30); ctx.stroke();
    }
    ctx.fillStyle = '#20242a';
    ctx.beginPath(); ctx.arc(0, 0, 6, 0, TAU); ctx.fill();
    ctx.restore();

    // papers + mug with steam
    ctx.save();
    ctx.translate(cx + 150, 420); ctx.rotate(0.06);
    ctx.fillStyle = '#cfc9b8'; ctx.fillRect(0, 0, 70, 46);
    ctx.fillStyle = '#bdb6a2'; ctx.fillRect(8, -6, 70, 46);
    ctx.fillStyle = '#cfc9b8'; ctx.fillRect(4, -3, 70, 46);
    ctx.strokeStyle = '#8b8675'; ctx.lineWidth = 1;
    for (let i = 8; i < 42; i += 8) { ctx.beginPath(); ctx.moveTo(10, i); ctx.lineTo(68, i); ctx.stroke(); }
    ctx.restore();
    ctx.fillStyle = '#6e3340';
    rr(ctx, cx + 92, 408, 26, 30, 4); ctx.fill();
    ctx.strokeStyle = '#6e3340'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(cx + 122, 422, 9, -1.2, 1.2); ctx.stroke();
    ctx.strokeStyle = 'rgba(200,210,220,0.12)'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx + 105, 404);
    ctx.quadraticCurveTo(cx + 100 + Math.sin(t * 2) * 4, 390, cx + 106, 378);
    ctx.stroke();
    // coffee ring stains
    ctx.strokeStyle = 'rgba(80,50,40,0.25)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx + 60, 446, 12, 0, TAU); ctx.stroke();
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

  function spotCone(ctx, x, topY, floorY, w, color) {
    const cg = ctx.createLinearGradient(0, topY, 0, floorY);
    cg.addColorStop(0, color);
    cg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = cg;
    poly(ctx, [[x - w * 0.18, topY], [x + w * 0.18, topY], [x + w, floorY], [x - w, floorY]]);
    ctx.fill();
  }

  function hallShell(ctx, tint) {
    ctx.fillStyle = '#030405';
    ctx.fillRect(0, 0, W, H);
    const vx = W / 2, vy = 250;
    ctx.fillStyle = tint;
    poly(ctx, [[0, 0], [W, 0], [vx + 110, vy - 90], [vx - 110, vy - 90]]); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    poly(ctx, [[0, H], [W, H], [vx + 110, vy + 70], [vx - 110, vy + 70]]); ctx.fill();
    ctx.fillStyle = 'rgba(120,135,150,0.10)';
    poly(ctx, [[0, 0], [vx - 110, vy - 90], [vx - 110, vy + 70], [0, H]]); ctx.fill();
    poly(ctx, [[W, 0], [vx + 110, vy - 90], [vx + 110, vy + 70], [W, H]]); ctx.fill();
    ctx.fillStyle = '#020203';
    ctx.fillRect(vx - 110, vy - 90, 220, 160);
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 2;
    [[0, 120], [0, 320], [W, 120], [W, 320]].forEach(q => {
      ctx.beginPath(); ctx.moveTo(q[0], q[1]);
      ctx.lineTo(q[0] < vx ? vx - 110 : vx + 110, vy - 20); ctx.stroke();
    });
  }

  // slots: standing positions per room for up to 3 visitors
  const ROOM_SLOTS = [
    [{ x: 330, y: 250, s: 0.78 }, { x: 520, y: 262, s: 0.84 }, { x: 690, y: 246, s: 0.74 }],
    [{ x: 300, y: 268, s: 0.85 }, { x: 600, y: 250, s: 0.78 }, { x: 760, y: 270, s: 0.85 }],
    [{ x: 480, y: 270, s: 0.95 }, { x: 300, y: 262, s: 0.85 }, { x: 660, y: 262, s: 0.85 }],
    [{ x: 430, y: 268, s: 0.9 }, { x: 620, y: 258, s: 0.8 }, { x: 250, y: 258, s: 0.8 }],
    [{ x: 480, y: 280, s: 1.0 }],
    [{ x: 480, y: 290, s: 0.62 }, { x: 480, y: 360, s: 1.0 }],
    [{ x: 500, y: 330, s: 1.5 }],
    [{ x: 480, y: 290, s: 0.62 }, { x: 480, y: 360, s: 1.0 }],
    [{ x: 460, y: 330, s: 1.5 }],
  ];

  function drawCamView(ctx, cam, occ, extra) {
    // extra: {t, rustStage, sprintFlash, lightFlicker}
    const t = extra.t || 0;
    switch (cam) {
      case 0: { // WORKSHOP FLOOR
        roomShell(ctx, '#13202a');
        spotCone(ctx, 250, 40, 360, 130, 'rgba(170,190,220,0.07)');
        spotCone(ctx, 640, 40, 360, 130, 'rgba(170,190,220,0.06)');
        [-40, 220, 480, 740].forEach(bx => {
          ctx.fillStyle = '#1b242c';
          poly(ctx, [[bx + 60, 300], [bx + 220, 300], [bx + 240, 360], [bx + 40, 360]]); ctx.fill();
          ctx.fillStyle = '#10151a';
          ctx.fillRect(bx + 70, 360, 14, 60); ctx.fillRect(bx + 196, 360, 14, 60);
          // tools on the bench
          ctx.fillStyle = '#2c343c';
          ctx.fillRect(bx + 90, 292, 26, 8); ctx.fillRect(bx + 150, 290, 16, 10);
        });
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
        poly(ctx, [[40, 320], [920, 270], [920, 310], [40, 372]]); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.lineWidth = 2;
        for (let i = 0; i < 12; i++) {
          const bx = 60 + i * 76;
          ctx.beginPath(); ctx.moveTo(bx, 322 - i * 4); ctx.lineTo(bx - 6, 370 - i * 4.6); ctx.stroke();
        }
        ctx.strokeStyle = '#252c36'; ctx.lineWidth = 12; ctx.lineCap = 'round';
        [[180, 150], [560, 130]].forEach(q => {
          ctx.beginPath(); ctx.moveTo(q[0], q[1]);
          ctx.lineTo(q[0] + 60, q[1] + 70); ctx.lineTo(q[0] + 40, q[1] + 150); ctx.stroke();
        });
        // warning beacon
        if (Math.sin(t * 2.4) > 0.6) glowDot(ctx, 850, 90, 4, '#ffb02e', 0.5);
        break;
      }
      case 2: { // PAINT BOOTH
        roomShell(ctx, '#241a20');
        for (let i = 0; i < 14; i++) {
          const bx = 80 + i * 60;
          ctx.fillStyle = 'rgba(170,180,200,' + (0.05 + (i % 3) * 0.025) + ')';
          poly(ctx, [[bx, 40], [bx + 44, 40], [bx + 40, 330], [bx - 4, 330]]); ctx.fill();
        }
        ['#5d3a3a', '#3a4a5d', '#3f5d3a'].forEach((cc, i) => {
          ctx.fillStyle = cc;
          rr(ctx, 130 + i * 52, 348, 40, 52, 4); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.12)';
          ctx.fillRect(134 + i * 52, 352, 32, 6);
        });
        // paint splatter on the floor
        ctx.fillStyle = 'rgba(93,58,58,0.3)';
        ctx.beginPath(); ctx.ellipse(420, 420, 50, 14, 0.2, 0, TAU); ctx.fill();
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
        // swinging work light
        const sw = Math.sin(t * 1.1) * 24;
        ctx.strokeStyle = 'rgba(150,150,140,0.3)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(480, 0); ctx.lineTo(480 + sw, 70); ctx.stroke();
        glowDot(ctx, 480 + sw, 76, 5, '#ffe9b0', 0.5);
        break;
      }
      case 4: { // MAINTENANCE BAY (RUST's den)
        roomShell(ctx, '#1f150e');
        // dim red service lamp
        const rg = ctx.createRadialGradient(480, 60, 5, 480, 60, 300);
        rg.addColorStop(0, 'rgba(255,70,50,0.10)');
        rg.addColorStop(1, 'rgba(255,70,50,0)');
        ctx.fillStyle = rg;
        ctx.fillRect(0, 0, W, H);
        const stage = extra.rustStage || 0;
        const gap = [16, 60, 130, 170][Math.min(stage, 3)];
        ctx.fillStyle = '#241c14';
        ctx.fillRect(280, 70, 400, 340);
        // hazard chevrons around the roller door
        ctx.fillStyle = '#8a7618';
        for (let yy = 80; yy < 400; yy += 40) {
          poly(ctx, [[284, yy], [296, yy], [284, yy + 20]]); ctx.fill();
          poly(ctx, [[676, yy], [664, yy], [676, yy + 20]]); ctx.fill();
        }
        ctx.fillStyle = '#170f0a';
        ctx.fillRect(300, 90, 360, 300);
        ctx.fillStyle = '#2d241a';
        const downTo = 390 - gap;
        for (let yy = 90; yy < downTo; yy += 24) ctx.fillRect(300, yy, 360, 20);
        ctx.fillStyle = '#020202';
        ctx.fillRect(300, downTo, 360, 390 - downTo);
        if (stage === 1) drawBot(ctx, 'rust', 480, downTo + 40, 1.0, 'peek', 0, t);
        if (stage === 2) drawBot(ctx, 'rust', 480, downTo + 62, 0.95, 'stare', 0.2, t);
        if (stage >= 3) {
          text(ctx, 'BAY EMPTY', 480, 250, 26, 'rgba(255,80,80,' + (0.35 + 0.2 * Math.sin(t * 6)) + ')', 'center', null, 4);
        }
        ctx.fillStyle = '#8a7618';
        poly(ctx, [[160, 200], [200, 200], [180, 166]]); ctx.fill();
        text(ctx, 'KEEP CLEAR', 180, 224, 11, 'rgba(220,200,120,0.5)', 'center');
        break;
      }
      case 5: case 7: { // WEST / EAST HALL
        hallShell(ctx, cam === 5 ? '#10161d' : '#181216');
        if (cam === 5) {
          const on = extra.lightFlicker;
          ctx.fillStyle = on ? 'rgba(220,230,255,0.8)' : 'rgba(60,65,80,0.4)';
          ctx.fillRect(W / 2 - 60, 60, 120, 8);
          if (on) {
            ctx.fillStyle = 'rgba(200,215,255,0.06)';
            poly(ctx, [[W / 2 - 70, 68], [W / 2 + 70, 68], [W / 2 + 150, 420], [W / 2 - 150, 420]]);
            ctx.fill();
          }
          // wet floor cone
          ctx.fillStyle = '#8a7618';
          poly(ctx, [[700, 420], [740, 420], [720, 360]]); ctx.fill();
          if (extra.sprintFlash) drawBot(ctx, 'rust', W / 2, 330, 1.25, 'sprint', 0.6, t);
        } else {
          ctx.strokeStyle = 'rgba(150,130,120,0.2)'; ctx.lineWidth = 8;
          ctx.beginPath(); ctx.moveTo(30, 120); ctx.lineTo(W / 2 - 105, 200); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(30, 150); ctx.lineTo(W / 2 - 105, 222); ctx.stroke();
          // drips from the pipe
          if (Math.sin(t * 3.7) > 0.86) {
            ctx.fillStyle = 'rgba(150,170,190,0.4)';
            ctx.fillRect(200, 240 + (t * 240) % 160, 2, 8);
          }
        }
        break;
      }
      case 6: { // WEST CORNER
        roomShell(ctx, '#101720');
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        poly(ctx, [[0, 0], [340, 0], [180, H], [0, H]]); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(340, 0); ctx.lineTo(180, H); ctx.stroke();
        spotCone(ctx, 620, 30, 380, 150, 'rgba(170,190,220,0.05)');
        text(ctx, 'OFFICE →', 760, 90, 20, 'rgba(190,200,215,0.25)', 'center', null, 3);
        break;
      }
      case 8: { // EAST CORNER
        roomShell(ctx, '#141019');
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        poly(ctx, [[W, 0], [W - 340, 0], [W - 180, H], [W, H]]); ctx.fill();
        ctx.fillStyle = '#101820';
        rr(ctx, 120, 170, 110, 230, 6); ctx.fill();
        ctx.fillStyle = 'rgba(120,200,255,' + (0.10 + 0.05 * Math.sin(t * 3)) + ')';
        rr(ctx, 132, 186, 60, 160, 4); ctx.fill();
        text(ctx, '← OFFICE', 300, 90, 20, 'rgba(190,200,215,0.25)', 'center', null, 3);
        break;
      }
    }

    // occupants — occasionally caught mid-stare at the camera
    (occ || []).forEach((o, i) => {
      const slots = ROOM_SLOTS[cam];
      const sl = slots[Math.min(i, slots.length - 1)];
      const staring = Math.sin(t * 0.43 + cam * 2 + i * 5) > 0.55;
      const pose = (cam === 6 || cam === 8) ? 'stare' : (staring ? 'stare' : (o.pose || 'stand'));
      drawBot(ctx, o.who, sl.x + (i - 1) * 8, sl.y, sl.s, pose, 0, t + i * 3);
    });
  }

  // =====================================================================
  // JUMPSCARE / MENU
  // =====================================================================
  function drawJumpscare(ctx, who, k) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    // lunge up from below, then jaw snap and hold
    const rise = Math.min(1, k * 2.2);
    const ease = 1 - Math.pow(1 - rise, 3);
    const y = H + 240 - ease * (H / 2 + 200);
    const s = 1.2 + k * 3.4;
    const shx = (Math.random() - 0.5) * 50 * k;
    const shy = (Math.random() - 0.5) * 38 * k;
    const jaw = k < 0.4 ? k * 0.5 : Math.min(1, (k - 0.4) * 2.4);
    // ghost double-image
    ctx.save();
    ctx.globalAlpha = 0.25;
    drawBot(ctx, who, W / 2 + shx * 1.8, y + 40 + shy * 1.8, s * 1.04, 'scare', jaw, k * 10);
    ctx.restore();
    drawBot(ctx, who, W / 2 + shx, y + 40 + shy, s, 'scare', jaw, k * 10);
    if (k < 0.12) { ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(0, 0, W, H); }
    noiseOverlay(ctx, 0.18 + k * 0.22);
  }

  function drawMenuBg(ctx, t) {
    ctx.fillStyle = '#030304';
    ctx.fillRect(0, 0, W, H);
    // huge slow-zooming face in the dark
    const ph = (t * 0.05) % 4;
    const who = ['howler', 'strix', 'wart', 'rust'][ph | 0];
    ctx.save();
    ctx.globalAlpha = 0.13 + 0.05 * Math.sin(t * 0.9);
    drawBot(ctx, who, 660 + 24 * Math.sin(t * 0.21), 280,
      2.6 + 0.25 * Math.sin(t * 0.13), 'scare', 0.1 + 0.08 * Math.sin(t * 1.7), t);
    ctx.restore();
    // occasional bright eye flash
    if (Math.sin(t * 0.9) > 0.985) {
      ctx.save();
      ctx.globalAlpha = 0.5;
      drawBot(ctx, who, 660, 280, 2.6, 'peek', 0, t);
      ctx.restore();
    }
    noiseOverlay(ctx, 0.10 + (Math.random() < 0.02 ? 0.25 : 0));
    glitch(ctx, t, 0.8);
    scanlines(ctx, 0.35);
    vignette(ctx, 0.8);
  }

  return { W, H, rr, poly, text, glowDot, drawBot, drawOffice, drawCamView, drawJumpscare, drawMenuBg, noiseOverlay, scanlines, vignette, glitch, BOTS };
})();
