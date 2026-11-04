/**
 * The levels: a different department on every floor.
 *
 * A level is a map, a palette and a difficulty, and all three change together
 * so that arriving at level 4 feels like arriving somewhere, not like the
 * same screen with bigger numbers. Three routes become eight; the approach
 * spirals one way and then the other; the whole place changes colour.
 *
 * The geometry is COMPUTED rather than written down. An earlier version had
 * the bays typed in at what looked like the midpoint between two corridors,
 * and half of them landed on top of one, because the dog-leg swings each
 * corridor a quarter of a wedge toward its neighbour. With six layouts that
 * mistake would be waiting in every one of them. Here each bay is placed by
 * searching its wedge for the point furthest from every corridor, which
 * cannot be wrong by construction — and a test checks the result anyway.
 */

import type { Species } from "./game-engine";

export interface Vec { x: number; y: number }

/** Where the hospital stands, and where every corridor ends. */
export const HOSPITAL: Vec = { x: 0.5, y: 0.47 };

/** Spread wider than tall, because the field is portrait: a true circle
 *  would leave the sides empty and crowd the top and bottom. */
const RX = 0.62;
const RY = 0.64;

export function polar(r: number, a: number): Vec {
  return { x: HOSPITAL.x + Math.cos(a) * r * RX, y: HOSPITAL.y + Math.sin(a) * r * RY };
}

/* ── Colour ──────────────────────────────────────────────────────────── */

export interface LevelTint {
  lane: string;
  laneDeep: string;
  accent: string;
  skyDark: [string, string];
  skyLight: [string, string];
}

/**
 * One tint per floor.
 *
 * Each is a single hue family taken all the way through the ground, the
 * corridors and the machines, rather than a new accent dropped on the same
 * grey. Changing one colour looks like a theme; changing the light the whole
 * place sits in looks like a different place.
 */
export const TINTS: LevelTint[] = [
  { lane: "#0d9488", laneDeep: "#134e4a", accent: "#5eead4", skyDark: ["#04161a", "#0b2a2e"], skyLight: ["#effdfe", "#c9e9ec"] },
  { lane: "#b45309", laneDeep: "#7c2d12", accent: "#fcd34d", skyDark: ["#1a1206", "#2e2111"], skyLight: ["#fffbeb", "#f1e1c0"] },
  { lane: "#4f46e5", laneDeep: "#312e81", accent: "#a5b4fc", skyDark: ["#080d1c", "#141b30"], skyLight: ["#eef3ff", "#d6deef"] },
  { lane: "#be123c", laneDeep: "#881337", accent: "#fda4af", skyDark: ["#1a0710", "#2d1020"], skyLight: ["#fff1f2", "#f0d2d9"] },
  { lane: "#15803d", laneDeep: "#14532d", accent: "#6ee7b7", skyDark: ["#04140c", "#0d2419"], skyLight: ["#ecfdf5", "#cde8d9"] },
  { lane: "#1d4ed8", laneDeep: "#1e3a8a", accent: "#93c5fd", skyDark: ["#030712", "#0b1322"], skyLight: ["#eff6ff", "#ccdcf2"] },
];

/* ── The levels ──────────────────────────────────────────────────────── */

export interface LevelSpec {
  level: number;
  /** How many corridors converge on the hospital. */
  routes: number;
  /** How far round the approach swings on its way in. Negative spirals the
   *  other way, which is the cheapest way to make a map feel new. */
  bend: number;
  /** Radii of the two rings of bays. */
  rings: [number, number];
  /** Bays per ring. */
  perRing: number;
  tint: LevelTint;
  /** Waves to clear before the floor is done. */
  waves: number;
  /** Multiplies the wave curve on top of its own climb. */
  hardness: number;
  /** Which kinds of patient this floor sees. */
  species: Species[];
}

const ALL: Species[] = ["routine", "urgent", "paediatric", "stretcher", "critical"];

const PLAN: Omit<LevelSpec, "level" | "tint">[] = [
  { routes: 3, bend: 0.34, rings: [0.42, 0.80], perRing: 3, waves: 4, hardness: 1.0, species: ["routine", "paediatric"] },
  { routes: 4, bend: -0.40, rings: [0.38, 0.78], perRing: 4, waves: 5, hardness: 1.12, species: ["routine", "paediatric", "urgent"] },
  { routes: 5, bend: 0.44, rings: [0.36, 0.76], perRing: 5, waves: 5, hardness: 1.26, species: ["routine", "paediatric", "urgent", "stretcher"] },
  { routes: 6, bend: -0.46, rings: [0.35, 0.74], perRing: 6, waves: 6, hardness: 1.42, species: ALL },
  { routes: 7, bend: 0.48, rings: [0.34, 0.73], perRing: 7, waves: 6, hardness: 1.6, species: ALL },
  { routes: 8, bend: -0.5, rings: [0.33, 0.72], perRing: 8, waves: 7, hardness: 1.8, species: ALL },
];

export const LEVEL_COUNT = PLAN.length;

/**
 * The spec for level n.
 *
 * Past the last authored floor the game keeps going on the hardest layout
 * with the difficulty still climbing, because a player who reaches level 7
 * has earned somewhere to keep playing — and "you win, stop now" is a worse
 * ending than being finally overrun.
 */
export function levelSpec(level: number): LevelSpec {
  const n = Math.max(1, Math.floor(level));
  const i = Math.min(n, LEVEL_COUNT) - 1;
  const base = PLAN[i];
  const beyond = Math.max(0, n - LEVEL_COUNT);
  return {
    ...base,
    level: n,
    tint: TINTS[(n - 1) % TINTS.length],
    hardness: base.hardness * (1 + beyond * 0.15),
    waves: Math.min(9, base.waves + beyond),
  };
}

/* ── The map ─────────────────────────────────────────────────────────── */

export interface Layout {
  spec: LevelSpec;
  paths: Vec[][];
  slots: Vec[];
  /** Position on a corridor at travel fraction t, along its real length. */
  at(route: number, t: number): Vec;
  routeLength: number;
}

/**
 * The radius at which a ray leaves the field.
 *
 * A single entry radius for every route cannot work: the spread is an
 * ellipse on a square field, so the same radius lands a horizontal route
 * well outside and a diagonal one still inside. Pushing the radius up until
 * the worst angle clears put a third of the walk off-canvas for all the
 * others. Each route is measured on its own ray instead.
 */
function exitRadius(a: number): number {
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  const tx = Math.abs(cos) > 1e-6 ? 0.5 / Math.abs(cos * RX) : Infinity;
  const ty = Math.abs(sin) > 1e-6 ? (sin > 0 ? 0.53 : 0.47) / Math.abs(sin * RY) : Infinity;
  return Math.min(tx, ty);
}

function makeRoute(spec: LevelSpec, i: number): Vec[] {
  const a0 = -Math.PI / 2 + (i * Math.PI * 2) / spec.routes;
  const a1 = a0 + spec.bend;
  // Just outside the frame on this route's own ray, and no further: every
  // metre spent off-canvas is time a scanner works on someone nobody sees.
  const entry = exitRadius(a0) * 1.09;
  return [polar(entry, a0), polar(entry * 0.76, a0), polar(0.44, a1), polar(0.16, a1), HOSPITAL];
}

/** How close a point comes to any corridor. */
function clearance(paths: Vec[][], p: Vec): number {
  let min = 9;
  for (const path of paths) {
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i];
      const b = path[i + 1];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len2 = dx * dx + dy * dy;
      const t = len2 > 0 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2)) : 0;
      min = Math.min(min, Math.hypot(a.x + dx * t - p.x, a.y + dy * t - p.y));
    }
  }
  return min;
}

/** A bay must be tappable, so it cannot hang off the edge of the field. */
function onField(p: Vec): boolean {
  return p.x > 0.06 && p.x < 0.94 && p.y > 0.05 && p.y < 0.95;
}

/**
 * Places the bays by searching, not by guessing.
 *
 * Each wedge gets one bay: the point in that wedge, at that radius, furthest
 * from every corridor and still on the field. If no point in a wedge works,
 * the radius is nudged inward and the wedge tried again, so a layout can
 * never silently ship a bay sitting on a lane.
 */
function placeSlots(spec: LevelSpec, paths: Vec[][]): Vec[] {
  const out: Vec[] = [];
  for (const baseR of spec.rings) {
    for (let k = 0; k < spec.perRing; k++) {
      let best: { p: Vec; c: number } | null = null;
      for (const r of [baseR, baseR - 0.06, baseR + 0.06, baseR - 0.12]) {
        for (let step = 0; step < 60; step++) {
          const a = -Math.PI / 2 + ((k + step / 60) * Math.PI * 2) / spec.perRing;
          const p = polar(r, a);
          if (!onField(p)) continue;
          const c = clearance(paths, p);
          if (!best || c > best.c) best = { p, c };
        }
        if (best && best.c > 0.09) break;
      }
      if (best) out.push(best.p);
    }
  }
  return out;
}

export function buildLayout(spec: LevelSpec): Layout {
  const paths = Array.from({ length: spec.routes }, (_, i) => makeRoute(spec, i));
  const slots = placeSlots(spec, paths);

  // Cumulative length per corridor, so t is distance and not segment index.
  // Equal slices of t make a patient sprint down a short leg and crawl along
  // a long one; nobody reads that as design.
  const geom = paths.map((path) => {
    const legs = path.slice(1).map((p, i) => Math.hypot(p.x - path[i].x, p.y - path[i].y));
    const total = legs.reduce((a, b) => a + b, 0);
    const cum = legs.reduce<number[]>((acc, len) => [...acc, acc[acc.length - 1] + len], [0]);
    return { legs, total, cum };
  });

  return {
    spec,
    paths,
    slots,
    routeLength: geom[0].total,
    at(route: number, t: number): Vec {
      const idx = ((route % paths.length) + paths.length) % paths.length;
      const path = paths[idx];
      const g = geom[idx];
      const want = Math.max(0, Math.min(1, t)) * g.total;
      let i = 0;
      while (i < g.legs.length - 1 && g.cum[i + 1] < want) i++;
      const local = g.legs[i] > 0 ? (want - g.cum[i]) / g.legs[i] : 0;
      const a = path[i];
      const b = path[i + 1];
      return { x: a.x + (b.x - a.x) * local, y: a.y + (b.y - a.y) * local };
    },
  };
}

/** The clearance a bay actually achieved, for tests and for tuning. */
export function slotClearance(layout: Layout): number {
  return layout.slots.reduce((min, s) => Math.min(min, clearance(layout.paths, s)), 9);
}
