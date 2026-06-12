/* ============================================================
 * NIGHTSHIFT — main.js
 * Entry point: canvas init, the shared game context (clock +
 * power grid), input wiring, and the requestAnimationFrame loop.
 *
 * The loop only advances the simulation while the player is in
 * a "live" state (OFFICE / CAMERAS); menus and death screens
 * freeze the night clock automatically.
 * ============================================================ */
(function () {
  const C = NS.CONFIG;

  // ---- canvas / window init ----
  const canvas = document.getElementById('game');
  canvas.width = C.WIDTH;
  canvas.height = C.HEIGHT;
  const ctx = canvas.getContext('2d');

  // ---- the shared game context ----
  const game = {
    night: C.STARTING_NIGHT,
    fsm: null,

    // -- survival clock: 12 AM -> 6 AM --
    clock: {
      tSec: 0,
      hour() { return Math.floor(this.tSec / C.HOUR_SECONDS); },
      done() { return this.hour() >= C.HOURS_PER_NIGHT; }
    },

    // -- power grid --
    power: {
      value: C.POWER.START,
      // Device count drives the exponential drain. Phase 1 has
      // only the monitor; Phase 2 adds doors, lights here.
      devices() {
        return game.fsm.currentName === 'CAMERAS' ? 1 : 0;
      },
      drainRate() {
        const scale = C.POWER.NIGHT_SCALE[game.night] || 1;
        return C.POWER.PASSIVE_DRAIN *
               Math.pow(C.POWER.DEVICE_MULT, this.devices()) * scale;
      }
    },

    // reset everything for a fresh night
    startNight(n) {
      this.night = n;
      this.clock.tSec = 0;
      this.power.value = C.POWER.START;
    },

    // is the night simulation running right now?
    live() {
      const s = this.fsm.currentName;
      return s === 'OFFICE' || s === 'CAMERAS';
    }
  };

  // ---- state machine ----
  game.fsm = new NS.StateMachine(game);
  game.fsm
    .register('TITLE', NS.States.TITLE)
    .register('OFFICE', NS.States.OFFICE)
    .register('CAMERAS', NS.States.CAMERAS)
    .register('JUMPSCARE', NS.States.JUMPSCARE)
    .register('GAME_OVER', NS.States.GAME_OVER)
    .register('VICTORY', NS.States.VICTORY);
  game.fsm.change('TITLE');

  // ---- input wiring ----
  window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    if (key === ' ') e.preventDefault();

    // Phase-1 debug shortcuts for previewing terminal states.
    if (C.DEBUG_KEYS && game.live()) {
      if (key === 'j') return game.fsm.change('JUMPSCARE', { who: 'botA' });
      if (key === 'g') return game.fsm.change('GAME_OVER');
      if (key === 'v') return game.fsm.change('VICTORY');
    }
    game.fsm.onKey(key);
  });

  canvas.addEventListener('mousedown', (e) => {
    const r = canvas.getBoundingClientRect();
    game.fsm.onClick(
      (e.clientX - r.left) * (C.WIDTH / r.width),
      (e.clientY - r.top) * (C.HEIGHT / r.height)
    );
  });

  // ---- simulation tick (only while live) ----
  function simulate(dt) {
    // clock
    game.clock.tSec += dt;
    if (game.clock.done()) {
      game.fsm.change('VICTORY');
      return;
    }
    // power
    game.power.value -= game.power.drainRate() * dt;
    if (game.power.value <= 0) {
      game.power.value = 0;
      // Phase 4 will insert the blackout sequence (dark office,
      // music-box grace period, then a scare). For Phase 1 we
      // jump straight to the scare so the failure path is testable.
      NS.playSound('power_down');
      game.fsm.change('JUMPSCARE', { who: 'botA' });
    }
  }

  // ---- main loop ----
  let last = performance.now();
  function frame(now) {
    // clamp dt so a backgrounded tab can't fast-forward the night
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    if (game.live()) simulate(dt);
    game.fsm.update(dt);
    game.fsm.render(ctx);

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
