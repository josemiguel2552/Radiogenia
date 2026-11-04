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
  { x: 0.82, y: 0.74 },
  { x: 0.5, y: 0.85 },
  { x: 0.5, y: 0.95 },
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
}

export interface Turret {
  slot: number;
  level: number;
  cooldown: number;
}

export interface Shot {
  from: Vec;
  to: Vec;
  life: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
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
  }

  build(slot: number): boolean {
    if (this.turrets.some((t) => t.slot === slot)) return false;
    this.turrets.push({ slot, level: 1, cooldown: 0 });
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
    });
  }

  /** Advances the world. Returns true while the wave is still running. */
  tick(dt: number) {
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
      e.hitFlash = Math.max(0, e.hitFlash - dt * 4);
    }

    // Arrivals damage the base and are removed.
    const arrived = this.enemies.filter((e) => e.t >= 1);
    for (const e of arrived) {
      this.damageBase(Math.round(LEAK_DAMAGE * e.weight));
      this.burst(pointAt(1), "#f43f5e");
      this.events.onLeak(Math.round(LEAK_DAMAGE * e.weight));
    }
    if (arrived.length) this.enemies = this.enemies.filter((e) => e.t < 1);

    // Turrets fire at the enemy furthest along that is within reach — the one
    // about to cost integrity, not the one that is merely closest.
    for (const turret of this.turrets) {
      turret.cooldown -= dt;
      const stats = TURRET_STATS[turret.level - 1];
      if (turret.cooldown > 0) continue;
      const from = SLOTS[turret.slot];
      let target: Enemy | null = null;
      for (const e of this.enemies) {
        const p = pointAt(e.t);
        const d = Math.hypot(p.x - from.x, p.y - from.y);
        if (d <= stats.range && (!target || e.t > target.t)) target = e;
      }
      if (!target) continue;
      turret.cooldown = 1 / stats.rate;
      target.hp -= stats.damage;
      target.hitFlash = 1;
      const to = pointAt(target.t);
      this.shots.push({ from, to, life: 0.12 });
      if (target.hp <= 0) {
        this.burst(to, KINDS[target.kind].fill);
        this.enemies = this.enemies.filter((e) => e.id !== target!.id);
      }
    }

    for (const s of this.shots) s.life -= dt;
    if (this.shots.some((s) => s.life <= 0)) this.shots = this.shots.filter((s) => s.life > 0);

    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 0.25 * dt;
      p.life -= dt;
    }
    if (this.particles.some((p) => p.life <= 0)) this.particles = this.particles.filter((p) => p.life > 0);

    if (this.pending === 0 && this.enemies.length === 0 && this.breather === 0 && this.wave > 0) {
      this.events.onWaveCleared(this.wave);
      this.breather = 3.5;
    }
  }

  burst(at: Vec, colour: string) {
    for (let i = 0; i < 10; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 0.05 + Math.random() * 0.12;
      this.particles.push({ x: at.x, y: at.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.4 + Math.random() * 0.3, hue: colour });
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
