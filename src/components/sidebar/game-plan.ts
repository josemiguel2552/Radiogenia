/**
 * Drawing the department.
 *
 * A floor plan seen from above: a corridor down the middle and eight rooms
 * opening off it. An unbuilt room is a dashed plot with its price on it; a
 * built one is lit, named and working. The whole point is that the thing
 * answers build is ON SCREEN and grows — the previous attempts spent the
 * player's points on a world they were only watching.
 *
 * No React and no DOM beyond the canvas, so what the department IS and what
 * it looks like stay separable, and sixty frames a second never go through
 * React's render path.
 */

import { BUILDINGS, type Building, type Glyph } from "@/lib/game-build";

export interface WaveView {
  n: number;
  demand: number;
  /** 0..1 through the arrival animation. */
  progress: number;
  /** Whether the department is holding it. */
  held: boolean;
}

export interface PlanView {
  built: readonly Glyph[];
  points: number;
  selected: Glyph | null;
  wave: WaveView | null;
  /** Room names, since the renderer carries no dictionary of its own. */
  labels: Record<Glyph, string>;
  time: number;
  dark: boolean;
}

interface Palette {
  floor: [string, string];
  grid: string;
  corridor: string;
  corridorEdge: string;
  plot: string;
  plotInk: string;
  wall: [string, string];
  wallEdge: string;
  roomInk: string;
  ink: string;
  shadow: string;
}

function palette(dark: boolean): Palette {
  return dark
    ? {
        floor: ["#0a1020", "#121a2e"],
        grid: "rgba(148,163,184,0.055)",
        corridor: "#1b2340", corridorEdge: "rgba(165,180,252,0.26)",
        plot: "rgba(148,163,184,0.42)", plotInk: "#94a3b8",
        wall: ["#e2e8f0", "#aebbd0"], wallEdge: "#475569",
        roomInk: "#1e293b",
        ink: "#e2e8f0",
        shadow: "rgba(2,6,23,0.55)",
      }
    : {
        floor: ["#f3f6fd", "#dde4f1"],
        grid: "rgba(71,85,105,0.06)",
        corridor: "#e5eaf7", corridorEdge: "rgba(79,70,229,0.22)",
        plot: "rgba(100,116,139,0.45)", plotInk: "#64748b",
        wall: ["#ffffff", "#dbe2ee"], wallEdge: "#64748b",
        roomInk: "#1e293b",
        ink: "#1e293b",
        shadow: "rgba(30,41,59,0.16)",
      };
}

/** Each room's accent, so the plan is not eight grey boxes. */
const ACCENT: Record<Glyph, string> = {
  xray: "#38bdf8",
  us: "#2dd4bf",
  report: "#a78bfa",
  mammo: "#f472b6",
  ct: "#60a5fa",
  pacs: "#fbbf24",
  ir: "#fb7185",
  mri: "#34d399",
};

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* ── Room icons ──────────────────────────────────────────────────────── */

/**
 * A schematic for each room.
 *
 * Drawn rather than lettered: a gantry ring, a C-magnet, a probe. At this
 * size an icon is read in a glance where a word has to be spelled out, and
 * the plan has eight of them competing at once.
 */
function glyph(ctx: CanvasRenderingContext2D, id: Glyph, cx: number, cy: number, r: number, colour: string) {
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.fillStyle = colour;
  ctx.lineWidth = Math.max(1.6, r * 0.17);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  switch (id) {
    case "ct": {
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.78, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.3, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - r, cy + r * 0.95); ctx.lineTo(cx + r, cy + r * 0.95); ctx.stroke();
      break;
    }
    case "mri": {
      // A C-shaped bore: the opening is what tells it from the CT.
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.8, Math.PI * 0.32, Math.PI * 1.68); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.32, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - r, cy + r * 0.95); ctx.lineTo(cx + r, cy + r * 0.95); ctx.stroke();
      break;
    }
    case "us": {
      // A probe with its beam fanning out.
      roundRect(ctx, cx - r * 0.28, cy - r, r * 0.56, r * 0.8, r * 0.14); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.28, cy - r * 0.2);
      ctx.lineTo(cx - r * 0.78, cy + r);
      ctx.lineTo(cx + r * 0.78, cy + r);
      ctx.lineTo(cx + r * 0.28, cy - r * 0.2);
      ctx.closePath();
      ctx.globalAlpha = 0.35; ctx.fill(); ctx.globalAlpha = 1;
      break;
    }
    case "xray": {
      // A tube over a plate.
      ctx.beginPath(); ctx.arc(cx, cy - r * 0.55, r * 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx, cy - r * 0.25);
      ctx.lineTo(cx - r * 0.7, cy + r * 0.6);
      ctx.moveTo(cx, cy - r * 0.25);
      ctx.lineTo(cx + r * 0.7, cy + r * 0.6);
      ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - r * 0.95, cy + r * 0.85); ctx.lineTo(cx + r * 0.95, cy + r * 0.85); ctx.stroke();
      break;
    }
    case "mammo": {
      // Two compression paddles.
      roundRect(ctx, cx - r * 0.85, cy - r * 0.7, r * 1.7, r * 0.3, r * 0.1); ctx.fill();
      roundRect(ctx, cx - r * 0.85, cy + r * 0.25, r * 1.7, r * 0.3, r * 0.1); ctx.fill();
      ctx.beginPath(); ctx.moveTo(cx + r * 0.95, cy - r * 0.9); ctx.lineTo(cx + r * 0.95, cy + r * 0.75); ctx.stroke();
      break;
    }
    case "report": {
      // Two stacked monitors: the reading room.
      roundRect(ctx, cx - r * 0.95, cy - r * 0.8, r * 0.85, r * 1.2, r * 0.12); ctx.stroke();
      roundRect(ctx, cx + r * 0.1, cy - r * 0.8, r * 0.85, r * 1.2, r * 0.12); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - r * 0.95, cy + r * 0.8); ctx.lineTo(cx + r * 0.95, cy + r * 0.8); ctx.stroke();
      break;
    }
    case "pacs": {
      // Stacked drives with a link.
      for (let i = 0; i < 3; i++) {
        roundRect(ctx, cx - r * 0.8, cy - r * 0.9 + i * r * 0.62, r * 1.6, r * 0.45, r * 0.1);
        ctx.stroke();
        ctx.beginPath(); ctx.arc(cx + r * 0.5, cy - r * 0.68 + i * r * 0.62, r * 0.09, 0, Math.PI * 2); ctx.fill();
      }
      break;
    }
    case "ir": {
      // A needle on a track.
      ctx.beginPath(); ctx.moveTo(cx - r * 0.8, cy - r * 0.8); ctx.lineTo(cx + r * 0.5, cy + r * 0.5); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + r * 0.5, cy + r * 0.5);
      ctx.lineTo(cx + r * 0.9, cy + r * 0.9);
      ctx.lineTo(cx + r * 0.55, cy + r * 0.95);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath(); ctx.arc(cx - r * 0.85, cy + r * 0.75, r * 0.22, 0, Math.PI * 2); ctx.stroke();
      break;
    }
  }
  ctx.restore();
}

/* ── The plan ────────────────────────────────────────────────────────── */

export function drawPlan(ctx: CanvasRenderingContext2D, view: PlanView, w: number, h: number) {
  const P = palette(view.dark);
  const X = (v: number) => v * w;
  const Y = (v: number) => v * h;

  const bg = ctx.createLinearGradient(0, 0, w * 0.4, h);
  bg.addColorStop(0, P.floor[0]);
  bg.addColorStop(1, P.floor[1]);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const cell = Math.max(14, w / 18);
  ctx.strokeStyle = P.grid;
  ctx.lineWidth = 1;
  for (let i = 1; i * cell < w; i++) { ctx.beginPath(); ctx.moveTo(i * cell, 0); ctx.lineTo(i * cell, h); ctx.stroke(); }
  for (let i = 1; i * cell < h; i++) { ctx.beginPath(); ctx.moveTo(0, i * cell); ctx.lineTo(w, i * cell); ctx.stroke(); }

  /* The corridor every room opens onto. */
  const cx0 = X(0.445);
  const cw = X(0.11);
  ctx.fillStyle = P.corridor;
  ctx.fillRect(cx0, 0, cw, h);
  ctx.strokeStyle = P.corridorEdge;
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(cx0, 0); ctx.lineTo(cx0, h); ctx.moveTo(cx0 + cw, 0); ctx.lineTo(cx0 + cw, h); ctx.stroke();

  // A dashed centre line, flowing while a wave is arriving.
  ctx.strokeStyle = P.corridorEdge;
  ctx.setLineDash([6, 9]);
  ctx.lineDashOffset = view.wave ? -view.time * 55 : 0;
  ctx.beginPath(); ctx.moveTo(cx0 + cw / 2, 0); ctx.lineTo(cx0 + cw / 2, h); ctx.stroke();
  ctx.setLineDash([]);
  ctx.lineDashOffset = 0;

  /* The rooms. */
  for (const b of BUILDINGS) {
    const built = view.built.includes(b.id);
    drawRoom(ctx, b, built, view, X, Y, P);
  }

  /* A wave in progress: patients coming down the corridor. */
  if (view.wave) drawWave(ctx, view, w, h, cx0, cw);
}

function drawRoom(
  ctx: CanvasRenderingContext2D,
  b: Building,
  built: boolean,
  view: PlanView,
  X: (v: number) => number,
  Y: (v: number) => number,
  P: Palette,
) {
  const x = X(b.plot.x);
  const y = Y(b.plot.y);
  const w = X(b.plot.w);
  const h = Y(b.plot.h);
  const accent = ACCENT[b.id];
  const label = view.labels[b.id] ?? b.id;
  const selected = view.selected === b.id;

  if (!built) {
    // A plot: dashed, with what it costs and what it would absorb.
    const affordable = view.points >= b.cost;
    ctx.save();
    ctx.globalAlpha = affordable ? 1 : 0.5;
    roundRect(ctx, x, y, w, h, 5);
    ctx.fillStyle = affordable ? `${accent}14` : "rgba(100,116,139,0.06)";
    ctx.fill();
    ctx.setLineDash([5, 4]);
    ctx.lineWidth = selected ? 2.4 : 1.6;
    ctx.strokeStyle = selected ? accent : (affordable ? accent : P.plot);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.globalAlpha = affordable ? 0.5 : 0.3;
    glyph(ctx, b.id, x + w * 0.5, y + h * 0.4, Math.min(w, h) * 0.2, affordable ? accent : P.plotInk);
    ctx.globalAlpha = 1;

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `700 ${Math.round(Math.max(9, h * 0.17))}px system-ui, sans-serif`;
    ctx.fillStyle = affordable ? accent : P.plotInk;
    ctx.fillText(`${b.cost}`, x + w * 0.5, y + h * 0.78);
    ctx.restore();
    return;
  }

  /* Built: a lit room with a name plate. */
  ctx.save();
  ctx.fillStyle = P.shadow;
  roundRect(ctx, x + 2, y + 3, w, h, 5);
  ctx.fill();
  ctx.restore();

  const wall = ctx.createLinearGradient(x, y, x + w, y + h);
  wall.addColorStop(0, P.wall[0]);
  wall.addColorStop(1, P.wall[1]);
  roundRect(ctx, x, y, w, h, 5);
  ctx.fillStyle = wall;
  ctx.fill();
  ctx.strokeStyle = selected ? accent : P.wallEdge;
  ctx.lineWidth = selected ? 2.4 : 1.2;
  ctx.stroke();

  // Header band in the room's own colour.
  ctx.save();
  roundRect(ctx, x, y, w, h, 5);
  ctx.clip();
  ctx.fillStyle = accent;
  ctx.fillRect(x, y, w, h * 0.26);
  ctx.restore();

  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.font = `700 ${Math.round(Math.max(8, h * 0.15))}px system-ui, sans-serif`;
  ctx.fillStyle = "#0f172a";
  ctx.fillText(label.toUpperCase(), x + 5, y + h * 0.135);

  glyph(ctx, b.id, x + w * 0.5, y + h * 0.62, Math.min(w, h) * 0.24, accent);

  // Capacity, bottom-right, because it is what a wave will ask for.
  ctx.textAlign = "right";
  ctx.font = `700 ${Math.round(Math.max(8, h * 0.15))}px system-ui, sans-serif`;
  ctx.fillStyle = P.roomInk;
  ctx.globalAlpha = 0.65;
  ctx.fillText(`${b.capacity}`, x + w - 5, y + h * 0.88);
  ctx.globalAlpha = 1;
}

/** Patients coming down the corridor while a wave is resolving. */
function drawWave(
  ctx: CanvasRenderingContext2D,
  view: PlanView,
  w: number,
  h: number,
  cx0: number,
  cw: number,
) {
  const wave = view.wave!;
  const n = Math.min(30, Math.max(10, Math.round(wave.demand / 6)));
  const held = wave.held;

  for (let i = 0; i < n; i++) {
    // Each dot starts a little later than the one before, so they arrive as
    // a queue rather than a block.
    const t = (wave.progress * 1.5) - (i / n) * 0.5;
    if (t <= 0) continue;
    const share = (i + 0.5) / n;
    // Those within capacity peel off into a room; the overflow carries on
    // past the end of the corridor, which is the whole story of a failure.
    const absorbed = held || share <= 0.999 * (1 - Math.max(0, (wave.demand - capacityShown(view)) / wave.demand));
    const travel = Math.min(1, t);
    const exit = absorbed ? 0.35 + (i % 4) * 0.16 : 1.05;
    const y = travel * Y_END(h, exit);
    const x = cx0 + cw * (0.3 + ((i * 37) % 10) / 14);

    ctx.beginPath();
    ctx.arc(x, y, Math.max(3.2, w * 0.013), 0, Math.PI * 2);
    ctx.fillStyle = absorbed ? "#38bdf8" : "#f43f5e";
    ctx.globalAlpha = travel >= 1 && absorbed ? 0.25 : 1;
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // The verdict, once the queue has gone through.
  if (wave.progress > 0.85) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, (wave.progress - 0.85) / 0.15);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `900 ${Math.round(Math.max(18, w * 0.07))}px system-ui, sans-serif`;
    ctx.lineWidth = 5;
    ctx.strokeStyle = view.dark ? "rgba(2,6,23,0.85)" : "rgba(255,255,255,0.92)";
    const text = `${held ? "✓" : "✕"} ${wave.demand}`;
    ctx.strokeText(text, w / 2, h / 2);
    ctx.fillStyle = held ? "#22c55e" : "#ef4444";
    ctx.fillText(text, w / 2, h / 2);
    ctx.restore();
  }
}

function Y_END(h: number, frac: number): number {
  return h * frac;
}

function capacityShown(view: PlanView): number {
  return BUILDINGS.filter((b) => view.built.includes(b.id)).reduce((n, b) => n + b.capacity, 0);
}
