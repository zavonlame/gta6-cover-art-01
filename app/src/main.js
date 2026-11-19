// Neon Vice editor wiring: pick a photo per panel, crop it with zoom/pan,
// edit the title and sub-caption, choose a layout, grade and export size,
// then export a PNG. A `?shot=` query sets up a fixed scene for a
// screenshot instead (shots.js). Everything runs offline: photos are read
// with object URLs and never uploaded anywhere.
import { drawCover, GRADES, LAYOUTS } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const captionInput = document.getElementById('caption');
const subInput = document.getElementById('sub');
const statusEl = document.getElementById('status');
const panelTabs = document.getElementById('panel-tabs');
const zoomInput = document.getElementById('zoom');
const panXInput = document.getElementById('panx');
const panYInput = document.getElementById('pany');
const layoutInput = document.getElementById('layout');
const gradeInput = document.getElementById('grade');
const sizeInput = document.getElementById('size');

const SIZES = {
  '1080x1080': { w: 1080, h: 1080, label: 'Square 1080 x 1080' },
  '1080x1350': { w: 1080, h: 1350, label: 'Portrait 1080 x 1350' },
  '1920x1080': { w: 1920, h: 1080, label: 'Landscape 1920 x 1080' },
};

const state = {
  layout: 'trio',
  grade: 'sunset',
  size: '1080x1080',
  caption: 'Sunset Heist',
  sub: 'Neon Vice',
  panels: [null, null, null, null], // { img, zoom, panX, panY } per panel
  active: 0,
};

function panelCount() {
  return LAYOUTS[state.layout].panels;
}

// Resize the preview canvas to the chosen export size and repaint.
function render() {
  const size = SIZES[state.size];
  canvas.width = size.w;
  canvas.height = size.h;
  drawCover(canvas, {
    layout: state.layout,
    panels: state.panels.slice(0, panelCount()),
    caption: state.caption,
    sub: state.sub,
    grade: state.grade,
  });
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function buildPanelTabs() {
  panelTabs.innerHTML = '';
  for (let i = 0; i < panelCount(); i++) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tab' + (i === state.active ? ' active' : '');
    b.textContent = `Panel ${i + 1}${state.panels[i] ? ' ✓' : ''}`;
    b.addEventListener('click', () => {
      state.active = i;
      syncPanelControls();
      buildPanelTabs();
    });
    panelTabs.appendChild(b);
  }
}

function syncPanelControls() {
  const p = state.panels[state.active];
  zoomInput.value = p ? p.zoom : 1;
  panXInput.value = p ? p.panX : 0;
  panYInput.value = p ? p.panY : 0;
  document.getElementById('zoom-val').textContent = `${Math.round((p ? p.zoom : 1) * 100)}%`;
  document.getElementById('panx-val').textContent = (p ? p.panX : 0).toFixed(2);
  document.getElementById('pany-val').textContent = (p ? p.panY : 0).toFixed(2);
}

function setPanelPhoto(img) {
  state.panels[state.active] = { img, zoom: 1, panX: 0, panY: 0 };
  syncPanelControls();
  buildPanelTabs();
  render();
}

function applyPanelTransform() {
  const p = state.panels[state.active];
  if (!p) return;
  p.zoom = Number(zoomInput.value);
  p.panX = Number(panXInput.value);
  p.panY = Number(panYInput.value);
  syncPanelControls();
  render();
}

document.getElementById('photo').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    setPanelPhoto(await loadImage(URL.createObjectURL(file)));
    statusEl.textContent = `Photo loaded into Panel ${state.active + 1}.`;
  } catch {
    statusEl.textContent = 'Could not read that photo file.';
  }
  e.target.value = '';
});

for (const btn of document.querySelectorAll('[data-sample]')) {
  btn.addEventListener('click', async () => {
    try {
      setPanelPhoto(await loadImage(`samples/${btn.dataset.sample}.jpg`));
      statusEl.textContent = `Sample "${btn.dataset.sample}" loaded into Panel ${state.active + 1}.`;
    } catch {
      statusEl.textContent = 'Sample photo failed to load.';
    }
  });
}

document.getElementById('fill-all').addEventListener('click', () => {
  // Copy the active panel's photo into every empty panel of the layout.
  const src = state.panels[state.active];
  if (!src) {
    statusEl.textContent = 'Load a photo into the active panel first.';
    return;
  }
  for (let i = 0; i < panelCount(); i++) {
    if (!state.panels[i]) state.panels[i] = { ...src };
  }
  buildPanelTabs();
  render();
  statusEl.textContent = 'Photo filled into the empty panels.';
});

captionInput.addEventListener('input', () => { state.caption = captionInput.value; render(); });
subInput.addEventListener('input', () => { state.sub = subInput.value; render(); });
layoutInput.addEventListener('change', () => {
  state.layout = layoutInput.value;
  state.active = 0;
  buildPanelTabs();
  syncPanelControls();
  render();
});
gradeInput.addEventListener('change', () => { state.grade = gradeInput.value; render(); });
sizeInput.addEventListener('change', () => { state.size = sizeInput.value; render(); });
zoomInput.addEventListener('input', applyPanelTransform);
panXInput.addEventListener('input', applyPanelTransform);
panYInput.addEventListener('input', applyPanelTransform);

document.getElementById('export').addEventListener('click', () => {
  const size = SIZES[state.size];
  // Render at full export resolution on an offscreen canvas so the preview
  // size never limits the PNG.
  const off = document.createElement('canvas');
  off.width = size.w;
  off.height = size.h;
  drawCover(off, {
    layout: state.layout,
    panels: state.panels.slice(0, panelCount()),
    caption: state.caption,
    sub: state.sub,
    grade: state.grade,
  });
  off.toBlob((blob) => {
    if (!blob) {
      statusEl.textContent = 'Export failed in this browser.';
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `neon-vice-${size.w}x${size.h}.png`;
    a.click();
    statusEl.textContent = `Saved neon-vice-${size.w}x${size.h}.png`;
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }, 'image/png');
});

const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  runShot(shot, new URLSearchParams(location.search), async (photoName, text, opts) => {
    if (opts.layout) { state.layout = opts.layout; layoutInput.value = opts.layout; }
    if (opts.grade) { state.grade = opts.grade; gradeInput.value = opts.grade; }
    if (opts.size) { state.size = opts.size; sizeInput.value = opts.size; }
    state.caption = text;
    captionInput.value = text;
    if (opts.sub) { state.sub = opts.sub; subInput.value = opts.sub; }
    const img = await loadImage(`samples/${photoName}.jpg`);
    for (let i = 0; i < panelCount(); i++) {
      state.panels[i] = { img, zoom: 1, panX: 0, panY: 0 };
    }
    buildPanelTabs();
    syncPanelControls();
    render();
  });
} else {
  buildPanelTabs();
  syncPanelControls();
  render();
}
