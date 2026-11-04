/**
 * Radiology Defense: the simulation, with no React and no DOM in it.
 *
 * The battlefield is a plain object that advances by `tick(dt)` and draws
 * itself onto a 2D context. Keeping it out of the component is what makes it
 * testable — a wave can be run to completion in a loop with no canvas, no
 * animation frame and no browser — and it keeps sixty frames a second of
 * enemy movement away from React's render path entirely.
 *
 * Coordinates are fractions of the canvas, so the same world plays identically
 * on a phone and a desktop and nothing has to be re-tuned per screen.
 */

import {
  LEAK_DAMAGE,
  MAX_INTEGRITY,
  MAX_TURRET_LEVEL,
  waveSpec,
  type WaveSpec,
} from "@/lib/game-score";

export interface Vec { x: number; y: number }

/** The lane enemies walk, in canvas fractions. The bends exist to give
 *  turrets something to cover: a straight line makes every slot identical. */
export const PATH: Vec[] = [
  { x: 0.5, y: -0.06 },
  { x: 0.5, y: 0.14 },
  { x: 0.18, y: 0.26 },
  { x: 0.18, y: 0.46 },
  { x: 0.82, y: 0.58 },
  { x: 0.82, y: 0.72 },
  { x: 0.5, y: 0.82 },
  { x: 0.5, y: 0.87 },
];

/** Where a turret may be built. Each one covers a different bend. */
export const SLOTS: Vec[] = [
  { x: 0.80, y: 0.17 },
  { x: 0.42, y: 0.36 },
  { x: 0.80, y: 0.40 },
  { x: 0.20, y: 0.63 },
  { x: 0.56, y: 0.69 },
  { x: 0.22, y: 0.86 },
];

export type EnemyKind = "nodule" | "mass" | "calcified";

export interface Enemy {
  id: number;
  kind: EnemyKind;
  /** Distance travelled along the path, 0..1. */
  t: number;
  speed: number;
  hp: number;
  maxHp: number;
  radius: number;
  /** Damage dealt to the base if it arrives. */
  weight: number;
  hitFlash: number;
  /** Per-enemy radial offsets, so no two are the same blob. A nodule is
   *  spiculated, a mass lobulated, a calcified one nearly round — the shape
   *  itself says which is which, before any colour does. */
  shape: number[];
  /** Phase offset so the breathing of neighbours is not in lockstep. */
  phase: number;
  /** Counts up from 0 on spawn, for the arrival pop. */
  age: number;
}

export interface Turret {
  slot: number;
  level: number;
  cooldown: number;
  /** Smoothed aim, so the head swings to a target instead of snapping. */
  angle: number;
  /** Counts down after firing, for the muzzle flash and the recoil. */
  flash: number;
}

export interface Shot {
  from: Vec;
  to: Vec;
  life: number;
}

/** A number that rises and fades: credits earned, integrity lost. */
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

/** Turret stats by level: reach in canvas fractions, damage, shots per second. */
export const TURRET_STATS = [
  { range: 0.20, damage: 5, rate: 1.3 },
  { range: 0.24, damage: 9, rate: 1.6 },
  { range: 0.28, damage: 15, rate: 2.0 },
];

const KINDS: Record<EnemyKind, { radius: number; hpMul: number; speedMul: number; weight: number; fill: string; ring: string }> = {
  nodule:    { radius: 0.022, hpMul: 0.75, speedMul: 1.35, weight: 0.8, fill: "#38bdf8", ring: "#0ea5e9" },
  mass:      { radius: 0.034, hpMul: 1.6,  speedMul: 0.75, weight: 1.6, fill: "#fb7185", ring: "#e11d48" },
  calcified: { radius: 0.027, hpMul: 1.15, speedMul: 1.0,  weight: 1.1, fill: "#a78bfa", ring: "#7c3aed" },
};

/**
 * Radial offsets that give each enemy its outline.
 *
 * A nodule gets fine spicules, a mass a few broad lobes, a calcified one an
 * almost round border. Drawn rather than labelled: the silhouette tells the
 * player what is coming before any colour does, which is how a simple game
 * stops looking like coloured circles.
 */
function makeShape(kind: EnemyKind): number[] {
  const N = 18;
  const out: number[] = [];
  const seed = Math.random() * Math.PI * 2;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    if (kind === "nodule") {
      out.push(0.1 * Math.sin(a * 7 + seed) + 0.05 * Math.sin(a * 3 + seed * 2));
    } else if (kind === "mass") {
      out.push(0.16 * Math.sin(a * 3 + seed) + 0.07 * Math.sin(a * 5 + seed));
    } else {
      out.push(0.05 * Math.sin(a * 4 + seed));
    }
  }
  return out;
}

/** Position along the path at travel fraction t. */
export function pointAt(t: number): Vec {
  const clamped = Math.max(0, Math.min(1, t));
  const span = 1 / (PATH.length - 1);
  const i = Math.min(PATH.length - 2, Math.floor(clamped / span));
  const local = (clamped - i * span) / span;
  const a = PATH[i];
  const b = PATH[i + 1];
  return { x: a.x + (b.x - a.x) * local, y: a.y + (b.y - a.y) * local };
}

export interface WorldEvents {
  /** An enemy reached the base. */
  onLeak: (damage: number) => void;
  /** Every enemy of the wave is dead and none are left to spawn. */
  onWaveCleared: (wave: number) => void;
}

export class World {
  enemies: Enemy[] = [];
  turrets: Turret[] = [];
  shots: Shot[] = [];
  particles: Particle[] = [];
  floaters: Floater[] = [];
  /** Seconds of camera shake left. What makes a hit land physically. */
  shake = 0;
  /** Seconds the wave banner still shows. */
  banner = 0;
  /** Wall clock for idle animation: breathing, flowing lane, rotating ring. */
  time = 0;
  integrity = MAX_INTEGRITY;
  wave = 0;
  spec: WaveSpec = waveSpec(1);
  /** Enemies still to spawn in this wave. */
  pending = 0;
  spawnTimer = 0;
  /** Seconds of calm before the next wave. */
  breather = 0;
  private nextId = 1;
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
  float(at: Vec, text: string, tone: "good" | "bad") {
    this.floaters.push({ x: at.x, y: at.y, text, life: 1.1, tone });
  }

  build(slot: number): boolean {
    if (this.turrets.some((t) => t.slot === slot)) return false;
    this.turrets.push({ slot, level: 1, cooldown: 0, angle: Math.PI / 2, flash: 0 });
    return true;
  }

  upgrade(slot: number): boolean {
    const t = this.turrets.find((x) => x.slot === slot);
    if (!t || t.level >= MAX_TURRET_LEVEL) return false;
    t.level += 1;
    return true;
  }

  turretAt(slot: number): Turret | undefined {
    return this.turrets.find((t) => t.slot === slot);
  }

  damageBase(amount: number) {
    this.integrity = Math.max(0, this.integrity - amount);
    this.shake = Math.min(0.5, this.shake + 0.18 + amount * 0.006);
  }

  private spawn() {
    // The mix shifts with the wave: early waves are soft nodules, later ones
    // bring masses that a single level-1 turret cannot stop in time.
    const roll = Math.random();
    const kind: EnemyKind =
      this.wave >= 3 && roll > 0.72 ? "mass" : this.wave >= 2 && roll > 0.45 ? "calcified" : "nodule";
    const k = KINDS[kind];
    const hp = Math.round(this.spec.hp * k.hpMul);
    this.enemies.push({
      id: this.nextId++,
      kind,
      t: 0,
      speed: this.spec.speed * k.speedMul,
      hp,
      maxHp: hp,
      radius: k.radius,
      weight: k.weight,
      hitFlash: 0,
      shape: makeShape(kind),
      phase: Math.random() * Math.PI * 2,
      age: 0,
    });
  }

  /** Advances the world. Returns true while the wave is still running. */
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

    for (const e of this.enemies) {
      e.t += e.speed * dt;
      e.age += dt;
      e.hitFlash = Math.max(0, e.hitFlash - dt * 4);
    }

    // Arrivals damage the base and are removed.
    const arrived = this.enemies.filter((e) => e.t >= 1);
    for (const e of arrived) {
      const hurt = Math.round(LEAK_DAMAGE * e.weight);
      this.damageBase(hurt);
      this.burst(pointAt(1), "#f43f5e", 16);
      this.float(pointAt(0.97), `-${hurt}`, "bad");
      this.events.onLeak(hurt);
    }
    if (arrived.length) this.enemies = this.enemies.filter((e) => e.t < 1);

    // Turrets fire at the enemy furthest along that is within reach — the one
    // about to cost integrity, not the one that is merely closest.
    for (const turret of this.turrets) {
      turret.cooldown -= dt;
      turret.flash = Math.max(0, turret.flash - dt * 6);
      const stats = TURRET_STATS[turret.level - 1];
      // The head tracks its target even between shots, which is most of what
      // makes a turret read as a machine rather than a decal.
      const look = this.pick(turret, stats.range);
      if (look) {
        const p = pointAt(look.t);
        const want = Math.atan2(p.y - SLOTS[turret.slot].y, p.x - SLOTS[turret.slot].x);
        let d = want - turret.angle;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        turret.angle += d * Math.min(1, dt * 9);
      }
      if (turret.cooldown > 0) continue;
      const from = SLOTS[turret.slot];
      const target = look;
      if (!target) continue;
      turret.cooldown = 1 / stats.rate;
      turret.flash = 1;
      target.hp -= stats.damage;
      target.hitFlash = 1;
      const to = pointAt(target.t);
      this.shots.push({ from, to, life: 0.14 });
      this.burst(to, "#e0e7ff", 3, 0.06);
      if (target.hp <= 0) {
        this.burst(to, KINDS[target.kind].fill, 14);
        this.enemies = this.enemies.filter((e) => e.id !== target.id);
      }
    }

    for (const s of this.shots) s.life -= dt;
    if (this.shots.some((s) => s.life <= 0)) this.shots = this.shots.filter((s) => s.life > 0);

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

    if (this.pending === 0 && this.enemies.length === 0 && this.breather === 0 && this.wave > 0) {
      this.events.onWaveCleared(this.wave);
      this.breather = 3.5;
    }
  }

  /** The enemy furthest along that a turret can reach — the one about to
   *  cost integrity, not merely the closest. */
  private pick(turret: Turret, range: number): Enemy | null {
    const from = SLOTS[turret.slot];
    let best: Enemy | null = null;
    for (const e of this.enemies) {
      const p = pointAt(e.t);
      if (Math.hypot(p.x - from.x, p.y - from.y) > range) continue;
      if (!best || e.t > best.t) best = e;
    }
    return best;
  }

  burst(at: Vec, colour: string, count = 10, speed = 0.12) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = speed * (0.4 + Math.random());
      const life = 0.35 + Math.random() * 0.35;
      this.particles.push({
        x: at.x, y: at.y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life, maxLife: life,
        size: 1.6 + Math.random() * 2.2,
        hue: colour,
      });
    }
  }

  /** The slot nearest a click, if the click was close enough to mean it. */
  slotNear(x: number, y: number, aspect: number): number | null {
    let best: number | null = null;
    let bestD = 0.09;
    SLOTS.forEach((s, i) => {
      const d = Math.hypot((s.x - x) * aspect, s.y - y);
      if (d < bestD) { bestD = d; best = i; }
    });
    return best;
  }
}
