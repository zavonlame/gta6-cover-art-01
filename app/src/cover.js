// Neon Vice — the cover renderer. Draws a GTA-style multi-panel poster onto any
// canvas: a procedural synthwave backdrop (sky, striped sun, perspective grid,
// stars, palm silhouettes), photo panels in one of four layouts, a colour grade
// over the whole thing, and neon-glow title and caption lettering.
//
// Everything here is drawn in code — no external images, no network — and the
// drawing is deterministic: the stars come from a seeded generator, so the same
// state always paints the same pixels.

const GRADES = {
  sunset: {
    skyTop: '#1c0b33', skyMid: '#7a1e5e', skyLow: '#ff7a3c',
    sun: '#ffd166', sunCore: '#fff3b0', grid: '#ff5da2',
    accent: '#ff5da2', glow: '#ff2e88', tint: 'rgba(255, 90, 60, 0.10)',
    band: '#2a0a2e', caption: '#ffd166',
  },
  night: {
    skyTop: '#050514', skyMid: '#2b0a4d', skyLow: '#0e2a5e',
    sun: '#7df9ff', sunCore: '#e6fbff', grid: '#00e5ff',
    accent: '#00e5ff', glow: '#b537f2', tint: 'rgba(60, 40, 255, 0.12)',
    band: '#0a0a24', caption: '#7df9ff',
  },
  dusk: {
    skyTop: '#08222b', skyMid: '#14524a', skyLow: '#e8a33d',
    sun: '#ffb347', sunCore: '#ffe9b0', grid: '#2dd4bf',
    accent: '#2dd4bf', glow: '#f59e0b', tint: 'rgba(20, 160, 140, 0.10)',
    band: '#07231f', caption: '#ffb347',
  },
};

/** A tiny seeded generator, so the stars land in the same place every run. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function paintSky(ctx, w, h, g) {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, g.skyTop);
  sky.addColorStop(0.55, g.skyMid);
  sky.addColorStop(1, g.skyLow);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
}

function paintStars(ctx, w, h) {
  const rnd = mulberry32(20261119);
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 90; i++) {
    const x = rnd() * w;
    const y = rnd() * h * 0.45;
    const r = 0.6 + rnd() * 1.6;
    ctx.globalAlpha = 0.25 + rnd() * 0.6;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function paintSun(ctx, w, h, g) {
  const cx = w * 0.5;
  const cy = h * 0.30;
  const r = Math.min(w, h) * 0.26;
  const glow = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 1.9);
  glow.addColorStop(0, g.sun);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = glow;
  ctx.fillRect(cx - r * 2, cy - r * 2, r * 4, r * 4);
  ctx.globalAlpha = 1;
  const disc = ctx.createLinearGradient(0, cy - r, 0, cy + r);
  disc.addColorStop(0, g.sunCore);
  disc.addColorStop(1, g.sun);
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  // Stripe cuts across the lower half of the disc.
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = g.skyMid;
  let y = cy + r * 0.05;
  let thick = r * 0.045;
  while (y < cy + r) {
    ctx.fillRect(cx - r, y, r * 2, thick);
    y += thick * 2.4;
    thick *= 1.35;
  }
  ctx.restore();
}

function paintGrid(ctx, w, h, g) {
  const horizon = h * 0.62;
  ctx.save();
  ctx.strokeStyle = g.grid;
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = Math.max(1, w * 0.0016);
  // Vanishing lines fanning out from the centre of the horizon.
  for (let i = -9; i <= 9; i++) {
    ctx.beginPath();
    ctx.moveTo(w * 0.5 + i * w * 0.055, horizon);
    ctx.lineTo(w * 0.5 + i * w * 0.22, h);
    ctx.stroke();
  }
  // Horizontal lines, crowding toward the horizon.
  let y = horizon;
  let gap = h * 0.012;
  while (y < h) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
    y += gap;
    gap *= 1.55;
  }
  ctx.restore();
}

function paintPalm(ctx, x, y, s, lean) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.rotate(lean);
  ctx.strokeStyle = '#0b0616';
  ctx.fillStyle = '#0b0616';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  // Trunk, curving up and to the right.
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(14, -52, 34, -96);
  ctx.stroke();
  // Fronds fanning from the top of the trunk.
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI * (0.08 + i * 0.13);
    ctx.beginPath();
    ctx.moveTo(34, -96);
    ctx.quadraticCurveTo(
      34 + Math.cos(a) * 52, -96 + Math.sin(a) * 52 - 12,
      34 + Math.cos(a) * 88, -96 + Math.sin(a) * 88 + 26,
    );
    ctx.stroke();
  }
  ctx.restore();
}

function paintPalms(ctx, w, h) {
  const s = Math.min(w, h) / 900;
  paintPalm(ctx, w * 0.02, h * 0.99, s * 1.15, 0.12);
  paintPalm(ctx, w * 0.98, h * 0.99, s * 0.95, -0.35);
}

/** Panel rectangles for a layout, inside the given area, as fractions of it. */
export function panelRects(layout, area) {
  const gap = Math.min(area.w, area.h) * 0.022;
  const { x, y, w, h } = area;
  if (layout === 'split') {
    const half = (w - gap) / 2;
    return [
      { x, y, w: half, h },
      { x: x + half + gap, y, w: half, h },
    ];
  }
  if (layout === 'trio') {
    const left = w * 0.55;
    const right = w - left - gap;
    const half = (h - gap) / 2;
    return [
      { x, y, w: left, h },
      { x: x + left + gap, y, w: right, h: half },
      { x: x + left + gap, y: y + half + gap, w: right, h: half },
    ];
  }
  if (layout === 'grid') {
    const halfW = (w - gap) / 2;
    const halfH = (h - gap) / 2;
    return [
      { x, y, w: halfW, h: halfH },
      { x: x + halfW + gap, y, w: halfW, h: halfH },
      { x, y: y + halfH + gap, w: halfW, h: halfH },
      { x: x + halfW + gap, y: y + halfH + gap, w: halfW, h: halfH },
    ];
  }
  return [{ x, y, w, h }];
}

function paintPhoto(ctx, img, rect, zoom, ox, oy) {
  if (!img || !img.naturalWidth) return;
  const base = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight);
  const scale = base * Math.max(0.4, zoom);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const dx = rect.x + (rect.w - dw) / 2 + ox * rect.w;
  const dy = rect.y + (rect.h - dh) / 2 + oy * rect.h;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

function paintPanels(ctx, area, layout, panels, g) {
  const rects = panelRects(layout, area);
  const border = Math.max(3, Math.min(area.w, area.h) * 0.008);
  rects.forEach((rect, i) => {
    const panel = panels[i] || panels[0] || null;
    ctx.fillStyle = '#12081f';
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    if (panel) paintPhoto(ctx, panel.img, rect, panel.zoom, panel.ox, panel.oy);
    // A white frame and a thin neon inner line, GTA-poster style.
    ctx.lineWidth = border;
    ctx.strokeStyle = '#ffffff';
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    ctx.lineWidth = Math.max(1, border * 0.35);
    ctx.strokeStyle = g.accent;
    ctx.strokeRect(rect.x + border, rect.y + border, rect.w - border * 2, rect.h - border * 2);
  });
}

function fitFont(ctx, text, maxWidth, startSize, weight = 900) {
  let size = startSize;
  ctx.font = `italic ${weight} ${size}px "Arial Black", "Helvetica Neue", Arial, sans-serif`;
  while (ctx.measureText(text).width > maxWidth && size > 10) {
    size -= 2;
    ctx.font = `italic ${weight} ${size}px "Arial Black", "Helvetica Neue", Arial, sans-serif`;
  }
  return size;
}

function paintTitle(ctx, w, h, title, g) {
  const text = (title || '').trim().toUpperCase();
  if (!text) return;
  const size = fitFont(ctx, text, w * 0.92, h * 0.115);
  const y = h * 0.115;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // Neon halo: the same words, blurred, in the grade's glow colour.
  ctx.save();
  ctx.shadowColor = g.glow;
  ctx.shadowBlur = size * 0.45;
  ctx.fillStyle = g.glow;
  ctx.fillText(text, w / 2, y);
  ctx.restore();
  // White face with a dark outline so it reads over any photo.
  ctx.lineWidth = Math.max(2, size * 0.09);
  ctx.strokeStyle = '#14041f';
  ctx.strokeText(text, w / 2, y);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, w / 2, y);
}

function paintVignette(ctx, w, h) {
  // Darkens the corners a touch, so the bright panels sit forward.
  const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.75);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(5,0,12,0.38)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
}

function paintCaption(ctx, w, h, caption, g) {
  const text = (caption || '').trim().toUpperCase();
  if (!text) return;
  const bandH = h * 0.075;
  const bandY = h - bandH - h * 0.018;
  ctx.fillStyle = g.band;
  ctx.fillRect(w * 0.06, bandY, w * 0.88, bandH);
  ctx.lineWidth = Math.max(2, bandH * 0.06);
  ctx.strokeStyle = g.accent;
  ctx.strokeRect(w * 0.06, bandY, w * 0.88, bandH);
  const size = fitFont(ctx, text, w * 0.8, bandH * 0.52, 800);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = g.caption;
  ctx.shadowColor = g.glow;
  ctx.shadowBlur = size * 0.3;
  ctx.fillText(text, w / 2, bandY + bandH / 2);
  ctx.shadowBlur = 0;
}

/**
 * Draws the whole cover onto `canvas` from `state`:
 * { layout, grade, panels: [{img, zoom, ox, oy}], title, caption }.
 * Works at any canvas size — the export sizes are just different canvases.
 */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const g = GRADES[state.grade] || GRADES.sunset;
  const panels = state.panels && state.panels.length ? state.panels : [];

  paintSky(ctx, w, h, g);
  paintStars(ctx, w, h);
  paintSun(ctx, w, h, g);
  paintGrid(ctx, w, h, g);
  paintPalms(ctx, w, h);

  const area = { x: w * 0.045, y: h * 0.155, w: w * 0.91, h: h * 0.70 };
  paintPanels(ctx, area, state.layout || 'hero', panels, g);

  // The grade's wash ties the panels to the backdrop.
  ctx.fillStyle = g.tint;
  ctx.fillRect(0, 0, w, h);
  paintVignette(ctx, w, h);

  paintTitle(ctx, w, h, state.title, g);
  paintCaption(ctx, w, h, state.caption, g);
}

/** Renders the same state to a fresh canvas at an exact export size. */
export function renderExport(state, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  drawCover(canvas, state);
  return canvas;
}

export const LAYOUTS = ['hero', 'split', 'trio', 'grid'];
export const GRADES_LIST = ['sunset', 'night', 'dusk'];
export const EXPORT_SIZES = [
  { label: '1080 × 1080', w: 1080, h: 1080 },
  { label: '1080 × 1350', w: 1080, h: 1350 },
  { label: '1920 × 1080', w: 1920, h: 1080 },
];
