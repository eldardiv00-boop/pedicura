/* ============================================================
 * NIGHTSHIFT — assets.js
 * Placeholder registry for every sprite and audio cue the
 * finished game needs. Later phases swap nulls for real assets;
 * game code only ever references these keys, so dropping in art
 * never touches logic.
 * ============================================================ */
window.NS = window.NS || {};

// ---- Sprite placeholders -----------------------------------
// load with: NS.loadSprite('office_base', 'assets/office.png')
NS.SPRITES = {
  // office layer stack
  office_base: null,
  office_door_left_open: null,   office_door_left_closed: null,
  office_door_right_open: null,  office_door_right_closed: null,
  office_light_left_on: null,    office_light_right_on: null,

  // one frame set per camera feed (empty room)
  cam_stage: null, cam_dining: null, cam_den: null,
  cam_whall: null, cam_ehall: null,

  // animatronic overlays: per bot, per location it can appear
  botA_stage: null, botA_dining: null, botA_whall: null, botA_door: null,
  botB_stage: null, botB_dining: null, botB_ehall: null, botB_door: null,
  botC_den_stage1: null, botC_den_stage2: null, botC_sprint: null,

  // jumpscare frame strips
  scare_botA: null, scare_botB: null, scare_botC: null,

  // screens
  ui_static: null, ui_map: null, screen_gameover: null, screen_victory: null
};

NS.loadSprite = function (key, url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => { NS.SPRITES[key] = img; resolve(img); };
    img.onerror = reject;
    img.src = url;
  });
};

// ---- Audio hooks -------------------------------------------
// Every game event funnels through NS.playSound(hook). Phase 5
// maps hooks to real (or synthesized) sounds; for now we log,
// so you can watch the event stream while testing.
NS.AUDIO_HOOKS = [
  'ambient_office', 'fan_loop',
  'door_left_close', 'door_left_open', 'door_right_close', 'door_right_open',
  'light_on', 'light_off', 'light_buzz_loop',
  'camera_open', 'camera_close', 'camera_switch',
  'footsteps_far', 'footsteps_near', 'breath_at_door',
  'knock_retreat', 'sprint_C', 'door_bang_blocked',
  'jumpscare_botA', 'jumpscare_botB', 'jumpscare_botC',
  'power_down', 'blackout_steps', 'victory_chime'
];

NS.playSound = function (hook) {
  // Phase 5 replaces this body with the real audio engine.
  if (NS.CONFIG.DEBUG_KEYS) console.log('[audio hook]', hook);
};

NS.stopSound = function (hook) {
  if (NS.CONFIG.DEBUG_KEYS) console.log('[audio stop]', hook);
};
