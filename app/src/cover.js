// Neon Vice cover renderer — draws a multi-panel GTA-poster-style cover on
// any 2D canvas. Every piece of art is drawn in code: a synthwave sunset,
// a procedural skyline, palm silhouettes, neon lettering. No photo, logo or
// font from any commercial game is used. Photos are the user's own uploads
// (or the kit's free samples) and never leave the machine.

export const GRADES = {
  sunset: {
    name: 'Vice Sunset',
    sky: ['#ff9e45', '#ff5f6d', '#c22e7a', '#2a0e52'],
    sun: ['#ffe873', '#ff7a4d'],
    wash: 'rgba(255, 94, 122, 0.16)',
    glow: '#ff2e88',
    panelWash: 'rgba(255, 122, 60, 0.10)',
  },
  neon: {
    name: 'Neon Night',
    sky: ['#0d0033', '#3d0a70', '#a3138f', '#00d5ff'],
    sun: ['#ff2e88', '#7b2fff'],
    wash: 'rgba(0, 229, 255, 0.10)',
    glow: '#00e5ff',
    panelWash: 'rgba(123, 47, 255, 0.12)',
  },
  dusk: {
    name: 'Palm Dusk',
    sky: ['#2e1a4f', '#7c2d8a', '#e85d75', '#f9a03f'],
    sun: ['#ffd166', '#ef476f'],
    wash: 'rgba(232, 93, 117, 0.14)',
    glow: '#ffd166',
    panelWash: 'rgba(249, 160, 63, 0.10)',
  },
};

export const LAYOUTS = {
  hero: { name: 'Hero — one big photo', panels: 1 },
  split: { name: 'Split — two panels', panels: 2 },
  trio: { name: 'Trio — big + two stacked', panels: 3 },
  grid: { name: 'Grid — four panels', panels: 4 },
};

// Deterministic pseudo-random stream, so the same cover always paints the
// same skyline and windows.
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Panel rectangles for a layout, in fractions of the canvas.
export function layoutRects(layout, w, h) {
  const g = Math.min(w, h) * 0.012; // gutter
  if (layout === 'hero') return [{ x: 0, y: 0, w, h }];
  if (layout === 'split') {
    const hw = (w - g) / 2;
    return [
      { x: 0, y: 0, w: hw, h },
      { x: hw + g, y: 0, w: hw, h },
    ];
  }
  if (layout === 'trio') {
    const big = w * 0.62;
    const small = w - big - g;
    const half = (h - g) / 2;
    return [
      { x: 0, y: 0, w: big, h },
      { x: big + g, y: 0, w: small, h: half },
      { x: big + g, y: half + g, w: small, h: half },
    ];
  }
  // grid: 2 x 2
  const cw = (w - g) / 2;
  const ch = (h - g) / 2;
  return [
    { x: 0, y: 0, w: cw, h: ch },
    { x: cw + g, y: 0, w: cw, h: ch },
    { x: 0, y: ch + g, w: cw, h: ch },
    { x: cw + g, y: ch + g, w: cw, h: ch },
  ];
}

// A synthwave sun: a gradient disc with slits cut from its lower half so
// the sky shows through in bands.
function paintSun(ctx, cx, cy, r, colors) {
  const grad = ctx.createLinearGradient(0, cy - r, 0, cy + r);
  grad.addColorStop(0, colors[0]);
  grad.addColorStop(1, colors[1]);
  ctx.save();
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'destination-out';
  let y = cy + r * 0.08;
  let slit = r * 0.045;
  while (y < cy + r) {
    ctx.fillRect(cx - r - 2, y, r * 2 + 4, slit);
    y += slit + r * 0.13;
    slit *= 1.4;
  }
  ctx.restore();
}

// One palm silhouette: a bent trunk and a crown of drooping fronds.
function paintPalm(ctx, x, y, s, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(18, -60, 38, -112);
  ctx.stroke();
  ctx.translate(38, -112);
  for (let i = 0; i < 8; i++) {
    const angle = (-170 + i * 48) * (Math.PI / 180);
    ctx.save();
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(36, -10, 66, 16);
    ctx.quadraticCurveTo(36, 6, 0, 0);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

// Sunset sky, sun, a distant skyline with lit windows, palms at the base.
function paintBackdrop(ctx, w, h, grade) {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  grade.sky.forEach((c, i) => sky.addColorStop(i / (grade.sky.length - 1), c));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  paintSun(ctx, w * 0.5, h * 0.4, Math.min(w, h) * 0.21, grade.sun);
  const rnd = mulberry32(20261119);
  // Skyline towers along the bottom.
  ctx.fillStyle = 'rgba(22, 7, 46, 0.88)';
  let bx = 0;
  while (bx < w) {
    const bw = w * (0.05 + rnd() * 0.08);
    const bh = h * (0.07 + rnd() * 0.17);
    ctx.fillRect(bx, h * 0.87 - bh, bw, bh);
    bx += bw + w * 0.012;
  }
  // A scattering of lit windows on the towers.
  ctx.fillStyle = 'rgba(255, 230, 109, 0.9)';
  for (let i = 0; i < 30; i++) {
    ctx.fillRect(rnd() * w, h * (0.68 + rnd() * 0.17), 3, 4);
  }
  // Palms framing the lower corners.
  const s = Math.min(w, h);
  paintPalm(ctx, w * 0.05, h * 0.99, s * 0.0016, 'rgba(15, 3, 30, 0.95)');
  paintPalm(ctx, w * 0.95, h * 0.99, s * 0.0013, 'rgba(15, 3, 30, 0.95)');
}

// One photo panel: cover-fit the photo with the user's zoom/pan, then a
// grade wash and a frame. With no photo yet, a backdrop panel instead.
function paintPanel(ctx, panel, rect, grade) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  if (panel && panel.img) {
    const img = panel.img;
    const base = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight);
    const scale = base * (panel.zoom || 1);
    const pw = img.naturalWidth * scale;
    const ph = img.naturalHeight * scale;
    const ox = (rect.w - pw) / 2 + (panel.panX || 0) * rect.w * 0.4;
    const oy = (rect.h - ph) / 2 + (panel.panY || 0) * rect.h * 0.4;
    ctx.drawImage(img, rect.x + ox, rect.y + oy, pw, ph);
    ctx.fillStyle = grade.panelWash;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  } else {
    ctx.translate(rect.x, rect.y);
    paintBackdrop(ctx, rect.w, rect.h, grade);
  }
  ctx.restore();
  // Dark frame with a neon hairline inside it.
  const fw = Math.max(2, Math.min(rect.w, rect.h) * 0.006);
  ctx.save();
  ctx.strokeStyle = 'rgba(10, 4, 24, 0.9)';
  ctx.lineWidth = fw;
  ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  ctx.strokeStyle = grade.glow;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = Math.max(1, Math.min(rect.w, rect.h) * 0.002);
  ctx.strokeRect(rect.x + 3, rect.y + 3, rect.w - 6, rect.h - 6);
  ctx.restore();
}

// Shrink the font until the text fits the given width.
function fitFont(ctx, text, maxWidth, startSize, weight = 900) {
  let size = startSize;
  const face = `"Arial Black", "Helvetica Neue", Arial, sans-serif`;
  ctx.font = `${weight} ${size}px ${face}`;
  while (size > 12 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `${weight} ${size}px ${face}`;
  }
  return size;
}

// Bold slanted title with a dark outline and neon glow, plus a sub-caption,
// over a dark band rising from the bottom. Top-left carries our own brand.
function paintLettering(ctx, w, h, caption, sub, grade) {
  const bandH = h * 0.24;
  const bandY = h - bandH;
  const shade = ctx.createLinearGradient(0, bandY, 0, h);
  shade.addColorStop(0, 'rgba(12, 2, 28, 0)');
  shade.addColorStop(0.35, 'rgba(12, 2, 28, 0.72)');
  shade.addColorStop(1, 'rgba(12, 2, 28, 0.92)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, bandY, w, bandH);

  ctx.save();
  ctx.transform(1, 0, -0.05, 1, w * 0.02, 0); // slight forward slant
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const title = (caption || '').trim().toUpperCase();
  if (title) {
    const size = fitFont(ctx, title, w * 0.92, h * 0.105);
    ctx.font = `900 ${size}px "Arial Black", "Helvetica Neue", Arial, sans-serif`;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#12041f';
    ctx.lineWidth = size * 0.09;
    ctx.shadowColor = grade.glow;
    ctx.shadowBlur = size * 0.35;
    ctx.strokeText(title, w / 2, h - bandH * 0.42);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(title, w / 2, h - bandH * 0.42);
  }
  const subText = (sub || '').trim().toUpperCase();
  if (subText) {
    const sSize = fitFont(ctx, subText, w * 0.8, h * 0.032, 700);
    ctx.font = `700 ${sSize}px "Helvetica Neue", Arial, sans-serif`;
    ctx.fillStyle = grade.glow;
    ctx.shadowColor = grade.glow;
    ctx.shadowBlur = sSize * 0.5;
    ctx.fillText(subText, w / 2, h - bandH * 0.12);
    ctx.shadowBlur = 0;
  }
  ctx.restore();

  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const bSize = Math.max(14, h * 0.022);
  ctx.font = `900 ${bSize}px "Arial Black", "Helvetica Neue", Arial, sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = grade.glow;
  ctx.shadowBlur = bSize * 0.6;
  ctx.fillText('NEON VICE', w * 0.035, h * 0.03);
  ctx.restore();
}

// state: { layout, panels: [{img, zoom, panX, panY}], caption, sub, grade }
// Draws the whole cover onto `canvas` at its own pixel size.
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const grade = GRADES[state.grade] || GRADES.sunset;
  const rects = layoutRects(state.layout || 'trio', w, h);
  const panels = state.panels || [];
  rects.forEach((r, i) => paintPanel(ctx, panels[i] || null, r, grade));
  // A wash of the grade over the seams, then the lettering on top.
  ctx.fillStyle = grade.wash;
  ctx.fillRect(0, 0, w, h);
  paintLettering(ctx, w, h, state.caption, state.sub, grade);
}
