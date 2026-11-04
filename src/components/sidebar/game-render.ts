/**
 * Drawing Radiology Defense.
 *
 * Separate from the simulation so that what the world IS and what it LOOKS
 * like can change independently — and so the whole of the canvas work sits in
 * one place instead of spreading through a React component.
 *
 * The palette is resolved from the page's own CSS variables at draw time, so
 * the battlefield follows the app into dark mode instead of carrying a second
 * set of colours that someone has to remember to update.
 */

import { MAX_TURRET_LEVEL, TURRET_COST } from "@/lib/game-score";
import { PATH, SLOTS, TURRET_STATS, World, pointAt } from "./game-engine";

export interface Theme {
  dark: boolean;
  brand: string;
}

const KIND_FILL: Record<string, [string, string]> = {
  nodule: ["#7dd3fc", "#0284c7"],
  mass: ["#fda4af", "#be123c"],
  calcified: ["#c4b5fd", "#6d28d9"],
};

export function draw(
  ctx: CanvasRenderingContext2D,
  world: World,
  w: number,
  h: number,
  theme: Theme,
  selected: number | null,
  credits: number,
) {
  const X = (v: number) => v * w;
  const Y = (v: number) => v * h;
  ctx.clearRect(0, 0, w, h);

  /* ── Ground ─────────────────────────────────────────────────────── */
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  if (theme.dark) {
    bg.addColorStop(0, "#0b1020");
    bg.addColorStop(1, "#131a2e");
  } else {
    bg.addColorStop(0, "#eef2ff");
    bg.addColorStop(1, "#e2e8f0");
  }
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // A faint grid, so movement reads against something.
  ctx.strokeStyle = theme.dark ? "rgba(148,163,184,0.07)" : "rgba(100,116,139,0.10)";
  ctx.lineWidth = 1;
  for (let i = 1; i < 8; i++) {
    ctx.beginPath(); ctx.moveTo((w / 8) * i, 0); ctx.lineTo((w / 8) * i, h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, (h / 8) * i); ctx.lineTo(w, (h / 8) * i); ctx.stroke();
  }

  /* ── The lane ───────────────────────────────────────────────────── */
  const lane = () => {
    ctx.beginPath();
    ctx.moveTo(X(PATH[0].x), Y(PATH[0].y));
    for (const p of PATH.slice(1)) ctx.lineTo(X(p.x), Y(p.y));
  };
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  lane();
  ctx.strokeStyle = theme.dark ? "rgba(99,102,241,0.18)" : "rgba(99,102,241,0.16)";
  ctx.lineWidth = Math.max(18, w * 0.085);
  ctx.stroke();
  lane();
  ctx.strokeStyle = theme.dark ? "rgba(129,140,248,0.35)" : "rgba(79,70,229,0.28)";
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 7]);
  ctx.stroke();
  ctx.setLineDash([]);

  /* ── Turret slots ───────────────────────────────────────────────── */
  SLOTS.forEach((s, i) => {
    const turret = world.turretAt(i);
    const cx = X(s.x);
    const cy = Y(s.y);
    const r = Math.max(11, w * 0.036);

    if (selected === i) {
      const stats = TURRET_STATS[(turret?.level ?? 1) - 1];
      ctx.beginPath();
      ctx.arc(cx, cy, stats.range * w, 0, Math.PI * 2);
      ctx.fillStyle = theme.dark ? "rgba(129,140,248,0.10)" : "rgba(79,70,229,0.08)";
      ctx.fill();
      ctx.strokeStyle = theme.dark ? "rgba(129,140,248,0.45)" : "rgba(79,70,229,0.4)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    if (!turret) {
      // An empty slot shows whether it can be afforded, so the decision is on
      // the battlefield and not in the HUD.
      const affordable = credits >= TURRET_COST;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.78, 0, Math.PI * 2);
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = affordable
        ? (theme.dark ? "rgba(52,211,153,0.75)" : "rgba(5,150,105,0.65)")
        : (theme.dark ? "rgba(148,163,184,0.35)" : "rgba(100,116,139,0.35)");
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.setLineDash([]);
      if (affordable) {
        ctx.fillStyle = theme.dark ? "rgba(52,211,153,0.9)" : "rgba(5,150,105,0.85)";
        ctx.font = `bold ${Math.round(r * 0.9)}px system-ui`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("+", cx, cy + 1);
      }
      return;
    }

    // Built: a hexagonal emplacement with a barrel. Deliberately angular —
    // the enemies are round blobs, and a turret drawn as another sphere was
    // indistinguishable from the calcified ones at a glance.
    const hex = (cx2: number, cy2: number, rad: number) => {
      ctx.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = (Math.PI / 3) * k - Math.PI / 2;
        const px = cx2 + Math.cos(a) * rad;
        const py = cy2 + Math.sin(a) * rad;
        if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
    };

    // The barrel points at whatever it would shoot, or down the lane if idle.
    const aim = world.enemies.reduce<{ a: number; t: number } | null>((best, e) => {
      const p = pointAt(e.t);
      const d = Math.hypot(p.x - s.x, p.y - s.y);
      if (d > TURRET_STATS[turret.level - 1].range) return best;
      if (best && e.t <= best.t) return best;
      return { a: Math.atan2(Y(p.y) - cy, X(p.x) - cx), t: e.t };
    }, null);
    const angle = aim ? aim.a : Math.PI / 2;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.fillStyle = theme.dark ? "#1e1b4b" : "#312e81";
    ctx.fillRect(0, -r * 0.2, r * 1.25, r * 0.4);
    ctx.restore();

    const g = ctx.createLinearGradient(cx, cy - r, cx, cy + r);
    g.addColorStop(0, theme.dark ? "#a5b4fc" : "#c7d2fe");
    g.addColorStop(1, theme.dark ? "#3730a3" : "#4f46e5");
    hex(cx, cy, r);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = theme.dark ? "#c7d2fe" : "#312e81";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Level pips, in ink that survives both themes. White-on-white made the
    // level invisible in light mode, which is the one thing they are for.
    ctx.fillStyle = theme.dark ? "#e0e7ff" : "#1e1b4b";
    for (let p = 0; p < turret.level; p++) {
      ctx.beginPath();
      ctx.arc(cx - r * 0.42 + p * r * 0.42, cy + r * 1.5, r * 0.15, 0, Math.PI * 2);
      ctx.fill();
    }
    if (turret.level >= MAX_TURRET_LEVEL) {
      hex(cx, cy, r + 3.5);
      ctx.strokeStyle = "#fbbf24";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  });

  /* ── Shots ──────────────────────────────────────────────────────── */
  for (const s of world.shots) {
    ctx.beginPath();
    ctx.moveTo(X(s.from.x), Y(s.from.y));
    ctx.lineTo(X(s.to.x), Y(s.to.y));
    ctx.strokeStyle = `rgba(165,180,252,${Math.max(0, s.life / 0.12)})`;
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }

  /* ── Enemies ────────────────────────────────────────────────────── */
  for (const e of world.enemies) {
    const p = pointAt(e.t);
    const cx = X(p.x);
    const cy = Y(p.y);
    const r = e.radius * w;
    const [light, dark] = KIND_FILL[e.kind] || KIND_FILL.nodule;

    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.45, 0, Math.PI * 2);
    ctx.fillStyle = theme.dark ? "rgba(0,0,0,0.25)" : "rgba(15,23,42,0.08)";
    ctx.fill();

    const g = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.35, 1, cx, cy, r);
    g.addColorStop(0, e.hitFlash > 0 ? "#ffffff" : light);
    g.addColorStop(1, dark);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();

    // A calcified enemy wears its name: a bright speck, like the thing it is.
    if (e.kind === "calcified") {
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      for (const d of [[-0.3, -0.1], [0.25, 0.2], [0.05, -0.35]]) {
        ctx.beginPath();
        ctx.arc(cx + d[0] * r, cy + d[1] * r, r * 0.12, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (e.hp < e.maxHp) {
      const bw = r * 2;
      ctx.fillStyle = theme.dark ? "rgba(15,23,42,0.75)" : "rgba(255,255,255,0.85)";
      ctx.fillRect(cx - bw / 2, cy - r - 7, bw, 3.5);
      ctx.fillStyle = "#34d399";
      ctx.fillRect(cx - bw / 2, cy - r - 7, bw * (e.hp / e.maxHp), 3.5);
    }
  }

  /* ── Particles ──────────────────────────────────────────────────── */
  for (const p of world.particles) {
    ctx.globalAlpha = Math.max(0, p.life / 0.7);
    ctx.fillStyle = p.hue;
    ctx.beginPath();
    ctx.arc(X(p.x), Y(p.y), 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  /* ── The base ───────────────────────────────────────────────────── */
  const base = pointAt(1);
  const bx = X(base.x);
  const by = Y(base.y);
  const br = Math.max(16, w * 0.055);
  const hurt = world.integrity / 100;

  ctx.beginPath();
  ctx.arc(bx, by, br * 1.9, 0, Math.PI * 2);
  ctx.fillStyle = hurt > 0.4 ? "rgba(52,211,153,0.12)" : "rgba(244,63,94,0.16)";
  ctx.fill();

  const bg2 = ctx.createRadialGradient(bx, by - br * 0.4, 1, bx, by, br);
  bg2.addColorStop(0, "#f8fafc");
  bg2.addColorStop(1, hurt > 0.4 ? "#0ea5e9" : "#f43f5e");
  ctx.beginPath();
  ctx.arc(bx, by, br, 0, Math.PI * 2);
  ctx.fillStyle = bg2;
  ctx.fill();
  ctx.strokeStyle = hurt > 0.4 ? "#0369a1" : "#be123c";
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // A cross, so the thing being defended reads as a hospital at a glance.
  ctx.fillStyle = hurt > 0.4 ? "#0369a1" : "#9f1239";
  const t = br * 0.26;
  ctx.fillRect(bx - t / 2, by - br * 0.52, t, br * 1.04);
  ctx.fillRect(bx - br * 0.52, by - t / 2, br * 1.04, t);
}
