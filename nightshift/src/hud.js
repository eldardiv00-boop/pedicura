/* ============================================================
 * NIGHTSHIFT — hud.js
 * Time + power readouts, drawn on top of OFFICE and CAMERA
 * states. Pure rendering: reads the game context, draws text.
 * ============================================================ */
window.NS = window.NS || {};

NS.HUD = {

  // "12 AM", "1 AM", ... "5 AM"
  hourLabel(game) {
    const h = game.clock.hour();
    return (h === 0 ? 12 : h) + ' AM';
  },

  draw(ctx, game) {
    const C = NS.CONFIG;
    ctx.save();
    ctx.font = '26px "Courier New", monospace';
    ctx.textBaseline = 'middle';

    // ---- top right: clock + night ----
    ctx.textAlign = 'right';
    ctx.fillStyle = '#e8e8e0';
    ctx.fillText(this.hourLabel(game), C.WIDTH - 18, 30);
    ctx.font = '14px "Courier New", monospace';
    ctx.fillStyle = '#8a948e';
    ctx.fillText('NIGHT ' + game.night, C.WIDTH - 18, 54);

    // ---- bottom left: power ----
    const pct = Math.ceil(game.power.value);
    ctx.textAlign = 'left';
    ctx.font = '18px "Courier New", monospace';
    ctx.fillStyle = pct <= 20 ? '#ff5a5a' : '#cfd6d2';
    ctx.fillText('POWER LEFT: ' + pct + '%', 18, C.HEIGHT - 46);

    // usage pips: 1 pip = passive, +1 per active device
    ctx.font = '14px "Courier New", monospace';
    ctx.fillStyle = '#8a948e';
    ctx.fillText('USAGE:', 18, C.HEIGHT - 22);
    const pips = 1 + game.power.devices();
    for (let i = 0; i < pips; i++) {
      ctx.fillStyle = i < 2 ? '#37e05e' : (i < 4 ? '#ffd24a' : '#ff5a5a');
      ctx.fillRect(86 + i * 16, C.HEIGHT - 30, 12, 16);
    }
    ctx.restore();
  }
};
