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
  waveSpec,
  type WaveSpec,
} from "@/lib/game-score";

export interface Vec { x: number; y: number }

/** The hospital, and where every corridor ends. */
export const HOSPITAL: Vec = { x: 0.5, y: 0.47 };

/** How many corridors converge on it. */
export const ROUTES = 6;

/** Spread wider than tall, because the field is portrait: a true circle
 *  would leave the sides empty and crowd the top and bottom. */
const RX = 0.62;
const RY = 0.64;

const at = (r: number, a: number): Vec => ({
  x: HOSPITAL.x + Math.cos(a) * r * RX,
  y: HOSPITAL.y + Math.sin(a) * r * RY,
});

/**
 * One corridor, from off-screen to the hospital door.
 *
 * Built rather than hand-typed so all six are the same shape rotated, which
 * is what makes them read as one department instead of six unrelated
 * drawings. Each has a dog-leg part of the way in: a straight radial run
 * would let a single scanner by the door cover everything, and then there
 * would be nothing to decide.
 */
function makeRoute(i: number): Vec[] {
  const a0 = -Math.PI / 2 + (i * Math.PI * 2) / ROUTES;
  const a1 = a0 + 0.44;
  // The entry sits just outside the frame, not far outside it: at a wider
  // radius a third of the walk happened off-canvas, which is a third of the
  // time a scanner could have been working on someone the player cannot see.
  return [at(1.02, a0), at(0.74, a0), at(0.44, a1), at(0.16, a1), HOSPITAL];
}

export const PATHS: Vec[][] = Array.from({ length: ROUTES }, (_, i) => makeRoute(i));

/**
 * Where a scanner may be installed.
 *
 * Two rings of six, set between the corridors rather than on them, so each
 * sits in a wedge and reaches the routes either side of it. The inner ring
 * covers the convergence — more traffic, less time to act; the outer ring
 * catches arrivals early. That trade is the only strategy the game asks for,
 * and it exists only because the rings differ.
 */
export const SLOTS: Vec[] = Array.from({ length: ROUTES * 2 }, (_, k) => {
  const ring = k % 2;
  const i = Math.floor(k / 2);
  // NOT the midpoint between two corridors, which is where they would
  // obviously go and where half of them would have sat on a lane: the
  // dog-leg swings each corridor a quarter-turn of the wedge toward its
  // neighbour, so the clear ground is further round than it looks. These two
  // offsets were measured against the geometry, not guessed.
  const offset = ring === 0 ? 0.977 : 0.663;
  const a = -Math.PI / 2 + (i * Math.PI * 2) / ROUTES + offset;
  return at(ring === 0 ? 0.36 : 0.74, a);
});

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

/* ── Walking the corridors ───────────────────────────────────────────── */

/**
 * Cumulative length along each corridor, so t is distance and not segment
 * index. Giving every segment an equal slice of t makes a patient sprint
 * down a short leg and crawl along a long one; nobody reads that as design.
 */
const GEOM = PATHS.map((path) => {
  const legs = path.slice(1).map((p, i) => Math.hypot(p.x - path[i].x, p.y - path[i].y));
  const total = legs.reduce((a, b) => a + b, 0);
  const cum = legs.reduce<number[]>((acc, len) => [...acc, acc[acc.length - 1] + len], [0]);
  return { legs, total, cum };
});

/** Position on corridor `route` at travel fraction t, along its real length. */
export function pointAt(route: number, t: number): Vec {
  const idx = ((route % ROUTES) + ROUTES) % ROUTES;
  const path = PATHS[idx];
  const g = GEOM[idx];
  const want = Math.max(0, Math.min(1, t)) * g.total;
  let i = 0;
  while (i < g.legs.length - 1 && g.cum[i + 1] < want) i++;
  const local = g.legs[i] > 0 ? (want - g.cum[i]) / g.legs[i] : 0;
  const a = path[i];
  const b = path[i + 1];
  return { x: a.x + (b.x - a.x) * local, y: a.y + (b.y - a.y) * local };
}

/** The length of one corridor, for tuning and for tests. */
export const ROUTE_LENGTH = GEOM[0].total;

export interface WorldEvents {
  /** A patient reached the hospital unimaged. */
  onLeak: (load: number) => void;
  /** Everyone in the wave is seen, and none are left to arrive. */
  onWaveCleared: (wave: number) => void;
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
  wave = 0;
  spec: WaveSpec = waveSpec(1);
  /** Patients still to arrive in this wave. */
  pending = 0;
  spawnTimer = 0;
  /** Seconds of calm before the next wave. */
  breather = 0;
  private nextId = 1;
  private nextRoute = 0;
  private events: WorldEvents;

  constructor(events: WorldEvents) {
    this.events = events;
  }

  startWave(wave: number) {
    this.wave = wave;
    this.spec = waveSpec(wave);
    this.pending = this.spec.count;
    this.spawnTimer = 0;
    this.breather = 0;
    this.banner = 1.8;
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
    if (slot < 0 || slot >= SLOTS.length) return false;
    if (this.scanners.some((s) => s.slot === slot)) return false;
    this.scanners.push({ slot, level: 1, cooldown: 0, angle: Math.PI / 2, flash: 0 });
    const before = this.integrity;
    this.integrity = Math.min(MAX_INTEGRITY, this.integrity + BUILD_HEAL);
    const gained = this.integrity - before;
    if (gained > 0) this.float(SLOTS[slot], `+${gained}%`, "good");
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
    const route = (this.nextRoute + (Math.random() < 0.3 ? 1 : 0)) % ROUTES;
    this.nextRoute = (this.nextRoute + 1) % ROUTES;

    const roll = Math.random();
    let species: Species = "routine";
    if (this.wave >= 5 && roll > 0.86) species = "critical";
    else if (this.wave >= 3 && roll > 0.68) species = "stretcher";
    else if (this.wave >= 2 && roll > 0.50) species = "urgent";
    else if (roll > 0.82) species = "paediatric";

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
    this.time += dt;
    this.shake = Math.max(0, this.shake - dt * 1.8);
    this.banner = Math.max(0, this.banner - dt);

    if (this.breather > 0) {
      this.breather = Math.max(0, this.breather - dt);
    } else if (this.pending > 0) {
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
      this.burst(HOSPITAL, "#f43f5e", 16);
      this.float({ x: HOSPITAL.x, y: HOSPITAL.y - 0.07 }, `-${load}`, "bad");
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
        const to = pointAt(look.route, look.t);
        const want = Math.atan2(to.y - SLOTS[scanner.slot].y, to.x - SLOTS[scanner.slot].x);
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
      const to = pointAt(look.route, look.t);
      this.beams.push({ from: SLOTS[scanner.slot], to, life: 0.16 });
      this.burst(to, "#e0f2fe", 3, 0.05);
      if (look.hp <= 0) {
        // Study complete: the patient has been seen and leaves.
        this.burst(to, SPECIES[look.species].fill, 14);
        this.patients = this.patients.filter((p) => p.id !== look.id);
      }
    }

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

    if (this.pending === 0 && this.patients.length === 0 && this.breather === 0 && this.wave > 0) {
      this.events.onWaveCleared(this.wave);
      this.breather = 3.5;
    }
  }

  /** The patient furthest along that a scanner can reach — the one about to
   *  arrive, not merely the nearest. */
  private pick(scanner: Scanner, range: number): Patient | null {
    const from = SLOTS[scanner.slot];
    let best: Patient | null = null;
    for (const p of this.patients) {
      const to = pointAt(p.route, p.t);
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
    SLOTS.forEach((s, i) => {
      const d = Math.hypot((s.x - x) * aspect, s.y - y);
      if (d < bestD) { bestD = d; best = i; }
    });
    return best;
  }
}
