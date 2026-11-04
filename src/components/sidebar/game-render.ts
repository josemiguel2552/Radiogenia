/**
 * Drawing Radiology Defense.
 *
 * Separate from the simulation so that what the world IS and what it LOOKS
 * like can change independently, and so the whole of the canvas work sits in
 * one place instead of spreading through a React component.
 *
 * The first version drew everything as a gradient circle: enemies, turrets
 * and base were the same shape in three colours, which is exactly what makes
 * a small game look cheap. What is here instead is built on three rules.
 *
 *  · SILHOUETTE FIRST. A nodule is spiculated, a mass is lobulated, a
 *    calcified one is round with bright specks, a turret is angular and a
 *    base is a building. You can tell them apart with the colour removed,
 *    which is the test a readable game has to pass anyway on a phone.
 *  · LIGHT HAS A DIRECTION. One light from the top-left: rim on the near
 *    edge, shadow cast on the far one. Gradients that run every which way
 *    are what reads as "clip art".
 *  · EVERY EVENT IS FELT. Firing flashes and recoils, a death pops, a
 *    breach shakes the frame and throws a number. None of it changes the
 *    simulation; all of it is why a tap feels like it landed.
 */

import { MAX_TURRET_LEVEL, TURRET_COST } from "@/lib/game-score";
import { PATH, SLOTS, TURRET_STATS, World, pointAt, type Enemy } from "./game-engine";

export interface Theme {
  dark: boolean;
  brand: string;
}

interface Palette {
  skyTop: string;
  skyBottom: string;
  grid: string;
  laneFill: string;
  laneEdge: string;
  laneFlow: string;
  ink: string;
  plinth: [string, string];
  plinthEdge: string;
  vignette: string;
}

function palette(dark: boolean): Palette {
  return dark
    ? {
        skyTop: "#0a0f1f", skyBottom: "#161d33",
        grid: "rgba(148,163,184,0.055)",
        laneFill: "rgba(79,70,229,0.16)", laneEdge: "rgba(129,140,248,0.30)",
        laneFlow: "rgba(199,210,254,0.55)",
        ink: "#e2e8f0",
        plinth: ["#6366f1", "#27215e"], plinthEdge: "#c7d2fe",
        vignette: "rgba(2,6,23,0.55)",
      }
    : {
        skyTop: "#f1f5ff", skyBottom: "#dbe3f5",
        grid: "rgba(71,85,105,0.07)",
        laneFill: "rgba(99,102,241,0.13)", laneEdge: "rgba(79,70,229,0.26)",
        laneFlow: "rgba(67,56,202,0.5)",
        ink: "#1e293b",
        plinth: ["#a5b4fc", "#4338ca"], plinthEdge: "#312e81",
        vignette: "rgba(100,116,139,0.20)",
      };
}

/** Enemy colours: [rim, body, shadow]. */
const KIND_COLOURS: Record<string, [string, string, string]> = {
  nodule: ["#bae6fd", "#38bdf8", "#0369a1"],
  mass: ["#fecdd3", "#fb7185", "#9f1239"],
  calcified: ["#ddd6fe", "#a78bfa", "#5b21b6"],
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

/** The closed outline of an enemy, breathing slightly as it walks. */
function enemyPath(ctx: CanvasRenderingContext2D, e: Enemy, cx: number, cy: number, r: number, time: number) {
  const N = e.shape.length;
  ctx.beginPath();
  for (let i = 0; i <= N; i++) {
    const idx = i % N;
    const a = (idx / N) * Math.PI * 2;
    const breathe = 1 + 0.03 * Math.sin(time * 2.2 + e.phase + idx * 0.6);
    const rr = r * (1 + e.shape[idx]) * breathe;
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
  // A breach shakes the frame. Decaying and sub-pixel small, so it registers
  // as impact rather than as a bug.
  if (world.shake > 0) {
    const m = world.shake * 7;
    ctx.translate((Math.random() - 0.5) * m, (Math.random() - 0.5) * m);
  }

  /* ── Sky ──────────────────────────────────────────────────────────── */
  const bg = ctx.createLinearGradient(0, 0, w * 0.35, h);
  bg.addColorStop(0, P.skyTop);
  bg.addColorStop(1, P.skyBottom);
  ctx.fillStyle = bg;
  ctx.fillRect(-20, -20, w + 40, h + 40);

  ctx.strokeStyle = P.grid;
  ctx.lineWidth = 1;
  const cell = Math.max(26, w / 11);
  for (let x = cell; x < w; x += cell) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  for (let y = cell; y < h; y += cell) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

  /* ── The lane ─────────────────────────────────────────────────────── */
  const lane = () => {
    ctx.beginPath();
    ctx.moveTo(X(PATH[0].x), Y(PATH[0].y));
    for (const p of PATH.slice(1)) ctx.lineTo(X(p.x), Y(p.y));
  };
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const laneW = Math.max(20, w * 0.095);
  lane();
  ctx.strokeStyle = P.laneEdge;
  ctx.lineWidth = laneW + 3;
  ctx.stroke();
  lane();
  ctx.strokeStyle = P.laneFill;
  ctx.lineWidth = laneW;
  ctx.stroke();

  // Flow lines running toward the base: the lane says which way is downhill,
  // so a new player knows where the enemies are going before any arrives.
  lane();
  ctx.strokeStyle = P.laneFlow;
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 16]);
  ctx.lineDashOffset = -time * 42;
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.lineDashOffset = 0;

  /* ── Turret slots ─────────────────────────────────────────────────── */
  SLOTS.forEach((s, i) => {
    const turret = world.turretAt(i);
    const cx = X(s.x);
    const cy = Y(s.y);
    const r = Math.max(12, w * 0.038);

    if (selected === i) {
      const stats = TURRET_STATS[(turret?.level ?? 1) - 1];
      ctx.beginPath();
      ctx.arc(cx, cy, stats.range * w, 0, Math.PI * 2);
      ctx.fillStyle = theme.dark ? "rgba(129,140,248,0.09)" : "rgba(79,70,229,0.07)";
      ctx.fill();
      ctx.strokeStyle = theme.dark ? "rgba(165,180,252,0.5)" : "rgba(79,70,229,0.45)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 5]);
      ctx.lineDashOffset = -time * 14;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.lineDashOffset = 0;
    }

    if (!turret) {
      // An empty slot shows whether it can be afforded, so the decision is
      // made on the battlefield rather than by reading the HUD.
      const can = credits >= TURRET_COST;
      const pulse = can ? 1 + 0.06 * Math.sin(time * 3 + i) : 1;
      ctx.save();
      ctx.globalAlpha = can ? 0.95 : 0.4;
      roundPoly(ctx, polygon(cx, cy, r * 0.72 * pulse, 6, -Math.PI / 2), 3);
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = can ? "#34d399" : (theme.dark ? "#64748b" : "#94a3b8");
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.setLineDash([]);
      if (can) {
        ctx.strokeStyle = "#34d399";
        ctx.lineWidth = 2.4;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(cx - r * 0.26, cy); ctx.lineTo(cx + r * 0.26, cy);
        ctx.moveTo(cx, cy - r * 0.26); ctx.lineTo(cx, cy + r * 0.26);
        ctx.stroke();
      }
      ctx.restore();
      return;
    }

    /* A turret: cast shadow, angular plinth, rotating head, barrel. */
    const recoil = turret.flash * r * 0.16;
    ctx.save();
    ctx.fillStyle = theme.dark ? "rgba(2,6,23,0.5)" : "rgba(30,41,59,0.16)";
    roundPoly(ctx, polygon(cx + r * 0.16, cy + r * 0.2, r, 6, -Math.PI / 2), 4);
    ctx.fill();
    ctx.restore();

    // Barrel first, so the plinth overlaps its root.
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(turret.angle);
    ctx.translate(-recoil, 0);
    const barrelL = r * (1.55 + turret.level * 0.16);
    ctx.fillStyle = theme.dark ? "#334155" : "#475569";
    roundPoly(ctx, [
      [r * 0.1, -r * 0.19], [barrelL, -r * 0.15],
      [barrelL, r * 0.15], [r * 0.1, r * 0.19],
    ], 2.5);
    ctx.fill();
    // A collar part-way along, so the barrel reads as machined.
    ctx.fillStyle = theme.dark ? "#64748b" : "#94a3b8";
    ctx.fillRect(barrelL * 0.62, -r * 0.23, r * 0.16, r * 0.46);

    if (turret.flash > 0.02) {
      ctx.globalAlpha = turret.flash;
      const fl = ctx.createRadialGradient(barrelL + r * 0.1, 0, 0, barrelL + r * 0.1, 0, r * 0.62);
      fl.addColorStop(0, "#fffbeb");
      fl.addColorStop(0.4, "#fbbf24");
      fl.addColorStop(1, "rgba(251,191,36,0)");
      ctx.fillStyle = fl;
      ctx.beginPath();
      ctx.arc(barrelL + r * 0.1, 0, r * 0.62, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.restore();

    const g = ctx.createLinearGradient(cx - r * 0.6, cy - r, cx + r * 0.4, cy + r);
    g.addColorStop(0, P.plinth[0]);
    g.addColorStop(1, P.plinth[1]);
    roundPoly(ctx, polygon(cx, cy, r, 6, -Math.PI / 2), 4);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = P.plinthEdge;
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // Rim light along the top-left edge: one light source, consistently.
    ctx.save();
    roundPoly(ctx, polygon(cx, cy, r, 6, -Math.PI / 2), 4);
    ctx.clip();
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = 2.5;
    roundPoly(ctx, polygon(cx - 1.5, cy - 2, r, 6, -Math.PI / 2), 4);
    ctx.stroke();
    ctx.restore();

    // Level as chevrons on the plinth, legible in both themes.
    ctx.strokeStyle = theme.dark ? "rgba(224,231,255,0.95)" : "rgba(15,23,42,0.75)";
    ctx.lineWidth = 1.8;
    ctx.lineCap = "round";
    for (let p = 0; p < turret.level; p++) {
      const yy = cy + r * 0.52 - p * r * 0.26;
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.26, yy);
      ctx.lineTo(cx, yy - r * 0.16);
      ctx.lineTo(cx + r * 0.26, yy);
      ctx.stroke();
    }

    if (turret.level >= MAX_TURRET_LEVEL) {
      roundPoly(ctx, polygon(cx, cy, r + 3.5, 6, -Math.PI / 2), 4);
      ctx.strokeStyle = "#fbbf24";
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }
  });

  /* ── Shots ────────────────────────────────────────────────────────── */
  for (const s of world.shots) {
    const a = Math.max(0, s.life / 0.14);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.lineCap = "round";
    ctx.strokeStyle = theme.dark ? "rgba(129,140,248,0.35)" : "rgba(79,70,229,0.28)";
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
    const [rim, body, shade] = KIND_COLOURS[e.kind] || KIND_COLOURS.nodule;

    ctx.save();
    ctx.globalAlpha = Math.min(1, e.age * 5);

    // Cast shadow, down-right, matching the one light.
    ctx.save();
    ctx.translate(r * 0.2, r * 0.26);
    enemyPath(ctx, e, cx, cy, r, time);
    ctx.fillStyle = theme.dark ? "rgba(2,6,23,0.55)" : "rgba(30,41,59,0.14)";
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

    // A calcified enemy wears its name: bright internal specks.
    if (e.kind === "calcified") {
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      for (const d of [[-0.32, -0.12], [0.26, 0.18], [0.04, -0.38], [-0.1, 0.3]]) {
        ctx.beginPath();
        ctx.arc(cx + d[0] * r, cy + d[1] * r, r * 0.11, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Health as an arc hugging the shape, instead of a floating bar.
    if (e.hp < e.maxHp) {
      const frac = Math.max(0, e.hp / e.maxHp);
      const from = -Math.PI * 0.86;
      const span = Math.PI * 0.72;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(cx, cy, r * 1.22, from, from + span);
      ctx.strokeStyle = theme.dark ? "rgba(2,6,23,0.65)" : "rgba(255,255,255,0.7)";
      ctx.lineWidth = 3.4;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, r * 1.22, from, from + span * frac);
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

  /* ── The base ─────────────────────────────────────────────────────── */
  const base = pointAt(1);
  const bx = X(base.x);
  const by = Y(base.y);
  const br = Math.max(17, w * 0.058);
  const ok = world.integrity > 40;
  const accent = ok ? "#0ea5e9" : "#f43f5e";
  const accentDeep = ok ? "#075985" : "#9f1239";

  // Shield ring: a rotating arc whose length is the integrity left, so the
  // state of the base is on the base and not only in the HUD.
  const frac = Math.max(0, world.integrity / 100);
  ctx.save();
  ctx.translate(bx, by);
  ctx.rotate(time * 0.35);
  ctx.beginPath();
  ctx.arc(0, 0, br * 1.55, 0, Math.PI * 2);
  ctx.strokeStyle = theme.dark ? "rgba(148,163,184,0.18)" : "rgba(71,85,105,0.16)";
  ctx.lineWidth = 3.5;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, br * 1.55, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 3.5;
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.restore();

  // A slow pulse while healthy, a fast one when the base is in trouble.
  const pulse = 1 + (ok ? 0.03 : 0.08) * Math.sin(time * (ok ? 2 : 7));
  ctx.beginPath();
  ctx.arc(bx, by, br * 2.0 * pulse, 0, Math.PI * 2);
  const halo = ctx.createRadialGradient(bx, by, br * 0.6, bx, by, br * 2.0 * pulse);
  halo.addColorStop(0, ok ? "rgba(14,165,233,0.22)" : "rgba(244,63,94,0.3)");
  halo.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = halo;
  ctx.fill();

  // The building: a squat block with a roof, not another sphere.
  const bw = br * 1.75;
  const bh = br * 1.5;
  ctx.save();
  ctx.fillStyle = theme.dark ? "rgba(2,6,23,0.5)" : "rgba(30,41,59,0.18)";
  roundPoly(ctx, [
    [bx - bw / 2 + 3, by - bh / 2 + 4], [bx + bw / 2 + 3, by - bh / 2 + 4],
    [bx + bw / 2 + 3, by + bh / 2 + 4], [bx - bw / 2 + 3, by + bh / 2 + 4],
  ], 4);
  ctx.fill();
  ctx.restore();

  const wall = ctx.createLinearGradient(bx - bw / 2, by - bh / 2, bx + bw / 2, by + bh / 2);
  wall.addColorStop(0, "#f8fafc");
  wall.addColorStop(1, theme.dark ? "#cbd5e1" : "#e2e8f0");
  roundPoly(ctx, [
    [bx - bw / 2, by - bh / 2], [bx + bw / 2, by - bh / 2],
    [bx + bw / 2, by + bh / 2], [bx - bw / 2, by + bh / 2],
  ], 4);
  ctx.fillStyle = wall;
  ctx.fill();
  ctx.strokeStyle = accentDeep;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Roof band in the accent colour, which is how the damage state reads.
  roundPoly(ctx, [
    [bx - bw / 2, by - bh / 2], [bx + bw / 2, by - bh / 2],
    [bx + bw / 2, by - bh / 2 + bh * 0.3], [bx - bw / 2, by - bh / 2 + bh * 0.3],
  ], 3);
  ctx.fillStyle = accent;
  ctx.fill();

  // The cross, and two lit windows so it reads as somewhere with people in it.
  ctx.fillStyle = "#ffffff";
  const ct = bh * 0.1;
  ctx.fillRect(bx - ct / 2, by - bh * 0.42, ct, bh * 0.2);
  ctx.fillRect(bx - bh * 0.1, by - bh * 0.37, bh * 0.2, ct);
  ctx.fillStyle = ok ? "rgba(251,191,36,0.9)" : "rgba(148,163,184,0.6)";
  for (const dx of [-0.26, 0.26]) {
    ctx.fillRect(bx + dx * bw - bw * 0.07, by + bh * 0.06, bw * 0.14, bh * 0.2);
  }

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

  /* ── Vignette ─────────────────────────────────────────────────────── */
  const vig = ctx.createRadialGradient(w / 2, h * 0.45, Math.min(w, h) * 0.32, w / 2, h * 0.5, Math.max(w, h) * 0.78);
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, P.vignette);
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);

  /* ── Wave banner ──────────────────────────────────────────────────── */
  if (world.banner > 0) {
    const k = world.banner > 1.4 ? (1.8 - world.banner) / 0.4 : Math.min(1, world.banner / 0.6);
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, k));
    ctx.translate(w / 2, h * 0.32);
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

    // A rule under the number, widening as the banner lands.
    ctx.globalAlpha *= 0.8;
    ctx.strokeStyle = theme.dark ? "#818cf8" : "#4f46e5";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-numSize * 0.5 * k, numSize * 0.52);
    ctx.lineTo(numSize * 0.5 * k, numSize * 0.52);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}
