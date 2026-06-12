/* ============================================================
 * NIGHTSHIFT — config.js
 * Every tunable number in the game lives here. Later phases
 * (office, cameras, AI) read from this file — never hardcode.
 * ============================================================ */
window.NS = window.NS || {};

NS.CONFIG = {

  // ---- Canvas / window ----
  WIDTH: 960,
  HEIGHT: 540,

  // ---- Survival clock ----
  // One in-game hour lasts this many real seconds (FNAF1 ≈ 89s).
  HOUR_SECONDS: 60,
  HOURS_PER_NIGHT: 6,          // 12 AM -> 6 AM
  STARTING_NIGHT: 1,

  // ---- Power grid ----
  POWER: {
    START: 100,                // percent
    // Passive drain in %/second with zero devices active.
    PASSIVE_DRAIN: 0.083,      // ~30% over a 6-minute night
    // Each active device (door, light, monitor) multiplies the
    // drain rate by this factor: drain = PASSIVE * MULT^devices.
    // Set to 1 + x for gentler curves; >1 keeps it exponential.
    DEVICE_MULT: 1.7,
    // Per-night drain scaling (index = night). Night 5 is tight.
    NIGHT_SCALE: [0, 1.0, 1.06, 1.12, 1.2, 1.3, 1.38]
  },

  // ---- Camera definitions (Phase 3 fills in renderers) ----
  // The sprinter (Animatronic C) nests in 'den'; ignoring that
  // feed is what lets it advance.
  CAMERAS: [
    { id: 'stage',  label: 'CAM 1 — STAGE' },
    { id: 'dining', label: 'CAM 2 — DINING AREA' },
    { id: 'den',    label: 'CAM 3 — THE DEN' },
    { id: 'whall',  label: 'CAM 4 — WEST HALL' },
    { id: 'ehall',  label: 'CAM 5 — EAST HALL' }
  ],

  // ---- Animatronic AI (Phase 4 consumes this) ----
  // aggression[night] is an integer 0..20. Every moveInterval
  // seconds the bot rolls rand(0..19); roll < aggression = move.
  ANIMATRONICS: {
    botA: {                          // sequential stalker -> LEFT door
      style: 'sequential',
      door: 'left',
      moveInterval: 4.9,
      path: ['stage', 'dining', 'whall'],   // then: left door
      aggression: [0, 2, 4, 6, 8, 10, 14]
    },
    botB: {                          // fast skipper -> RIGHT door
      style: 'skipper',
      door: 'right',
      moveInterval: 3.6,             // faster ticks
      skipChance: 0.35,              // may jump 2 nodes at once
      path: ['stage', 'dining', 'ehall'],   // then: right door
      aggression: [0, 1, 3, 5, 7, 9, 13]
    },
    botC: {                          // camera-pressure sprinter
      style: 'sprinter',
      door: 'left',
      homeCam: 'den',
      moveInterval: 5.1,
      stages: 3,                     // stage 3 = sprint!
      sprintTravelTime: 2.0,         // seconds down the hall
      sprintPowerPenalty: [1, 5],    // % lost when blocked (min,max)
      aggression: [0, 0, 2, 4, 6, 8, 12]
    }
  },

  // Seconds a bot waits at an OPEN door before the jumpscare.
  // Shrinks slightly per night; clamped at min.
  KILL_WINDOW: { BASE: 4.8, PER_NIGHT: 0.35, MIN: 2.4 },

  // Hour-based aggression bumps (classic difficulty ramp).
  HOURLY_AGGRO_BUMP: [2, 4],     // +1 at 2 AM, +1 more at 4 AM

  // ---- Debug (Phase 1 only — strip before release) ----
  DEBUG_KEYS: true
};
