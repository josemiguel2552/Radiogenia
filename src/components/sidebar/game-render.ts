/**
 * Drawing Radiology Defense.
 *
 * Separate from the simulation so that what the world IS and what it LOOKS
 * like can change independently, and so the whole of the canvas work sits in
 * one place instead of spreading through a React component.
 *
 * Four rules hold the look together.
 *
 *  · SILHOUETTE FIRST. A scanner is a gantry — a ring with a bore. A patient
 *    is a figure, upright or on a trolley. The hospital is a building. You
 *    can tell them apart with the colour removed, which is the test a
 *    readable game has to pass anyway on a phone.
 *  · LIGHT HAS A DIRECTION. One light from the top-left: rim on the near
 *    edge, cast shadow on the far one, everywhere, including the corridors.
 *  · DETAIL WHERE THE EYE GOES. A bore and a bevel on the gantry, windows
 *    and a helipad on the hospital. Flat where it does not: the ground is a
 *    blueprint grid and nothing more.
 *  · EVERY EVENT IS FELT. An exposure flashes, a finished study pops, an
 *    arrival shakes the frame. None of it changes the simulation; all of it
 *    is why a tap feels like it landed.
 */

import { MAX_SCANNER_LEVEL, SCANNER_COST } from "@/lib/game-score";
import {
  HOSPITAL, PATHS, ROUTES, SLOTS, SCANNER_STATS, SPECIES, World, pointAt,
  type Patient, type Scanner,
} from "./game-engine";

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
        laneFill: ["#272c4f", "#191e3c"],
        laneKerb: "#454a9c", laneEdge: "rgba(165,180,252,0.30)",
        chevron: "rgba(199,210,254,0.28)",
        ink: "#e2e8f0",
        steel: ["#8d94f6", "#272255"], steelEdge: "#c7d2fe",
        shadow: "rgba(2,6,23,0.55)",
        vignette: "rgba(2,6,23,0.6)",
        mote: "rgba(199,210,254,0.18)",
      }
    : {
        skyTop: "#eef3ff", skyBottom: "#d6deef",
        gridFine: "rgba(71,85,105,0.06)", gridMajor: "rgba(71,85,105,0.13)",
        laneFill: ["#ccd1f1", "#b2b9e6"],
        laneKerb: "#6b72c9", laneEdge: "rgba(67,56,202,0.28)",
        chevron: "rgba(55,48,163,0.24)",
        ink: "#1e293b",
        steel: ["#b4bbfd", "#4338ca"], steelEdge: "#312e81",
        shadow: "rgba(30,41,59,0.17)",
        vignette: "rgba(100,116,139,0.22)",
        mote: "rgba(79,70,229,0.13)",
      };
}

/**
 * The health of the hospital, read as a colour.
 *
 * Green through amber to red, with the thresholds where the player's choices
 * actually change: above 60 you can keep answering as you were, under 30 you
 * are building whatever you can afford.
 */
export function healthColour(integrity: number): { main: string; deep: string; glow: string } {
  if (integrity > 60) return { main: "#22c55e", deep: "#15803d", glow: "34,197,94" };
  if (integrity > 30) return { main: "#f59e0b", deep: "#b45309", glow: "245,158,11" };
  return { main: "#ef4444", deep: "#b91c1c", glow: "239,68,68" };
}

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

function rect(cx: number, cy: number, w: number, h: number): [number, number][] {
  return [[cx - w / 2, cy - h / 2], [cx + w / 2, cy - h / 2], [cx + w / 2, cy + h / 2], [cx - w / 2, cy + h / 2]];
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

  const cell = Math.max(14, w / 20);
  ctx.lineWidth = 1;
  for (let i = 1; i * cell < w; i++) {
    ctx.strokeStyle = i % 4 === 0 ? P.gridMajor : P.gridFine;
    ctx.beginPath(); ctx.moveTo(i * cell, 0); ctx.lineTo(i * cell, h); ctx.stroke();
  }
  for (let i = 1; i * cell < h; i++) {
    ctx.strokeStyle = i % 4 === 0 ? P.gridMajor : P.gridFine;
    ctx.beginPath(); ctx.moveTo(0, i * cell); ctx.lineTo(w, i * cell); ctx.stroke();
  }

  ctx.fillStyle = P.mote;
  for (let i = 0; i < 14; i++) {
    const mx = ((i * 97) % 100) / 100;
    const my = (((i * 61) % 100) / 100 + time * 0.012 * (0.5 + (i % 3) * 0.3)) % 1;
    ctx.beginPath();
    ctx.arc(X(mx), Y(1 - my), 1 + (i % 3) * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }

  /* ── The six corridors ────────────────────────────────────────────── */
  const laneW = Math.max(13, w * 0.056);
  const traceAll = (inset: number) => {
    for (const path of PATHS) {
      ctx.beginPath();
      ctx.moveTo(X(path[0].x) + inset, Y(path[0].y) + inset * 2);
      for (const p of path.slice(1)) ctx.lineTo(X(p.x) + inset, Y(p.y) + inset * 2);
      ctx.stroke();
    }
  };
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.strokeStyle = P.shadow;
  ctx.lineWidth = laneW + 3.5;
  traceAll(1.5);

  ctx.strokeStyle = P.laneKerb;
  ctx.lineWidth = laneW + 3.5;
  traceAll(0);

  const road = ctx.createLinearGradient(0, 0, w * 0.6, h);
  road.addColorStop(0, P.laneFill[0]);
  road.addColorStop(1, P.laneFill[1]);
  ctx.strokeStyle = road;
  ctx.lineWidth = laneW;
  traceAll(0);

  // Chevrons flowing inward, so which way is downhill is never in doubt.
  ctx.strokeStyle = P.chevron;
  ctx.lineWidth = 1.5;
  const marks = 7;
  for (let r = 0; r < ROUTES; r++) {
    for (let i = 0; i < marks; i++) {
      const t = ((i / marks) + (time * 0.05) % (1 / marks)) % 1;
      if (t > 0.94) continue;
      const a = pointAt(r, Math.max(0, t - 0.01));
      const b = pointAt(r, Math.min(1, t + 0.01));
      const dx = X(b.x) - X(a.x);
      const dy = Y(b.y) - Y(a.y);
      const len = Math.hypot(dx, dy) || 1;
      const ux = dx / len;
      const uy = dy / len;
      const cxp = X(a.x) + dx / 2;
      const cyp = Y(a.y) + dy / 2;
      const size = laneW * 0.24;
      ctx.beginPath();
      ctx.moveTo(cxp - ux * size - uy * size, cyp - uy * size + ux * size);
      ctx.lineTo(cxp + ux * size * 0.8, cyp + uy * size * 0.8);
      ctx.lineTo(cxp - ux * size + uy * size, cyp - uy * size - ux * size);
      ctx.stroke();
    }
  }

  // The doors each corridor comes through, so a route starts somewhere.
  for (let r = 0; r < ROUTES; r++) {
    const p = pointAt(r, 0.03);
    const q = pointAt(r, 0.09);
    const ang = Math.atan2(Y(q.y) - Y(p.y), X(q.x) - X(p.x));
    ctx.save();
    ctx.translate(X(p.x), Y(p.y));
    ctx.rotate(ang);
    ctx.strokeStyle = P.laneEdge;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, laneW * 0.62, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();
    ctx.restore();
  }

  /* ── Scanner bays ─────────────────────────────────────────────────── */
  SLOTS.forEach((s, i) => {
    const scanner = world.scannerAt(i);
    const cx = X(s.x);
    const cy = Y(s.y);
    const r = Math.max(12, w * 0.043);

    if (selected === i) {
      const stats = SCANNER_STATS[(scanner?.level ?? 1) - 1];
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

    if (!scanner) drawBay(ctx, cx, cy, r, credits >= SCANNER_COST, time + i, theme);
    else drawScanner(ctx, scanner, cx, cy, r, P, theme);
  });

  /* ── Exposures ────────────────────────────────────────────────────── */
  for (const b of world.beams) {
    const k = Math.max(0, b.life / 0.16);
    const fx = X(b.from.x);
    const fy = Y(b.from.y);
    const tx = X(b.to.x);
    const ty = Y(b.to.y);
    const ang = Math.atan2(ty - fy, tx - fx);
    const len = Math.hypot(tx - fx, ty - fy);
    const spread = Math.max(5, w * 0.022);

    // A fan, not a laser: this is a beam of radiation, and a cone says so.
    ctx.save();
    ctx.globalAlpha = k * 0.55;
    ctx.translate(fx, fy);
    ctx.rotate(ang);
    const fan = ctx.createLinearGradient(0, 0, len, 0);
    fan.addColorStop(0, "rgba(224,242,254,0.95)");
    fan.addColorStop(1, "rgba(125,211,252,0)");
    ctx.fillStyle = fan;
    ctx.beginPath();
    ctx.moveTo(0, -spread * 0.12);
    ctx.lineTo(len, -spread);
    ctx.lineTo(len, spread);
    ctx.lineTo(0, spread * 0.12);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = k;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#f0f9ff";
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(tx, ty); ctx.stroke();
    ctx.restore();
  }

  /* ── Patients ─────────────────────────────────────────────────────── */
  for (const p of world.patients) drawPatient(ctx, p, X, Y, w, time, P, theme);

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

  drawHospital(ctx, world, X, Y, w, time, P, theme);

  /* ── Floating numbers ─────────────────────────────────────────────── */
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const f of world.floaters) {
    const k = Math.max(0, Math.min(1, f.life / 1.1));
    ctx.globalAlpha = k;
    ctx.font = `bold ${Math.round(Math.max(12, w * 0.038))}px system-ui, sans-serif`;
    ctx.lineWidth = 3;
    ctx.strokeStyle = theme.dark ? "rgba(2,6,23,0.8)" : "rgba(255,255,255,0.9)";
    ctx.strokeText(f.text, X(f.x), Y(f.y));
    ctx.fillStyle = f.tone === "good" ? "#22c55e" : "#fb7185";
    ctx.fillText(f.text, X(f.x), Y(f.y));
  }
  ctx.globalAlpha = 1;

  /* ── Vignette and frame ───────────────────────────────────────────── */
  const vig = ctx.createRadialGradient(w / 2, h * 0.45, Math.min(w, h) * 0.3, w / 2, h * 0.5, Math.max(w, h) * 0.78);
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, P.vignette);
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = theme.dark ? "rgba(165,180,252,0.35)" : "rgba(67,56,202,0.28)";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  const b2 = Math.max(10, w * 0.04);
  const m = 7;
  for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    const ox = sx > 0 ? m : w - m;
    const oy = sy > 0 ? m : h - m;
    ctx.beginPath();
    ctx.moveTo(ox + sx * b2, oy);
    ctx.lineTo(ox, oy);
    ctx.lineTo(ox, oy + sy * b2);
    ctx.stroke();
  }

  /* ── Wave banner ──────────────────────────────────────────────────── */
  if (world.banner > 0) {
    const k = world.banner > 1.4 ? (1.8 - world.banner) / 0.4 : Math.min(1, world.banner / 0.6);
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, k));
    // Below the hospital, so the banner never hides the thing being defended.
    ctx.translate(w / 2, h * 0.82);
    ctx.scale(0.88 + 0.12 * k, 0.88 + 0.12 * k);

    const label = waveLabel.toUpperCase();
    const labelSize = Math.round(Math.max(10, w * 0.032));
    const numSize = Math.round(Math.max(26, w * 0.1));

    if (label) {
      ctx.font = `800 ${labelSize}px system-ui, sans-serif`;
      ctx.letterSpacing = "3px";
      ctx.lineWidth = 4;
      ctx.strokeStyle = theme.dark ? "rgba(2,6,23,0.9)" : "rgba(255,255,255,0.95)";
      ctx.strokeText(label, 0, -numSize * 0.5);
      ctx.fillStyle = theme.dark ? "#a5b4fc" : "#4338ca";
      ctx.fillText(label, 0, -numSize * 0.5);
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
    ctx.restore();
  }

  ctx.restore();
}

/* ── Pieces ──────────────────────────────────────────────────────────── */

/** An empty bay: a marked-out plot with corner brackets. */
function drawBay(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, r: number,
  affordable: boolean, phase: number, theme: Theme,
) {
  const pulse = affordable ? 1 + 0.06 * Math.sin(phase * 3) : 1;
  const s = r * 0.9 * pulse;
  ctx.save();
  ctx.globalAlpha = affordable ? 1 : 0.35;
  const tint = affordable ? "#22c55e" : (theme.dark ? "#64748b" : "#94a3b8");

  ctx.fillStyle = affordable
    ? (theme.dark ? "rgba(34,197,94,0.09)" : "rgba(21,128,61,0.07)")
    : "rgba(100,116,139,0.06)";
  roundPoly(ctx, rect(cx, cy, s * 1.7, s * 1.7), 3);
  ctx.fill();

  ctx.strokeStyle = tint;
  ctx.lineWidth = 1.7;
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
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.24, cy); ctx.lineTo(cx + r * 0.24, cy);
    ctx.moveTo(cx, cy - r * 0.24); ctx.lineTo(cx, cy + r * 0.24);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * A CT scanner: a gantry with a bore, on a plinth.
 *
 * The bore is the whole silhouette — a ring with a hole, which nothing else
 * on the field is. Level is built into the machine rather than shown as a
 * pip: a wider gantry, then a second ring, then a third with a lit aperture.
 * A player can see what a bay is worth from across the board, which is the
 * only reason to upgrade one.
 */
function drawScanner(
  ctx: CanvasRenderingContext2D,
  scanner: Scanner,
  cx: number, cy: number, r: number,
  P: Palette, theme: Theme,
) {
  const recoil = scanner.flash * r * 0.07;
  const hot = scanner.flash > 0.02;

  ctx.save();
  ctx.fillStyle = P.shadow;
  ctx.beginPath();
  ctx.ellipse(cx + r * 0.12, cy + r * 0.95, r * 0.95, r * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // The table slides out toward whoever is being imaged — a short stub, not
  // a handle. An earlier version ran it the full width of the machine and
  // the whole thing read as a magnifying glass.
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(scanner.angle);
  ctx.translate(-recoil, 0);
  ctx.fillStyle = theme.dark ? "#cbd5e1" : "#e2e8f0";
  roundPoly(ctx, rect(r * 0.82, 0, r * 0.95, r * 0.42), 2);
  ctx.fill();
  ctx.strokeStyle = theme.dark ? "#64748b" : "#94a3b8";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  // The base the gantry stands on, which does not turn with it.
  const g = ctx.createLinearGradient(cx - r * 0.7, cy, cx + r * 0.5, cy + r);
  g.addColorStop(0, P.steel[0]);
  g.addColorStop(1, P.steel[1]);
  roundPoly(ctx, rect(cx, cy + r * 0.86, r * 1.6, r * 0.42), 2.5);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = P.steelEdge;
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // The gantry: a thick ring with a dark bore. This is the silhouette.
  const gantryR = r * (0.84 + scanner.level * 0.045);
  const ring = ctx.createLinearGradient(cx - gantryR, cy - gantryR, cx + gantryR, cy + gantryR);
  ring.addColorStop(0, "#ffffff");
  ring.addColorStop(1, theme.dark ? "#8fa0b8" : "#c3cddc");
  ctx.beginPath();
  ctx.arc(cx, cy, gantryR, 0, Math.PI * 2);
  ctx.fillStyle = ring;
  ctx.fill();
  ctx.strokeStyle = theme.dark ? "#475569" : "#64748b";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  if (scanner.level >= 2) {
    ctx.beginPath();
    ctx.arc(cx, cy, gantryR * 0.8, 0, Math.PI * 2);
    ctx.strokeStyle = theme.dark ? "rgba(71,85,105,0.65)" : "rgba(148,163,184,0.75)";
    ctx.lineWidth = 1.3;
    ctx.stroke();
  }

  const boreR = gantryR * 0.5;
  const bore = ctx.createRadialGradient(cx, cy, 0, cx, cy, boreR);
  bore.addColorStop(0, hot ? "#f0f9ff" : (theme.dark ? "#0b1020" : "#475569"));
  bore.addColorStop(1, hot ? "#38bdf8" : (theme.dark ? "#020617" : "#1e293b"));
  ctx.beginPath();
  ctx.arc(cx, cy, boreR, 0, Math.PI * 2);
  ctx.fillStyle = bore;
  ctx.fill();

  if (scanner.level >= MAX_SCANNER_LEVEL) {
    ctx.beginPath();
    ctx.arc(cx, cy, gantryR + 2.5, 0, Math.PI * 2);
    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }

  // The warning lamp: lit while the tube is on, which is the one detail a
  // radiologist will check first.
  ctx.beginPath();
  ctx.arc(cx + gantryR * 0.72, cy - gantryR * 0.72, r * 0.11, 0, Math.PI * 2);
  ctx.fillStyle = hot ? "#fbbf24" : (theme.dark ? "#334155" : "#94a3b8");
  ctx.fill();
}

/** A patient: a figure walking in, or a trolley being pushed. */
function drawPatient(
  ctx: CanvasRenderingContext2D,
  p: Patient,
  X: (v: number) => number,
  Y: (v: number) => number,
  w: number,
  time: number,
  P: Palette,
  theme: Theme,
) {
  const at = pointAt(p.route, p.t);
  const cx = X(at.x);
  const cy = Y(at.y);
  const grow = Math.min(1, p.age * 4);
  const r = p.radius * w * (0.7 + 0.3 * grow);
  const spec = SPECIES[p.species];
  // Only the first half of the flash goes white. A full-length flash left
  // half the queue colourless at any given moment, and the colour is how the
  // player knows what is coming.
  const tint = p.hitFlash > 0.5 ? "#ffffff" : spec.fill;
  // A slight bob, so a queue of people is not a row of statues.
  const bob = spec.lying ? 0 : Math.sin(time * 5 + p.phase) * r * 0.1;

  ctx.save();
  ctx.globalAlpha = Math.min(1, p.age * 5);

  ctx.save();
  ctx.translate(r * 0.18, r * 0.3);
  ctx.fillStyle = P.shadow;
  ctx.beginPath();
  ctx.ellipse(cx, cy + r * 0.7, r * 0.8, r * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  if (spec.lying) {
    // Trolley: a horizontal bed with wheels and a head at one end.
    ctx.fillStyle = theme.dark ? "#475569" : "#94a3b8";
    for (const dx of [-0.55, 0.55]) {
      ctx.beginPath();
      ctx.arc(cx + dx * r, cy + r * 0.62, r * 0.17, 0, Math.PI * 2);
      ctx.fill();
    }
    roundPoly(ctx, rect(cx, cy + r * 0.08, r * 1.9, r * 0.6), r * 0.2);
    ctx.fillStyle = tint;
    ctx.fill();
    ctx.strokeStyle = theme.dark ? "rgba(2,6,23,0.5)" : "rgba(30,41,59,0.35)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx - r * 0.72, cy - r * 0.22, r * 0.32, 0, Math.PI * 2);
    ctx.fillStyle = "#fde8d7";
    ctx.fill();
  } else {
    // An upright figure: head over a rounded body.
    roundPoly(ctx, rect(cx, cy + r * 0.3 + bob, r * 0.95, r * 1.05), r * 0.35);
    ctx.fillStyle = tint;
    ctx.fill();
    ctx.strokeStyle = theme.dark ? "rgba(2,6,23,0.5)" : "rgba(30,41,59,0.3)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy - r * 0.5 + bob, r * 0.42, 0, Math.PI * 2);
    ctx.fillStyle = "#fde8d7";
    ctx.fill();
    ctx.strokeStyle = theme.dark ? "rgba(2,6,23,0.4)" : "rgba(30,41,59,0.25)";
    ctx.stroke();

    if (p.species === "urgent") {
      // The red cross of an emergency case.
      ctx.fillStyle = "#ffffff";
      const t = r * 0.13;
      ctx.fillRect(cx - t / 2, cy + r * 0.08 + bob, t, r * 0.46);
      ctx.fillRect(cx - r * 0.23, cy + r * 0.25 + bob, r * 0.46, t);
    } else if (p.species === "critical") {
      // A drip stand, which is what makes an ICU case read at a glance.
      ctx.strokeStyle = theme.dark ? "#cbd5e1" : "#64748b";
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(cx + r * 0.72, cy + r * 0.8);
      ctx.lineTo(cx + r * 0.72, cy - r * 1.05 + bob);
      ctx.stroke();
      ctx.fillStyle = "#bae6fd";
      roundPoly(ctx, rect(cx + r * 0.72, cy - r * 0.78 + bob, r * 0.3, r * 0.42), r * 0.1);
      ctx.fill();
    }
  }

  // Imaging outstanding, as an arc over the head.
  if (p.hp < p.maxHp) {
    const frac = Math.max(0, p.hp / p.maxHp);
    const from = -Math.PI * 0.88;
    const span = Math.PI * 0.76;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(cx, cy + bob, r * 1.35, from, from + span);
    ctx.strokeStyle = theme.dark ? "rgba(2,6,23,0.65)" : "rgba(255,255,255,0.75)";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy + bob, r * 1.35, from, from + span * frac);
    ctx.strokeStyle = frac > 0.5 ? "#22c55e" : frac > 0.25 ? "#f59e0b" : "#ef4444";
    ctx.lineWidth = 2.3;
    ctx.stroke();
  }
  ctx.restore();
}

/** The hospital at the centre, whose colour is its remaining capacity. */
function drawHospital(
  ctx: CanvasRenderingContext2D,
  world: World,
  X: (v: number) => number,
  Y: (v: number) => number,
  w: number,
  time: number,
  P: Palette,
  theme: Theme,
) {
  const bx = X(HOSPITAL.x);
  const by = Y(HOSPITAL.y);
  const br = Math.max(16, w * 0.052);
  const c = healthColour(world.integrity);
  const frac = Math.max(0, world.integrity / 100);
  const ok = world.integrity > 60;

  // Capacity ring: its length AND its colour are the integrity left, so the
  // state of the hospital is on the hospital and not only in the HUD.
  ctx.save();
  ctx.translate(bx, by);
  ctx.rotate(time * 0.3);
  ctx.beginPath();
  ctx.arc(0, 0, br * 1.62, 0, Math.PI * 2);
  ctx.strokeStyle = theme.dark ? "rgba(148,163,184,0.18)" : "rgba(71,85,105,0.16)";
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, br * 1.62, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
  ctx.strokeStyle = c.main;
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.restore();

  // A slow pulse while healthy, a fast one when the department is drowning.
  const pulse = 1 + (ok ? 0.03 : 0.085) * Math.sin(time * (ok ? 2 : 7));
  ctx.beginPath();
  ctx.arc(bx, by, br * 2.15 * pulse, 0, Math.PI * 2);
  const halo = ctx.createRadialGradient(bx, by, br * 0.6, bx, by, br * 2.15 * pulse);
  halo.addColorStop(0, `rgba(${c.glow},${ok ? 0.17 : 0.3})`);
  halo.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = halo;
  ctx.fill();

  const bw = br * 1.95;
  const bh = br * 1.6;

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
  ctx.strokeStyle = c.deep;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Roof band in the health colour: green, then amber, then red.
  roundPoly(ctx, [
    [bx - bw / 2, by - bh / 2], [bx + bw / 2, by - bh / 2],
    [bx + bw / 2, by - bh / 2 + bh * 0.28], [bx - bw / 2, by - bh / 2 + bh * 0.28],
  ], 3);
  ctx.fillStyle = c.main;
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  const ct = bh * 0.085;
  ctx.fillRect(bx - ct / 2, by - bh * 0.44, ct, bh * 0.2);
  ctx.fillRect(bx - bh * 0.1, by - bh * 0.4, bh * 0.2, ct);

  // Windows: they go out as the department fills up, which is a second,
  // quieter reading of the same number.
  const lit = Math.ceil(frac * 4);
  const winW = bw * 0.15;
  const winH = bh * 0.16;
  let n = 0;
  for (let row = 0; row < 2; row++) {
    for (let col = -1; col <= 1; col++) {
      if (row === 1 && col === 0) continue;
      const on = n < lit;
      n += 1;
      ctx.fillStyle = on ? "rgba(251,191,36,0.92)" : (theme.dark ? "rgba(71,85,105,0.55)" : "rgba(148,163,184,0.5)");
      roundPoly(ctx, rect(bx + col * bw * 0.29, by - bh * 0.05 + row * bh * 0.28, winW, winH), 1.5);
      ctx.fill();
    }
  }
  ctx.fillStyle = c.deep;
  roundPoly(ctx, [
    [bx - bw * 0.09, by + bh * 0.5], [bx + bw * 0.09, by + bh * 0.5],
    [bx + bw * 0.09, by + bh * 0.14], [bx - bw * 0.09, by + bh * 0.14],
  ], 3);
  ctx.fill();

  ctx.strokeStyle = theme.dark ? "#94a3b8" : "#64748b";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(bx + bw * 0.37, by - bh * 0.5);
  ctx.lineTo(bx + bw * 0.37, by - bh * 0.84);
  ctx.stroke();
  const blink = 0.45 + 0.55 * Math.abs(Math.sin(time * (ok ? 2.4 : 6)));
  ctx.fillStyle = `rgba(${c.glow},${blink})`;
  ctx.beginPath();
  ctx.arc(bx + bw * 0.37, by - bh * 0.88, 2.4, 0, Math.PI * 2);
  ctx.fill();
}
