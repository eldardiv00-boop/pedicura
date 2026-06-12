/* ============================================================
 * NIGHTSHIFT — fsm.js
 * Minimal finite state machine. Each state is a plain object:
 *   { enter(data), exit(), update(dt), render(ctx),
 *     onKey(key), onClick(x, y) }            — all optional.
 * The machine guarantees exit() -> enter() ordering and exposes
 * the active state name for debugging/HUD.
 * ============================================================ */
window.NS = window.NS || {};

NS.StateMachine = class {
  constructor(game) {
    this.game = game;       // shared game context (clock, power, ...)
    this.states = {};
    this.current = null;
    this.currentName = '';
    this.timeInState = 0;   // seconds since last change()
  }

  register(name, state) {
    state.game = this.game; // every state can reach the context
    this.states[name] = state;
    return this;
  }

  change(name, data) {
    if (!this.states[name]) throw new Error('Unknown state: ' + name);
    if (this.current && this.current.exit) this.current.exit();
    this.current = this.states[name];
    this.currentName = name;
    this.timeInState = 0;
    if (this.current.enter) this.current.enter(data);
  }

  update(dt) {
    this.timeInState += dt;
    if (this.current && this.current.update) this.current.update(dt);
  }

  render(ctx) {
    if (this.current && this.current.render) this.current.render(ctx);
  }

  onKey(key) {
    if (this.current && this.current.onKey) this.current.onKey(key);
  }

  onClick(x, y) {
    if (this.current && this.current.onClick) this.current.onClick(x, y);
  }
};
