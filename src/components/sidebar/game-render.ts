/**
 * Drawing Radiology Defense.
 *
 * Separate from the simulation so that what the world IS and what it LOOKS
 * like can change independently, and so the whole of the canvas work sits in
 * one place instead of spreading through a React component.
 *
 * The first version drew everything as a gradient circle: enemies, turrets
 * and base were the same shape in three colours, which is what makes a small
 * game look cheap. What is here instead is built on four rules.
 *
 *  · SILHOUETTE FIRST. A nodule is spiculated, a mass is lobulated with a
 *    necrotic core, a calcified one is round with bright specks, a turret is
 *    angular and the base is a building. You can tell them apart with the
 *    colour removed, which is the test a readable game has to pass anyway
 *    on a phone.
 *  · LIGHT HAS A DIRECTION. One light from the top-left: rim on the near
 *    edge, cast shadow on the far one, everywhere, including the lane.
 *  · DETAIL WHERE THE EYE GOES. Bolts and vents on a turret, windows and a
 *    helipad on the base, chevrons in the lane. Flat where it does not:
 *    the ground is a blueprint grid and nothing more.
 *  · EVERY EVENT IS FELT. Firing flashes and recoils, a death pops, a breach
 *    shakes the frame. None of it changes the simulation; all of it is why a
 *    tap feels like it landed.
 */

import { MAX_TURRET_LEVEL, TURRET_COST } from "@/lib/game-score";
import { PATH, SLOTS, TURRET_STATS, World, pointAt, type Enemy, type Turret } from "./game-engine";

export interface Theme {
  dark: boolean;
  brand: string;
}

interface Palette {
  skyTop: string;
  skyBottom: string;
  gridFine: string;
  gridMajor: string;
  laneFill: [string, string];
  laneKerb: string;
  laneEdge: string;
  chevron: string;
  ink: string;
  steel: [string, string];
  steelEdge: string;
  shadow: string;
  vignette: string;
  mote: string;
}

function palette(dark: boolean): Palette {
  return dark
    ? {
        skyTop: "#080d1c", skyBottom: "#141b30",
        gridFine: "rgba(148,163,184,0.045)", gridMajor: "rgba(148,163,184,0.10)",
        laneFill: ["#2a2f55", "#1b2042"],
        laneKerb: "#4c51a8", laneEdge: "rgba(165,180,252,0.30)",
        chevron: "rgba(199,210,254,0.30)",
        ink: "#e2e8f0",
        steel: ["#7c83f3", "#272255"], steelEdge: "#c7d2fe",
        shadow: "rgba(2,6,23,0.55)",
        vignette: "rgba(2,6,23,0.6)",
        mote: "rgba(199,210,254,0.20)",
      }
    : {
        skyTop: "#eef3ff", skyBottom: "#d6deef",
        gridFine: "rgba(71,85,105,0.06)", gridMajor: "rgba(71,85,105,0.13)",
        laneFill: ["#c9cef0", "#aeb5e4"],
        laneKerb: "#6b72c9", laneEdge: "rgba(67,56,202,0.28)",
        chevron: "rgba(55,48,163,0.26)",
        ink: "#1e293b",
        steel: ["#aeb6fd", "#4338ca"], steelEdge: "#312e81",
        shadow: "rgba(30,41,59,0.17)",
        vignette: "rgba(100,116,139,0.22)",
        mote: "rgba(79,70,229,0.14)",
      };
}

/** Enemy colours: [rim, body, shadow, core]. */
const KIND_COLOURS: Record<string, [string, string, string, string]> = {
  nodule: ["#bae6fd", "#38bdf8", "#075985", "#0c4a6e"],
  mass: ["#fecdd3", "#fb7185", "#9f1239", "#7f1d1d"],
  calcified: ["#ddd6fe", "#a78bfa", "#5b21b6", "#4c1d95"],
};

/* ── Small helpers ───────────────────────────────────────────────────── */

function roundPoly(ctx: CanvasRenderingContext2D, pts: [number, number][], r: number) {
  ctx.beginPath();
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const c = pts[(i + 2) % pts.length];
    const v1 = [b[0] - a[0], b[1] - a[1]];
    const v2 = [c[0] - b[0], c[1] - b[1]];
    const l1 = Math.hypot(v1[0], v1[1]) || 1;
    const l2 = Math.hypot(v2[0], v2[1]) || 1;
    const p1: [number, number] = [b[0] - (v1[0] / l1) * r, b[1] - (v1[1] / l1) * r];
    const p2: [number, number] = [b[0] + (v2[0] / l2) * r, b[1] + (v2[1] / l2) * r];
    if (i === 0) ctx.moveTo(p1[0], p1[1]);
    else ctx.lineTo(p1[0], p1[1]);
    ctx.quadraticCurveTo(b[0], b[1], p2[0], p2[1]);
  }
  ctx.closePath();
}

function polygon(cx: number, cy: number, r: number, sides: number, rot = 0): [number, number][] {
  return Array.from({ length: sides }, (_, i) => {
    const a = (Math.PI * 2 * i) / sides + rot;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as [number, number];
  });
}

function rect(cx: number, cy: number, w: number, h: number): [number, number][] {
  return [[cx - w / 2, cy - h / 2], [cx + w / 2, cy - h / 2], [cx + w / 2, cy + h / 2], [cx - w / 2, cy + h / 2]];
}

/** The closed outline of an enemy, breathing slightly as it walks. */
function enemyPath(ctx: CanvasRenderingContext2D, e: Enemy, cx: number, cy: number, r: number, time: number, scale = 1) {
  const N = e.shape.length;
  ctx.beginPath();
  for (let i = 0; i <= N; i++) {
    const idx = i % N;
    const a = (idx / N) * Math.PI * 2;
    const breathe = 1 + 0.03 * Math.sin(time * 2.2 + e.phase + idx * 0.6);
    const rr = r * (1 + e.shape[idx]) * breathe * scale;
    const x = cx + Math.cos(a) * rr;
    const y = cy + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

/* ── The frame ───────────────────────────────────────────────────────── */

export function draw(
  ctx: CanvasRenderingContext2D,
  world: World,
  w: number,
  h: number,
  theme: Theme,
  selected: number | null,
  credits: number,
  /** The translated word for "wave". The renderer has no dictionary of its
   *  own, and a banner showing a bare number says nothing. */
  waveLabel = "",
) {
  const P = palette(theme.dark);
  const X = (v: number) => v * w;
  const Y = (v: number) => v * h;
  const time = world.time;

  ctx.save();
  // A breach shakes the frame. Decaying and small, so it registers as impact
  // rather than as a bug.
  if (world.shake > 0) {
    const m = world.shake * 7;
    ctx.translate((Math.random() - 0.5) * m, (Math.random() - 0.5) * m);
  }

  /* ── Ground ───────────────────────────────────────────────────────── */
  const bg = ctx.createLinearGradient(0, 0, w * 0.4, h);
  bg.addColorStop(0, P.skyTop);
  bg.addColorStop(1, P.skyBottom);
  ctx.fillStyle = bg;
  ctx.fillRect(-20, -20, w + 40, h + 40);

  // A blueprint grid: fine lines with a heavier one every fourth, which is
  // what separates "drafted" from "a square background".
  const cell = Math.max(16, w / 18);
  ctx.lineWidth = 1;
  for (let i = 1; i * cell < w; i++) {
    ctx.strokeStyle = i % 4 === 0 ? P.gridMajor : P.gridFine;
    ctx.beginPath(); ctx.moveTo(i * cell, 0); ctx.lineTo(i * cell, h); ctx.stroke();
  }
  for (let i = 1; i * cell < h; i++) {
    ctx.strokeStyle = i % 4 === 0 ? P.gridMajor : P.gridFine;
    ctx.beginPath(); ctx.moveTo(0, i * cell); ctx.lineTo(w, i * cell); ctx.stroke();
  }

  // Drifting motes, for a sense of air between the ground and everything else.
  ctx.fillStyle = P.mote;
  for (let i = 0; i < 16; i++) {
    const mx = ((i * 97) % 100) / 100;
    const my = (((i * 61) % 100) / 100 + time * 0.012 * (0.5 + (i % 3) * 0.3)) % 1;
    ctx.beginPath();
    ctx.arc(X(mx), Y(1 - my), 1 + (i % 3) * 0.7, 0, Math.PI * 2);
    ctx.fill();
  }

  /* ── The lane ─────────────────────────────────────────────────────── */
  const lane = () => {
    ctx.beginPath();
    ctx.moveTo(X(PATH[0].x), Y(PATH[0].y));
    for (const p of PATH.slice(1)) ctx.lineTo(X(p.x), Y(p.y));
  };
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const laneW = Math.max(16, w * 0.072);

  // Cast shadow under the lane, same light as everything else.
  ctx.save();
  ctx.translate(1.5, 3);
  lane();
  ctx.strokeStyle = P.shadow;
  ctx.lineWidth = laneW + 4;
  ctx.stroke();
  ctx.restore();

  lane();
  ctx.strokeStyle = P.laneKerb;
  ctx.lineWidth = laneW + 4;
  ctx.stroke();

  // The road surface, lit from the top-left like everything else.
  const road = ctx.createLinearGradient(0, 0, w * 0.6, h);
  road.addColorStop(0, P.laneFill[0]);
  road.addColorStop(1, P.laneFill[1]);
  lane();
  ctx.strokeStyle = road;
  ctx.lineWidth = laneW;
  ctx.stroke();

  // Chevrons flowing toward the base: the lane says which way is downhill,
  // so a new player knows where the enemies are going before any arrives.
  ctx.strokeStyle = P.chevron;
  ctx.lineWidth = 1.6;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const marks = 26;
  for (let i = 0; i < marks; i++) {
    const t = ((i / marks) + (time * 0.055) % (1 / marks)) % 1;
    const a = pointAt(Math.max(0, t - 0.006));
    const b = pointAt(Math.min(1, t + 0.006));
    const dx = X(b.x) - X(a.x);
    const dy = Y(b.y) - Y(a.y);
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const px = -uy;
    const py = ux;
    const cxp = X(a.x) + dx / 2;
    const cyp = Y(a.y) + dy / 2;
    const size = laneW * 0.2;
    ctx.beginPath();
    ctx.moveTo(cxp - ux * size + px * size, cyp - uy * size + py * size);
    ctx.lineTo(cxp + ux * size * 0.8, cyp + uy * size * 0.8);
    ctx.lineTo(cxp - ux * size - px * size, cyp - uy * size - py * size);
    ctx.stroke();
  }

  // The gate the wave comes through, so the lane starts somewhere.
  const entry = pointAt(0.012);
  ctx.save();
  ctx.translate(X(entry.x), Y(entry.y));
  ctx.strokeStyle = P.laneEdge;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, laneW * 0.62, Math.PI, 0);
  ctx.stroke();
  ctx.restore();

  /* ── Turret slots ─────────────────────────────────────────────────── */
  SLOTS.forEach((s, i) => {
    const turret = world.turretAt(i);
    const cx = X(s.x);
    const cy = Y(s.y);
    const r = Math.max(13, w * 0.045);

    if (selected === i) {
      const stats = TURRET_STATS[(turret?.level ?? 1) - 1];
      ctx.beginPath();
      ctx.arc(cx, cy, stats.range * w, 0, Math.PI * 2);
      ctx.fillStyle = theme.dark ? "rgba(129,140,248,0.09)" : "rgba(79,70,229,0.07)";
      ctx.fill();
      ctx.strokeStyle = theme.dark ? "rgba(165,180,252,0.55)" : "rgba(79,70,229,0.5)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 5]);
      ctx.lineDashOffset = -time * 14;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.lineDashOffset = 0;
    }

    if (!turret) {
      drawPad(ctx, cx, cy, r, credits >= TURRET_COST, time + i, theme);
      return;
    }
    drawTurret(ctx, turret, cx, cy, r, P, theme);
  });

  /* ── Shots ────────────────────────────────────────────────────────── */
  for (const s of world.shots) {
    const a = Math.max(0, s.life / 0.14);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.lineCap = "round";
    ctx.strokeStyle = theme.dark ? "rgba(129,140,248,0.4)" : "rgba(79,70,229,0.3)";
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(X(s.from.x), Y(s.from.y)); ctx.lineTo(X(s.to.x), Y(s.to.y)); ctx.stroke();
    ctx.strokeStyle = "#eef2ff";
    ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(X(s.from.x), Y(s.from.y)); ctx.lineTo(X(s.to.x), Y(s.to.y)); ctx.stroke();
    ctx.restore();
  }

  /* ── Enemies ──────────────────────────────────────────────────────── */
  for (const e of world.enemies) {
    const p = pointAt(e.t);
    const cx = X(p.x);
    const cy = Y(p.y);
    // Popping in on spawn, so nothing simply materialises at full size.
    const grow = Math.min(1, e.age * 4);
    const r = e.radius * w * (0.7 + 0.3 * grow);
    const [rim, body, shade, core] = KIND_COLOURS[e.kind] || KIND_COLOURS.nodule;

    ctx.save();
    ctx.globalAlpha = Math.min(1, e.age * 5);

    ctx.save();
    ctx.translate(r * 0.2, r * 0.26);
    enemyPath(ctx, e, cx, cy, r, time);
    ctx.fillStyle = P.shadow;
    ctx.fill();
    ctx.restore();

    const g = ctx.createRadialGradient(cx - r * 0.42, cy - r * 0.45, r * 0.1, cx, cy, r * 1.15);
    g.addColorStop(0, e.hitFlash > 0 ? "#ffffff" : rim);
    g.addColorStop(0.55, e.hitFlash > 0 ? rim : body);
    g.addColorStop(1, shade);
    enemyPath(ctx, e, cx, cy, r, time);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = shade;
    ctx.lineWidth = 1.2;
    ctx.stroke();

    if (e.kind === "mass") {
      // A necrotic centre: the inside of a mass is not the same as its rim.
      ctx.globalAlpha *= 0.55;
      enemyPath(ctx, e, cx + r * 0.06, cy + r * 0.04, r * 0.45, time * 0.7);
      ctx.fillStyle = core;
      ctx.fill();
      ctx.globalAlpha = Math.min(1, e.age * 5);
    } else if (e.kind === "nodule") {
      // Spicules: short radial strokes reaching out of the margin.
      ctx.strokeStyle = shade;
      ctx.lineWidth = 1.3;
      ctx.lineCap = "round";
      for (let k = 0; k < e.shape.length; k += 2) {
        const a2 = (k / e.shape.length) * Math.PI * 2;
        const r0 = r * (1 + e.shape[k]);
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a2) * r0 * 0.92, cy + Math.sin(a2) * r0 * 0.92);
        ctx.lineTo(cx + Math.cos(a2) * (r0 + r * 0.26), cy + Math.sin(a2) * (r0 + r * 0.26));
        ctx.stroke();
      }
    } else {
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      for (const d of [[-0.32, -0.12], [0.26, 0.18], [0.04, -0.38], [-0.1, 0.3], [0.34, -0.22]]) {
        ctx.beginPath();
        ctx.arc(cx + d[0] * r, cy + d[1] * r, r * 0.1, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Rim light on the near edge, the same light as everywhere else.
    ctx.save();
    enemyPath(ctx, e, cx, cy, r, time);
    ctx.clip();
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 2.2;
    enemyPath(ctx, e, cx - r * 0.07, cy - r * 0.09, r, time);
    ctx.stroke();
    ctx.restore();

    // Health as an arc over the crown, hugging the shape.
    if (e.hp < e.maxHp) {
      const frac = Math.max(0, e.hp / e.maxHp);
      const from = -Math.PI * 0.86;
      const span = Math.PI * 0.72;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(cx, cy, r * 1.3, from, from + span);
      ctx.strokeStyle = theme.dark ? "rgba(2,6,23,0.65)" : "rgba(255,255,255,0.7)";
      ctx.lineWidth = 3.4;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, r * 1.3, from, from + span * frac);
      ctx.strokeStyle = frac > 0.5 ? "#34d399" : frac > 0.25 ? "#fbbf24" : "#f87171";
      ctx.lineWidth = 2.6;
      ctx.stroke();
    }
    ctx.restore();
  }

  /* ── Particles ────────────────────────────────────────────────────── */
  for (const p of world.particles) {
    const k = Math.max(0, p.life / p.maxLife);
    ctx.globalAlpha = k;
    ctx.fillStyle = p.hue;
    ctx.beginPath();
    ctx.arc(X(p.x), Y(p.y), p.size * (0.4 + k * 0.8), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  drawBase(ctx, world, X, Y, w, time, P, theme);

  /* ── Floating numbers ─────────────────────────────────────────────── */
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const f of world.floaters) {
    const k = Math.max(0, Math.min(1, f.life / 1.1));
    ctx.globalAlpha = k;
    ctx.font = `bold ${Math.round(Math.max(13, w * 0.042))}px system-ui, sans-serif`;
    ctx.lineWidth = 3;
    ctx.strokeStyle = theme.dark ? "rgba(2,6,23,0.8)" : "rgba(255,255,255,0.9)";
    ctx.strokeText(f.text, X(f.x), Y(f.y));
    ctx.fillStyle = f.tone === "good" ? "#34d399" : "#fb7185";
    ctx.fillText(f.text, X(f.x), Y(f.y));
  }
  ctx.globalAlpha = 1;

  /* ── Vignette and frame ───────────────────────────────────────────── */
  const vig = ctx.createRadialGradient(w / 2, h * 0.45, Math.min(w, h) * 0.3, w / 2, h * 0.5, Math.max(w, h) * 0.78);
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, P.vignette);
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);

  // Corner brackets: a cheap frame that makes the canvas read as a viewport
  // rather than as a rectangle something was drawn in.
  ctx.strokeStyle = theme.dark ? "rgba(165,180,252,0.35)" : "rgba(67,56,202,0.28)";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  const b = Math.max(10, w * 0.04);
  const m = 7;
  for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    const ox = sx > 0 ? m : w - m;
    const oy = sy > 0 ? m : h - m;
    ctx.beginPath();
    ctx.moveTo(ox + sx * b, oy);
    ctx.lineTo(ox, oy);
    ctx.lineTo(ox, oy + sy * b);
    ctx.stroke();
  }

  /* ── Wave banner ──────────────────────────────────────────────────── */
  if (world.banner > 0) {
    const k = world.banner > 1.4 ? (1.8 - world.banner) / 0.4 : Math.min(1, world.banner / 0.6);
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, k));
    ctx.translate(w / 2, h * 0.34);
    ctx.scale(0.88 + 0.12 * k, 0.88 + 0.12 * k);

    const label = waveLabel.toUpperCase();
    const labelSize = Math.round(Math.max(10, w * 0.034));
    const numSize = Math.round(Math.max(30, w * 0.125));

    if (label) {
      ctx.font = `800 ${labelSize}px system-ui, sans-serif`;
      ctx.letterSpacing = "3px";
      ctx.lineWidth = 4;
      ctx.strokeStyle = theme.dark ? "rgba(2,6,23,0.9)" : "rgba(255,255,255,0.95)";
      ctx.strokeText(label, 0, -numSize * 0.52);
      ctx.fillStyle = theme.dark ? "#a5b4fc" : "#4338ca";
      ctx.fillText(label, 0, -numSize * 0.52);
      ctx.letterSpacing = "0px";
    }

    ctx.font = `900 ${numSize}px system-ui, sans-serif`;
    ctx.lineWidth = 6;
    ctx.strokeStyle = theme.dark ? "rgba(2,6,23,0.9)" : "rgba(255,255,255,0.95)";
    ctx.strokeText(`${world.wave}`, 0, numSize * 0.2);
    const grad = ctx.createLinearGradient(0, -numSize * 0.4, 0, numSize * 0.45);
    grad.addColorStop(0, "#e0e7ff");
    grad.addColorStop(1, "#6366f1");
    ctx.fillStyle = grad;
    ctx.fillText(`${world.wave}`, 0, numSize * 0.2);

    ctx.globalAlpha *= 0.8;
    ctx.strokeStyle = theme.dark ? "#818cf8" : "#4f46e5";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-numSize * 0.5 * k, numSize * 0.52);
    ctx.lineTo(numSize * 0.5 * k, numSize * 0.52);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

/* ── Pieces ──────────────────────────────────────────────────────────── */

/** An empty emplacement: a construction pad with corner brackets. */
function drawPad(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, r: number,
  affordable: boolean, phase: number, theme: Theme,
) {
  const pulse = affordable ? 1 + 0.06 * Math.sin(phase * 3) : 1;
  const s = r * 0.95 * pulse;
  ctx.save();
  ctx.globalAlpha = affordable ? 1 : 0.38;
  const tint = affordable ? "#34d399" : (theme.dark ? "#64748b" : "#94a3b8");

  ctx.fillStyle = affordable
    ? (theme.dark ? "rgba(52,211,153,0.09)" : "rgba(5,150,105,0.07)")
    : "rgba(100,116,139,0.06)";
  roundPoly(ctx, rect(cx, cy, s * 1.7, s * 1.7), 3);
  ctx.fill();

  // Corner brackets rather than a full square: it reads as a marked-out plot.
  ctx.strokeStyle = tint;
  ctx.lineWidth = 1.8;
  ctx.lineCap = "round";
  const half = s * 0.85;
  const arm = s * 0.4;
  for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    ctx.beginPath();
    ctx.moveTo(cx + sx * half - sx * arm, cy + sy * half);
    ctx.lineTo(cx + sx * half, cy + sy * half);
    ctx.lineTo(cx + sx * half, cy + sy * half - sy * arm);
    ctx.stroke();
  }

  if (affordable) {
    ctx.strokeStyle = tint;
    ctx.lineWidth = 2.3;
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.26, cy); ctx.lineTo(cx + r * 0.26, cy);
    ctx.moveTo(cx, cy - r * 0.26); ctx.lineTo(cx, cy + r * 0.26);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * A turret, built differently at each level.
 *
 * Level is shown by the machine and not only by a pip: one barrel, then two,
 * then a heavy cannon with a muzzle brake. A player can see what a slot is
 * worth from across the board, which is the whole reason to upgrade.
 */
function drawTurret(
  ctx: CanvasRenderingContext2D,
  turret: Turret,
  cx: number, cy: number, r: number,
  P: Palette, theme: Theme,
) {
  const recoil = turret.flash * r * 0.18;

  // Cast shadow, down-right.
  ctx.save();
  ctx.fillStyle = P.shadow;
  roundPoly(ctx, polygon(cx + r * 0.16, cy + r * 0.22, r, 8, Math.PI / 8), 3);
  ctx.fill();
  ctx.restore();

  /* Barrels first, so the plinth overlaps their roots. */
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(turret.angle);
  ctx.translate(-recoil, 0);
  const len = r * (1.28 + turret.level * 0.12);
  const metal = ctx.createLinearGradient(0, -r * 0.3, 0, r * 0.3);
  metal.addColorStop(0, theme.dark ? "#94a3b8" : "#cbd5e1");
  metal.addColorStop(1, theme.dark ? "#334155" : "#64748b");

  const barrel = (offset: number, width: number) => {
    roundPoly(ctx, [
      [r * 0.1, offset - width], [len, offset - width * 0.82],
      [len, offset + width * 0.82], [r * 0.1, offset + width],
    ], 2);
    ctx.fillStyle = metal;
    ctx.fill();
  };

  if (turret.level === 1) {
    barrel(0, r * 0.19);
  } else if (turret.level === 2) {
    barrel(-r * 0.22, r * 0.13);
    barrel(r * 0.22, r * 0.13);
  } else {
    barrel(0, r * 0.26);
    // Muzzle brake: the detail that says "this one is the heavy".
    ctx.fillStyle = theme.dark ? "#cbd5e1" : "#475569";
    roundPoly(ctx, rect(len * 0.9, 0, r * 0.3, r * 0.78), 2);
    ctx.fill();
  }
  // A collar part-way along, so the barrel reads as machined.
  ctx.fillStyle = theme.dark ? "#64748b" : "#94a3b8";
  roundPoly(ctx, rect(len * 0.58, 0, r * 0.17, r * 0.56), 1.5);
  ctx.fill();

  if (turret.flash > 0.02) {
    ctx.globalAlpha = turret.flash;
    const fl = ctx.createRadialGradient(len + r * 0.1, 0, 0, len + r * 0.1, 0, r * 0.7);
    fl.addColorStop(0, "#fffbeb");
    fl.addColorStop(0.35, "#fbbf24");
    fl.addColorStop(1, "rgba(251,191,36,0)");
    ctx.fillStyle = fl;
    ctx.beginPath();
    ctx.arc(len + r * 0.1, 0, r * 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  /* The plinth: an octagon, bevelled, with bolts and vents. */
  const g = ctx.createLinearGradient(cx - r * 0.7, cy - r, cx + r * 0.5, cy + r);
  g.addColorStop(0, P.steel[0]);
  g.addColorStop(1, P.steel[1]);
  roundPoly(ctx, polygon(cx, cy, r, 8, Math.PI / 8), 3);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = P.steelEdge;
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // Rim light along the top-left edge: one light source, consistently.
  ctx.save();
  roundPoly(ctx, polygon(cx, cy, r, 8, Math.PI / 8), 3);
  ctx.clip();
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = 2.4;
  roundPoly(ctx, polygon(cx - 1.6, cy - 2, r, 8, Math.PI / 8), 3);
  ctx.stroke();

  // Vents on the lower half, shaded as if recessed.
  ctx.strokeStyle = theme.dark ? "rgba(2,6,23,0.45)" : "rgba(30,41,59,0.3)";
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 3; i++) {
    const yy = cy + r * 0.3 + i * r * 0.2;
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.42, yy);
    ctx.lineTo(cx + r * 0.42, yy);
    ctx.stroke();
  }
  ctx.restore();

  // Bolts at the corners.
  ctx.fillStyle = theme.dark ? "rgba(226,232,240,0.7)" : "rgba(255,255,255,0.8)";
  for (const [bx, by] of polygon(cx, cy, r * 0.74, 4, Math.PI / 4)) {
    ctx.beginPath();
    ctx.arc(bx, by, r * 0.075, 0, Math.PI * 2);
    ctx.fill();
  }

  // A glowing core, brighter with level.
  const coreR = r * (0.2 + turret.level * 0.05);
  const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * 2);
  const glow = turret.level >= MAX_TURRET_LEVEL ? "251,191,36" : "199,210,254";
  core.addColorStop(0, `rgba(${glow},0.95)`);
  core.addColorStop(1, `rgba(${glow},0)`);
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(cx, cy, coreR * 2, 0, Math.PI * 2);
  ctx.fill();

  if (turret.level >= MAX_TURRET_LEVEL) {
    roundPoly(ctx, polygon(cx, cy, r + 3.5, 8, Math.PI / 8), 3);
    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }
}

/** The hospital: a building, not another sphere. */
function drawBase(
  ctx: CanvasRenderingContext2D,
  world: World,
  X: (v: number) => number,
  Y: (v: number) => number,
  w: number,
  time: number,
  P: Palette,
  theme: Theme,
) {
  const base = pointAt(1);
  const bx = X(base.x);
  const by = Y(base.y);
  const br = Math.max(17, w * 0.058);
  const ok = world.integrity > 40;
  const accent = ok ? "#0ea5e9" : "#f43f5e";
  const accentDeep = ok ? "#075985" : "#9f1239";
  const frac = Math.max(0, world.integrity / 100);

  // Shield ring: its length is the integrity left, so the state of the base
  // is on the base and not only in the HUD.
  ctx.save();
  ctx.translate(bx, by);
  ctx.rotate(time * 0.35);
  ctx.beginPath();
  ctx.arc(0, 0, br * 1.6, 0, Math.PI * 2);
  ctx.strokeStyle = theme.dark ? "rgba(148,163,184,0.18)" : "rgba(71,85,105,0.16)";
  ctx.lineWidth = 3.5;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, br * 1.6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 3.5;
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.restore();

  // A slow pulse while healthy, a fast one when the base is in trouble.
  const pulse = 1 + (ok ? 0.03 : 0.08) * Math.sin(time * (ok ? 2 : 7));
  ctx.beginPath();
  ctx.arc(bx, by, br * 2.05 * pulse, 0, Math.PI * 2);
  const halo = ctx.createRadialGradient(bx, by, br * 0.6, bx, by, br * 2.05 * pulse);
  halo.addColorStop(0, ok ? "rgba(14,165,233,0.2)" : "rgba(244,63,94,0.3)");
  halo.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = halo;
  ctx.fill();

  const bw = br * 1.9;
  const bh = br * 1.55;

  ctx.save();
  ctx.fillStyle = P.shadow;
  roundPoly(ctx, rect(bx + 3, by + 4, bw, bh), 4);
  ctx.fill();
  ctx.restore();

  const wall = ctx.createLinearGradient(bx - bw / 2, by - bh / 2, bx + bw / 2, by + bh / 2);
  wall.addColorStop(0, "#ffffff");
  wall.addColorStop(1, theme.dark ? "#bfc9d9" : "#dce3ee");
  roundPoly(ctx, rect(bx, by, bw, bh), 4);
  ctx.fillStyle = wall;
  ctx.fill();
  ctx.strokeStyle = accentDeep;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Roof band in the accent colour, which is how the damage state reads.
  roundPoly(ctx, [
    [bx - bw / 2, by - bh / 2], [bx + bw / 2, by - bh / 2],
    [bx + bw / 2, by - bh / 2 + bh * 0.28], [bx - bw / 2, by - bh / 2 + bh * 0.28],
  ], 3);
  ctx.fillStyle = accent;
  ctx.fill();

  // The cross on the roof band.
  ctx.fillStyle = "#ffffff";
  const ct = bh * 0.085;
  ctx.fillRect(bx - ct / 2, by - bh * 0.44, ct, bh * 0.2);
  ctx.fillRect(bx - bh * 0.1, by - bh * 0.4, bh * 0.2, ct);

  // A grid of windows, two of them lit, and a door: it has to look like a
  // place with people in it, since that is what the player is defending.
  const winW = bw * 0.14;
  const winH = bh * 0.15;
  for (let row = 0; row < 2; row++) {
    for (let col = -1; col <= 1; col++) {
      if (row === 1 && col === 0) continue;
      const lit = ok && ((row + col + 2) % 2 === 0);
      ctx.fillStyle = lit ? "rgba(251,191,36,0.92)" : (theme.dark ? "rgba(71,85,105,0.55)" : "rgba(148,163,184,0.5)");
      roundPoly(ctx, rect(bx + col * bw * 0.28, by - bh * 0.06 + row * bh * 0.27, winW, winH), 1.5);
      ctx.fill();
    }
  }
  ctx.fillStyle = accentDeep;
  roundPoly(ctx, [
    [bx - bw * 0.09, by + bh * 0.5], [bx + bw * 0.09, by + bh * 0.5],
    [bx + bw * 0.09, by + bh * 0.13], [bx - bw * 0.09, by + bh * 0.13],
  ], 3);
  ctx.fill();

  // Antenna with a blinking light, so the building is never quite static.
  ctx.strokeStyle = theme.dark ? "#94a3b8" : "#64748b";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(bx + bw * 0.36, by - bh * 0.5);
  ctx.lineTo(bx + bw * 0.36, by - bh * 0.82);
  ctx.stroke();
  const blink = 0.45 + 0.55 * Math.abs(Math.sin(time * 2.4));
  ctx.fillStyle = `rgba(248,113,113,${blink})`;
  ctx.beginPath();
  ctx.arc(bx + bw * 0.36, by - bh * 0.86, 2.4, 0, Math.PI * 2);
  ctx.fill();
}
