/* ============================================================
 * NIGHTSHIFT — states.js
 * The five core game states (plus a TITLE state, required so
 * the first user click can unlock browser audio).
 *
 *   TITLE      click to start                 -> OFFICE
 *   OFFICE     desk view; doors/lights live   <-> CAMERAS
 *   CAMERAS    monitor up; office input dead  <-> OFFICE
 *   JUMPSCARE  1.2 s scare sequence           -> GAME_OVER
 *   GAME_OVER  retry / quit
 *   VICTORY    6 AM survived -> next night
 *
 * Phase 1 renders placeholder backdrops + labels; Phases 2-5
 * replace render bodies without touching the transitions.
 * ============================================================ */
window.NS = window.NS || {};

(function () {
  const C = NS.CONFIG;

  // tiny text helper used by every placeholder screen
  function label(ctx, str, x, y, size, color, align) {
    ctx.font = size + 'px "Courier New", monospace';
    ctx.fillStyle = color || '#cfd6d2';
    ctx.textAlign = align || 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(str, x, y);
  }

  // ---------------- TITLE ----------------
  NS.States = {};

  NS.States.TITLE = {
    render(ctx) {
      ctx.fillStyle = '#050506';
      ctx.fillRect(0, 0, C.WIDTH, C.HEIGHT);
      label(ctx, 'N I G H T S H I F T', C.WIDTH / 2, 180, 48, '#dfe3df');
      label(ctx, 'Phase 1 build — core loop & state machine', C.WIDTH / 2, 240, 16, '#8a948e');
      if (Math.floor(this.game.fsm.timeInState * 2) % 2 === 0) {
        label(ctx, '— CLICK TO CLOCK IN —', C.WIDTH / 2, 360, 18, '#cfd6d2');
      }
    },
    onClick() {
      this.game.startNight(this.game.night);   // resets clock + power
      this.game.fsm.change('OFFICE');
      NS.playSound('ambient_office');
    }
  };

  // ---------------- OFFICE ----------------
  NS.States.OFFICE = {
    render(ctx) {
      // Phase 2 replaces this with the real office (pan, doors, lights).
      ctx.fillStyle = '#101216';
      ctx.fillRect(0, 0, C.WIDTH, C.HEIGHT);
      ctx.fillStyle = '#1a1d24';
      ctx.fillRect(0, C.HEIGHT * 0.62, C.WIDTH, C.HEIGHT);
      label(ctx, '[ OFFICE VIEW — placeholder ]', C.WIDTH / 2, C.HEIGHT / 2 - 20, 22, '#5a635e');
      label(ctx, 'M = monitor up' + (C.DEBUG_KEYS ? '   |   debug: J scare · G game over · V victory' : ''),
        C.WIDTH / 2, C.HEIGHT / 2 + 20, 14, '#44504a');
      NS.HUD.draw(ctx, this.game);
    },
    onKey(key) {
      if (key === 'm' || key === ' ') {
        this.game.fsm.change('CAMERAS');
        NS.playSound('camera_open');
      }
    }
  };

  // ---------------- CAMERAS ----------------
  NS.States.CAMERAS = {
    enter() { this.camIndex = this.camIndex || 0; },
    render(ctx) {
      // Phase 3 replaces this with real feeds + the map UI.
      const cam = C.CAMERAS[this.camIndex];
      ctx.fillStyle = '#0a1410';
      ctx.fillRect(0, 0, C.WIDTH, C.HEIGHT);
      label(ctx, '[ ' + cam.label + ' — placeholder feed ]', C.WIDTH / 2, C.HEIGHT / 2, 22, '#46604f');
      label(ctx, '1-' + C.CAMERAS.length + ' switch · M close', C.WIDTH / 2, C.HEIGHT / 2 + 36, 14, '#3a4f42');
      label(ctx, cam.label, 22, 30, 18, '#cfe6cf', 'left');
      NS.HUD.draw(ctx, this.game);
    },
    onKey(key) {
      if (key === 'm' || key === ' ') {
        this.game.fsm.change('OFFICE');
        NS.playSound('camera_close');
      } else {
        const n = parseInt(key, 10);
        if (n >= 1 && n <= C.CAMERAS.length && n - 1 !== this.camIndex) {
          this.camIndex = n - 1;
          NS.playSound('camera_switch');
        }
      }
    }
  };

  // ---------------- JUMPSCARE ----------------
  NS.States.JUMPSCARE = {
    enter(data) {
      this.who = (data && data.who) || 'botA';
      NS.playSound('jumpscare_' + this.who);
    },
    render(ctx) {
      // Phase 5 swaps this flash for the sprite-strip animation.
      const t = this.game.fsm.timeInState;
      ctx.fillStyle = t < 0.1 ? '#fff' : '#000';
      ctx.fillRect(0, 0, C.WIDTH, C.HEIGHT);
      const shake = () => (Math.random() - 0.5) * 40 * Math.min(1, t);
      label(ctx, '[ ' + this.who.toUpperCase() + ' JUMPSCARE ]',
        C.WIDTH / 2 + shake(), C.HEIGHT / 2 + shake(), 40 + t * 50, '#c33');
      if (t > 1.2) this.game.fsm.change('GAME_OVER');
    }
  };

  // ---------------- GAME_OVER ----------------
  NS.States.GAME_OVER = {
    render(ctx) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, C.WIDTH, C.HEIGHT);
      label(ctx, 'G A M E   O V E R', C.WIDTH / 2, 200, 44, '#dfe3df');
      label(ctx, 'night ' + this.game.night + ', ' + NS.HUD.hourLabel(this.game),
        C.WIDTH / 2, 256, 16, '#8a948e');
      label(ctx, 'R = retry night', C.WIDTH / 2, 340, 18, '#cfd6d2');
    },
    onKey(key) {
      if (key === 'r') {
        this.game.startNight(this.game.night);
        this.game.fsm.change('OFFICE');
      }
    }
  };

  // ---------------- VICTORY ----------------
  NS.States.VICTORY = {
    enter() { NS.playSound('victory_chime'); },
    render(ctx) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, C.WIDTH, C.HEIGHT);
      const k = Math.min(1, this.game.fsm.timeInState / 0.8);
      ctx.globalAlpha = k;
      label(ctx, '6:00 AM', C.WIDTH / 2, 210, 64, '#e8e8e0');
      label(ctx, 'NIGHT ' + this.game.night + ' COMPLETE', C.WIDTH / 2, 280, 20, '#8a948e');
      label(ctx, 'N = next night', C.WIDTH / 2, 360, 16, '#cfd6d2');
      ctx.globalAlpha = 1;
    },
    onKey(key) {
      if (key === 'n') {
        this.game.night = Math.min(this.game.night + 1, 6);
        this.game.startNight(this.game.night);
        this.game.fsm.change('OFFICE');
      }
    }
  };
})();
