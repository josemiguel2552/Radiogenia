/**
 * Radiology Defense: the simulation, with no React and no DOM in it.
 *
 * The world is a plain object that advances by `tick(dt)`. Keeping it out of
 * the component is what makes it testable — a wave can be run to completion
 * in a loop with no canvas, no animation frame and no browser — and it keeps
 * sixty frames a second of movement away from React's render path entirely.
 *
 * The metaphor is the department, not a battlefield. Patients arrive along
 * six corridors converging on the hospital; CT scanners placed beside them
 * image whoever passes. A patient who is fully imaged is a study done and
 * leaves; one who reaches the hospital unimaged is load the department has to
 * absorb. "Damage" is backlog, and what the scanners emit is radiation.
 *
 * Coordinates are fractions of the canvas, so the same world plays identically
 * on a phone and a desktop and nothing has to be re-tuned per screen.
 */

import {
  BUILD_HEAL,
  LEAK_LOAD,
  MAX_INTEGRITY,
  MAX_SCANNER_LEVEL,
  studyReward,
  waveSpec,
  type WaveSpec,
} from "@/lib/game-score";
import { buildLayout, levelSpec, HOSPITAL as CENTRE, type Layout, type Vec } from "./game-levels";

export type { Vec } from "./game-levels";
export { HOSPITAL } from "./game-levels";

/* ── Who arrives ─────────────────────────────────────────────────────── */

export type Species = "routine" | "urgent" | "paediatric" | "stretcher" | "critical";

export interface SpeciesSpec {
  radius: number;
  hpMul: number;
  speedMul: number;
  /** Backlog left behind if they arrive unimaged. */
  weight: number;
  /** Drawn lying down rather than upright. */
  lying: boolean;
  fill: string;
}

/**
 * The five kinds of patient.
 *
 * Deliberately study types and urgency rather than anything about the people
 * themselves: this sits inside a product radiologists use at work, and a game
 * that made a caricature of a patient would be indefensible there however
 * well it played. Each is a different silhouette as well as a different
 * colour, so what is coming reads before it arrives.
 */
export const SPECIES: Record<Species, SpeciesSpec> = {
  routine:    { radius: 0.0290, hpMul: 1.0,  speedMul: 1.0,  weight: 1.0, lying: false, fill: "#38bdf8" },
  urgent:     { radius: 0.0275, hpMul: 0.72, speedMul: 1.45, weight: 0.9, lying: false, fill: "#fb923c" },
  paediatric: { radius: 0.0225, hpMul: 0.55, speedMul: 1.70, weight: 0.7, lying: false, fill: "#34d399" },
  stretcher:  { radius: 0.0360, hpMul: 1.75, speedMul: 0.68, weight: 1.7, lying: true,  fill: "#fb7185" },
  critical:   { radius: 0.0320, hpMul: 2.30, speedMul: 0.55, weight: 2.1, lying: false, fill: "#a78bfa" },
};

export const SPECIES_KEYS = Object.keys(SPECIES) as Species[];

export interface Patient {
  id: number;
  species: Species;
  /** Which corridor they are walking. */
  route: number;
  /** Distance travelled along it, 0..1. */
  t: number;
  speed: number;
  /** Imaging still outstanding. At zero the study is done and they leave. */
  hp: number;
  maxHp: number;
  radius: number;
  weight: number;
  hitFlash: number;
  /** Per-patient jitter, so a queue does not march in lockstep. */
  phase: number;
  /** Counts up from 0 on arrival, for the fade-in. */
  age: number;
}

export interface Scanner {
  slot: number;
  level: number;
  cooldown: number;
  /** Smoothed aim, so the gantry swings to a patient instead of snapping. */
  angle: number;
  /** Counts down after an exposure, for the beam flash. */
  flash: number;
}

/** A single exposure: a fan of radiation from a gantry to a patient. */
export interface Beam {
  from: Vec;
  to: Vec;
  life: number;
}

/** A number that rises and fades: integrity gained or lost. */
export interface Floater {
  x: number;
  y: number;
  text: string;
  life: number;
  tone: "good" | "bad";
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  hue: string;
}

/** Scanner stats by level: reach in canvas fractions, dose, exposures/second. */
export const SCANNER_STATS = [
  { range: 0.18, damage: 5, rate: 1.3 },
  { range: 0.22, damage: 9, rate: 1.6 },
  { range: 0.26, damage: 15, rate: 2.0 },
];

export interface WorldEvents {
  /** A patient reached the hospital unimaged. */
  onLeak: (load: number) => void;
  /** Everyone in the wave is seen, and none are left to arrive. */
  onWaveCleared: (wave: number) => void;
  /** A study was completed. Scanners earn their keep. */
  onStudyDone: (credits: number) => void;
  /** Every wave of the floor is done. The next level is about to load. */
  onLevelCleared: (level: number) => void;
}

export class World {
  patients: Patient[] = [];
  scanners: Scanner[] = [];
  beams: Beam[] = [];
  particles: Particle[] = [];
  floaters: Floater[] = [];
  /** Seconds of camera shake left. What makes an arrival land physically. */
  shake = 0;
  /** Seconds the wave banner still shows. */
  banner = 0;
  /** Wall clock for idle animation: breathing, flowing corridors, the ring. */
  time = 0;
  integrity = MAX_INTEGRITY;
  /** Which floor is being defended. Each has its own map and palette. */
  level = 1;
  layout: Layout = buildLayout(levelSpec(1));
  /** Which wave of this floor, counting from one. */
  waveInLevel = 0;
  /** Waves cleared across the whole run, which is what the board ranks. */
  totalWaves = 0;
  /** Seconds the LEVEL banner shows, drawn larger than the wave one. */
  levelBanner = 0;
  spec: WaveSpec = waveSpec(1);
  /** Patients still to arrive in this wave. */
  pending = 0;
  spawnTimer = 0;
  /**
   * Whether the clock is running.
   *
   * False during preparation and while paused. The department exists and can
   * be rebuilt; nobody is walking. This is the whole point of the redesign:
   * a revision game that will not let you stop and think is a revision game
   * fighting the thing it is for.
   */
  active = false;
  private nextId = 1;
  private nextRoute = 0;
  private events: WorldEvents;

  constructor(events: WorldEvents) {
    this.events = events;
  }

  /** The wave number the HUD shows: where you are on this floor. */
  get wave(): number {
    return this.waveInLevel;
  }

  /**
   * Opens a floor: new map, new palette, a clean department.
   *
   * Scanners do NOT carry over — it is a different place, and rebuilding is
   * most of what makes arriving somewhere feel like arriving. Integrity is
   * restored in full, because a floor that began half-lost would be decided
   * before the first question.
   */
  startLevel(level: number) {
    this.level = Math.max(1, level);
    this.layout = buildLayout(levelSpec(this.level));
    this.patients = [];
    this.scanners = [];
    this.beams = [];
    this.particles = [];
    this.floaters = [];
    this.integrity = MAX_INTEGRITY;
    this.waveInLevel = 0;
    this.nextRoute = 0;
    this.levelBanner = 2.4;
    this.active = false;
    this.prepareWave(1);
  }

  /** Lines a wave up without starting it. The player opens the doors. */
  prepareWave(wave: number) {
    this.startWave(wave);
    this.active = false;
    // No banner yet: announcing a wave that has not started would be the
    // department shouting about something standing outside the door.
    this.banner = 0;
  }

  /** Opens the doors: the wave begins. */
  beginAssault() {
    this.active = true;
    this.banner = 1.4;
  }

  startWave(wave: number) {
    this.waveInLevel = wave;
    // The floor's own hardness rides on top of the wave curve, so wave 1 of
    // level 4 is already heavier than wave 1 of level 1.
    const base = waveSpec(wave);
    const k = this.layout.spec.hardness;
    this.spec = {
      wave,
      count: Math.round(base.count * k),
      hp: Math.round(base.hp * k),
      speed: Math.min(0.08, base.speed * (1 + (k - 1) * 0.5)),
      gap: Math.max(0.42, base.gap / (1 + (k - 1) * 0.35)),
    };
    this.pending = this.spec.count;
    this.spawnTimer = 0;
    this.banner = 1.8;
  }

  /** Position on a corridor of the current floor. */
  at(route: number, t: number): Vec {
    return this.layout.at(route, t);
  }

  /** A rising number at a point on the field. */
  float(point: Vec, text: string, tone: "good" | "bad") {
    this.floaters.push({ x: point.x, y: point.y, text, life: 1.1, tone });
  }

  /**
   * Installs a scanner, which relieves the department.
   *
   * Building heals: a scanner IS capacity, and capacity is exactly what the
   * hospital was short of. It also gives a player who is losing a way back
   * that is not "answer faster" — which, in a revision game, would only ever
   * mean "guess".
   */
  build(slot: number): boolean {
    if (slot < 0 || slot >= this.layout.slots.length) return false;
    if (this.scanners.some((s) => s.slot === slot)) return false;
    this.scanners.push({ slot, level: 1, cooldown: 0, angle: Math.PI / 2, flash: 0 });
    const before = this.integrity;
    this.integrity = Math.min(MAX_INTEGRITY, this.integrity + BUILD_HEAL);
    const gained = this.integrity - before;
    if (gained > 0) this.float(this.layout.slots[slot], `+${gained}%`, "good");
    return true;
  }

  upgrade(slot: number): boolean {
    const s = this.scanners.find((x) => x.slot === slot);
    if (!s || s.level >= MAX_SCANNER_LEVEL) return false;
    s.level += 1;
    return true;
  }

  scannerAt(slot: number): Scanner | undefined {
    return this.scanners.find((s) => s.slot === slot);
  }

  damageBase(amount: number) {
    this.integrity = Math.max(0, this.integrity - amount);
    this.shake = Math.min(0.5, this.shake + 0.18 + amount * 0.006);
  }

  private spawn() {
    // Arrivals are dealt round-robin across the corridors with a nudge of
    // randomness, so no route is quiet for a whole wave and the player cannot
    // simply stack one wedge and forget the rest.
    const routes = this.layout.paths.length;
    const route = (this.nextRoute + (Math.random() < 0.3 ? 1 : 0)) % routes;
    this.nextRoute = (this.nextRoute + 1) % routes;

    // Only the kinds this floor sees, and the heavier ones only once the
    // wave has had time to establish itself.
    const allowed = this.layout.spec.species;
    const pool = allowed.filter((sp) => {
      if (sp === "critical") return this.waveInLevel >= 3;
      if (sp === "stretcher") return this.waveInLevel >= 2;
      return true;
    });
    const weights: Record<Species, number> = {
      routine: 5, paediatric: 2, urgent: 3, stretcher: 2, critical: 1.4,
    };
    const total = pool.reduce((n, sp) => n + weights[sp], 0);
    let roll = Math.random() * total;
    let species: Species = pool[0] ?? "routine";
    for (const sp of pool) {
      roll -= weights[sp];
      if (roll <= 0) { species = sp; break; }
    }

    const k = SPECIES[species];
    const hp = Math.max(1, Math.round(this.spec.hp * k.hpMul));
    this.patients.push({
      id: this.nextId++,
      species,
      route,
      t: 0,
      speed: this.spec.speed * k.speedMul,
      hp,
      maxHp: hp,
      radius: k.radius,
      weight: k.weight,
      hitFlash: 0,
      phase: Math.random() * Math.PI * 2,
      age: 0,
    });
  }

  tick(dt: number) {
    // Idle animation keeps running whatever the state, so a paused board is
    // still a living place rather than a freeze-frame.
    this.time += dt;
    this.shake = Math.max(0, this.shake - dt * 1.8);
    this.banner = Math.max(0, this.banner - dt);
    this.levelBanner = Math.max(0, this.levelBanner - dt);
    this.decay(dt);
    if (!this.active) return;

    if (this.pending > 0) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawn();
        this.pending -= 1;
        this.spawnTimer = this.spec.gap;
      }
    }

    for (const p of this.patients) {
      p.t += p.speed * dt;
      p.age += dt;
      p.hitFlash = Math.max(0, p.hitFlash - dt * 4);
    }

    const arrived = this.patients.filter((p) => p.t >= 1);
    for (const p of arrived) {
      const load = Math.round(LEAK_LOAD * p.weight);
      this.damageBase(load);
      this.burst(CENTRE, "#f43f5e", 16);
      this.float({ x: CENTRE.x, y: CENTRE.y - 0.07 }, `-${load}`, "bad");
      this.events.onLeak(load);
    }
    if (arrived.length) this.patients = this.patients.filter((p) => p.t < 1);

    for (const scanner of this.scanners) {
      scanner.cooldown -= dt;
      scanner.flash = Math.max(0, scanner.flash - dt * 6);
      const stats = SCANNER_STATS[scanner.level - 1];
      const look = this.pick(scanner, stats.range);
      // The gantry tracks its patient between exposures, which is most of
      // what makes it read as a machine rather than a decal.
      if (look) {
        const to = this.at(look.route, look.t);
        const want = Math.atan2(to.y - this.layout.slots[scanner.slot].y, to.x - this.layout.slots[scanner.slot].x);
        let d = want - scanner.angle;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        scanner.angle += d * Math.min(1, dt * 9);
      }
      if (scanner.cooldown > 0 || !look) continue;
      scanner.cooldown = 1 / stats.rate;
      scanner.flash = 1;
      look.hp -= stats.damage;
      look.hitFlash = 1;
      const to = this.at(look.route, look.t);
      this.beams.push({ from: this.layout.slots[scanner.slot], to, life: 0.16 });
      this.burst(to, "#e0f2fe", 3, 0.05);
      if (look.hp <= 0) {
        // Study complete: the patient has been seen and leaves, and the
        // report is worth something.
        const paid = studyReward(look.weight);
        this.burst(to, SPECIES[look.species].fill, 14);
        this.float(to, `+${paid}`, "good");
        this.events.onStudyDone(paid);
        this.patients = this.patients.filter((p) => p.id !== look.id);
      }
    }

    if (this.pending === 0 && this.patients.length === 0 && this.waveInLevel > 0) {
      this.totalWaves += 1;
      // Back to preparation: nothing moves again until the player says so.
      this.active = false;
      this.events.onWaveCleared(this.totalWaves);
      if (this.waveInLevel >= this.layout.spec.waves) this.events.onLevelCleared(this.level);
    }
  }

  /** Effects fade whether or not the clock is running, so pausing does not
   *  leave a burst of particles hanging in the air. */
  private decay(dt: number) {
    for (const b of this.beams) b.life -= dt;
    if (this.beams.some((b) => b.life <= 0)) this.beams = this.beams.filter((b) => b.life > 0);

    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 0.25 * dt;
      p.vx *= 1 - dt * 1.2;
      p.life -= dt;
    }
    if (this.particles.some((p) => p.life <= 0)) this.particles = this.particles.filter((p) => p.life > 0);

    for (const f of this.floaters) {
      f.y -= dt * 0.055;
      f.life -= dt;
    }
    if (this.floaters.some((f) => f.life <= 0)) this.floaters = this.floaters.filter((f) => f.life > 0);
  }

  /** The patient furthest along that a scanner can reach — the one about to
   *  arrive, not merely the nearest. */
  private pick(scanner: Scanner, range: number): Patient | null {
    const from = this.layout.slots[scanner.slot];
    let best: Patient | null = null;
    for (const p of this.patients) {
      const to = this.at(p.route, p.t);
      if (Math.hypot(to.x - from.x, to.y - from.y) > range) continue;
      if (!best || p.t > best.t) best = p;
    }
    return best;
  }

  burst(point: Vec, colour: string, count = 10, speed = 0.12) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = speed * (0.4 + Math.random());
      const life = 0.35 + Math.random() * 0.35;
      this.particles.push({
        x: point.x, y: point.y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life, maxLife: life,
        size: 1.6 + Math.random() * 2.2,
        hue: colour,
      });
    }
  }

  /** The slot nearest a tap, if the tap was close enough to mean it. */
  slotNear(x: number, y: number, aspect: number): number | null {
    let best: number | null = null;
    let bestD = 0.075;
    this.layout.slots.forEach((s, i) => {
      const d = Math.hypot((s.x - x) * aspect, s.y - y);
      if (d < bestD) { bestD = d; best = i; }
    });
    return best;
  }
}
